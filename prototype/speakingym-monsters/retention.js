// Offline spaced retrieval: NEXT-DAY -> 3-DAY -> 7-DAY.
// A repeat on the same day, a hint, or a skipped answer cannot advance a
// retention stage. Stages describe task recall, never a speech pronunciation score.
import { ALL_PROMPTS } from './monster-data.js';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'));
const days=(date,count)=>{
 const t=new Date(date+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+count);
 return t.toISOString().slice(0,10);
};
export const RETENTION_INTERVALS=Object.freeze([1,3,7,14]);
export const retentionKey=prompt=>prompt.id;
export function sanitizeRetention(raw){
 const ids=new Set(ALL_PROMPTS.map(p=>p.id));
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 return Object.fromEntries(Object.entries(raw).filter(([id,v])=>
  ids.has(id)&&v&&Number.isInteger(v.stage)&&v.stage>=0&&v.stage<=4&&
  validDate(v.lastDay)&&validDate(v.nextDay)&&v.nextDay>=v.lastDay
 ).slice(-512).map(([id,v])=>[id,{
  stage:v.stage,lastDay:v.lastDay,nextDay:v.nextDay,
  ...(['retry','wait'].includes(v.recoveryPhase)?{recoveryPhase:v.recoveryPhase}:{})
 }]));
}
export function recordRetention(save,promptId,rating,today){
 const prompt=ALL_PROMPTS.find(p=>p.id===promptId);
 if(!prompt||!['smooth','hint','again'].includes(rating)||!validDate(today))throw Error('Invalid retention attempt');
 const retention=sanitizeRetention(save.retention),before=retention[prompt.id]||null;
 if(before&&today<before.lastDay)return {save,stageChanged:false};
 let stage=before?.stage||0;
 let recoveryPhase=before?.recoveryPhase||null;
 let due;
 if(rating==='again'){
  stage=0;recoveryPhase=null;due=days(today,1);
 }else if(rating==='hint'){
  // Hints must not count as an independently retained skill. A learner can
  // recover their old level without losing saved achievements, but a quick
  // next-day retry must NOT masquerade as a three/seven-day milestone.
  if(stage>0)recoveryPhase='retry';
  due=days(today,1);
 }else if(before&&(today<before.nextDay||today<=before.lastDay)){
  // Same-day and early drilling may earn normal practice XP, never a spaced
  // checkpoint. Preserve the existing due date and recovery requirement.
  due=before.nextDay;
 }else if(recoveryPhase==='retry'){
  recoveryPhase='wait';
  due=days(today,RETENTION_INTERVALS[Math.min(2,Math.max(0,stage-1))]);
 }else if(recoveryPhase==='wait'){
  recoveryPhase=null;
  due=days(today,RETENTION_INTERVALS[Math.min(3,stage)]);
 }else{
  stage=Math.min(4,stage+1);
  due=days(today,RETENTION_INTERVALS[stage-1]);
 }
 retention[prompt.id]={stage,lastDay:today,nextDay:due,
  ...(recoveryPhase?{recoveryPhase}:{})};
 return {save:{...save,retention},stageChanged:stage>(before?.stage||0),stage,nextDay:due,recovering:Boolean(recoveryPhase)};
}
export function retentionOverview(save,today){
 if(!validDate(today))throw Error('Invalid review day');
 const records=sanitizeRetention(save.retention);
 const pending=Object.entries(records).map(([id,record])=>{
  const prompt=ALL_PROMPTS.find(p=>p.id===id);
  return {id,prompt,kind:prompt.kind,stage:record.stage,nextDay:record.nextDay,
   recovering:Boolean(record.recoveryPhase),
   due:record.nextDay<=today};
 }).sort((a,b)=>Number(b.due)-Number(a.due)||a.nextDay.localeCompare(b.nextDay)||a.id.localeCompare(b.id));
 return {due:pending.filter(v=>v.due),upcoming:pending.filter(v=>!v.due),
  stable:pending.filter(v=>v.stage===4&&!v.recovering),total:pending.length};
}
// A scheduled checkpoint is always tested first on the exact original task.
// After established recall (stage 2+), optionally add a DIFFERENT speaking
// situation for the same expression. Transfer earns its own record; it never
// advances the original task's 1/3/7-day schedule or gives automatic XP.
export function retentionPracticePlan(save,today,{limit=12,maxTransfers=3}={}){
 if(!Number.isInteger(limit)||limit<1||limit>24||!Number.isInteger(maxTransfers)||maxTransfers<0||maxTransfers>12)
  throw Error('Invalid retention plan limits');
 const due=retentionOverview(save,today).due.slice(0,limit);
 const chosen=new Set(due.map(row=>row.id));
 const transfers=[];
 for(const row of due){
  if(transfers.length>=maxTransfers||chosen.size>=limit)break;
  if(row.stage<2||row.recovering||!['speak','read'].includes(row.prompt.kind))continue;
  const alternatives=ALL_PROMPTS.filter(prompt=>
   !prompt.bossOnly&&['speak','read'].includes(prompt.kind)&&
   prompt.phraseId===row.prompt.phraseId&&
   (prompt.difficulty||'easy')===(row.prompt.difficulty||'easy')&&
   (prompt.baseId||prompt.id)!==(row.prompt.baseId||row.prompt.id)&&!chosen.has(prompt.id));
  alternatives.sort((a,b)=>{
   const tried=p=>Boolean(save.retention?.[p.id]||save.reviewPrompts?.[p.id]);
   return Number(tried(a))-Number(tried(b))||a.id.localeCompare(b.id);
  });
  if(alternatives.length){const next=alternatives[0];chosen.add(next.id);transfers.push(next);}
 }
 return {prompts:[...due.map(row=>row.prompt),...transfers],dueIds:due.map(row=>row.id),transferIds:transfers.map(p=>p.id)};
}
export function retentionTitle(stage){
 return ['もう一度確認','初回練習完了','翌日チェック達成','3日後チェック達成','7日後チェック達成'][Math.max(0,Math.min(4,stage))];
}
