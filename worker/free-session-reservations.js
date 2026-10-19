/** New Free sessions only; disabled until separately approved staging/production rollout. */
import {ledgerMode,ledgerSchemaReady,expireStaleTurns} from './turn-ledger.js';
export const freeSessionMode=env=>env?.FREE_SESSION_MODE==='enabled' && ledgerMode(env);
export async function freeSessionSchemaReady(db){
 if(!db)return false;
 try{
  const rows=await db.prepare("SELECT name FROM sqlite_master WHERE (type='table' AND name='free_session_reservations') OR (type='trigger' AND name IN ('free_session_turn_guard','free_session_turn_settle')) OR (type='index' AND name='idx_free_session_account')").all();
  const names=new Set((rows.results||rows||[]).map(r=>r.name));
  return ['free_session_reservations','free_session_turn_guard','free_session_turn_settle','idx_free_session_account'].every(n=>names.has(n));
 }catch{return false}
}
export async function requireFreeSessionReady(db,env){
 if(env?.FREE_SESSION_MODE!=='enabled')return;
 if(!freeSessionMode(env)||!await ledgerSchemaReady(db)||!await freeSessionSchemaReady(db))throw Error('free_sessions_not_ready');
}
export async function recoverFreeSessions(db,uid){
 await expireStaleTurns(db,uid);
 // Abandoned session starts have a finite lease. Never release a completed session.
 await db.prepare("UPDATE free_session_reservations SET state='released' WHERE uid=? AND state='pending' "+
  "AND EXISTS(SELECT 1 FROM ai_sessions s WHERE s.id=session_id AND s.uid=? AND s.expires_at<=?) "+
  "AND NOT EXISTS(SELECT 1 FROM ai_turn_reservations t WHERE t.session_id=free_session_reservations.session_id AND t.uid=? AND t.state IN ('reserved','completed'))")
  .bind(uid,uid,Math.floor(Date.now()/1000),uid).run();
}
export async function startFreeSession(db,{uid,day,id,now}){
 await recoverFreeSessions(db,uid);
 // D1 batch is transactional: no unmarked session can survive a failed marker insert.
 const result=await db.batch([
  db.prepare("INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) SELECT ?,?,?,?,?,0 "+
   "WHERE (SELECT COUNT(*) FROM ai_sessions s WHERE s.uid=? AND s.day=? AND NOT EXISTS("+
   "SELECT 1 FROM free_session_reservations f WHERE f.session_id=s.id AND f.uid=s.uid AND f.state='released'))<5 RETURNING id")
   .bind(id,uid,day,now,now+420,uid,day),
  db.prepare("INSERT INTO free_session_reservations(session_id,uid,day,state) SELECT id,uid,day,'pending' FROM ai_sessions WHERE id=? AND uid=?")
   .bind(id,uid)
 ]);
 return !!result[0]?.results?.length;
}
export async function confirmedFreeSessions(db,uid,day){
 const row=await db.prepare("SELECT COUNT(*) AS sessions FROM ai_sessions s WHERE s.uid=? AND s.day=? AND NOT EXISTS("+
  "SELECT 1 FROM free_session_reservations f WHERE f.session_id=s.id AND f.uid=s.uid AND f.state!='completed')").bind(uid,day).first();
 return Number(row?.sessions)||0;
}
