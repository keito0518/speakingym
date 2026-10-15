-- Run this once on the speakingym-plans Cloudflare D1 database.
-- No client can write these tables; only Cloudflare Worker binds to this D1.
-- User plan is FREE unless an operator explicitly sets it to pro.
CREATE TABLE IF NOT EXISTS account_plans (
  uid TEXT PRIMARY KEY NOT NULL,
  tier TEXT NOT NULL CHECK(tier IN ('free','pro')),
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  turns INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_quota ON ai_sessions(uid,day);
CREATE TABLE IF NOT EXISTS teacher_uses (
  id TEXT PRIMARY KEY NOT NULL,
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teacher_quota ON teacher_uses(uid,day);
