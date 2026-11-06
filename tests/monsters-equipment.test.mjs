import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSave,validateSave} from '../prototype/speakingym-monsters/monster-engine.js';
import {WEAPONS,normalizeEquipment,equippedWeapon,equipWeapon,levelAttackBonus,weaponAffinityBonus,scaledStrikeDamage,dungeonWeaponDrop,eliteWeaponDrop} from '../prototype/speakingym-monsters/monster-equipment.js';

test('equipment is optional, only owned gear can be equipped, and levels increase power',()=>{
 const first=createSave();
 assert.deepEqual(first.weaponInventory,[]);
 assert.equal(first.equippedWeaponId,null);
 assert.equal(scaledStrikeDamage(1,1,first),2,'unarmed starter hit');
 assert.equal(scaledStrikeDamage(2,1,first),3);
 assert.equal(levelAttackBonus(3),0);
 assert.equal(levelAttackBonus(4),1);
 assert.equal(levelAttackBonus(7),2);
 assert.equal(levelAttackBonus(10),3);
 assert.equal(levelAttackBonus(100000),4,'bounded progression');
 assert.equal(equipWeapon(first,'moonsteel'),first,'cannot equip a weapon not in inventory');
 const dropped=dungeonWeaponDrop(first,{areaId:'entry',completed:true,independent:5});
 assert.equal(dropped.weapon.id,'wooden_blade');
 assert.equal(equippedWeapon(dropped.save)?.name,'旅立ちの木剣');
 assert.equal(scaledStrikeDamage(1,4,dropped.save),4,'level and weapon both contribute');
 assert.equal(equipWeapon(dropped.save,null).equippedWeaponId,null,'player can fight unarmed');
});

test('first completed boss clears guarantee area weapon, replays have finite rare-drop chance',()=>{
 let saved=createSave();
 assert.equal(dungeonWeaponDrop(saved,{areaId:'entry',completed:false}).weapon,null);
 assert.equal(dungeonWeaponDrop(saved,{areaId:'unknown',completed:true}).weapon,null);
 for(const areaId of ['entry','glade']){
  const result=dungeonWeaponDrop(saved,{areaId,completed:true,independent:3,random:()=>.99});
  assert.equal(result.weapon.areaId,areaId);
  saved=result.save;
 }
 const missed=dungeonWeaponDrop(saved,{areaId:'entry',completed:true,independent:4,random:()=>.99});
 assert.equal(missed.weapon,null);
 assert.equal(dungeonWeaponDrop(saved,{areaId:'entry',completed:true,independent:3,random:()=>0}).weapon,null,'no rare drop without verified progress');
 assert.equal(dungeonWeaponDrop(createSave(),{areaId:'entry',completed:true,independent:2,random:()=>0}).weapon,null,'hint-only chapter clears do not mint weapons');
 const rare=dungeonWeaponDrop(saved,{areaId:'entry',completed:true,independent:4,random:()=>.24});
 assert.equal(rare.weapon.id,'moonsteel');
 assert.equal(rare.save.equippedWeaponId,'wooden_blade','replay loot never silently overrides a choice');
 assert.equal(dungeonWeaponDrop(rare.save,{areaId:'entry',completed:true,independent:99,random:()=>0}).weapon,null,'duplicates do not stack');
 const unarmed=equipWeapon(saved,null);
 const remainsUnarmed=dungeonWeaponDrop(unarmed,{areaId:'entry',completed:true,independent:5,random:()=>0});
 assert.equal(remainsUnarmed.save.equippedWeaponId,null,'player choice to fight unarmed is not overwritten by loot');
 assert.equal(new Set(WEAPONS.map(w=>w.id)).size,WEAPONS.length);
});

