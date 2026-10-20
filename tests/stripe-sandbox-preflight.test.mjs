import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectStripeSandbox,validateSandboxInputs,verifiedStripeWebhookDestinations}
 from '../scripts/stripe-sandbox-preflight.mjs';

const key=['sk','test','fixtureForReadOnlyChecks'].join('_');
const priceId='price_Test1480';
const webhookUrl='https://speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev/billing/webhook';
const inputs={apiKey:key,priceId,webhookUrl};
const price=()=>({object:'price',id:priceId,livemode:false,active:true,
 currency:'jpy',unit_amount:1480,tax_behavior:'inclusive',type:'recurring',
 billing_scheme:'per_unit',recurring:{interval:'month',interval_count:1,trial_period_days:null,usage_type:'licensed'}});
const endpoint=()=>({id:'we_test',object:'webhook_endpoint',api_version:'2025-06-30.basil',
 application:null,url:webhookUrl,livemode:false,status:'enabled',
 enabled_events:['checkout.session.completed','customer.subscription.created','customer.subscription.updated',
 'customer.subscription.deleted','invoice.paid','invoice.payment_failed','invoice.payment_action_required']});
const portal=()=>({id:'bpc_test',livemode:false,is_default:true,active:true,
 features:{subscription_cancel:{enabled:true,mode:'at_period_end'},payment_method_update:{enabled:true},subscription_update:{enabled:false}}});
const v2destination=()=>({
 id:'ed_test_fixture',object:'v2.core.event_destination',
 webhook_endpoint:{url:webhookUrl,signing_secret:null},type:'webhook_endpoint',
 livemode:false,status:'enabled',event_payload:'snapshot',
 snapshot_api_version:'2026-09-30.endive',events_from:['@self'],
 enabled_events:endpoint().enabled_events
});
const modern=(data=[])=>({data,next_page_url:null,previous_page_url:null});
function scenario(edits={}){
 const records={price:price(),webhooks:{data:[endpoint()],has_more:false},
  modernDestinations:modern(),portals:{data:[portal()],has_more:false},...edits};
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  const path=new URL(url).pathname;
  const value=path.includes('/prices/')?records.price:
   path.endsWith('/webhook_endpoints')?records.webhooks:
   path.endsWith('/event_destinations')?records.modernDestinations:
   path.endsWith('/billing_portal/configurations')?records.portals:undefined;
  if(!value)throw Error('Unexpected endpoint');
  return {status:200,json:async()=>value};
 };
 return {calls,fetcher};
}
test('read-only sandbox inspection checks monthly ¥1,480 tax-inclusive, events and cancellation',async()=>{
 const f=scenario(),result=await inspectStripeSandbox(f.fetcher,inputs);
 assert.equal(result.passed,true);
 assert.equal(result.mode,'test');
 assert.equal(result.priceJPY,1480);
 assert.equal(result.portalCancelAtPeriodEnd,true);
 assert.equal(f.calls.length,4);
 for(const {url,options} of f.calls){
  assert.equal(options.method,'GET');
  assert.equal(options.headers.Authorization,'Bearer '+key);
  assert.equal(options.cache,'no-store');
  assert.ok(url.startsWith('https://api.stripe.com/v1/')||url.startsWith('https://api.stripe.com/v2/'));
  assert.doesNotMatch(url,/\/(?:checkout\/sessions|customers|invoices|payment_intents)/);
 }
 const display=JSON.stringify(result);
 for(const v of [key,priceId,webhookUrl,'we_test','bpc_test'])
  assert.equal(display.includes(v),false);
});
test('reject non-test keys, invalid price, production webhook and non-HTTPS input',()=>{
 for(const changes of [
  {apiKey:['sk','live','prohibited'].join('_')},
  {apiKey:['rk','test','prohibited'].join('_')},
  {priceId:'prod_wrong'},{priceId:''},
  {webhookUrl:'http://example.com/billing/webhook'},
  {webhookUrl:'https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/billing/webhook'},
  {webhookUrl:'https://speakingym.pages.dev/billing/webhook'},
  {webhookUrl:'https://speakingym-survival-ai-staging.example.workers.dev/billing/webhook'},
  {webhookUrl:'https://not-speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev/billing/webhook'},
  {webhookUrl:'https://other.test/billing/webhook?token=abc'},
  {webhookUrl:'https://other.test/billing/checkout'}
 ])assert.throws(()=>validateSandboxInputs({...inputs,...changes}));
});
test('reject incorrect prices, test trial or live-mode Price',async()=>{
 for(const changes of [
  {livemode:true},{unit_amount:1000},{currency:'usd'},
  {tax_behavior:'exclusive'},{tax_behavior:'unspecified'},
  {recurring:{interval:'year',interval_count:1,trial_period_days:null,usage_type:'licensed'}},
  {recurring:{interval:'month',interval_count:1,trial_period_days:14,usage_type:'licensed'}},
  {recurring:{interval:'month',interval_count:1,trial_period_days:null,usage_type:'metered'}},
  {active:false},{billing_scheme:'tiered'},{type:'one_time'},{id:'price_other'}
 ]){
  const f=scenario({price:{...price(),...changes}});
  await assert.rejects(inspectStripeSandbox(f.fetcher,inputs),/stripe_test_price_not_1480/);
 }
});
test('webhook must uniquely match stage, be enabled non-live and cover all events',async()=>{
 for(const changes of [
  {livemode:true},{status:'disabled'},{connect:true},{application:'ca_other'},
  {object:'other'},{api_version:null},{api_version:undefined},
  {api_version:'2026-10-07.preview'},{api_version:'2024-01-01'},
  {url:'https://other.test/billing/webhook'}
 ]){
  const f=scenario({webhooks:{has_more:false,data:[{...endpoint(),...changes}]}});
  await assert.rejects(inspectStripeSandbox(f.fetcher,inputs),
   /staging_webhook_not_uniquely|webhook_endpoints_test_mode_required/);
 }
 const missing=scenario({webhooks:{has_more:false,data:[{...endpoint(),enabled_events:['invoice.paid']}]}});
 await assert.rejects(inspectStripeSandbox(missing.fetcher,inputs),/staging_webhook_missing_subscription_events/);
 const duplicate=scenario({webhooks:{has_more:false,data:[endpoint(),endpoint()]}});
 await assert.rejects(inspectStripeSandbox(duplicate.fetcher,inputs),/staging_webhook_not_uniquely/);
 const star=scenario({webhooks:{has_more:false,data:[{...endpoint(),enabled_events:['*']}]}});
 assert.equal((await inspectStripeSandbox(star.fetcher,inputs)).passed,true);
 const stable=scenario({webhooks:{has_more:false,data:[{...endpoint(),api_version:'2026-09-30.endive'}]}});
 assert.equal((await inspectStripeSandbox(stable.fetcher,inputs)).passed,true);
});
test('default portal requires period-end cancellation and payment-method update',async()=>{
 for(const changes of [
  {is_default:false},{active:false},{livemode:true},
  {features:{...portal().features,subscription_cancel:{enabled:false,mode:'at_period_end'}}},
  {features:{...portal().features,subscription_cancel:{enabled:true,mode:'immediately'}}},
  {features:{...portal().features,payment_method_update:{enabled:false}}},
  {features:{...portal().features,subscription_update:{enabled:true}}},
  {features:{...portal().features,subscription_update:undefined}}
 ]){
  const f=scenario({portals:{has_more:false,data:[{...portal(),...changes}]}});
  await assert.rejects(inspectStripeSandbox(f.fetcher,inputs));
 }
});
test('pagination, Stripe HTTP errors, transport failure never pass',async()=>{
 for(const changes of [
  {webhooks:{has_more:true,data:[endpoint()]}},
  {portals:{has_more:true,data:[portal()]}}
 ]){
  await assert.rejects(inspectStripeSandbox(scenario(changes).fetcher,inputs),/incomplete/);
 }
 const invalid=async()=>({status:401,json:async()=>({secret:'x'})});
 await assert.rejects(inspectStripeSandbox(invalid,inputs),/stripe_sandbox_api_http_401/);
 const offline=async()=>{throw Error('network path might accidentally include secret')};
 await assert.rejects(inspectStripeSandbox(offline,inputs),/stripe_sandbox_api_unavailable/);
});

