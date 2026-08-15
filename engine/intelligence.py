"""Build a lightweight intelligence layer from the SCIE discovery snapshot.

Recall-first: this module does not assert identity. It extracts reusable signals,
possible duplicates, organizations, locations, evidence and candidate relations.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "docs" / "data.json"
OUTPUT = ROOT / "docs" / "intelligence.json"


def norm(value: str) -> str:
    value = (value or "").lower().strip()
    value = re.sub(r"[^\w\u0600-\u06ff]+", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()


def extract_org(detail: str) -> str | None:
    if "·" not in (detail or ""):
        return None
    org = detail.split("·", 1)[1].strip()
    return org or None


def build(snapshot: dict) -> dict:
    people = snapshot.get("people", [])
    names = defaultdict(list)
    org_people = defaultdict(list)
    location_people = defaultdict(list)
    evidence = Counter()
    source = Counter()
    types = Counter()

    for idx, person in enumerate(people):
        name = person.get("name", "")
        key = norm(name)
        if key:
            names[key].append(idx)
        src = person.get("source", "unknown")
        source[src] += 1
        types[person.get("type", "سایر")] += 1
        for ev in person.get("evidence", []) or []:
            evidence[ev] += 1
        org = extract_org(person.get("detail", ""))
        if org:
            org_people[norm(org)].append(idx)
        loc = norm(person.get("location", ""))
        if loc and loc not in {"—", "-"}:
            location_people[loc].append(idx)

    duplicate_groups = [
        {"key": key, "candidate_indexes": indexes, "count": len(indexes)}
        for key, indexes in names.items() if len(indexes) > 1
    ]

    organization_links = []
    for org, indexes in org_people.items():
        if len(indexes) > 1:
            organization_links.append({"organization": org, "candidate_indexes": indexes, "count": len(indexes)})

    location_links = []
    for loc, indexes in location_people.items():
        if len(indexes) > 1:
            location_links.append({"location": loc, "candidate_indexes": indexes, "count": len(indexes)})

    return {
        "generated_at": snapshot.get("generated_at"),
        "candidate_count": len(people),
        "metrics": {
            "unique_name_keys": len(names),
            "possible_duplicate_groups": len(duplicate_groups),
            "shared_organization_groups": len(organization_links),
            "shared_location_groups": len(location_links),
            "evidence_items": sum(evidence.values()),
            "organizations_detected": len(org_people),
            "locations_detected": len(location_people),
        },
        "sources": dict(source),
        "capacity_types": dict(types),
        "evidence_types": dict(evidence),
        "possible_duplicates": duplicate_groups[:500],
        "organization_links": organization_links[:500],
        "location_links": location_links[:500],
        "notice": "Signals are analytical candidates, not verified identities or relationships.",
    }


def main() -> None:
    snapshot = json.loads(INPUT.read_text(encoding="utf-8"))
    result = build(snapshot)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["metrics"], ensure_ascii=False))


if __name__ == "__main__":
    main()
