import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../plans.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../billing-ui.js',import.meta.url),'utf8');
const tokusho=readFileSync(new URL('../tokusho.html',import.meta.url),'utf8');
const targets=[
 'sg-pro-sale-notice','sg-pro-price-caption','sg-pro-teacher-limit',
 'sg-pro-daily-limit','sg-pro-compare-heading','sg-pro-compare-turns',
 'sg-pro-compare-teacher','sg-pro-compare-sprint','sg-pro-payment-status',
 'sg-pro-faq-availability','sg-pro-availability'
];

async function ui(serverData,hasToken=true) {
 const elements=new Map(),windowListeners={};
 const make=()=>({
  textContent:'',hidden:false,disabled:false,checked:false,listeners:{},
  classList:{toggle(){},remove(){},add(){}},
  scrollIntoView(){},
  addEventListener(event,fn){this.listeners[event]=fn},
 });
 const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id)};
 const fetches=[];
 const sandbox={
  document:{getElementById:get},
  window:{
   speakingymAccount:{getIdToken:async()=>hasToken?'mock-id-token':null},
   addEventListener(name,fn){windowListeners[name]=fn}
  },
  location:{search:'',assign(){throw Error('Stripe redirect must not happen in a GET status read')}},
  URL,URLSearchParams,AbortSignal,
  fetch:async(url,options)=>{
   fetches.push({url,method:options?.method});
   if(serverData==='network_error')throw Error('network_offline');
   return serverData?{ok:true,json:async()=>serverData}:{ok:false,json:async()=>({error:'billing_disabled'})};
  }
 };
 vm.runInNewContext(js,sandbox,{timeout:3000});
 // Await the async refresh invoked by the module at page load.
 for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
 return {get,fetches,refresh:async(nextData,nextHasToken=hasToken)=>{
  serverData=nextData;hasToken=nextHasToken;windowListeners.focus();
  for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
 }};

}

test('individual-operator commerce notice exists but explicitly remains unverified before payment launch',()=>{
 assert.match(html,/href="\.\/tokusho\.html"/,'Live review must visibly link commerce notice');
 assert.match(tokusho,/特定商取引法に基づく表記/);
 assert.match(tokusho,/noindex,nofollow/,'Unverified legal draft must never be indexed');
 assert.match(tokusho,/販売開始前の草案です/);
 assert.match(tokusho,/正式販売は開始しません/);
 assert.match(tokusho,/確認中|方針策定中/);
 assert.doesNotMatch(tokusho,/id="sg-checkout"|mode="subscription"/,'Draft notice must not initiate any payment');
});

test('all copy that changes with live billing has an actual target',()=>{
 for(const id of targets)assert.match(html,new RegExp('id="'+id+'"'),id);
 assert.match(html,/id="sg-pro-sale-notice"/);
 assert.match(js,/const live=mode==='live'/);
 assert.match(js,/if\(data.mode!=='live'&&data.mode!=='test'\)throw Error\('billing_disabled'\)/);
});

test('verified LIVE Stripe mode displays paid recurring terms everywhere, not sandbox or no-charge warnings',async()=>{
 const state=await ui({mode:'live',status:'none',pro:false,hasCustomer:false,checkoutAmountJpy:980});
 assert.equal(state.fetches.length,1);
 assert.equal(state.fetches[0].method,'GET');
 assert.equal(state.get('sg-checkout').disabled,false);
 assert.match(state.get('sg-checkout').textContent,/Proに申し込む（月980円・税込）/);
 assert.match(state.get('sg-pro-sale-notice').textContent,/毎月自動更新/);
 assert.match(state.get('sg-pro-price-caption').textContent,/自動更新/);
 assert.equal(state.get('sg-pro-payment-status').textContent,'月980円・税込、自動更新');
 assert.equal(state.get('sg-pro-availability').textContent,'申込受付中');
 assert.equal(state.get('sg-pro-compare-heading').textContent,'Pro');
 assert.doesNotMatch(state.get('sg-pro-sale-notice').textContent,/請求はありません|募集・決済は行っていません/);
 assert.doesNotMatch(state.get('sg-pro-faq-availability').textContent,/一般公開時期はまだ未定/);
});

