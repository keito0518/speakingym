# Speakingym development handoff — 2026-10-18

## Safety boundaries
Stripe remains sandbox-only. No real billing activation, Secrets changes, Firebase user changes, D1 migrations or existing production record edits were performed. Free 5 sessions/day and 3 teacher calls/day; Pro 600 turns and 100 teacher calls per JST calendar month; 680 JPY plan preserved.

## Completed implementation
- Account dashboard: removed independent cafe statistic; three balanced cards, mobile layout, cafe still a roleplay scene. Home AI area replaced with compact linked scene cards and corrected stale price/quota copy.
- Shared phrasebook: `phrasebook.html` reads both existing allow-listed phrase keys without moving/deleting data. Explicit save/remove, deduplication, source/difficulty/category filtering, hidden-English revision and playback. AI reply and individual coaching buttons added; existing sprint and teacher save buttons retained. No automatic conversation storage. Cloud rules and key allow-list unchanged.
- Voice settings: device-only English voice choice, natural/premium preference where available, four speeds, stop/preview, asynchronous voice discovery and fallback. Applied to sprint and scene utterances; microphone cancellation and strong utterance references retained. No external TTS API.
- Content: 100 -> 151 sprint prompts, 16 practical topic filters; 6 -> 16 AI scenes with three distinct situations/goals per scene. Worker uses existing quota/refund/telemetry path. Added full answer-set duplication and scene parity tests.
- Full Node regression: 153 pass, 0 fail. Existing billing, auth, quotas, refunds, costs and account isolation tests included.
- Existing cost simulation rerun unchanged: at assumed USDJPY150 and existing token assumptions, maximum monthly Free usage costs ~401 JPY typical / ~2697 JPY heavy in paid-rate equivalent. Not observed billing; real usage averages/p95 and actual provider bill remain unverified.

## Changed files
account.html, account-sync.js, dashboard-data.mjs, index.html, reflex.html, scenes.html, phrasebook.html (new), phrasebook.js (new), speech-settings.js (new), worker/ai-worker.js; tests/dashboard-ui.test.mjs, tests/production-home.test.mjs, tests/reflex-content.test.mjs, tests/phrasebook.test.mjs (new), tests/scene-catalog.test.mjs (new), worker/ai-worker.test.mjs; tests/browser-qa.cjs and .github/workflows/launch-qa.yml (new).

## Branch / commits / PR
Branch: `improve/launch-readiness-20261018`. Starting main: `0e9db5f6474443c52757ba5ec3c4570d6756a97f`.
GitHub commits: `a2f3d987272741ad59a02b145b8a776528deb0e2` (dashboard), `75f3044440755c8128afba0d67a8be0375d9e6c4` (phrase/voice), `8a69bc3011feadfc86070716f378477008d9b49b` (content).
PR: https://github.com/keito0518/speakingym/pull/26 — draft at this checkpoint, not merged yet.
Git push is not authenticated in this executor; GitHub Git Data API successfully saves commits and advances the branch with expected-head checks. Local commit hashes differ from GitHub hashes. Verify the remote head, never force push local history.

## Validation and deployment
- Local: `node --test tests/*.test.mjs worker/*.test.mjs` => 153/153; `git diff --check` passes.
- GitHub Actions: all existing workflows passed at `8a69bc3`.
- Cloudflare Pages and Worker preview builds succeeded at `8a69bc3`. Pages preview: https://e99027f0.speakingym.pages.dev/.
- New browser workflow added for 390px/1280px layouts, guest sprint, phrase filters/hide/delete and voice preferences. Await execution and fix any failures before merging.
- Local browser installation blocked by incomplete downloads; browser QA must be completed in Actions/cloud browser. Do not describe Node DOM mocks as real-browser tests.
- Production deployment not yet confirmed at this checkpoint.

## Remaining / not fully verified
1. iPhone Safari real audible quality, microphone->speech switching, screen lock/resume and voice download availability. No guarantee of human voice quality.
2. Real Gemini conversation quality/repetition across new scenes. No billable AI requests were made; model requests are mocked in regression tests.
3. New 51 prompts are authored per situation. The 76 legacy supplemental advanced prompts now also have individually written English situations/instructions. Full human editorial review of all answer variants is still outstanding.
4. Existing storage caps retained: 100 sprint/teacher phrases and 20 AI phrases. Full AI store now refuses new saves without evicting existing entries. Increasing caps requires reviewing sync normalization/limits; not silently expanded.
5. Live multi-device Firebase sync and actual iPhone sign-in not exercised; existing isolation tests pass. Read-through view avoids migrations.
6. Existing refund tests cover failed AI turns/teacher calls. A Free session starts before the first AI response and remains a session if an entire attempt fails; changing that policy safely needs separate session-start reservation design.
7. Production cost telemetry code preserved. Current measured tokens/invoices are inaccessible; do not assert actual profitability.

## Next first actions
Read this file and latest main, inspect PR #26 checks (including Launch regression and browser QA), inspect screenshot artifacts, fix browser failures. Once clean, mark PR ready and merge with expected-head protection; confirm Cloudflare Pages/Worker deployment checks and production `/health` showing 16 scene IDs and `billingMode:test` or `disabled`. Update this handoff with actual merge/deployment evidence. Do not activate live billing.
