"""
dashboard_routes.py – GET /api/ai/dashboard-summary
"""

import logging
from flask import Blueprint, jsonify
from datetime import datetime, timezone

from models import churn_model
from models.anomaly_detector import run_all_detectors
from services.data_fetcher import (
    fetch_training_data,
    fetch_revenue_vs_predicted,
    fetch_payments_for_anomaly,
    fetch_usage_profiles,
    cached_fetch,
    check_data_sufficiency,
)
from services.llm_service import generate_dashboard_summary

logger = logging.getLogger(__name__)
dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard-summary", methods=["GET"])
def get_dashboard_summary():
    try:
        # 1. Fetch ALL data needed for the entire dashboard once
        churn_training = cached_fetch("churn_training", fetch_training_data)
        customers = churn_training.get("churn_data", [])
        
        revenue_history_6mo = cached_fetch("revenue_6mo", fetch_revenue_vs_predicted, months=6)
        payments = cached_fetch("payments_720h", fetch_payments_for_anomaly, hours=720)
        usage_profiles = cached_fetch("usage_profiles", fetch_usage_profiles)

        # 2. Check Data Sufficiency
        sufficiency = check_data_sufficiency({
            "revenue_months": len(revenue_history_6mo),
            "usage_profiles": len(usage_profiles),
            "churn_customers": len(customers),
            "payments": len(payments)
        })
        models_ready = all(s["ready"] for s in sufficiency.values())

        # Safe debugging logs
        logger.info(f"[dashboard_summary] Dataset sizes - Churn: {len(customers)}, "
                    f"Revenue: {len(revenue_history_6mo)}, "
                    f"Payments: {len(payments)}, Usage: {len(usage_profiles)}")

        # 3. Gate Churn Scoring
        if sufficiency["churn_customers"]["ready"]:
            scored = churn_model.score_all(customers)
        else:
            scored = []
            logger.warning("[dashboard] Skipping churn model: insufficient data")

        high_risk = [c for c in scored if c["risk_level"] == "HIGH"]
        medium_risk = [c for c in scored if c["risk_level"] == "MEDIUM"]

        top5 = [
            {
                "customerId": c["customer_id"],
                "name": c["customer_name"],
                "email": c["email"],
                "churnScore": c["score"],
                "riskLevel": c["risk_level"],
                "reasons": c["reasons"],
            }
            for c in high_risk[:5]
        ]

        # 4. Gate Anomaly Detection
        if sufficiency["usage_profiles"]["ready"] and sufficiency["revenue_months"]["ready"]:
            anomaly_report = run_all_detectors(
                revenue_history=revenue_history_6mo,
                payments=payments,
                usage_profiles=usage_profiles,
            )
        else:
            anomaly_report = {
                "anomalies": [],
                "total_anomalies": 0,
                "critical_count": 0,
                "warning_count": 0,
                "by_category": {},
                "status": "insufficient_data"
            }
            logger.warning("[dashboard] Skipping anomaly detector: insufficient data")

        # 5. Gate Revenue Prediction (Current month)
        current = revenue_history_6mo[-1] if revenue_history_6mo else {"actual": 0, "predicted": 0, "period": datetime.now().strftime("%Y-%m")}
        
        # Period field fix - ensure it shows YYYY-MM
        period_str = current.get("period", datetime.now().strftime("%Y-%m"))
        
        actual_val = current.get("actual", 0) or 0
        pred_val = current.get("predicted", 0) or 0
        
        variance = actual_val - pred_val
        variance_pct = round(variance / pred_val * 100, 2) if pred_val else 0

        # Build forecast inputs from latest data (current or most recent month)
        revenue_data = churn_training.get("revenue_data", [])
        now_period = datetime.now().strftime("%Y-%m")
        latest_rev = next(
            (r for r in reversed(revenue_data) if r["period"] <= now_period),
            revenue_data[-1] if revenue_data else {}
        )

        dashboard_data = {
            "period": period_str,
            "revenue": {
                "predicted": pred_val if sufficiency["revenue_months"]["ready"] else None,
                "actual": actual_val,
                "variance": round(variance, 2),
                "variancePct": variance_pct,
            },
            "churn": {
                "totalAtRisk": len(high_risk) if sufficiency["churn_customers"]["ready"] else None,
                "mediumRisk": len(medium_risk) if sufficiency["churn_customers"]["ready"] else None,
                "top5AtRisk": top5,
                "status": "ready" if sufficiency["churn_customers"]["ready"] else "insufficient_data"
            },
            "anomalies": {
                "total": anomaly_report["total_anomalies"] if (anomaly_report.get("status") != "insufficient_data") else None,
                "critical": anomaly_report["critical_count"] if (anomaly_report.get("status") != "insufficient_data") else None,
                "warnings": anomaly_report["warning_count"] if (anomaly_report.get("status") != "insufficient_data") else None,
                "byCategory": anomaly_report["by_category"],
                "list": anomaly_report.get("anomalies", []), # Bundled list
                "status": anomaly_report.get("status", "ready")
            },
            "forecastInputs": {
                "activeSubscribers": latest_rev.get("active_subscribers"),
                "averageUsage": latest_rev.get("avg_data_usage_mb"),
                "averagePaymentDelay": latest_rev.get("payment_delays"),
                "planDistribution": latest_rev.get("plan_distribution", {}),
            },
            "dataQuality": {
                "revenueMonths": len(revenue_history_6mo),
                "usageProfiles": len(usage_profiles),
                "churnCustomers": len(customers),
                "payments": len(payments),
                "completenessScore": round(
                    min(100, (
                        min(len(revenue_history_6mo) / 3, 1) * 40 +
                        min(len(usage_profiles) / 2, 1) * 20 +
                        min(len(customers) / 5, 1) * 30 +
                        min(len(payments) / 3, 1) * 10
                    ))
                ),
            },
            "data_sufficiency": sufficiency,
            "models_ready": models_ready
        }

        # 6. Generate LLM plain-English summary (gated)
        ai_summary = "Awaiting more data to generate insights."
        if models_ready:
            try:
                ai_summary = generate_dashboard_summary(dashboard_data)
            except Exception as llm_err:
                logger.warning(f"[dashboard] LLM summary failed: {llm_err}")
                trend = "on track" if variance_pct >= 0 else "below target"
                ai_summary = (
                    f"Revenue is {trend} ({variance_pct:+.1f}%) with {len(high_risk)} high-risk "
                    f"churn customers and {anomaly_report['total_anomalies']} active anomalies."
                )
        else:
            reasons = [s["label"] for s in sufficiency.values() if not s["ready"]]
            ai_summary = f"AI models are currently offline. We need more {', '.join(reasons)} to generate accurate insights."

        return jsonify({
            "success": True,
            "data": {
                **dashboard_data,
                "aiSummary": ai_summary,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
            },
        })

    except Exception as e:
        logger.exception("[dashboard_summary] Unexpected error")
        return jsonify({"success": False, "message": str(e)}), 500
