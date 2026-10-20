import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './ai-worker.js';
import {getPlan} from './plan-limits.js';
import {billingConfigured,verifyStripeSignature,subscriptionAccess,subscriptionAccessReason,withAccountLock} from './billing.js';
const time=()=>Math.floor(Date.now()/1000);
const origin='https://speakingym.pages.dev';
function database(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('./schema-plans.sql',import.meta.url),'utf8'));
 sqlite.exec(readFileSync(new URL('./migrations/0001-billing.sql',import.meta.url),'utf8'));
 return {sqlite,prepare(sql){return {bind(...args){return {first:async()=>sqlite.prepare(sql).get(...args)||null,run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}})}}}},
 async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
}
const config=db=>({PLAN_DB:db,ENFORCE_PLANS:'true',BILLING_MODE:'test',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_PRICE_ID:'price_test',BILLING_TEST_UIDS:'student'});
const active=()=>({id:'sub_test',customer:'cus_test',livemode:false,status:'active',items:{data:[{quantity:1,price:{id:'price_test'},current_period_end:time()+3600}]},latest_invoice:{status:'paid',paid:true}});
async function signature(raw,ts=time(),secret='whsec_fixture'){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return 't='+ts+',v1='+Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw))).toString('hex');
}
async function fixture(t){
 const db=database(),env=config(db);
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid=crypto.randomUUID();
 async function token(uid='student'){
  const data=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url')+'.'+Buffer.from(JSON.stringify({aud:'speakingym',iss:'https://securetoken.google.com/speakingym',sub:uid,iat:time()-1,auth_time:time()-1,exp:time()+3600})).toString('base64url');
  return data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url');
 }
 const state={subscriptions:[],sessions:new Map(),calls:[],stripeUnavailable:false,live:false,price:{object:'price',id:'price_test',active:true,livemode:false,currency:'jpy',unit_amount:1480,type:'recurring',billing_scheme:'per_unit',tax_behavior:'inclusive',recurring:{interval:'month',interval_count:1,trial_period_days:null,usage_type:'licensed'}},invoice:{id:'in_test',livemode:false,customer:'cus_test',status:'paid',paid:true},failCreate:false};
 t.mock.method(globalThis,'fetch',async(url,opt={})=>{
  if(String(url).includes('googleapis.com'))return Response.json({keys:[jwk]});
  if(state.stripeUnavailable)return new Response('upstream temporary failure',{status:503});
  state.calls.push([url,opt]);const path=new URL(url).pathname.replace('/v1/','');let result;
  if(path==='prices/price_test')result=state.price;
  else if(path==='invoices/in_test')result=state.invoice;
  else if(path==='customers')result={id:'cus_test',livemode:state.live};
  else if(path==='subscriptions')result={data:state.subscriptions,has_more:false};
  else if(path.startsWith('subscriptions/'))result=state.subscriptions.find(s=>s.id===path.split('/')[1]);
  else if(path==='checkout/sessions'){
   if(state.failCreate)throw Error('lost connection');
   const key=opt.headers['Idempotency-Key'];
   if(!state.sessions.has(key)){
    const body=new URLSearchParams(opt.body);
    const purchasedPrice=body.get('line_items[0][price]');
    state.sessions.set(key,{
     id:'cs_test_'+state.sessions.size,object:'checkout.session',livemode:state.live,
     customer:'cus_test',status:'open',mode:'subscription',
     url:'https://checkout.stripe.com/c/pay/test',
     client_reference_id:body.get('client_reference_id'),
     currency:'jpy',amount_subtotal:1480,amount_total:1480,
     expires_at:Number(body.get('expires_at')),
     success_url:body.get('success_url'),cancel_url:body.get('cancel_url'),
     line_items:{object:'list',data:[{price:{id:purchasedPrice},quantity:1,
      currency:'jpy',amount_total:1480}],has_more:false}
    });
   }
   result=state.sessions.get(key);
  }else if(path.startsWith('checkout/sessions/')&&path.endsWith('/line_items')){
   result=[...state.sessions.values()].find(s=>s.id===path.split('/')[2])?.line_items;
  }else if(path.startsWith('checkout/sessions/'))result=[...state.sessions.values()].find(s=>s.id===path.split('/')[2]);
  else if(path==='billing_portal/sessions')result={url:'https://billing.stripe.com/p/session/test'};
  else throw Error('unexpected Stripe endpoint '+path);
  return Response.json(result);
 });
 const auth=await token();
 async function call(path,method='POST',bearer=auth,requestOrigin=origin){return worker.fetch(new Request('https://worker.example/billing/'+path,{method,headers:{Origin:requestOrigin,...(bearer?{Authorization:'Bearer '+bearer}:{})}}),env)}
 async function event(type='invoice.paid',id=crypto.randomUUID(),object={customer:'cus_test'},livemode=false,apiVersion='2025-06-30.basil'){
  const raw=JSON.stringify({id,type,livemode,api_version:apiVersion,created:1,data:{object}});
  return worker.fetch(new Request('https://worker.example/billing/webhook',{method:'POST',headers:{'stripe-signature':await signature(raw,time(),env.BILLING_MODE==='live'?env.STRIPE_LIVE_WEBHOOK_SECRET:env.STRIPE_WEBHOOK_SECRET)},body:raw}),env);
 }
 return {db,env,state,call,event,token};
}
test('billing is off by default, rejects live keys and requires tester allowlist',()=>{
 assert.equal(billingConfigured({}),false);const env=config(database());assert.equal(billingConfigured(env),true);
 for(const override of [{STRIPE_SECRET_KEY:'sk_live_forbidden'},{BILLING_MODE:'live'},{BILLING_TEST_UIDS:''},{ENFORCE_PLANS:'false'}])assert.equal(billingConfigured({...env,...override}),false);
});
test('webhook verifies raw body, timestamp, multiple signatures and rejects tampering',async()=>{
 const raw='{"id":"evt_test"}',sig=await signature(raw);
 assert.equal(await verifyStripeSignature(raw,sig,'whsec_fixture'),true);
 assert.equal(await verifyStripeSignature(raw,sig+',v1='+'0'.repeat(64),'whsec_fixture'),true);
 assert.equal(await verifyStripeSignature(raw+' ',sig,'whsec_fixture'),false);
 assert.equal(await verifyStripeSignature(raw,await signature(raw,time()-301),'whsec_fixture'),false);
 assert.equal(await verifyStripeSignature(raw,sig+',t='+time(),'whsec_fixture'),false);
});

