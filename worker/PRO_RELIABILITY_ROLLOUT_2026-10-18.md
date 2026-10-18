# Pro reliability and cost rollout — 2026-10-18

## Current status and safety boundaries
Code changes in PR #27 do not enable Stripe live mode, Gemini paid tier, AI_TIER_POOLS, or BILLING_GRACE_SECONDS. Existing user quotas and D1 data are unchanged. Both new flags are disabled by default. Do not activate public billing until the separate owner approval.

## Verified failure risks
- Workers limits are presently shared by Free/Pro at USER_LIMIT 6/minute per IP and GLOBAL_LIMIT 30/minute total (Cloudflare per-edge approximate counters). A Pro user may get 429 with remaining monthly turns.
- Both Free and Pro share the same upstream Gemini project quota. Cloudflare limiter separation alone **cannot** reserve Gemini throughput. Actual Google AI Studio RPM/TPM/RPD and project billing tier require operator review.
- Billing sync uses a fresh Stripe subscription. Temporary Stripe failure can block a paid account. Existing fail-closed behavior remains the default.
- AI turn rollback is conservative: a failed overlapping turn may fail to roll back once later turns are committed. Free sessions can be counted even if the first AI answer fails. Reliable end-to-end exactly-once semantics will require a D1 request reservation ledger and client idempotency/recovery handling; not added without migration and rollout tests.

## Implemented in PR #27
1. **Sandbox subscription outage grace, opt-in:** `BILLING_GRACE_SECONDS`, integer 1–600, defaults to 0. Allows a verified paid, unexpired sandbox Pro grant to remain valid during **transient** provider/busy errors for at most the original 120-second freshness plus the configured extension. Checks UID/test invite, test-only Stripe mode, previous `entitled=1`, unexpired period end and freshness. Never extends the subscription beyond its period end or restores a revoked/unpaid grant; other errors still fail closed. Before enabling, decide how quickly payment-failure revocations must take effect and test real sandbox failed invoices. Suggested initial test setting: 180 seconds, **not enabled automatically**.
2. **Authenticated Free/Pro per-account application rate keys, opt-in:** `AI_TIER_POOLS=true` uses signed Firebase JWT + authoritative D1 tier, keys per UID instead of IP, and distinct `speakingym-survival-free` / `speakingym-survival-pro` Cloudflare limiter counters. Existing counters are preserved with flag absent. Each distinct global key gets the existing limit independently; aggregate Gemini load may increase and exceed provider quota. Enable only after upstream RPM/TPM/RPD capacity, simultaneous-load tests, and monthly spend envelope are confirmed. This is **not** a paid-availability SLA.
3. **Operational metrics:** `speakingym_ai_outcome_v1` records feature (conversation/teacher), tier, success/failure, safe error code and request latency; existing `speakingym_gemini_usage_v2` logs token categories and paid-price-equivalent USD. Neither record contains user IDs, IPs, full prompts, transcripts, API keys or Stripe data. Existing usageRecord also logs cached and thinking tokens. Cloudflare log retention/access configuration still requires operator review. These logs do not equal an invoice.

## Required release checks before real charges
- Explicitly decide whether/when to switch the Gemini API project to a paid tier with a hard budget/alert. **Do not assume cloud budgets provide a hard cutoff**; establish application-level cost/rate/kill-switch protection and provider alerts.
- Compare 600-turn + 100-coaching actual average and p95 token usage, output truncation, malformed JSON, latency, retry and 429 rate to simulations at FX 150 and stress 160.
- Confirm there is capacity for Pro peak-hour load independent of Free load. Test 10/25/50 concurrent users with fully mocked AI first, then limited real AI quota tests after cost authorization. Account for 6/IP/min and 30/global/min current defaults.
- Free plan daily session cap is unchanged. Its theoretical 31-day ceiling (3,100 turns + 93 teacher calls) can exceed Pro 600 turns and needs a separately approved product-policy change, with announcement.
- Validate a real Stripe sandbox purchase, renewal and failure/recovery through webhooks, plus payment success, stale sync and cancellation on mobile. The grace must never mask a confirmed unpaid or expired state.
- Fix the Free first-attempt failure consumption and concurrent turn refund via explicit request idempotency ledger, additive D1 migration and frontend recovery only after migration is reviewed and backed up.
- Confirm site and `/health` with actual browser/HTTP from an environment that can reach production. GitHub CI and Cloudflare deploy statuses are not independent production response checks.
- Have a tested support/refund/compensation procedure for AI outages, and publish verified service/commerce/privacy notices.

## Monitoring: practical release gates (targets, not claimed results)
- Under tested planned demand: >=99.5% successful paid conversation requests excluding invalid user input, p95 response time within a product-tested threshold, 0 unreconciled duplicate charges, 0 silent quota loss on failed turns.
- Review daily structured outcomes and token averages/p95; alert at rising Gemini 429, billing reconciliation errors, or unexpected token growth. Customer-facing "temporary AI outage" must not falsely label exhausted monthly credits.
- Monthly economics require subtraction of **Free user** cost, tax, FX/Stripe variability, Cloudflare overhead, refunds and support, not only the 680 JPY gross revenue.

References:
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- `worker/COST_REVIEW_2026-10-17.md` and `scripts/cost-simulation.mjs`
