"""
mlr_model.py – Multiple Linear Regression for Revenue Prediction
            using NumPy only (no scikit-learn).

Method: Ordinary Least Squares via the Normal Equation
        β = (XᵀX)⁻¹ Xᵀy

Features
--------
x1 : active_subscribers     – number of paying subscribers that month
x2 : avg_data_usage_mb      – mean data consumed per subscriber (MB)
x3 : payment_delays         – count of late/missed payments
x4 : plan_score             – weighted quality index from plan distribution

Target
------
y  : revenue                – total collected revenue (KES)
"""

import logging
from datetime import datetime
from typing import Optional

import numpy as np

from models.model_store import load_model, save_model

logger = logging.getLogger(__name__)

# ── Model name for persistence ───────────────────────────────────────────────
_MODEL_KEY = "mlr"

# ── Default heuristic coefficients (KES ISP domain knowledge) ───────────────
#   [β0,   β1,   β2,  β3,    β4  ]
#   [base, /sub, /MB, /delay, /plan_score]
_DEFAULT_COEF = np.array([50_000.0, 800.0, 0.5, -200.0, 3_000.0])
_DEFAULT_RSE = 15_000.0

# ── Module state ─────────────────────────────────────────────────────────────
_coef: np.ndarray = _DEFAULT_COEF.copy()
_r_squared: float = 0.0
_residual_std_err: float = _DEFAULT_RSE
_training_samples: int = 0
_last_trained: str = "default (not trained)"


# ── Feature helpers ──────────────────────────────────────────────────────────

def _plan_score(plan_distribution: dict) -> float:
    """
    Convert plan distribution counts → weighted quality score.
    Premium plans carry higher weight.
    """
    weights = {"basic": 1, "standard": 2, "premium": 3, "enterprise": 4}
    total = 0
    weighted = 0.0
    for plan, count in (plan_distribution or {}).items():
        w = weights.get(plan.lower(), 1)
        weighted += w * count
        total += count
    return weighted / total if total > 0 else 1.0


def _build_design_row(
    active_subscribers: float,
    avg_data_usage_mb: float,
    payment_delays: float,
    ps: float,
) -> list[float]:
    """Build one design-matrix row: [1, x1, x2, x3, x4]."""
    return [1.0, active_subscribers, avg_data_usage_mb, payment_delays, ps]


# ── Persistence boot-strap ───────────────────────────────────────────────────

def _boot() -> None:
    """Load saved coefficients from disk on module import."""
    global _coef, _r_squared, _residual_std_err, _training_samples, _last_trained
    saved = load_model(_MODEL_KEY)
    if saved and "coef" in saved:
        _coef = np.array(saved["coef"])
        _r_squared = saved.get("r_squared", 0.0)
        _residual_std_err = saved.get("residual_std_err", _DEFAULT_RSE)
        _training_samples = saved.get("training_samples", 0)
        _last_trained = saved.get("last_trained", "loaded from disk")
        logger.info(f"[mlr] Loaded persisted coefficients (n={_training_samples}).")


_boot()


# ── Training ─────────────────────────────────────────────────────────────────

