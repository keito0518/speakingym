import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createBattleParty,levelHpBonus,editBattleFormation,fighterHealth,applyFighterDamage,healFighter,
 firstStandingAlly,canTacticalSwap,consumeTacticalSwap,restorePartyForNextWave,encounterVitality
} from '../prototype/speakingym-monsters/battle-party.js';

test('solo players keep original HP, while recruited allies have independent HP',()=>{
 const solo=createBattleParty(['medamago']);
 assert.deepEqual(fighterHealth(solo,'medamago'),{hp:12,maxHp:12});
 const team=createBattleParty(['medamago','katappo','purupun','medamago','koge'],{evolvedIds:['katappo']});
 assert.deepEqual(team.roster,['medamago','katappo','purupun']);
 assert.deepEqual(fighterHealth(team,'medamago'),{hp:8,maxHp:8});
 assert.deepEqual(fighterHealth(team,'katappo'),{hp:9,maxHp:9});
 const damaged=applyFighterDamage(team,'medamago',3);
 assert.equal(fighterHealth(damaged,'medamago').hp,5);
 assert.equal(fighterHealth(damaged,'katappo').hp,9);
 assert.equal(fighterHealth(team,'medamago').hp,8,'previous session state is not mutated');
 assert.equal(fighterHealth(healFighter(damaged,'medamago',100),'medamago').hp,8);
});
test('training at Lv3/6/9 adds capped HP without altering persistent save or solo base HP',()=>{
 assert.deepEqual([1,2,3,5,6,8,9,25].map(levelHpBonus),[0,0,1,1,2,2,3,3]);
 assert.equal(levelHpBonus(NaN),0);
 assert.equal(levelHpBonus(-999),0);
 assert.equal(createBattleParty(['medamago'],{levels:{medamago:1}}).health.medamago.maxHp,12);
 const team=createBattleParty(['medamago','katappo','koge'],{
  levels:{medamago:3,katappo:6,koge:9},evolvedIds:['katappo','koge']});
 assert.deepEqual(team.health,{
  medamago:{hp:9,maxHp:9},katappo:{hp:11,maxHp:11},koge:{hp:12,maxHp:12}
 });
 assert.deepEqual(Object.keys(team).sort(),['health','roster','swapsUsed'],'level is not added to the save format');
});
test('formation swaps its last reserve, and changes leader without editing the collection',()=>{
 const owned=['medamago','katappo','purupun','koge'];
 const original=['medamago','katappo','purupun'];
 const changed=editBattleFormation(original,owned,'koge');
 assert.deepEqual(changed,['medamago','katappo','koge']);
 assert.deepEqual(original,['medamago','katappo','purupun']);
 const leader=editBattleFormation(changed,owned,'katappo',{leader:true});
 assert.deepEqual(leader,['katappo','medamago','koge']);
 assert.deepEqual(editBattleFormation(leader,owned,'katappo'),leader,'leader cannot be removed');
 assert.deepEqual(editBattleFormation(leader,owned,'koge'),['katappo','medamago']);
 assert.deepEqual(editBattleFormation(leader,owned,'unknown'),leader);
});
test('one free tactical exchange per encounter, but fainted allies cannot be chosen',()=>{
 const team=createBattleParty(['medamago','katappo','purupun']);
 assert.equal(canTacticalSwap(team,'medamago','katappo'),true);
 const changed=consumeTacticalSwap(team,'medamago','katappo');
 assert.equal(changed.swapsUsed,1);
 assert.equal(canTacticalSwap(changed,'katappo','purupun'),false);
 const fainted=applyFighterDamage(team,'katappo',99);
 assert.equal(canTacticalSwap(fainted,'medamago','katappo'),false);
 assert.equal(firstStandingAlly(fainted,'katappo'),'medamago');
 assert.equal(firstStandingAlly(applyFighterDamage(applyFighterDamage(fainted,'medamago',99),'purupun',99),'katappo'),null);
});
test('zero HP remains down until wave cleared; next wave restores the party',()=>{
 const team=createBattleParty(['medamago','katappo']);
 const damaged=applyFighterDamage(applyFighterDamage(team,'medamago',100),'katappo',6);
 assert.equal(firstStandingAlly(damaged,'medamago'),'katappo');
 const recovered=restorePartyForNextWave({...damaged,swapsUsed:1});
 assert.equal(fighterHealth(recovered,'medamago').hp,4);
 assert.equal(fighterHealth(recovered,'katappo').hp,7);
 assert.equal(recovered.swapsUsed,0);
});
test('higher dungeon chapters raise foe HP gradually, while boss requires three correct answers',()=>{
 assert.equal(encounterVitality('entry',0),3);
 assert.equal(encounterVitality('entry',1),2);
 assert.equal(encounterVitality('thicket',0),4);
 assert.equal(encounterVitality('city',1),3);
 assert.equal(encounterVitality('city-blizzard',1),4);
 assert.equal(encounterVitality('city-blizzard',9,{boss:true}),3);
});
