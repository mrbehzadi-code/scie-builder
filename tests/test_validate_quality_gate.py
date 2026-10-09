import json
import unittest
from pathlib import Path

from engines.quality_gate import run_gate
from engines.validate_quality_gate import validate


ROOT = Path(__file__).resolve().parents[1]


class QualityGateValidationTests(unittest.TestCase):
    def setUp(self):
        self.data = {
            "generated_at": "2026-10-09",
            "people": [{
                "name": "علی رضایی",
                "source": "دانشگاه اردکان",
                "url": "https://example.org/people/ali-rezaei",
                "location": "اردکان",
                "evidence": ["عضو هیئت علمی دانشگاه اردکان"],
            }],
        }

    def test_current_report_is_self_consistent(self):
        report = run_gate(self.data, ROOT / "tests" / "fixtures" / "missing-feedback.json")
        self.assertEqual(validate(self.data, report), [])

    def test_stale_report_is_rejected(self):
        report = run_gate(self.data, ROOT / "tests" / "fixtures" / "missing-feedback.json")
        changed = json.loads(json.dumps(self.data, ensure_ascii=False))
        changed["people"][0]["name"] = "نام تغییرکرده"
        errors = validate(changed, report)
        self.assertTrue(any("hash differs" in error for error in errors))

    def test_validated_claim_requires_provenance(self):
        report = run_gate(self.data, ROOT / "tests" / "fixtures" / "missing-feedback.json")
        report["records"][0]["provenance"]["evidence_snippet"] = None
        errors = validate(self.data, report)
        self.assertTrue(any("lacks provenance" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
