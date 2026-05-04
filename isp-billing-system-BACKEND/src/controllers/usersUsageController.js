const moment = require("moment");
const { Op } = require("sequelize");
const { User, Subscription, DataUsage, DataPlan } = require("../models");

function mbToBytes(mb) {
  return Math.round(Number(mb) * 1024 * 1024);
}

function parseSpeedMbps(speedStr) {
  if (!speedStr) return null;
  const s = String(speedStr).toLowerCase();
  if (s.includes("unlimited")) return null;
  const m = String(speedStr).match(/([\d.]+)\s*mbps/i);
  return m ? parseFloat(m[1]) : null;
}

function canAccessUserUsage(req, userId) {
  if (req.user.id === userId) return true;
  return ["admin", "support"].includes(req.user.role);
}

async function loadRowsForRange(userId, start, end) {
  return DataUsage.findAll({
    where: {
      userId,
      startTime: {
        [Op.between]: [start.toDate(), end.toDate()]
      }
    },
    attributes: ["startTime", "totalBytes", "bytesDownloaded", "bytesUploaded"],
    raw: true
  });
}

function bucketByDay(rows) {
  const byDay = {};
  for (const r of rows) {
    const d = moment(r.startTime).format("YYYY-MM-DD");
    if (!byDay[d]) {
      byDay[d] = { total: 0, down: 0, up: 0, sessions: 0 };
    }
    byDay[d].total += Number(r.totalBytes) || 0;
    byDay[d].down += Number(r.bytesDownloaded) || 0;
    byDay[d].up += Number(r.bytesUploaded) || 0;
    byDay[d].sessions += 1;
  }
  return byDay;
}

function computeWeeklyTrend(byDay, sortedDates) {
  let weeklyTrend = "stable";
  if (sortedDates.length < 7) return weeklyTrend;
  const last7 = sortedDates.slice(-7);
  const prev7 = sortedDates.slice(-14, -7);
  if (!prev7.length) return weeklyTrend;
  const sumMB = dates =>
    dates.reduce((acc, d) => acc + ((byDay[d]?.total || 0) / (1024 * 1024)), 0);
  const a = sumMB(prev7) / prev7.length;
  const b = sumMB(last7) / last7.length;
  if (b > a * 1.05) weeklyTrend = "increasing";
  else if (a > 0 && b < a * 0.95) weeklyTrend = "decreasing";
  return weeklyTrend;
}

/**
 * GET /api/users/:userId/data-usage — self, admin, or support
 */
exports.getUserDataUsage = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!canAccessUserUsage(req, userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const sub = await Subscription.findOne({
      where: { userId, status: "active" },
      include: [{ model: DataPlan, as: "plan" }]
    });

    const totalLimitMB =
      sub?.plan?.dataLimit != null ? Number(sub.plan.dataLimit) : 0;
    const totalUsedMB = sub ? Number(sub.dataUsed || 0) : 0;
    const totalUsed = mbToBytes(totalUsedMB);
    const totalLimit = mbToBytes(totalLimitMB);

    const todayStart = moment().startOf("day");
    const todayEnd = moment().endOf("day");
    const todayRows = await loadRowsForRange(userId, todayStart, todayEnd);
    const todayBytes = todayRows.reduce((acc, r) => acc + (Number(r.totalBytes) || 0), 0);

    const activeSessionCount = await DataUsage.count({
      where: { userId, status: "active" }
    });
    const averageSpeedMbps = sub?.plan?.speed ? parseSpeedMbps(sub.plan.speed) : null;

    const thirtyStart = moment().subtract(30, "days").startOf("day");
    const nowEnd = moment().endOf("day");
    const rows30 = await loadRowsForRange(userId, thirtyStart, nowEnd);
    const byDay = bucketByDay(rows30);
    const sortedDates = Object.keys(byDay).sort();
    const weeklyTrend = computeWeeklyTrend(byDay, sortedDates);

    const history = [];
    for (let i = 29; i >= 0; i--) {
      const d = moment().subtract(i, "days").format("YYYY-MM-DD");
      const b = byDay[d] || { total: 0, down: 0, up: 0, sessions: 0 };
      history.push({
        date: d,
        downloaded: Math.round(b.down / (1024 * 1024)),
        uploaded: Math.round(b.up / (1024 * 1024)),
        usageMB: Math.round(b.total / (1024 * 1024)),
        sessions: b.sessions
      });
    }

    const hourMB = {};
    rows30.forEach(r => {
      const h = moment(r.startTime).hour();
      const mb = (Number(r.totalBytes) || 0) / (1024 * 1024);
      hourMB[h] = (hourMB[h] || 0) + mb;
    });
    let peakH = 0;
    for (let h = 0; h < 24; h++) {
      if ((hourMB[h] || 0) > (hourMB[peakH] || 0)) peakH = h;
    }
    const nextH = (peakH + 1) % 24;
    const peakUsageHourLabel = `${String(peakH).padStart(2, "0")}:00–${String(nextH).padStart(2, "0")}:00`;

    const data = {
      totalUsed,
      totalLimit,
      dailyUsage: todayBytes,
      averageSpeedMbps,
      activeSessions: activeSessionCount,
      weeklyTrend,
      peakUsageHourLabel,
      totalSessions: rows30.length,
      history
    };

    return res.json({ success: true, data });
  } catch (error) {
    console.error("getUserDataUsage", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load data usage"
    });
  }
};

/**
 * GET /api/users/:userId/usage-history?period=7d|30d|1d — self, admin, or support
 */
exports.getUserUsageHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!canAccessUserUsage(req, userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const period = (req.query.period || "7d").toString();
    let days = 7;
    if (period === "30d") days = 30;
    if (period === "24h" || period === "1d") days = 1;

    const end = moment().endOf("day");
    const start = moment().subtract(days - 1, "days").startOf("day");
    const rows = await loadRowsForRange(userId, start, end);
    const byDay = bucketByDay(rows);

    const out = [];
    for (let i = 0; i < days; i++) {
      const d = moment(start).clone().add(i, "days").format("YYYY-MM-DD");
      const b = byDay[d] || { total: 0, down: 0, up: 0, sessions: 0 };
      out.push({
        date: d,
        label: moment(d).format("MMM D"),
        download: Math.round(b.down / (1024 * 1024)),
        upload: Math.round(b.up / (1024 * 1024)),
        sessions: b.sessions
      });
    }

    return res.json({ success: true, data: out });
  } catch (error) {
    console.error("getUserUsageHistory", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load usage history"
    });
  }
};
