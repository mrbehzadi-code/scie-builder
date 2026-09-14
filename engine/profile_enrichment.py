"""Deterministic profile enrichment for SCIE candidates.

This layer structures existing evidence without asserting new facts or fetching external
sources. Raw discovery records remain untouched.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "docs" / "data.json"
QUALITY = ROOT / "docs" / "intelligence.json"
OUTPUT = ROOT / "docs" / "profile_enrichment.json"


def parse_openalex_id(url: str) -> str | None:
    m = re.search(r"openalex\.org/(A\d+)", url or "", flags=re.I)
    return m.group(1).upper() if m else None


def parse_github_username(url: str) -> str | None:
    try:
        p = urlparse(url or "")
    except ValueError:
        return None
    if p.netloc.lower() not in {"github.com", "www.github.com"}:
        return None
    seg = [x for x in p.path.split("/") if x]
    return seg[0] if seg else None


def parse_academic_detail(detail: str) -> tuple[int | None, str | None]:
    detail = detail or ""
    m = re.match(r"\s*(\d+)\s+اثر علمی\s*·\s*(.+?)\s*$", detail)
    if not m:
        return None, None
    return int(m.group(1)), m.group(2).strip() or None


def normalize_location(value: str) -> dict:
    raw = (value or "").strip()
    if raw in {"", "—", "-"}:
        return {"raw": raw or None, "city": None, "province": None, "country": None, "ardakan_signal": False}
    low = raw.lower()
    ardakan = "ardakan" in low or "اردکان" in raw
    city = "Ardakan" if ardakan else None
    province = "Yazd" if "yazd" in low or "یزد" in raw else None
    country = "Iran" if "iran" in low or "ایران" in raw else None
    return {"raw": raw, "city": city, "province": province, "country": country, "ardakan_signal": ardakan}


def infer_provider(source: str, url: str) -> str:
    low = (url or "").lower()
    if "openalex.org" in low or "openalex" in (source or "").lower():
        return "OpenAlex"
    if "github.com" in low or "github" in (source or "").lower():
        return "GitHub"
    return source or "Unknown"


def build_profile(idx: int, p: dict, quality_by_idx: dict[int, dict]) -> dict:
    url = p.get("url") or p.get("source_url") or p.get("profile_url") or ""
    provider = infer_provider(p.get("source", ""), url)
    work_count, organization = parse_academic_detail(p.get("detail", ""))
    if provider == "GitHub" and not organization:
        detail = (p.get("detail") or "").strip()
        if detail and detail not in {"پروفایل عمومی GitHub", "public GitHub profile candidate"}:
            organization = detail

    openalex_id = parse_openalex_id(url)
    github_username = parse_github_username(url)
    location = normalize_location(p.get("location", ""))
    evidence = [str(x) for x in (p.get("evidence") or []) if x]
    quality = quality_by_idx.get(idx, {})

    fields = {
        "organization": bool(organization),
        "location": bool(location["raw"]),
        "stable_source_id": bool(openalex_id or github_username),
        "source_url": bool(url),
        "evidence": bool(evidence),
        "work_count": work_count is not None,
    }
    completeness = round(100 * sum(fields.values()) / len(fields))

    profile = {
        "candidate_index": idx,
        "name": p.get("name", ""),
        "provider": provider,
        "source": p.get("source"),
        "source_url": url or None,
        "identifiers": {
            "openalex_id": openalex_id,
            "github_username": github_username,
        },
        "organization": organization,
        "work_count": work_count,
        "location": location,
        "verification": p.get("verification", "needs_review"),
        "confidence": p.get("confidence"),
        "evidence": evidence,
        "evidence_count": len(evidence),
        "quality_score": quality.get("score"),
        "evidence_strength": quality.get("evidence_strength"),
        "profile_completeness": completeness,
        "available_fields": [k for k, v in fields.items() if v],
        "missing_fields": [k for k, v in fields.items() if not v],
    }
    return profile


def build(snapshot: dict, intelligence: dict) -> dict:
    people = snapshot.get("people", [])
    q = {x.get("candidate_index"): x for x in intelligence.get("candidate_quality", []) if isinstance(x, dict)}
    profiles = [build_profile(i, p, q) for i, p in enumerate(people)]
    providers = Counter(p["provider"] for p in profiles)
    completeness = Counter(
        "high" if p["profile_completeness"] >= 80 else
        "medium" if p["profile_completeness"] >= 50 else
        "low"
        for p in profiles
    )
    with_org = sum(bool(p["organization"]) for p in profiles)
    with_location = sum(bool(p["location"]["raw"]) for p in profiles)
    with_stable_id = sum(bool(p["identifiers"]["openalex_id"] or p["identifiers"]["github_username"]) for p in profiles)
    ardakan_location = sum(bool(p["location"]["ardakan_signal"]) for p in profiles)
    return {
        "generated_at": snapshot.get("generated_at"),
        "candidate_count": len(profiles),
        "metrics": {
            "with_organization": with_org,
            "with_location": with_location,
            "with_stable_source_id": with_stable_id,
            "ardakan_location_signal": ardakan_location,
            "completeness_high": completeness["high"],
            "completeness_medium": completeness["medium"],
            "completeness_low": completeness["low"],
        },
        "providers": dict(providers),
        "profiles": profiles,
        "notice": "Structured enrichment derived only from existing SCIE evidence. No new identity claims are asserted.",
    }


def main() -> None:
    snapshot = json.loads(INPUT.read_text(encoding="utf-8"))
    intelligence = json.loads(QUALITY.read_text(encoding="utf-8")) if QUALITY.exists() else {}
    result = build(snapshot, intelligence)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["metrics"], ensure_ascii=False))


if __name__ == "__main__":
    main()
