// Offline, deterministic battle rules. Learning grades are supplied separately:
// no matchup, skill or item is allowed to turn an incorrect answer into a pass.
export const BATTLE_KINDS=Object.freeze(['speak','listen','vocab','grammar']);
export const BATTLE_LABELS=Object.freeze({speak:'スピーキング',listen:'リスニング',vocab:'単語',grammar:'文法'});
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
export function foeAffinity(id='mossling'){
 const hash=[...String(id)].reduce((sum,char)=>sum+char.charCodeAt(0),0);
 // Show explicit type for every foe; identical enemies have stable affinities.
 const explicit={mossling:0,thistlet:1,spookap:2,bramblet:3,mothum:0,thornking:1};
 return FOE_TYPES[explicit[id]??hash%FOE_TYPES.length];
}
export function allyAffinity(id='medamago'){
 return ALLY_TYPES[id]||{strong:'speak',weak:'grammar'};
}
export function strikeFor({kind,foeId,allyId,action='attack',boss=false}={}){
 if(!BATTLE_KINDS.includes(kind)||!['attack','guard','skill'].includes(action))throw Error('Invalid battle action');
 const foe=foeAffinity(foeId),ally=allyAffinity(allyId);
 const weak=foe.weak===kind,resist=foe.resist===kind,strong=ally.strong===kind,poor=ally.weak===kind;
 const raw=1+(weak?1:0)-(resist?1:0)+(strong?1:0)-(poor?1:0)+(action==='skill'?1:0)-(action==='guard'?1:0);
 return {damage:boss?1:Math.max(1,Math.min(3,raw)),weak,resist,strong,poor,guard:action==='guard',
  tag:weak?'WEAK!':resist?'RESIST':strong?'ALLY BOOST':'HIT'};
}
export function nextEnemyKind(last=null,random=Math.random){
 const pool=BATTLE_KINDS.filter(kind=>kind!==last);
 const value=Number(random());
 return pool[Math.max(0,Math.min(pool.length-1,Math.floor((Number.isFinite(value)?value:0)*pool.length)))];
}
export function incomingHit({kind,allyId,action='attack',result='incorrect',hinted=false}={}){
 if(!BATTLE_KINDS.includes(kind))throw Error('Invalid enemy attack');
 const ally=allyAffinity(allyId);
 if(result==='review'||result==='empty'||result==='ungraded')return {damage:0,blocked:false,uncertain:true};
 if(result==='correct'&&!hinted)return {damage:0,blocked:true,uncertain:false};
 const base=result==='correct'?1:2;
 return {damage:Math.max(0,base+(kind===ally.weak?1:0)-(kind===ally.strong?1:0)-(action==='guard'?1:0)),
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
