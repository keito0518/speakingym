import test from 'node:test';
import assert from 'node:assert/strict';
import {usageRecord,aiOutcomeRecord} from './cost-telemetry.js';
test('cost includes thinking, discounts cache and never logs prompt, UID or API key',()=>{
 const record=usageRecord({uid:'private-id',prompt:'secret conversation',key:'secret-key',usageMetadata:{promptTokenCount:1000,cachedContentTokenCount:100,candidatesTokenCount:100,thoughtsTokenCount:50,totalTokenCount:1150}},'conversation');
 assert.equal(record.estimatedUsd,0.000648);
 assert.doesNotMatch(JSON.stringify(record),/private-id|secret/);
 assert.equal(record.costBasis,'standard-paid-tier-equivalent');
});
test('truncated/blocked generation with thinking and no candidate still costs money',()=>{
 assert.equal(usageRecord({usageMetadata:{promptTokenCount:1000,thoughtsTokenCount:100}},'teacher').estimatedUsd,0.00055);
 assert.equal(usageRecord({},'teacher'),null);
});

test('operational AI outcome strips untrusted content and records latency without identities',()=>{
 const record=aiOutcomeRecord({kind:'conversation',plan:'pro',status:429,code:'gemini_quota',durationMs:1892,
  uid:'private-person',ip:'1.2.3.4',transcript:'sensitive conversation',key:'secret'});
 assert.equal(record.event,'speakingym_ai_outcome_v1');
 assert.equal(record.plan,'pro');assert.equal(record.success,false);
 assert.equal(record.latencyMs,1892);assert.equal(record.code,'gemini_quota');
 assert.doesNotMatch(JSON.stringify(record),/private-person|1\.2\.3\.4|sensitive|secret/);
 const suspicious=aiOutcomeRecord({kind:'teacher',plan:'private-uid',status:200,
  code:'token abc.sensitive.private',durationMs:Infinity});
 assert.equal(suspicious.plan,'legacy');assert.equal(suspicious.code,'unknown');
 assert.equal(suspicious.latencyMs,0);assert.equal(suspicious.success,true);
 assert.equal(aiOutcomeRecord({kind:'secret',status:200}),null);
});

test('token costs can be segmented by authoritative tier without logging identifiers',()=>{
 const result={uid:'private-123',usageMetadata:{promptTokenCount:1000,candidatesTokenCount:200,thoughtsTokenCount:50}};
 const pro=usageRecord(result,'conversation','pro');
 assert.equal(pro.plan,'pro');
 assert.equal(usageRecord(result,'reflex_coach','free').plan,'free');
 assert.equal(usageRecord(result,'conversation','untrusted-uid').plan,'legacy');
 assert.doesNotMatch(JSON.stringify(pro),/private-123|untrusted-uid/);
});
