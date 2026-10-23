/**
 * DRAFT opt-in hard pre-call budget reservation, not a Google invoice.
 *
 * D1 migrations/0007-ai-cost-budget.sql must be installed on an isolated
 * staging D1 before AI_COST_GUARD_MODE="enabled" is ever used.
 * No changes are made unless the caller opts in. All configuration is
 * server-side; never trust client-supplied pricing, user id, tier or model.
 *
 * Every admitted call reserves a deliberately high, non-refundable estimate
 * before a provider request. If a provider error occurs the reservation still
 * counts: this prevents ambiguous timeout/retry failures from overspending.
 * Provider invoices, thinking, policy changes or costs from other projects
 * cannot be capped by this application's estimate: set Google-side budgets too.
 */
import {MODEL} from './cost-telemetry.js';
import {tokyoDay} from './plan-limits.js';
import {ledgerMode,ledgerSchemaReady} from './turn-ledger.js';

export const GUARD_MODE='enabled';
const RATES=Object.freeze({
 'gemini-3.5-flash-lite':Object.freeze({input:0.30,output:2.50}),
 'gemini-3.1-flash-lite':Object.freeze({input:0.25,output:1.50})
});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const BUDGET_ENVELOPE_TOKENS=Object.freeze({
 // Provider generationConfig currently caps conversation output at 2,000
 // and teacher output at 2,200; leave a little additional safety headroom.
 conversation:Object.freeze({input:8000,output:2400}),
 teacher:Object.freeze({input:12000,output:2400})
});
function boundedInt(value,min,max){
 const num=Number(value);
 return (String(value??'').trim()!==''&&Number.isSafeInteger(num)&&num>=min&&num<=max)?num:null;
}
export const budgetGuardRequested=env=>env?.AI_COST_GUARD_MODE===GUARD_MODE;
export function budgetGuardConfig(env={}){
 if(!budgetGuardRequested(env))return null;
 // A signed user, durable shared D1 and existing plan guard are required.
 if(env.ENFORCE_PLANS!=='true'||!env.PLAN_DB||!ledgerMode(env))return null;
 const monthlyYen=boundedInt(env.AI_MONTHLY_BUDGET_YEN,500,10000000);
 const monthlyFreeConvo=boundedInt(env.AI_FREE_MONTHLY_CONVERSATIONS,1,500);
 const monthlyFreeTeacher=boundedInt(env.AI_FREE_MONTHLY_TEACHER,1,100);
 const usdJpy=boundedInt(env.AI_GUARD_USD_JPY,100,300);
 const factor=boundedInt(env.AI_GUARD_SAFETY_PERCENT,100,500);
 if([monthlyYen,monthlyFreeConvo,monthlyFreeTeacher,usdJpy,factor].some(x=>x===null)||!RATES[MODEL])return null;
 return {monthlyMilliYen:monthlyYen*1000,
  monthlyFreeConvo,monthlyFreeTeacher,usdJpy,factor,model:MODEL};
}
export function estimateBudgetMilliYen(kind,config){
 const tokens=BUDGET_ENVELOPE_TOKENS[kind],rate=RATES[config?.model];
 if(!tokens||!rate||!config)return null;
 // Always round UP to integer milli-yen; never round a tiny reservation to 0.
 const estimated=(tokens.input*rate.input+tokens.output*rate.output)/1e6 *
  config.usdJpy*1000*config.factor/100;
 return Math.max(1,Math.ceil(estimated));
}
export async function budgetSchemaReady(db){
 if(!db)return false;
 try{
  const result=await db.prepare(
   "SELECT name FROM sqlite_master WHERE type='table' AND name='ai_cost_budget_reservations'"
  ).all();
  return (result?.results||result||[]).some(row=>row.name==='ai_cost_budget_reservations');
 }catch{return false}
}
/**
 * One atomic SQLite INSERT enforces both the shared month cap and Free user's
 * per-kind monthly limit. Reads used for the comparisons are in the same
 * SQLite write statement; concurrent requests cannot both spend the final slot.
 * The reservation itself, never the signed entitlement, is the authorization.
 */
export async function reserveAIBudget(db,{uid,tier,kind,env,time=Date.now()}={}){
 const config=budgetGuardConfig(env);
 if(!config||db!==env.PLAN_DB||typeof uid!=='string'||!uid||uid.length>128||
  !['free','pro'].includes(tier)||!Object.hasOwn(BUDGET_ENVELOPE_TOKENS,kind)||
  !Number.isFinite(time))return {ok:false,reason:'budget_not_ready'};
 // Exact-ID ledger refunds must be available before the budget guard is
 // activated; legacy turn counters may fail to refund a rejected attempt
 // under concurrent calls.
 if(!await ledgerSchemaReady(db)||!await budgetSchemaReady(db))
  return {ok:false,reason:'budget_not_ready'};
 const milliYen=estimateBudgetMilliYen(kind,config);
 const month=tokyoDay(time).slice(0,7),id=crypto.randomUUID();
 const freeLimit=kind==='teacher'?config.monthlyFreeTeacher:config.monthlyFreeConvo;
 const freeOnly=tier==='free'?1:0;
 const sql=
  "INSERT INTO ai_cost_budget_reservations"+
  " (id,uid,month,tier,kind,reserved_milliyen,created_at)"+
  " SELECT ?,?,?,?,?,?,?"+
  " WHERE (SELECT COALESCE(SUM(reserved_milliyen),0) FROM ai_cost_budget_reservations WHERE month=?) + ? <= ?"+
  " AND (?=0 OR (SELECT COUNT(*) FROM ai_cost_budget_reservations"+
  " WHERE uid=? AND month=? AND tier='free' AND kind=?) < ?) RETURNING id";
 try{
  const row=await db.prepare(sql).bind(id,uid,month,tier,kind,milliYen,
   Math.floor(time/1000),month,milliYen,config.monthlyMilliYen,
   freeOnly,uid,month,kind,freeLimit).first();
  return row?{ok:true,id,month,milliYen,model:config.model}:
   {ok:false,reason:'budget_limit'};
 }catch{return {ok:false,reason:'budget_not_ready'}}
}
// This module deliberately has NO automatic refund. Unknown provider failures,
// retries or worker crashes can incur charges, so budget capacity is kept spent.
