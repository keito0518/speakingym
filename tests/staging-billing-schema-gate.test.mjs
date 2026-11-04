import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGING_NAME,STAGING_UUID,STAGING_WORKER,assertStagingConfig,
 assertRemoteIdentity,extractTableNames,chooseMigration,buildWranglerArgs,run}
 from '../scripts/staging-billing-schema-gate.mjs';

const conf=readFileSync(new URL('../worker/wrangler.staging.toml',import.meta.url),'utf8');
const mig=readFileSync(new URL('../worker/migrations/0001-billing.sql',import.meta.url),'utf8');
const base=['account_plans','ai_sessions','ai_turn_reservations','free_session_reservations','teacher_uses'];
const names=(...more)=>[{success:true,results:[...base,...more].map(name=>({name}))}];

test('accepts only immutable isolated staging Worker/D1 config and additive billing migration',()=>{
 assert.equal(assertStagingConfig(conf,mig),true);
 for(const v of [STAGING_NAME,STAGING_UUID,STAGING_WORKER])assert.ok(conf.includes(v));
 for(const changed of [
  conf.replace('name = "'+STAGING_WORKER+'"','name = "speakingym-survival-ai"'),
  conf.replace('database_name = "'+STAGING_NAME+'"','database_name = "speakingym-plans"'),
  conf.replace(STAGING_UUID,'62419d42-703c-4e41-af47-736fd1738d7e'),
  conf.replace('BILLING_MODE = "disabled"','BILLING_MODE = "live"'),
  conf.replace('STAGING_HEALTH_ONLY = "true"','STAGING_HEALTH_ONLY = "false"')
 ])assert.throws(()=>assertStagingConfig(changed,mig),/stage config/);
 for(const sql of [mig+'\nDROP TABLE ai_sessions;',mig+'\nUPDATE account_plans SET plan="pro";'])
  assert.throws(()=>assertStagingConfig(conf,sql),/unexpected SQL/);
});
test('remote D1 identity must match exact name and UUID',()=>{
 assert.equal(assertRemoteIdentity({name:STAGING_NAME,uuid:STAGING_UUID}),true);
 for(const db of [{name:'speakingym-plans',uuid:STAGING_UUID},{name:STAGING_NAME,uuid:'other'},
  {name:STAGING_NAME},{name:STAGING_NAME,uuid:'62419d42-703c-4e41-af47-736fd1738d7e'}])
  assert.throws(()=>assertRemoteIdentity(db),/UUID\/name mismatch/);
});
test('staging tables must be complete before additive schema migration',()=>{
 assert.equal(chooseMigration(extractTableNames(names())),'additive-migration-needed');
 assert.equal(chooseMigration(extractTableNames(names('billing_accounts','billing_events'))),'already-ready');
 assert.throws(()=>chooseMigration(extractTableNames(names('billing_accounts'))),/partial billing schema/);
 assert.throws(()=>chooseMigration(new Set(['billing_accounts','billing_events'])),/base schema missing/);
 assert.throws(()=>extractTableNames([{success:false,results:[]}]),/unsuccessful/);
});
test('Wrangler commands always target staging config and remote D1',()=>{
 for(const kind of ['identity','tables','migrate']){
  const s=buildWranglerArgs(kind);
  assert.ok(s.includes(STAGING_NAME));
  assert.ok(s.includes('wrangler.staging.toml'));
  assert.equal(s.includes('speakingym-plans'),false);
  assert.equal(s.includes('wrangler.toml'),false);
  assert.equal(s.includes('--local'),false);
  if(kind!=='identity')assert.ok(s.includes('--remote'));
 }
 assert.equal(buildWranglerArgs('migrate').includes('migrations/0001-billing.sql'),true);
 assert.throws(()=>buildWranglerArgs('production'),/Refusing/);
});
test('read-only inspection never runs migration; apply is idempotent',async()=>{
 let calls=[];
 const exec=async kind=>{
  calls.push(kind);
  if(kind==='identity')return {name:STAGING_NAME,uuid:STAGING_UUID};
  if(kind==='tables')return names();
  throw Error('Unexpected migration');
 };
 assert.deepEqual(await run({execute:exec}),{stage:'verified',migration:'additive-migration-needed',changed:false});
 assert.deepEqual(calls,['identity','tables']);
 calls=[];
 const ready=async kind=>{
  calls.push(kind);
  if(kind==='identity')return {name:STAGING_NAME,uuid:STAGING_UUID};
  if(kind==='tables')return names('billing_accounts','billing_events');
  throw Error('Should never write when ready');
 };
 assert.deepEqual(await run({apply:true,execute:ready}),{stage:'verified',migration:'already-ready',changed:false});
 assert.deepEqual(calls,['identity','tables']);
});
test('apply writes only after staging identity and base schema; verifies both billing tables',async()=>{
 let calls=[];
 const exec=async kind=>{
  calls.push(kind);
  if(kind==='identity')return {name:STAGING_NAME,uuid:STAGING_UUID};
  if(kind==='tables')return calls.filter(x=>x==='tables').length===1?names():names('billing_accounts','billing_events');
  if(kind==='migrate')return [{success:true,results:[]}];
  throw Error('Unknown command');
 };
 assert.deepEqual(await run({apply:true,execute:exec}),{stage:'verified',migration:'applied',changed:true});
 assert.deepEqual(calls,['identity','tables','migrate','tables']);
 let touched=false;
 await assert.rejects(run({apply:true,execute:async kind=>{
  if(kind==='identity')return {name:'speakingym-plans',uuid:STAGING_UUID};
  if(kind==='migrate')touched=true;
  return names();
 }}),/UUID\/name mismatch/);
 assert.equal(touched,false);
});
