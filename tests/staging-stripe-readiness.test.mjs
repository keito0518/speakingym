import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectStageBilling,validateStagingBillingHealth}
 from '../scripts/staging-stripe-readiness.mjs';
const healthy=()=>({status:'ok',quotaVersion:'pro-monthly-1000-150-v3',
 stagingBillingOnly:true,stagingBillingSchemaReady:true,plansEnabled:true,
 plansReady:true,turnLedgerEnabled:true,turnLedgerSchemaReady:true,
 freeSessionSchemaReady:true,stagingHealthOnly:false,aiEnabled:false,
 freeSessionRequested:false,freeSessionEnabled:false,aiReplayRequested:false,
 aiReplayEnabled:false,billingMode:'test',sceneIds:Array.from({length:16},(_,i)=>'scene'+i),
 secretShouldNotLeak:'irrelevant'});
test('healthy billing stage returns sanitized readiness, not sensitive records',async()=>{
 const x=validateStagingBillingHealth(healthy());
 assert.equal(x.passed,true);
 assert.equal(x.stripeMode,'test');
 assert.equal(JSON.stringify(x).includes('secretShouldNotLeak'),false);
 let count=0;
 const f=async(uri,opts)=>{
  count++;
  assert.equal(uri,'https://speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev/health');
  assert.equal(opts.method,'GET');
  return {ok:true,json:async()=>healthy()};
 };
 assert.equal((await inspectStageBilling(f)).passed,true);
 assert.equal(count,1);
});
test('unready stage or billing in production mode fails closed',()=>{
 for(const changes of [
  {billingMode:'live'},{billingMode:'disabled'},{stagingBillingSchemaReady:false},
  {stagingHealthOnly:true},{stagingBillingOnly:false},{aiEnabled:true},
  {freeSessionEnabled:true},{plansReady:false},{turnLedgerSchemaReady:false},
  {quotaVersion:'pro-monthly-600-100-v2'},{sceneIds:[]}
 ])assert.throws(()=>validateStagingBillingHealth({...healthy(),...changes}),/STOP:/,JSON.stringify(changes));
});
test('transport/HTTP or invalid health cannot be reported as success',async()=>{
 await assert.rejects(inspectStageBilling(async()=>{throw Error('sensitive network failure')}),/unreachable/);
 await assert.rejects(inspectStageBilling(async()=>({ok:false,status:500})),/HTTP 500/);
 await assert.rejects(inspectStageBilling(async()=>({ok:true,json:async()=>null})),/STOP:/);
});
