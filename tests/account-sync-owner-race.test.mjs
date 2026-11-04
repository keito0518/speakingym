import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Run the genuine account-sync.js callbacks in a sandbox with stubbed Firebase:
// no credentials, real accounts, Firestore, or browser network requests.
const source=readFileSync(new URL('../account-sync.js',import.meta.url),'utf8');
const script=source
 .replace(/^import .*;\s*$/gm,'')
 .replace(/\nstart\(\);\s*$/, '\nglobalThis.__accountSyncHooks={onChanged,setAccount(uid){user=uid?{uid}:null;ready=true},setDbFns(value){dbFns=value;db={}}};\n');
const KEY='speakingym-saved-coaching-v1',OWNER='speakingym-owner-test';
function fixture(){
 const store=new Map(),tasks=new Map(),writes=[];
 let nextTimer=0,blockWrite=null;
 const localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
 };
 const timers={
  setTimeout(callback){const id=++nextTimer;tasks.set(id,callback);return id},
  clearTimeout(id){tasks.delete(id)}
 };
 const context={
  firebaseConfig:{},SYNC_ITEMS:[{key:KEY,doc:'coaching',type:'records'}],
  OWNER_KEY:OWNER,
  readSnapshot(storage){const raw=storage.getItem(KEY);return raw===null?{}:{[KEY]:JSON.parse(raw)}},
  normalizeValue:(_,value)=>value,
  snapshotsEqual:(a,b)=>JSON.stringify(a)===JSON.stringify(b),
  localStorage,
  window:{},
  ...timers
 };
 vm.runInNewContext(script,context);
 const h=context.__accountSyncHooks;
 assert.ok(h,'isolate account callbacks from Firebase startup');
 h.setDbFns({
  doc:(_,kind,uid)=>uid,
  serverTimestamp:()=>0,
  setDoc:async(uid,payload)=>{
   writes.push({uid,data:JSON.parse(payload.payload)});
   if(blockWrite)await blockWrite;
  }
 });
 return {
  setAccount(uid){
   h.setAccount(uid);
   if(uid)localStorage.setItem(OWNER,uid);
   else localStorage.removeItem(OWNER);
  },
  edit(value){
   localStorage.setItem(KEY,JSON.stringify(value));
   h.onChanged({detail:{key:KEY}});
  },
  async fire(){
   const item=tasks.entries().next().value;
   assert.ok(item,'expected pending sync');
   tasks.delete(item[0]);
   await item[1]();
  },
  async startWrite(){
   const item=tasks.entries().next().value;
   assert.ok(item);
   tasks.delete(item[0]);
   return item[1]();
  },
  block(promise){blockWrite=promise},
  writes,store,
  get pending(){return tasks.size},
  pendingFor(uid){return JSON.parse(store.get('speakingym-account-dirty:'+uid)||'[]')}
 };
}
test('queued edit from account A can never write account B local data',async()=>{
 const f=fixture();
 f.setAccount('account-A');f.edit([{natural:'A private sentence'}]);
 assert.ok(f.pendingFor('account-A').includes(KEY));
 f.setAccount('account-B');f.store.set(KEY,JSON.stringify([{natural:'B private sentence'}]));
 await f.fire();
 assert.deepEqual(f.writes,[]);
 assert.ok(f.pendingFor('account-A').includes(KEY),'A dirty flag remains for eventual retry');
 f.edit([{natural:'B private sentence'}]);
 await f.fire();
 assert.equal(f.writes.length,1);
 assert.equal(f.writes[0].uid,'account-B');
 assert.equal(f.writes[0].data[0].natural,'B private sentence');
 assert.equal(f.pendingFor('account-B').length,0);
});
test('a completed in-flight A write cannot clear A pending data during account switch',async()=>{
 const f=fixture();
 let release;
 const gate=new Promise(resolve=>release=resolve);
 f.block(gate);
 f.setAccount('account-A');f.edit([{natural:'Only A'}]);
 const pending=f.startWrite();
 // The write started as A; B logs in before Firestore finishes.
 f.setAccount('account-B');f.store.set(KEY,JSON.stringify([{natural:'Only B'}]));
 release();await pending;
 assert.equal(f.writes.length,1);
 assert.equal(f.writes[0].uid,'account-A');
 assert.equal(f.writes[0].data[0].natural,'Only A');
 assert.ok(f.pendingFor('account-A').includes(KEY),'do not mutate stale account bookkeeping');
 assert.equal(f.pendingFor('account-B').length,0);
});
test('an in-flight save cannot clear a newer unsaved edit by the same owner',async()=>{
 const f=fixture();
 let release;
 const gate=new Promise(resolve=>release=resolve);
 f.block(gate);
 f.setAccount('account-A');f.edit([{natural:'First draft'}]);
 const oldWrite=f.startWrite();
 f.edit([{natural:'Revised draft'}]);
 release();await oldWrite;
 assert.ok(f.pendingFor('account-A').includes(KEY));
 f.block(null);
 await f.fire();
 assert.equal(f.writes.length,2);
 assert.equal(f.writes[1].data[0].natural,'Revised draft');
 assert.equal(f.pendingFor('account-A').length,0);
});
