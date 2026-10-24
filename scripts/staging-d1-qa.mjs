/**
 * Real Cloudflare D1 staging-only SQL invariant checks. No migrations, Workers,
 * production databases, billing, Firebase accounts or AI provider calls.
 * Requires a GitHub Actions secret with D1 edit permission, invoked manually.
 */
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {PRO_MONTHLY_TURN_LIMIT} from '../worker/turn-ledger.js';

// An immutable allowlist prevents production access even with a broad token.
export const STAGING_ACCOUNT_ID = '324c7361cbbaecd8240688b8bd588ef3';
export const STAGING_DATABASE_ID = 'c608774e-3bc5-4527-be8d-f640e386f504';
export const STAGING_NAME = 'speakingym-plans-staging';
const ROOT = `https://api.cloudflare.com/client/v4/accounts/${STAGING_ACCOUNT_ID}/d1/database/${STAGING_DATABASE_ID}`;
const REQUIRED_OBJECTS = ['ai_sessions', 'ai_turn_reservations', 'free_session_reservations',
  'ai_turn_reservation_count_insert', 'ai_turn_reservation_count_refund',
  'free_session_turn_guard', 'free_session_turn_settle', 'idx_free_session_account'];

export function assertSafeFixtureUid(uid) {
  if (!/^sgqa-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(failure|limits|starts|prolimits)$/.test(uid)) {
    throw new Error('Refusing to modify records outside isolated staging QA fixture');
  }
  return uid;
}
export function validateStagingIdentity(data) {
  if (data?.name !== STAGING_NAME || (data.uuid && data.uuid !== STAGING_DATABASE_ID)) {
    throw new Error('STOP: Expected staging D1 identity not confirmed');
  }
}
export function assertSchemaObjects(rows) {
  const names = new Set(rows.map(row => row?.name));
  const missing = REQUIRED_OBJECTS.filter(name => !names.has(name));
  if (missing.length) throw new Error('STOP: staging schema missing: ' + missing.join(', '));
}
export function ensureToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('STOP: SPEAKINGYM_D1_STAGING_TOKEN is not configured; no Cloudflare request made');
  }
  return token.trim();
}
function insist(condition, label) { if (!condition) throw new Error('FAIL: ' + label); }
function rowsNumber(rows, field) { return Number(rows[0]?.[field] ?? NaN); }
function todayJst() { return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); }
function timestamp() { return String(Math.floor(Date.now() / 1000)); }

