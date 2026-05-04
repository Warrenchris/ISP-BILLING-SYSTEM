const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', authenticate, dashboardController.getDashboardStats);
router.get('/usage-history', authenticate, dashboardController.getUsageHistory);

module.exports = router;
