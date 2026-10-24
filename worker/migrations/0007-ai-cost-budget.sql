-- 2026-10-23 DRAFT ONLY: opt-in atomic AI cost reservation guard.
-- Apply manually on the isolated staging D1 only after review. DO NOT apply
-- to production D1 without separate release approval. This migration changes
-- no billing, no legacy customers, no existing quotas and no subscriptions.
CREATE TABLE IF NOT EXISTS ai_cost_budget_reservations (
 id TEXT PRIMARY KEY NOT NULL,
 uid TEXT NOT NULL CHECK(length(uid) BETWEEN 1 AND 128),
 month TEXT NOT NULL CHECK(length(month)=7),
 tier TEXT NOT NULL CHECK(tier IN ('free','pro')),
 kind TEXT NOT NULL CHECK(kind IN ('conversation','teacher')),
 reserved_milliyen INTEGER NOT NULL CHECK(reserved_milliyen > 0),
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_budget_month_cost
 ON ai_cost_budget_reservations(month,reserved_milliyen);
CREATE INDEX IF NOT EXISTS idx_ai_budget_user_kind
 ON ai_cost_budget_reservations(uid,month,tier,kind);
-- Reservations are intentionally immutable: even failed requests can have
-- unknown provider usage. No blanket expiration/refund of old reservations.
