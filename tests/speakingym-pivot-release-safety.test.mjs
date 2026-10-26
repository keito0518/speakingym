import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAN_LIMITS} from '../worker/plan-limits.js';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const plan=file('plans.html');
const review=file('transfer-review.mjs');
const account=file('account-transfer-progress.mjs');
const transfer=file('transfer.js');

test('new Free learning retains existing ¥680 API limits and protected paid turns',()=>{
 assert.deepEqual(PLAN_LIMITS.free,{sessions:5,teacher:3});
 assert.equal(PLAN_LIMITS.pro.monthlyTurns,600);
 assert.equal(PLAN_LIMITS.pro.monthlyTeacher,100);
 assert.match(plan,/月額680円（税込）/);
 assert.match(plan,/有料会員の募集・決済は行っていません/);
 assert.match(plan,/60秒チャレンジ：回数制限なし/);
 assert.match(plan,/2場面応用チェック・1\/3\/7日復習/);
});
test('legacy free paths preserve billing controls and optional coaching remains explicitly metered',()=>{
 for(const js of [transfer,review,account,file('home-dashboard.js')]){
  assert.doesNotMatch(js,/Stripe|fetch\s*\(/i);
 }
 const freeze=file('freeze-breaker.js');
 assert.doesNotMatch(freeze,/Stripe|checkout|createPortal|billing/i);
 assert.match(freeze,/\$\('request-coach'\)\.addEventListener\('click',requestCoach\)/);
 assert.match(freeze,/if\(health\.plansEnabled!==true\)throw Error\('plans_not_ready'\)/);
 assert.match(freeze,/if\(!token\)throw Error\('login_required'\)/);
 assert.match(freeze,/coachAsked=true/);
 assert.doesNotMatch(file('phrasebook.html'),/href="\.\/pro-(study|demo)\.html"/);
 assert.match(file('reflex.html'),/monthly_teacher_limit:"今月のProのAI先生100回/);
 assert.doesNotMatch(transfer,/Stripe|\bfetch\s*\(/i);
 assert.doesNotMatch(review,/Stripe|\bfetch\s*\(/i);
 assert.doesNotMatch(account,/Stripe|\bfetch\s*\(/i);
});
test('scene commentary sends no speech, AI, account or billing data from its practice code',()=>{
 const scene=file('scene-commentary.js');
 assert.doesNotMatch(scene,/Stripe|checkout|createPortal|billing|\bfetch\s*\(|GEMINI_API_KEY|speakingym-survival-ai/i);
 assert.match(scene,/recognition\.continuous=true/);
 assert.match(scene,/音声認識なし/);
 assert.match(file('freeze-breaker.html'),/ブラウザ提供元の条件/);
});
test('frontend transfer privacy and account changes fail closed without sending data to analytics',()=>{
 const p=file('transfer.html'),my=file('account.html');
 assert.match(p,/英語の音声・発言内容は収集しません/);
 assert.match(p,/自動採点する機能ではありません/);
 assert.match(my,/この端末内だけに保存されます/);
 assert.match(transfer,/speakingym:account-changing',beginOwnerTransition/);
 assert.match(account,/speakingym:account-changing',\(\)=>\{/);
 assert.match(account,/accountTransition=true/);
 assert.match(transfer,/normalizeTransferResults/);
 assert.match(account,/normalizeTransferResults/);
 assert.doesNotMatch(account,/window\.gtag\s*\(|ga4|analytics\.track\(/i);
});
