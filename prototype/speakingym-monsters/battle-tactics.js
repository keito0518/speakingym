// Offline, deterministic battle rules. Learning grades are supplied separately:
// no matchup, skill or item is allowed to turn an incorrect answer into a pass.
export const BATTLE_KINDS=Object.freeze(['speak','listen','vocab','grammar']);
export const BATTLE_LABELS=Object.freeze({speak:'スピーキング',listen:'リスニング',vocab:'単語',grammar:'文法'});
export const ULTIMATE_MAX=3;
const FOE_TYPES=Object.freeze([
 {weak:'listen',resist:'grammar'},
 {weak:'speak',resist:'listen'},
 {weak:'vocab',resist:'speak'},
 {weak:'grammar',resist:'vocab'}
]);
const ALLY_TYPES=Object.freeze({
 medamago:{strong:'speak',weak:'listen'},katappo:{strong:'listen',weak:'grammar'},
 purupun:{strong:'vocab',weak:'speak'},koge:{strong:'grammar',weak:'listen'},
 cone:{strong:'listen',weak:'vocab'},nororo:{strong:'speak',weak:'grammar'},
 keshipon:{strong:'grammar',weak:'speak'},donako:{strong:'vocab',weak:'listen'},
 amekurage:{strong:'listen',weak:'speak'},fuwari:{strong:'listen',weak:'grammar'},
 kompass:{strong:'grammar',weak:'vocab'},pikap:{strong:'speak',weak:'grammar'},
 mokuryu:{strong:'vocab',weak:'speak'},yukibell:{strong:'listen',weak:'vocab'},
 railfox:{strong:'grammar',weak:'listen'}
});
// All companions have a named combat trait. A few share an archetype, but its
// trigger is always their *own* strength: English answers are still graded by
// the independent curriculum engine before any of these effects can occur.
const ALLY_SKILLS=Object.freeze({
 medamago:{name:'ことばの連撃',type:'burst'},katappo:{name:'聞き耳チャージ',type:'charge'},
 purupun:{name:'語彙ブレイク',type:'pierce'},koge:{name:'文法の鎧',type:'ward'},
 cone:{name:'反響レーダー',type:'charge'},nororo:{name:'ゆったり連撃',type:'burst'},
 keshipon:{name:'ルールの盾',type:'ward'},donako:{name:'ことばの突破口',type:'pierce'},
 amekurage:{name:'雨音のひらめき',type:'charge'},fuwari:{name:'音のクッション',type:'ward'},
 kompass:{name:'文法コンパス',type:'pierce'},pikap:{name:'ひらめきラッシュ',type:'burst'},
 mokuryu:{name:'言葉の貫通弾',type:'pierce'},yukibell:{name:'雪音チャージ',type:'charge'},
 railfox:{name:'鉄路の守り',type:'ward'}
});
const SKILL_DESCRIPTIONS=Object.freeze({
 burst:'得意技能で必殺技を使うとダメージ＋1',
 charge:'得意技能の自力防御でゲージ＋1（1戦に1回）',
 pierce:'得意技能の攻撃では敵の耐性を無視',
 ward:'得意技能の敵攻撃から受けるダメージ−1'
});
export function allySkill(id='medamago'){
 const skill=ALLY_SKILLS[id]||ALLY_SKILLS.medamago;
 return {...skill,description:SKILL_DESCRIPTIONS[skill.type]};
}
export function advanceUltimate(current,{independent=false,bonus=false,spend=false}={}){
 const value=Number.isFinite(Number(current))?Number(current):0;
 return Math.max(0,Math.min(ULTIMATE_MAX,(spend?0:value)+(independent?1:0)+(independent&&bonus?1:0)));
}
export function foeAffinity(id='mossling'){
 const hash=[...String(id)].reduce((sum,char)=>sum+char.charCodeAt(0),0);
 // Show explicit type for every foe; identical enemies have stable affinities.
 const explicit={mossling:0,thistlet:1,spookap:2,bramblet:3,mothum:0,thornking:1};
 return FOE_TYPES[explicit[id]??hash%FOE_TYPES.length];
}
export function allyAffinity(id='medamago'){
 return ALLY_TYPES[id]||{strong:'speak',weak:'grammar'};
}
export function strikeFor({kind,foeId,allyId,action='attack',boss=false,evolved=false,repeated=false}={}){
 if(!BATTLE_KINDS.includes(kind)||!['attack','guard','skill'].includes(action))throw Error('Invalid battle action');
 const foe=foeAffinity(foeId),ally=allyAffinity(allyId);
 const ability=allySkill(allyId),strong=ally.strong===kind;
 const pierce=strong&&ability.type==='pierce'&&foe.resist===kind;
 const weak=foe.weak===kind,resist=foe.resist===kind&&!pierce,poor=ally.weak===kind;
 const evolutionBoost=Boolean(evolved&&strong&&action!=='guard');
 const burst=action==='skill'&&strong&&ability.type==='burst';
 const repeatPenalty=Boolean(repeated&&!boss);
 const raw=1+(weak?1:0)-(resist?1:0)+(strong?1:0)-(poor?1:0)+(action==='skill'?2:0)-(action==='guard'?1:0)+(evolutionBoost?1:0)+(burst?1:0)-(repeatPenalty?1:0);
 return {damage:boss?1:Math.max(1,Math.min(5,raw)),weak,resist,strong,poor,guard:action==='guard',pierce,burst,repeatPenalty,
  evolutionBoost,tag:action==='skill'?'ULTIMATE!':pierce?'PIERCE!':weak?'WEAK!':resist?'RESIST':strong?'ALLY BOOST':'HIT'};
}
export function nextEnemyKind(last=null,random=Math.random){
 const pool=BATTLE_KINDS.filter(kind=>kind!==last);
 const value=Number(random());
 return pool[Math.max(0,Math.min(pool.length-1,Math.floor((Number.isFinite(value)?value:0)*pool.length)))];
}
export function incomingHit({kind,allyId,action='attack',result='incorrect',hinted=false,evolved=false}={}){
 if(!BATTLE_KINDS.includes(kind))throw Error('Invalid enemy attack');
 const ally=allyAffinity(allyId);
 const ward=allySkill(allyId).type==='ward'&&kind===ally.strong;
 if(result==='review'||result==='empty'||result==='ungraded')return {damage:0,blocked:false,uncertain:true};
 if(result==='correct'&&!hinted)return {damage:0,blocked:true,uncertain:false};
 const base=result==='correct'?1:2;
 return {damage:Math.max(0,base+(kind===ally.weak?1:0)-(kind===ally.strong?1:0)-(action==='guard'?1:0)-(evolved&&kind===ally.strong?1:0)-(ward?1:0)),
   blocked:false,uncertain:false};
}
export function pickBattlePrompt({prompts,kind,difficulty='easy',areaId='entry',usedIds=[],reservedIds=[],random=Math.random}={}){
 if(!BATTLE_KINDS.includes(kind))throw Error('Invalid battle skill');
 const used=new Set([...usedIds,...reservedIds]);
 const candidates=prompts.filter(prompt=>prompt.kind===kind&&(prompt.difficulty||'easy')===difficulty&&
  !prompt.bossOnly&&!used.has(prompt.id)&&(!prompt.world||prompt.world===areaId));
 if(!candidates.length)return null;
 const local=candidates.filter(prompt=>prompt.world===areaId);
 const pool=local.length?local:candidates;
 const number=Number(random());
 return pool[Math.max(0,Math.min(pool.length-1,Math.floor((Number.isFinite(number)?number:0)*pool.length)))];
}
