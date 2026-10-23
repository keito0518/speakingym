import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAN_LIMITS} from '../worker/plan-limits.js';
import {PRO_MONTHLY_TURN_LIMIT} from '../worker/turn-ledger.js';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const plan=file('plans.html');
const review=file('transfer-review.mjs');
const account=file('account-transfer-progress.mjs');
const transfer=file('transfer.js');
const design=file('SPEAKINGYM_PRO_980_REDESIGN_2026-10-24.md');

test('new Free learning pitch retains existing AI API limits and protected paid turns',()=>{
 assert.deepEqual(PLAN_LIMITS.free,{sessions:5,teacher:3});
 assert.equal(PLAN_LIMITS.pro.monthlyTurns,PRO_MONTHLY_TURN_LIMIT);
 assert.equal(PRO_MONTHLY_TURN_LIMIT,1000,'historical staging Pro cap intentionally remains unchanged');
 assert.equal(PLAN_LIMITS.pro.monthlyTeacher,150);
 assert.match(plan,/60秒チャレンジ：回数制限なし/);
 assert.match(plan,/2場面応用チェック・1\/3\/7日復習/);
 assert.match(plan,/一般向けの有料会員募集は現在準備中/);
 assert.match(plan,/AI英会話・講評の正式な提供量と販売開始日は調整中/);
});
test('pricing disclosure is not a hidden Pro entitlement or live checkout activation',()=>{
 assert.match(plan,/毎日使うFreeが旧Proテスト枠より合計ターン数で上回り得ます/);
 assert.match(plan,/Proのほうが必ず多く使える/);
 assert.match(plan,/月額1,480円（税込）は旧Stripe TEST検証用/);
 assert.match(design,/3,000ターン\/月/);
 assert.match(design,/¥680契約/);
 assert.match(design,/実原価/);
 assert.match(design,/本人がマージ・本番公開・有料販売を明示承認/);
 assert.doesNotMatch(transfer,/Stripe|\bfetch\s*\(/i);
 assert.doesNotMatch(review,/Stripe|\bfetch\s*\(/i);
 assert.doesNotMatch(account,/Stripe|\bfetch\s*\(/i);
});
test('frontend transfer privacy and account changes fail closed without sending data to analytics',()=>{
 const p=file('transfer.html'),my=file('account.html');
 assert.match(p,/英語の音声・発言内容は収集しません/);
 assert.match(p,/自動採点する機能ではありません/);
 assert.match(my,/この端末内だけに保存されます/);
 assert.match(transfer,/speakingym:account-changing',beginOwnerTransition/);
 assert.match(account,/speakingym:account-changing',mask/);
 assert.match(transfer,/normalizeTransferResults/);
 assert.match(account,/normalizeTransferResults/);
 assert.doesNotMatch(account,/window\.gtag\s*\(|ga4|analytics\.track\(/i);
});
