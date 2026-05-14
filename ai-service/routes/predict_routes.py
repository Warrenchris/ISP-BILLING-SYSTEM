"""
predict_routes.py – /api/ai/predict-revenue  and  /api/ai/retrain
"""

import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from models import mlr_model, churn_model
from services.data_fetcher import fetch_training_data, save_insight, check_data_sufficiency

logger = logging.getLogger(__name__)
predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/predict-revenue", methods=["POST"])
def predict_revenue():
    try:
        body = request.get_json(force=True) or {}
        active_subscribers = body.get("activeSubscribers")
        avg_data_usage_mb = body.get("avgDataUsageMB")
        payment_delays = body.get("paymentDelays")
        plan_distribution = body.get("planDistribution") or {}

        if any(v is None for v in [active_subscribers, avg_data_usage_mb, payment_delays]):
            return jsonify({
                "success": False,
                "message": "Required fields: activeSubscribers, avgDataUsageMB, paymentDelays",
            }), 400

        result = mlr_model.predict(
            float(active_subscribers),
            float(avg_data_usage_mb),
            float(payment_delays),
            plan_distribution,
        )

        if result.get("status") == "insufficient_data_for_prediction":
            return jsonify({
                "success": False,
                "status": "insufficient_data",
                "message": result.get("message", "Insufficient data for ML prediction."),
                "missing_fields": result.get("missing_fields", [])
            }), 400

        # Determine forecast period
        now = datetime.now(timezone.utc)
        if now.month == 12:
            next_month_start = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
            next_month_end = datetime(now.year + 1, 1, 31, tzinfo=timezone.utc)
        else:
            next_month_start = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
            import calendar
            last_day = calendar.monthrange(now.year, now.month + 1)[1]
            next_month_end = datetime(now.year, now.month + 1, last_day, tzinfo=timezone.utc)

        # Persist prediction
        save_insight(
            source_type="revenue_model",
            reference_id=None,
            prediction_type="revenue_forecast",
            insight_data={
                "predicted_value": result["predicted_revenue"],
                "confidence_low": result["confidence_interval"]["low"],
                "confidence_high": result["confidence_interval"]["high"],
                "is_flagged": False,
                "inputs": result["inputs"],
                "influencing_factors": result["influencing_factors"],
                "model_stats": result["model_stats"],
                "period_start": next_month_start.date().isoformat(),
                "period_end": next_month_end.date().isoformat(),
            },
        )

        return jsonify({
            "success": True,
            "data": {
                "predictedRevenue": result["predicted_revenue"],
                "currency": "KES",
                "confidenceInterval": result["confidence_interval"],
                "influencingFactors": result["influencing_factors"],
                "modelStats": result["model_stats"],
                "forecastPeriod": next_month_start.strftime("%Y-%m"),
            },
        })

    except Exception as e:
        logger.exception("[predict_revenue] Unexpected error")
        return jsonify({"success": False, "message": str(e)}), 500


@predict_bp.route("/retrain", methods=["POST"])
def retrain():
    results = {}

    try:
        data = fetch_training_data(months=12)
        revenue_data = data.get("revenue_data", [])
        churn_data = data.get("churn_data", [])

        sufficiency = check_data_sufficiency({
            "revenue_months": len(revenue_data),
            "churn_customers": len(churn_data)
        })

        # ── MLR ──
        if sufficiency["revenue_months"]["ready"]:
            mlr_result = mlr_model.train(revenue_data)
            results["mlr"] = {"success": True, **mlr_result}
        else:
            results["mlr"] = {
                "success": False,
                "message": f"Insufficient data: {sufficiency['revenue_months']['current']}/{sufficiency['revenue_months']['required']} months",
            }

        # ── Churn ──
        if sufficiency["churn_customers"]["ready"]:
            churn_result = churn_model.train(churn_data)
            results["churn"] = {"success": True, **churn_result}
        else:
            results["churn"] = {
                "success": False,
                "message": f"Insufficient data: {sufficiency['churn_customers']['current']}/{sufficiency['churn_customers']['required']} customers",
            }

        results["data_sufficiency"] = sufficiency

    except Exception as e:
        logger.exception("[retrain] Error")
        return jsonify({"success": False, "message": str(e)}), 500

    return jsonify({
        "success": True,
        "message": "Retrain completed",
        "results": results,
        "retrained_at": datetime.now(timezone.utc).isoformat(),
    })
