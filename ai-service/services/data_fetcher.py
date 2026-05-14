"""
data_fetcher.py – MySQL context fetcher for AI grounding and model training.

Uses mysql-connector-python with a lazy connection (no connect at import).
All credentials come from environment variables.
"""

import os
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import mysql.connector
from mysql.connector import pooling, Error as MySQLError

logger = logging.getLogger(__name__)

# ── Connection pool (lazy-initialised) ─────────────────────────────────────
_pool: Optional[pooling.MySQLConnectionPool] = None


def _get_pool() -> pooling.MySQLConnectionPool:
    """Return the shared connection pool, creating it on first call."""
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="ai_pool",
            pool_size=5,
            host=os.environ.get("DB_HOST", "localhost"),
            port=int(os.environ.get("DB_PORT", 3306)),
            user=os.environ.get("DB_USER", "root"),
            password=os.environ.get("DB_PASSWORD", ""),
            database=os.environ.get("DB_NAME", "isp_billing_db"),
            charset="utf8mb4",
            autocommit=True,
        )
    return _pool


def _get_conn():
    """Get a connection from the pool."""
    return _get_pool().get_connection()


def get_connection():
    """Public connection getter for routes/services."""
    return _get_conn()


def _query(sql: str, params: tuple = ()) -> list[dict]:
    """Execute a SELECT and return list of dicts."""
    conn = _get_conn()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


def _execute(sql: str, params: tuple = ()) -> int:
    """Execute an INSERT/UPDATE/DELETE and return last insert id."""
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        last_id = cursor.lastrowid
        cursor.close()
        return last_id
    finally:
        conn.close()


# ── Simple Request-Level Cache ─────────────────────────────────────────────
_cache: dict = {}  # key → {value, expires_at}

def cached_fetch(cache_key: str, fetch_fn, ttl_seconds: int = 300, **kwargs):
    """
    Call fetch_fn(**kwargs) at most once per ttl_seconds window.
    Avoids redundant DB round-trips when the same endpoint is called
    multiple times per dashboard load.
    """
    import time
    now = time.monotonic()
    entry = _cache.get(cache_key)
    if entry and entry["expires_at"] > now:
        return entry["value"]

    value = fetch_fn(**kwargs)
    _cache[cache_key] = {"value": value, "expires_at": now + ttl_seconds}
    return value


# ── Data Sufficiency Validation ─────────────────────────────────────────────

DATA_THRESHOLDS = {
    "revenue_months": {"min": 3, "label": "revenue history (months)"},
    "usage_profiles": {"min": 2, "label": "usage profiles"},
    "churn_customers": {"min": 5, "label": "customer records"},
    "payments": {"min": 3, "label": "payment records"},
}

def check_data_sufficiency(data_sizes: dict) -> dict:
    """
    Validate if we have enough data to run AI models reliably.
    Returns a dict with readiness flags and metrics.
    """
    status = {}
    for key, count in data_sizes.items():
        threshold = DATA_THRESHOLDS.get(key, {"min": 1, "label": key})
        current = int(count)
        req = threshold["min"]
        status[key] = {
            "ready": current >= req,
            "current": current,
            "count": current,  # alias
            "required": req,
            "min": req,        # alias
            "label": threshold["label"],
            "gap": max(0, req - current)
        }
    return status


# ── Customer Context (for LLM grounding) ───────────────────────────────────