test('2026 Workbench v2 snapshot event destination counts as exactly one verified staging webhook',async()=>{
 const f=scenario({webhooks:{has_more:false,data:[]},
  modernDestinations:modern([v2destination()])});
 const result=await inspectStripeSandbox(f.fetcher,inputs);
 assert.equal(result.passed,true);
 assert.equal(f.calls.filter(x=>x.url.includes('/v2/core/event_destinations')).length,1);
 assert.ok(f.calls.some(x=>x.url.includes('include%5B0%5D=webhook_endpoint.url')));
 const modernCall=f.calls.find(x=>x.url.includes('/v2/core/event_destinations'));
 assert.equal(modernCall.options.headers['Stripe-Version'],'2026-09-30.endive');
 for(const call of f.calls)assert.equal(call.options.method,'GET');
});
test('a duplicate old + modern destination can never pass',async()=>{
 const f=scenario({modernDestinations:modern([v2destination()])});
 await assert.rejects(inspectStripeSandbox(f.fetcher,inputs),/staging_webhook_not_uniquely_enabled/);
});
test('modern Stripe destinations fail closed if preview, thin, wrong source or wrong target',async()=>{
 for(const changes of [
  {event_payload:'thin'},{snapshot_api_version:'2026-10-07.preview'},
  {snapshot_api_version:null},{events_from:['@accounts']},
  {events_from:['@self','@accounts']},{status:'disabled'},
  {type:'amazon_eventbridge'},{enabled_events:['invoice.paid']},
  {livemode:true},{webhook_endpoint:{url:'https://speakingym.pages.dev/billing/webhook'}}
 ]){
  const f=scenario({webhooks:{has_more:false,data:[]},
   modernDestinations:modern([{...v2destination(),...changes}])});
  await assert.rejects(inspectStripeSandbox(f.fetcher,inputs),/mode_mismatch|not_uniquely_enabled|missing_subscription_events/,JSON.stringify(changes));
 }
});
test('modern Stripe event destinations require complete unpaginated JSON',async()=>{
 for(const response of [
  {data:[v2destination()],next_page_url:'/v2/core/event_destinations?page=more',previous_page_url:null},
  {data:[v2destination()],next_page_url:null},
  {data:'unexpected',next_page_url:null,previous_page_url:null}
 ]){
  const f=scenario({webhooks:{has_more:false,data:[]},modernDestinations:response});
  await assert.rejects(inspectStripeSandbox(f.fetcher,inputs),/event_destinations_v2_incomplete/);
 }
});
