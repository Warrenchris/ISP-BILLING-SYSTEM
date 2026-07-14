'use strict';

/**
 * Migration: Create FreeRADIUS standard schema tables
 *
 * Creates the four standard FreeRADIUS SQL module tables:
 *   - radcheck: Authentication attributes (password, auth type)
 *   - radreply: Authorization attributes (rate limit, session timeout)
 *   - radusergroup: User-to-group mappings
 *   - radacct: Accounting records (session data, byte counters)
 *
 * Schema follows FreeRADIUS 3.x standard MySQL schema exactly.
 * No custom columns — keeps compatibility with radtest/radclient/rlm_sql_mysql.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── radcheck ──────────────────────────────────────────────────────
    await queryInterface.createTable('radcheck', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      attribute: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      op: {
        type: Sequelize.CHAR(2),
        allowNull: false,
        defaultValue: ':=',
      },
      value: {
        type: Sequelize.STRING(253),
        allowNull: false,
        defaultValue: '',
      },
    });
    await queryInterface.addIndex('radcheck', ['username'], { name: 'idx_radcheck_username' });

    // ── radreply ──────────────────────────────────────────────────────
    await queryInterface.createTable('radreply', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      attribute: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      op: {
        type: Sequelize.CHAR(2),
        allowNull: false,
        defaultValue: ':=',
      },
      value: {
        type: Sequelize.STRING(253),
        allowNull: false,
        defaultValue: '',
      },
    });
    await queryInterface.addIndex('radreply', ['username'], { name: 'idx_radreply_username' });

    // ── radusergroup ──────────────────────────────────────────────────
    await queryInterface.createTable('radusergroup', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      groupname: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    });
    await queryInterface.addIndex('radusergroup', ['username'], { name: 'idx_radusergroup_username' });

    // ── radacct ───────────────────────────────────────────────────────
    await queryInterface.createTable('radacct', {
      radacctid: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      acctsessionid: { type: Sequelize.STRING(64), allowNull: false, defaultValue: '' },
      acctuniqueid: { type: Sequelize.STRING(32), allowNull: false, defaultValue: '' },
      username: { type: Sequelize.STRING(64), allowNull: false, defaultValue: '' },
      realm: { type: Sequelize.STRING(64), defaultValue: '' },
      nasipaddress: { type: Sequelize.STRING(15), allowNull: false, defaultValue: '' },
      nasportid: { type: Sequelize.STRING(32), defaultValue: null },
      nasporttype: { type: Sequelize.STRING(32), defaultValue: null },
      acctstarttime: { type: Sequelize.DATE, defaultValue: null },
      acctupdatetime: { type: Sequelize.DATE, defaultValue: null },
      acctstoptime: { type: Sequelize.DATE, defaultValue: null },
      acctinterval: { type: Sequelize.INTEGER, defaultValue: null },
      acctsessiontime: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: null },
      acctauthentic: { type: Sequelize.STRING(32), defaultValue: null },
      connectinfo_start: { type: Sequelize.STRING(128), defaultValue: null },
      connectinfo_stop: { type: Sequelize.STRING(128), defaultValue: null },
      acctinputoctets: { type: Sequelize.BIGINT, defaultValue: null },
      acctoutputoctets: { type: Sequelize.BIGINT, defaultValue: null },
      calledstationid: { type: Sequelize.STRING(50), allowNull: false, defaultValue: '' },
      callingstationid: { type: Sequelize.STRING(50), allowNull: false, defaultValue: '' },
      acctterminatecause: { type: Sequelize.STRING(32), allowNull: false, defaultValue: '' },
      servicetype: { type: Sequelize.STRING(32), defaultValue: null },
      framedprotocol: { type: Sequelize.STRING(32), defaultValue: null },
      framedipaddress: { type: Sequelize.STRING(15), allowNull: false, defaultValue: '' },
      framedipv6address: { type: Sequelize.STRING(45), allowNull: false, defaultValue: '' },
      framedipv6prefix: { type: Sequelize.STRING(45), allowNull: false, defaultValue: '' },
      framedinterfaceid: { type: Sequelize.STRING(44), allowNull: false, defaultValue: '' },
      delegatedipv6prefix: { type: Sequelize.STRING(45), allowNull: false, defaultValue: '' },
    });
    await queryInterface.addIndex('radacct', ['acctuniqueid'], { name: 'idx_radacct_acctuniqueid', unique: true });
    await queryInterface.addIndex('radacct', ['username'], { name: 'idx_radacct_username' });
    await queryInterface.addIndex('radacct', ['acctsessionid'], { name: 'idx_radacct_acctsessionid' });
    await queryInterface.addIndex('radacct', ['acctstarttime'], { name: 'idx_radacct_acctstarttime' });
    await queryInterface.addIndex('radacct', ['acctstoptime'], { name: 'idx_radacct_acctstoptime' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('radacct');
    await queryInterface.dropTable('radusergroup');
    await queryInterface.dropTable('radreply');
    await queryInterface.dropTable('radcheck');
  },
};
