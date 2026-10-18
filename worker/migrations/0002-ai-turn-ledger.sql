-- Additive and repeat-safe. Does not rewrite existing sessions, turns, or paid plans.
-- DO NOT enable TURN_LEDGER_MODE until this migration and its verification run.
-- A single INSERT guarded by both limits atomically reserves one turn via its trigger.
CREATE TABLE IF NOT EXISTS ai_turn_reservations (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('reserved','completed','refunded')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_turn_reservations_account ON ai_turn_reservations(uid,created_at);
CREATE INDEX IF NOT EXISTS idx_ai_turn_reservations_session ON ai_turn_reservations(session_id,uid);
CREATE TRIGGER IF NOT EXISTS ai_turn_reservation_count_insert
AFTER INSERT ON ai_turn_reservations
WHEN NEW.state = 'reserved'
BEGIN
  UPDATE ai_sessions SET turns=turns+1 WHERE id=NEW.session_id AND uid=NEW.uid;
END;
CREATE TRIGGER IF NOT EXISTS ai_turn_reservation_count_refund
AFTER UPDATE OF state ON ai_turn_reservations
WHEN OLD.state = 'reserved' AND NEW.state = 'refunded'
BEGIN
  UPDATE ai_sessions SET turns=turns-1
  WHERE id=NEW.session_id AND uid=NEW.uid AND turns>0;
END;
