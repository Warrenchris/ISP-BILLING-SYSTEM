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
function callAiService(method, path, body = null, timeoutMs = 30_000) {
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

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`AI service request timed out after ${timeoutMs}ms`));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * Wraps callAiService to handle 503 / network errors uniformly.
 * Returns an Express-style handler result.
 */
async function proxy(res, method, path, body = null, timeoutMs = 30_000) {
  try {
    const { status, data } = await callAiService(method, path, body, timeoutMs);
    return res.status(status).json(data);
  } catch (err) {
    const isConnRefused =
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.message.includes('timed out');

    if (isConnRefused && timeoutMs === 6_000) {
      return res.status(503).json({
        error: 'AI service temporarily unavailable',
        fallback: true,
      });
    }

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
  const timeoutMs = 6_000;
  try {
    const { status, data } = await callAiService('GET', '/api/ai/anomalies', null, timeoutMs);
    
    // Proactive Push Alert: Scan anomalies for critical usage spikes (> 3σ)
    if (data && data.success && data.data && Array.isArray(data.data.anomalies)) {
      const { User } = require('../models');
      const { addSmsJob } = require('../services/queue/queueManager');
      const logger = require('../config/logger');

      // Resolve the system administrator's phone number
      const adminUser = await User.findOne({ where: { role: 'admin' } });
      const adminPhone = process.env.ADMIN_ALERT_PHONE || adminUser?.phoneNumber;

      if (adminPhone) {
        for (const anomaly of data.data.anomalies) {
          if (anomaly.type === 'usage_spike' && anomaly.severity === 'critical') {
            const dateStr = new Date().toISOString().split('T')[0];
            // Deduplicate warning messages (maximum 1 warning SMS per admin per day per subscriber)
            const jobId = `admin-anomaly-${anomaly.user_id}-${dateStr}`;
            
            const message = `⚠️ ISP Alert: Critical usage anomaly detected for user "${anomaly.customer_name}". Current: ${anomaly.current_usage_mb.toFixed(0)} MB, Z-score: ${anomaly.z_score.toFixed(1)}σ. Potential bypass/leak!`;
            
            try {
              await addSmsJob(adminPhone, 'admin_alert', { message }, 'admin', jobId);
              logger.info(`Queued admin critical usage spike warning SMS for "${anomaly.customer_name}"`, { jobId });
            } catch (smsErr) {
              logger.error('Failed to queue admin anomaly warning SMS', { error: smsErr.message });
            }
          }
        }
      }
    }

    return res.status(status).json(data);
  } catch (err) {
    const isConnRefused =
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.message.includes('timed out');

    if (isConnRefused) {
      return res.status(503).json({
        error: 'AI service temporarily unavailable',
        fallback: true,
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
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
  await proxy(res, 'GET', '/api/ai/dashboard-summary', null, 6_000);
};

/* ──────────────────────────────────────────────────────────────
   RETRAIN
   POST /api/ai/retrain
   ────────────────────────────────────────────────────────────── */
const retrain = async (req, res) => {
  await proxy(res, 'POST', '/api/ai/retrain', req.body || {});
};

/* ──────────────────────────────────────────────────────────────
   CACHE CLEAR (Admin-only)
   POST /api/ai/cache/clear
   Flushes the Python AI service in-memory data-fetcher cache.
   Call this after writes (new payment, subscription change, etc.)
   so the AI dashboard reflects fresh data immediately instead of
   waiting up to 15 s for the TTL to expire.
   ────────────────────────────────────────────────────────────── */
const clearAiCache = async (req, res) => {
  await proxy(res, 'POST', '/api/ai/cache/clear', {});
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
  clearAiCache,
  getHealth,
};
