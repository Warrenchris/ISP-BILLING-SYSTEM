/**
 * Provisioning Worker
 *
 * BullMQ worker that processes provisioning jobs (enable/disable customers).
 * Circuit-breaker-aware: if a router's circuit is open, the job is requeued
 * with a delay WITHOUT consuming a retry attempt.
 */

const { Worker } = require('bullmq');
const logger = require('../../config/logger');
const provisioning = require('../mikrotik/provisioning');
const mikrotikClient = require('../mikrotik/client');
const { getRedisConnection } = require('./queueManager');

let worker = null;

const CIRCUIT_REQUEUE_DELAY_MS = parseInt(process.env.CIRCUIT_BREAKER_REQUEUE_DELAY_MS || '60000', 10);

/**
 * Process a single provisioning job.
 *
 * @param {object} job - BullMQ Job instance
 * @param {object} job.data - { action, customerId, subscriptionId, triggeredBy }
 */
async function processJob(job) {
  const { action, customerId, subscriptionId, triggeredBy } = job.data;

  logger.info(`Processing provisioning job: ${action}`, {
    jobId: job.id,
    customerId,
    subscriptionId,
    triggeredBy,
    attempt: job.attemptsMade + 1,
  });

  // ── Pre-flight: Check circuit breaker state ─────────────────────────
  // Look up the subscription's device to check circuit state
  const subData = await provisioning.getSubscriptionByIdWithDevice(subscriptionId);

  if (subData && subData.device) {
    const circuitState = mikrotikClient.getCircuitState(subData.device.id);

    if (circuitState === 'open') {
      // Router is known-unreachable. DON'T burn a retry attempt.
      // Throw a special error that our error handler will catch.
      const err = new Error(
        `Circuit breaker OPEN for router "${subData.device.name}" (${subData.device.id}). ` +
        `Requeuing with ${CIRCUIT_REQUEUE_DELAY_MS}ms delay without consuming retry attempt.`
      );
      err.code = 'CIRCUIT_OPEN';
      err.retryAfterMs = CIRCUIT_REQUEUE_DELAY_MS;
      throw err;
    }
  }

  // ── Execute the provisioning action ─────────────────────────────────
  if (action === 'enable') {
    const result = await provisioning.enableCustomer(customerId, triggeredBy, subscriptionId);
    logger.info(`Provisioning enable completed for customer ${customerId}`, { result });
    return result;

  } else if (action === 'disable') {
    const result = await provisioning.disableCustomer(customerId, triggeredBy, subscriptionId);

    // On successful disable, update subscription status
    if (result && !result.skipped) {
      const { Subscription } = require('../../models');
      const { SubscriptionStatus } = require('../../config/constants');

      await Subscription.update(
        {
          status: SubscriptionStatus.SUSPENDED,
          suspensionReason: `Auto-suspended: ${triggeredBy}`,
          provisioningRetryCount: 0,
        },
        { where: { id: subscriptionId } }
      );
      logger.info(`Subscription ${subscriptionId} marked as SUSPENDED`);
    }

    return result;

  } else {
    throw new Error(`Unknown provisioning action: ${action}`);
  }
}

/**
 * Start the provisioning worker.
 */
function startWorker() {
  if (worker) {
    logger.warn('Provisioning worker already running');
    return worker;
  }

  worker = new Worker('provisioning', processJob, {
    connection: getRedisConnection(),
    concurrency: 5, // Process up to 5 jobs in parallel
    limiter: {
      max: 20,     // Max 20 jobs per...
      duration: 60000, // ...60 seconds (prevents router overload)
    },
  });

  // ── Event handlers ──────────────────────────────────────────────────

  worker.on('completed', (job, result) => {
    logger.info(`Provisioning job completed: ${job.id}`, {
      action: job.data.action,
      customerId: job.data.customerId,
      result,
    });
  });

  worker.on('failed', async (job, err) => {
    // ── Circuit breaker special handling ───────────────────────────────
    // If the error is CIRCUIT_OPEN, requeue without consuming a retry attempt.
    if (err.code === 'CIRCUIT_OPEN' && err.retryAfterMs) {
      try {
        // Move the job to delayed state manually, preserving attemptsMade
        await job.moveToDelayed(Date.now() + err.retryAfterMs, job.token);
        logger.info(`Provisioning job ${job.id} requeued (circuit open), delay ${err.retryAfterMs}ms. Attempts NOT consumed.`);
        return;
      } catch (moveErr) {
        logger.warn(`Failed to requeue job ${job.id} after circuit open: ${moveErr.message}`);
        // Fall through to normal failure handling
      }
    }

    // ── Normal failure handling ────────────────────────────────────────
    const isFinalAttempt = job.attemptsMade >= job.opts.attempts;

    if (isFinalAttempt) {
      logger.error(`Provisioning job PERMANENTLY FAILED: ${job.id}`, {
        action: job.data.action,
        customerId: job.data.customerId,
        subscriptionId: job.data.subscriptionId,
        attempts: job.attemptsMade,
        error: err.message,
      });

      // Update subscription retry count for visibility in admin dashboard
      try {
        const { Subscription } = require('../../models');
        await Subscription.update(
          { provisioningRetryCount: job.attemptsMade },
          { where: { id: job.data.subscriptionId } }
        );
      } catch (updateErr) {
        logger.error(`Failed to update retry count for ${job.data.subscriptionId}`, { error: updateErr.message });
      }
    } else {
      logger.warn(`Provisioning job attempt ${job.attemptsMade}/${job.opts.attempts} failed: ${job.id}`, {
        error: err.message,
        nextAttemptIn: `${Math.pow(2, job.attemptsMade) * 1000}ms`,
      });
    }
  });

  worker.on('error', (err) => {
    logger.error('Provisioning worker error', { error: err.message });
  });

  logger.info('Provisioning worker started (concurrency=5, rate=20/min)');
  return worker;
}

/**
 * Stop the provisioning worker gracefully.
 */
async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Provisioning worker stopped');
  }
}

module.exports = {
  startWorker,
  stopWorker,
  // Exported for testing
  processJob,
};
