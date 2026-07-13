/**
 * Hotspot Provisioning Strategy
 *
 * Manages customer internet access via MikroTik Hotspot IP bindings.
 * Disabling adds a "blocked" IP binding; enabling removes it.
 * Active sessions are dropped on disable for immediate effect.
 */

const mikrotikClient = require('../client');
const logger = require('../../../config/logger');

/**
 * Disable customer access by adding a "blocked" IP binding and dropping active session.
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} networkIdentifier - Customer's IP or MAC address
 * @param {string} triggeredBy - Audit trail source
 */
async function disableCustomer(device, networkIdentifier, triggeredBy) {
  // Check if already blocked
  const existing = await mikrotikClient.execute(
    device,
    '/ip/hotspot/ip-binding/print',
    { address: networkIdentifier },
    triggeredBy
  );

  const alreadyBlocked = existing && existing.some(b => b.type === 'blocked');

  if (!alreadyBlocked) {
    // Add a "blocked" IP binding
    await mikrotikClient.execute(
      device,
      '/ip/hotspot/ip-binding/add',
      {
        address: networkIdentifier,
        type: 'blocked',
        comment: `ISP-Billing auto-block | ${triggeredBy} | ${new Date().toISOString()}`,
      },
      triggeredBy
    );
    logger.info(`Hotspot: Added blocked binding for ${networkIdentifier} on "${device.name}"`);
  } else {
    logger.info(`Hotspot: ${networkIdentifier} already blocked on "${device.name}"`);
  }

  // Drop active session if any
  const activeSessions = await mikrotikClient.execute(
    device,
    '/ip/hotspot/active/print',
    { address: networkIdentifier },
    triggeredBy
  );

  if (activeSessions && activeSessions.length > 0) {
    for (const session of activeSessions) {
      await mikrotikClient.execute(
        device,
        '/ip/hotspot/active/remove',
        { '.id': session['.id'], address: networkIdentifier },
        triggeredBy
      );
    }
    logger.info(`Hotspot: Dropped ${activeSessions.length} active session(s) for ${networkIdentifier} on "${device.name}"`);
  }

  return { disabled: true, sessionsDropped: activeSessions ? activeSessions.length : 0 };
}

/**
 * Enable customer access by removing their "blocked" IP binding.
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} networkIdentifier - Customer's IP or MAC address
 * @param {string} triggeredBy - Audit trail source
 */
async function enableCustomer(device, networkIdentifier, triggeredBy) {
  // Find blocked bindings for this customer
  const bindings = await mikrotikClient.execute(
    device,
    '/ip/hotspot/ip-binding/print',
    { address: networkIdentifier },
    triggeredBy
  );

  if (!bindings || bindings.length === 0) {
    logger.info(`Hotspot: No blocked binding for ${networkIdentifier} on "${device.name}" — already enabled`);
    return { alreadyEnabled: true };
  }

  // Remove all blocked bindings
  const blockedBindings = bindings.filter(b => b.type === 'blocked');
  for (const binding of blockedBindings) {
    await mikrotikClient.execute(
      device,
      '/ip/hotspot/ip-binding/remove',
      { '.id': binding['.id'], address: networkIdentifier },
      triggeredBy
    );
  }

  logger.info(`Hotspot: Removed ${blockedBindings.length} blocked binding(s) for ${networkIdentifier} on "${device.name}"`);
  return { removed: blockedBindings.length };
}

/**
 * Check if a customer is blocked via hotspot IP binding.
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} networkIdentifier - Customer's IP or MAC address
 * @returns {'active'|'suspended'|'unknown'}
 */
async function getCustomerStatus(device, networkIdentifier) {
  try {
    const bindings = await mikrotikClient.execute(
      device,
      '/ip/hotspot/ip-binding/print',
      { address: networkIdentifier },
      'system:status-check'
    );

    const isBlocked = bindings && bindings.some(b => b.type === 'blocked');
    return isBlocked ? 'suspended' : 'active';
  } catch (err) {
    logger.error(`Hotspot: Failed to check status for ${networkIdentifier} on "${device.name}"`, {
      error: err.message,
    });
    return 'unknown';
  }
}

module.exports = {
  enableCustomer,
  disableCustomer,
  getCustomerStatus,
};
