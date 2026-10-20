# Speakingym ¥1,480 Pro — Stripe TEST ONLY, isolated staging runbook

**State:** PR #62 is still draft/unmerged. The production site, production Worker, production D1, and Stripe Live are not authorized to change. Never treat a mocked CI event as an actual paid subscription.

## Verified in this conversation

- Cloudflare OAuth (Wrangler): browser authorization granted.
- Isolated Worker `speakingym-survival-ai-staging` served a valid, safe GET `/health` response under the credential-free GitHub Actions public health check.
- Isolated D1 `speakingym-plans-staging` (UUID `c608774e-3bc5-4527-be8d-f640e386f504`) has `account_plans`, `ai_sessions`, `ai_turn_reservations`, `free_session_reservations`, and `teacher_uses`.
- Production Worker: `speakingym-survival-ai`; production D1: `speakingym-plans`. **Neither is for Stripe sandbox E2E.**
- No claim that Stripe test products, sandbox portal, webhook signing, or genuine subscription E2E have been verified.

## 1. Prepare isolated STAGING billing schema (test DB only)

At repository root, with Cloudflare Wrangler already logged in:

```sh
node --test tests/staging-billing-schema-gate.test.mjs
node scripts/staging-billing-schema-gate.mjs
```

The default is READ-ONLY. This command first confirms the exact remote name+UUID. If the five essential tables are absent, stop.

When authorized to create the **two additive billing tables only on staging**, execute:

```sh
node scripts/staging-billing-schema-gate.mjs --apply
```

The script first checks local safe config, checks remote D1 name/UUID, checks base tables, applies `worker/migrations/0001-billing.sql` by explicit **staging** name and `wrangler.staging.toml`, and verifies both new tables. It refuses partial schema, unexpected SQL and mismatched target. It never runs 0006, drops tables, changes quotas, or touches production. An authentication/JSON error stops work without claiming success.

## 2. Optional Stripe TEST price automation (not yet executed against the real account)

The draft also includes `scripts/stripe-test-price-bootstrap.mjs`: **read-only by default**; it lists the Stripe TEST product and prices to avoid creating duplicate pricing. Under an explicit `--apply`, with a locally configured `SPEAKINGYM_STRIPE_TEST_KEY=sk_test_...` that is never pasted into chat or GitHub, it creates only a missing **TEST** product and/or **¥1,480 tax-inclusive licensed monthly** Price. It refuses Live keys, incomplete listings and duplicate exact matches. It never creates customers, subscriptions, webhooks, invoices, Charges, or Checkout. The returned Price identifier must be stored privately in the staging Worker; this helper does **not** activate billing.

```sh
node --test tests/stripe-test-price-bootstrap.test.mjs
node scripts/stripe-test-price-bootstrap.mjs
# Only when TEST account, Stripe key, and result are independently verified:
# node scripts/stripe-test-price-bootstrap.mjs --apply
```

This does **not** prove the local Windows D1 schema script finished: confirm the staging-only success output or perform a fresh read-only verification in a later authenticated run.

## 3. Stripe dashboard — only the TEST/sandbox account

Create or reuse a *test* product for **Speakingym Pro** and a **new matching test Price**:

- JPY **1,480**, monthly subscription, tax behavior `inclusive`, exactly one unit, `per_unit` flat pricing, `licensed`, **no trial**.
- Do not mutate an old ¥680 price/contract. Do not use `sk_live_`, even in staging.
- Create a webhook event destination in the **same Stripe sandbox**:
  `https://speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev/billing/webhook`
- Subscribe to `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`.
- Set the sandbox customer portal default to payment method updates and cancellation at period end (do not allow product/quantity switching).
- Use a dedicated Firebase **test** identity. Do not paste real Firebase UID, Stripe secret keys, webhook secrets, personal details or access tokens in ChatGPT/GitHub.

If a Stripe test key, Price ID, and destination URL are safely available as local environment variables, run the GET-only preflight `node scripts/stripe-sandbox-preflight.mjs`. It strictly refuses any webhook host other than the exact isolated staging Worker. Passing this preflight is **NOT** an E2E pass.

## 4. Billing-only Worker activation — after step 1 and real sandbox configuration

Use the dedicated, separately reviewed config `worker/wrangler.staging-billing.toml`. It refers to the SAME isolated staging Worker/D1, with `BILLING_MODE=test`, `STAGING_HEALTH_ONLY=false`, `STAGING_BILLING_ONLY=true`, `ALLOW_AI=false`. All AI/Free session routes stay disabled, only signed Stripe billing endpoints and Firebase-verified `GET /entitlement` are allowed.

Set **staging Worker encrypted secrets only**, never production: `STRIPE_SECRET_KEY` (`sk_test_...`), `STRIPE_WEBHOOK_SECRET` (`whsec_...`), `STRIPE_PRICE_ID` (`price_...`), `BILLING_TEST_UIDS` (single QA Firebase user initially). Be sure you are modifying `speakingym-survival-ai-staging`. These are runtime secrets, not source code, `.env` uploads, chat messages, or GitHub commit contents.

After confirming every secret, from `worker/` run:

```sh
npx wrangler@4 deploy --config wrangler.staging-billing.toml
```

Never run plain `wrangler deploy`. Check staging `/health`: `billingMode=test`, `stagingBillingOnly=true`, `stagingHealthOnly=false`, plans/ledger/schema ready, and AI disabled. If billingMode is `disabled`, stop; a required test-only secret/allowlist is missing. Do not work around this guard by changing production. If testing is paused, redeploy with `wrangler.staging.toml` to return to safe health-only mode.

## 5. Still-required genuine sandbox E2E

The production `plans.html` uses production endpoints; **do not use it as a staging checkout test** or redirect it to production billing. Use a separately hosted authorized staging test frontend or an explicitly approved safe test harness.

Test actual Checkout with a Stripe-documented test card; verify signed webhook→staging D1 `billing_accounts` only→Pro entitlement **1,000 turns / 150 coaching**. Test no entitlement on forged success URL, wrong Firebase UID, mismatched price, unpaid invoices, duplicate/out-of-order events, renewal success/failure, cancellation at term end, and eventual removal of Pro. Stripe Test Clocks can simulate renewals; they do not substitute for asserting the Firebase entitlement via the staging Worker.

**Current blockers:** sandbox Price/portal/webhook not yet independently verified, staging-specific authenticated checkout client/test user not yet verified, real full Stripe E2E not executed. These are gates, not successes.

## 6. Production gate

Do NOT merge/deploy the draft to production or activate Stripe Live, production D1 changes, or paid Gemini access without separate explicit approval after real sandbox E2E, legal display and cost review.

References:
- https://developers.cloudflare.com/d1/wrangler-commands/
- https://docs.stripe.com/billing/testing
- https://docs.stripe.com/api/prices/object
