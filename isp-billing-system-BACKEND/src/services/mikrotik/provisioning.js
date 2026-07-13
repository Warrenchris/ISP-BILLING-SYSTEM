/**
 * Provisioning Abstraction Layer
 *
 * The single interface the rest of the app calls for enabling/disabling
 * customer internet access. Internally dispatches to the correct strategy
 * based on subscription.connectionType.
 *
 * Usage:
 *   const provisioning = require('./provisioning');
 *   await provisioning.enableCustomer(customerId);
 *   await provisioning.disableCustomer(customerId);
 *   const status = await provisioning.getCustomerStatus(customerId);
 */

const logger = require('../../config/logger');

// Strategy modules
const addressListStrategy = require('./strategies/addressListStrategy');
const pppoeStrategy = require('./strategies/pppoeStrategy');
const hotspotStrategy = require('./strategies/hotspotStrategy');

const STRATEGIES = {
  address_list: addressListStrategy,
  pppoe: pppoeStrategy,
  hotspot: hotspotStrategy,
};

/**
 * Get the active subscription with its network device for a customer.
 * @param {string} customerId - User UUID
 * @returns {object|null} { subscription, device } or null
 */
async function getSubscriptionWithDevice(customerId) {
  // Lazy import to avoid circular dependencies at module load
  const { Subscription, NetworkDevice, DataPlan } = require('../../models');
  const { SubscriptionStatus } = require('../../config/constants');
  const { Op } = require('sequelize');

  const subscription = await Subscription.findOne({
    where: {
      userId: customerId,
      status: { [Op.in]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.EXPIRED] },
      connectionType: { [Op.ne]: null },
      networkDeviceId: { [Op.ne]: null },
      networkIdentifier: { [Op.ne]: null },
    },
    include: [
      { model: NetworkDevice, as: 'NetworkDevice' },
      { model: DataPlan, as: 'plan' },
    ],
    order: [['created_at', 'DESC']],
  });

  if (!subscription) return null;
  if (!subscription.NetworkDevice) {
    logger.warn(`Subscription ${subscription.id} has networkDeviceId but no matching device record`);
    return null;
  }

  return {
    subscription,
    device: subscription.NetworkDevice,
  };
}

/**
 * Get the active subscription with device by subscription ID.
 * @param {string} subscriptionId - Subscription UUID
 * @returns {object|null} { subscription, device } or null
 */
async function getSubscriptionByIdWithDevice(subscriptionId) {
  const { Subscription, NetworkDevice, DataPlan } = require('../../models');

  const subscription = await Subscription.findByPk(subscriptionId, {
    include: [
      { model: NetworkDevice, as: 'NetworkDevice' },
      { model: DataPlan, as: 'plan' },
    ],
  });

  if (!subscription) return null;
  if (!subscription.connectionType || !subscription.networkDeviceId || !subscription.networkIdentifier) {
    logger.warn(`Subscription ${subscriptionId} is not configured for network provisioning`);
    return null;
  }
  if (!subscription.NetworkDevice) {
    logger.warn(`Subscription ${subscriptionId} references missing device ${subscription.networkDeviceId}`);
    return null;
  }

  return {
    subscription,
    device: subscription.NetworkDevice,
  };
}

/**
 * Get the strategy module for a connection type.
 */
function getStrategy(connectionType) {
  const strategy = STRATEGIES[connectionType];
  if (!strategy) {
    throw new Error(`Unknown connection type: "${connectionType}". Must be one of: ${Object.keys(STRATEGIES).join(', ')}`);
  }
  return strategy;
}

/**
 * Enable a customer's internet access.
 *
 * @param {string} customerId - User UUID
 * @param {string} [triggeredBy='system'] - Audit trail source
 * @param {string} [subscriptionId] - Optional specific subscription ID
 * @returns {object} Result from the strategy
 */
async function enableCustomer(customerId, triggeredBy = 'system', subscriptionId = null) {
  const data = subscriptionId
    ? await getSubscriptionByIdWithDevice(subscriptionId)
    : await getSubscriptionWithDevice(customerId);

  if (!data) {
    logger.warn(`enableCustomer: No provisioning-configured subscription found for customer ${customerId}`);
    return { skipped: true, reason: 'no_provisioning_config' };
  }

  const { subscription, device } = data;
  const strategy = getStrategy(subscription.connectionType);

  logger.info(`Enabling customer ${customerId} via ${subscription.connectionType} on "${device.name}"`, {
    subscriptionId: subscription.id,
    networkIdentifier: subscription.networkIdentifier,
    triggeredBy,
  });

  const result = await strategy.enableCustomer(device, subscription.networkIdentifier, triggeredBy);

  // Update provisioning tracking
  await subscription.update({
    provisioningRetryCount: 0,
    lastProvisioningAttempt: new Date(),
  });

  return result;
}

/**
 * Disable a customer's internet access (non-destructive, reversible).
 *
 * @param {string} customerId - User UUID
 * @param {string} [triggeredBy='system'] - Audit trail source
 * @param {string} [subscriptionId] - Optional specific subscription ID
 * @returns {object} Result from the strategy
 */
async function disableCustomer(customerId, triggeredBy = 'system', subscriptionId = null) {
  const data = subscriptionId
    ? await getSubscriptionByIdWithDevice(subscriptionId)
    : await getSubscriptionWithDevice(customerId);

  if (!data) {
    logger.warn(`disableCustomer: No provisioning-configured subscription found for customer ${customerId}`);
    return { skipped: true, reason: 'no_provisioning_config' };
  }

  const { subscription, device } = data;
  const strategy = getStrategy(subscription.connectionType);

  logger.info(`Disabling customer ${customerId} via ${subscription.connectionType} on "${device.name}"`, {
    subscriptionId: subscription.id,
    networkIdentifier: subscription.networkIdentifier,
    triggeredBy,
  });

  const result = await strategy.disableCustomer(device, subscription.networkIdentifier, triggeredBy);

  // Update provisioning tracking
  await subscription.update({
    lastProvisioningAttempt: new Date(),
  });

  return result;
}

/**
 * Check a customer's actual network status on the router.
 *
 * @param {string} customerId - User UUID
 * @param {string} [subscriptionId] - Optional specific subscription ID
 * @returns {'active'|'suspended'|'unknown'}
 */
async function getCustomerStatus(customerId, subscriptionId = null) {
  const data = subscriptionId
    ? await getSubscriptionByIdWithDevice(subscriptionId)
    : await getSubscriptionWithDevice(customerId);

  if (!data) return 'unknown';

  const { subscription, device } = data;
  const strategy = getStrategy(subscription.connectionType);

  return strategy.getCustomerStatus(device, subscription.networkIdentifier);
}

module.exports = {
  enableCustomer,
  disableCustomer,
  getCustomerStatus,
  // Exported for testing / direct use with subscription ID
  getSubscriptionWithDevice,
  getSubscriptionByIdWithDevice,
};
