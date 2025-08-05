const { Subscription, DataPlan, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get current data usage for the authenticated user
 */
const getCurrentUsage = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user's current active subscription
    const subscription = await Subscription.findOne({
      where: {
        userId,
        status: 'active'
      },
      include: [{
        model: DataPlan,
        as: 'DataPlan'
      }],
      order: [['createdAt', 'DESC']]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Calculate usage data
    const dataLimit = subscription.DataPlan?.dataLimit || 0;
    const dataRemaining = subscription.dataRemaining || 0;
    const dataUsed = Math.max(0, dataLimit - dataRemaining);
    const usagePercentage = dataLimit > 0 ? Math.min((dataUsed / dataLimit) * 100, 100) : 0;

    // Format data sizes
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const usageData = {
      subscription: {
        id: subscription.id,
        planName: subscription.DataPlan?.name,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      },
      usage: {
        dataLimit,
        dataUsed,
        dataRemaining,
        usagePercentage: Math.round(usagePercentage * 100) / 100,
        formattedDataLimit: formatBytes(dataLimit),
        formattedDataUsed: formatBytes(dataUsed),
        formattedDataRemaining: formatBytes(dataRemaining)
      },
      alerts: []
    };

    // Add usage alerts
    if (usagePercentage >= 90) {
      usageData.alerts.push({
        type: 'critical',
        message: 'You have used 90% or more of your data allowance'
      });
    } else if (usagePercentage >= 75) {
      usageData.alerts.push({
        type: 'warning',
        message: 'You have used 75% or more of your data allowance'
      });
    }

    // Check if subscription is expiring soon
    const daysUntilExpiry = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
      usageData.alerts.push({
        type: 'info',
        message: `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Current usage retrieved successfully',
      data: usageData
    });

  } catch (error) {
    console.error('Get current usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get usage history for the authenticated user
 */
const getUsageHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      period = '30d',
      page = 1,
      limit = 10
    } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user's subscriptions within the period
    const subscriptions = await Subscription.findAll({
      where: {
        userId,
        createdAt: {
          [Op.gte]: startDate
        }
      },
      include: [{
        model: DataPlan,
        as: 'DataPlan'
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Generate mock usage history data for demonstration
    const generateUsageHistory = (subscription) => {
      const days = [];
      const subscriptionStart = new Date(subscription.startDate);
      const subscriptionEnd = new Date(subscription.endDate);
      const currentDate = new Date();
      
      // Generate daily usage data
      for (let d = new Date(Math.max(subscriptionStart, startDate)); d <= Math.min(subscriptionEnd, currentDate); d.setDate(d.getDate() + 1)) {
        const dayUsage = Math.random() * 500 + 100; // Random usage between 100-600 MB
        days.push({
          date: new Date(d).toISOString().split('T')[0],
          usage: Math.round(dayUsage * 1024 * 1024), // Convert to bytes
          formattedUsage: `${Math.round(dayUsage)} MB`
        });
      }
      
      return days;
    };

    const historyData = subscriptions.map(subscription => ({
      subscription: {
        id: subscription.id,
        planName: subscription.DataPlan?.name,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      },
      dailyUsage: generateUsageHistory(subscription)
    }));

    res.status(200).json({
      success: true,
      message: 'Usage history retrieved successfully',
      data: {
        period,
        history: historyData,
        pagination: {
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit),
          totalItems: subscriptions.length
        }
      }
    });

  } catch (error) {
    console.error('Get usage history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get usage analytics for the authenticated user
 */
const getUsageAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    let days;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        days = 7;
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        days = 30;
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        days = 90;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        days = 7;
    }

    // Get current subscription
    const subscription = await Subscription.findOne({
      where: {
        userId,
        status: 'active'
      },
      include: [{
        model: DataPlan,
        as: 'DataPlan'
      }]
    });

    // Generate analytics data
    const generateAnalytics = () => {
      const analytics = {
        totalUsage: 0,
        averageDailyUsage: 0,
        peakUsageDay: null,
        usageTrend: 'stable', // 'increasing', 'decreasing', 'stable'
        dailyBreakdown: []
      };

      // Generate daily usage data
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const usage = Math.random() * 800 + 200; // Random usage between 200-1000 MB
        const usageBytes = Math.round(usage * 1024 * 1024);
        
        analytics.dailyBreakdown.push({
          date: date.toISOString().split('T')[0],
          usage: usageBytes,
          formattedUsage: `${Math.round(usage)} MB`
        });
        
        analytics.totalUsage += usageBytes;
      }

      analytics.averageDailyUsage = Math.round(analytics.totalUsage / days);
      
      // Find peak usage day
      const peakDay = analytics.dailyBreakdown.reduce((max, day) => 
        day.usage > max.usage ? day : max
      );
      analytics.peakUsageDay = peakDay;

      // Calculate trend (simplified)
      const firstHalf = analytics.dailyBreakdown.slice(0, Math.floor(days / 2));
      const secondHalf = analytics.dailyBreakdown.slice(Math.floor(days / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.usage, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.usage, 0) / secondHalf.length;
      
      if (secondHalfAvg > firstHalfAvg * 1.1) {
        analytics.usageTrend = 'increasing';
      } else if (secondHalfAvg < firstHalfAvg * 0.9) {
        analytics.usageTrend = 'decreasing';
      }

      return analytics;
    };

    const analytics = generateAnalytics();

    // Format data sizes
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const responseData = {
      period,
      subscription: subscription ? {
        id: subscription.id,
        planName: subscription.DataPlan?.name,
        dataLimit: subscription.DataPlan?.dataLimit,
        formattedDataLimit: formatBytes(subscription.DataPlan?.dataLimit || 0)
      } : null,
      analytics: {
        ...analytics,
        formattedTotalUsage: formatBytes(analytics.totalUsage),
        formattedAverageDailyUsage: formatBytes(analytics.averageDailyUsage)
      }
    };

    res.status(200).json({
      success: true,
      message: 'Usage analytics retrieved successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Get usage analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Start a new usage session (for future implementation)
 */
const startSession = async (req, res) => {
  try {
    // This would be implemented when actual usage tracking is needed
    res.status(501).json({
      success: false,
      message: 'Usage session tracking not implemented yet'
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update usage session (for future implementation)
 */
const updateSession = async (req, res) => {
  try {
    // This would be implemented when actual usage tracking is needed
    res.status(501).json({
      success: false,
      message: 'Usage session tracking not implemented yet'
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * End usage session (for future implementation)
 */
const endSession = async (req, res) => {
  try {
    // This would be implemented when actual usage tracking is needed
    res.status(501).json({
      success: false,
      message: 'Usage session tracking not implemented yet'
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getCurrentUsage,
  getUsageHistory,
  getUsageAnalytics,
  startSession,
  updateSession,
  endSession
};

