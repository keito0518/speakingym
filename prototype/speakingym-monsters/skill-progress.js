// Evidence-based four-skill progress. This is NOT a pronunciation score.
// Only verified, rewarded tasks are sampled; unsupported responses and
// transcript-only listening practice never become a successful answer.
import {ALL_PROMPTS} from './monster-data.js';
import {retentionOverview} from './retention.js';

export const SKILL_KINDS=Object.freeze(['speak','listen','vocab','grammar']);
export const SKILL_LABELS=Object.freeze({speak:'スピーキング',listen:'リスニング',vocab:'単語',grammar:'文法'});
const RATINGS=new Set(['smooth','hint','again']);
const INPUT_SOURCES=new Set(['microphone','keyboard','unknown']);
const dayValid=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T12:00:00Z'));
const PROMPTS_BY_ID=new Map(ALL_PROMPTS.map(prompt=>[prompt.id,prompt]));

export function sanitizeSkillAttempts(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
 return Object.fromEntries(SKILL_KINDS.map(kind=>{
  const source=Array.isArray(raw[kind])?raw[kind]:[];
  const items=source.filter(row=>row&&typeof row==='object'&&!Array.isArray(row)&&
   PROMPTS_BY_ID.get(row.id)?.kind===kind&&dayValid(row.day)&&RATINGS.has(row.rating))
   .slice(-20).map(row=>({id:row.id,day:row.day,rating:row.rating,
     inputSource:kind==='speak'&&INPUT_SOURCES.has(row.inputSource)?row.inputSource:'unknown'}));
  return [kind,items];
 }));
}
export function appendSkillAttempt(raw,prompt,rating,day,inputSource='unknown'){
 if(!prompt||!RATINGS.has(rating)||!dayValid(day))throw Error('Invalid skill attempt');
 const attempts=sanitizeSkillAttempts(raw);
 // Reading and other authored task kinds remain playable; they are not
 // falsely counted as one of the four advertised dashboard skills.
 if(!SKILL_KINDS.includes(prompt.kind))return attempts;
 attempts[prompt.kind]=[...attempts[prompt.kind],{id:prompt.id,day,rating,
   inputSource:prompt.kind==='speak'&&INPUT_SOURCES.has(inputSource)?inputSource:'unknown'}].slice(-20);
 return attempts;
}
function dueIdSet(save,today){
 const ids=new Set(Object.entries(save.reviewPrompts||{}).filter(([,date])=>typeof date==='string'&&date<=today).map(([id])=>id));
 for(const row of retentionOverview(save,today).due)ids.add(row.id);
 for(const [id,row] of Object.entries(save.quizProgress||{})){
  if(row&&!row.resolved&&row.misses>0&&typeof row.nextReviewDay==='string'&&row.nextReviewDay<=today)ids.add(id);
 }
 return ids;
}
export function skillProgressFor(save,today){
 if(!dayValid(today))throw Error('Invalid skill summary day');
 const attempts=sanitizeSkillAttempts(save.skillAttempts);
 const due=dueIdSet(save,today);
 return SKILL_KINDS.map(kind=>{
  const recent=attempts[kind]||[];
  const independentlyConfirmed=recent.filter(row=>row.rating==='smooth').length;
  const assisted=recent.filter(row=>row.rating==='hint').length;
  // A speech transcript recognized by the browser is evidence of microphone
  // use, NOT proof of pronunciation, spontaneous fluency or comprehension.
  // iOS keyboard dictation is indistinguishable from typing on the Web.
  const microphone=kind==='speak'?recent.filter(row=>row.inputSource==='microphone').length:0;
  const keyboard=kind==='speak'?recent.filter(row=>row.inputSource==='keyboard').length:0;
  const needsReview=[...due].filter(id=>PROMPTS_BY_ID.get(id)?.kind===kind).length;
  const spaced=Object.entries(save.retention||{}).filter(([id,row])=>PROMPTS_BY_ID.get(id)?.kind===kind&&
    row&&Number.isInteger(row.stage)&&row.stage>=2&&!row.recoveryPhase).length;
  return {kind,label:SKILL_LABELS[kind],sample:recent.length,independent:independentlyConfirmed,
    microphone,keyboard,
    assisted,needsReview,spaced,
    percent:recent.length?Math.round(100*independentlyConfirmed/recent.length):null};
 });
}

/**
 * Show real before/after examples, never a guessed fluency score. A task must
 * first need help (or be missed), then be completed without help on a later
 * calendar day. Same-day retries do not prove spaced improvement. Only the
 * latest attempt for that exact task is eligible, so a later miss removes it.
 */
