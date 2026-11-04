import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRO980_TEST_PLAN,validPro980TestPrice,inspectPro980TestPrice
} from '../scripts/stripe-pro980-test-readiness.mjs';

const productId='prod_980sandboxAAA';
const priceId='price_980sandboxAAA';
// Build unmistakably synthetic credential-shaped input without embedding an
// apparent Stripe secret in a committed test fixture.
const key=['sk','test','fixtureOnlyNeverASecret'].join('_');
const price=()=>({id:priceId,object:'price',livemode:false,active:true,
  currency:'jpy',unit_amount:980,type:'recurring',billing_scheme:'per_unit',
  tax_behavior:'inclusive',recurring:{interval:'month',interval_count:1,usage_type:'licensed',trial_period_days:null},
  product:{id:productId,object:'product',name:PRO980_TEST_PLAN.name,active:true,livemode:false}});

test('¥980 readiness accepts only a separate monthly tax-inclusive Stripe TEST Product and Price',()=>{
  assert.equal(PRO980_TEST_PLAN.amountJpy,980);
  assert.equal(validPro980TestPrice(price(),productId),true);
  for(const [path,value] of [
    ['unit_amount',680],['unit_amount',1480],['currency','usd'],['tax_behavior','exclusive'],
    ['livemode',true],['active',false],['billing_scheme','tiered'],['type','one_time']
  ])assert.equal(validPro980TestPrice({...price(),[path]:value},productId),false,path);
  for(const change of [
    {recurring:{...price().recurring,interval:'year'}},
    {recurring:{...price().recurring,usage_type:'metered'}},
    {recurring:{...price().recurring,trial_period_days:7}},
    {product:{...price().product,name:'Speakingym Pro'}},
    {product:{...price().product,name:'Speakingym Pro 1480（サンドボックス検証用）'}},
    {product:{...price().product,livemode:true}},
    {product:{...price().product,id:'prod_otherLegacyPrice'}}
  ])assert.equal(validPro980TestPrice({...price(),...change},productId),false,JSON.stringify(change));
});

test('read-only preflight performs one GET and never logs or alters Stripe catalogue',async()=>{
  const calls=[];
  const request=async(url,init)=>{
    calls.push({url,method:init.method,headers:init.headers});
    return {status:200,json:async()=>price()};
  };
  const result=await inspectPro980TestPrice({key,productId,priceId,request});
  assert.deepEqual(result,{mode:'test',readOnly:true,ready:true,amountJpy:980,currency:'jpy',taxBehavior:'inclusive',interval:'month'});
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,'GET');
  assert.match(calls[0].url,/^https:\/\/api\.stripe\.com\/v1\/prices\/price_980sandboxAAA\?expand%5B%5D=product$/);
  assert.equal(calls[0].headers.Authorization,'Bearer '+key);
  assert.equal(JSON.stringify(result).includes(key),false);
  assert.equal(JSON.stringify(result).includes(productId),false);
  assert.equal(JSON.stringify(result).includes(priceId),false);
});

test('no live key, missing IDs, mismatch or unavailable API can pass the readiness gate',async()=>{
  const never=async()=>{throw Error('Request must not be made')};
  for(const input of [
    {key:['sk','live','fixtureOnlyNeverASecret'].join('_'),productId,priceId},
    {key,productId:'',priceId},
    {key,productId,priceId:''},
    {key,productId,priceId:'price_../../unsafe'},
    {key,productId:'prod_bad',priceId}
  ])await assert.rejects(inspectPro980TestPrice({...input,request:never}),/STOP/);
  await assert.rejects(inspectPro980TestPrice({key,productId,priceId,request:async()=>({status:200,json:async()=>({...price(),unit_amount:1480})})}),/invalid/);
  await assert.rejects(inspectPro980TestPrice({key,productId,priceId,request:async()=>({status:401})}),/lookup failed/);
  await assert.rejects(inspectPro980TestPrice({key,productId,priceId,request:async()=>{throw Error('unavailable')}}),/API unavailable/);
});
