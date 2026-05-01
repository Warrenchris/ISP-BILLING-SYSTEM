/**
 * anomalyDetector.js – Billing & Usage Anomaly Detection
 *
 * Detects three types of anomalies:
 *  1. Revenue deviation  – actual vs MLR-predicted exceeds 2 standard deviations
 *  2. Duplicate payments – same customer + amount within 10-minute window
 *  3. Usage spikes       – per-customer data usage > mean + 2σ
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   Stats helpers
   ────────────────────────────────────────────────────────────── */

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function zScore(value, m, sd) {
  if (sd === 0) return 0;
  return (value - m) / sd;
}

/* ──────────────────────────────────────────────────────────────
   1. Revenue Anomaly Detection
   ────────────────────────────────────────────────────────────── */

/**
 * Flag monthly revenue periods where actual revenue deviates
 * more than 2σ from the predicted values.
 *
 * @param {Array<{period: string, actual: number, predicted: number}>} revenueHistory
 *   Array of monthly records with actual + predicted revenue
 * @returns {Array} anomaly records
 */
function detectRevenueAnomalies(revenueHistory) {
  if (!revenueHistory || revenueHistory.length < 3) return [];

  const deviations = revenueHistory.map(r => r.actual - r.predicted);
  const devMean = mean(deviations);
  const devStd = stdDev(deviations);
  const threshold = 2 * devStd;

  return revenueHistory
    .map(r => {
      const deviation = r.actual - r.predicted;
      const z = zScore(deviation, devMean, devStd);
      const isAnomaly = Math.abs(deviation) > threshold;
      return {
        period: r.period,
        actualRevenue: r.actual,
        predictedRevenue: r.predicted,
        deviation: parseFloat(deviation.toFixed(2)),
        zScore: parseFloat(z.toFixed(3)),
        isAnomaly,
        direction: deviation > 0 ? 'above' : 'below',
        severity: Math.abs(z) > 3 ? 'critical' : Math.abs(z) > 2 ? 'warning' : 'normal'
      };
    })
    .filter(r => r.isAnomaly);
}

/* ──────────────────────────────────────────────────────────────
   2. Duplicate Payment Detection
   ────────────────────────────────────────────────────────────── */

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Detect duplicate payments (same customer, same amount, within 10 min).
 *
 * @param {Array<{id, userId, amount, createdAt}>} payments
 * @returns {Array} groups of potential duplicate payment sets
 */
function detectDuplicatePayments(payments) {
  const flagged = [];
  const sorted = [...payments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const seen = new Map(); // key: `${userId}_${amount}`

  for (const payment of sorted) {
    const key = `${payment.userId}_${parseFloat(payment.amount).toFixed(2)}`;
    const ts = new Date(payment.createdAt).getTime();

    if (seen.has(key)) {
      const prev = seen.get(key);
      const timeDiff = ts - prev.timestamp;

      if (timeDiff <= DUPLICATE_WINDOW_MS) {
        // Check if this pair is already recorded
        const existing = flagged.find(f => f.paymentIds.includes(prev.paymentId));
        if (existing) {
          existing.paymentIds.push(payment.id);
        } else {
          flagged.push({
            type: 'duplicate_payment',
            userId: payment.userId,
            amount: parseFloat(payment.amount),
            paymentIds: [prev.paymentId, payment.id],
            windowMs: timeDiff,
            severity: 'warning',
            description: `Possible duplicate payment of KES ${parseFloat(payment.amount).toFixed(2)} within ${Math.round(timeDiff / 60000)} minutes`
          });
        }
      }
    }

    // Always update to latest occurrence
    seen.set(key, { paymentId: payment.id, timestamp: ts });
  }

  return flagged;
}

/* ──────────────────────────────────────────────────────────────
   3. Usage Spike Detection
   ────────────────────────────────────────────────────────────── */

/**
 * Detect customers whose current-month data usage is more than 2σ
 * above their personal historical average.
 *
 * @param {Array<{userId, userName, usageHistory: number[], currentUsage: number}>} usageProfiles
 * @returns {Array} flagged usage spike records
 */
function detectUsageSpikes(usageProfiles) {
  const anomalies = [];

  for (const profile of usageProfiles) {
    const history = (profile.usageHistory || []).filter(v => typeof v === 'number' && v >= 0);
    if (history.length < 2) continue;

    const m = mean(history);
    const sd = stdDev(history);
    const threshold = m + 2 * sd;

    if (profile.currentUsage > threshold) {
      const z = zScore(profile.currentUsage, m, sd);
      anomalies.push({
        type: 'usage_spike',
        userId: profile.userId,
        customerName: profile.userName || profile.userId,
        currentUsageMB: profile.currentUsage,
        historicalMeanMB: parseFloat(m.toFixed(2)),
        thresholdMB: parseFloat(threshold.toFixed(2)),
        zScore: parseFloat(z.toFixed(3)),
        severity: z > 3 ? 'critical' : 'warning',
        description: `Usage ${profile.currentUsage.toFixed(0)} MB is ${z.toFixed(1)}σ above historical average (${m.toFixed(0)} MB)`
      });
    }
  }

  return anomalies.sort((a, b) => b.zScore - a.zScore);
}

/* ──────────────────────────────────────────────────────────────
   Combined runner
   ────────────────────────────────────────────────────────────── */

/**
 * Run all anomaly detectors and return a unified report.
 */
function runAllDetectors({ revenueHistory = [], payments = [], usageProfiles = [] } = {}) {
  const revenueAnomalies = detectRevenueAnomalies(revenueHistory);
  const duplicatePayments = detectDuplicatePayments(payments);
  const usageSpikes = detectUsageSpikes(usageProfiles);

  const allAnomalies = [
    ...revenueAnomalies.map(a => ({ ...a, category: 'revenue' })),
    ...duplicatePayments.map(a => ({ ...a, category: 'payment' })),
    ...usageSpikes.map(a => ({ ...a, category: 'usage' }))
  ];

  return {
    totalAnomalies: allAnomalies.length,
    criticalCount: allAnomalies.filter(a => a.severity === 'critical').length,
    warningCount: allAnomalies.filter(a => a.severity === 'warning').length,
    byCategory: {
      revenue: revenueAnomalies.length,
      payment: duplicatePayments.length,
      usage: usageSpikes.length
    },
    anomalies: allAnomalies,
    detectedAt: new Date().toISOString()
  };
}

module.exports = {
  detectRevenueAnomalies,
  detectDuplicatePayments,
  detectUsageSpikes,
  runAllDetectors
};
