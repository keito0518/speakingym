import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {startSession,consumeSessionTurn,completeSessionTurn,refundSessionTurn,getEntitlement,tokyoDay} from './plan-limits.js';
import {freeSessionSchemaReady,freeSessionMode} from './free-session-reservations.js';
import {expireStaleTurns} from './turn-ledger.js';
import worker from './ai-worker.js';
function fixture(replay=false){
 const sql=new DatabaseSync(':memory:');
 const files=['schema-plans.sql','migrations/0002-ai-turn-ledger.sql',...(replay?['migrations/0003-ai-request-receipts.sql','migrations/0004-ai-replay-turn-bridge.sql']:[]),'migrations/0005-free-session-reservations.sql'];
 for(const file of files)sql.exec(readFileSync(new URL(file,import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL(files.at(-1),import.meta.url),'utf8'));
 const db={prepare(query){let args=[];const stmt={bind(...values){args=values;return stmt},
  first:async()=>sql.prepare(query).get(...args)||null,
  all:async()=>({results:sql.prepare(query).all(...args)}),
  run:async()=>({meta:{changes:Number(sql.prepare(query).run(...args).changes)}}),
  batch:()=>({results:sql.prepare(query).all(...args)})};return stmt},
  async batch(statements){sql.exec('BEGIN IMMEDIATE');try{const rows=statements.map(s=>s.batch());sql.exec('COMMIT');return rows}catch(e){sql.exec('ROLLBACK');throw e}}};
 const env={ENFORCE_PLANS:'true',TURN_LEDGER_MODE:'enabled',FREE_SESSION_MODE:'enabled',PLAN_DB:db};
 const start=(uid='u',e=env)=>startSession(db,uid,e);
 const turn=(s,uid='u')=>consumeSessionTurn(db,uid,s.sessionId,env);
 const count=async()=> (await getEntitlement(db,'u',env)).used.sessions;
 return {sql,db,env,start,turn,count};
}
test('Free first failure is refunded, retry succeeds once and later failures keep the session',async()=>{
 const f=fixture(),s=await f.start();assert.equal(await f.count(),0);
 const a=await f.turn(s);assert.ok(a);assert.equal(await f.count(),0);
 assert.equal(await refundSessionTurn(f.db,'u',a),true);assert.equal(await f.count(),0);
 assert.equal(await refundSessionTurn(f.db,'u',a),false);
 const b=await f.turn(s);assert.ok(b);assert.equal(await completeSessionTurn(f.db,'u',b),true);
 assert.equal(await f.count(),1);
 const c=await f.turn(s);await refundSessionTurn(f.db,'u',c);assert.equal(await f.count(),1);
 assert.equal(f.sql.prepare('SELECT turns FROM ai_sessions').get().turns,1);
});
test('five pending slots block multiple tabs; a released slot can only be reacquired once',async()=>{
 const f=fixture();const sessions=await Promise.all(Array.from({length:6},()=>f.start()));
 assert.equal(sessions.filter(Boolean).length,5);assert.equal(await f.count(),0);
 const [a,b]=await Promise.all([f.turn(sessions[0]),f.turn(sessions[0])]);
 assert.equal([a,b].filter(Boolean).length,1);
 await refundSessionTurn(f.db,'u',a||b);
 assert.ok(await f.start());
 assert.equal(await f.turn(sessions[0]),null,'released ID cannot evade slots now occupied by five other sessions');
 assert.ok(await f.start('other'));
 assert.equal(await f.turn(sessions[1],'other'),null);
});
test('stale request and abandoned start recover; late completion cannot consume a released slot',async()=>{
 const f=fixture(),s=await f.start(),r=await f.turn(s);
 f.sql.prepare('UPDATE ai_turn_reservations SET created_at=created_at-181 WHERE id=?').run(r.id);
 assert.equal(await expireStaleTurns(f.db,'u'),1);
 assert.equal(await completeSessionTurn(f.db,'u',r),false);
 assert.equal(await f.count(),0);assert.ok(await f.turn(s));
 const abandoned=await f.start();f.sql.prepare('UPDATE ai_sessions SET expires_at=0 WHERE id=?').run(abandoned.sessionId);
 await f.count();assert.equal(f.sql.prepare('SELECT state FROM free_session_reservations WHERE session_id=?').get(abandoned.sessionId).state,'released');
});
test('existing rows, another account, flag rollback and 20 turns retain conservative limits',async()=>{
 const f=fixture(),legacy=await f.start('u',{ENFORCE_PLANS:'true',TURN_LEDGER_MODE:'enabled'});
 assert.equal(await f.count(),1);
 const s=await f.start();const r=await f.turn(s);
 assert.equal(await refundSessionTurn(f.db,'other',r),false);
 await completeSessionTurn(f.db,'u',r);
 for(let i=1;i<20;i++){const t=await f.turn(s);assert.ok(t);await completeSessionTurn(f.db,'u',t)}
 assert.equal(await f.turn(s),null);assert.equal(await f.count(),2);
 assert.equal(f.sql.prepare('SELECT turns FROM ai_sessions WHERE id=?').get(legacy.sessionId).turns,0);
 assert.equal((await getEntitlement(f.db,'u',{ENFORCE_PLANS:'true'})).used.sessions,2);
});
test('opt-in fails closed without schema or ledger; Pro never enrolls; batch failure rolls back',async()=>{
 const f=fixture();assert.equal(freeSessionMode({}),false);assert.equal(await freeSessionSchemaReady(f.db),true);
 await assert.rejects(()=>f.start('u',{...f.env,TURN_LEDGER_MODE:'disabled'}));
 f.sql.prepare("INSERT INTO account_plans VALUES ('paid','pro',0)").run();
 assert.ok(await f.start('paid'));assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM free_session_reservations').get().n,0);
 f.sql.exec("CREATE TRIGGER fail_marker BEFORE INSERT ON free_session_reservations BEGIN SELECT RAISE(ABORT,'fixture'); END");
 await assert.rejects(()=>f.start());assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM ai_sessions WHERE uid='u'").get().n,0);
 f.sql.exec('DROP TRIGGER fail_marker; DROP TRIGGER free_session_turn_guard');
 assert.equal(await freeSessionSchemaReady(f.db),false);await assert.rejects(()=>f.start());
});
test('yesterday unconfirmed session cannot consume today; successful previous sessions stay counted',async()=>{
 const f=fixture(),s=await f.start();
 f.sql.prepare("UPDATE ai_sessions SET day='2020-01-01' WHERE id=?").run(s.sessionId);
 f.sql.prepare("UPDATE free_session_reservations SET day='2020-01-01' WHERE session_id=?").run(s.sessionId);
 assert.equal(await f.turn(s),null);assert.equal(await f.count(),0);
});
async function auth(t,respond){
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid=crypto.randomUUID();
 const now=Math.floor(Date.now()/1000),head=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');
 const body=Buffer.from(JSON.stringify({aud:'speakingym',iss:'https://securetoken.google.com/speakingym',sub:'u',iat:now-10,auth_time:now-20,exp:now+3600})).toString('base64url');
 const data=head+'.'+body,token=data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url');
 t.mock.method(globalThis,'fetch',async(url,options)=>String(url).includes('/service_accounts/v1/jwk/')?Response.json({keys:[jwk]}):respond(url,options));
 return (path,body)=>new Request('https://worker.example/'+path,{method:path==='entitlement'?'GET':'POST',headers:{Origin:'https://speakingym.pages.dev',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
}
const success=()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify({reply:'Certainly, I can help you.',progress:{step1:true,step2:false,step3:false}})}]}}]});
for(const replay of [false,true])test(`signed Worker first failure/abort, concurrency and success with replay=${replay}`,async t=>{
 const f=fixture(replay);Object.assign(f.env,{ALLOW_AI:'true',GEMINI_API_KEY:'fixture-only',USER_LIMIT:{limit:async()=>({success:true})},GLOBAL_LIMIT:{limit:async()=>({success:true})},...(replay?{AI_REPLAY_MODE:'enabled'}:{})});
 let mode='failure',calls=0,release,entered;
 const request=await auth(t,async()=>{calls++;if(mode==='failure')return new Response('',{status:503});if(mode==='abort')throw new DOMException('timeout','AbortError');if(mode==='wait'){entered();await new Promise(r=>release=r)}return success()});
 const res=await worker.fetch(request('sessions'),f.env);assert.equal(res.status,200);const sessionId=(await res.json()).sessionId;
 const body=()=>({sceneId:'hotel',level:'standard',sessionId,userText:'Hello, please help me.',requestId:crypto.randomUUID(),progress:{}});
 for(const m of ['failure','abort']){mode=m;const failed=await worker.fetch(request('',body()),f.env);assert.ok(failed.status>=500);assert.equal(await f.count(),0)}
 mode='wait';const ready=new Promise(r=>entered=r),input=body();
 const first=worker.fetch(request('',input),f.env);await ready;
 const second=await worker.fetch(request('',replay?input:body()),f.env);assert.equal(second.status,replay?409:403);
 release();assert.equal((await first).status,200);assert.equal(await f.count(),1);assert.equal(calls,3);
 if(replay){assert.equal((await worker.fetch(request('',input),f.env)).status,200);assert.equal(calls,3)}
 assert.equal(f.sql.prepare('SELECT turns FROM ai_sessions WHERE id=?').get(sessionId).turns,1);
});

