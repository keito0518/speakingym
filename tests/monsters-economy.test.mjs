import test from 'node:test';
import assert from 'node:assert/strict';
import {createSave,validateSave} from '../prototype/speakingym-monsters/monster-engine.js';
import {WEAPONS,scaledStrikeDamage,equippedWeapon,equipWeapon} from '../prototype/speakingym-monsters/monster-equipment.js';
import {monsterArt} from '../prototype/speakingym-monsters/monster-art.js';
import {GACHA_COST,GACHA_ODDS,RARE_PITY,EPIC_PITY,TREASURES,normalizeEconomy,treasureValue,summonProgress,
 grantDungeonTreasure,sellTreasure,sellAllTreasures,drawWeaponGacha,gachaPoolSummary} from '../prototype/speakingym-monsters/monster-economy.js';

test('old saves restore an empty wallet safely and untrusted backups cannot forge currency',()=>{
 const old=createSave();delete old.coins;delete old.treasureBag;delete old.gachaPullCount;
 assert.deepEqual(normalizeEconomy(old),{coins:0,treasureBag:{},gachaPullCount:0,pullsSinceRare:0,pullsSinceEpic:0});
 const invalid=validateSave({...old,coins:-9,treasureBag:{amber_leaf:9000,silver_ticket:2,forged_relic:999},
  gachaPullCount:Infinity,pullsSinceRare:999,pullsSinceEpic:999});
 assert.equal(invalid.coins,0);
 assert.deepEqual(invalid.treasureBag,{amber_leaf:999,silver_ticket:2});
 assert.equal(invalid.pullsSinceRare,RARE_PITY-1);
 assert.equal(invalid.pullsSinceEpic,EPIC_PITY-1);
 assert.equal(invalid.gachaPullCount,0);
 assert.deepEqual(validateSave(invalid),invalid);
});

test('first boss rewards tradable treasure after three independent answers; replays need five',()=>{
 const start=createSave();
 assert.equal(grantDungeonTreasure(start,{areaId:'entry',independent:2,firstClear:true}).item,null);
 assert.equal(grantDungeonTreasure(start,{areaId:'entry',independent:4,firstClear:false}).item,null);
 assert.equal(grantDungeonTreasure(start,{areaId:'hacked',independent:11,firstClear:true}).item,null);
 const first=grantDungeonTreasure(start,{areaId:'entry',independent:3,firstClear:true,random:()=>0});
 assert.equal(first.item.world,'forest');assert.equal(first.count,1);
 assert.equal(first.save.coins,0,'learning gives an item, not direct spendable gold');
 assert.equal(treasureValue(first.save),first.item.price);
 const bonus=grantDungeonTreasure(first.save,{areaId:'ruins-core',independent:9,random:()=>0});
 assert.equal(bonus.item.world,'ruins');assert.equal(bonus.count,2);
 assert.equal(treasureValue(bonus.save),first.item.price+2*bonus.item.price);
 assert.deepEqual(validateSave(bonus.save).treasureBag,bonus.save.treasureBag);
});

test('treasure can be sold singly or in a batch, cannot be sold twice and never spends XP',()=>{
 const start={...createSave(),xpWallet:123,treasureBag:{amber_leaf:2,star_gear:1}};
 const single=sellTreasure(start,'amber_leaf');
 assert.equal(single.coins,24);assert.equal(single.save.treasureBag.amber_leaf,1);
 assert.equal(single.save.xpWallet,123);
 assert.equal(sellTreasure(single.save,'amber_leaf',2).coins,0);
 assert.equal(sellTreasure(single.save,'fake_good',1).coins,0);
 const all=sellAllTreasures(single.save);
 assert.equal(all.coins,24+62);
 assert.equal(all.save.coins,24+24+62);
 assert.deepEqual(all.save.treasureBag,{});
 assert.equal(sellAllTreasures(all.save).coins,0);
 assert.equal(sellTreasure({...start,coins:999999},'amber_leaf').coins,0,'money cap prevents item loss');
});

test('summon progress previews sale value but unsold loot cannot be spent on a draw',()=>{
 const start=createSave();
 assert.deepEqual(summonProgress(start),{coins:0,sellableGold:0,potential:0,cost:120,readyNow:false,readyAfterSale:false,missing:120,percent:0});
 const midway={...start,coins:34,treasureBag:{amber_leaf:2}};
 assert.deepEqual(summonProgress(midway),{coins:34,sellableGold:48,potential:82,cost:120,readyNow:false,readyAfterSale:false,missing:38,percent:68});
 const sellable={...midway,treasureBag:{amber_leaf:4}};
 assert.equal(summonProgress(sellable).readyAfterSale,true);
 assert.equal(summonProgress(sellable).readyNow,false);
 assert.equal(summonProgress(sellable).percent,100);
 assert.equal(drawWeaponGacha(sellable).error,'not_enough_coins','The player must sell their treasure first');
 const sold=sellAllTreasures(sellable);
 assert.equal(summonProgress(sold.save).readyNow,true);
 assert.equal(summonProgress(sold.save).sellableGold,0);
 assert.equal(summonProgress({...start,coins:120}).missing,0);
 assert.equal(summonProgress({...start,coins:999999,treasureBag:{amber_leaf:999}}).percent,100);
 assert.equal(summonProgress({...start,coins:-3,treasureBag:{forged_relic:100}}).missing,120);
});

