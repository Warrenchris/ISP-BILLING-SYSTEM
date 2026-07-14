/**
 * SmsLog Model
 *
 * Log audit record of every sent message, including delivery statuses
 * and parsed billing costs from provider gateway responses.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SmsLog = sequelize.define('SmsLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  recipientPhone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    field: 'recipient_phone',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  tag: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  provider: {
    type: DataTypes.ENUM('africastalking', 'advanta', 'mock'),
    allowNull: false,
  },
  providerResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'provider_response',
  },
  cost: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message',
  },
}, {
  tableName: 'sms_logs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // Outbound logs are write-once
});

module.exports = SmsLog;
