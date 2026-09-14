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


def duplicate_key(name: str) -> str:
    """Conservative spelling-normalized key for duplicate suggestions only."""
    key = norm(name)
    key = re.sub(r"\bardakani\b", "ardakan", key)
    key = key.replace("اردکانی", "اردکان")
    return key


def candidate_quality(person: dict) -> dict:
    """Score evidence richness, not identity certainty."""
    score = 0
    reasons = []
    evidence = [str(x) for x in (person.get("evidence") or []) if x]
    name = str(person.get("name") or "")
    detail = str(person.get("detail") or "")
    location = str(person.get("location") or "")
    source = str(person.get("source") or "")
    verification = str(person.get("verification") or "needs_review")

    if person.get("url") or person.get("source_url") or person.get("profile_url"):
        score += 10
        reasons.append("source_url")

    evidence_points = min(20, len(evidence) * 5)
    if evidence_points:
        score += evidence_points
        reasons.append(f"evidence:{len(evidence)}")

    locality_text = " ".join([name, detail, location, *evidence]).lower()
    if any(token in locality_text for token in ("ardakan", "ardakani", "اردکان", "اردکانی")):
        score += 15
        reasons.append("ardakan_signal")

    if any(str(ev).lower().startswith("location: ardakan") for ev in evidence):
        score += 15
        reasons.append("direct_location_evidence")

    if extract_org(detail):
        score += 15
        reasons.append("organization")

    if location.strip() not in {"", "—", "-"}:
        score += 15
        reasons.append("location")

    if source == "OpenAlex Discovery":
        score += 10
        reasons.append("structured_academic_source")
    elif source in {"GitHub Discovery", "Lead-guided OpenAlex Discovery"}:
        score += 8
        reasons.append("structured_source")
    elif source:
        score += 5
        reasons.append("named_source")

    if verification == "confirmed":
        score += 20
        reasons.append("confirmed")
    elif verification == "probable":
        score += 10
        reasons.append("probable")

    score = min(100, score)
    strength = "strong" if score >= 70 else "medium" if score >= 45 else "weak"
    return {
        "score": score,
        "evidence_strength": strength,
        "verification": verification,
        "evidence_count": len(evidence),
        "has_location": location.strip() not in {"", "—", "-"},
        "has_organization": bool(extract_org(detail)),
        "reasons": reasons,
    }


def build(snapshot: dict) -> dict:
    people = snapshot.get("people", [])
    names = defaultdict(list)
    variant_names = defaultdict(list)
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
        variant_key = duplicate_key(name)
        if variant_key:
            variant_names[variant_key].append(idx)
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

    exact_group_sets = {tuple(group["candidate_indexes"]) for group in duplicate_groups}
    variant_duplicate_groups = [
        {
            "key": key,
            "candidate_indexes": indexes,
            "count": len(indexes),
            "review_status": "needs_review",
            "reason": "ardakan/ardakani spelling normalization",
        }
        for key, indexes in variant_names.items()
        if len(indexes) > 1 and tuple(indexes) not in exact_group_sets
    ]

    quality = []
    quality_counts = Counter()
    for idx, person in enumerate(people):
        item = {"candidate_index": idx, **candidate_quality(person)}
        quality.append(item)
        quality_counts[item["evidence_strength"]] += 1

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
            "variant_duplicate_groups": len(variant_duplicate_groups),
            "quality_strong": quality_counts.get("strong", 0),
            "quality_medium": quality_counts.get("medium", 0),
            "quality_weak": quality_counts.get("weak", 0),
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
        "possible_duplicate_variants": variant_duplicate_groups[:500],
        "candidate_quality": quality,
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
