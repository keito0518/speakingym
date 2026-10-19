/**
 * GET-only, no credentials, no AI calls and no writes.
 * Run after deploying a separately bound staging Worker.
 * node scripts/staging-worker-smoke.mjs https://speakingym-survival-ai-staging.<subdomain>.workers.dev
 */
import {pathToFileURL} from 'node:url';

export function stagingHealthUrl(input) {
  if (!input || typeof input !== 'string') throw Error('Staging Worker URL is required');
  let uri;
  try { uri=new URL(input); } catch { throw Error('Invalid staging Worker URL'); }
  if (uri.protocol!=='https:' || uri.username || uri.password || uri.port ||
    !/^speakingym-survival-ai-staging\.[a-z0-9-]+\.workers\.dev$/.test(uri.hostname) ||
    (uri.pathname!=='/' && uri.pathname!=='/health') || uri.search || uri.hash) {
    throw Error('Refusing non-staging or non-HTTPS Worker URL');
  }
  uri.pathname='/health';
  return uri.toString();
}
export function assertSafeStagingHealth(data) {
  if (data?.status!=='ok') throw Error('Staging health status is not ok');
  const ready=['plansEnabled','plansReady','turnLedgerEnabled','turnLedgerSchemaReady','freeSessionSchemaReady'];
  const disabled=['aiEnabled','freeSessionRequested','freeSessionEnabled','aiReplayRequested','aiReplayEnabled'];
  for(const key of ready)if(data[key]!==true)throw Error('Staging readiness check failed: '+key);
  for(const key of disabled)if(data[key]!==false)throw Error('Staging safety flag must be OFF: '+key);
  if (data.billingMode!=='disabled') throw Error('Staging billing must be disabled');
  if (!Array.isArray(data.sceneIds) || data.sceneIds.length!==16) throw Error('Expected 16 scenes');
  return true;
}
export async function checkStagingHealth(input, request=fetch) {
  const url=stagingHealthUrl(input);
  const response=await request(url,{method:'GET',signal:AbortSignal.timeout(20000)});
  if (!response.ok)throw Error('Staging /health returned HTTP '+response.status);
  const data=await response.json();
  assertSafeStagingHealth(data);
  return {url,status:'ok',scenes:data.sceneIds.length};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const result=await checkStagingHealth(process.argv[2]);
    console.log('PASS isolated staging Worker: '+result.scenes+
      ' scenes, D1 ledger/Free schemas ready, AI/Free feature/billing/replay disabled');
  } catch(error) {
    console.error('FAIL '+String(error?.message||error));
    process.exitCode=1;
  }
}
