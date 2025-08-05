const { body, param, validationResult } = require('express-validator');

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
 * Data plan creation validation rules
 */
const validateDataPlanCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Plan name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Plan name can only contain letters, numbers, spaces, hyphens, and underscores'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
    
  body('dataLimit')
    .isInt({ min: 1 })
    .withMessage('Data limit must be a positive integer (in MB)')
    .toInt(),
    
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .toFloat(),
    
  body('validityPeriod')
    .isInt({ min: 1 })
    .withMessage('Validity period must be a positive integer (in days)')
    .toInt(),
    
  body('speed')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Speed description must not exceed 50 characters'),
    
  body('planType')
    .isIn(['prepaid', 'postpaid'])
    .withMessage('Plan type must be either prepaid or postpaid'),
    
  body('category')
    .isIn(['basic', 'standard', 'premium', 'enterprise'])
    .withMessage('Category must be one of: basic, standard, premium, enterprise'),
    
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array')
    .custom((features) => {
      if (features && features.length > 0) {
        for (const feature of features) {
          if (typeof feature !== 'string' || feature.trim().length === 0) {
            throw new Error('Each feature must be a non-empty string');
          }
        }
      }
      return true;
    }),
    
  body('isPopular')
    .optional()
    .isBoolean()
    .withMessage('isPopular must be a boolean')
    .toBoolean(),
    
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
    .toInt(),
    
  handleValidationErrors
];

/**
 * Data plan update validation rules
 */
const validateDataPlanUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Plan name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Plan name can only contain letters, numbers, spaces, hyphens, and underscores'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
    
  body('dataLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Data limit must be a positive integer (in MB)')
    .toInt(),
    
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .toFloat(),
    
  body('validityPeriod')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Validity period must be a positive integer (in days)')
    .toInt(),
    
  body('speed')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Speed description must not exceed 50 characters'),
    
  body('planType')
    .optional()
    .isIn(['prepaid', 'postpaid'])
    .withMessage('Plan type must be either prepaid or postpaid'),
    
  body('category')
    .optional()
    .isIn(['basic', 'standard', 'premium', 'enterprise'])
    .withMessage('Category must be one of: basic, standard, premium, enterprise'),
    
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array')
    .custom((features) => {
      if (features && features.length > 0) {
        for (const feature of features) {
          if (typeof feature !== 'string' || feature.trim().length === 0) {
            throw new Error('Each feature must be a non-empty string');
          }
        }
      }
      return true;
    }),
    
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean(),
    
  body('isPopular')
    .optional()
    .isBoolean()
    .withMessage('isPopular must be a boolean')
    .toBoolean(),
    
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
    .toInt(),
    
  handleValidationErrors
];

/**
 * Subscription creation validation rules
 */
const validateSubscriptionCreation = [
  body('planId')
    .isUUID()
    .withMessage('Data plan ID must be a valid UUID'),
    
  body('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('Auto renew must be a boolean')
    .toBoolean(),
    
  handleValidationErrors
];

/**
 * Subscription update validation rules
 */
const validateSubscriptionUpdate = [
  body('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('Auto renew must be a boolean')
    .toBoolean(),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
    
  handleValidationErrors
];

/**
 * Data usage update validation rules
 */
const validateDataUsageUpdate = [
  body('dataUsedMB')
    .isInt({ min: 0 })
    .withMessage('Data used must be a non-negative integer (in MB)')
    .toInt(),
    
  handleValidationErrors
];

/**
 * UUID parameter validation
 */
const validateUUIDParam = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`),
    
  handleValidationErrors
];

module.exports = {
  validateDataPlanCreation,
  validateDataPlanUpdate,
  validateSubscriptionCreation,
  validateSubscriptionUpdate,
  validateDataUsageUpdate,
  validateUUIDParam,
  handleValidationErrors
};

