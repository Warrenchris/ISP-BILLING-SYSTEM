const { Payment, Subscription, User } = require('../models');
const { Op, fn, col } = require('sequelize');
const { PaymentStatus, SubscriptionStatus } = require('../config/constants');

const MS_DAY = 24 * 60 * 60 * 1000;

function pctChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function getWindowPair(period) {
  const now = new Date();
  let curLenMs;
  if (period === 'daily') {
    curLenMs = MS_DAY;
  } else if (period === 'yearly') {
    curLenMs = 365 * MS_DAY;
  } else {
    curLenMs = 30 * MS_DAY;
  }
  const curEnd = now;
  const curStart = new Date(now.getTime() - curLenMs);
  const prevEnd = new Date(curStart.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - curLenMs);
  return { curStart, curEnd, prevStart, prevEnd };
}

async function sumCompletedRevenue(start, end) {
  const rows = await Payment.findAll({
    where: {
      status: PaymentStatus.COMPLETED,
      created_at: { [Op.between]: [start, end] },
    },
    attributes: ['amount'],
    raw: true,
  });
  return rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
}

async function churnedCount(start, end) {
  return Subscription.count({
    where: {
      [Op.or]: [
        { status: SubscriptionStatus.CANCELLED, cancelledAt: { [Op.between]: [start, end] } },
        { status: SubscriptionStatus.EXPIRED, endDate: { [Op.between]: [start, end] } },
      ],
    },
  });
}

