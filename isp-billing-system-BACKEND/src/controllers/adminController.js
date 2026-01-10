/* src/controllers/adminController.js
* ADMIN – users + their current subscription
*/
const { Op } = require("sequelize");
const { User,
  Subscription,
  DataPlan } = require("../models");
const { UserRole, SubscriptionStatus, PaymentStatus } = require('../config/constants');
const bcrypt = require("bcryptjs");



/* helper ─────────────────────────────────────────────── */
const now = () => new Date();
const days = (end) => Math.max(Math.ceil((new Date(end) - now()) / 8.64e7), 0);
const hash = (pw) => bcrypt.hash(pw, Number(process.env.BCRYPT_ROUNDS) || 12);
const MIN_LEN = 8; // Minimum password length

/* GET /api/admin/users?search=&page=&limit= */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 25 } = req.query;

    const where = search
      ? {
        [Op.or]: [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phoneNumber: { [Op.like]: `%${search}%` } },
        ],
      }
      : {};

    const { rows, count } = await User.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit: Number(limit),
      order: [["created_at", "DESC"]],
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Subscription,
          as: "activeSubscription",
          where: {
            status: SubscriptionStatus.ACTIVE,
            startDate: { [Op.lte]: now() },
            endDate: { [Op.gte]: now() },
            cancelledAt: null,
            suspendedAt: null,
          },
          required: false,
          include: [
            {
              model: DataPlan,
              as: "plan",
              attributes: ["id", "name", "dataLimit", "price", "validityPeriod"], // Ensure these are included
            },
          ],
        },
      ],
    });

    /* decorate with daysRemaining on the fly */
    const users = rows.map((u) => {
      const json = u.toJSON();
      if (json.activeSubscription) {
        json.activeSubscription.daysRemaining = days(json.activeSubscription.endDate);
        // Ensure plan data is properly attached
        if (!json.activeSubscription.DataPlan && json.activeSubscription.plan) {
          json.activeSubscription.DataPlan = json.activeSubscription.plan;
        }
      }
      return json;
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: { page: Number(page), limit: Number(limit), total: count },
      },
    });
  } catch (err) { next(err); }
};
/* PATCH /api/admin/subscriptions/:id
* body = { action: 'activate' | 'suspend' | 'cancel' }
*/
exports.patchSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;          // simple FSM
    const subscription = await Subscription.findByPk(id, { include: DataPlan });
    if (!subscription) return res.status(404).json({ success: false, message: "Not found" });

    switch (action) {
      case "activate": subscription.status = SubscriptionStatus.ACTIVE; break;
      case "suspend": subscription.status = SubscriptionStatus.SUSPENDED; break;
      case "cancel": subscription.status = SubscriptionStatus.CANCELLED; break;
      default:
        return res.status(400).json({ success: false, message: "Bad action" });
    }
    await subscription.save();
    res.json({ success: true, data: { subscription } });
  } catch (err) { next(err); }
};

/* … keep createUser / updateUser / deleteUser etc. unchanged … */

/*───────────────────────────────────────────────────────────*/
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

/*───────────────────────────────────────────────────────────*/
exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create({
      ...req.body,
      isActive: true,
      isVerified: true,
    })
    const { password, ...rest } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password required' });
    if (password || password.length < MIN_LEN)
      return res.status(400).json({
        sucess: false,
        message: `Password must be at least ${MIN_LEN} characters long`
      })

    const plain = user.get({ plain: true });
    delete plain.password;
    res.status(201).json({ success: true, data: { user: plain } });
  } catch (err) { next(err); }
};

