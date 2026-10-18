/**
 * Isolated, opt-in D1 reservation engine. This module does nothing without a caller.
 * Requires migrations/0002-ai-turn-ledger.sql BEFORE use. Does not change billing.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function tokyoBounds(time){
 const iso=new Date(time+9*3600000).toISOString();
 const y=Number(iso.slice(0,4)),m=Number(iso.slice(5,7));
 return {start:iso.slice(0,7)+'-01',end:new Date(Date.UTC(y,m,1)).toISOString().slice(0,10)};
}
export function ledgerMode(env={}) {return env.TURN_LEDGER_MODE === 'enabled' && env.ENFORCE_PLANS === 'true'}
export async function reserveTurn(db,{uid,sessionId,tier,time=Date.now()}){
 if(typeof uid!=='string'||uid.length<1||uid.length>128||typeof sessionId!=='string'||!UUID.test(sessionId)||!['free','pro'].includes(tier))return null;
 const id=crypto.randomUUID(),now=Math.floor(time/1000),mon=tokyoBounds(time);
 // Each INSERT and its AFTER INSERT trigger are a single SQLite statement.
 // Old session.turns remain in the quota total; there is no counter migration.
 const query=tier==='pro'
  ? "INSERT INTO ai_turn_reservations(id,session_id,uid,day,state,created_at) "+
    "SELECT ?,s.id,s.uid,s.day,'reserved',? FROM ai_sessions s "+
    "WHERE s.id=? AND s.uid=? AND s.expires_at>? AND s.turns<20 "+
    "AND s.day>=? AND s.day<? "+
    "AND (SELECT COALESCE(SUM(turns),0) FROM ai_sessions "+
    "WHERE uid=? AND day>=? AND day<?)<600 RETURNING id"
  : "INSERT INTO ai_turn_reservations(id,session_id,uid,day,state,created_at) "+
    "SELECT ?,s.id,s.uid,s.day,'reserved',? FROM ai_sessions s "+
    "WHERE s.id=? AND s.uid=? AND s.expires_at>? AND s.turns<20 RETURNING id";
 const params=tier==='pro'?[id,now,sessionId,uid,now,mon.start,mon.end,uid,mon.start,mon.end]:[id,now,sessionId,uid,now];
 const row=await db.prepare(query).bind(...params).first();
 return row?{id,sessionId,plan:tier,ledger:true}:null;
}
export async function finishTurn(db,uid,reservation){
 if(!reservation||typeof uid!=='string'||!UUID.test(reservation.id))return false;
 const row=await db.prepare("UPDATE ai_turn_reservations SET state='completed' WHERE id=? AND uid=? AND state='reserved' RETURNING id")
  .bind(reservation.id,uid).first();
 return !!row;
}
export async function refundTurn(db,uid,reservation){
 if(!reservation||typeof uid!=='string'||!UUID.test(reservation.id))return false;
 const row=await db.prepare("UPDATE ai_turn_reservations SET state='refunded' WHERE id=? AND uid=? AND state='reserved' RETURNING id")
  .bind(reservation.id,uid).first();
 return !!row;
}
export async function expireStaleTurns(db,uid,time=Date.now(),staleAfterSeconds=180){
 // Worker Gemini timeout is at 20s. A 3-minute window avoids refunding an in-flight call.
 if(typeof uid!=='string'||uid.length<1||uid.length>128||!Number.isInteger(staleAfterSeconds)||staleAfterSeconds<120)return 0;
 const cutoff=Math.floor(time/1000)-staleAfterSeconds;
 const {meta}=await db.prepare("UPDATE ai_turn_reservations SET state='refunded' WHERE uid=? AND state='reserved' AND created_at<?")
  .bind(uid,cutoff).run();
 return Number(meta?.changes)||0;
}
