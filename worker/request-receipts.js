/**
 * Staging-only idempotency receipt primitives. NOT called from ai-worker.js.
 * Database migration 0003, consent to short-lived AI response storage,
 * automatic cleanup scheduling, and 0002 turn-ledger rollout are mandatory
 * before opting in. Never log raw bodies, response_json, user IDs or hashes.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Replay is doubly gated; turning this on requires 0002, 0003 and 0004 first.
export const replayMode=env=>env?.AI_REPLAY_MODE==='enabled' && env?.TURN_LEDGER_MODE==='enabled' && env?.ENFORCE_PLANS==='true';

const MAX_JSON=8192;
const RECEIPT_SECONDS=7*24*3600;
const REPLY_SECONDS=10*60;
const PENDING_SECONDS=180;

function stable(value){
 if(Array.isArray(value))return value.map(stable);
 if(value && typeof value==='object'){
  const result={};
  for(const k of Object.keys(value).sort())result[k]=stable(value[k]);
  return result;
 }
 return value;
}
export function validReceiptKey({uid,sessionId,requestId}={}){
 return typeof uid==='string'&&uid.length>=1&&uid.length<=128&&
  typeof sessionId==='string'&&UUID.test(sessionId)&&
  typeof requestId==='string'&&UUID.test(requestId);
}
export async function bodyFingerprint(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid_request_body');
 // Only the fields influencing the generated answer participate in the digest.
 // Authentication and requestId are tracked independently.
 const payload={
  sessionId:body.sessionId,
  sceneId:body.sceneId??null,
  level:body.level??null,
  userText:body.userText??null,
  history:body.history??null,
  progress:body.progress??null,
  facts:body.facts??null
 };
 const canonical=JSON.stringify(stable(payload));
 if(!canonical||canonical.length>16000)throw Error('invalid_request_body');
 const bytes=new TextEncoder().encode(canonical);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function receiptSchemaReady(db){
 if(!db)return false;
 try{
  const res=await db.prepare("PRAGMA table_info(ai_request_receipts)").all();
  const columns=new Set((res.results||res||[]).map(row=>row.name));
  return ['uid','session_id','request_id','body_sha256','state','status',
   'response_json','turn_reservation_id','created_at','expires_at','response_expires_at']
   .every(name=>columns.has(name));
 }catch{return false}
}
/** Checks the exact schema needed for atomic receipt + quota settlement. */
export async function replayBridgeReady(db){
 if(!await receiptSchemaReady(db))return false;
 try{
  const result=await db.prepare("SELECT name FROM sqlite_master WHERE (type='trigger' AND name IN ('ai_request_receipt_complete_turn','ai_request_receipt_fail_turn')) OR (type='index' AND name='idx_ai_request_receipt_turn_unique')").all();
  const names=new Set((result?.results||result||[]).map(row=>row.name));
  return names.has('ai_request_receipt_complete_turn')&&names.has('ai_request_receipt_fail_turn')&&names.has('idx_ai_request_receipt_turn_unique');
 }catch{return false}
}
/** Bind an already-reserved turn to its sole authenticated request ID.
 * On crash before this step, the older ledger's stale-turn refund provides
 * conservative recovery. The caller must never issue Gemini before linkage.
 */
