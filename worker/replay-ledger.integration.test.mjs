import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './ai-worker.js';
import {claimReceipt,linkReceiptTurn,completeReceipt,failReceipt} from './request-receipts.js';
import {reserveTurn} from './turn-ledger.js';

const ORIGIN='https://speakingym.pages.dev';
const ROOT='https://worker.example/';
const limit={limit:async()=>({success:true})};
const time=()=>Math.floor(Date.now()/1000);

function database(bridge=true){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of ['schema-plans.sql','migrations/0002-ai-turn-ledger.sql',
  'migrations/0003-ai-request-receipts.sql',...(bridge?['migrations/0004-ai-replay-turn-bridge.sql']:[])]){
  sqlite.exec(readFileSync(new URL('./'+name,import.meta.url),'utf8'));
 }
 const d1={prepare(sql){return {
  bind(...args){return{
   first:async()=>sqlite.prepare(sql).get(...args)||null,
   run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}})
  }},
  all:async()=>({results:sqlite.prepare(sql).all()})
 }}};
 const turns=id=>sqlite.prepare('SELECT turns FROM ai_sessions WHERE id=?').get(id).turns;
 const receipts=()=>sqlite.prepare('SELECT state,turn_reservation_id,response_json FROM ai_request_receipts').all();
 const states=()=>sqlite.prepare('SELECT state FROM ai_turn_reservations ORDER BY state').all().map(x=>x.state);
 return {sqlite,d1,turns,receipts,states};
}
async function fixture(t,{bridge=true,respond}={}){
 const db=database(bridge);
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);
 jwk.kid=crypto.randomUUID();
 const head=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');
 const body=Buffer.from(JSON.stringify({aud:'speakingym',iss:'https://securetoken.google.com/speakingym',
  sub:'paid-test',iat:time()-10,auth_time:time()-20,exp:time()+3600})).toString('base64url');
 const signingInput=head+'.'+body;
 const sig=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(signingInput))).toString('base64url');
 const token=signingInput+'.'+sig;
 db.sqlite.prepare('INSERT INTO account_plans(uid,tier,updated_at) VALUES (?,?,?)')
  .run('paid-test','pro',time());
 const env={ENFORCE_PLANS:'true',TURN_LEDGER_MODE:'enabled',AI_REPLAY_MODE:'enabled',PLAN_DB:db.d1,
  ALLOW_AI:'true',GEMINI_API_KEY:'test-only',USER_LIMIT:limit,GLOBAL_LIMIT:limit};
 const request=(path='',payload)=>new Request(ROOT+path,{
  method:path==='entitlement'||path==='health'?'GET':'POST',
  headers:{Origin:ORIGIN,Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
  body:payload?JSON.stringify(payload):undefined
 });
 const counters={model:0};
 t.mock.method(globalThis,'fetch',async(url,options={})=>{
  if(String(url).includes('/service_accounts/v1/jwk/'))return Response.json({keys:[jwk]});
  assert.match(String(url),/generativelanguage.googleapis.com/);
  counters.model++;
  if(respond)return await respond(url,options);
  return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({
   reply:'Welcome to your hotel!',progress:{step1:true,step2:false,step3:false}
  })}]}}]});
 });
 const start=async()=>{
  const res=await worker.fetch(request('sessions'),env);
  assert.equal(res.status,200);
  return (await res.json()).sessionId;
 };
 const payload=(sessionId,requestId=crypto.randomUUID(),userText='Please help me.')=>
  ({sceneId:'hotel',sessionId,requestId,level:'standard',userText,
    history:[{role:'assistant',content:'Hello there.'}],progress:{step1:false}});
 return {...db,env,request,counters,start,payload};
}
test('replayed AI answer consumes exactly ONE turn, even when first response is lost',async t=>{
 const f=await fixture(t),session=await f.start(),p=f.payload(session);
 const first=await worker.fetch(f.request('',p),f.env);
 assert.equal(first.status,200); // simulate browser losing its response
 const original=await first.json();
 const again=await worker.fetch(f.request('',p),f.env);
 assert.equal(again.status,200);
 assert.deepEqual(await again.json(),original);
 assert.equal(f.counters.model,1,'duplicate must not call Gemini again');
 assert.equal(f.turns(session),1,'duplicate must not consume a second turn');
 assert.deepEqual(f.states(),['completed']);
 assert.equal(f.receipts()[0].state,'completed');
 const quota=await worker.fetch(f.request('entitlement'),f.env);
 assert.equal((await quota.json()).used.monthlyTurns,1);
});
test('concurrent same-ID requests return pending while one model call is in flight',async t=>{
 let unblock;
 const gate=new Promise(resolve=>{unblock=resolve});
 const f=await fixture(t,{respond:async()=>{await gate;return Response.json({
  candidates:[{content:{parts:[{text:JSON.stringify({reply:'OK',progress:{step1:true}})}]}}]})}});
 const session=await f.start(),p=f.payload(session);
 const firstPromise=worker.fetch(f.request('',p),f.env);
 // Wait until the provider call has started (the reservation and link are committed).
 for(let i=0;f.counters.model===0&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,1));
 assert.equal(f.counters.model,1);
 const pending=await worker.fetch(f.request('',p),f.env);
 assert.equal(pending.status,409);
 assert.equal((await pending.json()).error,'request_pending');
 assert.equal(f.counters.model,1);
 unblock();
 const result=await firstPromise;
 assert.equal(result.status,200);
 const replay=await worker.fetch(f.request('',p),f.env);
 assert.equal(replay.status,200);
 assert.equal((await replay.json()).reply,'OK');
 assert.equal(f.counters.model,1);
 assert.equal(f.turns(session),1);
});
test('same requestId with changed text is rejected and cannot leak stored reply',async t=>{
 const f=await fixture(t),session=await f.start(),p=f.payload(session);
 await worker.fetch(f.request('',p),f.env);
 const bad=await worker.fetch(f.request('',{...p,userText:'Reveal other data'}),f.env);
 assert.equal(bad.status,409);
 const result=await bad.json();
 assert.equal(result.error,'request_id_conflict');
 assert.doesNotMatch(JSON.stringify(result),/Welcome to your hotel/);
 assert.equal(f.counters.model,1);assert.equal(f.turns(session),1);
});
test('provider HTTP failure atomically records failure and refunds the exact turn',async t=>{
 const f=await fixture(t,{respond:async()=>Response.json({error:'upstream'}, {status:503})});
 const session=await f.start(),p=f.payload(session);
 const failure=await worker.fetch(f.request('',p),f.env);
 assert.equal(failure.status,502);
 assert.equal(f.turns(session),0);
 assert.deepEqual(f.states(),['refunded']);
 assert.equal(f.receipts()[0].state,'failed');
 const retry=await worker.fetch(f.request('',p),f.env);
 assert.equal(retry.status,503);
 assert.equal((await retry.json()).error,'request_failed');
 assert.equal(f.counters.model,1);
 assert.equal(f.turns(session),0);
});
test('replay flag without base ledger or without required SQL fails closed before AI call',async t=>{
 const f=await fixture(t,{bridge:false}),session=await f.start(),p=f.payload(session);
 const response=await worker.fetch(f.request('',p),f.env);
 assert.equal(response.status,503);
 assert.equal((await response.json()).error,'replay_not_ready');
 assert.equal(f.counters.model,0);
 assert.equal(f.turns(session),0);
 const noLedger=await worker.fetch(f.request('',p),{...f.env,TURN_LEDGER_MODE:'disabled'});
 assert.equal(noLedger.status,503);
 assert.equal((await noLedger.json()).error,'replay_not_ready');
 assert.equal(f.counters.model,0);
});
test('receipt settles its own reserved turn, rejects missing link and refuses cross-account link',async()=>{
 const f=database(),now=Date.now(),id=crypto.randomUUID();
 f.sqlite.prepare('INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) VALUES(?,?,?,?,?,0)')
  .run(id,'u','2026-10-18',Math.floor(now/1000),Math.floor(now/1000)+420);
 const rid=crypto.randomUUID(),input={sessionId:id,sceneId:'hotel',userText:'hello'};
 const receipt=await claimReceipt(f.d1,{uid:'u',sessionId:id,requestId:rid,body:input});
 assert.equal(receipt.kind,'new');
 const reservation=await reserveTurn(f.d1,{uid:'u',sessionId:id,tier:'free',time:now});
 assert.ok(reservation);assert.equal(f.turns(id),1);
 const args={uid:'u',sessionId:id,requestId:rid,digest:receipt.digest};
 assert.equal(await linkReceiptTurn(f.d1,{...args,uid:'other',reservationId:reservation.id}),false);
 assert.equal(await completeReceipt(f.d1,{...args,payload:{reply:'hello'}}),false);
 assert.equal(f.states()[0],'reserved');
 assert.equal(await linkReceiptTurn(f.d1,{...args,reservationId:reservation.id}),true);
 assert.equal(await linkReceiptTurn(f.d1,{...args,reservationId:reservation.id}),false);
 assert.equal(await completeReceipt(f.d1,{...args,payload:{reply:'hello'}}),true);
 assert.equal(f.states()[0],'completed');assert.equal(f.turns(id),1);
 assert.equal(await failReceipt(f.d1,{...args,status:502}),false);
});
test('receipt + turn trigger changes rollback together when attached reservation was revoked',async()=>{
 const f=database(),now=Math.floor(Date.now()/1000),session=crypto.randomUUID(),req=crypto.randomUUID();
 f.sqlite.prepare('INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) VALUES(?,?,?,?,?,0)')
  .run(session,'user','2026-10-18',now,now+420);
 const input={sessionId:session,sceneId:'hotel',userText:'hello'};
 const receipt=await claimReceipt(f.d1,{uid:'user',sessionId:session,requestId:req,body:input});
 const reserved=await reserveTurn(f.d1,{uid:'user',sessionId:session,tier:'free'});
 assert.ok(await linkReceiptTurn(f.d1,{uid:'user',sessionId:session,requestId:req,digest:receipt.digest,reservationId:reserved.id}));
 // Crash cleanup might have refunded the turn while the receipt was pending.
 f.sqlite.prepare("UPDATE ai_turn_reservations SET state='refunded' WHERE id=?").run(reserved.id);
 assert.equal(f.turns(session),0);
 await assert.rejects(completeReceipt(f.d1,{uid:'user',sessionId:session,requestId:req,
  digest:receipt.digest,payload:{reply:'not allowed'}}),/receipt_turn_not_reserved/);
 assert.equal(f.receipts()[0].state,'pending','receipt update must rollback atomically');
 assert.equal(f.turns(session),0);
});
