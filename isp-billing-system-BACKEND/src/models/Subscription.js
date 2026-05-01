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
    defaultValue: SubscriptionStatus.PENDING
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
  notes: DataTypes.TEXT
}, {
  tableName: 'subscriptions',
  hooks: {
    beforeCreate: (sub) => {
      const timestamp = Date.now().toString().slice(-8);
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      sub.subscriptionNumber = `SUB${timestamp}${rand}`;
    },
    beforeUpdate: (sub) => {
      if (sub.changed('status')) {
        const now = new Date();
        if (sub.status === SubscriptionStatus.ACTIVE) sub.activatedAt = now;
        if (sub.status === SubscriptionStatus.SUSPENDED) sub.suspendedAt = now;
        if (sub.status === SubscriptionStatus.CANCELLED) sub.cancelledAt = now;
      }
    }
  }
});

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

Subscription.prototype.activateSubscription = async function () {
  const { DataPlan } = require('./index');
  const plan = await DataPlan.findByPk(this.planId);
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

  await this.update({
    status: SubscriptionStatus.ACTIVE,
    activatedAt: now,
    endDate,
    dataUsed: 0,
    dataRemaining: plan.dataLimit
  });

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
