/**
 * SMS Sender Interface (Facade)
 *
 * Exposes methods to enqueue different SMS alert notification templates
 * with robust duplicate prevention using deterministic BullMQ jobIds.
 */

const { addSmsJob } = require('../queue/queueManager');
const logger = require('../../config/logger');

/**
 * Format a Date object to standard YYYY-MM-DD HH:MM.
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Send Payment Confirmation Receipt SMS.
 *
 * @param {object} user - User model instance
 * @param {object} subscription - Subscription model instance
 * @param {object} payment - Payment model instance
 */
async function sendPaymentReceipt(user, subscription, payment) {
  if (!user?.phoneNumber) {
    logger.warn('sendPaymentReceipt: User has no phone number, skipping SMS receipt');
    return;
  }

  const variables = {
    firstName: user.firstName || 'Customer',
    amount: payment.amount,
    plan: subscription.plan?.name || 'Internet Plan',
    endDate: formatDate(subscription.endDate),
  };

  const jobId = `receipt-sms-${payment.id}`;
  logger.debug(`Queuing payment receipt SMS for payment ${payment.id}`, { jobId });

  try {
    await addSmsJob(user.phoneNumber, 'payment_receipt', variables, 'payment', jobId);
  } catch (err) {
    logger.error('Failed to queue payment receipt SMS', { error: err.message, paymentId: payment.id });
  }
}

/**
 * Send pre-expiry dunning reminder warning SMS.
 *
 * @param {object} user - User model instance
 * @param {object} subscription - Subscription model instance
 * @param {number} hours - Hours remaining until expiry
 */
async function sendExpiryWarning(user, subscription, hours) {
  if (!user?.phoneNumber) {
    logger.warn('sendExpiryWarning: User has no phone number, skipping SMS warning');
    return;
  }

  const variables = {
    firstName: user.firstName || 'Customer',
    plan: subscription.plan?.name || 'Internet Plan',
    hours: hours,
    endDate: formatDate(subscription.endDate),
    subscriptionNumber: subscription.subscriptionNumber,
  };

  // Convert endDate to ISO string safely to construct jobId
  const dateStr = subscription.endDate instanceof Date 
    ? subscription.endDate.toISOString() 
    : new Date(subscription.endDate).toISOString();

  const jobId = `warning-sms-${subscription.id}-${dateStr}`;
  logger.debug(`Queuing expiry warning SMS for sub ${subscription.id}`, { jobId });

  try {
    await addSmsJob(user.phoneNumber, 'expiry_warning', variables, 'dunning', jobId);
  } catch (err) {
    logger.error('Failed to queue expiry warning SMS', { error: err.message, subscriptionId: subscription.id });
  }
}

/**
 * Send disconnection/cutoff notice SMS.
 *
 * @param {object} user - User model instance
 * @param {object} subscription - Subscription model instance
 */
async function sendDisconnectionNotice(user, subscription) {
  if (!user?.phoneNumber) {
    logger.warn('sendDisconnectionNotice: User has no phone number, skipping SMS notification');
    return;
  }

  const variables = {
    firstName: user.firstName || 'Customer',
    subscriptionNumber: subscription.subscriptionNumber,
    amount: subscription.plan?.price || '0.00',
  };

  // Dedup: Max 1 text message per user per calendar day to avoid spamming
  const todayStr = new Date().toISOString().split('T')[0];
  const jobId = `cutoff-sms-${subscription.id}-${todayStr}`;
  logger.debug(`Queuing cutoff SMS for sub ${subscription.id}`, { jobId });

  try {
    await addSmsJob(user.phoneNumber, 'disconnection_notice', variables, 'cutoff', jobId);
  } catch (err) {
    logger.error('Failed to queue cutoff warning SMS', { error: err.message, subscriptionId: subscription.id });
  }
}

/**
 * Send a purchased/redeemed voucher code by SMS.
 *
 * @param {string} phone - Buyer's phone number
 * @param {object} voucher - Voucher model instance
 * @param {object} plan - DataPlan model instance
 */
async function sendVoucherCode(phone, voucher, plan) {
  if (!phone) {
    logger.warn('sendVoucherCode: No phone number provided, skipping SMS voucher delivery');
    return;
  }

  const dataLimitStr = voucher.dataLimitMb 
    ? `${voucher.dataLimitMb} MB` 
    : (plan?.dataLimit ? `${plan.dataLimit} MB` : 'Unlimited');

  const validityStr = voucher.timeLimitMinutes 
    ? `${voucher.timeLimitMinutes} min` 
    : (plan?.validityPeriod ? `${plan.validityPeriod} days` : '1 day');

  const variables = {
    code: voucher.code,
    plan: plan?.name || 'Voucher Plan',
    dataLimit: dataLimitStr,
    validity: validityStr,
  };

  const jobId = `voucher-sms-${voucher.id}`;
  logger.debug(`Queuing voucher delivery SMS for voucher ${voucher.id}`, { jobId });

  try {
    await addSmsJob(phone, 'voucher_delivery', variables, 'voucher', jobId);
  } catch (err) {
    logger.error('Failed to queue voucher delivery SMS', { error: err.message, voucherId: voucher.id });
  }
}

module.exports = {
  sendPaymentReceipt,
  sendExpiryWarning,
  sendDisconnectionNotice,
  sendVoucherCode,
};
