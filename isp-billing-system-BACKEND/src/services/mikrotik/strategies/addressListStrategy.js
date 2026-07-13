/**
 * Address List Provisioning Strategy
 *
 * Manages customer internet access by adding/removing their IP (or MAC)
 * from a MikroTik firewall address-list (e.g. "cutoff-list").
 *
 * Prerequisites on the router:
 *   - A firewall filter rule that drops/rejects traffic from the address-list
 *   - See docs/mikrotik-setup.md for exact configuration commands
 */

const mikrotikClient = require('../client');
const logger = require('../../../config/logger');

/**
 * Disable customer access by adding their IP/MAC to the cutoff address-list.
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} networkIdentifier - Customer's IP or MAC address
 * @param {string} triggeredBy - Audit trail source
 */
async function disableCustomer(device, networkIdentifier, triggeredBy) {
  const listName = device.cutoffAddressList || 'cutoff-list';

  // Check if already in the list (idempotency)
  const existing = await mikrotikClient.execute(
    device,
    '/ip/firewall/address-list/print',
    { list: listName, address: networkIdentifier },
    triggeredBy
  );

  if (existing && existing.length > 0) {
    logger.info(`Address-list: ${networkIdentifier} already in "${listName}" on "${device.name}" — skipping`);
    return { alreadyDisabled: true };
  }

  // Add to cutoff list
  const result = await mikrotikClient.execute(
    device,
    '/ip/firewall/address-list/add',
    {
      list: listName,
      address: networkIdentifier,
      comment: `ISP-Billing auto-cutoff | ${triggeredBy} | ${new Date().toISOString()}`,
    },
    triggeredBy
  );

  logger.info(`Address-list: Added ${networkIdentifier} to "${listName}" on "${device.name}"`);
  return result;
}

/**
 * Enable customer access by removing their IP/MAC from the cutoff address-list.
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} networkIdentifier - Customer's IP or MAC address
 * @param {string} triggeredBy - Audit trail source
 */
async function enableCustomer(device, networkIdentifier, triggeredBy) {
  const listName = device.cutoffAddressList || 'cutoff-list';

  // Find the entry in the list
  const entries = await mikrotikClient.execute(
    device,
    '/ip/firewall/address-list/print',
    { list: listName, address: networkIdentifier },
    triggeredBy
  );

  if (!entries || entries.length === 0) {
    logger.info(`Address-list: ${networkIdentifier} not in "${listName}" on "${device.name}" — already enabled`);
    return { alreadyEnabled: true };
  }

  // Remove all matching entries (there could be duplicates from manual adds)
  for (const entry of entries) {
    await mikrotikClient.execute(
      device,
      '/ip/firewall/address-list/remove',
      { '.id': entry['.id'], list: listName, address: networkIdentifier },
      triggeredBy
    );
  }

  logger.info(`Address-list: Removed ${networkIdentifier} from "${listName}" on "${device.name}"`);
  return { removed: entries.length };
}

/**
 * Check if a customer is currently blocked via address-list.
 *
 * @param {object} device - NetworkDevice model instance
 * @param {string} networkIdentifier - Customer's IP or MAC address
 * @returns {'active'|'suspended'|'unknown'}
 */
async function getCustomerStatus(device, networkIdentifier) {
  const listName = device.cutoffAddressList || 'cutoff-list';

  try {
    const entries = await mikrotikClient.execute(
      device,
      '/ip/firewall/address-list/print',
      { list: listName, address: networkIdentifier },
      'system:status-check'
    );

    // If they're IN the cutoff list, they're suspended
    return (entries && entries.length > 0) ? 'suspended' : 'active';
  } catch (err) {
    logger.error(`Address-list: Failed to check status for ${networkIdentifier} on "${device.name}"`, {
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
