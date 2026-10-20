import test from 'node:test';
import assert from 'node:assert/strict';
import {simulatePro1480,OFFER} from '../scripts/pro1480-economics.mjs';
import {PLAN_LIMITS} from '../worker/plan-limits.js';
const near=(n,target)=>assert.ok(Math.abs(n-target)<.015);
test('selected draft offer is 1480 yen, 1000 turns and 150 coachings, not Free quotas',()=>{
 assert.deepEqual(OFFER,{priceJpy:1480,conversationTurns:1000,teacher:150});
 assert.equal(PLAN_LIMITS.pro.monthlyTurns,OFFER.conversationTurns);
 assert.equal(PLAN_LIMITS.pro.monthlyTeacher,OFFER.teacher);
 assert.deepEqual(PLAN_LIMITS.free,{sessions:5,teacher:3});
});
test('standard and heavy Pro upper-use scenarios exactly match reviewed arithmetic',()=>{
 const a=simulatePro1480({scenario:'standard',proUsers:1,freeUsers:0});
 near(a.jpy.proAiCost,219.6);near(a.jpy.proStripeAssumption,63.64);
 near(a.jpy.proContributionBeforeFreeAndHosting,1196.76);
 const b=simulatePro1480({scenario:'heavy',proUsers:1,freeUsers:0,taxReserveJpy:0});
 near(b.jpy.proAiCost,1056.8);near(b.jpy.proContributionBeforeFreeAndHosting,359.56);
 assert.equal(b.basis,'HYPOTHETICAL_NOT_PROVIDER_INVOICE');
});
test('free audience, tax reserve and retries are not hidden from contribution',()=>{
 const x=simulatePro1480({scenario:'heavy',proUsers:100,freeUsers:500,taxReserveJpy:1480/11});
 near(x.jpy.proContributionBeforeFreeAndHosting,225.01);
 near(x.jpy.freeAiPerUser,23.28);
 near(x.jpy.totalContributionAfterFreeAndHosting,10861.09);
 const y=simulatePro1480({scenario:'heavy',proUsers:100,freeUsers:1500,
  retries:1.2,taxReserveJpy:1480/11,monthlyInfrastructureJpy:2000});
 assert.equal(y.status,'illustrative_loss_risk');
 assert.ok(y.jpy.totalContributionAfterFreeAndHosting<x.jpy.totalContributionAfterFreeAndHosting);
});
test('bad figures, unrealistic settings or higher than promised successful use never pass',()=>{
 for(const values of [
  {scenario:'unknown'},{proTurns:1001},{proTeacher:151},{fx:0},
  {proUsers:0},{freeUsers:-1},{freeTurns:-1},{proTeacher:2.5},
  {taxReserveJpy:1481},{monthlyInfrastructureJpy:Infinity},
  {retries:.9},{extraStripePct:-1}
 ])assert.throws(()=>simulatePro1480(values));
});
