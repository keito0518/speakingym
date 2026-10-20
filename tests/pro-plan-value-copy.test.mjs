import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAN_LIMITS} from '../worker/plan-limits.js';
const plans=readFileSync(new URL('../plans.html',import.meta.url),'utf8');
const economics=readFileSync(new URL('../scripts/pro680-economics.mjs',import.meta.url),'utf8');
test('sales copy distinguishes daily Free caps from monthly Pro caps',()=>{
 assert.equal(PLAN_LIMITS.free.sessions,5);
 assert.equal(PLAN_LIMITS.free.teacher,3);
 assert.equal(PLAN_LIMITS.pro.monthlyTurns,1000);
 assert.equal(PLAN_LIMITS.pro.monthlyTeacher,150);
 assert.match(plans,/Freeは1日5セッション/);
 assert.match(plans,/各セッション最大20ターン/);
 assert.match(plans,/Proは日次のセッション数制限がなく/);
 assert.match(plans,/月1,000ターン/);
 assert.match(plans,/AI先生の講評は月150回/);
 assert.match(plans,/Freeを上限近くまで使う方は、月間の会話回数がProを上回る場合/);
 assert.match(plans,/Proにすると、必ずFreeよりたくさん会話できる？/);
 assert.doesNotMatch(plans,/Proの方が会話回数を必ず増やせます/);
});
test('economics model cannot edit plan limits, announce a profit guarantee or start billing',()=>{
 assert.match(economics,/HYPOTHETICAL_ONLY_NOT_REAL_GEMINI_INVOICE/);
 assert.doesNotMatch(economics,/fetch\s*\(|Cloudflare.*secret|STRIPE_LIVE_SECRET_KEY/);
 assert.match(plans,/href="\.\/tokusho\.html"/);
 assert.match(plans,/月額1,480円（税込）/);
 assert.match(plans,/id="sg-live-accept"/);
});
