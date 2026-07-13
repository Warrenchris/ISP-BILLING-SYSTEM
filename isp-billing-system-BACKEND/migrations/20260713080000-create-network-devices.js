'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('network_devices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      api_port: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 8728,
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      password_encrypted: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      encryption_iv: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      encryption_tag: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      site_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      router_os_version: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '7',
      },
      cutoff_address_list: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'cutoff-list',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Index for quick lookups by site
    await queryInterface.addIndex('network_devices', ['site_id'], {
      name: 'idx_network_devices_site',
    });

    await queryInterface.addIndex('network_devices', ['is_active'], {
      name: 'idx_network_devices_active',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('network_devices');
  },
};
