/**
 * READ-ONLY Stripe TEST readiness check for the future ¥980/month plan.
 *
 * No checkout, entitlement, D1, Product, Price or subscription is created or
 * changed. The old ¥680 and ¥1,480 TEST catalogue and its staging QA remain
 * untouched. A configured NEW ¥980 TEST Price must pass before a separate
 * billing-only staging rollout is even considered.
 */
import {pathToFileURL} from 'node:url';

const API='https://api.stripe.com/v1/';
const API_VERSION='2025-06-30.basil';
const PRODUCT_NAME='Speakingym Pro 980（サンドボックス検証用）';
const STRIPE_ID=/^(?:price|prod)_[a-zA-Z0-9]{8,100}$/;

export const PRO980_TEST_PLAN=Object.freeze({
  name:PRODUCT_NAME,amountJpy:980,currency:'jpy',interval:'month'
});

export function validPro980TestPrice(price,productId){
  const product=price?.product;
  return price?.object==='price'&&price.id?.startsWith('price_')&&
    price.livemode===false&&price.active===true&&
    price.currency==='jpy'&&price.unit_amount===980&&
    price.type==='recurring'&&price.billing_scheme==='per_unit'&&
    price.tax_behavior==='inclusive'&&price.recurring?.interval==='month'&&
    price.recurring?.interval_count===1&&price.recurring?.usage_type==='licensed'&&
    price.recurring?.trial_period_days==null&&
    product?.object==='product'&&product.id===productId&&
    product.livemode===false&&product.active===true&&product.name===PRODUCT_NAME;
}

export async function inspectPro980TestPrice({key,productId,priceId,request=fetch}={}){
  // Fail closed before a network call; never accept a live key or a historical
  // Price as a substitute for the NEW ¥980 sandbox-only object.
  if(typeof key!=='string'||!/^sk_test_[a-zA-Z0-9_]+$/.test(key))
    throw Error('STOP: Stripe TEST secret key required');
  if(typeof productId!=='string'||!STRIPE_ID.test(productId)||!productId.startsWith('prod_')||
     typeof priceId!=='string'||!STRIPE_ID.test(priceId)||!priceId.startsWith('price_'))
    throw Error('STOP: explicit NEW ¥980 TEST Product and Price IDs required');
  const url=API+'prices/'+encodeURIComponent(priceId)+'?expand%5B%5D=product';
  let response;
  try{
    response=await request(url,{method:'GET',headers:{
      Authorization:'Bearer '+key,'Stripe-Version':API_VERSION,Accept:'application/json'
    },signal:AbortSignal.timeout(20000)});
  }catch{throw Error('STOP: Stripe TEST API unavailable')}
  if(response?.status!==200)throw Error('STOP: Stripe TEST Price lookup failed');
  let price;
  try{price=await response.json()}catch{throw Error('STOP: unexpected Stripe TEST response')}
  if(price?.id!==priceId||!validPro980TestPrice(price,productId))
    throw Error('STOP: configured ¥980 TEST Price is invalid or belongs to a different Product');
  // No keys, object IDs, customer data, amounts from unknown sources or raw
  // Stripe responses are printed or persisted by this tool.
  return Object.freeze({mode:'test',readOnly:true,ready:true,amountJpy:980,
    currency:'jpy',taxBehavior:'inclusive',interval:'month'});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.length!==2){console.error('STOP: read-only check takes no CLI flags');process.exit(1)}
  try{
    const result=await inspectPro980TestPrice({
      key:process.env.SPEAKINGYM_STRIPE_TEST_KEY,
      productId:process.env.SPEAKINGYM_PRO980_TEST_PRODUCT_ID,
      priceId:process.env.SPEAKINGYM_PRO980_TEST_PRICE_ID
    });
    console.log('New ¥980 Stripe TEST catalogue: '+JSON.stringify(result));
    console.log('No Stripe or application data changed. This is NOT a paid-release approval.');
  }catch(error){console.error(error.message||'STOP: staging check failed');process.exitCode=1}
}
