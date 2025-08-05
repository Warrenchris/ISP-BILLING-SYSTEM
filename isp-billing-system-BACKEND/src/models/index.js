// models/index.js
const { sequelize } = require('../config/database');
const User = require('./User');
const DataPlan = require('./DataPlan');
const Subscription = require('./Subscription');
const Payment = require('./Payment');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const DataUsage = require('./DataUsage');

User.hasMany(Subscription, { foreignKey: 'userId', as: 'Subscriptions' });
User.hasMany(Payment, { foreignKey: 'userId', as: 'Payments' });
User.hasMany(Invoice, { foreignKey: 'userId', as: 'Invoices' });
User.hasMany(DataUsage, { foreignKey: 'userId', as: 'DataUsage' });
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

const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    throw error;
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
  syncDatabase
};
