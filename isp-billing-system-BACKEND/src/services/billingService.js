const { Invoice, InvoiceItem, Subscription, User, DataPlan } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

class BillingService {
  constructor() {
    this.taxRate = 16; // Kenya VAT rate (16%)
    this.overageRate = 5; // KES per GB for data overage
    this.gracePeriodDays = 7; // Grace period before marking as overdue
  }

  /**
   * Generate invoice for a subscription
   */
  async generateInvoice(subscriptionId, billingPeriodStart, billingPeriodEnd, options = {}) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId, {
        include: [
          { model: User, as: 'User' },
          { model: DataPlan, as: 'DataPlan' }
        ]
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check if invoice already exists for this period
      const existingInvoice = await Invoice.findOne({
        where: {
          subscriptionId: subscriptionId,
          billingPeriodStart: billingPeriodStart,
          billingPeriodEnd: billingPeriodEnd
        }
      });

      if (existingInvoice && !options.force) {
        return existingInvoice;
      }

      // Generate invoice number
      const invoiceNumber = await Invoice.generateInvoiceNumber();

      // Calculate due date (30 days from issue date)
      const issueDate = new Date();
      const dueDate = moment(issueDate).add(30, 'days').toDate();

      // Create invoice
      const invoice = await Invoice.create({
        userId: subscription.userId,
        subscriptionId: subscriptionId,
        invoiceNumber: invoiceNumber,
        billingPeriodStart: billingPeriodStart,
        billingPeriodEnd: billingPeriodEnd,
        issueDate: issueDate,
        dueDate: dueDate,
        currency: 'KES',
        status: 'draft'
      });

      // Create invoice items
      await this.addSubscriptionItems(invoice, subscription, billingPeriodStart, billingPeriodEnd);

      // Add overage charges if applicable
      if (options.dataUsage && options.dataUsage > subscription.DataPlan.dataLimit) {
        await this.addOverageItems(invoice, options.dataUsage, subscription.DataPlan.dataLimit);
      }

      // Add any additional items
      if (options.additionalItems) {
        for (const item of options.additionalItems) {
          await this.addInvoiceItem(invoice, item);
        }
      }

      // Calculate totals
      await this.calculateInvoiceTotals(invoice);

      return invoice;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  /**
   * Add subscription items to invoice
   */
  async addSubscriptionItems(invoice, subscription, billingPeriodStart, billingPeriodEnd) {
    const subscriptionItem = InvoiceItem.createSubscriptionItem(
      subscription,
      billingPeriodStart,
      billingPeriodEnd
    );

    await InvoiceItem.create({
      invoiceId: invoice.id,
      ...subscriptionItem
    });
  }

  /**
   * Add overage charges to invoice
   */
  async addOverageItems(invoice, dataUsed, dataLimit) {
    const overageItem = InvoiceItem.createOverageItem(
      dataUsed,
      dataLimit,
      this.overageRate
    );

    if (overageItem.totalPrice > 0) {
      await InvoiceItem.create({
        invoiceId: invoice.id,
        ...overageItem
      });
    }
  }

  /**
   * Add custom invoice item
   */
  async addInvoiceItem(invoice, itemData) {
    const item = await InvoiceItem.create({
      invoiceId: invoice.id,
      ...itemData
    });

    // Calculate tax and discount if rates are provided
    if (itemData.taxRate) {
      item.calculateTax();
    }
    if (itemData.discountRate) {
      item.calculateDiscount();
    }

    item.calculateTotal();
    await item.save();

    return item;
  }

  /**
   * Calculate invoice totals
   */
  async calculateInvoiceTotals(invoice) {
    const items = await InvoiceItem.findAll({
      where: { invoiceId: invoice.id }
    });

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    for (const item of items) {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const itemSubtotal = quantity * unitPrice;
      
      subtotal += itemSubtotal;
      totalTax += parseFloat(item.taxAmount) || 0;
      totalDiscount += parseFloat(item.discountAmount) || 0;
    }

    // Apply VAT to subtotal (after discounts)
    const taxableAmount = subtotal - totalDiscount;
    const vatAmount = (taxableAmount * this.taxRate) / 100;
    totalTax += vatAmount;

    // Create VAT line item if there's taxable amount
    if (vatAmount > 0) {
      await InvoiceItem.create({
        invoiceId: invoice.id,
        description: `VAT (${this.taxRate}%)`,
        itemType: 'tax',
        quantity: 1,
        unitPrice: vatAmount,
        totalPrice: vatAmount,
        taxRate: 0, // VAT item itself is not taxed
        metadata: {
          taxType: 'VAT',
          taxRate: this.taxRate,
          taxableAmount: taxableAmount
        }
      });
    }

    // Update invoice totals
    invoice.subtotal = subtotal;
    invoice.taxAmount = totalTax;
    invoice.discountAmount = totalDiscount;
    invoice.calculateTotal();

    await invoice.save();
    return invoice;
  }

  /**
   * Generate invoices for all active subscriptions
   */
  async generateBulkInvoices(billingDate = new Date()) {
    try {
      const results = {
        success: [],
        errors: [],
        total: 0
      };

      // Get all active subscriptions that need billing
      const subscriptions = await this.getSubscriptionsForBilling(billingDate);
      results.total = subscriptions.length;

      for (const subscription of subscriptions) {
        try {
          const { billingPeriodStart, billingPeriodEnd } = this.calculateBillingPeriod(
            subscription,
            billingDate
          );

          const invoice = await this.generateInvoice(
            subscription.id,
            billingPeriodStart,
            billingPeriodEnd,
            {
              dataUsage: subscription.dataUsed || 0
            }
          );

          results.success.push({
            subscriptionId: subscription.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount
          });

        } catch (error) {
          results.errors.push({
            subscriptionId: subscription.id,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in bulk invoice generation:', error);
      throw error;
    }
  }

  /**
   * Get subscriptions that need billing
   */
  async getSubscriptionsForBilling(billingDate) {
    const startOfDay = moment(billingDate).startOf('day').toDate();
    const endOfDay = moment(billingDate).endOf('day').toDate();

    return await Subscription.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          {
            // Monthly billing - check if it's the billing day of the month
            '$DataPlan.plan_type$': 'postpaid',
            renewalDate: {
              [Op.between]: [startOfDay, endOfDay]
            }
          },
          {
            // Prepaid that has expired and needs renewal
            '$DataPlan.plan_type$': 'prepaid',
            endDate: {
              [Op.lte]: endOfDay
            }
          }
        ]
      },
      include: [
        { model: User, as: 'User' },
        { model: DataPlan, as: 'DataPlan' }
      ]
    });
  }

  /**
   * Calculate billing period for subscription
   */
  calculateBillingPeriod(subscription, billingDate) {
    const planType = subscription.DataPlan.planType;
    const validityPeriod = subscription.DataPlan.validityPeriod;

    if (planType === 'postpaid') {
      // Monthly billing cycle
      const billingPeriodStart = moment(billingDate).startOf('month').toDate();
      const billingPeriodEnd = moment(billingDate).endOf('month').toDate();
      
      return { billingPeriodStart, billingPeriodEnd };
    } else {
      // Prepaid - bill for the validity period
      const billingPeriodStart = moment(subscription.endDate).subtract(validityPeriod, 'days').toDate();
      const billingPeriodEnd = new Date(subscription.endDate);
      
      return { billingPeriodStart, billingPeriodEnd };
    }
  }

  /**
   * Mark invoices as overdue
   */
  async markOverdueInvoices() {
    const overdueDate = moment().subtract(this.gracePeriodDays, 'days').toDate();

    const overdueInvoices = await Invoice.findAll({
      where: {
        dueDate: {
          [Op.lt]: overdueDate
        },
        status: {
          [Op.notIn]: ['paid', 'cancelled', 'overdue']
        }
      }
    });

    const results = [];
    for (const invoice of overdueInvoices) {
      invoice.status = 'overdue';
      await invoice.save();
      results.push(invoice);
    }

    return results;
  }

  /**
   * Send payment reminders
   */
  async sendPaymentReminders() {
    const reminderDate = moment().add(3, 'days').toDate(); // 3 days before due date

    const invoicesForReminder = await Invoice.findAll({
      where: {
        dueDate: {
          [Op.lte]: reminderDate
        },
        status: {
          [Op.in]: ['sent', 'overdue']
        },
        remindersSent: {
          [Op.lt]: 3 // Maximum 3 reminders
        }
      },
      include: [
        { model: User, as: 'User' },
        { model: Subscription, as: 'Subscription' }
      ]
    });

    const results = [];
    for (const invoice of invoicesForReminder) {
      try {
        // Here you would integrate with email/SMS service
        // For now, we'll just update the reminder count
        invoice.remindersSent += 1;
        invoice.lastReminderAt = new Date();
        await invoice.save();

        results.push({
          invoiceId: invoice.id,
          userId: invoice.userId,
          remindersSent: invoice.remindersSent
        });
      } catch (error) {
        console.error(`Error sending reminder for invoice ${invoice.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Get billing statistics
   */
  async getBillingStatistics(startDate, endDate) {
    const invoices = await Invoice.findAll({
      where: {
        issueDate: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    const stats = {
      totalInvoices: invoices.length,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      overdueInvoices: 0
    };

    for (const invoice of invoices) {
      const amount = parseFloat(invoice.totalAmount);
      const paidAmount = parseFloat(invoice.paidAmount);

      stats.totalAmount += amount;
      stats.paidAmount += paidAmount;

      if (invoice.status === 'paid') {
        stats.paidInvoices++;
      } else if (invoice.status === 'overdue') {
        stats.overdueInvoices++;
        stats.overdueAmount += (amount - paidAmount);
      } else {
        stats.pendingInvoices++;
        stats.pendingAmount += (amount - paidAmount);
      }
    }

    return stats;
  }
}

module.exports = new BillingService();

