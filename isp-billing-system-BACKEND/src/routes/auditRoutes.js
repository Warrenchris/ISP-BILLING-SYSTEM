const express = require('express');
const router = express.Router();
const controller = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize(['admin']));

router.get('/', controller.getAllLogs);
router.get('/:id', controller.getLogById);

module.exports = router;
