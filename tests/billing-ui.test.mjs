import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../billing-ui.js',import.meta.url),'utf8');
async function ui({token='id-token',data={mode:'test',status:'none',pro:false},ok=true}={}){
 const nodes=new Map(),calls=[],redirects=[],listeners={};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{listeners:{},addEventListener(event,fn){this.listeners[event]=fn}});return nodes.get(id)};
 const sandbox={document:{getElementById:node},window:{speakingymAccount:{getIdToken:async()=>token},addEventListener(k,fn){listeners[k]=fn}},location:{search:'?billing=success',assign:url=>redirects.push(url)},URL,URLSearchParams,Date,AbortSignal,
 fetch:async(url,options)=>{calls.push({url,options});return {ok,json:async()=>data}}};
 vm.runInNewContext(script,sandbox);await new Promise(r=>setImmediate(r));return {node,calls,redirects,listeners};
}
test('success URL without server entitlement never claims Pro',async()=>{
 const a=await ui();assert.doesNotMatch(a.node('sg-billing-status').textContent,/Pro権限を確認しました/);assert.match(a.node('sg-billing-status').textContent,/反映/);
});
test('guest cannot call billing API and sees login guidance',async()=>{
 const a=await ui({token:null});assert.equal(a.calls.length,0);assert.equal(a.node('sg-checkout').disabled,true);assert.match(a.node('sg-billing-status').textContent,/ログイン/);
});
test('sandbox-only invitation rejection is understandable and disables checkout',async()=>{
 const a=await ui({ok:false,data:{error:'sandbox_invite_required'}});assert.match(a.node('sg-billing-status').textContent,/指定テスター/);assert.equal(a.node('sg-checkout').disabled,true);
});
test('portal date and active state come from server; no client plan update',async()=>{
 const a=await ui({data:{status:'active',pro:true,hasCustomer:true,periodEnd:1800000000,cancelAtPeriodEnd:true}});
 assert.equal(a.node('sg-checkout').disabled,true);assert.equal(a.node('sg-portal').hidden,false);assert.match(a.node('sg-billing-date').textContent,/利用終了予定日/);
 assert.equal(a.calls[0].options.headers.Authorization,'Bearer id-token');
});
test('untrusted checkout URL is never followed',async()=>{
 const a=await ui({data:{status:'none',url:'https://evil.example/'}});await a.node('sg-checkout').listeners.click();assert.equal(a.redirects.length,0);
});

test('failed unauthorized checkout cannot re-enable the disabled Pro button',async()=>{
 const a=await ui({ok:false,data:{error:'sandbox_invite_required'}});
 assert.equal(a.node('sg-checkout').disabled,true);
 await a.node('sg-checkout').listeners.click();
 assert.equal(a.node('sg-checkout').disabled,true);
});

test('an active subscription without Pro is not falsely reported as fully entitled',async()=>{
 const a=await ui({data:{status:'active',pro:false,entitlementReason:'invoice_unpaid',periodEnd:1800000000}});
 assert.match(a.node('sg-billing-status').textContent,/Pro権限の確認が未完了/);
 assert.match(a.node('sg-billing-status').textContent,/支払い確認/);
 assert.equal(a.node('sg-checkout').disabled,true);
});

test('active but ineligible sandbox subscription shows non-sensitive diagnostic code',async()=>{
 const a=await ui({data:{status:'active',pro:false,entitlementReason:'invoice_missing',periodEnd:1800000000}});
 assert.match(a.node('sg-billing-status').textContent,/診断コード：invoice_missing/);
 assert.equal(a.node('sg-checkout').disabled,true);
});
test('unknown reasons are never interpolated into status text',async()=>{
 const a=await ui({data:{status:'active',pro:false,entitlementReason:'secret customer identifier',periodEnd:1800000000}});
 assert.match(a.node('sg-billing-status').textContent,/診断コード：unknown/);
 assert.doesNotMatch(a.node('sg-billing-status').textContent,/secret customer identifier/);
});
