import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const home=file('index.html'),sprint=file('reflex.html'),freeze=file('freeze-breaker.html');
const transfer=file('transfer.html'),transferJs=file('transfer.js');

test('beginner guide tells the rescue-first path and the transfer-review schedule',()=>{
 assert.match(home,/① 相手の英語に返してみる/);
 assert.match(home,/③ 切り返しを覚えて、すぐ再挑戦/);
 assert.match(home,/違う会話で応用チェック。次は翌日・3日後・7日後に自分で復習/);
 assert.match(home,/href="\.\/phrasebook\.html"/);
 assert.match(sprint,/詰まった理由を振り返る/);
 assert.match(sprint,/苦手を再挑戦/);
});

test('personal stage completes directly into the next step only after its own review',()=>{
 assert.match(sprint,/reviewFromHistory=fromHistory/);
 assert.match(sprint,/reviewIndex<\(reviewSession\?\.attempts\.length\|\|0\)-1/);
 assert.match(sprint,/else if\(!reviewFromHistory&&personalNextStage!==null\)continuePersonalWorkout\(\)/);
 assert.match(sprint,/if\(personalNextStage===null\|\|reviewFromHistory\)return/);
 assert.match(sprint,/今日のメニューを確認する/);
});

test('transfer follow-up buttons have truthful distinct destinations',()=>{
 assert.match(transfer,/id="again"[^>]*>次の2つの場面に挑戦/);
 assert.match(transferJs,/\$\('again'\)\.addEventListener\('click',\(\)=>begin\('new'\)\)/);
 assert.match(transfer,/id="reviewMenu"[^>]*>復習予定を見る/);
 assert.match(transferJs,/\$\('reviewMenu'\)\.addEventListener\('click',refreshIntro\)/);
 assert.match(transfer,/同じ伝え方を/);
 assert.match(transfer,/短い一文でも相手に意図を伝えられたら「言えた」でOK/);
});

test('freeze workout prefers cost-free two-scene transfer while retaining optional AI',()=>{
 assert.match(freeze,/id="result"[\s\S]*?href="\.\/transfer\.html"[\s\S]*?別の場面でも使えるか試す/);
 assert.match(freeze,/場面を変える応用チェックへ/);
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