def train(samples: list[dict]) -> dict:
    """
    Fit OLS regression on historical monthly records.

    Each sample must have:
        active_subscribers, avg_data_usage_mb, payment_delays,
        plan_distribution (dict), revenue (float)

    Requires at least 4 samples (more than the number of parameters).
    """
    global _coef, _r_squared, _residual_std_err, _training_samples, _last_trained

    MIN_SAMPLES = 6
    if len(samples) < MIN_SAMPLES:
        return {
            "status": "skipped",
            "reason": f"Insufficient training data ({len(samples)} samples, need {MIN_SAMPLES})",
            "using": "default_heuristic_coefficients"
        }

    X_rows = []
    y_vals = []
    for s in samples:
        ps = _plan_score(s.get("plan_distribution", {}))
        X_rows.append(_build_design_row(
            float(s["active_subscribers"]),
            float(s["avg_data_usage_mb"]),
            float(s["payment_delays"]),
            ps,
        ))
        y_vals.append(float(s["revenue"]))

    X = np.array(X_rows)          # (n, 5)
    y = np.array(y_vals)          # (n,)

    # Normal equation: β = (XᵀX)⁻¹ Xᵀy
    XtX = X.T @ X
    Xty = X.T @ y
    beta, _, _, _ = np.linalg.lstsq(XtX, Xty, rcond=None)

    y_hat = X @ beta
    residuals = y - y_hat

    y_mean = np.mean(y)
    ss_tot = np.sum((y - y_mean) ** 2)
    ss_res = np.sum(residuals ** 2)
    r2 = 1.0 - ss_res / ss_tot if ss_tot != 0 else 1.0

    df = max(len(samples) - len(beta), 1)
    rse = float(np.sqrt(ss_res / df))

    _coef = beta
    _r_squared = float(r2)
    _residual_std_err = rse
    _training_samples = len(samples)
    _last_trained = datetime.utcnow().isoformat()

    state = {
        "coef": _coef.tolist(),
        "r_squared": _r_squared,
        "residual_std_err": _residual_std_err,
        "training_samples": _training_samples,
        "last_trained": _last_trained,
        "model_version": "1.0.0",
    }
    save_model(_MODEL_KEY, state)

    return {
        "coefficients": _coef.tolist(),
        "r_squared": round(_r_squared, 4),
        "residual_std_err": round(_residual_std_err, 2),
        "n": _training_samples,
    }


# ── Prediction ───────────────────────────────────────────────────────────────

def predict(
    active_subscribers: float,
    avg_data_usage_mb: float,
    payment_delays: float,
    plan_distribution: Optional[dict] = None,
) -> dict:
    """
    Predict next month's revenue.

    Returns
    -------
    dict with keys:
        predicted_revenue, confidence_interval, influencing_factors, model_stats
    """
    ps = _plan_score(plan_distribution or {})
    row = np.array(_build_design_row(active_subscribers, avg_data_usage_mb, payment_delays, ps))

    predicted = float(row @ _coef)

    # 95 % CI  ≈  ŷ ± 1.96 × RSE  (large-sample)
    margin = 1.96 * _residual_std_err
    ci_low = max(0.0, predicted - margin)
    ci_high = predicted + margin

    # Feature importance by absolute contribution
    feature_names = ["bias", "active_subscribers", "avg_data_usage_mb", "payment_delays", "plan_score"]
    contributions = np.abs(row * _coef)
    total_contrib = float(np.sum(contributions)) or 1.0

    influencing_factors = sorted(
        [
            {
                "factor": feature_names[i],
                "coefficient": round(float(_coef[i]), 4),
                "contribution_pct": round(float(contributions[i] / total_contrib * 100), 2),
            }
            for i in range(len(feature_names))
            if feature_names[i] != "bias"
        ],
        key=lambda x: x["contribution_pct"],
        reverse=True,
    )

    return {
        "predicted_revenue": round(predicted, 2),
        "confidence_interval": {
            "low": round(ci_low, 2),
            "high": round(ci_high, 2),
            "level": "95%",
        },
        "influencing_factors": influencing_factors,
        "model_stats": {
            "r_squared": round(_r_squared, 4),
            "residual_std_err": round(_residual_std_err, 2),
            "training_samples": _training_samples,
            "last_trained": _last_trained,
        },
        "inputs": {
            "active_subscribers": active_subscribers,
            "avg_data_usage_mb": avg_data_usage_mb,
            "payment_delays": payment_delays,
            "plan_score": round(ps, 4),
        },
    }


def get_state() -> dict:
    return {
        "coefficients": _coef.tolist(),
        "r_squared": _r_squared,
        "residual_std_err": _residual_std_err,
        "training_samples": _training_samples,
        "last_trained": _last_trained,
    }
