import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Real pro-study.js UI control flow with synthetic entitlement, DOM and login.
// No Stripe charge, real Firebase user or Cloudflare API call occurs.
const source=readFileSync(new URL('../pro-study.js',import.meta.url),'utf8');
const runnable=source.replace(/^import .*;\s*$/gm,'')
 .replace(/void refresh\(\);\s*$/, '\nglobalThis.__refresh=refresh;');
function deferred(){let resolve;const promise=new Promise(ok=>resolve=ok);return {promise,resolve}}
function fixture(){
 const nodes=new Map(),token={value:'account-A-token'},pending=deferred(),handlers={};
 let snapshots=0;
 function node(tag='div'){
  return {tagName:tag,textContent:'',hidden:false,children:[],
   classList:{toggle(){}},setAttribute(){},addEventListener(){},
   append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items}};
 }
 const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},
  createElement:node,addEventListener(){}};
 const window={speakingymAccount:{getIdToken:async()=>token.value},addEventListener(name,cb){handlers[name]=cb}};
 const view={cards:[],totalUniqueExpressions:0,suggestion:'練習を続けよう',
  report:{recordedLast7Days:0,savedSessions:0,recent:{attempted:0,spoken:0},comparison:null}};
 const context={window,document,localStorage:{},AbortSignal,
  readSnapshot:()=>{snapshots++;return {}},
  buildProStudyPlan:()=>view,fetch:async()=>({ok:true,json:()=>pending.promise})};
 vm.runInNewContext(runnable,context);
 assert.equal(typeof context.__refresh,'function');
 return {refresh:context.__refresh,token,pending,nodes,handlers,get reads(){return snapshots}};
}
async function settle(){for(let i=0;i<8;i++)await Promise.resolve()}
test('stale Pro verification never opens a different account local learning history',async()=>{
 const f=fixture(),old=f.refresh();await settle();
 f.token.value='account-B-token';
 f.pending.resolve({plan:'pro'});await old;
 assert.equal(f.nodes.get('pro-content').hidden,true);
 assert.equal(f.reads,0,'new account local content must never be read under old Pro grant');
 assert.match(f.nodes.get('pro-access-status').textContent,/ログイン状態が変わりました/);
});
test('logout during an in-flight Pro verification remains locked',async()=>{
 const f=fixture(),old=f.refresh();await settle();
 f.token.value=null;
 f.pending.resolve({plan:'pro'});await old;
 assert.equal(f.nodes.get('pro-content').hidden,true);
 assert.equal(f.reads,0);
});
test('unchanged account can still open Pro study after verified entitlement',async()=>{
 const f=fixture(),current=f.refresh();await settle();
 f.pending.resolve({plan:'pro'});await current;
 assert.equal(f.nodes.get('pro-content').hidden,false);
 assert.equal(f.reads,1);
 assert.match(f.nodes.get('review-progress').textContent,/復習カード/);
});

test('authentication transition immediately hides previously visible Pro history',async()=>{
 const f=fixture(),current=f.refresh();await settle();
 f.pending.resolve({plan:'pro'});await current;
 assert.equal(f.nodes.get('pro-content').hidden,false);
 assert.equal(typeof f.handlers['speakingym:account-changing'],'function');
 f.handlers['speakingym:account-changing']();
 assert.equal(f.nodes.get('pro-content').hidden,true);
 assert.match(f.nodes.get('pro-access-status').textContent,/新しいアカウント/);
});
test('account-sync emits immediate owner-change notification before long cloud sync',()=>{
 const source=readFileSync(new URL('../account-sync.js',import.meta.url),'utf8');
 const handler=source.slice(source.indexOf('async function handleAuth(next){'));
 const eventPosition=handler.indexOf('window.dispatchEvent(new Event("speakingym:account-changing"))');
 const syncPosition=handler.indexOf('if(next)await syncAll()');
 assert.ok(eventPosition>=0&&syncPosition>eventPosition);
});
