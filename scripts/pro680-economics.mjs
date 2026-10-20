/**
 * Speakingym Pro ¥680 unit economics — explicit hypothetical inputs ONLY.
 * No provider calls, secrets, local logs, Stripe, D1, Gemini or plan writes.
 * Production price and quotas are never changed here.
 *
 * Official STANDARD rate references (check again before charging anyone):
 * https://ai.google.dev/gemini-api/docs/pricing
 * https://stripe.com/jp/pricing
 * https://stripe.com/jp/billing/pricing
 */
import {pathToFileURL} from 'node:url';

const MODELS=Object.freeze({
 'gemini-3.5-flash-lite':Object.freeze({inputUsdPerMillion:.30,outputUsdPerMillion:2.50})
});
export const PRODUCT=Object.freeze({
 priceJpy:680,proMonthlyConversation:600,proMonthlyTeacher:100,
 freeDailySessions:5,freeDailyTeacher:3,turnsPerSession:20,
 stripePaymentPct:.036,stripeBillingPct:.007
});
// Bounded, *illustrative* workload only. Outbound and thinking tokens are
// combined to reflect the Gemini pricing rule. Not provider measurements.
export const SCENARIOS=Object.freeze({
 standard:Object.freeze({conversation:{input:1200,outputIncludingThinking:150},
  teacher:{input:2500,outputIncludingThinking:1400}}),
 heavy:Object.freeze({conversation:{input:2000,outputIncludingThinking:2000},
  teacher:{input:4000,outputIncludingThinking:2200}})
});
const finite=(v,min,max,name)=>{
 if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('invalid_'+name);
 return v;
};
const integer=(v,min,max,name)=>{
 finite(v,min,max,name);
 if(!Number.isInteger(v))throw Error('invalid_'+name);
 return v;
};
const round=(v,d=2)=>Number(v.toFixed(d));
export function freeTheoreticalMax(days=30){
 integer(days,28,31,'days');
 return {sessions:PRODUCT.freeDailySessions*days,
  conversationTurns:PRODUCT.freeDailySessions*days*PRODUCT.turnsPerSession,
  teacher:PRODUCT.freeDailyTeacher*days};
}
export function perCallModelCosts(scenario='standard',fxJpyPerUsd=160){
 if(!Object.hasOwn(SCENARIOS,scenario))throw Error('unknown_scenario');
 finite(fxJpyPerUsd,1,1000,'fx');
 const model=MODELS['gemini-3.5-flash-lite'];
 const cost=({input,outputIncludingThinking})=>{
  return (input*model.inputUsdPerMillion+outputIncludingThinking*model.outputUsdPerMillion)
   *fxJpyPerUsd/1e6;
 };
 return {conversation:cost(SCENARIOS[scenario].conversation),
  teacher:cost(SCENARIOS[scenario].teacher)};
}
/**
 * Calls are modeled as paid provider API attempts, NOT guaranteed quota turns.
 * Defaults intentionally do NOT invent the current Free audience/traffic.
 */
