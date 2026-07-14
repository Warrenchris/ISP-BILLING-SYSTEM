const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { SubscriptionStatus } = require('../config/constants');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  planId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  subscriptionNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM(
      SubscriptionStatus.PENDING,
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.EXPIRED,
      SubscriptionStatus.SUSPENDED,
      SubscriptionStatus.CANCELLED
    ),
    defaultValue: SubscriptionStatus.PENDING,
    get() {
      const rawValue = this.getDataValue('status');
      if (rawValue === SubscriptionStatus.ACTIVE && this.endDate && new Date() > new Date(this.endDate)) {
        return SubscriptionStatus.EXPIRED;
      }
      return rawValue;
    }
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endDate: DataTypes.DATE,
  dataUsed: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    validate: { min: 0, isInt: true }
  },
  dataRemaining: {
    type: DataTypes.BIGINT,
    allowNull: false,
    validate: { min: 0, isInt: true }
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  renewalDate: DataTypes.DATE,
  activatedAt: DataTypes.DATE,
  suspendedAt: DataTypes.DATE,
  cancelledAt: DataTypes.DATE,
  suspensionReason: DataTypes.STRING(255),
  cancellationReason: DataTypes.STRING(255),
  notes: DataTypes.TEXT,
  // Phase 1: Network provisioning columns
  connectionType: {
    type: DataTypes.ENUM('address_list', 'pppoe', 'hotspot'),
    allowNull: true,
    defaultValue: null,
  },
  networkDeviceId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  networkIdentifier: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Customer IP, MAC, or PPPoE username on the router',
  },
  gracePeriodHours: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 24,
  },
  provisioningRetryCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  lastProvisioningAttempt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Phase 5: Telemetry raw counter bytes for delta/reset checks
  lastDownloadBytesCounter: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    field: 'last_download_bytes_counter',
  },
  lastUploadBytesCounter: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    field: 'last_upload_bytes_counter',
  },
  // Phase 2: Encrypted RADIUS password (for PPPoE or Hotspot voucher access)
  radiusPasswordEncrypted: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  radiusPasswordIv: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  radiusPasswordTag: {
    type: DataTypes.STRING(64),
    allowNull: true,
  }
}, {
  tableName: 'subscriptions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_subscriptions_user_id',
      fields: ['user_id']
    },
    {
      name: 'idx_subscriptions_status',
      fields: ['status']
    },
    {
      name: 'idx_subscriptions_active_lookup',
      fields: ['user_id', 'status', 'end_date']
    }
  ],
  hooks: {
    beforeCreate: (sub) => {
      const timestamp = Date.now().toString().slice(-8);
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      sub.subscriptionNumber = `SUB${timestamp}${rand}`;

      // Hook encryption for _plaintextRadiusPassword
      if (sub._plaintextRadiusPassword) {
        const { NetworkDevice } = require('./index');
        const { encrypted, iv, tag } = NetworkDevice.encryptPassword(sub._plaintextRadiusPassword);
        sub.radiusPasswordEncrypted = encrypted;
        sub.radiusPasswordIv = iv;
        sub.radiusPasswordTag = tag;
        delete sub._plaintextRadiusPassword;
      }
    },
    beforeUpdate: (sub) => {
      if (sub.changed('status')) {
        const now = new Date();
        if (sub.status === SubscriptionStatus.ACTIVE) sub.activatedAt = now;
        if (sub.status === SubscriptionStatus.SUSPENDED) sub.suspendedAt = now;
        if (sub.status === SubscriptionStatus.CANCELLED) sub.cancelledAt = now;
      }

      // Hook encryption for _plaintextRadiusPassword
      if (sub._plaintextRadiusPassword) {
        const { NetworkDevice } = require('./index');
        const { encrypted, iv, tag } = NetworkDevice.encryptPassword(sub._plaintextRadiusPassword);
        sub.radiusPasswordEncrypted = encrypted;
        sub.radiusPasswordIv = iv;
        sub.radiusPasswordTag = tag;
        delete sub._plaintextRadiusPassword;
      }
    }
  }
});

/**
 * Decrypt the stored RADIUS password.
 * @returns {string|null} Plaintext password, or null if not set
 */
