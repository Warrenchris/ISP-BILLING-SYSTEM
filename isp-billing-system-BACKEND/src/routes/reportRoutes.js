const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize(['admin']));

router.get('/summary', controller.getReportsSummary);
router.get('/revenue-chart', controller.getRevenueChart);
router.get('/user-growth-chart', controller.getUserGrowthChart);
router.get('/revenue', controller.getRevenueStats);
router.get('/growth', controller.getSubscriberGrowth);

module.exports = router;