exports.getReportsSummary = async (req, res, next) => {
  try {
    const period = req.query.period || 'monthly';
    const currency = 'KES';
    const { curStart, curEnd, prevStart, prevEnd } = getWindowPair(period);

    const revCur = await sumCompletedRevenue(curStart, curEnd);
    const revPrev = await sumCompletedRevenue(prevStart, prevEnd);
    const revenueChange = Math.round(pctChange(revCur, revPrev) * 10) / 10;

    const activeSubscribers = await Subscription.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    const newSubsCur = await Subscription.count({
      where: { created_at: { [Op.between]: [curStart, curEnd] } },
    });
    const newSubsPrev = await Subscription.count({
      where: { created_at: { [Op.between]: [prevStart, prevEnd] } },
    });
    const subscribersChange = Math.round(pctChange(newSubsCur, newSubsPrev) * 10) / 10;

    const churnCur = await churnedCount(curStart, curEnd);
    const churnPrev = await churnedCount(prevStart, prevEnd);
    const base = Math.max(activeSubscribers, 1);
    const churnRate = Math.round((churnCur / base) * 1000) / 10;
    const churnRatePrev = Math.round((churnPrev / base) * 1000) / 10;
    const churnChange = Math.round(pctChange(churnRate, churnRatePrev || 0.0001) * 10) / 10;

    const arpuCur = revCur / Math.max(activeSubscribers, 1);
    const arpuPrev = revPrev / Math.max(activeSubscribers, 1);
    const arpuChange = Math.round(pctChange(arpuCur, arpuPrev || 0.0001) * 10) / 10;

    const fmt = new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 });
    const revenueFormatted = fmt.format(revCur);
    const arpuFormatted = fmt.format(arpuCur);

    res.json({
      success: true,
      data: {
        revenue: revCur,
        revenueFormatted,
        activeSubscribers,
        arpu: Math.round(arpuCur * 100) / 100,
        arpuFormatted,
        churnRate,
        revenueChange,
        subscribersChange,
        arpuChange,
        churnChange,
        currency,
        period,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getRevenueChart = async (req, res, next) => {
  try {
    const period = req.query.period || 'monthly';
    const now = new Date();
    let paymentWhere = { status: PaymentStatus.COMPLETED };
    if (period === 'daily') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13, 0, 0, 0, 0);
      paymentWhere.created_at = { [Op.gte]: start };
    } else if (period === 'yearly') {
      paymentWhere.created_at = { [Op.gte]: new Date(now.getFullYear() - 5, 0, 1) };
    } else {
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      paymentWhere.created_at = { [Op.gte]: start };
    }
    const payments = await Payment.findAll({
      where: paymentWhere,
      attributes: ['amount', [col('created_at'), 'createdAt']],
      raw: true,
    });

    const data = [];

    if (period === 'daily') {
      const days = 14;
      for (let i = days - 1; i >= 0; i--) {
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
        let revenue = 0;
        payments.forEach((p) => {
          const t = new Date(p.createdAt);
          if (t >= dayStart && t <= dayEnd) revenue += parseFloat(p.amount) || 0;
        });
        data.push({
          name: dayStart.toLocaleString('default', { month: 'short', day: 'numeric' }),
          revenue: Math.round(revenue * 100) / 100,
        });
      }
    } else if (period === 'yearly') {
      const years = 5;
      for (let y = years - 1; y >= 0; y--) {
        const year = now.getFullYear() - y;
        let revenue = 0;
        payments.forEach((p) => {
          const t = new Date(p.createdAt);
          if (t.getFullYear() === year) revenue += parseFloat(p.amount) || 0;
        });
        data.push({ name: String(year), revenue: Math.round(revenue * 100) / 100 });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        let revenue = 0;
        payments.forEach((p) => {
          const t = new Date(p.createdAt);
          if (t >= d && t <= monthEnd) revenue += parseFloat(p.amount) || 0;
        });
        data.push({
          name: d.toLocaleString('default', { month: 'short' }),
          revenue: Math.round(revenue * 100) / 100,
        });
      }
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getUserGrowthChart = async (req, res, next) => {
  try {
    const period = req.query.period || 'weekly';
    const now = new Date();

    if (period === 'monthly') {
      const startDate = new Date();
      startDate.setMonth(now.getMonth() - 5);
      startDate.setDate(1);
      const users = await User.findAll({
        where: { created_at: { [Op.gte]: startDate } },
        attributes: [[col('created_at'), 'createdAt'], 'status'],
        raw: true,
      });
      const growthMap = {};
      for (let i = 0; i < 6; i++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + i);
        const m = d.toLocaleString('default', { month: 'short' });
        growthMap[m] = { name: m, newUsers: 0, active: 0 };
      }
      users.forEach((u) => {
        const m = new Date(u.createdAt).toLocaleString('default', { month: 'short' });
        if (growthMap[m]) {
          growthMap[m].newUsers++;
          if (u.status === 'active') growthMap[m].active++;
        }
      });
      return res.json({ success: true, data: Object.values(growthMap) });
    }

    if (period === 'daily') {
      const days = 14;
      const data = [];
      const users = await User.findAll({
        where: {
          created_at: { [Op.gte]: new Date(now.getTime() - days * MS_DAY) },
        },
        attributes: [[col('created_at'), 'createdAt'], 'status'],
        raw: true,
      });
      for (let i = days - 1; i >= 0; i--) {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
        const inDay = users.filter((u) => {
          const t = new Date(u.createdAt);
          return t >= dayStart && t <= dayEnd;
        });
        data.push({
          name: dayStart.toLocaleString('default', { month: 'short', day: 'numeric' }),
          newUsers: inDay.length,
          active: inDay.filter((u) => u.status === 'active').length,
        });
      }
      return res.json({ success: true, data });
    }

    if (period === 'yearly') {
      const years = 5;
      const data = [];
      const users = await User.findAll({
        where: {
          created_at: { [Op.gte]: new Date(now.getFullYear() - years, 0, 1) },
        },
        attributes: [[col('created_at'), 'createdAt'], 'status'],
        raw: true,
      });
      for (let y = years - 1; y >= 0; y--) {
        const year = now.getFullYear() - y;
        const inYear = users.filter((u) => new Date(u.createdAt).getFullYear() === year);
        data.push({
          name: String(year),
          newUsers: inYear.length,
          active: inYear.filter((u) => u.status === 'active').length,
        });
      }
      return res.json({ success: true, data });
    }

    const weeks = 8;
    const horizonStart = new Date(now.getTime() - weeks * 7 * MS_DAY);
    const users = await User.findAll({
      where: { created_at: { [Op.gte]: horizonStart } },
      attributes: [[col('created_at'), 'createdAt'], 'status'],
      raw: true,
    });
    const data = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * MS_DAY);
      const weekStart = new Date(weekEnd.getTime() - 7 * MS_DAY);
      const inWeek = users.filter((u) => {
        const t = new Date(u.createdAt);
        return t >= weekStart && t < weekEnd;
      });
      data.push({
        name: weekStart.toLocaleString('default', { month: 'short', day: 'numeric' }),
        newUsers: inWeek.length,
        active: inWeek.filter((u) => u.status === 'active').length,
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getRevenueStats = async (req, res, next) => {
  req.query.period = req.query.period || 'monthly';
  return exports.getRevenueChart(req, res, next);
};

exports.getSubscriberGrowth = async (req, res, next) => {
  req.query.period = req.query.period || 'monthly';
  return exports.getUserGrowthChart(req, res, next);
};
