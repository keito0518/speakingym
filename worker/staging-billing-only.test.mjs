import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './ai-worker.js';

const stage=(overrides={})=>({STAGING_HEALTH_ONLY:'false',STAGING_BILLING_ONLY:'true',
 BILLING_MODE:'disabled',ALLOW_AI:'false',...overrides});
const request=(path,method='GET')=>new Request('https://speakingym-survival-ai-staging.example.workers.dev'+path,{
 method,headers:{Origin:'https://speakingym.pages.dev'},
 ...(method==='POST'?{body:'{}'}:{})
});

test('billing-only staging rejects AI, Free sessions and unrelated endpoints before any writes',async()=>{
 for(const [path,method] of [['/','POST'],['/sessions','POST'],['/unknown','GET'],['/quota','GET'],['/speech','POST']]){
  const res=await worker.fetch(request(path,method),stage());
  assert.equal(res.status,503,path);
  assert.equal((await res.json()).error,'staging_billing_only',path);
 }
});
test('staging webhook reaches signature-gated billing handler only when health-only gate is off',async()=>{
 const res=await worker.fetch(new Request('https://stage.example/billing/webhook',{
  method:'POST',body:'{}'
 }),stage());
 assert.equal(res.status,503);
 assert.equal((await res.json()).error,'billing_disabled');
 const blocked=await worker.fetch(new Request('https://stage.example/billing/webhook',{
  method:'POST',body:'{}'
 }),stage({STAGING_HEALTH_ONLY:'true'}));
 assert.equal(blocked.status,503);
 assert.equal((await blocked.json()).error,'staging_health_only');
});
