const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { PaymentStatus } = require('../config/constants');

// Payment model definition
const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    field: 'user_id',
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  subscriptionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'subscriptions', key: 'id' },
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 1 },
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'KES',
  },
  phoneNumber: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      // Kenyan phone format: +254XXXXXXXXX, 254XXXXXXXXX, or 0XXXXXXXXX starting with 1/7
      is: /^(?:\+254|0|254)[17]\d{8}$/,
    },
  },
  checkoutRequestId: {
    type: DataTypes.STRING(100),
    field: 'checkout_request_id',
    allowNull: true,
    unique: true,
  },
  merchantRequestId: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  mpesaReceiptNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(
      PaymentStatus.PENDING,
      PaymentStatus.PROCESSING,
      PaymentStatus.COMPLETED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
      PaymentStatus.EXPIRED,
    ),
    allowNull: false,
    defaultValue: PaymentStatus.PENDING,
  },
  paymentMethod: {
    type: DataTypes.ENUM('mpesa', 'card', 'bank', 'cash'),
    allowNull: false,
    defaultValue: 'mpesa',
  },
  paymentType: {
    type: DataTypes.ENUM('subscription', 'top_up', 'penalty', 'installation'),
    allowNull: false,
    defaultValue: 'subscription',
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  callbackData: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  retryCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
  initiatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'payments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['checkout_request_id'], unique: true, name: 'payments_checkout_request_id' },
    { fields: ['status'], name: 'payments_status' },
    { fields: ['user_id'], name: 'payments_user_id' },
  ],
  hooks: {
    beforeCreate: async (payment) => {
      if (!payment.reference) {
        payment.reference = `MPESA-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      }
      if (payment.paymentMethod === 'mpesa') {
        payment.currency = 'KES';
        payment.expiresAt = payment.expiresAt || new Date(Date.now() + 5 * 60 * 1000);
      }
    },
  },
});

// Instance methods
Payment.prototype.isExpired = function () {
  return this.expiresAt && new Date() > this.expiresAt;
};

Payment.prototype.canRetry = function () {
  return this.retryCount < this.maxRetries
    && [PaymentStatus.FAILED, PaymentStatus.EXPIRED].includes(this.status);
};

Payment.prototype.markAsCompleted = function (mpesaData = {}) {
  this.status = PaymentStatus.COMPLETED;
  this.completedAt = new Date();
  if (mpesaData.mpesaReceiptNumber) this.mpesaReceiptNumber = mpesaData.mpesaReceiptNumber;
  if (mpesaData.transactionDate) this.transactionDate = mpesaData.transactionDate;
  this.callbackData = mpesaData;
  return this.save();
};

Payment.prototype.markAsFailed = function (errorMessage, callbackData = null) {
  this.status = PaymentStatus.FAILED;
  this.errorMessage = errorMessage;
  this.callbackData = callbackData;
  return this.save();
};

Payment.prototype.getFormattedAmount = function () {
  return `KES ${parseFloat(this.amount).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

Payment.prototype.getDurationSinceInitiated = function () {
  const now = new Date();
  const initiated = new Date(this.initiatedAt);
  const diffMs = now - initiated;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

Payment.prototype.getStatusColor = function () {
  const colors = {
    [PaymentStatus.PENDING]: 'orange',
    [PaymentStatus.PROCESSING]: 'blue',
    [PaymentStatus.COMPLETED]: 'green',
    [PaymentStatus.FAILED]: 'red',
    [PaymentStatus.CANCELLED]: 'gray',
    [PaymentStatus.EXPIRED]: 'red',
  };
  return colors[this.status] || 'gray';
};

Payment.prototype.incrementRetry = function () {
  this.retryCount += 1;
  return this.save();
};

// Static methods
Payment.findByCheckoutRequestId = function (checkoutRequestId) {
  return this.findOne({ where: { checkoutRequestId } });
};

Payment.handleMpesaCallback = async function (callbackData) {
  const payment = await this.findOne({ where: { checkoutRequestId: callbackData.checkoutRequestId } });
  if (!payment) throw new Error('Payment not found');
  return callbackData.success
    ? payment.markAsCompleted(callbackData.transactionDetails)
    : payment.markAsFailed(callbackData.resultDesc, callbackData);
};

Payment.findByReference = function (reference) {
  return this.findOne({ where: { reference } });
};

Payment.findByMpesaReceipt = function (mpesaReceiptNumber) {
  return this.findOne({ where: { mpesaReceiptNumber } });
};

Payment.getPaymentStats = async function (userId = null) {
  const whereClause = userId ? { userId } : {};
  const stats = await this.findAll({
    where: whereClause,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
    ],
    group: ['status'],
    raw: true,
  });
  return stats.reduce((acc, stat) => {
    acc[stat.status] = {
      count: parseInt(stat.count, 10),
      total: parseFloat(stat.total || 0),
    };
    return acc;
  }, {});
};

module.exports = Payment;

