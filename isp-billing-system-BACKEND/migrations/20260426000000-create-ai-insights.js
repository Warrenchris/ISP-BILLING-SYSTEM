'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_insights', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      prediction_type: {
        type: Sequelize.ENUM('revenue_forecast', 'churn_risk', 'billing_anomaly'),
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      predicted_value: {
        type: Sequelize.DECIMAL(15, 4),
        allowNull: true
      },
      actual_value: {
        type: Sequelize.DECIMAL(15, 4),
        allowNull: true
      },
      confidence_low: {
        type: Sequelize.DECIMAL(15, 4),
        allowNull: true
      },
      confidence_high: {
        type: Sequelize.DECIMAL(15, 4),
        allowNull: true
      },
      score: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true
      },
      is_flagged: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      insight_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      model_version: {
        type: Sequelize.STRING(20),
        defaultValue: '1.0.0',
        allowNull: true
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: true
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Indexes
    await queryInterface.addIndex('ai_insights', ['prediction_type'], { name: 'ai_insights_prediction_type' });
    await queryInterface.addIndex('ai_insights', ['user_id'], { name: 'ai_insights_user_id' });
    await queryInterface.addIndex('ai_insights', ['is_flagged'], { name: 'ai_insights_is_flagged' });
    await queryInterface.addIndex('ai_insights', ['created_at'], { name: 'ai_insights_created_at' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ai_insights');
  }
};
