const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { DataUsage, User, Payment, Subscription, SupportTicket, Invoice, DataPlan, RadAcct } = require('../models');
const { PaymentStatus, SubscriptionStatus } = require('../config/constants');
const cacheService = require('../services/cacheService');

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
      User.count({ where: { role: { [Op.ne]: 'admin' } } }),
      User.count({ where: { isActive: true, role: { [Op.ne]: 'admin' } } }),
      User.count({ where: { created_at: { [Op.between]: [start, end] }, role: { [Op.ne]: 'admin' } } }),
      Payment.sum('amount', { where: { status: PaymentStatus.COMPLETED } }),
      Payment.sum('amount', { where: { status: PaymentStatus.COMPLETED, created_at: { [Op.between]: [start, end] } } }),
      Subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: { [Op.gt]: new Date() }
        }
      }),
      Subscription.count({ where: { status: SubscriptionStatus.PENDING } }),
      Subscription.count({
        where: {
          [Op.or]: [
            { status: SubscriptionStatus.EXPIRED },
            {
              status: SubscriptionStatus.ACTIVE,
              endDate: { [Op.lte]: new Date() }
            }
          ]
        }
      }),
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

/**
 * GET /api/admin/dashboard/centipid-parity
 * Consolidates Centipid dashboard widgets:
 *  - mostActiveUsers (30d)
 *  - packagePerformance (ARPU, revenue, active count per plan)
 *  - connectionTypeUsage (PPPoE vs Hotspot usage trends)
 *  - weeklyBandwidth (Download vs Upload GB totals)
 *  - liveActiveSessions (Live RADIUS sessions count & peak)
 */
