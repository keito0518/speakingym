import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './ai-worker.js';
import {billingReturnUrls,STAGING_QA_PAGE} from './billing.js';
import {billingMode} from './billing-mode.js';

const sandbox=extra=>({
 PLAN_DB:{},ENFORCE_PLANS:'true',BILLING_MODE:'test',
 STRIPE_SECRET_KEY:'sk_test_fixtureOnly',STRIPE_WEBHOOK_SECRET:'whsec_dummy',
 STRIPE_PRICE_ID:'price_dummy',BILLING_TEST_UIDS:'sandbox-tester',
 ALLOW_AI:'false',STAGING_HEALTH_ONLY:'false',STAGING_BILLING_ONLY:'true',
 ...extra
});

test('Checkout + Customer Portal only return to fixed localhost in Stripe TEST staging',()=>{
 const stage=sandbox();
 assert.equal(billingMode(stage),'test');
 assert.deepEqual(billingReturnUrls(stage),{
  success:STAGING_QA_PAGE+'?billing=success',
  cancel:STAGING_QA_PAGE+'?billing=cancel',
  portal:STAGING_QA_PAGE
 });
 for(const env of [
  sandbox({STAGING_BILLING_ONLY:'false'}),sandbox({BILLING_MODE:'disabled'}),
  sandbox({BILLING_MODE:'live',STRIPE_SECRET_KEY:'sk_live_fake'}),
  {}]){
  const urls=billingReturnUrls(env);
  assert.equal(urls.success,'https://speakingym.pages.dev/plans.html?billing=success');
  assert.equal(urls.cancel,'https://speakingym.pages.dev/plans.html?billing=cancel');
  assert.equal(urls.portal,'https://speakingym.pages.dev/plans.html');
 }
});
test('localhost Origin is accepted for isolated TEST billing only',async()=>{
 const req=(method='OPTIONS',origin='http://localhost:8765')=>
  new Request('https://staging.example.workers.dev/billing/status',{method,headers:{Origin:origin}});
 const allowed=await worker.fetch(req(),sandbox());
 assert.equal(allowed.status,204);
 assert.equal(allowed.headers.get('access-control-allow-origin'),'http://localhost:8765');
 const noAuth=await worker.fetch(req('GET'),sandbox());
 assert.equal(noAuth.status,401,'Firebase token is still required');
 for(const env of [sandbox({BILLING_MODE:'disabled'}),sandbox({STAGING_BILLING_ONLY:'false'}),sandbox({STRIPE_SECRET_KEY:'sk_live_fake'}),{}]){
  assert.equal((await worker.fetch(req(),env)).status,403);
 }
 for(const origin of ['http://127.0.0.1:8765','http://localhost:8766',
   'http://evil.example','https://localhost:8765','null']){
  assert.equal((await worker.fetch(req('OPTIONS',origin),sandbox())).status,403,origin);
 }
});
test('staging billing-only gate rejects all AI/session methods',async()=>{
 const env=sandbox();
 for(const [method,path] of [['POST','/'],['POST','/sessions'],['GET','/scenes']]){
  const r=await worker.fetch(new Request('https://stage.example'+path,{method,
   headers:{Origin:'http://localhost:8765'}}),env);
  assert.equal(r.status,503,path);
  assert.equal((await r.json()).error,'staging_billing_only');
 }
});
