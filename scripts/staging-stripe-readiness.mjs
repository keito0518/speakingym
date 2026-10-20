/* Credential-free GET-only readiness check for isolated Stripe TEST staging.
 * This is not E2E evidence, and cannot create/charge Stripe subscriptions.
 */
import {pathToFileURL} from 'node:url';
import {stagingHealthUrl} from './staging-worker-smoke.mjs';

const ORIGIN='https://speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev';

export function validateStagingBillingHealth(data){
 if(data?.status!=='ok'||data.quotaVersion!=='pro-monthly-1000-150-v3')
  throw Error('STOP: unexpected staging plan or health version');
 for(const name of ['stagingBillingOnly','stagingBillingSchemaReady',
   'plansEnabled','plansReady','turnLedgerEnabled','turnLedgerSchemaReady',
   'freeSessionSchemaReady']){
  if(data[name]!==true)throw Error('STOP: staging '+name+' is not ready');
 }
 for(const name of ['stagingHealthOnly','aiEnabled','freeSessionRequested',
   'freeSessionEnabled','aiReplayRequested','aiReplayEnabled']){
  if(data[name]!==false)throw Error('STOP: staging '+name+' must be disabled');
 }
 if(data.billingMode!=='test')throw Error('STOP: staging Stripe billing is not in TEST mode');
 if(!Array.isArray(data.sceneIds)||data.sceneIds.length!==16)
  throw Error('STOP: unexpected staging content/version');
 return {environment:'isolated-staging',stripeMode:'test',schemaReady:true,
  aiDisabled:true,healthOnly:false,passed:true,
  limitations:'Health and schema only. Stripe Price, Webhook, Checkout, invoice, signed Firebase entitlement and portal E2E are not verified.'};
}
export async function inspectStageBilling(request=fetch){
 const uri=stagingHealthUrl(ORIGIN);
 let response;
 try{response=await request(uri,{method:'GET',cache:'no-store',
  signal:AbortSignal.timeout(16000)})}
 catch{throw Error('STOP: isolated staging Worker unreachable')}
 if(!response.ok)throw Error('STOP: isolated staging Worker HTTP '+response.status);
 let data;
 try{data=await response.json()}catch{throw Error('STOP: unreadable staging health')}
 return validateStagingBillingHealth(data);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log('PASS '+JSON.stringify(await inspectStageBilling()))}
 catch(e){console.error(String(e?.message||'STOP: staging readiness failed'));process.exitCode=1}
}
