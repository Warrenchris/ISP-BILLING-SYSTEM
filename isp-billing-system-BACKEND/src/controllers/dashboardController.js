const { Op } = require('sequelize');
const { DataUsage } = require('../models');

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
