/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    success: false,
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500
  };

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    error.statusCode = 400;
    error.message = 'Validation failed';
    error.errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    error.statusCode = 409;
    error.message = 'Resource already exists';
    error.errors = err.errors.map(e => ({
      field: e.path,
      message: `${e.path} must be unique`
    }));
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error.statusCode = 400;
    error.message = 'Invalid reference to related resource';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.statusCode = 401;
    error.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Token expired';
  }

  // Mongoose cast error (if using MongoDB in future)
  if (err.name === 'CastError') {
    error.statusCode = 400;
    error.message = 'Invalid resource ID';
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
  }

  // In errorHandler.js
// Add this to the error handler:
  if (err.name === 'PaymentError') {
    error.statusCode = err.statusCode || 400;
    error.message = err.message;
    error.paymentId = err.paymentId;
}

  res.status(error.statusCode).json(error);
};

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};

