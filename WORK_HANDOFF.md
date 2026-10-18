# Speakingym development handoff — 2026-10-18

## Safety boundaries
Stripe remains sandbox-only. No real billing activation, Secrets changes, Firebase user changes, D1 migrations or existing production record edits were performed. Free 5 sessions/day and 3 teacher calls/day; Pro 600 turns and 100 teacher calls per JST calendar month; 680 JPY plan preserved.

## Completed implementation
- Account dashboard: removed independent cafe statistic; three balanced cards, mobile layout, cafe still a roleplay scene. Home AI area replaced with compact linked scene cards and corrected stale price/quota copy.
- Shared phrasebook: `phrasebook.html` reads both existing allow-listed phrase keys without moving/deleting data. Explicit save/remove, deduplication, source/difficulty/category filtering, hidden-English revision and playback. AI reply and individual coaching buttons added; existing sprint and teacher save buttons retained. No automatic conversation storage. Cloud rules and key allow-list unchanged.
- Voice settings: device-only English voice choice, natural/premium preference where available, four speeds, stop/preview, asynchronous voice discovery and fallback. Applied to sprint and scene utterances; microphone cancellation and strong utterance references retained. No external TTS API.
- Content: 100 -> 151 sprint prompts, 16 practical topic filters; 6 -> 16 AI scenes with three distinct situations/goals per scene. Worker uses existing quota/refund/telemetry path. Added full answer-set duplication and scene parity tests.
- Full Node regression: 156 pass, 0 fail. Existing billing, auth, quotas, refunds, costs and account isolation tests included.
- Existing cost simulation rerun unchanged: at assumed USDJPY150 and existing token assumptions, maximum monthly Free usage costs ~401 JPY typical / ~2697 JPY heavy in paid-rate equivalent. Not observed billing; real usage averages/p95 and actual provider bill remain unverified.

## Changed files
account.html, account-sync.js, dashboard-data.mjs, index.html, reflex.html, scenes.html, phrasebook.html (new), phrasebook.js (new), speech-settings.js (new), worker/ai-worker.js; tests/dashboard-ui.test.mjs, tests/production-home.test.mjs, tests/reflex-content.test.mjs, tests/phrasebook.test.mjs (new), tests/scene-catalog.test.mjs (new), worker/ai-worker.test.mjs; tests/browser-qa.cjs, tests/speech-settings.test.mjs and .github/workflows/launch-qa.yml (new).

## Branch / commits / PR
Branch: `improve/launch-readiness-20261018`. Starting main: `0e9db5f6474443c52757ba5ec3c4570d6756a97f`.
GitHub commits: `a2f3d987272741ad59a02b145b8a776528deb0e2` (dashboard), `75f3044440755c8128afba0d67a8be0375d9e6c4` (phrase/voice), `8a69bc3011feadfc86070716f378477008d9b49b` (content).
PR: https://github.com/keito0518/speakingym/pull/26 — MERGED into main with squash commit `96b7600714ef0f8d28d8af706200bd5d5e76a3bc`. Review branch head was `3415b6ff6c7f7d3acff029d7186150cfd6665960`; expected-head merge guard was used.
Git push is not authenticated in this executor; GitHub Git Data API successfully saves commits and advances the branch with expected-head checks. Local commit hashes differ from GitHub hashes. Verify the remote head, never force push local history.

