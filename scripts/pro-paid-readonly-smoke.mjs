/**
 * Speakingym paid launch inspection — STRICTLY PUBLIC GET requests.
 *
 * This is not a payment test, legal opinion or production activation.
 * Run only after the operator explicitly authorized an invited live pilot
 * or public rollout and configured that environment. It does not create users,
 * checkout sessions, bill cards, change D1, invoke Gemini or set flags.
 */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const SITE='https://speakingym.pages.dev/';
const WORKER='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/';

export async function verifyPaidLaunchReadOnly(fetcher=fetch, {site=SITE,worker=WORKER}={}){
 for(const origin of [site,worker]){
  const u=new URL(origin);
  assert.equal(u.protocol,'https:','Public inspection must use HTTPS');
  assert.equal(u.pathname,'/','Base URLs must be origins, not arbitrary API paths');
 }
 const read=async(url)=>{
  const result=await fetcher(url,{method:'GET',cache:'no-store',
   headers:{Accept:'text/html,application/json'},
   signal:AbortSignal.timeout(12000)});
  assert.equal(result.status,200,'Public HTTP 200 required: '+url);
  const body=await result.text();
  assert.ok(body.length>0&&body.length<500000,'Missing or oversized public page: '+url);
  return body;
 };
 // Keep probes side-effect-free: never POST checkout, ask for Firebase tokens,
 // call Stripe, execute D1 SQL, or send customer details to logs.
 const [plans,legal,terms,privacy,contact,healthRaw]=await Promise.all([
  read(site+'plans.html'),
  read(site+'tokusho.html'),
  read(site+'terms.html'),
  read(site+'privacy.html'),
  read(site+'contact.html'),
  read(worker+'health')
 ]);
 assert.match(plans,/¥1,480|1,480円|1480/, 'JPY 1480 price must be presented');
 assert.match(plans,/自動更新|毎月請求/, 'Subscription renewal disclosure missing');
 assert.match(plans,/href="\.\/tokusho\.html"/, 'Linked legal disclosure missing');
 assert.match(plans,/href="\.\/terms\.html"/, 'Terms link missing from purchase flow');
 assert.match(plans,/id="sg-live-accept"/, 'Pre-Checkout recurring subscription consent UI missing');
 assert.match(legal,/特定商取引法に基づく表記/, 'Statutory disclosure page missing');
 assert.match(legal,/開示請求|販売事業者/, 'Buyer must have operator-disclosure channel');
 assert.doesNotMatch(legal,/販売開始前の草案|正式販売は開始しません|販売準備中|未確定|方針策定中|体制を整備中/,
  'UNVERIFIED legal draft may not be presented for live billing');
 assert.doesNotMatch(terms,/有料プランの購入・決済は提供していません|ベータ版/,
  'Outdated free-beta terms must not be used for real recurring charges');
 assert.match(terms,/1,480|有料|Pro/, 'Paid terms must mention the paid service');
 assert.match(terms,/解約|キャンセル/, 'Cancellation must be explained in terms');
 assert.match(privacy,/Stripe/, 'Privacy notice must mention payment processor');
 assert.match(contact,/mailto:/, 'Customer contact channel missing');
 assert.match(contact,/開示請求/, 'Operator detail request must be accessible');

 let health;
 try{health=JSON.parse(healthRaw)}catch{throw Error('Worker /health JSON invalid')}
 assert.equal(health.status,'ok','Worker health must be OK');
 assert.equal(health.billingMode,'live','Live billing flag not confirmed; do not claim paid launch');
 assert.equal(health.aiEnabled,true,'AI is disabled');
 assert.equal(health.aiConfigured,true,'Gemini configuration not proven');
 assert.equal(health.plansEnabled,true,'Server-side plan limit enforcement is off');
 assert.equal(health.plansReady,true,'D1 plan binding not ready');
 assert.equal(health.turnLedgerEnabled,true,'AI turn-ledger protection not enabled');
 assert.equal(health.turnLedgerSchemaReady,true,'AI turn-ledger schema missing');
 assert.equal(health.quotaVersion,'pro-monthly-1000-150-v3');
 assert.ok(Array.isArray(health.sceneIds)&&new Set(health.sceneIds).size>=16,'AI scene coverage unexpected');
 return {publicReadOnlyChecks:true,mode:health.billingMode,pagesChecked:5,workerHealthChecked:true,
  note:'Public GET-only evidence. Not a real Stripe checkout/webhook test, legal review, audience check, or authorization to activate subscriptions.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await verifyPaidLaunchReadOnly();
 console.log(JSON.stringify(result,null,2));
}
