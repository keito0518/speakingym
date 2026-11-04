/**
 * DRAFT ONLY. Compare candidate paid plans and provider models WITHOUT calling
 * providers or modifying Stripe products, Cloudflare deployments or quotas.
 * References (Gemini Developer API standard paid tier, checked 2026-10-23):
 * https://ai.google.dev/gemini-api/docs/pricing
 * https://stripe.com/jp/pricing
 * https://stripe.com/jp/billing/pricing
 * These are pricing assumptions, NOT user token logs or actual invoices.
 */
import {pathToFileURL} from 'node:url';
export const RATE_SCENARIOS=Object.freeze({
 'gemini-3.5-flash-lite':Object.freeze({input:0.30,output:2.50}),
 'gemini-3.1-flash-lite':Object.freeze({input:0.25,output:1.50})
});
export const PLAN_CANDIDATES=Object.freeze({
 'pro-980':Object.freeze({priceJpy:980,turns:400,coaching:40}),
 'pro-1280':Object.freeze({priceJpy:1280,turns:600,coaching:60}),
 'draft-1480':Object.freeze({priceJpy:1480,turns:1000,coaching:150})
});
const TOKEN_SCENARIOS=Object.freeze({
 standard:Object.freeze({conversation:{input:1200,output:150},coaching:{input:2500,output:1400}}),
 heavy:Object.freeze({conversation:{input:2000,output:2000},coaching:{input:4000,output:2200}})
});
const finite=(n,min,max,key)=>{
 if(!Number.isFinite(n)||n<min||n>max)throw Error('invalid_'+key);
 return n;
};
const whole=(n,min,max,key)=>{finite(n,min,max,key);if(!Number.isSafeInteger(n))throw Error('invalid_'+key);return n};
const yen=n=>Math.round(n*100)/100;
export function compareProCandidate({
 plan='pro-980',model='gemini-3.1-flash-lite',scenario='heavy',
 fx=160,paidUsers=100,freeUsers=500,freeTurnsPerUser=30,freeCoachingPerUser=3,
 retries=1.5,monthlyHostingJpy=0,
 stripePercent=0.043,taxReservePercent=10/110
}={}){
 const offer=PLAN_CANDIDATES[plan],rate=RATE_SCENARIOS[model],load=TOKEN_SCENARIOS[scenario];
 if(!offer||!rate||!load)throw Error('invalid_plan_model_or_scenario');
 const inputs={
  fx:finite(fx,1,1000,'fx'),
  paidUsers:whole(paidUsers,1,1000000,'paid_users'),
  freeUsers:whole(freeUsers,0,100000000,'free_users'),
  freeTurnsPerUser:whole(freeTurnsPerUser,0,3000,'free_turns'),
  freeCoachingPerUser:whole(freeCoachingPerUser,0,90,'free_coaching'),
  retries:finite(retries,1,10,'retries'),
  monthlyHostingJpy:finite(monthlyHostingJpy,0,1e8,'hosting'),
  stripePercent:finite(stripePercent,0,0.4,'stripe_percent'),
  taxReservePercent:finite(taxReservePercent,0,0.4,'tax_reserve_percent')
 };
 const apiCost=shape=>(shape.input*rate.input+shape.output*rate.output)*inputs.fx/1e6;
 const conversationCost=apiCost(load.conversation),coachingCost=apiCost(load.coaching);
 const fullPaidCost=inputs.retries*(offer.turns*conversationCost+offer.coaching*coachingCost);
 const freeCost=inputs.retries*(inputs.freeTurnsPerUser*conversationCost+inputs.freeCoachingPerUser*coachingCost);
 const afterFees=offer.priceJpy*(1-inputs.stripePercent-inputs.taxReservePercent);
 const perPaidAfterCost=afterFees-fullPaidCost;
 const total=inputs.paidUsers*perPaidAfterCost-inputs.freeUsers*freeCost-inputs.monthlyHostingJpy;
 const minPrice=(fullPaidCost+(inputs.freeUsers/inputs.paidUsers)*freeCost+
  inputs.monthlyHostingJpy/inputs.paidUsers)/(1-inputs.stripePercent-inputs.taxReservePercent);
 return {
  basis:'HYPOTHETICAL_NO_LIVE_BILLING',
  plan,model,scenario,limits:{...offer},inputs,
  jpy:{paidAiAtQuota:yen(fullPaidCost),freeAiPerUser:yen(freeCost),
   paidContributionBeforeFreeAndHosting:yen(perPaidAfterCost),
   monthlyContributionBeforeOtherCosts:yen(total),
   breakEvenPriceAtAssumptions:yen(minPrice)},
  verdict:total>=0?'illustrative_nonnegative_not_launch_approval':'illustrative_loss_risk',
  warnings:['Actual Gemini quality, model availability, thinking tokens, provider invoices and retries are not verified.',
   'Free plan currently allows up to 3,000 turns / 90 coaching uses in 30 days. The lower Free inputs in this model are PROPOSED, not implemented.',
   'Tax reserve is a hypothetical safety allowance, NOT an actual tax calculation.',
   'Excludes refunds, overseas card fees, chargebacks, other taxes, fixed operating costs not specified and support/labor.',
   'Never change live prices, legacy 680-yen contracts, deployed models or usage caps from this model.']
 };
}
export function compareAllPlans(options={}){
 return Object.keys(PLAN_CANDIDATES).flatMap(plan=>
  Object.keys(RATE_SCENARIOS).map(model=>compareProCandidate({...options,plan,model})));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 process.stdout.write(JSON.stringify(compareAllPlans(),null,2)+'\n');
