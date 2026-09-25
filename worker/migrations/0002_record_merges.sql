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

INSERT OR IGNORE INTO merge_requests(id,primary_index,duplicate_index,reason,confidence,evidence_json,status,proposed_by,reviewed_by,created_at,reviewed_at) VALUES
('auto-stable-2-21',2,21,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://openalex.org/a5076407063"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z'),
('auto-stable-69-70',69,70,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://openalex.org/a5107076639"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z'),
('auto-stable-90-121',90,121,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://openalex.org/a5032097007"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z'),
('auto-stable-104-105',104,105,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://openalex.org/a5063950164"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z'),
('auto-stable-160-161',160,161,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://openalex.org/a5088280948"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z'),
('auto-stable-196-197',196,197,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://openalex.org/a5011798315"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z'),
('auto-stable-199-203',199,203,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://openalex.org/a5041024674"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z'),
('auto-stable-329-330',329,330,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://github.com/abolfazlkamaliardakani"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z'),
('auto-stable-335-383',335,383,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://github.com/ardakaniali"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z'),
('auto-stable-416-417',416,417,'شناسه پایدار منبع کاملاً یکسان',100,'{"provider_url":"https://openalex.org/a5106072834"}','applied','system','system','2026-09-25T00:00:00Z','2026-09-25T00:00:00Z');

INSERT OR IGNORE INTO record_merges(duplicate_index,primary_index,request_id,merged_by,merged_at) VALUES
(21,2,'auto-stable-2-21','system','2026-09-25T00:00:00Z'),
(70,69,'auto-stable-69-70','system','2026-09-25T00:00:00Z'),
(121,90,'auto-stable-90-121','system','2026-09-25T00:00:00Z'),
(105,104,'auto-stable-104-105','system','2026-09-25T00:00:00Z'),
(161,160,'auto-stable-160-161','system','2026-09-25T00:00:00Z'),
(197,196,'auto-stable-196-197','system','2026-09-25T00:00:00Z'),
(203,199,'auto-stable-199-203','system','2026-09-25T00:00:00Z'),
(330,329,'auto-stable-329-330','system','2026-09-25T00:00:00Z'),
(383,335,'auto-stable-335-383','system','2026-09-25T00:00:00Z'),
(417,416,'auto-stable-416-417','system','2026-09-25T00:00:00Z');

PRAGMA optimize;
