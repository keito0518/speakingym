# Speakingym: pre-payment cost monitoring and retry ID groundwork (2026-10-18)

## Safe implementation in this branch
- Worker `speakingym_gemini_usage_v2` log now includes `plan` (free/pro/legacy), derived **only** from authenticated server-side reservations; no Firebase UID, IP, learner transcript or secret is included. Existing token and thinking usage calculation is unchanged.
- New read-only, *local* report: `node scripts/ai-cost-report.mjs /path/to/redacted-worker-logs.jsonl`. Optional assumed FX `SG_USDJPY=160 node scripts/ai-cost-report.mjs ...`. Output only groups of API usage in JPY, mean input/output/thinking tokens, success rate, p95 response time, error counts, and a sampled 600-turn + 100-teacher AI-cost projection at 680 JPY.
- Reports warn `decision: insufficient_real_usage_data` unless at least 30 Pro conversation samples and 10 Pro teacher samples are present. Those are **internal triage minimums, not statistical proof of maximum cost or profitability**. The report uses paid-tier-equivalent estimates, not Google/Stripe invoices. Free-user costs, tax, infrastructure, failures without usageMetadata, FX/fees/refunds/support must still be evaluated.
- New `scenes.html` request UUID: one per newly typed/recognized learner utterance, carried in the JSON request body, kept across **ambiguous transport errors** and cleared on a confirmed HTTP response/new session or successful reply. This prepares a stable server-side replay key while preserving the current UI flow.

## Important limitations
- **The Worker currently ignores `requestId`. No server-side replay ledger has been added or enabled. Sending the same UUID again DOES NOT YET prevent double charges.** Do not advertise paid retry protection on the site.
- Full end-to-end replay defense requires a D1 request-key ledger, a secure server-side comparison of (uid, sessionId, requestId, request hash), atomic mapping to AI turn settlement and a short-lived response-recovery or non-PII duplication outcome policy. If storing assistant replies, review privacy/retention/consent before enabling. Concurrent requests, expired sessions, cached older browsers and Gemini replies lost in transit require adversarial tests.
- The previously implemented `TURN_LEDGER_MODE` is still **OFF** because production Cloudflare D1 migration has not been run; this separate ledger solves exact failed-turn refunds, not lost-answer browser replay.
- This branch must not alter `BILLING_MODE`, AI paid billing, Cloudflare secrets, production D1, Firebase data or Free/Pro limits.

## Privacy and operations
Download only redacted structured Cloudflare logs to a trusted local machine (not this conversation). Avoid uploading full logs. The report silently ignores unrelated log lines, never echoes raw lines, and groups unknown/untrusted plan strings as `legacy`.
The logs must actually be enabled/retained by the Cloudflare account before there will be anything real to analyze. No current production usage sample or Google invoice has been analyzed by this branch. Run tests with `node --test tests/ai-cost-report.test.mjs tests/scene-request-ids.test.mjs worker/cost-telemetry.test.mjs`.

## Next work
1. Safely migrate and activate the atomic turn ledger using `worker/LEDGER_ACTIVATION_HANDOFF.md` (needs authorized Cloudflare action).
2. Implement and review the server-side idempotency/recovery protocol as a **separate, gated feature**. No automatically stored conversation content without reviewing data handling.
3. Compare actual production token logs with the Google invoice before making any promise of 680 JPY profit or a paid-user AI availability SLA.
