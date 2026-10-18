-- Staging-only atomic settlement bridge.
-- Requires 0002-ai-turn-ledger.sql and 0003-ai-request-receipts.sql first.
-- NEVER run against production before reviewed backups, privacy review,
-- scheduled response cleanup, staging D1 concurrency tests and owner approval.
-- A successful receipt transition and corresponding quota finalization happen
-- in ONE SQLite statement (triggers share the outer UPDATE transaction).
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_request_receipt_turn_unique
 ON ai_request_receipts(turn_reservation_id) WHERE turn_reservation_id IS NOT NULL;
CREATE TRIGGER IF NOT EXISTS ai_request_receipt_complete_turn
BEFORE UPDATE OF state ON ai_request_receipts
WHEN OLD.state='pending' AND NEW.state='completed'
BEGIN
 SELECT CASE WHEN NEW.turn_reservation_id IS NULL OR
   NOT EXISTS(
    SELECT 1 FROM ai_turn_reservations
    WHERE id=NEW.turn_reservation_id AND uid=NEW.uid
      AND session_id=NEW.session_id AND state='reserved'
   ) THEN RAISE(ABORT,'receipt_turn_not_reserved') END;
 UPDATE ai_turn_reservations SET state='completed'
 WHERE id=NEW.turn_reservation_id AND uid=NEW.uid
   AND session_id=NEW.session_id AND state='reserved';
END;
CREATE TRIGGER IF NOT EXISTS ai_request_receipt_fail_turn
BEFORE UPDATE OF state ON ai_request_receipts
WHEN OLD.state='pending' AND NEW.state='failed'
AND NEW.turn_reservation_id IS NOT NULL
BEGIN
 SELECT CASE WHEN NOT EXISTS(
   SELECT 1 FROM ai_turn_reservations
    WHERE id=NEW.turn_reservation_id AND uid=NEW.uid
      AND session_id=NEW.session_id AND state='reserved'
 ) THEN RAISE(ABORT,'receipt_turn_not_reserved') END;
 UPDATE ai_turn_reservations SET state='refunded'
 WHERE id=NEW.turn_reservation_id AND uid=NEW.uid
   AND session_id=NEW.session_id AND state='reserved';
END;
