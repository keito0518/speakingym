// First truly playable vertical slice: three communication gates in Speaking Forest.
// Forest souvenirs are cosmetic only. They never modify language grade or XP.
import { ALL_PROMPTS } from './monster-data.js';
import { FOREST_EVENTS, forestEventChoice } from './forest-events.js';

export const FOREST_ROUTES = Object.freeze([
  { id:'sunlit', name:'ひだまりの小道', tag:'SUNLIT TRAIL', detail:'木漏れ日をたどって、金色の葉っぱを探そう。' },
  { id:'moss', name:'こけむした抜け道', tag:'MOSS TRAIL', detail:'キノコの灯りに誘われて、静かな道を進もう。' }
]);
// A chapter is a full eight-answer expedition, with a distinct mixture of
// encounters. Clearing one chapter unlocks the next; old saves remain usable.
export const FOREST_AREAS=Object.freeze([
 {id:'entry',name:'森の入口',english:'WOODLAND GATE',goal:'思いを丁寧に伝え、聞き返す',story:'森の入口で仲間を見つけ、トゲ王の質問に英語で答えよう。',focus:['think','repeat','help','late']},
 {id:'glade',name:'木漏れ日の小道',english:'SUNLIT GLADE',goal:'音声を聞き分け、旅の相談を進める',story:'光の道で会話の手がかりを集め、光の番人を突破しよう。',focus:['booking','direction','recommend','prefer']},
 {id:'thicket',name:'迷いの深林',english:'WHISPERING THICKET',goal:'文章を読み、語彙と条件を見落とさない',story:'迷いの霧に隠された文章を読み解き、幻影の騎士に挑もう。',focus:['problem','clarify','change','apology']},
 {id:'sanctuary',name:'古木の聖域',english:'ANCIENT SANCTUARY',goal:'複数の情報を組み合わせて意思を伝える',story:'古木の守護者との最終対話。聞いて、考えて、自分の英語で伝えよう。',focus:['late','agree','prefer','recommend']}
]);
export function unlockedForestAreas(save){
 const cleared=cleanForest(save?.forest).completedAreas;
 const unlocked=Math.min(FOREST_AREAS.length,cleared.length+1);
 return FOREST_AREAS.slice(0,unlocked);
}
export function nextForestArea(save){
 const cleared=cleanForest(save?.forest).completedAreas;
 return FOREST_AREAS.find(area=>!cleared.includes(area.id))||FOREST_AREAS.at(-1);
}
export const FOREST_STAGES = Object.freeze([
  { id:'wooden-gate', name:'森の入り口', chapter:'GATE 1', detail:'森の番人に、考える時間が欲しいことを英語で伝えよう。' },
  { id:'whispering-bridge', name:'ささやく橋', chapter:'GATE 2', detail:'橋の案内を聞き逃した！ 丁寧に聞き返して道を確かめよう。' },
  { id:'crossroads', name:'古い分かれ道', chapter:'GATE 3', detail:'森を抜ける道を選びたい。自分の希望を英語で伝えよう。' }
]);
const BASE_SETS=Object.freeze([
  ['think-cafe','repeat-station','prefer-city'],
  ['think-trip','repeat-class','prefer-friend']
]);
export const FOREST_RELICS=Object.freeze({
 'sunlit-leaf':{name:'Sunleaf',meaning:'ひだまりの葉',description:'ひだまりの小道で拾った光る葉っぱ。'},
 'moss-lantern':{name:'Mosslight',meaning:'こけの灯り',description:'こけむした抜け道で見つけた不思議な光。'},
 'golden-yolk':{name:'Golden Yolk',meaning:'金色の黄身',description:'進化したYolkieが見つけた秘密の卵。'},
 'lost-button':{name:'Lost Button',meaning:'落とし物のボタン',description:'進化したSoxieが拾った、小さな誰かの忘れ物。'}
 ,'sunbeam':{name:'Sunbeam',meaning:'木漏れ日の結晶',description:'光の番人の試練を抜けた証。'}
 ,'mist-seal':{name:'Mist Seal',meaning:'霧の封印',description:'迷いの深林を見破った証。'}
 ,'ancient-acorn':{name:'Ancient Acorn',meaning:'古木のどんぐり',description:'聖域の守護者から託された宝物。'}
});
export function cleanForest(input){
 const source=input&&typeof input==='object'?input:{};
 const ids=Object.keys(FOREST_RELICS);
 const allowed=FOREST_AREAS.map(area=>area.id);
 const completed=Array.isArray(source.completedAreas)?source.completedAreas:
   // Before chapters existed, a completed Forest was the entrance expedition.
   (Number.isSafeInteger(source.clears)&&source.clears>0?['entry']:[]);
 return {
  clears:Number.isSafeInteger(source.clears)&&source.clears>=0?Math.min(source.clears,100000):0,
  bestWave:Number.isSafeInteger(source.bestWave)&&source.bestWave>=0?Math.min(source.bestWave,100000):0,
  routes:[...new Set((Array.isArray(source.routes)?source.routes:[]).filter(x=>FOREST_ROUTES.some(r=>r.id===x)))],
  relics:[...new Set((Array.isArray(source.relics)?source.relics:[]).filter(x=>ids.includes(x)))],
  completedAreas:[...new Set(completed.filter(x=>allowed.includes(x)))],
  recentPromptIds:[...new Set((Array.isArray(source.recentPromptIds)?source.recentPromptIds:[]).filter(id=>ALL_PROMPTS.some(p=>p.id===id)))].slice(-80),
  // A bounded, validated collection of distinct story decisions. Old saves
  // simply start with an empty journal; replaying the same choice adds nothing.
  journal:[...new Map((Array.isArray(source.journal)?source.journal:[])
    .filter(entry=>entry&&typeof entry==='object'&&typeof entry.eventId==='string'&&typeof entry.choiceId==='string')
    .filter(entry=>{
      const event=Object.values(FOREST_EVENTS).flatMap(routes=>Object.values(routes)).find(e=>e.id===entry.eventId);
      return Boolean(event&&forestEventChoice(event,entry.choiceId));
    }).map(entry=>[`${entry.eventId}:${entry.choiceId}`,{eventId:entry.eventId,choiceId:entry.choiceId}])).values()].slice(-16),
 };
}
// Story memories do not affect English grading, XP, monster unlocks or
// chapter clears. Persist only explicit player choices, not page revisits.
export function recordForestEvent(save,eventId,choiceId){
 const event=Object.values(FOREST_EVENTS).flatMap(routes=>Object.values(routes)).find(e=>e.id===eventId);
 if(!event || !forestEventChoice(event,choiceId))throw new Error('Unknown forest event choice');
 const current=cleanForest(save.forest);
 if(current.journal.some(item=>item.eventId===eventId&&item.choiceId===choiceId))
   return {save,discovered:false};
 return {save:{...save,forest:{...current,journal:[...current.journal,{eventId,choiceId}].slice(-16)}},discovered:true};
}
export function getForestPrompts(save,difficulty=save.difficulty||'easy'){
 if(!['easy','normal','hard'].includes(difficulty))throw new Error('Invalid forest difficulty');
 const visited=cleanForest(save.forest).clears;
 const set=BASE_SETS[visited%BASE_SETS.length];
 const prompts=set.map(baseId=>ALL_PROMPTS.find(p=>(p.baseId||p.id)===baseId&&(p.difficulty||'easy')===difficulty));
 if(prompts.length!==3 || prompts.some(p=>!p)||new Set(prompts.map(p=>p.phraseId)).size!==3)throw new Error('Forest curriculum unavailable');
 return prompts;
}
export function finishForest(save,routeId,companionId,areaId='entry',promptIds=[],recordAreaClear=true){
 if(!FOREST_ROUTES.some(r=>r.id===routeId))throw new Error('Invalid forest route');
 if(!save.ownedMonsters?.includes(companionId))throw new Error('Companion is not owned');
 if(!FOREST_AREAS.some(area=>area.id===areaId))throw new Error('Invalid forest area');
 if(recordAreaClear&&!unlockedForestAreas(save).some(area=>area.id===areaId))throw new Error('Forest area is locked');
 const before=cleanForest(save.forest);
 const fresh=new Set(before.relics);
 const earned=[routeId==='sunlit'?'sunlit-leaf':'moss-lantern'];
 const areaTreasure={glade:'sunbeam',thicket:'mist-seal',sanctuary:'ancient-acorn'}[areaId];
 if(areaTreasure&&recordAreaClear)earned.push(areaTreasure);
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
   relics:[...new Set([...before.relics,...earned])],
   completedAreas:recordAreaClear?[...new Set([...before.completedAreas,areaId])]:before.completedAreas,
   recentPromptIds:[...new Set([...before.recentPromptIds,...promptIds.filter(id=>ALL_PROMPTS.some(p=>p.id===id))])].slice(-80),
   journal:before.journal
  }
 };
 return {save:next,discovered,route:FOREST_ROUTES.find(r=>r.id===routeId)};
}
