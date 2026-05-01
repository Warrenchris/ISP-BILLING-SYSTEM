"""
session_store.py – In-memory chat session management.

Sessions are stored in a plain Python dict protected by a threading.Lock.
Rolling window: keeps last MAX_MESSAGES per session.
Sessions expire after SESSION_TTL_HOURS of inactivity.
"""

import threading
import time
from datetime import datetime
from typing import Optional

MAX_MESSAGES = 20          # rolling context window
SESSION_TTL_HOURS = 24     # sessions idle longer than this are pruned

_lock = threading.Lock()
_sessions: dict[str, dict] = {}


# ── Internal helpers ────────────────────────────────────────────────────────

def _now_ts() -> float:
    return time.time()


def _prune_expired() -> None:
    """Remove sessions that haven't been touched for SESSION_TTL_HOURS."""
    cutoff = _now_ts() - SESSION_TTL_HOURS * 3600
    expired = [sid for sid, s in _sessions.items() if s["updated_at_ts"] < cutoff]
    for sid in expired:
        del _sessions[sid]


# ── Public API ──────────────────────────────────────────────────────────────

def get_or_create(session_id: str, customer_id: str) -> dict:
    """Return existing session or create a new one."""
    with _lock:
        _prune_expired()
        if session_id not in _sessions:
            _sessions[session_id] = {
                "session_id": session_id,
                "customer_id": customer_id,
                "messages": [],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "updated_at_ts": _now_ts(),
            }
        session = _sessions[session_id]
        session["updated_at"] = datetime.utcnow().isoformat()
        session["updated_at_ts"] = _now_ts()
        return session


def append_message(session_id: str, role: str, content: str) -> None:
    """Append a message and enforce the rolling window."""
    with _lock:
        if session_id not in _sessions:
            return
        msgs = _sessions[session_id]["messages"]
        msgs.append({"role": role, "content": content})
        # Prune to MAX_MESSAGES
        if len(msgs) > MAX_MESSAGES:
            _sessions[session_id]["messages"] = msgs[-MAX_MESSAGES:]


def get_messages(session_id: str) -> list[dict]:
    """Return the message history for a session."""
    with _lock:
        session = _sessions.get(session_id)
        if not session:
            return []
        return list(session["messages"])


def get_session(session_id: str) -> Optional[dict]:
    """Return full session dict or None."""
    with _lock:
        return _sessions.get(session_id)


def clear_session(session_id: str) -> bool:
    """Delete a session. Returns True if it existed."""
    with _lock:
        existed = session_id in _sessions
        _sessions.pop(session_id, None)
        return existed


def list_sessions() -> list[dict]:
    """Return metadata for all active sessions."""
    with _lock:
        _prune_expired()
        return [
            {
                "session_id": s["session_id"],
                "customer_id": s["customer_id"],
                "message_count": len(s["messages"]),
                "created_at": s["created_at"],
                "updated_at": s["updated_at"],
            }
            for s in _sessions.values()
        ]


def create_session(session_id=None):
    """Alias for get_or_create with explicit name."""
    import uuid
    sid = session_id or str(uuid.uuid4())
    return get_or_create(sid, "")


def add_message(session_id, role, content):
    """Alias for append_message with contract name."""
    return append_message(session_id, role, content)
