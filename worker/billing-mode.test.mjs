import test from 'node:test';
import assert from 'node:assert/strict';
import {billingMode,billingUserEligible} from './billing-mode.js';

const db={};
const live={
 PLAN_DB:db,ENFORCE_PLANS:'true',TURN_LEDGER_MODE:'enabled',
 BILLING_MODE:'live',LIVE_BILLING_ENABLED:'enabled',
 LIVE_LEGAL_READY:'verified',LIVE_STRIPE_SANDBOX_E2E_PASSED:'verified',
 LIVE_UNIT_ECONOMICS_REVIEWED:'verified',
 STRIPE_LIVE_SECRET_KEY:'sk_live_dummy_not_real',
 STRIPE_LIVE_WEBHOOK_SECRET:'whsec_dummy_not_real',
 STRIPE_LIVE_PRICE_ID:'price_fixture',
 BILLING_LIVE_AUDIENCE:'invited',BILLING_LIVE_UIDS:'qa-user',
};
test('live billing requires exact, explicitly authorized activation',()=>{
 assert.equal(billingMode(live),'live');
 const invalid=[
  {LIVE_BILLING_ENABLED:undefined},{LIVE_BILLING_ENABLED:'true'},
  {LIVE_LEGAL_READY:undefined},{LIVE_LEGAL_READY:'true'},
  {LIVE_STRIPE_SANDBOX_E2E_PASSED:undefined},{LIVE_STRIPE_SANDBOX_E2E_PASSED:'true'},
  {LIVE_UNIT_ECONOMICS_REVIEWED:undefined},{LIVE_UNIT_ECONOMICS_REVIEWED:'true'},
  {BILLING_MODE:'test'},{BILLING_MODE:undefined},
  {ENFORCE_PLANS:'false'},{TURN_LEDGER_MODE:'disabled'},
  {STRIPE_LIVE_SECRET_KEY:'sk_test_wrong'},
  {STRIPE_LIVE_WEBHOOK_SECRET:undefined},
  {STRIPE_LIVE_PRICE_ID:''},
  {BILLING_LIVE_AUDIENCE:'public-ish'},
  {BILLING_LIVE_UIDS:''},
  {PLAN_DB:undefined}
 ];
 for(const fields of invalid)assert.equal(billingMode({...live,...fields}),'disabled',
  JSON.stringify(Object.keys(fields)));
});
test('live access is invited-only unless intentionally switched to public',()=>{
 assert.equal(billingUserEligible(live,'qa-user'),true);
 assert.equal(billingUserEligible(live,'customer'),false);
 assert.equal(billingMode({...live,BILLING_LIVE_AUDIENCE:'public',BILLING_LIVE_UIDS:''}),'disabled',
  'Pilot permission must not authorize selling publicly');
 assert.equal(billingUserEligible({...live,BILLING_LIVE_AUDIENCE:'public'},'customer'),false);
 assert.equal(billingMode({...live,BILLING_LIVE_AUDIENCE:'public',BILLING_LIVE_UIDS:'',LIVE_PUBLIC_RELEASE_APPROVED:'approved'}),'live');
 assert.equal(billingUserEligible({...live,BILLING_LIVE_AUDIENCE:'public',LIVE_PUBLIC_RELEASE_APPROVED:'approved'},'customer'),true);
 assert.equal(billingUserEligible({...live,LIVE_BILLING_ENABLED:'disabled'},'qa-user'),false);
});
test('test keys cannot unlock live mode and sandbox eligibility stays unchanged',()=>{
 const testEnv={PLAN_DB:db,ENFORCE_PLANS:'true',BILLING_MODE:'test',
  STRIPE_SECRET_KEY:'sk_test_dummy',STRIPE_WEBHOOK_SECRET:'whsec_test',
  STRIPE_PRICE_ID:'price_test',BILLING_TEST_UIDS:'sandbox-tester'};
 assert.equal(billingMode(testEnv),'test');
 assert.equal(billingUserEligible(testEnv,'sandbox-tester'),true);
 assert.equal(billingUserEligible(testEnv,'qa-user'),false);
 assert.equal(billingMode({...testEnv,BILLING_MODE:'live',LIVE_BILLING_ENABLED:'enabled'}),'disabled');
 assert.equal(billingMode({...live,BILLING_MODE:'disabled'}),'disabled');
});
