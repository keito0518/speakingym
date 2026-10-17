import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './ai-worker.js';
import {getPlan} from './plan-limits.js';
import {billingConfigured,verifyStripeSignature,subscriptionAccess,withAccountLock} from './billing.js';
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
async function signature(raw,ts=time()){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('whsec_fixture'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
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
 const state={subscriptions:[],sessions:new Map(),calls:[],price:{id:'price_test',active:true,livemode:false,currency:'jpy',unit_amount:680,tax_behavior:'inclusive',recurring:{interval:'month',interval_count:1}},failCreate:false};
 t.mock.method(globalThis,'fetch',async(url,opt={})=>{
  if(String(url).includes('googleapis.com'))return Response.json({keys:[jwk]});
  state.calls.push([url,opt]);const path=new URL(url).pathname.replace('/v1/','');let result;
  if(path==='prices/price_test')result=state.price;
  else if(path==='customers')result={id:'cus_test',livemode:false};
  else if(path==='subscriptions')result={data:state.subscriptions,has_more:false};
  else if(path.startsWith('subscriptions/'))result=state.subscriptions.find(s=>s.id===path.split('/')[1]);
  else if(path==='checkout/sessions'){
   if(state.failCreate)throw Error('lost connection');
   const key=opt.headers['Idempotency-Key'];
   if(!state.sessions.has(key))state.sessions.set(key,{id:'cs_test_'+state.sessions.size,livemode:false,customer:'cus_test',status:'open',url:'https://checkout.stripe.com/c/pay/test'});
   result=state.sessions.get(key);
  }else if(path.startsWith('checkout/sessions/'))result=[...state.sessions.values()].find(s=>s.id===path.split('/')[2]);
  else if(path==='billing_portal/sessions')result={url:'https://billing.stripe.com/p/session/test'};
  else throw Error('unexpected Stripe endpoint '+path);
  return Response.json(result);
 });
 const auth=await token();
 async function call(path,method='POST',bearer=auth,requestOrigin=origin){return worker.fetch(new Request('https://worker.example/billing/'+path,{method,headers:{Origin:requestOrigin,...(bearer?{Authorization:'Bearer '+bearer}:{})}}),env)}
 async function event(type='invoice.paid',id=crypto.randomUUID(),object={customer:'cus_test'},livemode=false){
  const raw=JSON.stringify({id,type,livemode,created:1,data:{object}});
  return worker.fetch(new Request('https://worker.example/billing/webhook',{method:'POST',headers:{'stripe-signature':await signature(raw)},body:raw}),env);
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