test('LIVE requires explicit pre-Checkout acceptance; cancel and unchecked attempts cannot submit payment',async()=>{
 const state=await ui({mode:'live',status:'none',pro:false,hasCustomer:false,checkoutAmountJpy:980});
 assert.equal(state.get('sg-live-review').hidden,true);
 assert.equal(state.fetches.length,1,'GET status only');
 state.get('sg-checkout').listeners.click();
 assert.equal(state.get('sg-live-review').hidden,false);
 assert.equal(state.get('sg-live-proceed').disabled,true);
 assert.equal(state.fetches.length,1,'No checkout POST merely by opening the review');
 await state.get('sg-live-proceed').listeners.click();
 assert.equal(state.fetches.length,1,'Unacknowledged click must fail closed');
 state.get('sg-live-cancel').listeners.click();
 assert.equal(state.get('sg-live-review').hidden,true);
 assert.equal(state.fetches.length,1,'Cancel must not start checkout');
 state.get('sg-checkout').listeners.click();
 state.get('sg-live-accept').checked=true;
 state.get('sg-live-accept').listeners.change();
 assert.equal(state.get('sg-live-proceed').disabled,false);
 await state.get('sg-live-proceed').listeners.click();
 assert.equal(state.fetches.length,2);
 assert.equal(state.fetches.at(-1).method,'POST');
 assert.match(state.fetches.at(-1).url,/\/billing\/checkout$/);
});

test('Live offer disappears on network error, sign-out and invalid billing mode, and sandbox can recover',async()=>{
 const state=await ui({mode:'live',status:'none',pro:false,hasCustomer:false,checkoutAmountJpy:980});
 assert.equal(state.get('sg-pro-availability').textContent,'申込受付中');
 assert.equal(state.get('sg-checkout').disabled,false);
 await state.refresh('network_error');
 assert.equal(state.get('sg-pro-availability').textContent,'受付状況を確認中');
 assert.equal(state.get('sg-checkout').disabled,true);
 assert.equal(state.get('sg-live-review').hidden,true);
 assert.equal(state.get('sg-pro-payment-status').textContent,'申込受付状況を確認中');
 assert.doesNotMatch(state.get('sg-pro-sale-notice').textContent,/毎月請求されます|申込受付中/);
 assert.match(state.get('sg-billing-status').textContent,/契約情報を確認できません/);
 const count=state.fetches.length;
 await state.refresh({mode:'live',status:'none',pro:false,hasCustomer:false,checkoutAmountJpy:980},false);
 assert.equal(state.fetches.length,count,'Sign-out must not reuse old identity');
 assert.equal(state.get('sg-pro-availability').textContent,'受付状況を確認中');
 assert.equal(state.get('sg-checkout').disabled,true);
 await state.refresh({mode:'disabled',status:'none',pro:false},true);
 assert.equal(state.get('sg-pro-availability').textContent,'受付状況を確認中');
 assert.equal(state.get('sg-checkout').disabled,true);
 await state.refresh({mode:'test',status:'none',pro:false,hasCustomer:false},true);
 assert.equal(state.get('sg-pro-availability').textContent,'招待テストのみ');
 assert.equal(state.get('sg-checkout').disabled,false);
 assert.equal(state.get('sg-pro-payment-status').textContent,'一般向けの支払受付なし');
});

test('verified TEST Stripe mode labels sandbox registration as no-charge, never a live purchase',async()=>{
 const state=await ui({mode:'test',status:'none',pro:false,hasCustomer:false});
 assert.equal(state.get('sg-checkout').disabled,false);
 assert.match(state.get('sg-checkout').textContent,/Proにテスト登録/);
 assert.match(state.get('sg-pro-sale-notice').textContent,/請求しません/);
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
 const anonymous=await ui({mode:'live',status:'none',pro:false,hasCustomer:false,checkoutAmountJpy:980},false);
 assert.equal(anonymous.fetches.length,0,'No authenticated billing API call');
 assert.equal(anonymous.get('sg-checkout').disabled,true);
 assert.notEqual(anonymous.get('sg-pro-availability').textContent,'申込受付中');
});
