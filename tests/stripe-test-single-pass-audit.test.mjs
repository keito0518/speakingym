import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectExistingSandbox,STAGING_WEBHOOK} from '../scripts/stripe-test-single-pass-audit.mjs';
import {PLAN} from '../scripts/stripe-test-price-bootstrap.mjs';

const key='sk_test_fixtureNoSecrets';
const product={object:'product',id:'prod_1480test',name:PLAN.name,active:true,livemode:false};
const price={object:'price',id:'price_1480test',product:product.id,active:true,livemode:false,
 currency:'jpy',unit_amount:1480,tax_behavior:'inclusive',billing_scheme:'per_unit',
 type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed',trial_period_days:null}};
const events=['checkout.session.completed','customer.subscription.created','customer.subscription.updated',
 'customer.subscription.deleted','invoice.paid','invoice.payment_failed','invoice.payment_action_required'];
const portal={object:'billing_portal.configuration',livemode:false,active:true,is_default:true,
 features:{subscription_cancel:{enabled:true,mode:'at_period_end'},payment_method_update:{enabled:true},subscription_update:{enabled:false}}};
const modern={object:'v2.core.event_destination',livemode:false,status:'enabled',type:'webhook_endpoint',
 enabled_events:events,event_payload:'snapshot',snapshot_api_version:'2026-09-30.endive',
 events_from:['@self'],webhook_endpoint:{url:STAGING_WEBHOOK}};
const v1={data:[],has_more:false};
const v2={data:[modern],next_page_url:null,previous_page_url:null};

function mock({
 catalogue=[{...product},{...product,id:'prod_legacy680',name:'Speakingym Pro'}],
 costs=[price],webhooks=v1,destinations=v2,portals=[portal],remoteStatus=200
}={}){
 const calls=[];
 return {calls,fetcher:async(url,req={})=>{
  calls.push({url,method:req.method,headers:req.headers});
  const target=new URL(url);
  let response;
  if(target.pathname==='/v1/products')response={data:catalogue,has_more:false};
  else if(target.pathname==='/v1/prices' && target.searchParams.has('product'))response={data:costs,has_more:false};
  else if(target.pathname==='/v1/prices/price_1480test')response=price;
  else if(target.pathname==='/v1/webhook_endpoints')response=webhooks;
  else if(target.pathname==='/v2/core/event_destinations')response=destinations;
  else if(target.pathname==='/v1/billing_portal/configurations')response={data:portals,has_more:false};
  else throw Error('Unexpected network call '+target.pathname);
  return {status:remoteStatus,json:async()=>response};
 }};
}
test('single-pass Stripe audit performs six safe GETs and hides ids and credentials',async()=>{
 const f=mock();
 const result=await inspectExistingSandbox({key,fetcher:f.fetcher});
 assert.equal(result.status,'PASS');
 assert.equal(result.readOnly,true);
 assert.equal(f.calls.length,6);
 for(const call of f.calls){
  assert.equal(call.method,'GET');
  assert.ok(call.url.startsWith('https://api.stripe.com/v1/')||
    call.url.startsWith('https://api.stripe.com/v2/'));
  assert.equal(call.headers.Authorization,'Bearer '+key);
 }
 const serial=JSON.stringify(result);
 for(const secret of [key,price.id,product.id,STAGING_WEBHOOK,'prod_legacy680'])
  assert.equal(serial.includes(secret),false);
});
test('missing or incorrectly configured Price never creates or updates existing products',async()=>{
 for(const args of [
  {catalogue:[{...product,id:'prod_legacy680',name:'Speakingym Pro'}]},
  {costs:[]},{costs:[{...price,tax_behavior:'unspecified'}]}
 ]){
  const f=mock(args);
  await assert.rejects(inspectExistingSandbox({key,fetcher:f.fetcher}),/manual review/);
  assert.equal(f.calls.every(c=>c.method==='GET'),true);
 }
});
test('no duplicate destination; correct snapshot and stable version required',async()=>{
 for(const args of [
  {destinations:{...v2,data:[]}},
  {destinations:{...v2,data:[modern,{...modern}]}},
  {destinations:{...v2,data:[{...modern,event_payload:'thin'}]}},
  {destinations:{...v2,data:[{...modern,snapshot_api_version:'2026-10-07.preview'}]}},
  {webhooks:{data:[{url:STAGING_WEBHOOK,status:'enabled',livemode:false,enabled_events:events}],has_more:false}},
  {portals:[]}
 ]){
  const f=mock(args);
  await assert.rejects(inspectExistingSandbox({key,fetcher:f.fetcher}));
  assert.equal(f.calls.every(c=>c.method==='GET'),true);
 }
});
test('LIVE key and connection errors never pass',async()=>{
 const f=mock();
 await assert.rejects(inspectExistingSandbox({key:'sk_live_invalid',fetcher:f.fetcher}),/TEST-only/);
 assert.equal(f.calls.length,0);
 const unavailable=mock({remoteStatus:401});
 await assert.rejects(inspectExistingSandbox({key,fetcher:unavailable.fetcher}),/HTTP 401/);
});
