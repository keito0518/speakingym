/**
 * Billing mode is a fail-closed decision shared by Stripe checkout and plan
 * accounting. Never infer live mode from a live key alone.
 */
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
export function billingUserEligible(env={},uid) {
 const mode=billingMode(env);
 if(mode==='live')
  return env.BILLING_LIVE_AUDIENCE==='public' ||
   String(env.BILLING_LIVE_UIDS||'').split(',').map(x=>x.trim()).includes(uid);
 if(mode==='test')
  return String(env.BILLING_TEST_UIDS||'').split(',').map(x=>x.trim()).includes(uid);
 return false;
}
