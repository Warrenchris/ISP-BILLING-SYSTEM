const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  itemType: {
    type: DataTypes.ENUM('subscription', 'data_plan', 'overage', 'installation', 'equipment', 'penalty', 'discount', 'tax'),
    allowNull: false,
    defaultValue: 'subscription'
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1.00
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discountRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  periodStart: {
    type: DataTypes.DATE,
    allowNull: true
  },
  periodEnd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'invoice_items',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Instance methods
InvoiceItem.prototype.calculateTotal = function() {
  const quantity = parseFloat(this.quantity) || 0;
  const unitPrice = parseFloat(this.unitPrice) || 0;
  const discountAmount = parseFloat(this.discountAmount) || 0;
  const taxAmount = parseFloat(this.taxAmount) || 0;
  
  const subtotal = quantity * unitPrice;
  this.totalPrice = subtotal - discountAmount + taxAmount;
  
  return this.totalPrice;
};

InvoiceItem.prototype.calculateTax = function() {
  const quantity = parseFloat(this.quantity) || 0;
  const unitPrice = parseFloat(this.unitPrice) || 0;
  const taxRate = parseFloat(this.taxRate) || 0;
  const discountAmount = parseFloat(this.discountAmount) || 0;
  
  const subtotal = quantity * unitPrice - discountAmount;
  this.taxAmount = (subtotal * taxRate) / 100;
  
  return this.taxAmount;
};

InvoiceItem.prototype.calculateDiscount = function() {
  const quantity = parseFloat(this.quantity) || 0;
  const unitPrice = parseFloat(this.unitPrice) || 0;
  const discountRate = parseFloat(this.discountRate) || 0;
  
  const subtotal = quantity * unitPrice;
  this.discountAmount = (subtotal * discountRate) / 100;
  
  return this.discountAmount;
};

InvoiceItem.prototype.getFormattedUnitPrice = function() {
  return `KES ${parseFloat(this.unitPrice).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
};

InvoiceItem.prototype.getFormattedTotalPrice = function() {
  return `KES ${parseFloat(this.totalPrice).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
};

InvoiceItem.prototype.getPeriodText = function() {
  if (!this.periodStart || !this.periodEnd) return '';
  
  const start = new Date(this.periodStart).toLocaleDateString('en-KE');
  const end = new Date(this.periodEnd).toLocaleDateString('en-KE');
  
  return `${start} - ${end}`;
};

// Static methods
InvoiceItem.createSubscriptionItem = function(subscription, billingPeriodStart, billingPeriodEnd) {
  return {
    description: `${subscription.DataPlan.name} - ${subscription.DataPlan.description}`,
    itemType: 'subscription',
    quantity: 1,
    unitPrice: subscription.DataPlan.price,
    totalPrice: subscription.DataPlan.price,
    periodStart: billingPeriodStart,
    periodEnd: billingPeriodEnd,
    metadata: {
      subscriptionId: subscription.id,
      planId: subscription.planId,
      planName: subscription.DataPlan.name,
      dataLimit: subscription.DataPlan.dataLimit,
      speed: subscription.DataPlan.speed
    }
  };
};

InvoiceItem.createOverageItem = function(dataUsed, dataLimit, overageRate) {
  const overageAmount = Math.max(0, dataUsed - dataLimit);
  const overageGB = overageAmount / 1024; // Convert MB to GB
  const totalPrice = overageGB * overageRate;
  
  return {
    description: `Data Overage - ${overageGB.toFixed(2)} GB`,
    itemType: 'overage',
    quantity: overageGB,
    unitPrice: overageRate,
    totalPrice: totalPrice,
    metadata: {
      dataUsed: dataUsed,
      dataLimit: dataLimit,
      overageAmount: overageAmount,
      overageRate: overageRate
    }
  };
};

InvoiceItem.createInstallationItem = function(installationFee) {
  return {
    description: 'Installation and Setup Fee',
    itemType: 'installation',
    quantity: 1,
    unitPrice: installationFee,
    totalPrice: installationFee
  };
};

InvoiceItem.createEquipmentItem = function(equipmentName, equipmentPrice) {
  return {
    description: `Equipment - ${equipmentName}`,
    itemType: 'equipment',
    quantity: 1,
    unitPrice: equipmentPrice,
    totalPrice: equipmentPrice,
    metadata: {
      equipmentName: equipmentName
    }
  };
};

InvoiceItem.createPenaltyItem = function(penaltyDescription, penaltyAmount) {
  return {
    description: `Penalty - ${penaltyDescription}`,
    itemType: 'penalty',
    quantity: 1,
    unitPrice: penaltyAmount,
    totalPrice: penaltyAmount
  };
};

module.exports = InvoiceItem;

