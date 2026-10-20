# Speakingym ¥1,480 Pro — Stripe TEST ONLY, isolated staging runbook

**State:** PR #62 is still draft/unmerged. The production site, production Worker, production D1, and Stripe Live are not authorized to change. Never treat a mocked CI event as an actual paid subscription.

## Verified in this conversation

- Cloudflare OAuth (Wrangler): browser authorization granted.
- Isolated Worker `speakingym-survival-ai-staging` served a valid, safe GET `/health` response under the credential-free GitHub Actions public health check.
- Isolated D1 `speakingym-plans-staging` (UUID `c608774e-3bc5-4527-be8d-f640e386f504`) has `account_plans`, `ai_sessions`, `ai_turn_reservations`, `free_session_reservations`, and `teacher_uses`.
- Production Worker: `speakingym-survival-ai`; production D1: `speakingym-plans`. **Neither is for Stripe sandbox E2E.**
- **New evidence from owner screenshots (2026-10-20):** Stripe SANDBOX product `Speakingym Pro 1480（サンドボックス検証用）` exists, is active, and has a recurring JPY 1,480 monthly Price, no trial displayed, 0 active subscriptions. The legacy `Speakingym Pro` JPY 680 product also exists and must remain untouched. **`tax_behavior=inclusive`, Price ID, Portal config and subscription E2E are NOT verified by screenshots.**
- Owner completed a SQL paste for both staging billing tables and said it worked, but **7-table count was not independently rechecked**. Treat staging billing migration as **user-reported**, not remote verified.
- Owner selected seven Stripe sandbox snapshot events in the **new Workbench Event destinations v2 wizard**, with only API versions `2026-09-30.endive` and `2026-10-07.preview` available. **Creation was not confirmed** and prior legacy v1 webhook may exist. **Do not ask owner to duplicate setup before read-only v1+v2 audit.**
- No claim that the sandbox webhook signing secret, Portal configuration, stage secrets or genuine subscription E2E have been verified.

## 2026-10-21 verified staging status (read-only real environment check)

