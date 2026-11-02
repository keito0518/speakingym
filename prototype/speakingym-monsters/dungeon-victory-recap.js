// Victory loot is a view of already-verified results, never another award or
// a claim to have mastered spoken English. The player's answers stay ephemeral.
import { ALL_PROMPTS } from './monster-data.js';
import { EVOLUTION_XP, SECOND_EVOLUTION_XP, getMonsterProgress } from './monster-engine.js';
import { DUNGEON_SKILLS, summarizeDungeonAttempt } from './dungeon-learning.js';
import { listeningChallengeFor } from './listening-challenges.js';

const verified=new Set(['independent','supported']);
const safeAmount=value=>Number.isSafeInteger(value)&&value>0?value:0;

export function dungeonVictoryRecapFor(ended,save,{nextArea=null,canContinue=false,monsterName='仲間'}={}){
 if(ended?.mode!=='forest'||!ended.completedForest||ended.endless)return null;
 const outcomes=Array.isArray(ended.dungeonOutcomes)?ended.dungeonOutcomes:[];
 const promptById=new Map(ALL_PROMPTS.map(prompt=>[prompt.id,prompt]));
 const distinct=new Set();
 const expressions=outcomes.slice().reverse().flatMap(item=>{
  if(!verified.has(item?.outcome)||distinct.has(item.promptId))return [];
  const prompt=promptById.get(item.promptId);
  if(!prompt)return [];
  const english=prompt.kind==='listen'?listeningChallengeFor(prompt).audio:prompt.answer;
  if(typeof english!=='string'||!english.trim())return [];
  distinct.add(item.promptId);
  return [{kind:prompt.kind,label:DUNGEON_SKILLS[prompt.kind]?.label||'英語',
   english,independent:item.outcome==='independent'}];
 });
 // One recent verified result plus a different skill if available. The boss
 // may have dozens of attacks, but the victory screen must stay scannable.
 const first=expressions[0];
 const second=expressions.find(row=>row.kind!==first?.kind)||expressions[1];
 const highlights=[first,second].filter(Boolean);
 const growthId=save.ownedMonsters.includes(ended.companionId)?ended.companionId:save.selectedMonster;
 const growth=getMonsterProgress(save,growthId);
 const goal=growth.stage===0?EVOLUTION_XP:growth.stage===1?SECOND_EVOLUTION_XP:null;
 const floor=growth.stage===0?0:EVOLUTION_XP;
 const remaining=goal===null?0:Math.max(0,goal-growth.xp);
 const percent=goal===null?100:Math.min(100,Math.max(0,Math.round(100*(growth.xp-floor)/(goal-floor))));
 const wallet=safeAmount(save.xpWallet);
 const answerXp=safeAmount(ended.earnedXp);
 const medalXp=safeAmount(ended.bossMedal?.bonusXp);
 const report=summarizeDungeonAttempt(ended.areaId,outcomes);
 const needsReview=report.groups.find(group=>group.supported+group.review>0);
 const recommendation=goal!==null&&remaining<=wallet
  ?`${monsterName}を進化できるXPがたまったよ！「仲間を育てる」からXPをあげよう。`
  :canContinue&&nextArea
  ?`次は「${nextArea.name}」へ！ 新しい英語の場面に挑戦しよう。`
  :needsReview
  ?`次は${needsReview.label}の復習がおすすめ。下の学習レポートから確認しよう。`
  :'次は難易度を上げるか、同じ場面を別の言い方で試そう。';
 return {
  xp:{answers:answerXp,medal:medalXp,total:answerXp+medalXp,wallet},
  expressions:highlights,
  evolution:{monsterId:growthId,monsterName,level:growth.level,xp:growth.xp,stage:growth.stage,
   label:goal===null?'第2進化達成！':growth.stage===0?'第1進化':'第2進化（Lv.7）',
   goal,remaining,percent,canEvolve:goal!==null&&remaining<=wallet},
  recommendation
 };
}
