import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingBillingSchemaReady} from './staging-billing-schema.js';
import worker from './ai-worker.js';

function db(names){
 const seen=[];
 const database={prepare(sql){seen.push(sql);return {all:async()=>({results:names.map(name=>({name}))})}}};
 return {database,seen};
}
test('staging schema checker returns only a boolean based on both table names',async()=>{
 for(const [names,expected] of [
  [[],false],[['billing_accounts'],false],[['billing_events'],false],
  [['billing_accounts','billing_events'],true],
  [['billing_accounts','billing_events','account_plans'],true]
 ]){
  const {database,seen}=db(names);
  assert.equal(await stagingBillingSchemaReady(database),expected);
  assert.equal(seen.length,1);
  assert.match(seen[0],/SELECT name FROM sqlite_master/);
  assert.doesNotMatch(seen[0],/SELECT \*/);
 }
 assert.equal(await stagingBillingSchemaReady(null),false);
 const broken={prepare(){throw Error('secret never exposed')}};
 assert.equal(await stagingBillingSchemaReady(broken),false);
});
test('production GET /health never queries billing schema even if billing tables exist',async()=>{
 const {database,seen}=db(['billing_accounts','billing_events']);
 const res=await worker.fetch(new Request('https://worker.example/health'),{
  PLAN_DB:database,STAGING_HEALTH_ONLY:'false',STAGING_BILLING_ONLY:'false',
  BILLING_MODE:'disabled',ENFORCE_PLANS:'false',TURN_LEDGER_MODE:'disabled'
 });
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.stagingBillingSchemaReady,null);
 assert.equal(seen.some(s=>/billing_accounts|billing_events/.test(s)),false);
});
test('isolated staging GET /health emits readiness flag with no record data',async()=>{
 const {database}=db(['billing_accounts','billing_events']);
 const res=await worker.fetch(new Request('https://stage.example/health'),{
  PLAN_DB:database,STAGING_HEALTH_ONLY:'true',STAGING_BILLING_ONLY:'false',
  ENFORCE_PLANS:'false',TURN_LEDGER_MODE:'disabled',BILLING_MODE:'disabled'
 });
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.stagingBillingSchemaReady,true);
 assert.equal(JSON.stringify(data).includes('billing_accounts'),false);
 assert.equal(JSON.stringify(data).includes('billing_events'),false);
});
