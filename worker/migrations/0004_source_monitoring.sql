CREATE TABLE IF NOT EXISTS source_monitors (
  record_index INTEGER PRIMARY KEY,
  person_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'web',
  content_hash TEXT,
  last_status TEXT NOT NULL DEFAULT 'queued',
  http_status INTEGER,
  last_checked_at TEXT,
  next_check_at TEXT,
  last_changed_at TEXT,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_source_monitors_due ON source_monitors(next_check_at, last_status);
CREATE TABLE IF NOT EXISTS source_changes (
  id TEXT PRIMARY KEY,
  record_index INTEGER NOT NULL,
  previous_hash TEXT,
  current_hash TEXT,
  change_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  detected_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  CHECK(status IN ('pending','accepted','dismissed'))
);
CREATE INDEX IF NOT EXISTS idx_source_changes_status ON source_changes(status, detected_at DESC);
