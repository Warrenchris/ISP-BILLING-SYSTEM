const express = require('express');
const router = express.Router();
const controller = require('../controllers/supportController');
const { authenticate, authorize } = require('../middleware/auth');

// All support routes require authentication
router.use(authenticate);

// ─── Metadata / config routes (must be before /:id to avoid conflicts) ───────
router.get('/categories',    controller.getCategories);
router.get('/priorities',    controller.getPriorities);
router.get('/statuses',      controller.getStatuses);
router.get('/labels-config', controller.getLabelsConfig);

// Staff list for assignment dropdowns (admin & support only)
router.get('/staff', authorize(['admin', 'support']), controller.getStaff);

// ─── Ticket CRUD ──────────────────────────────────────────────────────────────
router.get('/',    controller.getAllTickets);
router.post('/',   controller.createTicket);
router.get('/:id/replies', controller.getReplies);
router.post('/:id/replies', controller.addReply);
router.get('/:id', controller.getTicketById);
router.put('/:id', controller.updateTicket);

// ─── Ticket actions ───────────────────────────────────────────────────────────
router.put('/:id/close',  controller.closeTicket);
router.put('/:id/assign', authorize(['admin', 'support']), controller.assignTicket);
router.delete('/:id',     authorize(['admin', 'support']), controller.deleteTicket);

module.exports = router;
