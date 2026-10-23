# Speakingym Pro ¥980 — Draft-only build and release plan (2026-10-23)

## Status and strict boundaries

- **Proposal, not a launched price.** Candidate: ¥980 incl. tax, 400 AI conversation turns/JST month, 40 AI coaching requests/JST month; 60-second exercises, saved phrasebook and Pro review studio have no extra Gemini calls.
- A ¥1,280 / 600 / 60 fallback is a modelled alternative only. Existing PR #62 remains a **¥1,480 / 1,000 / 150 staging draft** and is NOT approved for release or merged.
- **Unchanged:** Stripe Live/Test Products/Prices, live/legacy ¥680 subscriptions, production Cloudflare Workers, production Pages/D1, `main`, deployed Gemini model and actual Free/Pro quota code.
- No provider purchase, signed renewal or real invoice has been completed for the 980-yen proposal.

## Working draft-only Pro learning functions

1. Read actual saved Teacher rewrites, scene coaching and 60-second phrases from the existing allow-listed account learning snapshot **only after signed Worker Pro entitlement**.
2. Make a five-card due queue. A self-reported `言えた` schedules the phrase after **1 / 3 / 7 / 14 / 30 calendar days**. A self-reported `まだ苦手` schedules the phrase for **tomorrow**. Repeated taps on one calendar day do not inflate counts.
3. Save bounded review metadata to this device only, keyed by the currently authenticated account UID and guarded against stale UI events or log-out/account-switch. Other devices do not yet sync review completion. The underlying saved phrases continue using existing sync.
4. Offer a daily 5-minute workflow: **1 minute due reviews → 1 minute free 60-second Sprint → 3 minutes scene-based AI dialogue**, subject to the real server-side AI allowance. This is a suggested schedule, not an auto-running timer.
5. Show actual **self-report** review attempts, recent-seven-day review attempts, consecutive-day study activity and 3+ successful staged recalls. Do **not** present these as assessed fluency, objective language proficiency or verified pronunciation.
6. All phrases displayed from learner/teacher data are text-only DOM writes, never HTML injection.

## Finance and model decision gates

The draft calculator `scripts/pro980-risk-review.mjs` compares:
- Original Gemini Developer API model `gemini-3.5-flash-lite` versus lower-price `gemini-3.1-flash-lite`, standard paid-tier token prices sourced from https://ai.google.dev/gemini-api/docs/pricing (reviewed 2026-10-23).
- Candidate ¥980 / 400 / 40, ¥1,280 / 600 / 60 and the previous ¥1,480 / 1,000 / 150, with **hypothetical** light/heavy message shapes and failure/retry amplification.
- Explicit paying/free audience sizes; pay-as-you-go Stripe assumption 3.6% card + 0.7% billing (verify real account); **10/110 of the tax-included price used only as a hypothetical reserve**, not actual tax owed.
- The *current* Free beta theoretical maximum (5 sessions/day × 20 turns × 30 = **3,000 turns/month**, teacher 3/day = **90 teacher requests/month**) creates real downside exposure for the proposed ¥980 tier. Reducing Free use requires a separate product decision, customer impact review, backend monthly cap with D1 atomic guard and budget kill switch; **not silently implemented**.
- An **actual** Gemini 3.1 model switch requires independent offline phrase quality evaluation (scene consistency, meaning preservation and Japanese teaching usefulness) and separate staging controlled traffic and real token measurement. Only then consider deployment with explicit owner consent. No real provider requests or charges are claimed.

Run locally (read-only):
`node scripts/pro980-risk-review.mjs`

## Release gate — all required before touching paid billing

- [ ] Pro review studio tested on a real signed-in Pro staging account; confirm persisted recalls across reload, day change and account change. No staging Pro entitlement is granted by localStorage.
- [ ] Actual Gemini 3.5 vs 3.1 outputs on the **same** anonymized English learning prompts; quality bar must not degrade just to save money.
- [ ] Actual anonymous token distributions, capped errors/retries, Free/Pro cost ratio, daily service budget, worst-case loss threshold and Cloudflare/Stripe invoices.
- [ ] Agree Free experience (strong enough to demonstrate the product) and implement **atomic, server-enforced monthly cap** or equivalent global cost budget. Recheck Firebase and D1 transaction races.
- [ ] Choose *one* actual selling price/limits after user experience and cost validation. Stage a *new* Stripe TEST Price, never alter old 680-yen contracts or silently reuse 1480-yen Price for 980-yen checkout.
- [ ] Real Stripe TEST signed lifecycle: first sale, renewal, failure, recovery, cancellation and Free reversion. Mocked CI is not equivalent.
- [ ] Complete privacy, data retention, legal seller identity disclosure, cancellation/refund conditions and support contact.
- [ ] Physical iPhone microphone/voice output, mobile UX, signed-in Firefox/Chrome/Safari smoke tests, backup/restore and rollback rehearsal.
- [ ] Owner's explicit, separate approval for an isolated Live pilot, then separate public sale approval.

This plan and its tests change **draft source only**. Passing CI means code/regression checks passed, not that paid release is approved.

## 2026-10-23 implementation follow-up — guest demonstration, safe undo and timezone handling

- New `pro-demo.html` / `pro-demo.js` uses the **same shared pure scheduling code** as actual Pro lessons but with six intentionally fictional saved phrases in memory. Visitors can reveal an answer, self-grade, undo one click, advance the simulated calendar and reset. This demo has **no login, billing, saved learning data or Gemini calls**. `plans.html` links to the clearly marked demo, not to a real Checkout price.
- Actual Pro `pro-study.js` now includes one-step undo of an accidentally selected self-report. The undo is allowed only for the currently verified account on the current authentication generation; a logout or account switch immediately invalidates it. Grade/undo both update the due queue and self-report statistics consistently.
- Shared `reviewDay()` now determines a study day using **Asia/Tokyo (UTC+09:00)** instead of the device local timezone, consistent with paid monthly caps and Free daily reset rules. A traveller crossing timezones does not gain/lose a review day.
- Added offline and browser fixture coverage for the sample demo, per-account undo, JST midnight and delayed Pro→AI scene navigation. An earlier simulated WebKit failure was traced to asserting before the **destination DOM was attached**. The test now waits for the destination element rather than asserting against an incompletely navigated page.
- The guest sample is distinct from the real signed Pro studio. **No simulated demo result may ever grant entitlement, spend tokens, mark an actual learner's history or imply payment was tested.**
- Still unverified: actual Pro/test payment release, signed Stripe renewal/failure/recovery, actual 3.1 model conversation quality and billing, revised Free limits, model cost controls, physical microphone, legal/owner launch approval. Continue draft-only until explicit future instructions.
