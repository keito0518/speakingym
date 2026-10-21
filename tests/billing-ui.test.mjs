import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../billing-ui.js',import.meta.url),'utf8');
async function ui({token='id-token',data={mode:'test',status:'none',pro:false},ok=true,byAction={}}={}){
 const nodes=new Map(),calls=[],redirects=[],listeners={};
 let currentToken=token;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{listeners:{},classList:{toggle(){}},addEventListener(event,fn){this.listeners[event]=fn}});return nodes.get(id)};
 const sandbox={document:{getElementById:node},window:{speakingymAccount:{getIdToken:async()=>currentToken},addEventListener(k,fn){listeners[k]=fn}},location:{search:'?billing=success',assign:url=>redirects.push(url)},URL,URLSearchParams,Date,AbortSignal,
 fetch:async(url,options)=>{calls.push({url,options});
  const key=new URL(url).pathname.split('/').at(-1);
  const response=byAction[key];
  return {ok:response?.ok??ok,json:async()=>response?.data??data}}};
 vm.runInNewContext(script,sandbox);await new Promise(r=>setImmediate(r));return {node,calls,redirects,listeners,setToken(value){currentToken=value}};
}
test('success URL without server entitlement never claims Pro',async()=>{
 const a=await ui();assert.doesNotMatch(a.node('sg-billing-status').textContent,/Pro権限を確認しました/);assert.match(a.node('sg-billing-status').textContent,/反映/);
});
test('guest cannot call billing API and sees login guidance',async()=>{
 const a=await ui({token:null});assert.equal(a.calls.length,0);assert.equal(a.node('sg-checkout').disabled,true);assert.match(a.node('sg-billing-status').textContent,/ログイン/);
});
test('sandbox-only invitation rejection is understandable and disables checkout',async()=>{
 const a=await ui({ok:false,data:{error:'sandbox_invite_required'}});assert.match(a.node('sg-billing-status').textContent,/このアカウントでは現在Proを登録できません/);assert.equal(a.node('sg-checkout').disabled,true);
});
test('portal date and active state come from server; no client plan update',async()=>{
 const a=await ui({data:{mode:'test',status:'active',pro:true,hasCustomer:true,periodEnd:1800000000,cancelAtPeriodEnd:true}});
 assert.equal(a.node('sg-checkout').disabled,true);assert.equal(a.node('sg-portal').hidden,false);assert.match(a.node('sg-billing-date').textContent,/利用終了予定日/);
 assert.equal(a.calls[0].options.headers.Authorization,'Bearer id-token');
});
test('untrusted checkout URL is never followed',async()=>{
 const a=await ui({data:{mode:'test',status:'none',url:'https://evil.example/'}});await a.node('sg-checkout').listeners.click();assert.equal(a.redirects.length,0);
});

test('failed unauthorized checkout cannot re-enable the disabled Pro button',async()=>{
 const a=await ui({ok:false,data:{error:'sandbox_invite_required'}});
 assert.equal(a.node('sg-checkout').disabled,true);
 await a.node('sg-checkout').listeners.click();
 assert.equal(a.node('sg-checkout').disabled,true);
});

test('a failed Stripe Checkout POST never enables another payment attempt without fresh status',async()=>{
 const a=await ui({byAction:{checkout:{ok:false,data:{error:'billing_busy'}}}});
 assert.equal(a.node('sg-checkout').disabled,false);
 await a.node('sg-checkout').listeners.click();
 assert.equal(a.node('sg-checkout').disabled,true);
 assert.match(a.node('sg-billing-status').textContent,/別の処理を確認中/);
 const before=a.calls.filter(x=>x.options.method==='POST').length;
 await a.node('sg-checkout').listeners.click();
 assert.equal(a.calls.filter(x=>x.options.method==='POST').length,before);
 await a.node('sg-billing-refresh').listeners.click();
 assert.equal(a.node('sg-checkout').disabled,false);
});
test('reused checkout mismatch explains the risk and does not allow repeated purchase',async()=>{
 const a=await ui({byAction:{checkout:{ok:false,data:{error:'billing_checkout_review'}}}});
 await a.node('sg-checkout').listeners.click();
 assert.match(a.node('sg-billing-status').textContent,/以前の購入画面の内容を確認/);
 assert.equal(a.node('sg-checkout').disabled,true);
 assert.equal(a.redirects.length,0);
});
test('successful Stripe redirect keeps purchase controls disabled until a fresh server check',async()=>{
 const a=await ui({byAction:{checkout:{ok:true,data:{url:'https://checkout.stripe.com/c/pay/test'}}}});
 await a.node('sg-checkout').listeners.click();
 assert.equal(a.redirects.length,1);
 assert.equal(a.node('sg-checkout').disabled,true);
 assert.equal(a.node('sg-portal').disabled,true);
 const count=a.calls.filter(x=>x.options.method==='POST').length;
 await a.node('sg-checkout').listeners.click();
 assert.equal(a.calls.filter(x=>x.options.method==='POST').length,count);
});
test('account change while Checkout POST is pending never redirects to the former account',async()=>{
 let finish;
 const stripeResponse=new Promise(resolve=>{finish=resolve});
 const a=await ui({byAction:{checkout:{ok:true,data:stripeResponse}}});
 assert.equal(a.node('sg-checkout').disabled,false);
 const attempted=a.node('sg-checkout').listeners.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(a.calls.filter(x=>x.options.method==='POST').length,1);
 a.setToken(null); // simulate actual logout while Stripe POST is still pending
 a.listeners['speakingym:account-ready']();
 finish({url:'https://checkout.stripe.com/c/pay/former-account'});
 await attempted;
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(a.redirects.length,0,'old account Checkout URL cannot survive account change');
 assert.equal(a.node('sg-checkout').disabled,true,'logged-out account cannot reuse the previous payment button');
});

