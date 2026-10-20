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
 callCostsUsd:[],statuses:{total:0,success:0,failed:0},latencies:[],errorCounts:{}}}
// Cloudflare exports can be JSON arrays/objects as well as JSONL. Only the two
// allow-listed telemetry event shapes are analyzed. Incidental HTTP request
// metadata, logs, auth tokens, and transcript fields are NEVER reported.
function unpackExport(item,ignored,depth=0){
 if(depth>5){ignored.other++;return []}
 if(typeof item==='string'){
  const trimmed=item.trim();
  const first=trimmed.indexOf('{'),array=trimmed.indexOf('[');
  const pos=first<0?array:array<0?first:Math.min(first,array);
  if(pos<0){ignored.other++;return []}
  try{return unpackExport(JSON.parse(trimmed.slice(pos)),ignored,depth+1)}
  catch{ignored.malformed++;return []}
 }
 if(Array.isArray(item))return item.flatMap(v=>unpackExport(v,ignored,depth+1));
 if(item&&typeof item==='object'){
  if(EVENTS.has(item.event))return [item];
  // These are data-only envelope keys used by Cloudflare exports/tail logs.
  // Do not read arbitrary keys such as request, headers, user or exceptions.
  const keys=['message','logs','entries','events','records','results','data','line'];
  const nested=keys.filter(key=>Object.hasOwn(item,key)&&
   (typeof item[key]==='string'||typeof item[key]==='object')&&item[key]!==null);
  if(nested.length)return nested.flatMap(key=>unpackExport(item[key],ignored,depth+1));
 }
 ignored.other++;return [];
}
function readExport(contents,ignored){
 const source=contents.trim();
 if(!source)return [];
 // A pretty-printed JSON export must be parsed as a single document, not
 // line-by-line (which would silently drop most Cloudflare event records).
 try{
  const whole=JSON.parse(source);
  return unpackExport(whole,ignored);
 }catch{}
 return contents.split(/\r?\n/).flatMap(line=>{
  if(!line.trim())return [];
  return unpackExport(line,ignored);
 });
}
function projection(conversation,teacher,usdJpy,source){
 const plannedRequests=600,plannedTeacher=100,stripeAssumptionJpy=680*.043;
 const avg=plannedRequests*conversation.estimatedUsd/conversation.calls+
  plannedTeacher*teacher.estimatedUsd/teacher.calls;
 const p95Usd=plannedRequests*percentile(conversation.callCostsUsd,.95)+
  plannedTeacher*percentile(teacher.callCostsUsd,.95);
 const enough=conversation.calls>=30&&teacher.calls>=10;
 return {
  source,sampleSufficientForReview:enough,
  sampledProConversationRequests:source==='pro'?conversation.calls:0,
  sampledProTeacherRequests:source==='pro'?teacher.calls:0,
  sampledFreeConversationRequests:source==='free_proxy'?conversation.calls:0,
  sampledFreeTeacherRequests:source==='free_proxy'?teacher.calls:0,
  aiJpyAt600TurnsAnd100Teacher:round(avg*usdJpy,2),
  after680JpyAndIllustrative4_3PctStripe:round(680-stripeAssumptionJpy-avg*usdJpy,2),
  aiJpyIfEveryCallMatchedSampleP95:round(p95Usd*usdJpy,2),
  after680JpyAndStripeIfEveryCallMatchedSampleP95:round(680-stripeAssumptionJpy-p95Usd*usdJpy,2),
  note:source==='free_proxy'
   ?'CAUTION: Free usage is only a provisional proxy for future Pro usage, not observed Pro costs. Sample may omit failures and be biased by log sampling. Not a profit guarantee.'
   :'Sample-based paid-tier-equivalent forecast, NOT an invoice or maximum. Excludes Free cost, tax, hosting, refunds, model failures without usage metadata and FX risk.'
 };
}

