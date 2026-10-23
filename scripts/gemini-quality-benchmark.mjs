/**
 * NO-CALL Gemini 3.5 vs 3.1 language-quality comparison harness.
 *
 * This tool never imports a Gemini SDK, makes a network request, or reads
 * environment secrets. Save anonymized provider output as a LOCAL JSON file
 * only after obtaining it separately in an approved isolated TEST project.
 * Automated text checks are not a substitute for human language quality review.
 *
 * Usage:
 *   node scripts/gemini-quality-benchmark.mjs --template
 *   node scripts/gemini-quality-benchmark.mjs --evaluate /path/to/redacted-results.json
 *
 * --template uses EMPTY response fields and must NEVER be presented as a
 * model-generated evaluation result.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export const MODELS=Object.freeze(['gemini-3.5-flash-lite','gemini-3.1-flash-lite']);
const PAID_STANDARD_RATES=Object.freeze({
 'gemini-3.5-flash-lite':{input:0.30,output:2.50},
 'gemini-3.1-flash-lite':{input:0.25,output:1.50}
});
export const CASES=Object.freeze([
 {id:'cafe-milk-fix',kind:'conversation',level:'easy',
  prompt:'I asked for iced oat milk, but this is hot with regular milk. Could you fix it?',
  context:'Cafe: learner received the wrong drink',requiredAny:['oat','milk','replace','remake'],forbidden:['grammar mistake']},
 {id:'cafe-changed-mind',kind:'conversation',level:'standard',
  prompt:'Actually, never mind. I need to leave. Goodbye.',
  context:'Cafe: learner is ending a conversation',requiredAny:['bye','goodbye','day','understand','okay'],forbidden:['what size']},
 {id:'hotel-early-arrival',kind:'conversation',level:'standard',
  prompt:'Is early check-in possible? I can pay extra if needed.',
  context:'Hotel: arrive early, ask about check-in',requiredAny:['early','check-in','available','room'],forbidden:['free early check-in is guaranteed']},
 {id:'restaurant-allergy',kind:'conversation',level:'easy',
  prompt:'Does this dish contain peanuts? I have an allergy.',
  context:'Restaurant: ask about allergens, do not guess safety',requiredAny:['peanut','allergy','check','kitchen'],
  forbidden:['definitely peanut-free','completely safe']},
 {id:'airport-correction',kind:'conversation',level:'standard',
  prompt:'Sorry, I said Tuesday, not Thursday. Can I change the date?',
  context:'Airport: correct a travel date',requiredAny:['tuesday','date','change'],
  forbidden:['thursday is correct','your ticket is already changed']},
 {id:'shopping-decline',kind:'conversation',level:'easy',
  prompt:'No thanks, I am just looking.',
  context:'Shop assistant: respect declined help',requiredAny:['look','browse','time','help','okay'],
  forbidden:['you must buy']},
 {id:'train-followup',kind:'conversation',level:'standard',
  prompt:'I still do not understand. Could you say that in simpler words?',
  context:'Transit worker: explain directions again in plain English',requiredAny:['train','station','platform','go','take','walk'],
  forbidden:['as I already said']},
 {id:'work-disagree',kind:'conversation',level:'challenge',
  prompt:'I see your point, but I think we should postpone the meeting.',
  context:'Workplace: polite disagreement',requiredAny:['meeting','postpone','reschedule','why'],
  forbidden:['you have to agree with me']},
 {id:'phone-repeat',kind:'conversation',level:'easy',
  prompt:'Could you repeat the last part more slowly?',
  context:'Phone call with unclear audio',requiredAny:['slow','repeat','sure','of course'],
  forbidden:['you should learn grammar']},
 {id:'directions-unexpected',kind:'conversation',level:'challenge',
  prompt:'Before that, where can I find a restroom?',
  context:'Directions: change subject reasonably',requiredAny:['restroom','bathroom','toilet'],
  forbidden:['stay on topic']},
 {id:'friend-alternative',kind:'conversation',level:'standard',
  prompt:'Saturday does not work. How about Sunday afternoon instead?',
  context:'Friends coordinating lunch',requiredAny:['sunday','afternoon','works','meet'],
  forbidden:['see you saturday']},
 {id:'pharmacy-sensitive',kind:'conversation',level:'challenge',
  prompt:'I am allergic to this medicine. Is there an alternative I should ask the pharmacist about?',
  context:'Pharmacy: ask for safer option, do not claim medical safety',
  requiredAny:['pharmacist','allergy','alternative','doctor'],
  forbidden:['this alternative is definitely safe']},
 {id:'coach-correct-question',kind:'teacher',level:'standard',
  prompt:'Could you repeat that, please?',context:'Correct polite question; do not invent a grammar mistake',
  preserveQuestion:true,alreadyCorrect:true},
 {id:'coach-negative',kind:'teacher',level:'standard',
  prompt:'I do not want to cancel my booking.',context:'Preserve negation and booking intent',
  preserveNegation:true},
 {id:'coach-name-number',kind:'teacher',level:'challenge',
  prompt:'I booked a table for three people at 7 PM.',context:'Preserve three people and 7 PM',
  preserveExact:['three','7']},
 {id:'coach-uncertain',kind:'teacher',level:'standard',
  prompt:'I think the train leaves around 5, but I am not sure.',
  context:'Do not turn uncertainty into a confident statement',preserveUncertainty:true},
 {id:'coach-idiom',kind:'teacher',level:'challenge',
  prompt:'I wish to return to the main topic.',context:'Coach may optionally suggest natural phrasing; preserve intent'},
 {id:'coach-no-input',kind:'teacher',level:'easy',
  prompt:'Hello.',context:'Valid simple greeting should not trigger fabricated severe criticism',alreadyCorrect:true}
]);
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase();
const words=s=>normalize(s).replace(/[^a-z\d\s'-]/g,' ').split(/\s+/).filter(Boolean);
const valid=(s,max=1500)=>typeof s==='string'&&s.length<=max;
export function createResponseTemplate(){
 return {schemaVersion:1,source:'EMPTY_TEMPLATE_NOT_MODEL_OUTPUT',
  models:[...MODELS],cases:CASES.map(c=>({...c})),
  samples:CASES.flatMap(c=>MODELS.map(model=>({
   caseId:c.id,model,reply:'',feedback:null,usageMetadata:null,latencyMs:null
  })))};
}
export function evaluateSample(entry,scenario){
 const reasons=[];
 if(!entry||typeof entry!=='object'||!scenario)return {valid:false,score:0,checks:0,reasons:['invalid_entry']};
 const text=scenario.kind==='conversation'?entry.reply:entry.feedback?.improved;
 if(scenario.kind==='conversation'){
  if(!valid(text)||!text.trim()){reasons.push('missing_reply');return {valid:false,score:0,checks:0,reasons}}
  if(words(text).length>55)reasons.push('roleplay_too_long');
  if(/(?:i am an ai|as a language model|system prompt)/i.test(text))reasons.push('breaks_roleplay');
  if(scenario.requiredAny?.length&&!scenario.requiredAny.some(w=>normalize(text).includes(w)))reasons.push('needs_human_context_review');
  for(const forbidden of scenario.forbidden||[])if(normalize(text).includes(normalize(forbidden)))
   reasons.push('forbidden_phrase');
 }else{
  const f=entry.feedback;
  if(!f||typeof f!=='object'||!valid(f.praise)||!valid(f.why)||!valid(f.improved)){
   reasons.push('missing_coaching_fields');return {valid:false,score:0,checks:0,reasons};
  }
  if(scenario.alreadyCorrect&&/(wrong|incorrect|grammar error|文法(?:が|の)?間違い|誤りです)/i.test(String(f.why||'')))
   reasons.push('invented_error_possible');
  if(scenario.preserveQuestion&&f.improved.trim()&&!f.improved.trim().endsWith('?'))
   reasons.push('question_changed_to_statement');
  if(scenario.preserveNegation&&f.improved.trim()&&!/\b(?:not|n't|no|never)\b/i.test(f.improved))
   reasons.push('negation_removed');
  if(scenario.preserveUncertainty&&f.improved.trim()&&!/\b(?:think|perhaps|maybe|around|probably|not sure|might|could|roughly)\b/i.test(f.improved))
   reasons.push('uncertainty_removed');
  for(const w of scenario.preserveExact||[])
   if(f.improved.trim()&&!normalize(f.improved).includes(w))reasons.push('facts_changed');
 }
 return {valid:true,score:reasons.length===0?1:0,checks:1,reasons};
}
function observedUsage(entry,model){
 const u=entry?.usageMetadata;
 if(!u||typeof u!=='object'||!Number.isSafeInteger(u.promptTokenCount)||u.promptTokenCount<0||
  !Number.isSafeInteger(u.candidatesTokenCount)||u.candidatesTokenCount<0||
  !Number.isSafeInteger(u.thoughtsTokenCount)||u.thoughtsTokenCount<0||
  !Number.isSafeInteger(entry?.latencyMs)||entry.latencyMs<0||entry.latencyMs>120000)return null;
 const rate=PAID_STANDARD_RATES[model];
 return {
  prompt:u.promptTokenCount,candidate:u.candidatesTokenCount,thinking:u.thoughtsTokenCount,
  latencyMs:entry.latencyMs,
  hypotheticalPaidTierUsd:
   (u.promptTokenCount*rate.input+(u.candidatesTokenCount+u.thoughtsTokenCount)*rate.output)/1e6
 };
}
export function evaluateModelResults(input){
 if(!input||input.schemaVersion!==1||!Array.isArray(input.samples)||
    input.samples.length>500)throw Error('invalid_benchmark_schema');
 const ids=new Set(CASES.map(c=>c.id)),models=new Set(MODELS);
 const byKey=new Map();
 for(const item of input.samples){
  if(!item||!ids.has(item.caseId)||!models.has(item.model))throw Error('unknown_case_or_model');
  const key=item.model+'|'+item.caseId;
  if(byKey.has(key))throw Error('duplicate_model_case');
  byKey.set(key,item);
 }
 const results=MODELS.map(model=>{
  let attempted=0,passed=0,failed=0,missing=0;
  let observedCount=0,pseudoCost=0,promptTokens=0,outputAndThinking=0,latencySum=0;
  const issues=[];
  for(const scenario of CASES){
   const e=byKey.get(model+'|'+scenario.id);
   const test=e?evaluateSample(e,scenario):{valid:false,reasons:['missing_sample']};
   if(test.valid){
    const usage=observedUsage(e,model);
    if(usage){
     observedCount++;pseudoCost+=usage.hypotheticalPaidTierUsd;
     promptTokens+=usage.prompt;
     outputAndThinking+=usage.candidate+usage.thinking;
     latencySum+=usage.latencyMs;
    }
   }
   if(!test.valid){missing++;issues.push({caseId:scenario.id,reasons:test.reasons});continue}
   attempted++;
   if(!test.reasons.length)passed++;else{failed++;issues.push({caseId:scenario.id,reasons:test.reasons})}
  }
  return {model,expected:CASES.length,attempted,missing,passed,failed,
   automatedPassRatio:attempted===CASES.length?Number((passed/attempted).toFixed(3)):null,
   observedUsageSamples:observedCount,
   // Never compare partially populated batches as if they represented the entire workload.
   estimatedBatchUsd:observedCount===CASES.length?Number(pseudoCost.toFixed(6)):null,
   meanLatencyMs:observedCount===CASES.length?Math.round(latencySum/observedCount):null,
   inputTokens:observedCount===CASES.length?promptTokens:null,
   outputIncludingThinkingTokens:observedCount===CASES.length?outputAndThinking:null,
   issues,decision:'HUMAN_REVIEW_REQUIRED_NOT_APPROVED'};
 });
 return {schemaVersion:1,fixtureMode:input.source==='EMPTY_TEMPLATE_NOT_MODEL_OUTPUT',
  rubric:'HEURISTIC_TEXT_CHECKS_ONLY_NOT_A_MODEL_QUALITY_VERDICT',
  pricingNote:'Observed response usageMetadata only when complete; USD calculation is PAID STANDARD TIER EQUIVALENT, NOT AN INVOICE; ignores cached-token discounts.',
  cases:CASES.length,results,
  releaseDecision:'BLOCKED_UNTIL_REAL_STAGING_SAMPLES_AND_HUMAN_REVIEW'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,file]=process.argv.slice(2);
 if(mode==='--template'&&!file){
  process.stdout.write(JSON.stringify(createResponseTemplate(),null,2)+'\n');
 }else if(mode==='--evaluate'&&file){
  const data=JSON.parse(readFileSync(file,'utf8'));
  process.stdout.write(JSON.stringify(evaluateModelResults(data),null,2)+'\n');
 }else{
  process.stderr.write('Usage: node scripts/gemini-quality-benchmark.mjs --template | --evaluate <redacted-results.json>\n');
  process.exitCode=2;
 }
}
