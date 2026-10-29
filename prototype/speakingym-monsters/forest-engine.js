// First truly playable vertical slice: three communication gates in Speaking Forest.
// Forest souvenirs are cosmetic only. They never modify language grade or XP.
import { ALL_PROMPTS } from './monster-data.js';
import { FOREST_EVENTS, forestEventChoice } from './forest-events.js';
import { BOSS_MEDAL_DIFFICULTIES, cleanBossMedals } from './boss-mastery.js';

export const FOREST_ROUTES = Object.freeze([
  { id:'sunlit', name:'ひだまりの小道', tag:'SUNLIT TRAIL', detail:'木漏れ日をたどって、金色の葉っぱを探そう。' },
  { id:'moss', name:'こけむした抜け道', tag:'MOSS TRAIL', detail:'キノコの灯りに誘われて、静かな道を進もう。' }
]);
export const CITY_ROUTES = Object.freeze([
 {id:'market',name:'雪のマーケット通り',tag:'WINTER MARKET',detail:'雪灯りの屋台で、お店の英語を確かめながら進もう。'},
 {id:'station',name:'雪の駅前通り',tag:'SNOW STATION',detail:'雪の駅前で交通案内を確かめ、待ち合わせ場所へ向かおう。'}
]);
// A chapter is a full eight-answer expedition, with a distinct mixture of
// encounters. Clearing one chapter unlocks the next; old saves remain usable.
export const FOREST_AREAS=Object.freeze([
 {id:'entry',name:'森の入口',english:'WOODLAND GATE',goal:'思いを丁寧に伝え、聞き返す',story:'森の入口で仲間を見つけ、トゲ王の質問に英語で答えよう。',focus:['think','repeat','help','late']},
 {id:'glade',name:'木漏れ日の小道',english:'SUNLIT GLADE',goal:'音声を聞き分け、旅の相談を進める',story:'光の道で会話の手がかりを集め、光の番人を突破しよう。',focus:['booking','direction','recommend','prefer']},
 {id:'thicket',name:'迷いの深林',english:'WHISPERING THICKET',goal:'文章を読み、語彙と条件を見落とさない',story:'迷いの霧に隠された文章を読み解き、幻影の騎士に挑もう。',focus:['problem','clarify','change','apology']},
 {id:'sanctuary',name:'古木の聖域',english:'ANCIENT SANCTUARY',goal:'複数の情報を組み合わせて意思を伝える',story:'古木の守護者との最終対話。聞いて、考えて、自分の英語で伝えよう。',focus:['late','agree','prefer','recommend']}
]);
// A distinct second dungeon. Unlock only after all original Forest chapters:
// no placeholder button and no changes to legacy Forest completion order.
export const CITY_AREAS=Object.freeze([
 {id:'city',name:'雪灯りの街・中央広場',english:'SNOWLIT CITY',world:'city',
  goal:'街の予定変更・問い合わせ・トラブルを解決する',
  story:'雪灯りの街で案内を読み、相手の説明を聞き、予定変更や困りごとを英語で伝えよう。',
  focus:['booking','direction','change','clarify','problem','agree']},
 {id:'city-market',name:'雪の商店街',english:'SNOW MARKET',world:'city',
  goal:'注文・返品・料金の確認を丁寧に伝える',
  story:'雪のマーケットで注文を工夫し、レシートを確認して、お店の人と相談しよう。',
  focus:['order','price','clarify','problem','apology']},
 {id:'city-terminal',name:'北のターミナル',english:'NORTH TERMINAL',world:'city',
  goal:'乗り換え・運休情報・予約変更に対応する',
  story:'冬のターミナルで接続時間を確かめ、遅れた列車の代わりの経路を尋ねよう。',
  focus:['direction','booking','change','late','clarify']},
 {id:'city-blizzard',name:'吹雪の街外れ',english:'BLIZZARD OUTSKIRTS',world:'city',
  goal:'予期せぬトラブルを説明し、代案を相談する',
  story:'吹雪で予定が変わった。状況を整理し、助けを求め、現実的な代案を英語で伝えよう。',
  focus:['problem','apology','clarify','prefer','change','help']}
]);
export const DUNGEON_AREAS=Object.freeze([...FOREST_AREAS,...CITY_AREAS]);
export const dungeonAreaFor=id=>DUNGEON_AREAS.find(area=>area.id===id)||null;
export function unlockedCityAreas(save){
 const cleared=new Set(cleanForest(save?.forest).completedAreas);
 if(!FOREST_AREAS.every(area=>cleared.has(area.id)))return [];
 // Sequential checkpoints, without taking existing `city` clears away.
 const firstUncleared=CITY_AREAS.findIndex(area=>!cleared.has(area.id));
 return CITY_AREAS.slice(0,firstUncleared<0?CITY_AREAS.length:firstUncleared+1);
}
export function unlockedDungeonAreas(save){return [...unlockedForestAreas(save),...unlockedCityAreas(save)];}
export function unlockedForestAreas(save){
 const cleared=new Set(cleanForest(save?.forest).completedAreas);
 const unlocked=Math.min(FOREST_AREAS.length,FOREST_AREAS.filter(area=>cleared.has(area.id)).length+1);
 return FOREST_AREAS.slice(0,unlocked);
}
export function nextForestArea(save){
 const cleared=cleanForest(save?.forest).completedAreas;
 return FOREST_AREAS.find(area=>!cleared.includes(area.id))||FOREST_AREAS.at(-1);
}
export function nextDungeonArea(save){
 const forest=cleanForest(save?.forest);
 const missingForest=FOREST_AREAS.find(area=>!forest.completedAreas.includes(area.id));
 return missingForest||CITY_AREAS.find(area=>!forest.completedAreas.includes(area.id))||CITY_AREAS.at(-1);
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
 ,'city-pass':{name:'City Pass',meaning:'街の通行証',description:'街での英語のやり取りを乗り越えた証。'}
 ,'market-stamp':{name:'Market Stamp',meaning:'市場の記念スタンプ',description:'マーケット通りで見つけた記念品。'}
 ,'station-stamp':{name:'Station Stamp',meaning:'駅の記念スタンプ',description:'ステーション通りで見つけた記念品。'}
 ,'market-bell':{name:'Winter Bell',meaning:'商店街の小さな鈴',description:'雪の商店街で、お店の人ときちんと意思を交わせた証。'}
 ,'terminal-ticket':{name:'North Ticket',meaning:'北行きの切符',description:'接続と乗り換えを英語で乗り越えた記念。'}
 ,'snow-crystal':{name:'Snow Crystal',meaning:'吹雪の結晶',description:'吹雪の中でも冷静に問題を説明できた証。'}
});
export function cleanForest(input){
 const source=input&&typeof input==='object'?input:{};
 const ids=Object.keys(FOREST_RELICS);
 const allowed=DUNGEON_AREAS.map(area=>area.id);
 const completed=Array.isArray(source.completedAreas)?source.completedAreas:
   // Before chapters existed, a completed Forest was the entrance expedition.
   (Number.isSafeInteger(source.clears)&&source.clears>0?['entry']:[]);
 return {
  clears:Number.isSafeInteger(source.clears)&&source.clears>=0?Math.min(source.clears,100000):0,
  bestWave:Number.isSafeInteger(source.bestWave)&&source.bestWave>=0?Math.min(source.bestWave,100000):0,
  routes:[...new Set((Array.isArray(source.routes)?source.routes:[]).filter(x=>[...FOREST_ROUTES,...CITY_ROUTES].some(r=>r.id===x)))],
  relics:[...new Set((Array.isArray(source.relics)?source.relics:[]).filter(x=>ids.includes(x)))],
  completedAreas:[...new Set(completed.filter(x=>allowed.includes(x)))],
  medals:cleanBossMedals(source.medals,allowed),
  recentPromptIds:[...new Set((Array.isArray(source.recentPromptIds)?source.recentPromptIds:[]).filter(id=>ALL_PROMPTS.some(p=>p.id===id)))].slice(-128),
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
export function finishForest(save,routeId,companionId,areaId='entry',promptIds=[],recordAreaClear=true,medalResult=null){
 const isCity=dungeonAreaFor(areaId)?.world==='city';
 const routePool=isCity?CITY_ROUTES:FOREST_ROUTES;
 if(!routePool.some(r=>r.id===routeId))throw new Error('Invalid forest route');
 if(!save.ownedMonsters?.includes(companionId))throw new Error('Companion is not owned');
 if(!DUNGEON_AREAS.some(area=>area.id===areaId))throw new Error('Invalid forest area');
 if(recordAreaClear&&!unlockedDungeonAreas(save).some(area=>area.id===areaId))throw new Error('Forest area is locked');
 const before=cleanForest(save.forest);
 const fresh=new Set(before.relics);
 const earned=[isCity?(routeId==='market'?'market-stamp':'station-stamp'):(routeId==='sunlit'?'sunlit-leaf':'moss-lantern')];
 const areaTreasure={glade:'sunbeam',thicket:'mist-seal',sanctuary:'ancient-acorn',city:'city-pass','city-market':'market-bell','city-terminal':'terminal-ticket','city-blizzard':'snow-crystal'}[areaId];
 if(areaTreasure&&recordAreaClear)earned.push(areaTreasure);
 // A narrow, purely cosmetic exploration perk tied to evolved companions.
 const evolved=(save.monsterXp?.[companionId]||0)>=160;
 if(!isCity&&evolved && companionId==='medamago'&&routeId==='sunlit')earned.push('golden-yolk');
 if(!isCity&&evolved && companionId==='katappo'&&routeId==='moss')earned.push('lost-button');
 const discovered=earned.filter(id=>!fresh.has(id));
 const difficulty=medalResult?.difficulty;
 const requestedRank=medalResult?.rank;
 const priorRank=before.medals[areaId]?.[difficulty]||0;
 const validMedal=recordAreaClear&&BOSS_MEDAL_DIFFICULTIES.includes(difficulty)&&
   Number.isInteger(requestedRank)&&requestedRank>=0&&requestedRank<=3;
 const rank=validMedal?Math.max(priorRank,requestedRank):priorRank;
 const next={
  ...save,
  forest:{
   clears:before.clears+1,
   bestWave:before.bestWave,
   routes:[...new Set([...before.routes,routeId])],
   relics:[...new Set([...before.relics,...earned])],
   completedAreas:recordAreaClear?[...new Set([...before.completedAreas,areaId])]:before.completedAreas,
   medals:validMedal&&rank?{...before.medals,[areaId]:{...before.medals[areaId],[difficulty]:rank}}:before.medals,
   recentPromptIds:[...new Set([...before.recentPromptIds,...promptIds.filter(id=>ALL_PROMPTS.some(p=>p.id===id))])].slice(-128),
   journal:before.journal
  }
 };
 return {save:next,discovered,route:routePool.find(r=>r.id===routeId),
   medal:validMedal?{difficulty,rank:requestedRank,best:rank,upgraded:rank>priorRank}:null};
}
