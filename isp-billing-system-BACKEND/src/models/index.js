// models/index.js
const { sequelize } = require('../config/database');
const User = require('./User');
const DataPlan = require('./DataPlan');
const Subscription = require('./Subscription');
const Payment = require('./Payment');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const DataUsage = require('./DataUsage');
const SupportTicket = require('./SupportTicket');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const Setting = require('./Setting');
const AIInsight = require('./AIInsight');

User.hasMany(Subscription, { foreignKey: 'userId', as: 'Subscriptions' });
User.hasMany(Payment, { foreignKey: 'userId', as: 'Payments' });
User.hasMany(Invoice, { foreignKey: 'userId', as: 'Invoices' });
User.hasMany(DataUsage, { foreignKey: 'userId', as: 'DataUsage' });
User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'SupportTickets' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'Notifications' });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'AuditLogs' });
User.hasMany(AIInsight, { foreignKey: 'userId', as: 'AIInsights' });

AIInsight.belongsTo(User, { foreignKey: 'userId', as: 'User' });
User.hasOne(Subscription, { foreignKey: 'userId', as: 'activeSubscription' });


DataPlan.hasMany(Subscription, { foreignKey: 'planId', as: 'Subscriptions' });

Subscription.belongsTo(User, { foreignKey: 'userId', as: 'User' });
Subscription.belongsTo(DataPlan, { foreignKey: 'planId', as: 'plan' });
Subscription.hasMany(Payment, { foreignKey: 'subscriptionId', as: 'payments' }); // ✅ lowercase
Subscription.hasMany(Invoice, { foreignKey: 'subscriptionId', as: 'Invoices' });
Subscription.hasMany(DataUsage, { foreignKey: 'subscriptionId', as: 'DataUsage' });

Payment.belongsTo(User, { foreignKey: 'userId', as: 'User' });
Payment.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' }); // ✅ lowercase


Invoice.belongsTo(User, { foreignKey: 'userId', as: 'User' });
Invoice.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'Subscription' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'Items' });

InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'Invoice' });

DataUsage.belongsTo(User, { foreignKey: 'userId', as: 'User' });
DataUsage.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'Subscription' });

SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'User' });
SupportTicket.belongsTo(User, { foreignKey: 'assignedTo', as: 'Staff' });

Notification.belongsTo(User, { foreignKey: 'userId', as: 'User' });

AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'User' });

const syncDatabase = async (force = false) => {
  const MAX_RETRIES = 10;
  const RETRY_DELAY_MS = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 DB sync attempt ${attempt}/${MAX_RETRIES}...`);
      await sequelize.sync({ force });

      // Align MySQL enum values for existing databases where sync({ force: false })
      // does not update ENUM definitions automatically.
      if (sequelize.getDialect() === 'mysql') {
        await sequelize.query(`
          ALTER TABLE subscriptions
          MODIFY COLUMN status ENUM('pending', 'active', 'expired', 'suspended', 'cancelled')
          NOT NULL DEFAULT 'pending';
        `);
      }

      console.log('✅ Database synced successfully');
      return;
    } catch (error) {
      console.error(`❌ DB sync attempt ${attempt} failed:`, error.message);
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

module.exports = {
  sequelize,
  User,
  DataPlan,
  Subscription,
  Payment,
  Invoice,
  InvoiceItem,
  DataUsage,
  SupportTicket,
  Notification,
  AuditLog,
  Setting,
  AIInsight,
  syncDatabase
};