Subscription.prototype.getDecryptedRadiusPassword = function () {
  if (!this.radiusPasswordEncrypted || !this.radiusPasswordIv || !this.radiusPasswordTag) {
    return null;
  }
  const crypto = require('crypto');
  const key = Buffer.from(process.env.ROUTER_ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(this.radiusPasswordIv, 'hex');
  const tag = Buffer.from(this.radiusPasswordTag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(this.radiusPasswordEncrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Associations
Subscription.associate = function (models) {
  Subscription.belongsTo(models.User, { foreignKey: 'userId', as: 'User' });
  Subscription.belongsTo(models.DataPlan, { foreignKey: 'planId', as: 'plan' });
  Subscription.hasMany(models.Payment, { foreignKey: 'subscriptionId', as: 'payments' });
};

// Instance Methods
Subscription.prototype.isActive = function () {
  return this.status === SubscriptionStatus.ACTIVE && new Date() <= new Date(this.endDate);
};

Subscription.prototype.isExpired = function () {
  return new Date() > new Date(this.endDate);
};

Subscription.prototype.getDaysRemaining = function () {
  const days = Math.ceil((new Date(this.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
};

Subscription.prototype.getDataUsagePercentage = function () {
  if (!this.plan) return 0;
  const total = parseInt(this.plan.dataLimit);
  return Math.min(100, (parseInt(this.dataUsed) / total) * 100);
};

Subscription.prototype.getFormattedDataUsed = function () {
  return this.dataUsed >= 1024
    ? `${(this.dataUsed / 1024).toFixed(2)} GB`
    : `${this.dataUsed} MB`;
};

Subscription.prototype.getFormattedDataRemaining = function () {
  return this.dataRemaining >= 1024
    ? `${(this.dataRemaining / 1024).toFixed(2)} GB`
    : `${this.dataRemaining} MB`;
};

Subscription.prototype.updateDataUsage = async function (usedMB) {
  const totalLimit = parseInt(this.plan.dataLimit);
  const newUsed = this.dataUsed + usedMB;
  const newRemaining = Math.max(0, totalLimit - newUsed);

  await this.update({ dataUsed: newUsed, dataRemaining: newRemaining });

  if (newUsed >= totalLimit) {
    await this.update({ status: SubscriptionStatus.EXPIRED });
  }

  return this;
};

Subscription.prototype.activateSubscription = async function (options = {}) {
  const { DataPlan } = require('./index');
  const plan = await DataPlan.findByPk(this.planId, options);
  if (!plan) throw new Error('Plan not found');

  const now = new Date();
  let endDate = new Date(now);

  switch (plan.validityPeriod) {
    case 'daily': endDate.setDate(endDate.getDate() + 1); break;
    case 'weekly': endDate.setDate(endDate.getDate() + 7); break;
    case 'monthly': endDate.setMonth(endDate.getMonth() + 1); break;
    case 'yearly': endDate.setFullYear(endDate.getFullYear() + 1); break;
    default: endDate.setMonth(endDate.getMonth() + 1);
  }

  // Deactivate any other active subscriptions for this user
  await Subscription.update(
    { status: SubscriptionStatus.CANCELLED, notes: 'Superseded by new subscription activation' },
    {
      where: {
        userId: this.userId,
        status: SubscriptionStatus.ACTIVE,
        id: { [Op.ne]: this.id }
      },
      ...options
    }
  );

  await this.update({
    status: SubscriptionStatus.ACTIVE,
    activatedAt: now,
    endDate,
    dataUsed: 0,
    dataRemaining: plan.dataLimit
  }, options);

  return this;
};

// Class Methods
Subscription.findActiveByUser = function (userId) {
  const { DataPlan } = require('./index');
  return this.findAll({
    where: {
      userId,
      status: SubscriptionStatus.ACTIVE,
      endDate: { [Op.gt]: new Date() }
    },
    include: [{ model: DataPlan, as: 'plan' }],
    // Use DB column name to match underscored timestamps
    order: [['created_at', 'DESC']]
  });
};

Subscription.findByUser = function (userId) {
  const { DataPlan, User } = require('./index');
  return this.findAll({
    where: { userId },
    include: [
      { model: DataPlan, as: 'plan' },
      { model: User, as: 'User' }
    ],
    // Use DB column name to match underscored timestamps
    order: [['created_at', 'DESC']]
  });
};

module.exports = Subscription;
