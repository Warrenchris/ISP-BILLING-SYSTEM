const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { DataUsageStatus } = require('../config/constants');

const DataUsage = sequelize.define('DataUsage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  subscriptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'subscriptions',
      key: 'id'
    }
  },
  sessionId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Unique session identifier for tracking individual usage sessions'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the data usage session started'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the data usage session ended (null for active sessions)'
  },
  bytesDownloaded: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total bytes downloaded in this session'
  },
  bytesUploaded: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total bytes uploaded in this session'
  },
  totalBytes: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total bytes used (download + upload)'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address assigned during this session'
  },
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Device information (user agent, device type, etc.)'
  },
  location: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Geographic location data if available'
  },
  connectionType: {
    type: DataTypes.ENUM('wifi', '4g', '3g', '2g', 'fiber', 'unknown'),
    allowNull: false,
    defaultValue: 'unknown',
    comment: 'Type of connection used'
  },
  quality: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Connection quality metrics (speed, latency, etc.)'
  },
  status: {
    type: DataTypes.ENUM(
      DataUsageStatus.ACTIVE,
      DataUsageStatus.COMPLETED,
      DataUsageStatus.TERMINATED,
      DataUsageStatus.ERROR
    ),
    allowNull: false,
    defaultValue: DataUsageStatus.ACTIVE,
    comment: 'Current status of the usage session'
  },
  terminationReason: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reason for session termination (if applicable)'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata for the usage session'
  }
}, {
  tableName: 'data_usage',
  timestamps: true
});

// Instance methods
DataUsage.prototype.getDurationMinutes = function () {
  if (!this.endTime) {
    return Math.floor((new Date() - this.startTime) / (1000 * 60));
  }
  return Math.floor((this.endTime - this.startTime) / (1000 * 60));
};

DataUsage.prototype.getFormattedDataUsage = function () {
  const totalMB = this.totalBytes / (1024 * 1024);
  if (totalMB < 1024) {
    return `${totalMB.toFixed(2)} MB`;
  }
  const totalGB = totalMB / 1024;
  return `${totalGB.toFixed(2)} GB`;
};

DataUsage.prototype.getAverageSpeed = function () {
  const durationMinutes = this.getDurationMinutes();
  if (durationMinutes === 0) return 0;

  const totalMB = this.totalBytes / (1024 * 1024);
  return (totalMB / durationMinutes).toFixed(2); // MB per minute
};

DataUsage.prototype.endSession = async function (reason = 'completed') {
  this.endTime = new Date();
  this.status = DataUsageStatus.COMPLETED;
  this.terminationReason = reason;
  await this.save();
  return this;
};

// Static methods
DataUsage.getTotalUsageForUser = async function (userId, startDate = null, endDate = null) {
  const whereClause = { userId };

  if (startDate && endDate) {
    whereClause.startTime = {
      [require('sequelize').Op.between]: [startDate, endDate]
    };
  }

  const result = await this.findAll({
    where: whereClause,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('totalBytes')), 'totalBytes'],
      [sequelize.fn('SUM', sequelize.col('bytesDownloaded')), 'totalDownloaded'],
      [sequelize.fn('SUM', sequelize.col('bytesUploaded')), 'totalUploaded'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'sessionCount']
    ],
    raw: true
  });

  return result[0];
};

DataUsage.getUsageBySubscription = async function (subscriptionId, startDate = null, endDate = null) {
  const whereClause = { subscriptionId };

  if (startDate && endDate) {
    whereClause.startTime = {
      [require('sequelize').Op.between]: [startDate, endDate]
    };
  }

  return await this.findAll({
    where: whereClause,
    order: [['startTime', 'DESC']],
    limit: 100
  });
};

DataUsage.getActiveSessionsCount = async function () {
  return await this.count({
    where: {
      status: DataUsageStatus.ACTIVE
    }
  });
};

module.exports = DataUsage;


