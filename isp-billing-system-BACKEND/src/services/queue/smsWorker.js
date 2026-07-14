/**
 * SMS BullMQ Worker
 *
 * Runs in the background to process SMS send requests asynchronously.
 * This guarantees delivery with retry safety, non-blocking execution,
 * E.164 phone formatting, and auditable logging.
 */

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../../config/logger');
const { getRedisConnection } = require('./queueManager');
const { sendSms } = require('../sms/smsClient');

let worker = null;

/**
 * Format a phone number to standard E.164 format.
 * Supports both Kenya (+254) and Uganda (+256) dynamically.
 *
 * @param {string} phone - input phone number string
 * @returns {string} E.164 formatted number (e.g. +254711223344)
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';

  // Strip all non-digit characters except starting '+'
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  const defaultCountry = process.env.DEFAULT_COUNTRY_CODE || '254';

  // Handle local 07... or 01... numbers
  if (cleaned.startsWith('0')) {
    return `+${defaultCountry}${cleaned.slice(1)}`;
  }

  // If country code is already prepended but missing '+'
  return `+${cleaned}`;
}

/**
 * Main job processing handler.
 */
async function processJob(job) {
  const { SmsTemplate, SmsLog } = require('../../models');

  const { to, templateKey, variables, tag } = job.data;

  logger.debug(`SMS Worker: Processing job ${job.id}`, { templateKey, to });

  if (!to || !templateKey) {
    throw new Error('SMS job missing required parameters: "to" or "templateKey"');
  }

  // 1. Load the template from the database
  const template = await SmsTemplate.findOne({ where: { key: templateKey } });
  if (!template) {
    throw new Error(`SMS template "${templateKey}" not found in database`);
  }

  // 2. Interpolate variables and format phone number
  const message = template.interpolate(variables);
  const normalizedPhone = formatPhoneNumber(to);

  // 3. Write a pending SmsLog entry
  const log = await SmsLog.create({
    recipientPhone: normalizedPhone,
    message,
    tag: tag || templateKey,
    status: 'pending',
    provider: process.env.SMS_PROVIDER || 'mock',
    cost: 0.00,
  });

  try {
    // 4. Call the gateway to send the SMS
    const result = await sendSms(normalizedPhone, message);

    // 5. Update the log with the result details
    await log.update({
      status: result.success ? 'sent' : 'failed',
      provider: result.provider,
      providerResponse: result.providerResponse,
      cost: result.cost,
      errorMessage: result.errorMessage,
    });

    if (!result.success) {
      throw new Error(`Gateway failed to deliver: ${result.errorMessage}`);
    }

    logger.info(`SMS sent successfully to "${normalizedPhone}"`, {
      logId: log.id,
      cost: result.cost,
      provider: result.provider,
    });

    return result;

  } catch (err) {
    // Capture error in database log
    await log.update({
      status: 'failed',
      errorMessage: err.message,
    });

    logger.error(`SMS job failed for "${normalizedPhone}"`, {
      jobId: job.id,
      error: err.message,
    });

    // Re-throw so BullMQ triggers retry options
    throw err;
  }
}

/**
 * Start the SMS worker process.
 */
function startWorker() {
  if (worker) {
    logger.warn('SMS worker already running');
    return worker;
  }

  const connection = getRedisConnection();

  worker = new Worker('sms', processJob, {
    connection,
    concurrency: 2, // Concurrency limit to prevent SMS gateway spamming
    limiter: {
      max: 10,
      duration: 1000, // Max 10 messages per second (Africa's Talking sandbox limit)
    },
  });

  worker.on('failed', (job, err) => {
    logger.error(`SMS queue job ${job?.id} permanently failed after retries:`, {
      error: err.message,
    });
  });

  logger.info('SMS BullMQ worker started');
  return worker;
}

/**
 * Stop the SMS worker.
 */
async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('SMS BullMQ worker stopped');
  }
}

module.exports = {
  startWorker,
  stopWorker,
  formatPhoneNumber,
};
