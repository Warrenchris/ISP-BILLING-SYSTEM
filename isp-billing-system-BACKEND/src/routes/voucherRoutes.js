/**
 * Voucher Routes
 *
 * Defines admin-only voucher batch operations and public rate-limited redemption.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const {
  generateBatch,
  listVouchers,
  getStats,
  listBatches,
  getVoucher,
  revoke,
  exportBatch,
  redeem,
  initiatePurchaseStk,
  queryVoucherPaymentStatus,
} = require('../controllers/voucherController');

// ── Rate Limiter for Redemption ──────────────────────────────────────
// Prevents brute-force guessing of voucher codes (max 5 requests/min per IP)
const redemptionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.VOUCHER_BRUTE_FORCE_LIMIT || '5', 10),
  message: {
    success: false,
    message: 'Too many redemption attempts. Please try again after a minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Rate Limiter for STK Purchases (NAT & SPAM Protection) ────────────
// Rate limits by combining NAT IP and target Phone number (max 3 STKs/min)
const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    return req.ip + '_' + (req.body.phone || '');
  },
  message: {
    success: false,
    message: 'Too many payment requests for this number. Please wait a minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Public Routes ─────────────────────────────────────────────────────
// Captive portal calls this to get online
router.post('/redeem', redemptionLimiter, redeem);

// Public route to start remote voucher purchase STK
router.post('/purchase-stk', purchaseLimiter, initiatePurchaseStk);

// Public route to poll payment status and safely retrieve code
router.get('/payment-status/:paymentId', redemptionLimiter, queryVoucherPaymentStatus);

// ── Admin-Only Routes ─────────────────────────────────────────────────
router.use(authenticate, authorize(['admin']));

// GET  /api/admin/vouchers/stats   - Stats summary for dashboard
router.get('/stats', getStats);

// GET  /api/admin/vouchers/batches - List voucher batches
router.get('/batches', listBatches);

// GET  /api/admin/vouchers/export/:batchId - Download batch as CSV
router.get('/export/:batchId', exportBatch);

// POST /api/admin/vouchers/generate - Generate a batch of vouchers
router.post('/generate', generateBatch);

// GET  /api/admin/vouchers         - List vouchers with filters
router.get('/', listVouchers);

// GET  /api/admin/vouchers/:id     - Get details for a single voucher
router.get('/:id', getVoucher);

// POST /api/admin/vouchers/:id/revoke - Revoke a voucher
router.post('/:id/revoke', revoke);

module.exports = router;
