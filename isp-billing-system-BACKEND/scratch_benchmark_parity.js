const { Sequelize, Op } = require('sequelize');

const sequelize = new Sequelize('isp_billing_db', 'root', 'rootpassword', {
  host: '127.0.0.1',
  port: 3307,
  dialect: 'mysql',
  logging: false,
  define: { timestamps: true, underscored: true, freezeTableName: true }
});

const Subscription = sequelize.define('Subscription', {
  id: { type: Sequelize.STRING, primaryKey: true },
  subscriptionNumber: { type: Sequelize.STRING, field: 'subscription_number' },
  userId: { type: Sequelize.STRING, field: 'user_id' },
  planId: { type: Sequelize.STRING, field: 'plan_id' },
  status: { type: Sequelize.STRING },
  connectionType: { type: Sequelize.STRING, field: 'connection_type' },
  startDate: { type: Sequelize.DATE, field: 'start_date' },
  endDate: { type: Sequelize.DATE, field: 'end_date' },
  dataUsed: { type: Sequelize.BIGINT, field: 'data_used' },
  dataRemaining: { type: Sequelize.BIGINT, field: 'data_remaining' },
  created_at: { type: Sequelize.DATE }
}, { tableName: 'subscriptions' });

const DataPlan = sequelize.define('DataPlan', {
  id: { type: Sequelize.STRING, primaryKey: true },
  name: { type: Sequelize.STRING },
  price: { type: Sequelize.DECIMAL }
}, { tableName: 'data_plans' });

async function runLiveBenchmark() {
  await sequelize.authenticate();
  console.log("==========================================================================");
  console.log("REAL (NON-SIMULATED) BENCHMARK AGAINST LIVE MYSQL DATABASE (PORT 3307)");
  console.log("==========================================================================");

  const now = new Date();
  const times1 = [];

  // Benchmark getCentipidParityData query latency against live MySQL DB
  for (let i = 0; i < 5; i++) {
    const start = process.hrtime.bigint();
    const plans = await DataPlan.findAll({ order: [['price', 'ASC']] });
    await Promise.all(plans.map(async (plan) => {
      await Subscription.count({
        where: { planId: plan.id, status: 'active', endDate: { [Op.gt]: now } }
      });
    }));
    await sequelize.query("SELECT DATE(start_time) AS date, SUM(total_bytes) FROM data_usage WHERE start_time >= NOW() - INTERVAL 14 DAY GROUP BY DATE(start_time)").catch(() => []);
    const end = process.hrtime.bigint();
    times1.push(Number(end - start) / 1e6);
  }

  const avg1 = times1.reduce((a, b) => a + b, 0) / times1.length;
  console.log(`1. Parity Endpoint Database Latency (5 runs avg): ${avg1.toFixed(2)} ms`);

  // Benchmark getRetentionTrend query latency against live MySQL DB
  const times2 = [];
  for (let i = 0; i < 5; i++) {
    const start = process.hrtime.bigint();
    for (let m = 5; m >= 0; m--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59, 999);
      await Subscription.count({ where: { startDate: { [Op.lt]: monthStart }, [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: monthStart } }] } });
      await Subscription.count({ where: { startDate: { [Op.lte]: monthEnd }, [Op.or]: [{ endDate: null }, { endDate: { [Op.gt]: monthEnd } }] } });
      await Subscription.count({ where: { created_at: { [Op.between]: [monthStart, monthEnd] } } });
    }
    const end = process.hrtime.bigint();
    times2.push(Number(end - start) / 1e6);
  }

  const avg2 = times2.reduce((a, b) => a + b, 0) / times2.length;
  console.log(`2. Retention Trend Endpoint Database Latency (5 runs avg): ${avg2.toFixed(2)} ms`);
  console.log("==========================================================================");

  process.exit(0);
}

runLiveBenchmark().catch(err => {
  console.error("Live benchmark error:", err);
  process.exit(1);
});
