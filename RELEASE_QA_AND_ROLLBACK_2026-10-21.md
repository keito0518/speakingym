# Speakingym ¥1,480 Pro — draft QA, launch gates and recovery (2026-10-21)

> **Draft PR #62 ONLY — production NO-GO.** The owner requested engineering improvements across twelve areas. This is a truthful handoff, not an authorization to merge, deploy or start billing. The original ¥680 customers/products, Cloudflare production Worker/D1/Pages, Stripe Live and main remain off-limits.

## Verified facts, not assumptions

- Owner personally verified **real Stripe TEST initial ¥1,480 Checkout → staging Pro entitlement → Portal period-end cancellation → expiry → Free** on 2026-10-21. **Do not repeat this completed manual test.**
- CI executes unit/integration tests and browser simulations, and stage `GET /health` (read-only). It has **not** demonstrated a real Stripe TEST paid renewal, failed invoice then recovery, actual stage quota exhaustion, actual voice microphone hardware, or real provider cost.
- The plan specification in this draft is ¥1,480/month tax inclusive, **1,000 conversation turns and 150 teacher feedback uses per Japanese calendar month**. Billing renewal date follows Stripe subscription timing and differs from the monthly quota reset. Keep the current ¥680 live-related legacy items unchanged.

## 1–12 implementation/evidence tracker

| # | Engineering responsibility | Implemented/in place | What still cannot be certified |
|---|---|---|---|
| 1 | Checkout, Portal, signed webhook safety | Server-side checkout amount, price, link and owner checks; Portal response customer/mode/URL checks; webhook idempotency and 409 retry tests | Actual renewed/failed/recovered TEST invoices |
| 2 | AI quota counting and refund | D1-side plan controls, signed identity, turn ledger, replay receipt and failure refund paths; automated QA | Real stage quota reaching 1,000/150 and actual replay outcomes |
| 3 | Conversation quality | 16 x 3 roleplay missions, continuity prompts, detection of verbatim repeated model replies | Real Gemini linguistic quality and topic coherence |
| 4 | Personalized feedback | Context-specific teacher prompt, required feedback fields, rejection of identical generic reviews for distinct utterances | Real learner-reviewed coaching usefulness |
| 5 | 60-second challenge | 151 prompts, three difficulties, nonduplicate example-answer sets, front-loaded unseen cards | Physical use with speech recognition |
| 6 | Pro review studio | Authenticated Pro-only saved real expressions and stats, balanced review sources, no extra AI expense | Real paid user retention and accessibility QA |
| 7 | Mobile and accessibility | Responsive scene layout, >=44px controls, reduced-motion behavior, synthetic Chromium/WebKit QA | Physical iPhone Safari and Android QA |
| 8 | Latency/network/retry | Error categories, stale login response defense, receipt idempotency, resume-tab quota refresh | Real carrier networks and provider p95 response |
| 9 | Price/terms/privacy alignment | Draft pricing + legal consistency tests, honest TEST-only copy, draft noindex | Real contracting operator disclosure, refund and support reply arrangements |
| 10 | Economics | Simulated ¥1,480 pricing model plus standard/heavy, retry and Free-user sensitivity matrix | Measured Gemini tokens/invoice, actual Stripe/hosting/tax costs |
| 11 | Release QA | GitHub Node suite, Chromium/WebKit simulation, Stripe staging safety gate and read-only stage health | All above real integrations and final readiness |
| 12 | Handoff/recovery | This evidence and rollback checklist, draft-only changes | Production backup, user authorization and observed rollback drill |

**Pass of source tests does not convert a real-world unknown into a checkmark.** Failures must be fixed in Draft and the last SHA revalidated. Preserve evidence URLs and test counts from the LAST successful run.

## Remaining high-value checks (prefer developer autonomy)

1. **Real TEST renewal/failure/recovery:** requires authorized Stripe TEST account and safe stage authentication; use a new isolated synthetic tester or approved test clock. Verify **Webhook 2xx retry behavior, invoice paid/open, Pro→Free→Pro**, and no connection to production. If credentials are not available, record blocked; don't ask the owner to repeat purchase/cancellation already verified.
2. **Staging D1 cap evidence:** simulate controlled stage authenticated calls (without excessive Gemini spending) and verify counts + idempotent refund on failed attempts. A mock SQLite test is not the same as stage D1.
3. **Real AI quality/cost:** sanitized Cloudflare/Gemini usage totals; examine 429, failed AI attempts, long output, worst-case retry, per-user cost and monthly stop budget. Never publish secrets, transcripts, UID or billing IDs.
4. **Device accessibility:** iPhone Safari and Android Chrome voice start/stop, microphone denied, background-tab resume, slow cellular, login and account switch. Browser emulation is supplementary only.
5. **Owner decisions:** legal merchant identity/disclosure process, reachable inquiry email, cancellation/refund, grandfathering older/manual Pro, Stripe KYC and public sale approval. Keep identifying details private.

