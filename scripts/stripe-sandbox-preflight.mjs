/**
 * Stripe sandbox settings preflight: REAL Stripe GET-only API inspection.
 *
 * Does NOT execute Stripe Checkout/Portal, trigger webhooks, modify a customer,
 * touch Firebase/D1/Gemini/Cloudflare, or demonstrate end-to-end subscription QA.
 * Never log secrets, account identity, response bodies, or customer data.
 *
 * Usage: env vars SPEAKINGYM_STRIPE_TEST_KEY (sk_test_...),
 *        SPEAKINGYM_STRIPE_TEST_PRICE_ID (price_...),
 *        SPEAKINGYM_STRIPE_TEST_WEBHOOK_URL (isolated staging endpoint URL).
 */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const API='https://api.stripe.com/v1/';
const VERSION='2025-06-30.basil';
const REQUIRED_WEBHOOK_EVENTS=[
 'checkout.session.completed','customer.subscription.created',
 'customer.subscription.updated','customer.subscription.deleted',
 'invoice.paid','invoice.payment_failed','invoice.payment_action_required'
];
const fail=code=>{throw Error(code)};
export function validateSandboxInputs({apiKey,priceId,webhookUrl}={}){
 if(typeof apiKey!=='string'||!/^sk_test_[A-Za-z0-9_]+$/.test(apiKey))
  fail('stripe_test_key_required');
 if(typeof priceId!=='string'||!/^price_[A-Za-z0-9]+$/.test(priceId))
  fail('stripe_test_price_id_required');
 let endpoint;
 try{endpoint=new URL(webhookUrl)}catch{fail('isolated_staging_webhook_url_required')}
 if(endpoint.protocol!=='https:'||endpoint.pathname!=='/billing/webhook'||
    endpoint.search||endpoint.hash||endpoint.username||endpoint.password)
  fail('invalid_staging_webhook_url');
 // A test key is insufficient: accidentally sending sandbox webhooks to
 // production (or to a lookalike hostname) must fail closed.
 if(endpoint.hostname.toLowerCase()!=='speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev'||
   endpoint.port||endpoint.origin!=='https://speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev')
  fail('exact_staging_webhook_required');
 return {apiKey,priceId,webhookUrl:endpoint.href};
}
const checkList=(value,label)=>{
 if(!Array.isArray(value?.data)||value.has_more!==false)
  fail(label+'_incomplete');
 if(value.data.length>100)fail(label+'_too_many');
 return value.data;
};

export async function inspectStripeSandbox(fetcher=fetch,options={}){
 const {apiKey,priceId,webhookUrl}=validateSandboxInputs(options);
 async function get(path){
  let response;
  try{
   response=await fetcher(API+path,{method:'GET',cache:'no-store',
    headers:{Authorization:'Bearer '+apiKey,'Stripe-Version':VERSION,
     Accept:'application/json'},
    signal:AbortSignal.timeout(15000)});
  }catch{fail('stripe_sandbox_api_unavailable')}
  if(response.status!==200)fail('stripe_sandbox_api_http_'+response.status);
  let payload;
  try{payload=await response.json()}catch{fail('stripe_sandbox_json_invalid')}
  if(!payload||typeof payload!=='object')fail('stripe_sandbox_json_invalid');
  return payload;
 }
 // No POSTs, sessions, customers, invoices, PaymentIntents, or Gemini requests.
 const [price,webhooks,portals]=await Promise.all([
  get('prices/'+encodeURIComponent(priceId)),
  get('webhook_endpoints?limit=100'),
  get('billing_portal/configurations?limit=100')
 ]);
 if(price.id!==priceId||price.object!=='price'||price.livemode!==false||!price.active||
   price.currency!=='jpy'||price.unit_amount!==1480||price.tax_behavior!=='inclusive'||
   price.type!=='recurring'||price.billing_scheme!=='per_unit'||
   price.recurring?.interval!=='month'||price.recurring?.interval_count!==1||
   price.recurring?.trial_period_days!=null||price.recurring?.usage_type!=='licensed')
  fail('stripe_test_price_not_1480_jpy_inclusive_monthly');
 const endpoints=checkList(webhooks,'webhook_endpoints');
 const candidates=endpoints.filter(w=>w.url===webhookUrl&&w.status==='enabled'&&w.livemode===false);
 if(candidates.length!==1)fail('staging_webhook_not_uniquely_enabled');
 const enabled=candidates[0].enabled_events;
 if(!Array.isArray(enabled)||!REQUIRED_WEBHOOK_EVENTS.every(e=>enabled.includes('*')||enabled.includes(e)))
  fail('staging_webhook_missing_subscription_events');
 const configs=checkList(portals,'portal_configurations');
 const defaults=configs.filter(c=>c.is_default===true&&c.active===true&&c.livemode===false);
 if(defaults.length!==1)fail('sandbox_default_portal_not_ready');
 const portal=defaults[0];
 if(portal.features?.subscription_cancel?.enabled!==true||
    portal.features.subscription_cancel.mode!=='at_period_end')
  fail('sandbox_portal_period_end_cancellation_disabled');
 if(portal.features?.payment_method_update?.enabled!==true)
  fail('sandbox_portal_payment_method_update_disabled');
 // Sanitized result only: never print Stripe keys, customer IDs, Price ID,
 // webhook URL, endpoint/account ID, or raw provider responses.
 return {
  mode:'test',readOnly:true,passed:true,
  priceJPY:1480,taxInclusive:true,period:'month',trial:false,
  isolatedWebhookEventCoverage:true,
  portalCancelAtPeriodEnd:true,portalPaymentMethodUpdate:true,
  limitations:'Settings inspected via Stripe TEST GET APIs only. Real Checkout, signed webhook, invoice renewal/failure, Firebase entitlement, cancellation and end-of-period must be tested separately.'
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const result=await inspectStripeSandbox(fetch,{
   apiKey:process.env.SPEAKINGYM_STRIPE_TEST_KEY,
   priceId:process.env.SPEAKINGYM_STRIPE_TEST_PRICE_ID,
   webhookUrl:process.env.SPEAKINGYM_STRIPE_TEST_WEBHOOK_URL
  });
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
 }catch(e){
  // All errors thrown by this module are fixed reason codes; never leak Stripe
  // response bodies, secrets, network error objects or account identifiers.
  process.stderr.write('Stripe sandbox preflight FAIL: '+String(e.message).slice(0,120)+'\n');
  process.exitCode=1;
 }
}
