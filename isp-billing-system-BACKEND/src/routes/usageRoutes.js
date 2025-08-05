const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');
const { authenticateToken } = require('../middleware/auth');

// All usage routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/usage/current
 * @desc    Get current data usage for authenticated user
 * @access  Private
 */
router.get('/current', usageController.getCurrentUsage);

/**
 * @route   GET /api/usage/history
 * @desc    Get usage history for authenticated user
 * @access  Private
 * @query   period - Time period (7d, 30d, 90d)
 * @query   page - Page number for pagination
 * @query   limit - Items per page
 */
router.get('/history', usageController.getUsageHistory);

/**
 * @route   GET /api/usage/analytics
 * @desc    Get usage analytics for authenticated user
 * @access  Private
 * @query   period - Time period (7d, 30d, 90d)
 */
router.get('/analytics', usageController.getUsageAnalytics);

/**
 * @route   POST /api/usage/sessions
 * @desc    Start a new usage session
 * @access  Private
 */
router.post('/sessions', usageController.startSession);

/**
 * @route   PUT /api/usage/sessions/:sessionId
 * @desc    Update usage session
 * @access  Private
 */
router.put('/sessions/:sessionId', usageController.updateSession);

/**
 * @route   POST /api/usage/sessions/:sessionId/end
 * @desc    End usage session
 * @access  Private
 */
router.post('/sessions/:sessionId/end', usageController.endSession);

module.exports = router;

