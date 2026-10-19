// Production launch smoke checks are deliberately read-only.
// No authenticated requests, model generations, checkout, or quota mutations.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const SITE='https://speakingym.pages.dev/';
const API='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function runSmoke(fetcher=fetch,{maxAttempts=8,retryDelayMs=8000,logger=console}={}){
 async function attempt(url,validate,init={}){
  let lastError;
  for(let i=0;i<maxAttempts;i++){
   try{
    const response=await fetcher(url,{
     ...init,headers:{Accept:'application/json,text/html',...(init.headers||{})},
     cache:'no-store',signal:AbortSignal.timeout(12000)
    });
    const expected=init.method==='OPTIONS'?204:200;
    assert.equal(response.status,expected,'Unexpected HTTP status '+response.status+' from '+url);
    const body=expected===204?'':await response.text();
    if(expected!==204)assert.ok(body.length>0&&body.length<500000,'Invalid body length from '+url);
    const result=validate(body,response);
    logger.log('PASS '+url+' '+JSON.stringify(result));
    return result;
   }catch(error){
    lastError=error;
    logger.warn('Retry '+(i+1)+'/'+maxAttempts+' '+url+': '+String(error?.message||error).slice(0,180));
    if(i<maxAttempts-1)await sleep(retryDelayMs);
   }
  }
  throw new Error('Production smoke failed for '+url+': '+lastError?.message);
 }
 const pages=[
  ['','home',/Speakingym/i,/60秒チャレンジ/],
  ['account.html','account',/My Learning Space|マイページ/i,/60秒チャレンジ/],
  ['reflex.html','sprint',/60秒スプリント|60秒チャレンジ/,/id="start"/],
  ['scenes.html','scenes',/AIシーン練習/,/id="start"/],
  ['phrasebook.html','phrasebook',/共通フレーズ帳/,/id="phrases"/],
  ['plans.html','plans',/料金・利用プラン/,/680/],
  ['speech-settings.js','speech',/window\.speakingymSpeech/,/speechSynthesis/],
  ['phrasebook.js','phrases',/window\.speakingymPhrases/,/localStorage/],
  ['analytics-events.js','analytics',/speakingymAnalytics/,/sg_ai_first_reply/],
  ['analytics-config.js','ga4-config',/SPEAKINGYM_GA4_ID/,/Empty means OFF/],
  ['analytics-loader.js','ga4-loader',/SPEAKINGYM_GA4_READY/,/www.googletagmanager.com/],
  ['robots.txt','robots',/User.agent:/,/Sitemap:/],
  ['sitemap.xml','sitemap',/urlset/,/scenes.html/]
 ];
 for(const [path,kind,title,feature] of pages){
  await attempt(SITE+path,body=>{
   assert.match(body,title,kind+' title missing');
   assert.match(body,feature,kind+' key feature missing');
   if(kind==='scenes'){
    const keys=[...body.matchAll(/data-scene="([a-z]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(keys).size,16,'16 distinct scene cards required');
   }
   return {page:kind};
  });
 }
 const health=await attempt(API+'health',body=>{
  const data=JSON.parse(body);
  assert.equal(data.status,'ok');
  assert.equal(data.quotaVersion,'pro-monthly-600-100-v2');
  assert.equal(data.aiEnabled,true,'AI kill switch is OFF: paid users cannot chat');
  assert.equal(data.aiConfigured,true,'Gemini API key or enable flag missing');
  assert.equal(data.keyConfigured,true);
  assert.equal(data.plansEnabled,true);
  assert.equal(data.plansReady,true);
  assert.equal(typeof data.turnLedgerEnabled,'boolean','Ledger switch status must be available');
  assert.equal(typeof data.turnLedgerSchemaReady,'boolean','D1 ledger migration status must be available');
  if(data.turnLedgerEnabled)assert.equal(data.turnLedgerSchemaReady,true,'Ledger must not run before D1 migration');
  assert.equal(typeof data.freeSessionRequested,'boolean');
  assert.equal(typeof data.freeSessionEnabled,'boolean');
  assert.equal(typeof data.freeSessionSchemaReady,'boolean');
  if(data.freeSessionRequested){
   assert.equal(data.freeSessionEnabled,true,'Free session recovery requires turn ledger enforcement');
   assert.equal(data.freeSessionSchemaReady,true,'Free session recovery requires migration 0005');
  }
  assert.equal(typeof data.aiReplayRequested,'boolean','Replay request switch must be available');
  assert.equal(typeof data.aiReplayEnabled,'boolean','Replay activation state must be available');
  assert.equal(typeof data.aiReplaySchemaReady,'boolean','Atomic replay bridge must be verifiable');
  if(data.aiReplayRequested){
   assert.equal(data.aiReplayEnabled,true,'Replay cannot be on without plan and turn ledger enforcement');
   assert.equal(data.aiReplaySchemaReady,true,'Replay cannot be on before all three D1 migrations');
  }
  assert.ok(Array.isArray(data.sceneIds)&&new Set(data.sceneIds).size>=16,'16 unique Worker scenes required');
  assert.ok(['test','disabled'].includes(data.billingMode),'Live billing must stay disabled');
  return {status:data.status,scenes:data.sceneIds.length,model:data.model,
   aiConfigured:data.aiConfigured,billingMode:data.billingMode,
   turnLedgerEnabled:data.turnLedgerEnabled,turnLedgerSchemaReady:data.turnLedgerSchemaReady,
   freeSessionRequested:data.freeSessionRequested,freeSessionEnabled:data.freeSessionEnabled,freeSessionSchemaReady:data.freeSessionSchemaReady,
   aiReplayRequested:data.aiReplayRequested,aiReplayEnabled:data.aiReplayEnabled,
   aiReplaySchemaReady:data.aiReplaySchemaReady};
 });
 const guest=await fetcher(API+'entitlement',{headers:{Origin:SITE.slice(0,-1)},cache:'no-store',signal:AbortSignal.timeout(12000)});
 assert.equal(guest.status,401,'Unauthenticated entitlement must return HTTP 401');
 assert.equal((await guest.json()).error,'login_required');
 logger.log('PASS '+API+'entitlement '+JSON.stringify({auth:'required'}));
 // Non-mutating CORS preflight must continue to function for signed-in browsers.
 await attempt(API+'entitlement',(_body,response)=>{
  assert.equal(response.headers.get('access-control-allow-origin'),SITE.slice(0,-1));
  return {cors:true};
 },{method:'OPTIONS',headers:{Origin:SITE.slice(0,-1),'Access-Control-Request-Method':'GET'}});
 return {pages:pages.length,health};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 await runSmoke();
}
