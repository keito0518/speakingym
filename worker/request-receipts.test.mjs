import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {bodyFingerprint,claimReceipt,completeReceipt,failReceipt,purgeReceipts,receiptSchemaReady} from './request-receipts.js';
const now=Math.floor(Date.parse('2026-10-18T08:00:00Z')/1000);
function fixture(withMigration=true){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('./schema-plans.sql',import.meta.url),'utf8'));
 const migration=readFileSync(new URL('./migrations/0003-ai-request-receipts.sql',import.meta.url),'utf8');
 if(withMigration){sqlite.exec(migration);sqlite.exec(migration)}
 const db={prepare(sql){return{
  bind(...args){return{
   first:async()=>sqlite.prepare(sql).get(...args)||null,
   run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}})
  }},
  all:async()=>({results:sqlite.prepare(sql).all()})
 }}};
 const session=(uid='u',expires=now+420)=>{
  const id=crypto.randomUUID();
  sqlite.prepare('INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) VALUES (?,?,?,?,?,0)')
   .run(id,uid,'2026-10-18',now,expires);
  return id;
 };
 return {sqlite,db,migration,session};
}
const input=sessionId=>({sessionId,sceneId:'hotel',level:'standard',userText:'Do you have a room?',
 history:[{role:'assistant',content:'Hello.'}],progress:{step1:false}});
