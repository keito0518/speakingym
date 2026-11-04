import test from 'node:test';
import assert from 'node:assert/strict';
import {costRiskMatrix} from '../scripts/pro1480-risk-matrix.mjs';

test('risk matrix is hypothetical, never an approval or live credential',()=>{
 const data=costRiskMatrix({proUsers:25});
 assert.equal(data.basis,'HYPOTHETICAL_NOT_VERIFIED_COST');
 assert.equal(data.liveApproved,false);
 assert.equal(data.outcomes.length,16);
 assert.deepEqual([...new Set(data.outcomes.map(x=>x.scenario))],['standard','heavy']);
 assert.ok(data.requiredEvidence.includes('Gemini real token and invoice charges'));
});
test('higher Free load reduces estimated margin, heavy+retries is more expensive',()=>{
 const m=costRiskMatrix({proUsers:30,hosting:2000,taxReserveJpy:100}).outcomes;
 const find=(scenario,retries,freeUsers)=>m.find(x=>x.scenario===scenario&&x.retries===retries&&x.freeUsers===freeUsers);
 assert.ok(find('standard',1,0).estimatedMonthlyJpy>find('standard',1,500).estimatedMonthlyJpy);
 assert.ok(find('heavy',1.5,500).estimatedMonthlyJpy<find('standard',1,500).estimatedMonthlyJpy);
 assert.ok(find('heavy',1.5,2000).estimatedMonthlyJpy<find('heavy',1.5,100).estimatedMonthlyJpy);
});
test('invalid headcount and tax inputs fail closed',()=>{
 for(const options of [{proUsers:0},{fx:0},{hosting:-1},{taxReserveJpy:1481}])
  assert.throws(()=>costRiskMatrix(options),/invalid_/);
});
