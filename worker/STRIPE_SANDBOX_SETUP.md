# Speakingym Stripe sandbox setup — 2026-10-17

This implementation deliberately CANNOT use live Stripe keys. Real billing has not been authorized.
Do not enable live mode or replace this guard until the owner approves a separate live release.
GitHub code deployment does not create a Stripe product, configure secrets, run D1 SQL, or test a real checkout.

## 1. Stripe sandbox (not live mode)

In the sandbox product catalogue, first search for **Speakingym Pro**. Reuse the existing product and a matching price if present; do not create duplicates. Required price:

- JPY 680, recurring monthly, interval count 1, tax behavior **inclusive**.
- One quantity; no trial, coupon, add-on, or automatic tax is enabled by the app.
- Record the non-secret `price_…` ID. A price with unspecified/exclusive tax behavior is rejected; create a replacement price on the same product if necessary.
- Configure Customer Portal in the SAME sandbox: payment method updates, invoices, cancellation at period end. Disable product switching and quantity updates. Trial cancellation and custom subscription edits are not offered by this app.

## 2. Cloudflare D1

Account → Storage & databases → D1 → `speakingym-plans` → Console.
Run the exact SQL in `worker/migrations/0001-billing.sql` once. It is additive and repeat-safe; existing quota tables and data are not changed.
CLI alternative from the repository: `npx wrangler d1 execute speakingym-plans --remote --file worker/migrations/0001-billing.sql --config worker/wrangler.toml`.
There is no new deployment workflow and no paid Cloudflare binding.

## 3. Worker settings

Workers & Pages → `speakingym-survival-ai` → Settings → Variables and Secrets.
Set these in the dashboard, never in chat, GitHub, or client JavaScript:

| Name | Type | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | Secret | Sandbox secret key starting `sk_test_` |
| `STRIPE_WEBHOOK_SECRET` | Secret | Signing secret from the sandbox event destination, `whsec_…` |
| `STRIPE_PRICE_ID` | Text | Verified sandbox price ID |
| `BILLING_TEST_UIDS` | Secret | Comma-separated Firebase UIDs of approved test accounts |
| `BILLING_MODE` | Text | `test`, only after migration and other settings are complete |
| `ENFORCE_PLANS` | Existing text | Keep `true` |

Firebase Console → Authentication → Users → selected test user → User UID.
`keep_vars = true` already preserves dashboard variables. Secret values never appear in API responses or logs.
No public Stripe key is needed for the hosted Checkout redirect flow.

## 4. Stripe webhook destination

Stripe sandbox → Workbench / Developers → Webhooks / Event destinations → add destination:
`https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/billing/webhook`

Select API version **2025-06-30.basil** for snapshot events, matching the API header in the code. Required events:

- `checkout.session.completed`
- `customer.subscription.created`, `.updated`, `.deleted`
- `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`

Copy that destination's signing secret directly into Cloudflare Secrets. Redeploy/save settings. Event delivery must return 2xx; configuration errors return 503 and Stripe should retry. Unknown unrelated sandbox customers are ignored.

## 5. End-to-end acceptance (NOT yet completed)

1. `/health`: `quotaVersion=pro-monthly-600-100-v2`, `billingMode=test`, plans enabled/ready.
2. Ordinary users remain Free. Unauthenticated, uninvited and tampered requests are rejected.
3. Sign in with an approved Firebase test account at `/plans.html`. Verify 680 JPY/month on hosted Checkout. Use only Stripe-documented test cards; never a real card.
4. Purchase succeeds → server status Pro → `/entitlement` reports 600 monthly turns/100 coaching uses. Merely visiting `?billing=success` must NOT grant Pro.
5. Multiple clicks/tabs/retries reuse the same customer and open checkout; there must be exactly one current subscription.
6. Portal cancellation at period end retains access until expiry. Terminal cancellation/expiry removes it. Payment failure (`past_due` or unpaid invoice) removes access; subsequent paid active state restores it.
7. Use Stripe's sandbox subscription/testing tools for renewal success/failure, not only a synthetic webhook. In this implementation, synthetic events always reconcile the actual current Stripe subscription.
8. Resend identical and older events; verify no duplicate grant/charge and no stale restoration.
9. Confirm canceled Checkout returns safely; failure/retry messages are understandable.
10. On a real iPhone Safari, signed in AND signed out: tap all model-answer audio buttons, interrupt/replay, test after mic use, background/foreground, and mute/Bluetooth/volume changes. Simulated speech is not evidence of audible playback.

## Safety / recovery

- D1 per-account lease + fenced writes serialize checkout/reconciliation; Stripe idempotency keys survive request failures.
- An unresolved create older than 23 hours fails closed (`billing_manual_review`) instead of risking reuse after Stripe's idempotency retention. Inspect Stripe and repair the exact mapping before retrying. Do not blindly clear the customer/key.
- An expired checkout may be replaced. A completed checkout is replaced only after its exact subscription is terminal.
- Webhook signature HMAC checks raw bytes and a 5-minute timestamp tolerance. Recorded event IDs deduplicate deliveries; latest Stripe state, not event timestamps, decides access.
- Paid active subscription, exact price and quantity, no payment pause, paid latest invoice and future period end are all required.
- Test Pro entitlement is stored separately from `account_plans`. Removing the test UID or disabling BILLING_MODE removes this test grant; operator-granted beta Pro is unchanged.
- AI entry points reconcile sandbox subscriptions when their cache is over 60 seconds old. Entitlement expires at period end and fails closed when the sync is over 120 seconds old. A stale or unavailable Stripe service can temporarily block AI for test subscribers.
- Roll back by setting `BILLING_MODE=disabled`. Free accounts continue without reading billing tables. Existing operator beta grants are intentionally unaffected.
- Do not log Firebase tokens, request/response bodies, Stripe errors, email, conversation content or keys. Cloudflare's platform access-log settings must also be reviewed separately.

## Before a separately approved live release

- Complete and record every sandbox acceptance case above.
- Confirm production Gemini billing tier, quota, token averages/p95 and retry overhead; do not promise unlimited access or assume free API capacity is an SLA.
- Complete operator/contact information, cancellation/refund terms and required commerce disclosures with owner-supplied facts; no placeholder identity.
- Review privacy notice for Stripe/payment data and actual AI provider treatment.
- Plan isolated live customers/prices/webhooks and separate migration. This code rejects live keys and does not provide a live launch switch.
- Receive the owner's explicit permission before enabling actual charges.

References: https://docs.stripe.com/webhooks ; https://docs.stripe.com/api/idempotent_requests ; https://docs.stripe.com/api/checkout/sessions/create ; https://docs.stripe.com/billing/testing

## Stripe 2025-03-31.basil+ invoice compatibility

Stripe removed the `Invoice.paid` boolean in the Basil API family; an invoice's `status: 'paid'` indicates successful payment. Entitlement requires the matching active/test subscription, price, quantity and current term, plus a paid invoice. An explicitly contradictory legacy `paid: false` must still fail closed. Never enable entitlement based only on a Checkout success URL or the subscription's active status. Real sandbox invoice + entitlement should be rechecked after this code change.
