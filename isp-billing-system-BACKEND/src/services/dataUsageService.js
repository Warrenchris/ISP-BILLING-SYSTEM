const { DataUsage, Subscription, User, DataPlan } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

class DataUsageService {
  /**
   * Start a new data usage session
   */
  static async startSession(userId, subscriptionId, sessionData = {}) {
    try {
      // Verify subscription belongs to user
      const subscription = await Subscription.findOne({
        where: {
          id: subscriptionId,
          userId: userId,
          status: 'active'
        }
      });

      if (!subscription) {
        throw new Error('Active subscription not found');
      }

      // Generate unique session ID
      const sessionId = `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create new usage session
      const usageSession = await DataUsage.create({
        userId,
        subscriptionId,
        sessionId,
        startTime: new Date(),
        ipAddress: sessionData.ipAddress,
        deviceInfo: sessionData.deviceInfo,
        location: sessionData.location,
        connectionType: sessionData.connectionType || 'unknown',
        quality: sessionData.quality,
        status: 'active',
        metadata: sessionData.metadata
      });

      return usageSession;
    } catch (error) {
      console.error('Error starting data usage session:', error);
      throw error;
    }
  }

  /**
   * Update data usage for an active session
   */
  static async updateUsage(sessionId, usageData) {
    try {
      const session = await DataUsage.findOne({
        where: {
          sessionId,
          status: 'active'
        }
      });

      if (!session) {
        throw new Error('Active session not found');
      }

      // Update usage data
      const bytesDownloaded = parseInt(usageData.bytesDownloaded) || 0;
      const bytesUploaded = parseInt(usageData.bytesUploaded) || 0;
      const totalBytes = bytesDownloaded + bytesUploaded;

      await session.update({
        bytesDownloaded: session.bytesDownloaded + bytesDownloaded,
        bytesUploaded: session.bytesUploaded + bytesUploaded,
        totalBytes: session.totalBytes + totalBytes,
        quality: usageData.quality || session.quality,
        metadata: { ...session.metadata, ...usageData.metadata }
      });

      // Update subscription data remaining
      await this.updateSubscriptionUsage(session.subscriptionId, totalBytes);

      return session;
    } catch (error) {
      console.error('Error updating data usage:', error);
      throw error;
    }
  }

  /**
   * End a data usage session
   */
  static async endSession(sessionId, reason = 'completed') {
    try {
      const session = await DataUsage.findOne({
        where: {
          sessionId,
          status: 'active'
        }
      });

      if (!session) {
        throw new Error('Active session not found');
      }

      await session.endSession(reason);
      return session;
    } catch (error) {
      console.error('Error ending data usage session:', error);
      throw error;
    }
  }

  /**
   * Update subscription data remaining
   */
  static async updateSubscriptionUsage(subscriptionId, bytesUsed) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const megabytesUsed = Math.ceil(bytesUsed / (1024 * 1024));
      const newDataRemaining = Math.max(0, subscription.dataRemaining - megabytesUsed);

      await subscription.update({
        dataUsed: subscription.dataUsed + megabytesUsed,
        dataRemaining: newDataRemaining
      });

      // Check if data limit exceeded
      if (newDataRemaining === 0) {
        await this.handleDataLimitExceeded(subscription);
      }

      return subscription;
    } catch (error) {
      console.error('Error updating subscription usage:', error);
      throw error;
    }
  }

  /**
   * Handle data limit exceeded
   */
  static async handleDataLimitExceeded(subscription) {
    try {
      // Terminate all active sessions for this subscription
      await DataUsage.update(
        {
          status: 'terminated',
          endTime: new Date(),
          terminationReason: 'data_limit_exceeded'
        },
        {
          where: {
            subscriptionId: subscription.id,
            status: 'active'
          }
        }
      );

      // Update subscription status if needed
      if (!subscription.autoRenew) {
        await subscription.update({ status: 'expired' });
      }

      console.log(`Data limit exceeded for subscription ${subscription.subscriptionNumber}`);
    } catch (error) {
      console.error('Error handling data limit exceeded:', error);
      throw error;
    }
  }

  /**
   * Get user's current data usage
   */
  static async getCurrentUsage(userId, subscriptionId = null) {
    try {
      const whereClause = { userId };
      if (subscriptionId) {
        whereClause.subscriptionId = subscriptionId;
      }

      // Get today's usage
      const todayStart = moment().startOf('day').toDate();
      const todayEnd = moment().endOf('day').toDate();

      const todayUsage = await DataUsage.findAll({
        where: {
          ...whereClause,
          startTime: {
            [Op.between]: [todayStart, todayEnd]
          }
        },
        attributes: [
          [DataUsage.sequelize.fn('SUM', DataUsage.sequelize.col('totalBytes')), 'totalBytes'],
          [DataUsage.sequelize.fn('SUM', DataUsage.sequelize.col('bytesDownloaded')), 'totalDownloaded'],
          [DataUsage.sequelize.fn('SUM', DataUsage.sequelize.col('bytesUploaded')), 'totalUploaded'],
          [DataUsage.sequelize.fn('COUNT', DataUsage.sequelize.col('id')), 'sessionCount']
        ],
        raw: true
      });

      // Get this month's usage
      const monthStart = moment().startOf('month').toDate();
      const monthEnd = moment().endOf('month').toDate();

      const monthUsage = await DataUsage.findAll({
        where: {
          ...whereClause,
          startTime: {
            [Op.between]: [monthStart, monthEnd]
          }
        },
        attributes: [
          [DataUsage.sequelize.fn('SUM', DataUsage.sequelize.col('totalBytes')), 'totalBytes'],
          [DataUsage.sequelize.fn('COUNT', DataUsage.sequelize.col('id')), 'sessionCount']
        ],
        raw: true
      });

      // Get active sessions
      const activeSessions = await DataUsage.findAll({
        where: {
          ...whereClause,
          status: 'active'
        },
        include: [
          { model: Subscription, as: 'Subscription', include: [{ model: DataPlan, as: 'DataPlan' }] }
        ]
      });

      return {
        today: {
          totalBytes: parseInt(todayUsage[0].totalBytes) || 0,
          totalDownloaded: parseInt(todayUsage[0].totalDownloaded) || 0,
          totalUploaded: parseInt(todayUsage[0].totalUploaded) || 0,
          sessionCount: parseInt(todayUsage[0].sessionCount) || 0,
          formattedTotal: this.formatBytes(parseInt(todayUsage[0].totalBytes) || 0)
        },
        thisMonth: {
          totalBytes: parseInt(monthUsage[0].totalBytes) || 0,
          sessionCount: parseInt(monthUsage[0].sessionCount) || 0,
          formattedTotal: this.formatBytes(parseInt(monthUsage[0].totalBytes) || 0)
        },
        activeSessions: activeSessions.map(session => ({
          sessionId: session.sessionId,
          startTime: session.startTime,
          duration: session.getDurationMinutes(),
          totalBytes: session.totalBytes,
          formattedUsage: session.getFormattedDataUsage(),
          connectionType: session.connectionType,
          subscription: session.Subscription ? {
            subscriptionNumber: session.Subscription.subscriptionNumber,
            dataRemaining: session.Subscription.dataRemaining,
            planName: session.Subscription.DataPlan?.name
          } : null
        }))
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      throw error;
    }
  }

  /**
   * Get usage analytics for a user
   */
  static async getUsageAnalytics(userId, period = '30days') {
    try {
      let startDate, endDate;
      
      switch (period) {
        case '24hours':
          startDate = moment().subtract(24, 'hours').toDate();
          endDate = new Date();
          break;
        case '7days':
          startDate = moment().subtract(7, 'days').toDate();
          endDate = new Date();
          break;
        case '30days':
          startDate = moment().subtract(30, 'days').toDate();
          endDate = new Date();
          break;
        case 'thisMonth':
          startDate = moment().startOf('month').toDate();
          endDate = moment().endOf('month').toDate();
          break;
        default:
          startDate = moment().subtract(30, 'days').toDate();
          endDate = new Date();
      }

      // Daily usage breakdown
      const dailyUsage = await DataUsage.findAll({
        where: {
          userId,
          startTime: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          [DataUsage.sequelize.fn('DATE', DataUsage.sequelize.col('startTime')), 'date'],
          [DataUsage.sequelize.fn('SUM', DataUsage.sequelize.col('totalBytes')), 'totalBytes'],
          [DataUsage.sequelize.fn('COUNT', DataUsage.sequelize.col('id')), 'sessionCount']
        ],
        group: [DataUsage.sequelize.fn('DATE', DataUsage.sequelize.col('startTime'))],
        order: [[DataUsage.sequelize.fn('DATE', DataUsage.sequelize.col('startTime')), 'ASC']],
        raw: true
      });

      // Connection type breakdown
      const connectionTypes = await DataUsage.findAll({
        where: {
          userId,
          startTime: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          'connectionType',
          [DataUsage.sequelize.fn('SUM', DataUsage.sequelize.col('totalBytes')), 'totalBytes'],
          [DataUsage.sequelize.fn('COUNT', DataUsage.sequelize.col('id')), 'sessionCount']
        ],
        group: ['connectionType'],
        raw: true
      });

      // Peak usage hours
      const hourlyUsage = await DataUsage.findAll({
        where: {
          userId,
          startTime: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          [DataUsage.sequelize.fn('HOUR', DataUsage.sequelize.col('startTime')), 'hour'],
          [DataUsage.sequelize.fn('SUM', DataUsage.sequelize.col('totalBytes')), 'totalBytes']
        ],
        group: [DataUsage.sequelize.fn('HOUR', DataUsage.sequelize.col('startTime'))],
        order: [[DataUsage.sequelize.fn('SUM', DataUsage.sequelize.col('totalBytes')), 'DESC']],
        raw: true
      });

      return {
        period,
        startDate,
        endDate,
        dailyUsage: dailyUsage.map(day => ({
          date: day.date,
          totalBytes: parseInt(day.totalBytes),
          formattedTotal: this.formatBytes(parseInt(day.totalBytes)),
          sessionCount: parseInt(day.sessionCount)
        })),
        connectionTypes: connectionTypes.map(type => ({
          type: type.connectionType,
          totalBytes: parseInt(type.totalBytes),
          formattedTotal: this.formatBytes(parseInt(type.totalBytes)),
          sessionCount: parseInt(type.sessionCount)
        })),
        peakHours: hourlyUsage.slice(0, 5).map(hour => ({
          hour: parseInt(hour.hour),
          totalBytes: parseInt(hour.totalBytes),
          formattedTotal: this.formatBytes(parseInt(hour.totalBytes))
        }))
      };
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable format
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get system-wide usage statistics (Admin only)
   */
  static async getSystemStats(period = '24hours') {
    try {
      let startDate;
      
      switch (period) {
        case '24hours':
          startDate = moment().subtract(24, 'hours').toDate();
          break;
        case '7days':
          startDate = moment().subtract(7, 'days').toDate();
          break;
        case '30days':
          startDate = moment().subtract(30, 'days').toDate();
          break;
        default:
          startDate = moment().subtract(24, 'hours').toDate();
      }

      const stats = await DataUsage.findAll({
        where: {
          startTime: {
            [Op.gte]: startDate
          }
        },
        attributes: [
          [DataUsage.sequelize.fn('SUM', DataUsage.sequelize.col('totalBytes')), 'totalBytes'],
          [DataUsage.sequelize.fn('COUNT', DataUsage.sequelize.col('id')), 'totalSessions'],
          [DataUsage.sequelize.fn('COUNT', DataUsage.sequelize.fn('DISTINCT', DataUsage.sequelize.col('userId'))), 'activeUsers']
        ],
        raw: true
      });

      const activeSessionsCount = await DataUsage.count({
        where: { status: 'active' }
      });

      return {
        period,
        totalBytes: parseInt(stats[0].totalBytes) || 0,
        formattedTotal: this.formatBytes(parseInt(stats[0].totalBytes) || 0),
        totalSessions: parseInt(stats[0].totalSessions) || 0,
        activeUsers: parseInt(stats[0].activeUsers) || 0,
        currentActiveSessions: activeSessionsCount
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }
}

module.exports = DataUsageService;

