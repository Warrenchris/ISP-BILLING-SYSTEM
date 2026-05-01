"""
anomaly_routes.py – GET /api/ai/anomalies
"""

import logging
from flask import Blueprint, jsonify

from models.anomaly_detector import run_all_detectors
from services.data_fetcher import (
    fetch_revenue_vs_predicted,
    fetch_payments_for_anomaly,
    fetch_usage_profiles,
    save_insight,
)

logger = logging.getLogger(__name__)
anomaly_bp = Blueprint("anomaly", __name__)


@anomaly_bp.route("/anomalies", methods=["GET"])
def get_anomalies():
    try:
        revenue_history = fetch_revenue_vs_predicted(months=6)
        payments = fetch_payments_for_anomaly(hours=720)  # last 30 days
        usage_profiles = fetch_usage_profiles()

        report = run_all_detectors(
            revenue_history=revenue_history,
            payments=payments,
            usage_profiles=usage_profiles,
        )

        # Persist each anomaly to ai_insights
        for anomaly in report["anomalies"]:
            save_insight(
                source_type="anomaly_detector",
                reference_id=anomaly.get("user_id") or None,
                prediction_type="billing_anomaly",
                insight_data={
                    **anomaly,
                    "is_flagged": True,
                    "score": anomaly.get("z_score"),
                },
            )

        # Normalise keys to camelCase for the Node consumer
        return jsonify({
            "success": True,
            "data": {
                "totalAnomalies": report["total_anomalies"],
                "criticalCount": report["critical_count"],
                "warningCount": report["warning_count"],
                "byCategory": report["by_category"],
                "anomalies": report["anomalies"],
                "detectedAt": report["detected_at"],
            },
        })

    except Exception as e:
        logger.exception("[anomalies] Unexpected error")
        return jsonify({"success": False, "message": str(e)}), 500