test('old saves and untrusted backup entries never grant unowned weapons',()=>{
 const old=createSave();delete old.weaponInventory;delete old.equippedWeaponId;
 assert.deepEqual(normalizeEquipment(old),{weaponInventory:[],equippedWeaponId:null,weaponShards:{},weaponAwakening:{}});
 const loaded=validateSave({...createSave(),weaponInventory:['wooden_blade','wooden_blade','spoof',5],equippedWeaponId:'moonsteel'});
 assert.deepEqual(loaded.weaponInventory,['wooden_blade']);
 assert.equal(loaded.equippedWeaponId,null);
 const valid=validateSave({...loaded,equippedWeaponId:'wooden_blade'});
 assert.equal(equippedWeapon(valid)?.id,'wooden_blade');
 assert.equal(validateSave({...old}).equippedWeaponId,null);
 assert.equal(scaledStrikeDamage(Number.NaN,-100,loaded),2);
});

test('weapon affinity adds damage only for the correct independently answered skill',()=>{
 const first=dungeonWeaponDrop(createSave(),{areaId:'entry',completed:true,independent:4}).save;
 assert.equal(weaponAffinityBonus(first,'speak',{independent:true}),1);
 assert.equal(weaponAffinityBonus(first,'listen',{independent:true}),0);
 assert.equal(weaponAffinityBonus(first,'speak',{independent:false}),0,'hints cannot trigger weapon traits');
 assert.equal(scaledStrikeDamage(1,1,first,{kind:'speak',independent:true}),4);
 assert.equal(scaledStrikeDamage(1,1,first,{kind:'speak',independent:false}),3);
 const epic={...first,weaponInventory:[...first.weaponInventory,'moss_fang'],equippedWeaponId:'moss_fang'};
 assert.equal(weaponAffinityBonus(epic,'vocab',{independent:true}),2,'elite weapon has stronger matching-skill trait');
 assert.equal(scaledStrikeDamage(1,4,epic,{kind:'vocab',independent:true}),8);
 assert.equal(weaponAffinityBonus({...epic,equippedWeaponId:'forged'},'vocab',{independent:true}),0,
  'unowned or invented gear cannot grant passives');
});

test('elite-only weapons are earned at the fifth encounter after two unaided hits',()=>{
 const old=createSave();
 const valid={areaId:'thicket',foeIndex:4,defeated:true,independentHits:2,random:()=>.179};
 assert.equal(eliteWeaponDrop(old,{...valid,foeIndex:3}).weapon,null,'ordinary encounters never give elite gear');
 assert.equal(eliteWeaponDrop(old,{...valid,defeated:false}).weapon,null,'enemy must actually be defeated');
 assert.equal(eliteWeaponDrop(old,{...valid,independentHits:1}).weapon,null,'one unaided hit is insufficient');
 assert.equal(eliteWeaponDrop(old,{...valid,random:()=>.18}).weapon,null,'roll above the published 18% misses');
 assert.equal(eliteWeaponDrop(old,{...valid,areaId:'unknown'}).weapon,null);
 const won=eliteWeaponDrop(old,valid);
 assert.equal(won.weapon.id,'moss_fang');
 assert.equal(won.save.equippedWeaponId,'moss_fang','first gear can be worn immediately');
 assert.equal(eliteWeaponDrop(won.save,valid).weapon,null,'no duplicate trophies');
 const snow=eliteWeaponDrop(won.save,{...valid,areaId:'city-terminal',foeIndex:9,random:()=>0});
 assert.equal(snow.weapon.id,'blizzard_lance');
 assert.equal(snow.save.equippedWeaponId,'moss_fang','drops must not overwrite a chosen weapon');
 const star=eliteWeaponDrop(snow.save,{...valid,areaId:'ruins-core',random:()=>0});
 assert.equal(star.weapon.id,'astral_sword');
 const restored=validateSave(star.save);
 assert.equal(restored.weaponInventory.length,3);
 assert.equal(restored.equippedWeaponId,'moss_fang','old and new equipment restore safely');
 assert.equal(WEAPONS.length,80);
});
