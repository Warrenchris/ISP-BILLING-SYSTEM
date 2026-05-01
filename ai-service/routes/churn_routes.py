"""
churn_routes.py – GET /api/ai/churn-risks
"""

import logging
from flask import Blueprint, jsonify

from models import churn_model
from services.data_fetcher import fetch_customers_for_churn_scoring, save_insight

logger = logging.getLogger(__name__)
churn_bp = Blueprint("churn", __name__)


@churn_bp.route("/churn-risks", methods=["GET"])
def get_churn_risks():
    try:
        raw_customers = fetch_customers_for_churn_scoring()
        customers = [
            {
                "id": c.get("customer_id"),
                "first_name": (c.get("full_name") or "").split(" ")[0] if c.get("full_name") else "",
                "last_name": " ".join((c.get("full_name") or "").split(" ")[1:]) if c.get("full_name") else "",
                "email": c.get("email"),
                "payment_delay_count": c.get("payment_delay_count", 0),
                "ticket_count": c.get("ticket_count", 0),
                "usage_trend": c.get("usage_trend", 0.0),
                "subscription_age_days": c.get("subscription_age_days", 30),
            }
            for c in raw_customers
        ]

        if not customers:
            return jsonify({"success": True, "data": {"atRiskCustomers": [], "total": 0}})

        scored = churn_model.score_all(customers)
        high_risk = [c for c in scored if c["risk_level"] == "HIGH"]
        medium_risk = [c for c in scored if c["risk_level"] == "MEDIUM"]
        low_risk = [c for c in scored if c["risk_level"] == "LOW"]

        # Persist high-risk customers to ai_insights
        for c in high_risk:
            save_insight(
                source_type="churn_model",
                reference_id=c["customer_id"] or None,
                prediction_type="churn_risk",
                insight_data={
                    "score": c["score"],
                    "is_flagged": True,
                    "risk_level": c["risk_level"],
                    "reasons": c["reasons"],
                    "customer_name": c["customer_name"],
                    "top_reason": c["top_reason"],
                },
            )

        return jsonify({
            "success": True,
            "data": {
                "total": len(scored),
                "highRisk": len(high_risk),
                "mediumRisk": len(medium_risk),
                "lowRisk": len(low_risk),
                "atRiskCustomers": [
                    {
                        "customerId": c["customer_id"],
                        "customerName": c["customer_name"],
                        "email": c["email"],
                        "score": c["score"],
                        "riskLevel": c["risk_level"],
                        "isFlagged": c["is_flagged"],
                        "reasons": c["reasons"],
                        "topReason": c["top_reason"],
                    }
                    for c in scored
                    if c["risk_level"] != "LOW"
                ],
                "modelState": churn_model.get_state(),
            },
        })

    except Exception as e:
        logger.exception("[churn_risks] Unexpected error")
        return jsonify({"success": False, "message": str(e)}), 500
