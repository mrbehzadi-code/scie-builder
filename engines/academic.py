"""
Academic Extraction Engine
--------------------------
Searches OpenAlex (a free, open catalog of scholarly authors, works, and
institutions) for researchers whose name matches a known Ardakan surname
AND who have an affiliation with an institution in Iran.

IMPORTANT LIMITATION (read before trusting the output):
Surname + country affiliation is a HEURISTIC, not proof of Ardakan
ancestry. Many of these surnames (e.g. Moradi, Nasiri, Kamali) are common
across all of Iran, not specific to Ardakan. Every result here is a
CANDIDATE for a human to review, not a confirmed match. Treat this output
the same way Sprint 003's docs treated "architecture" vs "working code":
promising, not final.

Requires an OpenAlex API key (free, see https://openalex.org/settings/api)
set as the OPENALEX_API_KEY environment variable. As of Feb 2026, OpenAlex
requires a key for all real usage; without one you get ~100 free credits
total and then errors.

Rate limits: OpenAlex bills per-request in credits, not simple request
counts, but a free key gets $1/day which comfortably covers a candidate
list like this (list+filter calls are cheap: ~10,000 for $1).
"""

import json
import os
import time
from pathlib import Path
from urllib import request, error, parse

CONFIG_PATH = Path("academic_search_config.json")
OUTPUT_JSON = Path("outputs/academic_candidates.json")
OUTPUT_TXT = Path("outputs/academic_candidates.txt")

API_BASE = "https://api.openalex.org"


class ConfigError(Exception):
    pass


def _get(url):
    req = request.Request(url, headers={"User-Agent": "SCIE-Builder-Academic-Engine"})
    with request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_config():
    if not CONFIG_PATH.exists():
        raise ConfigError(f"Missing {CONFIG_PATH}")
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_api_key():
    key = os.environ.get("OPENALEX_API_KEY")
    if not key:
        raise ConfigError(
            "OPENALEX_API_KEY environment variable is not set. "
            "Get a free key at https://openalex.org/settings/api and set it, e.g.:\n"
            '  $env:OPENALEX_API_KEY = "your-key-here"   (PowerShell)'
        )
    return key


def search_surname(surname, country_code, max_results, api_key):
    query = f"display_name.search:{surname},affiliations.institution.country_code:{country_code}"
    url = (
        f"{API_BASE}/authors?filter={parse.quote(query)}"
        f"&per_page={max_results}&api_key={api_key}"
    )
    try:
        data = _get(url)
    except error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"  ERROR ({e.code}) searching '{surname}': {body[:200]}")
        return []
    return data.get("results", [])


def extract_candidate(author, matched_surname, target_country_code):
    affiliations = author.get("affiliations", []) or []
    institutions = []
    for a in affiliations:
        inst = a.get("institution") or {}
        name = inst.get("display_name")
        if name:
            institutions.append({
                "name": name,
                "country_code": inst.get("country_code"),
            })

    total = len(institutions)
    iran_count = sum(
        1 for i in institutions
        if (i["country_code"] or "").lower() == target_country_code.lower()
    )
    ratio = (iran_count / total) if total else 0.0

    if ratio >= 0.7:
        confidence = "high"
    elif ratio >= 0.3:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "openalex_id": author.get("id"),
        "name": author.get("display_name"),
        "matched_surname": matched_surname,
        "orcid": author.get("orcid"),
        "works_count": author.get("works_count"),
        "iran_affiliation_ratio": round(ratio, 2),
        "confidence": confidence,
        "institutions": [i["name"] for i in institutions] or ["(none listed)"],
    }


def discover_academics():
    config = load_config()
    api_key = load_api_key()

    surnames = config["surnames"]
    country_code = config.get("country_code", "ir")
    max_per_surname = config.get("max_results_per_surname", 5)

    print()
    print("Academic Extraction Engine")
    print("-" * 50)
    print(f"Surnames to check : {len(surnames)}")
    print(f"Country filter     : {country_code}")
    print("NOTE: results are candidates for human review, not confirmed matches.")
    print()

    seen_ids = set()
    candidates = []

    for i, surname in enumerate(surnames, 1):
        print(f"[{i}/{len(surnames)}] searching: {surname}")
        results = search_surname(surname, country_code, max_per_surname, api_key)

        for author in results:
            author_id = author.get("id")
            if author_id in seen_ids:
                continue
            seen_ids.add(author_id)
            candidates.append(extract_candidate(author, surname, country_code))

        time.sleep(0.5)  # be a polite citizen of a shared, metered API

    # Highest-confidence (most concentrated in Iran) candidates first
    candidates.sort(key=lambda c: c["iran_affiliation_ratio"], reverse=True)

    OUTPUT_JSON.parent.mkdir(exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(candidates, f, indent=2, ensure_ascii=False)

    counts = {"high": 0, "medium": 0, "low": 0}
    for c in candidates:
        counts[c["confidence"]] += 1

    with open(OUTPUT_TXT, "w", encoding="utf-8") as f:
        f.write("CANDIDATES FOR HUMAN REVIEW -- surname + Iran affiliation match only.\n")
        f.write("This does NOT confirm Ardakan ancestry.\n")
        f.write(
            f"Confidence = share of this person's known institutions that are in "
            f"'{country_code}'. high >= 70%, medium >= 30%, low < 30%.\n\n"
        )
        for c in candidates:
            insts = ", ".join(c["institutions"])
            f.write(
                f"[{c['confidence'].upper():6}] {c['name']} (matched: {c['matched_surname']}) - "
                f"{int(c['iran_affiliation_ratio']*100)}% Iran-affiliated - "
                f"{c['works_count']} works - {insts}\n"
            )

    print()
    print(f"{len(candidates)} unique candidate(s) found across {len(surnames)} surnames")
    print(f"Confidence breakdown: {counts['high']} high, {counts['medium']} medium, {counts['low']} low")
    print(f"Saved -> {OUTPUT_JSON}")
    print(f"Saved -> {OUTPUT_TXT}")
    print("-" * 50)

    return candidates
