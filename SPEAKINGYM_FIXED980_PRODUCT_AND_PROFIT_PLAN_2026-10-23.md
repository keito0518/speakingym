# Speakingym — ¥980 FIXED product, Freeze Breaker and profit-first operations

Status: Draft PR #62 implementation/handoff, 2026-10-23. **The user has definitively
selected ¥980/month (tax included)**. Do not propose ¥1,280, ¥1,480, ¥1,980 or
other Pro monthly prices again unless the owner explicitly reopens pricing.
Change delivery cost, usage design, conversion and retention instead.

## 1. Product differentiator: recover from the freeze, don't just memorize phrases

New actual browser workout `freeze-breaker.html` + `freeze-breaker.js` +
`freeze-breaker-data.mjs` is linked from the homepage and pricing page.

Six scenarios (cafe, hotel, restaurant, train, work, shopping), at least two
surprise variants each and rotating followup challenges. A learner:
1. Hears/reads a deliberately unexpected line; speaks a response out loud.
2. Self-identifies the reason for getting stuck (listening, missing words,
   surprise, unsure how to answer).
3. Practises one conversation-repair line (e.g. *Could you give me a second?*).
4. Handles a second unexpected reply, optionally reveals hints.
5. Self-reports `言えた` or `まだ詰まる`; successful independent practice
   schedules another test after 1 / 3 / 7 / 14 days; a miss/hint schedules tomorrow.
6. Revisits the next variation; sees repeat attempts, independently completed
   rehearsals, practiced scenes, next due date.

It is **scripted guided practice, not an AI free conversation, and does not
grade speech or pronunciation**. Optional learner text is held in memory only;
no raw audio/transcript, API requests or custom answers are saved. Only
bounded scenario IDs, dates, self-rated outcome and counters are stored on
this device under isolated guest/current-account scopes. No automatic cloud
sync or marketing promises of scientifically verified fluency improvement.
This asset is Free to attract learners at **zero marginal Gemini call cost**;
real AI roleplay remains the Pro differentiation together with review studio.

## 2. Frozen commercial terms, with transparent separation

- **Public future Pro monthly fee: ¥980 inclusive.**
- Actual Gemini conversation caps, Free AI allocation, AI feedback amount and
  fair-use terms are **NOT finalized**. Paid AI must be genuinely useful;
  never promise unlimited API turns before tail-risk stress tests and sufficient
  financial reserves. Unlimited *non-AI* guided workouts are feasible now.
- Existing TEST ¥1,480 Price and any legacy ¥680 contract are left untouched.
  To keep test QA reusable, `worker/billing.js` checks amount 1,480 only
  for TEST, and checks **980 for LIVE** on the Product, Checkout total and
  line item before any payment URL is returned.
- `/billing/status` now exposes a server-selected checkout amount.
  `billing-ui.js` will not enable LIVE checkout without server-confirmed 980.
  The Draft `plans.html` prominently labels the ¥980 decision, explains
  TEST-only ¥1,480 and links to Freeze Breaker.
- **NO currently operable Live payment**, Stripe Product/Price creation,
  changes to a production Worker, production Pages, production D1 or main.
  The old ¥1,480 legal disclosure and archival PR docs are HISTORICAL DRAFTS,
  not a valid ¥980 consumer-law notice. Update all current disclosures and
  confirm seller contact, cancellation/refunds and user consent before rollout.

## 3. Separation of Free/Pro AI budgets (opt-in stage, not activated)

New proposed guard env vars in addition to authenticated per-user Free month caps:
- `AI_MONTHLY_BUDGET_YEN`: hard ceiling for total reserved estimated call costs.
- `AI_FREE_BUDGET_YEN`: maximum reserved estimated costs Free can use in total.
- `AI_PRO_RESERVED_YEN`: minimum proportion of the total protected from Free.

