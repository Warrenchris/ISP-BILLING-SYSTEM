/**
 * RadReply Model — FreeRADIUS authorization attributes
 *
 * Stores rate limits, session timeouts, and interim intervals.
 * Written by the app's RADIUS sync layer; read by FreeRADIUS during authorization.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const RadReply = sequelize.define('RadReply', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: '',
  },
  attribute: {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: '',
  },
  op: {
    type: DataTypes.CHAR(2),
    allowNull: false,
    defaultValue: ':=',
  },
  value: {
    type: DataTypes.STRING(253),
    allowNull: false,
    defaultValue: '',
  },
}, {
  tableName: 'radreply',
  timestamps: false,
});

module.exports = RadReply;