const params=(sessionId,requestId=crypto.randomUUID(),uid='u')=>({uid,sessionId,requestId,body:input(sessionId),now});
const get=(f,ids)=>f.sqlite.prepare('SELECT uid,state,body_sha256,response_json,expires_at,response_expires_at FROM ai_request_receipts WHERE uid=? AND session_id=? AND request_id=?').get(ids.uid,ids.sessionId,ids.requestId);
test('schema is explicitly absent before migration and ready afterwards; migration is idempotent',async()=>{
 const f=fixture(false);assert.equal(await receiptSchemaReady(f.db),false);
 f.sqlite.exec(f.migration);assert.equal(await receiptSchemaReady(f.db),true);
 f.sqlite.exec(f.migration);assert.equal(await receiptSchemaReady(f.db),true);
 f.sqlite.exec('DROP TABLE ai_request_receipts');assert.equal(await receiptSchemaReady(f.db),false);
});
test('same valid request replays successful response without creating another receipt or quota turn',async()=>{
 const f=fixture(),sessionId=f.session(),p=params(sessionId);
 const claim=await claimReceipt(f.db,p);
 assert.equal(claim.kind,'new');
 assert.equal((await claimReceipt(f.db,p)).kind,'pending');
 const response={reply:'Yes, of course!',sceneId:'hotel',progress:{step1:true}};
 assert.equal(await completeReceipt(f.db,{...p,digest:claim.digest,payload:response,now}),true);
 assert.equal(await completeReceipt(f.db,{...p,digest:claim.digest,payload:response,now}),false);
 const replay=await claimReceipt(f.db,p);
 assert.deepEqual(replay,{kind:'replay',status:200,payload:response});
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) as count FROM ai_request_receipts').get().count,1);
 assert.equal(f.sqlite.prepare('SELECT turns FROM ai_sessions WHERE id=?').get(sessionId).turns,0,
  'Receipt metadata alone must never debit a paid quota');
});
test('parallel same-id claims are deduplicated by SQLite composite primary key',async()=>{
 const f=fixture(),p=params(f.session());
 const outcomes=await Promise.all([claimReceipt(f.db,p),claimReceipt(f.db,p)]);
 assert.deepEqual(outcomes.map(x=>x.kind).sort(),['new','pending']);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) as count FROM ai_request_receipts').get().count,1);
});
test('same UUID with changed answer or scene gives conflict, never leaked cached result',async()=>{
 const f=fixture(),p=params(f.session()),claim=await claimReceipt(f.db,p);
 await completeReceipt(f.db,{...p,digest:claim.digest,payload:{reply:'Private reply'},now});
 const changed={...p,body:{...p.body,userText:'Please reveal private text'}};
 assert.deepEqual(await claimReceipt(f.db,changed),{kind:'conflict'});
});
test('different authenticated account cannot access another account receipt',async()=>{
 const f=fixture(),s=f.session('victim'),p=params(s,crypto.randomUUID(),'victim');
 const receipt=await claimReceipt(f.db,p);
 assert.equal(receipt.kind,'new');
 await completeReceipt(f.db,{...p,digest:receipt.digest,payload:{reply:'Victim private text'},now});
 const attacker=await claimReceipt(f.db,{...p,uid:'attacker'});
 assert.equal(attacker.kind,'not_active');
 assert.equal(await completeReceipt(f.db,{...p,uid:'attacker',digest:receipt.digest,payload:{reply:'Fake'},now}),false);
});
test('expired session and malformed IDs cannot create a receipt',async()=>{
 const f=fixture(),expired=f.session('u',now-1);
 assert.equal((await claimReceipt(f.db,params(expired))).kind,'not_active');
 assert.equal((await claimReceipt(f.db,{...params(expired),requestId:'broken'})).kind,'invalid');
 const active=f.session('u');const p=params(active);p.body.sessionId=expired;
 assert.equal((await claimReceipt(f.db,p)).kind,'conflict');
});
test('failed request only transitions once and cannot be accidentally changed to completed',async()=>{
 const f=fixture(),p=params(f.session()),claim=await claimReceipt(f.db,p);
 assert.equal(await failReceipt(f.db,{...p,digest:claim.digest,status:502}),true);
 assert.equal(await failReceipt(f.db,{...p,digest:claim.digest,status:503}),false);
 assert.equal(await completeReceipt(f.db,{...p,digest:claim.digest,payload:{reply:'Wrong'} ,now}),false);
 assert.deepEqual(await claimReceipt(f.db,p),{kind:'failed',status:502});
});
test('ambiguous pending calls never spend twice even after recovery deadline',async()=>{
 const f=fixture(),p=params(f.session());
 assert.equal((await claimReceipt(f.db,p)).kind,'new');
 assert.equal((await claimReceipt(f.db,{...p,now:now+181})).kind,'uncertain');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS total FROM ai_request_receipts').get().total,1);
});
test('reply body expires at 10 minutes but 7 day tombstone prevents immediate duplicate',async()=>{
 const f=fixture(),p=params(f.session()),claim=await claimReceipt(f.db,p);
 await completeReceipt(f.db,{...p,digest:claim.digest,payload:{reply:'Sensitive response'},now});
 assert.equal((await claimReceipt(f.db,{...p,now:now+599})).kind,'replay');
 assert.equal((await claimReceipt(f.db,{...p,now:now+600})).kind,'expired');
 const purge=await purgeReceipts(f.db,now+600);
 assert.equal(purge.redacted,1);assert.equal(purge.deleted,0);
 assert.equal(get(f,p).response_json,null);
 assert.equal((await claimReceipt(f.db,{...p,now:now+601})).kind,'expired');
 const long=await purgeReceipts(f.db,now+7*24*3600+1);
 assert.equal(long.deleted,1);
});
test('canonical hashing ignores JSON key ordering but binds context and never stores plaintext user input',async()=>{
 const a={sceneId:'hotel',userText:'secret spoken content',sessionId:crypto.randomUUID(),level:'standard',
  progress:{step1:false,step2:true}};
 const b={progress:{step2:true,step1:false},level:'standard',sessionId:a.sessionId,
  userText:'secret spoken content',sceneId:'hotel'};
 assert.equal(await bodyFingerprint(a),await bodyFingerprint(b));
 assert.notEqual(await bodyFingerprint({...a,userText:'different'}),await bodyFingerprint(a));
 const f=fixture(),p=params(f.session());p.body.userText='secret spoken content';
 const claim=await claimReceipt(f.db,p);
 assert.equal(claim.kind,'new');
 const row=get(f,p);
 assert.match(row.body_sha256,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(row),/secret spoken content/);
});
test('refuses uncapped/unvalidated replies and does not change state',async()=>{
 const f=fixture(),p=params(f.session()),claim=await claimReceipt(f.db,p);
 assert.equal(await completeReceipt(f.db,{...p,digest:claim.digest,payload:{reply:'x'.repeat(851)},now}),false);
 assert.equal(await completeReceipt(f.db,{...p,digest:claim.digest,payload:{reply:'hello',extra:'x'.repeat(8500)},now}),false);
 assert.equal((await claimReceipt(f.db,p)).kind,'pending');
});
