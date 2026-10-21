# Speakingym — START HERE / 2026-10-21 before-lunch release gate

> **Scope:** authoritative short handoff for the existing Draft [PR #62](https://github.com/keito0518/speakingym/pull/62), branch `integration/pro680-latest-main-review-20261020`. This is **not** permission to merge, deploy, sell subscriptions, update Cloudflare production, or use Stripe Live. The detailed source of truth is [STRIPE_NEXT_SESSION_2026-10-20.md](STRIPE_NEXT_SESSION_2026-10-20.md) and [worker/STRIPE_SANDBOX_SETUP_1480_STAGE_ONLY.md](worker/STRIPE_SANDBOX_SETUP_1480_STAGE_ONLY.md).

## The next session's ONE priority

**Complete real Stripe TEST end-to-end against the separate billing-only STAGING Worker and STAGING D1.** Do not add more general product features, create duplicate Stripe products, or merge PR #62 as a substitute for this verification.

Offer being tested: **¥1,480/month including tax; 1,000 AI conversation turns/month; 150 AI teacher reviews/month**. Existing ¥680 Stripe product/subscriptions are out of scope and must remain unchanged.

## What has been verified / not verified

| Item | Status / evidence |
| --- | --- |
| GitHub Draft PR | #62 is **draft, unmerged**; 2026-10-21 last code SHA `47aa48cc01d6f37e4f0dc8553b772e60d876e7d1`. Node 417/417 passing, all five CI workflow families green including simulated Chromium/WebKit browser QA: [Launch QA run](https://github.com/keito0518/speakingym/actions/runs/39522171660). Recheck head SHA before acting. |
| Isolated Worker | Real GET /health reported 16 scenes, D1 ledger/Free schemas ready, but AI/Free/billing/replay **OFF**: [staging public check #39511486395](https://github.com/keito0518/speakingym/actions/runs/39511486395). **This was HEALTH-ONLY, not a billing E2E**. A new current GET check is still needed. |
| Isolated D1 | `speakingym-plans-staging`, UUID `c608774e-3bc5-4527-be8d-f640e386f504`, distinct from production. Owner reported pasting staging-only migration 0001 billing tables; **remote confirmation of both billing tables has NOT been obtained**. |
| Stripe TEST products | Owner screenshot showed separate active **¥1,480/month** sandbox product and old ¥680 product. Never duplicate or edit ¥680. Exact tax-inclusive Stripe Price attributes and ID **NOT independently verified**. |
| Stripe TEST webhook | Owner selected seven events in Workbench wizard; save/destination existence, exact URL, version, signature secret and actual delivery **NOT confirmed**. Could be v1 or v2; read existing destinations before creating anything. |
| Stripe TEST portal | Default test portal cancellation/payment update/period-end cancellation **NOT confirmed**. |
| Stripe secrets / staging rollout | Dedicated staging billing secrets and billing-only deploy **NOT confirmed**. Do not touch production secrets or Worker. |
| Actual Stripe E2E | **NOT DONE**: real Checkout, signed webhook, staging D1 Pro grant, renewal, failed payment, cancellation/expiry, owner-mismatch checks. The browser QA used simulated Stripe responses. |
| Live sales legal gate | `tokusho.html` explicitly says **sales-preparation draft**, with cancellation/refund, operator disclosure response process and payment terms not finalized. Site must not accept Live charges until finalized and validated. |
| Unit economics | `scripts/pro1480-economics.mjs` is a hypothetical model, **not measured Cloudflare/Gemini costs or Stripe invoices**. |

## Lunch agenda — follow in this order

1. **Recheck current PR and stage health without credentials/writes.** Keep #62 draft. Run `node scripts/staging-stripe-readiness.mjs` only *after* preparing billing-only mode; it correctly fails while stage is health-only. Existing GitHub Actions workflow `.github/workflows/staging-stripe-readiness.yml` is GET-only and can be run separately. Never re-label a failed readiness check as passing.
2. **Stripe sandbox existing objects, READ ONLY first.** Confirm existing new ¥1,480 Price is `JPY 1480 / monthly / tax_behavior=inclusive / active / no trial`. Review **both** legacy `/v1/webhook_endpoints` and new `/v2/core/event_destinations`, the **exact staging endpoint**, **seven events**, **stable snapshot version** (`2026-09-30.endive` for v2), no duplicate. Confirm default TEST Portal enables payment-method update and period-end cancellation but not plan/quantity switch. If owner can supply a TEST-only API key **to the private local environment, not chat**, `node scripts/stripe-test-single-pass-audit.mjs` combines this as GET-only, no writes. Otherwise inspect TEST dashboard with owner, never create duplicate products blindly.
3. **Read-only staging D1 check** using `node scripts/staging-billing-schema-gate.mjs` (if Wrangler access exists). Ensure two additive billing tables `billing_accounts` and `billing_events` are present **in staging only**. If incomplete or no access, STOP; get explicit authorization before any test D1 schema write. Do not access/alter production D1.
4. **Only after 2 and 3, stage TEST configuration with owner-controlled secrets.** Target `speakingym-survival-ai-staging` and `speakingym-plans-staging` only, with `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `STRIPE_PRICE_ID=price_...`, `BILLING_TEST_UIDS` (a dedicated test UID). Secrets stay encrypted in the staging Worker settings, not GitHub/chat/screenshots. If authorized, deploy *only* `worker/wrangler.staging-billing.toml`. Verify GET /health reports `stagingBillingOnly=true`, `stagingBillingSchemaReady=true`, `billingMode=test`, AI/Free/replay disabled, and expected plan quota/schema.
5. **Actual test transactions**, using only local `stripe-staging-qa.html` and a dedicated Firebase tester, never the production `plans.html`: open TEST Checkout, use Stripe test card, verify actual signed Stripe event delivery, **paid invoice → staging D1 entitlement Pro 1000/150**, duplicate/out-of-order event safety, unpaid/failed renewal and recovery, period-end cancellation/expiry, wrong UID and forged success URL not granting Pro. Confirm cancellation in Stripe TEST Portal. Record only outcomes and safe timestamps, no customer IDs, auth tokens or PII in GitHub.
6. **After tests**: retain explicit NO-GO for Live until verified legal/operator disclosure process, refund/cancellation terms, provider cost/quota, real iPhone Safari/Firebase spot checks, and a separate owner GO.

### Stop conditions

- Any Stripe **Live** key, price, webhook, endpoint, account or charges in the workflow.
- Production Worker/D1 or main branch as deploy target.
- Duplicate test Price/webhook destination, unknown tax mode, non-snapshot/preview webhook, signature mismatch.
- Missing or uncertain staging D1 schema / secrets / test-UID allowlist.
- Any webhook failure, unpaid invoice treated as Pro, entitlement granted just from success URL, cancellation/expiry mismatch.
- Legal readiness still a draft when contemplating public Live billing.

## Operator collaboration / minimum needed

The owner only needs to authorize/login when provider consoles require it; do **not** repeatedly request the same verification. First show a single consolidated list of specifically missing existing settings after read-only checks. Do not ask the owner to paste keys into ChatGPT, GitHub PR comments or screenshots. A Cloudflare Work-browser `API Failed` is a browser issue, not permission to change production or keep retrying Cloudflare logins. Use ordinary browser owner control, or Work mode if its cloud browser is available. If external consoles are inaccessible, record **NOT VERIFIED**, do not infer success.

## Files / tools to reuse

- [Read-only Stripe catalogue+webhooks+portal](scripts/stripe-test-single-pass-audit.mjs)
- [GET-only isolated staging health readiness](scripts/staging-stripe-readiness.mjs)
- [Read-only staging schema gate (default)](scripts/staging-billing-schema-gate.mjs)
- [Isolated billing-only Wrangler config](worker/wrangler.staging-billing.toml)
- [Local sandbox QA](stripe-staging-qa.html)
- [Detailed safe runbook](worker/STRIPE_SANDBOX_SETUP_1480_STAGE_ONLY.md)
- [General project background](WORK_HANDOFF.md)

**No secrets or actual PII belong in this handoff.**
