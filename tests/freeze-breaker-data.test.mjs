import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 FREEZE_SCENES,FREEZE_REASONS,freezeDay,normalizeFreezeProgress,
 nextFreezeScene,sceneAttempt,recoveryReply,recordFreezeAttempt as saveFreezeAttempt,freezeSummary
} from '../freeze-breaker-data.mjs';

const date=iso=>new Date(iso);
function recordFreezeAttempt(raw,{sceneId,reason=null,comprehensionCorrect=true,usedHint=false,practiceMode='voice-input'},when=new Date()){
 const current=sceneAttempt(sceneId,raw);
 return saveFreezeAttempt(raw,{sceneId,reason,comprehensionCorrect,usedHint,practiceMode,
  variationIndex:current.variationIndex},when);
}
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
test('survival verifies the meaning and only teaches a clarification phrase when it was missed',()=>{
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
 assert.match(recoveryReply(vocabulary,'unknown').examples[0],/deposit back/,
  'the learner confirms the meaning after receiving the definition');
 const explanation=sceneAttempt('long-explanation',{});
 assert.ok(recoveryReply(explanation,'long').line.endsWith(explanation.followup),
  'the long explanation repair continues with a smaller, coherent step');
 assert.match(recoveryReply(explanation,'long').examples[0],/local train/,
  'the learner checks the first instruction rather than restarting the question');
 const missingWord=sceneAttempt('missing-word',{});
 assert.match(recoveryReply(missingWord,'words').examples[0],/aquarium/,
  'after the listener guesses the word, the learner can acknowledge it');
 const html=readFileSync(new URL('../freeze-breaker.html',import.meta.url),'utf8');
 assert.match(html,/相手の用件はどちら/);
 assert.match(html,/聞き取れないときは、聞き返そう/);
 assert.match(html,/場面と用件を見ながら英語で返す/);
 assert.match(html,/<details class="prompt-help" id="rescue-hint"><summary>言い方に迷ったら例を見る/,
  'the sample recovery must be hidden until requested');
 const script=readFileSync(new URL('../freeze-breaker.js',import.meta.url),'utf8');
 assert.match(script,/const otherMeaning=attempt\.scene\.variations\.find/,
  'the comprehension choice compares two messages from the same scene');
 assert.match(script,/const correct=button\.dataset\.correct==='true'/,
  'the answer choice gives a real comprehension check, not a feeling rating');
 assert.match(script,/chooseReason\('misunderstood'\)/,
  'missing the message routes into an audible clarification phrase');
 assert.match(html,/id="finish-practice"/);
 assert.doesNotMatch(html,/id="said-yes"|id="said-no"|自分では、返せたと思う/,
  'the learner does not have to self-rate their speaking to finish');
});
test('JST day and comprehension based review repetition at 1/3/7/14/21-day intervals',()=>{
 assert.equal(freezeDay(date('2026-10-22T14:59:59Z')),'2026-10-22');
 assert.equal(freezeDay(date('2026-10-22T15:00:00Z')),'2026-10-23');
 let state={};
 for(const [day,stage,due] of [
  ['2026-10-23',1,'2026-10-24'],
  ['2026-10-24',2,'2026-10-27'],
  ['2026-10-27',3,'2026-11-03'],
  ['2026-11-03',4,'2026-11-17'],
  ['2026-11-17',5,'2026-12-08']
 ]){
  state=recordFreezeAttempt(state,{sceneId:'cafe',reason:'surprise',comprehensionCorrect:true,usedHint:false},
   date(day+'T12:00:00+09:00'));
  assert.equal(state.records.cafe.stage,stage);
  assert.equal(state.records.cafe.due,due);
 }
 assert.equal(state.records.cafe.voiceInputs,5);
 assert.equal(state.records.cafe.attempts,5);
 const failed=recordFreezeAttempt(state,{sceneId:'cafe',reason:'words',comprehensionCorrect:false},date('2026-12-08T12:00:00+09:00'));
 assert.equal(failed.records.cafe.stage,0);
 assert.equal(failed.records.cafe.due,'2026-12-09');
 assert.equal(failed.records.cafe.voiceInputs,6);
 assert.equal(failed.records.cafe.comprehensionMisses,1);
 assert.equal(sceneAttempt('cafe',failed).variationIndex,failed.records.cafe.repeatVariationIndex,
  'a missed listening line stays available for a later review');
});
test('hints do not count as independent success but allow the learner to practise',()=>{
 let p=recordFreezeAttempt({},{
  sceneId:'hotel',reason:'unsure',comprehensionCorrect:true,usedHint:true
 },date('2026-10-23T12:00:00+09:00'));
 assert.equal(p.records.hotel.stage,0);
 assert.equal(p.records.hotel.voiceInputs,1);
 assert.equal(p.records.hotel.hintUses,1);
 assert.equal(p.records.hotel.attempts,1);
 assert.equal(p.records.hotel.due,'2026-10-24');
 assert.equal(nextFreezeScene(p,date('2026-10-23T12:00:00+09:00')).id,'hotel',
  'recent hint use raises the same scene for another listening turn');
 assert.equal(nextFreezeScene(p,date('2026-10-24T12:00:00+09:00')).id,'hotel',
  'a scheduled due review is served before new scenes');
 p=recordFreezeAttempt(p,{
  sceneId:'hotel',reason:'unsure',comprehensionCorrect:true,usedHint:false
 },date('2026-10-24T12:00:00+09:00'));
 assert.equal(p.records.hotel.voiceInputs,2);
 assert.equal(nextFreezeScene(p,date('2026-10-24T12:00:00+09:00')).id,'cafe',
  'a correct review without hints releases the next new scene');
});
test('correct comprehension is stored without inventing a recovery reason',()=>{
 const when=date('2026-10-24T09:00:00+09:00');
 const p=recordFreezeAttempt({}, {sceneId:'cafe',reason:null,comprehensionCorrect:true,usedHint:false},when);
 assert.equal(p.records.cafe.attempts,1);
 assert.equal(p.records.cafe.voiceInputs,1);
 assert.equal(p.records.cafe.lastReason,null);
 assert.ok(Object.values(p.records.cafe.reasonCounts).every(count=>count===0));
 assert.equal(freezeSummary(p,when).topReason,null);
 const bogus=recordFreezeAttempt(p,{sceneId:'cafe',reason:'not-a-reason',comprehensionCorrect:true},when);
 assert.deepEqual(bogus,p);
});
test('retry scenarios rotate dialogue and followups after each result',()=>{
 let p={},a=sceneAttempt('cafe',p);
 p=recordFreezeAttempt(p,{sceneId:'cafe',reason:'words',comprehensionCorrect:false},date('2026-10-23T12:00:00+09:00'));
 const b=sceneAttempt('cafe',p);
 assert.equal(a.variation.ask,b.variation.ask,'a missed comprehension item returns for review');
 p=recordFreezeAttempt(p,{sceneId:'cafe',reason:'words',comprehensionCorrect:false},date('2026-10-24T12:00:00+09:00'));
 const c=sceneAttempt('cafe',p);
 assert.equal(a.variation.ask,c.variation.ask,'repeat the missed item until comprehension is correct');
 p=recordFreezeAttempt(p,{sceneId:'cafe',reason:null,comprehensionCorrect:true},date('2026-10-25T12:00:00+09:00'));
 assert.notEqual(a.variation.ask,sceneAttempt('cafe',p).variation.ask,'then rotate to another line');
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
 assert.match(repeat.meaning,/もう一度ゆっくり/,'reply display has a Japanese meaning for the repeated line');
 const words=recoveryReply(task,'words'),wait=recoveryReply(task,'surprise'),options=recoveryReply(task,'unsure');
 assert.match(words.line,/describe what you mean/);
 assert.match(wait.line,/Let me know when you are ready/);
 assert.match(options.line,/explain the options/);
 assert.ok([words,wait,options].every(reply=>!reply.line.includes(task.followup)),
  'the other person must not jump to an unrelated scripted line');
 assert.ok([words,wait,options].every(reply=>reply.examples.length===2),
  'the post-repair hint must match the second turn');
 assert.ok([uninterrupted,repeat,words,wait,options].every(reply=>reply.meaning),
  'the speaking screen can always show the incoming line meaning');
 assert.notEqual(words.line,wait.line);
 assert.notEqual(wait.line,options.line);
 const unknown=recoveryReply(task,'unknown'),long=recoveryReply(task,'long');
 assert.match(unknown.line,/Which word/);
 assert.match(unknown.caption,/どの単語/);
 assert.match(long.line,/Which part/);
 assert.ok(unknown.examples.some(x=>/word/.test(x)));
 assert.ok(long.examples.some(x=>/first step/.test(x)));
 assert.deepEqual(recoveryReply(task,'injected'),uninterrupted);
 assert.match(repeat.caption,/想定/);
});
test('recommendation prioritizes due reviews and unresolved listening work before unseen scenes',()=>{
 let p={};
 assert.equal(nextFreezeScene(p,date('2026-10-23T12:00:00+09:00')).id,'cafe');
 p=recordFreezeAttempt(p,{sceneId:'hotel',reason:'words',comprehensionCorrect:false},date('2026-10-22T12:00:00+09:00'));
 assert.equal(nextFreezeScene(p,date('2026-10-23T12:00:00+09:00')).id,'hotel');
 p=recordFreezeAttempt(p,{sceneId:'hotel',reason:'words',comprehensionCorrect:true},date('2026-10-23T12:00:00+09:00'));
 assert.equal(nextFreezeScene(p,date('2026-10-23T12:00:00+09:00')).id,'cafe',
  'after correcting the miss, recommend a new scene instead of a stale weakness');
});
test('next recommendation targets the most reported obstacle after due reviews',()=>{
 const when=date('2026-10-23T12:00:00+09:00');
 let p={};
 p=recordFreezeAttempt(p,{sceneId:'cafe',reason:'unknown',comprehensionCorrect:false},when);
 assert.equal(nextFreezeScene(p,when).id,'cafe','recommend the exact scene whose meaning was missed');
 p=recordFreezeAttempt(p,{sceneId:'hotel',reason:'misunderstood',comprehensionCorrect:false},when);
 assert.equal(nextFreezeScene(p,date('2026-10-24T12:00:00+09:00')).id,'cafe',
  'a due retry is always ahead of a targeted new scene');
});
test('malformed/untrusted state cannot inject keys, fake mastery, or store texts',()=>{
 const bad=normalizeFreezeProgress({records:JSON.parse('{"__proto__":{"stage":4,"due":"2026-10-20","last":"2026-10-19"},"cafe":{"stage":9,"due":"2026-10-24","last":"2026-10-23"},"hotel":{"stage":2,"due":"2026-10-24","last":"2026-10-23","attempts":-100,"recovered":"99","privateText":"sensitive"}}')});
 assert.equal(Object.getPrototypeOf(bad.records),null);
 assert.equal(Object.hasOwn(bad.records,'__proto__'),false);
 assert.equal(Object.hasOwn(bad.records,'cafe'),false);
 assert.equal(bad.records.hotel.attempts,0);
 assert.equal(bad.records.hotel.stage,0,'legacy stages cannot imply comprehension mastery');
 assert.equal(Object.hasOwn(bad.records.hotel,'recovered'),false,'legacy speaking claims are discarded');
 assert.equal(Object.hasOwn(bad.records.hotel,'privateText'),false);
 const unchanged=recordFreezeAttempt(bad,{sceneId:'cafe',reason:'bogus',comprehensionCorrect:true},date('2026-10-23T12:00:00+09:00'));
 assert.deepEqual(unchanged,bad);
 const summary=freezeSummary(bad,date('2026-10-23T12:00:00+09:00'));
 assert.equal(summary.scenes,0);
 assert.equal(summary.attempts,0);
 assert.equal({}.polluted,undefined);
});
test('saved progress is bounded and contains no answers or speech text',()=>{
 let p={};
 p=recordFreezeAttempt(p,{sceneId:'train',reason:'misunderstood',comprehensionCorrect:true},date('2026-10-23T12:00:00+09:00'));
 p=recordFreezeAttempt(p,{sceneId:'work',reason:'words',comprehensionCorrect:false,practiceMode:'typed'},date('2026-10-23T12:00:00+09:00'));
 const sum=freezeSummary(p,date('2026-10-23T12:00:00+09:00'));
 assert.equal(sum.scenes,2);
 assert.equal(sum.attempts,2);
 assert.equal(sum.voiceInputs,1);
 assert.equal(sum.comprehensionMisses,1);
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
 assert.match(script,/answer\.examples\|\|attempt\.variation\.examples/,
  'the second-turn hint must use the response-specific examples');
});