test('gacha is earned-only, has disclosed odds, twenty-four exclusive weapons and no characters',()=>{
 const pool=WEAPONS.filter(w=>w.source==='gacha');
 assert.equal(WEAPONS.length,40);assert.equal(pool.length,24);
 assert.equal(pool.filter(w=>w.rarity==='legend').length,2);
 assert.equal(gachaPoolSummary().reduce((sum,r)=>sum+r.odds,0),100);
 assert.deepEqual(GACHA_ODDS,{common:67,rare:26,epic:6,legend:1});
 assert.equal(drawWeaponGacha(createSave(),{random:()=>0}).error,'not_enough_coins');
 assert.equal(GACHA_COST,120);
 assert.ok(WEAPONS.filter(w=>w.source==='gacha'&&w.attack>=7).length>=8);
 assert.equal(WEAPONS.filter(w=>w.source!=='gacha'&&w.attack>=7).length,0,'strongest weapons are exclusively forged');
});

test('a draw spends gold exactly once, duplicate refunds are bounded and the player chooses equipment',()=>{
 const ready={...createSave(),coins:240,equippedWeaponId:null};
 const one=drawWeaponGacha(ready,{random:()=>.4});
 assert.equal(one.tier,'common');assert.equal(one.duplicate,false);
 assert.equal(one.save.coins,120);assert.equal(one.save.weaponInventory.length,1);
 assert.equal(one.save.equippedWeaponId,null,'drawing does not silently equip');
 assert.deepEqual(validateSave(one.save),one.save);
 const same=drawWeaponGacha(one.save,{random:()=>.4});
 assert.equal(same.duplicate,true);assert.equal(same.refund,20);
 assert.equal(same.save.coins,20);assert.equal(same.save.weaponInventory.length,1);
 assert.equal(same.save.gachaPullCount,2);
 assert.equal(drawWeaponGacha(same.save).error,'not_enough_coins');
 const equipped=equipWeapon(one.save,one.weapon.id);
 assert.equal(equippedWeapon(equipped)?.id,one.weapon.id);
 assert.ok(scaledStrikeDamage(1,1,equipped)>scaledStrikeDamage(1,1,ready));
});

test('gacha rarity boundaries, transparent rare/epic pity, and legendary 1% are deterministic',()=>{
 const base={...createSave(),coins:999999};
 assert.equal(drawWeaponGacha(base,{random:()=>.009}).tier,'legend');
 assert.equal(drawWeaponGacha(base,{random:()=>.01}).tier,'epic');
 assert.equal(drawWeaponGacha(base,{random:()=>.07}).tier,'rare');
 assert.equal(drawWeaponGacha(base,{random:()=>.33}).tier,'common');
 const rare=drawWeaponGacha({...base,pullsSinceRare:RARE_PITY-1},{random:()=>.99});
 assert.equal(rare.tier,'rare');assert.equal(rare.save.pullsSinceRare,0);
 const epic=drawWeaponGacha({...base,pullsSinceEpic:EPIC_PITY-1},{random:()=>.99});
 assert.equal(epic.tier,'epic');assert.equal(epic.save.pullsSinceEpic,0);
 assert.equal(epic.save.pullsSinceRare,0);
});

test('equipment overlays visibly differ by type and rarity for both old atlas and nine new sprites',()=>{
 const sword=WEAPONS.find(w=>w.id==='eternal_crest');
 const bow=WEAPONS.find(w=>w.id==='glacier_bow');
 for(const monsterId of ['medamago','kohan','tokeru']){
  const unarmed=monsterArt(monsterId,0);
  const equipped=monsterArt(monsterId,0,sword);
  const alternate=monsterArt(monsterId,0,bow);
  assert.doesNotMatch(unarmed,/data-equipped-weapon=/);
  assert.match(equipped,/data-equipped-weapon="eternal_crest"/);
  assert.match(alternate,/data-weapon-shape="bow"/);
  assert.notEqual(equipped,alternate);
  assert.match(monsterArt(monsterId,2,sword),/data-stage="2"/);
 }
 const unowned={...createSave(),weaponInventory:[],equippedWeaponId:'eternal_crest'};
 assert.equal(equippedWeapon(unowned),null,'forged save cannot render or use unowned equipment');
 assert.equal(TREASURES.length,9);
});
