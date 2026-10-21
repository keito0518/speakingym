import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Exercise the actual account-sync quota function; Firebase and Cloudflare
// requests are simulated. No login, real entitlements or production writes.
const source=readFileSync(new URL('../account-sync.js',import.meta.url),'utf8');
const script=source.replace(/^import .*;\s*$/gm,'')
 .replace(/\nstart\(\);\s*$/, '\nglobalThis.__qa={setAccount(uid){accountEpoch++;user=uid?{uid}:null;authFns={getIdToken:async current=>"token-"+current.uid}},updateQuotaUi};\n');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
function fixture(){
 const quota={textContent:''},pending=new Map(),calls=[];
 const ctx={
  firebaseConfig:{},document:{getElementById:id=>id==='sg-plan-info'?quota:null},
  window:{},Event:class{},console,
  fetch:async(url,options={})=>{
   if(url.endsWith('/health'))return {ok:true,json:async()=>({plansEnabled:true})};
   assert.ok(url.endsWith('/entitlement'));assert.equal(options.cache,'no-store');
   assert.equal(options.credentials,'omit');
   const token=options.headers.Authorization;
   calls.push(token);
   const gate=deferred();pending.set(token,gate);
   return {ok:true,json:()=>gate.promise};
  }
 };
 vm.runInNewContext(script,ctx);
 assert.equal(typeof ctx.__qa?.updateQuotaUi,'function');
 return {quota,pending,calls,change:ctx.__qa.setAccount,refresh:ctx.__qa.updateQuotaUi};
}
async function settle(){for(let i=0;i<10;i++)await Promise.resolve()}
const pro={plan:'pro',limits:{monthlyTurns:1000,monthlyTeacher:150},used:{monthlyTurns:2,monthlyTeacher:1}};
const free={plan:'free',limits:{sessions:5,teacher:3},used:{sessions:1,teacher:0}};
test('late Pro response for A cannot overwrite B Free usage on account switch',async()=>{
 const ui=fixture();ui.change('A');
 const old=ui.refresh();await settle();
 assert.deepEqual(ui.calls,['Bearer token-A']);
 ui.change('B');
 const fresh=ui.refresh();await settle();
 assert.deepEqual(ui.calls,['Bearer token-A','Bearer token-B']);
 ui.pending.get('Bearer token-B').resolve(free);await fresh;
 assert.match(ui.quota.textContent,/Free/);
 ui.pending.get('Bearer token-A').resolve(pro);await old;
 assert.match(ui.quota.textContent,/Free/);
 assert.doesNotMatch(ui.quota.textContent,/Pro/);
});
test('logout during a paid quota request hides old usage permanently',async()=>{
 const ui=fixture();ui.change('A');
 const prior=ui.refresh();await settle();
 ui.change(null);await ui.refresh();
 assert.match(ui.quota.textContent,/Googleログイン/);
 ui.pending.get('Bearer token-A').resolve(pro);await prior;
 assert.match(ui.quota.textContent,/Googleログイン/);
 assert.doesNotMatch(ui.quota.textContent,/Pro/);
});
test('stale quota request failure does not cover a newer verified Free status',async()=>{
 const ui=fixture();ui.change('A');
 const old=ui.refresh();await settle();
 ui.change('B');const newer=ui.refresh();await settle();
 ui.pending.get('Bearer token-B').resolve(free);await newer;
 ui.pending.get('Bearer token-A').reject(Error('old network failure'));await old;
 assert.match(ui.quota.textContent,/Free/);
 assert.doesNotMatch(ui.quota.textContent,/読み込めません/);
});
