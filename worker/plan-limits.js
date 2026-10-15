/**
 * Server-authoritative beta plans. No payment API, customer input or Firestore
 * document is allowed to elevate a user's tier. Free-tier Cloudflare D1 only.
 * ENFORCE_PLANS=true activates these checks after D1 setup is complete.
 */
const PROJECT_ID="speakingym";
const JWKS_URL="https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const ISSUER="https://securetoken.google.com/"+PROJECT_ID;
export const PLAN_LIMITS=Object.freeze({
 free:Object.freeze({sessions:3,teacher:1}),
 pro:Object.freeze({sessions:20,teacher:10})
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
async function keys(){
 const now=Date.now();
 if(keysCached&&now<keyExpiry)return keysCached;
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
 const publicKey=(await keys()).find(k=>k.kid===meta.kid&&k.kty==="RSA");
 if(!publicKey)throw Error("invalid_token");
 try{
  const key=await crypto.subtle.importKey("jwk",publicKey,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const ok=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
  if(!ok)throw Error("invalid_token");
 }catch{throw Error("invalid_token")}
 return body.sub;
}
export const planEnabled=env=>env.ENFORCE_PLANS==="true";
export const tokyoDay=(time=Date.now())=>new Date(time+9*3600000).toISOString().slice(0,10);
export const publicLimits=(tier,used)=>({
 plan:tier,limits:PLAN_LIMITS[tier]||PLAN_LIMITS.free,
 used:{sessions:Number(used?.sessions)||0,teacher:Number(used?.teacher)||0},
 day:tokyoDay()
});
export async function getPlan(db,uid){
 const row=await db.prepare("SELECT tier FROM account_plans WHERE uid = ?").bind(uid).first();
 return row?.tier==="pro"?"pro":"free";
}
async function usage(db,uid,day){
 const row=await db.prepare(
 "SELECT (SELECT COUNT(*) FROM ai_sessions WHERE uid = ? AND day = ?) AS sessions, "+
 "(SELECT COUNT(*) FROM teacher_uses WHERE uid = ? AND day = ?) AS teacher"
 ).bind(uid,day,uid,day).first();
 return {sessions:Number(row?.sessions)||0,teacher:Number(row?.teacher)||0};
}
export async function getEntitlement(db,uid){
 const tier=await getPlan(db,uid);
 const used=await usage(db,uid,tokyoDay());
 return publicLimits(tier,used);
}
export async function startSession(db,uid){
 const tier=await getPlan(db,uid);
 const max=PLAN_LIMITS[tier].sessions;
 const day=tokyoDay(),id=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
 // The SELECT and INSERT happen atomically as one SQLite statement.
 const row=await db.prepare(
  "INSERT INTO ai_sessions (id,uid,day,started_at,expires_at,turns) "+
  "SELECT ?,?,?,?,?,0 WHERE (SELECT COUNT(*) FROM ai_sessions WHERE uid = ? AND day = ?) < ? RETURNING id"
 ).bind(id,uid,day,now,now+7*60,uid,day,max).first();
 return row?{sessionId:id,plan:tier,limits:PLAN_LIMITS[tier]}:null;
}
export async function consumeSessionTurn(db,uid,id){
 if(typeof id!=="string"||!/^[0-9a-f-]{36}$/.test(id))return false;
 const row=await db.prepare(
  "UPDATE ai_sessions SET turns=turns+1 WHERE id = ? AND uid = ? AND expires_at > ? AND turns < 20 RETURNING turns"
 ).bind(id,uid,Math.floor(Date.now()/1000)).first();
 return !!row;
}
export async function consumeTeacher(db,uid){
 const tier=await getPlan(db,uid);
 const day=tokyoDay(),now=Math.floor(Date.now()/1000),id=crypto.randomUUID();
 const row=await db.prepare(
  "INSERT INTO teacher_uses (id,uid,day,created_at) "+
  "SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM teacher_uses WHERE uid = ? AND day = ?) < ? RETURNING id"
 ).bind(id,uid,day,now,uid,day,PLAN_LIMITS[tier].teacher).first();
 return row?{id,plan:tier}:null;
}
export async function refundTeacher(db,uid,id){
 await db.prepare("DELETE FROM teacher_uses WHERE id = ? AND uid = ?").bind(id,uid).run();
}
