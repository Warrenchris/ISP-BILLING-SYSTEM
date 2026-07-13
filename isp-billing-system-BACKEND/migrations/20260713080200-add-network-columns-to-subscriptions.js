'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add connection_type column
    await queryInterface.addColumn('subscriptions', 'connection_type', {
      type: Sequelize.ENUM('address_list', 'pppoe', 'hotspot'),
      allowNull: true,
      defaultValue: null,
      comment: 'Provisioning strategy for this customer on the router',
    });

    // Add network_device_id FK
    await queryInterface.addColumn('subscriptions', 'network_device_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'network_devices',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add network_identifier (IP, MAC, or PPPoE username on the router)
    await queryInterface.addColumn('subscriptions', 'network_identifier', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Customer IP, MAC address, or PPPoE username on the router',
    });

    // Add grace_period_hours
    await queryInterface.addColumn('subscriptions', 'grace_period_hours', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 24,
      comment: 'Hours after expiry before automatic cutoff',
    });

    // Add provisioning_retry_count
    await queryInterface.addColumn('subscriptions', 'provisioning_retry_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of failed provisioning attempts for current action',
    });

    // Add last_provisioning_attempt
    await queryInterface.addColumn('subscriptions', 'last_provisioning_attempt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add reminder_sent_at (prep for Phase 3 SMS)
    await queryInterface.addColumn('subscriptions', 'reminder_sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last pre-expiry reminder sent (Phase 3 SMS)',
    });

    // Indexes for the expiry/reconciliation queries
    await queryInterface.addIndex('subscriptions', ['network_device_id'], {
      name: 'idx_subscriptions_network_device',
    });

    await queryInterface.addIndex('subscriptions', ['connection_type'], {
      name: 'idx_subscriptions_connection_type',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('subscriptions', 'idx_subscriptions_connection_type');
    await queryInterface.removeIndex('subscriptions', 'idx_subscriptions_network_device');

    await queryInterface.removeColumn('subscriptions', 'reminder_sent_at');
    await queryInterface.removeColumn('subscriptions', 'last_provisioning_attempt');
    await queryInterface.removeColumn('subscriptions', 'provisioning_retry_count');
    await queryInterface.removeColumn('subscriptions', 'grace_period_hours');
    await queryInterface.removeColumn('subscriptions', 'network_identifier');
    await queryInterface.removeColumn('subscriptions', 'network_device_id');
    await queryInterface.removeColumn('subscriptions', 'connection_type');
  },
};
