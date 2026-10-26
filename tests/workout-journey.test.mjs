import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const home=file('index.html'),sprint=file('reflex.html'),freeze=file('freeze-breaker.html');
const transfer=file('transfer.html'),transferJs=file('transfer.js');

test('beginner guide clearly separates Japanese-to-English recall from photo-based scene speaking',()=>{
 assert.match(home,/① 瞬発スプリント/);
 assert.match(home,/② シーン実況/);
 assert.match(home,/写真/);
 assert.match(home,/③ 言えなかった表現を復習/);
 assert.match(home,/href="\.\/phrasebook\.html"/);
 assert.match(sprint,/日本語 → 英語 \/ 瞬発力トレーニング/);
 assert.match(freeze,/シーン実況チャレンジ/);
 assert.match(freeze,/写真を見て、自分の英語で説明する/);
 assert.match(freeze,/30秒チャレンジを始める/);
 assert.match(freeze,/LEVEL 1 · 描写/);
 assert.match(freeze,/LEVEL 2 · 推測/);
 assert.match(freeze,/LEVEL 3 · 共有/);
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

test('scene workout offers a clean spoken reattempt and no AI connection',()=>{
 assert.match(freeze,/同じ写真でもう一度/);
 assert.match(freeze,/次の写真へ/);
 assert.match(freeze,/音声認識なしで続ける/);
 assert.doesNotMatch(file('scene-commentary.js'),/\bfetch\s*\(|speakingym-survival-ai/);
});

test('small-screen review and saved-expression actions remain touch-friendly',()=>{
 assert.match(sprint,/\.answer-set \.answer-card button\{[^}]*min-height:44px/);
 assert.match(sprint,/\.saved-phrase-card \.phrase-actions \.btn\{[^}]*min-height:44px/);
 assert.match(freeze,/\.level\{[^}]*min-height:48px/);
 assert.match(transfer,/\.head \.back\{[^}]*min-height:44px/);
 assert.match(sprint,/\.head a\.back\{[^}]*min-height:44px/);
});