def fetch_customer_context(customer_id: str) -> Optional[dict]:
    """
    Fetch comprehensive customer context for LLM system prompt injection.
    Returns None if customer not found.
    """
    try:
        # Basic customer info
        users = _query(
            """SELECT id,
                      COALESCE(
                        NULLIF(TRIM(CONCAT(
                          COALESCE(first_name, ''),
                          ' ',
                          COALESCE(last_name, '')
                        )), ''),
                        email,
                        'Valued Customer'
                      ) AS full_name,
                      email, phone_number,
                      is_active, created_at
               FROM users
               WHERE id = %s AND deleted_at IS NULL""",
            (customer_id,)
        )
        if not users:
            return None
        user = users[0]

        # Active subscription + plan
        subs = _query(
            """SELECT s.id, s.status, s.start_date, s.end_date,
                      s.data_used, s.data_remaining, s.auto_renew,
                      dp.name AS plan_name, dp.price AS plan_price,
                      dp.speed AS plan_speed
               FROM subscriptions s
               JOIN data_plans dp ON s.plan_id = dp.id
               WHERE s.user_id = %s AND s.status = 'active'
               ORDER BY s.created_at DESC
               LIMIT 1""",
            (customer_id,)
        )
        subscription = subs[0] if subs else None

        # Last 3 invoices
        invoices = _query(
            """SELECT invoice_number, total_amount, status, payment_status,
                      issue_date, due_date, paid_at
               FROM invoices
               WHERE user_id = %s
               ORDER BY created_at DESC
               LIMIT 3""",
            (customer_id,)
        )

        # Open support tickets
        tickets = _query(
            """SELECT id, subject, status, priority, created_at
               FROM support_tickets
               WHERE user_id = %s AND status IN ('open', 'in_progress', 'pending')
               ORDER BY created_at DESC
               LIMIT 5""",
            (customer_id,)
        )

        # Latest churn risk from ai_insights
        churn_rows = _query(
            """SELECT score, insight_data, created_at
               FROM ai_insights
               WHERE user_id = %s AND prediction_type = 'churn_risk'
               ORDER BY created_at DESC
               LIMIT 1""",
            (customer_id,)
        )
        churn = churn_rows[0] if churn_rows else None
        if churn and isinstance(churn.get("insight_data"), str):
            try:
                churn["insight_data"] = json.loads(churn["insight_data"])
            except Exception:
                pass

        # Last 3 completed payments
        payments = _query(
            """SELECT amount, payment_method, status, completed_at, mpesa_receipt_number
               FROM payments
               WHERE user_id = %s AND status = 'completed'
               ORDER BY created_at DESC
               LIMIT 3""",
            (customer_id,)
        )

        def _fmt_date(d):
            if d is None:
                return None
            if hasattr(d, "isoformat"):
                return d.isoformat()
            return str(d)

        return {
            "customer": {
                "id": str(user["id"]),
                "name": user["full_name"],
                "email": user["email"],
                "phone": user["phone_number"],
                "is_active": bool(user["is_active"]),
                "member_since": _fmt_date(user["created_at"]),
            },
            "subscription": {
                "status": subscription["status"],
                "plan": subscription["plan_name"],
                "plan_speed": subscription.get("plan_speed"),
                "plan_price": float(subscription["plan_price"] or 0),
                "data_used_mb": int(subscription["data_used"] or 0),
                "data_remaining_mb": int(subscription["data_remaining"] or 0),
                "start_date": _fmt_date(subscription["start_date"]),
                "end_date": _fmt_date(subscription["end_date"]),
                "auto_renew": bool(subscription["auto_renew"]),
            } if subscription else None,
            "recent_invoices": [
                {
                    "invoice_number": inv["invoice_number"],
                    "total_amount": float(inv["total_amount"] or 0),
                    "status": inv["status"],
                    "payment_status": inv["payment_status"],
                    "issue_date": _fmt_date(inv["issue_date"]),
                    "due_date": _fmt_date(inv["due_date"]),
                    "paid_at": _fmt_date(inv.get("paid_at")),
                }
                for inv in invoices
            ],
            "open_tickets": [
                {
                    "id": str(t["id"]),
                    "subject": t["subject"],
                    "status": t["status"],
                    "priority": t["priority"],
                    "created_at": _fmt_date(t["created_at"]),
                }
                for t in tickets
            ],
            "churn_risk": {
                "score": float(churn["score"] or 0),
                "risk_level": (churn.get("insight_data") or {}).get("risk_level", "UNKNOWN"),
                "reasons": (churn.get("insight_data") or {}).get("reasons", []),
                "calculated_at": _fmt_date(churn["created_at"]),
            } if churn else None,
            "recent_payments": [
                {
                    "amount": float(p["amount"] or 0),
                    "method": p["payment_method"],
                    "status": p["status"],
                    "completed_at": _fmt_date(p["completed_at"]),
                    "mpesa_receipt": p.get("mpesa_receipt_number"),
                }
                for p in payments
            ],
        }

    except MySQLError as e:
        logger.error(f"[data_fetcher] fetch_customer_context error: {e}")
        raise


