import test from 'node:test';
import assert from 'node:assert/strict';
import {createSave,selectMonster,validateSave} from '../prototype/speakingym-monsters/monster-engine.js';
import {normalizeBattleFormation,plannedBattleFormation,formationResonance,recommendBattleFormation} from '../prototype/speakingym-monsters/battle-formation.js';
import {createBattleParty} from '../prototype/speakingym-monsters/battle-party.js';

const owned=['medamago','katappo','purupun','koge'];

test('legacy saves automatically fill three slots; a custom solo roster remains solo',()=>{
 const legacy={...createSave(),ownedMonsters:owned,selectedMonster:'medamago'};
 assert.equal(legacy.battleFormation,null);
 assert.deepEqual(plannedBattleFormation(validateSave(legacy)),owned.slice(0,3));
 const solo=validateSave({...legacy,battleFormation:['medamago']});
 assert.deepEqual(plannedBattleFormation(solo),['medamago']);
 assert.deepEqual(validateSave(solo),solo,'saved formation is stable across backups/reloads');
});

test('formation backups reject unknown monsters, duplicates and oversized/invalid rosters',()=>{
 assert.deepEqual(normalizeBattleFormation(['katappo','hack','katappo','purupun','koge'],owned,'medamago'),
  ['medamago','katappo','purupun']);
 const saved=validateSave({...createSave(),ownedMonsters:owned,selectedMonster:'katappo',
  battleFormation:['hack','medamago','koge','purupun']});
 assert.deepEqual(saved.battleFormation,['katappo','medamago','koge']);
 assert.deepEqual(plannedBattleFormation(saved),['katappo','medamago','koge']);
 assert.equal(validateSave({...saved,battleFormation:'not-an-array'}).battleFormation,null);
 assert.deepEqual(plannedBattleFormation({...saved,battleFormation:['hack','medamago','katappo']}),['katappo','medamago']);
});

test('selecting a new leader reorders saved formation without losing its best existing reserves',()=>{
 const original=validateSave({...createSave(),ownedMonsters:owned,battleFormation:owned.slice(0,3)});
 const other=selectMonster(original,'koge');
 assert.equal(other.selectedMonster,'koge');
 assert.deepEqual(other.battleFormation,['koge','medamago','katappo']);
 assert.deepEqual(original.battleFormation,owned.slice(0,3),'source save is unchanged');
 assert.equal(selectMonster({...original,battleFormation:null},'koge').battleFormation,null,
  'automatic formation stays automatic when the leader changes');
 assert.deepEqual(validateSave(other),other);
});

test('complementary specialists gain capped HP; training two of three unlocks exactly one opening charge',()=>{
 assert.deepEqual(formationResonance(['medamago'],{medamago:10}),
  {kindCount:1,trainedCount:1,hpBonus:0,openingCharge:0});
 assert.deepEqual(formationResonance(['medamago','nororo'],{medamago:10,nororo:10}),
  {kindCount:1,trainedCount:2,hpBonus:0,openingCharge:0});
 const two=formationResonance(['medamago','katappo'],{medamago:4,katappo:4});
 assert.equal(two.hpBonus,1);assert.equal(two.openingCharge,0);
 const three=formationResonance(['medamago','katappo','purupun'],{medamago:4,katappo:4,purupun:1});
 assert.equal(three.kindCount,3);assert.equal(three.openingCharge,1);
 assert.equal(formationResonance(['medamago','katappo','purupun'],{medamago:3,katappo:4,purupun:1}).openingCharge,0);
 const squad=createBattleParty(['medamago','katappo','purupun'],{resonanceHp:three.hpBonus,levels:{medamago:4,katappo:4,purupun:1}});
 assert.equal(squad.health.medamago.maxHp,10); // Base 8 + Lv.3 HP + resonance
 assert.equal(squad.health.katappo.maxHp,10);
 assert.equal(squad.health.purupun.maxHp,9);
 assert.equal(createBattleParty(['medamago'],{resonanceHp:99}).health.medamago.maxHp,12);
 assert.equal(createBattleParty(['medamago','katappo'],{resonanceHp:99}).health.medamago.maxHp,10,
  'untrusted bonuses cannot stack beyond one HP');
});

test('recommended party aims at first foe weakness, then complementary trained skills',()=>{
 const recommended=recommendBattleFormation(owned,{foeWeak:'listen',bossKind:'grammar',
  levels:{medamago:7,katappo:4,purupun:6,koge:5}});
 assert.equal(recommended[0],'katappo','listening specialist should lead into listening-weak foe');
 assert.equal(new Set(recommended).size,3);
 assert.deepEqual(recommendBattleFormation(['medamago']),['medamago']);
 assert.deepEqual(recommendBattleFormation([]),[]);
 const balance=formationResonance(recommended,{medamago:7,katappo:4,purupun:6,koge:5});
 assert.equal(balance.kindCount,3);
 assert.equal(balance.openingCharge,1);
});
