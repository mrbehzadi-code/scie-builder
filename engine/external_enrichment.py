"""Provider-aware external profile enrichment for SCIE.

Fetches public provider metadata for candidates that already have a stable provider ID.
Raw discovery records are never modified. Failures are recorded per profile and do not
abort the whole enrichment snapshot.
"""
from __future__ import annotations

import json
import os
import re
import time
from collections import Counter
from pathlib import Path
from urllib import error, parse, request

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "docs" / "profile_enrichment.json"
OUTPUT = ROOT / "docs" / "external_enrichment.json"
ACADEMIC_CACHE = ROOT / "outputs" / "academic_candidates.json"

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
OPENALEX_API_KEY = os.environ.get("OPENALEX_API_KEY", "")


def openalex_cache() -> dict[str, dict]:
    if not ACADEMIC_CACHE.exists():
        return {}
    try:
        rows = json.loads(ACADEMIC_CACHE.read_text(encoding="utf-8"))
    except Exception:
        return {}
    out = {}
    for row in rows if isinstance(rows, list) else []:
        raw = str(row.get("openalex_id") or "")
        m = re.search(r"(A\d+)", raw, flags=re.I)
        if m:
            out[m.group(1).upper()] = row
    return out


OPENALEX_CACHE = openalex_cache()


def get_json(url: str, headers: dict[str, str] | None = None) -> dict:
    req_headers = {"User-Agent": "SCIE-Builder-External-Enrichment"}
    if headers:
        req_headers.update(headers)
    req = request.Request(url, headers=req_headers)
    with request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))


def enrich_github(username: str) -> dict:
    headers = {}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
        headers["Accept"] = "application/vnd.github+json"
        headers["X-GitHub-Api-Version"] = "2022-11-28"
    data = get_json(f"https://api.github.com/users/{parse.quote(username)}", headers)
    return {
        "provider": "GitHub",
        "login": data.get("login"),
        "display_name": data.get("name"),
        "company": data.get("company"),
        "blog": data.get("blog") or None,
        "location": data.get("location"),
        "bio": data.get("bio"),
        "public_repos": data.get("public_repos"),
        "followers": data.get("followers"),
        "following": data.get("following"),
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
        "provider_url": data.get("html_url"),
    }


def enrich_openalex(author_id: str) -> dict:
    if not OPENALEX_API_KEY:
        cached = OPENALEX_CACHE.get(author_id.upper())
        if cached:
            return {
                "provider": "OpenAlex",
                "source": "cached_academic_discovery",
                "display_name": cached.get("name"),
                "orcid": cached.get("orcid"),
                "works_count": cached.get("works_count"),
                "institutions": cached.get("institutions") or [],
                "matched_surname": cached.get("matched_surname"),
                "iran_affiliation_ratio": cached.get("iran_affiliation_ratio"),
                "provider_url": cached.get("openalex_id"),
                "cached": True,
            }
        return {"provider": "OpenAlex", "skipped": "OPENALEX_API_KEY not configured and no cached academic record"}
    url = f"https://api.openalex.org/authors/{parse.quote(author_id)}?api_key={parse.quote(OPENALEX_API_KEY)}"
    data = get_json(url)
    last_known = data.get("last_known_institutions") or []
    institutions = []
    for inst in last_known:
        if not isinstance(inst, dict):
            continue
        institutions.append({
            "id": inst.get("id"),
            "name": inst.get("display_name"),
            "country_code": inst.get("country_code"),
            "type": inst.get("type"),
        })
    topics = []
    for topic in (data.get("topics") or [])[:8]:
        if isinstance(topic, dict):
            topics.append({
                "id": topic.get("id"),
                "name": topic.get("display_name"),
                "count": topic.get("count"),
            })
    return {
        "provider": "OpenAlex",
        "display_name": data.get("display_name"),
        "orcid": data.get("orcid"),
        "works_count": data.get("works_count"),
        "cited_by_count": data.get("cited_by_count"),
        "last_known_institutions": institutions,
        "topics": topics,
        "provider_url": data.get("id"),
    }


def main() -> None:
    base = json.loads(INPUT.read_text(encoding="utf-8"))
    profiles = base.get("profiles", [])
    out = []
    counts = Counter()
    failures = Counter()

    for i, profile in enumerate(profiles, 1):
        provider = profile.get("provider")
        ids = profile.get("identifiers") or {}
        row = {
            "candidate_index": profile.get("candidate_index"),
            "name": profile.get("name"),
            "provider": provider,
            "status": "not_attempted",
            "data": {},
        }
        try:
            if provider == "GitHub" and ids.get("github_username"):
                row["data"] = enrich_github(ids["github_username"])
                row["status"] = "enriched"
                counts["github_enriched"] += 1
                time.sleep(0.08)
            elif provider == "OpenAlex" and ids.get("openalex_id"):
                data = enrich_openalex(ids["openalex_id"])
                row["data"] = data
                if data.get("skipped"):
                    row["status"] = "skipped"
                    counts["openalex_skipped"] += 1
                else:
                    row["status"] = "enriched"
                    counts["openalex_cached_enriched" if data.get("cached") else "openalex_enriched"] += 1
                    if not data.get("cached"):
                        time.sleep(0.08)
            else:
                row["status"] = "skipped"
                counts["unsupported_or_missing_id"] += 1
        except error.HTTPError as exc:
            row["status"] = "error"
            row["error"] = f"HTTP {exc.code}"
            failures[f"{provider}:HTTP_{exc.code}"] += 1
        except Exception as exc:
            row["status"] = "error"
            row["error"] = type(exc).__name__ + ": " + str(exc)[:180]
            failures[f"{provider}:{type(exc).__name__}"] += 1
        out.append(row)
        if i % 50 == 0:
            print(f"Processed {i}/{len(profiles)}")

    result = {
        "generated_at": base.get("generated_at"),
        "candidate_count": len(profiles),
        "metrics": {
            **dict(counts),
            "errors": sum(failures.values()),
            "enriched_total": sum(1 for x in out if x["status"] == "enriched"),
            "skipped_total": sum(1 for x in out if x["status"] == "skipped"),
        },
        "failures": dict(failures),
        "profiles": out,
        "notice": "Public provider metadata only. External enrichment does not itself confirm identity or Ardakan affiliation.",
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["metrics"], ensure_ascii=False))


if __name__ == "__main__":
    main()