## Safeguards before any launch authorization

- Never set `LIVE_LEGAL_READY`, `LIVE_STRIPE_SANDBOX_E2E_PASSED`, `LIVE_UNIT_ECONOMICS_REVIEWED` to `verified` from mock CI. A planned deadline or a test purchase is not consent to charge real customers.
- Confirm `billingMode` is disabled until owner-authorized, isolated invitation-only Live pilot. Only then consider public release with **another** explicit approval. Keep `TURN_LEDGER_MODE` protections and bound AI cost.
- Before a permitted D1 migration, make an authorized production backup and independently verify restore/integrity. Apply only reviewed additive `0006-live-billing-isolation.sql`, not every historic migration. Do not mutate old sandbox/¥680 rows.
- Verify effective legal page, checkout final confirmation, pricing copy, privacy policy, cancellation and support channel on the real URL and a physical phone, not only repository HTML. Double-check tax behavior and live price without touching existing contracts.

## Recovery procedure (use only after owner approval if production is affected)

1. **Prevent NEW charges or new Checkout sessions:** operator disables the explicitly approved Live billing switch; check that the Worker responds safely and logs do not leak IDs. This change alone **does not cancel existing Stripe subscriptions or refunds**.
2. **Existing customers:** authorized operator reviews Stripe Live subscriptions, upcoming invoices and cancellation/refunds; customer communication and legal obligations must be handled separately. Never delete rows or blindly switch customers to Free.
3. **Code rollback:** revert the approved deployment to its recorded last-known-good SHA. Do not force-push main or overwrite a newer release. Recheck privacy policy and checkout before any re-enable.
4. **D1 recovery:** compare the latest authorized backup and current schema, preserve raw incident artifacts securely, perform restore **only with express approval**. Avoid discarding recent purchases/events.
5. **AI incident:** reduce/disable AI according to budget safety runbook without inventing successful responses or clearing usage counters. Preserve replay receipts until their documented safe expiry.
6. **Afterward:** review sanitized telemetry and provider invoices, document affected users, run stage end-to-end regression and obtain renewed owner GO before restoring paid sales.

## Evidence links

- [Draft PR #62](https://github.com/keito0518/speakingym/pull/62)
- [Owner-confirmed initial Stripe TEST handoff](SPEAKINGYM_START_HERE.md)
- `worker/LIVE_LEGAL_OWNER_CHECKLIST_2026-10-20.md`
- `worker/PRO1480_DRAFT_RELEASE_GATE_2026-10-20.md`
- `scripts/pro1480-economics.mjs` and `scripts/pro1480-risk-matrix.mjs`
- `.github/workflows/stripe-staging-automatic-release-gate.yml`

Owner's repeated manual work should be **batched into a single final, minimal list** once developer-accessible checks are exhausted.

## 2026-10-21 additional critical finding: legacy 600-turn ledger ceiling

**Found in code review, not through real customer usage:** `worker/turn-ledger.js` had a hard-coded `<600` SQL guard when `TURN_LEDGER_MODE=enabled`, although the draft Pro entitlement, session-start and non-ledger paths advertised **1,000 turns**. Users could have been blocked after turn 600. Do not claim this occurred in production, which has not received this draft.

**Draft correction:** `PRO_MONTHLY_TURN_LIMIT=1000` in the ledger module is now the shared source for both reservation SQL (bound parameter) and `PLAN_LIMITS.pro.monthlyTurns`. Thus changes cannot silently strand paying users on two different limits. Existing 20-turn session ceiling, Japanese calendar reset, atomic reserve/refund, Free limits, and per-month teacher 150 remain unchanged.

**Regression evidence:** `worker/turn-ledger.test.mjs` now checks 601st turn with 600 prior turns, exact 1,000th ceiling, concurrent last slot and refund. `worker/turn-ledger.integration.test.mjs` checks `consumeSessionTurn` / `getEntitlement` / `refundSessionTurn` with ledger opt-in and 600→601→1000→refund→1000 boundary. This is SQLite D1 simulation, **not a write or exhaustion test in real staging D1**.

**Release implication:** include this cap inconsistency in future regression gates and communicate quota honestly; do not merge Draft #62, migrate production D1 or change Live without separate operator permission. The prior manually verified Stripe TEST purchase/expiry is unaffected and need not be repeated.
