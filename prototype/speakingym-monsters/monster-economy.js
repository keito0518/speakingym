// Offline, earned-only adventure economy. There is no purchase, paid currency,
// real-money exchange or deadline. Correct English is graded outside this file.
import {WEAPONS,grantDuplicateShard,awakeningProgress,weaponAttack} from './monster-equipment.js';

export const GACHA_COST=120;
export const GACHA_TEN_PULL_COUNT=10;
export const GACHA_TEN_PULL_COST=GACHA_COST*GACHA_TEN_PULL_COUNT;
export const GACHA_ODDS=Object.freeze({common:67,rare:26,epic:6,legend:1});
export const RARE_PITY=7;
export const EPIC_PITY=25;
// One-time rewards for discovering distinct gacha weapons. Progress is
// derived from owned IDs, so no claim button or new save field is needed.
export const WEAPON_DISCOVERY_REWARDS=Object.freeze([
 Object.freeze({count:5,gold:120}),
 Object.freeze({count:12,gold:240}),
 Object.freeze({count:24,gold:360}),
 Object.freeze({count:40,gold:600}),
 Object.freeze({count:56,gold:800}),
 Object.freeze({count:64,gold:1200})
]);
export const TREASURES=Object.freeze([
 {id:'amber_leaf',name:'琥珀の葉',world:'forest',price:24},
 {id:'glowing_spore',name:'ひかる胞子',world:'forest',price:30},
 {id:'forest_crystal',name:'森の結晶',world:'forest',price:36},
 {id:'frost_pearl',name:'雪の真珠',world:'city',price:38},
 {id:'silver_ticket',name:'銀の切符',world:'city',price:44},
 {id:'aurora_fragment',name:'オーロラの欠片',world:'city',price:50},
 {id:'rune_shard',name:'古代の石片',world:'ruins',price:54},
 {id:'star_gear',name:'星の歯車',world:'ruins',price:62},
 {id:'time_fragment',name:'時の欠片',world:'ruins',price:72}
].map(item=>Object.freeze(item)));
const treasureById=new Map(TREASURES.map(item=>[item.id,item]));
const tiers=['common','rare','epic','legend'];
const maxCoins=999999;
const safeInt=(n,max)=>Number.isSafeInteger(n)&&n>=0?Math.min(max,n):0;
const safeRoll=random=>{const n=Number(random());return Number.isFinite(n)?Math.min(0.999999999,Math.max(0,n)):0.999999999;};

