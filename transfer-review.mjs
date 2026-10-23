/* Privacy-first review scheduling for transfer checks.
 * Derive schedule only from sanitized local self-reports. No new secrets, quota
 * counters, audio or transcript storage. Inference is about self-ratings only.
 */
import {TRANSFER_PAIRS,normalizeTransferResults,transferDay} from './transfer-data.mjs';
export const REVIEW_STEPS=Object.freeze([1,3,7]); // calendar days after a successful round
const MS_PER_DAY=86400000;
const DAY_RE=/^\d{4}-\d{2}-\d{2}$/;
function toDay(value){return typeof value==='string'&&DAY_RE.test(value)?value:null}
export function addDays(day,days){
 if(!toDay(day)||!Number.isSafeInteger(days)||Math.abs(days)>365)return null;
 const ms=Date.parse(day+'T00:00:00.000Z');
 return Number.isFinite(ms)?new Date(ms+days*MS_PER_DAY).toISOString().slice(0,10):null;
}
export function reviewSchedule(rawHistory=[],now=new Date()){
 const today=transferDay(now),pairs=new Map(TRANSFER_PAIRS.map(pair=>[pair.id,pair]));
 const ordered=normalizeTransferResults(rawHistory)
  .filter(x=>Date.parse(x.at)<=now.getTime()+5*60000)
  .sort((a,b)=>a.at.localeCompare(b.at));
 const state=new Map();
 for(const attempt of ordered){
  const day=transferDay(new Date(attempt.at));
  const last=state.get(attempt.pairId);
  // Multiple attempts on a single JST date represent ONE review occasion.
  // Use the last self-rating for that date rather than inflating streaks.
  const sameDay=last?.lastDay===day;
  const succeeded=attempt.first&&attempt.second;
  const streak=succeeded?(sameDay?Math.max(1,last?.streak||0):Math.min(3,(last?.streak||0)+1)):0;
  const delay=REVIEW_STEPS[Math.min(2,succeeded?streak:0)];
  state.set(attempt.pairId,{pairId:attempt.pairId,reason:pairs.get(attempt.pairId)?.reason||'other',
   lastDay:day,lastSuccess:succeeded,streak,dueDay:addDays(day,delay),
   lastFirst:attempt.first,lastSecond:attempt.second});
 }
 const entries=[...state.values()].sort((a,b)=>a.dueDay.localeCompare(b.dueDay)||a.pairId.localeCompare(b.pairId));
 const due=entries.filter(x=>x.dueDay<=today),upcoming=entries.filter(x=>x.dueDay>today);
 const latest=new Map();
 for(const attempt of ordered)latest.set(attempt.pairId,attempt);
 const first=entries.filter(x=>!x.lastSuccess).length;
 const both=entries.filter(x=>x.lastSuccess).length;
 return {today,entries,due,upcoming,attempts:ordered.length,practisedPairs:entries.length,
  needRetry:first,bothSaidNow:both,
  firstTry:ordered.filter((x,i)=>ordered.findIndex(y=>y.pairId===x.pairId)===i),
  followUps:entries.filter(e=>(ordered.filter(x=>x.pairId===e.pairId).length)>1).length};
}
export function chooseReviewPair(rawHistory=[],now=new Date(),reason=null){
 const schedule=reviewSchedule(rawHistory,now);
 if(!schedule.due.length)return null;
 const due=[...schedule.due].sort((a,b)=>{
  const focusedA=reason===a.reason?1:0,focusedB=reason===b.reason?1:0;
  if(focusedA!==focusedB)return focusedB-focusedA;
  return a.dueDay.localeCompare(b.dueDay)||a.pairId.localeCompare(b.pairId);
 });
 return TRANSFER_PAIRS.find(p=>p.id===due[0].pairId)||null;
}
export function reviewTrend(rawHistory=[]){
 const clean=normalizeTransferResults(rawHistory).sort((a,b)=>a.at.localeCompare(b.at));
 const pairs=new Map();
 for(const x of clean){
  if(!pairs.has(x.pairId))pairs.set(x.pairId,{first:x,last:x,count:0});
  const record=pairs.get(x.pairId);record.last=x;record.count++;
 }
 const repeated=[...pairs.values()].filter(v=>v.count>=2);
 return {repeatedPairs:repeated.length,improvedSelfRatings:repeated.filter(v=>!(v.first.first&&v.first.second)&&v.last.first&&v.last.second).length,
  maintainedSelfRatings:repeated.filter(v=>v.first.first&&v.first.second&&v.last.first&&v.last.second).length,
  stillPractising:repeated.filter(v=>!(v.last.first&&v.last.second)).length};
}
