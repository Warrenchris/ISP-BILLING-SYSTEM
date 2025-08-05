const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DataPlan = sequelize.define('DataPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dataLimit: {
    type: DataTypes.BIGINT, // Data limit in MB
    allowNull: false,
    validate: {
      min: 1,
      isInt: true
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2), // Price in KES
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  validityPeriod: {
    type: DataTypes.INTEGER, // Validity period in days
    allowNull: false,
    validate: {
      min: 1,
      isInt: true
    }
  },
  speed: {
    type: DataTypes.STRING(50), // e.g., "10 Mbps", "Unlimited"
    allowNull: true
  },
  planType: {
    type: DataTypes.ENUM('prepaid', 'postpaid'),
    allowNull: false,
    defaultValue: 'prepaid'
  },
  category: {
    type: DataTypes.ENUM('basic', 'standard', 'premium', 'enterprise'),
    allowNull: false,
    defaultValue: 'basic'
  },
  features: {
    type: DataTypes.JSON, // Array of features like ["Free WhatsApp", "Free Facebook"]
    allowNull: true,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isPopular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'data_plans'
});

// Instance methods
DataPlan.prototype.getFormattedPrice = function() {
  return `KES ${parseFloat(this.price).toLocaleString()}`;
};

DataPlan.prototype.getFormattedDataLimit = function() {
  const dataLimitMB = parseInt(this.dataLimit);
  if (dataLimitMB >= 1024) {
    return `${(dataLimitMB / 1024).toFixed(1)} GB`;
  }
  return `${dataLimitMB} MB`;
};

DataPlan.prototype.getValidityText = function() {
  const days = parseInt(this.validityPeriod);
  if (days === 1) return '1 day';
  if (days === 7) return '1 week';
  if (days === 30) return '1 month';
  if (days === 365) return '1 year';
  return `${days} days`;
};

// Class methods
DataPlan.findActive = function() {
  return this.findAll({ 
    where: { isActive: true },
    order: [['sortOrder', 'ASC'], ['price', 'ASC']]
  });
};

DataPlan.findByCategory = function(category) {
  return this.findAll({ 
    where: { category, isActive: true },
    order: [['sortOrder', 'ASC'], ['price', 'ASC']]
  });
};

DataPlan.findByType = function(planType) {
  return this.findAll({ 
    where: { planType, isActive: true },
    order: [['sortOrder', 'ASC'], ['price', 'ASC']]
  });
};

DataPlan.findPopular = function() {
  return this.findAll({ 
    where: { isPopular: true, isActive: true },
    order: [['sortOrder', 'ASC'], ['price', 'ASC']]
  });
};

module.exports = DataPlan;

