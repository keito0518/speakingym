import test from 'node:test';
import assert from 'node:assert/strict';
import {createSave,validateSave} from '../prototype/speakingym-monsters/monster-engine.js';
import {WEAPONS,scaledStrikeDamage,equippedWeapon,equipWeapon,awakeningProgress,awakenWeapon,MAX_WEAPON_AWAKENING} from '../prototype/speakingym-monsters/monster-equipment.js';
import {monsterArt} from '../prototype/speakingym-monsters/monster-art.js';
import {GACHA_COST,GACHA_TEN_PULL_COUNT,GACHA_TEN_PULL_COST,GACHA_ODDS,RARE_PITY,EPIC_PITY,WEAPON_DISCOVERY_REWARDS,TREASURES,normalizeEconomy,treasureValue,summonProgress,summonPityProgress,weaponDiscoveryProgress,
 grantDungeonTreasure,sellTreasure,sellAllTreasures,drawWeaponGacha,drawWeaponGachaTen,gachaPoolSummary} from '../prototype/speakingym-monsters/monster-economy.js';
import {SUMMON_TIMINGS} from '../prototype/speakingym-monsters/gacha-cinematic.js';

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

test('gacha is earned-only, has disclosed odds, forty exclusive weapons and no characters',()=>{
 const pool=WEAPONS.filter(w=>w.source==='gacha');
 assert.equal(WEAPONS.length,56);assert.equal(pool.length,40);
 assert.deepEqual(['common','rare','epic','legend'].map(rarity=>pool.filter(w=>w.rarity===rarity).length),[14,13,9,4]);
 assert.deepEqual(new Set(pool.map(w=>w.shape)).size,12);
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
 assert.equal(same.shardGained,1);
 assert.equal(same.save.weaponShards[one.weapon.id],1);
 assert.equal(same.save.gachaPullCount,2);
 assert.equal(drawWeaponGacha(same.save).error,'not_enough_coins');
 const equipped=equipWeapon(one.save,one.weapon.id);
 assert.equal(equippedWeapon(equipped)?.id,one.weapon.id);
 assert.ok(scaledStrikeDamage(1,1,equipped)>scaledStrikeDamage(1,1,ready));
});

test('discovery rewards unlock on new weapons only, once per collection milestone',()=>{
 const pool=WEAPONS.filter(w=>w.source==='gacha');
 assert.deepEqual(WEAPON_DISCOVERY_REWARDS.map(x=>x.count),[5,12,24,40]);
 const four=pool.filter(w=>w.rarity==='common').slice(0,4).map(w=>w.id);
 const ready={...createSave(),coins:120,weaponInventory:four};
 assert.deepEqual(weaponDiscoveryProgress(ready),{found:4,total:40,next:{count:5,gold:120},remaining:1});
 const milestone=drawWeaponGacha(ready,{random:()=>.99});
 assert.equal(milestone.duplicate,false);
 assert.equal(milestone.discoveryGold,120);
 assert.equal(milestone.save.coins,120);
 assert.equal(weaponDiscoveryProgress(milestone.save).found,5);
 const repeated=drawWeaponGacha(milestone.save,{random:()=>.99});
 assert.equal(repeated.duplicate,true);
 assert.equal(repeated.discoveryGold,0);
 assert.equal(repeated.save.coins,20);
 const batch=drawWeaponGachaTen({...ready,coins:1200},{random:()=>.99});
 assert.equal(batch.discoveryGold,120,'Ten-pull pays the milestone at most once');
 assert.equal(batch.results.filter(item=>item.discoveryGold).length,1);
 assert.equal(batch.save.coins,280,'Ten pulls, eight refunds and one milestone');
 const almostFull={...createSave(),coins:120,weaponInventory:pool.filter(w=>w.id!=='seraph_claw').map(w=>w.id),pullsSinceEpic:24};
 const complete=drawWeaponGacha(almostFull,{random:()=>.99});
 assert.equal(complete.weapon.id,'seraph_claw');
 assert.equal(complete.discoveryGold,600);
 assert.equal(complete.save.coins,600);
 assert.equal(weaponDiscoveryProgress(complete.save).next,null);
 assert.deepEqual(validateSave(complete.save),complete.save);
});

