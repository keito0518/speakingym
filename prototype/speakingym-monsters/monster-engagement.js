import { MONSTERS } from './monster-data.js';
import { companionUnlockProgress, dayKey } from './monster-engine.js';
import { DUNGEON_AREAS } from './forest-engine.js';
import { normalizeEconomy } from './monster-economy.js';

// Each chapter has three lifetime chests. Their XP is awarded once per chapter,
// only for consecutive independently confirmed answers in a story dungeon.
// A retry, hint or transcript-only fallback cannot advance the battle chain.
export const CHAIN_CHESTS = Object.freeze([
  Object.freeze({chain:3,xp:12,gold:8,name:'ブロンズの宝箱'}),
  Object.freeze({chain:5,xp:20,gold:14,name:'シルバーの宝箱'}),
  Object.freeze({chain:8,xp:35,gold:24,name:'ゴールドの宝箱'})
]);

const chestKey=(areaId,chain)=>`${areaId}:${chain}`;
const validArea=areaId=>DUNGEON_AREAS.some(area=>area.id===areaId);
export function nextChainChest(save,areaId){
  if(!validArea(areaId))return null;
  const collected=Array.isArray(save?.battleTreasures)?save.battleTreasures:[];
  return CHAIN_CHESTS.find(chest=>!collected.includes(chestKey(areaId,chest.chain)))||null;
}

export function chainChestAt(save,chain,areaId){
  if(!validArea(areaId))return null;
  const collected=Array.isArray(save?.battleTreasures)?save.battleTreasures:[];
  return CHAIN_CHESTS.find(chest=>chest.chain===chain&&!collected.includes(chestKey(areaId,chain)))||null;
}

export function awardChainChests(save,bestChain,areaId){
  if(!validArea(areaId))return {save,unlocked:[],bonusXp:0,bonusGold:0};
  const collected=new Set(Array.isArray(save.battleTreasures)?save.battleTreasures:[]);
  const unlocked=CHAIN_CHESTS.filter(chest=>bestChain>=chest.chain&&!collected.has(chestKey(areaId,chest.chain)));
  if(!unlocked.length)return {save,unlocked:[],bonusXp:0,bonusGold:0};
  const bonusXp=unlocked.reduce((total,chest)=>total+chest.xp,0);
  const coins=normalizeEconomy(save).coins;
  const bonusGold=Math.min(999999-coins,unlocked.reduce((total,chest)=>total+chest.gold,0));
  return {save:{...save,
    battleTreasures:[...collected,...unlocked.map(chest=>chestKey(areaId,chest.chain))].sort(),
    xpWallet:Math.min(1_000_000_000,Math.max(0,save.xpWallet||0)+bonusXp),
    coins:coins+bonusGold
  },unlocked,bonusXp,bonusGold};
}

const huntGates=progress=>[
  {key:'skill',label:progress.skillLabel,current:progress.currentSkill,required:progress.requiredSkill},
  {key:'forest',label:'森のボス',current:progress.areaCount,required:progress.requiredAreas},
  {key:'city',label:'雪の街のボス',current:progress.cityCount,required:progress.requiredCityAreas},
  {key:'ruins',label:'遺跡のボス',current:progress.ruinsCount,required:progress.requiredRuinsAreas},
  {key:'recall',label:`日を空けた復習（段階${progress.recallStage}）`,current:progress.currentRecall,required:progress.requiredRecall}
].filter(gate=>gate.required>0).map(gate=>({...gate,remaining:Math.max(0,gate.required-gate.current)}));

export function monsterHuntBoard(save,today=dayKey()){
  const owned=new Set(save.ownedMonsters||[]);
  const options=MONSTERS.filter(monster=>!owned.has(monster.id)).map(monster=>{
    const progress=companionUnlockProgress(save,monster,today);
    const gates=huntGates(progress);
    const score=gates.reduce((total,gate)=>total+gate.remaining*(gate.key==='recall'?5:gate.key==='skill'?1:4),0);
    const count=gates.reduce((total,gate)=>total+Math.min(gate.current,gate.required),0);
    const required=gates.reduce((total,gate)=>total+gate.required,0);
    const remaining=gates.filter(gate=>gate.remaining>0);
    return {id:monster.id,name:monster.name,rarity:monster.rarity||'common',
      score,gates,remaining,progress,count,required,
      percent:required?Math.min(100,Math.round(100*count/required)):100};
  }).sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name));
  const selected=options.find(entry=>entry.id===save.huntTargetId)||options[0]||null;
  return {selected,options,ownedCount:owned.size,totalCount:MONSTERS.length};
}
