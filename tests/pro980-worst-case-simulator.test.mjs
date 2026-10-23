import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIXED_PRO_PRICE_YEN,worstCase980} from '../scripts/pro980-worst-case-simulator.mjs';

test('public Pro subscription is fixed at ¥980 even if caller passes another price',()=>{
 assert.equal(FIXED_PRO_PRICE_YEN,980);
 assert.equal(worstCase980({priceYen:1480}).priceYen,980);
 assert.equal(worstCase980({priceYen:680}).priceYen,980);
});
test('baseline reserves fees, assumed consumption tax and only bounded provider resources',()=>{
 const r=worstCase980();
 assert.equal(r.yen.afterFeesAndReserve,848.77);
 assert.equal(r.yen.stripeAndBilling,42.14);
 assert.equal(r.yen.taxReserve,89.09);
 assert.equal(r.yen.conditionalContributionIfProviderCeilingEnforced,248.77);
 assert.equal(r.paidMembersToReach50000YenPerMonth,201);
 assert.equal(r.status,'ILLUSTRATIVE_ONLY_NOT_A_PROVIDER_BILL_OR_ENFORCED_QUOTA');
});
test('present 3.5 heavy-envelope 1000 turns/150 teacher is not profitable on full use',()=>{
 const r=worstCase980({
  model:'gemini-3.5-flash-lite',envelope:'currentEstimated',
  proConversationTurns:1000,proTeacherUses:150
 });
 assert.equal(r.plannedTurnsFitProviderCap,false);
 assert.ok(r.yen.fullUseProviderCostAtAssumedEnvelope>2000);
 assert.ok(r.theoreticalMaxTurnsAfterTeacherAtAssumedEnvelope<150);
});
test('3.1 optimized candidate MAY fit 1000/40 inside ¥350, while 3.5 does not',()=>{
 const a=worstCase980({
  model:'gemini-3.1-flash-lite',envelope:'optimizedCandidate'
 });
 const b=worstCase980({
  model:'gemini-3.5-flash-lite',envelope:'optimizedCandidate'
 });
 assert.equal(a.plannedTurnsFitProviderCap,true);
 assert.equal(b.plannedTurnsFitProviderCap,false);
 assert.ok(a.yen.fullUseProviderCostAtAssumedEnvelope<350);
 assert.ok(b.yen.fullUseProviderCostAtAssumedEnvelope>350);
 assert.ok(a.theoreticalMaxTurnsAfterTeacherAtAssumedEnvelope>=1000);
 assert.ok(b.theoreticalMaxTurnsAfterTeacherAtAssumedEnvelope<1000);
});
test('higher fx, extra token reserve, Free subsidy and overhead all worsen risk',()=>{
 const a=worstCase980({model:'gemini-3.1-flash-lite',envelope:'optimizedCandidate'});
 const b=worstCase980({model:'gemini-3.1-flash-lite',envelope:'optimizedCandidate',
  fxYenPerUsd:250,reservationFactor:2});
 assert.ok(b.yen.fullUseProviderCostAtAssumedEnvelope>a.yen.fullUseProviderCostAtAssumedEnvelope);
 assert.equal(b.plannedTurnsFitProviderCap,false);
 const c=worstCase980({perPaidFreeSubsidyYen:200,perPaidOperatingShareYen:250});
 assert.ok(c.yen.conditionalContributionIfProviderCeilingEnforced<a.yen.conditionalContributionIfProviderCeilingEnforced);
});
test('spending cap worse than revenue cannot be misreported as positive',()=>{
 const r=worstCase980({proMonthlyProviderYen:700,perPaidFreeSubsidyYen:200,
  perPaidOperatingShareYen:200,perPaidRiskReserveYen:50});
 assert.ok(r.yen.conditionalContributionIfProviderCeilingEnforced<0);
 assert.equal(r.paidMembersToReach50000YenPerMonth,null);
});
test('malformed values, non-integer turns, unknown models are rejected',()=>{
 assert.throws(()=>worstCase980({model:'magic'}),/unknown_model/);
 assert.throws(()=>worstCase980({proConversationTurns:1.5}),/invalid_turns/);
 assert.throws(()=>worstCase980({fxYenPerUsd:NaN}),/invalid_fx/);
 assert.throws(()=>worstCase980({reservationFactor:-1}),/invalid_factor/);
 assert.throws(()=>worstCase980({proMonthlyProviderYen:-1}),/invalid_provider/);
});
test('simulator does not read secrets, charge cards or contact Gemini',()=>{
 const s=readFileSync(new URL('../scripts/pro980-worst-case-simulator.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(s,/\bfetch\s*\(|process\.env|GEMINI_API_KEY|STRIPE_SECRET_KEY|https?:\/\/generativelanguage/);
});
