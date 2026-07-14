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

  logger.info('Running RADIUS accounting data limit sweep...');

  try {
    // 1. Find all active subscriptions that are set to use RADIUS-compatible connection types
    // and have a data cap configured (either on the subscription or plan).
    const activeSubscriptions = await Subscription.findAll({
      where: {
        status: SubscriptionStatus.ACTIVE,
        connectionType: { [Op.in]: ['pppoe', 'hotspot'] },
        networkIdentifier: { [Op.ne]: null },
        networkDeviceId: { [Op.ne]: null },
      },
      include: [
        { model: DataPlan, as: 'plan', attributes: ['id', 'name', 'dataLimit'] },
        { model: NetworkDevice, as: 'NetworkDevice', where: { isActive: true } },
      ],
    });

    if (activeSubscriptions.length === 0) {
      logger.info('Accounting sweep: No active RADIUS subscriptions to monitor');
      return { processed: 0, cutoffs: 0 };
    }

    let processed = 0;
    let cutoffs = 0;

    for (const sub of activeSubscriptions) {
      // Resolve the actual data limit (MB). Prefer subscription remaining/limit, fallback to plan.
      const dataLimitMb = sub.dataRemaining !== null && sub.dataRemaining > 0 
        ? sub.dataRemaining 
        : (sub.plan ? sub.plan.dataLimit : null);

      if (!dataLimitMb || dataLimitMb >= 999999) {
        // No data cap (unlimited), skip
        continue;
      }

      processed++;
      const username = sub.networkIdentifier;

      // 2. Query radacct to get cumulative traffic for this user's active session(s)
      // We look at acctinputoctets (download from server to client / NAS input) and acctoutputoctets (upload / NAS output).
      // Note: FreeRADIUS radacct stores these as octets (bytes).
      const usage = await RadAcct.findOne({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('acctinputoctets')), 'downloadBytes'],
          [sequelize.fn('SUM', sequelize.col('acctoutputoctets')), 'uploadBytes'],
        ],
        where: {
          username,
          acctstoptime: null, // Only active/open sessions
        },
        raw: true,
      });

      const downloadBytes = parseInt(usage?.downloadBytes || '0', 10);
      const uploadBytes = parseInt(usage?.uploadBytes || '0', 10);
      const totalBytes = downloadBytes + uploadBytes;
      const totalMb = totalBytes / (1024 * 1024);

      logger.debug(`User "${username}" current session usage: ${totalMb.toFixed(2)} MB / ${dataLimitMb} MB`);

      // 3. Enforce data cap
      if (totalMb >= dataLimitMb) {
        // Enforce hard cutoff by enqueuing a disable job
        const dateStr = new Date().toISOString().split('T')[0];
        const jobId = `data-cap-${sub.id}-${dateStr}`;

        logger.warn(`Data cap reached for "${username}": used ${totalMb.toFixed(2)} MB, limit ${dataLimitMb} MB. Enqueuing disable job.`, {
          subscriptionId: sub.id,
          username,
        });

        try {
          // Enqueue provisioning disable job via BullMQ
          await addProvisioningJob('disable', {
            customerId: sub.userId,
            subscriptionId: sub.id,
            triggeredBy: 'cron:data-cap',
          }, jobId);

          // Update subscription data usage fields in DB
          // Set dataRemaining to 0 since cap is breached
          await sub.update({
            dataUsed: sub.dataUsed + Math.round(totalMb),
            dataRemaining: 0,
            status: SubscriptionStatus.SUSPENDED,
            suspensionReason: 'Auto-suspended: Data cap limit reached',
            suspendedAt: new Date(),
          });

          cutoffs++;
        } catch (queueErr) {
          logger.error(`Accounting sweep: Failed to enqueue disable job for subscription ${sub.id}`, {
            error: queueErr.message,
          });
        }
      }
    }

    logger.info(`RADIUS accounting sweep complete: checked ${processed} subscriptions, triggered ${cutoffs} cutoff(s)`);
    return { processed, cutoffs };

  } catch (err) {
    logger.error('Accounting sweep failed', { error: err.message, stack: err.stack });
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
