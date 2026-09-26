CREATE TABLE IF NOT EXISTS record_versions (
  id TEXT PRIMARY KEY,
  record_index INTEGER NOT NULL,
  field TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'edit',
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  reverted_from TEXT,
  CHECK(action IN ('edit','rollback'))
);
CREATE INDEX IF NOT EXISTS idx_record_versions_record_changed ON record_versions(record_index, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_versions_changed ON record_versions(changed_at DESC);
