// The same equipped weapon is shared by the expedition party. The learner
// chooses it outside battle; changing allies never changes the weapon.
// Items never influence English grading, XP awards or evolution trials.
export const WEAPONS=Object.freeze([
 {id:'wooden_blade',name:'旅立ちの木剣',attack:1,rarity:'common',areaId:'entry',affinity:'speak'},
 {id:'sun_dagger',name:'陽だまりの短剣',attack:1,rarity:'common',areaId:'glade',affinity:'grammar'},
 {id:'mist_spear',name:'霧抜けの槍',attack:2,rarity:'common',areaId:'thicket',affinity:'listen'},
 {id:'elder_staff',name:'古木の杖',attack:2,rarity:'common',areaId:'sanctuary',affinity:'vocab'},
 {id:'rail_saber',name:'線路のサーベル',attack:2,rarity:'common',areaId:'city',affinity:'speak'},
 {id:'market_knife',name:'雪市のナイフ',attack:2,rarity:'common',areaId:'city-market',affinity:'vocab'},
 {id:'signal_lance',name:'信号のランス',attack:3,rarity:'common',areaId:'city-terminal',affinity:'listen'},
 {id:'frost_sword',name:'吹雪の大剣',attack:3,rarity:'common',areaId:'city-blizzard',affinity:'grammar'},
 {id:'rune_blade',name:'碑文の剣',attack:3,rarity:'common',areaId:'ruins-gate',affinity:'grammar'},
 {id:'chrono_edge',name:'時の刃',attack:4,rarity:'common',areaId:'ruins-core',affinity:'speak'},
 {id:'moonsteel',name:'月鋼の剣',attack:3,rarity:'rare',world:'forest',affinity:'listen'},
 {id:'snowguard',name:'雪守りの剣',attack:4,rarity:'rare',world:'city',affinity:'grammar'},
 {id:'starlight',name:'星明かりの剣',attack:5,rarity:'rare',world:'ruins',affinity:'speak'},
 {id:'moss_fang',name:'深森の牙',attack:3,rarity:'epic',eliteWorld:'forest',affinity:'vocab'},
 {id:'blizzard_lance',name:'吹雪の長槍',attack:4,rarity:'epic',eliteWorld:'city',affinity:'listen'},
 {id:'astral_sword',name:'星核の剣',attack:5,rarity:'epic',eliteWorld:'ruins',affinity:'grammar'},
 // A separate earned-currency-only forge pool. The strongest equipment is
 // never a chapter drop; coins cannot be purchased with real money.
 {id:'copper_fang',name:'銅の牙',attack:3,rarity:'common',source:'gacha',affinity:'speak',shape:'dagger'},
 {id:'river_staff',name:'せせらぎの杖',attack:3,rarity:'common',source:'gacha',affinity:'listen',shape:'staff'},
 {id:'meadow_bow',name:'草原の弓',attack:3,rarity:'common',source:'gacha',affinity:'vocab',shape:'bow'},
 {id:'quartz_hammer',name:'石英ハンマー',attack:4,rarity:'common',source:'gacha',affinity:'grammar',shape:'hammer'},
 {id:'sky_sabre',name:'青空のサーベル',attack:4,rarity:'common',source:'gacha',affinity:'speak',shape:'sword'},
 {id:'willow_spear',name:'柳の槍',attack:3,rarity:'common',source:'gacha',affinity:'listen',shape:'spear'},
 {id:'cinder_wand',name:'熾火のワンド',attack:4,rarity:'common',source:'gacha',affinity:'grammar',shape:'staff'},
 {id:'stone_axe',name:'礫の斧',attack:4,rarity:'common',source:'gacha',affinity:'vocab',shape:'axe'},
 {id:'bronze_scythe',name:'銀ねずみの鎌',attack:4,rarity:'common',source:'gacha',affinity:'vocab',shape:'scythe'},
 {id:'rain_crossbow',name:'雨音の弩',attack:4,rarity:'common',source:'gacha',affinity:'listen',shape:'crossbow'},
 {id:'moth_claw',name:'夜蛾の爪',attack:3,rarity:'common',source:'gacha',affinity:'grammar',shape:'claw'},
 {id:'oak_shield',name:'樫の盾',attack:3,rarity:'common',source:'gacha',affinity:'speak',shape:'shield'},
 {id:'tidal_whip',name:'潮風の鞭',attack:3,rarity:'common',source:'gacha',affinity:'listen',shape:'whip'},
 {id:'amber_sabre',name:'琥珀の曲刀',attack:4,rarity:'common',source:'gacha',affinity:'grammar',shape:'sword'},
 {id:'silver_edge',name:'銀月の刃',attack:5,rarity:'rare',source:'gacha',affinity:'speak',shape:'sword'},
 {id:'north_bow',name:'北風の弓',attack:5,rarity:'rare',source:'gacha',affinity:'listen',shape:'bow'},
 {id:'rune_hammer',name:'刻印ハンマー',attack:5,rarity:'rare',source:'gacha',affinity:'grammar',shape:'hammer'},
 {id:'ivy_lance',name:'蔦の長槍',attack:5,rarity:'rare',source:'gacha',affinity:'vocab',shape:'spear'},
 {id:'aurora_wand',name:'極光のワンド',attack:5,rarity:'rare',source:'gacha',affinity:'listen',shape:'staff'},
 {id:'meteor_axe',name:'流星の斧',attack:6,rarity:'rare',source:'gacha',affinity:'speak',shape:'axe'},
 {id:'mirror_dagger',name:'鏡合わせの短剣',attack:5,rarity:'rare',source:'gacha',affinity:'grammar',shape:'dagger'},
 {id:'coral_sword',name:'珊瑚の剣',attack:6,rarity:'rare',source:'gacha',affinity:'vocab',shape:'sword'},
 {id:'crystal_scythe',name:'水晶の大鎌',attack:6,rarity:'rare',source:'gacha',affinity:'grammar',shape:'scythe'},
 {id:'comet_crossbow',name:'彗星の弩',attack:6,rarity:'rare',source:'gacha',affinity:'vocab',shape:'crossbow'},
 {id:'wolf_claw',name:'白狼の爪',attack:6,rarity:'rare',source:'gacha',affinity:'speak',shape:'claw'},
 {id:'midnight_shield',name:'夜半の盾',attack:5,rarity:'rare',source:'gacha',affinity:'listen',shape:'shield'},
 {id:'tempest_whip',name:'疾風の鞭',attack:5,rarity:'rare',source:'gacha',affinity:'speak',shape:'whip'},
 {id:'thunder_javelin',name:'雷鳴の投槍',attack:7,rarity:'epic',source:'gacha',affinity:'speak',shape:'spear'},
 {id:'glacier_bow',name:'氷河の弓',attack:7,rarity:'epic',source:'gacha',affinity:'listen',shape:'bow'},
 {id:'oracle_staff',name:'予言者の杖',attack:7,rarity:'epic',source:'gacha',affinity:'grammar',shape:'staff'},
 {id:'titan_hammer',name:'巨人のハンマー',attack:7,rarity:'epic',source:'gacha',affinity:'vocab',shape:'hammer'},
 {id:'solar_blade',name:'太陽の聖剣',attack:8,rarity:'epic',source:'gacha',affinity:'speak',shape:'sword'},
 {id:'night_reaper',name:'夜渡りの大鎌',attack:8,rarity:'epic',source:'gacha',affinity:'listen',shape:'axe'},
 {id:'eclipse_scythe',name:'月蝕の大鎌',attack:8,rarity:'epic',source:'gacha',affinity:'vocab',shape:'scythe'},
 {id:'storm_crossbow',name:'轟雷の連弩',attack:8,rarity:'epic',source:'gacha',affinity:'listen',shape:'crossbow'},
 {id:'seraph_claw',name:'星翼の爪',attack:8,rarity:'epic',source:'gacha',affinity:'grammar',shape:'claw'},
 {id:'eternal_crest',name:'永遠の星剣',attack:9,rarity:'legend',source:'gacha',affinity:'grammar',shape:'sword'},
 {id:'worldtree_scepter',name:'世界樹の宝杖',attack:9,rarity:'legend',source:'gacha',affinity:'vocab',shape:'staff'},
 {id:'celestial_aegis',name:'天穹の聖盾',attack:9,rarity:'legend',source:'gacha',affinity:'speak',shape:'shield'},
 {id:'infinity_whip',name:'無窮の星鞭',attack:9,rarity:'legend',source:'gacha',affinity:'listen',shape:'whip'}
].map(item=>Object.freeze(item)));

