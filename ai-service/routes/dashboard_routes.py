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
)
from services.llm_service import generate_dashboard_summary

logger = logging.getLogger(__name__)
dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard-summary", methods=["GET"])
def get_dashboard_summary():
    try:
        # Fetch all data concurrently-ish (sequential in Python, fast enough for admin panel)
        churn_training = fetch_training_data()
        customers = churn_training.get("churn_data", [])

        revenue_history = fetch_revenue_vs_predicted(months=1)
        revenue_history_6mo = fetch_revenue_vs_predicted(months=6)
        payments = fetch_payments_for_anomaly(hours=720)
        usage_profiles = fetch_usage_profiles()

        # Score churn
        scored = churn_model.score_all(customers) if customers else []
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

        # Anomalies
        anomaly_report = run_all_detectors(
            revenue_history=revenue_history_6mo,
            payments=payments,
            usage_profiles=usage_profiles,
        )

        # Current month revenue
        current = revenue_history[0] if revenue_history else {"actual": 0, "predicted": 0, "period": "N/A"}
        variance = current["actual"] - current["predicted"]
        variance_pct = (
            round(variance / current["predicted"] * 100, 2)
            if current["predicted"] else 0
        )

        dashboard_data = {
            "period": current["period"],
            "revenue": {
                "predicted": current["predicted"],
                "actual": current["actual"],
                "variance": round(variance, 2),
                "variancePct": variance_pct,
            },
            "churn": {
                "totalAtRisk": len(high_risk),
                "mediumRisk": len(medium_risk),
                "top5AtRisk": top5,
            },
            "anomalies": {
                "total": anomaly_report["total_anomalies"],
                "critical": anomaly_report["critical_count"],
                "warnings": anomaly_report["warning_count"],
                "byCategory": anomaly_report["by_category"],
            },
        }

        # Generate LLM plain-English summary (best-effort)
        ai_summary = "AI summary unavailable."
        try:
            ai_summary = generate_dashboard_summary(dashboard_data)
        except Exception as llm_err:
            logger.warning(f"[dashboard] LLM summary failed: {llm_err}")
            trend = "on track" if variance_pct >= 0 else "below target"
            ai_summary = (
                f"Revenue is {trend} ({variance_pct:+.1f}%) with {len(high_risk)} high-risk "
                f"churn customers and {anomaly_report['total_anomalies']} active anomalies."
            )

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