test('account-changing event invalidates an in-flight checkout BEFORE cloud sync completes',async()=>{
 let finish;const delayed=new Promise(done=>{finish=done});
 const uiState=await ui({byAction:{checkout:{ok:true,data:delayed}}});
 const request=uiState.node('sg-checkout').listeners.click();
 await new Promise(r=>setImmediate(r));
 assert.equal(uiState.calls.filter(c=>c.options.method==='POST').length,1);
 uiState.listeners['speakingym:account-changing']();
 assert.equal(uiState.node('sg-checkout').disabled,true);
 assert.match(uiState.node('sg-billing-status').textContent,/アカウントを確認中/);
 finish({url:'https://checkout.stripe.com/c/pay/former-account'});
 await request;
 assert.equal(uiState.redirects.length,0);
});
test('failed portal operation also needs a verified refresh before retry',async()=>{
 const a=await ui({data:{mode:'test',status:'active',pro:true,hasCustomer:true},
  byAction:{portal:{ok:false,data:{error:'billing_busy'}}}});
 assert.equal(a.node('sg-portal').disabled,false);
 await a.node('sg-portal').listeners.click();
 assert.equal(a.node('sg-portal').disabled,true);
 assert.equal(a.node('sg-portal').hidden,true);
 const count=a.calls.filter(x=>x.options.method==='POST').length;
 await a.node('sg-portal').listeners.click();
 assert.equal(a.calls.filter(x=>x.options.method==='POST').length,count);
 await a.node('sg-billing-refresh').listeners.click();
 assert.equal(a.node('sg-portal').hidden,false);
 assert.equal(a.node('sg-portal').disabled,false);
});
test('Stripe redirects reject alternate ports and credential-bearing URLs',async()=>{
 for(const url of ['https://checkout.stripe.com:444/pay/test',
  'https://login@checkout.stripe.com/c/pay/test','https://evil.example/pay']){
  const a=await ui({byAction:{checkout:{ok:true,data:{url}}}});
  await a.node('sg-checkout').listeners.click();
  assert.equal(a.redirects.length,0,url);
  assert.equal(a.node('sg-checkout').disabled,true,url);
 }
});
test('an active subscription without Pro is not falsely reported as fully entitled',async()=>{
 const a=await ui({data:{mode:'test',status:'active',pro:false,entitlementReason:'invoice_unpaid',periodEnd:1800000000}});
 assert.match(a.node('sg-billing-status').textContent,/Pro権限の確認が未完了/);
 assert.match(a.node('sg-billing-status').textContent,/支払い確認/);
 assert.equal(a.node('sg-checkout').disabled,true);
});

test('active but ineligible sandbox subscription shows non-sensitive diagnostic code',async()=>{
 const a=await ui({data:{mode:'test',status:'active',pro:false,entitlementReason:'invoice_missing',periodEnd:1800000000}});
 assert.match(a.node('sg-billing-status').textContent,/診断コード：invoice_missing/);
 assert.equal(a.node('sg-checkout').disabled,true);
});
test('unknown reasons are never interpolated into status text',async()=>{
 const a=await ui({data:{mode:'test',status:'active',pro:false,entitlementReason:'secret customer identifier',periodEnd:1800000000}});
 assert.match(a.node('sg-billing-status').textContent,/診断コード：unknown/);
 assert.doesNotMatch(a.node('sg-billing-status').textContent,/secret customer identifier/);
});
