import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCT,SCENARIOS,freeTheoreticalMax,perCallModelCosts,analyzeProEconomics}
 from '../scripts/pro680-economics.mjs';

test('30-day theoretical Free maximum can exceed Pro while paid plan has no daily cap',()=>{
 assert.deepEqual(freeTheoreticalMax(30),{sessions:150,conversationTurns:3000,teacher:90});
 assert.deepEqual(freeTheoreticalMax(31),{sessions:155,conversationTurns:3100,teacher:93});
 assert.equal(PRODUCT.proMonthlyConversation,600);
 assert.equal(PRODUCT.proMonthlyTeacher,100);
 assert.equal(PRODUCT.priceJpy,680);
 assert.ok(freeTheoreticalMax(30).conversationTurns>PRODUCT.proMonthlyConversation);
});
test('illustrative standard full-use monthly AI and Stripe match reviewed arithmetic',()=>{
 const p=analyzeProEconomics();
 assert.equal(p.costsJpy.perProCustomerProvider,138.56);
 assert.equal(p.costsJpy.perProStripeAssumption,29.24);
 assert.equal(p.result.perProBeforeFreeUsersAndHostingJpy,512.2);
 assert.equal(p.result.totalMonthlyAfterFreeAndHostingJpy,512.2);
 assert.equal(p.kind,'HYPOTHETICAL_ONLY_NOT_REAL_GEMINI_INVOICE');
 assert.match(p.warnings.join(' '),/not real customer/i);
 assert.equal(p.costsJpy.perFreeCustomerProvider,0);
});
test('heavy users plus planning tax reserve can make full-use Pro money losing',()=>{
 const p=analyzeProEconomics({scenario:'heavy',taxReservePerProJpy:680/11});
 assert.equal(p.costsJpy.perProCustomerProvider,644.8);
 assert.equal(p.result.perProBeforeFreeUsersAndHostingJpy,-55.86);
 assert.equal(p.result.breakEvenMinProUsersForThisFreeBurden,null);
 assert.equal(p.verdict,'illustrative_loss_risk');
});
test('free-user load can make nominally profitable Pro subscriptions lose money',()=>{
 const p=analyzeProEconomics({proUsers:10,freeUsers:1000,freeConversationCalls:20,
  freeTeacherCalls:5,hostMonthlyJpy:1000});
 assert.ok(p.result.perProBeforeFreeUsersAndHostingJpy>0);
 assert.ok(p.result.totalMonthlyAfterFreeAndHostingJpy<0);
 assert.ok(p.result.breakEvenMinProUsersForThisFreeBurden>10);
 assert.ok(p.costsJpy.perFreeCustomerProvider>0);
 assert.equal(p.inputs.freeUsers,1000);
});
test('extra retries, exchange rate, additional Stripe fee and hosting are explicit',()=>{
 const a=analyzeProEconomics({scenario:'standard',proUsers:100,freeUsers:100,
  freeConversationCalls:100,freeTeacherCalls:20});
 const b=analyzeProEconomics({scenario:'standard',proUsers:100,freeUsers:100,
  freeConversationCalls:100,freeTeacherCalls:20,extraRetryFactor:1.3,
  fxJpyPerUsd:180,stripeAdditionalPct:.02,hostMonthlyJpy:2000});
 assert.ok(b.result.totalMonthlyAfterFreeAndHostingJpy<a.result.totalMonthlyAfterFreeAndHostingJpy);
 assert.ok(b.costsJpy.perProStripeAssumption>a.costsJpy.perProStripeAssumption);
});
test('do not silently permit Pro cap changes, malformed samples or nonnumeric values',()=>{
 for(const o of [
  {proConversationCalls:601},{proTeacherCalls:101},{proUsers:0},
  {freeUsers:-1},{freeTeacherCalls:-2},{proConversationCalls:22.4},
  {scenario:'fake'},{fxJpyPerUsd:0},{fxJpyPerUsd:NaN},
  {extraRetryFactor:0},{extraRetryFactor:Infinity},{hostMonthlyJpy:-1},
  {taxReservePerProJpy:681},{stripeAdditionalPct:-.01}
 ])assert.throws(()=>analyzeProEconomics(o));
 assert.throws(()=>freeTheoreticalMax(32));
 assert.throws(()=>perCallModelCosts('fake'));
});
test('sensitivity is based on exact scenario token inputs not implied cost ceiling',()=>{
 assert.deepEqual(Object.keys(SCENARIOS).sort(),['heavy','standard']);
 const a=perCallModelCosts('standard',160),b=perCallModelCosts('heavy',160);
 assert.ok(b.conversation>a.conversation);
 assert.ok(b.teacher>a.teacher);
 assert.equal(a.conversation,.1176);
 assert.equal(a.teacher,.68);
 assert.ok(analyzeProEconomics({scenario:'heavy'}).warnings.some(x=>/not real customer/i.test(x)));
});