// Models the stable 2026 Workbench Event destinations v2 SNAPSHOT envelope.
 // It does not substitute for a real Stripe event delivery test.
test('stable 2026 Workbench snapshot invoice event with valid signature reconciles server-side',async t=>{
 const f=await fixture(t);
 await f.call('checkout');
 f.state.subscriptions=[active()];
 const response=await f.event('invoice.paid','evt_stable_endive',{customer:'cus_test'},false,'2026-09-30.endive');
 assert.equal(response.status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
 const repeated=await f.event('invoice.paid','evt_stable_endive',{customer:'cus_test'},false,'2026-09-30.endive');
 assert.equal(repeated.status,200);
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) as n FROM billing_events').get().n,1);
});
test('Basil invoice without removed paid boolean grants Pro only for status paid',async t=>{
 const f=await fixture(t);
 await f.call('checkout');
 // In Stripe 2025-03-31.basil+ invoice.paid has been removed.
 f.state.subscriptions=[{...active(),latest_invoice:{id:'in_test',customer:'cus_test',livemode:false,status:'paid'}}];
 assert.equal(subscriptionAccessReason(f.state.subscriptions[0],'price_test'),'ok');
 const result=await f.call('status','GET');
 assert.equal(result.status,200);
 const response=await result.json();
 assert.equal(response.pro,true);
 assert.equal(response.entitlementReason,'ok');
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
});
test('Basil invoice in non-paid status never grants Pro',async t=>{
 const f=await fixture(t);
 await f.call('checkout');
 f.state.subscriptions=[{...active(),latest_invoice:{id:'in_test',customer:'cus_test',livemode:false,status:'open'}}];
 const result=await f.call('status','GET');
 assert.equal(result.status,200);
 assert.equal((await result.json()).pro,false);
 assert.equal(await getPlan(f.db,'student',f.env),'free');
});
test('explicitly contradictory legacy paid false fails closed',()=>{
 assert.equal(subscriptionAccessReason({...active(),latest_invoice:{status:'paid',paid:false}},'price_test'),'invoice_unpaid');
});
test('Basil invoice returned by Stripe ID can be verified as paid',async t=>{
 const f=await fixture(t);
 await f.call('checkout');
 f.state.invoice={id:'in_test',livemode:false,customer:'cus_test',status:'paid'};
 f.state.subscriptions=[{...active(),latest_invoice:'in_test'}];
 assert.equal((await f.event('invoice.paid','evt_basil_invoice')).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
});

test('Checkout refuses trial, metered, tiered and unexpected price objects before customer creation',async t=>{
 const cases=[
  {recurring:{interval:'month',interval_count:1,trial_period_days:14,usage_type:'licensed'}},
  {recurring:{interval:'month',interval_count:1,trial_period_days:null,usage_type:'metered'}},
  {billing_scheme:'tiered'},{type:'one_time'},{object:'coupon'},
  {id:'price_wrong'},{tax_behavior:'exclusive'}, {unit_amount:680}
 ];
 for(const fields of cases){
  await t.test(Object.keys(fields)[0],async inner=>{
   const f=await fixture(inner);
   Object.assign(f.state.price,fields);
   const response=await f.call('checkout');
   assert.equal(response.status,503);
   assert.equal((await response.json()).error,'billing_price_invalid');
   assert.equal(f.state.calls.some(([url])=>String(url).endsWith('/customers')),false);
  });
 }
});

test('Stripe TEST checkout and portal use only isolated localhost QA return URLs',async testContext=>{
 const f=await fixture(testContext);
 f.env.STAGING_BILLING_ONLY='true';
 f.env.STAGING_HEALTH_ONLY='false';
 const first=await f.call('checkout');
 assert.equal(first.status,200);
 const checkoutCall=f.state.calls.find(([url,options])=>
  String(url).endsWith('/checkout/sessions')&&options.method==='POST');
 assert.ok(checkoutCall);
 const checkoutParams=new URLSearchParams(checkoutCall[1].body);
 assert.equal(checkoutParams.get('success_url'),'http://localhost:8765/stripe-staging-qa.html?billing=success');
 assert.equal(checkoutParams.get('cancel_url'),'http://localhost:8765/stripe-staging-qa.html?billing=cancel');
 const portal=await f.call('portal');
 assert.equal(portal.status,200);
 const portalCall=f.state.calls.find(([url,options])=>
  String(url).endsWith('/billing_portal/sessions')&&options.method==='POST');
 assert.ok(portalCall);
 const portalParams=new URLSearchParams(portalCall[1].body);
 assert.equal(portalParams.get('return_url'),'http://localhost:8765/stripe-staging-qa.html');
});

test('entitlement requires active paid current exact price and no pause',()=>{
 assert.equal(subscriptionAccess(active(),'price_test'),true);
 for(const changes of [{status:'past_due'},{status:'unpaid'},{status:'canceled'},{status:'trialing'},{livemode:true},{pause_collection:{}},{latest_invoice:{paid:false,status:'open'}}])assert.equal(subscriptionAccess({...active(),...changes},'price_test'),false);
 assert.equal(subscriptionAccess(active(),'price_wrong'),false);
 assert.equal(subscriptionAccess(active(),'price_test',time()+7200),false);
});
test('real SQLite account lock excludes concurrent operations and recovers expired leases',async()=>{
 const db=database();let release;const gate=new Promise(r=>release=r);
 const first=withAccountLock(db,'student',()=>gate);
 await new Promise(r=>setImmediate(r));
 await assert.rejects(withAccountLock(db,'student',()=>{}),/billing_busy/);release();await first;
 await withAccountLock(db,'student',()=>{});
});
test('checkout authentication, allowlist and origin cannot be bypassed',async t=>{
 const f=await fixture(t);
 assert.equal((await f.call('checkout','POST',null)).status,401);
 assert.equal((await f.call('checkout','POST',await f.token('other'))).status,403);
 assert.equal((await f.call('checkout','POST',undefined,'https://evil.example')).status,403);
 assert.equal((await f.call('checkout','GET')).status,405);
 assert.equal(f.state.calls.length,0);
});
test('double checkout reuses customer and open session; redirect alone never grants Pro',async t=>{
 const f=await fixture(t);
 for(let i=0;i<2;i++)assert.equal((await f.call('checkout')).status,200);
 assert.equal(f.state.calls.filter(([u])=>u.endsWith('/customers')).length,1);
 assert.equal(f.state.sessions.size,1);
 assert.equal(f.db.sqlite.prepare('SELECT entitled FROM billing_accounts').get().entitled,0);
 assert.equal((await f.call('status','GET')).status,200);
 assert.equal(f.db.sqlite.prepare('SELECT entitled FROM billing_accounts').get().entitled,0);
});
test('stored Checkout can be reused only for the exact ¥1480 subscription and signed-in owner',async t=>{
 const f=await fixture(t);
 assert.equal((await f.call('checkout')).status,200);
 assert.equal((await f.call('checkout')).status,200);
 assert.equal(f.state.sessions.size,1);
 assert.equal(f.state.calls.filter(([url,opt])=>String(url).endsWith('/checkout/sessions')&&opt.method==='POST').length,1);
 assert.ok(f.state.calls.some(([url,opt])=>String(url).endsWith('/line_items?limit=10')&&opt.method==='GET'));
});
test('stored old or altered Checkout fails closed without opening a second payment session',async t=>{
 const cases=[
  ['legacy_680',s=>{s.line_items.data[0].price.id='price_legacy680';}],
  ['discount_or_wrong_total',s=>{s.amount_total=680;}],
  ['incorrect_currency',s=>{s.currency='usd';}],
  ['different_firebase_uid',s=>{s.client_reference_id='other';}],
  ['unexpected_return_url',s=>{s.success_url='https://evil.example/after';}],
  ['payment_not_subscription',s=>{s.mode='payment';}],
  ['wrong_checkout_host',s=>{s.url='https://evil.example/pay';}],
  ['expired_checkout',s=>{s.expires_at=time()-1;}],
  ['extra_line_items',s=>{s.line_items.data.push({...s.line_items.data[0]});}],
  ['different_quantity',s=>{s.line_items.data[0].quantity=2;}],
  ['missing_complete_line_items',s=>{s.line_items.has_more=true;}],
 ];
 for(const [name,mutate] of cases){
  await t.test(name,async sub=>{
   const f=await fixture(sub);
   assert.equal((await f.call('checkout')).status,200);
   mutate([...f.state.sessions.values()][0]);
   const response=await f.call('checkout');
   assert.equal(response.status,503);
   assert.equal((await response.json()).error,'billing_checkout_review');
   assert.equal(f.state.sessions.size,1);
   assert.equal(f.state.calls.filter(([url,opt])=>String(url).endsWith('/checkout/sessions')&&opt.method==='POST').length,1);
  });
 }
});
test('sandbox webhook purchase, failure, recovery, scheduled cancel and contract end',async t=>{
 const f=await fixture(t);await f.call('checkout');f.state.subscriptions=[active()];
 const tier=()=>f.db.sqlite.prepare('SELECT entitled FROM billing_accounts').get().entitled===1?'pro':'free';
 assert.equal((await f.event()).status,200);assert.equal(tier(),'pro');
 f.state.subscriptions[0].status='past_due';await f.event('invoice.payment_failed');assert.equal(tier(),'free');
 f.state.subscriptions[0]=active();await f.event();assert.equal(tier(),'pro');
 f.state.subscriptions[0].cancel_at_period_end=true;await f.event('customer.subscription.updated');assert.equal(tier(),'pro');
 const status=await (await f.call('status','GET')).json();assert.equal(status.cancelAtPeriodEnd,true);
 f.state.subscriptions[0].status='canceled';await f.event('customer.subscription.deleted');assert.equal(tier(),'free');
});
test('duplicates are recorded atomically and old event payload cannot restore canceled subscription',async t=>{
 const f=await fixture(t);await f.call('checkout');f.state.subscriptions=[active()];
 await f.event('invoice.paid','evt_same');const count=f.state.calls.length;await f.event('invoice.paid','evt_same');assert.equal(f.state.calls.length,count);
 f.state.subscriptions[0].status='canceled';await f.event('customer.subscription.updated','evt_old',active());
 assert.equal(f.db.sqlite.prepare('SELECT entitled FROM billing_accounts').get().entitled,0);
 assert.equal((await f.event('invoice.paid','evt_live',{customer:'cus_test'},true)).status,400);
});
test('existing or duplicate subscriptions block checkout; invalid pricing is rejected',async t=>{
 const f=await fixture(t);await f.call('checkout');f.state.subscriptions=[active()];
 assert.equal((await f.call('checkout')).status,409);
 f.state.subscriptions.push({...active(),id:'sub_other'});await f.event();
 assert.equal(f.db.sqlite.prepare('SELECT entitled FROM billing_accounts').get().entitled,0);
 f.state.price.unit_amount=500;assert.equal((await f.call('checkout')).status,503);
});
test('ambiguous checkout retries keep idempotency key, old unresolved operations fail closed',async t=>{
 const f=await fixture(t);f.state.failCreate=true;assert.equal((await f.call('checkout')).status,503);
 const key=f.db.sqlite.prepare('SELECT checkout_key FROM billing_accounts').get().checkout_key;
 f.state.failCreate=false;assert.equal((await f.call('checkout')).status,200);
 assert.equal(f.db.sqlite.prepare('SELECT checkout_key FROM billing_accounts').get().checkout_key,key);
 f.db.sqlite.prepare('UPDATE billing_accounts SET checkout_id=NULL,checkout_started=?,checkout_expires=?').run(time()-24*3600,time()-1);
 assert.equal((await (await f.call('checkout')).json()).error,'billing_manual_review');
});
test('portal customer is selected from authenticated account mapping only',async t=>{
 const f=await fixture(t);assert.equal((await f.call('portal')).status,409);await f.call('checkout');
 assert.equal((await f.call('portal')).status,200);
 const last=f.state.calls.at(-1);assert.equal(last[1].body.get('customer'),'cus_test');
});
test('test entitlements expire and disappear when sandbox or tester authorization is removed',async t=>{
 const f=await fixture(t);await f.call('checkout');f.state.subscriptions=[active()];await f.event();
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
 assert.equal(await getPlan(f.db,'student',{...f.env,BILLING_MODE:'disabled'}),'free');
 assert.equal(await getPlan(f.db,'student',{...f.env,BILLING_TEST_UIDS:'someone_else'}),'free');
 f.db.sqlite.prepare('UPDATE billing_accounts SET period_end=?').run(time()-1);
 assert.equal(await getPlan(f.db,'student',f.env),'free');
});
test('Stripe failure cannot acknowledge or record webhook; retry succeeds',async t=>{
 const f=await fixture(t);await f.call('checkout');f.state.subscriptions=[active()];
 const original=globalThis.fetch;
 globalThis.fetch=async(url,opt)=>String(url).includes('/subscriptions?')?new Response('{}',{status:500}):original(url,opt);
 assert.equal((await f.event('invoice.paid','evt_retry')).status,503);
 assert.equal(f.db.sqlite.prepare('SELECT id FROM billing_events WHERE id=?').get('evt_retry'),undefined);
 globalThis.fetch=original;assert.equal((await f.event('invoice.paid','evt_retry')).status,200);
});
test('simultaneous checkout calls create at most one open session',async t=>{
 const f=await fixture(t);const results=await Promise.all([f.call('checkout'),f.call('checkout')]);
 assert.ok(results.some(r=>r.status===200));assert.ok(results.every(r=>[200,409].includes(r.status)));assert.equal(f.state.sessions.size,1);
});

test('expired ambiguous Checkout is stopped before another Stripe create attempt',async t=>{
 const f=await fixture(t);f.state.failCreate=true;
 assert.equal((await f.call('checkout')).status,503);
 f.state.failCreate=false;
 f.db.sqlite.prepare('UPDATE billing_accounts SET checkout_expires=?').run(time()-1);
 const before=f.state.calls.filter(([u])=>u.endsWith('/checkout/sessions')).length;
 const response=await f.call('checkout');
 assert.equal(response.status,503);
 assert.equal((await response.json()).error,'billing_manual_review');
 assert.equal(f.state.calls.filter(([u])=>u.endsWith('/checkout/sessions')).length,before);
});

test('Stripe invoice string is fetched and authenticated before granting Pro',async t=>{
 const f=await fixture(t);await f.call('checkout');
 f.state.subscriptions=[{...active(),latest_invoice:'in_test'}];
 assert.equal((await f.event('invoice.paid','evt_expanded')).status,200);
 assert.equal((await getPlan(f.db,'student',f.env)),'pro');
 const status=await (await f.call('status','GET')).json();
 assert.equal(status.pro,true);
 assert.equal(status.entitlementReason,'ok');
 assert.ok(f.state.calls.some(([url])=>url.endsWith('/invoices/in_test')));
});
test('a string invoice for a different customer never grants entitlement',async t=>{
 const f=await fixture(t);await f.call('checkout');
 f.state.subscriptions=[{...active(),latest_invoice:'in_test'}];
 f.state.invoice.customer='cus_unrelated';
 assert.equal((await f.event('invoice.paid','evt_wrong_customer')).status,503);
 assert.equal((await getPlan(f.db,'student',f.env)),'free');
 assert.equal(f.db.sqlite.prepare('SELECT id FROM billing_events WHERE id=?').get('evt_wrong_customer'),undefined);
});
test('active but unpaid invoice has a safe reason and remains Free',async t=>{
 const f=await fixture(t);await f.call('checkout');
 f.state.subscriptions=[{...active(),latest_invoice:{status:'open',paid:false}}];
 const response=await f.call('status','GET');
 const body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.status,'active');
 assert.equal(body.pro,false);
 assert.equal(body.entitlementReason,'invoice_unpaid');
 assert.equal(subscriptionAccessReason(f.state.subscriptions[0],'price_test'),'invoice_unpaid');
});


