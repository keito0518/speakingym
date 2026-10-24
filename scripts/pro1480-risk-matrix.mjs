/**
 * Illustrative operational risk matrix for Speakingym Pro ¥1,480.
 * No provider API, payment, logs, personal data, D1 or production changes.
 * NOT a replacement for measured usage and approved Live unit economics.
 */
import {simulatePro1480} from './pro1480-economics.mjs';
import {pathToFileURL} from 'node:url';
export function costRiskMatrix({proUsers=100,fx=160,hosting=0,taxReserveJpy=0}={}){
 const outcomes=[];
 for(const scenario of ['standard','heavy']){
  for(const retries of [1,1.5]){
   for(const freeUsers of [0,100,500,2000]){
    const base=simulatePro1480({scenario,fx,proUsers,freeUsers,
     proTurns:1000,proTeacher:150,freeTurns:20,freeTeacher:5,
     retries,taxReserveJpy,monthlyInfrastructureJpy:hosting});
    const freeCost=base.jpy.freeAiPerUser;
    const contribution=base.jpy.proContributionBeforeFreeAndHosting;
    const maxFreeUsers=freeCost>0?
      Math.max(0,Math.floor((proUsers*contribution-hosting)/freeCost)):null;
    outcomes.push({
     scenario,retries,proUsers,freeUsers,
     estimatedMonthlyJpy:base.jpy.totalContributionAfterFreeAndHosting,
     breakEvenFreeUsers:maxFreeUsers,
     status:base.status
    });
   }
  }
 }
 return {basis:'HYPOTHETICAL_NOT_VERIFIED_COST',priceJpy:1480,
  assumptions:{proUsers,fx,hosting,taxReserveJpy,
   proTurnsPerMonth:1000,teacherFeedbackPerMonth:150,
   freeTurnsPerUser:20,freeTeacherPerUser:5},
  outcomes,liveApproved:false,
  requiredEvidence:['Gemini real token and invoice charges','Free vs paid DAU and actual API attempts',
   'Stripe contractual fees, tax and refunds','Cloudflare logs and real monthly budget stop']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 process.stdout.write(JSON.stringify(costRiskMatrix(),null,2)+'\n');
}
