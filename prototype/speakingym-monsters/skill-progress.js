// Evidence-based four-skill progress. This is NOT a pronunciation score.
// Only verified, rewarded tasks are sampled; unsupported responses and
// transcript-only listening practice never become a successful answer.
import {ALL_PROMPTS} from './monster-data.js';
import {retentionOverview} from './retention.js';

export const SKILL_KINDS=Object.freeze(['speak','listen','vocab','grammar']);
export const SKILL_LABELS=Object.freeze({speak:'スピーキング',listen:'リスニング',vocab:'単語',grammar:'文法'});
const RATINGS=new Set(['smooth','hint','again']);
const dayValid=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T12:00:00Z'));
const PROMPTS_BY_ID=new Map(ALL_PROMPTS.map(prompt=>[prompt.id,prompt]));

export function sanitizeSkillAttempts(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 return Object.fromEntries(SKILL_KINDS.map(kind=>{
  const source=Array.isArray(raw[kind])?raw[kind]:[];
  const items=source.filter(row=>row&&typeof row==='object'&&!Array.isArray(row)&&
   PROMPTS_BY_ID.get(row.id)?.kind===kind&&dayValid(row.day)&&RATINGS.has(row.rating))
   .slice(-20).map(row=>({id:row.id,day:row.day,rating:row.rating}));
  return [kind,items];
 }));
}
export function appendSkillAttempt(raw,prompt,rating,day){
 if(!prompt||!RATINGS.has(rating)||!dayValid(day))throw Error('Invalid skill attempt');
 const attempts=sanitizeSkillAttempts(raw);
 // Reading and other authored task kinds remain playable; they are not
 // falsely counted as one of the four advertised dashboard skills.
 if(!SKILL_KINDS.includes(prompt.kind))return attempts;
 attempts[prompt.kind]=[...attempts[prompt.kind],{id:prompt.id,day,rating}].slice(-20);
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
  const needsReview=[...due].filter(id=>PROMPTS_BY_ID.get(id)?.kind===kind).length;
  const spaced=Object.entries(save.retention||{}).filter(([id,row])=>PROMPTS_BY_ID.get(id)?.kind===kind&&
    row&&Number.isInteger(row.stage)&&row.stage>=2&&!row.recoveryPhase).length;
  return {kind,label:SKILL_LABELS[kind],sample:recent.length,independent:independentlyConfirmed,
    assisted,needsReview,spaced,
    percent:recent.length?Math.round(100*independentlyConfirmed/recent.length):null};
 });
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
