const DataUsageService = require('../services/dataUsageService');
const { DataUsage, Subscription, DataPlan } = require('../models');
const { Op } = require('sequelize');
const { DataUsageStatus } = require('../config/constants');

/**
 * Start a new data usage session
 */
const startSession = async (req, res) => {
  try {
    const { subscriptionId, deviceInfo, location, connectionType, quality, metadata } = req.body;
    const userId = req.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const sessionData = {
      ipAddress,
      deviceInfo,
      location,
      connectionType,
      quality,
      metadata
    };

    const session = await DataUsageService.startSession(userId, subscriptionId, sessionData);

    res.status(201).json({
      success: true,
      message: 'Data usage session started successfully',
      data: {
        session: {
          sessionId: session.sessionId,
          startTime: session.startTime,
          connectionType: session.connectionType,
          status: session.status
        }
      }
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to start data usage session',
      error: error.message
    });
  }
};

/**
 * Update data usage for an active session
 */
const updateUsage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { bytesDownloaded, bytesUploaded, quality, metadata } = req.body;

    const usageData = {
      bytesDownloaded: parseInt(bytesDownloaded) || 0,
      bytesUploaded: parseInt(bytesUploaded) || 0,
      quality,
      metadata
    };

    const session = await DataUsageService.updateUsage(sessionId, usageData);

    res.json({
      success: true,
      message: 'Data usage updated successfully',
      data: {
        session: {
          sessionId: session.sessionId,
          totalBytes: session.totalBytes,
          bytesDownloaded: session.bytesDownloaded,
          bytesUploaded: session.bytesUploaded,
          formattedUsage: session.getFormattedDataUsage(),
          duration: session.getDurationMinutes()
        }
      }
    });
  } catch (error) {
    console.error('Error updating usage:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update data usage',
      error: error.message
    });
  }
};

/**
 * End a data usage session
 */
const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    const session = await DataUsageService.endSession(sessionId, reason);

    res.json({
      success: true,
      message: 'Data usage session ended successfully',
      data: {
        session: {
          sessionId: session.sessionId,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.getDurationMinutes(),
          totalBytes: session.totalBytes,
          formattedUsage: session.getFormattedDataUsage(),
          status: session.status,
          terminationReason: session.terminationReason
        }
      }
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to end data usage session',
      error: error.message
    });
  }
};

/**
 * Get current data usage for user
 */
const getCurrentUsage = async (req, res) => {
  try {
    const userId = req.userId;
    const { subscriptionId } = req.query;

    const usage = await DataUsageService.getCurrentUsage(userId, subscriptionId);

    res.json({
      success: true,
      message: 'Current usage retrieved successfully',
      data: { usage }
    });
  } catch (error) {
    console.error('Error getting current usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve current usage',
      error: error.message
    });
  }
};

/**
 * Get usage analytics for user
 */
const getUsageAnalytics = async (req, res) => {
  try {
    const userId = req.userId;
    const { period } = req.query;

    const analytics = await DataUsageService.getUsageAnalytics(userId, period);

    res.json({
      success: true,
      message: 'Usage analytics retrieved successfully',
      data: { analytics }
    });
  } catch (error) {
    console.error('Error getting usage analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve usage analytics',
      error: error.message
    });
  }
};

/**
 * Get usage history for user
 */
const getUsageHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 20,
      subscriptionId,
      startDate,
      endDate,
      status
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { userId };

    if (subscriptionId) {
      whereClause.subscriptionId = subscriptionId;
    }

    if (startDate && endDate) {
      whereClause.startTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await DataUsage.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'Subscription',
          include: [{ model: DataPlan, as: 'DataPlan' }]
        }
      ],
      order: [['startTime', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const sessions = rows.map(session => ({
      sessionId: session.sessionId,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.getDurationMinutes(),
      totalBytes: session.totalBytes,
      bytesDownloaded: session.bytesDownloaded,
      bytesUploaded: session.bytesUploaded,
      formattedUsage: session.getFormattedDataUsage(),
      connectionType: session.connectionType,
      status: session.status,
      terminationReason: session.terminationReason,
      subscription: session.Subscription ? {
        subscriptionNumber: session.Subscription.subscriptionNumber,
        planName: session.Subscription.DataPlan?.name
      } : null
    }));

    res.json({
      success: true,
      message: 'Usage history retrieved successfully',
      data: {
        sessions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: page * limit < count,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting usage history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve usage history',
      error: error.message
    });
  }
};

/**
 * Get active sessions for user
 */
const getActiveSessions = async (req, res) => {
  try {
    const userId = req.userId;

    const sessions = await DataUsage.findAll({
      where: {
        userId,
        status: DataUsageStatus.ACTIVE
      },
      include: [
        {
          model: Subscription,
          as: 'Subscription',
          include: [{ model: DataPlan, as: 'DataPlan' }]
        }
      ],
      order: [['startTime', 'DESC']]
    });

    const activeSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      startTime: session.startTime,
      duration: session.getDurationMinutes(),
      totalBytes: session.totalBytes,
      formattedUsage: session.getFormattedDataUsage(),
      connectionType: session.connectionType,
      ipAddress: session.ipAddress,
      deviceInfo: session.deviceInfo,
      subscription: session.Subscription ? {
        subscriptionNumber: session.Subscription.subscriptionNumber,
        dataRemaining: session.Subscription.dataRemaining,
        planName: session.Subscription.DataPlan?.name
      } : null
    }));

    res.json({
      success: true,
      message: 'Active sessions retrieved successfully',
      data: { sessions: activeSessions }
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active sessions',
      error: error.message
    });
  }
};

/**
 * Get system-wide usage statistics (Admin only)
 */
const getSystemStats = async (req, res) => {
  try {
    const { period } = req.query;

    const stats = await DataUsageService.getSystemStats(period);

    res.json({
      success: true,
      message: 'System statistics retrieved successfully',
      data: { stats }
    });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system statistics',
      error: error.message
    });
  }
};

/**
 * Terminate session (Admin only)
 */
const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    const session = await DataUsage.findOne({
      where: { sessionId, status: DataUsageStatus.ACTIVE }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Active session not found'
      });
    }

    await session.update({
      status: DataUsageStatus.TERMINATED,
      endTime: new Date(),
      terminationReason: reason || 'admin_terminated'
    });

    res.json({
      success: true,
      message: 'Session terminated successfully',
      data: {
        session: {
          sessionId: session.sessionId,
          status: session.status,
          terminationReason: session.terminationReason
        }
      }
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate session',
      error: error.message
    });
  }
};

module.exports = {
  startSession,
  updateUsage,
  endSession,
  getCurrentUsage,
  getUsageAnalytics,
  getUsageHistory,
  getActiveSessions,
  getSystemStats,
  terminateSession
};