test('free no-AI Freeze Breaker is linked from the public training and pricing flow',()=>{
 for(const path of ['index.html','plans.html','phrasebook.html','account.html','transfer.html']){
  const html=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(html,/href="\.\/freeze-breaker\.html"/,path+' should link to Freeze Breaker');
 }
 const gym=readFileSync(new URL('../freeze-breaker.html',import.meta.url),'utf8');
 assert.match(gym,/通常の練習は台本型で、AI利用回数を消費しません/);
 assert.match(gym,/AI先生の利用回数を1回消費します/);
 const plans=readFileSync(new URL('../plans.html',import.meta.url),'utf8');
 assert.doesNotMatch(gym,/hero-title-line|<h1[^>]*>[\s\S]*?<br[\s\S]*?<\/h1>/i,
  'the conversation page title wraps naturally on mobile');
 assert.doesNotMatch(plans,/<h1[^>]*>[\s\S]*?<br[\s\S]*?<\/h1>/i,
  'the pricing page title does not force a line break inside Japanese copy');
});

test('review priority comes from comprehension misses and hints, never speaking scores',()=>{
 const when=new Date('2026-10-23T12:00:00+09:00');
 let state={};
 state=recordFreezeAttempt(state,{sceneId:'cafe',reason:'surprise',comprehensionCorrect:false},when);
 state=recordFreezeAttempt(state,{sceneId:'hotel',reason:'surprise',comprehensionCorrect:true},when);
 state=recordFreezeAttempt(state,{sceneId:'work',reason:'words',comprehensionCorrect:false},when);
 const insight=freezeSummary(state,when);
 assert.equal(insight.comprehensionMisses,2);
 assert.equal(state.records.hotel.comprehensionCorrect,1);
 assert.equal(nextFreezeScene(state,when).id,'cafe');
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

test('practice records distinguish voice input, typed answers and unverified speech',()=>{
 const when=date('2026-10-24T12:00:00+09:00');
 let state=recordFreezeAttempt({}, {sceneId:'cafe',reason:null,comprehensionCorrect:true,
  practiceMode:'typed',usedHint:false,variationIndex:0},when);
 state=recordFreezeAttempt(state,{sceneId:'hotel',reason:null,comprehensionCorrect:true,
  practiceMode:'self-reported',usedHint:false,variationIndex:0},when);
 const summary=freezeSummary(state,when);
 assert.equal(summary.typedResponses,1);
 assert.equal(summary.unverifiedSpeech,1);
 assert.equal(summary.voiceInputs,0);
 assert.doesNotMatch(JSON.stringify(state),/answer|transcript|Could you|private/i);
});
