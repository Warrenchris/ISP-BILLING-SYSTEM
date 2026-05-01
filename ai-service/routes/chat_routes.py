"""
chat_routes.py – POST /api/ai/chat  and  GET /api/ai/chat/sessions
"""

import logging
import time
from flask import Blueprint, jsonify, request

from services import llm_service, session_store

logger = logging.getLogger(__name__)
chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/chat", methods=["POST"])
def ai_chat():
    try:
        body = request.get_json(force=True) or {}
        customer_id = body.get("customerId")
        message = body.get("message")
        session_id = body.get("sessionId")

        if not customer_id or not message:
            return jsonify({
                "success": False,
                "message": "Required fields: customerId, message",
            }), 400

        # Generate session ID if not provided
        sid = session_id or f"{customer_id}_{int(time.time() * 1000)}"

        result = llm_service.chat(customer_id, message, sid)

        # If service returned an error tuple
        if isinstance(result, tuple):
            response_data, status_code = result
            return jsonify(response_data), status_code

        # Otherwise normal response
        return jsonify(result), 200

    except EnvironmentError as e:
        # GROQ_API_KEY not set
        logger.error(f"[chat] Config error: {e}")
        return jsonify({"success": False, "message": str(e)}), 503

    except Exception as e:
        logger.exception("[chat] Unexpected error")
        return jsonify({"success": False, "message": str(e)}), 500


@chat_bp.route("/chat/sessions", methods=["GET"])
def get_sessions():
    try:
        return jsonify({
            "success": True,
            "data": session_store.list_sessions(),
        })
    except Exception as e:
        logger.exception("[chat/sessions] Error")
        return jsonify({"success": False, "message": str(e)}), 500
