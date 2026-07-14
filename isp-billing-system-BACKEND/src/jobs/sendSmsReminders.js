/**
 * Scheduled SMS Dunning Job
 *
 * Runs periodically (default: every hour) to find subscriptions expiring within
 * the warning window (default: 24 hours) and send pre-expiry warning alerts.
 * Automatically handles cycle resets to prevent alert fatigue.
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { sendExpiryWarning } = require('../services/sms/smsSender');

let cronTask = null;

/**
 * Execute a single dunning sweep.
 */
async function runDunningSweep() {
  const { Subscription, User, DataPlan } = require('../models');
  const { SubscriptionStatus } = require('../config/constants');

  const now = new Date();
  const warningWindowHours = parseInt(process.env.SMS_DUNNING_WINDOW_HOURS || '24', 10);
  const cutoffLimit = new Date(now.getTime() + warningWindowHours * 60 * 60 * 1000);

  logger.info('Running SMS dunning check sweep...', {
    windowHours: warningWindowHours,
    cutoffLimit: cutoffLimit.toISOString(),
  });

  try {
    // 1. Fetch active subscriptions expiring within the warning threshold
    const expiringSubscriptions = await Subscription.findAll({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          [Op.gt]: now,
          [Op.lte]: cutoffLimit,
        },
      },
      include: [
        { model: User, as: 'User' },
        { model: DataPlan, as: 'plan' },
      ],
    });

    if (expiringSubscriptions.length === 0) {
      logger.info('SMS dunning: No expiring subscriptions found');
      return { processed: 0, sent: 0 };
    }

    // 2. Filter out subscriptions that already received an alert in the CURRENT cycle
    const eligible = expiringSubscriptions.filter(sub => {
      if (!sub.User?.phoneNumber) return false;

      // If never sent, it is eligible
      if (!sub.reminderSentAt) return true;

      // Cycle start is the lastBillingDate, fallback to activatedAt, fallback to createdAt
      const cycleStart = sub.lastBillingDate
        ? new Date(sub.lastBillingDate)
        : (sub.activatedAt ? new Date(sub.activatedAt) : new Date(sub.createdAt));

      // Eligible if the reminder was sent BEFORE this billing cycle started (i.e. in a previous month)
      const lastSent = new Date(sub.reminderSentAt);
      return lastSent < cycleStart;
    });

    if (eligible.length === 0) {
      logger.info('SMS dunning: Expiring subscriptions exist, but all have already been notified this cycle');
      return { processed: expiringSubscriptions.length, sent: 0 };
    }

    logger.info(`SMS dunning: Found ${eligible.length} eligible subscription(s) for warning alerts`);

    let sent = 0;
    for (const sub of eligible) {
      // Calculate remaining hours safely
      const hoursRemaining = Math.ceil((new Date(sub.endDate) - now) / (1000 * 60 * 60));

      try {
        // Enqueue SMS job
        await sendExpiryWarning(sub.User, sub, hoursRemaining);

        // Mark reminder as sent on subscription row
        await sub.update({ reminderSentAt: now });
        sent++;
      } catch (err) {
        logger.error(`SMS dunning: Failed to queue warning for sub ${sub.id}`, { error: err.message });
      }
    }

    logger.info(`SMS dunning sweep complete: sent ${sent}/${eligible.length} reminders`);
    return { processed: expiringSubscriptions.length, sent };

  } catch (err) {
    logger.error('SMS dunning sweep failed', { error: err.message, stack: err.stack });
    throw err;
  }
}

/**
 * Start the dunning scheduler cron.
 * Runs hourly by default.
 *
 * @param {string} [cronExpression] - Cron expression
 */
function startDunningScheduler(cronExpression) {
  const schedule = cronExpression || process.env.DUNNING_CHECK_CRON || '0 * * * *'; // Default: every hour on the hour

  if (cronTask) {
    logger.warn('Dunning warning scheduler already running');
    return;
  }

  if (!cron.validate(schedule)) {
    logger.error(`Invalid cron expression for dunning: "${schedule}"`);
    return;
  }

  cronTask = cron.schedule(schedule, async () => {
    try {
      await runDunningSweep();
    } catch (err) {
      // Error already logged
    }
  });

  logger.info(`SMS dunning warning scheduler started: "${schedule}"`);
}

/**
 * Stop the dunning warning scheduler.
 */
function stopDunningScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('SMS dunning warning scheduler stopped');
  }
}

module.exports = {
  runDunningSweep,
  startDunningScheduler,
  stopDunningScheduler,
};
