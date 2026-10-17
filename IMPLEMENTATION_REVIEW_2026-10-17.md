# Speakingym implementation review — 2026-10-17

Starting main commit: `289670aabd285779fd0a860423f4188b7784b2db`.

## Implemented

- Sandbox-only authenticated Checkout and Customer Portal, 680 JPY inclusive monthly Price validation, Firebase UID / Stripe Customer server mapping.
- Signed webhook processing and latest-state reconciliation; active/paid/price/quantity/period checks, cancellation, failed payments and recovery.
- Per-account SQLite locks with fenced writes, persistent idempotency keys, open Checkout reuse and duplicate webhook handling. Ambiguous operations beyond the idempotency window fail closed.
- Test access restricted to a server-configured Firebase UID list. Sandbox grants stored separately from manual beta grants; disabling test mode does not leave test Pro enabled.
- Period-end expiry, freshness checks at AI entry points, error messages and subscription date vs JST quota-reset explanation.
- Official Gemini rate verification and usage logging including thinking/cache and responses without candidate tokens. No user/content/key logging.
- 16 remaining duplicate model-answer sets corrected; 15 miscategorized cards restored to the boundary filter; advanced fallback prompt category corrected.
- Speech playback retains a strong utterance reference and stops recognition before playback to avoid competing audio sessions. This is a mitigation, not a verified fix for iOS hardware.
- Updated tests for the intended 100-coaching limit and corrected public health quota version.

## Local validation

`node --test tests/*.test.mjs worker/*.test.mjs`: **125 passed / 0 failed** on Node 24.
Existing baseline: 99 passed / 2 failed (both stale 20-coaching expectations).
New cases use real local SQLite with a D1 adapter, signed Firebase test JWTs and mocked Stripe HTTP. They are not live Stripe sandbox tests.
100 cards × 3 levels have distinct nonempty quick/natural/polite answers and nonempty prompts; advanced prompts are English and each category has 25 cards.
English meaning/naturalness has been inspected for the changed 16 answer sets; a complete human editorial review of all 900 answer variants remains outstanding.
`git diff --check`: passed before commit.
Existing Worker test workflow extended; no new deployment workflow.

## What is not validated yet

- Stripe sandbox product/Price existence, actual Checkout purchase, real Portal cancellation, renewal failure/recovery and real webhook delivery.
- Cloudflare dashboard secrets and D1 migration (dashboard currently requires login).
- Google's actual billing account, invoice and production token averages/p95.
- Audible iPhone Safari behavior, mobile real-device layout and microphone/audio combinations.
- Live Gemini naturalness/repetition under real conversations. Existing sanitization and regression tests preserved; no billable live API testing performed.
- 76 supplemental cards still share generic English situations in advanced mode; they now render, but additional scenario-specific advanced content would improve teaching quality.

GitHub save, CI and public deployment evidence must be reported separately after upload; local tests alone are not deployment evidence.

## Owner configuration / release gates

Follow `worker/STRIPE_SANDBOX_SETUP.md` in order. Never paste keys into chat.
Cost assumptions and membership scenarios: `worker/COST_REVIEW_2026-10-17.md` and `scripts/cost-simulation.mjs`.
Live billing remains blocked in code and requires separate explicit owner approval after sandbox acceptance, real iPhone testing, measured cost checks and completed commerce/privacy disclosures.
