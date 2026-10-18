# AI request replay + turn settlement — staged integration (2026-10-18)

## Current status: CODE STAGED, PRODUCTION OFF

The `ai-worker.js` handler now contains an **explicit opt-in** path linking an authenticated idempotency receipt with an existing per-turn reservation. Production must NOT enable it until the D1 backup, staged migrations, retention approval and Cloudflare tests below pass.

**Activation requires all three Worker variables in combination:**
- `ENFORCE_PLANS=true` (existing)
- `TURN_LEDGER_MODE=enabled` (currently OFF; uses migration 0002)
- `AI_REPLAY_MODE=enabled` (new; defaults OFF)

`AI_REPLAY_MODE=enabled` without the turn ledger, valid schema, or plan enforcement **fails closed with HTTP 503**. Default production behavior and existing Free/Pro limits remain unchanged.

## What changed

- New **UNAPPLIED** `worker/migrations/0004-ai-replay-turn-bridge.sql`, after 0002 and 0003. It adds a unique reservation index and two SQLite triggers which atomically settle both the request receipt and reserved quota on one successful/failed state transition.
- `worker/request-receipts.js` now provides `replayMode`, `replayBridgeReady` (requires table, both triggers and unique index) and `linkReceiptTurn`. Receipts are account-scoped by Firebase UID, session ID, request UUID and request-body hash. A duplicate completed request returns the previous response without calling Gemini or consuming another turn; an in-flight duplicate returns HTTP 409 `request_pending` rather than charging again; changed input with the same UUID returns HTTP 409 `request_id_conflict`.
- The conversation Worker authenticates and claims the receipt **before** reserving a turn. It reserves with the opt-in 0002 ledger, binds the unique reservation ID to the receipt, then calls Gemini. The 0004 triggers settle a successful cached answer and quota as one SQLite UPDATE; failed provider requests settle the refund and the failure record atomically.
- On success, assistant replies are temporarily cached in D1 (10 minutes) for an exact matching user/request retry. After that the UUID tombstone prevents immediate replay for up to 7 days. **No real replies are cached while OFF**.
- The Worker has an opt-in `scheduled()` cleanup handler calling `purgeReceipts()` to redact response text at 10 minutes and delete tombstones after 7 days. **No Cron trigger was configured by this PR**. An operator must configure and verify a Cloudflare Cron schedule *before* enabling this feature; the method by itself does NOT provide automated retention.
- `/health` now reports boolean `aiReplayRequested`, `aiReplayEnabled`, `aiReplaySchemaReady`; the public GET-only smoke flags a broken/unsafe activation. The existing Stripe billing sandbox and Gemini project billing tier are untouched.

## Security / conservative crash handling

- Network/browser loses successful HTTP reply: a retry with same UUID returns the exact cached answer, without Gemini charge or additional plan debit (within 10-minute response retention).
- Two parallel same-UUID calls: at most one claim proceeds to Gemini; duplicate receives 409 `request_pending` and can retry later.
- Failure after Gemini responds but before transaction commit: response outcome is unknown, **never issue a second Gemini call on the same UUID**. Ledger stale reservation recovery may refund the turn; the user may need to start a new utterance or session.
- Failure between receipt claim and turn reservation/link can leave an unmatched pending tombstone until expiry. There is no claim of perfect crash recovery or response availability; the design deliberately favors not double-charging over automatically replaying an uncertain upstream operation.
- A test simulates a reservation already refunded before receipt completion and verifies the SQLite trigger aborts the receipt UPDATE, preserving both states without phantom completion.
- No direct user IDs, full text, AI results, request hashes or API secrets are logged by this feature. **Temporary model reply storage in private D1 still requires owner-approved privacy disclosure/retention rules**; do not enable before this review.
- Older cached clients without a `requestId` will receive HTTP 400 when enabled. Coordinate frontend cache/asset rollout and ideally verify supported clients before switching on; never silently fall back to unsafe charging.

## Verification before Cloudflare activation

1. Back up/export production D1 `speakingym-plans`; verify its export can be restored. Never post D1 backups, transcripts, account information or keys into ChatGPT/GitHub.
2. In a distinct staging D1 database, apply 0002 → 0003 → 0004 in order; validate `sqlite_master` has tables, unique index and triggers, including `idx_ai_request_receipt_turn_unique`. Repeat migration dry-run to test idempotence.
3. Run signed-Firebase isolated-user load tests at 20 turns/session and 600 turns/month, parallel same-ID calls, cross-user/account attempts, failed 429/502/timeout, and power failure before/after link/atomic completion on **real D1**. Node SQLite tests are not proof of Cloudflare D1 consistency.
4. Publish accurate retention/privacy notice and consent decision; schedule Cloudflare Worker Cron (e.g. hourly) and verify that expired `response_json` is reliably redacted and obsolete receipts deleted. Ensure Cloudflare backup/log retention practices are compatible. No Cron schedule is installed in this PR.
5. Only with explicit owner authorization and confirmed backup, apply production migrations in order, enable base turn ledger first (0002) and verify behavior, then enable AI replay after 0003+0004 and verified Cron, monitoring quota/refund outcomes. Use test accounts and Gemini budget controls.
6. Validate `/health` reports `turnLedgerEnabled:true`, `turnLedgerSchemaReady:true`, `aiReplayRequested:true`, `aiReplayEnabled:true`, `aiReplaySchemaReady:true`; check production smoke. If failed, revert **only** `AI_REPLAY_MODE` to `disabled`; never delete the ledger or receipt rows in a live recovery.
7. Verify real iPhone Safari, old-cache behavior, 680-yen unit economics, simulated renewal/cancellation and upstream Gemini capacity before offering paid sign-ups.

## Remaining limitations

- Free first failed session still consumes a session start; unrelated to turn deduplication.
- Gemini can bill for generated output lost when a Worker dies before receipt settlement; not necessarily charged to user's turn. D1 does not make upstream Google generation transactional.
- If the original reply has expired, this implementation will not re-run it under the same UUID or recreate it; no guarantee of recovering the answer indefinitely.
- No Cloudflare D1 migrations, Secrets, Cron, Stripe live switch, paid Gemini tier switch, Firestore edits or price/usage changes were performed by this PR.
- This is not an SLA guarantee; real production/provider quota and cost remain to be measured.

Related: `worker/REQUEST_REPLAY_STAGING_2026-10-18.md`, `worker/LEDGER_ACTIVATION_HANDOFF.md`, `worker/COST_AND_RETRY_READINESS_2026-10-18.md`, `WORK_HANDOFF.md`.
