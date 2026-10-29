// Optional, repeatable boss-clear goals. Only authored chapter questions count:
// reactive defense questions never inflate a clear rank. Medals grant no XP,
// unlocks, grading overrides or battle advantages.
export const BOSS_MEDAL_NAMES=Object.freeze(['未獲得','銅','銀','金']);
export const BOSS_MEDAL_DIFFICULTIES=Object.freeze(['easy','normal','hard']);

export function cleanBossMedals(source,areaIds){
 const input=source&&typeof source==='object'&&!Array.isArray(source)?source:{};
 const cleaned={};
 for(const areaId of areaIds){
  const levels=input[areaId];
  if(!levels||typeof levels!=='object'||Array.isArray(levels))continue;
  const valid={};
  for(const difficulty of BOSS_MEDAL_DIFFICULTIES){
   const rank=levels[difficulty];
   if(Number.isInteger(rank)&&rank>=1&&rank<=3)valid[difficulty]=rank;
  }
  if(Object.keys(valid).length)cleaned[areaId]=valid;
 }
 return cleaned;
}

// The final three prompts are the required boss confirmations. To earn even
// bronze, all three must be *verified*, not merely passed as ungraded practice.
// Gold requires a clean, unassisted answer on every chapter question.
export function evaluateBossMedal(prompts,outcomes,{bossHits=3}={}){
 if(!Array.isArray(prompts)||prompts.length<=bossHits||bossHits!==3||!Array.isArray(outcomes))
  throw new Error('Invalid boss medal attempt');
 const byPrompt=new Map();
 for(const row of outcomes){
  if(!row||typeof row.promptId!=='string')continue;
  if(!['independent','supported','review'].includes(row.outcome))continue;
  if(!byPrompt.has(row.promptId))byPrompt.set(row.promptId,[]);
  byPrompt.get(row.promptId).push(row.outcome);
 }
 const stages=prompts.map(prompt=>{
  const attempts=byPrompt.get(prompt.id)||[];
  return {verified:attempts.includes('independent')||attempts.includes('supported'),
   independent:attempts.length===1&&attempts[0]==='independent'};
 });
 const boss=stages.slice(-bossHits);
 const verifiedBoss=boss.filter(row=>row.verified).length;
 const independentBoss=boss.filter(row=>row.independent).length;
 const verified=stages.filter(row=>row.verified).length;
 const independent=stages.filter(row=>row.independent).length;
 let rank=0;
 if(verifiedBoss===bossHits){
  rank=1;
  if(verified===stages.length&&independentBoss>=2&&independent>=Math.ceil(stages.length*.75))rank=2;
  if(verified===stages.length&&independentBoss===bossHits&&independent===stages.length)rank=3;
 }
 return {rank,verified,independent,total:stages.length,verifiedBoss,independentBoss};
}