export function improvementHighlightsFor(save,{today,limit=3}={}){
 if(!dayValid(today)||!Number.isInteger(limit)||limit<1||limit>80)throw Error('Invalid improvement options');
 const history=sanitizeSkillAttempts(save.skillAttempts),highlights=[];
 for(const kind of SKILL_KINDS){
  const byId=new Map();
  for(const row of history[kind]){
   if(row.day>today)continue;
   if(!byId.has(row.id))byId.set(row.id,[]);
   byId.get(row.id).push(row);
  }
  for(const [id,rows] of byId){
   const chronological=rows.map((row,index)=>({...row,index})).sort((a,b)=>a.day.localeCompare(b.day)||a.index-b.index);
   const latest=chronological.at(-1);
   if(latest.rating!=='smooth')continue;
   const previous=chronological.slice(0,-1).reverse().find(row=>row.day<latest.day&&row.rating!=='smooth');
   if(!previous)continue;
   const prompt=PROMPTS_BY_ID.get(id);
   highlights.push({id,kind,label:SKILL_LABELS[kind],scene:prompt.scene||'',
    cue:prompt.cue||'',expression:kind==='speak'?prompt.answer||'':'',
    before:previous.rating,previousDay:previous.day,afterDay:latest.day,
    inputSource:kind==='speak'?latest.inputSource:'unknown'});
  }
 }
 return highlights.sort((a,b)=>b.afterDay.localeCompare(a.afterDay)||
   a.previousDay.localeCompare(b.previousDay)||a.id.localeCompare(b.id)).slice(0,limit);
}
// One-tap targeted drill: due tasks first, then untried tasks, then the least
// recently practiced. No repeated difficulty variant of the same base task.
export function skillFocusPrompts(save,kind,{difficulty='easy',today,size=6}={}){
 if(!SKILL_KINDS.includes(kind)||!['easy','normal','hard'].includes(difficulty)||!dayValid(today)||
    !Number.isInteger(size)||size<1||size>12)throw Error('Invalid skill focus');
 const due=dueIdSet(save,today),history=sanitizeSkillAttempts(save.skillAttempts)[kind]||[];
 const lastSeen=new Map(history.map((row,index)=>[row.id,index]));
 const pool=ALL_PROMPTS.filter(prompt=>prompt.kind===kind&&!prompt.bossOnly&&
   (prompt.difficulty||'easy')===difficulty);
 pool.sort((a,b)=>Number(due.has(b.id))-Number(due.has(a.id))||
   Number(lastSeen.has(a.id))-Number(lastSeen.has(b.id))||
   (lastSeen.get(a.id)??-1)-(lastSeen.get(b.id)??-1)||
   a.id.localeCompare(b.id));
 const chosen=[],bases=new Set();
 for(const prompt of pool){
  const base=prompt.baseId||prompt.id;
  if(bases.has(base))continue;
  bases.add(base);chosen.push(prompt);
  if(chosen.length>=size)break;
 }
 return chosen;
}

/**
 * Pick one actionable weak area only when the user's records support it.
 * Due questions at the selected difficulty outrank a low self-recall rate.
 * Four independent attempts, spanning at least two authored questions, are
 * required before describing a skill as weak. No guessed AI proficiency.
 */
export function nextSkillFocusFor(save,{difficulty=save.difficulty||'easy',today}={}){
 if(!['easy','normal','hard'].includes(difficulty)||!dayValid(today))throw Error('Invalid focus options');
 const due=dueIdSet(save,today),history=sanitizeSkillAttempts(save.skillAttempts);
 const choices=SKILL_KINDS.map(kind=>{
  const eligible=ALL_PROMPTS.filter(p=>p.kind===kind&&!p.bossOnly&&(p.difficulty||'easy')===difficulty);
  const eligibleIds=new Set(eligible.map(p=>p.id));
  if(!eligible.length)return null;
  const dueNow=eligible.filter(p=>due.has(p.id)).length;
  const records=(history[kind]||[]).filter(row=>eligibleIds.has(row.id));
  const independent=records.filter(row=>row.rating==='smooth').length;
  const pct=records.length?Math.round(100*independent/records.length):null;
  const meaningful=records.length>=4&&new Set(records.map(row=>row.id)).size>=2;
  return {kind,label:SKILL_LABELS[kind],due:dueNow,sample:records.length,percent:pct,
    evidence:meaningful,hasTasks:eligible.length>0};
 }).filter(Boolean);
 const dueChoices=choices.filter(row=>row.due>0).sort((a,b)=>b.due-a.due||a.sample-b.sample||SKILL_KINDS.indexOf(a.kind)-SKILL_KINDS.indexOf(b.kind));
 if(dueChoices.length){
  const row=dueChoices[0];
  return {kind:row.kind,label:row.label,reason:'due',due:row.due,detail:`期限が来た${row.label}の問題が${row.due}問。まず自力で確認しよう。`};
 }
 const weak=choices.filter(row=>row.evidence&&row.percent<=65)
  .sort((a,b)=>a.percent-b.percent||b.sample-a.sample||SKILL_KINDS.indexOf(a.kind)-SKILL_KINDS.indexOf(b.kind));
 if(weak.length){
  const row=weak[0];
  return {kind:row.kind,label:row.label,reason:'needs-practice',due:0,
    detail:`同じ難易度の直近${row.sample}回答で、自力確認が${row.percent}%。違う問題でも試そう。`};
 }
 return null;
}