test('duplicates are weapon-specific awakening shards; voluntary 3-stage growth preserves level, odds, refund and save',()=>{
 const start={...createSave(),coins:5000,xpWallet:280};
 const random=()=>.4;
 const original=drawWeaponGacha(start,{random});
 const id=original.weapon.id;
 let save=original.save;
 for(let i=0;i<2;i++){
  const draw=drawWeaponGacha(save,{random});
  assert.equal(draw.duplicate,true);
  assert.equal(draw.shardGained,1);
  assert.equal(draw.refund,20);
  save=draw.save;
 }
 assert.equal(awakeningProgress(save,id).canAwaken,true);
 assert.equal(awakeningProgress(save,'fake_weapon').canAwaken,false);
 assert.equal(awakenWeapon(save,'fake_weapon').awakened,false);
 const equipped=equipWeapon(save,id);
 const before=scaledStrikeDamage(1,1,equipped);
 const awakened=awakenWeapon(equipped,id);
 assert.equal(awakened.awakened,true);
 assert.equal(awakened.rank,1);
 assert.equal(awakeningProgress(awakened.save,id).shards,0);
 assert.equal(equippedWeapon(awakened.save).attack,original.weapon.attack+1);
 assert.equal(scaledStrikeDamage(1,1,awakened.save),before+1);
 assert.equal(awakened.save.xpWallet,280);
 assert.equal(awakened.save.gachaPullCount,3);
 assert.equal(awakenWeapon(awakened.save,id).awakened,false,'No free second awakening');
 assert.deepEqual(validateSave(awakened.save),awakened.save);
 const art=monsterArt('medamago',0,equippedWeapon(awakened.save));
 assert.match(art,/data-awakening="1"/);
 assert.match(art,/data-weapon-awakened="1"/);
 assert.equal(MAX_WEAPON_AWAKENING,3);
});

test('legacy equipment migrates to empty shards and out-of-range upgrades are normalized',()=>{
 const original=createSave();
 delete original.weaponShards;delete original.weaponAwakening;
 const legacy=validateSave({...original,weaponInventory:['eternal_crest'],equippedWeaponId:'eternal_crest'});
 assert.deepEqual(legacy.weaponShards,{});
 assert.deepEqual(legacy.weaponAwakening,{});
 const invalid=validateSave({...original,weaponInventory:['eternal_crest'],equippedWeaponId:'eternal_crest',
  weaponShards:{eternal_crest:999999,forged_weapon:900},weaponAwakening:{eternal_crest:999,forged_weapon:3}});
 assert.deepEqual(invalid.weaponShards,{eternal_crest:999});
 assert.deepEqual(invalid.weaponAwakening,{eternal_crest:3});
 assert.equal(awakeningProgress(invalid,'eternal_crest').maxed,true);
 assert.equal(awakenWeapon(invalid,'eternal_crest').awakened,false);
});

test('10-pull requires all 1200 earned G up front and cannot be funded by refunds from its own draws',()=>{
 assert.equal(GACHA_TEN_PULL_COUNT,10);
 assert.equal(GACHA_TEN_PULL_COST,GACHA_COST*10);
 const original={...createSave(),coins:1199,xpWallet:500,treasureBag:{star_gear:4}};
 const failed=drawWeaponGachaTen(original,{random:()=>0});
 assert.equal(failed.error,'not_enough_coins');
 assert.equal(failed.save,original);
 assert.equal(failed.results.length,0);
 assert.equal(original.gachaPullCount,0);
 assert.deepEqual(original.weaponInventory,[]);
 assert.equal(original.coins,1199,'The forge cannot silently sell unsold treasure');
});

