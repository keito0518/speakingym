// Offline spaced retrieval: NEXT-DAY -> 3-DAY -> 7-DAY.
// A repeat on the same day, a hint, or a skipped answer cannot advance a
// retention stage. Stages describe task recall, never a speech pronunciation score.
import { ALL_PROMPTS } from './monster-data.js';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'));
const days=(date,count)=>{
 const t=new Date(date+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+count);
 return t.toISOString().slice(0,10);
};
export const RETENTION_INTERVALS=Object.freeze([1,3,7]);
export const retentionKey=prompt=>prompt.id;
export function sanitizeRetention(raw){
 const ids=new Set(ALL_PROMPTS.map(p=>p.id));
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 return Object.fromEntries(Object.entries(raw).filter(([id,v])=>
  ids.has(id)&&v&&Number.isInteger(v.stage)&&v.stage>=0&&v.stage<=3&&
  validDate(v.lastDay)&&validDate(v.nextDay)&&v.nextDay>=v.lastDay
 ).slice(-256).map(([id,v])=>[id,{stage:v.stage,lastDay:v.lastDay,nextDay:v.nextDay}]));
}
export function recordRetention(save,promptId,rating,today){
 const prompt=ALL_PROMPTS.find(p=>p.id===promptId);
 if(!prompt||!['smooth','hint','again'].includes(rating)||!validDate(today))throw Error('Invalid retention attempt');
 const retention={...(save.retention||{})},before=retention[prompt.id]||null;
 if(before&&today<before.lastDay)return {save,stageChanged:false};
 let stage=before?.stage||0;
 if(rating==='again'){stage=0;}
 else if(rating==='smooth'&&(!before||today>=before.nextDay&&today>before.lastDay)){
  stage=Math.min(3,stage+1);
 }
 // A hint does not erase previously established spaced practice, but moves
 // its next test to tomorrow. Same-day repeats never skip a calendar interval.
 let due=rating==='smooth'&&before&&today<before.nextDay?before.nextDay:
  days(today,rating==='smooth'?RETENTION_INTERVALS[Math.max(0,stage-1)]:1);
 if(before&&today===before.lastDay&&rating==='smooth')due=before.nextDay;
 if(before&&today===before.lastDay&&rating!=='again'&&rating!=='hint')stage=before.stage;
 retention[prompt.id]={stage,lastDay:today,nextDay:due};
 return {save:{...save,retention},stageChanged:stage>(before?.stage||0),stage,nextDay:due};
}
export function retentionOverview(save,today){
 if(!validDate(today))throw Error('Invalid review day');
 const records=sanitizeRetention(save.retention);
 const pending=Object.entries(records).map(([id,record])=>{
  const prompt=ALL_PROMPTS.find(p=>p.id===id);
  return {id,prompt,kind:prompt.kind,stage:record.stage,nextDay:record.nextDay,
   due:record.nextDay<=today};
 }).sort((a,b)=>Number(b.due)-Number(a.due)||a.nextDay.localeCompare(b.nextDay)||a.id.localeCompare(b.id));
 return {due:pending.filter(v=>v.due),upcoming:pending.filter(v=>!v.due),
  stable:pending.filter(v=>v.stage===3),total:pending.length};
}
export function retentionTitle(stage){
 return ['もう一度確認','翌日チェック達成','3日後チェック達成','7日後チェック達成'][Math.max(0,Math.min(3,stage))];
}
