import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = ROOT / "state.json"
OUTPUTS = ROOT / "outputs"


def _load_json(path, default):
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def _count(path):
    data = _load_json(path, [])
    return len(data) if isinstance(data, list) else 0


def dashboard():
    state = _load_json(STATE_PATH, {})
    project = state.get("project", {})
    phase = state.get("phase", {})
    task = state.get("task", {})
    patches = state.get("patches", {})

    academic = OUTPUTS / "academic_candidates.json"
    entities = OUTPUTS / "entities.json"
    clean_entities = OUTPUTS / "clean_entities.json"
    discovery = OUTPUTS / "discovery_results.json"

    print("=" * 72)
    print("SCIE — SOCIAL CAPITAL INTELLIGENCE ENGINE")
    print("=" * 72)
    print(f"Project : {project.get('name', 'SCIE Builder')}")
    print(f"Version : {project.get('version', '—')}")
    print(f"Phase   : {phase.get('name', '—')} ({phase.get('current', '—')})")
    print(f"Task    : {task.get('current', '—')}")
    print(f"Status  : {state.get('status', '—')}")
    print("-" * 72)
    print("DATA")
    print(f"  Web discovery       : {_count(discovery):>6}")
    print(f"  Entities            : {_count(entities):>6}")
    print(f"  Clean entities      : {_count(clean_entities):>6}")
    print(f"  Academic candidates : {_count(academic):>6}")
    print("-" * 72)
    print("PIPELINE")
    print("  Web Discovery       [OK]")
    print("  Academic Discovery  [OK]" if academic.exists() else "  Academic Discovery  [--]")
    print("  Entity Resolution   [NEXT]")
    print("  Evidence Scoring    [--]")
    print("  Knowledge Graph     [--]")
    print("-" * 72)
    applied = patches.get("applied", [])
    print(f"Patches applied      : {len(applied)}")
    print(f"Last patch            : {applied[-1] if applied else '—'}")
    print("=" * 72)

    return state
