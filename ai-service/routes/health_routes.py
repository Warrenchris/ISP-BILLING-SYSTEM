"""
health_routes.py – GET /api/ai/health
"""

import logging
from flask import Blueprint, jsonify
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    try:
        # Test DB connectivity
        try:
            from services.data_fetcher import get_connection, fetch_training_data, fetch_usage_profiles, check_data_sufficiency
            conn = get_connection()
            conn.close()
            db_status = "connected"
            
            # Brief sufficiency overview
            data = fetch_training_data(months=6)
            usage = fetch_usage_profiles()
            sufficiency = check_data_sufficiency({
                "revenue_months": len(data.get("revenue_data", [])),
                "churn_customers": len(data.get("churn_data", [])),
                "usage_profiles": len(usage)
            })
            models_ready = all(s["ready"] for s in sufficiency.values())
        except Exception:
            db_status = "unreachable"
            sufficiency = {}
            models_ready = False

        return jsonify({
            "status": "ok",
            "service": "ai-microservice",
            "modules": ["mlr", "churn", "anomaly", "llm"],
            "db": db_status,
            "data_readiness": {
                "models_ready": models_ready,
                "sufficiency": sufficiency
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 200
    except Exception as e:
        logger.exception("[health] Error")
        return jsonify({"error": "An internal error occurred", "status": 500}), 500
