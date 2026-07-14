'use strict';

/**
 * Migration: Add telemetry counter columns to subscriptions table.
 * 
 * Adds:
 *   - last_download_bytes_counter: Persists the cumulative download bytes from the last sweep.
 *   - last_upload_bytes_counter: Persists the cumulative upload bytes from the last sweep.
 * These are used to calculate delta bandwidth usage and detect router counter resets.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscriptions', 'last_download_bytes_counter', {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Last processed cumulative download bytes for telemetry deltas',
    });

    await queryInterface.addColumn('subscriptions', 'last_upload_bytes_counter', {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Last processed cumulative upload bytes for telemetry deltas',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('subscriptions', 'last_download_bytes_counter');
    await queryInterface.removeColumn('subscriptions', 'last_upload_bytes_counter');
  }
};
