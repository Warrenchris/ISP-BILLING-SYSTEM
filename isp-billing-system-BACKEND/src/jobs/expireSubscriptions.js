/**
 * Subscription Expiry Job
 *
 * Scheduled job that finds expired subscriptions (past grace period)
 * and enqueues BullMQ disable jobs with deterministic jobIds.
 *
 * Runs on a cron schedule (default: every 10 minutes).
 * BullMQ handles dedup: if the same jobId already exists, the add is a no-op.
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { addProvisioningJob } = require('../services/queue/queueManager');

let cronTask = null;

/**
 * Run one sweep: find expired subscriptions and enqueue disable jobs.
 */
async function runExpirySweep() {
  const { Subscription, NetworkDevice, sequelize } = require('../models');
  const { SubscriptionStatus } = require('../config/constants');

  const now = new Date();

  logger.info('Running subscription expiry sweep', { timestamp: now.toISOString() });

  try {
    // Find active subscriptions that have expired past their grace period
    // SQL equivalent: WHERE status = 'active'
    //   AND end_date IS NOT NULL
    //   AND connection_type IS NOT NULL
    //   AND network_device_id IS NOT NULL
    //   AND (end_date + INTERVAL grace_period_hours HOUR) < NOW()
    const expiredSubscriptions = await Subscription.findAll({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: { [Op.ne]: null },
        connectionType: { [Op.ne]: null },
        networkDeviceId: { [Op.ne]: null },
        networkIdentifier: { [Op.ne]: null },
        [Op.and]: sequelize.literal('DATE_ADD(end_date, INTERVAL grace_period_hours HOUR) < NOW()')
      },
      include: [
        { model: NetworkDevice, as: 'NetworkDevice', where: { isActive: true } },
      ],
      limit: 100, // Process in batches to avoid overload
    });

    // Filter in application code for grace period (Sequelize doesn't easily
    // support `end_date + INTERVAL grace_period_hours HOUR < NOW()`)
    const pastGrace = expiredSubscriptions.filter(sub => {
      const endDate = new Date(sub.endDate);
      const graceMs = (sub.gracePeriodHours || 0) * 60 * 60 * 1000;
      const cutoffTime = new Date(endDate.getTime() + graceMs);
      return now > cutoffTime;
    });

    if (pastGrace.length === 0) {
      logger.info('Expiry sweep: no expired subscriptions found');
      return { processed: 0 };
    }

    logger.info(`Expiry sweep: found ${pastGrace.length} expired subscription(s) past grace period`);

    let enqueued = 0;
    let skipped = 0;

    for (const sub of pastGrace) {
      // Deterministic jobId: disable-{subId}-{endDate}
      // Same subscription + same endDate = same jobId = BullMQ dedup
      const jobId = `disable-${sub.id}-${sub.endDate.toISOString()}`;

      try {
        await addProvisioningJob('disable', {
          customerId: sub.userId,
          subscriptionId: sub.id,
          triggeredBy: 'cron:expiry',
        }, jobId);

        enqueued++;
      } catch (err) {
        // If it's a duplicate jobId, BullMQ won't throw — it returns the existing job.
        // This catch is for actual queue errors (Redis down, etc.)
        logger.error(`Expiry sweep: failed to enqueue disable for subscription ${sub.id}`, {
          error: err.message,
        });
        skipped++;
      }
    }

    logger.info(`Expiry sweep complete: ${enqueued} enqueued, ${skipped} skipped`, {
      total: pastGrace.length,
    });

    return { processed: pastGrace.length, enqueued, skipped };

  } catch (err) {
    logger.error('Expiry sweep failed', { error: err.message, stack: err.stack });
    throw err;
  }
}

/**
 * Start the expiry check cron job.
 * @param {string} [cronExpression] - Cron expression (default from env or every 10 min)
 */
function startExpiryScheduler(cronExpression) {
  const schedule = cronExpression || process.env.EXPIRY_CHECK_CRON || '*/10 * * * *';

  if (cronTask) {
    logger.warn('Expiry scheduler already running');
    return;
  }

  if (!cron.validate(schedule)) {
    logger.error(`Invalid cron expression for expiry check: "${schedule}"`);
    return;
  }

  cronTask = cron.schedule(schedule, async () => {
    try {
      await runExpirySweep();
    } catch (err) {
      // Error already logged in runExpirySweep
    }
  });

  logger.info(`Expiry scheduler started: "${schedule}"`);
}

/**
 * Stop the expiry check cron job.
 */
function stopExpiryScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('Expiry scheduler stopped');
  }
}

module.exports = {
  runExpirySweep,
  startExpiryScheduler,
  stopExpiryScheduler,
};
