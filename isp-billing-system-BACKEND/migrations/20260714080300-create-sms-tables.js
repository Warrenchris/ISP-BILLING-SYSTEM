'use strict';

/**
 * Migration: Create SMS logs and templates tables
 *
 * Creates:
 *   - sms_templates: Editable templates for payment receipts, alerts, warnings, and voucher delivery
 *   - sms_logs: Outbound SMS logs with recipient details, tag, delivery status, and actual gateway cost
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── sms_templates ────────────────────────────────────────────────
    await queryInterface.createTable('sms_templates', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      key: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      template: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      variables: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
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

    // ── sms_logs ─────────────────────────────────────────────────────
    await queryInterface.createTable('sms_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      recipient_phone: {
        type: Sequelize.STRING(15),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      tag: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      provider: {
        type: Sequelize.ENUM('africastalking', 'advanta', 'mock'),
        allowNull: false,
      },
      provider_response: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      cost: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sms_logs', ['recipient_phone'], { name: 'idx_sms_logs_phone' });
    await queryInterface.addIndex('sms_logs', ['status'], { name: 'idx_sms_logs_status' });
    await queryInterface.addIndex('sms_logs', ['tag'], { name: 'idx_sms_logs_tag' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sms_logs');
    await queryInterface.dropTable('sms_templates');
  },
};
