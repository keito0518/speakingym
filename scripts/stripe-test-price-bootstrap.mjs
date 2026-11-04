/**
 * Stripe TEST-only catalogue preflight, READ-ONLY and non-mutating.
 * Owner already has distinct ¥680 and ¥1480 products. Never create duplicates.
 * A previously published --apply command is now deliberately rejected.
 * Stripe secret key is supplied via local environment, never source or GitHub.
 * No product/price/webhook/Customer/subscription/card/Charge/Portal writes.
 */
import {pathToFileURL} from 'node:url';

const API='https://api.stripe.com/v1/';
const VERSION='2025-06-30.basil';
// The owner's existing Stripe Sandbox catalogue has TWO distinct products:
// the legacy ¥680 "Speakingym Pro" and the new ¥1,480 sandbox-only product.
// Never silently attach the new Price to the legacy product.
export const PLAN={name:'Speakingym Pro 1480（サンドボックス検証用）',yen:1480,currency:'jpy'};
export function assertTestKey(key){
 if(typeof key!=='string'||!/^sk_test_[A-Za-z0-9_]+$/.test(key))
  throw Error('STOP: Stripe TEST-only secret key required');
 return key;
}
export function validatePrice(price,productId){
 return price?.object==='price'&&price.livemode===false&&price.active===true&&
   price.product===productId&&price.currency==='jpy'&&price.unit_amount===1480&&
   price.tax_behavior==='inclusive'&&price.billing_scheme==='per_unit'&&
   price.type==='recurring'&&price.recurring?.interval==='month'&&
   price.recurring?.interval_count===1&&price.recurring?.usage_type==='licensed'&&
   price.recurring?.trial_period_days==null;
}
export function chooseExistingProduct(products){
 if(!Array.isArray(products?.data)||products.has_more!==false)
  throw Error('STOP: product list incomplete, refusing changes');
 const matches=products.data.filter(p=>p.name===PLAN.name&&p.active===true&&p.livemode===false);
 if(matches.length>1)throw Error('STOP: multiple exact test products; manual review needed');
 return matches[0]||null;
}
export function chooseExistingPrice(prices,productId){
 if(!Array.isArray(prices?.data)||prices.has_more!==false)
  throw Error('STOP: price list incomplete, refusing changes');
 if(prices.data.some(p=>p.livemode!==false||p.product!==productId))
  throw Error('STOP: unexpected price data from Stripe');
 const matches=prices.data.filter(p=>validatePrice(p,productId));
 if(matches.length>1)throw Error('STOP: multiple matching monthly test prices; manual review needed');
 return matches[0]||null;
}
function safeList(result){
 if(!Array.isArray(result?.data)||result.has_more!==false)
  throw Error('STOP: incomplete test account list');
 return result;
}
export async function prepareStripeTestPrice({key,apply=false,request=fetch}={}){
 assertTestKey(key);
 if(apply!==false)throw Error('STOP: read-only; existing Stripe TEST products must not be recreated');
 async function api(path){
  const endpoint=API+path;
  const headers={Authorization:'Bearer '+key,'Stripe-Version':VERSION,Accept:'application/json'};
  const payload={method:'GET',headers,signal:AbortSignal.timeout(20000)};
  let response;
  try{response=await request(endpoint,payload)}catch{throw Error('STOP: Stripe test API unavailable')}
  if(response.status!==200)throw Error('STOP: Stripe test API HTTP '+Number(response.status));
  try{return await response.json()}catch{throw Error('STOP: unexpected Stripe JSON')}
 }
 const products=safeList(await api('products?limit=100'));
 if(products.data.some(p=>p.livemode!==false))throw Error('STOP: non-test Product detected');
 // This app historically had a different ¥680 "Speakingym Pro" product.
 // The new sandbox-only product must be found by its explicit distinct name.
 // A missing listing should not trigger creation of another 1480 product
 // unless the operator explicitly inspected the existing catalogue first.
 const legacy=products.data.filter(p=>p.name==='Speakingym Pro'&&p.active===true);
 if(legacy.length>1)throw Error('STOP: ambiguous legacy test products');
 let product=chooseExistingProduct(products);
 if(!product){
  return {mode:'test',changed:false,product:'manual-review-needed',price:'not-checked'};
 }
 if(!/^prod_[a-zA-Z0-9]+$/.test(product.id))throw Error('STOP: invalid test Product identifier');
 const prices=safeList(await api('prices?product='+encodeURIComponent(product.id)+'&limit=100'));
 let price=chooseExistingPrice(prices,product.id);
 if(!price){
  return {mode:'test',changed:false,product:'verified',price:'manual-review-needed'};
 }
 return {mode:'test',changed:false,
  product:'verified',price:'existing',priceId:price.id};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length!==0){console.error('STOP: catalogue inspection is READ-ONLY; no --apply mode');process.exit(1)}
 const apply=false;
 try{
  const output=await prepareStripeTestPrice({key:process.env.SPEAKINGYM_STRIPE_TEST_KEY,apply});
  const {priceId,...status}=output;
  console.log('Stripe TEST price setup: '+JSON.stringify(status));
  if(priceId)console.log('The TEST price ID is available locally. Store it as a staging Worker secret, never in GitHub/chat.');
  console.log('Read-only run: no Stripe changes were made.');
 }catch(e){console.error(String(e?.message||'STOP: test-price setup failed'));process.exitCode=1}
}
