/**
 * NAS (Network Access Server) Sync Layer
 *
 * Syncs the NetworkDevice table in the app to the FreeRADIUS `nas` table.
 * Whenever an admin adds, updates, or deactivates a router, this layer
 * decrypts the per-router RADIUS shared secret and updates the `nas` table.
 */

const logger = require('../../config/logger');

/**
 * Sync a network device to the RADIUS `nas` table.
 *
 * @param {object} device - NetworkDevice instance
 */
async function syncDeviceToNas(device) {
  const { Nas } = require('../../models');

  if (!device.isActive) {
    // If router is deactivated, remove it from RADIUS client database
    return removeDeviceFromNas(device.ipAddress);
  }

  const plainSecret = device.getDecryptedRadiusSecret();
  if (!plainSecret) {
    logger.info(`NetworkDevice "${device.name}" (${device.ipAddress}) has no RADIUS shared secret, skipping NAS sync`);
    return;
  }

  logger.info(`Syncing NetworkDevice "${device.name}" to RADIUS nas table`, {
    deviceId: device.id,
    ipAddress: device.ipAddress,
  });

  try {
    // Upsert into nas table based on ipAddress (nasname)
    const [nasRecord, created] = await Nas.findOrCreate({
      where: { nasname: device.ipAddress },
      defaults: {
        shortname: device.name.substring(0, 32),
        type: 'other',
        secret: plainSecret,
        description: `Synced: ${device.name}`,
      },
    });

    if (!created) {
      await nasRecord.update({
        shortname: device.name.substring(0, 32),
        secret: plainSecret,
        description: `Synced: ${device.name}`,
      });
    }

    logger.info(`RADIUS NAS sync complete for "${device.ipAddress}"`, { created });
  } catch (err) {
    logger.error(`RADIUS NAS sync failed for "${device.ipAddress}"`, {
      error: err.message,
      deviceId: device.id,
    });
    throw err;
  }
}

/**
 * Remove a device from the RADIUS `nas` table.
 *
 * @param {string} ipAddress - NAS IP address
 */
async function removeDeviceFromNas(ipAddress) {
  const { Nas } = require('../../models');

  if (!ipAddress) return;

  logger.info(`Removing NetworkDevice "${ipAddress}" from RADIUS nas table`);

  try {
    const deleted = await Nas.destroy({ where: { nasname: ipAddress } });
    logger.info(`RADIUS NAS removal complete for "${ipAddress}"`, { deleted });
  } catch (err) {
    logger.error(`RADIUS NAS removal failed for "${ipAddress}"`, { error: err.message });
    throw err;
  }
}

module.exports = {
  syncDeviceToNas,
  removeDeviceFromNas,
};
