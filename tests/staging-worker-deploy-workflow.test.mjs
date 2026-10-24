import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/staging-worker-deploy.yml',import.meta.url),'utf8');

test('staging deployment is manual only with exact main branch and confirmation gate',()=>{
  assert.match(workflow,/^on:\n  workflow_dispatch:\n/m);
  assert.doesNotMatch(workflow,/^  (push|pull_request|schedule|workflow_run):/m);
  assert.match(workflow,/github\.ref == 'refs\/heads\/main' && inputs\.confirmation == 'DEPLOY_STAGING_ONLY'/);
  assert.match(workflow,/^  deploy:\n    needs: preflight/m);
});

test('staging deployment cannot accidentally use the default production config',()=>{
  const commands=[...workflow.matchAll(/wrangler@4\.151\.1 deploy ([^\n]+)/g)].map(x=>x[1]);
  assert.equal(commands.length,2,'Exactly one dry-run and one staging deploy expected');
  for(const cmd of commands)assert.match(cmd,/^--config worker\/wrangler\.staging\.toml(?:\s|$)/);
  assert.match(commands[0],/--dry-run$/);
  assert.doesNotMatch(commands[1],/--dry-run/);
  assert.doesNotMatch(workflow,/--config worker\/wrangler\.toml(?:\s|$)/);
  assert.doesNotMatch(workflow,/\bwrangler (?:d1|delete|secret|deploy)\b/);
  assert.doesNotMatch(workflow,/000[2345].*\.sql/);
});

test('dedicated staging credentials, protected environment and GET-only health smoke',()=>{
  assert.match(workflow,/^    environment: staging-worker$/m);
  assert.match(workflow,/secrets\.SPEAKINGYM_STAGING_WORKER_API_TOKEN/);
  assert.match(workflow,/secrets\.SPEAKINGYM_STAGING_WORKER_ACCOUNT_ID/);
  assert.doesNotMatch(workflow,/SPEAKINGYM_D1_STAGING_TOKEN/);
  assert.match(workflow,/scripts\/staging-worker-smoke\.mjs "\$STAGING_URL"/);
  assert.match(workflow,/speakingym-survival-ai-staging/);
  assert.doesNotMatch(workflow,/speakingym-plans(?!-staging)/);
});
