import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './ai-worker.js';
import {PLAN_LIMITS,tokyoDay,consumeSessionTurn,refundSessionTurn,getEntitlement} from './plan-limits.js';
import {PRO_MONTHLY_TURN_LIMIT} from './turn-ledger.js';

const ORIGIN='https://speakingym.pages.dev';
const ROOT='https://worker.example/';
const time=()=>Math.floor(Date.now()/1000);
const limit={limit:async()=>({success:true})};
function database(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('./schema-plans.sql',import.meta.url),'utf8'));
 sqlite.exec(readFileSync(new URL('./migrations/0002-ai-turn-ledger.sql',import.meta.url),'utf8'));
 const d1={prepare(sql){return {bind(...args){return{
  first:async()=>sqlite.prepare(sql).get(...args)||null,
  run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}})
 }}}}};
 return {sqlite,d1};
}
test('Worker opt-in ledger settles concurrent AI success and delayed provider failure by exact request',async t=>{
 const {sqlite,d1}=database();
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid=crypto.randomUUID();
 const jwtHead=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');
 const jwtBody=Buffer.from(JSON.stringify({aud:'speakingym',iss:'https://securetoken.google.com/speakingym',
  sub:'paid-test',iat:time()-10,auth_time:time()-20,exp:time()+3600})).toString('base64url');
 const signed=jwtHead+'.'+jwtBody;
 const token=signed+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,
  new TextEncoder().encode(signed))).toString('base64url');
 sqlite.prepare('INSERT INTO account_plans(uid,tier,updated_at) VALUES (?,?,?)').run('paid-test','pro',time());
 const env={ENFORCE_PLANS:'true',TURN_LEDGER_MODE:'enabled',PLAN_DB:d1,ALLOW_AI:'true',
  GEMINI_API_KEY:'fixture-only',USER_LIMIT:limit,GLOBAL_LIMIT:limit};
 const request=(path,body)=>new Request(ROOT+path,{method:path==='entitlement'?'GET':'POST',
  headers:{Origin:ORIGIN,Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined});
 const calls=[];
 t.mock.method(globalThis,'fetch',async (url,options={})=>{
  if(String(url).includes('/service_accounts/v1/jwk/'))return Response.json({keys:[jwk]});
  assert.match(String(url),/generativelanguage.googleapis.com/);
  const generated=JSON.parse(options.body);
  const sent=JSON.parse(generated.contents[0].parts[0].text).latestUserText;
  calls.push(sent);
  if(sent==='Fail after another reply'){
   await new Promise(resolve=>setTimeout(resolve,40));
   return Response.json({error:{message:'No quota left at provider'}},{status:503});
  }
  await new Promise(resolve=>setTimeout(resolve,5));
  return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({
   reply:'Certainly, that sounds good.',progress:{step1:true,step2:false,step3:false}
  })}]}}]});
 });
 const session=await worker.fetch(request('sessions'),env);
 assert.equal(session.status,200);
 const sessionId=(await session.json()).sessionId;
 const prompt=(userText)=>({sceneId:'hotel',level:'standard',sessionId,userText,
  progress:{step1:false,step2:false,step3:false}});
 const [failed,success]=await Promise.all([
  worker.fetch(request('',prompt('Fail after another reply')),env),
  worker.fetch(request('',prompt('Please help me')),env)
 ]);
 assert.equal(failed.status,502);
 assert.equal(success.status,200);
 assert.deepEqual(calls.sort(),['Fail after another reply','Please help me'].sort());
 const sessionRow=sqlite.prepare('SELECT turns FROM ai_sessions WHERE id=?').get(sessionId);
 assert.equal(sessionRow.turns,1,'The failed request must refund despite a later success');
 const states=sqlite.prepare('SELECT state FROM ai_turn_reservations ORDER BY state').all().map(x=>x.state);
 assert.deepEqual(states,['completed','refunded']);
 const allowed=await worker.fetch(request('entitlement'),env);
 assert.equal(allowed.status,200);
 const usage=await allowed.json();
 assert.equal(usage.plan,'pro');assert.equal(usage.used.monthlyTurns,1);
});
test('ledger migration installs both atomic counter triggers and its rollback table',()=>{
 const {sqlite}=database();
 const names=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").all().map(row=>row.name);
 assert.deepEqual(names,['ai_turn_reservation_count_insert','ai_turn_reservation_count_refund']);
 assert.ok(sqlite.prepare("SELECT name FROM sqlite_master WHERE name='ai_turn_reservations'").get());
});

test('Pro worker ledger honours 1000-turn offer past the obsolete 600 boundary and refunds exact reservation',async()=>{
 const {sqlite,d1}=database();
 const uid='pro-limit-fixture',day=tokyoDay();
 const now=time(),activeId=crypto.randomUUID();
 sqlite.prepare('INSERT INTO account_plans (uid,tier,updated_at) VALUES (?,?,?)').run(uid,'pro',now);
 const addSession=(turns)=>{
  const id=crypto.randomUUID();
  sqlite.prepare('INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) VALUES (?,?,?,?,?,?)')
   .run(id,uid,day,now,now+420,turns);
  return id;
 };
 sqlite.prepare('INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) VALUES (?,?,?,?,?,0)')
  .run(activeId,uid,day,now,now+420);
 assert.equal(PLAN_LIMITS.pro.monthlyTurns,PRO_MONTHLY_TURN_LIMIT);
 for(let i=0;i<30;i++)addSession(20); // Old 600-turn quota.
 const env={ENFORCE_PLANS:'true',TURN_LEDGER_MODE:'enabled',PLAN_DB:d1};
 const extra=await consumeSessionTurn(d1,uid,activeId,env);
 assert.ok(extra?.ledger,'turn 601 must succeed even when ledger mode is enabled');
 assert.equal((await getEntitlement(d1,uid,env)).used.monthlyTurns,601);
 for(let i=0;i<19;i++)addSession(20);
 addSession(19);
 assert.equal((await getEntitlement(d1,uid,env)).used.monthlyTurns,1000);
 assert.equal(await consumeSessionTurn(d1,uid,activeId,env),null,'turn 1001 must be blocked');
 assert.equal(await refundSessionTurn(d1,uid,extra),true);
 assert.equal((await getEntitlement(d1,uid,env)).used.monthlyTurns,999);
 const last=await consumeSessionTurn(d1,uid,activeId,env);
 assert.ok(last?.ledger,'refunding exact in-flight turn makes the final slot available again');
 assert.equal(await consumeSessionTurn(d1,uid,activeId,env),null);
});
