const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RouterCommandLog = sequelize.define('RouterCommandLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  deviceId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  command: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  params: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  triggeredBy: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'user_id, system, cron:expiry, cron:reconcile, mpesa:<receipt>, etc.',
  },
  result: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  durationMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'router_command_log',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // Write-only audit log — no updatedAt needed
  indexes: [
    { fields: ['device_id'], name: 'idx_rcl_device' },
    { fields: ['created_at'], name: 'idx_rcl_created' },
    { fields: ['triggered_by'], name: 'idx_rcl_triggered_by' },
  ],
});

module.exports = RouterCommandLog;
