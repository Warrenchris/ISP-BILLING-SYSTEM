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

async function seedTestData() {
  await sequelize.authenticate();
  console.log("Seeding test subscriptions into live DB (port 3307)...");

  const now = new Date();
  const May1 = new Date(now.getFullYear(), now.getMonth() - 2, 10);
  const Jun1 = new Date(now.getFullYear(), now.getMonth() - 1, 10);
  const Jul1 = new Date(now.getFullYear(), now.getMonth(), 5);

  const sampleSubs = [
    { id: 'sub-live-1', subscriptionNumber: 'SUB-LIVE-1', userId: 'usr-1', planId: 'plan-1', status: 'active', connectionType: 'pppoe', startDate: May1, endDate: new Date(2027, 0, 1), dataUsed: 15000000000, dataRemaining: 5000000000, created_at: May1 },
    { id: 'sub-live-2', subscriptionNumber: 'SUB-LIVE-2', userId: 'usr-2', planId: 'plan-1', status: 'active', connectionType: 'hotspot', startDate: May1, endDate: new Date(2027, 0, 1), dataUsed: 8000000000, dataRemaining: 2000000000, created_at: May1 },
    { id: 'sub-live-3', subscriptionNumber: 'SUB-LIVE-3', userId: 'usr-3', planId: 'plan-2', status: 'active', connectionType: 'pppoe', startDate: Jun1, endDate: new Date(2027, 0, 1), dataUsed: 22000000000, dataRemaining: 8000000000, created_at: Jun1 },
    { id: 'sub-live-4', subscriptionNumber: 'SUB-LIVE-4', userId: 'usr-4', planId: 'plan-2', status: 'expired', connectionType: 'hotspot', startDate: May1, endDate: Jun1, dataUsed: 5000000000, dataRemaining: 0, created_at: May1 },
    { id: 'sub-live-5', subscriptionNumber: 'SUB-LIVE-5', userId: 'usr-5', planId: 'plan-2', status: 'active', connectionType: 'address_list', startDate: Jul1, endDate: new Date(2027, 0, 1), dataUsed: 12000000000, dataRemaining: 3000000000, created_at: Jul1 },
  ];

  for (const sub of sampleSubs) {
    await Subscription.upsert(sub);
  }
  console.log("✅ Seeded 5 test subscriptions successfully into live DB.");
  process.exit(0);
}

seedTestData().catch(err => { console.error("Seeding failed:", err); process.exit(1); });
