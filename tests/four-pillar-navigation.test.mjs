import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAN_LIMITS} from '../worker/plan-limits.js';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const home=file('index.html'),account=file('account.html'),
 review=file('phrasebook.html'),plans=file('plans.html'),sprint=file('reflex.html');

test('four and only four learning routes remain, presented as a plain numbered list',()=>{
 assert.match(home,/やってみたい練習を選ぶ/);
 const block=home.match(/<section class="wrapper" id="workouts">([\s\S]*?)<section class="wrapper dashboard"/)?.[1];
 assert.ok(block,'main workout section');
 const cards=[...block.matchAll(/<(?:section|a) class="workout(?: [^"]+)?"/g)];
 assert.equal(cards.length,4,'exactly one card per canonical workout');
 const positions=['./freeze-breaker.html','./reflex.html','./phrasebook.html','./scenes.html']
  .map(path=>block.indexOf('href="'+path+'"'));
 assert.ok(positions.every(index=>index>=0)&&positions.every((index,i)=>i===0||index>positions[i-1]),
  'conversation recovery precedes sprint and review, with AI as an optional last workout');
 assert.match(block,/<span class="tag">04<\/span>/);
 assert.match(block,/ログイン後に利用できます。カフェや仕事など16場面/);
 for(const dest of ['./scenes.html','./reflex.html','./freeze-breaker.html','./phrasebook.html']){
  assert.match(block,new RegExp('href="'+dest.replaceAll('.','\\.')+'"'));
 }
 assert.doesNotMatch(block,/classic\.html|mission\.html|live\.html|home-preview\.html/);
 assert.doesNotMatch(home,/href="\.\/classic\.html"/);
 assert.doesNotMatch(home,/href="\.\/home-preview\.html"/);
 assert.doesNotMatch(home,/href="\.\/mission\.html"/);
 assert.doesNotMatch(home,/href="\.\/live\.html"/);
 assert.match(home,/Proの一般向け有料登録はまだ開始していません/);
 assert.match(home,/60秒チャレンジはログイン不要・回数制限なし/);
});
test('My Page directs core workouts and saved expressions to one place',()=>{
 for(const url of ['./scenes.html','./reflex.html','./freeze-breaker.html','./phrasebook.html']){
  assert.ok(account.includes('href="'+url+'"'),url);
 }
 const shortcuts=account.match(/<div class="shortcut-row">([\s\S]*?)<\/div>/)?.[1];
 assert.ok(shortcuts,'my page keeps the four core routes');
 const ordered=['./reflex.html','./freeze-breaker.html','./phrasebook.html','./scenes.html']
  .map(url=>shortcuts.indexOf('href="'+url+'"'));
 assert.ok(ordered.every((idx,i)=>idx>=0&&(i===0||idx>ordered[i-1])),
  'my page must prioritize sprint, rescue, and review over optional AI');
 assert.match(shortcuts,/AI英会話（任意）/);
 assert.doesNotMatch(account,/href="\.\/pro-study\.html"/,
  'advanced study belongs inside the unified review entrance, not standalone in My Page');
 assert.match(account,/復習はマイ復習帳から/);
 assert.match(account,/id="sg-feedback-list"/,'retain real previous teacher feedback');
 assert.match(account,/id="sg-saved-list"/,'retain stored phrases');
});
test('My Review preserves Free phrasebook, filters, and save storage with no unshipped Pro previews',()=>{
 assert.match(review,/<title>マイ復習帳/);
 assert.match(review,/id="source"/);
 assert.match(review,/id="category"/);
 assert.match(review,/id="level"/);
 assert.match(review,/id="phrases"/);
 assert.match(review,/speakingymPhrases/);
 assert.match(review,/api\.remove\(p\.id\)/);
 assert.match(review,/href="\.\/transfer\.html"/);
 assert.match(review,/href="\.\/freeze-breaker\.html"/);
 assert.doesNotMatch(review,/href="\.\/pro-(study|demo)\.html"/);
 assert.match(plans,/href="\.\/transfer\.html"/);
});
test('existing sprint drills retain opt-in AI teacher but stop advertising duplicate old tools',()=>{
 assert.match(sprint,/id="requestTeacher"/);
 assert.match(sprint,/追加のAI講評を受ける（任意・回数消費）/);
 assert.match(sprint,/Gemini APIへ最大5問の英文を1回送信し、AI講評の回数枠を消費/);
 assert.match(sprint,/href="\.\/phrasebook\.html"/);
 assert.doesNotMatch(sprint,/href="\.\/classic\.html"/);
 assert.match(sprint,/id="savedPhrasesList"/,'sprint-specific in-session quick review remains functional');
});
test('legacy experiments are not promoted to canonical training cards',()=>{
 for(const filename of ['mission.html','live.html','classic.html']){
  assert.doesNotMatch(home,new RegExp('href="\\./'+filename.replaceAll('.','\\.')+'"'));
 }
});
test('this cleanup does not silently change Free or Pro API quotas / legacy billing',()=>{
 assert.deepEqual(PLAN_LIMITS.free,{sessions:5,teacher:3});
 assert.equal(PLAN_LIMITS.pro.monthlyTurns,600);
 assert.equal(PLAN_LIMITS.pro.monthlyTeacher,100);
 const worker=file('worker/ai-worker.js');
 assert.match(worker,/verifyFirebaseIdToken/);
 assert.match(plans,/月額680円（税込）/);
 assert.match(plans,/有料会員の募集・決済は行っていません/);
});