const BY_ID=new Map(WEAPONS.map(item=>[item.id,item]));
const AREA_WORLD=Object.freeze({entry:'forest',glade:'forest',thicket:'forest',sanctuary:'forest',city:'city','city-market':'city','city-terminal':'city','city-blizzard':'city','ruins-gate':'ruins','ruins-core':'ruins'});
export const WEAPON_RARITY_LABELS=Object.freeze({common:'通常',rare:'レア',epic:'エピック',legend:'伝説'});
export const WEAPON_AFFINITY_LABELS=Object.freeze({speak:'Speak',listen:'Listen',vocab:'単語',grammar:'文法'});
export const MAX_WEAPON_AWAKENING=3;
export const AWAKENING_COSTS=Object.freeze({
 common:Object.freeze([2,3,4]),rare:Object.freeze([2,3,5]),
 epic:Object.freeze([3,5,7]),legend:Object.freeze([3,6,9])
});
const countUpTo=(value,max)=>Number.isSafeInteger(value)&&value>=0?Math.min(max,value):0;
const weaponById=id=>BY_ID.get(id)||null;

export function normalizeEquipment(value){
 const inventory=[...new Set((Array.isArray(value?.weaponInventory)?value.weaponInventory:[])
   .filter(id=>typeof id==='string'&&BY_ID.has(id)))].slice(0,WEAPONS.length);
 const equippedWeaponId=inventory.includes(value?.equippedWeaponId)?value.equippedWeaponId:null;
 const shards=value?.weaponShards&&typeof value.weaponShards==='object'&&!Array.isArray(value.weaponShards)?value.weaponShards:{};
 const awakened=value?.weaponAwakening&&typeof value.weaponAwakening==='object'&&!Array.isArray(value.weaponAwakening)?value.weaponAwakening:{};
 return {weaponInventory:inventory,equippedWeaponId,
  weaponShards:Object.fromEntries(inventory.map(id=>[id,countUpTo(shards[id],999)]).filter(([,count])=>count>0)),
  weaponAwakening:Object.fromEntries(inventory.map(id=>[id,countUpTo(awakened[id],MAX_WEAPON_AWAKENING)]).filter(([,level])=>level>0))};
}
export function awakeningProgress(save,id){
 const weapon=weaponById(id),owned=Boolean(weapon&&save?.weaponInventory?.includes(id));
 const rank=owned?countUpTo(save?.weaponAwakening?.[id],MAX_WEAPON_AWAKENING):0;
 const shards=owned?countUpTo(save?.weaponShards?.[id],999):0;
 const requirement=owned&&rank<MAX_WEAPON_AWAKENING?AWAKENING_COSTS[weapon.rarity][rank]:0;
 return {rank,shards,requirement,canAwaken:Boolean(requirement&&shards>=requirement),maxed:owned&&rank===MAX_WEAPON_AWAKENING};
}
export function grantDuplicateShard(save,id){
 if(!weaponById(id)||!save?.weaponInventory?.includes(id))return save;
 return {...save,weaponShards:{...save.weaponShards,[id]:Math.min(999,countUpTo(save.weaponShards?.[id],999)+1)}};
}
export function awakenWeapon(save,id){
 const {canAwaken,rank,shards,requirement}=awakeningProgress(save,id);
 if(!canAwaken)return {save,awakened:false};
 const weaponShards={...save.weaponShards,[id]:shards-requirement};
 if(!weaponShards[id])delete weaponShards[id];
 return {save:{...save,weaponShards,weaponAwakening:{...save.weaponAwakening,[id]:rank+1}},awakened:true,rank:rank+1};
}
export function weaponAttack(save,weapon){
 return (weapon?.attack||0)+(weapon?.id?awakeningProgress(save,weapon.id).rank:0);
}
export function equippedWeapon(save){
 const weapon=Array.isArray(save?.weaponInventory)&&save.weaponInventory.includes(save?.equippedWeaponId)
   ?BY_ID.get(save.equippedWeaponId)||null:null;
 return weapon?{...weapon,attack:weaponAttack(save,weapon),awakeningRank:awakeningProgress(save,weapon.id).rank}:null;
}
export function equipWeapon(save,id){
 if(id!==null&&(!BY_ID.has(id)||!Array.isArray(save.weaponInventory)||!save.weaponInventory.includes(id)))return save;
 return {...save,equippedWeaponId:id};
}
export function levelAttackBonus(level=1){
 const safe=Number.isFinite(level)?Math.max(1,Math.floor(level)):1;
 return Math.min(4,Math.floor((safe-1)/3)); // Lv.4, 7, 10, 13
}
// A weapon's skill affinity rewards an unaided correct answer, never a hint,
// transcript or example. The bonus affects HP damage, not English grading or
// the mandatory three independently checked boss seals.
export function weaponAffinityBonus(save,kind,{independent=false}={}){
 const weapon=equippedWeapon(save);
 return independent&&kind&&weapon?.affinity===kind?(['epic','legend'].includes(weapon.rarity)?2:1):0;
}
export function scaledStrikeDamage(baseDamage,level,save,{kind=null,independent=false}={}){
 const base=Number.isFinite(baseDamage)?Math.max(1,Math.floor(baseDamage)):1;
 return Math.min(30,Math.max(2,base+1)+levelAttackBonus(level)+(equippedWeapon(save)?.attack||0)+weaponAffinityBonus(save,kind,{independent}));
}

