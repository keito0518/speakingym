// Speakingym privacy-preserving cost/SLA rollup. Reads local redacted log lines.
// All output is aggregate; never prints original logs, user IDs, IPs, or text.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const USDJPY_FALLBACK=150;
const KIND={conversation:'conversation',reflex_coach:'teacher',teacher:'teacher'};
const PLANS=['free','pro','legacy'];
const EVENTS=new Set(['speakingym_gemini_usage_v2','speakingym_ai_outcome_v1']);
function safePlan(v){return PLANS.includes(v)?v:'legacy'}
function percentile(values,p){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return sorted[Math.ceil(p*sorted.length)-1];
}
function round(n,digits=4){return Number(n.toFixed(digits))}
function validFinite(n){return typeof n==='number' && Number.isFinite(n) && n>=0}
function group(){return {calls:0,estimatedUsd:0,inputTokens:0,outputTokens:0,thinkingTokens:0,
 statuses:{total:0,success:0,failed:0},latencies:[],errorCounts:{}}}
export function analyzeAiLogs(contents,{usdJpy=USDJPY_FALLBACK}={}){
 if(!validFinite(usdJpy)||usdJpy<1||usdJpy>1000)throw Error('Invalid USD/JPY assumption');
 if(typeof contents!=='string')throw Error('Expected UTF-8 JSONL text');
 const groups=new Map(),recognized={usage:0,outcomes:0},ignored={malformed:0,other:0};
 const get=(kind,plan)=>{const key=kind+':'+plan;if(!groups.has(key))groups.set(key,group());return groups.get(key)};
 for(const line of contents.split(/\r?\n/)){
  const raw=line.trim();if(!raw)continue;
  // Some log exporters prefix JSON with date/time; match only a JSON object containing event.
  const start=raw.indexOf('{');if(start<0){ignored.other++;continue}
  let item;
  try{item=JSON.parse(raw.slice(start))}catch{ignored.malformed++;continue}
  if(!item||!EVENTS.has(item.event)){ignored.other++;continue}
  const kind=KIND[item.kind],plan=safePlan(item.plan);
  if(!kind){ignored.other++;continue}
  const g=get(kind,plan);
  if(item.event==='speakingym_gemini_usage_v2'){
   if(!validFinite(item.estimatedUsd)||item.estimatedUsd>10 ||
      !validFinite(item.inputTokens)||!validFinite(item.outputTokens)||
      !validFinite(item.thinkingTokens)){
    ignored.malformed++;continue
   }
   g.calls++;g.estimatedUsd+=item.estimatedUsd;
   g.inputTokens+=item.inputTokens;g.outputTokens+=item.outputTokens;g.thinkingTokens+=item.thinkingTokens;
   recognized.usage++;
  }else{
   if(!Number.isInteger(item.status)||item.status<100||item.status>599||
      !validFinite(item.latencyMs)||item.latencyMs>120000){ignored.malformed++;continue}
   g.statuses.total++;
   if(item.success===true && item.status>=200&&item.status<300)g.statuses.success++;
   else {g.statuses.failed++;const code=typeof item.code==='string'&&/^[a-z][a-z0-9_]{0,47}$/.test(item.code)?item.code:'unknown';g.errorCounts[code]=(g.errorCounts[code]||0)+1}
   g.latencies.push(item.latencyMs);
   recognized.outcomes++;
  }
 }
 const summary={basis:'paid-tier-equivalent, NOT an actual invoice',assumedUsdJpy:usdJpy,
  recognized,ignored,groups:{},fullUseProEstimate:null,decision:'insufficient_real_usage_data'};
 for(const [key,g] of groups){
  const avg=g.calls?g.estimatedUsd/g.calls:null;
  summary.groups[key]={modelCalls:g.calls,costJpy:round(g.estimatedUsd*usdJpy,2),
   avgCostJpy:avg===null?null:round(avg*usdJpy),
   avgTokens:g.calls?{input:round(g.inputTokens/g.calls,1),output:round(g.outputTokens/g.calls,1),thinking:round(g.thinkingTokens/g.calls,1)}:null,
   outcomes:g.statuses.total,successRatePct:g.statuses.total?round(100*g.statuses.success/g.statuses.total,2):null,
   p95LatencyMs:percentile(g.latencies,0.95),errorCounts:g.errorCounts};
 }
 const proConv=groups.get('conversation:pro'),proTeacher=groups.get('teacher:pro');
 if(proConv?.calls&&proTeacher?.calls){
  const projectedUsd=600*proConv.estimatedUsd/proConv.calls + 100*proTeacher.estimatedUsd/proTeacher.calls;
  const adequateSample=proConv.calls>=30 && proTeacher.calls>=10;
  summary.decision=adequateSample?'review_measured_cost_and_free_burden':'insufficient_real_usage_data';
  summary.fullUseProEstimate={sampleSufficientForReview:adequateSample,sampledProConversationRequests:proConv.calls,sampledProTeacherRequests:proTeacher.calls,
   aiJpyAt600TurnsAnd100Teacher:round(projectedUsd*usdJpy,2),
   after680JpyAndIllustrative4_3PctStripe:round(680-680*.043-projectedUsd*usdJpy,2),
   note:'Sample-based projection. Excludes Free costs, taxes, Cloudflare, refunds, support and FX volatility.'};
 }
 return summary;
}
export function formatReport(report){return JSON.stringify(report,null,2)+'\n'}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const filename=process.argv[2];
 if(!filename){console.error('Usage: node scripts/ai-cost-report.mjs /local/redacted/worker-logs.jsonl');process.exitCode=2}
 else {
  try{
   const max=25*1024*1024;
   const raw=readFileSync(filename);
   if(raw.length>max)throw Error('Log sample exceeds 25MB; analyze smaller batches');
   console.log(formatReport(analyzeAiLogs(raw.toString('utf8'),{usdJpy:Number(process.env.SG_USDJPY||USDJPY_FALLBACK)})));
  }catch(error){console.error('Could not produce report: '+error.message);process.exitCode=1}
 }
}
