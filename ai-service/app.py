"""
app.py – Flask entry point for the ISP Billing AI microservice.

Runs on port 5001. All routes are prefixed /api/ai/.
CORS is enabled for the Express backend on localhost:3000.
"""

import logging
import os

from dotenv import load_dotenv
load_dotenv()  # load .env before anything else

from flask import Flask, jsonify
from flask_cors import CORS

from routes.predict_routes import predict_bp
from routes.churn_routes import churn_bp
from routes.anomaly_routes import anomaly_bp
from routes.chat_routes import chat_bp
from routes.dashboard_routes import dashboard_bp
from routes.health_routes import health_bp

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)


# ── App factory ───────────────────────────────────────────────────────────────
def create_app() -> Flask:
    app = Flask(__name__)

    # CORS – allow the Express backend (and dev frontend) to call us
    allowed_origins = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001",
    ).split(",")
    CORS(app, origins=allowed_origins, supports_credentials=True)

    # ── Register blueprints under /api/ai ────────────────────────────────────
    prefix = "/api/ai"
    app.register_blueprint(predict_bp,   url_prefix=prefix)
    app.register_blueprint(churn_bp,     url_prefix=prefix)
    app.register_blueprint(anomaly_bp,   url_prefix=prefix)
    app.register_blueprint(chat_bp,      url_prefix=prefix)
    app.register_blueprint(dashboard_bp, url_prefix=prefix)
    app.register_blueprint(health_bp,    url_prefix=prefix)

    # ── Service-level authentication ─────────────────────────────────────────
    @app.before_request
    def verify_internal_secret():
        from flask import request
        # Allow health checks and root welcome without auth for container healthchecks
        if request.path in ["/", "/api/ai/health"]:
            return None

        required_secret = os.environ.get("AI_INTERNAL_SECRET", "ai_secret_internal_token_2026")
        if required_secret:
            provided_secret = request.headers.get("X-Internal-Service-Key")
            if not provided_secret or provided_secret != required_secret:
                logger.warning(f"Unauthorized direct access attempt to {request.path}")
                return jsonify({
                    "success": False,
                    "message": "Unauthorized: Valid X-Internal-Service-Key required"
                }), 401

    # ── Global error handlers ────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found", "status": 404}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed", "status": 405}), 405

    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error(f"Unhandled exception: {str(e)}")
        return jsonify({
            "error": "An internal error occurred",
            "status": 500
        }), 500

    # ── Root welcome ─────────────────────────────────────────────────────────
    @app.route("/")
    def root():
        return jsonify({
            "service": "ISP Billing AI Microservice",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "predict_revenue": "POST /api/ai/predict-revenue",
                "churn_risks":     "GET  /api/ai/churn-risks",
                "anomalies":       "GET  /api/ai/anomalies",
                "chat":            "POST /api/ai/chat",
                "chat_sessions":   "GET  /api/ai/chat/sessions",
                "dashboard":       "GET  /api/ai/dashboard-summary",
                "retrain":         "POST /api/ai/retrain",
                "cache_clear":     "POST /api/ai/cache/clear  (admin-only via Node proxy)",
                "health":          "GET  /api/ai/health",
            },
        })

    logger.info("✅ AI microservice app created – blueprints registered.")
    return app


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = create_app()
    logger.info("🚀 Starting AI service on port 5001 (debug=False)")
    app.run(host="0.0.0.0", port=5001, debug=False)
