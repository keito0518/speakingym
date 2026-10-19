/**
 * Real Cloudflare D1 staging-only SQL invariant checks. No migrations, Workers,
 * production databases, billing, Firebase accounts or AI provider calls.
 * Requires a GitHub Actions secret with D1 edit permission, invoked manually.
 */
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

// An immutable allowlist prevents production access even with a broad token.
export const STAGING_ACCOUNT_ID = '324c7361cbbaecd8240688b8bd588ef3';
export const STAGING_DATABASE_ID = 'c608774e-3bc5-4527-be8d-f640e386f504';
export const STAGING_NAME = 'speakingym-plans-staging';
const ROOT = `https://api.cloudflare.com/client/v4/accounts/${STAGING_ACCOUNT_ID}/d1/database/${STAGING_DATABASE_ID}`;
const REQUIRED_OBJECTS = ['ai_sessions', 'ai_turn_reservations', 'free_session_reservations',
  'ai_turn_reservation_count_insert', 'ai_turn_reservation_count_refund',
  'free_session_turn_guard', 'free_session_turn_settle', 'idx_free_session_account'];

export function assertSafeFixtureUid(uid) {
  if (!/^sgqa-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(failure|limits|starts)$/.test(uid)) {
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
    if (!response.ok) throw new Error(`Cloudflare API returned HTTP ${response.status}`);
    const json = await response.json();
    if (!json.success) throw new Error('Cloudflare API rejected a staging request');
    return json.result;
  }
  async verify() {
    const db = await this.call(ROOT, 'GET');
    validateStagingIdentity(db);
    const objects = await this.queryUnverified('SELECT name FROM sqlite_master WHERE name IN (' +
      REQUIRED_OBJECTS.map(() => '?').join(',') + ')', REQUIRED_OBJECTS);
    assertSchemaObjects(objects);
    this.verified = true;
  }
  async queryUnverified(sql, params = []) {
    // Query API supports parameter binding; never interpolate a user ID.
    const results = await this.call(`${ROOT}/query`, 'POST', {sql, params: params.map(String)});
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
    const remains = await this.query('SELECT COUNT(*) AS n FROM ai_sessions WHERE uid=?', [uid]);
    insist(rowsNumber(remains, 'n') === 0, 'staging QA fixture cleanup');
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

export async function runRemoteStagingQA(db, log = console.log) {
  if (!db.verified) throw new Error('STOP: identity verification required');
  const users = ['failure', 'limits', 'starts'].map(label => assertSafeFixtureUid(`sgqa-${randomUUID()}-${label}`));
  const [failUid, limitUid, startUid] = users;
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
