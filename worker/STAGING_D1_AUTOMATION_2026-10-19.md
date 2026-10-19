# Real D1 staging QA: automated, production-blocked

## Why
The owner already applied migration 0005 to **speakingym-plans-staging** and manually verified a first-turn refund and first-turn completion. Repeatable checks should no longer require pasting SQL into Cloudflare for each run.

## What was added
- `scripts/staging-d1-qa.mjs`: uses the official Cloudflare D1 Query API and **hardcoded allowlisted staging account + database ID**. Aborts before writes unless GET verifies `speakingym-plans-staging` and the required 0002 + 0005 schema. It **never** runs migrations, changes environment variables, sends AI traffic or requests Stripe billing.
- Each invocation creates fresh random `sgqa-...` UIDs/UUIDs in staging only. Tests first-turn failure/refund, retry and completed settlement; concurrent final-turn reservations; cross-account isolation; six simultaneous starts at the five-session ceiling. `finally` removes **only** those random synthetic staging UIDs from the three participating tables. Unexpected query errors fail the check and are sanitized. If cleanup fails, review staging QA records; never attempt production cleanup.
- `tests/staging-d1-qa.test.mjs` checks fail-closed identity, no token, UID/cleanup guards, schema guards, sanitized errors, and runs the entire D1 QA script against real local SQLite with project schema + 0002 + 0005.
- `.github/workflows/staging-d1-qa.yml`: credentials-free offline safety tests automatically on changes to the runner; **real Cloudflare staging tests are manual workflow_dispatch only on main**, with serialized runs, so PRs cannot use D1 secrets.

## One-time configuration for remote D1 QA
Use a dedicated, least-privilege short-lived **Cloudflare account D1 Write/Edit** token, stored as GitHub Actions **secret** `SPEAKINGYM_D1_STAGING_TOKEN` (ideally under a protected `staging-d1` environment). Do not paste or commit its value, screenshot it, or add it to `WORK_HANDOFF.md`. The API credential may have account-wide D1 access: repository code therefore pins the single staging UUID, and the remote job is never executed for a PR. Revoke the secret/token after testing if short-lived. If the secret is absent, the remote job intentionally fails **before making a Cloudflare request**.

Navigate GitHub Actions -> `Staging D1 automated safety QA` -> Run workflow -> choose `main` -> Run. This requires an authorized operator (or ChatGPT Work with the user's explicit approval and connected account). Do not point staging QA at a production database or bypass the database identity guard.

## Scope / limitations
- Real staging `POST /query` exercises the actual Cloudflare D1 SQL engine and its observed concurrency for **SQL-level** reservation/trigger invariants.
- It does **not** prove an isolated staging Worker, authenticated Firebase requests, real provider failure/timeout, Cloudflare Worker `db.batch()` semantics, PowerShell-side token disposal or multi-device/iPhone behavior. The repository has separate signed-JWT Worker tests with a mocked Gemini service. A separately bound staging Worker and full end-to-end tests remain the next gate.
- **Do not** apply production migration 0005 or set `FREE_SESSION_MODE=enabled` until staging Worker validation plus owner's explicit authorization. Preserve production `TURN_LEDGER_MODE=enabled`, `AI_REPLAY_MODE` OFF, Stripe test billing, Gemini billing configuration and existing user data. Migrations 0003/0004 remain prohibited absent privacy/Cron approval.

Cloudflare API documentation: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/
