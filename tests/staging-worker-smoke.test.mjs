import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingHealthUrl,assertSafeStagingHealth,checkStagingHealth} from '../scripts/staging-worker-smoke.mjs';
const good={
  status:'ok',stagingHealthOnly:true,plansEnabled:true,plansReady:true,
  turnLedgerEnabled:true,turnLedgerSchemaReady:true,freeSessionSchemaReady:true,
  aiEnabled:false,freeSessionRequested:false,freeSessionEnabled:false,
  aiReplayRequested:false,aiReplayEnabled:false,billingMode:'disabled',
  sceneIds:Array.from({length:16},(_,i)=>'scene'+i)
};
test('allow only HTTPS staging Worker and GET /health with no credentials',()=>{
  assert.equal(stagingHealthUrl('https://speakingym-survival-ai-staging.demo.workers.dev'),
    'https://speakingym-survival-ai-staging.demo.workers.dev/health');
  for(const bad of [
    '', 'https://speakingym-survival-ai.demo.workers.dev',
    'https://speakingym.pages.dev','https://example.com',
    'http://speakingym-survival-ai-staging.demo.workers.dev',
    'https://speakingym-survival-ai-staging.demo.workers.dev/other',
    'https://speakingym-survival-ai-staging.demo.workers.dev/?send=1',
    'https://a:b@speakingym-survival-ai-staging.demo.workers.dev',
    'https://speakingym-survival-ai-staging.demo.workers.dev:8443',
  ])assert.throws(()=>stagingHealthUrl(bad));
});
test('require staging schema and safety flags fully ready or OFF',()=>{
  assert.equal(assertSafeStagingHealth(good),true);
  assert.throws(()=>assertSafeStagingHealth({...good,stagingHealthOnly:false}),/GET-only/);
  assert.throws(()=>assertSafeStagingHealth({...good,stagingHealthOnly:undefined}),/GET-only/);
  for(const field of ['plansEnabled','plansReady','turnLedgerEnabled','turnLedgerSchemaReady','freeSessionSchemaReady']){
    assert.throws(()=>assertSafeStagingHealth({...good,[field]:false}),new RegExp(field));
  }
  for(const field of ['aiEnabled','freeSessionRequested','freeSessionEnabled','aiReplayRequested','aiReplayEnabled']){
    assert.throws(()=>assertSafeStagingHealth({...good,[field]:true}),new RegExp(field));
  }
  assert.throws(()=>assertSafeStagingHealth({...good,billingMode:'test'}),/billing/);
  assert.throws(()=>assertSafeStagingHealth({...good,sceneIds:[]}),/16 scenes/);
});
test('one read-only GET with no secrets and no AI/provider requests',async()=>{
  let count=0;
  const result=await checkStagingHealth('https://speakingym-survival-ai-staging.demo.workers.dev',
    async(url,opts)=>{count++;assert.ok(url.endsWith('/health'));assert.equal(opts.method,'GET');
      assert.equal(opts.body,undefined);assert.equal(opts.headers,undefined);
      return {ok:true,json:async()=>good};
    });
  assert.equal(count,1);
  assert.equal(result.scenes,16);
});
