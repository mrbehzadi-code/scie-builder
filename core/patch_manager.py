"""
Patch Manager
-------------
Builder's mechanism for changing its own project files without a human
manually copy-pasting code.

A Patch is a JSON file living in patches/<patch_id>.json with this shape:

{
  "id": "patch_004_001",
  "description": "human readable summary",
  "action": "write_file" | "append_file" | "mkdir",
  "target": "relative/path/from/project/root",
  "content": "text content (for write_file / append_file)"
}

Supported actions today are intentionally small and safe. New action types
should be added here as Builder's needs grow -- this is the ONLY place
that should know how to apply a patch to disk.
"""

import json
from pathlib import Path

PATCH_DIR = Path("patches")


class PatchError(Exception):
    """Raised when a patch cannot be loaded or applied."""


def load_patch(patch_id):
    path = PATCH_DIR / f"{patch_id}.json"
    if not path.exists():
        raise PatchError(f"Patch file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        patch = json.load(f)

    for key in ("id", "description", "action", "target"):
        if key not in patch:
            raise PatchError(f"Patch {patch_id} is missing required field '{key}'")

    return patch


def apply_patch(patch):
    """
    Apply a single patch to disk. Returns (success: bool, message: str).
    Never raises on expected failure -- runtime decides what to do next.
    """
    action = patch["action"]
    target = Path(patch["target"])

    try:
        if action == "write_file":
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(patch.get("content", ""), encoding="utf-8")
            return True, f"Wrote file {target}"

        elif action == "append_file":
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "a", encoding="utf-8") as f:
                f.write(patch.get("content", ""))
            return True, f"Appended to file {target}"

        elif action == "mkdir":
            target.mkdir(parents=True, exist_ok=True)
            return True, f"Ensured directory exists: {target}"

        else:
            return False, f"Unknown patch action: '{action}'"

    except OSError as e:
        return False, f"Filesystem error applying patch {patch['id']}: {e}"


def list_pending(state):
    return list(state.get("patches", {}).get("pending", []))
