import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyPaidLaunchReadOnly} from '../scripts/pro-paid-readonly-smoke.mjs';

const site='https://speakingym.pages.dev/',worker='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/';
const fixture=()=>({
 'plans.html':'<p>Pro 680円 毎月請求 自動更新</p><a href="./tokusho.html">特商法</a><a href="./terms.html">規約</a><input id="sg-live-accept">',
 'tokusho.html':'<h1>特定商取引法に基づく表記</h1><p>販売事業者・開示請求に対応。利用者の請求に遅滞なく回答する。</p>',
 'terms.html':'<h1>Proの有料規約</h1><p>解約とキャンセルについて</p>',
 'privacy.html':'Stripeが決済情報を処理する。',
 'contact.html':'<p>事業者情報の開示請求</p><a href="mailto:test@example.invalid">お問い合わせ</a>',
 'health':JSON.stringify({status:'ok',billingMode:'live',quotaVersion:'pro-monthly-600-100-v2',
  aiEnabled:true,aiConfigured:true,plansEnabled:true,plansReady:true,
  turnLedgerEnabled:true,turnLedgerSchemaReady:true,
  sceneIds:Array.from({length:16},(_,i)=>'scene-'+i)})
});
function setup(pages=fixture()){
 const calls=[];
 const fetcher=async (url,options)=>{
  calls.push({url,options});
  const path=url.startsWith(worker)?url.slice(worker.length):url.slice(site.length);
  const body=pages[path];
  return {status:body===undefined?404:200,text:async()=>body||''};
 };
 return {calls,fetcher,pages};
}
test('paid launch inspection sends only public GETs, no credentials or mutation',async()=>{
 const f=setup();
 const result=await verifyPaidLaunchReadOnly(f.fetcher);
 assert.equal(result.mode,'live');
 assert.equal(result.pagesChecked,5);
 assert.equal(f.calls.length,6);
 for(const {url,options} of f.calls){
  assert.equal(options.method,'GET');
  assert.equal(options.cache,'no-store');
  assert.equal(options.headers.Authorization,undefined);
  assert.ok(url.startsWith(site)||url.startsWith(worker));
  assert.doesNotMatch(url,/checkout|webhook|gemini|sessions|entitlement|billing\/status/);
 }
});
test('original unapproved legal draft MUST block any claim of paid release readiness',async()=>{
 const f=setup();
 f.pages['tokusho.html']=readFileSync(new URL('../tokusho.html',import.meta.url),'utf8');
 await assert.rejects(verifyPaidLaunchReadOnly(f.fetcher),/UNVERIFIED legal draft/);
});
test('free-beta terms still in source MUST block paid readiness',async()=>{
 const f=setup();
 f.pages['terms.html']=readFileSync(new URL('../terms.html',import.meta.url),'utf8');
 await assert.rejects(verifyPaidLaunchReadOnly(f.fetcher),/Outdated free-beta terms/);
});
test('disabled/test billing mode, incomplete D1 or stopped Gemini fails closed',async()=>{
 for(const edits of [
  {billingMode:'test'}, {billingMode:'disabled'}, {plansReady:false},
  {turnLedgerSchemaReady:false},{aiEnabled:false}
 ]){
  const f=setup(),health=JSON.parse(f.pages.health);
  Object.assign(health,edits);f.pages.health=JSON.stringify(health);
  await assert.rejects(verifyPaidLaunchReadOnly(f.fetcher));
 }
});
test('missing privacy payment notice, legal link and recurring confirmation block readiness',async()=>{
 for(const [key,body] of [
  ['privacy.html','Google Analytics and Cloudflare'],['plans.html','Pro 680円 自動更新'],
  ['tokusho.html','未確定: 特定商取引法に基づく表記と開示請求']
 ]){
  const f=setup();f.pages[key]=body;
  await assert.rejects(verifyPaidLaunchReadOnly(f.fetcher),key);
 }
});
test('HTTP errors and non-HTTPS origins fail safely',async()=>{
 const f=setup();delete f.pages.health;
 await assert.rejects(verifyPaidLaunchReadOnly(f.fetcher),/Public HTTP 200/);
 await assert.rejects(verifyPaidLaunchReadOnly(f.fetcher,{site:'http://example.com/',worker}),/HTTPS/);
});
