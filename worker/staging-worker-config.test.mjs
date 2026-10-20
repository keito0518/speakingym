import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const staging=readFileSync(new URL('./wrangler.staging.toml',import.meta.url),'utf8');
const stageBilling=readFileSync(new URL('./wrangler.staging-billing.toml',import.meta.url),'utf8');
const production=readFileSync(new URL('./wrangler.toml',import.meta.url),'utf8');
const key = (text,name) => {
  const matches=[...text.matchAll(new RegExp('^'+name+'\\s*=\\s*"([^"]+)"\\s*$','gm'))];
  assert.equal(matches.length,1,'Exactly one '+name+' required');
  return matches[0][1];
};
const section = (text,start,end) => {
  const pos=text.indexOf(start);
  assert.ok(pos>=0,start+' must be present');
  const finish=end?text.indexOf(end,pos+start.length):-1;
  return text.slice(pos,finish<0?undefined:finish);
};

test('staging Worker has a distinct name, entry point and D1 database',()=>{
  assert.equal(key(section(staging,'# Separate Worker','[[ratelimits]]'),'name'),'speakingym-survival-ai-staging');
  assert.equal(key(staging,'main'),'ai-worker.js');
  assert.equal(key(staging,'database_name'),'speakingym-plans-staging');
  assert.equal(key(staging,'database_id'),'c608774e-3bc5-4527-be8d-f640e386f504');
  assert.equal(key(staging,'binding'),'PLAN_DB');
  assert.ok(!staging.includes('62419d42-703c-4e41-af47-736fd1738d7e'),'No production D1 UUID');
  assert.match(staging,/^keep_vars\s*=\s*false\s*$/m);
  assert.equal((staging.match(/^\[\[d1_databases\]\]$/gm)||[]).length,1);
  assert.equal((staging.match(/^\[\[ratelimits\]\]$/gm)||[]).length,2);
  assert.equal((staging.match(/^\[vars\]$/gm)||[]).length,1);
});

test('staging deploy defaults to disabled AI, Free rescue, replay and billing',()=>{
  const vars=section(staging,'[vars]');
  for(const [name,val] of Object.entries({
    ENFORCE_PLANS:'true',TURN_LEDGER_MODE:'enabled',STAGING_HEALTH_ONLY:'true',ALLOW_AI:'false',
    FREE_SESSION_MODE:'disabled',AI_REPLAY_MODE:'disabled',
    REPLAY_CLEANUP_MODE:'disabled',BILLING_MODE:'disabled',
  }))assert.equal(key(vars,name),val);
  assert.doesNotMatch(vars,/GEMINI_API_KEY|STRIPE_SECRET_KEY|FIREBASE_PRIVATE_KEY|CF_API_TOKEN/);
});

test('staging throttling uses isolated namespaces distinct from production',()=>{
  const namespaces=txt=>[...txt.matchAll(/^namespace_id\s*=\s*"(\d+)"$/gm)].map(x=>x[1]);
  const s=namespaces(staging),p=namespaces(production);
  assert.equal(s.length,2);
  assert.equal(new Set(s).size,2);
  assert.equal(s.filter(n=>p.includes(n)).length,0);
  assert.deepEqual(s,['98111','98112']);
});

test('existing production deployment configuration remains on its own database',()=>{
  assert.equal(key(section(production,'name =','[[ratelimits]]'),'name'),'speakingym-survival-ai');
  assert.equal(key(production,'database_name'),'speakingym-plans');
  assert.equal(key(production,'database_id'),'62419d42-703c-4e41-af47-736fd1738d7e');
  assert.notEqual(key(production,'database_id'),key(staging,'database_id'));
  assert.doesNotMatch(production,/^STAGING_HEALTH_ONLY\s*=/m,'production config must never enable staging GET-only gate');
});

test('Stripe staging config cannot switch the Worker, D1, rate limits, or AI on',()=>{
 assert.equal(key(section(stageBilling,'name =','[[ratelimits]]'),'name'),
  key(section(staging,'name =','[[ratelimits]]'),'name'));
 for(const field of ['main','database_name','database_id','binding','ENFORCE_PLANS',
  'TURN_LEDGER_MODE','ALLOW_AI','FREE_SESSION_MODE','AI_REPLAY_MODE',
  'REPLAY_CLEANUP_MODE'])assert.equal(key(stageBilling,field),key(staging,field),field);
 assert.equal(key(stageBilling,'STAGING_HEALTH_ONLY'),'false');
 assert.equal(key(stageBilling,'STAGING_BILLING_ONLY'),'true');
 assert.equal(key(stageBilling,'BILLING_MODE'),'test');
 assert.equal(key(staging,'BILLING_MODE'),'disabled');
 assert.doesNotMatch(stageBilling,/STRIPE_(?:SECRET|LIVE)|GEMINI_API_KEY|CF_API_TOKEN/);
 assert.deepEqual([...stageBilling.matchAll(/^namespace_id\\s*=\\s*"(\\d+)"$/gm)].map(m=>m[1]),
  [...staging.matchAll(/^namespace_id\\s*=\\s*"(\\d+)"$/gm)].map(m=>m[1]));
 assert.equal((stageBilling.match(/^\\[\\[d1_databases\\]\\]$/gm)||[]).length,1);
});
