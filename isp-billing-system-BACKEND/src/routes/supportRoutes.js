const express = require('express');
const router = express.Router();
const controller = require('../controllers/supportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', controller.getAllTickets); // User sees own, Admin sees all
router.get('/:id', controller.getTicketById);
router.post('/', controller.createTicket);
router.put('/:id', controller.updateTicket); // Status updates
router.put('/:id/close', controller.closeTicket);

module.exports = router;