// These tests use mocked Stripe with a new, in-memory Firebase user and D1.
// They never mutate the already-canceled-at-period-end live sandbox test account.
test('failed renewal revokes Pro and old paid events cannot restore it; successful retry restores Pro',async t=>{
 const f=await fixture(t);
 assert.equal((await f.call('checkout')).status,200);
 f.state.subscriptions=[{...active(),latest_invoice:{id:'in_test',status:'paid'}}];
 assert.equal((await f.event('invoice.paid','evt_initial_success')).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
 assert.equal((await (await f.call('status','GET')).json()).pro,true);
 const created=f.state.sessions.size;

 // Stripe's latest unpaid invoice and past_due status are authoritative, not
 // an older, valid paid invoice or checkout success_url.
 f.state.subscriptions=[{...active(),status:'past_due',latest_invoice:{id:'in_renewal',status:'open'}}];
 assert.equal((await f.event('invoice.payment_failed','evt_renewal_failed')).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'free');
 const failed=await (await f.call('status','GET')).json();
 assert.equal(failed.status,'past_due');
 assert.equal(failed.pro,false);
 assert.equal(failed.entitlementReason,'subscription_not_active');
 assert.equal((await f.call('checkout')).status,409);
 assert.equal(f.state.sessions.size,created);

 // Resending the same failure is idempotent, and a late PAID event must not
 // override the CURRENT failed subscription.
 assert.equal((await f.event('invoice.payment_failed','evt_renewal_failed')).status,200);
 assert.equal((await f.event('invoice.paid','evt_initial_paid_delayed',{customer:'cus_test'})).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'free');

 // A paid renewal, fetched from Stripe and verified, is the only path back.
 f.state.subscriptions=[{...active(),latest_invoice:{id:'in_renewal',status:'paid'}}];
 assert.equal((await f.event('invoice.paid','evt_renewal_recovered')).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
 assert.equal((await (await f.call('status','GET')).json()).entitlementReason,'ok');
});
test('active status with an unpaid latest renewal invoice still revokes Pro',async t=>{
 const f=await fixture(t);
 assert.equal((await f.call('checkout')).status,200);
 f.state.subscriptions=[{...active(),latest_invoice:{id:'in_initial',status:'paid'}}];
 assert.equal((await f.event('invoice.paid','evt_first_paid')).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
 f.state.subscriptions=[{...active(),latest_invoice:{id:'in_new',status:'open'}}];
 assert.equal((await f.event('invoice.payment_failed','evt_unpaid_while_active')).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'free');
 const status=await (await f.call('status','GET')).json();
 assert.equal(status.status,'active');
 assert.equal(status.pro,false);
 assert.equal(status.entitlementReason,'invoice_unpaid');
});
test('scheduled cancellation preserves paid access then expiration revokes it without relying on webhook',async t=>{
 const f=await fixture(t);
 assert.equal((await f.call('checkout')).status,200);
 f.state.subscriptions=[{...active(),latest_invoice:{id:'in_test',status:'paid'},cancel_at_period_end:true}];
 assert.equal((await f.event('customer.subscription.updated','evt_cancel_scheduled')).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
 const before=await (await f.call('status','GET')).json();
 assert.equal(before.cancelAtPeriodEnd,true);
 assert.equal(before.pro,true);

 // A term that has elapsed cannot grant Pro, even if a delayed webhook says
 // active and the older invoice remains paid.
 f.state.subscriptions[0].items.data[0].current_period_end=time()-5;
 const expired=await (await f.call('status','GET')).json();
 assert.equal(expired.pro,false);
 assert.equal(expired.entitlementReason,'period_invalid');
 assert.equal(await getPlan(f.db,'student',f.env),'free');
 f.state.subscriptions[0].status='canceled';
 assert.equal((await f.event('customer.subscription.deleted','evt_cancel_final')).status,200);
 assert.equal((await f.event('invoice.paid','evt_stale_payment')).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'free');
});
test('stale cached test Pro expires closed and can be refreshed without a second Checkout',async t=>{
 const f=await fixture(t);
 assert.equal((await f.call('checkout')).status,200);
 f.state.subscriptions=[{...active(),latest_invoice:{id:'in_test',status:'paid'}}];
 assert.equal((await f.event('invoice.paid','evt_initial_pro')).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
 f.db.sqlite.prepare('UPDATE billing_accounts SET synced_at=?').run(time()-121);
 assert.equal(await getPlan(f.db,'student',f.env),'free');
 const status=await (await f.call('status','GET')).json();
 assert.equal(status.pro,true);
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
 assert.equal(f.state.sessions.size,1);
});

test('opt-in brief Stripe outage grace keeps only a previously paid unexpired Pro account working',async t=>{
 const f=await fixture(t);
 await f.call('checkout');
 f.state.subscriptions=[active()];
 assert.equal((await (await f.call('status','GET')).json()).pro,true);
 f.db.sqlite.prepare("UPDATE billing_accounts SET synced_at=? WHERE uid='student'").run(time()-130);
 f.state.stripeUnavailable=true;
 const id=await f.token();
 const entitlement=()=>worker.fetch(new Request('https://worker.example/entitlement',{headers:{Origin:origin,Authorization:'Bearer '+id}}),f.env);
 // No implicit grace: existing fail-closed behavior remains unchanged.
 assert.equal((await entitlement()).status,503);
 f.env.BILLING_GRACE_SECONDS='300';
 const usable=await entitlement();
 assert.equal(usable.status,200);
 assert.equal((await usable.json()).plan,'pro');
 // The grace never revives a revoked grant or a paid period past its real expiry.
 f.db.sqlite.prepare("UPDATE billing_accounts SET entitled=0 WHERE uid='student'").run();
 assert.equal((await entitlement()).status,503);
 f.db.sqlite.prepare("UPDATE billing_accounts SET entitled=1,period_end=? WHERE uid='student'").run(time()-1);
 assert.equal((await entitlement()).status,503);
 f.db.sqlite.prepare("UPDATE billing_accounts SET period_end=?,synced_at=? WHERE uid='student'").run(time()+3600,time()-900);
 assert.equal((await entitlement()).status,503);
});

test('live billing is disabled until approved and refuses to touch sandbox rows',async t=>{
 const f=await fixture(t);
 Object.assign(f.env,{
  BILLING_MODE:'live',LIVE_BILLING_ENABLED:'disabled',TURN_LEDGER_MODE:'enabled',
  LIVE_LEGAL_READY:'verified',LIVE_STRIPE_SANDBOX_E2E_PASSED:'verified',
  LIVE_UNIT_ECONOMICS_REVIEWED:'verified',
  STRIPE_LIVE_SECRET_KEY:'sk_live_fixture',STRIPE_LIVE_WEBHOOK_SECRET:'whsec_live_fixture',
  STRIPE_LIVE_PRICE_ID:'price_test',BILLING_LIVE_AUDIENCE:'invited',BILLING_LIVE_UIDS:'student',
 });
 assert.equal(billingConfigured(f.env),false);
 assert.equal((await f.call('checkout')).status,503);
 assert.equal(f.state.calls.length,0);
 f.env.LIVE_BILLING_ENABLED='enabled';
 const missing=await f.call('checkout');
 assert.equal(missing.status,503);
 assert.equal((await missing.json()).error,'billing_schema_not_ready');
 assert.equal(f.state.calls.length,0);
});

test('separately configured live mode isolates customer records and grants only a paid invoice',async t=>{
 const f=await fixture(t);
 f.db.sqlite.exec(readFileSync(new URL('./migrations/0006-live-billing-isolation.sql',import.meta.url),'utf8'));
 Object.assign(f.env,{
  BILLING_MODE:'live',LIVE_BILLING_ENABLED:'enabled',TURN_LEDGER_MODE:'enabled',
  LIVE_LEGAL_READY:'verified',LIVE_STRIPE_SANDBOX_E2E_PASSED:'verified',
  LIVE_UNIT_ECONOMICS_REVIEWED:'verified',
  STRIPE_LIVE_SECRET_KEY:'sk_live_fixture',STRIPE_LIVE_WEBHOOK_SECRET:'whsec_live_fixture',
  STRIPE_LIVE_PRICE_ID:'price_test',BILLING_LIVE_AUDIENCE:'invited',BILLING_LIVE_UIDS:'student',
 });
 f.state.live=true;
 f.state.price.livemode=true;
 const first=await f.call('checkout');
 assert.equal(first.status,200,JSON.stringify(await first.clone().json()));
 assert.match((await first.json()).url,/checkout\.stripe\.com/);
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) as n FROM billing_accounts').get().n,0);
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) as n FROM billing_live_accounts').get().n,1);
 assert.equal((await f.call('status','GET')).status,200);
 assert.equal((await (await f.call('status','GET')).json()).mode,'live');
 assert.equal(await getPlan(f.db,'student',f.env),'free');
 const activeLive={...active(),livemode:true,latest_invoice:{id:'in_test',livemode:true,customer:'cus_test',status:'paid'}};
 f.state.subscriptions=[activeLive];
 const paid=await f.event('invoice.paid','evt_live_paid',{customer:'cus_test'},true);
 assert.equal(paid.status,200,JSON.stringify(await paid.clone().json()));
 assert.equal(await getPlan(f.db,'student',f.env),'pro');
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) as n FROM billing_events').get().n,0);
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) as n FROM billing_live_events').get().n,1);
 // An unpaid renewal removes the grant, even if an older invoice was paid.
 f.state.subscriptions=[{...activeLive,latest_invoice:{id:'in_renew',status:'open'}}];
 assert.equal((await f.event('invoice.payment_failed','evt_live_failed',{customer:'cus_test'},true)).status,200);
 assert.equal(await getPlan(f.db,'student',f.env),'free');
 // Turning the LIVE switch off does not create a fallback Pro grant.
 f.env.LIVE_BILLING_ENABLED='disabled';
 assert.equal(await getPlan(f.db,'student',f.env),'free');
});

test('live billing rejects sandbox-mode Stripe objects before any paid entitlement',async t=>{
 const f=await fixture(t);
 f.db.sqlite.exec(readFileSync(new URL('./migrations/0006-live-billing-isolation.sql',import.meta.url),'utf8'));
 Object.assign(f.env,{
  BILLING_MODE:'live',LIVE_BILLING_ENABLED:'enabled',TURN_LEDGER_MODE:'enabled',
  LIVE_LEGAL_READY:'verified',LIVE_STRIPE_SANDBOX_E2E_PASSED:'verified',
  LIVE_UNIT_ECONOMICS_REVIEWED:'verified',
  STRIPE_LIVE_SECRET_KEY:'sk_live_fixture',STRIPE_LIVE_WEBHOOK_SECRET:'whsec_live_fixture',
  STRIPE_LIVE_PRICE_ID:'price_test',BILLING_LIVE_AUDIENCE:'invited',BILLING_LIVE_UIDS:'student',
 });
 // Stripe mocks stay sandbox-only. A correct live key cannot accept test price objects.
 const result=await f.call('checkout');
 assert.equal(result.status,503);
 assert.equal((await result.json()).error,'billing_price_invalid');
 assert.equal(await getPlan(f.db,'student',f.env),'free');
});
