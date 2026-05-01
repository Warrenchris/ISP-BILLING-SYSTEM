/**
 * aiRoutes.js – Express Router for all AI endpoints
 * Mounted at: /api/ai
 *
 * All routes require JWT authentication.
 * Admin-only routes additionally require authorize(['admin']).
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const aiController = require('./aiController');
const {
  predictRevenue,
  getChurnRisks,
  getAnomalies,
  aiChat,
  getDashboardSummary,
  retrain,
  getChatSessions
} = aiController;

/* ──────────────────────────────────────────────────────────────
   MODULE 1 – Revenue Prediction
   POST /api/ai/predict-revenue
   Body: { activeSubscribers, avgDataUsageMB, paymentDelays, planDistribution }
   Auth: Admin / Support
   ────────────────────────────────────────────────────────────── */
router.post(
  '/predict-revenue',
  authenticate,
  authorize(['admin', 'support']),
  predictRevenue
);

/* ──────────────────────────────────────────────────────────────
   MODULE 2 – Churn Risk List
   GET /api/ai/churn-risks
   Auth: Admin / Support
   ────────────────────────────────────────────────────────────── */
router.get(
  '/churn-risks',
  authenticate,
  authorize(['admin', 'support']),
  getChurnRisks
);

/* ──────────────────────────────────────────────────────────────
   MODULE 3 – Anomaly Detection
   GET /api/ai/anomalies
   Auth: Admin / Support
   ────────────────────────────────────────────────────────────── */
router.get(
  '/anomalies',
  authenticate,
  authorize(['admin', 'support']),
  getAnomalies
);

/* ──────────────────────────────────────────────────────────────
   MODULE 4 – LLM Chat
   POST /api/ai/chat
   Body: { customerId, message, sessionId? }
   Auth: Any authenticated user (customers limited to own data)
   ────────────────────────────────────────────────────────────── */
router.post(
  '/chat',
  authenticate,
  aiChat
);

/* ──────────────────────────────────────────────────────────────
   MODULE 4 – Chat Sessions (admin diagnostics)
   GET /api/ai/chat/sessions
   Auth: Admin only
   ────────────────────────────────────────────────────────────── */
router.get(
  '/chat/sessions',
  authenticate,
  authorize(['admin']),
  getChatSessions
);

/* ──────────────────────────────────────────────────────────────
   MODULE 5 – Admin Dashboard Summary
   GET /api/ai/dashboard-summary
   Auth: Admin / Support
   ────────────────────────────────────────────────────────────── */
router.get(
  '/dashboard-summary',
  authenticate,
  authorize(['admin', 'support']),
  getDashboardSummary
);

/* ──────────────────────────────────────────────────────────────
   UTILITY – Retrain Models
   POST /api/ai/retrain
   Auth: Admin only
   ────────────────────────────────────────────────────────────── */
router.post(
  '/retrain',
  authenticate,
  authorize(['admin']),
  retrain
);

/* ──────────────────────────────────────────────────────────────
   Health Check
   GET /api/ai/health
   Auth: Any authenticated user
   ────────────────────────────────────────────────────────────── */
router.get('/health', authenticate, aiController.getHealth);

module.exports = router;
