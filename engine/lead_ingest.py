"""Normalize human-entered discovery clues into reusable search contexts.

Input: input/discovery_leads.json
Output: output/lead_queries.json

This module deliberately does not assert identity. A clue only expands
Discovery recall; later entity resolution/evidence stages decide whether a
candidate is a real person and how strongly the clue supports the match.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "input" / "discovery_leads.json"
OUTPUT = ROOT / "output" / "lead_queries.json"


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def make_queries(lead: dict) -> list[str]:
    value = clean(lead.get("value"))
    location = clean(lead.get("location"))
    note = clean(lead.get("note"))
    if not value:
        return []

    queries = [value]
    if location:
        queries += [f'"{value}" "{location}"', f"{value} {location} Ardakan"]
    else:
        queries += [f'"{value}" Ardakan', f'"{value}" اردکان', f'"{value}" Yazd']
    if note:
        queries.append(f"{value} {note}")
    return list(dict.fromkeys(queries))


def main() -> None:
    if not INPUT.exists():
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps({"queries": [], "leads": []}, ensure_ascii=False, indent=2), encoding="utf-8")
        return

    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    leads = payload.get("leads", [])
    rows = []
    queries = []
    for lead in leads:
        qs = make_queries(lead)
        rows.append({"lead": lead, "queries": qs})
        queries.extend(qs)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps({"schema": "scie-lead-queries-v1", "queries": list(dict.fromkeys(queries)), "leads": rows}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
