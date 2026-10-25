import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const home=file('index.html'),sprint=file('reflex.html'),freeze=file('freeze-breaker.html');
const transfer=file('transfer.html'),transferJs=file('transfer.js');

test('beginner guide boldly separates speed of recall from recovery of a stalled conversation',()=>{
 assert.match(home,/① 瞬発スプリント/);
 assert.match(home,/② 会話サバイバル/);
 assert.match(home,/③ 言えなかった表現を復習/);
 assert.match(home,/href="\.\/phrasebook\.html"/);
 assert.match(sprint,/日本語 → 英語 \/ 瞬発力トレーニング/);
 assert.match(freeze,/CONVERSATION SURVIVAL/);
 assert.match(freeze,/聞き返す・時間をもらう・言い換える/);
 assert.doesNotMatch(freeze,/id="instant-yes"|id="instant-froze"/,'remove duplicate first-translation assessment');
 assert.match(freeze,/時間制限なし/);
});

test('personal stage completes directly into the next step only after its own review',()=>{
 assert.match(sprint,/reviewFromHistory=fromHistory/);
 assert.match(sprint,/reviewIndex<\(reviewSession\?\.attempts\.length\|\|0\)-1/);
 assert.match(sprint,/else if\(!reviewFromHistory&&personalNextStage!==null\)continuePersonalWorkout\(\)/);
 assert.match(sprint,/if\(personalNextStage===null\|\|reviewFromHistory\)return/);
 assert.match(sprint,/今日のメニューを確認する/);
 assert.match(sprint,/\$\("personalWorkoutDetails"\)\.open=true/,'a completed optional plan must reveal its visible progress');
});

test('transfer follow-up buttons have truthful distinct destinations',()=>{
 assert.match(transfer,/id="again"[^>]*>次の2つの場面に挑戦/);
 assert.match(transferJs,/\$\('again'\)\.addEventListener\('click',\(\)=>begin\('new'\)\)/);
 assert.match(transfer,/id="reviewMenu"[^>]*>復習予定を見る/);
 assert.match(transferJs,/\$\('reviewMenu'\)\.addEventListener\('click',refreshIntro\)/);
 assert.match(transfer,/同じ伝え方を/);
 assert.match(transfer,/短い一文でも相手に意図を伝えられたら「言えた」でOK/);
});

test('freeze workout suggests a distinctly timed next exercise while retaining optional AI',()=>{
 assert.match(freeze,/id="result"[\s\S]*?href="\.\/reflex\.html"[\s\S]*?60秒で口を動かす/);
 assert.doesNotMatch(freeze,/href="\.\/transfer\.html"/);
 assert.match(freeze,/AI実践英会話（任意）へ/);
 assert.match(freeze,/自由に会話を広げたい人はAI実践英会話も利用できます（別途AI利用枠を消費）/);
});

test('small-screen review and saved-expression actions remain touch-friendly',()=>{
 assert.match(sprint,/\.answer-set \.answer-card button\{[^}]*min-height:44px/);
 assert.match(sprint,/\.saved-phrase-card \.phrase-actions \.btn\{[^}]*min-height:44px/);
 assert.match(freeze,/\.control-row \.button\{[^}]*min-height:46px/);
 assert.match(transfer,/\.head \.back\{[^}]*min-height:44px/);
 assert.match(sprint,/\.head a\.back\{[^}]*min-height:44px/);
});
