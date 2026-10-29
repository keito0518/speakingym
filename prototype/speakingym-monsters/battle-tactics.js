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
// A live reserve can assist the active fighter on its own strong skill, but
// not when the active fighter already specializes in the same skill. Choosing
// complementary companions therefore changes which attack kinds can combo.
export function supportPartnerFor({kind,activeId,party}={}){
 if(!BATTLE_KINDS.includes(kind)||!party?.roster?.includes(activeId)||allyAffinity(activeId).strong===kind)return null;
 return party.roster.find(id=>id!==activeId&&allyAffinity(id).strong===kind&&(party.health?.[id]?.hp||0)>0)||null;
}
// Evolved reserves unlock a second, role-specific effect when helping with
// their own specialty. The grade is *always* decided before this runs.
export function evolvedSupportTalent(partnerId,{boss=false,foeId='mossling'}={}){
 const type=allySkill(partnerId).type;
 if(type==='burst')return {name:'覚醒・追撃',extraDamage:boss?0:1,extraCharge:boss?1:0,extraHeal:0};
 if(type==='charge')return {name:'覚醒・共鳴',extraDamage:0,extraCharge:1,extraHeal:0};
 if(type==='pierce')return {name:'覚醒・貫通',extraDamage:!boss&&foeAffinity(foeId).resist===allyAffinity(partnerId).strong?1:0,
  extraCharge:0,extraHeal:boss?1:0};
 return {name:'覚醒・回復',extraDamage:0,extraCharge:0,extraHeal:1};
}
export function supportComboFor({kind,activeId,party,selected=false,independent=false,used=false,boss=false,
  foeId='mossling',partnerEvolved=false}={}){
 const partnerId=supportPartnerFor({kind,activeId,party});
 const activated=Boolean(partnerId&&selected&&independent&&!used);
 const awakening=activated&&partnerEvolved?evolvedSupportTalent(partnerId,{boss,foeId}):null;
 return {partnerId,activated,extraDamage:activated&&!boss?1+(awakening?.extraDamage||0):0,
  extraCharge:activated&&boss?1+(awakening?.extraCharge||0):activated?(awakening?.extraCharge||0):0,
  extraHeal:awakening?.extraHeal||0,awakened:awakening?.name||null};
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
// Bosses telegraph a distinct three-phase attack sequence. The pressure bonus
// affects HP only after a definite miss (or an assisted defense), never the
// independent English verdict or a failed/uncertain speech recognition result.
const BOSS_ATTACKS=Object.freeze({
 thornking:[['grammar','いばらの規則',0],['listen','ざわめく森',1],['speak','王の問いかけ',0]],
 sunwarden:[['listen','光のささやき',0],['speak','太陽の宣告',1],['vocab','まぶしい言葉',0]],
 mistknight:[['vocab','霧の暗号',0],['grammar','幻影の規則',1],['listen','霧の足音',1]],
 elderroot:[['speak','古木の問い',0],['grammar','樹齢の法則',0],['vocab','根の封印',1]],
 metroguardian:[['grammar','信号の規則',0],['listen','駅のアナウンス',0],['speak','守護機の質問',1]],
 marketwarden:[['vocab','値札の暗号',0],['speak','市場の交渉',1],['grammar','取引の規則',0]],
 railkeeper:[['listen','発車の合図',1],['grammar','時刻の規則',0],['vocab','切符の暗号',0]],
 blizzardking:[['listen','吹雪の音',0],['vocab','氷の言葉',1],['speak','吹雪の最後通告',1]]
});
export function bossAttackFor(foeId,phase=0){
 const pattern=BOSS_ATTACKS[foeId]||BOSS_ATTACKS.thornking;
 const [kind,name,pressure]=pattern[Math.max(0,Math.floor(Number(phase)||0))%pattern.length];
 return {kind,name,pressure};
}
// Once per boss, a fighter can read the telegraph and counter with an
// independently correct answer in the same specialty. No phase is skipped,
// no English grade is altered, and assisted retries never unlock the counter.
export function bossCounterFor({kind,allyId,independent=false,used=false,evolved=false}={}){
 const matched=BATTLE_KINDS.includes(kind)&&allyAffinity(allyId).strong===kind;
 const activated=Boolean(matched&&independent&&!used);
 return {matched,activated,extraCharge:activated?1:0,shield:activated?1:0,heal:activated&&evolved?1:0};
}
export function incomingHit({kind,allyId,action='attack',result='incorrect',hinted=false,evolved=false,pressure=0,counterShield=0}={}){
 if(!BATTLE_KINDS.includes(kind))throw Error('Invalid enemy attack');
 const ally=allyAffinity(allyId);
 const ward=allySkill(allyId).type==='ward'&&kind===ally.strong;
 if(result==='review'||result==='empty'||result==='ungraded')return {damage:0,blocked:false,uncertain:true};
 if(result==='correct'&&!hinted)return {damage:0,blocked:true,uncertain:false};
 const base=result==='correct'?1:2;
 return {damage:Math.max(0,base+Math.min(1,Math.max(0,Number(pressure)||0))+(kind===ally.weak?1:0)-(kind===ally.strong?1:0)-(action==='guard'?1:0)-(evolved&&kind===ally.strong?1:0)-(ward?1:0)-Math.min(1,Math.max(0,Number(counterShield)||0))),
   blocked:false,uncertain:false};
}
export function pickBattlePrompt({prompts,kind,difficulty='easy',areaId='entry',usedIds=[],reservedIds=[],
  dueIds=[],weakIds=[],duePhraseIds=[],recentIds=[],random=Math.random}={}){
 if(!BATTLE_KINDS.includes(kind))throw Error('Invalid battle skill');
 const used=new Set([...usedIds,...reservedIds]);
 const candidates=prompts.filter(prompt=>prompt.kind===kind&&(prompt.difficulty||'easy')===difficulty&&
  !prompt.bossOnly&&!used.has(prompt.id)&&(!prompt.world||prompt.world===areaId));
 if(!candidates.length)return null;
 // Scheduled recall wins over random encounters, even when it is an older
 // expression from another chapter. Never change the difficulty, skill,
 // authored world or independently verified answer to make a task fit.
 const overdue=new Set(dueIds),weak=new Set(weakIds),phrases=new Set(duePhraseIds),recent=new Set(recentIds);
 const baseIds=new Set(prompts.filter(p=>weak.has(p.id)).map(p=>p.baseId||p.id));
 const tiers=[
  candidates.filter(p=>overdue.has(p.id)),
  candidates.filter(p=>weak.has(p.id)),
  candidates.filter(p=>baseIds.has(p.baseId||p.id)),
  candidates.filter(p=>phrases.has(p.phraseId))
 ];
 const preferred=tiers.find(group=>group.length);
 const local=(preferred||candidates).filter(prompt=>prompt.world===areaId);
 let pool=local.length?local:preferred||candidates;
 // Once scheduled work is exhausted, do not keep replaying the same small
 // bank from recent adventures if fresh questions are available.
 if(!preferred){const fresh=pool.filter(p=>!recent.has(p.id));if(fresh.length)pool=fresh;}
 const number=Number(random());
 return pool[Math.max(0,Math.min(pool.length-1,Math.floor((Number.isFinite(number)?number:0)*pool.length)))];
}
