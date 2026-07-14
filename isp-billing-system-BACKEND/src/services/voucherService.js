/**
 * Voucher Service
 *
 * Business logic for voucher generation, redemption, revocation, and stats.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { generateRadiusPassword } = require('./radius/radiusHelper');
const { syncToRadius, removeFromRadius } = require('./radius/syncUser');

/**
 * Generate a batch of vouchers.
 *
 * @param {object} options
 * @param {string} options.planId - DataPlan UUID
 * @param {number} options.quantity - Number of vouchers to generate
 * @param {string} options.createdBy - Admin user UUID
 * @param {number} [options.dataLimitMb] - Override plan data limit
 * @param {number} [options.timeLimitMinutes] - Override plan time limit
 * @param {number} [options.price] - Override plan price
 * @param {number} [options.expiryDays] - Shelf life in days (default from env)
 * @returns {object} { batchId, vouchers, count }
 */
async function generateBatch(options) {
  const { DataPlan, Voucher } = require('../models');

  const { planId, quantity, createdBy, dataLimitMb, timeLimitMinutes, price, expiryDays } = options;

  // Validate plan exists and is active
  const plan = await DataPlan.findByPk(planId);
  if (!plan) throw new Error(`DataPlan ${planId} not found`);
  if (!plan.isActive) throw new Error(`DataPlan "${plan.name}" is not active`);

  if (quantity < 1 || quantity > 500) {
    throw new Error('Quantity must be between 1 and 500 per batch');
  }

  // Generate unique codes
  const codes = await Voucher.generateUniqueCodes(quantity);
  const batchId = uuidv4();

  // Calculate expiry
  const shelfLifeDays = expiryDays || parseInt(process.env.VOUCHER_DEFAULT_EXPIRY_DAYS || '365', 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + shelfLifeDays);

  // Build voucher records
  const voucherRecords = codes.map(code => ({
    id: uuidv4(),
    code,
    planId,
    dataLimitMb: dataLimitMb || null,
    timeLimitMinutes: timeLimitMinutes || null,
    price: price !== undefined ? price : plan.price,
    status: 'unused',
    batchId,
    createdBy,
    expiresAt,
  }));

  // Bulk insert
  const vouchers = await Voucher.bulkCreate(voucherRecords);

  logger.info(`Voucher batch generated: ${quantity} vouchers`, {
    batchId,
    planId,
    planName: plan.name,
    createdBy,
    price: voucherRecords[0].price,
    dataLimitMb: dataLimitMb || `inherit (${plan.dataLimit} MB)`,
    timeLimitMinutes: timeLimitMinutes || `inherit (${plan.validityPeriod} days)`,
  });

  return {
    batchId,
    vouchers,
    count: vouchers.length,
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
    },
  };
}

/**
 * Redeem a voucher code.
 *
 * Creates a subscription row, a RADIUS user entry, and activates the voucher.
 * The subscription row has connection_type: 'hotspot' and networkIdentifier set
 * so that Phase 1's provisioning system can act on it.
 *
 * @param {string} code - Voucher code (e.g., "XKPF-3N7W")
 * @param {string} customerId - User UUID of the customer redeeming
 * @param {object} [options]
 * @param {string} [options.networkDeviceId] - Router to associate with (required for provisioning)
 * @returns {object} { voucher, subscription, radiusUsername, radiusPassword }
 */
