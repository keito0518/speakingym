import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAiLogs} from '../scripts/ai-cost-report.mjs';
import {usageRecord,aiOutcomeRecord} from '../worker/cost-telemetry.js';
const line=x=>JSON.stringify(x);
test('sampled real-shaped Free/Pro logs produce cost and 600+100 projected figures',()=>{
 const usage=(kind,plan,input,output,thinking)=>usageRecord({
  usageMetadata:{promptTokenCount:input,candidatesTokenCount:output,thoughtsTokenCount:thinking},
  candidates:[{finishReason:'STOP'}]},kind,plan);
 const records=[
  usage('conversation','pro',1200,100,50),
  usage('reflex_coach','pro',2500,1300,100),
  usage('conversation','free',1200,100,50),
  aiOutcomeRecord({kind:'conversation',plan:'pro',status:200,code:'ok',durationMs:800}),
  aiOutcomeRecord({kind:'conversation',plan:'pro',status:429,code:'gemini_quota',durationMs:1800}),
  aiOutcomeRecord({kind:'teacher',plan:'pro',status:200,code:'ok',durationMs:1200}),
  aiOutcomeRecord({kind:'conversation',plan:'free',status:200,code:'ok',durationMs:500})
 ];
 const result=analyzeAiLogs(records.map(line).join('\n'),{usdJpy:150});
 assert.deepEqual(result.recognized,{usage:3,outcomes:4});
 assert.equal(result.groups['conversation:pro'].successRatePct,50);
 assert.equal(result.groups['conversation:pro'].p95LatencyMs,1800);
 assert.equal(result.groups['conversation:pro'].errorCounts.gemini_quota,1);
 assert.equal(result.groups['conversation:free'].modelCalls,1);
 assert.equal(result.fullUseProEstimate.sampledProConversationRequests,1);
 assert.equal(result.fullUseProEstimate.sampledProTeacherRequests,1);
 assert.ok(Math.abs(result.fullUseProEstimate.aiJpyAt600TurnsAnd100Teacher-129.9)<.02);
});
test('missing samples never imply profitability and empty logs do not divide by zero',()=>{
 const empty=analyzeAiLogs('nonsense\n{"event":"other"}\nINVALID {x');
 assert.equal(empty.fullUseProEstimate,null);
 assert.deepEqual(empty.recognized,{usage:0,outcomes:0});
 assert.equal(empty.ignored.other,2);
 assert.equal(empty.ignored.malformed,1);
 assert.equal(analyzeAiLogs(line(usageRecord({usageMetadata:{promptTokenCount:100,candidatesTokenCount:100}},'conversation','pro'))).fullUseProEstimate,null);
});
test('does not output source log fields including UID, prompt, token, or IP',()=>{
 const personal=line({event:'other',uid:'secret-user',prompt:'private conversation'})+'\n'+
  line({event:'speakingym_gemini_usage_v2',kind:'conversation',plan:'pro',
   estimatedUsd:.123,inputTokens:100,outputTokens:100,thinkingTokens:100,uid:'secret-user',ip:'10.0.0.1'});
 const text=JSON.stringify(analyzeAiLogs(personal));
 assert.doesNotMatch(text,/secret-user|private conversation|10\.0\.0\.1/);
});
test('invalid plans are aggregated as legacy, never arbitrary user identifiers',()=>{
 const json=line({event:'speakingym_ai_outcome_v1',kind:'teacher',plan:'secret-user',status:500,success:false,code:'auth_problem',latencyMs:200});
 const result=analyzeAiLogs(json);
 assert.equal(result.groups['teacher:legacy'].outcomes,1);
 assert.equal(result.groups['teacher:legacy'].errorCounts.auth_problem,1);
 assert.doesNotMatch(JSON.stringify(result),/secret-user/);
});
test('rejects unrealistic FX and malformed provider numbers instead of silent profit estimates',()=>{
 assert.throws(()=>analyzeAiLogs('',{usdJpy:0}),/Invalid/);
 const report=analyzeAiLogs(line({event:'speakingym_gemini_usage_v2',kind:'conversation',plan:'pro',estimatedUsd:-1,inputTokens:1200,outputTokens:12,thinkingTokens:4}));
 assert.equal(report.recognized.usage,0);
 assert.equal(report.ignored.malformed,1);
});

