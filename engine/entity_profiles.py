"""Canonical entity layer for SCIE.

Only pair decisions marked SAME_PERSON are collapsed into a derived entity. Raw
candidate records remain untouched. LIKELY_SAME_PERSON and UNCERTAIN are never
auto-merged.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data.json"
PROFILE = ROOT / "docs" / "profile_enrichment.json"
EXTERNAL = ROOT / "docs" / "external_enrichment.json"
RESOLUTION = ROOT / "docs" / "entity_resolution.json"
OUTPUT = ROOT / "docs" / "entities.json"


class UnionFind:
    def __init__(self, n: int):
        self.p = list(range(n))

    def find(self, x: int) -> int:
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[rb] = ra


def pick(values):
    for v in values:
        if v not in (None, "", "—", "-"):
            return v
    return None


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    people = data.get("people", [])
    profiles = json.loads(PROFILE.read_text(encoding="utf-8")).get("profiles", []) if PROFILE.exists() else []
    external = json.loads(EXTERNAL.read_text(encoding="utf-8")).get("profiles", []) if EXTERNAL.exists() else []
    resolution = json.loads(RESOLUTION.read_text(encoding="utf-8")) if RESOLUTION.exists() else {}

    profile_by = {x.get("candidate_index"): x for x in profiles if isinstance(x, dict)}
    external_by = {x.get("candidate_index"): x for x in external if isinstance(x, dict)}
    uf = UnionFind(len(people))
    same_pairs = []

    for pair in resolution.get("pairs", []):
        if pair.get("decision") != "SAME_PERSON":
            continue
        a, b = pair.get("candidate_a"), pair.get("candidate_b")
        if isinstance(a, int) and isinstance(b, int) and 0 <= a < len(people) and 0 <= b < len(people):
            uf.union(a, b)
            same_pairs.append((a, b))

    groups = {}
    for i in range(len(people)):
        groups.setdefault(uf.find(i), []).append(i)

    entities = []
    candidate_to_entity = {}
    merged_count = 0

    for seq, indexes in enumerate(sorted(groups.values(), key=lambda xs: min(xs)), 1):
        entity_id = f"scie-entity-{seq:05d}"
        rows = [people[i] for i in indexes]
        ps = [profile_by.get(i, {}) for i in indexes]
        exs = [external_by.get(i, {}) for i in indexes]
        live = [x.get("data", {}) for x in exs if x.get("status") == "enriched"]

        aliases = []
        for r in rows:
            name = str(r.get("name") or "").strip()
            if name and name not in aliases:
                aliases.append(name)

        urls = []
        for r in rows:
            u = r.get("url") or r.get("source_url")
            if u and u not in urls:
                urls.append(u)

        sources = sorted({str(r.get("source")) for r in rows if r.get("source")})
        organizations = []
        locations = []
        openalex_ids = []
        github_usernames = []
        orcids = []

        for p in ps:
            if p.get("organization") and p["organization"] not in organizations:
                organizations.append(p["organization"])
            loc = (p.get("location") or {}).get("raw")
            if loc and loc not in locations:
                locations.append(loc)
            ids = p.get("identifiers") or {}
            if ids.get("openalex_id") and ids["openalex_id"] not in openalex_ids:
                openalex_ids.append(ids["openalex_id"])
            if ids.get("github_username") and ids["github_username"] not in github_usernames:
                github_usernames.append(ids["github_username"])

        for x in live:
            company = x.get("company")
            if company and company not in organizations:
                organizations.append(company)
            location = x.get("location")
            if location and location not in locations:
                locations.append(location)
            orcid = x.get("orcid")
            if orcid and orcid not in orcids:
                orcids.append(orcid)
            for inst in x.get("institutions") or []:
                if inst and inst not in organizations:
                    organizations.append(inst)
            for inst in x.get("last_known_institutions") or []:
                if isinstance(inst, dict) and inst.get("name") and inst["name"] not in organizations:
                    organizations.append(inst["name"])

        enriched_sources = sum(1 for x in exs if x.get("status") == "enriched")
        if len(indexes) > 1:
            merged_count += len(indexes) - 1

        entity = {
            "entity_id": entity_id,
            "candidate_indexes": indexes,
            "record_count": len(indexes),
            "primary_name": pick([x.get("display_name") for x in live] + aliases) or "(unnamed)",
            "aliases": aliases,
            "sources": sources,
            "source_urls": urls,
            "organizations": organizations,
            "locations": locations,
            "identifiers": {
                "openalex_ids": openalex_ids,
                "github_usernames": github_usernames,
                "orcids": orcids,
            },
            "external_enriched_records": enriched_sources,
            "identity_status": "SAME_PERSON_STABLE_EVIDENCE" if len(indexes) > 1 else "SINGLE_CANDIDATE",
            "human_review_required": False if len(indexes) > 1 else True,
        }
        entities.append(entity)
        for idx in indexes:
            candidate_to_entity[str(idx)] = entity_id

    metrics = {
        "candidate_records": len(people),
        "canonical_entities": len(entities),
        "records_collapsed": merged_count,
        "same_person_pairs_applied": len(same_pairs),
        "multi_record_entities": sum(1 for x in entities if x["record_count"] > 1),
        "entities_with_external_data": sum(1 for x in entities if x["external_enriched_records"] > 0),
    }

    result = {
        "generated_at": data.get("generated_at"),
        "metrics": metrics,
        "candidate_to_entity": candidate_to_entity,
        "entities": entities,
        "notice": "Derived canonical layer. Only SAME_PERSON decisions are collapsed; raw candidates remain unchanged.",
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metrics, ensure_ascii=False))


if __name__ == "__main__":
    main()
