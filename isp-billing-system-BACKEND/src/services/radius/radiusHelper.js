/**
 * RADIUS Helper Utilities
 *
 * Utility functions for RADIUS attribute generation, password creation,
 * and speed parsing.
 */

const crypto = require('crypto');

/**
 * Generate a secure random RADIUS password.
 * Used for hotspot/voucher users who don't set their own password.
 * @param {number} [length=12] - Password length
 * @returns {string} Random password (alphanumeric, no ambiguous chars)
 */
function generateRadiusPassword(length = 12) {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

/**
 * Parse a human-readable speed string to Kbps.
 *
 * @param {string} speedStr - e.g., "10 Mbps", "5Mbps", "512 Kbps", "Unlimited"
 * @returns {number|null} Speed in Kbps, or null for "Unlimited"/unparseable
 */
function parseSpeedToKbps(speedStr) {
  if (!speedStr) return null;

  const normalized = speedStr.trim().toLowerCase();
  if (normalized === 'unlimited') return null;

  // Match patterns like "10 Mbps", "5Mbps", "512kbps", "1 Gbps"
  const match = normalized.match(/^([\d.]+)\s*(gbps|mbps|kbps|bps)?$/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'mbps').toLowerCase();

  switch (unit) {
    case 'gbps': return Math.round(value * 1024 * 1024);
    case 'mbps': return Math.round(value * 1024);
    case 'kbps': return Math.round(value);
    case 'bps':  return Math.round(value / 1024);
    default:     return Math.round(value * 1024); // Default: assume Mbps
  }
}

/**
 * Build the Mikrotik-Rate-Limit RADIUS attribute string from a DataPlan.
 *
 * If the plan has explicit Kbps values, use them.
 * If not, try to parse the display `speed` field.
 *
 * @param {object} plan - DataPlan instance
 * @returns {string|null} Rate limit string, or null if no speed info
 */
function buildMikrotikRateLimit(plan) {
  // Prefer explicit Kbps columns
  if (plan.toMikrotikRateLimit) {
    const explicit = plan.toMikrotikRateLimit();
    if (explicit) return explicit;
  }

  // Fallback: parse the display speed field
  if (plan.speed) {
    const kbps = parseSpeedToKbps(plan.speed);
    if (kbps) {
      // Symmetric rate (same up/down) when only one speed is specified
      return `${kbps}k/${kbps}k`;
    }
  }

  return null;
}

/**
 * Determine the Acct-Interim-Interval for a subscription.
 * Uses tighter intervals (60s) for data-capped plans to reduce
 * the lag window for data cap enforcement.
 *
 * @param {object} subscription - Subscription instance
 * @param {object} [voucher] - Voucher instance (if applicable)
 * @returns {number} Interval in seconds
 */
function getAcctInterimInterval(subscription, voucher = null) {
  // Data-capped vouchers/plans get tighter interval (60s)
  if (voucher && voucher.dataLimitMb) return 60;
  if (subscription && subscription.plan && subscription.plan.dataLimit) {
    // If the plan has a finite data limit, tighten the interval
    const dataLimitMb = parseInt(subscription.plan.dataLimit);
    if (dataLimitMb > 0 && dataLimitMb < 999999) return 60;
  }
  // Unlimited plans: standard 5-minute interval
  return 300;
}

module.exports = {
  generateRadiusPassword,
  parseSpeedToKbps,
  buildMikrotikRateLimit,
  getAcctInterimInterval,
};
