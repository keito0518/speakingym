import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {buildProStudyPlan,markReview,normalizeReviewProgress,reviewDay} from '../pro-study-data.mjs';
import {OWNER_KEY} from '../account-data.mjs';

// Run the real Pro UI logic in an offline synthetic DOM. Entitlement responses
// are fixtures: this is NOT Firebase, a physical browser or a paid subscription.
const src=readFileSync(new URL('../pro-study.js',import.meta.url),'utf8');
const runnable=src.replace(/^import .*;\s*$/gm,'')
 .replace(/void refresh\(\);\s*$/, '\nglobalThis.__refresh=refresh;');

function fixture(){
 const nodes=new Map(),listeners=new Map(),storage=new Map([[OWNER_KEY,'test-user-A']]);
 const session={uid:'test-user-A',token:'synthetic-token-A',plan:'pro'};
 let reads=0;
 const data={
  'speakingym-reflex-ai-teacher-v1':[{notes:[{
   feedback:{improved:'Could you repeat that?',improvement:'丁寧に聞き返す'}
  }]}],
  'speakingym-reflex-saved-phrases-v1':[{text:'Could I have some water?',goal:'お水を頼む'}]
 };
 function node(tag='div'){
  const handlers=new Map();
  return {tagName:tag,textContent:'',hidden:false,children:[],attributes:{},
   classList:{toggle(){}},
   setAttribute(k,v){this.attributes[k]=v},
   addEventListener(k,v){handlers.set(k,v)},
   trigger(k){return handlers.get(k)?.()},
   append(...items){this.children.push(...items)},
   replaceChildren(...items){this.children=items}};
 }
 const document={
  getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},
  createElement:node,addEventListener(){}
 };
 const window={
  speakingymAccount:{getIdToken:async()=>session.token,getUid:()=>session.uid},
  addEventListener:(name,cb)=>listeners.set(name,cb)
 };
 const localStorage={
  getItem:key=>storage.get(key)||null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key)
 };
 const context={window,document,localStorage,AbortSignal,OWNER_KEY,
  readSnapshot:()=>{reads++;return data},
  buildProStudyPlan,normalizeReviewProgress,markReview,reviewDay,
  fetch:async()=>({ok:true,json:async()=>({plan:session.plan})})
 };
 vm.runInNewContext(runnable,context);
 return {nodes,listeners,session,storage,refresh:context.__refresh,get reads(){return reads}};
}
const buttons=(node)=>node.children.flatMap(child=>
 child.tagName==='button'?[child]:buttons(child));

test('Pro review actions persist progress only under the verified owner and survive reload',async()=>{
 const f=fixture();
 await f.refresh();
 assert.equal(f.nodes.get('pro-content').hidden,false);
 assert.equal(f.nodes.get('daily-plan').children.length,3);
 const card=f.nodes.get('review-list').children[0],remember=buttons(card).find(b=>b.textContent==='言えた ✓');
 assert.ok(remember,'must provide an accessible self-report button');
 remember.trigger('click');
 const a=f.storage.get('speakingym-pro-review-progress-v1:test-user-A');
 assert.ok(a,'review state must be persisted under the authenticated owner');
 const saved=JSON.parse(a);
 assert.equal(saved.days[Object.keys(saved.days)[0]].attempted,1);
 assert.equal(saved.days[Object.keys(saved.days)[0]].remembered,1);
 assert.equal(Object.keys(saved.cards).length,1);
 assert.match(f.nodes.get('review-status').textContent,/この端末に保存/);
 await f.refresh();
 assert.equal(JSON.parse(f.storage.get('speakingym-pro-review-progress-v1:test-user-A')).cards[
  Object.keys(saved.cards)[0]].stage,1);
});

