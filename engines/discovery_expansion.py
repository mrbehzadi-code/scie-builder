"""Broad candidate discovery for the Ardakan Social Capital Atlas.

This stage intentionally favors recall over verification. Candidates are kept even
when the Ardakan connection is weak; later resolution/evidence stages decide
whether a candidate is a confirmed person.
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "data.json"

QUERIES = [
    "ardakan", "ardakani", "Ardakan Yazd", "Ardakan Iran",
    "اردکان", "اردکانی", "اردکان یزد", "اهل اردکان",
]


def get_json(url: str, timeout: int = 25):
    req = Request(url, headers={"User-Agent": "SCIE-Discovery/0.12"})
    with urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip()).casefold()


def openalex_candidates(limit_per_query: int = 100):
    found = {}
    for q in QUERIES:
        url = "https://api.openalex.org/authors?search=" + quote(q) + f"&per-page={limit_per_query}"
        try:
            data = get_json(url)
        except Exception as exc:
            print(f"OpenAlex failed for {q!r}: {exc}")
            continue
        for a in data.get("results", []):
            name = (a.get("display_name") or "").strip()
            if not name:
                continue
            key = normalize_name(name)
            if key in found:
                continue
            inst = a.get("last_known_institutions") or []
            affiliations = [x.get("display_name") for x in inst if x.get("display_name")]
            works = a.get("works_count") or 0
            found[key] = {
                "name": name,
                "type": "کاندیدای پژوهشی",
                "source": "OpenAlex Discovery",
                "detail": f"{works} اثر علمی" + (f" · {affiliations[0]}" if affiliations else ""),
                "location": "—",
                "evidence": ["OpenAlex author search", f"query: {q}"],
                "url": a.get("id") or "",
                "verification": "needs_review",
                "confidence": "low" if "اردکان" not in name.casefold() and "ardakan" not in name.casefold() else "medium",
            }
        time.sleep(0.2)
    return list(found.values())


def github_candidates(limit_per_query: int = 30):
    found = {}
    for q in ["Ardakan in:bio", "Ardakan in:location", "ardakani in:bio"]:
        url = "https://api.github.com/search/users?q=" + quote(q) + f"&per_page={limit_per_query}"
        try:
            data = get_json(url)
        except Exception as exc:
            print(f"GitHub failed for {q!r}: {exc}")
            continue
        for u in data.get("items", []):
            login = u.get("login")
            if not login:
                continue
            key = normalize_name(login)
            if key in found:
                continue
            found[key] = {
                "name": login,
                "type": "پروفایل فنی",
                "source": "GitHub Discovery",
                "detail": "public GitHub profile candidate",
                "location": "Ardakan signal",
                "evidence": ["GitHub user search", f"query: {q}"],
                "url": f"https://github.com/{login}",
                "verification": "needs_review",
                "confidence": "low",
            }
    return list(found.values())


def main():
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"people": []}
    existing = {normalize_name(p.get("name", "")): p for p in old.get("people", []) if p.get("name")}

    candidates = openalex_candidates() + github_candidates()
    for p in candidates:
        existing.setdefault(normalize_name(p["name"]), p)

    people = list(existing.values())
    # Keep deterministic ordering: strongest textual Ardakan signal first, then name.
    people.sort(key=lambda p: (
        0 if p.get("confidence") == "medium" else 1,
        normalize_name(p.get("name", "")),
    ))

    sources = {}
    for p in people:
        sources[p.get("source", "unknown")] = sources.get(p.get("source", "unknown"), 0) + 1

    payload = {
        "generated_at": time.strftime("%Y-%m-%d"),
        "notice": "Discovery snapshot: recall-first candidate pool. Candidates are not confirmed identities.",
        "target": 100,
        "stats": {
            "web_records": old.get("stats", {}).get("web_records", 0),
            "people": len(people),
            "academic_candidates": sum(1 for p in people if "OpenAlex" in p.get("source", "")),
            "regional_evidence": sum(1 for p in people if "Ardakan" in str(p.get("location", "")) or "اردکان" in str(p.get("evidence", ""))),
            "sources": sources,
        },
        "people": people,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"SCIE candidates: {len(people)}")
    print(f"Target reached: {len(people) >= 100}")


if __name__ == "__main__":
    main()
