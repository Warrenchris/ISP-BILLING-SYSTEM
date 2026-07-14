/**
 * SMS Routes
 *
 * Exposes SMS logging, costing, and templating paths.
 * All routes are restricted to authenticated administrators.
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  listLogs,
  getStats,
  listTemplates,
  updateTemplate,
} = require('../controllers/smsController');

router.use(authenticate, authorize(['admin']));

// GET  /api/admin/sms/logs      - Audit SMS logs
router.get('/logs', listLogs);

// GET  /api/admin/sms/stats     - SMS costing and counts metrics
router.get('/stats', getStats);

// GET  /api/admin/sms/templates - Fetch current templates
router.get('/templates', listTemplates);

// PUT  /api/admin/sms/templates/:key - Update a template
router.put('/templates/:key', updateTemplate);

module.exports = router;
