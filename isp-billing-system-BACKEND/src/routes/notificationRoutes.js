const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// User endpoints
router.get('/', controller.getNotifications);
router.put('/:id/read', controller.markAsRead);
router.delete('/:id', controller.deleteNotification);

// Admin endpoints (aliased to /api/admin/notifications in app.js usually, or here if we share the base path)
// If mapped to /api/notifications, we might need a specific path for all
router.get('/all', authorize(['admin']), controller.getAllSystemNotifications);

module.exports = router;