test('Cloudflare-style exported JSON objects and wrapped console messages are parsed safely',()=>{
 const a=usageRecord({usageMetadata:{promptTokenCount:1000,candidatesTokenCount:100,thoughtsTokenCount:50}},'conversation','free');
 const b=aiOutcomeRecord({kind:'conversation',plan:'free',status:200,code:'ok',durationMs:900});
 const cloudflare=JSON.stringify([
  {timestamp:'2026-10-20T00:00:00Z',logs:[{level:'log',message:JSON.stringify(a),uid:'PRIVATE USER'}],request:{headers:{Authorization:'SECRET'}}},
  {message:JSON.stringify(b),userText:'PRIVATE CONVERSATION'},
  {message:'Unrelated debug statement',ip:'PRIVATE IP'}
 ],null,2);
 const report=analyzeAiLogs(cloudflare);
 assert.deepEqual(report.recognized,{usage:1,outcomes:1});
 assert.equal(report.groups['conversation:free'].modelCalls,1);
 assert.equal(report.groups['conversation:free'].p95LatencyMs,900);
 assert.doesNotMatch(JSON.stringify(report),/PRIVATE USER|PRIVATE CONVERSATION|PRIVATE IP|SECRET/);
});

test('Cloudflare JSONL messages are recognized with date prefixes, no identity fields leaked',()=>{
 const x=usageRecord({usageMetadata:{promptTokenCount:550,candidatesTokenCount:90,thoughtsTokenCount:20}},'reflex_coach','free');
 const lines=[
  '2026-10-20T00:01:00Z '+JSON.stringify({message:JSON.stringify(x),uid:'sensitive-uid'}),
  'other console event',
  '{"message":"no event"}'
 ].join('\n');
 const report=analyzeAiLogs(lines);
 assert.equal(report.recognized.usage,1);
 assert.equal(report.ignored.other,2);
 assert.doesNotMatch(JSON.stringify(report),/sensitive-uid/);
});

test('Free production-like samples provide explicitly labeled Pro proxy, never claims actual Pro invoicing',()=>{
 const records=[],nConversation=40,nTeacher=15;
 for(let i=0;i<nConversation;i++)records.push(usageRecord({
  usageMetadata:{promptTokenCount:i===39?30000:1200,candidatesTokenCount:i===39?8000:90,thoughtsTokenCount:i===39?2000:60}
 },'conversation','free'));
 for(let i=0;i<nTeacher;i++)records.push(usageRecord({
  usageMetadata:{promptTokenCount:i===14?10000:2500,candidatesTokenCount:i===14?2000:1200,thoughtsTokenCount:200}
 },'reflex_coach','free'));
 const report=analyzeAiLogs(records.map(line).join('\n'),{usdJpy:160});
 assert.equal(report.fullUseProEstimate,null,'No Pro subscriptions existed: no fake Pro sample');
 assert.equal(report.freeAsProProxyEstimate.source,'free_proxy');
 assert.equal(report.freeAsProProxyEstimate.sampledFreeConversationRequests,nConversation);
 assert.equal(report.freeAsProProxyEstimate.sampledFreeTeacherRequests,nTeacher);
 assert.equal(report.freeAsProProxyEstimate.sampledProConversationRequests,0);
 assert.equal(report.freeAsProProxyEstimate.sampleSufficientForReview,true);
 assert.equal(report.decision,'review_free_proxy_not_live_profit');
 assert.ok(report.freeAsProProxyEstimate.aiJpyIfEveryCallMatchedSampleP95<report.freeAsProProxyEstimate.aiJpyAt600TurnsAnd100Teacher,'rare very expensive calls can increase the mean while staying beyond p95; neither p95 nor average is a hard cap');
 assert.ok(report.groups['conversation:free'].maxCostJpy>=report.groups['conversation:free'].p95CostJpy);
 assert.match(report.provenance,/NOT independently verified/);
 assert.match(report.freeAsProProxyEstimate.note,/not observed Pro costs/);
 assert.match(report.warnings.join(' '),/not actual Google charges/i);
});

test('a few Free samples or only one AI feature never justify paid release',()=>{
 const one=usageRecord({usageMetadata:{promptTokenCount:1200,candidatesTokenCount:150}},'conversation','free');
 const small=analyzeAiLogs([one,one,usageRecord({usageMetadata:{promptTokenCount:2500,candidatesTokenCount:1400}},'reflex_coach','free')].map(line).join('\n'));
 assert.equal(small.decision,'insufficient_real_usage_data');
 assert.equal(small.freeAsProProxyEstimate.sampleSufficientForReview,false);
 assert.equal(analyzeAiLogs([one].map(line).join('\n')).freeAsProProxyEstimate,null);
});

test('a few Pro records cannot imply release-ready or verified profits',()=>{
 const proConvo=usageRecord({usageMetadata:{promptTokenCount:1200,candidatesTokenCount:150}},'conversation','pro');
 const proTeacher=usageRecord({usageMetadata:{promptTokenCount:2500,candidatesTokenCount:1200}},'reflex_coach','pro');
 const report=analyzeAiLogs([proConvo,proTeacher].map(line).join('\n'));
 assert.equal(report.fullUseProEstimate.source,'pro');
 assert.equal(report.fullUseProEstimate.sampleSufficientForReview,false);
 assert.equal(report.decision,'insufficient_real_usage_data');
 assert.match(report.fullUseProEstimate.note,/NOT an invoice/);
});
