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
