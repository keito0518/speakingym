/**
 * Isolated staging D1 billing schema gate.
 * Default: read-only diagnostics. --apply: additive 0001 migration to staging D1
 * only, guarded by Wrangler remote database name AND immutable UUID.
 * Never supplies or creates Stripe keys, products, webhooks, live billing, or AI.
 * Credentials are read by Wrangler from its local OAuth login, not this script.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';

export const STAGING_NAME='speakingym-plans-staging';
export const STAGING_UUID='c608774e-3bc5-4527-be8d-f640e386f504';
export const STAGING_WORKER='speakingym-survival-ai-staging';
const SCRIPT_DIR=dirname(fileURLToPath(import.meta.url));
const WORKER_DIR=resolve(SCRIPT_DIR,'../worker');
const CONFIG_PATH=resolve(WORKER_DIR,'wrangler.staging.toml');
const MIGRATION_PATH=resolve(WORKER_DIR,'migrations/0001-billing.sql');

export function assertStagingConfig(config,migration){
 const required=[
  'name = "'+STAGING_WORKER+'"',
  'database_name = "'+STAGING_NAME+'"',
  'database_id = "'+STAGING_UUID+'"',
  'STAGING_HEALTH_ONLY = "true"',
  'ALLOW_AI = "false"',
  'BILLING_MODE = "disabled"',
 ];
 if(required.some(v=>!config.includes(v)))
  throw Error('STOP: stage config identity/safety did not match; no D1 writes');
 const sql=migration.replace(/^\s*--.*$/gm,'');
 if(!/CREATE TABLE IF NOT EXISTS billing_accounts\s*\(/i.test(sql)||
    !/CREATE TABLE IF NOT EXISTS billing_events\s*\(/i.test(sql)||
    /\b(DROP|ALTER|DELETE|UPDATE|INSERT|REPLACE|ATTACH|PRAGMA)\b/i.test(sql))
  throw Error('STOP: migration contains unexpected SQL; no D1 writes');
 return true;
}
export function assertRemoteIdentity(data){
 const info=Array.isArray(data)?data[0]:data;
 const uuid=info?.uuid||info?.id||info?.database_id;
 if(info?.name!==STAGING_NAME||uuid!==STAGING_UUID)
  throw Error('STOP: remote D1 UUID/name mismatch; no D1 writes');
 return true;
}
export function extractTableNames(data){
 const blocks=Array.isArray(data)?data:[data];
 const names=new Set();
 for(const block of blocks){
  if(block?.success===false)throw Error('STOP: D1 query unsuccessful');
  const rows=block?.results||block?.result?.results;
  if(!Array.isArray(rows))throw Error('STOP: unrecognized D1 JSON; no D1 writes');
  for(const row of rows)if(typeof row?.name==='string')names.add(row.name);
 }
 return names;
}
export function chooseMigration(tableNames){
 const required=['account_plans','ai_sessions','ai_turn_reservations','free_session_reservations','teacher_uses'];
 if(required.some(name=>!tableNames.has(name)))
  throw Error('STOP: staging base schema missing; no D1 writes');
 const hasAccounts=tableNames.has('billing_accounts');
 const hasEvents=tableNames.has('billing_events');
 if(hasAccounts!==hasEvents)throw Error('STOP: partial billing schema; manual staging review required');
 return hasAccounts?'already-ready':'additive-migration-needed';
}
export function buildWranglerArgs(kind){
 const common=['--config','wrangler.staging.toml'];
 switch(kind){
  case 'identity':return ['d1','info',STAGING_NAME,...common,'--json'];
  case 'tables':return ['d1','execute',STAGING_NAME,'--remote',...common,
   '--command',"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",'--json'];
  case 'migrate':return ['d1','execute',STAGING_NAME,'--remote',...common,
   '--file','migrations/0001-billing.sql','--yes','--json'];
  default:throw Error('Refusing unknown staging command');
 }
}

function wrangler(kind){
 const bin=process.platform==='win32'?'npx.cmd':'npx';
 const result=spawnSync(bin,['--yes','wrangler@4',...buildWranglerArgs(kind)],{
  cwd:WORKER_DIR,encoding:'utf8',timeout:150000,maxBuffer:1024*1024,
  windowsHide:true,shell:process.platform==='win32'});
 if(result.error||result.status!==0)throw Error('STOP: Wrangler '+kind+' failed; check local Cloudflare login and staging permissions');
 try{return JSON.parse(result.stdout)}
 catch{throw Error('STOP: Wrangler '+kind+' did not return expected JSON')}
}
export async function run({apply=false,execute=wrangler}={}){
 assertStagingConfig(readFileSync(CONFIG_PATH,'utf8'),readFileSync(MIGRATION_PATH,'utf8'));
 assertRemoteIdentity(await execute('identity'));
 const before=extractTableNames(await execute('tables'));
 const decision=chooseMigration(before);
 if(!apply)return {stage:'verified',migration:decision,changed:false};
 if(decision==='already-ready')return {stage:'verified',migration:'already-ready',changed:false};
 await execute('migrate');
 const after=extractTableNames(await execute('tables'));
 if(!after.has('billing_accounts')||!after.has('billing_events'))
  throw Error('STOP: staging billing schema verification failed');
 return {stage:'verified',migration:'applied',changed:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const apply=process.argv.slice(2).includes('--apply');
 if(process.argv.slice(2).some(a=>a!=='--apply')){console.error('STOP: unsupported argument');process.exit(1)}
 try{
  const result=await run({apply});
  console.log('PASS staging billing D1 schema gate: '+JSON.stringify(result));
  if(!apply)console.log('Read-only check. Use --apply only for the staging-only additive migration.');
 }catch(e){console.error(String(e?.message||'STOP: unknown staging error'));process.exitCode=1}
}
