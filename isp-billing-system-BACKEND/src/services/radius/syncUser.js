/**
 * RADIUS Sync Layer
 *
 * The app's tables (subscriptions, data_plans, users) are the source of truth.
 * RADIUS tables (radcheck, radreply, radusergroup) are a derived/synced view.
 *
 * This module writes to RADIUS tables whenever the source changes:
 *   - Subscription activated/enabled → syncToRadius()
 *   - Subscription suspended/cancelled → removeFromRadius()
 *   - Voucher redeemed → syncToRadius() with voucher context
 */

const logger = require('../../config/logger');
const { buildMikrotikRateLimit, getAcctInterimInterval } = require('./radiusHelper');

/**
 * Sync a subscription's RADIUS attributes.
 *
 * Idempotent: deletes all existing entries for the username, then re-inserts.
 * This avoids stale attributes from plan changes.
 *
 * @param {object} subscription - Subscription instance (with plan loaded)
 * @param {object} options
 * @param {string} options.radiusUsername - RADIUS username to sync
 * @param {string} options.password - Cleartext password for radcheck
 * @param {object} [options.voucher] - Voucher instance (if applicable)
 */
async function syncToRadius(subscription, options = {}) {
  const { RadCheck, RadReply, RadUserGroup } = require('../../models');
  const { generateRadiusPassword } = require('./radiusHelper');

  let radiusUsername = options.radiusUsername || getRadiusUsername(subscription, options.voucher);
  let password = options.password;
  const voucher = options.voucher;

  if (!radiusUsername) {
    logger.warn('syncToRadius: could not resolve radiusUsername, skipping', {
      subscriptionId: subscription.id,
    });
    return;
  }

  // Resolve password:
  // 1. Explicitly passed in options
  // 2. Decrypted from subscription database row
  // 3. Fallback: generate and encrypt a new password
  if (!password) {
    password = subscription.getDecryptedRadiusPassword();
  }

  if (!password) {
    password = generateRadiusPassword();
    subscription._plaintextRadiusPassword = password;
    await subscription.save();
    logger.info(`Generated and encrypted new RADIUS password for "${radiusUsername}"`, {
      subscriptionId: subscription.id,
    });
  }

  const plan = subscription.plan;
  if (!plan) {
    logger.warn('syncToRadius: subscription has no loaded plan, skipping', {
      subscriptionId: subscription.id,
    });
    return;
  }

  logger.info(`Syncing RADIUS attributes for "${radiusUsername}"`, {
    subscriptionId: subscription.id,
    planId: plan.id,
    voucherId: voucher ? voucher.id : null,
  });

  try {
    // ── Idempotent: clear existing entries ─────────────────────────────
    await RadCheck.destroy({ where: { username: radiusUsername } });
    await RadReply.destroy({ where: { username: radiusUsername } });
    await RadUserGroup.destroy({ where: { username: radiusUsername } });

    // ── radcheck: authentication ──────────────────────────────────────
    const authType = process.env.RADIUS_DEFAULT_AUTH_TYPE || 'Cleartext-Password';
    await RadCheck.create({
      username: radiusUsername,
      attribute: authType,
      op: ':=',
      value: password,
    });

    // ── radreply: authorization attributes ────────────────────────────
    const replyAttributes = [];

    // Rate limit (bandwidth)
    const rateLimit = buildMikrotikRateLimit(plan);
    if (rateLimit) {
      replyAttributes.push({
        username: radiusUsername,
        attribute: 'Mikrotik-Rate-Limit',
        op: ':=',
        value: rateLimit,
      });
    }

    // Session timeout
    let sessionTimeout = null;
    if (voucher && voucher.timeLimitMinutes) {
      sessionTimeout = voucher.timeLimitMinutes * 60;
    } else if (plan.sessionTimeoutSeconds) {
      sessionTimeout = plan.sessionTimeoutSeconds;
    }

    if (sessionTimeout) {
      replyAttributes.push({
        username: radiusUsername,
        attribute: 'Session-Timeout',
        op: ':=',
        value: String(sessionTimeout),
      });
    }

    // Acct-Interim-Interval (tighter for data-capped, standard for unlimited)
    const interimInterval = getAcctInterimInterval(subscription, voucher);
    replyAttributes.push({
      username: radiusUsername,
      attribute: 'Acct-Interim-Interval',
      op: ':=',
      value: String(interimInterval),
    });

    if (replyAttributes.length > 0) {
      await RadReply.bulkCreate(replyAttributes);
    }

    // ── radusergroup: plan group ──────────────────────────────────────
    await RadUserGroup.create({
      username: radiusUsername,
      groupname: `plan-${plan.id}`,
      priority: 1,
    });

    logger.info(`RADIUS sync complete for "${radiusUsername}"`, {
      radcheckEntries: 1,
      radreplyEntries: replyAttributes.length,
      rateLimit,
      sessionTimeout,
      interimInterval,
    });

  } catch (err) {
    logger.error(`RADIUS sync failed for "${radiusUsername}"`, {
      error: err.message,
      subscriptionId: subscription.id,
    });
    throw err;
  }
}

/**
 * Remove all RADIUS entries for a username.
 * Called on subscription suspension/cancellation.
 *
 * @param {string} radiusUsername - RADIUS username to remove
 */
async function removeFromRadius(radiusUsername) {
  const { RadCheck, RadReply, RadUserGroup } = require('../../models');

  if (!radiusUsername) {
    logger.warn('removeFromRadius: no username provided, skipping');
    return;
  }

  logger.info(`Removing RADIUS entries for "${radiusUsername}"`);

  try {
    const checkDeleted = await RadCheck.destroy({ where: { username: radiusUsername } });
    const replyDeleted = await RadReply.destroy({ where: { username: radiusUsername } });
    const groupDeleted = await RadUserGroup.destroy({ where: { username: radiusUsername } });

    logger.info(`RADIUS removal complete for "${radiusUsername}"`, {
      radcheckDeleted: checkDeleted,
      radreplyDeleted: replyDeleted,
      radusergroupDeleted: groupDeleted,
    });
  } catch (err) {
    logger.error(`RADIUS removal failed for "${radiusUsername}"`, { error: err.message });
    throw err;
  }
}

/**
 * Determine the RADIUS username for a subscription.
 *
 * @param {object} subscription - Subscription instance
 * @param {object} [voucher] - Voucher instance (if voucher-based)
 * @returns {string|null} RADIUS username, or null if not applicable
 */
function getRadiusUsername(subscription, voucher = null) {
  // Voucher-based: use the voucher's generated RADIUS username
  if (voucher && voucher.radiusUsername) {
    return voucher.radiusUsername;
  }

  // PPPoE/Hotspot: use the networkIdentifier (PPPoE username or IP)
  if (subscription.networkIdentifier) {
    return subscription.networkIdentifier;
  }

  return null;
}

module.exports = {
  syncToRadius,
  removeFromRadius,
  getRadiusUsername,
};
