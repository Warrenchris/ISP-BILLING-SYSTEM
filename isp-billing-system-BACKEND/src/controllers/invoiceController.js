const { Invoice, InvoiceItem, User, Subscription, DataPlan } = require('../models');
const billingService = require('../services/billingService');
const { Op } = require('sequelize');
const moment = require('moment');
const PDFDocument = require('pdfkit');

/**
 * Generate invoice for a subscription
 */
const generateInvoice = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { 
      billingPeriodStart, 
      billingPeriodEnd, 
      dataUsage, 
      additionalItems,
      force = false 
    } = req.body;

    // Validate subscription belongs to user (unless admin)
    if (req.user.role !== 'admin') {
      const subscription = await Subscription.findOne({
        where: {
          id: subscriptionId,
          userId: req.userId
        }
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }
    }

    const invoice = await billingService.generateInvoice(
      subscriptionId,
      new Date(billingPeriodStart),
      new Date(billingPeriodEnd),
      {
        dataUsage,
        additionalItems,
        force
      }
    );

    // Load complete invoice with items
    const completeInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: User, as: 'User' },
        { model: Subscription, as: 'Subscription', include: [{ model: DataPlan, as: 'plan' }] },
        { model: InvoiceItem, as: 'Items' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        invoice: completeInvoice
      }
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
};

/**
 * Get user's invoices
 */
const generateInvoicePDF = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // Your logic here to fetch the invoice and generate a PDF
    return res.status(200).json({
      success: true,
      message: `PDF generation not yet implemented`,
      invoiceId
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getUserInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    // Create base where clause
    const whereClause = {};

    // Non-admin users can only see their own invoices
    if (req.user.role !== 'admin') {
      whereClause.userId = req.user.id;
    }

    // Add optional filters
    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.issueDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Subscription, 
          as: 'Subscription', 
          include: [{ model: DataPlan, as: 'plan' }] 
        },
        { model: InvoiceItem, as: 'Items' }
      ],
      order: [['issueDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: page * limit < count,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
};

/**
 * Get invoice by ID
 */
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const whereClause = { id };
    
    // Non-admin users can only see their own invoices
    if (req.user.role !== 'admin') {
      whereClause.userId = req.user.userId;
    }

    const invoice = await Invoice.findOne({
      where: whereClause,
      include: [
        { model: User, as: 'User' },
        { model: Subscription, as: 'Subscription', include: [{ model: DataPlan, as: 'plan' }] },
        { model: InvoiceItem, as: 'Items' }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: {
        invoice
      }
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message
    });
  }
};

/**
 * Update invoice status
 */
const updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.status = status;
    if (notes) {
      invoice.notes = notes;
    }

    if (status === 'sent') {
      invoice.sentAt = new Date();
    }

    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice status updated successfully',
      data: {
        invoice
      }
    });

  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice status',
      error: error.message
    });
  }
};

/**
 * Mark invoice as paid
 */
const markInvoiceAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount, paymentMethod = 'mpesa', notes } = req.body;

    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Subscription, as: 'Subscription' }]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await invoice.markAsPaid(paidAmount, paymentMethod);

    if (notes) {
      invoice.notes = notes;
      await invoice.save();
    }

    // If fully paid and subscription exists, activate it
    if (invoice.paymentStatus === 'paid' && invoice.Subscription) {
      await invoice.Subscription.activateSubscription();
    }

    res.json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: {
        invoice
      }
    });

  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark invoice as paid',
      error: error.message
    });
  }
};

/**
 * Generate bulk invoices (Admin only)
 */
const generateBulkInvoices = async (req, res) => {
  try {
    const { billingDate } = req.body;
    const date = billingDate ? new Date(billingDate) : new Date();

    const results = await billingService.generateBulkInvoices(date);

    res.json({
      success: true,
      message: 'Bulk invoice generation completed',
      data: results
    });

  } catch (error) {
    console.error('Error generating bulk invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bulk invoices',
      error: error.message
    });
  }
};

/**
 * Get all invoices (Admin only)
 */
const getAllInvoices = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate,
      userId,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (startDate && endDate) {
      whereClause.issueDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (search) {
      whereClause[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } },
        { '$User.email$': { [Op.like]: `%${search}%` } },
        { '$User.first_name$': { [Op.like]: `%${search}%` } },
        { '$User.last_name$': { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'User' },
        { model: Subscription, as: 'Subscription', include: [{ model: DataPlan, as: 'plan' }] },
        { model: InvoiceItem, as: 'Items' }
      ],
      order: [['issueDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: page * limit < count,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching all invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
};

/**
 * Get overdue invoices (Admin only)
 */
const getOverdueInvoices = async (req, res) => {
  try {
    const overdueInvoices = await Invoice.getOverdueInvoices();

    res.json({
      success: true,
      data: {
        invoices: overdueInvoices,
        count: overdueInvoices.length
      }
    });

  } catch (error) {
    console.error('Error fetching overdue invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue invoices',
      error: error.message
    });
  }
};

/**
 * Mark overdue invoices (Admin only)
 */
const markOverdueInvoices = async (req, res) => {
  try {
    const overdueInvoices = await billingService.markOverdueInvoices();

    res.json({
      success: true,
      message: `Marked ${overdueInvoices.length} invoices as overdue`,
      data: {
        count: overdueInvoices.length,
        invoices: overdueInvoices
      }
    });

  } catch (error) {
    console.error('Error marking overdue invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark overdue invoices',
      error: error.message
    });
  }
};

/**
 * Send payment reminders (Admin only)
 */
const sendPaymentReminders = async (req, res) => {
  try {
    const results = await billingService.sendPaymentReminders();

    res.json({
      success: true,
      message: `Sent ${results.length} payment reminders`,
      data: {
        count: results.length,
        reminders: results
      }
    });

  } catch (error) {
    console.error('Error sending payment reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send payment reminders',
      error: error.message
    });
  }
};

/**
 * Get billing statistics (Admin only)
 */
const getBillingStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();

    const stats = await billingService.getBillingStatistics(start, end);

    res.json({
      success: true,
      data: {
        statistics: stats,
        period: {
          startDate: start,
          endDate: end
        }
      }
    });

  } catch (error) {
    console.error('Error fetching billing statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing statistics',
      error: error.message
    });
  }
};

module.exports = {
  generateInvoice,
  generateInvoicePDF,
  getUserInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  markInvoiceAsPaid,
  generateBulkInvoices,
  getAllInvoices,
  getOverdueInvoices,
  markOverdueInvoices,
  sendPaymentReminders,
  getBillingStatistics
};

