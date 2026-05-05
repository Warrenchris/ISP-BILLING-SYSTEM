const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { DataUsage, User, Payment, Subscription, SupportTicket, Invoice } = require('../models');
const { PaymentStatus, SubscriptionStatus } = require('../config/constants');

/**
 * GET /api/dashboard/stats
 * Lightweight dashboard copy & labels for the SPA (authenticated).
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        // Matches admin total revenue: sum of amounts on completed payments (all-time)
        revenuePeriodLabel: 'Completed payments · all-time total',
      },
    });
  } catch (err) {
    next(err);
  }
};

function parsePeriodDays(period) {
  if (period === '30d') return 30;
  if (period === '7d' || !period) return 7;
  const n = parseInt(String(period).replace(/d$/i, ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 90) : 7;
}

/**
 * GET /api/dashboard/usage-history?period=7d
 * Admin: aggregated usage across all users per calendar day.
 * Customer: same aggregation scoped to req.user.id.
 */
exports.getUsageHistory = async (req, res, next) => {
  try {
    const days = parsePeriodDays(req.query.period);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const where = {
      startTime: { [Op.between]: [start, end] },
    };
    if (req.user?.role !== 'admin') {
      where.userId = req.user.id;
    }

    const rows = await DataUsage.findAll({
      where,
      attributes: ['startTime', 'totalBytes'],
      raw: true,
    });

    const byDay = {};
    rows.forEach((r) => {
      const key = new Date(r.startTime).toISOString().slice(0, 10);
      const mb = (Number(r.totalBytes) || 0) / (1024 * 1024);
      byDay[key] = (byDay[key] || 0) + mb;
    });

    const out = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const usageMB = Math.round((byDay[key] || 0) * 100) / 100;
      out.push({ date: key, usageMB });
    }

    res.json({ success: true, data: out });
  } catch (err) {
    next(err);
  }
};

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

/**
 * GET /api/admin/dashboard/overview
 * Admin-only overview stats in a single call.
 */
exports.getAdminOverview = async (req, res, next) => {
  try {
    const { start, end } = monthRange(new Date());
    const currency = process.env.DEFAULT_CURRENCY || 'KES';

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      totalRevenueRaw,
      revenueThisMonthRaw,
      activeSubscriptions,
      pendingSubscriptions,
      expiredSubscriptions,
      openTickets,
      highPriorityTickets,
      pendingInvoices,
      overdueInvoices,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { created_at: { [Op.between]: [start, end] } } }),
      Payment.sum('amount', { where: { status: PaymentStatus.COMPLETED } }),
      Payment.sum('amount', { where: { status: PaymentStatus.COMPLETED, created_at: { [Op.between]: [start, end] } } }),
      Subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      Subscription.count({ where: { status: SubscriptionStatus.PENDING } }),
      Subscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      SupportTicket.count({ where: { status: { [Op.in]: ['open', 'in_progress'] } } }),
      SupportTicket.count({ where: { status: { [Op.in]: ['open', 'in_progress'] }, priority: { [Op.in]: ['high', 'critical'] } } }),
      // Invoice model doesn't have "pending" status; treat draft/sent as pending.
      Invoice.count({ where: { status: { [Op.in]: ['draft', 'sent'] } } }),
      Invoice.count({ where: { status: 'overdue' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        totalRevenue: parseFloat(totalRevenueRaw || 0),
        revenueThisMonth: parseFloat(revenueThisMonthRaw || 0),
        activeSubscriptions,
        pendingSubscriptions,
        expiredSubscriptions,
        openTickets,
        highPriorityTickets,
        pendingInvoices,
        overdueInvoices,
        currency,
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/dashboard/activity
 * Recent activity feed across payments, signups, tickets, subscriptions.
 */
exports.getAdminActivity = async (req, res, next) => {
  try {
    const limitPerType = 5;

    const [payments, users, tickets, subs] = await Promise.all([
      Payment.findAll({
        limit: limitPerType,
        order: [['created_at', 'DESC']],
        include: [{ model: User, as: 'User', attributes: ['firstName', 'lastName', 'email'] }]
      }),
      User.findAll({
        limit: limitPerType,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'firstName', 'lastName', 'email', 'created_at']
      }),
      SupportTicket.findAll({
        limit: limitPerType,
        order: [['created_at', 'DESC']],
        include: [{ model: User, as: 'User', attributes: ['firstName', 'lastName', 'email'] }]
      }),
      Subscription.findAll({
        limit: limitPerType,
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'User', attributes: ['firstName', 'lastName', 'email'] }
        ]
      }),
    ]);

    const events = [];

    payments.forEach((p) => {
      const user = p.User ? {
        name: `${p.User.firstName || ''} ${p.User.lastName || ''}`.trim() || p.User.email,
        email: p.User.email
      } : { name: 'Unknown', email: '' };
      events.push({
        id: `payment-${p.id}`,
        type: 'payment',
        description: `Payment ${p.status} (${p.paymentMethod})`,
        user,
        amount: parseFloat(p.amount || 0),
        status: p.status,
        timestamp: (p.created_at || p.createdAt || p.initiatedAt || new Date()).toISOString?.() || new Date(p.created_at || p.createdAt || Date.now()).toISOString()
      });
    });

    users.forEach((u) => {
      events.push({
        id: `signup-${u.id}`,
        type: 'signup',
        description: 'New user signup',
        user: {
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          email: u.email
        },
        timestamp: new Date(u.created_at || u.createdAt || Date.now()).toISOString()
      });
    });

    tickets.forEach((t) => {
      const user = t.User ? {
        name: `${t.User.firstName || ''} ${t.User.lastName || ''}`.trim() || t.User.email,
        email: t.User.email
      } : { name: 'Unknown', email: '' };
      events.push({
        id: `ticket-${t.id}`,
        type: 'ticket',
        description: `Ticket ${t.status}: ${t.subject}`,
        user,
        status: t.status,
        timestamp: new Date(t.created_at || t.createdAt || Date.now()).toISOString()
      });
    });

    subs.forEach((s) => {
      const user = s.User ? {
        name: `${s.User.firstName || ''} ${s.User.lastName || ''}`.trim() || s.User.email,
        email: s.User.email
      } : { name: 'Unknown', email: '' };
      events.push({
        id: `subscription-${s.id}`,
        type: 'subscription',
        description: `Subscription ${s.status}`,
        user,
        status: s.status,
        timestamp: new Date(s.created_at || s.createdAt || Date.now()).toISOString()
      });
    });

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: events.slice(0, 15),
    });
  } catch (err) {
    next(err);
  }
};
