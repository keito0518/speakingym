/**
 * Stripe TEST product/price bootstrap; never accesses Stripe LIVE.
 * Default READ-ONLY; --apply creates only a TEST product or 1480 JPY/month Price.
 * Stripe secret key is supplied via local environment, never source or GitHub.
 * No webhook, Customer, subscription, card, invoice, Charge, or Portal changes.
 */
import {pathToFileURL} from 'node:url';

const API='https://api.stripe.com/v1/';
const VERSION='2025-06-30.basil';
export const PLAN={name:'Speakingym Pro',yen:1480,currency:'jpy'};
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
 if(typeof apply!=='boolean')throw Error('Invalid mode');
 async function api(path,method='GET',params={}){
  if(!['GET','POST'].includes(method))throw Error('STOP: unsupported Stripe method');
  const endpoint=API+path;
  const headers={Authorization:'Bearer '+key,'Stripe-Version':VERSION,Accept:'application/json'};
  const payload={method,headers,signal:AbortSignal.timeout(20000)};
  if(method==='POST'){
   headers['Content-Type']='application/x-www-form-urlencoded';
   payload.body=new URLSearchParams(params);
  }
  let response;
  try{response=await request(endpoint,payload)}catch{throw Error('STOP: Stripe test API unavailable')}
  if(response.status!==200)throw Error('STOP: Stripe test API HTTP '+Number(response.status));
  try{return await response.json()}catch{throw Error('STOP: unexpected Stripe JSON')}
 }
 const products=safeList(await api('products?limit=100'));
 if(products.data.some(p=>p.livemode!==false))throw Error('STOP: non-test Product detected');
 let product=chooseExistingProduct(products);
 if(!product){
  if(!apply)return {mode:'test',changed:false,product:'create-needed',price:'pending-product'};
  product=await api('products','POST',{name:PLAN.name,description:'Speakingym Pro learning plan (test mode setup)'});
  if(product?.object!=='product'||product.livemode!==false||product.name!==PLAN.name||
    product.active!==true||!/^prod_[a-zA-Z0-9]+$/.test(product.id))
   throw Error('STOP: Stripe test product creation not verified');
 }
 if(!/^prod_[a-zA-Z0-9]+$/.test(product.id))throw Error('STOP: invalid test Product identifier');
 const prices=safeList(await api('prices?product='+encodeURIComponent(product.id)+'&limit=100'));
 let price=chooseExistingPrice(prices,product.id);
 if(!price){
  if(!apply)return {mode:'test',changed:false,product:'existing',price:'create-needed'};
  price=await api('prices','POST',{product:product.id,currency:'jpy',unit_amount:'1480',
   tax_behavior:'inclusive','recurring[interval]':'month',
   'recurring[interval_count]':'1','recurring[usage_type]':'licensed',
   nickname:'Speakingym Pro 1480 JPY / month [TEST ONLY]'});
  if(!validatePrice(price,product.id))
   throw Error('STOP: newly created TEST Price verification failed');
  return {mode:'test',changed:true,product:'verified',price:'created',priceId:price.id};
 }
 return {mode:'test',changed:!!apply&&products.data.every(p=>p.id!==product.id),
  product:'verified',price:'existing',priceId:price.id};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.some(a=>a!=='--apply')){console.error('STOP: unsupported option');process.exit(1)}
 const apply=args.includes('--apply');
 try{
  const output=await prepareStripeTestPrice({key:process.env.SPEAKINGYM_STRIPE_TEST_KEY,apply});
  const {priceId,...status}=output;
  console.log('Stripe TEST price setup: '+JSON.stringify(status));
  if(priceId)console.log('The TEST price ID is available locally. Store it as a staging Worker secret, never in GitHub/chat.');
  if(!apply)console.log('Read-only run: no Stripe changes were made.');
 }catch(e){console.error(String(e?.message||'STOP: test-price setup failed'));process.exitCode=1}
}
