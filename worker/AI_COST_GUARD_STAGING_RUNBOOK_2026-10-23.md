# Draft AI Cost Budget Guard — staging-only validation / NO LIVE changes

Status: **source + simulated tests only**, first implemented 2026-10-23 in Draft PR #62.
The legacy ¥680 subscriptions and the existing ¥1,480 TEST product are unchanged.
The proposed ¥980/400 turns/40 teacher uses is NOT enabled, marketed or charged.

## Why this guard exists

The existing Free beta permits 5 sessions/day (up to 20 turns each), 3 teacher uses/day.
A learner repeatedly hitting those limits may use up to 3,000 turns and 90 teacher
requests across 30 days. The existing D1 counters enforce daily usage, not a monthly
**service-wide monetary** budget. This opt-in addition reserves conservatively
estimated cost before each provider call.

- One signed Firebase UID gets Free monthly budget reservations by request type.
- All signed Free and Pro calls compete against the same monthly JPY estimate cap.
- Admission is a **single SQLite INSERT...SELECT...RETURNING** statement enforcing
  global estimated budget and a Free user's month-by-kind count together.
- Every admitted attempt counts, including errors/timeouts/unknown provider usage.
  No automatic refund can be used to game retry costs.
- Missing D1 schema, missing or invalid guard settings, missing authenticated
  quota setup or unknown model fail **closed** before any Gemini request.
- This is separate from the current plans and Stripe: D1 trial caps DO NOT
  upgrade a Free user, extend Pro, replace Stripe signatures or grant entitlement.

**Important:** This is NOT an absolute Gemini provider billing cap. Actual costs,
provider billing outside Speakingym, pricing changes, input beyond the conservative
token bound, retry behavior and thinking tokens may differ. Configure Google-side
budgets/quota alerts and use spending observations. A request is denied based on
an *estimate* and may remain denied even when Google's actual invoice is lower.

## What is in Draft

- `worker/ai-cost-budget.js`: typed server-only cost estimation, explicit opt-in,
  schema readiness and atomic reservation; impossible to activate with only a
  frontend setting or a user-supplied price.
- `worker/migrations/0007-ai-cost-budget.sql`: additive table + indexes, no existing
  account, D1 quota or billing mutations. Not yet applied anywhere.
- `worker/ai-worker.js`: guard checked before the signed usage reservation and
  immediately after signed Free/Pro plan quota reservations but before Gemini calls.
  On a rejected budget, the existing per-session/teacher reservation is refunded
  and a replay receipt (when present) is failed rather than left pending.
- `worker/ai-cost-budget.test.mjs`,
  `worker/ai-budget-worker.integration.test.mjs`: isolated SQLite and mock provider
  checks for concurrent final-budget reservations, per-user caps, month rollover,
  fail-closed missing schema, no second API request and refund of the normal turn.
- `/health` reports `aiBudgetRequested` and `aiBudgetReady` flags only. It does
  not expose global cap amounts or another user's data.

## NO activation without separate owner approval

Never apply the migration to production D1, put this mode in normal production
vars, adjust the current Free quotas or switch the Gemini model from this plan.
If the owner explicitly authorizes future isolated staging testing:

1. Use a **separate staging D1** and isolated Worker with TEST-only credentials.
   Before any writes, confirm worker `PLAN_DB` is NOT `speakingym-plans`.
2. Take a staging DB backup. Apply **only**
   `worker/migrations/0007-ai-cost-budget.sql` to that separate staging D1.
   Confirm schema with a read-only query.
3. Set these server-side variables in the isolated staging Worker *only*:
   - `ENFORCE_PLANS=true` with verified Firebase test account/PLAN_DB
   - `AI_COST_GUARD_MODE=enabled` (default absent = OFF)
   - `AI_MONTHLY_BUDGET_YEN=500` (example conservative staging budget)
   - `AI_FREE_MONTHLY_CONVERSATIONS=2` (example staging monthly Free calls)
   - `AI_FREE_MONTHLY_TEACHER=1` (example staging monthly Free teacher calls)
   - `AI_GUARD_USD_JPY=160` (example exchange-rate assumption)
   - `AI_GUARD_SAFETY_PERCENT=200` (200%=2x assumed max prompt/output cost)
4. Carefully verify all status flags. Keep `ALLOW_AI=false` until operator
   separately approves a narrowly capped **TEST provider** budget and test account.
5. Simulate first/second/third attempt, account switching, replays, failed provider
   responses, concurrent Free and Pro traffic; verify denied requests generate no
   provider call and do not lose current Pro/Free quota. No Stripe charges needed.
6. Observe actual token logs, invoices and limits; expand the call envelope and
   reduce price pressure only after evidence. Do not extrapolate from mocks.
7. Activation/rollback must be an explicitly reviewed separate release; rollback
   by removing `AI_COST_GUARD_MODE=enabled` from the **isolated staging** env.
   Do not delete reservations or disable Google-side spending alerts.

## Prices and compatibility

Gemini model token prices come from the official API paid standard prices:
https://ai.google.dev/gemini-api/docs/pricing
`MODEL` stays pinned to `gemini-3.5-flash-lite` in current code. The rates
for `gemini-3.1-flash-lite` are included **only for a future approved model
switch** and illustrative price sensitivity (no real provider responses).

The budget table stores signed pseudonymous Firebase UIDs and month/kind/cost
reservation metadata. Before live rollout, document user retention, security,
deletion and backup policies and confirm Firestore/D1 privacy disclosures.
