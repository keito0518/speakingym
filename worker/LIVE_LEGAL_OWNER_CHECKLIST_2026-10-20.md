# Speakingym 10/31 Stripe Live — legal disclosure & final-checkout release gate (2026-10-20)

> **2026-10-21 update (draft only):** The owner’s current TARGET is ¥1,480（税込）/month, 1,000 AI conversation turns and 150 teacher feedback sessions. Previous ¥680 / 600 / 100 mentions elsewhere are historical; no production price, D1 migration, Stripe Live change or charge is authorized. All actual compliance and Checkout evidence gates remain NOT READY.

**STATUS: BLOCKED / NOT LEGALLY READY.** This file is an owner-only checklist, not the legal notice offered to consumers. Do **not** set `LIVE_LEGAL_READY=verified` merely because this template or CI exists.

**Operator scope confirmed 2026-10-20:** owner plans to run Speakingym as an individual side business rather than an incorporated company. Use the individual-operator legal disclosure plan in [`INDIVIDUAL_OPERATOR_TOKUSHO_PLAN_2026-10-20.md`](./INDIVIDUAL_OPERATOR_TOKUSHO_PLAN_2026-10-20.md). Do not assume an individual business opening notification has been filed, an unregistered site name is a legally sufficient seller identity, or home address/telephone must be displayed unconditionally: the Consumer Affairs Agency allows request-based omission subject to actual timely pre-purchase disclosure. Keep all actual identity/address/telephone values out of repository and chat unless owner explicitly chooses disclosure. Current `terms.html` describes beta-only and must not be presented as final paid terms.

## Public-facing display needed BEFORE any real invitation or payment

1. **Actual contracting operator identity**: business individual's legally recognized name or registered corporation name (a site nickname alone is insufficient); company representative/responsible officer when required. Actual operating address and reachable telephone number, or a legally acceptable request-based omission mechanism that really responds sufficiently early for purchase decisions. No invented name, address, phone, registration, or generic placeholder. Determine display/privacy method with operator and if necessary legal professional.
2. **Product and price**: Speakingym Pro, **¥1,480 per month inclusive of Japanese consumption tax** (new draft target, **not yet approved for public sale**). Confirm the Stripe LIVE Price is exactly 1,480 JPY, quantity 1, monthly recurring, tax inclusive, with no additional charges unless separately disclosed. Free remains free and no trial is advertised.
3. **Payment and fulfillment**: Stripe credit card payment, charge at signup, automatic recurring payments based on signup date, access provision timing upon verified paid invoice, payment failure / service suspension details, whether / how receipts are supplied.
4. **Cancellation and refund**: concrete and verified instructions for Stripe Customer Portal, when cancellation takes effect, access until what date, how to check renewal date, cutoff before next billing, explicit refund / pro-rata policy and exceptional refunds; consumer inquiry path must actually work. **Do not assume refunds are prohibited**, or assume the portal self-service feature is enabled without checking the Stripe dashboard and end-to-end sandbox.
5. **Exact plan value**: Pro AI conversation 1,000 *turn requests per JST calendar month*, AI teacher 150 per month, allowance reset on JST 1st independent of card billing anniversary; per-session controls, free tier, unused-balance no carry-forward, network/provider failure handling, availability and performance disclaimers. User must accept the product decision about Free/Pro value before any plan limits change.
6. **Checkout final confirmation**: subscription total and recurring frequency, price/taxes, charge and service start, cancellation/refund and key limits, click to confirm/pay, and opportunity to correct mistakes should be legible on the seller's path and in the real **Stripe Checkout** final screen. Mock/browser snapshots are not enough.
7. **Terms & privacy**: update `terms.html`, `privacy.html`, `plans.html` consistently; disclose handling of Stripe personal/payment identifiers, Gemini input, free-tier usage, Cloudflare/Firebase, data deletion and paid subscription retention accurately. Link to an accessible `特定商取引法に基づく表記` page at the price/checkout entry point; keep it current and review on iPhone.
8. **Actual Stripe test mode (not mocks)**: test Checkout→signed Webhook→Pro status→invoice paid→renewal paid/failed→duplicate webhook→Portal cancellation/end-of-period→free conversion with a dedicated synthetic Firebase tester and test card. Keep keys and real business contact details out of GitHub, chat and CI logs. Use Stripe sandbox clocks if feasible. Record sanitized QA verdict and account owner approval, not raw objects.

## Fail-closed Stripe Live launch switches

Live remains disabled until **all** are satisfied:
- `ENFORCE_PLANS=true`, `TURN_LEDGER_MODE=enabled`, production D1 backed up and migration 0006 safely checked.
- `BILLING_MODE=live`, `LIVE_BILLING_ENABLED=enabled`, and LIVE Stripe credentials/price/webhook/UID invite audience configured **after separate operator approval**.
- `LIVE_LEGAL_READY=verified` — checked all legal disclosures and real identity above.
- `LIVE_STRIPE_SANDBOX_E2E_PASSED=verified` — real Stripe sandbox, not mocked CI, passed.
- `LIVE_UNIT_ECONOMICS_REVIEWED=verified` — privacy-safe real Cloudflare usage, Google AI Studio invoices/capacity and downside loss reserve reviewed; 1,480 JPY profitability is **not yet proven**.

All three new `verified` flags default OFF. **NEVER** set these to `verified` until underlying factual checks actually pass. Their presence in code is not evidence of passing. Keep live audience `invited` until an expressly approved limited real-charge pilot works. Then get a second explicit authorization for `public` (not merely "10/31 target") and require `LIVE_PUBLIC_RELEASE_APPROVED=approved` alongside `BILLING_LIVE_AUDIENCE=public`. An invited pilot remains separate and never sets the public approval flag.

## Facts needed from the owner (do not guess and do not insert secrets)

- Whether the contracting entity is an individual or registered company; its exact legal name and disclosed responsible person.
- Legally appropriate commercial address/phone or viable request-based omission procedure; operational public inquiry contact.
- Cancellation timing, refunds (including outages/accidental charges), customer support policy; check with the actual Stripe portal behavior.
- Confirmation that the contracting Stripe business/KYC is complete and new Pro monthly JPY1,480 tax-inclusive Price is set.
- Evidence of real sandbox lifecycle, Gemini usage/cost ceiling and backup restore validation.

**Official sources (reviewed 2026-10-20):**
- Consumer Affairs Agency 特商法の通信販売広告表示: https://www.no-trouble.caa.go.jp/what/mailorder/advertising.html-5
- Consumer Affairs Agency omission FAQ: https://www.no-trouble.caa.go.jp/qa/advertising.html-2
- Consumer Affairs Agency final-order-confirmation guidance: https://www.caa.go.jp/policies/policy/consumer_transaction/amendment/2021/notice03
- Stripe subscription testing: https://docs.stripe.com/billing/testing

This is an engineering release checklist, **not** a substitute for legal advice.
