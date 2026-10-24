# Alternate path: stage-only deploy via GitHub Actions (2026-10-19)

**Prepared only. No deployment has occurred.** This avoids the Cloudflare Work-browser login that returned HTTP 403, but still requires a separately authorized Cloudflare credential. Nothing in this PR changes production AI, Stripe, Firebase, Worker, D1, or prices.

## Safety design

- Workflow: `.github/workflows/staging-worker-deploy.yml`; it has **only** `workflow_dispatch`, never push/PR/schedule triggers.
- Execution is restricted to `main` and requires typing `DEPLOY_STAGING_ONLY`.
- Before accessing credentials, it runs staging configuration/smoke tests and a Wrangler dry-run with Node 22.
- Real deploy uses **only** `--config worker/wrangler.staging.toml`, whose name is `speakingym-survival-ai-staging`, D1 binding is `speakingym-plans-staging`, rate-limits are independent, AI/free-session/replay/billing are OFF.
- After deploy, `scripts/staging-worker-smoke.mjs` checks `/health` using a URL matching `speakingym-survival-ai-staging.*.workers.dev`. GET only; no AI requests, user records, migrations, payments, or tests inserting data.
- Uses dedicated GitHub environment `staging-worker` and two separate secrets; does not use or copy the revoked `staging-d1` token.

## One-time account owner steps (not done)

1. In the owner's **normal signed-in Cloudflare dashboard**, first create a placeholder Worker named **exactly** `speakingym-survival-ai-staging`. Verify it is a distinct Worker, not `speakingym-survival-ai`. Do not bind production D1 and do not add paid credentials. This matters because Cloudflare requires **Workers product-level Admin** access to *create* a Worker; a token narrowed to an existing Worker with **Editor** permission can then safely deploy it. Do not place a broad Admin token in GitHub Actions.
2. Create a **new**, short-lived Cloudflare API token with **Editor** access scoped to that exact staging Worker, in the correct account. No D1 Edit rights, no production Worker Editor, no Stripe/Gemini. Do not reuse the revoked D1 token. Consult current Cloudflare Workers authorization docs if the UI labels change.
3. Under GitHub repository **Settings → Environments**, explicitly create `staging-worker` and enable required reviewers if supported. Store the new token as environment secret `SPEAKINGYM_STAGING_WORKER_API_TOKEN` and the account ID as `SPEAKINGYM_STAGING_WORKER_ACCOUNT_ID`. Neither value should appear in chat, screenshots, code, logs, or PR comments. Do **not** add credentials to `staging-d1`.
4. Review and merge this PR separately only when ready: GitHub manual workflow dispatch requires the workflow file on the default branch. **Merging any PR to main may trigger the project's existing production build/check pipeline**, even though this PR makes no production app or Worker configuration changes. Obtain the owner's approval first.
5. After the above setup and a separate authorization to deploy, open **GitHub Actions → Deploy isolated Speakingym staging Worker (manual only) → Run workflow**, select `main`, enter `DEPLOY_STAGING_ONLY`, and submit. Inspect the logs for the stage-only name, D1 binding and `PASS` smoke. Review Cloudflare dashboard for the same bindings. Never run a different Worker deployment command.

## Stop conditions and follow-up

- If the D1 name, staging hostname, flags, or schemas do not match exactly, stop. A failed smoke check is **not** a successful deployment verification.
- If the token cannot be restricted to the staging Worker, do **not** widen it to production or account-level Admin without a separate risk review. Prefer Cloudflare dashboard/Work with authorized user interaction.
- Creating a stage Worker is distinct from enabling AI. Real Gemini calls, staging `FREE_SESSION_MODE`, Firebase QA accounts and any costs require separate approval. Do not apply migrations 0003/0004, do not run 0005 on production, and do not enable production `FREE_SESSION_MODE`.
- Wrangler pins `4.151.1`, matching the successful Work dry-run on 2026-10-19. If provider permissions or the CLI version change, pause and review; do not bypass guards.

Sources: [Cloudflare Workers roles and deploy permissions](https://developers.cloudflare.com/workers/authorization/workers/), [Cloudflare GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/), [GitHub manual dispatch](https://docs.github.com/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), and [staging worker safety](./STAGING_WORKER_SETUP_2026-10-19.md).
