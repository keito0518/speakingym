# Speakingym isolated staging Worker — not deployed yet (2026-10-19)

**Never use the production Worker or production D1 to run staging tests.**

## Confirmed starting point
- Existing production Worker: `speakingym-survival-ai`, D1: `speakingym-plans`. Preserve production `TURN_LEDGER_MODE=enabled` and all production user records.
- Staging D1: `speakingym-plans-staging` / `c608774e-3bc5-4527-be8d-f640e386f504`. Migration 0002 + 0005 present. Real-D1 SQL QA passed on GitHub run [39199883898](https://github.com/keito0518/speakingym/actions/runs/39199883898), attempt 2. Verified refund→released, retry→completed, concurrent boundary, five-session ceiling and deletion of synthetic QA records.
- Temporary Cloudflare D1 edit API tokens were **revoked by the owner** after the QA. The GitHub `staging-d1` environment secret may still contain a revoked token. Do not rely on it, copy it or publish it; remove stale secret from GitHub when convenient.
- A separate staging Worker was **not yet deployed**. New `worker/wrangler.staging.toml` is only preparation.

## Stage-only deployment
The separate config is `worker/wrangler.staging.toml`. It pins:
- Worker name `speakingym-survival-ai-staging`, not `speakingym-survival-ai`.
- D1 `PLAN_DB` binding only to `speakingym-plans-staging`, never prod.
- Isolated `USER_LIMIT` / `GLOBAL_LIMIT` rate limiting namespaces.
- `ENFORCE_PLANS=true`, `TURN_LEDGER_MODE=enabled`.
- `ALLOW_AI=false`, `FREE_SESSION_MODE=disabled`, `AI_REPLAY_MODE=disabled`, `REPLAY_CLEANUP_MODE=disabled`, `BILLING_MODE=disabled`.
- `STAGING_HEALTH_ONLY=true`: initial staging deployment permits only `GET /health`; all other endpoints, including signed-in session creation, Stripe webhook and OPTIONS, return 503 without stateful actions. This is staging-only; main production config omits the flag.
- `keep_vars=false`, so future deployments reset managed plaintext flags to these safe defaults; Worker secrets are not removed by deployment.

Preflight from a clean checkout with Node 22:
```sh
node --test worker/staging-worker-config.test.mjs tests/staging-worker-smoke.test.mjs
cd worker
npx wrangler deploy --config wrangler.staging.toml --dry-run
```

**Do not issue a real deployment without reviewing the output**: its name must be precisely `speakingym-survival-ai-staging`, binding `PLAN_DB` to `speakingym-plans-staging`, and its configuration must refer to `wrangler.staging.toml`. **Never use plain `npx wrangler deploy` here**, because the default `wrangler.toml` is production.

With owner's permission and Cloudflare dashboard/Wrangler login authenticated, deploy only the staging Worker:
```sh
cd worker
npx wrangler deploy --config wrangler.staging.toml
```
No API tokens, D1 access keys or secret values belong in chat, documentation, GitHub code or action logs. Owner's expired/revoked D1 edit token is not reusable. A new secret only if an authorized staging deployment requires it.

## Validate the first staging deployment — GET only
Use the distinct `https://speakingym-survival-ai-staging.<subdomain>.workers.dev` domain returned by Cloudflare, not the production Worker URL. From project root:
```sh
node scripts/staging-worker-smoke.mjs https://speakingym-survival-ai-staging.<subdomain>.workers.dev
```
This single `GET /health` checks: status ok, 16 scene IDs, `plansEnabled=true`, `plansReady=true`, `turnLedgerEnabled=true`, `turnLedgerSchemaReady=true`, `freeSessionSchemaReady=true`, `freeSessionRequested=false`, `freeSessionEnabled=false`, `aiEnabled=false`, replay requested/enabled false, and `billingMode=disabled`. It refuses URLs that don't match the dedicated staging Workers.dev hostname.

If health/schema flags differ, **stop**. Do not enable AI or Free-session mode. Do not apply any migration until staging D1 schema is reviewed (0002/0005 already present). In particular 0003/0004 stay unapproved.

## Actual AI and signed-user tests — explicit later gate
Real provider calls were **not** part of the D1 test or first stage Worker smoke. After /health succeeds and with explicit owner approval:
1. Set a separate Gemini Free-tier API key as a secret on **staging Worker only**. Check project quotas and no billing enabled. Do not put a secret in the repo, GH Actions, chat or screenshots; do not use a production paid Gemini key.
2. After a separate explicit staging E2E authorization, set `STAGING_HEALTH_ONLY=false` **on the isolated staging Worker only** (verify the staging Worker name/D1 binding again). Then configure `ALLOW_AI=true` and `FREE_SESSION_MODE=enabled` **on staging Worker only**, carefully checking the worker name and database binding. Because `keep_vars=false` any subsequent Wrangler deploy resets plaintext flags to OFF. Keep `TURN_LEDGER_MODE=enabled`; do not enable replay, live billing or Stripe.
3. Use a signed-in, authorized dedicated staging Firebase QA account (the auth code currently uses the existing project's issuer) to exercise the Worker endpoints against staging D1. Cover first failure→refund→retry→success, immediate provider failure, timeout, concurrent first turns, 5/day, 20/session, cross-account isolation and retry after expiry. Avoid real customer UID, free-text or actual payment data.
4. If the stage AI calls are not available due to API project quota, report this as blocked, **not passed**; don't enable paid Gemini to work around it. Verify 20-second provider timeout behavior and error/refund via staging Worker logs without user text/UID.
5. Restore staging `STAGING_HEALTH_ONLY=true`, `ALLOW_AI=false` and `FREE_SESSION_MODE=disabled` after QA if it is not under active testing. Preserve D1 fixtures only if needed for investigation and redact any logs.

### Production gate
The **production** `FREE_SESSION_MODE` remains OFF. A separate fresh production D1 backup and restore integrity check, owner authorization, 0005-only production migration with mode still OFF, health readiness check and explicit production flag enablement are required **after** the staging Worker is validated. Do not migrate 0003/0004, activate `AI_REPLAY_MODE`, change Gemini billing, or Stripe live.

References: [Cloudflare Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [Worker rate-limit binding isolation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [Free-session rollout](./FREE_SESSION_ROLLOUT_2026-10-19.md).
