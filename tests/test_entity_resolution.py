import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engines.entity_resolution import compare_pair,normalize_text,similarity,resolve_records,load_records

class EntityResolutionTests(unittest.TestCase):
    def test_normalization(self):
        self.assertEqual(normalize_text("علی‌رضا اردکانی"),"aly rza ardkany")
        self.assertEqual(normalize_text("Ali-Reza Ardakani"),"ali reza ardakani")
    def test_similarity(self):
        self.assertEqual(similarity("Ali Ardakani","Ali Ardakani"),1.0)
        self.assertGreater(similarity("Ali Ardakani","Ali-Ardakani"),.85)
    def test_same_name_different_org(self):
        r=compare_pair({"name":"Ali Ardakani","organization":"University of Tehran","location":"Yazd"},{"name":"Ali Ardakani","organization":"University of Shiraz","location":"Tehran"})
        self.assertEqual(r["decision"],"UNCERTAIN");self.assertIn("organization",r["conflicts"]);self.assertTrue(r["human_review_required"])
    def test_variant_same_org_location(self):
        r=compare_pair({"name":"Alireza Hekmat Ardakan","organization":"X","location":"Ardakan"},{"name":"Alireza Hekmat-Ardakan","organization":"X","location":"Ardakan"})
        self.assertIn(r["decision"],{"LIKELY_SAME_PERSON","SAME_PERSON"})
    def test_transliteration(self):
        r=compare_pair({"name":"علی اردکانی","organization":"X","location":"Yazd"},{"name":"Ali Ardakani","organization":"X","location":"Yazd"})
        self.assertIn(r["decision"],{"LIKELY_SAME_PERSON","SAME_PERSON","UNCERTAIN"});self.assertTrue("evidence" in r)
    def test_exact_stable_identifier(self):
        r=compare_pair({"name":"A","openalex_id":"https://openalex.org/A1"},{"name":"B","openalex_id":"https://openalex.org/A1"})
        self.assertEqual(r["decision"],"SAME_PERSON");self.assertFalse(r["human_review_required"])
    def test_incomplete_uncertain(self):
        r=compare_pair({"name":"Ali"},{"name":"Ali"});self.assertEqual(r["decision"],"UNCERTAIN");self.assertTrue(r["human_review_required"])
    def test_preserves_input_count(self):
        r=resolve_records([{"name":"A","organization":"X"},{"name":"A","organization":"X"},{"name":"B","organization":"Y"}]);self.assertEqual(r["input_count"],3);self.assertEqual(r["pair_count"],3)
    def test_real_scie_snapshot(self):
        p=Path(__file__).resolve().parents[1]/"docs"/"data.json"
        if not p.exists():self.skipTest("SCIE snapshot unavailable")
        records=load_records(p);r=resolve_records(records);self.assertEqual(len(records),364);self.assertEqual(r["pair_count"],66066);self.assertEqual(sum(r["decision_counts"].values()),66066)

if __name__=="__main__":unittest.main()
