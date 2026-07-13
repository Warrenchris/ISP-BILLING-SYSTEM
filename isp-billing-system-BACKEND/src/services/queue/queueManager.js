/**
 * BullMQ Queue Manager
 *
 * Initializes Redis connection and defines the three Phase 1 queues:
 *   - provisioning: retry-safe enable/disable customer calls
 *   - expiry-check: scheduled subscription expiry sweeps
 *   - reconciliation: periodic provisioning state reconciliation
 *
 * All queues share the same Redis connection.
 */

const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../../config/logger');

let connection = null;
let provisioningQueue = null;
let expiryQueue = null;
let reconciliationQueue = null;

/**
 * Get or create the shared Redis connection for BullMQ.
 */
function getRedisConnection() {
  if (!connection) {
    connection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,    // Required by BullMQ
    });

    connection.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });

    connection.on('connect', () => {
      logger.info('Redis connected for BullMQ');
    });
  }
  return connection;
}

/**
 * Get the provisioning queue (enable/disable customer jobs).
 */
function getProvisioningQueue() {
  if (!provisioningQueue) {
    provisioningQueue = new Queue('provisioning', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: parseInt(process.env.PROVISIONING_MAX_RETRIES || '10', 10),
        backoff: {
          type: 'exponential',
          delay: 1000, // 1s → 2s → 4s → 8s → ... capped by BullMQ at ~5min
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24h
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
        },
      },
    });
  }
  return provisioningQueue;
}

/**
 * Get the expiry-check queue.
 */
function getExpiryQueue() {
  if (!expiryQueue) {
    expiryQueue = new Queue('expiry-check', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400 },
      },
    });
  }
  return expiryQueue;
}

/**
 * Get the reconciliation queue.
 */
function getReconciliationQueue() {
  if (!reconciliationQueue) {
    reconciliationQueue = new Queue('reconciliation', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 10000 },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400 },
      },
    });
  }
  return reconciliationQueue;
}

/**
 * Add a provisioning job with a deterministic jobId for dedup.
 *
 * @param {string} action - 'enable' or 'disable'
 * @param {object} data - { customerId, subscriptionId, triggeredBy }
 * @param {string} jobId - Deterministic job ID for dedup (e.g. `enable-${subId}-${receipt}`)
 * @returns {object} The BullMQ Job instance
 */
async function addProvisioningJob(action, data, jobId) {
  const queue = getProvisioningQueue();

  const job = await queue.add(`${action}-customer`, {
    ...data,
    action,
    enqueuedAt: new Date().toISOString(),
  }, {
    jobId, // Deterministic — BullMQ silently ignores if jobId already exists
  });

  logger.info(`Queued provisioning job: ${action}`, {
    jobId,
    customerId: data.customerId,
    subscriptionId: data.subscriptionId,
    triggeredBy: data.triggeredBy,
  });

  return job;
}

/**
 * Gracefully close all queues and Redis connection.
 */
async function closeAll() {
  const queues = [provisioningQueue, expiryQueue, reconciliationQueue].filter(Boolean);
  for (const q of queues) {
    await q.close();
  }
  if (connection) {
    await connection.quit();
    connection = null;
  }
  provisioningQueue = null;
  expiryQueue = null;
  reconciliationQueue = null;
  logger.info('All BullMQ queues closed');
}

module.exports = {
  getRedisConnection,
  getProvisioningQueue,
  getExpiryQueue,
  getReconciliationQueue,
  addProvisioningJob,
  closeAll,
};
