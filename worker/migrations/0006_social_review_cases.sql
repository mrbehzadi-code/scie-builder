CREATE TABLE IF NOT EXISTS social_review_cases (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  machine_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decision TEXT,
  candidate_name TEXT,
  matched_record_index INTEGER,
  reviewer_note TEXT,
  issue_number INTEGER,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  CHECK(status IN ('pending','needs_evidence','linked','candidate_approved','irrelevant','nonperson')),
  CHECK(decision IS NULL OR decision IN ('needs_evidence','link_existing','create_candidate','irrelevant','relevant_nonperson'))
);
CREATE INDEX IF NOT EXISTS idx_social_review_status_seen ON social_review_cases(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_review_platform_status ON social_review_cases(platform, status);
