import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../account-sync.js',import.meta.url),'utf8');
const section=source.match(/function releaseUnownedGuestWhileAuthLoads\(\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(section,'guest startup guard must stay a standalone, auditable function');

function simulate({owner=null,loggedIn=false,throws=false}={}){
 let notifications=0;
 const storage={getItem:()=>{if(throws)throw Error('storage blocked');return owner}};
 const fn=vm.runInNewContext(section+';releaseUnownedGuestWhileAuthLoads',{
  user:loggedIn?{uid:'current-user'}:null,
  localStorage:storage,
  OWNER_KEY:'speakingym-account-owner-v1',
  notify:()=>{notifications++}
 });
 return {released:fn(),notifications};
}

test('an unowned guest can practise before Firebase SDK download finishes',()=>{
 assert.deepEqual(simulate(),{released:true,notifications:1});
 assert.match(source,/const guestReleased=releaseUnownedGuestWhileAuthLoads\(\)/);
 assert.match(source,/無料練習はすぐ使えるよ/);
});
test('a previously verified owner is NEVER released as a guest during auth load',()=>{
 assert.deepEqual(simulate({owner:'previous-user'}),{released:false,notifications:0});
 assert.deepEqual(simulate({loggedIn:true}),{released:false,notifications:0});
});
test('guest startup fails closed if local storage access is restricted',()=>{
 assert.deepEqual(simulate({throws:true}),{released:false,notifications:0});
});

// An onAuthStateChanged(null) callback used to fire account-changing then
// return before account-ready. Local transfer practice stayed disabled forever.
const authHandler=source.slice(source.indexOf('async function handleAuth('),source.indexOf('function onChanged('));
assert.ok(authHandler.startsWith('async function handleAuth('));
async function simulateSignedOut({owner=null}={}){
 const events=[];
 const records=new Map(owner?[['speakingym-account-owner-v1',owner]]:[]);
 const localStorage={
  getItem:key=>records.get(key)??null,
  removeItem:key=>records.delete(key),
  setItem:(key,value)=>records.set(key,String(value))
 };
 const context={
  accountEpoch:0,quotaUiSeq:0,initAuth:false,busy:false,user:null,
  OWNER_KEY:'speakingym-account-owner-v1',localStorage,
  $:()=>null,
  Event:class{constructor(type){this.type=type}},
  window:{dispatchEvent:event=>events.push(event.type),location:{reload:()=>events.push('reload')}},
  renderControls:()=>{},
  refreshUi:()=>events.push('speakingym:account-ready'),
  removeSnapshot:()=>{},applySnapshot:()=>{},readGuestSnapshot:()=>({}),
  status:()=>{},describeError:()=>'',syncAll:async()=>{}
 };
 const handle=vm.runInNewContext(authHandler+';handleAuth',context);
 await handle(null);
 return events;
}
test('Firebase confirming a logged-out guest unlocks free practice again',async()=>{
 assert.deepEqual(await simulateSignedOut(),[
  'speakingym:account-changing','speakingym:account-ready'
 ]);
});
test('a previous account remains hidden until the sign-out reload clears its records',async()=>{
 assert.deepEqual(await simulateSignedOut({owner:'previous-paid-user'}),[
  'speakingym:account-changing','reload'
 ]);
});
