const { Sequelize, Op } = require('sequelize');

const sequelize = new Sequelize('isp_billing_db', 'root', 'rootpassword', {
  host: '127.0.0.1',
  port: 3307,
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

const SubscriptionStatus = {
  ACTIVE: 'active',
  PENDING: 'pending',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended'
};

const Subscription = sequelize.define('Subscription', {
  id: { type: Sequelize.STRING, primaryKey: true },
  status: { type: Sequelize.STRING },
  startDate: { type: Sequelize.DATE, field: 'start_date' },
  endDate: { type: Sequelize.DATE, field: 'end_date' },
  cancelledAt: { type: Sequelize.DATE, field: 'cancelled_at' },
  created_at: { type: Sequelize.DATE }
}, { tableName: 'subscriptions' });

async function runComparison() {
  await sequelize.authenticate();
  const now = new Date();
  console.log("==========================================================================");
  console.log("LIVE DB RETENTION COMPARISON: SHIPPED VS CORRECTED (REAL DB ROWS)");
  console.log("==========================================================================");
  console.log("Month    | Shipped Retention% | Corrected Retention% | Diff   | ActiveStart | ActiveEnd | NewSubs");
  console.log("---------+--------------------+----------------------+--------+-------------+-----------+--------");

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const monthLabel = monthStart.toLocaleString('default', { month: 'short', year: 'numeric' });

    // --- OLD SHIPPED FORMULA ---
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
    const activeStart = await Subscription.count({
      where: {
        startDate: { [Op.lt]: monthStart },
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: monthStart } }
        ]
      }
    });

    const activeEnd = await Subscription.count({
      where: {
        startDate: { [Op.lte]: monthEnd },
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gt]: monthEnd } }
        ]
      }
    });

    const newSignups = await Subscription.count({
      where: {
        created_at: { [Op.between]: [monthStart, monthEnd] }
      }
    });

    const retainedCount = Math.max(0, activeEnd - newSignups);
    const newRetentionRate = activeStart === 0
      ? 100.0
      : Math.min(100, Math.round((retainedCount / activeStart) * 1000) / 10);

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
  console.log("==========================================================================");
  process.exit(0);
}

runComparison().catch(err => {
  console.error("Comparison script failed:", err);
  process.exit(1);
});
