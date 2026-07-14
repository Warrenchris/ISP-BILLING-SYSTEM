/**
 * NAS Model — FreeRADIUS client network access servers
 *
 * Stores the IP address and decryption of per-router RADIUS shared secrets.
 * FreeRADIUS reads this table via its SQL module (if dynamic NAS is enabled)
 * to authenticate routers connecting as RADIUS clients.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Nas = sequelize.define('Nas', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nasname: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
  },
  shortname: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(30),
    allowNull: true,
    defaultValue: 'other',
  },
  ports: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  secret: {
    type: DataTypes.STRING(60),
    allowNull: false,
    defaultValue: 'secret',
  },
  server: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  community: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true,
    defaultValue: 'RADIUS Client',
  },
}, {
  tableName: 'nas',
  timestamps: false,
});

module.exports = Nas;
