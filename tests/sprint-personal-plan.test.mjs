import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../sprint-personal-plan.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../reflex.html',import.meta.url),'utf8');
const diagnosis=readFileSync(new URL('../sprint-diagnosis.js',import.meta.url),'utf8');
const cards=[
 {id:'repair1',group:'repair'}, {id:'repair2',group:'repair'},
 {id:'hold1',group:'hold'}, {id:'hold2',group:'hold'},
 {id:'connect1',group:'connect'}, {id:'bound1',group:'boundaries'}
];
const date='2026-10-23T10:11:12.000Z';
const hist=[
 {date,level:'standard',attempts:[
  {cardId:'hold1',outcome:'spoken',transcript:'Sensitive private example'},
  {cardId:'repair1',outcome:'stuck',transcript:'Another sensitive example'},
  {cardId:'hold2',outcome:'stuck'}
 ]},
 {date:'2026-10-22T10:11:12.000Z',level:'standard',attempts:[
  {cardId:'connect1',outcome:'stuck'},
  {cardId:'repair1',outcome:'spoken'}
 ]}
];
const reasons=[{session:date+'|1|repair1',reason:'words'},
 {session:date+'|2|hold2',reason:'words'}];
function harness(initial={}){
 const store=new Map(Object.entries(initial));
 const localStorage={
  getItem:key=>store.get(key)??null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
 };
 const window={speakingymAccount:{isLoggedIn:()=>false,getUid:()=>null}};
 vm.runInNewContext(script,{window,localStorage,Date,console},{filename:'sprint-personal-plan.js'});
 return {api:window.speakingymPersonalPlan,window,store,localStorage};
}
test('personal plan has actual practice card IDs for three AI-free 60-second rounds',()=>{
 const a=harness(),p=a.api.plan(cards,[],[]);
 assert.deepEqual(Array.from(p.stages.map(s=>s.id)),['retry','focus','fresh']);
 assert.equal(p.topReason,null);
 assert.equal(p.historyCount,0);
 assert.equal(p.stages[0].poolIds.length,6);
 assert.equal(p.stages[1].poolIds.length,6);
 assert.equal(p.stages[2].poolIds.length,6);
 assert.match(p.stages[0].title,/ウォームアップ/);
 assert.doesNotMatch(JSON.stringify(p),/Sensitive/);
});
test('reason-backed focus and unseen cards are prioritized, not just labels',()=>{
 const a=harness(),p=a.api.plan(cards,hist,reasons);
 assert.equal(p.topReason,'words');
 assert.equal(p.reasonCount,2);
 assert.equal(p.missCount,3,'the earlier unresolved connect problem is still an active retry');
 assert.deepEqual(Array.from(p.stages[0].poolIds),['hold2','repair1','connect1']);
 assert.deepEqual(Array.from(p.stages[1].poolIds),['repair1','repair2']);
 assert.deepEqual(Array.from(p.stages[2].poolIds),['repair2']);
 assert.match(p.stages[1].description,/単語が出なかった/);
 assert.doesNotMatch(JSON.stringify(p),/Sensitive private example|Another sensitive example/);
});
test('false, orphan and malformed reason records cannot invent a weakness',()=>{
 const a=harness(),p=a.api.plan(cards,hist,[
  {session:date+'|0|hold1',reason:'words'}, // actually spoken
  {session:'not a stored answer',reason:'surprise'},
  {session:date+'|1|repair1',reason:'hacker_id'},
  null
 ]);
 assert.equal(p.topReason,null);
 assert.equal(p.reasonCount,0);
 assert.deepEqual(Array.from(p.stages[1].poolIds),['hold1','hold2']);
});
test('a later spoken answer clears that card from retry priority',()=>{
 const a=harness();
 const p=a.api.plan(cards,[{
  date:'2026-10-24T08:00:00.000Z',
  attempts:[{cardId:'repair1',outcome:'spoken'}]
 },...hist],reasons);
 assert.deepEqual(Array.from(p.stages[0].poolIds),['hold2','connect1']);
 assert.equal(p.stages[0].poolIds.includes('repair1'),false,'later success must clear this retry');
});
test('recently seen is NOT presented as a verified initial-unseen skill test',()=>{
 const a=harness(),everything=[{date,attempts:cards.map(c=>({cardId:c.id,outcome:'spoken'}))}];
 const p=a.api.plan(cards,everything,[]);
 assert.equal(p.unseenCount,0);
 assert.match(p.stages[2].description,/新しいお題がない/);
 assert.equal(p.stages[2].poolIds.length,6);
});
test('JST-day progress is scoped per account and refuses login-transition writes',()=>{
 const a=harness();
 const before=new Date('2026-10-23T14:59:59Z');
 const after=new Date('2026-10-23T15:00:00Z');
 assert.equal(a.api.dateJST(before),'2026-10-23');
 assert.equal(a.api.dateJST(after),'2026-10-24');
 assert.equal(a.api.markDone(0,before),true);
 assert.deepEqual(Array.from(a.api.getProgress(before).done),[true,false,false]);
 assert.deepEqual(Array.from(a.api.getProgress(after).done),[false,false,false]);
 assert.equal(a.api.markDone(3,before),false);
 const guestKey='speakingym-sprint-personal-progress-v1:guest';
 const guest=a.store.get(guestKey);
 a.localStorage.setItem('speakingym-account-owner-v1','owner-A');
 assert.equal(a.api.getProgress(before),null);
 assert.equal(a.api.markDone(2,before),false);
 a.window.speakingymAccount={isLoggedIn:()=>true,getUid:()=> 'owner-A'};
 assert.equal(a.api.markDone(1,before),true);
 assert.deepEqual(Array.from(a.api.getProgress(before).done),[false,true,false]);
 assert.equal(a.store.get(guestKey),guest);
 assert.equal(a.api.clearProgress(),true);
 assert.equal(a.store.get(guestKey),guest);
 assert.equal(a.store.has('speakingym-sprint-personal-progress-v1:user:owner-A'),false);
 a.window.speakingymAccount={isLoggedIn:()=>true,getUid:()=> 'owner-B'};
 assert.equal(a.api.markDone(0,before),false);
});
test('corrupt saved progress fails safely and never mutates the synced legacy keys',()=>{
 const initial={
  'speakingym-sprint-personal-progress-v1:guest':'{broken',
  'speakingym-reflex-history-v1':'[{"date":"legacy"}]',
  'speakingym-reflex-misses-v1':'["hold2"]'
 };
 const a=harness(initial);
 assert.deepEqual(Array.from(a.api.getProgress(new Date('2026-10-23T06:00:00Z')).done),[false,false,false]);
 assert.equal(a.api.markDone(2,new Date('2026-10-23T06:00:00Z')),true);
 assert.equal(a.store.get('speakingym-reflex-history-v1'),initial['speakingym-reflex-history-v1']);
 assert.equal(a.store.get('speakingym-reflex-misses-v1'),initial['speakingym-reflex-misses-v1']);
});
test('sprint integration launches real stage pools and preserves existing AI quotas',()=>{
 assert.match(page,/id="personalPlan"/);
 assert.match(page,/id="personalSteps"/);
 assert.match(page,/id="personalNext"/);
 assert.match(page,/src="\.\/sprint-personal-plan\.js"/);
 assert.match(page,/function startPersonalStage\(i\)/);
 assert.match(page,/function start\(onlyMissed=false,personalIds=null\)/);
 assert.match(page,/window\.speakingymPersonalPlan\?\.markDone\(personalRunningStage\)/);
 assert.match(page,/speakingymPersonalPlan\?\.clearProgress\(\)/);
 assert.match(diagnosis,/getRecords/);
 assert.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|AIza/);
 assert.doesNotMatch(script,/stripe|gemini/i);
 assert.match(page,/id="requestTeacher"/);
});
