import { ALL_PROMPTS } from './monster-data.js';
import { bossConversationFor } from './forest-boss-story.js';
import { FOREST_AREAS } from './forest-engine.js';

// Speaking Forest: 5 encounters, then a three-hit boss. Unique tasks per wave.
export const FOREST_MOBS=Object.freeze([
  {id:'mossling',name:'Mossling',japanese:'こけのいたずらっ子'},
  {id:'thistlet',name:'Thistlet',japanese:'とげとげの番人'},
  {id:'spookap',name:'Spookap',japanese:'こだまキノコ'},
  {id:'bramblet',name:'Bramblet',japanese:'道をふさぐ木の実'},
  {id:'mothum',name:'Mothum',japanese:'月あかりの蛾'}
]);
export const FOREST_BOSS=Object.freeze({id:'thornking',name:'Thorn King',japanese:'森のトゲ王',hp:3});
export const AREA_BOSSES=Object.freeze({
 entry:FOREST_BOSS,
 glade:Object.freeze({id:'sunwarden',name:'Sun Warden',japanese:'光の番人',hp:3}),
 thicket:Object.freeze({id:'mistknight',name:'Mist Knight',japanese:'霧の騎士',hp:3}),
 sanctuary:Object.freeze({id:'elderroot',name:'Elder Root',japanese:'古木の守護者',hp:3})
});
const AREA_MOBS=Object.freeze({
 entry:FOREST_MOBS,
 glade:['Sunmoss','Beethorn','Glowcap','Ambernut','Daymoth'].map((name,i)=>({id:['sunmoss','beethorn','glowcap','ambernut','daymoth'][i],name,japanese:['ひなたのこけ','蜜の番人','光るキノコ','琥珀の実','昼の蛾'][i]})),
 thicket:['Fogling','Nightthorn','Whispercap','Bitterbud','Duskmoth'].map((name,i)=>({id:['fogling','nightthorn','whispercap','bitterbud','duskmoth'][i],name,japanese:['霧の子','夜のとげ','ささやくキノコ','苦い木の実','夕闇の蛾'][i]})),
 sanctuary:['Rootlet','Ancienthorn','Oraclecap','Stonebud','Starmoth'].map((name,i)=>({id:['rootlet','ancienthorn','oraclecap','stonebud','starmoth'][i],name,japanese:['小さな古木','古代のとげ','予言のキノコ','石の木の実','星の蛾'][i]}))
});
const AREA_SKILLS=Object.freeze({
 entry:['speak','listen','vocab','grammar','speak'],
 glade:['listen','vocab','speak','grammar','read'],
 thicket:['read','grammar','speak','listen','vocab'],
 sanctuary:['speak','listen','vocab','read','grammar']
});
// Foes telegraph their own defensive stance. These patterns are cosmetic:
// neither verdicts nor the XP ledger depend on enemy type.
export const FOREST_TACTICS=Object.freeze({
 mossling:Object.freeze({preferredKind:'speak',name:'霧のこだま',tell:'音に反応して、霧の中を跳ね回る',guard:'霧に身を隠して、攻撃をかわした'}),
 thistlet:Object.freeze({preferredKind:'listen',name:'トゲの構え',tell:'トゲを広げて、こちらの返事を待っている',guard:'トゲを閉じて身を守った'}),
 spookap:Object.freeze({preferredKind:'vocab',name:'きのこの幻影',tell:'ふわっと揺れながら、偽物の姿を見せる',guard:'分身を残して、ひらりと逃げた'}),
 bramblet:Object.freeze({preferredKind:'grammar',name:'木の実のよろい',tell:'固い殻を鳴らして、攻撃に備える',guard:'木の実の殻で、攻撃をはじいた'}),
 mothum:Object.freeze({preferredKind:'speak',name:'月光の羽',tell:'月の光をまとい、ゆっくり羽ばたく',guard:'羽を閉じて、月明かりにまぎれた'}),
 thornking:Object.freeze({preferredKind:'mixed',name:'トゲ王の結界',tell:'いばらの結界が、周囲に広がっている',guard:'いばらの結界が、攻撃を防いだ'})
});
export function enemyTacticFor(index,wave=1,areaId='entry'){
 const foe=opponentFor(index,wave,areaId);
 if(FOREST_TACTICS[foe.id])return FOREST_TACTICS[foe.id];
 const original=index>=REGULAR_ENCOUNTERS?FOREST_TACTICS.thornking:
   FOREST_TACTICS[FOREST_MOBS[(index+wave-1)%FOREST_MOBS.length].id];
 const theme={glade:'光',thicket:'霧',sanctuary:'古木'}[areaId];
 return {preferredKind:AREA_SKILLS[areaId][index%AREA_SKILLS[areaId].length]||'mixed',name:`${theme}の${original.name}`,
   tell:`${theme}の力をまとっている。${original.tell}`,guard:`${theme}の力で防御した`};
}
export const REGULAR_ENCOUNTERS=5;
export const BOSS_HITS=3;
export const FOREST_WAVE_LENGTH=REGULAR_ENCOUNTERS+BOSS_HITS;
export const REGULAR_BY_AREA=Object.freeze({entry:5,glade:7,thicket:10,sanctuary:10});
export function regularEncountersFor(areaId='entry'){return REGULAR_BY_AREA[areaId]||REGULAR_ENCOUNTERS;}
export function forestWaveLengthFor(areaId='entry'){return regularEncountersFor(areaId)+BOSS_HITS;}
export const DIFFICULTY_TRIES=Object.freeze({easy:3,normal:2,hard:1});
export function forestLevel(start='easy',wave=1){
 if(!Object.hasOwn(DIFFICULTY_TRIES,start)||!Number.isInteger(wave)||wave<1)throw Error('Invalid forest difficulty or wave');
 return ['easy','normal','hard'][Math.min(2,['easy','normal','hard'].indexOf(start)+Math.floor((wave-1)/2))];
}
function shuffle(items,random) {
 const pool=[...items];
 for(let i=pool.length-1;i>0;i--){
   const r=Number(random());
   const j=Math.max(0,Math.min(i,Math.floor((Number.isFinite(r)?r:0)* (i+1))));
   [pool[i],pool[j]]=[pool[j],pool[i]];
 }
 return pool;
}
export function buildForestWave({difficulty='easy',wave=1,areaId='entry',progression='endless',previousIds=[],reviewPhraseIds=[],reviewPromptIds=[],quizWeaknessIds=[],bossConversation=false,random=Math.random}={}){
 if(!AREA_SKILLS[areaId])throw Error('Unknown forest area');
 const level=progression==='story'?difficulty:forestLevel(difficulty,wave);
 if(!DIFFICULTY_TRIES[level])throw Error('Invalid forest difficulty');
 const pool=ALL_PROMPTS.filter(p=>(p.difficulty||'easy')===level);
 const bossStages=bossConversation&&areaId==='entry'?bossConversationFor(wave,level):null;
 const reservedBossIds=new Set((bossStages||[]).map(turn=>turn.id));
 const previous=new Set(previousIds);
 const dueIds=new Set(reviewPromptIds);
 const duePhrases=new Set(reviewPhraseIds);
 const weakQuizIds=new Set(quizWeaknessIds);
 const weakTopics=new Set(quizWeaknessIds.map(id=>ALL_PROMPTS.find(p=>p.id===id)).filter(Boolean).map(p=>p.baseId||p.id));
 const shuffled=shuffle(pool.filter(prompt=>!prompt.bossOnly),random);
 const usedIds=new Set(),usedPhrases=new Set(),prompts=[];
 const regular=regularEncountersFor(areaId);
 // Each enemy presents its own skill. The last three encounters form a
 // listening -> grammar/vocabulary -> speaking boss gauntlet.
 const kinds=Array.from({length:regular},(_,index)=>areaId==='entry'?enemyTacticFor(index,wave,areaId).preferredKind:AREA_SKILLS[areaId][index%AREA_SKILLS[areaId].length]);
 const bossMiddle=areaId==='entry'?(wave%2===1?'grammar':'vocab'):
   areaId==='glade'||areaId==='sanctuary'?'vocab':'grammar';
 kinds.push('listen',bossMiddle,'speak');
 for(let slot=0;slot<kinds.length;slot++){
   const kind=kinds[slot];
   if(bossStages&&slot>=regular){
     const chosen=pool.find(p=>p.id===bossStages[slot-regular].id);
     if(!chosen||chosen.kind!==kind||usedIds.has(chosen.id))throw Error('Invalid authored boss conversation turn');
     prompts.push(chosen);usedIds.add(chosen.id);usedPhrases.add(chosen.phraseId);
     continue;
   }
   // An overdue reading response still belongs in a speaking encounter:
   // learners read a short clue then answer in English, preserving old reviews.
   const matches=p=>p.kind===kind||(kind==='speak'&&slot<regular&&p.kind==='read'&&dueIds.has(p.id));
   let candidates=shuffled.filter(p=>matches(p)&&!usedIds.has(p.id)&&!reservedBossIds.has(p.id));
   if(!candidates.length)throw Error('Not enough unique '+kind+' prompts for this difficulty');
   // Apply cross-chapter novelty BEFORE filtering for a new phrase within the
   // current chapter. Otherwise a repeated grammar question can win simply
   // because its phrase has not yet appeared in this chapter.
   if(!candidates.some(p=>dueIds.has(p.id)||weakQuizIds.has(p.id))){
     const fresh=candidates.filter(p=>!previous.has(p.id));
     if(fresh.length)candidates=fresh;
   }
   // A missed vocabulary/grammar target beats generic phrase diversity.
   // When players switch difficulty, bring back the related topic instead.
   const exactWeakness=candidates.filter(p=>weakQuizIds.has(p.id));
   const relatedWeakness=candidates.filter(p=>weakTopics.has(p.baseId||p.id));
   if(exactWeakness.length)candidates=exactWeakness;
   else if(relatedWeakness.length)candidates=relatedWeakness;
   else {
     // Otherwise avoid repeating expressions within one adventure.
     const newPhrase=candidates.filter(p=>!usedPhrases.has(p.phraseId));
     if(newPhrase.length)candidates=newPhrase;
   }
   // Longer chapters should not recycle an earlier encounter merely because
   // a phrase-focus heuristic happens to prefer it. Explicit due reviews still
   // take precedence when the learner needs that exact exercise.
   if(!candidates.some(p=>dueIds.has(p.id)||weakQuizIds.has(p.id))){
     const unseen=candidates.filter(p=>!previous.has(p.id));
     if(unseen.length)candidates=unseen;
   }
   const focus=new Set(FOREST_AREAS.find(area=>area.id===areaId).focus);
   const scores=p=>[
     dueIds.has(p.id)?0:duePhrases.has(p.phraseId)?1:2,
     previous.has(p.id)?1:0,
     areaId==='entry'||focus.has(p.phraseId)?0:1
   ];
   candidates.sort((a,b)=>{
     const aa=scores(a),bb=scores(b);
     return aa[0]-bb[0]||aa[1]-bb[1]||aa[2]-bb[2];
   });
   const chosen=candidates[0];
   prompts.push(chosen);usedIds.add(chosen.id);usedPhrases.add(chosen.phraseId);
 }
 if(prompts.length!==forestWaveLengthFor(areaId)||new Set(prompts.map(p=>p.id)).size!==forestWaveLengthFor(areaId))
   throw Error('Invalid forest wave content');
 return {prompts,level,wave,areaId};
}
export function opponentFor(index,wave=1,areaId='entry'){
 if(!AREA_MOBS[areaId])throw Error('Unknown forest area');
 if(index>=regularEncountersFor(areaId))return AREA_BOSSES[areaId];
 if(index<0)throw Error('Invalid encounter index');
 return AREA_MOBS[areaId][(index+wave-1)%AREA_MOBS[areaId].length];
}
export function battleStatus({index=0,level='easy',endless=false,remaining=null}={}){
 const boss=index>=REGULAR_ENCOUNTERS;
 return {boss,stageLabel:boss?'BOSS':'ENCOUNTER',enemy:opponentFor(index),remaining:remaining??DIFFICULTY_TRIES[level],
   bossHit:boss?index-REGULAR_ENCOUNTERS+1:0,total:FOREST_WAVE_LENGTH};
}
// Cosmetic damage system: verdict and XP are unaffected by companion type.
export function specialStrike({companionId,evolved,boss,usedPower=false}){
 const y=companionId==='medamago'&&evolved&&boss&&!usedPower;
 return {strikes:y?2:1,ability:y?'DOUBLE YOLK':null,usedPower:y};
}
