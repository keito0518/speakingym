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

test('account-owned token gets its own documented verification endpoint before staging DB', async()=>{
  const calls=[];
  const db=new StagingD1('mock-account-token',async url=>{
    calls.push(url);
    if (url.endsWith('/user/tokens/verify')) {
      return {ok:false,status:400,json:async()=>({errors:[{code:1011,message:'REDACT ME'}]})};
    }
    if (url.endsWith('/accounts/324c7361cbbaecd8240688b8bd588ef3/tokens/verify')) {
      return {ok:true,json:async()=>({success:true,result:{status:'active'}})};
    }
    if (url.endsWith('/database/c608774e-3bc5-4527-be8d-f640e386f504')) {
      return {ok:true,json:async()=>({success:true,result:{name:STAGING_NAME,uuid:STAGING_DATABASE_ID}})};
    }
    return {ok:true,json:async()=>({success:true,result:[{success:true,results:objects}]})};
  });
  await db.verify();
  assert.equal(db.verified,true);
  assert.equal(calls.length,4);
  assert.ok(calls[0].endsWith('/user/tokens/verify'));
  assert.ok(calls[1].endsWith('/accounts/324c7361cbbaecd8240688b8bd588ef3/tokens/verify'));
  assert.ok(calls[2].includes(STAGING_DATABASE_ID));
});

test('account-scoped token HTTP 401/code 1000 uses account verify before any D1 access',async()=>{
 const requests=[];
 const mock=async (url,init)=>{
  requests.push({url,method:init.method});
  if(url.endsWith('/user/tokens/verify'))
   return {ok:false,status:401,json:async()=>({errors:[{code:1000,message:'do not log'}]})};
  if(url.endsWith('/accounts/324c7361cbbaecd8240688b8bd588ef3/tokens/verify'))
   return {ok:true,json:async()=>({success:true,result:{status:'active'}})};
  if(url.endsWith('/database/c608774e-3bc5-4527-be8d-f640e386f504'))
   return {ok:true,json:async()=>({success:true,result:{name:STAGING_NAME,uuid:STAGING_DATABASE_ID}})};
  return {ok:true,json:async()=>({success:true,result:[{success:true,results:objects}]})};
 };
 const db=new StagingD1('account-only-test-token',mock);
 await db.verify();
 assert.equal(db.verified,true);
 assert.equal(requests.length,4);
 assert.deepEqual(requests.slice(0,2).map(x=>x.method),['GET','GET']);
 assert.equal(requests[1].url,'https://api.cloudflare.com/client/v4/accounts/324c7361cbbaecd8240688b8bd588ef3/tokens/verify');
 assert.ok(requests[2].url.includes(STAGING_DATABASE_ID));
});
test('both endpoints HTTP 401 never authorize D1 writes',async()=>{
 const urls=[];
 const db=new StagingD1('redacted-test-token',async(url)=>{
  urls.push(url);
  return {ok:false,status:401,json:async()=>({errors:[{code:1000,message:'redacted-test-token'}]})};
 });
 await assert.rejects(db.verify(),error=>
  /HTTP 401 \(codes 1000\)/.test(error.message)&&
  !error.message.includes('redacted-test-token'));
 assert.equal(db.verified,false);
 assert.equal(urls.length,2);
 assert.ok(urls.every(x=>x.endsWith('/tokens/verify')));
});
test('other 401 errors do not get extra fallback requests',async()=>{
 const urls=[];
 const db=new StagingD1('unknown-test-token',async(url)=>{
  urls.push(url);
  return {ok:false,status:401,json:async()=>({errors:[{code:1010}]})};
 });
 await assert.rejects(db.verify(),/HTTP 401/);
 assert.equal(urls.length,1);
 assert.equal(db.verified,false);
});
test('both verification endpoints reject: report only numeric codes and never touch D1', async()=>{
  const calls=[];
  const db=new StagingD1('mock-secret-unprinted',async url=>{
    calls.push(url);
    return {ok:false,status:400,json:async()=>({errors:[{code:1012,message:'very sensitive message mock-secret-unprinted'}]})};
  });
  await assert.rejects(db.verify(),e=>
    e.message.includes('HTTP 400 (codes 1012)')
    && !e.message.includes('mock-secret-unprinted')
    && !e.message.includes('very sensitive message'));
  assert.equal(calls.length,2);
  assert.ok(calls.every(url=>url.endsWith('/tokens/verify')));
  assert.equal(db.verified,false);
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
