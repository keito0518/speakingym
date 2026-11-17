// Expedition loadouts only contain owned monster IDs. `null` means automatic:
// legacy saves still fill the party with the first recruited companions.
// An explicitly chosen one-, two- or three-monster team stays selected.
import {allyAffinity,MASTERY_LEVEL} from './battle-tactics.js';

const unique = ids => [...new Set((Array.isArray(ids)?ids:[]).filter(id=>typeof id==='string'))];

export function normalizeBattleFormation(value,owned,leader){
 if(!Array.isArray(value))return null;
 const available=new Set(unique(owned));
 const first=available.has(leader)?leader:unique(owned)[0];
 if(!first)return null;
 return unique([first,...value]).filter(id=>available.has(id)).slice(0,3);
}

export function plannedBattleFormation(save){
 const owned=unique(save?.ownedMonsters);
 const leader=owned.includes(save?.selectedMonster)?save.selectedMonster:owned[0];
 if(!leader)return [];
 const chosen=Array.isArray(save?.battleFormation)?save.battleFormation:owned;
 return unique([leader,...chosen]).filter(id=>owned.includes(id)).slice(0,3);
}

// A diverse team has a modest HP advantage. Training two distinct specialists
// to Lv.4 adds ONE opening ultimate charge if all three cover different
// English skills. No effect changes grading, XP, loot odds or boss seals.
export function formationResonance(roster,levels={}){
 const ids=unique(roster).slice(0,3);
 const kinds=new Set(ids.map(id=>allyAffinity(id).strong));
 const trainedCount=ids.filter(id=>Number(levels?.[id])>=MASTERY_LEVEL).length;
 return {kindCount:kinds.size,trainedCount,
  hpBonus:kinds.size>=2?1:0,
  openingCharge:ids.length===3&&kinds.size===3&&trainedCount>=2?1:0};
}

export function recommendBattleFormation(owned,{foeWeak='listen',bossKind=null,levels={}}={}){
 const candidates=unique(owned);
 if(candidates.length<=1)return candidates;
 const level=id=>Math.min(20,Math.max(1,Number(levels?.[id])||1));
 const leader=[...candidates].sort((a,b)=>
   (allyAffinity(b).strong===foeWeak?100:0)+level(b)-
   ((allyAffinity(a).strong===foeWeak?100:0)+level(a)))[0];
 const roster=[leader];
 while(roster.length<3&&roster.length<candidates.length){
   const kinds=new Set(roster.map(id=>allyAffinity(id).strong));
   const score=id=>(!kinds.has(allyAffinity(id).strong)?50:0)+
     (allyAffinity(id).strong===bossKind?20:0)+
     (level(id)>=MASTERY_LEVEL?8:0)+level(id);
   roster.push(candidates.filter(id=>!roster.includes(id)).sort((a,b)=>score(b)-score(a))[0]);
 }
 return roster;
}
