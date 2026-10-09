"""Fail-closed person/locality quality gate for SCIE discovery candidates.

The gate runs in shadow mode by default: it never deletes or rewrites raw
discovery data.  It produces a reviewable derived snapshot with machine-readable
reason codes and deterministic identifiers.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "docs" / "data.json"
DEFAULT_OUTPUT = ROOT / "docs" / "quality_gate_shadow.json"
DEFAULT_FEEDBACK = ROOT / "docs" / "user_feedback.json"
ALGORITHM_VERSION = "quality-gate-v1.0.0"

NOT_A_PERSON = "NOT_A_PERSON"
INSUFFICIENT_LOCALITY_EVIDENCE = "INSUFFICIENT_LOCALITY_EVIDENCE"
AMBIGUOUS_NAME = "AMBIGUOUS_NAME"
INSUFFICIENT_SOURCE_PROVENANCE = "INSUFFICIENT_SOURCE_PROVENANCE"
POSSIBLE_DUPLICATE = "POSSIBLE_DUPLICATE"
REQUIRES_HUMAN_REVIEW = "REQUIRES_HUMAN_REVIEW"

TITLE_WORDS = {
    "دکتر", "مهندس", "حاج", "حاجی", "استاد", "سید", "سرکار", "جناب",
    "dr", "doctor", "engineer", "prof", "professor", "mr", "mrs", "ms",
}
NON_PERSON_WORDS = {
    "دانشگاه", "شرکت", "سازمان", "اداره", "فرمانداری", "شهرداری", "شورا",
    "انجمن", "موسسه", "مؤسسه", "مرکز", "بیمارستان", "مدرسه", "کانون",
    "پژوهشگاه", "خبرگزاری", "کانال", "گروه", "کمیسیون", "سامانه",
    "university", "company", "organization", "institute", "department",
    "hospital", "school", "channel", "group", "committee", "foundation",
}
PHRASE_MARKERS = {
    " در سفر ", " در مناظرات ", " اعلام کرد ", " برگزار شد ", " با حضور ",
    " گفت و گو ", " خبر ", " گزارش ", " انتخابات ", " افتتاح ",
}
LOCALITY_RELATION_MARKERS = {
    "اهل اردکان", "متولد اردکان", "شهرستان اردکان", "اردکان، یزد",
    "اردکان یزد", "دانشگاه اردکان", "شهرداری اردکان", "فرمانداری اردکان",
    "شورای شهر اردکان", "آموزش و پرورش اردکان", "شبکه بهداشت اردکان",
    "رابط اردکان", "خیر مدرسه ساز اردکان", "ardakan, yazd", "ardakan yazd",
    "born in ardakan", "ardakan university", "ardakan county",
}


def normalize(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value or ""))
    text = text.translate(str.maketrans({"ي": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه"}))
    text = text.replace("\u200c", " ").casefold()
    return re.sub(r"\s+", " ", text).strip()


def name_tokens(value: Any) -> list[str]:
    text = normalize(value)
    text = re.sub(r"[^\w\u0600-\u06ff.'’-]+", " ", text)
    return [token.strip(".'’-") for token in text.split() if token.strip(".'’-")]


def canonical_url(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    try:
        parts = urlsplit(raw)
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            return ""
        return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), parts.query, ""))
    except ValueError:
        return ""


def stable_id(record: dict[str, Any]) -> str:
    url = canonical_url(record.get("url") or record.get("profile_url"))
    match = re.search(r"openalex\.org/(A\d+)", url, re.I)
    if match:
        return f"openalex:{match.group(1).upper()}"
    orcid = normalize(record.get("orcid"))
    if re.fullmatch(r"\d{4}-\d{4}-\d{4}-\d{3}[\dXx]", orcid):
        return f"orcid:{orcid.upper()}"
    github = normalize(record.get("github_username") or record.get("github_login"))
    if github:
        return f"github:{github}"
    seed = "|".join((normalize(record.get("name_fa") or record.get("name")), url, normalize(record.get("source"))))
    return "scie-candidate:" + hashlib.sha256(seed.encode("utf-8")).hexdigest()[:20]


def person_name_assessment(value: Any) -> tuple[bool, list[str], list[str]]:
    raw = normalize(value)
    tokens = name_tokens(value)
    reasons: list[str] = []
    observations: list[str] = []
    if not raw or len(raw) > 120 or re.search(r"https?://|[@#]|\d{3,}", raw):
        return False, [NOT_A_PERSON], ["name is empty, URL-like, numeric, or implausibly long"]
    content_tokens = [token for token in tokens if token not in TITLE_WORDS]
    if any(f" {marker.strip()} " in f" {raw} " for marker in PHRASE_MARKERS):
        reasons.append(NOT_A_PERSON)
        observations.append("sentence/headline marker detected")
    non_person_hits = sorted(set(content_tokens) & NON_PERSON_WORDS)
    if non_person_hits:
        reasons.append(NOT_A_PERSON)
        observations.append("organization/title tokens: " + ", ".join(non_person_hits))
    if len(content_tokens) < 2:
        reasons.append(AMBIGUOUS_NAME)
        observations.append("fewer than two meaningful name components")
    if len(content_tokens) > 7:
        reasons.append(NOT_A_PERSON)
        observations.append("too many components for a person name")
    return not reasons, sorted(set(reasons)), observations


def record_text(record: dict[str, Any], include_name: bool = True) -> str:
    keys = ["detail", "location", "affiliation", "organization", "organization_fa", "evidence"]
    if include_name:
        keys.insert(0, "name")
    chunks: list[str] = []
    for key in keys:
        value = record.get(key)
        if isinstance(value, list):
            chunks.extend(str(item) for item in value)
        elif value:
            chunks.append(str(value))
    return normalize(" ".join(chunks))


def locality_evidence(record: dict[str, Any]) -> tuple[str, list[str]]:
    without_name = record_text(record, include_name=False)
    hits = sorted(marker for marker in LOCALITY_RELATION_MARKERS if marker in without_name)
    location = normalize(record.get("location"))
    if location in {"ardakan", "ardakan, iran", "اردکان", "اردکان، ایران", "اردکان، یزد"}:
        hits.append("explicit location field")
    unique = sorted(set(hits))
    if any(marker in unique for marker in ("اهل اردکان", "متولد اردکان", "born in ardakan", "explicit location field")):
        return "strong", unique
    if unique:
        return "medium", unique
    name = normalize(record.get("name_fa") or record.get("name"))
    if "اردکانی" in name or re.search(r"\b(ardakani|ardakan)\b", name):
        return "weak", ["surname/name signal only"]
    return "none", []


def provenance(record: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    evidence = record.get("evidence")
    snippets = [str(item).strip() for item in evidence] if isinstance(evidence, list) else ([str(evidence).strip()] if evidence else [])
    url = canonical_url(record.get("url"))
    source = str(record.get("source") or "").strip()
    detail = str(record.get("detail") or "").strip()
    publication_date = record.get("publication_date") or record.get("published_at")
    discovered_at = record.get("discovered_at") or record.get("imported_at")
    return bool(url and source and (snippets or detail)), {
        "source_url": url,
        "source_title_or_institution": source,
        "publication_date": publication_date,
        "discovered_at": discovered_at,
        "evidence_snippet": snippets[0] if snippets else detail[:500],
    }


def feedback_maps(path: Path) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    if not path.exists():
        return {}, {}
    reviews = json.loads(path.read_text(encoding="utf-8")).get("reviews", [])
    by_index: dict[str, dict[str, Any]] = {}
    by_name: dict[str, dict[str, Any]] = {}
    for item in reviews:
        by_index[str(item.get("record_index"))] = item
        key = normalize(item.get("person_name"))
        if key:
            by_name[key] = item
    return by_index, by_name


def assess_record(record: dict[str, Any], index: int, feedback: dict[str, Any] | None = None, duplicate: bool = False) -> dict[str, Any]:
    name = record.get("name_fa") or record.get("name") or ""
    is_person, reasons, name_notes = person_name_assessment(name)
    provenance_ok, provenance_data = provenance(record)
    strength, locality_signals = locality_evidence(record)
    human = feedback or None
    if not provenance_ok:
        reasons.append(INSUFFICIENT_SOURCE_PROVENANCE)
    if duplicate:
        reasons.append(POSSIBLE_DUPLICATE)
    if human and human.get("verdict") == "not_ardakani":
        status = "rejected"
    elif not is_person:
        status = "rejected"
    elif human and human.get("verdict") == "ardakani":
        status = "human_confirmed"
    elif provenance_ok and strength in {"strong", "medium"} and not duplicate:
        status = "validated_person"
    elif strength in {"none", "weak"} and provenance_ok and not duplicate:
        reasons.append(INSUFFICIENT_LOCALITY_EVIDENCE)
        status = "discovered_candidate"
    else:
        status = "needs_review"
    if status in {"needs_review", "discovered_candidate"}:
        reasons.append(REQUIRES_HUMAN_REVIEW)
    evidence_strength = "strong" if status == "human_confirmed" or (provenance_ok and strength == "strong") else "medium" if provenance_ok and strength == "medium" else "weak"
    return {
        "candidate_index": index,
        "stable_id": stable_id(record),
        "name": record.get("name"),
        "name_fa": record.get("name_fa"),
        "status": status,
        "reason_codes": sorted(set(reasons)),
        "algorithm_version": ALGORITHM_VERSION,
        "person_name_observations": name_notes,
        "locality_evidence_strength": strength,
        "locality_signals": locality_signals,
        "evidence_strength": evidence_strength,
        "provenance": provenance_data,
        "human_review": human,
        "raw_verification": record.get("verification"),
    }


def run_gate(data: dict[str, Any], feedback_path: Path = DEFAULT_FEEDBACK, duplicate_indexes: set[int] | None = None) -> dict[str, Any]:
    people = data.get("people") or []
    by_index, by_name = feedback_maps(feedback_path)
    duplicates = duplicate_indexes or set()
    rows = []
    for index, record in enumerate(people):
        review = by_index.get(str(index)) or by_name.get(normalize(record.get("name_fa") or record.get("name")))
        rows.append(assess_record(record, index, review, index in duplicates))
    counts = Counter(row["status"] for row in rows)
    strengths = Counter(row["evidence_strength"] for row in rows)
    reasons = Counter(code for row in rows for code in row["reason_codes"])
    validated = counts["validated_person"] + counts["human_confirmed"]
    source_hash = hashlib.sha256(
        json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return {
        "schema": "scie-quality-gate-shadow-v1",
        "schema_version": 1,
        "mode": "shadow",
        "algorithm_version": ALGORITHM_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_snapshot_generated_at": data.get("generated_at"),
        "baseline": {
            "discovered_candidates": len(people),
            "public_snapshot_unchanged": True,
            "source_snapshot_sha256": source_hash,
        },
        "summary": {
            "discovered_candidates": len(people),
            "validated_people": validated,
            "human_confirmed": counts["human_confirmed"],
            "needs_review": counts["needs_review"],
            "rejected": counts["rejected"],
            "discovered_candidate": counts["discovered_candidate"],
            "validation_rate": round(validated / len(people) * 100, 2) if people else 0,
            "evidence_strength": dict(strengths),
            "reason_codes": dict(reasons),
        },
        "records": rows,
        "notice": "Shadow output only. Raw discovery and the public snapshot were not modified.",
        "decision_needed_from_mohammadreza": "Approve switching the public directory from all discovered candidates to validated_person + human_confirmed only after reviewing this shadow report.",
    }


def duplicate_indexes(path: Path) -> set[int]:
    if not path.exists():
        return set()
    document = json.loads(path.read_text(encoding="utf-8"))
    result: set[int] = set()
    for pair in document.get("pairs", []):
        if pair.get("decision") in {"LIKELY_SAME_PERSON", "UNCERTAIN"}:
            result.update((int(pair["candidate_a"]), int(pair["candidate_b"])))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--feedback", type=Path, default=DEFAULT_FEEDBACK)
    parser.add_argument("--entity-resolution", type=Path, default=ROOT / "docs" / "entity_resolution.json")
    args = parser.parse_args()
    data = json.loads(args.input.read_text(encoding="utf-8"))
    report = run_gate(data, args.feedback, duplicate_indexes(args.entity_resolution))
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
