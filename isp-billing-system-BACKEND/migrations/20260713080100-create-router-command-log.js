'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('router_command_log', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      device_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'network_devices',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      command: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      params: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      triggered_by: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'user_id, system, cron:expiry, cron:reconcile, mpesa:<receipt>, etc.',
      },
      result: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('router_command_log', ['device_id'], {
      name: 'idx_rcl_device',
    });

    await queryInterface.addIndex('router_command_log', ['created_at'], {
      name: 'idx_rcl_created',
    });

    await queryInterface.addIndex('router_command_log', ['triggered_by'], {
      name: 'idx_rcl_triggered_by',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('router_command_log');
  },
};
