/**
 * Voucher Controller
 *
 * Admin CRUD + public redemption endpoint for voucher management.
 */

const logger = require('../config/logger');
const voucherService = require('../services/voucherService');

/**
 * POST /api/admin/vouchers/generate
 * Generate a batch of vouchers.
 */
const generateBatch = async (req, res) => {
  try {
    const { planId, quantity, dataLimitMb, timeLimitMinutes, price, expiryDays } = req.body;

    if (!planId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'planId and quantity are required',
      });
    }

    const result = await voucherService.generateBatch({
      planId,
      quantity: parseInt(quantity),
      createdBy: req.user.id,
      dataLimitMb: dataLimitMb ? parseInt(dataLimitMb) : undefined,
      timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : undefined,
      price: price !== undefined ? parseFloat(price) : undefined,
      expiryDays: expiryDays ? parseInt(expiryDays) : undefined,
    });

    res.status(201).json({
      success: true,
      message: `Generated ${result.count} vouchers`,
      data: result,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/vouchers
 * List vouchers with filters.
 */
const listVouchers = async (req, res) => {
  try {
    const { Voucher, DataPlan, User } = require('../models');

    const { status, batchId, planId, page = 1, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (batchId) where.batchId = batchId;
    if (planId) where.planId = planId;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const vouchers = await Voucher.findAndCountAll({
      where,
      include: [
        { model: DataPlan, as: 'plan', attributes: ['id', 'name', 'price', 'speed'] },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'redeemer', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: vouchers.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(vouchers.count / parseInt(limit)),
        totalItems: vouchers.count,
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to fetch vouchers' });
  }
};

/**
 * GET /api/admin/vouchers/stats
 * Get voucher statistics for the dashboard.
 */
const getStats = async (req, res) => {
  try {
    const stats = await voucherService.getVoucherStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to fetch voucher stats' });
  }
};

/**
 * GET /api/admin/vouchers/batches
 * List all batches with summary counts.
 */
const listBatches = async (req, res) => {
  try {
    const { sequelize } = require('../models');

    const [batches] = await sequelize.query(`
      SELECT
        v.batch_id,
        COUNT(*) as total_count,
        SUM(CASE WHEN v.status = 'unused' THEN 1 ELSE 0 END) as unused_count,
        SUM(CASE WHEN v.status = 'active' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN v.status = 'used' THEN 1 ELSE 0 END) as used_count,
        SUM(CASE WHEN v.status = 'revoked' THEN 1 ELSE 0 END) as revoked_count,
        MIN(v.created_at) as created_at,
        v.plan_id,
        dp.name as plan_name,
        v.price,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM vouchers v
      LEFT JOIN data_plans dp ON dp.id = v.plan_id
      LEFT JOIN users u ON u.id = v.created_by
      GROUP BY v.batch_id, v.plan_id, dp.name, v.price, u.first_name, u.last_name
      ORDER BY MIN(v.created_at) DESC
    `);

    res.json({ success: true, data: batches });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to fetch batches' });
  }
};

/**
 * GET /api/admin/vouchers/:id
 * Get a single voucher with full details.
 */
const getVoucher = async (req, res) => {
  try {
    const { Voucher, DataPlan, User, Subscription } = require('../models');

    const voucher = await Voucher.findByPk(req.params.id, {
      include: [
        { model: DataPlan, as: 'plan' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'redeemer', attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'] },
        { model: Subscription, as: 'subscription' },
      ],
    });

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    res.json({ success: true, data: voucher });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to fetch voucher' });
  }
};

/**
 * POST /api/admin/vouchers/:id/revoke
 * Revoke a voucher (admin action).
 */
const revoke = async (req, res) => {
  try {
    const voucher = await voucherService.revokeVoucher(req.params.id);
    res.json({
      success: true,
      message: `Voucher ${voucher.code} revoked`,
      data: voucher,
    });
  } catch (error) {
    logger.logError(error, req);
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/vouchers/export/:batchId
 * Export a voucher batch as CSV.
 */
const exportBatch = async (req, res) => {
  try {
    const { Voucher, DataPlan } = require('../models');
    const { stringify } = require('csv-stringify/sync');

    const vouchers = await Voucher.findAll({
      where: { batchId: req.params.batchId },
      include: [{ model: DataPlan, as: 'plan', attributes: ['name', 'speed'] }],
      order: [['code', 'ASC']],
    });

    if (vouchers.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const csvData = vouchers.map(v => ({
      Code: v.code,
      Plan: v.plan ? v.plan.name : 'N/A',
      Speed: v.plan ? v.plan.speed : 'N/A',
      Price: v.price,
      Status: v.status,
      'Data Limit (MB)': v.dataLimitMb || 'Plan default',
      'Time Limit (min)': v.timeLimitMinutes || 'Plan default',
      'Expires At': v.expiresAt ? v.expiresAt.toISOString() : 'N/A',
    }));

    const csv = stringify(csvData, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=vouchers-${req.params.batchId}.csv`);
    res.send(csv);
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ success: false, message: 'Failed to export batch' });
  }
};

/**
 * POST /api/vouchers/redeem
 * Public endpoint: Redeem a voucher code.
 * Rate-limited to prevent brute-force (5 attempts/min/IP).
 */
const redeem = async (req, res) => {
  try {
    const { code, customerId, networkDeviceId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Voucher code is required' });
    }

    // customerId can come from auth token (Phase 4) or request body
    const userId = customerId || (req.user ? req.user.id : null);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'customerId is required' });
    }

    const result = await voucherService.redeemVoucher(code, userId, { networkDeviceId });

    res.json({
      success: true,
      message: 'Voucher redeemed successfully',
      data: {
        radiusUsername: result.radiusUsername,
        radiusPassword: result.radiusPassword,
        plan: result.plan,
        subscription: {
          id: result.subscription.id,
          startDate: result.subscription.startDate,
          endDate: result.subscription.endDate,
          dataRemaining: result.subscription.dataRemaining,
        },
      },
    });
  } catch (error) {
    logger.logError(error, req);
    const status = error.message.includes('Invalid') || error.message.includes('expired') ||
                   error.message.includes('already been') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateBatch,
  listVouchers,
  getStats,
  listBatches,
  getVoucher,
  revoke,
  exportBatch,
  redeem,
};
