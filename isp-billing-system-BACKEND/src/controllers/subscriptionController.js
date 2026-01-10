const { Subscription, DataPlan, User, Payment } = require('../models');
const { Op } = require('sequelize');
const { SubscriptionStatus } = require('../config/constants');

/**
 * Create new subscription
 */
const createSubscription = async (req, res) => {
  try {
    const { planId, autoRenew } = req.body;
    const userId = req.userId;

    // Check if data plan exists and is active
    const dataPlan = await DataPlan.findByPk(planId);
    if (!dataPlan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found'
      });
    }

    if (!dataPlan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Data plan is not active'
      });
    }

    // Check if user has any active subscriptions
    const activeSubscription = await Subscription.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE
      }
    });

    if (activeSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription. Please cancel or wait for it to expire before subscribing to a new plan.'
      });
    }

    // Calculate end date based on validity period
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + dataPlan.validityPeriod);

    // Generate unique subscription number
    const subscriptionNumber = 'SUB' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();

    // Create subscription
    const subscription = await Subscription.create({
      userId,
      planId,
      subscriptionNumber,
      startDate,
      endDate,
      dataRemaining: dataPlan.dataLimit,
      autoRenew: autoRenew || false,
      status: SubscriptionStatus.PENDING
    });

    // Load related data
    await subscription.reload({
      include: [
        { model: DataPlan, as: 'plan' },
        { model: User, as: 'User', attributes: { exclude: ['password'] } }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscription: {
          ...subscription.toJSON(),
          daysRemaining: subscription.getDaysRemaining(),
          dataUsagePercentage: subscription.getDataUsagePercentage(),
          formattedDataUsed: subscription.getFormattedDataUsed(),
          formattedDataRemaining: subscription.getFormattedDataRemaining(),
          DataPlan: {
            ...subscription.plan.toJSON(),
            formattedPrice: subscription.plan.getFormattedPrice(),
            formattedDataLimit: subscription.plan.getFormattedDataLimit(),
            validityText: subscription.plan.getValidityText()
          }
        }
      }
    });

  } catch (error) {
    console.error('Create subscription error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's subscriptions
 */
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    // Build where clause
    const whereClause = { userId };
    if (status) {
      whereClause.status = status;
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: subscriptions } = await Subscription.findAndCountAll({
      where: whereClause,
      include: [
        { model: DataPlan, as: 'plan' },
        {
          model: Payment,
          as: 'payments',
          attributes: ['status'],
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.status(200).json({
      success: true,
      message: 'Subscriptions retrieved successfully',
      data: {
        subscriptions: subscriptions.map(subscription => ({
          ...subscription.toJSON(),
          daysRemaining: subscription.getDaysRemaining(),
          dataUsagePercentage: subscription.getDataUsagePercentage(),
          formattedDataUsed: subscription.getFormattedDataUsed(),
          formattedDataRemaining: subscription.getFormattedDataRemaining(),
          isActive: subscription.isActive(),
          isExpired: subscription.isExpired(),
          DataPlan: {
            ...subscription.plan.toJSON(),
            formattedPrice: subscription.plan.getFormattedPrice(),
            formattedDataLimit: subscription.plan.getFormattedDataLimit(),
            validityText: subscription.plan.getValidityText()
          },
          paymentStatus: subscription.payments?.[0]?.status || 'pending'
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('Get user subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current active subscription
 */
/**
 * Get current active subscription
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.params.userId || req.userId;

    const subscription = await Subscription.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE
      },
      include: [
        { model: DataPlan, as: 'plan' },
        {
          model: Payment,
          as: 'payments',
          attributes: ['status'],
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!subscription) {
      return res.status(200).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Current subscription retrieved successfully',
      data: {
        subscription: {
          ...subscription.toJSON(),
          daysRemaining: subscription.getDaysRemaining(),
          dataUsagePercentage: subscription.getDataUsagePercentage(),
          formattedDataUsed: subscription.getFormattedDataUsed(),
          formattedDataRemaining: subscription.getFormattedDataRemaining(),
          isActive: subscription.isActive(),
          isExpired: subscription.isExpired(),
          DataPlan: {
            ...subscription.plan.toJSON(),
            formattedPrice: subscription.plan.getFormattedPrice(),
            formattedDataLimit: subscription.plan.getFormattedDataLimit(),
            validityText: subscription.plan.getValidityText()
          },
          paymentStatus: subscription.payments?.[0]?.status || 'pending'
        }
      }
    });

  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * Update subscription
 */
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { autoRenew, notes } = req.body;

    const subscription = await Subscription.findOne({
      where: { id, userId },
      include: [{ model: DataPlan, as: 'plan' }]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const updateData = {};
    if (autoRenew !== undefined) updateData.autoRenew = autoRenew;
    if (notes !== undefined) updateData.notes = notes;

    await subscription.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: {
        subscription: {
          ...subscription.toJSON(),
          daysRemaining: subscription.getDaysRemaining(),
          dataUsagePercentage: subscription.getDataUsagePercentage(),
          formattedDataUsed: subscription.getFormattedDataUsed(),
          formattedDataRemaining: subscription.getFormattedDataRemaining(),
          DataPlan: {
            ...subscription.plan.toJSON(),
            formattedPrice: subscription.plan.getFormattedPrice(),
            formattedDataLimit: subscription.plan.getFormattedDataLimit(),
            validityText: subscription.plan.getValidityText()
          }
        }
      }
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { reason } = req.body;

    const subscription = await Subscription.findOne({
      where: { id, userId },
      include: [{ model: DataPlan, as: 'plan' }]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled'
      });
    }

    await subscription.update({
      status: SubscriptionStatus.CANCELLED,
      cancellationReason: reason || 'User requested cancellation',
      cancelledAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        subscription: {
          ...subscription.toJSON(),
          DataPlan: {
            ...subscription.plan.toJSON(),
            formattedPrice: subscription.plan.getFormattedPrice(),
            formattedDataLimit: subscription.plan.getFormattedDataLimit(),
            validityText: subscription.plan.getValidityText()
          }
        }
      }
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update data usage (Internal use - for data tracking system)
 */
const updateDataUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const { dataUsedMB } = req.body;

    const subscription = await Subscription.findByPk(id, {
      include: [{ model: DataPlan, as: 'plan' }]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update data usage for inactive subscription'
      });
    }

    await subscription.updateDataUsage(dataUsedMB);

    res.status(200).json({
      success: true,
      message: 'Data usage updated successfully',
      data: {
        subscription: {
          ...subscription.toJSON(),
          daysRemaining: subscription.getDaysRemaining(),
          dataUsagePercentage: subscription.getDataUsagePercentage(),
          formattedDataUsed: subscription.getFormattedDataUsed(),
          formattedDataRemaining: subscription.getFormattedDataRemaining()
        }
      }
    });

  } catch (error) {
    console.error('Update data usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all subscriptions (Admin only)
 */
const getAllSubscriptions = async (req, res) => {
  try {
    const {
      status,
      dataPlanId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const whereClause = {};
    if (status) whereClause.status = status;
    if (dataPlanId) whereClause.dataPlanId = dataPlanId;

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Valid sort fields
    const validSortFields = ['createdAt', 'startDate', 'endDate', 'status', 'dataUsed'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const { count, rows: subscriptions } = await Subscription.findAndCountAll({
      where: whereClause,
      include: [
        { model: DataPlan, as: 'plan' },
        { model: User, as: 'User', attributes: { exclude: ['password'] } }
      ],
      order: [[sortField, sortDirection]],
      limit: parseInt(limit),
      offset: offset
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.status(200).json({
      success: true,
      message: 'All subscriptions retrieved successfully',
      data: {
        subscriptions: subscriptions.map(subscription => ({
          ...subscription.toJSON(),
          daysRemaining: subscription.getDaysRemaining(),
          dataUsagePercentage: subscription.getDataUsagePercentage(),
          formattedDataUsed: subscription.getFormattedDataUsed(),
          formattedDataRemaining: subscription.getFormattedDataRemaining(),
          isActive: subscription.isActive(),
          isExpired: subscription.isExpired()
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createSubscription,
  getUserSubscriptions,
  getCurrentSubscription,
  updateSubscription,
  cancelSubscription,
  updateDataUsage,
  getAllSubscriptions
};