Configuration **fails closed** if Free cap + Pro reserve > total.
Each admitted call is a single atomic D1 INSERT checking global cap, Free cap
and Free per-user limit. Failed Gemini/timeouts keep the *estimated cost* spent
so repeated retries don't bypass budget. The existing exact-ID usage ledger
must be healthy so denied requests don't consume Pro/Free functional quotas.
Still subject to real Google usage/invoices, provider-side caps and separate
Legacy Pro 1,000-turn limit until finalized; this is NOT a guaranteed unlimited
or absolute Google billing cap.

The additive 0007 migration is **not applied** to any production D1 and the
guard is off by default. See `worker/AI_COST_GUARD_STAGING_RUNBOOK_2026-10-23.md`.

## 4. FIXED ¥980 unit economics: cost levers, not price increases

Offline model: `node scripts/pro980-operating-model.mjs`.

Its fixed 980-yen analyses intentionally vary paid/Free user counts,
average and heavy output tokens, Gemini 3.1 vs 3.5, usage distributions,
retries, FX, estimated Stripe standard fees and hypothetical tax reserve,
fixed hosting and support cost. Its results are **not actual customer invoices,
Japanese tax calculations, or guaranteed margins**.

At 980 yen:
- Heuristic Stripe+Billing rate 4.3% => 42.14 yen per subscriber.
- Additional assumed tax/safety reserve 10/110 => 89.09 yen.
- Remaining **about ¥848.77** per subscriber BEFORE Gemini costs, free-user
  subsidies, hosting, customer support, refunds or merchant fees.
- Target initially **paid AI mean ≤¥300**, Free subsidy per paid user
  ≤¥150, operational variable/fixed allocation ≤¥100. On those illustrative
  assumptions there is **roughly ¥299 contribution per subscribed month**.
- At ¥299 contribution each, reaching ¥50,000/month before excluded costs
  requires at least **168 retained subscribers** (not one-off trials).
- The heavy Gemini scenario can erase the contribution entirely; treat output
  tokens, long history and AI teacher amplification as the riskier drivers.

Improve margin without price hikes:
1. Collect anonymous real output/input/thinking token distributions p50/p90/p99,
   per feedback type, retries and failures. Inspect actual Google costs in an
   authorized isolated environment; compare quality before switching 3.5→3.1.
2. Keep conversations concise where natural; avoid forwarding full conversation
   history needlessly. Do not silently remove quality or correctness.
3. Make non-AI study tasks genuinely helpful and unlimited: Freeze Breaker,
   60-second Sprint, spaced review, saved phrases.
4. Give Pro demand priority by reserving provider-cost budget; Free is a
   product sampling channel, not an unlimited variable-cost sink.
5. Track conversion, churn/retention, average active days, return-to-review
   rate, independent redo and upgrade intent. Do not equate repeated taps with
   verified spoken ability.
6. Set a worst-case loss stop threshold and a provider-side spending alert,
   but message paying learners transparently if availability is affected.
7. If the 980-yen paid cohort is unprofitable even with the above, adjust
   billable-feature caps/AI model and support cost, NOT monthly subscription fee.

## 5. Remaining release gates

- [ ] Real Gemini 3.1/3.5 same-prompt quality and **actual** token metadata.
- [ ] Confirm actual paid/free usage tails and minimum acceptable paid-session
      availability at the fixed price.
- [ ] Isolated staging D1 budget migration + allowlist + provider-budget test.
- [ ] Complete ¥980-specific legal seller identity/contact, plan limits,
      cancellation/refund wording; remove obsolete ¥1,480 legal terms from
      prospective live release. Do NOT publish personal information in GitHub.
- [ ] New ¥980 Stripe TEST recurring Price, VERIFIED inclusive-tax and month
      basis; first purchase, renewal success, failure, recovery, cancellation.
- [ ] Physical iPhone microphone, real signed learning session and saved
      workout state across account switches.
- [ ] Separate owner approvals for limited LIVE pilot and later general LIVE
      subscriptions. Preserve all existing ¥680 rights.

This memo is the authoritative current price decision; older dated ¥1,480
launch-plan files are retained ONLY for sandbox-history and regression QA.
