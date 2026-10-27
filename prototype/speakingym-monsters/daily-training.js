// Daily learning plan: local-only, deterministic and free of AI/API calls.
// A 5-minute *goal*, never a forced deadline while reading explanations.
// Select new, due review, and transfer tasks at the chosen difficulty.
import { ALL_PROMPTS } from './monster-data.js';
import { dayKey, quizWeaknessOverview } from './monster-engine.js';

const QUIZ_KINDS=new Set(['vocab','grammar']);
const eligible=(p,level)=>!p.bossOnly&&(p.difficulty||'easy')===level&&Boolean(p.answer)&&
  ['speak','listen','read','vocab','grammar'].includes(p.kind);
const baseId=p=>p.baseId||p.id;
export function dailyTrainingPlan(save,{difficulty=save.difficulty||'easy',today=dayKey(),size=8}={}){
 if(!['easy','normal','hard'].includes(difficulty)||!/^\d{4}-\d{2}-\d{2}$/.test(today)||size<1||size>12||!Number.isInteger(size))
   throw Error('Invalid daily training options');
 const pool=ALL_PROMPTS.filter(p=>eligible(p,difficulty)).sort((a,b)=>a.id.localeCompare(b.id));
 const weak=new Set(quizWeaknessOverview(save,today).due.map(q=>q.id));
 const review=new Set(Object.entries(save.reviewPrompts||{}).filter(([,due])=>due<=today).map(([id])=>id));
 const hasPracticed=p=>Boolean(save.progress?.[p.phraseId]?.attempts);
 const due=p=>weak.has(p.id)||review.has(p.id)||Boolean(save.retention?.[p.id]?.nextDay&&save.retention[p.id].nextDay<=today)||Boolean(save.progress?.[p.phraseId]?.nextReviewDay&&save.progress[p.phraseId].nextReviewDay<=today);
 const transfer=p=>hasPracticed(p)&&!QUIZ_KINDS.has(p.kind)&&
   !(save.progress?.[p.phraseId]?.smoothContexts||[]).includes(baseId(p));
 const selections=[],keys=new Set(),bases=new Set(),kinds=new Set(),phases=[];
 const put=(category,count,filter)=>{
  for(let i=0;i<count;i++){
   const candidates=pool.filter(p=>!keys.has(p.id)&&filter(p));
   if(!candidates.length)break;
   candidates.sort((a,b)=>{
    const score=p=>(
     (bases.has(baseId(p))?8:0)+
     (kinds.has(p.kind)?3:0)+
     ((save.savedPromptIds||[]).includes(p.id)?-1:0)
    );
    return score(a)-score(b)||a.id.localeCompare(b.id);
   });
   const chosen=candidates[0];selections.push(chosen);keys.add(chosen.id);
   bases.add(baseId(chosen));kinds.add(chosen.kind);phases.push(category);
  }
 };
 // Never claim an empty due queue is "review": empty buckets are visibly
 // filled with new or mixed work instead of manufacturing overdue learning.
 const newCount=Math.min(size,Math.max(1,Math.round(size*3/8)));
 const reviewCount=Math.min(size-newCount,Math.round(size*3/8));
 const transferCount=Math.max(0,size-newCount-reviewCount);
 put('review',reviewCount,due);
 put('transfer',transferCount,p=>transfer(p)&&!due(p));
 put('new',newCount,p=>!hasPracticed(p)&&!due(p));
 put('mixed',size-selections.length,p=>!hasPracticed(p));
 put('mixed',size-selections.length,p=>due(p));
 put('mixed',size-selections.length,()=>true);
 return {prompts:selections,phases,counts:{
  new:phases.filter(p=>p==='new').length,
  review:phases.filter(p=>p==='review').length,
  transfer:phases.filter(p=>p==='transfer').length,
  mixed:phases.filter(p=>p==='mixed').length
 }};
}
// Bounded, non-identifying daily completion record. Do not store transcript,
// microphone data, or network analytics. Incomplete sessions do not count.
export function recordDailyCompletion(save,{difficulty=save.difficulty||'easy',date=dayKey(),total,independent,hinted=0,elapsedSeconds}){
 if(!['easy','normal','hard'].includes(difficulty)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||
  !Number.isInteger(total)||total<1||total>12||
  !Number.isInteger(independent)||independent<0||independent>total||
  !Number.isInteger(hinted)||hinted<0||hinted>total-independent||
  !Number.isFinite(elapsedSeconds)||elapsedSeconds<0)
  throw Error('Invalid completed training metrics');
 const record={date,difficulty,total,independent,hinted,elapsedSeconds:Math.min(86400,Math.round(elapsedSeconds))};
 return {...save,dailyHistory:[...(save.dailyHistory||[]),record].slice(-40)};
}
export function dailyGrowthSummary(save){
 const records=Array.isArray(save.dailyHistory)?save.dailyHistory:[];
 const first=records[0]||null,last=records.at(-1)||null;
 const percentage=r=>r?Math.round(r.independent/r.total*100):null;
 // Compare like-for-like difficulty only, and require seven calendar days.
 const earlier=last?records.find(r=>r.difficulty===last.difficulty&&
   (new Date(last.date+'T12:00:00').getTime()-new Date(r.date+'T12:00:00').getTime())/86400000>=7):null;
 return {sessions:records.length,lastRate:percentage(last),firstRate:percentage(first),
   weekBeforeRate:percentage(earlier),changeSevenDays:earlier?percentage(last)-percentage(earlier):null,
   lastDuration:last?.elapsedSeconds??null};
}
