/**
 * Voucher Generation BullMQ Worker
 *
 * Decouples voucher generation from the payment HTTP transaction.
 * Retries on failure, updates database on success, and fires SMS alert to admin
 * if all retry attempts are exhausted.
 */

const { Worker } = require('bullmq');
const logger = require('../../config/logger');
const { getRedisConnection, addSmsJob } = require('./queueManager');
const voucherService = require('../voucherService');
const { Payment } = require('../../models');

let worker = null;

/**
 * Main job processing handler.
 */
async function processJob(job) {
  const { paymentId, phone, planId, userId } = job.data;

  logger.info(`Voucher Worker: Processing voucher generation for payment ${paymentId}`, {
    paymentId, phone, planId, userId
  });

  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  // If already processed and has voucher code, exit early (idempotency safety)
  if (payment.callbackData && payment.callbackData.voucherCode) {
    logger.info(`Voucher already generated for payment ${paymentId}`);
    return { voucherCode: payment.callbackData.voucherCode };
  }

  // 1. Call voucherService to generate and deliver the voucher
  const voucher = await voucherService.purchaseVoucherRemote(phone, planId, userId);

  // 2. Update payment callbackData with the generated code
  await payment.update({
    callbackData: {
      ...(payment.callbackData || {}),
      voucherCode: voucher.code,
    }
  });

  logger.info(`Voucher generated and linked to payment ${paymentId}: ${voucher.code}`);
  return { voucherCode: voucher.code };
}

/**
 * Start the voucher worker process.
 */
function startWorker() {
  if (worker) {
    logger.warn('Voucher worker already running');
    return worker;
  }

  const connection = getRedisConnection();

  worker = new Worker('voucher-generation', processJob, {
    connection,
    concurrency: 5,
  });

  worker.on('failed', async (job, err) => {
    logger.error(`Voucher worker: Job ${job?.id} failed permanently:`, { error: err.message });
    
    if (job) {
      try {
        const { paymentId, phone, planId } = job.data;
        const payment = await Payment.findByPk(paymentId);
        if (payment) {
          // Flag the payment row as failed
          await payment.update({
            callbackData: {
              ...(payment.callbackData || {}),
              voucherGenerationFailed: true,
            }
          });

          // Trigger admin alert SMS
          const adminPhone = process.env.ADMIN_ALERT_PHONE || process.env.ADMIN_PHONE || '+254711000000';
          const alertMessage = `CRITICAL: M-Pesa payment ${paymentId} succeeded for ${phone}, but voucher generation for plan ${planId} failed permanently. Manual intervention required.`;
          const alertJobId = `admin-alert-voucher-failed-${paymentId}`;
          await addSmsJob(adminPhone, 'admin_alert', { message: alertMessage }, 'admin', alertJobId);
          logger.info(`Admin alert queued for failed voucher generation of payment ${paymentId}`);
        }
      } catch (updateError) {
        logger.error('Failed to handle permanent voucher worker failure:', { error: updateError.message });
      }
    }
  });

  logger.info('Voucher BullMQ worker started');
  return worker;
}

/**
 * Stop the voucher worker.
 */
async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Voucher BullMQ worker stopped');
  }
}

module.exports = {
  startWorker,
  stopWorker,
  processJob,
};
