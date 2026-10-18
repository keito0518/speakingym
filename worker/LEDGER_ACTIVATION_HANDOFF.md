# Turn ledger — production activation handoff

**Feature:** correctly refund failed AI conversation turns when requests complete out of order.
**Current status:** OFF unless Cloudflare Worker explicitly sets `TURN_LEDGER_MODE=enabled`.
**Do NOT switch Stripe live billing or Gemini's paid tier.**

## In this chat
The connected GitHub integration can ship and test code, but it does not have Cloudflare D1 SQL execution, database backup, or Worker environment-variable permissions. GitHub deployment success is not permission to modify D1. No Cloudflare credentials or secrets should be pasted into ChatGPT.

## Owner/Cloud Browser actions required (in order)
1. In the Cloudflare dashboard, locate `speakingym-plans` (D1). Export/backup the current database. Ensure backup is retrievable before executing schema changes.
2. Rehearse the SQL in `worker/migrations/0002-ai-turn-ledger.sql` on a *separate staging D1 database* using the same schema. Verify the table and both triggers exist and test the 20-turn/600-turn boundary under concurrency.
3. In the production D1 SQL Console, apply **only** the reviewed migration `worker/migrations/0002-ai-turn-ledger.sql`. It only creates a new table, two triggers, and indexes; no legacy user rows are rewritten. Confirm that `/health` reports `turnLedgerSchemaReady:true` and `turnLedgerEnabled:false`.
4. At `Workers & Pages` → `speakingym-survival-ai` → `Settings` → `Variables and Secrets`, set non-secret text variable `TURN_LEDGER_MODE` to `enabled`; save/deploy. Do not modify `BILLING_MODE`, `STRIPE_SECRET_KEY`, `ENFORCE_PLANS`, `GEMINI_API_KEY`, `ALLOW_AI`, or customer data.
5. Verify `/health` reports `turnLedgerEnabled:true`, `turnLedgerSchemaReady:true`, `plansEnabled:true`, `plansReady:true`, `billingMode:test` or `disabled`. Follow GitHub `production-http` CI, and compare `/entitlement` plus safe test-account traffic to ensure no quota loss. Confirm no 503 `plans_unavailable` errors.
6. If errors occur: set `TURN_LEDGER_MODE` to `disabled`, save/deploy and verify `turnLedgerEnabled:false`. Do **not** remove database migration objects or delete reservation rows; completed/refunded records preserve the historical turn count.

## Read-only schema check (optional, no user data)
Run in D1 SQL Console after migration:
```sql
SELECT type, name FROM sqlite_master
WHERE (type='table' AND name='ai_turn_reservations')
   OR (type='trigger' AND name IN ('ai_turn_reservation_count_insert',
                                  'ai_turn_reservation_count_refund'))
ORDER BY type, name;
```
Expected: exactly the reservation table and both trigger names. This confirms structural readiness only, not simulated-load or live model success.

## Still not solved by this feature
- First failed Free session still counts as a session start; this fixes *conversation turns* only.
- Browser resends after a successful server response that was lost can still spend another turn; true end-to-end retry/idempotency needs a separate design.
- Real Gemini and Stripe capacity/charges and iPhone Safari audio require dedicated testing. No 680-yen Pro sale should start until these have passed.

Implementation tests: `worker/turn-ledger.test.mjs`, `worker/turn-ledger.integration.test.mjs`, `worker/turn-ledger-readiness.test.mjs`. More detail: `worker/AI_TURN_LEDGER_ROLLOUT_2026-10-18.md`.
