import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 CASES,MODELS,createResponseTemplate,evaluateSample,evaluateModelResults
} from '../scripts/gemini-quality-benchmark.mjs';

test('quality benchmark uses known model names and covers roleplay and coaching at varied levels',()=>{
 assert.deepEqual(MODELS,['gemini-3.5-flash-lite','gemini-3.1-flash-lite']);
 assert.ok(CASES.length>=15);
 assert.ok(CASES.filter(c=>c.kind==='conversation').length>=10);
 assert.ok(CASES.filter(c=>c.kind==='teacher').length>=5);
 assert.equal(new Set(CASES.map(c=>c.id)).size,CASES.length);
 assert.ok(new Set(CASES.map(c=>c.level)).has('easy'));
 assert.ok(new Set(CASES.map(c=>c.level)).has('challenge'));
});
test('template is empty, not hallucinated provider outputs, and NEVER passes an absent comparison',()=>{
 const t=createResponseTemplate();
 assert.equal(t.samples.length,CASES.length*MODELS.length);
 assert.ok(t.samples.every(x=>x.reply===''&&x.feedback===null));
 const r=evaluateModelResults(t);
 assert.equal(r.fixtureMode,true);
 assert.equal(r.results[0].attempted,0);
 assert.equal(r.results[1].attempted,0);
 assert.equal(r.results[0].automatedPassRatio,null);
 assert.match(r.releaseDecision,/BLOCKED/);
});
test('coaching rubric flags changed questions, removed negation, numbers and false grammar criticism',()=>{
 const q=CASES.find(x=>x.id==='coach-correct-question');
 assert.deepEqual(evaluateSample({feedback:{
  improved:'Please repeat that.',praise:'Nice!',why:'Great question.'
 }},q).reasons,['question_changed_to_statement']);
 const n=CASES.find(x=>x.id==='coach-negative');
 assert.ok(evaluateSample({feedback:{improved:'I want to cancel my booking.',praise:'',why:''}},n).reasons.includes('negation_removed'));
 const facts=CASES.find(x=>x.id==='coach-name-number');
 assert.ok(evaluateSample({feedback:{improved:'A table for two at 8 PM.',praise:'',why:''}},facts).reasons.includes('facts_changed'));
 assert.ok(evaluateSample({feedback:{improved:'Could you repeat that?',praise:'',why:'Wrong grammar.'}},q).reasons.includes('invented_error_possible'));
});
test('roleplay checks dialogue length, unsafe certainty and AI-style breaks',()=>{
 const allergy=CASES.find(c=>c.id==='restaurant-allergy');
 assert.ok(evaluateSample({reply:'This is definitely peanut-free.'},allergy).reasons.includes('forbidden_phrase'));
 assert.ok(evaluateSample({reply:'As a language model I cannot assist.'},allergy).reasons.includes('breaks_roleplay'));
 assert.ok(evaluateSample({reply:'Hello!'},allergy).reasons.includes('needs_human_context_review'));
 assert.equal(evaluateSample({reply:'I can check with the kitchen about peanuts.'},allergy).reasons.length,0);
});
test('one model cannot be declared better when other model is unmeasured',()=>{
 const t=createResponseTemplate();
 t.samples=t.samples.filter(x=>x.model===MODELS[0]);
 const x=t.samples.find(x=>x.caseId==='cafe-milk-fix');
 x.reply='I can remake your oat milk drink now.';
 const r=evaluateModelResults(t);
 assert.equal(r.results[0].attempted,1);
 assert.equal(r.results[1].attempted,0);
 assert.match(r.releaseDecision,/BLOCKED/);
});
test('invalid, duplicate and unrecognized fixtures are rejected before scoring',()=>{
 assert.throws(()=>evaluateModelResults({schemaVersion:3,samples:[]}),/invalid_benchmark_schema/);
 const t=createResponseTemplate();
 t.samples.push({...t.samples[0]});
 assert.throws(()=>evaluateModelResults(t),/duplicate_model_case/);
 const bad=createResponseTemplate();
 bad.samples[0].model='user-supplied-expensive-model';
 assert.throws(()=>evaluateModelResults(bad),/unknown_case_or_model/);
});
test('offline harness contains no provider fetch, process.env, secrets, or network access',()=>{
 const source=readFileSync(new URL('../scripts/gemini-quality-benchmark.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bfetch\s*\(|https\.request|process\.env|googleapis\.com|x-goog-api-key|GEMINI_API_KEY/);
});
