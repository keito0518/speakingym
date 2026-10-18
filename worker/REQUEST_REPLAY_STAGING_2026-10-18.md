# AI Request Idempotency — staged prototype (2026-10-18)

## What is implemented (no live behavior)
- `worker/migrations/0003-ai-request-receipts.sql`: **UNAPPLIED** additive D1 table storing Firebase UID, session ID, client request UUID, SHA-256 request fingerprint, state, a temporary AI response, and expiry deadlines. No existing subscription/session/turn data is changed.
- `worker/request-receipts.js`: **NOT IMPORTED BY THE LIVE WORKER**. Atomically claims an active session/request UUID with SQLite `INSERT OR IGNORE`; checks authenticated UID + session ownership; treats concurrent duplicates as pending; replays a completed answer for up to 10 minutes when the UID, session ID, UUID and normalized request fingerprint match; refuses altered request bodies and cross-user queries; returns an uncertainty state after 180s instead of sending another billable model request.
- On explicit completion/failure, state transitions only from `pending`, so replay or repeated completion/failure cannot change the stored result.
- `purgeReceipts()`: **a callable cleanup routine, NOT a scheduled Cron job**. It redacts stored AI responses after 10 minutes and deletes metadata tombstones after 7 days, when invoked.
- Real SQLite tests validate UUID reuse, parallel requests, strict account isolation, mismatched payloads, success/failure settlement, reply expiry/redaction and the separate 7-day dedupe tombstone.

## What is NOT done, and why
**This is not yet a deployed double-charge prevention system.** The production Worker still ignores the client `requestId`. No request receipt is created or saved in the production database and no personal content is stored by this feature today.

Before enabling, the Worker must coordinate per-request receipts with the already-developed *but also disabled* turn ledger from `0002-ai-turn-ledger.sql`, guaranteeing that reservation, `completed`/refund state and replay response cannot diverge after a Worker interruption. In particular:
1. Reconcile transaction boundaries around `claimReceipt`, `reserveTurn`, `finishTurn` and `completeReceipt` (ideally a D1 transaction/batch with tested exactly-once invariants).
2. Handle power loss between an upstream success, a turn commitment, and a receipt commitment. An ambiguous outcome must never silently consume another paid credit when the browser retries.
3. Handle two simultaneous browser retries of a *pending* request with clear, accessible wait-and-retry UX; never charge for a pending/known duplicate.
4. Validate privacy/consent for temporarily storing model replies in a private D1 table and publish appropriate retention disclosure.
5. Add Cloudflare Cron/automated deletion for the short-lived response data; **the current purge helper alone does not guarantee deletion**.
6. Test D1 real-world transactional/concurrency behavior in a staging database, including month-end, 20-turn/600-turn caps, Free initial-session failure, cancellation, 429s, timeouts and cross-account attempts.
7. Back up the production D1 database; apply 0002 and then 0003 only after staging rehearsal, review and explicit operator approval. Do not switch the feature on before these conditions.
8. Monitor legitimate successful replay responses, privacy-safe 409 mismatches, overdue pending states and cost deltas, without logging user IDs, reply bodies or hashes.

## Privacy boundaries
**Never put real user transcripts or D1 backups in GitHub or these ChatGPT messages.** Only offline test fixtures should contain fake AI replies. Hashing the original utterance does not make the stored hash an anonymous substitute for access controls: all receipt queries must remain restricted by Firebase UID plus session ID. On expiration, cached response content must be redacted on schedule; session/account tombstones should be deleted after their justified retention period.

## Operator decision
- This PR contains an isolated schema, helper and tests, **without import into `ai-worker.js`, `wrangler.toml` changes or any Cloudflare/D1 mutation**.
- Keeping it disabled until privacy and data-migration checks is safer than advertising an untested guarantee for the ¥680/month Pro service.
- Stripe LIVE, paid Gemini billing, the Free plan, and existing Pro 600 conversation/100 teacher limits remain untouched.

See: `worker/LEDGER_ACTIVATION_HANDOFF.md`, `worker/AI_TURN_LEDGER_ROLLOUT_2026-10-18.md`, and `WORK_HANDOFF.md`.
