-- Additive, opt-in. Requires ONLY 0002; 0003/0004 are NOT prerequisites.
-- Apply to staging first. No existing session is enrolled or deleted.
CREATE TABLE IF NOT EXISTS free_session_reservations (
 session_id TEXT PRIMARY KEY NOT NULL,
 uid TEXT NOT NULL,
 day TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('pending','completed','released'))
);
CREATE INDEX IF NOT EXISTS idx_free_session_account ON free_session_reservations(uid,day,state);
-- Each first turn (including a retry after release) must own a daily slot.
-- Ignore rejects the INSERT without invoking the existing turn-count trigger.
CREATE TRIGGER IF NOT EXISTS free_session_turn_guard
BEFORE INSERT ON ai_turn_reservations
WHEN EXISTS(SELECT 1 FROM free_session_reservations WHERE session_id=NEW.session_id AND uid=NEW.uid AND state!='completed')
BEGIN
 SELECT CASE WHEN
  NEW.day != strftime('%Y-%m-%d','now','+9 hours') OR
  EXISTS(SELECT 1 FROM ai_turn_reservations WHERE session_id=NEW.session_id AND uid=NEW.uid AND state='reserved') OR
  (EXISTS(SELECT 1 FROM free_session_reservations WHERE session_id=NEW.session_id AND uid=NEW.uid AND state='released') AND
   (SELECT COUNT(*) FROM ai_sessions s WHERE s.uid=NEW.uid AND s.day=NEW.day AND NOT EXISTS(
    SELECT 1 FROM free_session_reservations f WHERE f.session_id=s.id AND f.uid=s.uid AND f.state='released'))>=5)
 THEN RAISE(IGNORE) END;
 UPDATE free_session_reservations SET state='pending' WHERE session_id=NEW.session_id AND uid=NEW.uid;
END;
-- These transitions share the ledger/receipt UPDATE transaction, including rollback.
CREATE TRIGGER IF NOT EXISTS free_session_turn_settle
AFTER UPDATE OF state ON ai_turn_reservations
WHEN OLD.state='reserved' AND NEW.state IN ('completed','refunded')
BEGIN
 UPDATE free_session_reservations SET state='completed'
 WHERE session_id=NEW.session_id AND uid=NEW.uid AND NEW.state='completed';
 UPDATE free_session_reservations SET state='released'
 WHERE session_id=NEW.session_id AND uid=NEW.uid AND state='pending' AND NEW.state='refunded'
 AND NOT EXISTS(SELECT 1 FROM ai_turn_reservations WHERE session_id=NEW.session_id AND uid=NEW.uid AND state IN ('reserved','completed'));
END;
