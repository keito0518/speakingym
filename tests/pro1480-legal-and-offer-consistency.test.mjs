import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAN_LIMITS} from '../worker/plan-limits.js';
import {OFFER} from '../scripts/pro1480-economics.mjs';

const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const site=read('plans.html');
const disclosure=read('tokusho.html');
const legal=read('worker/LIVE_LEGAL_OWNER_CHECKLIST_2026-10-20.md');
const operator=read('worker/INDIVIDUAL_OPERATOR_TOKUSHO_PLAN_2026-10-20.md');
const release=read('worker/PRO1480_DRAFT_RELEASE_GATE_2026-10-20.md');
const terms=read('terms.html');
const billing=read('worker/billing.js');

test('the draft price and both AI usage caps match across release, site, legal and source',()=>{
 assert.equal(OFFER.priceJpy,1480);
 assert.equal(OFFER.conversationTurns,PLAN_LIMITS.pro.monthlyTurns);
 assert.equal(OFFER.teacher,PLAN_LIMITS.pro.monthlyTeacher);
 for(const [name,text] of [['plans.html',site],['tokusho.html',disclosure],
  ['legal checklist',legal],['operator plan',operator],['release gate',release]]){
  assert.match(text,/1,480/,name+' should clearly disclose the new draft price');
  assert.match(text,/1,000/,name+' should disclose the new draft conversation allowance');
  assert.match(text,/150/,name+' should disclose the new teacher feedback allowance');
 }
 for(const [name,text] of [['site',site],['seller disclosure',disclosure],
  ['legal checklist',legal],['operator legal plan',operator]]){
  // Ignore clearly labelled historical notes; CSS font-weight:680 is not a ¥680 offer.
  const currentCopy=text.split('\n').filter(line=>!line.includes('Previous ¥680 / 600 / 100')).join('\n');
  assert.doesNotMatch(currentCopy,/(?:月額|¥|JPY\s*)680(?:円|\s|\/|\b)|600\s*(?:ターン|AI\s*conversation)|講評\s*(?:月)?100回/,
   name+' still contains a stale old paid offer (only historical files may do so)');
 }
 assert.match(billing,/approvedCheckoutAmountJpy\(env\)/);
 assert.match(billing,/liveMode\(env\)\?980:1480/);
 assert.match(billing,/tax_behavior!=='inclusive'/);
});

test('new Pro can never be described as a live and legally approved purchase yet',()=>{
 assert.match(disclosure,/販売開始前の草案です/);
 assert.match(disclosure,/noindex,nofollow/);
 assert.match(disclosure,/月額1,480円（税込）予定/);
 assert.match(terms,/無料ベータ版です/);
 assert.match(terms,/有料プランの購入・決済は提供していません/);
 assert.match(legal,/BLOCKED \/ NOT LEGALLY READY/);
 assert.match(operator,/Live課金はNO-GO/);
 assert.match(release,/未公開ドラフト/);
 assert.match(release,/新規作成せず、税方式等をAPIで照合/);
 assert.doesNotMatch(release,/test Priceを新規作成し/);
});

test('Free tier is unchanged and subscription monthly accounting differs from calendar usage reset',()=>{
 assert.deepEqual(PLAN_LIMITS.free,{sessions:5,teacher:3});
 for(const text of [site,disclosure,legal]){
  assert.match(text,/毎月1日|JST (?:calendar month|1st)/);
 }
 assert.match(disclosure,/請求更新日は利用枠の更新日と一致しない場合/);
 assert.match(site,/請求更新日は登録日を基準/);
 assert.match(operator,/請求時開示方式/);
 assert.match(disclosure,/購入・Googleログイン・支払いは不要/);
});

test('consumer-facing cancellation, refund uncertainty and Stripe data handling remain clear before Live',()=>{
 assert.match(site,/Proはどうやって解約する？/);
 assert.match(site,/期間末で解約/);
 assert.match(site,/返金はできる？/);
 assert.match(site,/返金・日割り精算/);
 assert.match(disclosure,/サンドボックスでは、契約管理画面から期間末解約/);
 assert.match(disclosure,/本番販売の解約条件/);
 assert.match(disclosure,/キャンセル・返金/);
 const privacy=read('privacy.html');
 assert.match(privacy,/決済に関する情報（有料プラン準備中）/);
 assert.match(privacy,/Stripeの顧客・契約識別子/);
 assert.match(privacy,/一般向けの有料販売は開始していません/);
});