export async function linkReceiptTurn(db,{uid,sessionId,requestId,digest,reservationId}){
 if(!validReceiptKey({uid,sessionId,requestId})||!UUID.test(reservationId||'')||
  !/^[a-f0-9]{64}$/.test(digest||''))return false;
 const row=await db.prepare(
  "UPDATE ai_request_receipts SET turn_reservation_id=? WHERE uid=? AND session_id=? "+
  "AND request_id=? AND body_sha256=? AND state='pending' AND turn_reservation_id IS NULL "+
  "AND EXISTS(SELECT 1 FROM ai_turn_reservations WHERE id=? AND uid=? AND session_id=? AND state='reserved') "+
  "RETURNING request_id"
 ).bind(reservationId,uid,sessionId,requestId,digest,reservationId,uid,sessionId).first();
 return !!row;
}
function receiptOutcome(row,digest,now){
 if(row.body_sha256!==digest)return {kind:'conflict'};
 if(row.state==='failed')return {kind:'failed',status:row.status||503};
 if(row.state==='completed'){
  if(now>=row.response_expires_at||!row.response_json)return {kind:'expired'};
  try{
   const payload=JSON.parse(row.response_json);
   if(!payload||typeof payload!=='object'||typeof payload.reply!=='string')
    return {kind:'expired'};
   return {kind:'replay',status:200,payload};
  }catch{return {kind:'expired'}}
 }
 if(row.state==='pending'){
  return {kind:now-row.created_at>=PENDING_SECONDS?'uncertain':'pending'};
 }
 return {kind:'expired'};
}
export async function claimReceipt(db,{uid,sessionId,requestId,body,now=Math.floor(Date.now()/1000)}){
 if(!validReceiptKey({uid,sessionId,requestId})||!Number.isInteger(now)||now<=0)
  return {kind:'invalid'};
 const digest=await bodyFingerprint(body);
 if(body.sessionId!==sessionId)return {kind:'conflict'};
 const find="SELECT body_sha256,state,status,response_json,created_at,expires_at,response_expires_at "+
  "FROM ai_request_receipts WHERE uid=? AND session_id=? AND request_id=?";
 let existing=await db.prepare(find).bind(uid,sessionId,requestId).first();
 if(existing)return receiptOutcome(existing,digest,now);
 // New claim requires an authenticated, still-active session. This conditional
 // INSERT and its composite unique constraint are atomic across concurrent calls.
 const created=await db.prepare(
  "INSERT OR IGNORE INTO ai_request_receipts(uid,session_id,request_id,body_sha256,state,status,"+
  "response_json,turn_reservation_id,created_at,expires_at,response_expires_at) "+
  "SELECT ?,?,?,?,'pending',NULL,NULL,NULL,?,?,? WHERE EXISTS "+
  "(SELECT 1 FROM ai_sessions WHERE id=? AND uid=? AND expires_at>?) RETURNING request_id"
 ).bind(uid,sessionId,requestId,digest,now,now+RECEIPT_SECONDS,now+REPLY_SECONDS,
  sessionId,uid,now).first();
 if(created)return {kind:'new',digest};
 // Lost the race, or an invalid session: distinguish safely without charging.
 existing=await db.prepare(find).bind(uid,sessionId,requestId).first();
 return existing?receiptOutcome(existing,digest,now):{kind:'not_active'};
}
export async function completeReceipt(db,{uid,sessionId,requestId,digest,payload,now=Math.floor(Date.now()/1000)}){
 if(!validReceiptKey({uid,sessionId,requestId})||!(/^[0-9a-f]{64}$/.test(digest||'')))return false;
 if(!payload||typeof payload!=='object'||typeof payload.reply!=='string'||!payload.reply.trim()||
  payload.reply.length>850) return false;
 const response=JSON.stringify(payload);
 if(response.length>MAX_JSON)return false;
 // Only the correct account, conversation and exact request body can settle it.
 const row=await db.prepare("UPDATE ai_request_receipts SET state='completed',status=200,response_json=? "+
  "WHERE uid=? AND session_id=? AND request_id=? AND body_sha256=? AND state='pending' "+
  "AND response_expires_at>? RETURNING request_id"
 ).bind(response,uid,sessionId,requestId,digest,now).first();
 return !!row;
}
export async function failReceipt(db,{uid,sessionId,requestId,digest,status=503}){
 if(!validReceiptKey({uid,sessionId,requestId})||!(/^[0-9a-f]{64}$/.test(digest||''))||
  !Number.isInteger(status)||status<400||status>599)return false;
 const row=await db.prepare("UPDATE ai_request_receipts SET state='failed',status=? "+
  "WHERE uid=? AND session_id=? AND request_id=? AND body_sha256=? AND state='pending' "+
  "RETURNING request_id"
 ).bind(status,uid,sessionId,requestId,digest).first();
 return !!row;
}
export async function purgeReceipts(db,now=Math.floor(Date.now()/1000)){
 if(!Number.isInteger(now)||now<=0)throw Error('invalid_time');
 // Schedule this with Cloudflare Cron BEFORE enabling. Tombstones remain for
 // seven days to avoid immediate replay becoming a second billable model call.
 const redacted=await db.prepare(
  "UPDATE ai_request_receipts SET response_json=NULL WHERE response_json IS NOT NULL AND response_expires_at<=?"
 ).bind(now).run();
 const deleted=await db.prepare("DELETE FROM ai_request_receipts WHERE expires_at<=?").bind(now).run();
 return {redacted:Number(redacted?.meta?.changes)||0,deleted:Number(deleted?.meta?.changes)||0};
}
