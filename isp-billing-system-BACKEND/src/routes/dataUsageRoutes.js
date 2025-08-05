const express = require("express");
const router = express.Router();

// Import controllers
const {
  startSession,
  updateUsage,
  endSession,
  getCurrentUsage,
  getUsageAnalytics,
  getUsageHistory,
  getActiveSessions,
  getSystemStats,
  terminateSession
} = require("../controllers/dataUsageController");

// Import middleware
const { authenticate, authorize } = require("../middleware/auth");
const {
  validateSessionStart,
  validateUsageUpdate,
  validateSessionEnd,
  validateUsageHistory,
  validateAnalytics,
  validateCurrentUsage,
  validateSystemStats,
  validateSessionTermination,
  validateDateRange,
  validateUsageData
} = require("../middleware/dataUsageValidation");

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Data Usage
 *   description: Real-time data usage tracking and management
 */

// Session management routes
/**
 * @swagger
 * /usage/sessions:
 *   post:
 *     summary: Start a new data usage session
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *               - ipAddress
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174002"
 *               ipAddress:
 *                 type: string
 *                 format: ipv4
 *                 example: "192.168.1.100"
 *               deviceInfo:
 *                 type: string
 *                 example: "Chrome on Windows"
 *               location:
 *                 type: string
 *                 example: "Nairobi, Kenya"
 *     responses:
 *       201:
 *         description: Data usage session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Data usage session started
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       $ref: "#/components/schemas/DataUsage"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post("/sessions", validateSessionStart, startSession);

/**
 * @swagger
 * /usage/sessions/{sessionId}:
 *   put:
 *     summary: Update data usage for an active session
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the data usage session to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bytesDownloaded
 *               - bytesUploaded
 *             properties:
 *               bytesDownloaded:
 *                 type: integer
 *                 example: 1024000000 # 1 GB in bytes
 *               bytesUploaded:
 *                 type: integer
 *                 example: 512000000 # 0.5 GB in bytes
 *               signalStrength:
 *                 type: number
 *                 format: float
 *                 example: -55.0
 *               latency:
 *                 type: integer
 *                 example: 30
 *               speed:
 *                 type: number
 *                 format: float
 *                 example: 45.5
 *     responses:
 *       200:
 *         description: Data usage updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Data usage updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       $ref: "#/components/schemas/DataUsage"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.put("/sessions/:sessionId", 
  validateUsageUpdate, 
  validateUsageData, 
  updateUsage
);

/**
 * @swagger
 * /usage/sessions/{sessionId}/end:
 *   post:
 *     summary: End a data usage session
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the data usage session to end
 *     responses:
 *       200:
 *         description: Data usage session ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Data usage session ended
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       $ref: "#/components/schemas/DataUsage"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post("/sessions/:sessionId/end", validateSessionEnd, endSession);

/**
 * @swagger
 * /usage/sessions/{sessionId}:
 *   delete:
 *     summary: Terminate a data usage session (Admin only)
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the data usage session to terminate
 *     responses:
 *       200:
 *         description: Data usage session terminated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Data usage session terminated
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.delete("/sessions/:sessionId", 
  authorize(["admin"]), 
  validateSessionTermination, 
  terminateSession
);

// Usage information routes
/**
 * @swagger
 * /usage/current:
 *   get:
 *     summary: Get current data usage for the authenticated user
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current data usage retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Current data usage retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentUsage:
 *                       type: object
 *                       properties:
 *                         totalUsed:
 *                           type: integer
 *                           example: 1073741824 # 1 GB
 *                         remainingData:
 *                           type: integer
 *                           example: 9663676416 # 9 GB
 *                         planLimit:
 *                           type: integer
 *                           example: 10737418240 # 10 GB
 *                         percentageUsed:
 *                           type: number
 *                           format: float
 *                           example: 10.0
 *                         sessionCount:
 *                           type: integer
 *                           example: 5
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/current", validateCurrentUsage, getCurrentUsage);

/**
 * @swagger
 * /usage/analytics:
 *   get:
 *     summary: Get data usage analytics for the authenticated user
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *           default: monthly
 *         description: Aggregation period for analytics
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Data usage analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Data usage analytics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2023-10-26"
 *                           totalUsed:
 *                             type: integer
 *                             example: 5368709120 # 5 GB
 *                           downloaded:
 *                             type: integer
 *                             example: 4294967296 # 4 GB
 *                           uploaded:
 *                             type: integer
 *                             example: 1073741824 # 1 GB
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/analytics", validateAnalytics, getUsageAnalytics);

/**
 * @swagger
 * /usage/history:
 *   get:
 *     summary: Get data usage history for the authenticated user
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for history (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for history (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Data usage history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Data usage history retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     history:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/DataUsage"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         currentPage:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/history", 
  validateUsageHistory, 
  validateDateRange, 
  getUsageHistory
);

/**
 * @swagger
 * /usage/sessions/active:
 *   get:
 *     summary: Get active data usage sessions for the authenticated user
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active data usage sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Active sessions retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/DataUsage"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/sessions/active", getActiveSessions);

// Admin routes
/**
 * @swagger
 * /usage/stats/system:
 *   get:
 *     summary: Get system-wide data usage statistics (Admin only)
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *           default: monthly
 *         description: Aggregation period for system statistics
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: System-wide data usage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: System-wide usage statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 1000
 *                     totalDataUsed:
 *                       type: integer
 *                       example: 1099511627776 # 1 TB
 *                     activeSessions:
 *                       type: integer
 *                       example: 50
 *                     dailyAverageUsage:
 *                       type: integer
 *                       example: 10737418240 # 10 GB
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/stats/system", 
  authorize(["admin"]), 
  validateSystemStats, 
  getSystemStats
);

// Health check route
/**
 * @swagger
 * /usage/health:
 *   get:
 *     summary: Health check for data usage service
 *     tags: [Data Usage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data usage service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Data usage service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: data-usage-tracking
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Data usage service is healthy",
    timestamp: new Date().toISOString(),
    service: "data-usage-tracking"
  });
});

module.exports = router;


