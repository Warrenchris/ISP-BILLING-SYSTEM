/**
 * Network Device Controller
 *
 * Admin-only CRUD for managing MikroTik routers and viewing audit logs.
 */

const logger = require('../config/logger');
const mikrotikClient = require('../services/mikrotik/client');

/**
 * GET /api/admin/network-devices
 * List all network devices.
 */
const getAllDevices = async (req, res) => {
  try {
    const { NetworkDevice } = require('../models');

    const { siteId, isActive } = req.query;
    const where = {};
    if (siteId) where.siteId = siteId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const devices = await NetworkDevice.findAll({
      where,
      order: [['created_at', 'DESC']],
    });

    // toJSON strips encrypted password fields
    res.json({
      success: true,
      data: devices.map(d => ({
        ...d.toJSON(),
        connectionStatus: mikrotikClient.getConnectionStatus(d.id),
        circuitState: mikrotikClient.getCircuitState(d.id),
      })),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to fetch network devices' });
  }
};

/**
 * POST /api/admin/network-devices
 * Add a new router.
 */
const createDevice = async (req, res) => {
  try {
    const { NetworkDevice } = require('../models');

    const { name, ipAddress, apiPort, username, password, radiusSecret, siteId, routerOsVersion, cutoffAddressList } = req.body;

    if (!name || !ipAddress || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, ipAddress, username, and password are required',
      });
    }

    // Encrypt the password via hook
    const device = NetworkDevice.build({
      name,
      ipAddress,
      apiPort: apiPort || 8728,
      username,
      passwordEncrypted: 'placeholder', // Will be overwritten by hook
      siteId: siteId || null,
      routerOsVersion: routerOsVersion || '7',
      cutoffAddressList: cutoffAddressList || 'cutoff-list',
    });

    device._plaintextPassword = password;
    if (radiusSecret) {
      device._plaintextRadiusSecret = radiusSecret;
    }
    await device.save();

    logger.info(`Network device created: "${name}" (${ipAddress})`, {
      deviceId: device.id,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Network device added successfully',
      data: device.toJSON(),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: error.message || 'Failed to create network device' });
  }
};

/**
 * PUT /api/admin/network-devices/:id
 * Update a router's details.
 */
const updateDevice = async (req, res) => {
  try {
    const { NetworkDevice } = require('../models');
    const device = await NetworkDevice.findByPk(req.params.id);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const { name, ipAddress, apiPort, username, password, radiusSecret, siteId, routerOsVersion, cutoffAddressList, isActive } = req.body;

    if (name !== undefined) device.name = name;
    if (ipAddress !== undefined) device.ipAddress = ipAddress;
    if (apiPort !== undefined) device.apiPort = apiPort;
    if (username !== undefined) device.username = username;
    if (siteId !== undefined) device.siteId = siteId;
    if (routerOsVersion !== undefined) device.routerOsVersion = routerOsVersion;
    if (cutoffAddressList !== undefined) device.cutoffAddressList = cutoffAddressList;
    if (isActive !== undefined) device.isActive = isActive;

    // If password is being changed, set _plaintextPassword for the hook
    if (password) {
      device._plaintextPassword = password;
    }

    // If radiusSecret is being changed, set _plaintextRadiusSecret for the hook
    if (radiusSecret) {
      device._plaintextRadiusSecret = radiusSecret;
    }

    await device.save();

    // If connection details changed, disconnect so next call reconnects with new creds
    if (ipAddress || apiPort || username || password) {
      await mikrotikClient.disconnect(device.id);
    }

    logger.info(`Network device updated: "${device.name}" (${device.id})`, {
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Network device updated',
      data: device.toJSON(),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: error.message || 'Failed to update device' });
  }
};

/**
 * DELETE /api/admin/network-devices/:id
 * Soft-delete a router (set isActive = false).
 */
const deleteDevice = async (req, res) => {
  try {
    const { NetworkDevice } = require('../models');
    const device = await NetworkDevice.findByPk(req.params.id);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    // Soft delete — set inactive
    await device.update({ isActive: false });
    await mikrotikClient.disconnect(device.id);

    logger.info(`Network device deactivated: "${device.name}" (${device.id})`, {
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Network device deactivated',
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to delete device' });
  }
};

/**
 * POST /api/admin/network-devices/:id/test
 * Test connection to a router.
 */
const testConnection = async (req, res) => {
  try {
    const { NetworkDevice } = require('../models');
    const device = await NetworkDevice.findByPk(req.params.id);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const startTime = Date.now();

    // Try to connect and run /system/identity/print
    const result = await mikrotikClient.execute(
      device,
      '/system/identity/print',
      {},
      `admin:${req.user.id}`
    );

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Connection successful',
      data: {
        identity: result && result.length > 0 ? result[0].name : 'Unknown',
        responseTime: `${duration}ms`,
        connectionStatus: mikrotikClient.getConnectionStatus(device.id),
        circuitState: mikrotikClient.getCircuitState(device.id),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: `Connection test failed: ${error.message}`,
      data: {
        connectionStatus: mikrotikClient.getConnectionStatus(req.params.id),
        circuitState: mikrotikClient.getCircuitState(req.params.id),
      },
    });
  }
};

/**
 * GET /api/admin/router-logs
 * Query router command audit logs.
 */
const getRouterLogs = async (req, res) => {
  try {
    const { RouterCommandLog, NetworkDevice } = require('../models');

    const { deviceId, success, triggeredBy, page = 1, limit = 50 } = req.query;
    const where = {};
    if (deviceId) where.deviceId = deviceId;
    if (success !== undefined) where.success = success === 'true';
    if (triggeredBy) where.triggeredBy = triggeredBy;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const logs = await RouterCommandLog.findAndCountAll({
      where,
      include: [
        { model: NetworkDevice, as: 'Device', attributes: ['id', 'name', 'ipAddress'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: logs.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(logs.count / parseInt(limit)),
        totalItems: logs.count,
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to fetch router logs' });
  }
};

module.exports = {
  getAllDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  testConnection,
  getRouterLogs,
};
