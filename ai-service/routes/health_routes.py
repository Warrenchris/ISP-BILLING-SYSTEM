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
            from services.data_fetcher import get_connection
            conn = get_connection()
            conn.close()
            db_status = "connected"
        except Exception:
            db_status = "unreachable"

        return jsonify({
            "status": "ok",
            "service": "ai-microservice",
            "modules": ["mlr", "churn", "anomaly", "llm"],
            "db": db_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 200
    except Exception as e:
        logger.exception("[health] Error")
        return jsonify({"error": "An internal error occurred", "status": 500}), 500