- [GitHub Actions public staging GET /health run #39511486395](https://github.com/keito0518/speakingym/actions/runs/39511486395) completed **success** against the actual separately deployed staging Worker: 16 scenes, D1 ledger/Free schemas ready, AI/Free features **off**, billing **disabled**, replay **off**.
- This confirms **safe health-only staging**, **NOT** billing-only staging. It does not prove the two Stripe billing D1 tables, configured Stripe TEST secrets, ¥1,480 Price, Webhook, Portal or a real purchase.
- The local QA page's ready text now explicitly distinguishes staging Worker/D1 safety from unverified Stripe settings, and its checkout gate requires the complete staging safety flags.
- A real billing-only staging deployment is still **not performed**. Continue with isolated stage D1 verification, then read-only Stripe TEST inspection before enabling staging TEST billing; never modify production.

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

## 2. Read-only Stripe TEST catalogue inspection (never create duplicate products)

The owner's screenshots already show an **active, separate ¥1,480/month test product** alongside the legacy ¥680 product. It is **not necessary to create any product or Price** unless future Stripe API evidence contradicts the screenshots. The existing `scripts/stripe-test-price-bootstrap.mjs` now does **GET requests only** with an optional locally provided `SPEAKINGYM_STRIPE_TEST_KEY=sk_test_...`, distinguishes the new product, and checks that the matching Price is ¥1,480 JPY/month, tax inclusive, licensed with no trial.

```sh
node --test tests/stripe-test-price-bootstrap.test.mjs
node scripts/stripe-test-price-bootstrap.mjs
```

The prior `--apply` mode has been intentionally removed: **it now fails before making any Stripe API call**, preventing accidental duplicate product/price creation. If the Price is not found because the product name varies or tax behavior differs, it reports **manual review**; do not silently create another price or change the ¥680 plan.

Only GET-only credential handling is supported here. Never paste a Stripe secret, Firebase UID, webhook signing key, or account identifiers in GitHub, chat, screenshots or automation logs. These are local, not yet actual verified Stripe API results.

### One-pass verification (requires an existing local Stripe TEST-only key; no credentials in GitHub)

`scripts/stripe-test-single-pass-audit.mjs` can combine the catalogue audit above and `scripts/stripe-sandbox-preflight.mjs` automatically, with **no manual Price ID lookup or webhook URL input**. It checks the existing ¥1,480 product, matching tax-inclusive monthly Price, old and new TEST webhook destinations, seven event subscriptions, stable snapshot version, and TEST customer portal. All six requests are **GET-only**, never creating a product, subscription or charge.

```sh
node --test tests/stripe-test-single-pass-audit.test.mjs
node scripts/stripe-test-single-pass-audit.mjs
```

The second command requires `SPEAKINGYM_STRIPE_TEST_KEY` already set securely **in that local process environment**. Do not paste the key into ChatGPT, terminal screenshots, GitHub, logs, or a tracked file. If no key is available, leave this check as **not run** and use the Stripe TEST dashboard later. A successful result would still **not** verify signed webhook deliveries or a genuine Checkout subscription.

## 3. Stripe dashboard — only the TEST/sandbox account

**Do not create another product:** user screenshot already confirms **Speakingym Pro 1480（サンドボックス検証用）** exists in the TEST sandbox alongside a distinct ¥680 legacy product. Reuse the correct ¥1,480 TEST Price after API verification; leave legacy untouched.

- JPY **1,480**, monthly subscription, tax behavior `inclusive`, exactly one unit, `per_unit` flat pricing, `licensed`, **no trial**.
- Do not mutate an old ¥680 price/contract. Do not use `sk_live_`, even in staging.
- **First use read-only inspection (both APIs!) to look for an already-existing destination.** Workbench 2026 uses `GET /v2/core/event_destinations?include[0]=webhook_endpoint.url`; older configuration uses `GET /v1/webhook_endpoints`. The sandbox preflight checks BOTH for exact URL, duplicate configuration, event types, snapshot payload and test mode. For modern v2 it requires stable `2026-09-30.endive` and rejects `2026-10-07.preview`. For legacy v1 it now requires an **explicitly pinned** `api_version` (`2025-06-30.basil` or stable `2026-09-30.endive`), a matching `webhook_endpoint` object, and a null Connect application; `api_version: null`, unknown versions and missing ownership metadata fail closed. An existing unmatched/invalid destination means **manual review, not permission to create a second webhook**. Do not create duplicate destinations.
- If **neither** has the dedicated stage target, use Stripe sandbox's new Event destinations snapshot wizard with stable `2026-09-30.endive` to create exactly one:
  `https://speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev/billing/webhook`
- Subscribe to `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`.
- Set the sandbox customer portal default to payment method updates and cancellation at period end (do not allow product/quantity switching).
- Use a dedicated Firebase **test** identity. Do not paste real Firebase UID, Stripe secret keys, webhook secrets, personal details or access tokens in ChatGPT/GitHub.

If a Stripe test key, the NEW Price ID, and the exact staging webhook URL are safely available as local environment variables, run GET-only `node scripts/stripe-sandbox-preflight.mjs`. It checks legacy v1 and modern v2 destinations, rejects ambiguity, preview, thin events, live mode, and wrong tax behavior. For v2 it deliberately pins the STABLE `2026-09-30.endive` snapshot destination, while the Worker's outgoing API requests remain pinned to `2025-06-30.basil`; these are distinct controls and real signature/webhook processing still requires E2E validation. Passing this preflight is **NOT** an E2E pass.

## 4. Billing-only Worker activation — after step 1 and real sandbox configuration

Use the dedicated, separately reviewed config `worker/wrangler.staging-billing.toml`. It refers to the SAME isolated staging Worker/D1, with `BILLING_MODE=test`, `STAGING_HEALTH_ONLY=false`, `STAGING_BILLING_ONLY=true`, `ALLOW_AI=false`. All AI/Free session routes stay disabled, only signed Stripe billing endpoints and Firebase-verified `GET /entitlement` are allowed.

Set **staging Worker encrypted secrets only**, never production: `STRIPE_SECRET_KEY` (`sk_test_...`), `STRIPE_WEBHOOK_SECRET` (`whsec_...`), `STRIPE_PRICE_ID` (`price_...`), `BILLING_TEST_UIDS` (single QA Firebase user initially). Be sure you are modifying `speakingym-survival-ai-staging`. These are runtime secrets, not source code, `.env` uploads, chat messages, or GitHub commit contents.

After confirming every secret, from `worker/` run:

```sh
npx wrangler@4 deploy --config wrangler.staging-billing.toml
```

Never run plain `wrangler deploy`. Check staging `/health`: `billingMode=test`, `stagingBillingOnly=true`, `stagingHealthOnly=false`, plans/ledger/schema ready, and AI disabled. If billingMode is `disabled`, stop; a required test-only secret/allowlist is missing. Do not work around this guard by changing production. If testing is paused, redeploy with `wrangler.staging.toml` to return to safe health-only mode.

## 5. Local Stripe TEST-only QA page (code + browser mocks ready; real billing NOT activated)

- New files: `stripe-staging-qa.html`, `stripe-staging-qa.js`, `scripts/serve-stripe-staging-qa.mjs` and `scripts/Windows_Start_Stripe_Staging_QA.cmd`.
- On Windows the launcher downloads pinned, reviewed draft code, runs localhost safety tests, starts a Node.js HTTP server on **127.0.0.1:8765**, and automatically opens `http://localhost:8765/stripe-staging-qa.html`. The server serves only those two QA files plus the public `firebase-config.js`; never the repository, D1, keys or any production API. Stop the local server by closing its terminal. The script is for staging **only**.
- Alternatively from repo root: `node scripts/serve-stripe-staging-qa.mjs --open` (Windows) or omit `--open` and open the localhost page yourself.
- Checkout and Portal return to this **exact localhost QA page** only when `STAGING_BILLING_ONLY=true` and `BILLING_MODE=test`. Default/prod return URLs remain `https://speakingym.pages.dev/plans.html`; browser-supplied return URLs are never accepted.
- Localhost requests are accepted only from the exact `http://localhost:8765` origin when the separate staging Worker is in Stripe TEST billing-only mode. Signed Firebase token, one invited test UID, Stripe price and webhook signature still required.
- If Google popup reports `auth/unauthorized-domain`, a Firebase administrator must separately approve `localhost` as an Authentication authorized domain. **Do not** alter production Firebase settings or authorize arbitrary origins without approval. This limitation is not an E2E pass.
- UI forbids Checkout until `/health` proves billing-only, test mode, both billing schema tables, ledger ready, no AI and no Free-session processing. Test Stripe Checkout URL must be exactly `checkout.stripe.com`; Portal must be exactly `billing.stripe.com`. The completion URL alone never sets Pro.
- The **fake browser E2E** runs in Chromium/WebKit via `tests/stripe-staging-browser-qa.cjs`; it is a mocked CI safety test, **not proof of real Stripe behavior**. A separate read-only check `node scripts/staging-stripe-readiness.mjs` confirms current deployed stage readiness once real Stripe TEST configuration is complete; it intentionally fails until then.

## 6. Still-required genuine sandbox E2E

The production `plans.html` uses production endpoints; **do not use it as a staging checkout test**. The local QA page above is ready in draft, but requires the actual TEST-only staging secrets and a Firebase QA identity before real browser E2E can begin.

Test actual Checkout with a Stripe-documented test card; verify signed webhook→staging D1 `billing_accounts` only→Pro entitlement **1,000 turns / 150 coaching**. Test no entitlement on forged success URL, wrong Firebase UID, mismatched price, unpaid invoices, duplicate/out-of-order events, renewal success/failure, cancellation at term end, and eventual removal of Pro. Stripe Test Clocks can simulate renewals; they do not substitute for asserting the Firebase entitlement via the staging Worker.

**Current blockers:** sandbox Price/portal/webhook not yet independently verified, staging-specific authenticated checkout client/test user not yet verified, real full Stripe E2E not executed. These are gates, not successes.

## 7. Production gate

Do NOT merge/deploy the draft to production or activate Stripe Live, production D1 changes, or paid Gemini access without separate explicit approval after real sandbox E2E, legal display and cost review.

References:
- https://developers.cloudflare.com/d1/wrangler-commands/
- https://docs.stripe.com/billing/testing
- https://docs.stripe.com/api/prices/object