// First boss clear guarantees its area weapon. Replays can reveal one rare
// regional drop after enough independently verified English answers. Duplicates
// never consume a reward slot or create endless inventory stacks.
export function dungeonWeaponDrop(save,{areaId,completed=false,independent=0,random=Math.random}={}){
 // Hint-only or transcript-assisted clears cannot mint combat equipment.
 if(!completed||independent<3||!Object.hasOwn(AREA_WORLD,areaId))return {save,weapon:null};
 const owned=new Set(Array.isArray(save.weaponInventory)?save.weaponInventory:[]);
 const regular=WEAPONS.find(item=>item.areaId===areaId);
 let weapon=!owned.has(regular.id)?regular:null;
 if(!weapon&&independent>=4){
   const rare=WEAPONS.find(item=>item.rarity==='rare'&&item.world===AREA_WORLD[areaId]);
   const roll=Number(random());
   if(!owned.has(rare.id)&&Number.isFinite(roll)&&roll>=0&&roll<.25)weapon=rare;
 }
 if(!weapon)return {save,weapon:null};
 return {save:{...save,weaponInventory:[...owned,weapon.id],
   equippedWeaponId:owned.size===0?weapon.id:save.equippedWeaponId??null},weapon};
}

// A fifth (13+ HP) encounter can drop an exclusive trophy before the boss.
// At least two unaided successful hits in that fight are required. Only one of
// each trophy may ever be owned; defeat or leaving the dungeon does not erase it.
export function eliteWeaponDrop(save,{areaId,foeIndex=-1,defeated=false,independentHits=0,random=Math.random}={}){
 if(!defeated||foeIndex<0||foeIndex%5!==4||independentHits<2||!Object.hasOwn(AREA_WORLD,areaId))return {save,weapon:null};
 const weapon=WEAPONS.find(item=>item.eliteWorld===AREA_WORLD[areaId]);
 if(!weapon||save.weaponInventory?.includes(weapon.id))return {save,weapon:null};
 const roll=Number(random());
 if(!Number.isFinite(roll)||roll<0||roll>=.18)return {save,weapon:null};
 const owned=Array.isArray(save.weaponInventory)?save.weaponInventory:[];
 return {save:{...save,weaponInventory:[...owned,weapon.id],
   equippedWeaponId:owned.length===0?weapon.id:save.equippedWeaponId??null},weapon};
}
