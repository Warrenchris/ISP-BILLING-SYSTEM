const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "warn";
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
  
  // Error log file transport
  new DailyRotateFile({
    filename: path.join(__dirname, "../../logs/error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "error",
    handleExceptions: true,
    json: false,
    maxSize: "20m",
    maxFiles: "14d",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  
  // Combined log file transport
  new DailyRotateFile({
    filename: path.join(__dirname, "../../logs/combined-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    handleExceptions: true,
    json: false,
    maxSize: "20m",
    maxFiles: "14d",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  
  // HTTP log file transport
  new DailyRotateFile({
    filename: path.join(__dirname, "../../logs/http-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "http",
    handleExceptions: false,
    json: false,
    maxSize: "20m",
    maxFiles: "7d",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add request logging middleware
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get("User-Agent"),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : "anonymous",
    };
    
    if (res.statusCode >= 400) {
      logger.warn(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl} - ${duration}ms`, logData);
    } else {
      logger.http(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl} - ${duration}ms`, logData);
    }
  });
  
  next();
};

// Add error logging helper
logger.logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };
  
  if (req) {
    errorData.request = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      userId: req.user ? req.user.id : "anonymous",
    };
  }
  
  logger.error("Application Error", errorData);
};

// Add database operation logging
logger.logDatabase = (operation, table, data = {}) => {
  logger.debug(`Database ${operation} on ${table}`, {
    operation,
    table,
    data: JSON.stringify(data),
    timestamp: new Date().toISOString(),
  });
};

// Add payment logging
logger.logPayment = (action, paymentData) => {
  logger.info(`Payment ${action}`, {
    action,
    paymentId: paymentData.id,
    amount: paymentData.amount,
    status: paymentData.status,
    userId: paymentData.userId,
    timestamp: new Date().toISOString(),
  });
};

// Add security logging
logger.logSecurity = (event, details) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

module.exports = logger;

