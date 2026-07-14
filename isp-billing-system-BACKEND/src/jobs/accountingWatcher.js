/**
 * Accounting Watcher Job
 *
 * Runs periodically (default: every 5 minutes) to monitor active sessions
 * in the FreeRADIUS `radacct` table and enforce data caps.
 *
 * Reuses the Phase 1 BullMQ disable provisioning job to cut off users immediately.
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { addProvisioningJob } = require('../services/queue/queueManager');

let cronTask = null;

/**
 * Execute the accounting watcher sweep.
 */
async function runAccountingSweep() {
  const { Subscription, RadAcct, NetworkDevice, DataPlan, sequelize } = require('../models');
  const { SubscriptionStatus } = require('../config/constants');

  logger.info('Running accounting watcher telemetry and cap limit sweep...');

  try {
    // 1. Find all active subscriptions using any connection type
    const activeSubscriptions = await Subscription.findAll({
      where: {
        status: SubscriptionStatus.ACTIVE,
        connectionType: { [Op.in]: ['pppoe', 'hotspot', 'address_list'] },
        networkIdentifier: { [Op.ne]: null },
        networkDeviceId: { [Op.ne]: null },
      },
      include: [
        { model: DataPlan, as: 'plan', attributes: ['id', 'name', 'dataLimit'] },
        { model: NetworkDevice, as: 'NetworkDevice', where: { isActive: true } },
      ],
    });

    if (activeSubscriptions.length === 0) {
      logger.info('Accounting sweep: No active subscriptions to monitor');
      return { processed: 0, cutoffs: 0 };
    }

    // Group address_list subscriptions by networkDeviceId to query in bulk per router
    const routerSubscriptions = {};
    const radiusSubscriptions = [];

    for (const sub of activeSubscriptions) {
      if (sub.connectionType === 'address_list') {
        const devId = sub.networkDeviceId;
        if (!routerSubscriptions[devId]) {
          routerSubscriptions[devId] = {
            device: sub.NetworkDevice,
            subs: [],
          };
        }
        routerSubscriptions[devId].subs.push(sub);
      } else {
        radiusSubscriptions.push(sub);
      }
    }

    // Query router simple queues in bulk (avoids the N-calls performance trap)
    const mikrotikClient = require('../services/mikrotik/client');
    const queueDataMap = {};

    for (const devId of Object.keys(routerSubscriptions)) {
      const { device, subs } = routerSubscriptions[devId];
      try {
        const queues = await mikrotikClient.execute(
          device,
          '/queue/simple/print',
          {},
          'cron:telemetry'
        );

        if (queues && Array.isArray(queues)) {
          for (const queue of queues) {
            if (!queue.target || !queue.bytes) continue;
            // Strip subnet suffix (e.g., 10.5.50.15/32 -> 10.5.50.15)
            const targetIp = queue.target.split('/')[0];
            
            // Match queue targets to customer IP (networkIdentifier)
            const matchedSub = subs.find(s => s.networkIdentifier === targetIp);
            if (matchedSub) {
              const bytesParts = queue.bytes.split('/');
              if (bytesParts.length === 2) {
                const uploadBytes = parseInt(bytesParts[0], 10) || 0;
                const downloadBytes = parseInt(bytesParts[1], 10) || 0;
                queueDataMap[matchedSub.id] = { downloadBytes, uploadBytes };
              }
            }
          }
        }
      } catch (routerErr) {
        logger.error(`Telemetry: Failed to bulk read simple queues from router "${device.name}"`, {
          deviceId: device.id,
          error: routerErr.message,
        });
      }
    }

    let processed = 0;
    let cutoffs = 0;

    for (const sub of activeSubscriptions) {
      let currentDl = 0;
      let currentUl = 0;

      if (sub.connectionType === 'address_list') {
        const qData = queueDataMap[sub.id];
        if (!qData) {
          // No simple queue found or device offline, skip usage update
          continue;
        }
        currentDl = qData.downloadBytes;
        currentUl = qData.uploadBytes;
      } else {
        // Query cumulative traffic sum across ALL sessions (active & closed)
        // This handles boundary gaps, restarts, and concurrent active sessions.
        const username = sub.networkIdentifier;
        const usage = await RadAcct.findOne({
          attributes: [
            [sequelize.fn('SUM', sequelize.col('acctinputoctets')), 'downloadBytes'],
            [sequelize.fn('SUM', sequelize.col('acctoutputoctets')), 'uploadBytes'],
          ],
          where: { username },
          raw: true,
        });

        currentDl = parseInt(usage?.downloadBytes || '0', 10);
        currentUl = parseInt(usage?.uploadBytes || '0', 10);
      }

      processed++;

      // Delta calculation with Counter-Reset Safety (reboots/purges)
      let dlDelta = 0;
      let ulDelta = 0;

      if (currentDl < sub.lastDownloadBytesCounter || currentUl < sub.lastUploadBytesCounter) {
        // Reset detected (treat current reading as fresh delta)
        dlDelta = currentDl;
        ulDelta = currentUl;
        logger.info(`Counter reset detected for subscription ${sub.id}. Previous: DL=${sub.lastDownloadBytesCounter}, UL=${sub.lastUploadBytesCounter}. Current: DL=${currentDl}, UL=${currentUl}.`);
      } else {
        dlDelta = currentDl - sub.lastDownloadBytesCounter;
        ulDelta = currentUl - sub.lastUploadBytesCounter;
      }

      const totalDeltaBytes = dlDelta + ulDelta;
      const totalDeltaMb = totalDeltaBytes / (1024 * 1024);

      // Start database transaction
      const transaction = await sequelize.transaction();

      try {
        const dataLimitMb = sub.dataRemaining !== null && sub.dataRemaining > 0 
          ? sub.dataRemaining 
          : (sub.plan ? sub.plan.dataLimit : null);

        // 1. Atomic Database increments/decrements to prevent lost updates
        if (totalDeltaBytes > 0) {
          await sub.decrement({ dataRemaining: Math.round(totalDeltaMb) }, { transaction });
          await sub.increment({ dataUsed: Math.round(totalDeltaMb) }, { transaction });
        }

        // 2. Save current counters to subscription
        await sub.update({
          lastDownloadBytesCounter: currentDl,
          lastUploadBytesCounter: currentUl,
        }, { transaction });

        // 3. Upsert exactly one daily aggregated row inside data_usage table (performance optimization)
        if (totalDeltaBytes > 0) {
          const { DataUsage } = require('../models');
          const dateStr = new Date().toISOString().split('T')[0];
          const dailySessionId = `daily-${sub.id}-${dateStr}`;

          const [dailyUsage] = await DataUsage.findOrCreate({
            where: { sessionId: dailySessionId },
            defaults: {
              userId: sub.userId,
              subscriptionId: sub.id,
              startTime: new Date(`${dateStr}T00:00:00.000Z`), // normalize to start of day
              bytesDownloaded: 0,
              bytesUploaded: 0,
              totalBytes: 0,
              status: 'active',
              connectionType: sub.connectionType === 'address_list' ? 'unknown' : 'wifi',
            },
            transaction,
          });

          await dailyUsage.increment({
            bytesDownloaded: dlDelta,
            bytesUploaded: ulDelta,
            totalBytes: totalDeltaBytes,
          }, { transaction });
        }

        // 4. Re-fetch within transaction to verify cap limit breach (unified check)
        const refreshedSub = await Subscription.findByPk(sub.id, { transaction });

        if (dataLimitMb && dataLimitMb < 999999 && refreshedSub.dataRemaining <= 0) {
          const dateStr = new Date().toISOString().split('T')[0];
          const jobId = `data-cap-${sub.id}-${dateStr}`;

          logger.warn(`Data cap reached for "${sub.networkIdentifier}": used ${refreshedSub.dataUsed} MB, remaining ${refreshedSub.dataRemaining} MB. Enqueuing suspend job.`, {
            subscriptionId: sub.id,
            username: sub.networkIdentifier,
          });

          // Enqueue single disable job via BullMQ
          await addProvisioningJob('disable', {
            customerId: sub.userId,
            subscriptionId: sub.id,
            triggeredBy: 'cron:data-cap',
          }, jobId);

          // Update subscription status
          await refreshedSub.update({
            status: SubscriptionStatus.SUSPENDED,
            suspensionReason: 'Auto-suspended: Data cap limit reached',
            suspendedAt: new Date(),
          }, { transaction });

          cutoffs++;
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        logger.error(`Failed to update telemetry usage for subscription ${sub.id}`, {
          error: err.message,
          stack: err.stack,
        });
      }
    }

    logger.info(`Accounting watcher sweep complete: checked ${processed} subscriptions, triggered ${cutoffs} cutoff(s)`);
    return { processed, cutoffs };

  } catch (err) {
    logger.error('Accounting watcher sweep failed', { error: err.message, stack: err.stack });
    throw err;
  }
}

/**
 * Start the accounting watcher scheduler.
 *
 * @param {string} [cronExpression] - Cron expression (default from env or every 5 min)
 */
function startAccountingWatcher(cronExpression) {
  const schedule = cronExpression || process.env.ACCOUNTING_CHECK_CRON || '*/5 * * * *';

  if (cronTask) {
    logger.warn('Accounting watcher scheduler already running');
    return;
  }

  const { sequelize } = require('../models');
  // Cache reference of sequelize instance to avoid runtime reference error
  global.sequelize = sequelize;

  if (!cron.validate(schedule)) {
    logger.error(`Invalid cron expression for accounting watcher: "${schedule}"`);
    return;
  }

  cronTask = cron.schedule(schedule, async () => {
    try {
      await runAccountingSweep();
    } catch (err) {
      // Error already logged
    }
  });

  logger.info(`Accounting watcher scheduler started: "${schedule}"`);
}

/**
 * Stop the accounting watcher scheduler.
 */
function stopAccountingWatcher() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('Accounting watcher scheduler stopped');
  }
}

module.exports = {
  runAccountingSweep,
  startAccountingWatcher,
  stopAccountingWatcher,
};
