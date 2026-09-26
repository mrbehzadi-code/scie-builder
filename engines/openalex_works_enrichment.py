from __future__ import annotations

import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data.json"
OPENALEX_ID = re.compile(r"openalex\.org/(A\d+)", re.I)


def author_id(person: dict) -> str:
    for value in (person.get("url"), person.get("specialty_source_url"), person.get("openalex_id")):
        match = OPENALEX_ID.search(str(value or ""))
        if match:
            return match.group(1).upper()
    return ""


def fetch_works(aid: str) -> tuple[str, list[dict]]:
    query = urlencode({
        "filter": f"authorships.author.id:{aid}",
        "sort": "cited_by_count:desc",
        "per-page": 5,
        "select": "id,display_name,publication_year,doi,cited_by_count",
    })
    request = Request(
        f"https://api.openalex.org/works?{query}",
        headers={"User-Agent": "SCIE-Atlas/1.0 (public research metadata enrichment)"},
    )
    for attempt in range(4):
        try:
            with urlopen(request, timeout=30) as response:
                payload = json.load(response)
            works = []
            for work in payload.get("results", []):
                title = str(work.get("display_name") or "").strip()
                if not title:
                    continue
                works.append({
                    "title": title,
                    "year": work.get("publication_year"),
                    "url": work.get("doi") or work.get("id") or "",
                    "cited_by_count": int(work.get("cited_by_count") or 0),
                    "source": "OpenAlex",
                })
            return aid, works
        except Exception:
            if attempt == 3:
                return aid, []
            time.sleep(1.5 * (attempt + 1))
    return aid, []


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    people = data.get("people", [])
    ids = sorted({aid for person in people if (aid := author_id(person))})
    results: dict[str, list[dict]] = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(fetch_works, aid) for aid in ids]
        for number, future in enumerate(as_completed(futures), 1):
            aid, works = future.result()
            results[aid] = works
            if number % 50 == 0:
                print(f"Fetched {number}/{len(ids)} authors")
    enriched = 0
    for person in people:
        aid = author_id(person)
        if not aid:
            person.setdefault("articles", [])
            person.setdefault("articles_status", "not_applicable_or_no_openalex_profile")
            continue
        person["articles"] = results.get(aid, [])
        person["articles_status"] = "available" if person["articles"] else "no_public_works_found"
        person["articles_source_url"] = f"https://openalex.org/{aid}"
        if person["articles"]:
            enriched += 1
    data.setdefault("stats", {})["profiles_with_article_titles"] = enriched
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Stored article titles for {enriched}/{len(people)} records")


if __name__ == "__main__":
    main()
