/**
 * Speakingym 2026-10-23 product decision: public Pro monthly price = ¥980 inclusive.
 * PRICE IS NOT AN OPTIMIZATION VARIABLE. Optimize token use, retention,
 * paid/free conversion, variable and fixed costs instead.
 * No network, credentials, customer billing, live/provider data or storage.
 * Sample usage mix and nominal standard paid-tier API rates are HYPOTHETICAL.
 */
import {pathToFileURL} from 'node:url';
export const PUBLIC_PRO_PRICE_JPY=980;
export const MODELS=Object.freeze({
 'gemini-3.5-flash-lite':Object.freeze({input:0.30,output:2.50}),
 'gemini-3.1-flash-lite':Object.freeze({input:0.25,output:1.50})
});
export const USAGE_SHAPES=Object.freeze({
 short:Object.freeze({conversation:Object.freeze({input:1200,output:150}),
  teacher:Object.freeze({input:2500,output:1400})}),
 heavy:Object.freeze({conversation:Object.freeze({input:2000,output:2000}),
  teacher:Object.freeze({input:4000,output:2200})})
});
const finite=(n,min,max,label)=>{
 if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('invalid_'+label);
 return n;
};
const count=(n,min,max,label)=>{
 finite(n,min,max,label);if(!Number.isSafeInteger(n))throw Error('invalid_'+label);return n;
};
const round=n=>Math.round(n*100)/100;
export function analyzeFixed980({
 model='gemini-3.1-flash-lite',shape='short',
 fx=160,retryFactor=1.5,
 paidUsers=100,freeUsers=500,
 // Convert from per-user average demand, not an authorization policy:
 paidUsageMix=[
  {share:0.70,turns:450,teacher:25},
  {share:0.25,turns:1000,teacher:40},
  {share:0.05,turns:2400,teacher:40}
 ],
 freeTurnsPerUser=20,freeTeacherPerUser=3,
 monthlyHostingJpy=3000,monthlySupportJpy=0,
 stripePercent=.043,taxReservePercent=10/110
}={}){
 const rate=MODELS[model],load=USAGE_SHAPES[shape];
 if(!rate||!load)throw Error('unknown_model_or_shape');
 const costs={
  fx:finite(fx,1,1000,'fx'),retryFactor:finite(retryFactor,1,10,'retry'),
  paidUsers:count(paidUsers,1,10000000,'paid_users'),
  freeUsers:count(freeUsers,0,100000000,'free_users'),
  freeTurnsPerUser:count(freeTurnsPerUser,0,3000,'free_turns'),
  freeTeacherPerUser:count(freeTeacherPerUser,0,90,'free_teacher'),
  monthlyHostingJpy:finite(monthlyHostingJpy,0,1e9,'hosting'),
  monthlySupportJpy:finite(monthlySupportJpy,0,1e9,'support'),
  stripePercent:finite(stripePercent,0,.4,'fees'),
  taxReservePercent:finite(taxReservePercent,0,.4,'tax_reserve')
 };
 if(!Array.isArray(paidUsageMix)||!paidUsageMix.length||paidUsageMix.length>20)
  throw Error('invalid_usage_mix');
 let fraction=0;
 const segments=paidUsageMix.map(segment=>{
  if(!segment||typeof segment!=='object')throw Error('invalid_usage_mix');
  const share=finite(segment.share,0,1,'share');
  fraction+=share;
  return {share,turns:count(segment.turns,0,100000,'turns'),
   teacher:count(segment.teacher,0,100000,'teacher')};
 });
 if(Math.abs(fraction-1)>1e-8)throw Error('usage_shares_must_equal_one');
 const perRequest=t=>(t.input*rate.input+t.output*rate.output)*fx*retryFactor/1e6;
 const perTurn=perRequest(load.conversation),perTeacher=perRequest(load.teacher);
 const averagePaidAi=segments.reduce((sum,s)=>
  sum+s.share*(s.turns*perTurn+s.teacher*perTeacher),0);
 const averageFreeAi=freeTurnsPerUser*perTurn+freeTeacherPerUser*perTeacher;
 // This tax amount is a hypothetical reserve, NOT the user's actual tax burden.
 const grossAfterFeeReserve=PUBLIC_PRO_PRICE_JPY*(1-stripePercent-taxReservePercent);
 const contributionBeforeFree=grossAfterFeeReserve-averagePaidAi;
 const freeBurden=freeUsers*averageFreeAi;
 const fixedCost=monthlyHostingJpy+monthlySupportJpy;
 const monthlyNet=paidUsers*contributionBeforeFree-freeBurden-fixedCost;
 const needed=goal=>{
  if(contributionBeforeFree<=0)return null;
  return Math.max(1,Math.ceil((goal+freeBurden+fixedCost)/contributionBeforeFree));
 };
 return {
  priceJpy:PUBLIC_PRO_PRICE_JPY,model,shape,
  status:'HYPOTHETICAL_ONLY_NOT_REAL_PROVIDER_INVOICE',
  input:{...costs,paidUsageMix:segments},
  jpy:{perTurn:round(perTurn),perTeacher:round(perTeacher),
   averagePaidAi:round(averagePaidAi),averageFreeAi:round(averageFreeAi),
   paidContributionBeforeFree:round(contributionBeforeFree),
   totalFreeAi:round(freeBurden),fixedMonthly:round(fixedCost),
   estimatedMonthlyMarginBeforeOtherCosts:round(monthlyNet)},
  paidMembersNeededForBreakEven:needed(0),
  paidMembersNeededFor50000Jpy:needed(50000),
  verdict:monthlyNet>=0?'illustrative_positive_not_proven':'illustrative_loss_risk',
  blockers:[
   'Neither customer retention, model 3.1 quality, actual invoice nor token tail is measured.',
   'Token/input/output shapes are assumptions; thinking tokens and retries may exceed them.',
   'Server-side current Pro cap is still 1000 turns/150 teacher in draft and is NOT changed by this calculator.',
   'Do not advertise unlimited billable AI conversation until stress/real usage and fair-use terms are verified.',
   'Excluded chargebacks, support overages, nonstandard card fees and taxes not represented by the reserve.'
  ]
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const scenarios=[
  {model:'gemini-3.1-flash-lite',shape:'short'},
  {model:'gemini-3.1-flash-lite',shape:'heavy'},
  {model:'gemini-3.5-flash-lite',shape:'short'},
  {model:'gemini-3.5-flash-lite',shape:'heavy'}
 ];
 process.stdout.write(JSON.stringify(scenarios.map(x=>analyzeFixed980(x)),null,2)+'\n');
}
