from __future__ import annotations

import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data.json"
ID_RE = re.compile(r"openalex\.org/(A\d+)", re.I)
FIELD_FA = {
    "Agricultural and Biological Sciences": "علوم کشاورزی و زیستی",
    "Arts and Humanities": "هنر و علوم انسانی",
    "Biochemistry, Genetics and Molecular Biology": "زیست‌شیمی، ژنتیک و زیست‌شناسی مولکولی",
    "Business, Management and Accounting": "کسب‌وکار، مدیریت و حسابداری",
    "Chemical Engineering": "مهندسی شیمی",
    "Chemistry": "شیمی",
    "Computer Science": "علوم و مهندسی کامپیوتر",
    "Decision Sciences": "علوم تصمیم‌گیری",
    "Dentistry": "دندانپزشکی",
    "Earth and Planetary Sciences": "علوم زمین و سیاره‌ای",
    "Economics, Econometrics and Finance": "اقتصاد، اقتصادسنجی و مالی",
    "Energy": "انرژی",
    "Engineering": "مهندسی",
    "Environmental Science": "علوم محیط‌زیست",
    "Health Professions": "حرفه‌های سلامت",
    "Immunology and Microbiology": "ایمنی‌شناسی و میکروب‌شناسی",
    "Materials Science": "مهندسی و علم مواد",
    "Mathematics": "ریاضیات",
    "Medicine": "پزشکی",
    "Neuroscience": "علوم اعصاب",
    "Nursing": "پرستاری",
    "Pharmacology, Toxicology and Pharmaceutics": "داروسازی، سم‌شناسی و فارماکولوژی",
    "Physics and Astronomy": "فیزیک و اخترشناسی",
    "Psychology": "روان‌شناسی",
    "Social Sciences": "علوم اجتماعی",
    "Veterinary": "دامپزشکی",
}


def fetch_author(openalex_id: str):
    request = Request(
        f"https://api.openalex.org/authors/{openalex_id}",
        headers={"User-Agent": "SCIE-Specialty-Enrichment/1.0 (mailto:public@scie.local)"},
    )
    for attempt in range(4):
        try:
            with urlopen(request, timeout=25) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception:
            if attempt == 3:
                return None
            time.sleep(1.5 * (attempt + 1))


def specialty(author: dict):
    topics = author.get("topics") or []
    if not topics:
        return None
    top = topics[0]
    field = (top.get("field") or {}).get("display_name") or ""
    subfield = (top.get("subfield") or {}).get("display_name") or ""
    topic = top.get("display_name") or ""
    english = " — ".join(dict.fromkeys(item for item in (field, subfield) if item)) or topic
    persian = FIELD_FA.get(field, field or subfield or topic)
    evidence = "OpenAlex topics: " + " | ".join(dict.fromkeys(item for item in (topic, subfield, field) if item))
    return persian, english, evidence


def main():
    document = json.loads(DATA.read_text(encoding="utf-8"))
    people = document.get("people", [])
    targets = []
    for index, person in enumerate(people):
        match = ID_RE.search(str(person.get("url") or person.get("source_url") or ""))
        if match and not person.get("specialty"):
            targets.append((index, match.group(1).upper()))
    results = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_author, openalex_id): (index, openalex_id) for index, openalex_id in targets}
        for future in as_completed(futures):
            index, openalex_id = futures[future]
            author = future.result()
            if author:
                results[index] = (openalex_id, author)
    enriched = 0
    for index, (openalex_id, author) in results.items():
        value = specialty(author)
        if not value:
            people[index].update({
                "specialty_evidence": "OpenAlex profile reviewed; no public works or topic classification is available.",
                "specialty_source_url": f"https://openalex.org/{openalex_id}",
                "specialty_status": "no_public_specialty_evidence",
            })
            continue
        persian, english, evidence = value
        people[index].update({
            "specialty": persian,
            "specialty_en": english,
            "specialty_evidence": evidence,
            "specialty_source_url": f"https://openalex.org/{openalex_id}",
            "specialty_status": "inferred_from_openalex_topics",
        })
        enriched += 1
    stats = document.setdefault("stats", {})
    stats["specialty_enriched_records"] = sum(bool(person.get("specialty")) for person in people)
    stats["specialty_reviewed_records"] = sum(bool(person.get("specialty_status")) for person in people)
    DATA.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"targets": len(targets), "fetched": len(results), "enriched": enriched, "total_with_specialty": document["stats"]["specialty_enriched_records"]}))


if __name__ == "__main__":
    main()
