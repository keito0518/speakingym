// Victory loot is a view of already-verified results, never another award or
// a claim to have mastered spoken English. The player's answers stay ephemeral.
import { ALL_PROMPTS } from './monster-data.js';
import { EVOLUTION_XP, getMonsterProgress } from './monster-engine.js';
import { DUNGEON_SKILLS, summarizeDungeonAttempt } from './dungeon-learning.js';
import { listeningChallengeFor } from './listening-challenges.js';
import { BOSS_MEDAL_NAMES, bossTrainingBonus } from './boss-mastery.js';

const verified=new Set(['independent','supported']);
const safeAmount=value=>Number.isSafeInteger(value)&&value>0?value:0;

// A repeatable, evidence-based goal for the *next* medal. Use the best
// previously earned rank for XP so a worse replay cannot promise a reward.
export function nextBossMedalGoal(medal){
 if(!medal||!['easy','normal','hard'].includes(medal.difficulty)||
   !Number.isInteger(medal.best)||medal.best<0||medal.best>3||
   !Number.isInteger(medal.total)||medal.total<=3)return null;
 if(medal.best===3)return null;
 const nextRank=medal.best+1;
 const total=medal.total;
 const independent=Math.min(total,Math.max(0,Number(medal.independent)||0));
 const independentBoss=Math.min(3,Math.max(0,Number(medal.independentBoss)||0));
 const verifiedBoss=Math.min(3,Math.max(0,Number(medal.verifiedBoss)||0));
 const goal=nextRank===1
  ?`ボス3問を確認（今回 ${verifiedBoss}/3問）。ヒントありの確認はOK。例文を見ただけ・判定保留では勲章に数えないよ。`
  :nextRank===2
  ?`全${total}問を確認し、うち${Math.ceil(total*.75)}問以上を自力で。ボスも2/3問を自力で答えよう（今回 全体${independent}問・ボス${independentBoss}問）。`
  :`全${total}問とボス3問をヒントなしで答えよう（今回 全体${independent}問・ボス${independentBoss}問）。`;
 return {nextRank,label:BOSS_MEDAL_NAMES[nextRank],bonusXp:bossTrainingBonus(medal.difficulty,medal.best,nextRank),goal};
}

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
  return [{promptId:prompt.id,kind:prompt.kind,label:DUNGEON_SKILLS[prompt.kind]?.label||'英語',
   english,independent:item.outcome==='independent'}];
 });
 // One recent verified result plus a different skill if available. The boss
 // may have dozens of attacks, but the victory screen must stay scannable.
 const first=expressions[0];
 const second=expressions.find(row=>row.kind!==first?.kind)||expressions[1];
 const highlights=[first,second].filter(Boolean);
 const growthId=save.ownedMonsters.includes(ended.companionId)?ended.companionId:save.selectedMonster;
 const growth=getMonsterProgress(save,growthId);
 const goal=growth.nextEvolutionXp;
 const floor=growth.stage===0?0:EVOLUTION_XP;
 const remaining=goal===null?0:Math.max(0,goal-growth.xp);
 const percent=goal===null?100:Math.min(100,Math.max(0,Math.round(100*(growth.xp-floor)/(goal-floor))));
 const wallet=safeAmount(save.xpWallet);
 const answerXp=safeAmount(ended.earnedXp);
 const medalXp=safeAmount(ended.bossMedal?.bonusXp);
 const report=summarizeDungeonAttempt(ended.areaId,outcomes);
 const medalGoal=nextBossMedalGoal(ended.bossMedal);
 const needsReview=report.groups.find(group=>group.supported+group.review>0);
 const recommendation=growth.canEvolve
  ?`${monsterName}の試練達成！「仲間を育てる」から進化させよう。`
  :goal!==null&&remaining<=wallet&&growth.trialCount<growth.requiredTrials
  ?`${monsterName}の進化まであと${growth.requiredTrials-growth.trialCount}エリア。違うボスを一緒に倒そう！`
  :goal!==null&&remaining<=wallet
  ?`${monsterName}の進化に必要なXPがあるよ！「仲間を育てる」で使おう。`
  :canContinue&&nextArea
  ?`次は「${nextArea.name}」へ！ 新しい英語の場面に挑戦しよう。`
  :needsReview
  ?`次は${needsReview.label}の復習がおすすめ。下の学習レポートから確認しよう。`
  :'次は難易度を上げるか、同じ場面を別の言い方で試そう。';
 return {
  xp:{answers:answerXp,medal:medalXp,total:answerXp+medalXp,wallet},
  expressions:highlights,
  medalGoal,
  evolution:{monsterId:growthId,monsterName,level:growth.level,xp:growth.xp,stage:growth.stage,
   label:goal===null?'第2進化達成！':growth.stage===0?'第1進化（Lv.5＋ボス1エリア）':'第2進化（Lv.10＋ボス3エリア）',
   goal,remaining,percent,trialCount:growth.trialCount,requiredTrials:growth.requiredTrials,
   canEvolve:growth.canEvolve,canReachWithWallet:goal!==null&&remaining<=wallet&&growth.trialCount>=growth.requiredTrials},
  recommendation
 };
}
