// The same equipped weapon is shared by the expedition party. The learner
// chooses it outside battle; changing allies never changes the weapon.
// Items never influence English grading, XP awards or evolution trials.
export const WEAPONS=Object.freeze([
 {id:'wooden_blade',name:'旅立ちの木剣',attack:1,rarity:'common',areaId:'entry'},
 {id:'sun_dagger',name:'陽だまりの短剣',attack:1,rarity:'common',areaId:'glade'},
 {id:'mist_spear',name:'霧抜けの槍',attack:2,rarity:'common',areaId:'thicket'},
 {id:'elder_staff',name:'古木の杖',attack:2,rarity:'common',areaId:'sanctuary'},
 {id:'rail_saber',name:'線路のサーベル',attack:2,rarity:'common',areaId:'city'},
 {id:'market_knife',name:'雪市のナイフ',attack:2,rarity:'common',areaId:'city-market'},
 {id:'signal_lance',name:'信号のランス',attack:3,rarity:'common',areaId:'city-terminal'},
 {id:'frost_sword',name:'吹雪の大剣',attack:3,rarity:'common',areaId:'city-blizzard'},
 {id:'rune_blade',name:'碑文の剣',attack:3,rarity:'common',areaId:'ruins-gate'},
 {id:'chrono_edge',name:'時の刃',attack:4,rarity:'common',areaId:'ruins-core'},
 {id:'moonsteel',name:'月鋼の剣',attack:3,rarity:'rare',world:'forest'},
 {id:'snowguard',name:'雪守りの剣',attack:4,rarity:'rare',world:'city'},
 {id:'starlight',name:'星明かりの剣',attack:5,rarity:'rare',world:'ruins'}
].map(item=>Object.freeze(item)));

const BY_ID=new Map(WEAPONS.map(item=>[item.id,item]));
const AREA_WORLD=Object.freeze({entry:'forest',glade:'forest',thicket:'forest',sanctuary:'forest',city:'city','city-market':'city','city-terminal':'city','city-blizzard':'city','ruins-gate':'ruins','ruins-core':'ruins'});

export function normalizeEquipment(value){
 const inventory=[...new Set((Array.isArray(value?.weaponInventory)?value.weaponInventory:[])
   .filter(id=>typeof id==='string'&&BY_ID.has(id)))].slice(0,WEAPONS.length);
 const equippedWeaponId=inventory.includes(value?.equippedWeaponId)?value.equippedWeaponId:null;
 return {weaponInventory:inventory,equippedWeaponId};
}
export function equippedWeapon(save){
 return Array.isArray(save?.weaponInventory)&&save.weaponInventory.includes(save?.equippedWeaponId)
   ?BY_ID.get(save.equippedWeaponId)||null:null;
}
export function equipWeapon(save,id){
 if(id!==null&&(!BY_ID.has(id)||!Array.isArray(save.weaponInventory)||!save.weaponInventory.includes(id)))return save;
 return {...save,equippedWeaponId:id};
}
export function levelAttackBonus(level=1){
 const safe=Number.isFinite(level)?Math.max(1,Math.floor(level)):1;
 return Math.min(4,Math.floor((safe-1)/3)); // Lv.4, 7, 10, 13
}
export function scaledStrikeDamage(baseDamage,level,save){
 const base=Number.isFinite(baseDamage)?Math.max(1,Math.floor(baseDamage)):1;
 return Math.min(30,Math.max(2,base+1)+levelAttackBonus(level)+(equippedWeapon(save)?.attack||0));
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
