/**
 * mlrModel.js – Multiple Linear Regression (OLS) for Revenue Prediction
 *
 * Features (X): activeSubscribers, avgDataUsageMB, paymentDelays, planScore
 * Target  (y): totalRevenue (KES)
 *
 * Method: Normal Equation  β = (XᵀX)⁻¹ Xᵀy
 * Implemented with plain JavaScript – no external ML libraries.
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   Lightweight matrix helpers
   ────────────────────────────────────────────────────────────── */

/** Multiply two matrices A (m×k) × B (k×n) → m×n */
function matMul(A, B) {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let l = 0; l < k; l++)
        C[i][j] += A[i][l] * B[l][j];
  return C;
}

/** Transpose matrix */
function matT(A) {
  return A[0].map((_, j) => A.map(row => row[j]));
}

/** Gauss-Jordan inversion of a square matrix */
function matInv(A) {
  const n = A.length;
  // Build augmented [A | I]
  const M = A.map((row, i) => {
    const aug = [...row.map(v => v), ...new Array(n).fill(0)];
    aug[n + i] = 1;
    return aug;
  });

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) throw new Error('Matrix is singular – cannot invert');
    for (let j = 0; j < 2 * n; j++) M[col][j] /= pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = 0; j < 2 * n; j++) M[r][j] -= factor * M[col][j];
    }
  }

  return M.map(row => row.slice(n));
}

/* ──────────────────────────────────────────────────────────────
   MLR Model state  (persisted in memory between calls)
   ────────────────────────────────────────────────────────────── */

let coefficients = null; // [β0, β1, β2, β3, β4]
let rSquared = 0;
let residualStdErr = 0;
let trainingSamples = 0;
let lastTrained = null;

/* ──────────────────────────────────────────────────────────────
   Feature engineering helpers
   ────────────────────────────────────────────────────────────── */

/**
 * Converts plan distribution map → weighted quality score.
 * Premium plans are weighted higher.
 */
function computePlanScore(planDistribution = {}) {
  const weights = { basic: 1, standard: 2, premium: 3, enterprise: 4 };
  let total = 0, weighted = 0;
  for (const [plan, count] of Object.entries(planDistribution)) {
    const w = weights[plan.toLowerCase()] || 1;
    weighted += w * count;
    total += count;
  }
  return total === 0 ? 1 : weighted / total;
}

/**
 * Build design matrix row: [1, x1, x2, x3, x4]  (bias term included)
 */
function buildRow(activeSubscribers, avgDataUsageMB, paymentDelays, planScore) {
  return [1, activeSubscribers, avgDataUsageMB, paymentDelays, planScore];
}

/* ──────────────────────────────────────────────────────────────
   Training
   ────────────────────────────────────────────────────────────── */

/**
 * Train MLR on historical data rows.
 * @param {Array<{activeSubscribers, avgDataUsageMB, paymentDelays, planDistribution, revenue}>} samples
 * @returns {{ coefficients, rSquared, residualStdErr, n }}
 */
function train(samples) {
  if (!samples || samples.length < 4) {
    throw new Error('MLR requires at least 4 training samples');
  }

  const X = samples.map(s =>
    buildRow(s.activeSubscribers, s.avgDataUsageMB, s.paymentDelays,
      computePlanScore(s.planDistribution))
  );
  const y = samples.map(s => [s.revenue]);

  // β = (XᵀX)⁻¹ Xᵀy
  const Xt = matT(X);
  const XtX = matMul(Xt, X);
  const XtXinv = matInv(XtX);
  const Xty = matMul(Xt, y);
  const beta = matMul(XtXinv, Xty).map(r => r[0]);

  // Predictions & residuals
  const yHat = X.map(row => row.reduce((s, xi, i) => s + xi * beta[i], 0));
  const residuals = y.map((r, i) => r[0] - yHat[i]);

  // R²
  const yMean = y.reduce((s, r) => s + r[0], 0) / y.length;
  const ssTot = y.reduce((s, r) => s + (r[0] - yMean) ** 2, 0);
  const ssRes = residuals.reduce((s, r) => s + r ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // Residual standard error
  const df = samples.length - beta.length; // n - p
  const rse = Math.sqrt(ssRes / Math.max(df, 1));

  // Persist in module state
  coefficients = beta;
  rSquared = r2;
  residualStdErr = rse;
  trainingSamples = samples.length;
  lastTrained = new Date().toISOString();

  return { coefficients, rSquared, residualStdErr, n: trainingSamples };
}

/* ──────────────────────────────────────────────────────────────
   Prediction
   ────────────────────────────────────────────────────────────── */

/**
 * Predict next month's revenue.
 * Returns predicted value + 95 % confidence interval + feature importance.
 */
function predict(activeSubscribers, avgDataUsageMB, paymentDelays, planDistribution = {}) {
  if (!coefficients) {
    throw new Error('Model has not been trained yet. Call /api/ai/retrain first.');
  }

  const planScore = computePlanScore(planDistribution);
  const row = buildRow(activeSubscribers, avgDataUsageMB, paymentDelays, planScore);
  const predicted = row.reduce((s, xi, i) => s + xi * coefficients[i], 0);

  // 95 % CI  ≈  ŷ ± 1.96 × RSE  (large-sample approximation)
  const margin = 1.96 * residualStdErr;
  const confidenceLow = Math.max(0, predicted - margin);
  const confidenceHigh = predicted + margin;

  // Feature importance (absolute contribution relative to total)
  const featureNames = ['bias', 'activeSubscribers', 'avgDataUsageMB', 'paymentDelays', 'planScore'];
  const contributions = row.map((xi, i) => Math.abs(xi * coefficients[i]));
  const totalContrib = contributions.reduce((a, b) => a + b, 0);

  const influencingFactors = featureNames
    .map((name, i) => ({
      factor: name,
      coefficient: parseFloat(coefficients[i].toFixed(4)),
      contribution: totalContrib > 0
        ? parseFloat(((contributions[i] / totalContrib) * 100).toFixed(2))
        : 0
    }))
    .filter(f => f.factor !== 'bias')
    .sort((a, b) => b.contribution - a.contribution);

  return {
    predictedRevenue: parseFloat(predicted.toFixed(2)),
    confidenceInterval: {
      low: parseFloat(confidenceLow.toFixed(2)),
      high: parseFloat(confidenceHigh.toFixed(2)),
      level: '95%'
    },
    influencingFactors,
    modelStats: {
      rSquared: parseFloat(rSquared.toFixed(4)),
      residualStdErr: parseFloat(residualStdErr.toFixed(2)),
      trainingSamples,
      lastTrained
    },
    inputs: { activeSubscribers, avgDataUsageMB, paymentDelays, planScore }
  };
}

/* ──────────────────────────────────────────────────────────────
   Default coefficients (fallback before first training)
   Derived from domain knowledge for a Kenyan ISP
   β0=intercept, β1=subscribers, β2=data, β3=delays, β4=planScore
   ────────────────────────────────────────────────────────────── */
function initDefaultCoefficients() {
  // KES: base 50,000 + 800/subscriber + 0.5/MB + -200/delay + 3000/planScore
  coefficients = [50000, 800, 0.5, -200, 3000];
  rSquared = 0;
  residualStdErr = 15000;
  trainingSamples = 0;
  lastTrained = 'default (not trained)';
}

initDefaultCoefficients();

/* ──────────────────────────────────────────────────────────────
   Exports
   ────────────────────────────────────────────────────────────── */
module.exports = {
  train,
  predict,
  getModelState: () => ({ coefficients, rSquared, residualStdErr, trainingSamples, lastTrained }),
  computePlanScore
};