async function redeemVoucher(code, customerId, options = {}) {
  const { Voucher, DataPlan, Subscription, User, sequelize } = require('../models');
  const { SubscriptionStatus } = require('../config/constants');

  // Normalize code (uppercase, strip whitespace)
  const normalizedCode = code.replace(/\s/g, '').toUpperCase();

  const transaction = await sequelize.transaction();

  try {
    // Lock the voucher row to prevent double-redemption
    const voucher = await Voucher.findOne({
      where: { code: normalizedCode },
      include: [{ model: DataPlan, as: 'plan' }],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!voucher) {
      await transaction.rollback();
      throw new Error('Invalid voucher code');
    }

    if (voucher.status !== 'unused') {
      await transaction.rollback();
      throw new Error(`Voucher has already been ${voucher.status}`);
    }

    // Check shelf-life expiry
    if (voucher.expiresAt && new Date() > new Date(voucher.expiresAt)) {
      await voucher.update({ status: 'expired' }, { transaction });
      await transaction.rollback();
      throw new Error('Voucher has expired');
    }

    // Verify customer exists
    const customer = await User.findByPk(customerId, { transaction });
    if (!customer) {
      await transaction.rollback();
      throw new Error('Customer not found');
    }

    const plan = voucher.plan;

    // Generate RADIUS credentials
    const radiusUsername = `voucher-${normalizedCode}`;
    const radiusPassword = generateRadiusPassword();

    // Calculate subscription dates
    const now = new Date();
    const dataLimit = voucher.dataLimitMb || plan.dataLimit;
    const validityDays = voucher.timeLimitMinutes
      ? Math.ceil(voucher.timeLimitMinutes / (24 * 60))
      : plan.validityPeriod;
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + validityDays);

    // Generate subscription number
    const subNumber = `VOC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create subscription row — this is critical for Phase 1 disable jobs
    const subscription = await Subscription.create({
      userId: customerId,
      planId: plan.id,
      subscriptionNumber: subNumber,
      status: SubscriptionStatus.ACTIVE,
      startDate: now,
      endDate,
      dataUsed: 0,
      dataRemaining: dataLimit,
      activatedAt: now,
      // Phase 1 provisioning fields — required for data-cap disconnect
      connectionType: 'hotspot',
      networkDeviceId: options.networkDeviceId || null,
      networkIdentifier: radiusUsername,
      gracePeriodHours: 0, // Vouchers have no grace period
    }, { transaction });

    // Update voucher
    await voucher.update({
      status: 'active',
      redeemedAt: now,
      redeemedByCustomerId: customerId,
      subscriptionId: subscription.id,
      radiusUsername,
    }, { transaction });

    await transaction.commit();

    // ── Sync RADIUS attributes (outside transaction) ──────────────────
    // If RADIUS sync fails, the voucher is still redeemed in DB.
    // The reconciliation sweep or manual intervention will fix RADIUS.
    try {
      await syncToRadius(subscription, {
        radiusUsername,
        password: radiusPassword,
        voucher,
      });
    } catch (radiusErr) {
      logger.error('RADIUS sync failed after voucher redemption', {
        voucherId: voucher.id,
        radiusUsername,
        error: radiusErr.message,
      });
    }

    logger.info(`Voucher redeemed: ${normalizedCode}`, {
      voucherId: voucher.id,
      customerId,
      subscriptionId: subscription.id,
      radiusUsername,
      plan: plan.name,
      dataLimit,
      validityDays,
    });

    return {
      voucher,
      subscription,
      radiusUsername,
      radiusPassword,
      plan: {
        id: plan.id,
        name: plan.name,
      },
    };

  } catch (err) {
    // Transaction is already rolled back for expected errors
    if (err.message.includes('Invalid') || err.message.includes('already been') ||
        err.message.includes('expired') || err.message.includes('not found')) {
      throw err;
    }
    // Unexpected error: roll back
    try { await transaction.rollback(); } catch (_) {}
    throw err;
  }
}

/**
 * Revoke a voucher (admin action).
 * If the voucher was active, removes RADIUS entries and disables the subscription.
 *
 * @param {string} voucherId - Voucher UUID
 * @returns {object} Revoked voucher
 */
async function revokeVoucher(voucherId) {
  const { Voucher, Subscription } = require('../models');
  const { SubscriptionStatus } = require('../config/constants');

  const voucher = await Voucher.findByPk(voucherId);
  if (!voucher) throw new Error('Voucher not found');

  if (voucher.status === 'revoked') {
    throw new Error('Voucher is already revoked');
  }

  // Remove RADIUS entries if was active
  if (voucher.radiusUsername) {
    try {
      await removeFromRadius(voucher.radiusUsername);
    } catch (err) {
      logger.error('Failed to remove RADIUS entries during revocation', {
        voucherId, radiusUsername: voucher.radiusUsername, error: err.message,
      });
    }
  }

  // Suspend the linked subscription
  if (voucher.subscriptionId) {
    await Subscription.update(
      {
        status: SubscriptionStatus.SUSPENDED,
        suspensionReason: 'Voucher revoked by admin',
        suspendedAt: new Date(),
      },
      { where: { id: voucher.subscriptionId } }
    );
  }

  await voucher.update({ status: 'revoked' });

  logger.info(`Voucher revoked: ${voucher.code}`, {
    voucherId,
    radiusUsername: voucher.radiusUsername,
    subscriptionId: voucher.subscriptionId,
  });

  return voucher;
}

/**
 * Get voucher statistics for the admin dashboard.
 */
async function getVoucherStats() {
  const { Voucher, sequelize } = require('../models');

  const [stats] = await sequelize.query(`
    SELECT
      status,
      COUNT(*) as count,
      COALESCE(SUM(price), 0) as total_value
    FROM vouchers
    GROUP BY status
  `, { type: sequelize.QueryTypes.SELECT ? undefined : undefined, raw: true });

  // sequelize.query returns [results, metadata] for MySQL
  const results = Array.isArray(stats) ? stats : [stats].filter(Boolean);

  const summary = {
    total: 0,
    unused: 0,
    active: 0,
    used: 0,
    expired: 0,
    revoked: 0,
    totalValue: 0,
    redeemedValue: 0,
  };

  // Get proper results
  const [rows] = await sequelize.query(`
    SELECT
      status,
      COUNT(*) as count,
      COALESCE(SUM(price), 0) as total_value
    FROM vouchers
    GROUP BY status
  `);

  for (const row of rows) {
    const count = parseInt(row.count);
    const value = parseFloat(row.total_value);
    summary.total += count;
    summary.totalValue += value;
    summary[row.status] = count;
    if (row.status === 'active' || row.status === 'used') {
      summary.redeemedValue += value;
    }
  }

  return summary;
}

module.exports = {
  generateBatch,
  redeemVoucher,
  revokeVoucher,
  getVoucherStats,
};
