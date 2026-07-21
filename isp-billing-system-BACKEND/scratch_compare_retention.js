const { sequelize } = require('./src/config/database');
const { Subscription, SubscriptionStatus } = require('./src/models');
const { Op } = require('sequelize');

async function runComparison() {
  const now = new Date();
  console.log("==========================================================");
  console.log("RETENTION & CHURN FORMULA COMPARISON: SHIPPED VS CORRECTED");
  console.log("==========================================================");
  console.log("Month    | Shipped Retention% | Corrected Retention% | Diff   | ActiveStart | ActiveEnd | NewSubs");
  console.log("---------+--------------------+----------------------+--------+-------------+-----------+--------");

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const monthLabel = monthStart.toLocaleString('default', { month: 'short', year: 'numeric' });

    // --- OLD SHIPPED FORMULA ---
    // Overlapping subscriptions in date range
    const oldActiveCount = await Subscription.count({
      where: {
        startDate: { [Op.lte]: monthEnd },
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: monthStart } }
        ]
      }
    });

    const oldChurnedCount = await Subscription.count({
      where: {
        [Op.or]: [
          { status: SubscriptionStatus.CANCELLED, cancelledAt: { [Op.between]: [monthStart, monthEnd] } },
          { status: SubscriptionStatus.EXPIRED, endDate: { [Op.between]: [monthStart, monthEnd] } }
        ]
      }
    });

    const oldBase = Math.max(oldActiveCount, 1);
    const oldChurnRate = Math.min(100, Math.round((oldChurnedCount / oldBase) * 1000) / 10);
    const oldRetentionRate = Math.max(0, Math.round((100 - oldChurnRate) * 10) / 10);

    // --- NEW CORRECTED POINT-IN-TIME FORMULA ---
    // 1. Active at start of month
    const activeStart = await Subscription.count({
      where: {
        startDate: { [Op.lt]: monthStart },
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: monthStart } }
        ]
      }
    });

    // 2. Active at end of month
    const activeEnd = await Subscription.count({
      where: {
        startDate: { [Op.lte]: monthEnd },
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gt]: monthEnd } }
        ]
      }
    });

    // 3. New signups during month
    const newSignups = await Subscription.count({
      where: {
        created_at: { [Op.between]: [monthStart, monthEnd] }
      }
    });

    const retainedCount = Math.max(0, activeEnd - newSignups);
    const denominator = Math.max(activeStart, 1);
    const newRetentionRate = activeStart === 0
      ? 100.0 // If start base is 0, retention is 100% (no prior cohorts lost)
      : Math.min(100, Math.round((retainedCount / denominator) * 1000) / 10);

    const diff = (newRetentionRate - oldRetentionRate).toFixed(1);
    const diffStr = diff >= 0 ? `+${diff}%` : `${diff}%`;

    console.log(
      `${monthLabel.padEnd(8)} | ` +
      `${(oldRetentionRate + '%').padEnd(18)} | ` +
      `${(newRetentionRate + '%').padEnd(20)} | ` +
      `${diffStr.padEnd(6)} | ` +
      `${String(activeStart).padEnd(11)} | ` +
      `${String(activeEnd).padEnd(9)} | ` +
      `${newSignups}`
    );
  }
  console.log("==========================================================");
  process.exit(0);
}

runComparison().catch(err => {
  console.error("Comparison script failed:", err);
  process.exit(1);
});
