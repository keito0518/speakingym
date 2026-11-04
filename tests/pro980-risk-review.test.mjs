import test from 'node:test';
import assert from 'node:assert/strict';
import {compareProCandidate,compareAllPlans,PLAN_CANDIDATES} from '../scripts/pro980-risk-review.mjs';

test('candidate math keeps monthly price and limits draft-only and never claims observed cost',()=>{
 const result=compareProCandidate();
 assert.equal(result.plan,'pro-980');
 assert.equal(result.limits.priceJpy,980);
 assert.equal(result.limits.turns,400);
 assert.equal(result.limits.coaching,40);
 assert.equal(result.basis,'HYPOTHETICAL_NO_LIVE_BILLING');
 assert.equal(result.jpy.paidAiAtQuota,377.28);
 assert.equal(result.jpy.freeAiPerUser,28.3);
 assert.ok(result.jpy.paidContributionBeforeFreeAndHosting>0);
 assert.equal(Object.isFrozen(PLAN_CANDIDATES['pro-980']),true);
});
test('cheaper Gemini model has lower assumed full-quota costs but no assumed quality equivalence',()=>{
 const cheap=compareProCandidate({model:'gemini-3.1-flash-lite'});
 const expensive=compareProCandidate({model:'gemini-3.5-flash-lite'});
 assert.ok(cheap.jpy.paidAiAtQuota<expensive.jpy.paidAiAtQuota);
 assert.match(cheap.warnings.join(' '),/quality/);
 assert.equal(compareAllPlans().length,6);
});
test('large Free audience at current maximum can overwhelm cheap subscription pricing',()=>{
 const result=compareProCandidate({
  paidUsers:100,freeUsers:500,freeTurnsPerUser:3000,freeCoachingPerUser:90
 });
 assert.equal(result.verdict,'illustrative_loss_risk');
 assert.ok(result.jpy.monthlyContributionBeforeOtherCosts<0);
 assert.ok(result.jpy.breakEvenPriceAtAssumptions>980);
});
test('high retry pressure or operating overhead never improve modeled profit',()=>{
 const baseline=compareProCandidate({retries:1,monthlyHostingJpy:0});
 const stressed=compareProCandidate({retries:3,monthlyHostingJpy:20000});
 assert.ok(stressed.jpy.monthlyContributionBeforeOtherCosts<baseline.jpy.monthlyContributionBeforeOtherCosts);
 assert.throws(()=>compareProCandidate({freeTurnsPerUser:3001}),/invalid_free_turns/);
 assert.throws(()=>compareProCandidate({model:'imaginary-model'}),/invalid_plan_model_or_scenario/);
 assert.throws(()=>compareProCandidate({stripePercent:-0.1}),/invalid_stripe_percent/);
});
