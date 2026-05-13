const { Subscription, DataPlan, User, Payment } = require('../models');
const { Op } = require('sequelize');
const { SubscriptionStatus } = require('../config/constants');

function getPlanDurationDays(plan) {
  if (!plan) return 30;
  if (Number.isFinite(plan.durationDays)) return plan.durationDays;

  // Common repo inconsistency: validityPeriod is sometimes a number of days, sometimes a string.
  const vp = plan.validityPeriod;
  const numeric = Number(vp);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  const s = String(vp || '').toLowerCase();
  if (s === 'daily') return 1;
  if (s === 'weekly') return 7;
  if (s === 'monthly') return 30;
  if (s === 'yearly') return 365;
  return 30;
}

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
          attributes: ['status', 'paymentMethod'],
          limit: 1,
          order: [['created_at', 'DESC']]
        }
      ],
      order: [['created_at', 'DESC']],
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
          paymentStatus:
            subscription.payments?.[0]?.paymentMethod === 'cash' &&
            subscription.payments?.[0]?.status === 'completed'
              ? 'cash'
              : (subscription.payments?.[0]?.status || 'pending')
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
          attributes: ['status', 'paymentMethod'],
          limit: 1,
          order: [['created_at', 'DESC']]
        }
      ],
      order: [['created_at', 'DESC']]
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
          paymentStatus:
            subscription.payments?.[0]?.paymentMethod === 'cash' &&
            subscription.payments?.[0]?.status === 'completed'
              ? 'cash'
              : (subscription.payments?.[0]?.status || 'pending')
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

    const whereClause = { id };
    if (req.user && req.user.role !== 'admin') {
      whereClause.userId = userId;
    }

    const subscription = await Subscription.findOne({
      where: whereClause,
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
      planId,
      userId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause (Subscription FK column is planId)
    const whereClause = {};
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;
    const filterPlanId = planId || dataPlanId;
    if (filterPlanId) whereClause.planId = filterPlanId;

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Map client sort keys to actual DB columns used by this model/table
    const sortFieldMap = {
      createdAt: 'created_at',
      startDate: 'start_date',
      endDate: 'end_date',
      status: 'status',
      dataUsed: 'data_used'
    };
    const sortField = sortFieldMap[sortBy] || sortFieldMap.createdAt;
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
          DataPlan: subscription.plan,
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

/**
 * Admin: change a subscription plan
 * PATCH /admin/subscriptions/:id/plan
 * Body: { planId: string, resetDates: boolean, resetData: boolean }
 */
const changePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, resetDates = true, resetData = false } = req.body || {};

    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId is required' });
    }

    const subscription = await Subscription.findByPk(id, {
      include: [{ model: DataPlan, as: 'plan' }, { model: User, as: 'User', attributes: { exclude: ['password'] } }]
    });
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      return res.status(400).json({ success: false, message: 'Cannot change plan for a cancelled subscription' });
    }

    const newPlan = await DataPlan.findByPk(planId);
    if (!newPlan) return res.status(404).json({ success: false, message: 'Data plan not found' });

    subscription.planId = newPlan.id;

    if (resetDates) {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + getPlanDurationDays(newPlan));
      subscription.startDate = startDate;
      subscription.endDate = endDate;
    }

    if (resetData) {
      subscription.dataUsed = 0;
      subscription.dataRemaining = newPlan.dataLimit;
    }

    await subscription.save();
    await subscription.reload({
      include: [{ model: DataPlan, as: 'plan' }, { model: User, as: 'User', attributes: { exclude: ['password'] } }]
    });

    return res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: {
        subscription: {
          ...subscription.toJSON(),
          DataPlan: subscription.plan,
        }
      }
    });
  } catch (error) {
    console.error('Change subscription plan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Admin: extend a subscription end date (and optionally add data)
 * PATCH /admin/subscriptions/:id/extend
 * Body: { days: number, addDataMB?: number }
 */
const extendSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { days, addDataMB } = req.body || {};

    const addDays = Number(days);
    if (!Number.isFinite(addDays) || addDays < 1) {
      return res.status(400).json({ success: false, message: 'days must be a positive number' });
    }

    const subscription = await Subscription.findByPk(id, {
      include: [{ model: DataPlan, as: 'plan' }, { model: User, as: 'User', attributes: { exclude: ['password'] } }]
    });
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const base = subscription.endDate ? new Date(subscription.endDate) : new Date();
    const newEnd = new Date(base);
    newEnd.setDate(newEnd.getDate() + addDays);
    subscription.endDate = newEnd;

    const dataToAdd = addDataMB === undefined ? null : Number(addDataMB);
    if (dataToAdd !== null) {
      if (!Number.isFinite(dataToAdd) || dataToAdd < 0) {
        return res.status(400).json({ success: false, message: 'addDataMB must be a non-negative number' });
      }
      // Subscription model tracks "dataRemaining" and "dataUsed" (no dataLimit column).
      subscription.dataRemaining = (Number(subscription.dataRemaining) || 0) + dataToAdd;
    }

    if (subscription.status === SubscriptionStatus.EXPIRED) {
      subscription.status = SubscriptionStatus.ACTIVE;
    }

    await subscription.save();
    await subscription.reload({
      include: [{ model: DataPlan, as: 'plan' }, { model: User, as: 'User', attributes: { exclude: ['password'] } }]
    });

    return res.json({
      success: true,
      message: 'Subscription extended successfully',
      data: {
        subscription: {
          ...subscription.toJSON(),
          DataPlan: subscription.plan,
        }
      }
    });
  } catch (error) {
    console.error('Extend subscription error:', error);
    return res.status(500).json({
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
  getAllSubscriptions,
  changePlan,
  extendSubscription
};