# ── Training Data ───────────────────────────────────────────────────────────

def fetch_training_data(months: int = 12) -> dict:
    """
    Fetch monthly aggregates needed for MLR + churn model training.
    Returns dict with keys: revenue_data, churn_data
    """
    try:
        # Monthly revenue aggregates
        revenue_rows = _query(
            """SELECT 
                 DATE_FORMAT(completed_at, '%Y-%m') AS period,
                 COUNT(DISTINCT user_id) AS active_subscribers,
                 SUM(amount) AS revenue
               FROM payments
               WHERE status = 'completed'
                 AND completed_at >= DATE_SUB(NOW(), INTERVAL %s MONTH)
               GROUP BY period
               ORDER BY period ASC""",
            (months,)
        )

        # Monthly avg data usage
        usage_rows = _query(
            """SELECT 
                 DATE_FORMAT(created_at, '%Y-%m') AS period,
                 AVG(total_bytes) / 1048576 AS avg_usage_mb
               FROM data_usage
               WHERE created_at >= DATE_SUB(NOW(), INTERVAL %s MONTH)
               GROUP BY period
               ORDER BY period ASC""",
            (months,)
        )

        # Monthly payment delays
        delay_rows = _query(
            """SELECT 
                 DATE_FORMAT(due_date, '%Y-%m') AS period,
                 COUNT(*) AS delay_count
               FROM invoices
               WHERE (status = 'overdue' OR paid_at > due_date)
                 AND created_at >= DATE_SUB(NOW(), INTERVAL %s MONTH)
               GROUP BY period
               ORDER BY period ASC""",
            (months,)
        )

        # Plan distribution per month
        plan_rows = _query(
            """SELECT 
                 DATE_FORMAT(s.created_at, '%Y-%m') AS period,
                 LOWER(dp.name) AS plan_name,
                 COUNT(*) AS plan_count
               FROM subscriptions s
               JOIN data_plans dp ON s.plan_id = dp.id
               WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL %s MONTH)
               GROUP BY period, dp.name
               ORDER BY period ASC""",
            (months,)
        )

        usage_map = {r["period"]: float(r["avg_usage_mb"] or 0) for r in usage_rows}
        delay_map = {r["period"]: int(r["delay_count"] or 0) for r in delay_rows}

        plan_map: dict = {}
        for r in plan_rows:
            p = r["period"]
            if p not in plan_map:
                plan_map[p] = {}
            plan_map[p][r["plan_name"]] = int(r["plan_count"] or 0)

        revenue_data = [
            {
                "period": r["period"],
                "revenue": float(r["revenue"] or 0),
                "active_subscribers": int(r["active_subscribers"] or 0),
                "avg_data_usage_mb": usage_map.get(r["period"], 0),
                "payment_delays": delay_map.get(r["period"], 0),
                "plan_distribution": plan_map.get(r["period"], {}),
            }
            for r in revenue_rows
        ]

        # Churn features per customer
        churn_rows = _query(
            """SELECT
                 u.id,
                 u.first_name, u.last_name, u.email,
                 COUNT(DISTINCT CASE 
                   WHEN p.status = 'failed' OR (i.paid_at > i.due_date) THEN i.id 
                 END) AS payment_delay_count,
                 COUNT(DISTINCT st.id) AS ticket_count,
                 DATEDIFF(NOW(), s.created_at) AS subscription_age_days,
                 s.status AS sub_status
               FROM users u
               LEFT JOIN subscriptions s ON s.user_id = u.id
               LEFT JOIN payments p ON p.user_id = u.id
               LEFT JOIN invoices i ON i.user_id = u.id
               LEFT JOIN support_tickets st ON st.user_id = u.id
               WHERE u.role = 'customer' AND u.deleted_at IS NULL
               GROUP BY u.id, u.first_name, u.last_name, u.email,
                        s.status, s.created_at"""
        )

        churn_data = [
            {
                "id": str(r["id"]),
                "first_name": r["first_name"],
                "last_name": r["last_name"],
                "email": r["email"],
                "payment_delay_count": int(r["payment_delay_count"] or 0),
                "ticket_count": int(r["ticket_count"] or 0),
                "usage_trend": 0.0,  # computed from usage time-series separately
                "subscription_age_days": int(r["subscription_age_days"] or 30),
                "churned": 1 if r["sub_status"] in ("cancelled", "expired") else 0,
            }
            for r in churn_rows
        ]

        return {"revenue_data": revenue_data, "churn_data": churn_data}

    except MySQLError as e:
        logger.error(f"[data_fetcher] fetch_training_data error: {e}")
        raise


