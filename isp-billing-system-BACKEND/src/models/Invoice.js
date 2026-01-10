const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  subscriptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'subscriptions',
      key: 'id'
    }
  },
  invoiceNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  billingPeriodStart: {
    type: DataTypes.DATE,
    allowNull: false
  },
  billingPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: false
  },
  issueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'KES'
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'draft'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'partial', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('mpesa', 'bank', 'cash', 'card'),
    allowNull: true
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  pdfPath: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  remindersSent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lastReminderAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'invoices',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

// Instance methods
Invoice.prototype.calculateTotal = function () {
  const subtotal = parseFloat(this.subtotal) || 0;
  const taxAmount = parseFloat(this.taxAmount) || 0;
  const discountAmount = parseFloat(this.discountAmount) || 0;

  this.totalAmount = subtotal + taxAmount - discountAmount;
  return this.totalAmount;
};

Invoice.prototype.markAsPaid = async function (paymentAmount, paymentMethod = 'mpesa') {
  this.paidAmount = paymentAmount;
  this.paymentMethod = paymentMethod;
  this.paidAt = new Date();

  if (paymentAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
    this.status = 'paid';
  } else {
    this.paymentStatus = 'partial';
  }

  return await this.save();
};

Invoice.prototype.isOverdue = function () {
  return new Date() > new Date(this.dueDate) && this.status !== 'paid';
};

Invoice.prototype.getDaysOverdue = function () {
  if (!this.isOverdue()) return 0;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
};

Invoice.prototype.getFormattedAmount = function () {
  return `KES ${parseFloat(this.totalAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
};

Invoice.prototype.getFormattedPaidAmount = function () {
  return `KES ${parseFloat(this.paidAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
};

Invoice.prototype.getRemainingAmount = function () {
  return parseFloat(this.totalAmount) - parseFloat(this.paidAmount);
};

Invoice.prototype.getFormattedRemainingAmount = function () {
  return `KES ${this.getRemainingAmount().toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
};

// Static methods
Invoice.generateInvoiceNumber = async function () {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // Find the last invoice for this month
  const lastInvoice = await Invoice.findOne({
    where: {
      invoiceNumber: {
        [sequelize.Sequelize.Op.like]: `${prefix}${year}${month}%`
      }
    },
    order: [['invoiceNumber', 'DESC']]
  });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${String(sequence).padStart(4, '0')}`;
};

Invoice.getOverdueInvoices = async function () {
  return await Invoice.findAll({
    where: {
      dueDate: {
        [sequelize.Sequelize.Op.lt]: new Date()
      },
      status: {
        [sequelize.Sequelize.Op.notIn]: ['paid', 'cancelled']
      }
    },
    include: ['User', 'Subscription']
  });
};

Invoice.getInvoicesByDateRange = async function (startDate, endDate) {
  return await Invoice.findAll({
    where: {
      issueDate: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    include: ['User', 'Subscription'],
    order: [['issueDate', 'DESC']]
  });
};

module.exports = Invoice;
