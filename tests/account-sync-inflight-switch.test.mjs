import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Run the actual account-sync control flow against mocked Firestore and storage.
// No Firebase imports, browser account access, keys or network calls.
const source=readFileSync(new URL('../account-sync.js',import.meta.url),'utf8');
const script=source.replace(/^import .*;\s*$/gm,'')
 .replace(/\nstart\(\);\s*$/, '\nglobalThis.__hooks={syncAll,setAccount(uid){accountEpoch++;user=uid?{uid}:null;ready=true},setDatabase(f){dbFns=f;db={}}};\n');
const KEY='speakingym-saved-coaching-v1',OWNER='speakingym-sync-owner-fixture';
function deferred(){let resolve;const promise=new Promise(ok=>resolve=ok);return {promise,resolve:()=>resolve()}}
function fixture(){
 const state=new Map(),cloud=new Map(),reads=[],writes=[],readGates=new Map(),writeGates=new Map();
 const storage={
  getItem:key=>state.has(key)?state.get(key):null,
  setItem:(key,value)=>state.set(key,String(value)),
  removeItem:key=>state.delete(key)
 };
 const readSnapshot=st=>{const text=st.getItem(KEY);return text===null?{}:{[KEY]:JSON.parse(text)}};
 const document={getElementById:id=>id==='sg-account-status'?{set textContent(value){}}:null};
 const window={dispatchEvent(){},location:{reload(){throw Error('Unexpected page reload')}}};
 const context={
  firebaseConfig:{},SYNC_ITEMS:[{key:KEY,doc:'coaching',type:'records'}],OWNER_KEY:OWNER,
  localStorage:storage,document,window,Event:class{constructor(name){this.type=name}},
  readSnapshot,
  removeSnapshot:st=>st.removeItem(KEY),
  applySnapshot:(st,snap)=>{if(snap[KEY]!==undefined)st.setItem(KEY,JSON.stringify(snap[KEY]))},
  mergeSnapshots:(local,remote)=>({...remote,...local}),
  snapshotsEqual:(a,b)=>JSON.stringify(a)===JSON.stringify(b),
  normalizeValue:(_,value)=>value,
 };
 vm.runInNewContext(script,context);
 const h=context.__hooks;
 assert.ok(h,'test must exercise production syncAll, not a reimplementation');
 h.setDatabase({
  doc:(_,collection,uid)=>uid,
  serverTimestamp:()=>0,
  async getDoc(uid){
   reads.push(uid);
   if(readGates.has(uid))await readGates.get(uid).promise;
   const data=cloud.get(uid);
   return {exists:()=>data!==undefined,data:()=>({payload:JSON.stringify(data)})};
  },
  async setDoc(uid,payload){
   const value=JSON.parse(payload.payload);
   writes.push({uid,value});
   if(writeGates.has(uid))await writeGates.get(uid).promise;
   cloud.set(uid,value);
  }
 });
 return {
  change(uid,value){
   h.setAccount(uid);
   if(uid)storage.setItem(OWNER,uid);else storage.removeItem(OWNER);
   if(value===null)storage.removeItem(KEY);else storage.setItem(KEY,JSON.stringify(value));
  },
  setLocal(value){storage.setItem(KEY,JSON.stringify(value))},
  local(){return readSnapshot(storage)[KEY]},
  setRemote:(uid,value)=>cloud.set(uid,value),
  readGates,writeGates,reads,writes,
  sync:()=>h.syncAll({reloadOnChange:false}),
  dirty(uid){return JSON.parse(storage.getItem('speakingym-account-dirty:'+uid)||'[]')},
  markDirty(uid){storage.setItem('speakingym-account-dirty:'+uid,JSON.stringify([KEY]))},
 };
}
async function settle(){for(let i=0;i<24;i++)await Promise.resolve()}

test('A cloud read finishing after B signs in cannot replace B records',async()=>{
 const f=fixture(),gate=deferred();
 f.change('A',[{natural:'A private draft'}]);f.setRemote('A',[{natural:'A remote'}]);
 f.readGates.set('A',gate);
 const old=f.sync();await settle();
 assert.deepEqual(f.reads,['A']);
 f.change('B',[{natural:'B private draft'}]);f.setRemote('B',[{natural:'B own cloud'}]);
 await f.sync(); // queued while A is still in flight
 gate.resolve();await old;await settle();
 assert.deepEqual(f.local(),[{natural:'B own cloud'}]);
 assert.deepEqual(f.reads,['A','B']);
 assert.deepEqual(f.writes,[],'must not write A private data under B credentials');
});
test('in-flight A cloud write cannot overwrite B local draft after account switch',async()=>{
 const f=fixture(),gate=deferred();
 f.change('A',[{natural:'Only A'}]);f.markDirty('A');
 f.writeGates.set('A',gate);
 const old=f.sync();await settle();
 assert.equal(f.writes.length,1);
 assert.equal(f.writes[0].uid,'A');
 f.change('B',[{natural:'Only B'}]);f.setRemote('B',[{natural:'Only B'}]);
 await f.sync();
 gate.resolve();await old;await settle();
 assert.deepEqual(f.local(),[{natural:'Only B'}]);
 assert.deepEqual(f.writes.map(w=>w.uid),['A']);
 assert.ok(f.dirty('A').includes(KEY),'do not clear old owner pending flag after switch');
});
test('a new local edit while cloud write is pending is retained and synced',async()=>{
 const f=fixture(),gate=deferred();
 f.change('A',[{natural:'Earlier'}]);f.markDirty('A');f.writeGates.set('A',gate);
 const first=f.sync();await settle();
 f.setLocal([{natural:'Newer'}]);f.markDirty('A');
 gate.resolve();await first;await settle();
 assert.deepEqual(f.local(),[{natural:'Newer'}]);
 assert.equal(f.writes.at(-1).value[0].natural,'Newer');
 assert.deepEqual(f.dirty('A'),[]);
});