## Validation and deployment
- Local: `node --test tests/*.test.mjs worker/*.test.mjs` => 156/156; `git diff --check` passes.
- GitHub Actions: all existing workflows passed at `8a69bc3`.
- Cloudflare Pages and Worker preview builds succeeded at `8a69bc3`. Pages preview: https://e99027f0.speakingym.pages.dev/.
- Browser workflow PASSED at dbdc651b62c746b4116dc43b98ff3da4fb5def45 for 390px/1280px layouts, guest sprint, phrase filters/hide/delete and voice preferences. Run: https://github.com/keito0518/speakingym/actions/runs/39086702757. The initial assertion omitted the existing STANDARD label; corrected after inspecting the failure.
- Local browser installation blocked by incomplete downloads; browser QA was completed in Actions/cloud browser. Do not describe Node DOM mocks as real-browser tests.
- Production CI/CD pipeline passed on merged main SHA `96b7600714ef0f8d28d8af706200bd5d5e76a3bc`: GitHub Actions Pages `build`, `report-build-status`, and `deploy` succeeded (https://github.com/keito0518/speakingym/actions/runs/39089353173); Cloudflare Pages and Workers Builds checks both succeeded; launch-qa, smoke-test, UI, account, and Worker tests also succeeded, 10 checks green at verification. Launch QA run: https://github.com/keito0518/speakingym/actions/runs/39089353575 .
- Important distinction: deploy pipelines and provider checks were verified; direct HTTP retrieval of `https://speakingym.pages.dev/` or Worker production `/health` was unavailable from the follow-up executor. Do not claim live content or live API readiness was inspected. Browser QA used local HTTP via GitHub Actions, not production.

## Remaining / not fully verified
1. iPhone Safari real audible quality, microphone->speech switching, screen lock/resume and voice download availability. No guarantee of human voice quality.
2. Real Gemini conversation quality/repetition across new scenes. No billable AI requests were made; model requests are mocked in regression tests.
3. New 51 prompts are authored per situation. The 76 legacy supplemental advanced prompts now also have individually written English situations/instructions. Full human editorial review of all answer variants is still outstanding.
4. Existing storage caps retained: 100 sprint/teacher phrases and 20 AI phrases. Full AI store now refuses new saves without evicting existing entries. Increasing caps requires reviewing sync normalization/limits; not silently expanded.
5. Live multi-device Firebase sync and actual iPhone sign-in not exercised; existing isolation tests pass. Read-through view avoids migrations.
6. Existing refund tests cover failed AI turns/teacher calls. A Free session starts before the first AI response and remains a session if an entire attempt fails; changing that policy safely needs separate session-start reservation design.
7. Production cost telemetry code preserved. Current measured tokens/invoices are inaccessible; do not assert actual profitability.

## Next first actions
PR #26 has been merged. Start by checking latest main and the new production CI/CD checks (and this handoff's post-merge documentation-only commit). Use a real browser and an iPhone to spot-check the production home, account (with and without login), shared phrasebook (preserve old saves), 151 sprint questions, all 16 scenes, and mic→TTS audio. Independently request the actual production Worker `/health` to confirm 16 scenes and non-live billing mode (`test` or `disabled`). If any production problem is found, fix it in a new branch/PR. Do not activate live billing or modify Secrets/D1/Firebase records. Continue genuine Gemini conversation QA, usage telemetry/cost validation and editorial content review before commercial launch.

## Resume-note: follow-up after Work limit, 2026-10-18
- GitHub PR #26 was marked ready and safely merged as `96b7600714ef0f8d28d8af706200bd5d5e76a3bc` (https://github.com/keito0518/speakingym/commit/96b7600714ef0f8d28d8af706200bd5d5e76a3bc).
- On that exact merged commit, all 10 GitHub checks finished `success`, including Cloudflare Pages, Workers Builds, Pages deploy job, launch-qa browser tests, account safety, UI, and Worker tests.
- Follow-up change to this handoff is documentation only; the application behavior was not modified after the merge. A new CI/deploy run may be triggered by this documentation edit; verify its result before marking the entire rollout closed.
- Screenshots of the earlier Work UI transcript showed its browser QA and final branch updates; the GitHub checks and workflow handoff file were used as the authoritative evidence. No Stripe real-payment switch was touched.


## Paid-readiness reliability continuation — 2026-10-18
- New PR: https://github.com/keito0518/speakingym/pull/27 on `feature/pro-reliability-cost-guard-20261018` (based on main `f8cd4f53742f1c6e97ae027688645262aafdd84a`).
- Implemented a **disabled-by-default**, max-600-second Stripe sandbox outage grace for previously confirmed paid subscriptions; on unpaid/revoked/expired accounts or non-transient failures it remains fail-closed. New tests in `worker/billing.test.mjs`.
- Implemented a **disabled-by-default** option for server-verified Free/Pro per-UID application rate-limit pools. Distinct counter keys are NOT reserved Gemini capacity. New tests in `worker/plan-limits.test.mjs`.
- Added structured, privacy-safe `speakingym_ai_outcome_v1` latency/success/failure metrics; kept existing token/cost telemetry. Tests in `worker/cost-telemetry.test.mjs`.
- Added `scripts/prod-smoke.mjs` + `.github/workflows/production-smoke.yml`: automatic GET-only production home/Worker-health checks on main pushes, with no billable AI calls or user data.
- Detailed manual review/activation safety gates: `worker/PRO_RELIABILITY_ROLLOUT_2026-10-18.md`.
- **No changes to live Stripe billing, Gemini paid tier, Cloudflare Secrets, D1 tables/data, existing Free 5 sessions/day, Pro 600 turns/100 coaching, or published 680 JPY price.**
- Deployment/testing: PR #27 **MERGED** to main as `d972cd342026b7eb73ef60af0550d058dc6d00cc` (https://github.com/keito0518/speakingym/pull/27). The head workflow reported **159 Node tests passed, 0 failed**. Production GET-only smoke **PASSED** at https://github.com/keito0518/speakingym/actions/runs/39097974917 : Pages 200 + Worker /health 200, 16 scenes, model gemini-3.5-flash-lite, AI enabled and D1 ready, billingMode=test. GitHub Pages deploy, Cloudflare Pages and Workers Builds succeeded. This does **not** verify a real Gemini response, multi-user load, Safari speech, actual invoices or failover. Both new flags remain OFF until separately reviewed.
- Remaining blockers: real Gemini production cost p95 and AI Studio project quotas, isolated paid upstream capacity and billing budget, client-safe per-request idempotency and D1 migration for failed turn refunds, Free-plan product-policy decision, real iPhone/multidevice QA, live Stripe sandbox renewal/failure test and final **explicit** authorization for actual charges.

- The next Work should first verify all checks on the latest **documentation-only** main commit, then run the blocked end-to-end paid-readiness items listed above. Do not enable Stripe live keys, switch Gemini paid-tier billing, or change Free usage without owner approval.


## Public launch smoke expansion — 2026-10-18
- PR #28: https://github.com/keito0518/speakingym/pull/28 (squash merged to main at `52da653a097cf0cae95fcacc057d69801c7d8709`). Branch `test/production-readiness-smoke-20261018`.
- Changed `scripts/prod-smoke.mjs` to verify public home, account, 60-second sprint, 16 unique roleplay scene cards, phrasebook, plans, voice settings script and shared phrasebook script, plus Worker health (AI on/configured, D1 ready, test/disabled billing), anonymous entitlement HTTP 401 and preflight CORS HTTP 204. Only GET/OPTIONS with NO authorization credentials are issued. No Stripe, Gemini generation, D1 writes or user quota charges.
- Added mocked `tests/prod-smoke.test.mjs` exercising positive checks and deliberately failing readiness when AI disabled or billing live. Adjusted `scenes.html` and `reflex.html` so upstream Gemini 429 is distinguished from a paid user's remaining plan quota; refreshed account quota display after failed roleplay answer. Added `tests/paid-availability-copy.test.mjs`.
- GitHub Actions on merged PR commit: `node --test` **164/164 passed**, 0 failed (workflow https://github.com/keito0518/speakingym/actions/runs/39100713408). Public HTTP smoke **11/11 endpoints passed** (https://github.com/keito0518/speakingym/actions/runs/39100713429): production Pages GET, Worker /health confirms 16 scenes, Gemini AI configured/enabled, plans ready, billingMode `test`; anonymous /entitlement 401, CORS preflight 204.
- These checks prove reachable published static assets, configuration and guest auth rejection; they do NOT verify signed-in Firebase synchronization, real AI outputs, iPhone Safari sound, parallel load, consumer charge success or correct refund under concurrent errors.
- No additional owner decisions were made: Stripe live remains off, Gemini paid billing remains unenabled, Free/Pro quotas and D1/Firestore records unchanged, `AI_TIER_POOLS` and `BILLING_GRACE_SECONDS` remain disabled. The next step needing careful design is idempotent quota reservations and failed-turn recovery with migration and adversarial concurrency tests. Also measure real upstream quotas/costs and decide separately whether to buy capacity; never claim 600 reliable monthly turns from /health alone.
- A documentation-only commit records this status. Confirm all GitHub checks on that final commit if resuming.


## Atomic turn ledger staged implementation — 2026-10-18
- PR #29 MERGED with squash SHA `81067222dac5af303d6c1a81257dccff02a5e601`: https://github.com/keito0518/speakingym/pull/29.
- `worker/turn-ledger.js` and additive **UNAPPLIED** migration `worker/migrations/0002-ai-turn-ledger.sql` enable per-request atomic reservation/complete/refund with an AFTER INSERT/AFTER UPDATE SQLite trigger, preserving existing `ai_sessions.turns` historic accounting.
- `TURN_LEDGER_MODE=enabled` requires `ENFORCE_PLANS=true`; the new code path defaults OFF. Existing Free 5/day sessions, Free teacher 3/day, Pro 600 turns/100 teacher per JST month and JPY680 are unchanged. No D1 SQL, Cloudflare Secrets, Firebase records, Gemini paid API or live Stripe settings were modified.
- Node/SQLite real-engine and signed-JWT Worker-with-mocked-Gemini tests cover success+delayed failure, reverse completion, duplicate refund, cross-user safety, 20-turn and 600-turn boundaries, prior-month/session expiry, legacy rows, stale recovery. PR branch launch-qa **174 tests passed / 0 failed**.
- The Worker public `/health` now exposes a non-sensitive `turnLedgerEnabled` indicator for explicit operator activation checks. Do not infer actual migration readiness from this boolean alone.
- Detailed activation checklist, backup/staging/prod rollout and acknowledged edge cases: `worker/AI_TURN_LEDGER_ROLLOUT_2026-10-18.md`.
- Important blockers still exist: real D1 concurrency + staging migration tests; D1 backup and operator review before enabling; Free first-attempt session-start refund; end-to-end idempotency for a browser retry after the server completed a response but the reply was lost in transit; real Gemini production quota/cost and phone QA.
- Verify post-merge main GitHub checks and production GET-only smoke. NEVER claim new ledger is live until flag explicitly enabled following an authorized D1 migration.


## Turn-ledger production activation follow-up — 2026-10-18
- User explicitly asked to activate the **AI turn-refund ledger**, NOT Stripe live billing.
- GitHub connector is available but no Cloudflare D1 backup, SQL executor or Worker variables writer was available in this chat. Cloudflare plugin discovery did not find a relevant connector. Do not imply activation occurred.
- PR #30 `https://github.com/keito0518/speakingym/pull/30` merged as `9e834b6ebe88e09c7f527fcc77a99c9cade90ebe`; all 8 main CI/Cloudflare/production GET checks passed. New tests raised total to **178/178 passing**. Worker added read-only `turnLedgerSchemaReady` health bit by checking reservation table and two triggers in D1's sqlite_master, and production smoke fails if flag enabled before schema exists. `worker/LEDGER_ACTIVATION_HANDOFF.md` contains safe backup/staging/prod/rollback steps.
- **Authoritative live status from successful GitHub Actions production-http** (https://github.com/keito0518/speakingym/actions/runs/39107306181): `turnLedgerEnabled:false`, `turnLedgerSchemaReady:false`, `billingMode:test`, AI enabled, 16 scenes, health 200. Thus the migration is **NOT** applied and ledger is **NOT** activated, although the code is deployed. The first four health retries saw an older Worker before deployment; retry 5 passed on updated Worker.
- **Blocker that requires Cloudflare-authorized execution**: backup/export production `speakingym-plans`, run `worker/migrations/0002-ai-turn-ledger.sql` after staging rehearsal, verify `/health` schema ready, then add dashboard Worker text variable `TURN_LEDGER_MODE=enabled`, verify both booleans true and production checks pass. Do not change Stripe live, Gemini paid tier, existing Free/Pro quotas, Firebase or user data. If access cannot be obtained, STOP with default-off safety.

## Privacy-safe business telemetry and future retry identity — 2026-10-18
- PR #31 merged to main as `8830f9d9c4db251d0213559f642c91e50549d85e`: https://github.com/keito0518/speakingym/pull/31.
- `worker/cost-telemetry.js` now includes privacy-safe Free/Pro/legacy **trusted server plan** in token usage logs, allowing Free-vs-Pro cost rollups without exposing Firebase UID, IP, spoken content or API keys. Frontend users cannot elevate their tier by changing this field.
- New `scripts/ai-cost-report.mjs`: read-only local analysis of already-redacted Cloudflare JSONL, usage/cost in JPY at assumed FX, per-tier success and p95 response time, and a clearly qualified 600-conversation+100-teacher full-use projection. Requires sample minimum 30 Pro conversation + 10 Pro teacher before marking data ready for review. **No real Cloudflare logs, invoices or paid API costs were inspected**; a calculated cost is not a bill.
- `scenes.html` creates one UUID per user utterance, reuses it on an ambiguous network retry, rotates on confirmed HTTP failure and clears on success/new session. This is **client groundwork only**: the Worker currently ignores the UUID and **double-count prevention is not yet implemented**. Do not claim it is active or that a lost assistant response can be recovered.
- Tests: `tests/ai-cost-report.test.mjs`, `tests/scene-request-ids.test.mjs`, `worker/cost-telemetry.test.mjs`. Branch QA 186 tests passed and 0 failed, plus GitHub Checks success. Ops notes: `worker/COST_AND_RETRY_READINESS_2026-10-18.md`.
- No Stripe live, Gemini paid API, Cloudflare variables, D1 migration, quotas or Firebase data changed. `TURN_LEDGER_MODE` still OFF and D1 migration still unapplied until operator-authorized backup and testing.
- Next candidate feature: actual server-verified request ID idempotency with privacy/retention review, atomic link to D1 ledger settlement and response-loss recovery; staged with a new migration only after reviewing data model/consent. Then actual Gemini and Cloudflare project traffic/cost measurement and iPhone Safari testing.


## Safe server-side request-replay receipt prototype — 2026-10-18
- PR #32 MERGED to main as `a34b95bf3b75843ef36584b9c85f3bccd280ca2c`: https://github.com/keito0518/speakingym/pull/32.
- New **UNAPPLIED** `worker/migrations/0003-ai-request-receipts.sql` contains a short-lived receipt table keyed by authenticated UID + session UUID + client request UUID and hashed request body, with 10-minute cached reply expiry and 7-day tombstone expiry.
- New standalone `worker/request-receipts.js` supports duplicate claim/replay with matching digest, concurrent pending result, mismatch conflict, owner isolation, exact pending-to-completed/failed transition and manual cleanup helper.
- The module is **NOT imported or invoked by ai-worker.js**; no production answer content is cached by this feature, no production D1 migration was run, no Cloudflare Cron configured, and nothing is enabled. This is deliberately staging-only until privacy/retention consent, Cron cleanup and atomic integration with opt-in 0002 turn ledger are designed and verified.
- `worker/request-receipts.test.mjs` uses real SQLite to validate concurrent duplication, account isolation, expiry, legacy session ownership, same-payload replay and privacy-safe fingerprinting. GitHub Actions on PR branch showed **197 tests passed, 0 failed**.
- Review `worker/REQUEST_REPLAY_STAGING_2026-10-18.md` before any activation. Remaining blockers are atomic turn+receipt settlement after Gemini success, browser UX for a pending receipt, consent to temporary assistant-response storage, scheduled deletion, real Cloudflare D1 concurrency, Free session-start failure, actual provider costs and iPhone QA.
- No change to Stripe LIVE (remains disabled/test), paid Gemini tier, Pro 680JPY price, Free/Pro quotas, D1 production rows, Firebase data, or environment secrets.


## Atomic replay + turn ledger integration — 2026-10-18
- PR #33 merged into main as `71a12ad52148f79f8b3056ddadc45d5cebed9f17`: https://github.com/keito0518/speakingym/pull/33.
- Added **UNAPPLIED** `worker/migrations/0004-ai-replay-turn-bridge.sql`, a unique reservation link and SQLite triggers to atomically settle AI receipt success/failure with individual turn completion/refund. Requires previous UNAPPLIED migrations 0002 and 0003. There has been **no production D1 migration**.
- `worker/ai-worker.js` now supports optional authenticated UUID `AI_REPLAY_MODE=enabled` only alongside `TURN_LEDGER_MODE=enabled`, `ENFORCE_PLANS=true`, and necessary schema; otherwise fail-closed. **New flag remains OFF**. Existing behavior unchanged. Same ID+body returns cached reply without another Gemini call or quota decrement; duplicates in flight return 409 without a second model call; different body IDs are rejected.
- `worker/request-receipts.js` adds schema/unique-index verification and owner-scoped reservation linkage; Cloudflare `scheduled()` cleanup exists but **no Cron trigger has been configured**. Until Cron/retention review and owner authorization, do NOT enable replay or store real AI response bodies.
- `scenes.html` now preserves its retry UUID when server reports a known pending/uncertain/expired prior reply and offers explanatory Japanese error copy.
- `/health` now exposes boolean `aiReplayRequested`, `aiReplayEnabled`, `aiReplaySchemaReady`, and non-billable production smoke fails if accidentally configured without quota enforcement or D1 tables, triggers, unique index.
- Added full signed-Firebase Worker/real SQLite integration tests in `worker/replay-ledger.integration.test.mjs` including lost reply, concurrent same ID, Gemini failures, wrong input, bridge failure, atomic rollback and cleanup; tests/prod-smoke extended. Head GitHub Actions **208 Node tests passed, 0 failed**; Cloudflare preview builds and safety checks green.
- **Full activation runbook** `worker/REPLAY_LEDGER_INTEGRATION_ROLLOUT_2026-10-18.md`: Cloudflare D1 backup, staging D1 tests/0002+0003+0004, approval for temporary AI response retention, scheduled Cron cleanup verification, initial signed-in iPhone and old-cache check, then separate staged turn ledger/replay activation with health monitoring and rollback.
- Limitations: staging SQLite is not real D1; provider Google Gemini generation cannot be rolled back transactionally; crash before response persistence can leave uncertain pending state, prioritizing avoiding a second user debit. Free initial-session-start failure remains unresolved. No live Stripe switch, paid Gemini tier, Firebase modifications, existing Free/Pro limits or 680JPY price changes occurred.
- After any resumed work, verify the latest merged main GitHub checks and production HTTP /health. Never imply the feature is enabled until the real Cloudflare flag and database migration have been verified.