export function analyzeAiLogs(contents,{usdJpy=USDJPY_FALLBACK}={}){
 if(!validFinite(usdJpy)||usdJpy<1||usdJpy>1000)throw Error('Invalid USD/JPY assumption');
 if(typeof contents!=='string')throw Error('Expected UTF-8 JSONL text');
 const groups=new Map(),recognized={usage:0,outcomes:0},ignored={malformed:0,other:0};
 const get=(kind,plan)=>{const key=kind+':'+plan;if(!groups.has(key))groups.set(key,group());return groups.get(key)};
 for(const item of readExport(contents,ignored)){
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
   g.calls++;g.estimatedUsd+=item.estimatedUsd;g.callCostsUsd.push(item.estimatedUsd);
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
  provenance:'Provided log export; production origin, coverage, and provider invoice NOT independently verified.',
  recognized,ignored,groups:{},fullUseProEstimate:null,freeAsProProxyEstimate:null,
  decision:'insufficient_real_usage_data',
  warnings:[
   'No personal speech, UID, IP or API keys are used or emitted by this report.',
   'Sampled or disabled Cloudflare logs can miss calls. Usage metadata may be absent on failed requests.',
   'p95 is NOT a maximum-cost cap; extreme expensive calls above p95 can materially affect profit even if most calls are cheap.',
   'Costs shown are paid-tier-equivalent estimates, not actual Google charges. Free users and tax/hosting are excluded from Pro revenue margins.'
  ]};
 for(const [key,g] of groups){
  const avg=g.calls?g.estimatedUsd/g.calls:null;
  summary.groups[key]={modelCalls:g.calls,costJpy:round(g.estimatedUsd*usdJpy,2),
   avgCostJpy:avg===null?null:round(avg*usdJpy),
   p95CostJpy:g.calls?round(percentile(g.callCostsUsd,.95)*usdJpy):null,
   maxCostJpy:g.calls?round(g.callCostsUsd.reduce((max,n)=>Math.max(max,n),0)*usdJpy):null,
   avgTokens:g.calls?{input:round(g.inputTokens/g.calls,1),output:round(g.outputTokens/g.calls,1),thinking:round(g.thinkingTokens/g.calls,1)}:null,
   outcomes:g.statuses.total,successRatePct:g.statuses.total?round(100*g.statuses.success/g.statuses.total,2):null,
   p95LatencyMs:percentile(g.latencies,0.95),errorCounts:g.errorCounts};
 }
 const proConv=groups.get('conversation:pro'),proTeacher=groups.get('teacher:pro');
 const freeConv=groups.get('conversation:free'),freeTeacher=groups.get('teacher:free');
 if(proConv?.calls&&proTeacher?.calls){
  summary.fullUseProEstimate=projection(proConv,proTeacher,usdJpy,'pro');
  if(summary.fullUseProEstimate.sampleSufficientForReview)summary.decision='review_measured_cost_and_free_burden';
 }
 // Speakingym is still a free beta. Do not require nonexistent paid Pro
 // accounts to inform a PROVISIONAL cost check of the same Gemini model.
 if(freeConv?.calls&&freeTeacher?.calls){
  summary.freeAsProProxyEstimate=projection(freeConv,freeTeacher,usdJpy,'free_proxy');
  if(!summary.fullUseProEstimate&&summary.freeAsProProxyEstimate.sampleSufficientForReview)
   summary.decision='review_free_proxy_not_live_profit';
 }
 if(!recognized.usage)summary.warnings.push('No Gemini usage events found; cannot estimate observed cost. Confirm Workers Logs is enabled and that AI requests actually occurred.');
 if(!recognized.outcomes)summary.warnings.push('No request outcome events found; success rate and latency cannot be inferred.');
 if(recognized.outcomes>recognized.usage)summary.warnings.push('More outcomes than usage records; some failed/blocked calls may not have token metadata or logs may be incomplete.');
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