test('account changes hide cards instantly and do not mix saved review progress',async()=>{
 const f=fixture();
 await f.refresh();
 const oldButton=buttons(f.nodes.get('review-list').children[0]).find(x=>x.textContent==='言えた ✓');
 oldButton.trigger('click');
 const oldJson=f.storage.get('speakingym-pro-review-progress-v1:test-user-A');
 f.listeners.get('speakingym:account-changing')();
 assert.equal(f.nodes.get('pro-content').hidden,true);
 assert.equal(f.nodes.get('review-list').children.length,0);
 f.session.uid='test-user-B';f.session.token='synthetic-token-B';
 f.storage.set(OWNER_KEY,'test-user-B');
 await f.refresh();
 assert.equal(f.nodes.get('pro-content').hidden,false);
 assert.equal(f.nodes.get('review-list').children.length,2);
 assert.equal(f.storage.has('speakingym-pro-review-progress-v1:test-user-B'),false);
 // A button retained from account A cannot create writes after epoch invalidation.
 oldButton.trigger('click');
 assert.equal(f.storage.get('speakingym-pro-review-progress-v1:test-user-A'),oldJson);
 assert.equal(f.storage.has('speakingym-pro-review-progress-v1:test-user-B'),false);
 const b=buttons(f.nodes.get('review-list').children[0]).find(x=>x.textContent==='まだ苦手 ↻');
 b.trigger('click');
 assert.ok(f.storage.has('speakingym-pro-review-progress-v1:test-user-B'));
 assert.equal(f.storage.get('speakingym-pro-review-progress-v1:test-user-A'),oldJson);
});

test('Free or unknown entitlement cannot access review data or mutate a saved record',async()=>{
 const f=fixture();f.session.plan='free';
 await f.refresh();
 assert.equal(f.nodes.get('pro-content').hidden,true);
 assert.equal(f.reads,0);
 assert.equal(f.storage.size,1,'no Pro local progress may be written without entitlement');
});

test('undo mistaken grade restores due expression and rolls back self-report count',async()=>{
 const f=fixture();await f.refresh();
 const before=f.nodes.get('review-list').children.length;
 const card=f.nodes.get('review-list').children[0];
 const remember=buttons(card).find(x=>x.textContent==='言えた ✓');
 remember.trigger('click');
 assert.equal(f.nodes.get('review-undo').hidden,false);
 assert.equal(f.nodes.get('review-list').children.length,before-1);
 f.nodes.get('review-undo').trigger('click');
 assert.equal(f.nodes.get('review-undo').hidden,true);
 assert.equal(f.nodes.get('review-list').children.length,before);
 assert.match(f.nodes.get('review-status').textContent,/取り消しました/);
 const state=JSON.parse(f.storage.get('speakingym-pro-review-progress-v1:test-user-A'));
 assert.equal(Object.keys(state.cards).length,0);
 assert.equal(Object.keys(state.days).length,0);
 // Undo cannot be reused to revoke an unrelated earlier event.
 f.nodes.get('review-undo').trigger('click');
 assert.equal(Object.keys(JSON.parse(f.storage.get('speakingym-pro-review-progress-v1:test-user-A')).cards).length,0);
});

test('account switch invalidates a pending undo and leaves previous account state untouched',async()=>{
 const f=fixture();await f.refresh();
 buttons(f.nodes.get('review-list').children[0]).find(x=>x.textContent==='言えた ✓').trigger('click');
 const a=f.storage.get('speakingym-pro-review-progress-v1:test-user-A');
 f.listeners.get('speakingym:account-changing')();
 assert.equal(f.nodes.get('review-undo').hidden,true);
 f.session.uid='test-user-B';f.session.token='synthetic-token-B';f.storage.set(OWNER_KEY,'test-user-B');
 await f.refresh();
 f.nodes.get('review-undo').trigger('click');
 assert.equal(f.storage.get('speakingym-pro-review-progress-v1:test-user-A'),a);
 assert.equal(f.storage.has('speakingym-pro-review-progress-v1:test-user-B'),false);
});
