import { ALL_PROMPTS } from './monster-data.js';

// Speaking Forest: 5 encounters, then a three-hit boss. Unique tasks per wave.
export const FOREST_MOBS=Object.freeze([
  {id:'mossling',name:'Mossling',japanese:'こけのいたずらっ子'},
  {id:'thistlet',name:'Thistlet',japanese:'とげとげの番人'},
  {id:'spookap',name:'Spookap',japanese:'こだまキノコ'},
  {id:'bramblet',name:'Bramblet',japanese:'道をふさぐ木の実'},
  {id:'mothum',name:'Mothum',japanese:'月あかりの蛾'}
]);
export const FOREST_BOSS=Object.freeze({id:'thornking',name:'Thorn King',japanese:'森のトゲ王',hp:3});
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
export function enemyTacticFor(index,wave=1){
 const foe=opponentFor(index,wave);
 return FOREST_TACTICS[foe.id];
}
export const REGULAR_ENCOUNTERS=5;
export const BOSS_HITS=3;
export const FOREST_WAVE_LENGTH=REGULAR_ENCOUNTERS+BOSS_HITS;
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
export function buildForestWave({difficulty='easy',wave=1,previousIds=[],reviewPhraseIds=[],reviewPromptIds=[],random=Math.random}={}){
 const level=forestLevel(difficulty,wave);
 const pool=ALL_PROMPTS.filter(p=>(p.difficulty||'easy')===level);
 const previous=new Set(previousIds);
 const dueIds=new Set(reviewPromptIds);
 const duePhrases=new Set(reviewPhraseIds);
 const shuffled=shuffle(pool,random);
 const usedIds=new Set(),usedPhrases=new Set(),prompts=[];
 // Each enemy presents its own skill. The last three encounters form a
 // listening -> grammar/vocabulary -> speaking boss gauntlet.
 const kinds=Array.from({length:REGULAR_ENCOUNTERS},(_,index)=>enemyTacticFor(index,wave).preferredKind);
 const bossMiddle=wave%2===1?'grammar':'vocab';
 kinds.push('listen',bossMiddle,'speak');
 for(const kind of kinds){
   let candidates=shuffled.filter(p=>p.kind===kind&&!usedIds.has(p.id));
   if(!candidates.length)throw Error('Not enough unique '+kind+' prompts for this difficulty');
   // Prioritize exact missed tasks, then scheduled expressions and fresh scenes.
   // Do not repeat the same expression unless all available have already appeared.
   const newPhrase=candidates.filter(p=>!usedPhrases.has(p.phraseId));
   if(newPhrase.length)candidates=newPhrase;
   const scores=p=>[
     dueIds.has(p.id)?0:duePhrases.has(p.phraseId)?1:2,
     previous.has(p.id)?1:0
   ];
   candidates.sort((a,b)=>{
     const aa=scores(a),bb=scores(b);
     return aa[0]-bb[0]||aa[1]-bb[1];
   });
   const chosen=candidates[0];
   prompts.push(chosen);usedIds.add(chosen.id);usedPhrases.add(chosen.phraseId);
 }
 if(prompts.length!==FOREST_WAVE_LENGTH||new Set(prompts.map(p=>p.id)).size!==FOREST_WAVE_LENGTH)
   throw Error('Invalid forest wave content');
 return {prompts,level,wave};
}
export function opponentFor(index,wave=1){
 if(index>=REGULAR_ENCOUNTERS)return FOREST_BOSS;
 if(index<0)throw Error('Invalid encounter index');
 return FOREST_MOBS[(index+wave-1)%FOREST_MOBS.length];
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
