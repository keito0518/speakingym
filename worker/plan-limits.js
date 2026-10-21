import {freeSessionMode,requireFreeSessionReady,startFreeSession,confirmedFreeSessions,recoverFreeSessions} from "./free-session-reservations.js";
/**
 * Server-authoritative beta plans. No payment API, customer input or Firestore
 * document is allowed to elevate a user's tier. Free-tier Cloudflare D1 only.
 * ENFORCE_PLANS=true activates these checks after D1 setup is complete.
 */
import {ledgerMode,reserveTurn,finishTurn,refundTurn,expireStaleTurns} from "./turn-ledger.js";
import {billingMode,billingUserEligible} from "./billing-mode.js";
const PROJECT_ID="speakingym";
const JWKS_URL="https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const ISSUER="https://securetoken.google.com/"+PROJECT_ID;
export const PLAN_LIMITS=Object.freeze({
 // Keep the current public Free beta unchanged until a separate launch decision.
 free:Object.freeze({sessions:5,teacher:3}),
 // Pro beta: no daily cap, but monthly cap per Firebase user (JST calendar month).
 // Each AI request reserves a turn; failed requests are refunded when safe.
 pro:Object.freeze({sessions:null,teacher:null,monthlyTurns:1000,monthlyTeacher:150})
});
let keysCached=null,keyExpiry=0;
function decode(encoded){
 const str=String(encoded).replace(/-/g,"+").replace(/_/g,"/");
 const padded=str+"=".repeat((4-str.length%4)%4);
 const bytes=atob(padded);
 return Uint8Array.from(bytes,c=>c.charCodeAt(0));
}
function decodeJSON(encoded){
 return JSON.parse(new TextDecoder().decode(decode(encoded)));
}
async function keys(force=false){
 const now=Date.now();
 if(!force&&keysCached&&now<keyExpiry)return keysCached;
 const response=await fetch(JWKS_URL);
 if(!response.ok)throw Error("auth_keys_unavailable");
 const document=await response.json();
 if(!Array.isArray(document.keys)||!document.keys.length)throw Error("auth_keys_unavailable");
 const maxAge=Number(/max-age=(\d+)/.exec(response.headers.get("cache-control")||"")?.[1]||300);
 keysCached=document.keys;
 keyExpiry=now+Math.max(60,Math.min(maxAge,3600))*1000;
 return keysCached;
}
export async function verifyFirebaseIdToken(request){
 const header=request.headers.get("Authorization")||"";
 if(!/^Bearer [A-Za-z0-9._-]+$/.test(header))throw Error("login_required");
 const token=header.slice(7);
 if(token.length>10000)throw Error("invalid_token");
 const parts=token.split(".");
 if(parts.length!==3)throw Error("invalid_token");
 let meta,body;
 try{meta=decodeJSON(parts[0]);body=decodeJSON(parts[1])}
 catch{throw Error("invalid_token")}
 if(meta.alg!=="RS256"||typeof meta.kid!=="string"||!meta.kid||typeof body!=="object"||body===null)throw Error("invalid_token");
 const now=Math.floor(Date.now()/1000);
 if(body.aud!==PROJECT_ID||body.iss!==ISSUER||
   typeof body.sub!=="string"||!body.sub||body.sub.length>128||
   !Number.isInteger(body.exp)||body.exp<=now||
   !Number.isInteger(body.iat)||body.iat>now||
   !Number.isInteger(body.auth_time)||body.auth_time>now||
   body.iat<0||body.auth_time<0)throw Error("invalid_token");
 let publicKey=(await keys()).find(k=>k.kid===meta.kid&&k.kty==="RSA");
 if(!publicKey)publicKey=(await keys(true)).find(k=>k.kid===meta.kid&&k.kty==="RSA");
 if(!publicKey)throw Error("invalid_token");
 try{
  const key=await crypto.subtle.importKey("jwk",publicKey,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const ok=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
  if(!ok)throw Error("invalid_token");
 }catch{throw Error("invalid_token")}
 return body.sub;
}
export const planEnabled=env=>env.ENFORCE_PLANS==="true";
// Optional sandbox-only grace for a previously VERIFIED paid entitlement.
// Disabled by default. Never extends a paid period or revives a revoked grant.
export function billingGraceSeconds(env={}) {
 const value=Number(env.BILLING_GRACE_SECONDS);
 return env.BILLING_MODE==="test" && Number.isInteger(value) && value>0 ? Math.min(value,600) : 0;
}
export function verifiedBillingEntitlement(row,env={},time=Math.floor(Date.now()/1000)) {
 const seconds=120+billingGraceSeconds(env);
 return row?.entitled===1 && Number.isInteger(row?.period_end) && row.period_end>time &&
  Number.isInteger(row?.synced_at) && row.synced_at<=time && row.synced_at>=time-seconds;
}
export const tokyoDay=(time=Date.now())=>new Date(time+9*3600000).toISOString().slice(0,10);
export function tokyoMonthBounds(time=Date.now()){
 const day=tokyoDay(time),year=Number(day.slice(0,4)),month=Number(day.slice(5,7));
 return {start:day.slice(0,7)+"-01",end:new Date(Date.UTC(year,month,1)).toISOString().slice(0,10)};
}
export const publicLimits=(tier,used)=>({
 plan:tier,limits:PLAN_LIMITS[tier]||PLAN_LIMITS.free,
 used:{sessions:Number(used?.sessions)||0,teacher:Number(used?.teacher)||0,
       monthlyTurns:Number(used?.monthlyTurns)||0,monthlyTeacher:Number(used?.monthlyTeacher)||0},
 day:tokyoDay(),month:tokyoDay().slice(0,7)
});
export async function getPlan(db,uid,env={}){
 // Sandbox and live Stripe customers never share a billing record.
 // Only a server-verified paid invoice and an explicitly enabled mode grants Pro.
 const mode=billingMode(env);
 // When an explicitly approved LIVE Stripe launch is enabled, legacy manual
 // beta grants must not silently bypass paid invoice verification. Paid access
 // requires both audience eligibility and an isolated verified live record.
 // Do not alter legacy manual grants while billing is disabled or in TEST.
 if(mode==='live' && !billingUserEligible(env,uid))return 'free';
 if((mode==='test'||mode==='live') && billingUserEligible(env,uid)){
  const table=mode==='live'?'billing_live_accounts':'billing_accounts';
  const billing=await db.prepare(
    'SELECT entitled,period_end,synced_at FROM '+table+' WHERE uid = ? AND customer_id IS NOT NULL'
  ).bind(uid).first();
  if(mode==='live'||billing)return billing&&verifiedBillingEntitlement(billing,env)?'pro':'free';
 }
 const row=await db.prepare("SELECT tier FROM account_plans WHERE uid = ?").bind(uid).first();
 return row?.tier==="pro"?"pro":"free";
}
async function usage(db,uid,day,tier){
 const row=await db.prepare(
 "SELECT (SELECT COUNT(*) FROM ai_sessions WHERE uid = ? AND day = ?) AS sessions, "+
 "(SELECT COUNT(*) FROM teacher_uses WHERE uid = ? AND day = ?) AS teacher"
 ).bind(uid,day,uid,day).first();
 const used={sessions:Number(row?.sessions)||0,teacher:Number(row?.teacher)||0};
 if(tier==="pro"){
  const month=tokyoMonthBounds();
  const monthly=await db.prepare(
   "SELECT (SELECT COALESCE(SUM(turns),0) FROM ai_sessions WHERE uid = ? AND day >= ? AND day < ?) AS monthlyTurns, "+
   "(SELECT COUNT(*) FROM teacher_uses WHERE uid = ? AND day >= ? AND day < ?) AS monthlyTeacher"
  ).bind(uid,month.start,month.end,uid,month.start,month.end).first();
  used.monthlyTurns=Number(monthly?.monthlyTurns)||0;
  used.monthlyTeacher=Number(monthly?.monthlyTeacher)||0;
 }
 return used;
}
export async function getEntitlement(db,uid,env={}){
 await requireFreeSessionReady(db,env);
 const tier=await getPlan(db,uid,env);
 if(freeSessionMode(env)&&tier==="free")await recoverFreeSessions(db,uid);
 const used=await usage(db,uid,tokyoDay(),tier);
 if(freeSessionMode(env)&&tier==="free")used.sessions=await confirmedFreeSessions(db,uid,tokyoDay());
 return publicLimits(tier,used);
}
export async function startSession(db,uid,env={}){
 await requireFreeSessionReady(db,env);
 const tier=await getPlan(db,uid,env);
 const max=PLAN_LIMITS[tier].sessions;
 const day=tokyoDay(),id=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
 if(tier==="free"&&freeSessionMode(env)){
  const created=await startFreeSession(db,{uid,day,id,now});
  return created?{sessionId:id,plan:tier,limits:PLAN_LIMITS[tier]}:null;
 }
 // Free daily quotas are checked atomically. Pro uses the current JST month's turn total.
 const month=tokyoMonthBounds();
 const row=tier==="pro"
  ? await db.prepare(
     "INSERT INTO ai_sessions (id,uid,day,started_at,expires_at,turns) "+
     "SELECT ?,?,?,?,?,0 WHERE (SELECT COALESCE(SUM(turns),0) FROM ai_sessions "+
     "WHERE uid = ? AND day >= ? AND day < ?) < ? RETURNING id"
    ).bind(id,uid,day,now,now+7*60,uid,month.start,month.end,PLAN_LIMITS.pro.monthlyTurns).first()
  : await db.prepare(
     "INSERT INTO ai_sessions (id,uid,day,started_at,expires_at,turns) "+
     "SELECT ?,?,?,?,?,0 WHERE (SELECT COUNT(*) FROM ai_sessions WHERE uid = ? AND day = ?) < ? RETURNING id"
    ).bind(id,uid,day,now,now+7*60,uid,day,max).first();
 return row?{sessionId:id,plan:tier,limits:PLAN_LIMITS[tier]}:null;
}
export async function consumeSessionTurn(db,uid,id,env={}){
 await requireFreeSessionReady(db,env);
 if(typeof id!=="string"||!/^[0-9a-f-]{36}$/.test(id))return false;
 const tier=await getPlan(db,uid,env),now=Math.floor(Date.now()/1000);
 if(ledgerMode(env)){
  await expireStaleTurns(db,uid);
  return reserveTurn(db,{uid,sessionId:id,tier});
 }
 if(tier==="pro"){
  const month=tokyoMonthBounds();
  // Single SQLite statement enforces monthly total even for concurrent requests.
  // A session started in the prior month cannot consume next month's allowance.
  const row=await db.prepare(
   "UPDATE ai_sessions SET turns=turns+1 WHERE id = ? AND uid = ? AND expires_at > ? "+
   "AND turns < 20 AND day >= ? AND day < ? "+
   "AND (SELECT COALESCE(SUM(turns),0) FROM ai_sessions WHERE uid = ? AND day >= ? AND day < ?) < ? RETURNING turns"
  ).bind(id,uid,now,month.start,month.end,uid,month.start,month.end,PLAN_LIMITS.pro.monthlyTurns).first();
  return row?{turn:Number(row.turns),sessionId:id,plan:tier}:null;
 }
 const row=await db.prepare(
  "UPDATE ai_sessions SET turns=turns+1 WHERE id = ? AND uid = ? AND expires_at > ? AND turns < 20 RETURNING turns"
 ).bind(id,uid,now).first();
 return row?{turn:Number(row.turns),sessionId:id,plan:tier}:null;
}
/** Complete only this exact ledger reservation after validated AI success. */
export async function completeSessionTurn(db,uid,reservation){
 if(!reservation?.ledger)return true;
 return finishTurn(db,uid,reservation);
}
/** Legacy conservative rollback; new opt-in ledger refunds by exact ID. */
export async function refundSessionTurn(db,uid,reservation){
 if(reservation?.ledger)return refundTurn(db,uid,reservation);
 if(!reservation||!Number.isInteger(reservation.turn)||reservation.turn<1||typeof reservation.sessionId!=="string")return false;
 const row=await db.prepare("UPDATE ai_sessions SET turns=turns-1 WHERE id = ? AND uid = ? AND turns = ? AND turns > 0 RETURNING turns")
  .bind(reservation.sessionId,uid,reservation.turn).first();
 return !!row;
}
export async function consumeTeacher(db,uid,env={}){
 const tier=await getPlan(db,uid,env);
 const day=tokyoDay(),now=Math.floor(Date.now()/1000),id=crypto.randomUUID();
 const month=tokyoMonthBounds();
 const row=tier==="pro"
  ? await db.prepare(
     "INSERT INTO teacher_uses (id,uid,day,created_at) "+
     "SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM teacher_uses "+
     "WHERE uid = ? AND day >= ? AND day < ?) < ? RETURNING id"
    ).bind(id,uid,day,now,uid,month.start,month.end,PLAN_LIMITS.pro.monthlyTeacher).first()
  : await db.prepare(
     "INSERT INTO teacher_uses (id,uid,day,created_at) "+
     "SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM teacher_uses WHERE uid = ? AND day = ?) < ? RETURNING id"
    ).bind(id,uid,day,now,uid,day,PLAN_LIMITS[tier].teacher).first();
 return row?{id,plan:tier}:null;
}
export async function refundTeacher(db,uid,id){
 await db.prepare("DELETE FROM teacher_uses WHERE id = ? AND uid = ?").bind(id,uid).run();
}
