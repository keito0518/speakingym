// First truly playable vertical slice: three communication gates in Speaking Forest.
// Forest souvenirs are cosmetic only. They never modify language grade or XP.
import { ALL_PROMPTS } from './monster-data.js';

export const FOREST_ROUTES = Object.freeze([
  { id:'sunlit', name:'ひだまりの小道', tag:'SUNLIT TRAIL', detail:'木漏れ日をたどって、金色の葉っぱを探そう。', symbol:'☀' },
  { id:'moss', name:'こけむした抜け道', tag:'MOSS TRAIL', detail:'キノコの灯りに誘われて、静かな道を進もう。', symbol:'✦' }
]);
export const FOREST_STAGES = Object.freeze([
  { id:'wooden-gate', name:'森の入り口', chapter:'GATE 1', detail:'森の番人に、考える時間が欲しいことを英語で伝えよう。', emoji:'🌱' },
  { id:'whispering-bridge', name:'ささやく橋', chapter:'GATE 2', detail:'橋の案内を聞き逃した！ 丁寧に聞き返して道を確かめよう。', emoji:'🌉' },
  { id:'crossroads', name:'古い分かれ道', chapter:'GATE 3', detail:'森を抜ける道を選びたい。自分の希望を英語で伝えよう。', emoji:'🌳' }
]);
const BASE_SETS=Object.freeze([
  ['think-cafe','repeat-station','prefer-city'],
  ['think-trip','repeat-class','prefer-friend']
]);
export const FOREST_RELICS=Object.freeze({
 'sunlit-leaf':{name:'Sunleaf',meaning:'ひだまりの葉',description:'ひだまりの小道で拾った光る葉っぱ。',emoji:'🍃'},
 'moss-lantern':{name:'Mosslight',meaning:'こけの灯り',description:'こけむした抜け道で見つけた不思議な光。',emoji:'✨'},
 'golden-yolk':{name:'Golden Yolk',meaning:'金色の黄身',description:'進化したYolkieが見つけた秘密の卵。',emoji:'🥚'},
 'lost-button':{name:'Lost Button',meaning:'落とし物のボタン',description:'進化したSoxieが拾った、小さな誰かの忘れ物。',emoji:'🔘'}
});
export function cleanForest(input){
 const source=input&&typeof input==='object'?input:{};
 const ids=Object.keys(FOREST_RELICS);
 return {
  clears:Number.isSafeInteger(source.clears)&&source.clears>=0?Math.min(source.clears,100000):0,
  bestWave:Number.isSafeInteger(source.bestWave)&&source.bestWave>=0?Math.min(source.bestWave,100000):0,
  routes:[...new Set((Array.isArray(source.routes)?source.routes:[]).filter(x=>FOREST_ROUTES.some(r=>r.id===x)))],
  relics:[...new Set((Array.isArray(source.relics)?source.relics:[]).filter(x=>ids.includes(x)))],
 };
}
export function getForestPrompts(save,difficulty=save.difficulty||'easy'){
 if(!['easy','normal','hard'].includes(difficulty))throw new Error('Invalid forest difficulty');
 const visited=cleanForest(save.forest).clears;
 const set=BASE_SETS[visited%BASE_SETS.length];
 const prompts=set.map(baseId=>ALL_PROMPTS.find(p=>(p.baseId||p.id)===baseId&&(p.difficulty||'easy')===difficulty));
 if(prompts.length!==3 || prompts.some(p=>!p)||new Set(prompts.map(p=>p.phraseId)).size!==3)throw new Error('Forest curriculum unavailable');
 return prompts;
}
export function finishForest(save,routeId,companionId){
 if(!FOREST_ROUTES.some(r=>r.id===routeId))throw new Error('Invalid forest route');
 if(!save.ownedMonsters?.includes(companionId))throw new Error('Companion is not owned');
 const before=cleanForest(save.forest);
 const fresh=new Set(before.relics);
 const earned=[routeId==='sunlit'?'sunlit-leaf':'moss-lantern'];
 // A narrow, purely cosmetic exploration perk tied to evolved companions.
 const evolved=(save.monsterXp?.[companionId]||0)>=160;
 if(evolved && companionId==='medamago'&&routeId==='sunlit')earned.push('golden-yolk');
 if(evolved && companionId==='katappo'&&routeId==='moss')earned.push('lost-button');
 const discovered=earned.filter(id=>!fresh.has(id));
 const next={
  ...save,
  forest:{
   clears:before.clears+1,
   bestWave:before.bestWave,
   routes:[...new Set([...before.routes,routeId])],
   relics:[...new Set([...before.relics,...earned])]
  }
 };
 return {save:next,discovered,route:FOREST_ROUTES.find(r=>r.id===routeId)};
}
