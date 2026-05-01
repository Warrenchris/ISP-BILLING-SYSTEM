/**
 * aiController.js – HTTP Proxy to Python AI Microservice
 *
 * All AI logic has been moved to /ai-service (Python/Flask on port 5001).
 * This controller simply forwards each request and returns the response.
 *
 * If the Python service is unreachable a 503 is returned instead of crashing.
 *
 * AI_SERVICE_URL env var defaults to http://localhost:5001
 */

'use strict';

const http = require('http');
const https = require('https');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

/* ──────────────────────────────────────────────────────────────
   Internal HTTP forwarder
   ────────────────────────────────────────────────────────────── */

/**
 * Forward a request to the Python AI service.
 *
 * @param {string} method   HTTP verb ('GET', 'POST', …)
 * @param {string} path     Path on the Python service e.g. '/api/ai/churn-risks'
 * @param {object|null} body  Request body (for POST/PUT). Null for GET.
 * @returns {Promise<{ status: number, data: object }>}
 */
function callAiService(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const baseUrl = new URL(AI_SERVICE_URL);
    const isHttps = baseUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const options = {
      hostname: baseUrl.hostname,
      port: baseUrl.port || (isHttps ? 443 : 80),
      path,
      method,
      headers,
    };

    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          resolve({ status: res.statusCode, data });
        } catch {
          resolve({ status: res.statusCode, data: { success: false, message: raw } });
        }
      });
    });

    req.on('error', (err) => {
      // Network-level error (service down, connection refused, etc.)
      reject(err);
    });

    // Set 30-second timeout
    req.setTimeout(30_000, () => {
      req.destroy(new Error('AI service request timed out after 30s'));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * Wraps callAiService to handle 503 / network errors uniformly.
 * Returns an Express-style handler result.
 */
async function proxy(res, method, path, body = null) {
  try {
    const { status, data } = await callAiService(method, path, body);
    return res.status(status).json(data);
  } catch (err) {
    const isConnRefused =
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.message.includes('timed out');

    if (isConnRefused) {
      return res.status(503).json({
        success: false,
        message: 'AI service is temporarily unavailable. Please try again shortly.',
        detail: err.message,
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* ──────────────────────────────────────────────────────────────
   MODULE 1 – Revenue Prediction
   POST /api/ai/predict-revenue
   ────────────────────────────────────────────────────────────── */
const predictRevenue = async (req, res) => {
  await proxy(res, 'POST', '/api/ai/predict-revenue', req.body);
};

/* ──────────────────────────────────────────────────────────────
   MODULE 2 – Churn Risks
   GET /api/ai/churn-risks
   ────────────────────────────────────────────────────────────── */
const getChurnRisks = async (req, res) => {
  await proxy(res, 'GET', '/api/ai/churn-risks');
};

/* ──────────────────────────────────────────────────────────────
   MODULE 3 – Anomaly Detection
   GET /api/ai/anomalies
   ────────────────────────────────────────────────────────────── */
const getAnomalies = async (req, res) => {
  await proxy(res, 'GET', '/api/ai/anomalies');
};

/* ──────────────────────────────────────────────────────────────
   MODULE 4 – LLM Chat
   POST /api/ai/chat
   ────────────────────────────────────────────────────────────── */
const aiChat = async (req, res) => {
  const { customerId, message, sessionId } = req.body || {};

  if (!customerId || !message) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: customerId, message',
    });
  }

  // Enforce customer access control at the Node layer
  // (Python service trusts what we forward)
  if (req.user?.role === 'customer' && req.user?.id !== customerId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  await proxy(res, 'POST', '/api/ai/chat', { customerId, message, sessionId });
};

/* ──────────────────────────────────────────────────────────────
   MODULE 4b – Chat Sessions
   GET /api/ai/chat/sessions
   ────────────────────────────────────────────────────────────── */
const getChatSessions = async (req, res) => {
  await proxy(res, 'GET', '/api/ai/chat/sessions');
};

/* ──────────────────────────────────────────────────────────────
   MODULE 5 – Dashboard Summary
   GET /api/ai/dashboard-summary
   ────────────────────────────────────────────────────────────── */
const getDashboardSummary = async (req, res) => {
  await proxy(res, 'GET', '/api/ai/dashboard-summary');
};

/* ──────────────────────────────────────────────────────────────
   RETRAIN
   POST /api/ai/retrain
   ────────────────────────────────────────────────────────────── */
const retrain = async (req, res) => {
  await proxy(res, 'POST', '/api/ai/retrain', req.body || {});
};

/* ──────────────────────────────────────────────────────────────
   HEALTH
   GET /api/ai/health
   ────────────────────────────────────────────────────────────── */
const getHealth = async (req, res) => {
  const { status, data } = await callAiService('GET', '/api/ai/health');
  return res.status(status).json(data);
};

module.exports = {
  predictRevenue,
  getChurnRisks,
  getAnomalies,
  aiChat,
  getChatSessions,
  getDashboardSummary,
  retrain,
  getHealth,
};