export function normalizeEconomy(value){
 const source=value?.treasureBag&&typeof value.treasureBag==='object'&&!Array.isArray(value.treasureBag)?value.treasureBag:{};
 return {coins:safeInt(value?.coins,maxCoins),
  treasureBag:Object.fromEntries(TREASURES.map(item=>[item.id,safeInt(source[item.id],999)]).filter(([,n])=>n>0)),
  gachaPullCount:safeInt(value?.gachaPullCount,1000000),
  pullsSinceRare:safeInt(value?.pullsSinceRare,RARE_PITY-1),
  pullsSinceEpic:safeInt(value?.pullsSinceEpic,EPIC_PITY-1)};
}
export function treasureValue(save){
 const bag=normalizeEconomy(save).treasureBag;
 return TREASURES.reduce((total,item)=>total+(bag[item.id]||0)*item.price,0);
}
// Read-only HUD projection: unsold loot counts toward the next summon goal,
// but cannot be spent before the player explicitly sells it in the forge.
export function summonProgress(save){
 const coins=normalizeEconomy(save).coins;
 const sellableGold=treasureValue(save);
 const potential=coins+sellableGold;
 return {coins,sellableGold,potential,cost:GACHA_COST,
  readyNow:coins>=GACHA_COST,readyAfterSale:potential>=GACHA_COST,
  missing:Math.max(0,GACHA_COST-potential),
  percent:Math.min(100,Math.round(100*potential/GACHA_COST))};
}
// Worst-case draw counts until a guaranteed rarity. Early lucky pulls reset
// their respective counters, so the meters never promise a specific next drop.
export function summonPityProgress(save){
 const economy=normalizeEconomy(save);
 const progress=(current,limit)=>({current,limit,remaining:limit-current,
  percent:Math.round(current*100/limit)});
 return {rare:progress(economy.pullsSinceRare,RARE_PITY),
  epic:progress(economy.pullsSinceEpic,EPIC_PITY)};
}
export function weaponDiscoveryProgress(save){
 const owned=new Set(Array.isArray(save?.weaponInventory)?save.weaponInventory:[]);
 const found=WEAPONS.filter(weapon=>weapon.source==='gacha'&&owned.has(weapon.id)).length;
 const next=WEAPON_DISCOVERY_REWARDS.find(reward=>reward.count>found)||null;
 return {found,total:WEAPONS.filter(weapon=>weapon.source==='gacha').length,
  next,remaining:next?next.count-found:0};
}
export function grantDungeonTreasure(save,{areaId,independent=0,firstClear=false,random=Math.random}={}){
 const areas=['entry','glade','thicket','sanctuary','city','city-market','city-terminal','city-blizzard','ruins-gate','ruins-core'];
 const index=areas.indexOf(areaId);
 if(index<0||!Number.isSafeInteger(independent)||independent<(firstClear?3:5))return {save,item:null,count:0};
 const world=index<4?'forest':index<8?'city':'ruins';
 const goods=TREASURES.filter(item=>item.world===world);
 const item=goods[index%goods.length];
 const count=independent>=7&&safeRoll(random)<.2?2:1;
 const current=normalizeEconomy(save).treasureBag;
 const added=Math.min(count,999-(current[item.id]||0));
 if(added<=0)return {save,item:null,count:0};
 return {save:{...save,treasureBag:{...current,[item.id]:(current[item.id]||0)+added}},item,count:added};
}
export function sellTreasure(save,id,count=1){
 const item=treasureById.get(id),economy=normalizeEconomy(save);
 if(!item||!Number.isSafeInteger(count)||count<1||count>(economy.treasureBag[id]||0))return {save,coins:0};
 const amount=Math.min(count,Math.floor((maxCoins-economy.coins)/item.price));
 if(amount<=0)return {save,coins:0};
 const treasureBag={...economy.treasureBag};
 if(treasureBag[id]===amount)delete treasureBag[id];else treasureBag[id]-=amount;
 return {save:{...save,coins:economy.coins+amount*item.price,treasureBag},coins:amount*item.price};
}
export function sellAllTreasures(save){
 let next=save,coins=0;
 for(const item of TREASURES){
  const result=sellTreasure(next,item.id,normalizeEconomy(next).treasureBag[item.id]||0);
  next=result.save;coins+=result.coins;
 }
 return {save:next,coins};
}
// Pity is deterministic and inspectable. All weapons here are gacha-only;
// chapters and elites still drop their existing, weaker field equipment.
export function drawWeaponGacha(save,{random=Math.random}={}){
 const economy=normalizeEconomy(save);
 if(economy.coins<GACHA_COST)return {save,weapon:null,error:'not_enough_coins'};
 const roll=safeRoll(random)*100;
 const tier=economy.pullsSinceEpic+1>=EPIC_PITY?'epic':economy.pullsSinceRare+1>=RARE_PITY?'rare':
  roll<GACHA_ODDS.legend?'legend':roll<GACHA_ODDS.legend+GACHA_ODDS.epic?'epic':
  roll<GACHA_ODDS.legend+GACHA_ODDS.epic+GACHA_ODDS.rare?'rare':'common';
 const pool=WEAPONS.filter(weapon=>weapon.source==='gacha'&&weapon.rarity===tier);
 if(!pool.length)throw new Error('Gacha pool unavailable');
 const weapon=pool[Math.floor(safeRoll(random)*pool.length)];
 const owned=Array.isArray(save.weaponInventory)?save.weaponInventory:[];
 const duplicate=owned.includes(weapon.id);
 const refund=duplicate?({common:20,rare:35,epic:60,legend:90}[tier]):0;
 const beforeDiscoveries=weaponDiscoveryProgress(save).found;
 const discoveryGold=duplicate?0:WEAPON_DISCOVERY_REWARDS
  .filter(reward=>beforeDiscoveries<reward.count&&beforeDiscoveries+1>=reward.count)
  .reduce((total,reward)=>total+reward.gold,0);
 const nextWithShard=duplicate?grantDuplicateShard(save,weapon.id):save;
 const previousVisualRank=awakeningProgress(save,weapon.id).visualRank;
 const nextCoins=Math.min(maxCoins,economy.coins-GACHA_COST+refund+discoveryGold);
 const saveNext={...nextWithShard,coins:nextCoins,
  weaponInventory:duplicate?owned:[...owned,weapon.id],
  equippedWeaponId:save.equippedWeaponId??null,
  gachaPullCount:Math.min(1000000,economy.gachaPullCount+1),
  pullsSinceRare:['rare','epic','legend'].includes(tier)?0:economy.pullsSinceRare+1,
  pullsSinceEpic:['epic','legend'].includes(tier)?0:economy.pullsSinceEpic+1};
 // Give the cinematic the POST-duplicate pixel palette and combat effect.
 // The hidden weapon identity is still only revealed when the chest opens.
 const visibleWeapon={...weapon,attack:weaponAttack(saveNext,weapon),
  awakeningRank:awakeningProgress(saveNext,weapon.id).visualRank};
 return {save:saveNext,weapon:visibleWeapon,duplicate,refund,tier,shardGained:duplicate?1:0,
  visualChanged:duplicate&&visibleWeapon.awakeningRank>previousVisualRank,
  discoveryGold:nextCoins-(economy.coins-GACHA_COST+refund)};
}
// The ten-pull is a convenience, not a discount or a separate rarity pool.
// Require the full 1,200 G up front: duplicate refunds cannot bankroll draws
// within the same batch. The caller persists the final save exactly once,
// before showing any animation or offering a skip/close action.
export function drawWeaponGachaTen(save,{random=Math.random}={}){
 if(normalizeEconomy(save).coins<GACHA_TEN_PULL_COST)
  return {save,results:[],error:'not_enough_coins'};
 let next=save;
 const results=[];
 for(let i=0;i<GACHA_TEN_PULL_COUNT;i++){
  const result=drawWeaponGacha(next,{random});
  if(!result.weapon)throw Error('Ten-pull funds must cover every draw');
  next=result.save;
  results.push({weapon:result.weapon,tier:result.tier,duplicate:result.duplicate,refund:result.refund,shardGained:result.shardGained,visualChanged:result.visualChanged,discoveryGold:result.discoveryGold});
 }
 return {save:next,results,spent:GACHA_TEN_PULL_COST,
  refunded:results.reduce((sum,item)=>sum+item.refund,0),
  discoveryGold:results.reduce((sum,item)=>sum+item.discoveryGold,0)};
}
export function gachaPoolSummary(){
 return tiers.map(rarity=>({rarity,count:WEAPONS.filter(w=>w.source==='gacha'&&w.rarity===rarity).length,odds:GACHA_ODDS[rarity]}));
}
