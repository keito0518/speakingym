/**
 * Speakingym Stripe TEST-only one-pass check.
 * One local sk_test_ key; NO copied Price ID or webhook endpoint needed.
 * Reuses existing 1480 test product, inspects both Stripe v1 and v2 destinations.
 * GET requests only, never calls production, creates objects, or logs secrets.
 * The local env var SPEAKINGYM_STRIPE_TEST_KEY is read once and never stored.
 */
import {pathToFileURL} from 'node:url';
import {prepareStripeTestPrice} from './stripe-test-price-bootstrap.mjs';
import {inspectStripeSandbox} from './stripe-sandbox-preflight.mjs';

export const STAGING_WEBHOOK='https://speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev/billing/webhook';

export async function inspectExistingSandbox({key,fetcher=fetch}={}){
 const catalogue=await prepareStripeTestPrice({key,request:fetcher});
 if(catalogue.mode!=='test'||catalogue.changed!==false||
    catalogue.product!=='verified'||catalogue.price!=='existing'||!/^price_[A-Za-z0-9]+$/.test(catalogue.priceId||'')){
  throw Error('STOP: Existing NEW ¥1,480 Stripe TEST product/price needs manual review. No new object was created.');
 }
 const webhookAndPortal=await inspectStripeSandbox(fetcher,{
  apiKey:key,priceId:catalogue.priceId,webhookUrl:STAGING_WEBHOOK
 });
 if(!webhookAndPortal.passed||webhookAndPortal.mode!=='test')
  throw Error('STOP: Stripe TEST-only inspection incomplete');
 return {
  status:'PASS',mode:'test',readOnly:true,
  productAndPrice:'existing monthly ¥1,480 inclusive verified',
  destination:'exact isolated staging webhook verified (v1/v2)',
  customerPortal:'cancel at period end and payment update verified',
  actionsTaken:'GET-only (no charges, subscriptions, mutations or secrets displayed)',
  limits:'Does not prove Stripe Checkout, signed Webhook delivery, Firebase entitlement, renewals, cancellations, or staging D1 readiness.'
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==2){console.error('STOP: unknown option. Read-only audit takes no arguments.');process.exit(1)}
 try{
  console.log(JSON.stringify(await inspectExistingSandbox({key:process.env.SPEAKINGYM_STRIPE_TEST_KEY}),null,2));
 }catch(e){
  // Error codes produced by inner scripts are static, but sanitize for defense in depth.
  const raw=String(e?.message||'unexpected_error');
  const allowed=/^(STOP: [A-Za-z0-9 ,()\.¥–/-]+|stripe_[a-z0-9_]+)$/;
  console.error('Stripe TEST audit failed: '+(allowed.test(raw)?raw:'configuration_or_connection_not_ready'));
  process.exitCode=1;
 }
}
