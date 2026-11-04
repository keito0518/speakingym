import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeFixed980,PUBLIC_PRO_PRICE_JPY} from '../scripts/pro980-operating-model.mjs';

test('public price is fixed at ¥980 in every operating scenario',()=>{
 assert.equal(PUBLIC_PRO_PRICE_JPY,980);
 for(const shape of ['short','heavy']){
  for(const model of ['gemini-3.1-flash-lite','gemini-3.5-flash-lite']){
   const report=analyzeFixed980({shape,model,paidUsers:50,freeUsers:200});
   assert.equal(report.priceJpy,980);
   assert.equal(report.status,'HYPOTHETICAL_ONLY_NOT_REAL_PROVIDER_INVOICE');
  }
 }
 assert.equal(analyzeFixed980({priceJpy:1980}).priceJpy,980,
  'even if caller passes a price argument, this model must ignore it');
});
test('heavier output and more Free users always worsen contribution',()=>{
 const short=analyzeFixed980({shape:'short'});
 const heavy=analyzeFixed980({shape:'heavy'});
 assert.ok(short.jpy.averagePaidAi<heavy.jpy.averagePaidAi);
 assert.ok(heavy.jpy.estimatedMonthlyMarginBeforeOtherCosts<short.jpy.estimatedMonthlyMarginBeforeOtherCosts);
 const expensive=analyzeFixed980({freeUsers:2000});
 const modest=analyzeFixed980({freeUsers:200});
 assert.ok(expensive.jpy.estimatedMonthlyMarginBeforeOtherCosts<modest.jpy.estimatedMonthlyMarginBeforeOtherCosts);
});
test('costlier teacher usage, retries and fewer paying users do not invent positive margin',()=>{
 const baseline=analyzeFixed980();
 const stressed=analyzeFixed980({retryFactor:3,monthlyHostingJpy:50000,
  paidUsers:20,freeUsers:2000});
 assert.ok(stressed.jpy.estimatedMonthlyMarginBeforeOtherCosts<baseline.jpy.estimatedMonthlyMarginBeforeOtherCosts);
 assert.equal(stressed.priceJpy,980);
});
test('break-even paid members and 50k goals are only reported with positive contribution',()=>{
 const x=analyzeFixed980({shape:'short',paidUsers:50,freeUsers:500});
 assert.ok(x.paidMembersNeededForBreakEven>0);
 assert.ok(x.paidMembersNeededFor50000Jpy>x.paidMembersNeededForBreakEven);
 const stressed=analyzeFixed980({shape:'heavy',paidUsageMix:[{share:1,turns:4000,teacher:500}]});
 assert.equal(stressed.paidMembersNeededForBreakEven,null);
 assert.equal(stressed.paidMembersNeededFor50000Jpy,null);
 assert.equal(stressed.verdict,'illustrative_loss_risk');
});
test('invalid inputs and sums are rejected instead of returning seductive false numbers',()=>{
 assert.throws(()=>analyzeFixed980({paidUsers:0}),/invalid_paid_users/);
 assert.throws(()=>analyzeFixed980({model:'not-a-model'}),/unknown_model/);
 assert.throws(()=>analyzeFixed980({paidUsageMix:[{share:0.4,turns:20,teacher:3}]}),/shares/);
 assert.throws(()=>analyzeFixed980({freeTurnsPerUser:3001}),/invalid_free_turns/);
 assert.throws(()=>analyzeFixed980({paidUsageMix:[]}),/invalid_usage_mix/);
});
test('finance tool does not access customer data, billing, D1 or external provider',()=>{
 const src=readFileSync(new URL('../scripts/pro980-operating-model.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/\bfetch\s*\(|process\.env|SECRET|API_KEY|cloudflare\.com\/api|stripe\.com\/v1/);
});
