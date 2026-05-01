/**
 * churnModel.js – Logistic Regression for Customer Churn Prediction
 *
 * Features (X): paymentDelayFrequency, supportTicketCount,
 *               dataUsageTrend (-1 declining → +1 growing),
 *               subscriptionDurationMonths
 *
 * Output: churn probability score ∈ [0.0, 1.0]
 *   > 0.7  → high risk (auto-flagged)
 *   0.4-0.7 → medium risk
 *   < 0.4   → low risk
 *
 * Uses sigmoid function; weights trained via gradient descent.
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   Math helpers
   ────────────────────────────────────────────────────────────── */

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

/* ──────────────────────────────────────────────────────────────
   Feature normalization (z-score)
   ────────────────────────────────────────────────────────────── */

function computeStats(values) {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance) || 1;
  return { mean, std };
}

function normalize(value, mean, std) {
  return (value - mean) / std;
}

/* ──────────────────────────────────────────────────────────────
   Model state
   ────────────────────────────────────────────────────────────── */

// Default weights derived from domain heuristics for Kenyan ISP
// [bias, paymentDelayFreq, supportTickets, dataUsageTrend, subscriptionDuration]
let weights = [0.0, 0.8, 0.5, -0.6, -0.4];
let normStats = null; // set during training
let modelTrained = false;
let trainingSamples = 0;
let lastTrained = 'default (not trained)';

/* ──────────────────────────────────────────────────────────────
   Training: Gradient Descent
   ────────────────────────────────────────────────────────────── */

/**
 * Train logistic regression.
 * @param {Array<{paymentDelayFrequency, supportTicketCount, dataUsageTrend,
 *   subscriptionDurationMonths, churned}>} samples
 *   `churned` must be 0 or 1
 */
function train(samples, { learningRate = 0.05, epochs = 1000 } = {}) {
  if (!samples || samples.length < 5) {
    throw new Error('Churn model requires at least 5 labelled training samples');
  }

  const FEATURES = ['paymentDelayFrequency', 'supportTicketCount', 'dataUsageTrend', 'subscriptionDurationMonths'];
  const n = samples.length;

  // Compute normalization stats from training data
  normStats = {};
  for (const feat of FEATURES) {
    const vals = samples.map(s => s[feat] ?? 0);
    normStats[feat] = computeStats(vals);
  }

  // Build normalized design matrix  [1, f1_norm, f2_norm, f3_norm, f4_norm]
  const X = samples.map(s => [
    1,
    normalize(s.paymentDelayFrequency ?? 0, normStats.paymentDelayFrequency.mean, normStats.paymentDelayFrequency.std),
    normalize(s.supportTicketCount ?? 0, normStats.supportTicketCount.mean, normStats.supportTicketCount.std),
    normalize(s.dataUsageTrend ?? 0, normStats.dataUsageTrend.mean, normStats.dataUsageTrend.std),
    normalize(s.subscriptionDurationMonths ?? 1, normStats.subscriptionDurationMonths.mean, normStats.subscriptionDurationMonths.std)
  ]);

  const y = samples.map(s => s.churned);
  const w = new Array(5).fill(0);

  // Gradient descent
  for (let epoch = 0; epoch < epochs; epoch++) {
    const grad = new Array(5).fill(0);
    for (let i = 0; i < n; i++) {
      const z = X[i].reduce((s, xi, j) => s + xi * w[j], 0);
      const err = sigmoid(z) - y[i];
      for (let j = 0; j < 5; j++) grad[j] += err * X[i][j];
    }
    for (let j = 0; j < 5; j++) w[j] -= (learningRate / n) * grad[j];
  }

  weights = w;
  modelTrained = true;
  trainingSamples = n;
  lastTrained = new Date().toISOString();

  // Accuracy on training set
  const correct = X.filter((row, i) => {
    const z = row.reduce((s, xi, j) => s + xi * weights[j], 0);
    return (sigmoid(z) >= 0.5 ? 1 : 0) === y[i];
  }).length;

  return { weights, accuracy: (correct / n * 100).toFixed(1), n };
}

/* ──────────────────────────────────────────────────────────────
   Scoring
   ────────────────────────────────────────────────────────────── */

const RISK_THRESHOLDS = { HIGH: 0.7, MEDIUM: 0.4 };

function getRiskLevel(score) {
  if (score >= RISK_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Score a single customer.
 * @param {{paymentDelayFrequency, supportTicketCount, dataUsageTrend,
 *   subscriptionDurationMonths}} features
 * @returns {{ score, riskLevel, isFlagged, reasons }}
 */
function scoreCustomer(features) {
  const {
    paymentDelayFrequency = 0,
    supportTicketCount = 0,
    dataUsageTrend = 0,
    subscriptionDurationMonths = 1
  } = features;

  // Normalize using stored stats (fallback to raw if not trained)
  const featureVec = normStats
    ? [
      1,
      normalize(paymentDelayFrequency, normStats.paymentDelayFrequency.mean, normStats.paymentDelayFrequency.std),
      normalize(supportTicketCount, normStats.supportTicketCount.mean, normStats.supportTicketCount.std),
      normalize(dataUsageTrend, normStats.dataUsageTrend.mean, normStats.dataUsageTrend.std),
      normalize(subscriptionDurationMonths, normStats.subscriptionDurationMonths.mean, normStats.subscriptionDurationMonths.std)
    ]
    : [1, paymentDelayFrequency, supportTicketCount, dataUsageTrend, subscriptionDurationMonths];

  const z = featureVec.reduce((s, xi, i) => s + xi * weights[i], 0);
  const score = parseFloat(sigmoid(z).toFixed(4));
  const riskLevel = getRiskLevel(score);
  const isFlagged = riskLevel === 'HIGH';

  // Human-readable reasons for high-risk signals
  const reasons = [];
  if (paymentDelayFrequency > 2) reasons.push(`High payment delay frequency (${paymentDelayFrequency}x)`);
  if (supportTicketCount > 3) reasons.push(`Elevated support tickets (${supportTicketCount})`);
  if (dataUsageTrend < -0.3) reasons.push('Significant decline in data usage');
  if (subscriptionDurationMonths < 3) reasons.push('Short subscription tenure (< 3 months)');
  if (reasons.length === 0 && score < RISK_THRESHOLDS.MEDIUM) reasons.push('Customer engagement is healthy');

  return { score, riskLevel, isFlagged, reasons };
}

/**
 * Score an array of customer objects.
 * @param {Array<{id, name, email, ...features}>} customers
 * @returns {Array} sorted by descending score
 */
function scoreAll(customers) {
  return customers
    .map(c => {
      const result = scoreCustomer(c);
      return {
        customerId: c.id,
        customerName: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        email: c.email,
        ...result
      };
    })
    .sort((a, b) => b.score - a.score);
}

/* ──────────────────────────────────────────────────────────────
   Exports
   ────────────────────────────────────────────────────────────── */
module.exports = {
  train,
  scoreCustomer,
  scoreAll,
  RISK_THRESHOLDS,
  getModelState: () => ({ weights, modelTrained, trainingSamples, lastTrained, normStats })
};
