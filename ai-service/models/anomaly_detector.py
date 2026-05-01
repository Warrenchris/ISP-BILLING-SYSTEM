"""
anomaly_detector.py – Billing & Usage Anomaly Detection
                     using NumPy + SciPy statistics.

Three detector types
--------------------
1. Revenue deviation  : actual vs MLR-predicted revenue > 2σ
2. Duplicate payment  : same customer + same amount within 10 minutes
3. Usage spike        : current-month usage > personal mean + 2σ
"""

import logging
from datetime import datetime, timezone
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

DUPLICATE_WINDOW_SEC = 10 * 60          # 10 minutes
SIGMA_THRESHOLD = 2.0                   # standard deviations


# ── 1. Revenue Anomaly ───────────────────────────────────────────────────────

def detect_revenue_anomalies(revenue_history: list[dict]) -> list[dict]:
    """
    Flag months where actual revenue deviates more than 2σ
    from the MLR-predicted value.

    Each record: { period: "YYYY-MM", actual: float, predicted: float }
    """
    if len(revenue_history) < 3:
        return []

    deviations = np.array([r["actual"] - r["predicted"] for r in revenue_history])
    dev_mean = float(np.mean(deviations))
    dev_std = float(np.std(deviations))

    anomalies = []
    for i, r in enumerate(revenue_history):
        current_deviation = deviations[i]
        centered = abs(current_deviation - dev_mean)
        z = ((current_deviation - dev_mean) / dev_std) if dev_std > 0 else 0.0

        if centered > 3 * dev_std:
            severity = "critical"
        elif centered > 2 * dev_std:
            severity = "warning"
        else:
            continue

        anomalies.append({
                "type": "revenue_deviation",
                "period": r["period"],
                "actual_revenue": r["actual"],
                "predicted_revenue": r["predicted"],
                "deviation": round(float(current_deviation), 2),
                "z_score": round(float(z), 3),
                "direction": "above" if current_deviation > 0 else "below",
                "severity": severity,
                "is_anomaly": True,
                "description": (
                    f"Revenue for {r['period']} was KES {abs(current_deviation):,.0f} "
                    f"{'above' if current_deviation > 0 else 'below'} prediction "
                    f"({abs(z):.1f}σ deviation)"
                ),
        })

    return anomalies


# ── 2. Duplicate Payment Detection ──────────────────────────────────────────

def detect_duplicate_payments(payments: list[dict]) -> list[dict]:
    """
    Flag pairs of payments from the same customer with the same amount
    that occurred within DUPLICATE_WINDOW_SEC of each other.

    Each payment dict: { id, user_id, amount, created_at (ISO string) }
    """
    def _parse_ts(s: str) -> Optional[float]:
        if not s:
            return None
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            return dt.timestamp()
        except Exception:
            return None

    sorted_payments = sorted(
        payments,
        key=lambda p: _parse_ts(p.get("created_at", "")) or 0.0
    )

    # key → (payment_id, timestamp)
    seen: dict = {}
    flagged: list[dict] = []
    flagged_pairs: set = set()

    for pmt in sorted_payments:
        key = f"{pmt['user_id']}_{float(pmt['amount']):.2f}"
        ts = _parse_ts(pmt.get("created_at", ""))
        if ts is None:
            continue

        if key in seen:
            prev_id, prev_ts = seen[key]
            time_diff = ts - prev_ts
            if 0 <= time_diff <= DUPLICATE_WINDOW_SEC:
                pair_key = tuple(sorted([prev_id, str(pmt["id"])]))
                if pair_key not in flagged_pairs:
                    flagged_pairs.add(pair_key)
                    flagged.append({
                        "type": "duplicate_payment",
                        "user_id": str(pmt["user_id"]),
                        "amount": float(pmt["amount"]),
                        "payment_ids": list(pair_key),
                        "window_seconds": round(time_diff, 1),
                        "severity": "warning",
                        "is_flagged": True,
                        "description": (
                            f"Possible duplicate payment of KES {float(pmt['amount']):,.2f} "
                            f"within {time_diff/60:.1f} minutes"
                        ),
                    })

        # Always track most recent occurrence
        seen[key] = (str(pmt["id"]), ts)

    return flagged


# ── 3. Usage Spike Detection ─────────────────────────────────────────────────

def detect_usage_spikes(usage_profiles: list[dict]) -> list[dict]:
    """
    Flag customers whose current-month usage exceeds their
    personal historical mean + 2σ.

    Each profile: { user_id, user_name, usage_history: [float, ...], current_usage: float }
    """
    anomalies = []
    for profile in usage_profiles:
        history = [v for v in (profile.get("usage_history") or []) if isinstance(v, (int, float))]
        if len(history) < 2:
            continue

        hist = np.array(history)
        mean_ = float(np.mean(hist))
        std_ = float(np.std(hist))
        threshold = mean_ + SIGMA_THRESHOLD * std_
        current = float(profile.get("current_usage", 0))

        if current > threshold:
            z = (current - mean_) / std_ if std_ > 0 else 0.0
            anomalies.append({
                "type": "usage_spike",
                "user_id": str(profile.get("user_id", "")),
                "customer_name": profile.get("user_name", ""),
                "current_usage_mb": round(current, 2),
                "historical_mean_mb": round(mean_, 2),
                "threshold_mb": round(threshold, 2),
                "z_score": round(float(z), 3),
                "severity": "critical" if z > 3 else "warning",
                "is_flagged": True,
                "description": (
                    f"Usage {current:.0f} MB is {z:.1f}σ above personal "
                    f"average ({mean_:.0f} MB)"
                ),
            })

    return sorted(anomalies, key=lambda x: x["z_score"], reverse=True)


# ── Combined runner ──────────────────────────────────────────────────────────

def run_all_detectors(
    revenue_history: list[dict],
    payments: list[dict],
    usage_profiles: list[dict],
) -> dict:
    """Run all three detectors and return a unified report."""
    revenue_anomalies = detect_revenue_anomalies(revenue_history)
    duplicate_payments = detect_duplicate_payments(payments)
    usage_spikes = detect_usage_spikes(usage_profiles)

    all_anomalies = (
        [{**a, "category": "revenue"} for a in revenue_anomalies]
        + [{**a, "category": "payment"} for a in duplicate_payments]
        + [{**a, "category": "usage"} for a in usage_spikes]
    )

    return {
        "total_anomalies": len(all_anomalies),
        "critical_count": sum(1 for a in all_anomalies if a.get("severity") == "critical"),
        "warning_count": sum(1 for a in all_anomalies if a.get("severity") == "warning"),
        "by_category": {
            "revenue": len(revenue_anomalies),
            "payment": len(duplicate_payments),
            "usage": len(usage_spikes),
        },
        "anomalies": all_anomalies,
        "detected_at": datetime.utcnow().isoformat(),
    }
