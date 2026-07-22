/**
 * Active Sessions Controller
 *
 * Provides live operational views of active broadband / hotspot sessions,
 * supporting tab filters (All, Hotspot, PPPoE, Without Expiry),
 * server-side search, pagination, and bulk session disconnect via BullMQ.
 */

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { RadAcct, Subscription, User, NetworkDevice, DataPlan } = require('../models');
const { SubscriptionStatus } = require('../config/constants');
const { addProvisioningJob } = require('../services/queue/queueManager');
const logger = require('../config/logger');

/**
 * GET /api/admin/sessions/active
 * Query parameters:
 *  - tab: 'all' | 'hotspot' | 'pppoe' | 'without_expiry' (default: 'all')
 *  - search: string (matches username, IP address, MAC address, email)
 *  - page: number (default: 1)
 *  - limit: number (default: 10)
 */
exports.getActiveSessions = async (req, res, next) => {
  try {
    const { tab = 'all', search = '', page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const now = new Date();

    // 1. Query live RADIUS sessions (acctstoptime IS NULL)
    let openRadiusSessions = [];
    try {
      openRadiusSessions = await RadAcct.findAll({
        where: { acctstoptime: null },
        raw: true
      });
    } catch (err) {
      logger.warn('Failed to fetch open radacct sessions:', err.message);
      openRadiusSessions = [];
    }

    // Map network devices by IP address for quick NAS lookup
    const devices = await NetworkDevice.findAll({ raw: true });
    const deviceByIpMap = {};
    const deviceByIdMap = {};
    devices.forEach(d => {
      if (d.ipAddress) deviceByIpMap[d.ipAddress] = d;
      if (d.id) deviceByIdMap[d.id] = d;
    });

    // Map active subscriptions for account metadata & expiry calculation
    const activeSubs = await Subscription.findAll({
      where: {
        status: SubscriptionStatus.ACTIVE
      },
      include: [
        { model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'] },
        { model: DataPlan, as: 'plan', attributes: ['id', 'name'] },
        { model: NetworkDevice, as: 'NetworkDevice', attributes: ['id', 'name', 'ipAddress'] }
      ]
    });

    const subByIdMap = {};
    const subByRadiusUsernameMap = {};
    activeSubs.forEach(s => {
      subByIdMap[s.id] = s;
      if (s.networkIdentifier) {
        subByRadiusUsernameMap[s.networkIdentifier] = s;
      }
    });

    // 2. Build consolidated session items across RADIUS and non-RADIUS active connections
    const sessionList = [];
    const processedSubIds = new Set();

    // Process RADIUS sessions (PPPoE / Hotspot)
    openRadiusSessions.forEach(rad => {
      const username = rad.username || '';
      const sub = subByRadiusUsernameMap[username];
      if (sub) processedSubIds.add(sub.id);

      const routerDevice = deviceByIpMap[rad.nasipaddress] || sub?.NetworkDevice || null;

      const connectionType = sub?.connectionType ||
        (username.toLowerCase().startsWith('voucher-') || username.toLowerCase().includes('hotspot') ? 'hotspot' : 'pppoe');

      const isWithoutExpiry = !sub?.endDate || new Date(sub.endDate) > new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365 * 10);

      sessionList.push({
        id: `rad-${rad.radacctid}`,
        subscriptionId: sub?.id || null,
        username: username || sub?.User?.email || 'Unknown',
        accountId: sub?.subscriptionNumber || sub?.id?.slice(0, 8) || 'N/A',
        userId: sub?.userId || null,
        ipAddress: rad.framedipaddress || sub?.ipAddress || 'Dynamic',
        macAddress: rad.callingstationid ? rad.callingstationid.trim() : ' — ',
        routerName: routerDevice ? routerDevice.name : (rad.nasipaddress || ' — '),
        routerIp: rad.nasipaddress || routerDevice?.ipAddress || ' — ',
        connectionType,
        sessionStart: rad.acctstarttime || sub?.startDate || sub?.createdAt || null,
        sessionEnd: sub?.endDate || null,
        isWithoutExpiry,
        source: 'radius',
        dataPlanName: sub?.plan?.name || 'Standard'
      });
    });

    // Process active subscriptions that didn't land in radacct (e.g. static/address_list or active subscriptions without open radacct)
    activeSubs.forEach(sub => {
      if (processedSubIds.has(sub.id)) return;

      const routerDevice = deviceByIdMap[sub.networkDeviceId] || sub.NetworkDevice || null;
      const isWithoutExpiry = !sub.endDate || new Date(sub.endDate) > new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365 * 10);

      sessionList.push({
        id: `sub-${sub.id}`,
        subscriptionId: sub.id,
        username: sub.networkIdentifier || sub.User?.email || 'Unknown',
        accountId: sub.subscriptionNumber || sub.id.slice(0, 8),
        userId: sub.userId,
        ipAddress: sub.ipAddress || 'Dynamic',
        macAddress: ' — ', // Address_list / non-RADIUS connections don't supply RADIUS callingstationid
        routerName: routerDevice ? routerDevice.name : ' — ',
        routerIp: routerDevice ? routerDevice.ipAddress : ' — ',
        connectionType: sub.connectionType || 'address_list',
        sessionStart: sub.startDate || sub.createdAt || null,
        sessionEnd: sub.endDate || null,
        isWithoutExpiry,
        source: 'subscription',
        dataPlanName: sub.plan?.name || 'Standard'
      });
    });

    // 3. Compute tab counts across all sessions
    const counts = {
      all: sessionList.length,
      hotspot: sessionList.filter(s => s.connectionType === 'hotspot').length,
      pppoe: sessionList.filter(s => s.connectionType === 'pppoe').length,
      withoutExpiry: sessionList.filter(s => s.isWithoutExpiry).length
    };

    // 4. Filter by selected tab
    let filtered = sessionList;
    if (tab === 'hotspot') {
      filtered = filtered.filter(s => s.connectionType === 'hotspot');
    } else if (tab === 'pppoe') {
      filtered = filtered.filter(s => s.connectionType === 'pppoe');
    } else if (tab === 'without_expiry') {
      filtered = filtered.filter(s => s.isWithoutExpiry);
    }

    // 5. Apply server-side search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(s =>
        (s.username && s.username.toLowerCase().includes(q)) ||
        (s.accountId && s.accountId.toLowerCase().includes(q)) ||
        (s.ipAddress && s.ipAddress.toLowerCase().includes(q)) ||
        (s.macAddress && s.macAddress.toLowerCase().includes(q)) ||
        (s.routerName && s.routerName.toLowerCase().includes(q))
      );
    }

    // 6. Paginate results
    const totalItems = filtered.length;
    const paginatedSessions = filtered.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: {
        sessions: paginatedSessions,
        counts,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalItems / limitNum) || 1,
          totalItems,
          itemsPerPage: limitNum
        }
      }
    });

  } catch (err) {
    logger.error('Error fetching active sessions:', err);
    next(err);
  }
};

