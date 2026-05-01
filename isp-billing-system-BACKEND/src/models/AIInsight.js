const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIInsight = sequelize.define('AIInsight', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  predictionType: {
    type: DataTypes.ENUM('revenue_forecast', 'churn_risk', 'billing_anomaly'),
    allowNull: false,
    field: 'prediction_type'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // null for aggregate predictions like revenue_forecast
    field: 'user_id',
    references: { model: 'users', key: 'id' }
  },
  predictedValue: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
    field: 'predicted_value'
  },
  actualValue: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
    field: 'actual_value'
  },
  confidenceLow: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
    field: 'confidence_low'
  },
  confidenceHigh: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true,
    field: 'confidence_high'
  },
  score: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true // churn risk score 0.0-1.0
  },
  isFlagged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_flagged'
  },
  insightData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'insight_data'
  },
  modelVersion: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '1.0.0',
    field: 'model_version'
  },
  periodStart: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'period_start'
  },
  periodEnd: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'period_end'
  }
}, {
  tableName: 'ai_insights',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['prediction_type'], name: 'ai_insights_prediction_type' },
    { fields: ['user_id'], name: 'ai_insights_user_id' },
    { fields: ['is_flagged'], name: 'ai_insights_is_flagged' },
    { fields: ['created_at'], name: 'ai_insights_created_at' }
  ]
});

module.exports = AIInsight;