export class StagingD1 {
  constructor(token, request = fetch) {
    this.token = ensureToken(token);
    this.request = request;
    this.verified = false;
  }
  async call(uri, method, body) {
    const response = await this.request(uri, {
      method,
      headers: {Authorization: `Bearer ${this.token}`,
        ...(body ? {'Content-Type': 'application/json'} : {})},
      ...(body ? {body: JSON.stringify(body)} : {}),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
      // Only numeric error codes; Cloudflare's message/body might contain secrets.
      let codes = [];
      try {
        const payload = await response.json();
        codes = (Array.isArray(payload?.errors) ? payload.errors : [])
          .map(error => Number(error?.code)).filter(Number.isSafeInteger).slice(0, 3);
      } catch { /* Unparseable error bodies are deliberately not logged. */ }
      throw new Error(`Cloudflare API returned HTTP ${response.status}` +
        (codes.length ? ` (codes ${codes.join(',')})` : ''));
    }
    const json = await response.json();
    if (!json.success) throw new Error('Cloudflare API rejected a staging request');
    return json.result;
  }
  async verify() {
    // Auth is verified separately, without opening any D1 database or writing data.
    // Return safe categories only; never print token contents or account/user data.
    let tokenStatus;
    try {
      tokenStatus = await this.call('https://api.cloudflare.com/client/v4/user/tokens/verify', 'GET');
    } catch (userError) {
      // Cloudflare publishes separate user-token and account-token verify URLs.
      // Some account-owned tokens return HTTP 401/code 1000 from the USER URL.
      // Try the ACCOUNT verify URL read-only in that exact case; a failed
      // second verification, wrong staging DB ID or missing schema still STOP.
      // Never fall back to a write or continue with an unverified token.
      const accountTokenResponse = userError.message.includes('HTTP 400') ||
        (userError.message.includes('HTTP 401') && userError.message.includes('codes 1000'));
      if (!accountTokenResponse) {
        throw new Error('STOP: user token verification failed (' + userError.message +
          '). Check GitHub secret, token permissions, expiry and IP restrictions. No D1 write attempted.');
      }
      try {
        tokenStatus = await this.call(`https://api.cloudflare.com/client/v4/accounts/${STAGING_ACCOUNT_ID}/tokens/verify`, 'GET');
      } catch (accountError) {
        throw new Error('STOP: user token verification: ' + userError.message +
          '; account token verification: ' + accountError.message +
          '. Check token type, secret value, expiry and IP restrictions. No D1 write attempted.');
      }
    }
    if (tokenStatus?.status !== 'active') {
      throw new Error('STOP: Cloudflare token status is not active. No D1 write attempted.');
    }
    const db = await this.call(ROOT, 'GET');
    validateStagingIdentity(db);
    const objects = await this.queryUnverified('SELECT name FROM sqlite_master WHERE name IN (' +
      REQUIRED_OBJECTS.map(() => '?').join(',') + ')', REQUIRED_OBJECTS);
    assertSchemaObjects(objects);
    this.verified = true;
  }
  async queryUnverified(sql, params = []) {
    // Query API supports parameter binding; never interpolate a user ID.
    const results = await this.call(`${ROOT}/query`, 'POST', {sql, params: params.map(v=>typeof v==='number'&&Number.isSafeInteger(v)?v:String(v))});
    if (!Array.isArray(results) || results.length !== 1 || results[0]?.success !== true) {
      throw new Error('Cloudflare D1 SQL execution did not succeed');
    }
    return results[0].results || [];
  }
  async query(sql, params = []) {
    if (!this.verified) throw new Error('STOP: staging database/schema not verified');
    return this.queryUnverified(sql, params);
  }
  async clean(uid) {
    assertSafeFixtureUid(uid);
    await this.query('DELETE FROM ai_turn_reservations WHERE uid=?', [uid]);
    await this.query('DELETE FROM free_session_reservations WHERE uid=?', [uid]);
    await this.query('DELETE FROM ai_sessions WHERE uid=?', [uid]);
    await this.query('DELETE FROM teacher_uses WHERE uid=?', [uid]);
    const remains = await this.query('SELECT COUNT(*) AS n FROM ai_sessions WHERE uid=?', [uid]);
    insist(rowsNumber(remains, 'n') === 0, 'staging QA session cleanup');
    const teacherRemains = await this.query('SELECT COUNT(*) AS n FROM teacher_uses WHERE uid=?', [uid]);
    insist(rowsNumber(teacherRemains,'n')===0, 'staging QA teacher cleanup');
  }
}

const sessionQuery = `INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns)
SELECT ?,?,?,?,?,0 WHERE (
 SELECT COUNT(*) FROM ai_sessions s WHERE s.uid=? AND s.day=? AND NOT EXISTS(
  SELECT 1 FROM free_session_reservations f
  WHERE f.session_id=s.id AND f.uid=s.uid AND f.state='released'
 ))<5 RETURNING id`;

async function newPendingSession(db, uid, day, used = 0) {
  const id = randomUUID();
  const now = timestamp();
  const rows = await db.query('INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) VALUES(?,?,?,?,?,?) RETURNING id',
    [id, uid, day, now, String(Number(now) + 420), used]);
  insist(rows.length === 1, 'insert staging session');
  await db.query("INSERT INTO free_session_reservations(session_id,uid,day,state) VALUES(?,?,?,'pending')", [id, uid, day]);
  return id;
}
async function reserve(db, uid, sessionId) {
  const id = randomUUID();
  const result = await db.query(`INSERT INTO ai_turn_reservations(id,session_id,uid,day,state,created_at)
SELECT ?,id,uid,day,'reserved',? FROM ai_sessions
WHERE id=? AND uid=? AND expires_at>? AND turns<20 RETURNING id`,
  [id, timestamp(), sessionId, uid, timestamp()]);
  return result.length ? id : null;
}
async function snapshot(db, uid, sessionId) {
  const rows = await db.query(`SELECT s.turns, f.state AS session_state,
 (SELECT COUNT(*) FROM ai_turn_reservations t WHERE t.session_id=s.id AND t.uid=s.uid AND t.state='reserved') AS pending_turns
 FROM ai_sessions s JOIN free_session_reservations f ON f.session_id=s.id AND f.uid=s.uid
 WHERE s.id=? AND s.uid=?`, [sessionId, uid]);
  insist(rows.length === 1, 'staging snapshot exists');
  return rows[0];
}


/** Only a fresh sgqa-...-prolimits uid; 49 generated prior sessions and one
 * active session let us hit 999/1000 with 2 SQL calls, not 1000 Gemini calls.
 * This exercises the same atomic predicates as the Worker's Pro ledger mode.
 * No account_plans/billing, real customers, production or Gemini API writes.
 */
export async function runStagingProQuotaQA(db,uid,day,log=console.log){
 assertSafeFixtureUid(uid);
 if(!uid.endsWith('-prolimits')||!db.verified)throw Error('STOP: Pro quota fixture scope');
 const yr=Number(day.slice(0,4)),month=Number(day.slice(5,7));
 const from=day.slice(0,7)+'-01';
 const through=new Date(Date.UTC(yr,month,1)).toISOString().slice(0,10);
 const now=timestamp(),expires=String(Number(now)+420);
 const active=randomUUID(),otherActive=randomUUID();
 // D1 SQLite recursive CTE inserts only a fixture's 49 sessions of 20
 // previously consumed turns, with zero provider usage/charges.
 await db.query(`WITH RECURSIVE seq(i) AS
   (SELECT 1 UNION ALL SELECT i+1 FROM seq WHERE i<49)
   INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns)
   SELECT ? || '-seed-' || i,?,?,?,?,20 FROM seq`,
  [uid,uid,day,now,expires]);
 await db.query('INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) VALUES(?,?,?,?,?,19)',
  [active,uid,day,now,expires]);
 // Keep another valid session for proving the 1000th month cap applies
 // across DIFFERENT sessions, not merely the 20-turn per-session cap.
 await db.query('INSERT INTO ai_sessions(id,uid,day,started_at,expires_at,turns) VALUES(?,?,?,?,?,0)',
 [otherActive,uid,day,now,expires]);
 const countTurns=async()=>rowsNumber(await db.query(
   'SELECT COALESCE(SUM(turns),0) AS n FROM ai_sessions WHERE uid=? AND day>=? AND day<?',
   [uid,from,through]),'n');
 insist((await countTurns())===999,'Pro fixture starts at 999 real D1 turns');
 const reserveLast=async(sessionId=active)=>{
  const id=randomUUID();
  const rows=await db.query(`INSERT INTO ai_turn_reservations(id,session_id,uid,day,state,created_at)
 SELECT ?,s.id,s.uid,s.day,'reserved',? FROM ai_sessions s
 WHERE s.id=? AND s.uid=? AND s.expires_at>? AND s.turns<20
 AND s.day>=? AND s.day<?
 AND (SELECT COALESCE(SUM(turns),0) FROM ai_sessions
 WHERE uid=? AND day>=? AND day<?)< ? RETURNING id`,
 [id,timestamp(),sessionId,uid,timestamp(),from,through,uid,from,through,PRO_MONTHLY_TURN_LIMIT]);
  return rows.length?id:null;
 };
 const outcomes=await Promise.allSettled([reserveLast(),reserveLast()]);
 insist(outcomes.every(r=>r.status==='fulfilled'),'Pro concurrent 1000th API calls complete');
 const accepted=outcomes.filter(r=>r.value?.length).map(r=>r.value);
 insist(accepted.length===1,'Pro last 1000th turn reserved exactly once');
 insist((await countTurns())===PRO_MONTHLY_TURN_LIMIT,'Pro 1000th turn limit held');
 insist((await reserveLast())===null,'Pro original session hit its own 20-turn cap');
 insist((await reserveLast(otherActive))===null,'Pro 1001st turn in DIFFERENT open session blocked monthly');
 await db.query("UPDATE ai_turn_reservations SET state='refunded' WHERE id=? AND uid=? AND state='reserved'",
 [accepted[0],uid]);
 insist((await countTurns())===999,'Pro failure returned final reserved turn');
 const acceptedAfterRefund=await reserveLast(otherActive);
 insist(!!acceptedAfterRefund,'Pro final slot available after refund');
 await db.query("UPDATE ai_turn_reservations SET state='completed' WHERE id=? AND uid=? AND state='reserved'",
 [acceptedAfterRefund,uid]);
 insist((await countTurns())===1000 && (await reserveLast())===null && (await reserveLast(otherActive))===null,
  'Pro completed 1000th turn cannot be overspent across sessions');
 log('PASS REAL staging Pro monthly 999→1000, concurrent final slot, 1001 blocked, refund/reuse');

 // 149 teacher uses inserted with one staging-only SQL statement; then use
 // the SAME atomic 150-use INSERT guard as the Worker. No AI calls.
 await db.query(`WITH RECURSIVE seq(i) AS
  (SELECT 1 UNION ALL SELECT i+1 FROM seq WHERE i<149)
  INSERT INTO teacher_uses(id,uid,day,created_at)
  SELECT ? || '-teacher-' || i,?,?,? FROM seq`,
 [uid,uid,day,now]);
 const countTeachers=async()=>rowsNumber(await db.query(
 'SELECT COUNT(*) AS n FROM teacher_uses WHERE uid=? AND day>=? AND day<?',
 [uid,from,through]),'n');
 insist((await countTeachers())===149,'Pro teacher fixture starts at 149');
 const reserveTeacher=async()=>{
  const id=randomUUID();
  const rows=await db.query(`INSERT INTO teacher_uses(id,uid,day,created_at)
 SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM teacher_uses
 WHERE uid=? AND day>=? AND day<?)<150 RETURNING id`,
 [id,uid,day,timestamp(),uid,from,through]);
  return rows.length?id:null;
 };
 const teacherOutcomes=await Promise.allSettled([reserveTeacher(),reserveTeacher()]);
 insist(teacherOutcomes.every(r=>r.status==='fulfilled'),'Pro concurrent 150th teacher API calls complete');
 insist(teacherOutcomes.filter(r=>!!r.value).length===1,
 'Only one simultaneous 150th Pro teacher use may succeed');
 insist((await countTeachers())===150 && (await reserveTeacher())===null,
  'Pro 150th use ceiling held and 151st blocked');
 log('PASS REAL staging Pro teacher 149→150, concurrent final slot, 151 blocked');
}

export async function runRemoteStagingQA(db, log = console.log) {
  if (!db.verified) throw new Error('STOP: identity verification required');
  const users = ['failure', 'limits', 'starts','prolimits'].map(label => assertSafeFixtureUid(`sgqa-${randomUUID()}-${label}`));
  const [failUid, limitUid, startUid, proUid] = users;
  const day = todayJst();
  let failed = false;
  try {
    // First request failure releases both turn count and the Free daily slot.
    const first = await newPendingSession(db, failUid, day);
    const failedTurn = await reserve(db, failUid, first);
    insist(!!failedTurn, 'first-turn reservation');
    insist(Number((await snapshot(db, failUid, first)).turns) === 1, 'first turn counted');
    await db.query("UPDATE ai_turn_reservations SET state='refunded' WHERE id=? AND uid=? AND state='reserved'", [failedTurn, failUid]);
    let snap = await snapshot(db, failUid, first);
    insist(Number(snap.turns) === 0 && snap.session_state === 'released', 'first response refunded and slot released');
    // Repeat refund must be inert, then retry reacquires the daily slot.
    await db.query("UPDATE ai_turn_reservations SET state='refunded' WHERE id=? AND uid=? AND state='reserved'", [failedTurn, failUid]);
    insist(Number((await snapshot(db, failUid, first)).turns) === 0, 'duplicate refund inert');
    const retryTurn = await reserve(db, failUid, first);
    insist(!!retryTurn, 'released session may retry');
    snap = await snapshot(db, failUid, first);
    insist(Number(snap.turns) === 1 && snap.session_state === 'pending', 'retry reacquired the Free slot');
    await db.query("UPDATE ai_turn_reservations SET state='completed' WHERE id=? AND uid=? AND state='reserved'", [retryTurn, failUid]);
    snap = await snapshot(db, failUid, first);
    insist(Number(snap.turns) === 1 && snap.session_state === 'completed', 'first success permanently confirms slot');
    log('PASS staging first failure, exactly-once refund, retry and success');

    // Two requests racing for the final session turn must produce one reservation.
    const last = await newPendingSession(db, limitUid, day, 19);
    const turnAttempts = await Promise.allSettled([reserve(db, limitUid, last), reserve(db, limitUid, last)]);
    insist(turnAttempts.every(r => r.status === 'fulfilled'), 'both concurrent turn API requests completed');
    const outcomes = turnAttempts.map(r => r.value);
    insist(outcomes.filter(Boolean).length === 1, 'concurrent reservation count at 20-turn boundary');
    snap = await snapshot(db, limitUid, last);
    insist(Number(snap.turns) === 20 && Number(snap.pending_turns) === 1, '20-turn boundary held');
    const wrongOwner = await reserve(db, failUid, last);
    insist(wrongOwner === null, 'other user must not reserve someone else\'s session');
    log('PASS staging concurrent final turn and cross-account isolation');

    // Six simultaneous starts, each with unique UUID, cannot exceed five slots.
    const starts = Array.from({length: 6}, () => randomUUID());
    const now = timestamp();
    const startAttempts = await Promise.allSettled(starts.map(id => db.query(sessionQuery,
      [id, startUid, day, now, String(Number(now)+420), startUid, day])));
    insist(startAttempts.every(r => r.status === 'fulfilled'), 'all six staging start API requests completed');
    const allowed = starts.filter((_, i) => startAttempts[i].value.length > 0);
    insist(allowed.length === 5, 'six concurrent starts must grant exactly five Free slots');
    await Promise.all(allowed.map(id => db.query(
      "INSERT INTO free_session_reservations(session_id,uid,day,state) VALUES(?,?,?,'pending')",
      [id, startUid, day])));
    const count = await db.query('SELECT COUNT(*) AS n FROM ai_sessions WHERE uid=? AND day=?', [startUid,day]);
    insist(rowsNumber(count, 'n') === 5, 'five-session daily ceiling held');
    log('PASS staging six simultaneous starts, five daily slots max');

    await runStagingProQuotaQA(db,proUid,day,log);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    const errors = [];
    for (const uid of users) {
      try { await db.clean(uid); } catch (err) { errors.push(`${uid.slice(0,5)}… cleanup failed`); }
    }
    if (errors.length) {
      const message = `QA fixture cleanup failed for ${errors.length} staging user(s). Requires manual staging-only review.`;
      if (!failed) throw new Error(message);
      log('WARNING ' + message);
    } else log('PASS staging fixture cleanup');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const db = new StagingD1(process.env.SPEAKINGYM_D1_STAGING_TOKEN);
    await db.verify();
    console.log('PASS verified staging-only D1 identity and migration 0002/0005 objects');
    await runRemoteStagingQA(db);
    console.log('PASS STAGING D1 QA COMPLETE (does not verify a deployed staging Worker)');
  } catch (error) {
    console.error(String(error?.message || error));
    process.exitCode = 1;
  }
}
