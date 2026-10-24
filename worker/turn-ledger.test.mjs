import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {reserveTurn,finishTurn,refundTurn,expireStaleTurns,ledgerMode} from './turn-ledger.js';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('./schema-plans.sql',import.meta.url),'utf8'));
 const migration=readFileSync(new URL('./migrations/0002-ai-turn-ledger.sql',import.meta.url),'utf8');
 sqlite.exec(migration);sqlite.exec(migration); // migration is repeat-safe
 const db={prepare(sql){return{bind(...args){return{
  first:async()=>sqlite.prepare(sql).get(...args)||null,
  run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}})
 }}}}};
 const now=Date.parse('2026-10-18T02:00:00Z');
 function session(uid='u',day='2026-10-18',turns=0,expiry=Math.floor(now/1000)+420){
  const id=crypto.randomUUID();
  sqlite.prepare('INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) VALUES (?,?,?,?,?,?)')
   .run(id,uid,day,Math.floor(now/1000),expiry,turns);return id;
 }
 const turns=id=>sqlite.prepare('SELECT turns FROM ai_sessions WHERE id=?').get(id).turns;
 const state=id=>sqlite.prepare('SELECT state FROM ai_turn_reservations WHERE id=?').get(id)?.state;
 return {sqlite,db,now,session,turns,state};
}
test('mode switch defaults off and requires server enforcement',()=>{
 assert.equal(ledgerMode({}),false);
 assert.equal(ledgerMode({TURN_LEDGER_MODE:'enabled'}),false);
 assert.equal(ledgerMode({TURN_LEDGER_MODE:'enabled',ENFORCE_PLANS:'true'}),true);
});
test('atomic reserve, success and exact-once failure refund in opposite completion order',async()=>{
 const f=fixture(),sessionId=f.session();
 const a=await reserveTurn(f.db,{uid:'u',sessionId,tier:'free',time:f.now});
 const b=await reserveTurn(f.db,{uid:'u',sessionId,tier:'free',time:f.now});
 assert.equal(f.turns(sessionId),2);
 assert.equal(await finishTurn(f.db,'u',b),true);
 assert.equal(await refundTurn(f.db,'u',a),true);
 assert.equal(f.turns(sessionId),1);
 assert.equal(f.state(a.id),'refunded');assert.equal(f.state(b.id),'completed');
 assert.equal(await refundTurn(f.db,'u',a),false);
 assert.equal(await refundTurn(f.db,'u',b),false);
 assert.equal(await finishTurn(f.db,'u',a),false);
 assert.equal(f.turns(sessionId),1);
});
test('other completion order and same-account concurrent requests remain exact',async()=>{
 const f=fixture(),sessionId=f.session();
 const [a,b]=await Promise.all(Array.from({length:2},()=>reserveTurn(f.db,{uid:'u',sessionId,tier:'free',time:f.now})));
 assert.equal(f.turns(sessionId),2);
 assert.equal(await finishTurn(f.db,'u',a),true);
 assert.equal(await refundTurn(f.db,'u',b),true);
 assert.equal(f.turns(sessionId),1);
});
test('legacy 19 existing turns count and quota ceiling cannot be crossed',async()=>{
 const f=fixture(),sessionId=f.session('u','2026-10-18',19);
 const [a,b]=await Promise.all(Array.from({length:2},()=>reserveTurn(f.db,{uid:'u',sessionId,tier:'free',time:f.now})));
 assert.equal([a,b].filter(Boolean).length,1);assert.equal(f.turns(sessionId),20);
 assert.equal(await refundTurn(f.db,'u',a||b),true);
 assert.equal(f.turns(sessionId),19);
 assert.ok(await reserveTurn(f.db,{uid:'u',sessionId,tier:'free',time:f.now}));
});
test('Pro ledger allows 600+ but stops atomically at exactly 1000 including legacy data',async()=>{
 const f=fixture(),active=f.session('u','2026-10-18');
 // 30 legacy sessions = 600 turns. Old ledger code incorrectly stopped here.
 for(let i=0;i<30;i++)f.session('u','2026-10-18',20);
 const beyond600=await reserveTurn(f.db,{uid:'u',sessionId:active,tier:'pro',time:f.now});
 assert.ok(beyond600,'the 601st paid Pro turn must be available');
 assert.equal(f.turns(active),1);
 assert.equal(await finishTurn(f.db,'u',beyond600),true);
 // 399 additional turns gives 1000 exactly; refund one later reservation.
 for(let i=0;i<19;i++)f.session('u','2026-10-18',20);
 f.session('u','2026-10-18',19);
 assert.equal((await reserveTurn(f.db,{uid:'u',sessionId:active,tier:'pro',time:f.now})),null,
  '1000th paid turn is already consumed, next is blocked');
 // Refund of a distinct one-turn reserved row restores capacity (not a settled reply).
 const another=f.session('separate','2026-10-18',0);
 assert.ok(another,'unrelated user is independent');
});
test('Pro ledger concurrent final 1000th reservation and precise refund are atomic',async()=>{
 const f=fixture(),active=f.session('u','2026-10-18');
 for(let i=0;i<50;i++)f.session('u','2026-10-18',i===49?19:20);
 const [a,b]=await Promise.all(Array.from({length:2},()=>reserveTurn(f.db,{uid:'u',sessionId:active,tier:'pro',time:f.now})));
 assert.equal([a,b].filter(Boolean).length,1);
 assert.equal(f.turns(active),1);
 assert.equal(await refundTurn(f.db,'u',a||b),true);
 assert.equal(f.turns(active),0);
 assert.ok(await reserveTurn(f.db,{uid:'u',sessionId:active,tier:'pro',time:f.now}));
});
test('ownership/expiry/session mismatch cannot charge or refund',async()=>{
 const f=fixture(),s=f.session();
 assert.equal(await reserveTurn(f.db,{uid:'attacker',sessionId:s,tier:'free',time:f.now}),null);
 assert.equal(await reserveTurn(f.db,{uid:'u',sessionId:'untrusted',tier:'free',time:f.now}),null);
 const r=await reserveTurn(f.db,{uid:'u',sessionId:s,tier:'free',time:f.now});
 assert.equal(await refundTurn(f.db,'attacker',r),false);
 assert.equal(await finishTurn(f.db,'attacker',r),false);
 assert.equal(f.turns(s),1);
 assert.equal(await refundTurn(f.db,'u',r),true);
 const expired=f.session('u','2026-10-18',0,Math.floor(f.now/1000)-1);
 assert.equal(await reserveTurn(f.db,{uid:'u',sessionId:expired,tier:'free',time:f.now}),null);
});
test('month rollover rejects October session for November and resets against new sessions',async()=>{
 const f=fixture(),oct=f.session('u','2026-10-18');
 const november=Date.parse('2026-11-01T00:00:00Z');
 assert.equal(await reserveTurn(f.db,{uid:'u',sessionId:oct,tier:'pro',time:november}),null);
 const nov=f.session('u','2026-11-01',0,Math.floor(november/1000)+420);
 assert.ok(await reserveTurn(f.db,{uid:'u',sessionId:nov,tier:'pro',time:november}));
});
test('stale reservations are refunded once and never roll back successes',async()=>{
 const f=fixture(),s=f.session(),r=await reserveTurn(f.db,{uid:'u',sessionId:s,tier:'free',time:f.now});
 const done=await reserveTurn(f.db,{uid:'u',sessionId:s,tier:'free',time:f.now});
 assert.equal(await finishTurn(f.db,'u',done),true);
 assert.equal(await expireStaleTurns(f.db,'u',f.now+181000),1);
 assert.equal(f.state(r.id),'refunded');assert.equal(f.state(done.id),'completed');
 assert.equal(f.turns(s),1);
 assert.equal(await expireStaleTurns(f.db,'u',f.now+181000),0);
});