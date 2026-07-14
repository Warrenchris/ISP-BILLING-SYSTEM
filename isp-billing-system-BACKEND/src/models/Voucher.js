/**
 * Voucher Model
 *
 * Prepaid voucher codes for hotspot/PPPoE access.
 * Generated in batches by admin, redeemed by customers.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

// Ambiguity-free character set: excludes 0, O, I, l, 1
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const DEFAULT_CODE_LENGTH = parseInt(process.env.VOUCHER_CODE_LENGTH || '8', 10);

const Voucher = sequelize.define('Voucher', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  planId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  dataLimitMb: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'NULL = inherit from plan',
  },
  timeLimitMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'NULL = inherit from plan',
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('unused', 'active', 'expired', 'used', 'revoked'),
    allowNull: false,
    defaultValue: 'unused',
  },
  batchId: {
    type: DataTypes.STRING(36),
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  redeemedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  redeemedByCustomerId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  subscriptionId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  radiusUsername: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Shelf life expiry for unused vouchers',
  },
}, {
  tableName: 'vouchers',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/**
 * Generate a single cryptographically random voucher code.
 * Format: XXXX-XXXX (e.g., XKPF-3N7W)
 */
Voucher.generateCode = function (length = DEFAULT_CODE_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  // Insert separator for readability
  if (length >= 8) {
    return code.slice(0, 4) + '-' + code.slice(4);
  }
  return code;
};

/**
 * Generate a batch of unique voucher codes.
 * Checks for collisions against existing codes in DB.
 *
 * @param {number} quantity - Number of codes to generate
 * @param {number} [maxRetries=3] - Max collision retry rounds
 * @returns {string[]} Array of unique codes
 */
Voucher.generateUniqueCodes = async function (quantity, maxRetries = 3) {
  const codes = new Set();
  let retries = 0;

  while (codes.size < quantity && retries < maxRetries) {
    // Generate more codes than needed to account for potential collisions
    const needed = quantity - codes.size;
    const batch = [];
    for (let i = 0; i < needed + 10; i++) {
      batch.push(Voucher.generateCode());
    }

    // Check for collisions against existing codes
    const existing = await Voucher.findAll({
      where: { code: batch },
      attributes: ['code'],
      raw: true,
    });
    const existingSet = new Set(existing.map(r => r.code));

    for (const code of batch) {
      if (!existingSet.has(code) && !codes.has(code)) {
        codes.add(code);
        if (codes.size >= quantity) break;
      }
    }

    retries++;
  }

  if (codes.size < quantity) {
    throw new Error(
      `Could not generate ${quantity} unique voucher codes after ${maxRetries} rounds. ` +
      `Generated ${codes.size}. This should be extremely rare — check for entropy issues.`
    );
  }

  return Array.from(codes);
};

module.exports = Voucher;
