import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 TRANSFER_PAIRS,normalizeTransferResults,chooseTransferPair,transferStats,
 transferDay,TRANSFER_REASONS,TRANSFER_RESULT_LIMIT
} from '../transfer-data.mjs';

const page=readFileSync(new URL('../transfer.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../transfer.js',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sprint=readFileSync(new URL('../reflex.html',import.meta.url),'utf8');

test('30 authored pairs cover 60 distinct scenes with usable English samples',()=>{
 assert.equal(TRANSFER_PAIRS.length,30);
 assert.equal(new Set(TRANSFER_PAIRS.map(p=>p.id)).size,30);
 assert.equal(new Set(TRANSFER_PAIRS.map(p=>p.reason)).size,6);
 assert.equal(TRANSFER_PAIRS.length*2,60);
 for(const p of TRANSFER_PAIRS){
  assert.ok(TRANSFER_REASONS[p.reason],p.id);
  assert.notEqual(p.first.scene,p.second.scene,p.id);
  assert.notEqual(p.first.cue,p.second.cue,p.id);
  assert.notEqual(p.first.example,p.second.example,p.id);
  assert.match(p.skill,/./);
  assert.ok(p.insight.length>20);
  for(const part of [p.first,p.second]){
   assert.match(part.cue,/[\u3040-\u30ff\u3400-\u9fff]/);
   assert.match(part.example,/[a-zA-Z]{4}/);
   assert.match(part.alternative,/[a-zA-Z]{4}/);
  }
 }
});
test('unknown and forged results are rejected and arbitrary private fields are not retained',()=>{
 const safe=normalizeTransferResults([
  {pairId:TRANSFER_PAIRS[0].id,first:true,second:false,at:'2026-10-23T12:01:00.000Z',transcript:'do not keep',uid:'raw uid'},
  {pairId:'unknown',first:true,second:true,at:'2026-10-23T12:01:01.000Z'},
  {pairId:TRANSFER_PAIRS[0].id,first:'yes',second:true,at:'2026-10-23T12:01:02.000Z'},
  {pairId:TRANSFER_PAIRS[0].id,first:true,second:true,at:'invalid'},
  {pairId:TRANSFER_PAIRS[0].id,first:true,second:false,at:'2026-10-23T12:01:00.000Z'}
 ]);
 assert.equal(safe.length,1);
 assert.deepEqual(safe[0],{pairId:TRANSFER_PAIRS[0].id,first:true,second:false,at:'2026-10-23T12:01:00.000Z'});
 assert.doesNotMatch(JSON.stringify(safe),/uid|transcript/);
 assert.deepEqual(normalizeTransferResults({bad:'data'}),[]);
 assert.equal(TRANSFER_RESULT_LIMIT,180);
});
test('expanded bounded history preserves earlier spaced reviews without retaining private text',()=>{
 const rows=Array.from({length:90},(_,i)=>({
  pairId:TRANSFER_PAIRS[i%TRANSFER_PAIRS.length].id,
  first:i%2===0,second:i%3===0,
  at:new Date(Date.UTC(2026,9,1,0,i)).toISOString(),
  transcript:'private utterance must never persist',
  userId:'sensitive-identifier'
 }));
 const result=normalizeTransferResults(rows);
 assert.equal(result.length,90);
 assert.deepEqual(Object.keys(result[0]),['pairId','first','second','at']);
 assert.doesNotMatch(JSON.stringify(result),/private utterance|sensitive-identifier/);
 assert.equal(normalizeTransferResults([...rows,...rows,...rows]).length<=TRANSFER_RESULT_LIMIT,true);
});
test('focus reason from voluntary diagnosis prioritizes matching transfer skill',()=>{
 const chosen=chooseTransferPair([],[{session:'2026-10-23T10:11:12.000Z|0|repair1',reason:'words'}]);
 assert.equal(chosen.focusReason,'words');
 assert.equal(chosen.pair.reason,'words');
 const unknown=chooseTransferPair([],[{session:'anything',reason:'unknown'}]);
 assert.equal(unknown.focusReason,null);
});
test('completed pairs rotate to unattempted ones even when a focus category is selected',()=>{
 const all=TRANSFER_PAIRS.filter(x=>x.reason==='words');
 const first=chooseTransferPair([],[{session:'valid',reason:'words'}]).pair;
 const h=[{pairId:first.id,at:'2026-10-23T07:05:00.000Z',first:true,second:false}];
 const next=chooseTransferPair(h,[{session:'valid',reason:'words'}]);
 assert.equal(next.pair.reason,'words');
 assert.notEqual(next.pair.id,first.id);
 assert.equal(new Set(all.map(p=>p.id)).size,5);
});
test('focused pairs do not become a two-question loop after both variations were seen',()=>{
 const focused=TRANSFER_PAIRS.filter(p=>p.reason==='words');
 const history=focused.map((p,i)=>({
  pairId:p.id,first:i===0,second:false,at:'2026-10-23T12:0'+i+':00.000Z'
 }));
 const next=chooseTransferPair(history,[{session:'session-example',reason:'words'}]);
 assert.equal(next.focusReason,'words');
 assert.notEqual(next.pair.reason,'words','new scenes have priority over repetitive pairs after focus exhaustion');
 assert.equal(TRANSFER_PAIRS.some(p=>p.id===next.pair.id),true);
});
test('self-report counts are not AI assessment or claimed as proven English improvement',()=>{
 const history=[
  {pairId:TRANSFER_PAIRS[0].id,first:true,second:true,at:'2026-10-23T12:00:00.000Z'},
  {pairId:TRANSFER_PAIRS[1].id,first:true,second:false,at:'2026-10-23T12:01:00.000Z'},
  {pairId:TRANSFER_PAIRS[0].id,first:false,second:false,at:'2026-10-23T12:02:00.000Z'}
 ];
 assert.deepEqual({...transferStats(history)},{pairAttempts:3,bothSelfReported:1,secondSelfReported:1,distinctPairs:2});
 assert.match(page,/自己評価/);
 assert.match(page,/自動採点する機能ではありません/);
 assert.doesNotMatch(page,/あなたの英語力は.*%向上/);
});
test('JST handling uses rollover at 15:00 UTC and cannot change real wall clock',()=>{
 assert.equal(transferDay(new Date('2026-10-23T14:59:59Z')),'2026-10-23');
 assert.equal(transferDay(new Date('2026-10-23T15:00:00Z')),'2026-10-24');
});
test('the base answer is withheld until both separate scene ratings are collected',()=>{
 assert.match(page,/id="questionPane"/);
 assert.match(page,/id="endPane"[^>]*hidden/);
 assert.match(app,/reports\.push\(didSpeak\)/);
 assert.match(app,/if\(round===0\)\{round=1;showQuestion\(\);return\}/);
 assert.match(app,/for\(const \[i,part\] of \[pair\.first,pair\.second\]\.entries\(\)\)/);
 assert.match(app,/show\('endPane'\)/);
 assert.doesNotMatch(page,/I cannot find my bag|The air conditioner is not working/);
});
test('transfer page is discoverable via the main sprint without modifying billing or quotas',()=>{
 assert.match(page,/type="module" src="\.\/transfer\.js"/);
 assert.match(page,/src="\.\/sprint-diagnosis\.js"/);
 assert.match(page,/type="module" src="\.\/account-sync\.js"/);
 assert.match(home,/href="\.\/transfer\.html"/);
 assert.match(sprint,/href="\.\/transfer\.html"/);
 assert.match(app,/speakingym-account-owner-v1/);
 assert.match(app,/speakingym:account-changing',beginOwnerTransition/);
 assert.match(app,/speakingym:account-ready',refreshIntro/);
 assert.doesNotMatch(app,/fetch\s*\(|XMLHttpRequest|api\.gemini|Stripe/i);
 assert.doesNotMatch(page,/stripe\.com|checkout\.sessions/);
});
