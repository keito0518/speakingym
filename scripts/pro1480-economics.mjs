/**
 * Draft-only Speakingym Pro 1480 JPY model. Inputs are HYPOTHETICAL.
 * Does not call any API or confer permission to enable Stripe Live billing.
 */
import {perCallModelCosts,freeTheoreticalMax} from './pro680-economics.mjs';
import {pathToFileURL} from 'node:url';
export const OFFER=Object.freeze({priceJpy:1480,conversationTurns:1000,teacher:150});
const check=(v,min,max,key)=>{
 if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('invalid_'+key);
 return v;
};
const whole=(v,min,max,key)=>{
 check(v,min,max,key);if(!Number.isInteger(v))throw Error('invalid_'+key);return v;
};
const round=x=>Number(x.toFixed(2));
export function simulatePro1480({
 scenario='standard',fx=160,proUsers=100,freeUsers=500,
 proTurns=1000,proTeacher=150,freeTurns=20,freeTeacher=5,
 retries=1,taxReserveJpy=0,monthlyInfrastructureJpy=0,extraStripePct=0
}={}){
 const paidUsers=whole(proUsers,1,1e6,'pro_users');
 const guests=whole(freeUsers,0,1e8,'free_users');
 const pt=whole(proTurns,0,OFFER.conversationTurns,'pro_turns');
 const pc=whole(proTeacher,0,OFFER.teacher,'pro_teacher');
 const ft=whole(freeTurns,0,5000,'free_turns');
 const fc=whole(freeTeacher,0,300,'free_teacher');
 const retry=check(retries,1,10,'retries');
 const tax=check(taxReserveJpy,0,OFFER.priceJpy,'tax_reserve');
 const hosting=check(monthlyInfrastructureJpy,0,1e8,'hosting');
 const additional=check(extraStripePct,0,.5,'stripe_additional_pct');
 const rate=perCallModelCosts(scenario,fx);
 const paidAi=(pt*rate.conversation+pc*rate.teacher)*retry;
 const freeAi=(ft*rate.conversation+fc*rate.teacher)*retry;
 const stripe=OFFER.priceJpy*(.036+.007+additional);
 const contribution=OFFER.priceJpy-paidAi-stripe-tax;
 const total=paidUsers*contribution-guests*freeAi-hosting;
 return {
  basis:'HYPOTHETICAL_NOT_PROVIDER_INVOICE',
  priceJpy:OFFER.priceJpy,monthlyTurnsCap:OFFER.conversationTurns,
  monthlyTeacherCap:OFFER.teacher,
  scenario,fxAssumption:fx,
  inputs:{proUsers:paidUsers,freeUsers:guests,proTurns:pt,proTeacher:pc,
   freeTurns:ft,freeTeacher:fc,retries:retry,taxReserveJpy:tax,
   monthlyInfrastructureJpy:hosting,extraStripePct:additional},
  freeTheoreticalMaximum30Days:freeTheoreticalMax(30),
  jpy:{
   proAiCost:round(paidAi),proStripeAssumption:round(stripe),
   freeAiPerUser:round(freeAi),
   proContributionBeforeFreeAndHosting:round(contribution),
   totalContributionAfterFreeAndHosting:round(total)
  },
  status:total>=0?'illustrative_nonnegative_not_launch_approval':'illustrative_loss_risk',
  caveats:['Gemini input/output including thinking are assumed, not measured.',
   'Actual Google invoices, Free audience cost, retries, Cloudflare, tax and Stripe contract require verification.',
   'This script does not touch production Price IDs, subscriptions or quota counters.']
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const scenario=process.argv[2]||'standard',res=simulatePro1480({scenario});
  process.stdout.write(JSON.stringify(res,null,2)+'\n');
 }catch(e){process.stderr.write('Invalid scenario: '+e.message+'\n');process.exitCode=1}
}
