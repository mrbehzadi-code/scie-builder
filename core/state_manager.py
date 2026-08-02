"""
State Manager
-------------
Single source of truth for Builder's runtime state.

Every other module (runtime, patch_manager, cli) must read and write
state ONLY through this module. Direct file access to state.json
from anywhere else is not allowed -- this keeps state consistent
and makes future changes (e.g. moving to a database) a one-file change.
"""

import json
from pathlib import Path

STATE_PATH = Path("state.json")

DEFAULT_STATE = {
    "project": {"name": "SCIE Builder", "version": "0.1.0"},
    "phase": {"current": 1, "name": "Runtime Integration"},
    "task": {"current": "Execute pending patch"},
    "status": "READY",
    "patches": {"applied": [], "pending": ["patch_004_001"]},
    "history": []
}


def load_state():
    """Load state.json. If it doesn't exist yet, create it with defaults."""
    if not STATE_PATH.exists():
        save_state(DEFAULT_STATE)
        return json.loads(json.dumps(DEFAULT_STATE))  # deep copy

    with open(STATE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(state):
    """Persist state to state.json. Always writes valid, pretty-printed JSON."""
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)
        f.write("\n")


def record_event(state, event_type, patch_id, message):
    """Append a structured entry to state history. Mutates and returns state."""
    state.setdefault("history", []).append({
        "patch": patch_id,
        "event": event_type,
        "message": message
    })
    return state
