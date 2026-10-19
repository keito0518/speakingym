import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSafeFixtureUid, validateStagingIdentity, assertSchemaObjects,
  ensureToken, StagingD1, STAGING_DATABASE_ID, STAGING_NAME} from '../scripts/staging-d1-qa.mjs';

const fixtureUid = 'sgqa-5d42072b-2564-46d0-935e-e4111f116dd6-failure';
const objects = [
 'ai_sessions','ai_turn_reservations','free_session_reservations',
 'ai_turn_reservation_count_insert','ai_turn_reservation_count_refund',
 'free_session_turn_guard','free_session_turn_settle','idx_free_session_account',
].map(name=>({name}));

test('fail closed without a token or when staging identity is wrong', async()=>{
  assert.throws(()=>ensureToken(''),/not configured/);
  assert.throws(()=>ensureToken(undefined),/not configured/);
  assert.throws(()=>validateStagingIdentity({name:'speakingym-plans',uuid:STAGING_DATABASE_ID}),/STOP/);
  assert.throws(()=>validateStagingIdentity({name:STAGING_NAME,uuid:'62419d42-703c-4e41-af47-736fd1738d7e'}),/STOP/);
  assert.doesNotThrow(()=>validateStagingIdentity({name:STAGING_NAME,uuid:STAGING_DATABASE_ID}));
});

test('never allow deletion of real users or arbitrary test IDs',()=>{
  assert.equal(assertSafeFixtureUid(fixtureUid),fixtureUid);
  for(const uid of ['user@example.com','staging-test-user','sgqa-x-failure','other','']) {
    assert.throws(()=>assertSafeFixtureUid(uid),/Refusing/);
  }
});

test('require all ledger and free-session schema objects before writes',()=>{
  assert.doesNotThrow(()=>assertSchemaObjects(objects));
  assert.throws(()=>assertSchemaObjects(objects.slice(1)),/ai_sessions/);
  assert.throws(()=>assertSchemaObjects(objects.filter(x=>x.name!=='free_session_turn_settle')),/free_session_turn_settle/);
});

test('do not access query/write endpoint before verifying staging identity',async()=>{
  let requests=0;
  const db=new StagingD1('not-a-secret-token',async()=>{
    requests++;
    return {ok:true,json:async()=>({success:true,result: requests === 1
      ? {status:'active'} : {name:'speakingym-plans'}})};
  });
  await assert.rejects(db.query('DELETE FROM ai_sessions'),/not verified/);
  await assert.rejects(db.clean(fixtureUid),/not verified/);
  assert.equal(requests,0);
  await assert.rejects(db.verify(),/STOP/);
  assert.equal(requests,2);
  assert.equal(db.verified,false);
});

test('verify staging identity before only querying sqlite_master with bound params',async()=>{
  const calls=[];
  const mock=async (url,init)=>{
    calls.push({url,init});
    return {ok:true,json:async()=>({success:true,result:url.endsWith('/tokens/verify')
      ? {status:'active'} : init.method==='GET'
      ? {name:STAGING_NAME,uuid:STAGING_DATABASE_ID}
      : [{success:true,results:objects}]})};
  };
  const db=new StagingD1('test-only',mock);
  await db.verify();
  assert.equal(db.verified,true);
  assert.equal(calls.length,3);
  assert.ok(calls[0].url.endsWith('/user/tokens/verify'));
  assert.ok(calls.slice(1).every(c=>c.url.includes(STAGING_DATABASE_ID) && !c.url.includes('62419d42-703c-4e41-af47-736fd1738d7e')));
  const body=JSON.parse(calls[2].init.body);
  assert.match(body.sql,/sqlite_master/);
  assert.deepEqual(body.params,objects.map(x=>x.name));
});

test('Cloudflare API errors are sanitized and never include token values',async()=>{
  const mock=async()=>({ok:false,status:403});
  const db=new StagingD1('test-value-never-in-errors',mock);
  await assert.rejects(db.verify(),e=>/HTTP 403/.test(e.message) && !e.message.includes('test-value'));
});

test('reject expired or disabled token before any D1 access', async()=>{
  for (const status of ['disabled','expired']) {
    const calls=[];
    const db=new StagingD1('local-test-token',async url=>{
      calls.push(url);
      return {ok:true,json:async()=>({success:true,result:{status}})};
    });
    await assert.rejects(db.verify(),/token status is not active/);
    assert.equal(calls.length,1);
    assert.ok(calls[0].includes('/user/tokens/verify'));
    assert.equal(db.verified,false);
  }
});

// Exercise the *actual QA runner* with SQLite, not just its guards. Real remote
// Cloudflare D1 remains a separately gated workflow_dispatch check.
test('complete staging QA runner verifies invariants and removes only its fake users',async()=>{
  const {DatabaseSync}=await import('node:sqlite');
  const {readFileSync}=await import('node:fs');
  const {runRemoteStagingQA}=await import('../scripts/staging-d1-qa.mjs');
  const sqlite=new DatabaseSync(':memory:');
  try {
    for (const path of ['../worker/schema-plans.sql',
      '../worker/migrations/0002-ai-turn-ledger.sql',
      '../worker/migrations/0005-free-session-reservations.sql']) {
      sqlite.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
    }
    const mock=async (url,init)=>{
      if (init.method==='GET') return {ok:true,json:async()=>({success:true,
        result:url.endsWith('/tokens/verify') ? {status:'active'}
          : {name:STAGING_NAME,uuid:STAGING_DATABASE_ID}})};
      const payload=JSON.parse(init.body);
      let result;
      try {result=sqlite.prepare(payload.sql).all(...(payload.params||[]));}
      catch (error) {throw new Error('Simulated SQL error: '+error.message);}
      return {ok:true,json:async()=>({success:true,result:[{success:true,results:result}]})};
    };
    const db=new StagingD1('simulation-only',mock);
    await db.verify();
    const log=[];
    await runRemoteStagingQA(db,message=>log.push(message));
    assert.equal(log.filter(x=>x.startsWith('PASS')).length,4);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM ai_sessions WHERE uid LIKE 'sgqa-%'").get().n,0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM ai_turn_reservations WHERE uid LIKE 'sgqa-%'").get().n,0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM free_session_reservations WHERE uid LIKE 'sgqa-%'").get().n,0);
  } finally {sqlite.close();}
});