/**
 * POST /api/admin/sessions/disconnect
 * Body: { subscriptionIds: string[] } or { subscriptionId: string }
 * Enqueues BullMQ disable customer job via Phase 1 provisioning layer.
 */
exports.disconnectSessions = async (req, res, next) => {
  try {
    const { subscriptionIds, subscriptionId } = req.body || {};
    const idsToDisconnect = Array.isArray(subscriptionIds)
      ? subscriptionIds
      : (subscriptionId ? [subscriptionId] : []);

    if (idsToDisconnect.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No subscription identifiers provided for disconnect'
      });
    }

    const subs = await Subscription.findAll({
      where: { id: { [Op.in]: idsToDisconnect } }
    });

    const queuedJobs = [];
    const timestamp = Date.now();

    for (const sub of subs) {
      const jobId = `disconnect-sub-${sub.id}-${timestamp}`;
      const job = await addProvisioningJob('disable', {
        customerId: sub.userId,
        subscriptionId: sub.id,
        triggeredBy: `admin_manual_disconnect:${req.user?.id || 'admin'}`
      }, jobId);
      queuedJobs.push({ subscriptionId: sub.id, jobId: job.id || jobId });
    }

    logger.info(`Queued ${queuedJobs.length} session disconnect job(s)`);

    res.json({
      success: true,
      message: `Enqueued ${queuedJobs.length} session termination job(s) in provisioning queue`,
      data: {
        queuedCount: queuedJobs.length,
        jobs: queuedJobs
      }
    });

  } catch (err) {
    logger.error('Error terminating session(s):', err);
    next(err);
  }
};
