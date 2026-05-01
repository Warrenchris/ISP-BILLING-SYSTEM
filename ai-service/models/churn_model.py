"""
churn_model.py – Logistic Regression for Customer Churn Prediction
               using NumPy only (no scikit-learn).

Method: Gradient Descent on Binary Cross-Entropy loss
        σ(z) = 1 / (1 + exp(-z))

Features
--------
x1 : payment_delay_count      – total historical late payments
x2 : ticket_count             – support ticket volume
x3 : usage_trend              – data usage slope (last 3 months, –1 to +1)
x4 : subscription_age_days    – how long the customer has been subscribed

Risk thresholds
---------------
HIGH   ≥ 0.70
MEDIUM 0.40 – 0.69
LOW    < 0.40
"""

import logging
from datetime import datetime
from typing import Optional

import numpy as np

from models.model_store import load_model, save_model

logger = logging.getLogger(__name__)

_MODEL_KEY = "churn"

# Thresholds
HIGH_RISK = 0.70
MEDIUM_RISK = 0.40

# Default weights (heuristic – higher delay + tickets → higher churn)
# [bias, delay, tickets, usage_trend, subscription_age_days]
_DEFAULT_W = np.array([0.0, 0.8, 0.5, -0.6, -0.003])

_weights: np.ndarray = _DEFAULT_W.copy()
_norm_mean: Optional[np.ndarray] = None   # (4,) feature means
_norm_std: Optional[np.ndarray] = None    # (4,) feature stds
_model_trained: bool = False
_training_samples: int = 0
_last_trained: str = "default (not trained)"


# ── Persistence ──────────────────────────────────────────────────────────────

def _boot() -> None:
    global _weights, _norm_mean, _norm_std, _model_trained, _training_samples, _last_trained
    saved = load_model(_MODEL_KEY)
    if saved and "weights" in saved:
        _weights = np.array(saved["weights"])
        _norm_mean = np.array(saved["norm_mean"]) if saved.get("norm_mean") else None
        _norm_std = np.array(saved["norm_std"]) if saved.get("norm_std") else None
        _model_trained = True
        _training_samples = saved.get("training_samples", 0)
        _last_trained = saved.get("last_trained", "loaded from disk")
        logger.info(f"[churn] Loaded persisted weights (n={_training_samples}).")


_boot()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _sigmoid(z: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))


def _extract_features(sample: dict) -> list[float]:
    return [
        float(sample.get("payment_delay_count", 0)),
        float(sample.get("ticket_count", 0)),
        float(sample.get("usage_trend", 0.0)),
        float(sample.get("subscription_age_days", 30)),
    ]


def _normalize(X_raw: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Z-score normalise columns. Returns (X_norm, mean, std)."""
    mean = X_raw.mean(axis=0)
    std = X_raw.std(axis=0)
    std[std == 0] = 1.0  # avoid division by zero
    return (X_raw - mean) / std, mean, std


# ── Training ─────────────────────────────────────────────────────────────────

def train(
    samples: list[dict],
    learning_rate: float = 0.05,
    epochs: int = 1_000,
) -> dict:
    """
    Train logistic regression on labelled customer records.
    Each sample must have payment_delay_count, ticket_count, usage_trend,
    subscription_age_days, and churned (0 or 1).
    """
    global _weights, _norm_mean, _norm_std, _model_trained, _training_samples, _last_trained

    if len(samples) < 5:
        raise ValueError(f"Churn model requires ≥ 5 labelled samples, got {len(samples)}.")

    X_raw = np.array([_extract_features(s) for s in samples])   # (n, 4)
    y = np.array([float(s.get("churned", 0)) for s in samples]) # (n,)

    X_norm, mean_, std_ = _normalize(X_raw)
    n, p = X_norm.shape
    X = np.column_stack([np.ones(n), X_norm])   # add bias column → (n, 5)

    w = np.zeros(5)

    for _ in range(epochs):
        z = X @ w
        y_hat = _sigmoid(z)
        error = y_hat - y
        grad = (X.T @ error) / n
        w -= learning_rate * grad

    _weights = w
    _norm_mean = mean_
    _norm_std = std_
    _model_trained = True
    _training_samples = n
    _last_trained = datetime.utcnow().isoformat()

    # Training accuracy
    preds = (_sigmoid(X @ _weights) >= 0.5).astype(int)
    accuracy = float(np.mean(preds == y.astype(int)) * 100)

    state = {
        "weights": _weights.tolist(),
        "norm_mean": _norm_mean.tolist(),
        "norm_std": _norm_std.tolist(),
        "training_samples": _training_samples,
        "last_trained": _last_trained,
        "model_version": "1.0.0",
    }
    save_model(_MODEL_KEY, state)

    return {
        "weights": _weights.tolist(),
        "accuracy_pct": round(accuracy, 1),
        "n": _training_samples,
    }


# ── Scoring ──────────────────────────────────────────────────────────────────

def _risk_level(score: float) -> str:
    if score >= HIGH_RISK:
        return "HIGH"
    if score >= MEDIUM_RISK:
        return "MEDIUM"
    return "LOW"


def _build_reasons(features: dict, score: float) -> list[str]:
    reasons = []
    delay = float(features.get("payment_delay_count", 0))
    tickets = float(features.get("ticket_count", 0))
    trend = float(features.get("usage_trend", 0.0))
    age = float(features.get("subscription_age_days", 30))

    if delay > 2:
        reasons.append(f"High payment delay count ({int(delay)}x)")
    if tickets > 3:
        reasons.append(f"Elevated support tickets ({int(tickets)})")
    if trend < -0.3:
        reasons.append("Significant decline in data usage")
    if age < 90:
        reasons.append(f"Short tenure ({int(age)} days)")
    if not reasons and score < MEDIUM_RISK:
        reasons.append("Customer engagement is healthy")
    return reasons


def score_customer(features: dict) -> dict:
    """Score a single customer. Returns score, risk_level, top_reason."""
    feat_raw = np.array([_extract_features(features)])   # (1, 4)

    if _norm_mean is not None and _norm_std is not None:
        feat_norm = (feat_raw - _norm_mean) / _norm_std
    else:
        feat_norm = feat_raw   # use raw values with default weights

    x = np.concatenate([[1.0], feat_norm.flatten()])
    z = float(x @ _weights)
    score = float(_sigmoid(np.array([z]))[0])
    risk = _risk_level(score)
    reasons = _build_reasons(features, score)

    return {
        "score": round(score, 4),
        "risk_level": risk,
        "is_flagged": risk == "HIGH",
        "reasons": reasons,
        "top_reason": reasons[0] if reasons else "No significant signal",
    }


def score_all(customers: list[dict]) -> list[dict]:
    """Score a list of customer dicts and return sorted by descending score."""
    results = []
    for c in customers:
        result = score_customer(c)
        results.append({
            "customer_id": str(c.get("id", "")),
            "customer_name": f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
            "email": c.get("email", ""),
            **result,
        })
    return sorted(results, key=lambda x: x["score"], reverse=True)


def get_state() -> dict:
    return {
        "weights": _weights.tolist(),
        "model_trained": _model_trained,
        "training_samples": _training_samples,
        "last_trained": _last_trained,
    }
