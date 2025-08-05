const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Validate session start request
 */
const validateSessionStart = [
  body('subscriptionId')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
  
  body('connectionType')
    .optional()
    .isIn(['wifi', '4g', '3g', '2g', 'fiber', 'unknown'])
    .withMessage('Connection type must be one of: wifi, 4g, 3g, 2g, fiber, unknown'),
  
  body('deviceInfo')
    .optional()
    .isObject()
    .withMessage('Device info must be an object'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  body('quality')
    .optional()
    .isObject()
    .withMessage('Quality must be an object'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  
  handleValidationErrors
];

/**
 * Validate usage update request
 */
const validateUsageUpdate = [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isLength({ min: 10, max: 50 })
    .withMessage('Session ID must be between 10 and 50 characters'),
  
  body('bytesDownloaded')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bytes downloaded must be a non-negative integer'),
  
  body('bytesUploaded')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bytes uploaded must be a non-negative integer'),
  
  body('quality')
    .optional()
    .isObject()
    .withMessage('Quality must be an object'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  
  handleValidationErrors
];

/**
 * Validate session end request
 */
const validateSessionEnd = [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isLength({ min: 10, max: 50 })
    .withMessage('Session ID must be between 10 and 50 characters'),
  
  body('reason')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Reason must be between 1 and 100 characters'),
  
  handleValidationErrors
];

/**
 * Validate usage history query parameters
 */
const validateUsageHistory = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('subscriptionId')
    .optional()
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('status')
    .optional()
    .isIn(['active', 'completed', 'terminated', 'error'])
    .withMessage('Status must be one of: active, completed, terminated, error'),
  
  handleValidationErrors
];

/**
 * Validate analytics query parameters
 */
const validateAnalytics = [
  query('period')
    .optional()
    .isIn(['24hours', '7days', '30days', 'thisMonth'])
    .withMessage('Period must be one of: 24hours, 7days, 30days, thisMonth'),
  
  handleValidationErrors
];

/**
 * Validate current usage query parameters
 */
const validateCurrentUsage = [
  query('subscriptionId')
    .optional()
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
  
  handleValidationErrors
];

/**
 * Validate system stats query parameters
 */
const validateSystemStats = [
  query('period')
    .optional()
    .isIn(['24hours', '7days', '30days'])
    .withMessage('Period must be one of: 24hours, 7days, 30days'),
  
  handleValidationErrors
];

/**
 * Validate session termination request
 */
const validateSessionTermination = [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isLength({ min: 10, max: 50 })
    .withMessage('Session ID must be between 10 and 50 characters'),
  
  body('reason')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Reason must be between 1 and 100 characters'),
  
  handleValidationErrors
];

/**
 * Custom validation for date range
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }
    
    // Limit date range to 1 year
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end - start > oneYear) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 1 year'
      });
    }
  }
  
  next();
};

/**
 * Validate usage update data
 */
const validateUsageData = (req, res, next) => {
  const { bytesDownloaded, bytesUploaded } = req.body;
  
  // At least one usage metric should be provided
  if (!bytesDownloaded && !bytesUploaded) {
    return res.status(400).json({
      success: false,
      message: 'At least one of bytesDownloaded or bytesUploaded must be provided'
    });
  }
  
  // Validate reasonable usage amounts (max 10GB per update)
  const maxBytes = 10 * 1024 * 1024 * 1024; // 10GB
  
  if (bytesDownloaded && bytesDownloaded > maxBytes) {
    return res.status(400).json({
      success: false,
      message: 'Bytes downloaded exceeds maximum allowed per update (10GB)'
    });
  }
  
  if (bytesUploaded && bytesUploaded > maxBytes) {
    return res.status(400).json({
      success: false,
      message: 'Bytes uploaded exceeds maximum allowed per update (10GB)'
    });
  }
  
  next();
};

module.exports = {
  validateSessionStart,
  validateUsageUpdate,
  validateSessionEnd,
  validateUsageHistory,
  validateAnalytics,
  validateCurrentUsage,
  validateSystemStats,
  validateSessionTermination,
  validateDateRange,
  validateUsageData,
  handleValidationErrors
};

