"""
model_store.py – Persists trained model coefficients to a JSON file.

Why JSON and not a database?
- Coefficients are tiny scalar arrays (< 1 KB).
- JSON gives instant human-readable inspection and version tracking.
- No extra infrastructure required.
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Storage path ────────────────────────────────────────────────────────────
_STORE_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
_STORE_FILE = os.path.join(_STORE_DIR, "model_coefficients.json")


def _ensure_dir() -> None:
    os.makedirs(_STORE_DIR, exist_ok=True)


def _load_all() -> dict:
    """Load the entire store from disk. Returns empty dict if not found."""
    _ensure_dir()
    if not os.path.exists(_STORE_FILE):
        return {}
    try:
        with open(_STORE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning(f"[model_store] Could not load store: {e}. Starting fresh.")
        return {}


def _save_all(store: dict) -> None:
    """Atomically write the store to disk."""
    _ensure_dir()
    tmp = _STORE_FILE + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=2, default=str)
        os.replace(tmp, _STORE_FILE)
    except OSError as e:
        logger.error(f"[model_store] Failed to persist model store: {e}")


# ── Public API ──────────────────────────────────────────────────────────────

def save_model(model_name: str, state: dict) -> None:
    """
    Persist model state under model_name.
    Adds a 'saved_at' timestamp automatically.
    """
    store = _load_all()
    state["saved_at"] = datetime.utcnow().isoformat()
    store[model_name] = state
    _save_all(store)
    logger.info(f"[model_store] Saved '{model_name}' coefficients.")


def load_model(model_name: str) -> Optional[dict]:
    """
    Load a saved model state. Returns None if not found.
    """
    store = _load_all()
    result = store.get(model_name)
    if result:
        logger.info(f"[model_store] Loaded '{model_name}' coefficients (saved {result.get('saved_at', 'unknown')}).")
    return result


def delete_model(model_name: str) -> bool:
    """Remove a model's saved state. Returns True if it existed."""
    store = _load_all()
    existed = model_name in store
    if existed:
        del store[model_name]
        _save_all(store)
    return existed


def list_models() -> list[dict]:
    """Return metadata for all saved models."""
    store = _load_all()
    return [
        {
            "name": name,
            "saved_at": state.get("saved_at"),
            "model_version": state.get("model_version", "unknown"),
        }
        for name, state in store.items()
    ]


def store_path() -> str:
    return _STORE_FILE
