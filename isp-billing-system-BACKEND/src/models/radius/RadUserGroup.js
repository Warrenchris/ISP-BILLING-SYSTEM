/**
 * RadUserGroup Model — FreeRADIUS user-to-group mapping
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const RadUserGroup = sequelize.define('RadUserGroup', {
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
  groupname: {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: '',
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'radusergroup',
  timestamps: false,
});

module.exports = RadUserGroup;