test('six independent SQLite connections cannot reserve more than five daily slots',async()=>{
 const {Worker}=await import('node:worker_threads');
 const {mkdtempSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const dir=mkdtempSync(join(tmpdir(),'speakingym-race-')),path=join(dir,'race.sqlite');
 const f=fixture();f.sql.exec(`VACUUM INTO '${path.replaceAll("'","''")}'`);
 const code=`
 const {parentPort,workerData}=require('node:worker_threads');
 const {DatabaseSync}=require('node:sqlite');
 (async()=>{
 const {startSession}=await import(workerData.module);
 const sql=new DatabaseSync(workerData.path);sql.exec('PRAGMA busy_timeout=5000');
 const db={prepare(q){let args=[];const stmt={bind(...a){args=a;return stmt},
 first:async()=>sql.prepare(q).get(...args)||null,
 all:async()=>({results:sql.prepare(q).all(...args)}),
 run:async()=>({meta:{changes:Number(sql.prepare(q).run(...args).changes)}}),
 batch:()=>({results:sql.prepare(q).all(...args)})};return stmt},
 async batch(ss){sql.exec('BEGIN IMMEDIATE');try{const result=ss.map(s=>s.batch());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
 parentPort.postMessage('ready');await new Promise(r=>parentPort.once('message',r));
 const result=await startSession(db,'race',{ENFORCE_PLANS:'true',TURN_LEDGER_MODE:'enabled',FREE_SESSION_MODE:'enabled'});
 sql.close();parentPort.postMessage(!!result);
 })().catch(e=>{throw e});`;
 const workers=[];
 try{
  const ready=[];const results=[];
  for(let i=0;i<6;i++){
   const w=new Worker(code,{eval:true,workerData:{path,module:new URL('./plan-limits.js',import.meta.url).href}});workers.push(w);
   ready.push(new Promise((resolve,reject)=>{w.once('message',resolve);w.once('error',reject)}));
   results.push(new Promise((resolve,reject)=>{w.on('message',v=>{if(typeof v==='boolean')resolve(v)});w.once('error',reject)}));
  }
  await Promise.all(ready);for(const w of workers)w.postMessage('go');
  assert.equal((await Promise.all(results)).filter(Boolean).length,5);
  const check=new DatabaseSync(path);assert.equal(check.prepare('SELECT COUNT(*) n FROM ai_sessions').get().n,5);check.close();
 }finally{await Promise.all(workers.map(w=>w.terminate()));rmSync(dir,{recursive:true,force:true})}
});
