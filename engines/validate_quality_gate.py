"""Validate the fail-closed SCIE quality-gate shadow artifact."""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_STATUSES = {
    "discovered_candidate",
    "validated_person",
    "human_confirmed",
    "rejected",
    "needs_review",
}


def source_hash(data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def validate(data: dict, report: dict, minimum_strong: int = 0) -> list[str]:
    errors: list[str] = []
    people = data.get("people") or []
    records = report.get("records") or []
    summary = report.get("summary") or {}
    if report.get("schema") != "scie-quality-gate-shadow-v1":
        errors.append("schema is not scie-quality-gate-shadow-v1")
    if report.get("mode") != "shadow":
        errors.append("quality gate must remain in shadow mode in this PR")
    if len(records) != len(people):
        errors.append(f"record count differs: gate={len(records)} data={len(people)}")
    indexes = [item.get("candidate_index") for item in records]
    if sorted(indexes) != list(range(len(people))):
        errors.append("candidate indexes are incomplete, duplicated, or out of range")
    bad_statuses = sorted({item.get("status") for item in records} - ALLOWED_STATUSES)
    if bad_statuses:
        errors.append("unsupported statuses: " + ", ".join(map(str, bad_statuses)))
    missing_ids = [item.get("candidate_index") for item in records if not item.get("stable_id")]
    if missing_ids:
        errors.append(f"records without stable id: {missing_ids[:10]}")
    counts = Counter(item.get("status") for item in records)
    expected = {
        "validated_people": counts["validated_person"] + counts["human_confirmed"],
        "human_confirmed": counts["human_confirmed"],
        "needs_review": counts["needs_review"],
        "rejected": counts["rejected"],
        "discovered_candidate": counts["discovered_candidate"],
    }
    for key, value in expected.items():
        if summary.get(key) != value:
            errors.append(f"summary mismatch for {key}: {summary.get(key)} != {value}")
    for item in records:
        if item.get("status") not in {"validated_person", "human_confirmed"}:
            continue
        if "NOT_A_PERSON" in (item.get("reason_codes") or []):
            errors.append(f"validated record {item.get('candidate_index')} is marked NOT_A_PERSON")
        provenance = item.get("provenance") or {}
        required = ("source_url", "source_title_or_institution", "evidence_snippet")
        missing = [key for key in required if not provenance.get(key)]
        if missing:
            errors.append(f"validated record {item.get('candidate_index')} lacks provenance: {missing}")
    expected_hash = source_hash(data)
    actual_hash = (report.get("baseline") or {}).get("source_snapshot_sha256")
    if expected_hash != actual_hash:
        errors.append("source snapshot hash differs; report is stale or data changed")
    strong = int((summary.get("evidence_strength") or {}).get("strong", 0))
    if strong < minimum_strong:
        errors.append(f"strong-evidence count {strong} is below protected baseline {minimum_strong}")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=ROOT / "docs" / "data.json")
    parser.add_argument("--report", type=Path, default=ROOT / "docs" / "quality_gate_shadow.json")
    parser.add_argument("--minimum-strong", type=int, default=30)
    args = parser.parse_args()
    data = json.loads(args.data.read_text(encoding="utf-8"))
    report = json.loads(args.report.read_text(encoding="utf-8"))
    errors = validate(data, report, args.minimum_strong)
    if errors:
        raise SystemExit("Quality-gate validation failed:\n- " + "\n- ".join(errors))
    summary = report["summary"]
    print(
        "Quality gate valid: "
        f"{summary['validated_people']} validated / {summary['discovered_candidates']} discovered; "
        f"{summary['needs_review']} direct reviews; {summary['rejected']} rejected."
    )


if __name__ == "__main__":
    main()
