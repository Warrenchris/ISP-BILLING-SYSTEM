/**
 * PPPoE Provisioning Strategy
 *
 * Manages customer internet access by enabling/disabling their PPPoE secret
 * on the MikroTik router, and force-dropping active sessions when disabling
 * so the change takes effect immediately.
 */

const mikrotikClient = require('../client');
const logger = require('../../../config/logger');

/**
 * Disable customer access by disabling their PPPoE secret and dropping active session.
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} networkIdentifier - PPPoE username (the secret name)
 * @param {string} triggeredBy - Audit trail source
 */
async function disableCustomer(device, networkIdentifier, triggeredBy) {
  // First: disable the PPPoE secret so they can't reconnect
  const secrets = await mikrotikClient.execute(
    device,
    '/ppp/secret/print',
    { name: networkIdentifier },
    triggeredBy
  );

  if (secrets && secrets.length > 0) {
    const secret = secrets[0];

    // Check if already disabled
    if (secret.disabled === 'yes' || secret.disabled === 'true' || secret.disabled === true) {
      logger.info(`PPPoE: Secret "${networkIdentifier}" already disabled on "${device.name}"`);
    } else {
      await mikrotikClient.execute(
        device,
        '/ppp/secret/set',
        { '.id': secret['.id'], name: networkIdentifier, disabled: 'yes' },
        triggeredBy
      );
      logger.info(`PPPoE: Disabled secret "${networkIdentifier}" on "${device.name}"`);
    }
  } else {
    logger.warn(`PPPoE: Secret "${networkIdentifier}" not found on "${device.name}" — cannot disable`);
  }

  // Second: force-drop any active PPPoE session so disconnection is immediate
  const activeSessions = await mikrotikClient.execute(
    device,
    '/ppp/active/print',
    { name: networkIdentifier },
    triggeredBy
  );

  if (activeSessions && activeSessions.length > 0) {
    for (const session of activeSessions) {
      await mikrotikClient.execute(
        device,
        '/ppp/active/remove',
        { '.id': session['.id'], name: networkIdentifier },
        triggeredBy
      );
    }
    logger.info(`PPPoE: Dropped ${activeSessions.length} active session(s) for "${networkIdentifier}" on "${device.name}"`);
  }

  return { disabled: true, sessionsDropped: activeSessions ? activeSessions.length : 0 };
}

/**
 * Enable customer access by re-enabling their PPPoE secret.
 * Customer will need to reconnect (PPPoE client typically auto-retries).
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} networkIdentifier - PPPoE username (the secret name)
 * @param {string} triggeredBy - Audit trail source
 */
async function enableCustomer(device, networkIdentifier, triggeredBy) {
  const secrets = await mikrotikClient.execute(
    device,
    '/ppp/secret/print',
    { name: networkIdentifier },
    triggeredBy
  );

  if (secrets && secrets.length > 0) {
    const secret = secrets[0];

    // Check if already enabled
    if (secret.disabled === 'no' || secret.disabled === 'false' || secret.disabled === false || !secret.disabled) {
      logger.info(`PPPoE: Secret "${networkIdentifier}" already enabled on "${device.name}"`);
      return { alreadyEnabled: true };
    }

    await mikrotikClient.execute(
      device,
      '/ppp/secret/set',
      { '.id': secret['.id'], name: networkIdentifier, disabled: 'no' },
      triggeredBy
    );
    logger.info(`PPPoE: Enabled secret "${networkIdentifier}" on "${device.name}"`);
    return { enabled: true };
  }

  logger.warn(`PPPoE: Secret "${networkIdentifier}" not found on "${device.name}" — cannot enable`);
  return { notFound: true };
}

/**
 * Check if a customer's PPPoE secret is enabled or disabled.
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} networkIdentifier - PPPoE username
 * @returns {'active'|'suspended'|'unknown'}
 */
async function getCustomerStatus(device, networkIdentifier) {
  try {
    const secrets = await mikrotikClient.execute(
      device,
      '/ppp/secret/print',
      { name: networkIdentifier },
      'system:status-check'
    );

    if (!secrets || secrets.length === 0) return 'unknown';

    const secret = secrets[0];
    const isDisabled = secret.disabled === 'yes' || secret.disabled === 'true' || secret.disabled === true;
    return isDisabled ? 'suspended' : 'active';
  } catch (err) {
    logger.error(`PPPoE: Failed to check status for "${networkIdentifier}" on "${device.name}"`, {
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
