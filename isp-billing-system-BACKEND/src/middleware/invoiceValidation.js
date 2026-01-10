const { body, param, query, validationResult } = require('express-validator');
const { Invoice } = require('../models');
const { InvoiceStatus } = require('../config/constants');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Validate invoice generation request
 */
const validateInvoiceGeneration = [
  param('subscriptionId')
    .isUUID()
    .withMessage('Valid subscription ID is required'),

  body('billingPeriodStart')
    .isISO8601()
    .withMessage('Valid billing period start date is required')
    .custom((value, { req }) => {
      const startDate = new Date(value);
      const endDate = new Date(req.body.billingPeriodEnd);

      if (startDate >= endDate) {
        throw new Error('Billing period start must be before end date');
      }

      return true;
    }),

  body('billingPeriodEnd')
    .isISO8601()
    .withMessage('Valid billing period end date is required'),

  body('dataUsage')
    .optional()
    .isNumeric()
    .withMessage('Data usage must be a number')
    .custom(value => {
      if (value < 0) {
        throw new Error('Data usage cannot be negative');
      }
      return true;
    }),

  body('additionalItems')
    .optional()
    .isArray()
    .withMessage('Additional items must be an array'),

  body('additionalItems.*.description')
    .if(body('additionalItems').exists())
    .notEmpty()
    .withMessage('Item description is required')
    .isLength({ max: 255 })
    .withMessage('Item description must not exceed 255 characters'),

  body('additionalItems.*.itemType')
    .if(body('additionalItems').exists())
    .isIn(['subscription', 'data_plan', 'overage', 'installation', 'equipment', 'penalty', 'discount', 'tax'])
    .withMessage('Invalid item type'),

  body('additionalItems.*.quantity')
    .if(body('additionalItems').exists())
    .isNumeric()
    .withMessage('Item quantity must be a number')
    .custom(value => {
      if (value <= 0) {
        throw new Error('Item quantity must be greater than 0');
      }
      return true;
    }),

  body('additionalItems.*.unitPrice')
    .if(body('additionalItems').exists())
    .isNumeric()
    .withMessage('Item unit price must be a number')
    .custom(value => {
      if (value < 0) {
        throw new Error('Item unit price cannot be negative');
      }
      return true;
    }),

  body('force')
    .optional()
    .isBoolean()
    .withMessage('Force flag must be a boolean'),

  handleValidationErrors
];

/**
 * Validate invoice status update
 */
const validateInvoiceStatusUpdate = [
  param('id')
    .isUUID()
    .withMessage('Valid invoice ID is required'),

  body('status')
    .isIn(Object.values(InvoiceStatus))
    .withMessage('Invalid invoice status'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),

  handleValidationErrors
];

/**
 * Validate mark invoice as paid
 */
const validateMarkAsPaid = [
  param('id')
    .isUUID()
    .withMessage('Valid invoice ID is required'),

  body('paidAmount')
    .isNumeric()
    .withMessage('Paid amount must be a number')
    .custom(value => {
      if (value <= 0) {
        throw new Error('Paid amount must be greater than 0');
      }
      return true;
    }),

  body('paymentMethod')
    .optional()
    .isIn(['mpesa', 'bank', 'cash', 'card'])
    .withMessage('Invalid payment method'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),

  handleValidationErrors
];

/**
 * Validate bulk invoice generation
 */
const validateBulkInvoiceGeneration = [
  body('billingDate')
    .optional()
    .isISO8601()
    .withMessage('Valid billing date is required'),

  handleValidationErrors
];

/**
 * Validate invoice query parameters
 */
const validateInvoiceQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(Object.values(InvoiceStatus))
    .withMessage('Invalid status filter'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);

        if (startDate >= endDate) {
          throw new Error('End date must be after start date');
        }
      }

      return true;
    }),

  query('userId')
    .optional()
    .isUUID()
    .withMessage('Valid user ID is required'),

  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  handleValidationErrors
];

/**
 * Validate invoice ID parameter
 */
const validateInvoiceId = [
  param('id')
    .isUUID()
    .withMessage('Valid invoice ID is required'),

  handleValidationErrors
];

/**
 * Check if invoice exists and user has access
 */
const checkInvoiceAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const whereClause = { id };

    // Non-admin users can only access their own invoices
    if (userRole !== 'admin') {
      whereClause.userId = userId;
    }

    const invoice = await Invoice.findOne({
      where: whereClause
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found or access denied'
      });
    }

    req.invoice = invoice;
    next();
  } catch (error) {
    console.error('Error checking invoice access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify invoice access',
      error: error.message
    });
  }
};

/**
 * Validate date range for statistics
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);

        if (startDate >= endDate) {
          throw new Error('End date must be after start date');
        }

        // Limit date range to 1 year
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        if (endDate - startDate > oneYear) {
          throw new Error('Date range cannot exceed 1 year');
        }
      }

      return true;
    }),

  handleValidationErrors
];

module.exports = {
  validateInvoiceGeneration,
  validateInvoiceStatusUpdate,
  validateMarkAsPaid,
  validateBulkInvoiceGeneration,
  validateInvoiceQuery,
  validateInvoiceId,
  validateDateRange,
  checkInvoiceAccess,
  handleValidationErrors
};

