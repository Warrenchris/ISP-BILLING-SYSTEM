"""
llm_service.py – Groq/LLaMA Chat with Real-Time Database Grounding

Uses the official `groq` Python SDK.
Before every response the service fetches live customer data from MySQL
and injects it into the system prompt so the LLM reasons over real facts.
"""

import logging
import os
from typing import Optional

from groq import Groq, APIConnectionError, APIStatusError, RateLimitError

from services import session_store
from services.data_fetcher import fetch_customer_context

logger = logging.getLogger(__name__)

# ── Config ───────────────────────────────────────────────────────────────────
_MODEL = os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile")
_MAX_TOKENS = 1024
_TEMPERATURE = 0.7

# Groq client (lazy — not initialised at import)
_client: Optional[Groq] = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise EnvironmentError("GROQ_API_KEY is not set in environment.")
        _client = Groq(api_key=api_key)
    return _client


# ── System prompt builder (grounded with real data) ──────────────────────────

def _build_system_prompt(context: Optional[dict]) -> str:
    if not context:
        return (
            "You are a helpful ISP billing support assistant for an Internet "
            "Service Provider in Kenya. Assist customers professionally and empathetically."
        )

    customer = context.get("customer", {})
    subscription = context.get("subscription") or {}
    invoices = context.get("recent_invoices", [])
    payments = context.get("recent_payments", [])
    tickets = context.get("open_tickets", [])
    churn = context.get("churn_risk")
    churn_summary = "Not assessed"
    if churn:
        churn_summary = f"{churn.get('risk_level', 'UNKNOWN')} ({float(churn.get('score') or 0) * 100:.1f}%)"

    return f"""You are a helpful customer support assistant for an Internet Service Provider.

You already have the following customer information —
do NOT ask the customer for details you already have below.
Answer questions directly using this data.

CUSTOMER PROFILE:
- Name: {customer.get('name', 'N/A')}
- Email: {customer.get('email', 'N/A')}
- Customer ID: {customer.get('id', 'N/A')}

CURRENT SUBSCRIPTION:
- Plan: {subscription.get('plan', 'N/A')}
- Status: {subscription.get('status', 'N/A')}
- Start Date: {subscription.get('start_date', 'N/A')}
- End Date: {subscription.get('end_date', 'N/A')}

RECENT INVOICES (last 3):
{_format_invoices(invoices)}

RECENT PAYMENTS (last 3):
{_format_payments(payments)}

OPEN SUPPORT TICKETS:
{_format_tickets(tickets)}

CHURN RISK SCORE: {churn_summary}

INSTRUCTIONS:
- Answer the customer's question directly using the data above
- If data shows N/A, politely say that information is unavailable
- Never ask for information that is already shown above
- Be concise, friendly, and professional
- Format currency as KES
"""


def _format_invoices(invoices):
    if not invoices:
        return "  No recent invoices found."
    lines = []
    for inv in invoices:
        lines.append(
            f"  - Invoice #{inv.get('invoice_number', '?')}: "
            f"KES {inv.get('total_amount', '?')} | "
            f"Due: {inv.get('due_date', '?')} | "
            f"Status: {inv.get('status', '?')}"
        )
    return "\n".join(lines)


def _format_payments(payments):
    if not payments:
        return "  No recent payments found."
    lines = []
    for p in payments:
        lines.append(
            f"  - KES {p.get('amount', '?')} on "
            f"{p.get('completed_at', '?')} | "
            f"M-Pesa: {p.get('mpesa_receipt', 'N/A')}"
        )
    return "\n".join(lines)


def _format_tickets(tickets):
    if not tickets:
        return "  No open support tickets."
    lines = []
    for t in tickets:
        lines.append(
            f"  - [{str(t.get('priority', '?')).upper()}] "
            f"{t.get('subject', '?')} | "
            f"Status: {t.get('status', '?')}"
        )
    return "\n".join(lines)


# ── Chat ─────────────────────────────────────────────────────────────────────

def chat(customer_id: str, message: str, session_id: str) -> dict | tuple[dict, int]:
    """
    Send a user message and receive a grounded LLM reply.

    Returns
    -------
    dict: reply, session_id, usage, customer
    """
    # 1. Fetch live customer context
    try:
        context = fetch_customer_context(customer_id)
        logger.info(f"[LLM] Customer context fetched: {context}")
    except Exception as e:
        logger.warning(f"[llm] Could not fetch customer context: {e}. Responding without grounding.")
        context = None

    # 2. Build system prompt
    system_prompt = _build_system_prompt(context)

    # 3. Get/create session and append user message
    session_store.get_or_create(session_id, customer_id)
    session_store.append_message(session_id, "user", message)
    history = session_store.get_messages(session_id)

    # 4. Build Groq message payload
    messages_payload = [{"role": "system", "content": system_prompt}] + history

    # 5. Call Groq
    groq_client = _get_client()
    try:
        response = groq_client.chat.completions.create(
            model=os.getenv('LLM_MODEL', 'llama-3.3-70b-versatile'),
            messages=messages_payload,
            max_tokens=1000,
            temperature=0.7
        )
    except RateLimitError:
        return {
            "error": "AI service is rate limited. Please try again in a moment.",
            "code": "rate_limited"
        }, 429
    except APIConnectionError:
        return {
            "error": "Could not connect to AI provider. Please try again.",
            "code": "provider_unavailable"
        }, 503
    except APIStatusError as e:
        return {
            "error": "AI provider returned an error.",
            "code": "provider_error",
            "details": e.message
        }, 502

    reply = (response.choices[0].message.content or "").strip()
    if not reply:
        reply = "I apologise, I could not generate a response at this time."

    usage = response.usage
    session_store.append_message(session_id, "assistant", reply)

    return {
        "reply": reply,
        "session_id": session_id,
        "customer": {
            "name": context["customer"]["name"] if context else None,
            "id": customer_id,
        },
        "usage": {
            "prompt_tokens": usage.prompt_tokens if usage else 0,
            "completion_tokens": usage.completion_tokens if usage else 0,
            "total_tokens": usage.total_tokens if usage else 0,
        },
    }


# ── Dashboard Summary (LLM-generated plain-English) ──────────────────────────

def generate_dashboard_summary(dashboard_data: dict) -> str:
    """Generate a 3-5 sentence executive summary of dashboard metrics."""
    import json

    prompt = (
        "You are an AI analytics assistant for an Internet Service Provider in Kenya.\n"
        "Analyse the following dashboard data and write a concise 3-5 sentence plain-English "
        "executive summary for the admin. Highlight key trends, risks, and immediate actions.\n\n"
        f"DASHBOARD DATA:\n{json.dumps(dashboard_data, indent=2, default=str)}\n\n"
        "Write the summary now:"
    )

    client = _get_client()
    response = client.chat.completions.create(
        model=_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
        temperature=0.5,
    )
    return (response.choices[0].message.content or "").strip() or "Dashboard summary unavailable."
