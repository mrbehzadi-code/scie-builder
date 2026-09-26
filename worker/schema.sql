CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS activities_user_created ON activities(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS record_overrides (
  record_index INTEGER NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(record_index, field)
);
CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  person_a_index INTEGER NOT NULL,
  person_b_index INTEGER NOT NULL,
  type TEXT NOT NULL,
  note TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS merge_requests (
  id TEXT PRIMARY KEY,
  primary_index INTEGER NOT NULL,
  duplicate_index INTEGER NOT NULL,
  reason TEXT,
  confidence INTEGER NOT NULL DEFAULT 0,
  evidence_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  proposed_by TEXT NOT NULL,
  reviewed_by TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  CHECK(primary_index >= 0 AND duplicate_index >= 0 AND primary_index != duplicate_index),
  CHECK(status IN ('pending','approved','rejected','applied'))
);
CREATE INDEX IF NOT EXISTS idx_merge_requests_status_created ON merge_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merge_requests_proposed_by ON merge_requests(proposed_by, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merge_requests_pending_pair ON merge_requests(primary_index, duplicate_index) WHERE status = 'pending';
CREATE TABLE IF NOT EXISTS record_merges (
  duplicate_index INTEGER PRIMARY KEY,
  primary_index INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  merged_by TEXT NOT NULL,
  merged_at TEXT NOT NULL,
  CHECK(primary_index >= 0 AND duplicate_index >= 0 AND primary_index != duplicate_index)
);
CREATE INDEX IF NOT EXISTS idx_record_merges_primary ON record_merges(primary_index);
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
