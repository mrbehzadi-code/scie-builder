import json
import unittest
from pathlib import Path

from engines.quality_gate import assess_record, run_gate, stable_id


ROOT = Path(__file__).resolve().parents[1]


class QualityGateTests(unittest.TestCase):
    def test_persian_and_edge_case_fixtures(self):
        cases = json.loads((ROOT / "tests/fixtures/quality_gate_cases.json").read_text(encoding="utf-8"))
        for index, case in enumerate(cases):
            with self.subTest(name=case["name"]):
                record = dict(case)
                expected_status = record.pop("expected_status")
                expected_reason = record.pop("expected_reason", None)
                result = assess_record(record, index)
                self.assertEqual(result["status"], expected_status)
                if expected_reason:
                    self.assertIn(expected_reason, result["reason_codes"])

    def test_stable_id_does_not_depend_on_row_order(self):
        record = {"name": "Ali Rezaei", "source": "OpenAlex", "url": "https://openalex.org/A1234567890"}
        self.assertEqual(stable_id(record), "openalex:A1234567890")
        self.assertEqual(stable_id(record), stable_id(dict(record)))

    def test_shadow_mode_never_mutates_input(self):
        data = {"generated_at": "2026-10-09", "people": [{"name": "علی رضایی", "source": "رسمی", "url": "https://example.org/a", "location": "اردکان", "evidence": ["شاهد"]}]}
        original = json.loads(json.dumps(data, ensure_ascii=False))
        report = run_gate(data, ROOT / "tests" / "fixtures" / "missing-feedback.json")
        self.assertEqual(data, original)
        self.assertTrue(report["baseline"]["public_snapshot_unchanged"])
        self.assertEqual(report["mode"], "shadow")


if __name__ == "__main__":
    unittest.main()
