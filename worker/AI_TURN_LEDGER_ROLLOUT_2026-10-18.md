# AI turn reservation ledger — staged rollout, 2026-10-18

## Current safety status
This commit adds an **OFF-BY-DEFAULT** Worker path and an **UNAPPLIED** additive D1 migration:
- `TURN_LEDGER_MODE=enabled` AND `ENFORCE_PLANS=true` are required for the new path.
- We have **NOT** run a SQL migration against production, changed any Cloudflare setting, activated Gemini paid usage, or enabled Stripe live.
- Existing Free 5 sessions/day, Free teacher 3/day, Pro 600 conversation turns/100 teacher calls per JST month, price JPY680 and existing old `ai_sessions.turns` all remain unchanged.
- With the flag absent, the old Worker reserve/refund behavior remains exactly the same, including its known limitations.

## Purpose / atomic invariant
`worker/migrations/0002-ai-turn-ledger.sql` creates one D1 table and two SQLite triggers with IF NOT EXISTS (repeat-safe). It does **not** rewrite existing tables or counters.

For every AI conversation request, the flagged code inserts a unique immutable reservation ID **in a single SQLite statement** guarded by session identity/expiry, max 20 turns per session, and (for Pro) max 600 monthly turns. The AFTER INSERT trigger increments `ai_sessions.turns` in that same atomic statement. A successful, validated Gemini reply changes *only that reservation* to completed. Failed upstream/invalid JSON/timeouts change *only that reservation* from reserved to refunded, and an AFTER UPDATE trigger decrements `ai_sessions.turns` exactly once. The existing plan counter includes old pre-migration turns; no historic sessions vanish from billing/usage totals.

Outstanding reservations older than 180 seconds can be refunded by the account-scoped cleanup performed before a new reservation. This prevents indefinite leaked turns after a Worker interruption without refunding a normal in-flight 20-second AI request. Unknown stored reservations remain visible for manual audit.

## Tests
- `worker/turn-ledger.test.mjs`: real SQLite, atomic grant and refund, both overlap completion orders, limits at Free 20 and Pro 600, legacy rows, wrong user, expired session, JST month rollover, stale recovery and duplicate refund.
- `worker/turn-ledger.integration.test.mjs`: real Worker + local SQLite migration + signed Firebase test JWT; simulates concurrent successful Gemini response and delayed 503; verifies exactly one user turn remains.
- Existing default-mode regression tests must continue to pass, including billing, user authentication, lesson UI and monthly quota limits.
- Actual production D1 migration, emulator-to-D1 concurrency parity and live Gemini delivery remain unverified and must be separate gates.

## Operator checklist: **do not run automatically**
1. Back up/export D1 `speakingym-plans`, record schema and current row counts: `ai_sessions`, `teacher_uses`, `account_plans`, `billing_accounts`.
2. Rehearse migration on a distinct staging D1 instance and inspect `sqlite_master` for `ai_turn_reservations`, `ai_turn_reservation_count_insert`, `ai_turn_reservation_count_refund`.
3. Test at real staging Cloudflare D1: 20/600 edge, concurrent calls, failed turn in both completion orders, stale cleanup, restart/timeout and no loss of legacy sessions.
4. Check D1 replica consistency and regression scenarios. Keep `TURN_LEDGER_MODE` unset/disabled on production until reviewed.
5. Apply `worker/migrations/0002-ai-turn-ledger.sql` to production D1 only after separate operator approval and verified backup. D1 tables must exist **before** enabling the flag.
6. Enable `TURN_LEDGER_MODE=enabled` deliberately after monitoring is ready, watch error rates and quota records, and test ability to roll back by disabling the flag without modifying user data. A rollback should preserve already committed reservations and never delete rows.
7. Review retention policy for ledger rows: Firebase UID is stored in private D1, never emitted to client/logs. Consider privacy notice and time-bounded cleanup after historical accounting needs are met.

## Still unresolved before **paid** release
- **Free first-attempt failure**: starting a new Free session before the first AI success still uses one of five daily session starts; this ledger only safeguards its AI turns. Add an explicit session-start reservation/recovery process before promising free session refunds.
- **Retry after a response was already delivered by Gemini but lost before reaching the browser**: this design distinguishes server-side success/failed calls but does **not** supply end-to-end client idempotency. Client-generated idempotency token, stored replayable response, same-input hash and cross-tab control would be required to prevent duplicate usage if a browser retries after an ambiguous network error.
- Confirm paid Gemini quota + billing budget, actual average/p95 tokens, Cloudflare rate headroom, real iPhone Safari speech, complete Stripe sandbox renewal/cancellation/failure. No commercial SLA until all pass.
- **No free/premium price or plan-limit change and no live billing activation** in this PR.

Source docs: `worker/AI_TURN_REFUND_DESIGN.md`, `worker/PRO_RELIABILITY_ROLLOUT_2026-10-18.md`.
