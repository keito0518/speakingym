import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../plans.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../billing-ui.js',import.meta.url),'utf8');
const targets=[
 'sg-pro-sale-notice','sg-pro-price-caption','sg-pro-teacher-limit',
 'sg-pro-daily-limit','sg-pro-compare-heading','sg-pro-compare-turns',
 'sg-pro-compare-teacher','sg-pro-compare-sprint','sg-pro-payment-status',
 'sg-pro-faq-availability','sg-pro-availability'
];

async function ui(serverData,hasToken=true) {
 const elements=new Map();
 const make=()=>({
  textContent:'',hidden:false,disabled:false,
  classList:{toggle(){},remove(){},add(){}},
  addEventListener(){},
 });
 const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id)};
 const fetches=[];
 const sandbox={
  document:{getElementById:get},
  window:{
   speakingymAccount:{getIdToken:async()=>hasToken?'mock-id-token':null},
   addEventListener(){}
  },
  location:{search:'',assign(){throw Error('Stripe redirect must not happen in a GET status read')}},
  URL,URLSearchParams,AbortSignal,
  fetch:async(url,options)=>{
   fetches.push({url,method:options?.method});
   return serverData?{ok:true,json:async()=>serverData}:{ok:false,json:async()=>({error:'billing_disabled'})};
  }
 };
 vm.runInNewContext(js,sandbox,{timeout:3000});
 // Await the async refresh invoked by the module at page load.
 for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
 return {get,fetches};
}

test('all copy that changes with live billing has an actual target',()=>{
 for(const id of targets)assert.match(html,new RegExp('id="'+id+'"'),id);
 assert.match(html,/id="sg-pro-sale-notice"/);
 assert.match(js,/const live=mode==='live'/);
 assert.match(js,/if\(data.mode!=='live'&&data.mode!=='test'\)throw Error\('billing_disabled'\)/);
});

test('verified LIVE Stripe mode displays paid recurring terms everywhere, not sandbox or no-charge warnings',async()=>{
 const state=await ui({mode:'live',status:'none',pro:false,hasCustomer:false});
 assert.equal(state.fetches.length,1);
 assert.equal(state.fetches[0].method,'GET');
 assert.equal(state.get('sg-checkout').disabled,false);
 assert.match(state.get('sg-checkout').textContent,/Proに申し込む（月680円・税込）/);
 assert.match(state.get('sg-pro-sale-notice').textContent,/毎月請求/);
 assert.match(state.get('sg-pro-price-caption').textContent,/自動更新/);
 assert.equal(state.get('sg-pro-payment-status').textContent,'月680円・税込、自動更新');
 assert.equal(state.get('sg-pro-availability').textContent,'申込受付中');
 assert.equal(state.get('sg-pro-compare-heading').textContent,'Pro');
 assert.doesNotMatch(state.get('sg-pro-sale-notice').textContent,/請求はありません|募集・決済は行っていません/);
 assert.doesNotMatch(state.get('sg-pro-faq-availability').textContent,/一般公開時期はまだ未定/);
});

test('verified TEST Stripe mode labels sandbox registration as no-charge, never a live purchase',async()=>{
 const state=await ui({mode:'test',status:'none',pro:false,hasCustomer:false});
 assert.equal(state.get('sg-checkout').disabled,false);
 assert.match(state.get('sg-checkout').textContent,/Proにテスト登録/);
 assert.match(state.get('sg-pro-sale-notice').textContent,/実際の請求はありません/);
 assert.equal(state.get('sg-pro-availability').textContent,'招待テストのみ');
 assert.equal(state.get('sg-pro-payment-status').textContent,'一般向けの支払受付なし');
 assert.doesNotMatch(state.get('sg-pro-price-caption').textContent,/自動更新/);
});

test('unknown, disabled or unsigned sessions cannot activate live checkout or present verified pricing copy',async()=>{
 for(const mode of ['unexpected','disabled',null]){
  const state=await ui({mode,status:'none',pro:false,hasCustomer:false});
  assert.equal(state.get('sg-checkout').disabled,true);
  assert.notEqual(state.get('sg-pro-availability').textContent,'申込受付中');
 }
 const anonymous=await ui({mode:'live',status:'none',pro:false,hasCustomer:false},false);
 assert.equal(anonymous.fetches.length,0,'No authenticated billing API call');
 assert.equal(anonymous.get('sg-checkout').disabled,true);
 assert.notEqual(anonymous.get('sg-pro-availability').textContent,'申込受付中');
});