/*───────────────────────────────────────────────────────────*/
exports.updateUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Verify UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        receivedId: id
      });
    }

    // Check user exists (including soft-deleted)
    const user = await User.findOne({
      where: { id },
      paranoid: false, // Include soft-deleted records
      attributes: ['id', 'email', 'deletedAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.deletedAt) {
      return res.status(410).json({
        success: false,
        message: 'User was deleted',
        deletedAt: user.deletedAt,
        code: 'USER_DELETED'
      });
    }

    // Prepare updates
    const allowedFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'routerIp', 'role', 'status'];
    const updates = Object.keys(req.body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    // Perform update
    const [affectedRows] = await User.update(updates, {
      where: { id },
      individualHooks: true
    });

    if (affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes made'
      });
    }

    // Return updated user
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Subscription,
        as: 'activeSubscription',
        required: false
      }]
    });

    return res.json({
      success: true,
      data: { user: updatedUser }
    });

  } catch (err) {
    console.error('User update error:', {
      error: err.message,
      userId: id,
      adminId: req.user?.id
    });
    next(err);
  }
};

/*───────────────────────────────────────────────────────────*/
exports.deleteUser = async (req, res, next) => {
  try {
    const rows = await User.destroy({ where: { id: req.params.id } });
    if (!rows) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { next(err); }
};

exports.getUserSubscription = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Get ALL subscriptions (not just active ones)
    const subscriptions = await Subscription.findAll({
      where: { userId },
      include: [{
        model: DataPlan,
        as: "plan",
        attributes: ["id", "name", "dataLimit", "price", "validityPeriod"]
      }],
      order: [['createdAt', 'DESC']] // Newest first
    });

    // Format the response to match what the frontend expects
    const formattedSubs = subscriptions.map(sub => ({
      ...sub.toJSON(),
      daysRemaining: days(sub.endDate),
      // Ensure plan data is available under both names
      DataPlan: sub.plan,
      plan: sub.plan // Include both for compatibility
    }));

    res.json({
      success: true,
      data: {
        subscriptions: formattedSubs.length > 0 ? formattedSubs : []
      }
    });

  } catch (err) {
    console.error('Error in getUserSubscription:', err);
    next(err);
  }
};

/*───────────────────────────────────────────────────────────*/
exports.getSystemStats = async (req, res, next) => {
  try {
    // Get user counts
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const inactiveUsers = await User.count({ where: { status: 'inactive' } });
    const suspendedUsers = await User.count({ where: { status: 'suspended' } });
    const adminUsers = await User.count({ where: { role: UserRole.ADMIN } });

    // Get subscription counts
    const totalSubscriptions = await Subscription.count();
    const activeSubscriptions = await Subscription.count({ where: { status: SubscriptionStatus.ACTIVE } });
    const expiredSubscriptions = await Subscription.count({ where: { status: SubscriptionStatus.EXPIRED } });
    const pendingSubscriptions = await Subscription.count({ where: { status: SubscriptionStatus.PENDING } });
    const suspendedSubscriptions = await Subscription.count({ where: { status: SubscriptionStatus.SUSPENDED } });

    // Get revenue for current month
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const payments = await Payment.findAll({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    const monthlyRevenue = payments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          suspended: suspendedUsers,
          admins: adminUsers
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          expired: expiredSubscriptions,
          pending: pendingSubscriptions,
          suspended: suspendedSubscriptions
        },
        revenue: {
          monthly: monthlyRevenue,
          annual: monthlyRevenue * 12
        },
        recentUsers: await User.findAll({
          limit: 5,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'firstName', 'lastName', 'email', 'createdAt']
        })
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserSubscription = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'activate', 'suspend', 'cancel'

    // Find the user's active subscription
    const subscription = await Subscription.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE
      },
      include: [{
        model: DataPlan,
        as: 'plan'
      }]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found for this user'
      });
    }

    // Process the action
    switch (action) {
      case 'activate':
        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.suspendedAt = null;
        break;
      case 'suspend':
        subscription.status = SubscriptionStatus.SUSPENDED;
        subscription.suspendedAt = new Date();
        break;
      case 'cancel':
        subscription.status = SubscriptionStatus.CANCELLED;
        subscription.cancelledAt = new Date();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    await subscription.save();

    res.json({
      success: true,
      message: `Subscription ${action}d successfully`,
      data: {
        subscription: {
          ...subscription.toJSON(),
          daysRemaining: days(subscription.endDate),
          DataPlan: subscription.plan
        }
      }
    });

  } catch (err) {
    console.error('Subscription update error:', err);
    next(err);
  }
};
