CREATE TABLE IF NOT EXISTS reverification_requests (
  id TEXT PRIMARY KEY,
  record_index INTEGER NOT NULL,
  person_name TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  requested_by TEXT NOT NULL,
  issue_number INTEGER,
  result_json TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK(record_index >= 0),
  CHECK(status IN ('queued','processing','completed','failed','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_reverification_record_created ON reverification_requests(record_index, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reverification_status_created ON reverification_requests(status, created_at DESC);
PRAGMA optimize;
