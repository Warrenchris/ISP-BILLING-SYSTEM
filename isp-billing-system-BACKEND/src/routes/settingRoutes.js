const express = require('express');
const router = express.Router();
const controller = require('../controllers/settingController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize(['admin']));

router.get('/', controller.getSettings);
router.put('/', controller.updateSetting); // Generic update

// Specifics
router.get('/company', controller.getCompanyInfo);
router.put('/company', controller.updateCompanyInfo);

router.get('/payments', controller.getPaymentSettings);
router.put('/payments', controller.updatePaymentSettings);

module.exports = router;
