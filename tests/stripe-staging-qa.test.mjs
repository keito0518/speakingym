import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createQaServer,assetForRequest,HOST,PORT} from '../scripts/serve-stripe-staging-qa.mjs';

const page=readFileSync(new URL('../stripe-staging-qa.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../stripe-staging-qa.js',import.meta.url),'utf8');

test('QA serves loopback only and no production/key material or arbitrary repository files',()=>{
 assert.equal(HOST,'127.0.0.1');
 assert.equal(PORT,8765);
 for(const p of ['/worker/wrangler.toml','/.env','/scripts/stripe-test-price-bootstrap.mjs',
  '/../worker/ai-worker.js','/plans.html','/account-sync.js','/worker/migrations/0001-billing.sql'])
  assert.equal(assetForRequest('GET',p),null,p);
 assert.equal(assetForRequest('POST','/stripe-staging-qa.html'),null);
 assert.equal(assetForRequest('GET','/stripe-staging-qa.html')?.file,'stripe-staging-qa.html');
});
test('sandbox client is isolated from production endpoints and requires server checks',()=>{
 assert.match(js,/speakingym-survival-ai-staging\.keitokeitokeito0518\.workers\.dev/);
 assert.doesNotMatch(js,/speakingym-survival-ai\.keitokeitokeito0518\.workers\.dev/);
 assert.doesNotMatch(js,/speakingym\.pages\.dev/);
 assert.doesNotMatch(js,/STRIPE_SECRET_KEY|sk_live_|sk_test_|customer_id|firebase_uid/);
 assert.match(js,/stagingBillingSchemaReady===true/);
 assert.match(js,/stagingBillingOnly===true/);
 assert.match(js,/billingMode==='test'/);
 assert.match(js,/checkout\.stripe\.com/);
 assert.match(js,/billing\.stripe\.com/);
 assert.match(js,/browserSessionPersistence/);
 assert.match(page,/実請求なし/);
 assert.doesNotMatch(page,/<input[^>]+type="(?:password|email|tel)"/);
 assert.doesNotMatch(page,/https:\/\/speakingym\.pages\.dev/);
});
test('QA server returns only intended assets, blocks POST and protects against cached test data',async t=>{
 const server=createQaServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,HOST,resolve)});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const address=server.address();
 const root='http://127.0.0.1:'+address.port;
 const ok=await fetch(root+'/stripe-staging-qa.html');
 assert.equal(ok.status,200);
 assert.equal(ok.headers.get('cache-control'),'no-store');
 assert.equal(ok.headers.get('x-frame-options'),'DENY');
 assert.match(await ok.text(),/Speakingym Pro テスト決済/);
 const script=await fetch(root+'/stripe-staging-qa.js');
 assert.equal(script.status,200);
 assert.match(await script.text(),/stagingBillingOnly/);
 for(const uri of ['/worker/ai-worker.js','/account.html','/.env','/scripts/staging-billing-schema-gate.mjs']){
  const res=await fetch(root+uri);
  assert.equal(res.status,404,uri);
 }
 const blocked=await fetch(root+'/stripe-staging-qa.html',{method:'POST'});
 assert.equal(blocked.status,404);
});
