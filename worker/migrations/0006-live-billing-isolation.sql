-- NEVER bulk-apply migrations. This is a separate, opt-in paid launch migration.
-- Apply only with a fresh verified production D1 backup and explicit owner approval.
-- Completely separate live Stripe customer IDs/events from sandbox billing_accounts/events.
CREATE TABLE IF NOT EXISTS billing_live_accounts (
 uid TEXT PRIMARY KEY,
 customer_id TEXT UNIQUE,
 customer_key TEXT NOT NULL,
 customer_started INTEGER NOT NULL,
 checkout_key TEXT,
 checkout_started INTEGER,
 checkout_id TEXT,
 checkout_expires INTEGER,
 subscription_id TEXT,
 status TEXT NOT NULL DEFAULT 'none',
 entitled INTEGER NOT NULL DEFAULT 0,
 period_end INTEGER,
 cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
 synced_at INTEGER NOT NULL DEFAULT 0,
 lock_token TEXT,
 lock_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS billing_live_events (
 id TEXT PRIMARY KEY,
 processed_at INTEGER NOT NULL
);
