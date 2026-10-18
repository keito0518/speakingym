// Official standard-tier rates checked 2026-10-17:
// https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite
// Paid-tier equivalent, NOT an invoice (project free/paid tier is set at Google).
export const MODEL='gemini-3.5-flash-lite';
export const RATES={input:0.30,output:2.50,cachedInput:0.03};
export function usageRecord(result,kind){
 const m=result?.usageMetadata;
 if(!m||!Number.isFinite(m.promptTokenCount)||m.promptTokenCount<0)return null;
 const count=v=>Number.isFinite(v)&&v>=0?v:0;
 const input=count(m.promptTokenCount),output=count(m.candidatesTokenCount),thinking=count(m.thoughtsTokenCount);
 const cached=Math.min(input,count(m.cachedContentTokenCount));
 const usd=((input-cached)*RATES.input+cached*RATES.cachedInput+(output+thinking)*RATES.output)/1e6;
 return {event:'speakingym_gemini_usage_v2',kind,model:MODEL,
  inputTokens:input,outputTokens:output,thinkingTokens:thinking,cachedInputTokens:cached,
  totalTokens:Number.isFinite(m.totalTokenCount)?m.totalTokenCount:null,
  estimatedUsd:Number(usd.toFixed(8)),costBasis:'standard-paid-tier-equivalent',ratesChecked:'2026-10-17',
  finishReason:result?.candidates?.[0]?.finishReason||'unknown'};
}
export function logGeminiUsage(result,kind){try{const record=usageRecord(result,kind);if(record)console.log(JSON.stringify(record))}catch{}}

// Privacy-safe operational outcomes for measuring availability and p95 latency.
// No UID, IP address, utterances, tokens, or provider error bodies are emitted.
export function aiOutcomeRecord({kind,plan,status,code,durationMs}) {
 if(!['conversation','teacher'].includes(kind))return null;
 const safePlan=['free','pro'].includes(plan)?plan:'legacy';
 const safeStatus=Number.isInteger(status)&&status>=100&&status<=599?status:500;
 const safeCode=typeof code==='string'&&/^[a-z][a-z0-9_]{0,47}$/.test(code)?code:'unknown';
 const duration=Number.isFinite(durationMs)?Math.max(0,Math.min(120000,Math.round(durationMs))):0;
 return {event:'speakingym_ai_outcome_v1',kind,plan:safePlan,status:safeStatus,
  code:safeCode,latencyMs:duration,success:safeStatus>=200&&safeStatus<300};
}
export function logAiOutcome(input) {
 try {const record=aiOutcomeRecord(input);if(record)console.log(JSON.stringify(record))}catch{}
}
