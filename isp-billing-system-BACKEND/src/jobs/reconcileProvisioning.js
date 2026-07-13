/**
 * Provisioning Reconciliation Sweep
 *
 * Periodic job that compares subscription status in MySQL against actual
 * router state and self-heals mismatches. This is the safety net for edge
 * cases where the queue/callback path silently failed.
 *
 * Runs on a cron schedule (default: every 30 minutes).
 * Rate-limited to 50 subscriptions per run to avoid router overload.
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const provisioning = require('../services/mikrotik/provisioning');
const { addProvisioningJob } = require('../services/queue/queueManager');

let cronTask = null;

const MAX_PER_RUN = 50; // Rate limit: max subscriptions to check per sweep

/**
 * Run one reconciliation sweep.
 */
async function runReconciliationSweep() {
  const { Subscription, NetworkDevice } = require('../models');
  const { SubscriptionStatus } = require('../config/constants');

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD for jobId dedup

  logger.info('Running provisioning reconciliation sweep', { timestamp: now.toISOString() });

  try {
    // ── Check 1: Active in DB but suspended on router ─────────────────
    // (Customer paid but router didn't get the enable command)
    const activeSubscriptions = await Subscription.findAll({
      where: {
        status: SubscriptionStatus.ACTIVE,
        connectionType: { [Op.ne]: null },
        networkDeviceId: { [Op.ne]: null },
        networkIdentifier: { [Op.ne]: null },
        endDate: { [Op.gt]: now }, // Not yet expired
      },
      include: [
        { model: NetworkDevice, as: 'NetworkDevice', where: { isActive: true } },
      ],
      order: [['last_provisioning_attempt', 'ASC NULLS FIRST']],
      limit: MAX_PER_RUN,
    });

    let enableMismatches = 0;
    let disableMismatches = 0;

    for (const sub of activeSubscriptions) {
      try {
        const routerStatus = await provisioning.getCustomerStatus(sub.userId, sub.id);

        if (routerStatus === 'suspended') {
          // DB says active, router says suspended → re-enable
          const jobId = `reconcile-enable-${sub.id}-${dateStr}`;

          await addProvisioningJob('enable', {
            customerId: sub.userId,
            subscriptionId: sub.id,
            triggeredBy: 'cron:reconcile',
          }, jobId);

          enableMismatches++;
          logger.warn(`Reconciliation: subscription ${sub.id} is ACTIVE in DB but SUSPENDED on router — enqueued enable`, {
            customerId: sub.userId,
            networkIdentifier: sub.networkIdentifier,
          });
        }
      } catch (err) {
        // Skip this subscription, try the next one
        logger.error(`Reconciliation: error checking active subscription ${sub.id}`, {
          error: err.message,
        });
      }
    }

    // ── Check 2: Suspended in DB but active on router ─────────────────
    // (Cron disabled them in DB but router didn't get the disable command)
    const suspendedSubscriptions = await Subscription.findAll({
      where: {
        status: SubscriptionStatus.SUSPENDED,
        connectionType: { [Op.ne]: null },
        networkDeviceId: { [Op.ne]: null },
        networkIdentifier: { [Op.ne]: null },
      },
      include: [
        { model: NetworkDevice, as: 'NetworkDevice', where: { isActive: true } },
      ],
      order: [['last_provisioning_attempt', 'ASC NULLS FIRST']],
      limit: MAX_PER_RUN,
    });

    for (const sub of suspendedSubscriptions) {
      try {
        const routerStatus = await provisioning.getCustomerStatus(sub.userId, sub.id);

        if (routerStatus === 'active') {
          // DB says suspended, router says active → re-disable
          const jobId = `reconcile-disable-${sub.id}-${dateStr}`;

          await addProvisioningJob('disable', {
            customerId: sub.userId,
            subscriptionId: sub.id,
            triggeredBy: 'cron:reconcile',
          }, jobId);

          disableMismatches++;
          logger.warn(`Reconciliation: subscription ${sub.id} is SUSPENDED in DB but ACTIVE on router — enqueued disable`, {
            customerId: sub.userId,
            networkIdentifier: sub.networkIdentifier,
          });
        }
      } catch (err) {
        logger.error(`Reconciliation: error checking suspended subscription ${sub.id}`, {
          error: err.message,
        });
      }
    }

    logger.info(`Reconciliation sweep complete`, {
      activeChecked: activeSubscriptions.length,
      suspendedChecked: suspendedSubscriptions.length,
      enableMismatches,
      disableMismatches,
    });

    return {
      activeChecked: activeSubscriptions.length,
      suspendedChecked: suspendedSubscriptions.length,
      enableMismatches,
      disableMismatches,
    };

  } catch (err) {
    logger.error('Reconciliation sweep failed', { error: err.message, stack: err.stack });
    throw err;
  }
}

/**
 * Start the reconciliation cron job.
 * @param {string} [cronExpression] - Cron expression (default from env or every 30 min)
 */
function startReconciliationScheduler(cronExpression) {
  const schedule = cronExpression || process.env.RECONCILIATION_CRON || '*/30 * * * *';

  if (cronTask) {
    logger.warn('Reconciliation scheduler already running');
    return;
  }

  if (!cron.validate(schedule)) {
    logger.error(`Invalid cron expression for reconciliation: "${schedule}"`);
    return;
  }

  cronTask = cron.schedule(schedule, async () => {
    try {
      await runReconciliationSweep();
    } catch (err) {
      // Error already logged in runReconciliationSweep
    }
  });

  logger.info(`Reconciliation scheduler started: "${schedule}"`);
}

/**
 * Stop the reconciliation cron job.
 */
function stopReconciliationScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('Reconciliation scheduler stopped');
  }
}

module.exports = {
  runReconciliationSweep,
  startReconciliationScheduler,
  stopReconciliationScheduler,
};
