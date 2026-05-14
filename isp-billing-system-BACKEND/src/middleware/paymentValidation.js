const { body, param, validationResult } = require('express-validator');
const { Payment } = require('../models');

/**
 * Validation middleware for initiating subscription payment
 */
const validateSubscriptionPayment = [
  body('subscriptionId')
    .notEmpty()
    .withMessage('Subscription ID is required')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
    
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(?:254|\+254|0)?(7[0-9]{8})$/)
    .withMessage('Phone number must be a valid Kenyan number (e.g., 0712345678, +254712345678, or 254712345678)'),
  // Amount is derived server-side from the plan; optional on the wire for subscription flow
  body('amount')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least KES 1'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        received: req.body,
      });
    }
    next();
  }
];

/**
 * Validation for direct STK push (admin / Payments page) — no subscriptionId
 */
const validateMpesaStkInitiate = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(?:254|\+254|0)?(7[0-9]{8})$/)
    .withMessage('Phone number must be a valid Kenyan number (e.g., 0712345678, +254712345678, or 254712345678)'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least KES 1'),
  body('accountReference').optional().isString().isLength({ max: 100 }),
  body('transactionDesc').optional().isString().isLength({ max: 255 }),
  body('description').optional().isString().isLength({ max: 255 }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        received: req.body,
      });
    }
    next();
  }
];

/**
 * Validation middleware for payment retry
 */
const validatePaymentRetry = [
  param('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isUUID()
    .withMessage('Payment ID must be a valid UUID'),
    
  body('phoneNumber')
    .optional()
    .matches(/^(\+254|254|0)[0-9]{9}$/)
    .withMessage('Phone number must be a valid Kenyan number if provided'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validation middleware for payment status query
 */
const validatePaymentQuery = [
  param('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isUUID()
    .withMessage('Payment ID must be a valid UUID'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validation middleware for payment history query
 */
const validatePaymentHistory = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  body('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'])
    .withMessage('Status must be one of: pending, processing, completed, failed, cancelled, expired'),
    
  body('paymentType')
    .optional()
    .isIn(['subscription', 'top_up', 'penalty', 'installation'])
    .withMessage('Payment type must be one of: subscription, top_up, penalty, installation'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validation middleware for direct payment (top-up, etc.)
 */
const validateDirectPayment = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least KES 1'),
    
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(\+254|254|0)[0-9]{9}$/)
    .withMessage('Phone number must be a valid Kenyan number'),
    
  body('paymentType')
    .notEmpty()
    .withMessage('Payment type is required')
    .isIn(['top_up', 'penalty', 'installation'])
    .withMessage('Payment type must be one of: top_up, penalty, installation'),
    
  body('description')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
    
  body('reference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Reference must not exceed 100 characters'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Middleware to validate M-Pesa callback structure
 */
const validateMpesaCallback = async (req, res, next) => {
  try {
    const { Body } = req.body;
    
    if (!Body || !Body.stkCallback) {
      console.warn('Invalid callback structure received:', req.body);
      return res.status(200).json({
        ResultCode: 1,
        ResultDesc: 'Invalid callback structure'
      });
    }
    
    const { stkCallback } = Body;
    const { CheckoutRequestID, MerchantRequestID } = stkCallback;
    
    if (!CheckoutRequestID || !MerchantRequestID) {
      console.warn('Missing required callback fields:', stkCallback);
      return res.status(200).json({
        ResultCode: 1,
        ResultDesc: 'Missing required callback fields'
      });
    }
    
    // Check if CheckoutRequestID exists and is PENDING
    const payment = await Payment.findOne({
      where: { checkoutRequestId: CheckoutRequestID }
    });

    if (!payment) {
      console.warn(`Callback rejected: Unknown CheckoutRequestID: ${CheckoutRequestID}`);
      return res.status(200).json({
        ResultCode: 1,
        ResultDesc: 'Unknown transaction'
      });
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      console.warn(`Callback rejected: Payment already processed for CheckoutRequestID: ${CheckoutRequestID}. Current status: ${payment.status}`);
      return res.status(200).json({
        ResultCode: 1,
        ResultDesc: 'Transaction already processed'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error validating M-Pesa callback:', error);
    return res.status(200).json({
      ResultCode: 1,
      ResultDesc: 'Internal validation error'
    });
  }
};

/**
 * Middleware to validate phone number format and normalize it
 */
const normalizePhoneNumber = (req, res, next) => {
  try {
    if (req.body.phoneNumber) {
      let phoneNumber = req.body.phoneNumber.toString().trim();
      
      // Remove any spaces, dashes, or plus signs
      phoneNumber = phoneNumber.replace(/[\s\-\+]/g, '');
      
      // Convert to 254 format
      if (phoneNumber.startsWith('0')) {
        phoneNumber = `254${phoneNumber.slice(1)}`;
      } else if (phoneNumber.startsWith('7') || phoneNumber.startsWith('1')) {
        phoneNumber = `254${phoneNumber}`;
      }
      
      // Validate final format
      if (!/^254[0-9]{9}$/.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format. Please use a valid Kenyan number.'
        });
      }
      
      req.body.phoneNumber = phoneNumber;
    }
    
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Error processing phone number'
    });
  }
};

/**
 * Middleware to check M-Pesa service configuration
 */
const checkMpesaConfig = (req, res, next) => {
  const requiredVars = [
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_CALLBACK_URL'
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  
  const hasShortcode = process.env.MPESA_BUSINESS_SHORT_CODE || process.env.MPESA_SHORTCODE;
  if (missing.length > 0 || !hasShortcode) {
    return res.status(503).json({
      error: 'M-Pesa integration not configured. Please contact admin.',
      code: 'MPESA_NOT_CONFIGURED'
    });
  }
  next();
};
module.exports = {
  validateSubscriptionPayment,
  validateMpesaStkInitiate,
  validatePaymentRetry,
  validatePaymentQuery,
  validatePaymentHistory,
  validateDirectPayment,
  validateMpesaCallback,
  normalizePhoneNumber,
  checkMpesaConfig
};