test('10-pull commits exactly ten sequential rolls with per-roll duplicate returns, pity, and immutable XP',()=>{
 const original={...createSave(),coins:1200,xpWallet:500,ownedMonsters:['medamago'],
  pullsSinceRare:RARE_PITY-1,pullsSinceEpic:EPIC_PITY-1};
 const batch=drawWeaponGachaTen(original,{random:()=>.99});
 assert.equal(batch.error,undefined);
 assert.equal(batch.results.length,10);
 assert.equal(batch.spent,1200);
 assert.equal(batch.results[0].tier,'epic','An existing epic pity must count inside the batch');
 assert.equal(batch.results[0].duplicate,false);
 assert.equal(batch.results[7].tier,'rare','A later rare pity must advance inside the same batch');
 assert.equal(batch.results.slice(1,7).every(item=>item.tier==='common'),true);
 assert.equal(batch.results.at(-1).tier,'common');
 const expectedRefund=batch.results.reduce((sum,item)=>sum+item.refund,0);
 assert.equal(batch.refunded,expectedRefund);
 assert.equal(batch.save.coins,expectedRefund);
 assert.equal(batch.save.gachaPullCount,10);
 assert.equal(batch.save.weaponInventory.length,new Set(batch.results.map(item=>item.weapon.id)).size);
 assert.equal(batch.save.xpWallet,500);
 assert.deepEqual(batch.save.ownedMonsters,['medamago']);
 assert.equal(batch.save.equippedWeaponId,null,'A batch never auto-equips');
 assert.deepEqual(validateSave(batch.save),batch.save);
 assert.equal(original.coins,1200,'A failed persist may discard the whole uncommitted batch');
 assert.equal(original.gachaPullCount,0);
});

test('10-pull has no undisclosed guaranteed rarity, and preserves standard one-pull odds',()=>{
 const batch=drawWeaponGachaTen({...createSave(),coins:1200},{random:()=>.99});
 assert.equal(batch.results[0].tier,'common');
 assert.equal(batch.results[6].tier,'rare','The seventh common-streak draw triggers the existing rare pity');
 assert.equal(batch.results.filter(item=>item.tier==='epic'||item.tier==='legend').length,0);
 assert.equal(batch.results.length,10);
 assert.equal(batch.refunded,8*20,'After its first new common weapon, duplicates give the usual 20 G refund');
 assert.equal(batch.save.coins,160);
 assert.equal(batch.save.gachaPullCount,10);
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

test('summon meter reports guaranteed worst-case draws, clamps invalid counts and resets on rares',()=>{
 const empty=summonPityProgress(createSave());
 assert.deepEqual(empty,{rare:{current:0,limit:7,remaining:7,percent:0},epic:{current:0,limit:25,remaining:25,percent:0}});
 const almost={...createSave(),coins:240,pullsSinceRare:6,pullsSinceEpic:24};
 const progress=summonPityProgress(almost);
 assert.deepEqual(progress.rare,{current:6,limit:7,remaining:1,percent:86});
 assert.deepEqual(progress.epic,{current:24,limit:25,remaining:1,percent:96});
 const pull=drawWeaponGacha(almost,{random:()=>.99});
 assert.equal(pull.tier,'epic','An epic guarantee takes precedence when both caps are due');
 assert.equal(summonPityProgress(pull.save).rare.current,0);
 assert.equal(summonPityProgress(pull.save).epic.current,0);
 const invalid=summonPityProgress({pullsSinceRare:999,pullsSinceEpic:-3});
 assert.equal(invalid.rare.remaining,1);
 assert.equal(invalid.epic.remaining,25);
});

test('premium summon tiers have unique skippable buildup, without altering reward odds',()=>{
 assert.ok(SUMMON_TIMINGS.common.reveal<SUMMON_TIMINGS.rare.reveal);
 assert.ok(SUMMON_TIMINGS.rare.reveal<SUMMON_TIMINGS.epic.reveal);
 assert.ok(SUMMON_TIMINGS.epic.reveal<SUMMON_TIMINGS.legend.reveal);
 for(const tier of ['epic','legend']){
  assert.ok(SUMMON_TIMINGS[tier].crack<SUMMON_TIMINGS[tier].surge);
  assert.ok(SUMMON_TIMINGS[tier].surge<SUMMON_TIMINGS[tier].reveal);
 }
 assert.equal(SUMMON_TIMINGS.common.surge,null);
 assert.equal(SUMMON_TIMINGS.rare.surge,null);
 assert.deepEqual(GACHA_ODDS,{common:67,rare:26,epic:6,legend:1});
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