# ── Payments for Anomaly Detection ─────────────────────────────────────────

def fetch_payments_for_anomaly(hours: int = 720) -> list[dict]:
    """Fetch recent completed payments for duplicate-payment detection."""
    try:
        rows = _query(
            """SELECT id, user_id, amount, created_at, completed_at
               FROM payments
               WHERE status = 'completed'
                 AND completed_at >= DATE_SUB(NOW(), INTERVAL %s HOUR)
               ORDER BY created_at ASC""",
            (hours,)
        )
        def _fmt(d):
            if d is None:
                return None
            if hasattr(d, "isoformat"):
                return d.isoformat()
            return str(d)
        return [
            {
                "id": str(r["id"]),
                "user_id": str(r["user_id"]),
                "amount": float(r["amount"] or 0),
                "created_at": _fmt(r["created_at"]),
                "completed_at": _fmt(r["completed_at"]),
            }
            for r in rows
        ]
    except MySQLError as e:
        logger.error(f"[data_fetcher] fetch_payments_for_anomaly error: {e}")
        raise


# ── Churn inference data (live scoring) ────────────────────────────────────

def fetch_customers_for_churn_scoring():
    """
    Fetch live per-customer features needed for churn inference.
    Returns a list of dicts, one per customer.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Payment delay count per customer (last 6 months)
        cursor.execute("""
            SELECT 
                u.id AS customer_id,
                CONCAT(u.first_name, ' ', u.last_name) AS full_name,
                u.email,
                COUNT(DISTINCT CASE 
                    WHEN i.status = 'overdue' THEN i.id 
                END) AS payment_delay_count,
                COUNT(DISTINCT CASE 
                    WHEN t.status = 'open' THEN t.id 
                END) AS ticket_count,
                DATEDIFF(NOW(), MIN(s.start_date)) AS subscription_age_days,
                s.status AS subscription_status
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            LEFT JOIN invoices i ON i.subscription_id = s.id
                AND i.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            LEFT JOIN support_tickets t ON t.user_id = u.id
                AND t.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            WHERE u.role = 'customer' AND u.deleted_at IS NULL AND s.status = 'active'
            GROUP BY u.id, u.first_name, u.last_name, u.email,
                     s.status, s.start_date
        """)
        customers = cursor.fetchall()

        # Usage trend per customer (slope over last 3 months)
        for customer in customers:
            cursor.execute("""
                SELECT SUM(total_bytes) / 1048576 AS monthly_usage_mb
                FROM data_usage
                WHERE user_id = %s
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY MAX(created_at) DESC
                LIMIT 3
            """, (customer['customer_id'],))
            usage_rows = cursor.fetchall()

            if len(usage_rows) >= 2:
                usages = [r['monthly_usage_mb'] for r in usage_rows]
                # Negative slope = declining usage = churn signal
                customer['usage_trend'] = usages[0] - usages[-1]
            else:
                customer['usage_trend'] = 0.0

        return customers
    except Exception as e:
        raise e
    finally:
        cursor.close()
        conn.close()


# ── Revenue vs Predicted (for anomaly detection) ───────────────────────────

def fetch_revenue_vs_predicted(months: int = 6) -> list[dict]:
    """Fetch actual monthly revenue and latest stored predictions."""
    try:
        actual_rows = _query(
            """SELECT 
                 DATE_FORMAT(completed_at, '%Y-%m') AS period,
                 SUM(amount) AS actual_revenue
               FROM payments
               WHERE status = 'completed'
                 AND completed_at >= DATE_SUB(NOW(), INTERVAL %s MONTH)
               GROUP BY period
               ORDER BY period ASC""",
            (months,)
        )

        pred_rows = _query(
            """SELECT predicted_value, period_start
               FROM ai_insights
               WHERE prediction_type = 'revenue_forecast'
               ORDER BY created_at DESC
               LIMIT %s""",
            (months,)
        )

        pred_map = {}
        for p in pred_rows:
            if p["period_start"]:
                period = p["period_start"].strftime("%Y-%m") if hasattr(p["period_start"], "strftime") else str(p["period_start"])[:7]
                pred_map[period] = float(p["predicted_value"] or 0)

        return [
            {
                "period": r["period"],
                "actual": float(r["actual_revenue"] or 0),
                "predicted": pred_map.get(r["period"], 0.0),
            }
            for r in actual_rows
        ]
    except MySQLError as e:
        logger.error(f"[data_fetcher] fetch_revenue_vs_predicted error: {e}")
        raise


# ── Usage profiles for spike detection ─────────────────────────────────────

def fetch_usage_profiles() -> list[dict]:
    """Build per-customer monthly usage history. Uses start_time as the primary time column."""
    try:
        rows = _query(
            """SELECT
                 u.id AS user_id,
                 CONCAT(u.first_name, ' ', u.last_name) AS user_name,
                 DATE_FORMAT(du.start_time, '%Y-%m') AS period,
                 SUM(du.total_bytes) / 1048576 AS usage_mb
               FROM data_usage du
               JOIN users u ON du.user_id = u.id
               WHERE du.start_time >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                 AND du.total_bytes > 0
               GROUP BY u.id, u.first_name, u.last_name, period
               ORDER BY u.id, period ASC"""
        )

        profiles: dict = {}
        for r in rows:
            uid = str(r["user_id"])
            if uid not in profiles:
                profiles[uid] = {
                    "user_id": uid,
                    "user_name": r["user_name"],
                    "usage_history": [],
                }
            profiles[uid]["usage_history"].append(float(r["usage_mb"] or 0))

        result = []
        for p in profiles.values():
            hist = p["usage_history"]
            if hist:
                p["current_usage"] = hist[-1]
                p["usage_history"] = hist[:-1]
            else:
                p["current_usage"] = 0.0
            result.append(p)

        return result
    except MySQLError as e:
        logger.error(f"[data_fetcher] fetch_usage_profiles error: {e}")
        raise


# ── Save AI Insight ─────────────────────────────────────────────────────────

def save_insight(source_type, reference_id, prediction_type, insight_data):
    """
    Save AI insight with deduplication.
    If a record with same prediction_type + reference_id +
    same calendar day exists, UPDATE it instead of INSERT.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check for existing insight today
        cursor.execute("""
            SELECT id FROM ai_insights
            WHERE prediction_type = %s
              AND (user_id = %s OR (%s IS NULL AND user_id IS NULL))
              AND DATE(created_at) = CURDATE()
            LIMIT 1
        """, (prediction_type, reference_id, reference_id))

        existing = cursor.fetchone()

        if existing:
            # UPDATE existing record
            cursor.execute("""
                UPDATE ai_insights
                SET insight_data = %s,
                    score = %s,
                    predicted_value = %s,
                    is_flagged = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (
                json.dumps(insight_data),
                insight_data.get('score'),
                insight_data.get('predicted_value'),
                insight_data.get('is_flagged', False),
                existing['id']
            ))
        else:
            # INSERT new record
            cursor.execute("""
                INSERT INTO ai_insights 
                (id, prediction_type, user_id, predicted_value, score,
                 confidence_low, confidence_high, is_flagged, 
                 insight_data, period_start, period_end,
                 created_at, updated_at)
                VALUES (UUID(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        NOW(), NOW())
            """, (
                prediction_type,
                reference_id,
                insight_data.get('predicted_value'),
                insight_data.get('score'),
                insight_data.get('confidence_low'),
                insight_data.get('confidence_high'),
                insight_data.get('is_flagged', False),
                json.dumps(insight_data),
                insight_data.get('period_start'),
                insight_data.get('period_end')
            ))

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()
