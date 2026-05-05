const express = require('express');
const router = express.Router();
const MpesaService = require('../services/mpesaService');
const { Payment } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validateSubscriptionPayment,
  validatePaymentRetry,
  validatePaymentQuery,
  validateDirectPayment,
  validatePaymentHistory,
  validateMpesaCallback,
  normalizePhoneNumber,
  checkMpesaConfig
} = require('../middleware/paymentValidation');
const {
  createCashPayment,
  confirmPayment,
  rejectPayment,
  patchPayment,
  getAllPayments,
  getUnlinkedPayments,
  getMpesaLimits,
  initiateSubscriptionPayment,
  queryPaymentStatus,
  recordCashPayment
} = require('../controllers/paymentController');

const mpesaService = new MpesaService();

// Admin: Get all payments (with pagination and filters)
// In paymentRoutes.js - update the admin route to handle the corrected parameter
router.get('/', authenticate, authorize(['admin']), (req, res, next) => {
  // Log the request for debugging
  console.log('Admin payments request:', {
    user: req.user?.id,
    role: req.user?.role,
    query: req.query
  });
  next();

}, getAllPayments);

// POST /api/payments/mpesa/initiate - Initiate M-Pesa payment
router.post(
  '/mpesa/initiate',
  authenticate,
  checkMpesaConfig,
  normalizePhoneNumber,
  validateSubscriptionPayment,
  async (req, res) => {
    try {
      const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

      // Add validation
      if (!phoneNumber || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and amount are required'
        });
      }

      const response = await mpesaService.initiateSTKPush({
        phoneNumber,
        amount,
        accountReference: accountReference || `ISP-${Date.now()}`,
        transactionDesc: transactionDesc || "ISP Service Payment"
      });

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('M-Pesa initiation error:', error);
      if (error.code === 'MPESA_NOT_CONFIGURED') {
        return res.status(503).json({
          error: 'Mpesa integration not configured. Please contact admin.',
          code: 'MPESA_NOT_CONFIGURED'
        });
      }
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to initiate M-Pesa payment'
      });
    }
  }
);

// POST /api/payments/subscription - Initiate subscription payment
router.post(
  '/subscription',
  authenticate,
  checkMpesaConfig,
  normalizePhoneNumber,
  validateSubscriptionPayment,
  initiateSubscriptionPayment
);

// GET /api/payments/status/:paymentId - Check payment status
router.get('/status/:paymentId', authenticate, queryPaymentStatus);

// POST /api/payments/mpesa/callback - M-Pesa callback handler
router.post('/mpesa/callback', async (req, res) => {
  try {
    const result = mpesaService.processCallback(req.body);
    await Payment.handleMpesaCallback(result);
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('Callback error:', error);
    res.json({ ResultCode: 1, ResultDesc: 'Error processing callback' });
  }
});

// GET /api/payments/history - Payment history for current user
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching payment history for:', req.user); // 👈 Add this

    const payments = await Payment.findAndCountAll({
      where: { userId: req.user.id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['initiatedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: payments.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(payments.count / limit),
        totalItems: payments.count
      }
    });
  } catch (error) {
    console.error('🔴 Error in /api/payments/history:', error); // 👈 Print full error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
});


// GET /api/payments/stats - Payment statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await Payment.getPaymentStats(req.user.id);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get payment statistics'
    });
  }
});

router.get('/mpesa/test-auth', async (req, res) => {
  try {
    const token = await mpesaService.getAccessToken();
    res.json({
      success: true,
      message: 'M-Pesa auth successful',
      environment: process.env.MPESA_ENV,
      tokenAvailable: !!token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'M-Pesa auth failed',
      error: error.message,
      environment: process.env.MPESA_ENV
    });
  }
});

// GET /api/payments/mpesa/limits - Return configured M-Pesa limits
// Keep this before parameterized routes to avoid matching conflicts.
router.get('/mpesa/limits', getMpesaLimits);

// Admin/support: unlinked cash payments queue (must be before /:paymentId routes)
router.get('/unlinked', authenticate, authorize(['admin', 'support']), getUnlinkedPayments);



// Admin: Create cash payment
router.post('/cash', authenticate, authorize(['admin']), createCashPayment);

// Admin / support: record manual cash payment against subscription
router.post('/record-cash', authenticate, authorize(['admin', 'support']), recordCashPayment);

// Admin: Confirm pending payment
router.put('/:paymentId/confirm', authenticate, authorize(['admin']), confirmPayment);

// Admin: Reject pending payment
router.put('/:paymentId/reject', authenticate, authorize(['admin']), rejectPayment);

// Admin: Link payment to subscription (or clear link with subscriptionId: null)
router.patch('/:paymentId', authenticate, authorize(['admin']), patchPayment);

module.exports = router;