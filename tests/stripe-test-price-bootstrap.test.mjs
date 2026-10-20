import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAN,assertTestKey,validatePrice,chooseExistingProduct,chooseExistingPrice,
 prepareStripeTestPrice} from '../scripts/stripe-test-price-bootstrap.mjs';

const key='sk_test_notARealKey';
const product=()=>({id:'prod_dummy1',object:'product',livemode:false,active:true,name:PLAN.name});
const price=()=>({id:'price_dummy1',object:'price',active:true,livemode:false,
 product:'prod_dummy1',currency:'jpy',unit_amount:1480,tax_behavior:'inclusive',
 type:'recurring',billing_scheme:'per_unit',
 recurring:{interval:'month',interval_count:1,usage_type:'licensed',trial_period_days:null}});
const list=(data,has_more=false)=>({data,has_more});

function service({products=[product()],prices=[price()],overrides={}}={}){
 const calls=[];
 const req=async(url,opt)=>{
  const path=new URL(url).pathname;
  calls.push({path,method:opt.method,body:opt.body});
  let answer;
  if(path==='/v1/products'&&opt.method==='GET')answer=list(products);
  else if(path==='/v1/prices'&&opt.method==='GET')answer=list(prices);
  else if(path==='/v1/products'&&opt.method==='POST')answer=product();
  else if(path==='/v1/prices'&&opt.method==='POST')answer=price();
  else throw Error('Unexpected endpoint');
  return {status:overrides.status||200,json:async()=>answer};
 };
 return {calls,req};
}
test('strictly refuses non-test and absent Stripe keys',()=>{
 for(const k of ['sk_live_notReal','rk_test_notReal','pk_test_notReal',undefined,'sk_test_!']){
  assert.throws(()=>assertTestKey(k),/TEST-only/);
 }
 assert.equal(assertTestKey(key),key);
});
test('exact Pro 1480 monthly tax-inclusive price only',()=>{
 assert.equal(validatePrice(price(),'prod_dummy1'),true);
 for(const v of [
  {livemode:true},{product:'prod_other'},{unit_amount:680},{tax_behavior:'unspecified'},
  {currency:'usd'},{active:false},{billing_scheme:'tiered'}, {type:'one_time'},
  {recurring:{interval:'year',interval_count:1,usage_type:'licensed',trial_period_days:null}},
  {recurring:{interval:'month',interval_count:1,usage_type:'metered',trial_period_days:null}},
  {recurring:{interval:'month',interval_count:1,usage_type:'licensed',trial_period_days:7}},
 ]){
  assert.equal(validatePrice({...price(),...v},'prod_dummy1'),false,JSON.stringify(v));
 }
});
test('product/price discovery is fail closed on incomplete or duplicate test data',()=>{
 assert.throws(()=>chooseExistingProduct(list([product()],true)),/incomplete/);
 assert.throws(()=>chooseExistingProduct(list([product(),product()])),/multiple exact/);
 assert.throws(()=>chooseExistingPrice(list([price(),price()]),'prod_dummy1'),/multiple matching/);
 assert.throws(()=>chooseExistingPrice(list([price()],true),'prod_dummy1'),/incomplete/);
 assert.throws(()=>chooseExistingPrice(list([{...price(),livemode:true}]),'prod_dummy1'),/unexpected price/);
});
test('default operation is read-only and reuses existing test product/price',async()=>{
 const f=service();
 const status=await prepareStripeTestPrice({key,request:f.req});
 assert.equal(status.mode,'test');
 assert.equal(status.price,'existing');
 assert.equal(status.changed,false);
 assert.deepEqual(f.calls.map(c=>c.method),['GET','GET']);
 assert.equal(f.calls.some(c=>c.method==='POST'),false);
});
test('read-only identifies missing product or price but never creates',async()=>{
 for(const options of [{products:[],prices:[]},{products:[product()],prices:[]}]){
  const f=service(options);
  const s=await prepareStripeTestPrice({key,request:f.req});
  assert.equal(s.changed,false);
  assert.equal(f.calls.some(c=>c.method==='POST'),false);
 }
});
test('explicit apply only creates missing test product and monthly 1480 Price',async()=>{
 for(const options of [{products:[],prices:[]},{products:[product()],prices:[]}]){
  const f=service(options);
  const s=await prepareStripeTestPrice({key,apply:true,request:f.req});
  assert.equal(s.price,'created');
  assert.equal(s.mode,'test');
  assert.equal(s.changed,true);
  assert.equal(s.priceId,'price_dummy1');
  const posts=f.calls.filter(c=>c.method==='POST');
  assert.deepEqual(posts.map(c=>c.path),options.products.length?['/v1/prices']:['/v1/products','/v1/prices']);
  const params=new URLSearchParams(posts.at(-1).body);
  assert.equal(params.get('unit_amount'),'1480');
  assert.equal(params.get('tax_behavior'),'inclusive');
  assert.equal(params.get('recurring[interval]'),'month');
  assert.equal(params.get('recurring[usage_type]'),'licensed');
  assert.equal(posts.some(c=>/(customers|checkout|subscriptions|webhook)/.test(c.path)),false);
 }
});
test('API errors and test-mode mismatches never pass',async()=>{
 const bad=service({overrides:{status:403}});
 await assert.rejects(prepareStripeTestPrice({key,apply:true,request:bad.req}),/HTTP 403/);
 let calls=0;
 const req=async()=>{calls++;return {status:200,json:async()=>list([{...product(),livemode:true}])}};
 await assert.rejects(prepareStripeTestPrice({key,apply:true,request:req}),/non-test Product/);
 assert.equal(calls,1);
});