export function analyzeProEconomics(options={}){
 const {
  scenario='standard',fxJpyPerUsd=160,
  proUsers=1,freeUsers=0,
  proConversationCalls=600,proTeacherCalls=100,
  freeConversationCalls=0,freeTeacherCalls=0,
  extraRetryFactor=1,hostMonthlyJpy=0,
  taxReservePerProJpy=0,stripeAdditionalPct=0
 }=options;
 const input={
  proUsers:integer(proUsers,1,1e7,'pro_users'),
  freeUsers:integer(freeUsers,0,1e8,'free_users'),
  proConversationCalls:integer(proConversationCalls,0,1e6,'pro_conversation_calls'),
  proTeacherCalls:integer(proTeacherCalls,0,1e6,'pro_teacher_calls'),
  freeConversationCalls:integer(freeConversationCalls,0,1e6,'free_conversation_calls'),
  freeTeacherCalls:integer(freeTeacherCalls,0,1e6,'free_teacher_calls'),
  extraRetryFactor:finite(extraRetryFactor,1,10,'retry_factor'),
  hostMonthlyJpy:finite(hostMonthlyJpy,0,1e9,'host_monthly'),
  taxReservePerProJpy:finite(taxReservePerProJpy,0,680,'tax_reserve'),
  stripeAdditionalPct:finite(stripeAdditionalPct,0,.5,'stripe_additional_pct')
 };
 if(input.proConversationCalls>PRODUCT.proMonthlyConversation ||
    input.proTeacherCalls>PRODUCT.proMonthlyTeacher)
  throw Error('pro_usage_above_sold_cap');
 const model=perCallModelCosts(scenario,fxJpyPerUsd);
 const paidApiCost=(input.proConversationCalls*model.conversation+
  input.proTeacherCalls*model.teacher)*input.extraRetryFactor;
 const freeApiCost=(input.freeConversationCalls*model.conversation+
  input.freeTeacherCalls*model.teacher)*input.extraRetryFactor;
 const stripePerUser=PRODUCT.priceJpy*(PRODUCT.stripePaymentPct+
  PRODUCT.stripeBillingPct+input.stripeAdditionalPct);
 const netPerSubscriberBeforeFreeAndHost=PRODUCT.priceJpy-stripePerUser-
  paidApiCost-input.taxReservePerProJpy;
 const monthlyNet=netPerSubscriberBeforeFreeAndHost*input.proUsers-
  freeApiCost*input.freeUsers-input.hostMonthlyJpy;
 const minSubscribers=netPerSubscriberBeforeFreeAndHost<=0?null:
  Math.max(1,Math.ceil((freeApiCost*input.freeUsers+input.hostMonthlyJpy)/
   netPerSubscriberBeforeFreeAndHost));
 const maxFreeUsers=netPerSubscriberBeforeFreeAndHost<=0?0:
  freeApiCost>0?Math.max(0,Math.floor((netPerSubscriberBeforeFreeAndHost*input.proUsers-
    input.hostMonthlyJpy)/freeApiCost)):null;
 const result={
  kind:'HYPOTHETICAL_ONLY_NOT_REAL_GEMINI_INVOICE',
  rates:'gemini-3.5-flash-lite standard input $0.30/1M output(including thinking) $2.50/1M, Stripe Japan 3.6%+Billing 0.7% illustrative (check actual account)',
  model:'gemini-3.5-flash-lite',scenario,fxAssumptionJpyPerUsd:fxJpyPerUsd,
  inputs:input,
  sales:{monthlyPriceJpy:PRODUCT.priceJpy,proTurnCap:PRODUCT.proMonthlyConversation,
   proTeacherCap:PRODUCT.proMonthlyTeacher,
   freeCeiling30Days:freeTheoreticalMax(30)},
  costsJpy:{
   perConversationApiAttempt:round(model.conversation,5),
   perTeacherApiAttempt:round(model.teacher,5),
   perProCustomerProvider:round(paidApiCost),
   perFreeCustomerProvider:round(freeApiCost),
   perProStripeAssumption:round(stripePerUser),
   perProTaxReserveAssumption:round(input.taxReservePerProJpy),
   monthlyHostingAssumption:round(input.hostMonthlyJpy)
  },
  result:{
   perProBeforeFreeUsersAndHostingJpy:round(netPerSubscriberBeforeFreeAndHost),
   totalMonthlyAfterFreeAndHostingJpy:round(monthlyNet),
   breakEvenMinProUsersForThisFreeBurden:minSubscribers,
   maxFreeUsersAtThisProBase:maxFreeUsers
  },
  verdict:monthlyNet>=0?'illustrative_nonnegative_not_launch_approval':
   'illustrative_loss_risk',
  warnings:[
   'These are INPUT SCENARIOS, not real customer, Google invoice, Gemini usage or actual free-user data.',
   'Provider API attempt counts can exceed successful quota turns due to retries, timeouts and invalid replies.',
   'Free users can theoretically reach up to 3000 turns and 90 teacher checks in a 30-day month; Free has daily/session limits and these maxima are not typical usage.',
   'Tax reserve is optional planning money only, NOT a calculated Japanese consumption tax liability; tax rules vary by seller.',
   'Excludes other fees, annual conversion, disputes/refunds, personnel, foreign-card surcharges, taxes beyond reserve and unobserved model errors.',
   'Never enable live billing, change product quota, or claim profit based only on this illustration.'
  ]
 };
 return result;
}

function parseArgs(argv){
 const out={};
 const names={
  '--scenario':'scenario','--fx':'fxJpyPerUsd','--pro-users':'proUsers',
  '--free-users':'freeUsers','--pro-conv':'proConversationCalls',
  '--pro-teacher':'proTeacherCalls','--free-conv':'freeConversationCalls',
  '--free-teacher':'freeTeacherCalls','--retry-factor':'extraRetryFactor',
  '--hosting':'hostMonthlyJpy','--tax-reserve':'taxReservePerProJpy',
  '--stripe-additional-pct':'stripeAdditionalPct'
 };
 for(let i=0;i<argv.length;i++){
  const key=names[argv[i]];
  if(!key||i+1===argv.length)throw Error('invalid_cli_argument');
  const str=argv[++i];out[key]=key==='scenario'?str:Number(str);
 }
 return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{process.stdout.write(JSON.stringify(analyzeProEconomics(parseArgs(process.argv.slice(2))),null,2)+'\n')}
 catch(e){process.stderr.write('Scenario invalid: '+e.message+'\n');process.exitCode=1}
}
