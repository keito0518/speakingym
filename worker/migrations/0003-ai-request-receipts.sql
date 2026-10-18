-- STAGING ONLY. Do not apply to production until backup, D1 rehearsal,
-- explicit consent for temporary AI answer retention and automatic purge job.
-- Requires worker/migrations/0002-ai-turn-ledger.sql before any activation.
CREATE TABLE IF NOT EXISTS ai_request_receipts (
  uid TEXT NOT NULL,
  session_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  body_sha256 TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','completed','failed')),
  status INTEGER,
  response_json TEXT,
  turn_reservation_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  response_expires_at INTEGER NOT NULL,
  PRIMARY KEY(uid,session_id,request_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_request_receipts_expiry
  ON ai_request_receipts(expires_at);
-- Deliberately no modification to existing sessions, billing, or turn counters.
