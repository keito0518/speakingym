import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 FREEZE_SCENES,FREEZE_REASONS,freezeDay,normalizeFreezeProgress,
 nextFreezeScene,sceneAttempt,recoveryReply,recordFreezeAttempt,freezeSummary
} from '../freeze-breaker-data.mjs';

const date=iso=>new Date(iso);
test('Freeze Breaker has varied concrete travel and work contexts, alternatives and no AI keys',()=>{
 assert.ok(FREEZE_SCENES.length>=13);
 assert.equal(new Set(FREEZE_SCENES.map(s=>s.id)).size,FREEZE_SCENES.length);
 assert.ok(Object.keys(FREEZE_REASONS).length>=4);
 for(const scene of FREEZE_SCENES){
  assert.ok(scene.context.length>3);
  assert.ok(scene.conversationLink.startsWith('./scenes.html?scene='));
  assert.ok(scene.variations.length>=2);
  for(const variation of scene.variations){
   assert.ok(variation.ask.length>15);
   assert.ok(variation.followups.length>=2);
   assert.ok(variation.examples.every(t=>typeof t==='string'&&t.length>5));
  }
 }
 const source=readFileSync(new URL('../freeze-breaker-data.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bfetch\s*\(|GEMINI_API_KEY|STRIPE_SECRET|\blocalStorage\b/);
});
test('survival scenarios teach distinct repair moves and make learners think before examples',()=>{
 assert.equal(FREEZE_SCENES.length,13);
 const added=['fast-english','unknown-word','long-explanation','sudden-opinion','change-booking','missing-word'];
 for(const id of added){
  const scenario=FREEZE_SCENES.find(item=>item.id===id);
  assert.ok(scenario,`missing scenario ${id}`);
  assert.match(scenario.name,/速い|知らない|長い|意見|変更|言いたい/);
  assert.ok(scenario.variations.length>=2,`${id} needs replay variety`);
  assert.ok(new Set(scenario.variations.map(item=>item.ask)).size>=2,`${id} repeats the same opening`);
  assert.ok(new Set(scenario.variations.map(item=>item.goal)).size>=2,`${id} does not teach a distinct move`);
  assert.ok(scenario.variations.every(item=>item.followups.length>=2&&item.examples.length>=2));
 }
 assert.match(FREEZE_REASONS.unknown.rescue,/What does that word mean/);
 assert.match(FREEZE_REASONS.long.rescue,/break that into smaller steps/);
 const vocabulary=sceneAttempt('unknown-word',{});
 assert.equal(recoveryReply(vocabulary,'unknown').line,vocabulary.followup,
  'the vocabulary repair receives a definition that matches the unknown word');
 const explanation=sceneAttempt('long-explanation',{});
 assert.ok(recoveryReply(explanation,'long').line.endsWith(explanation.followup),
  'the long explanation repair continues with a smaller, coherent step');
 const html=readFileSync(new URL('../freeze-breaker.html',import.meta.url),'utf8');
 assert.match(html,/自分の言葉で聞き返し・確認・時間づくりを試そう/);
 assert.match(html,/<details class="prompt-help" id="rescue-hint"><summary>言い方に迷ったら例を見る/,
  'the sample recovery must be hidden until requested');
 const script=readFileSync(new URL('../freeze-breaker.js',import.meta.url),'utf8');
 assert.ok(script.includes("$('rescue-hint').addEventListener('toggle'")&&script.includes('usedHint=true'),
  'opening a sample should affect the self-reported practice stage');
});
test('JST day and scheduled 1/3/7/14-day independent self-report retries',()=>{
 assert.equal(freezeDay(date('2026-10-22T14:59:59Z')),'2026-10-22');
 assert.equal(freezeDay(date('2026-10-22T15:00:00Z')),'2026-10-23');
 let state={};
 for(const [day,stage,due] of [
  ['2026-10-23',1,'2026-10-24'],
  ['2026-10-24',2,'2026-10-27'],
  ['2026-10-27',3,'2026-11-03'],
  ['2026-11-03',4,'2026-11-17']
 ]){
  state=recordFreezeAttempt(state,{sceneId:'cafe',reason:'surprise',saidIt:true,usedHint:false},
   date(day+'T12:00:00+09:00'));
  assert.equal(state.records.cafe.stage,stage);
  assert.equal(state.records.cafe.due,due);
 }
 assert.equal(state.records.cafe.recovered,4);
 assert.equal(state.records.cafe.attempts,4);
 const failed=recordFreezeAttempt(state,{sceneId:'cafe',reason:'words',saidIt:false},date('2026-11-17T12:00:00+09:00'));
 assert.equal(failed.records.cafe.stage,0);
 assert.equal(failed.records.cafe.due,'2026-11-18');
 assert.equal(failed.records.cafe.recovered,4);
});
test('hints do not count as independent success but allow the learner to practise',()=>{
 let p=recordFreezeAttempt({},{
  sceneId:'hotel',reason:'unsure',saidIt:true,usedHint:true
 },date('2026-10-23T12:00:00+09:00'));
 assert.equal(p.records.hotel.stage,0);
 assert.equal(p.records.hotel.recovered,0);
 assert.equal(p.records.hotel.attempts,1);
 assert.equal(p.records.hotel.due,'2026-10-24');
 p=recordFreezeAttempt(p,{
  sceneId:'hotel',reason:'unsure',saidIt:true,usedHint:false
 },date('2026-10-24T12:00:00+09:00'));
 assert.equal(p.records.hotel.recovered,1);
});
test('fluent first answer is recorded without inventing a freeze reason',()=>{
 const when=date('2026-10-24T09:00:00+09:00');
 const p=recordFreezeAttempt({}, {sceneId:'cafe',reason:null,saidIt:true,usedHint:false},when);
 assert.equal(p.records.cafe.attempts,1);
 assert.equal(p.records.cafe.recovered,1);
 assert.equal(p.records.cafe.lastReason,null);
 assert.ok(Object.values(p.records.cafe.reasonCounts).every(count=>count===0));
 assert.equal(freezeSummary(p,when).topReason,null);
 const bogus=recordFreezeAttempt(p,{sceneId:'cafe',reason:'not-a-reason',saidIt:true},when);
 assert.deepEqual(bogus,p);
});
test('retry scenarios rotate dialogue and followups after each result',()=>{
 let p={},a=sceneAttempt('cafe',p);
 p=recordFreezeAttempt(p,{sceneId:'cafe',reason:'words',saidIt:false},date('2026-10-23T12:00:00+09:00'));
 const b=sceneAttempt('cafe',p);
 assert.notEqual(a.variation.ask,b.variation.ask);
 p=recordFreezeAttempt(p,{sceneId:'cafe',reason:'words',saidIt:false},date('2026-10-24T12:00:00+09:00'));
 const c=sceneAttempt('cafe',p);
 assert.notEqual(a.followup,c.followup);
 assert.equal(sceneAttempt('invalid',p),null);
});
test('conversation rescue hears different scripted next lines based on the chosen repair',()=>{
 const task=sceneAttempt('cafe',{});
 const uninterrupted=recoveryReply(task,null);
 assert.equal(uninterrupted.line,task.followup);
 assert.equal(uninterrupted.rate,.86);
 const repeat=recoveryReply(task,'misunderstood');
 assert.match(repeat.line,/say that again more slowly/);
 assert.ok(repeat.line.endsWith(task.variation.ask));
 assert.equal(repeat.rate,.72,'asking to repeat should produce slower speech');
 const words=recoveryReply(task,'words'),wait=recoveryReply(task,'surprise'),options=recoveryReply(task,'unsure');
 assert.ok([words,wait,options].every(reply=>reply.line.endsWith(task.followup)));
 assert.notEqual(words.line,wait.line);
 assert.notEqual(wait.line,options.line);
 assert.deepEqual(recoveryReply(task,'injected'),uninterrupted);
 assert.match(repeat.caption,/想定/);
});
test('recommendation prioritizes due reviews, the most reported weakness, then unseen scenes',()=>{
 let p={};
 assert.equal(nextFreezeScene(p,date('2026-10-23T12:00:00+09:00')).id,'cafe');
 p=recordFreezeAttempt(p,{sceneId:'hotel',reason:'words',saidIt:false},date('2026-10-22T12:00:00+09:00'));
 assert.equal(nextFreezeScene(p,date('2026-10-23T12:00:00+09:00')).id,'hotel');
 p=recordFreezeAttempt(p,{sceneId:'hotel',reason:'words',saidIt:true},date('2026-10-23T12:00:00+09:00'));
 assert.equal(nextFreezeScene(p,date('2026-10-23T12:00:00+09:00')).id,'missing-word');
});
test('next recommendation targets the most reported obstacle after due reviews',()=>{
 const when=date('2026-10-23T12:00:00+09:00');
 let p={};
 p=recordFreezeAttempt(p,{sceneId:'cafe',reason:'unknown',saidIt:false},when);
 assert.equal(nextFreezeScene(p,when).id,'unknown-word');
 p=recordFreezeAttempt(p,{sceneId:'hotel',reason:'misunderstood',saidIt:false},when);
 assert.equal(nextFreezeScene(p,date('2026-10-24T12:00:00+09:00')).id,'cafe',
  'a due retry is always ahead of a targeted new scene');
});
test('malformed/untrusted state cannot inject keys, fake mastery, or store texts',()=>{
 const bad=normalizeFreezeProgress({records:JSON.parse('{"__proto__":{"stage":4,"due":"2026-10-20","last":"2026-10-19"},"cafe":{"stage":9,"due":"2026-10-24","last":"2026-10-23"},"hotel":{"stage":2,"due":"2026-10-24","last":"2026-10-23","attempts":-100,"recovered":"99","privateText":"sensitive"}}')});
 assert.equal(Object.getPrototypeOf(bad.records),null);
 assert.equal(Object.hasOwn(bad.records,'__proto__'),false);
 assert.equal(Object.hasOwn(bad.records,'cafe'),false);
 assert.equal(bad.records.hotel.attempts,0);
 assert.equal(bad.records.hotel.recovered,0);
 assert.equal(Object.hasOwn(bad.records.hotel,'privateText'),false);
 const unchanged=recordFreezeAttempt(bad,{sceneId:'cafe',reason:'bogus',saidIt:true},date('2026-10-23T12:00:00+09:00'));
 assert.deepEqual(unchanged,bad);
 const summary=freezeSummary(bad,date('2026-10-23T12:00:00+09:00'));
 assert.equal(summary.scenes,0);
 assert.equal(summary.attempts,0);
 assert.equal({}.polluted,undefined);
});
test('summary describes only self-reported outcomes, not accuracy',()=>{
 let p={};
 p=recordFreezeAttempt(p,{sceneId:'train',reason:'misunderstood',saidIt:true},date('2026-10-23T12:00:00+09:00'));
 p=recordFreezeAttempt(p,{sceneId:'work',reason:'words',saidIt:false},date('2026-10-23T12:00:00+09:00'));
 const sum=freezeSummary(p,date('2026-10-23T12:00:00+09:00'));
 assert.equal(sum.scenes,2);
 assert.equal(sum.attempts,2);
 assert.equal(sum.recovered,1);
 assert.equal(sum.due,0);
 assert.equal(sum.nextDue,'2026-10-24');
});

test('every Freeze Breaker JS DOM identifier exists in the rendered HTML',()=>{
 const html=readFileSync(new URL('../freeze-breaker.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../freeze-breaker.js',import.meta.url),'utf8');
 const referenced=[...script.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map(match=>match[1]);
 assert.ok(referenced.length>=30);
 for(const id of new Set(referenced))
  assert.match(html,new RegExp('id="'+id+'"'),id+' must exist in freeze-breaker.html');
 assert.match(html,/音声がブラウザ提供元の認識サービスに送られる場合があります/);
 assert.match(html,/認識した英文・録音は保存しません/);
 assert.match(html,/自分で追加のAI講評を依頼した場合のみ/);
 assert.match(html,/通常の練習は台本型/);
 assert.match(html,/id="first-mic"/);
 assert.match(html,/id="retry-mic"/);
 assert.match(script,/window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
 assert.match(script,/\$\('request-coach'\)\.addEventListener\('click',requestCoach\)/,
  'only a deliberate click can initiate optional AI coaching');
 assert.match(script,/if\(health\.plansEnabled!==true\)throw Error\('plans_not_ready'\)/,
  'coaching must fail closed unless server quotas are enabled');
});

test('free no-AI Freeze Breaker is linked from the public training and pricing flow',()=>{
 for(const path of ['index.html','plans.html','phrasebook.html','account.html','transfer.html']){
  const html=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(html,/href="\.\/freeze-breaker\.html"/,path+' should link to Freeze Breaker');
 }
 const gym=readFileSync(new URL('../freeze-breaker.html',import.meta.url),'utf8');
 assert.match(gym,/通常の練習は台本型で、AI利用回数を消費しません/);
 assert.match(gym,/AI先生の利用回数を1回消費します/);
});

test('personalized rescue insight comes from bounded self-reported reasons, not AI scoring',()=>{
 const when=new Date('2026-10-23T12:00:00+09:00');
 let state={};
 state=recordFreezeAttempt(state,{sceneId:'cafe',reason:'surprise',saidIt:false},when);
 state=recordFreezeAttempt(state,{sceneId:'hotel',reason:'surprise',saidIt:true},when);
 state=recordFreezeAttempt(state,{sceneId:'work',reason:'words',saidIt:false},when);
 const insight=freezeSummary(state,when);
 assert.equal(insight.topReason,'surprise');
 assert.equal(insight.topReasonCount,2);
 assert.match(insight.nextRepairHint,/give me a second/i);
 assert.equal(state.records.hotel.reasonCounts.surprise,1);
 assert.equal(Object.hasOwn(state.records.hotel,'question'),false);
 const json=JSON.stringify(state);
 assert.doesNotMatch(json,/oat milk|email|question|learnerText|reply/);
 const corrupted=normalizeFreezeProgress({records:{cafe:{
  ...state.records.cafe,
  reasonCounts:{surprise:'not a number',misunderstood:-1,words:999999999}
 }}});
 assert.equal(corrupted.records.cafe.reasonCounts.surprise,0);
 assert.equal(corrupted.records.cafe.reasonCounts.misunderstood,0);
 assert.equal(corrupted.records.cafe.reasonCounts.words,0);
});
