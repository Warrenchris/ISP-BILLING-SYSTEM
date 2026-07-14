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
  },
  // Phase 2: Bandwidth profile for RADIUS Mikrotik-Rate-Limit
  uploadSpeedKbps: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Upload speed in Kbps for RADIUS rate limiting',
  },
  downloadSpeedKbps: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Download speed in Kbps for RADIUS rate limiting',
  },
  burstUploadKbps: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Burst upload speed (optional)',
  },
  burstDownloadKbps: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Burst download speed (optional)',
  },
  sessionTimeoutSeconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'RADIUS Session-Timeout. NULL = use plan validity period',
  },
}, {
  tableName: 'data_plans',
  underscored: true,
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

/**
 * Generate the Mikrotik-Rate-Limit RADIUS attribute string.
 * Format: {rx-rate}k/{tx-rate}k [{rx-burst}k/{tx-burst}k]
 * rx = download (from client perspective), tx = upload
 *
 * @returns {string|null} Rate limit string, or null if no bandwidth profile set
 */
DataPlan.prototype.toMikrotikRateLimit = function () {
  if (!this.downloadSpeedKbps || !this.uploadSpeedKbps) return null;

  let rateLimit = `${this.downloadSpeedKbps}k/${this.uploadSpeedKbps}k`;

  // Add burst if configured
  if (this.burstDownloadKbps && this.burstUploadKbps) {
    rateLimit += ` ${this.burstDownloadKbps}k/${this.burstUploadKbps}k`;
    // Threshold = normal speed (burst kicks in above threshold)
    rateLimit += ` ${this.downloadSpeedKbps}k/${this.uploadSpeedKbps}k`;
    // Burst time / priority
    rateLimit += ` 16/16 8`;
  }

  return rateLimit;
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