exports.getCentipidParityData = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Most Active Users (last 30 days)
    let mostActiveUsers = [];
    try {
      const [rows] = await sequelize.query(`
        SELECT 
          u.id, 
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS name,
          u.email, 
          u.phone,
          COALESCE(SUM(du.total_bytes), 0) AS total_bytes,
          COALESCE(SUM(du.bytes_in), 0) AS download_bytes,
          COALESCE(SUM(du.bytes_out), 0) AS upload_bytes
        FROM users u
        JOIN data_usage du ON du.user_id = u.id
        WHERE du.start_time >= NOW() - INTERVAL '30 days'
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone
        ORDER BY total_bytes DESC
        LIMIT 10
      `);

      mostActiveUsers = rows.map(r => ({
        id: r.id,
        name: r.name.trim() || r.email || 'User',
        email: r.email,
        phone: r.phone || 'N/A',
        totalBytes: Number(r.total_bytes),
        downloadBytes: Number(r.download_bytes),
        uploadBytes: Number(r.upload_bytes),
        totalGB: Math.round((Number(r.total_bytes) / (1024 * 1024 * 1024)) * 100) / 100,
      }));
    } catch (e) {
      mostActiveUsers = [];
    }

    // Fallback if data_usage table has no 30-day rows (e.g. fresh environment)
    if (mostActiveUsers.length === 0) {
      const activeSubs = await Subscription.findAll({
        where: { status: SubscriptionStatus.ACTIVE },
        limit: 10,
        order: [['dataUsed', 'DESC']],
        include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'] }]
      });
      mostActiveUsers = activeSubs.map(s => {
        const u = s.User || {};
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User';
        const bytes = Number(s.dataUsed || 0);
        return {
          id: u.id || s.id,
          name,
          email: u.email || 'N/A',
          phone: u.phoneNumber || 'N/A',
          totalBytes: bytes,
          downloadBytes: 0,
          uploadBytes: 0,
          totalGB: Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100,
        };
      });
    }

    // 2. Package Performance Comparison (per DataPlan: active count, revenue, avg usage, ARPU)
    const plans = await DataPlan.findAll({ order: [['price', 'ASC']] });
    const packagePerformance = await Promise.all(plans.map(async (plan) => {
      const activeSubsCount = await Subscription.count({
        where: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          endDate: { [Op.gt]: now }
        }
      });

      // Find monthly revenue from completed payments for subscriptions with this planId
      const planSubs = await Subscription.findAll({ where: { planId: plan.id }, attributes: ['id'] });
      const planSubIds = planSubs.map(s => s.id);

      let monthlyRevenue = 0;
      if (planSubIds.length > 0) {
        const revSum = await Payment.sum('amount', {
          where: {
            subscriptionId: { [Op.in]: planSubIds },
            status: PaymentStatus.COMPLETED,
            created_at: { [Op.gte]: startOfMonth }
          }
        });
        monthlyRevenue = parseFloat(revSum || 0);
      }

      // Sum dataUsed across active subscriptions for avg usage calculation
      const totalDataUsed = await Subscription.sum('dataUsed', {
        where: { planId: plan.id, status: SubscriptionStatus.ACTIVE }
      });
      const totalUsedBytes = Number(totalDataUsed || 0);

      const avgDataUsageMB = activeSubsCount > 0
        ? Math.round((totalUsedBytes / activeSubsCount / (1024 * 1024)) * 10) / 10
        : 0;

      const arpu = activeSubsCount > 0
        ? Math.round((monthlyRevenue / activeSubsCount) * 100) / 100
        : 0;

      return {
        id: plan.id,
        name: plan.name,
        price: parseFloat(plan.price || 0),
        activeSubscribers: activeSubsCount,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        avgDataUsageMB,
        arpu,
      };
    }));

    // 3. PPPoE vs Hotspot Usage Breakdown (Past 14 days)
    let connectionTypeUsage = [];
    try {
      const [rows] = await sequelize.query(`
        SELECT 
          DATE(du.start_time) AS date,
          COALESCE(s.connection_type, 'hotspot') AS connection_type,
          COALESCE(SUM(du.total_bytes), 0) / (1024 * 1024) AS usage_mb
        FROM data_usage du
        LEFT JOIN subscriptions s ON du.subscription_id = s.id
        WHERE du.start_time >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(du.start_time), COALESCE(s.connection_type, 'hotspot')
        ORDER BY date ASC
      `);

      const byDateMap = {};
      rows.forEach(r => {
        const dateKey = new Date(r.date).toISOString().slice(0, 10);
        if (!byDateMap[dateKey]) {
          byDateMap[dateKey] = { date: dateKey, pppoe: 0, hotspot: 0, address_list: 0 };
        }
        const cType = String(r.connection_type).toLowerCase();
        const mb = Math.round(Number(r.usage_mb) * 100) / 100;
        if (cType === 'pppoe') byDateMap[dateKey].pppoe += mb;
        else if (cType === 'address_list') byDateMap[dateKey].address_list += mb;
        else byDateMap[dateKey].hotspot += mb;
      });

      connectionTypeUsage = Object.values(byDateMap);
    } catch (e) {
      connectionTypeUsage = [];
    }

    // 4. Download vs Upload Weekly Bandwidth Totals (Past 7 days)
    let weeklyBandwidth = [];
    try {
      const [rows] = await sequelize.query(`
        SELECT 
          DATE(start_time) AS date,
          COALESCE(SUM(bytes_in), 0) / (1024 * 1024 * 1024) AS download_gb,
          COALESCE(SUM(bytes_out), 0) / (1024 * 1024 * 1024) AS upload_gb
        FROM data_usage
        WHERE start_time >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(start_time)
        ORDER BY date ASC
      `);

      weeklyBandwidth = rows.map(r => ({
        date: new Date(r.date).toISOString().slice(0, 10),
        downloadGB: Math.round(Number(r.download_gb) * 100) / 100,
        uploadGB: Math.round(Number(r.upload_gb) * 100) / 100,
        totalGB: Math.round((Number(r.download_gb) + Number(r.upload_gb)) * 100) / 100,
      }));
    } catch (e) {
      weeklyBandwidth = [];
    }

    // 5. Live Active RADIUS Users & Peak Count
    let liveActiveCount = 0;
    try {
      liveActiveCount = await RadAcct.count({ where: { acctstoptime: null } });
    } catch (e) {
      liveActiveCount = 0;
    }

    const totalActiveSubscribers = await Subscription.count({
      where: { status: SubscriptionStatus.ACTIVE, endDate: { [Op.gt]: now } }
    });

    const liveUsers = {
      liveNow: liveActiveCount,
      totalActiveSubscribers,
      avgActive: liveActiveCount,
      weeklyPeak: liveActiveCount,
    };

    res.json({
      success: true,
      data: {
        mostActiveUsers,
        packagePerformance,
        connectionTypeUsage,
        weeklyBandwidth,
        liveUsers,
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/dashboard/retention-trend
 * Calculates a rolling 6-month monthly customer retention rate % vs churn rate %.
 */
exports.getRetentionTrend = async (req, res, next) => {
  try {
    const trendData = await cacheService.getOrCompute('dashboard:retention_trend_6m', async () => {
      const now = new Date();
      const data = [];

      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const monthLabel = monthStart.toLocaleString('default', { month: 'short' });

        // 1. Active subscribers at START of month
        const activeStart = await Subscription.count({
          where: {
            startDate: { [Op.lt]: monthStart },
            [Op.or]: [
              { endDate: null },
              { endDate: { [Op.gte]: monthStart } }
            ]
          }
        });

        // 2. Active subscribers at END of month
        const activeEnd = await Subscription.count({
          where: {
            startDate: { [Op.lte]: monthEnd },
            [Op.or]: [
              { endDate: null },
              { endDate: { [Op.gt]: monthEnd } }
            ]
          }
        });

        // 3. New signups during the month
        const newSignups = await Subscription.count({
          where: {
            created_at: { [Op.between]: [monthStart, monthEnd] }
          }
        });

        // 4. Retained subscribers = activeEnd - newSignups
        const retainedCount = Math.max(0, activeEnd - newSignups);
        const retentionRate = activeStart === 0
          ? 100.0
          : Math.min(100, Math.round((retainedCount / activeStart) * 1000) / 10);
        const churnRate = Math.round((100 - retentionRate) * 10) / 10;

        data.push({
          month: monthLabel,
          year: monthStart.getFullYear(),
          retentionRate,
          churnRate,
          activeStart,
          activeEnd,
          newSignups,
        });
      }
      return data;
    }, 3600);

    res.json({
      success: true,
      data: trendData,
    });
  } catch (err) {
    next(err);
  }
};
