import { ALL_PROMPTS } from './monster-data.js';

// Speaking Forest: 5 encounters, then a three-hit boss. Unique tasks per wave.
export const FOREST_MOBS=Object.freeze([
  {id:'mossling',name:'Mossling',japanese:'こけのいたずらっ子',emoji:'🌿'},
  {id:'thistlet',name:'Thistlet',japanese:'とげとげの番人',emoji:'🌾'},
  {id:'spookap',name:'Spookap',japanese:'こだまキノコ',emoji:'🍄'},
  {id:'bramblet',name:'Bramblet',japanese:'道をふさぐ木の実',emoji:'🌰'},
  {id:'mothum',name:'Mothum',japanese:'月あかりの蛾',emoji:'🦋'}
]);
export const FOREST_BOSS=Object.freeze({id:'thornking',name:'Thorn King',japanese:'森のトゲ王',hp:3});
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
export function buildForestWave({difficulty='easy',wave=1,previousIds=[],random=Math.random}={}){
 const level=forestLevel(difficulty,wave);
 const pool=ALL_PROMPTS.filter(p=>(p.difficulty||'easy')===level);
 if(pool.length<FOREST_WAVE_LENGTH)throw Error('Not enough unique prompts');
 const previous=new Set(previousIds);
 // Choose variety across expressions, not 8 near-duplicates in a row.
 const grouped=new Map();
 for(const p of shuffle(pool,random)) {
  if(!grouped.has(p.phraseId))grouped.set(p.phraseId,[]);
  grouped.get(p.phraseId).push(p);
 }
 const expressions=shuffle([...grouped.keys()],random);
 const ordered=[];
 for(const phraseId of expressions){
  const group=grouped.get(phraseId);
  ordered.push(group.find(p=>!previous.has(p.id))||group[0]);
 }
 const available=shuffle(pool.filter(p=>!ordered.some(selected=>selected.id===p.id)),random);
 available.sort((a,b)=>Number(previous.has(a.id))-Number(previous.has(b.id)));
 ordered.push(...available.slice(0,FOREST_WAVE_LENGTH-ordered.length));
 const prompts=shuffle(ordered.slice(0,FOREST_WAVE_LENGTH),random);
 if(prompts.length!==FOREST_WAVE_LENGTH||new Set(prompts.map(p=>p.id)).size!==FOREST_WAVE_LENGTH)throw Error('Invalid forest wave content');
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
