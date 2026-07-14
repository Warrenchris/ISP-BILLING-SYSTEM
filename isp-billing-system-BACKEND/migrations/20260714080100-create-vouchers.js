'use strict';

/**
 * Migration: Create vouchers table
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vouchers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'data_plans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      data_limit_mb: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'NULL = inherit from plan',
      },
      time_limit_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'NULL = inherit from plan',
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('unused', 'active', 'expired', 'used', 'revoked'),
        allowNull: false,
        defaultValue: 'unused',
      },
      batch_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      redeemed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      redeemed_by_customer_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      subscription_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'subscriptions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      radius_username: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the unused voucher itself expires (shelf life)',
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

    await queryInterface.addIndex('vouchers', ['code'], { name: 'idx_vouchers_code' });
    await queryInterface.addIndex('vouchers', ['batch_id'], { name: 'idx_vouchers_batch' });
    await queryInterface.addIndex('vouchers', ['status'], { name: 'idx_vouchers_status' });
    await queryInterface.addIndex('vouchers', ['plan_id'], { name: 'idx_vouchers_plan' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vouchers');
  },
};
