import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './ai-worker.js';

const ORIGIN='https://speakingym.pages.dev';
const ROOT='https://worker.example/';
const goodLimit={limit:async()=>({success:true})};
const now=()=>Math.floor(Date.now()/1000);
function database(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of ['schema-plans.sql','migrations/0002-ai-turn-ledger.sql','migrations/0007-ai-cost-budget.sql']){
  sqlite.exec(readFileSync(new URL('./'+file,import.meta.url),'utf8'));
 }
 const db={prepare(sql){
  return {
   all:async()=>({results:sqlite.prepare(sql).all()}),
   bind(...args){return {
    first:async()=>sqlite.prepare(sql).get(...args)||null,
    run:async()=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}})
   }}
  };
 }};
 return {sqlite,db};
}
const budgetConfig=PLAN_DB=>({
 PLAN_DB,ALLOW_AI:'true',ENFORCE_PLANS:'true',
 TURN_LEDGER_MODE:'enabled',
 AI_COST_GUARD_MODE:'enabled',AI_MONTHLY_BUDGET_YEN:'500',
 AI_FREE_MONTHLY_CONVERSATIONS:'1',AI_FREE_MONTHLY_TEACHER:'1',
 AI_GUARD_USD_JPY:'160',AI_GUARD_SAFETY_PERCENT:'200',
 GEMINI_API_KEY:'test-fixture-only-no-provider-key',
 USER_LIMIT:goodLimit,GLOBAL_LIMIT:goodLimit
});
const request=(path,body,token='')=>new Request(ROOT+path,{
 method:body?'POST':'GET',
 headers:{Origin:ORIGIN,...(token?{Authorization:'Bearer '+token}:{}),
  ...(body?{'Content-Type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})
});

test('enabled budget with missing settings or D1 schema refuses AI before any provider request',async t=>{
 const {db}=database(),env=budgetConfig(db);
 let providerCalls=0;
 t.mock.method(globalThis,'fetch',async()=>{
  providerCalls++;throw Error('unexpected external fetch');
 });
 const good=await worker.fetch(request('health'),env);
 assert.equal((await good.json()).aiBudgetReady,true);
 const badSchema={...env,PLAN_DB:{prepare(){return {all:async()=>({results:[]})}}}};
 const h=await worker.fetch(request('health'),badSchema);
 assert.equal((await h.json()).aiBudgetReady,false);
 const denied=await worker.fetch(request('',{sceneId:'hotel',userText:'Please help.',level:'easy'}),badSchema);
 assert.equal(denied.status,503);
 assert.equal((await denied.json()).error,'ai_budget_not_ready');
 const badSetting=await worker.fetch(request('',{sceneId:'hotel',userText:'Please help.',level:'easy'}),{
  ...env,AI_GUARD_SAFETY_PERCENT:'0'
 });
 assert.equal(badSetting.status,503);
 assert.equal((await badSetting.json()).error,'ai_budget_not_ready');
 assert.equal(providerCalls,0);
});

test('signed Free learner is admitted once, then guard blocks another Gemini call and refunds reserved turn',async t=>{
 const {sqlite,db}=database();
 const env=budgetConfig(db);
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',
  modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),
  hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);
 jwk.kid=crypto.randomUUID();
 const header=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');
 const claims=Buffer.from(JSON.stringify({aud:'speakingym',
  iss:'https://securetoken.google.com/speakingym',sub:'budget-learner',
  iat:now()-10,auth_time:now()-20,exp:now()+3600})).toString('base64url');
 const unsigned=header+'.'+claims;
 const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',
  pair.privateKey,new TextEncoder().encode(unsigned))).toString('base64url');
 const token=unsigned+'.'+signature;
 let provider=0,jwks=0;
 t.mock.method(globalThis,'fetch',async url=>{
  if(String(url).includes('/service_accounts/v1/jwk/')){
   jwks++;return Response.json({keys:[jwk]});
  }
  assert.match(String(url),/generativelanguage.googleapis.com/);
  provider++;
  return Response.json({candidates:[{content:{parts:[{
   text:JSON.stringify({reply:'Of course. I can help you with your booking.',
    progress:{step1:false,step2:false,step3:false}})
  }]}}]});
 });
 const started=await worker.fetch(request('sessions',{},token),env);
 assert.equal(started.status,200);
 const sessionId=(await started.json()).sessionId;
 const payload=(utterance)=>({
  sceneId:'hotel',level:'standard',sessionId,userText:utterance,
  progress:{step1:false,step2:false,step3:false}
 });
 const first=await worker.fetch(request('',payload('Could you help me check in?'),token),env);
 assert.equal(first.status,200,JSON.stringify(await first.clone().json()));
 const second=await worker.fetch(request('',payload('One more request, please.'),token),env);
 assert.equal(second.status,429);
 assert.equal((await second.json()).error,'ai_budget_exhausted');
 assert.equal(provider,1,'a rejected budget must not invoke Gemini');
 assert.ok(jwks>=1);
 assert.equal(sqlite.prepare('SELECT turns FROM ai_sessions WHERE id=?').get(sessionId).turns,1);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM ai_cost_budget_reservations').get().n,1);
});
