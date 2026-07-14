'use strict';

/**
 * Migration: Add bandwidth profile columns to data_plans
 * and RADIUS shared secret columns to network_devices.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── DataPlan bandwidth profile columns ────────────────────────────
    await queryInterface.addColumn('data_plans', 'upload_speed_kbps', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Upload speed in Kbps for RADIUS Mikrotik-Rate-Limit',
    });
    await queryInterface.addColumn('data_plans', 'download_speed_kbps', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Download speed in Kbps for RADIUS Mikrotik-Rate-Limit',
    });
    await queryInterface.addColumn('data_plans', 'burst_upload_kbps', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Burst upload speed (optional MikroTik queue)',
    });
    await queryInterface.addColumn('data_plans', 'burst_download_kbps', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Burst download speed (optional MikroTik queue)',
    });
    await queryInterface.addColumn('data_plans', 'session_timeout_seconds', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'RADIUS Session-Timeout. NULL = use plan validity period',
    });

    // ── NetworkDevice per-router RADIUS shared secret ─────────────────
    await queryInterface.addColumn('network_devices', 'radius_secret_encrypted', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'AES-256-GCM encrypted RADIUS shared secret (per-router)',
    });
    await queryInterface.addColumn('network_devices', 'radius_secret_iv', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('network_devices', 'radius_secret_tag', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    // ── Subscription RADIUS password columns ──────────────────────────
    await queryInterface.addColumn('subscriptions', 'radius_password_encrypted', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'AES-256-GCM encrypted RADIUS password (PPPoE / Hotspot)',
    });
    await queryInterface.addColumn('subscriptions', 'radius_password_iv', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('subscriptions', 'radius_password_tag', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    // DataPlan columns
    await queryInterface.removeColumn('data_plans', 'upload_speed_kbps');
    await queryInterface.removeColumn('data_plans', 'download_speed_kbps');
    await queryInterface.removeColumn('data_plans', 'burst_upload_kbps');
    await queryInterface.removeColumn('data_plans', 'burst_download_kbps');
    await queryInterface.removeColumn('data_plans', 'session_timeout_seconds');

    // NetworkDevice columns
    await queryInterface.removeColumn('network_devices', 'radius_secret_encrypted');
    await queryInterface.removeColumn('network_devices', 'radius_secret_iv');
    await queryInterface.removeColumn('network_devices', 'radius_secret_tag');

    // Subscription columns
    await queryInterface.removeColumn('subscriptions', 'radius_password_encrypted');
    await queryInterface.removeColumn('subscriptions', 'radius_password_iv');
    await queryInterface.removeColumn('subscriptions', 'radius_password_tag');
  },
};
