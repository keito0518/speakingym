/**
 * FIXED-¥980 contribution-risk calculator for Speakingym — non-deployed,
 * hypothetical offline sensitivity only. 2026-10-23.
 *
 * Not a signed payment gate, token-counter, quota, Google invoice or a
 * guaranteed profit. The modeled token envelopes are NOT currently enforced
 * by the production Worker. Planning test only; never automatically switch
 * Gemini models or Stripe prices based on this script.
 */
export const FIXED_PRO_PRICE_YEN=980;
export const MODELS=Object.freeze({
 'gemini-3.5-flash-lite':Object.freeze({input:0.30,output:2.50}),
 'gemini-3.1-flash-lite':Object.freeze({input:0.25,output:1.50})
});
export const ENVELOPES=Object.freeze({
 currentEstimated: Object.freeze({
  conversation:Object.freeze({input:8000,output:2400}),
  teacher:Object.freeze({input:12000,output:2400})
 }),
 optimizedCandidate:Object.freeze({
  conversation:Object.freeze({input:1800,output:400}),
  teacher:Object.freeze({input:4500,output:1500})
 })
});
const validate=(value,min,max,key)=>{
 if(!Number.isFinite(value)||value<min||value>max)throw Error('invalid_'+key);
 return value;
};
const whole=(value,min,max,key)=>{
 validate(value,min,max,key);
 if(!Number.isSafeInteger(value))throw Error('invalid_'+key);
 return value;
};
const rnd=value=>Number(value.toFixed(2));

export function worstCase980({
 model='gemini-3.5-flash-lite',
 envelope='currentEstimated',
 fxYenPerUsd=180,
 reservationFactor=1.5,
 proMonthlyProviderYen=350,
 perPaidFreeSubsidyYen=100,
 perPaidOperatingShareYen=100,
 perPaidRiskReserveYen=50,
 proConversationTurns=1000,
 proTeacherUses=40,
 cardFeeRate=0.036,
 billingFeeRate=0.007,
 taxReserveRate=10/110
}={}){
 const rates=MODELS[model],shape=ENVELOPES[envelope];
 if(!rates||!shape)throw Error('unknown_model_or_envelope');
 for(const [name,val,min,max] of [
  ['fx',fxYenPerUsd,100,500],['factor',reservationFactor,1,10],
  ['provider',proMonthlyProviderYen,0,100000],
  ['free_subsidy',perPaidFreeSubsidyYen,0,100000],
  ['operations',perPaidOperatingShareYen,0,100000],
  ['risk',perPaidRiskReserveYen,0,100000],
  ['cards',cardFeeRate,0,.4],['billing',billingFeeRate,0,.4],
  ['tax',taxReserveRate,0,.4]
 ])validate(val,min,max,name);
 whole(proConversationTurns,0,100000,'turns');
 whole(proTeacherUses,0,100000,'teachers');
 const assumedYen=kind=>{
  const tokens=shape[kind];
  return (tokens.input*rates.input+tokens.output*rates.output)/1e6*
   fxYenPerUsd*reservationFactor;
 };
 const perTurn=assumedYen('conversation'),perTeacher=assumedYen('teacher');
 const modeledIfFull=proConversationTurns*perTurn+proTeacherUses*perTeacher;
 const afterFeesAndReserve=FIXED_PRO_PRICE_YEN*(1-cardFeeRate-billingFeeRate-taxReserveRate);
 const floorIfEnforced=afterFeesAndReserve-proMonthlyProviderYen-
  perPaidFreeSubsidyYen-perPaidOperatingShareYen-perPaidRiskReserveYen;
 const availableForTurns=proMonthlyProviderYen-proTeacherUses*perTeacher;
 const theoreticalTurns=availableForTurns<0?0:Math.floor(availableForTurns/perTurn);
 return {
  status:'ILLUSTRATIVE_ONLY_NOT_A_PROVIDER_BILL_OR_ENFORCED_QUOTA',
  priceYen:FIXED_PRO_PRICE_YEN,
  model,envelope,
  assumptions:{
   fxYenPerUsd,reservationFactor,cardFeeRate,billingFeeRate,
   taxReserveRate,proConversationTurns,proTeacherUses,
   proMonthlyProviderYen,perPaidFreeSubsidyYen,
   perPaidOperatingShareYen,perPaidRiskReserveYen
  },
  yen:{
   stripeAndBilling:rnd(FIXED_PRO_PRICE_YEN*(cardFeeRate+billingFeeRate)),
   taxReserve:rnd(FIXED_PRO_PRICE_YEN*taxReserveRate),
   afterFeesAndReserve:rnd(afterFeesAndReserve),
   perConversationTurnAtAssumedEnvelope:rnd(perTurn),
   perTeacherUseAtAssumedEnvelope:rnd(perTeacher),
   fullUseProviderCostAtAssumedEnvelope:rnd(modeledIfFull),
   conditionalContributionIfProviderCeilingEnforced:rnd(floorIfEnforced)
  },
  plannedTurnsFitProviderCap:modeledIfFull<=proMonthlyProviderYen,
  theoreticalMaxTurnsAfterTeacherAtAssumedEnvelope:theoreticalTurns,
  paidMembersToReach50000YenPerMonth:
   floorIfEnforced>0?Math.ceil(50000/floorIfEnforced):null,
  warnings:[
   'API request input tokens must be ACTUALLY bounded; maxOutputTokens alone does not bound the prompt or Gemini invoices.',
   'The cost ceiling MUST be enforced per signed Pro UID and must count outstanding/in-flight requests; current shared budget guard alone cannot guarantee it.',
   'Unknown errors/timeouts/retries and usageMetadata tail must be reconciled. Google provider hard quotas and monitoring are additional backstops.',
   'No live Gemini 3.1 quality test completed. Existing Worker still uses Gemini 3.5 Flash-Lite.',
   'Actual Free-to-paid ratio, fixed business costs, refund disputes, exchange rate and taxes may differ. Per-member modeled contribution is NOT business-wide profit.',
   'Pro conversation and teacher amounts in this simulator are not published subscription entitlements.'
  ]
 };
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const cases=[
  {model:'gemini-3.5-flash-lite',envelope:'currentEstimated',proTeacherUses:150},
  {model:'gemini-3.5-flash-lite',envelope:'optimizedCandidate'},
  {model:'gemini-3.1-flash-lite',envelope:'optimizedCandidate'}
 ];
 console.log(JSON.stringify(cases.map(s=>worstCase980(s)),null,2));
}
