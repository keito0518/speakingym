/** Stripe bridge. Live mode stays OFF until a separate explicit owner activation. No secret/body logs. */
import {verifyFirebaseIdToken,billingGraceSeconds,verifiedBillingEntitlement} from './plan-limits.js';
const SITE='https://speakingym.pages.dev';
const API_VERSION='2025-06-30.basil';
const now=()=>Math.floor(Date.now()/1000);
const fail=(code,status=503)=>Object.assign(new Error(code),{status});
const stmt=(db,sql,...args)=>db.prepare(sql).bind(...args);
// Live uses distinct credentials and tables. Nothing defaults to live, even if
// a Stripe live key is accidentally present in Cloudflare secrets.
export function billingMode(env={}) {
 if(env.ENFORCE_PLANS!=='true'||!env.PLAN_DB)return 'disabled';
 if(env.BILLING_MODE==='test' &&
   /^sk_test_/.test(env.STRIPE_SECRET_KEY||'') &&
   /^whsec_/.test(env.STRIPE_WEBHOOK_SECRET||'') &&
   /^price_/.test(env.STRIPE_PRICE_ID||'') && !!env.BILLING_TEST_UIDS?.trim())return 'test';
 if(env.BILLING_MODE==='live' && env.LIVE_BILLING_ENABLED==='enabled' &&
   env.TURN_LEDGER_MODE==='enabled' &&
   /^sk_live_/.test(env.STRIPE_LIVE_SECRET_KEY||'') &&
   /^whsec_/.test(env.STRIPE_LIVE_WEBHOOK_SECRET||'') &&
   /^price_/.test(env.STRIPE_LIVE_PRICE_ID||'') &&
   (env.BILLING_LIVE_AUDIENCE==='public' ||
     (env.BILLING_LIVE_AUDIENCE==='invited' && !!env.BILLING_LIVE_UIDS?.trim())))return 'live';
 return 'disabled';
}
export const billingConfigured=env=>billingMode(env)!=='disabled';
export const isTester=(env,uid)=>{
 if(billingMode(env)==='live')
  return env.BILLING_LIVE_AUDIENCE==='public' ||
   String(env.BILLING_LIVE_UIDS||'').split(',').map(x=>x.trim()).includes(uid);
 return String(env.BILLING_TEST_UIDS||'').split(',').map(x=>x.trim()).includes(uid);
};
const liveMode=env=>billingMode(env)==='live';
const expectedLive=env=>liveMode(env);
const priceId=env=>liveMode(env)?env.STRIPE_LIVE_PRICE_ID:env.STRIPE_PRICE_ID;
const stripeSecret=env=>liveMode(env)?env.STRIPE_LIVE_SECRET_KEY:env.STRIPE_SECRET_KEY;
const webhookSecret=env=>liveMode(env)?env.STRIPE_LIVE_WEBHOOK_SECRET:env.STRIPE_WEBHOOK_SECRET;
// Explicitly translate only the two billing table identifiers, never arbitrary SQL or
// user input. Keep existing sandbox rows entirely separate from real customers.
const billingDb=env=>{
 const db=env.PLAN_DB;
 if(!liveMode(env))return db;
 return {
  prepare(sql){return db.prepare(sql.replace(/\\bbilling_accounts\\b/g,'billing_live_accounts')
   .replace(/\\bbilling_events\\b/g,'billing_live_events'))},
  batch(statements){return db.batch(statements)}
 };
};
async function requireLiveSchema(env){
 if(!liveMode(env))return;
 try{
  for(const name of ['billing_live_accounts','billing_live_events']){
   const exists=await env.PLAN_DB.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=?').bind(name).first();
   if(exists?.name!==name)throw Error('missing_schema');
  }
 }catch{throw fail('billing_schema_not_ready')}
}
async function stripe(env,path,method='GET',params={},key){
 const headers={Authorization:'Bearer '+stripeSecret(env),'Stripe-Version':API_VERSION};
 if(key)headers['Idempotency-Key']=key;
 const options={method,headers,signal:AbortSignal.timeout(12000)};
 if(method==='POST'){headers['Content-Type']='application/x-www-form-urlencoded';options.body=new URLSearchParams(params)}
 const res=await fetch('https://api.stripe.com/v1/'+path,options);
 if(!res.ok)throw fail(res.status===429?'billing_busy':'billing_provider_error');
 return res.json();
}
export async function verifyStripeSignature(raw,header,secret,time=now()){
 const parts=String(header||'').split(',').map(x=>x.trim().split('='));
 const ts=parts.filter(x=>x[0]==='t');
 if(ts.length!==1||!/^\d+$/.test(ts[0][1])||Math.abs(time-Number(ts[0][1]))>300)return false;
 const signatures=parts.filter(x=>x[0]==='v1'&&/^[a-f0-9]{64}$/.test(x[1]));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const [,sig] of signatures){
  const bytes=Uint8Array.from(sig.match(/../g),x=>parseInt(x,16));
  if(await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(ts[0][1]+'.'+raw)))return true;
 }
 return false;
}
export async function withAccountLock(db,uid,fn){
 await stmt(db,'INSERT OR IGNORE INTO billing_accounts (uid,customer_key,customer_started) VALUES (?,?,?)',uid,'sg-customer-'+crypto.randomUUID(),0).run();
 const token=crypto.randomUUID();
 const row=await stmt(db,'UPDATE billing_accounts SET lock_token=?,lock_until=? WHERE uid=? AND lock_until < ? RETURNING *',token,now()+90,uid,now()).first();
 if(!row)throw fail('billing_busy',409);
 try{return await fn(row,token)}
 finally{await stmt(db,'UPDATE billing_accounts SET lock_token=NULL,lock_until=0 WHERE uid=? AND lock_token=?',uid,token).run()}
}
async function ownedUpdate(db,uid,token,sql,...args){
 const row=await stmt(db,`UPDATE billing_accounts SET ${sql} WHERE uid=? AND lock_token=? AND lock_until > ? RETURNING uid`,...args,uid,token,now()).first();
 if(!row)throw fail('billing_busy',409);
}
// Return only non-sensitive rule codes for invited sandbox testers.
export function subscriptionAccessReason(sub,priceId,time=now(),mustBeLive=false){
 const items=sub?.items?.data||[];
 const item=items.length===1?items[0]:null;
 const end=item?.current_period_end??sub?.current_period_end;
 const invoice=sub?.latest_invoice;
 if(sub?.livemode!==mustBeLive)return 'mode_mismatch';
 if(sub.status!=='active')return 'subscription_not_active';
 if(sub.pause_collection)return 'collection_paused';
 if(!item)return 'items_invalid';
 if(item.price?.id!==priceId)return 'price_mismatch';
 if(item.quantity!==1)return 'quantity_invalid';
 if(!Number.isInteger(end)||end<=time)return 'period_invalid';
 if(!invoice||typeof invoice!=='object')return 'invoice_missing';
 // Stripe 2025-03-31.basil removed Invoice.paid. The authoritative invoice
 // payment state is Invoice.status === 'paid'. Preserve fail-closed behavior
 // for an explicit contradictory legacy paid=false value when it is present.
 if(invoice.status!=='paid'||(invoice.paid!==undefined&&invoice.paid!==true))return 'invoice_unpaid';
 return 'ok';
}
export function subscriptionAccess(sub,priceId,time=now(),mustBeLive=false){
 return subscriptionAccessReason(sub,priceId,time,mustBeLive)==='ok';
}
async function reconcile(env,row,token,eventId){
 const db=billingDb(env);
 if(!row.customer_id)return row;
 // Retrieve CURRENT state under a per-account lock; event.created is not an ordering key.
 const list=await stripe(env,'subscriptions?'+new URLSearchParams({customer:row.customer_id,status:'all',limit:'100','expand[]':'data.latest_invoice'}));
 if(list.has_more)throw fail('billing_manual_review');
 if(list.data.some(s=>s.livemode!==expectedLive(env)))throw fail('billing_mode_mismatch');
 const current=list.data.filter(s=>!['canceled','incomplete_expired'].includes(s.status));
 // Stripe allows expandable invoice references to be strings. Verify the exact
 // invoice server-side rather than falsely treating an active paid subscription
 // as Free. Only a single current subscription is eligible, never duplicates.
 if(current.length===1 && typeof current[0].latest_invoice==='string'){
  const id=current[0].latest_invoice;
  if(!/^in_[a-zA-Z0-9]+$/.test(id))throw fail('billing_invoice_invalid');
  const invoice=await stripe(env,'invoices/'+encodeURIComponent(id));
  if(invoice?.id!==id||invoice?.livemode!==expectedLive(env)||invoice?.customer!==row.customer_id)
   throw fail('billing_invoice_mismatch');
  current[0]={...current[0],latest_invoice:invoice};
 }
 const sub=current.find(s=>subscriptionAccess(s,priceId(env),now(),expectedLive(env)))||current[0]||null;
 const entitlementReason=current.length>1?'multiple_subscriptions':current.length===0?'no_subscription':subscriptionAccessReason(sub,priceId(env),now(),expectedLive(env));
 const entitled=entitlementReason==='ok';
 const end=sub?.items?.data?.[0]?.current_period_end??sub?.current_period_end??null;
 const status=current.length>1?'duplicate_review':sub?.status||'canceled';
 const time=now();
 const statements=[
  stmt(db,'UPDATE billing_accounts SET subscription_id=?,status=?,period_end=?,cancel_at_period_end=?,synced_at=?,entitled=? WHERE uid=? AND lock_token=? AND lock_until>?',sub?.id||null,status,end,sub?.cancel_at_period_end?1:0,time,entitled?1:0,row.uid,token,time)
 ];
 if(eventId)statements.push(stmt(db,'INSERT OR IGNORE INTO billing_events (id,processed_at) SELECT ?,? FROM billing_accounts WHERE uid=? AND lock_token=? AND lock_until>?',eventId,time,row.uid,token,time));
 const results=await db.batch(statements);
 if(!results[0].meta.changes)throw fail('billing_busy',409);
 return {...row,subscription_id:sub?.id||null,status,period_end:end,cancel_at_period_end:sub?.cancel_at_period_end?1:0,synced_at:time,entitled,entitlementReason,hasSubscription:current.length>0};
}
export async function refreshBillingIfNeeded(env,uid){
 if(!billingConfigured(env)||!isTester(env,uid))return;
 const row=await stmt(billingDb(env),'SELECT * FROM billing_accounts WHERE uid=?',uid).first();
 if(row?.customer_id&&(row.synced_at<now()-60 || (row.period_end&&row.period_end<=now()))){
  try {
   await withAccountLock(billingDb(env),uid,(r,t)=>reconcile(env,r,t));
  } catch(error) {
   // Only transient provider/rate failures may use a previously paid, unexpired
   // sandbox entitlement. A failed invoice, expiry, missing mapping, D1 problem,
   // ambiguous customer, or old/unknown result must still fail closed.
   if(!['billing_provider_error','billing_busy'].includes(error?.message) ||
      !billingGraceSeconds(env) || !verifiedBillingEntitlement(row,env))throw error;
  }
 }
}
async function checkout(env,row,token){
 const db=billingDb(env);
 const price=await stripe(env,'prices/'+encodeURIComponent(priceId(env)));
 if(price.livemode!==expectedLive(env)||!price.active||price.currency!=='jpy'||price.unit_amount!==680||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1||price.tax_behavior!=='inclusive')throw fail('billing_price_invalid');
 if(!row.customer_id){
  // Stripe only guarantees idempotency retention for 24h. Ambiguous old creates fail closed.
  if(!row.customer_started){await ownedUpdate(db,row.uid,token,'customer_started=?',now());row={...row,customer_started:now()}}
  if(row.customer_started<now()-23*3600)throw fail('billing_manual_review');
  const customer=await stripe(env,'customers','POST',{'metadata[firebase_uid]':row.uid},row.customer_key);
  if(customer.livemode!==expectedLive(env))throw fail('billing_mode_mismatch');
  await ownedUpdate(db,row.uid,token,'customer_id=?',customer.id);
  row={...row,customer_id:customer.id};
 }
 const synced=await reconcile(env,row,token);
 if(synced.hasSubscription)throw fail('subscription_exists',409);
 if(row.checkout_id){
  const session=await stripe(env,'checkout/sessions/'+encodeURIComponent(row.checkout_id));
  if(session.livemode!==expectedLive(env)||session.customer!==row.customer_id)throw fail('billing_mode_mismatch');
  if(session.status==='open')return {url:session.url};
  if(session.status==='complete'){
   // Recheck the exact completed subscription: completion may race the earlier list.
   if(!session.subscription)throw fail("billing_busy",409);
   const previous=await stripe(env,"subscriptions/"+encodeURIComponent(typeof session.subscription==="string"?session.subscription:session.subscription.id));
   if(!["canceled","incomplete_expired"].includes(previous.status))throw fail("subscription_exists",409);
   row={...row,checkout_key:null,checkout_id:null};
  }else if(session.status==='expired'){row={...row,checkout_key:null,checkout_id:null}}
  else throw fail('billing_busy',409);
 }
 if(row.checkout_key&&!row.checkout_id&&row.checkout_expires<=now()){
  // The first Stripe attempt may have created a session. Replaying an expired
  // expires_at with the same idempotency key is unsafe/invalid: review manually.
  throw fail('billing_manual_review');
 }
 if(!row.checkout_key){
  row={...row,checkout_key:'sg-checkout-'+crypto.randomUUID(),checkout_started:now(),checkout_expires:now()+1800};
  await ownedUpdate(db,row.uid,token,'checkout_key=?,checkout_started=?,checkout_expires=?,checkout_id=NULL',row.checkout_key,row.checkout_started,row.checkout_expires);
 }
 const session=await stripe(env,'checkout/sessions','POST',{
  mode:'subscription',customer:row.customer_id,'line_items[0][price]':priceId(env),'line_items[0][quantity]':'1',
  'payment_method_types[0]':'card',success_url:SITE+'/plans.html?billing=success',cancel_url:SITE+'/plans.html?billing=cancel',
  client_reference_id:row.uid,'subscription_data[metadata][firebase_uid]':row.uid,
  expires_at:String(row.checkout_expires),locale:'ja'
 },row.checkout_key);
 if(session.livemode!==expectedLive(env))throw fail('billing_mode_mismatch');
 await ownedUpdate(db,row.uid,token,'checkout_id=?',session.id);
 return {url:session.url};
}
async function webhook(request,env){
 if(request.method!=='POST')throw fail('method_not_allowed',405);
 if(Number(request.headers.get('content-length')||0)>262144)throw fail('payload_too_large',413);
 const raw=await request.text();
 if(new TextEncoder().encode(raw).length>262144)throw fail('payload_too_large',413);
 if(!await verifyStripeSignature(raw,request.headers.get('stripe-signature'),webhookSecret(env)))throw fail('invalid_signature',400);
 let event;try{event=JSON.parse(raw)}catch{throw fail('invalid_event',400)}
 if(event.livemode!==expectedLive(env)||typeof event.id!=='string')throw fail('billing_mode_mismatch',400);
 if(!/^(customer\.subscription\.(created|updated|deleted)|invoice\.(paid|payment_failed|payment_action_required)|checkout\.session\.completed)$/.test(event.type))return {received:true};
 const db=billingDb(env);
 if(await stmt(db,'SELECT id FROM billing_events WHERE id=?',event.id).first())return {received:true};
 const customer=event.data?.object?.customer;
 if(typeof customer!=='string')throw fail('invalid_event',400);
 const row=await stmt(db,'SELECT * FROM billing_accounts WHERE customer_id=?',customer).first();
 if(!row)return {received:true}; // Other products in this Stripe sandbox do not belong to this app.
 await withAccountLock(db,row.uid,(r,t)=>reconcile(env,r,t,event.id));
 return {received:true};
}
export async function handleBilling(request,env,reply,origin){
 try{
  if(!billingConfigured(env))throw fail('billing_disabled');
  await requireLiveSchema(env);
  const path=new URL(request.url).pathname;
  if(path==='/billing/webhook')return reply(await webhook(request,env),200,origin);
  const expected=path==='/billing/status'?'GET':'POST';
  if(request.method!==expected)throw fail('method_not_allowed',405);
  let uid;try{uid=await verifyFirebaseIdToken(request)}catch{throw fail('login_required',401)}
  if(!isTester(env,uid))throw fail('sandbox_invite_required',403);
  const data=await withAccountLock(billingDb(env),uid,async(row,token)=>{
   if(path==='/billing/checkout')return checkout(env,row,token);
   if(path==='/billing/portal'){
    if(!row.customer_id)throw fail('no_subscription',409);
    const session=await stripe(env,'billing_portal/sessions','POST',{customer:row.customer_id,return_url:SITE+'/plans.html'});
    return {url:session.url};
   }
   if(path==='/billing/status'){
    const synced=await reconcile(env,row,token);
    return {mode:billingMode(env),status:synced.status,pro:synced.entitled===true,hasCustomer:!!synced.customer_id,
     periodEnd:synced.period_end,cancelAtPeriodEnd:!!synced.cancel_at_period_end,
     entitlementReason:synced.entitlementReason||'no_subscription'};
   }
   throw fail('not_found',404);
  });
  return reply(data,200,origin);
 }catch(error){return reply({error:error.status?error.message:'billing_unavailable'},error.status||503,origin)}
}
