const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const logger = require("./config/logger");
require("dotenv").config();

// Import middleware
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/authRoutes");
const dataPlanRoutes = require("./routes/dataPlanRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dataUsageRoutes = require("./routes/dataUsageRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.ALLOWED_ORIGINS?.split(",") || ["https://yourdomain.com"]
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Logging middleware
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", { stream: logger.stream }));
  app.use(logger.logRequest);
}

// Trust proxy for accurate IP addresses
app.set("trust proxy", 1);

// Health check endpoint
app.get("/health", (req, res) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  };

  logger.debug("Health check requested", healthCheck);
  res.json(healthCheck);
});

// Metrics endpoint (basic)
app.get("/metrics", (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    version: process.version,
    platform: process.platform,
    arch: process.arch
  };

  res.json(metrics);
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/plans", dataPlanRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/usage", dataUsageRoutes);
app.use("/api/admin", adminRoutes);

// Swagger UI
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "ISP Billing System API Documentation"
}));

// Welcome route
app.get("/", (req, res) => {
  const welcomeMessage = {
    success: true,
    message: "Welcome to ISP Billing System API",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    documentation: "/api/docs",
    endpoints: {
      auth: "/api/auth",
      plans: "/api/plans",
      subscriptions: "/api/subscriptions",
      payments: "/api/payments",
      invoices: "/api/invoices",
      usage: "/api/usage",
      health: "/health",
      metrics: "/metrics"
    }
  };

  logger.info("Welcome endpoint accessed", { ip: req.ip, userAgent: req.get("User-Agent") });
  res.json(welcomeMessage);
});

// 404 handler
app.use(notFound);

// Error handling middleware with logging
app.use((error, req, res, next) => {
  logger.logError(error, req);
  errorHandler(error, req, res, next);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
});

// Uncaught exception
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

module.exports = app;

