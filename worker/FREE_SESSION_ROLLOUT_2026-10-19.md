# Free first-response recovery — staged, NOT activated

## Current production and scope
On 2026-10-19 the owner reported backup/export restore integrity, staging migration/concurrency and successful production ledger use. Direct GET /health independently returned turnLedgerEnabled=true, turnLedgerSchemaReady=true, aiReplayRequested=false, aiReplayEnabled=false, aiReplaySchemaReady=false and billingMode=test. Preserve TURN_LEDGER_MODE=enabled. Historic handoff assertions that the ledger is OFF are superseded.

This change is disabled by default (`FREE_SESSION_MODE`). It introduces only migration **0005-free-session-reservations.sql**, dependent on existing 0002. **Do NOT bulk-apply the migrations directory**: 0003 and 0004 are separately prohibited pending owner approval and privacy/staging gates. No SQL migration or Worker variable has been changed by this work.

## Accounting and failure behavior
- Only newly started Free sessions with the flag enabled enroll. Existing rows and Pro sessions are untouched. No user row is deleted.
- D1 transactional batch inserts a session and its pending marker together. Five completed/legacy/pending sessions occupy the day's slots; the public used.sessions number counts only confirmed/legacy sessions.
- The first successful ledger completion changes the marker to completed in the same SQLite statement. A subsequent failed turn cannot release a completed session.
- Exact first-turn refunds release the slot. Retrying the same still-active session atomically reacquires a slot only if fewer than five others occupy it. One first turn per unconfirmed session may be in flight. Repeated clicks/multiple tabs cannot turn released IDs into unlimited successful sessions.
- 20-second provider timeout follows the normal exact refund path. A crashed reserved turn is refunded after >180 seconds on the account's next request. An abandoned start with no request releases after its seven-minute session lease, on the next start/entitlement check. Recovery needs a subsequent request; there is no new Cron requirement.
- Requests blocked before turn reservation (network failure, throttling, invalid input) leave a pending lease, not confirmed usage. Retry the same session; an abandoned lease can temporarily occupy a slot for up to seven minutes.
- Across JST midnight an unconfirmed old-day session cannot acquire a first turn. Start a new session. Successful existing sessions retain normal seven-minute lifetime.
- Provider success persisted on the server is the success boundary. A reply lost between server and browser cannot be distinguished without replay. This feature alone does NOT guarantee exactly-once subsequent AI turns; AI_REPLAY_MODE remains off.
- No new AI response text is stored by 0005. Markers contain session ID, UID, date and state only. Existing 20-turn and Pro 600-turn guards remain intact.

## Staging and activation gate (not executed)
1. Keep current ledger enabled. Verify backup can be restored, then target **speakingym-plans-staging** explicitly. Apply 0005 only after 0002, without 0003/0004. Bind a separate staging Worker; never point staging requests at production.
2. Exercise start -> failure -> retry -> success; abort and forced crash; 6 simultaneous starts; two simultaneous first turns; exhausted-day reuse of released IDs; foreign UID, existing sessions, Pro 600 and 20-turn boundaries; JST rollover. Validate D1 batch rollback. SQLite tests are not a substitute for real D1 staging.
3. Check /health freeSessionRequested=false and freeSessionSchemaReady=true, enable only staging FREE_SESSION_MODE, then verify all booleans true and repeat checks with authenticated staging users.
4. After staging evidence and explicit owner approval, back up production, apply **only 0005**, verify readiness while flag remains off, then enable FREE_SESSION_MODE. Newly created Free sessions opt in; existing sessions are left alone. Observe first-success, failed-first, pending and released counts without logging UID or conversation text.
5. Keep 680 JPY, Free 5/day, teacher 3/day, Pro 600 turns/100 teacher per JST month unchanged. Do not change Stripe live, Gemini billing, Firebase rules or existing records.

## Rollback
Disable only FREE_SESSION_MODE. Keep TURN_LEDGER_MODE and ENFORCE_PLANS enabled. Keep 0005 table/triggers; enrolled in-flight sessions still settle safely through the ledger. New sessions return to the conservative legacy count. Public legacy counts include old released rows, so the rollback can temporarily reduce remaining daily allowance; it cannot expand the allowance. Do not delete/backfill markers or disable the base ledger. Prefer feature-flag rollback, not a pre-ledger code deployment. Recovery behavior is restored when re-enabled.

## Replay review and retention gate
0003: owner/session/request UUID key + request digest; AI response JSON expires after 10 minutes, tombstone after seven days. 0004 bridges receipt settlement to the exact reserved turn atomically. Existing tests cover lost replies, pending duplicates, different payload conflict, UID isolation, failed provider calls, bridge rollback and cleanup. New Free integration tests run with replay both off and on in local SQLite only.

Scheduled cleanup previously stopped with the replay flag. Optional `REPLAY_CLEANUP_MODE=enabled` now allows expiry-only cleanup during rollback, independently of replay generation. Defaults off. Before any replay production activation, approve the response storage/privacy disclosure, apply 0003/0004 on staging, configure and observe Cron redaction/deletion, and explicitly enable cleanup. Keep cleanup enabled if replay is later disabled. Cron is NOT configured by this PR. Expiry prevents serving cached text immediately, but physical deletion depends on Cron execution; never promise exact ten-minute physical deletion. Receipt reply/coaching fields may include learner-provided personal text. Do not log/cache/export it during QA.

## Validation and limitations
Automated suite covers content catalog/151 sprint prompts/16 scenes, plan limits and teacher refunds, account isolation mocks, phrasebook/voice controls, Stripe sandbox lifecycle mocks and browser UI checks in CI. No real Stripe checkout/renewal/cancellation, real multi-device Firebase, real Gemini conversations or iPhone microphone/audible playback were performed in this task. These remain release gates. No actual invoices or production cost samples were available; do not claim profitability from token assumptions.
