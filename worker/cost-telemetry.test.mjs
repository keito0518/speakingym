import test from 'node:test';
import assert from 'node:assert/strict';
import {usageRecord} from './cost-telemetry.js';
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
