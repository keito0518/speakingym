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
- Deployment/testing: inspect PR #27 head checks, fix any failures, then merge if clean. After merge, verify the new production GET-only workflow and capture whether public health reports `aiEnabled` and `billingMode`. Do not assert real-user AI chat passed from /health alone. Keep both feature flags OFF until provider capacity/paid billing and customer policy are explicitly approved.
- Remaining blockers: real Gemini production cost p95 and AI Studio project quotas, isolated paid upstream capacity and billing budget, client-safe per-request idempotency and D1 migration for failed turn refunds, Free-plan product-policy decision, real iPhone/multidevice QA, live Stripe sandbox renewal/failure test and final **explicit** authorization for actual charges.
