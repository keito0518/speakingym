// Battle-only party state. Never written to the learner's persistent save.
// A solo learner keeps the original 12 HP so recruiting allies is optional.
export function createBattleParty(ids,{evolvedIds=[]}={}){
 const roster=[...new Set(ids)].filter(Boolean).slice(0,3);
 const evolved=new Set(evolvedIds);
 const base=roster.length===1?12:roster.length===2?9:8;
 return {roster,health:Object.fromEntries(roster.map(id=>{
   const maxHp=base+(evolved.has(id)?1:0);
   return [id,{hp:maxHp,maxHp}];
 })),swapsUsed:0};
}
export function editBattleFormation(current,owned,target,{leader=false}={}){
 const available=new Set(owned);
 const roster=[...new Set(current)].filter(id=>available.has(id)).slice(0,3);
 if(!available.has(target))return roster;
 if(roster.includes(target)){
   if(leader)return [target,...roster.filter(id=>id!==target)];
   if(target===roster[0])return roster; // Cannot leave the party with no leader.
   return roster.filter(id=>id!==target);
 }
 if(roster.length<3)return [...roster,target];
 return [...roster.slice(0,2),target]; // New candidate takes the last reserve slot.
}
export function fighterHealth(party,id){return party?.health?.[id]||{hp:0,maxHp:0};}
export function applyFighterDamage(party,id,amount){
 const fighter=fighterHealth(party,id);
 if(!fighter.maxHp)return party;
 return {...party,health:{...party.health,[id]:{...fighter,hp:Math.max(0,fighter.hp-Math.max(0,amount))}}};
}
export function healFighter(party,id,amount){
 const fighter=fighterHealth(party,id);
 if(!fighter.maxHp)return party;
 return {...party,health:{...party.health,[id]:{...fighter,hp:Math.min(fighter.maxHp,fighter.hp+Math.max(0,amount))}}};
}
export function firstStandingAlly(party,preferred){
 if(fighterHealth(party,preferred).hp>0)return preferred;
 return party?.roster?.find(id=>fighterHealth(party,id).hp>0)||null;
}
export function canTacticalSwap(party,currentId,nextId){
 return party.roster.includes(nextId)&&nextId!==currentId&&
   party.swapsUsed<1&&fighterHealth(party,nextId).hp>0;
}
export function consumeTacticalSwap(party,currentId,nextId){
 return canTacticalSwap(party,currentId,nextId)?{...party,swapsUsed:party.swapsUsed+1}:party;
}
export function restorePartyForNextWave(party,amount=4){
 // A victory revives fallen allies lightly; there is no infinite revive during a battle.
 const health=Object.fromEntries(party.roster.map(id=>{
   const fighter=fighterHealth(party,id);
   return [id,{...fighter,hp:Math.min(fighter.maxHp,Math.max(fighter.hp,0)+Math.max(0,amount))}];
 }));
 return {...party,health,swapsUsed:0};
}
const AREA_TIERS=Object.freeze({entry:0,glade:0,thicket:1,sanctuary:1,city:1,'city-market':1,'city-terminal':2,'city-blizzard':2});
export function encounterVitality(areaId,index,{boss=false}={}){
 if(boss)return 3;
 return (index===0?3:2)+(AREA_TIERS[areaId]||0);
}
