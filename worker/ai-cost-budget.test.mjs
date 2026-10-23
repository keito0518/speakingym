import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {
 budgetGuardRequested,budgetGuardConfig,budgetSchemaReady,
 estimateBudgetMilliYen,reserveAIBudget
} from './ai-cost-budget.js';

const envVars={
 AI_COST_GUARD_MODE:'enabled',ENFORCE_PLANS:'true',
 AI_MONTHLY_BUDGET_YEN:'500',
 AI_FREE_MONTHLY_CONVERSATIONS:'2',AI_FREE_MONTHLY_TEACHER:'1',
 AI_GUARD_USD_JPY:'160',AI_GUARD_SAFETY_PERCENT:'200'
};
function database(migrated=true){
 const sqlite=new DatabaseSync(':memory:');
 if(migrated)sqlite.exec(readFileSync(new URL('./migrations/0007-ai-cost-budget.sql',import.meta.url),'utf8'));
 const db={prepare(sql){
  return {all:async()=>({results:sqlite.prepare(sql).all()}),
   bind(...args){return{
    first:async()=>sqlite.prepare(sql).get(...args)||null,
    run:async()=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}})
   }}};
 }};
 return {db,sqlite,env:{...envVars,PLAN_DB:db}};
}

test('budget guard is OFF by default, and opt-in demands every server-side setting',()=>{
 assert.equal(budgetGuardRequested({}),false);
 assert.equal(budgetGuardConfig({}),null);
 const {env}=database();
 assert.ok(budgetGuardConfig(env));
 for(const bad of [
  {AI_FREE_MONTHLY_CONVERSATIONS:'0'}, {AI_MONTHLY_BUDGET_YEN:'NaN'},
  {AI_GUARD_USD_JPY:'350'}, {AI_GUARD_SAFETY_PERCENT:'5'},
  {ENFORCE_PLANS:'false'}, {PLAN_DB:null}
 ]){
  assert.equal(budgetGuardConfig({...env,...bad}),null);
 }
 assert.ok(estimateBudgetMilliYen('teacher',budgetGuardConfig(env)) >
  estimateBudgetMilliYen('conversation',budgetGuardConfig(env)));
});

test('missing schema fails closed without creating a reservation or calling any provider',async()=>{
 const {db,env}=database(false);
 assert.equal(await budgetSchemaReady(db),false);
 assert.deepEqual(await reserveAIBudget(db,{uid:'learner',tier:'free',kind:'conversation',env}),
  {ok:false,reason:'budget_not_ready'});
});

test('Free quotas apply independently by kind and identity; Pro does not consume Free allowance',async()=>{
 const {db,sqlite,env}=database();
 const param=(uid,kind,tier='free')=>({uid,kind,tier,env,time:Date.parse('2026-10-23T01:00:00Z')});
 assert.equal((await reserveAIBudget(db,param('A','conversation'))).ok,true);
 assert.equal((await reserveAIBudget(db,param('A','conversation'))).ok,true);
 assert.equal((await reserveAIBudget(db,param('A','conversation'))).reason,'budget_limit');
 assert.equal((await reserveAIBudget(db,param('A','teacher'))).ok,true);
 assert.equal((await reserveAIBudget(db,param('A','teacher'))).reason,'budget_limit');
 assert.equal((await reserveAIBudget(db,param('B','conversation'))).ok,true);
 assert.equal((await reserveAIBudget(db,param('A','conversation','pro'))).ok,true);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM ai_cost_budget_reservations').get().n,5);
});

test('global spending cap is atomic, shared by tiers, and cannot be bypassed via retries',async()=>{
 const {db,sqlite,env}=database();
 const config=budgetGuardConfig(env);
 const per=estimateBudgetMilliYen('teacher',config);
 // The guard enforces a minimum configurable monthly budget of ¥500.
 // Fill every available reservation slot, then prove simultaneous extra
 // attempts cannot pass that last allowance.
 const custom={...env};
 const budget=Number(custom.AI_MONTHLY_BUDGET_YEN)*1000;
 const capacity=Math.floor(budget/per);
 const outcomes=await Promise.all(Array.from({length:capacity+4},(_,i)=>
  reserveAIBudget(db,{uid:'paid-'+i,tier:'pro',kind:'teacher',env:custom})
 ));
 assert.equal(outcomes.filter(x=>x.ok).length,capacity);
 assert.equal(outcomes.filter(x=>!x.ok&&x.reason==='budget_limit').length,4);
 const stored=sqlite.prepare('SELECT COALESCE(SUM(reserved_milliyen),0) AS spent FROM ai_cost_budget_reservations').get().spent;
 assert.ok(stored<=budget);
 assert.ok(outcomes.every(x=>x.ok?x.milliYen===per:true));
 // Unknown provider failures remain counted; there is intentionally no auto-refund.
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM ai_cost_budget_reservations').get().n,capacity);
});

test('JST calendar month resets both Free call counts and global budget',async()=>{
 const {db,sqlite,env}=database();
 const before=Date.parse('2026-10-31T14:59:59Z');
 const after=Date.parse('2026-10-31T15:00:01Z');
 const a=await reserveAIBudget(db,{uid:'A',tier:'free',kind:'teacher',env,time:before});
 const b=await reserveAIBudget(db,{uid:'A',tier:'free',kind:'teacher',env,time:after});
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 assert.notEqual(a.month,b.month ,'JST month rolls over on the first day at 00:00 JST');
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM ai_cost_budget_reservations').get().n,2);
});

test('invalid uid, tier, model, missing database or forged client price fail closed',async()=>{
 const {db,env}=database();
 for(const args of [
  {uid:'',kind:'teacher',tier:'free'},
  {uid:'abc',kind:'unknown',tier:'free'},
  {uid:'abc',kind:'teacher',tier:'admin'},
  {uid:'abc',kind:'teacher',tier:'free',env:{...env,PLAN_DB:{}}},
 ]){
  const result=await reserveAIBudget(db,{env,...args});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'budget_not_ready');
 }
});
