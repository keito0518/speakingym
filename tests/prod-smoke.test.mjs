import test from 'node:test';
import assert from 'node:assert/strict';
import {runSmoke} from '../scripts/prod-smoke.mjs';

const site='https://speakingym.pages.dev/';
const api='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/';
const silent={log(){},warn(){}};
function fakeFetch({ready=true,billingMode='test',ledgerEnabled=false,ledgerReady=false}={}){
 const requests=[];
 const pages=new Map([
  ['', '<title>Speakingym</title>60秒チャレンジ'],
  ['account.html','<title>My Learning Space</title>60秒チャレンジ'],
  ['reflex.html','60秒チャレンジ <button id="start">'],
  ['scenes.html','AIシーン練習 <button id="start">'+Array.from({length:16},(_,i)=>'<button data-scene="'+String.fromCharCode(97+i)+'">').join('')],
  ['phrasebook.html','共通フレーズ帳<div id="phrases">'],
  ['plans.html','料金・利用プラン 680円'],
  ['speech-settings.js','window.speakingymSpeech = {}; window.speechSynthesis'],
  ['phrasebook.js','window.speakingymPhrases = {}; localStorage']
 ]);
 const fetcher=async(url,init={})=>{
  requests.push({url,init});
  if(url===api+'entitlement'){
   if(init.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':site.slice(0,-1)}});
   return Response.json({error:'login_required'},{status:401});
  }
  if(url===api+'health')return Response.json({status:'ok',quotaVersion:'pro-monthly-600-100-v2',
   aiEnabled:ready,aiConfigured:ready,keyConfigured:ready,plansEnabled:true,plansReady:true,
   billingMode,turnLedgerEnabled:ledgerEnabled,turnLedgerSchemaReady:ledgerReady,model:'gemini-3.5-flash-lite',
   sceneIds:Array.from({length:16},(_,i)=>'scene'+i)});
  if(url.startsWith(site)&&pages.has(url.slice(site.length)))return new Response(pages.get(url.slice(site.length)),{status:200});
  throw Error('Unexpected request '+url);
 };
 return {fetcher,requests};
}
test('read-only smoke covers 8 public assets, 16 scenes, production readiness and authentication',async()=>{
 const {fetcher,requests}=fakeFetch();
 const result=await runSmoke(fetcher,{maxAttempts:1,retryDelayMs:0,logger:silent});
 assert.equal(result.pages,8);assert.equal(result.health.billingMode,'test');
 assert.equal(requests.length,11);
 assert.equal(requests.some(x=>x.init.method==='POST'),false);
 assert.equal(requests.some(x=>x.url.includes('gemini')),false);
 const guest=requests.find(x=>x.url===api+'entitlement'&&x.init.method!=='OPTIONS');
 assert.equal(guest.init.headers.Authorization,undefined);
});
test('smoke fails before charging users when AI is disabled or Gemini key is not ready',async()=>{
 const {fetcher}=fakeFetch({ready:false});
 await assert.rejects(runSmoke(fetcher,{maxAttempts:1,retryDelayMs:0,logger:silent}),/Production smoke failed.*health/);
});
test('smoke never accepts live billing',async()=>{
 const {fetcher}=fakeFetch({billingMode:'live'});
 await assert.rejects(runSmoke(fetcher,{maxAttempts:1,retryDelayMs:0,logger:silent}),/Production smoke failed.*health/);
});

test('production guard rejects enabling turn ledger before database migration',async()=>{
 const {fetcher}=fakeFetch({ledgerEnabled:true,ledgerReady:false});
 await assert.rejects(runSmoke(fetcher,{maxAttempts:1,retryDelayMs:0,logger:silent}),/Production smoke failed.*health/);
 const ready=fakeFetch({ledgerEnabled:true,ledgerReady:true});
 const result=await runSmoke(ready.fetcher,{maxAttempts:1,retryDelayMs:0,logger:silent});
 assert.equal(result.health.status,'ok');
});
