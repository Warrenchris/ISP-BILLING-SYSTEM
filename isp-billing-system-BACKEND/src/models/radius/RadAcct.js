/**
 * RadAcct Model — FreeRADIUS accounting records (read-only)
 *
 * MikroTik sends accounting updates (Interim-Update, Stop) which FreeRADIUS
 * writes here. The accounting watcher reads this table to enforce data caps.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const RadAcct = sequelize.define('RadAcct', {
  radacctid: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  acctsessionid: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
  acctuniqueid: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '' },
  username: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
  realm: { type: DataTypes.STRING(64), defaultValue: '' },
  nasipaddress: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
  nasportid: { type: DataTypes.STRING(32), defaultValue: null },
  nasporttype: { type: DataTypes.STRING(32), defaultValue: null },
  acctstarttime: { type: DataTypes.DATE, defaultValue: null },
  acctupdatetime: { type: DataTypes.DATE, defaultValue: null },
  acctstoptime: { type: DataTypes.DATE, defaultValue: null },
  acctinterval: { type: DataTypes.INTEGER, defaultValue: null },
  acctsessiontime: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: null },
  acctauthentic: { type: DataTypes.STRING(32), defaultValue: null },
  connectinfo_start: { type: DataTypes.STRING(128), defaultValue: null },
  connectinfo_stop: { type: DataTypes.STRING(128), defaultValue: null },
  acctinputoctets: { type: DataTypes.BIGINT, defaultValue: null },
  acctoutputoctets: { type: DataTypes.BIGINT, defaultValue: null },
  calledstationid: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '' },
  callingstationid: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '' },
  acctterminatecause: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '' },
  servicetype: { type: DataTypes.STRING(32), defaultValue: null },
  framedprotocol: { type: DataTypes.STRING(32), defaultValue: null },
  framedipaddress: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
  framedipv6address: { type: DataTypes.STRING(45), allowNull: false, defaultValue: '' },
  framedipv6prefix: { type: DataTypes.STRING(45), allowNull: false, defaultValue: '' },
  framedinterfaceid: { type: DataTypes.STRING(44), allowNull: false, defaultValue: '' },
  delegatedipv6prefix: { type: DataTypes.STRING(45), allowNull: false, defaultValue: '' },
}, {
  tableName: 'radacct',
  timestamps: false,
});

module.exports = RadAcct;
