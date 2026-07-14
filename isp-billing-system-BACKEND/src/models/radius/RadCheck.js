/**
 * RadCheck Model — FreeRADIUS authentication attributes
 *
 * Write-only from the app's perspective. FreeRADIUS reads this table
 * via the rlm_sql_mysql module during authentication.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const RadCheck = sequelize.define('RadCheck', {
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
  tableName: 'radcheck',
  timestamps: false,
});

module.exports = RadCheck;
