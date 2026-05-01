/**
 * dataFetcher.js – Fetches real-time customer context from MySQL
 * for LLM grounding (Module 4) and dashboard (Module 5).
 */

'use strict';

const { Op } = require('sequelize');
const {
  User, Subscription, Invoice, SupportTicket, DataPlan,
  Payment, DataUsage, AIInsight
} = require('../models');

/* ──────────────────────────────────────────────────────────────
   Customer context for LLM grounding
   ────────────────────────────────────────────────────────────── */

/**
 * Fetch full context for a single customer (for LLM).
 * Returns subscription, last 3 invoices, open tickets, churn score.
 */
async function fetchCustomerContext(customerId) {
  const user = await User.findByPk(customerId, {
    attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'isActive', 'createdAt']
  });
  if (!user) return null;

  // Active subscription + plan details
  const subscription = await Subscription.findOne({
    where: { userId: customerId, status: 'active' },
    include: [{ model: DataPlan, as: 'plan' }],
    order: [['created_at', 'DESC']]
  });

  // Last 3 invoices
  const recentInvoices = await Invoice.findAll({
    where: { userId: customerId },
    order: [['createdAt', 'DESC']],
    limit: 3
  });

  // Open support tickets
  const openTickets = await SupportTicket.findAll({
    where: {
      userId: customerId,
      status: { [Op.in]: ['open', 'in_progress', 'pending'] }
    },
    order: [['created_at', 'DESC']],
    limit: 5
  });

  // Latest churn risk from AIInsight
  const churnInsight = await AIInsight.findOne({
    where: { userId: customerId, predictionType: 'churn_risk' },
    order: [['created_at', 'DESC']]
  });

  // Last 3 payments
  const recentPayments = await Payment.findAll({
    where: { userId: customerId, status: 'completed' },
    order: [['created_at', 'DESC']],
    limit: 3
  });

  return {
    customer: {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phoneNumber,
      isActive: user.isActive,
      memberSince: user.createdAt
    },
    subscription: subscription
      ? {
          status: subscription.status,
          plan: subscription.plan?.name || 'Unknown',
          planSpeed: subscription.plan?.speed || null,
          planPrice: subscription.plan?.price || null,
          dataUsedMB: subscription.dataUsed,
          dataRemainingMB: subscription.dataRemaining,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew
        }
      : null,
    recentInvoices: recentInvoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      totalAmount: inv.totalAmount,
      status: inv.status,
      paymentStatus: inv.paymentStatus,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt
    })),
    openTickets: openTickets.map(t => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt
    })),
    churnRisk: churnInsight
      ? {
          score: churnInsight.score,
          riskLevel: churnInsight.insightData?.riskLevel || 'UNKNOWN',
          reasons: churnInsight.insightData?.reasons || [],
          calculatedAt: churnInsight.createdAt
        }
      : null,
    recentPayments: recentPayments.map(p => ({
      amount: p.amount,
      method: p.paymentMethod,
      status: p.status,
      completedAt: p.completedAt,
      mpesaReceipt: p.mpesaReceiptNumber
    }))
  };
}

/* ──────────────────────────────────────────────────────────────
   Aggregate data for MLR training
   ────────────────────────────────────────────────────────────── */

/**
 * Fetch monthly revenue history for MLR training.
 * Returns array of {period, revenue, activeSubscribers, avgDataUsageMB,
 *   paymentDelays, planDistribution}
 */
async function fetchMonthlyRevenueData(months = 12) {
  const { sequelize } = require('../models');

  // Monthly completed payments
  const revenueData = await sequelize.query(`
    SELECT 
      DATE_FORMAT(completed_at, '%Y-%m') AS period,
      COUNT(DISTINCT user_id) AS active_subscribers,
      SUM(amount) AS revenue
    FROM payments
    WHERE status = 'completed'
      AND completed_at >= DATE_SUB(NOW(), INTERVAL :months MONTH)
    GROUP BY period
    ORDER BY period ASC
  `, {
    replacements: { months },
    type: sequelize.QueryTypes.SELECT
  });

  // Monthly average data usage
  const usageData = await sequelize.query(`
    SELECT 
      DATE_FORMAT(recorded_at, '%Y-%m') AS period,
      AVG(bytes_used) / 1048576 AS avg_usage_mb
    FROM data_usages
    WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL :months MONTH)
    GROUP BY period
    ORDER BY period ASC
  `, {
    replacements: { months },
    type: sequelize.QueryTypes.SELECT
  });

  // Monthly payment delays (payments due vs actually paid late)
  const delayData = await sequelize.query(`
    SELECT 
      DATE_FORMAT(i.due_date, '%Y-%m') AS period,
      COUNT(*) AS delay_count
    FROM invoices i
    WHERE i.status = 'overdue' OR (i.paid_at > i.due_date)
      AND i.created_at >= DATE_SUB(NOW(), INTERVAL :months MONTH)
    GROUP BY period
    ORDER BY period ASC
  `, {
    replacements: { months },
    type: sequelize.QueryTypes.SELECT
  });

  // Plan distribution per month
  const planData = await sequelize.query(`
    SELECT 
      DATE_FORMAT(s.created_at, '%Y-%m') AS period,
      dp.name AS plan_name,
      COUNT(*) AS plan_count
    FROM subscriptions s
    JOIN data_plans dp ON s.plan_id = dp.id
    WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL :months MONTH)
    GROUP BY period, dp.name
    ORDER BY period ASC
  `, {
    replacements: { months },
    type: sequelize.QueryTypes.SELECT
  });

  // Merge by period
  const usageMap = Object.fromEntries(usageData.map(u => [u.period, parseFloat(u.avg_usage_mb) || 0]));
  const delayMap = Object.fromEntries(delayData.map(d => [d.period, parseInt(d.delay_count) || 0]));

  // Plan distribution map per period
  const planMap = {};
  for (const p of planData) {
    if (!planMap[p.period]) planMap[p.period] = {};
    planMap[p.period][p.plan_name.toLowerCase()] = (planMap[p.period][p.plan_name.toLowerCase()] || 0) + parseInt(p.plan_count);
  }

  return revenueData.map(r => ({
    period: r.period,
    revenue: parseFloat(r.revenue) || 0,
    activeSubscribers: parseInt(r.active_subscribers) || 0,
    avgDataUsageMB: usageMap[r.period] || 0,
    paymentDelays: delayMap[r.period] || 0,
    planDistribution: planMap[r.period] || {}
  }));
}

