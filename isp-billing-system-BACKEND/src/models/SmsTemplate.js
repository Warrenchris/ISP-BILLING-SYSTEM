/**
 * SmsTemplate Model
 *
 * Stores customizable template patterns that admins can edit from the dashboard.
 * Includes interpolation helpers replacing {{placeholder}} tokens dynamically.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SmsTemplate = sequelize.define('SmsTemplate', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  template: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  variables: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'sms_templates',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/**
 * Interpolate values into this template's placeholders.
 * Replaces patterns like {{firstName}} or {{amount}} with values.
 *
 * @param {object} variablesObject - key-value pairs of replacements
 * @returns {string} Fully formatted message string
 */
SmsTemplate.prototype.interpolate = function (variablesObject) {
  let result = this.template;
  const data = variablesObject || {};

  // Match all {{variable}} patterns
  result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (data[key] !== undefined && data[key] !== null) {
      return String(data[key]);
    }
    return ''; // Replace with empty string if undefined/missing
  });

  return result;
};

module.exports = SmsTemplate;