/* ──────────────────────────────────────────────────────────────
   Aggregate data for churn training
   ────────────────────────────────────────────────────────────── */

/**
 * Build per-customer churn feature vectors from DB.
 * `churned` = true if subscription is cancelled/expired and not renewed.
 */
async function fetchChurnFeatures() {
  const { sequelize } = require('../models');

  const rows = await sequelize.query(`
    SELECT
      u.id,
      u.first_name, u.last_name, u.email,
      COUNT(DISTINCT CASE 
        WHEN p.status = 'failed' OR (i.paid_at > i.due_date) THEN i.id 
      END) AS payment_delay_frequency,
      COUNT(DISTINCT st.id) AS support_ticket_count,
      DATEDIFF(NOW(), s.created_at) / 30 AS subscription_duration_months,
      s.status AS sub_status
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN payments p ON p.user_id = u.id
    LEFT JOIN invoices i ON i.user_id = u.id
    LEFT JOIN support_tickets st ON st.user_id = u.id
    WHERE u.role = 'customer' AND u.deleted_at IS NULL
    GROUP BY u.id, u.first_name, u.last_name, u.email, s.status, s.created_at
  `, { type: sequelize.QueryTypes.SELECT });

  return rows.map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    paymentDelayFrequency: parseInt(r.payment_delay_frequency) || 0,
    supportTicketCount: parseInt(r.support_ticket_count) || 0,
    dataUsageTrend: 0, // computed separately from usage time series
    subscriptionDurationMonths: parseFloat(r.subscription_duration_months) || 1,
    churned: ['cancelled', 'expired'].includes(r.sub_status) ? 1 : 0
  }));
}

/* ──────────────────────────────────────────────────────────────
   Data usage profiles for anomaly detection
   ────────────────────────────────────────────────────────────── */

async function fetchUsageProfiles() {
  const { sequelize } = require('../models');

  // Per-customer usage history (monthly totals in MB)
  const rows = await sequelize.query(`
    SELECT
      u.id AS userId,
      CONCAT(u.first_name, ' ', u.last_name) AS userName,
      DATE_FORMAT(du.recorded_at, '%Y-%m') AS period,
      SUM(du.bytes_used) / 1048576 AS usage_mb
    FROM data_usages du
    JOIN users u ON du.user_id = u.id
    WHERE du.recorded_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY u.id, userName, period
    ORDER BY u.id, period ASC
  `, { type: sequelize.QueryTypes.SELECT });

  // Group by customer
  const profileMap = {};
  for (const r of rows) {
    if (!profileMap[r.userId]) {
      profileMap[r.userId] = {
        userId: r.userId,
        userName: r.userName,
        usageHistory: [],
        currentUsage: 0
      };
    }
    profileMap[r.userId].usageHistory.push(parseFloat(r.usage_mb) || 0);
  }

  // Last entry is "current month"
  for (const profile of Object.values(profileMap)) {
    if (profile.usageHistory.length > 0) {
      profile.currentUsage = profile.usageHistory[profile.usageHistory.length - 1];
      profile.usageHistory = profile.usageHistory.slice(0, -1); // history without current
    }
  }

  return Object.values(profileMap);
}

/* ──────────────────────────────────────────────────────────────
   Revenue history for anomaly detection (actual vs predicted)
   ────────────────────────────────────────────────────────────── */

async function fetchRevenueVsPredicted(months = 6) {
  const { sequelize } = require('../models');

  // Get actual monthly revenue
  const actual = await sequelize.query(`
    SELECT 
      DATE_FORMAT(completed_at, '%Y-%m') AS period,
      SUM(amount) AS actual_revenue
    FROM payments
    WHERE status = 'completed'
      AND completed_at >= DATE_SUB(NOW(), INTERVAL :months MONTH)
    GROUP BY period
    ORDER BY period ASC
  `, {
    replacements: { months },
    type: sequelize.QueryTypes.SELECT
  });

  // Get stored revenue predictions from AIInsight
  const predictions = await AIInsight.findAll({
    where: { predictionType: 'revenue_forecast' },
    order: [['created_at', 'DESC']],
    limit: months
  });

  const predMap = {};
  for (const p of predictions) {
    if (p.periodStart) {
      const period = p.periodStart.toISOString().substring(0, 7);
      predMap[period] = parseFloat(p.predictedValue) || 0;
    }
  }

  return actual.map(r => ({
    period: r.period,
    actual: parseFloat(r.actual_revenue) || 0,
    predicted: predMap[r.period] || 0
  }));
}

module.exports = {
  fetchCustomerContext,
  fetchMonthlyRevenueData,
  fetchChurnFeatures,
  fetchUsageProfiles,
  fetchRevenueVsPredicted
};
