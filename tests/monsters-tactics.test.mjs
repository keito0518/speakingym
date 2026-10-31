import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_KINDS,BATTLE_LABELS,ULTIMATE_MAX,MASTERY_LEVEL,foeAffinity,allyAffinity,allySkill,masterySkillFor,masteryEffectFor,supportPartnerFor,supportComboFor,evolvedSupportTalent,advanceUltimate,advanceBattleChain,battleChainTier,pickBattleSpectacle,strikeFor,nextEnemyKind,foeStyleFor,foeBattleAffinity,foeStyledStrike,foePlannedAttack,foeAttackPressure,bossAttackFor,bossCounterFor,bossReserveCoverFor,bossFormationLinkPlan,bossFormationLinkFor,incomingHit,pickBattlePrompt} from '../prototype/speakingym-monsters/battle-tactics.js';
import {AREA_BOSSES} from '../prototype/speakingym-monsters/forest-battle.js';
import {createBattleParty,applyFighterDamage} from '../prototype/speakingym-monsters/battle-party.js';
import {MONSTERS,ALL_PROMPTS} from '../prototype/speakingym-monsters/monster-data.js';

test('independent attacks and defenses form one meaningful chain, while hints and misses reset it',()=>{
 let streak=advanceBattleChain({independent:true});
 assert.deepEqual(streak,{chain:1,best:1,milestone:false});
 streak=advanceBattleChain({...streak,independent:true}); // defended successfully
 assert.deepEqual(streak,{chain:2,best:2,milestone:false});
 streak=advanceBattleChain({...streak,independent:true}); // attacked again
 assert.deepEqual(streak,{chain:3,best:3,milestone:true});
 streak=advanceBattleChain({...streak,independent:false}); // used a hint
 assert.deepEqual(streak,{chain:0,best:3,milestone:false});
 streak=advanceBattleChain({...streak,independent:true});
 assert.deepEqual(streak,{chain:1,best:3,milestone:false});
 for(let count=2;count<=6;count++)streak=advanceBattleChain({...streak,independent:true});
 assert.deepEqual(streak,{chain:6,best:6,milestone:true});
});

test('visual combo tiers unlock new strikes without changing grades, damage, or XP',()=>{
 assert.deepEqual([0,1,2,3,4,5,7,8,11].map(battleChainTier),[0,0,1,2,2,3,3,4,4]);
 const first=pickBattleSpectacle({chain:1,random:()=>.99});
 assert.equal(first.tier,0);
 assert.match(first.fxVariant,/^(arc|burst|storm)$/);
 assert.match(first.strikeMotion,/^(dash|rising|spiral)$/);
 assert.equal(first.specialFx,'none');
 const third=pickBattleSpectacle({chain:3,previousFx:'burst',previousMotion:'rising',random:()=>0});
 assert.deepEqual(third,{tier:2,fxVariant:'storm',strikeMotion:'spiral',specialFx:'surge'},
   'Three clean answers can unlock a visual-only surge without awarding extra rewards');
 const fifth=pickBattleSpectacle({chain:5,previousFx:'storm',previousMotion:'spiral',random:()=>.99});
 assert.deepEqual(fifth,{tier:3,fxVariant:'nova',strikeMotion:'comet',specialFx:'none'});
 const eighth=pickBattleSpectacle({chain:8,previousFx:'nova',previousMotion:'comet',random:()=>.01});
 assert.deepEqual(eighth,{tier:4,fxVariant:'flare',strikeMotion:'corkscrew',specialFx:'apex'});
 for(const combo of [0,3,5,8]){
   const style=pickBattleSpectacle({chain:combo,random:()=>.75});
   assert.deepEqual(Object.keys(style).sort(),['fxVariant','specialFx','strikeMotion','tier'],
     'The visual selector never carries combat or scoring side effects');
 }
});

test('all four English skills have names and every companion has a useful strength and weakness',()=>{
 assert.deepEqual(BATTLE_KINDS,['speak','listen','vocab','grammar']);
 for(const kind of BATTLE_KINDS)assert.ok(BATTLE_LABELS[kind]);
 for(const monster of MONSTERS){
  const ally=allyAffinity(monster.id);
  const skill=allySkill(monster.id);
  assert.ok(BATTLE_KINDS.includes(ally.strong));
  assert.ok(BATTLE_KINDS.includes(ally.weak));
  assert.notEqual(ally.strong,ally.weak);
  assert.ok(skill.name&&skill.description&&['burst','charge','pierce','ward'].includes(skill.type),`${monster.id} needs a unique combat ability`);
 }
});
test('all 15 companions unlock a unique trained technique only at level four',()=>{
 assert.equal(MASTERY_LEVEL,4);
 const names=new Set();
 for(const monster of MONSTERS){
  assert.equal(masterySkillFor(monster.id,3),null,`${monster.id} is not yet trained`);
  const mastery=masterySkillFor(monster.id,4);
  assert.ok(mastery&&mastery.description&&mastery.type===allySkill(monster.id).type);
  names.add(mastery.name);
 }
 assert.equal(names.size,MONSTERS.length,'every monster needs its own named unlock');
});
test('trained techniques reward independent strong-skill play once, not hint-assisted correction',()=>{
 const base={level:4,kind:'speak',independent:true};
 assert.deepEqual(masteryEffectFor({...base,allyId:'medamago'}),{
  activated:true,name:'黄身の二連撃',extraDamage:1,extraCharge:0,heal:0,shield:0});
 assert.deepEqual(masteryEffectFor({...base,allyId:'medamago',boss:true}),{
  activated:true,name:'黄身の二連撃',extraDamage:0,extraCharge:1,heal:0,shield:0},
  'bosses still need all three independent English confirmations');
 for(const change of [{level:3},{independent:false},{used:true},{kind:'vocab'}]){
  const effect=masteryEffectFor({...base,...change,allyId:'medamago'});
  assert.equal(effect.activated,false);
  assert.equal(effect.extraDamage+effect.extraCharge+effect.heal+effect.shield,0);
 }
 const charge=masteryEffectFor({allyId:'katappo',level:4,kind:'listen',independent:true});
 assert.equal(charge.extraCharge,1);
 const heal=masteryEffectFor({allyId:'purupun',level:4,kind:'vocab',independent:true});
 assert.equal(heal.heal,1);
 assert.equal(masteryEffectFor({allyId:'purupun',level:4,kind:'vocab',independent:true,canHeal:false}).activated,false,
  'a full-health fighter saves the one-use heal for a later turn');
 const ward=masteryEffectFor({allyId:'koge',level:4,kind:'grammar',independent:true});
 assert.equal(ward.shield,1);
 assert.equal(masteryEffectFor({allyId:'koge',level:4,kind:'grammar',independent:true,canShield:false}).activated,false,
  'do not spend a trained shield when the boss counter already provides one');
 const hit={kind:'listen',allyId:'koge',result:'incorrect'};
 assert.equal(incomingHit({...hit,counterShield:ward.shield}).damage,incomingHit(hit).damage-1);
 assert.equal(incomingHit({...hit,counterShield:ward.shield,result:'ungraded'}).damage,0);
});
test('matchups change actual damage while never changing a grading verdict',()=>{
 assert.deepEqual(foeAffinity('mossling'),{weak:'listen',resist:'grammar'});
 const advantage=strikeFor({kind:'listen',foeId:'mossling',allyId:'katappo'});
 const resistance=strikeFor({kind:'grammar',foeId:'mossling',allyId:'katappo'});
 assert.equal(advantage.damage,3);
 assert.equal(resistance.damage,1);
 assert.equal(advantage.weak,true);
 assert.equal(resistance.resist,true);
 assert.equal(strikeFor({kind:'listen',foeId:'mossling',allyId:'katappo',boss:true}).damage,1,'boss phases cannot be skipped');
 assert.equal(strikeFor({kind:'listen',foeId:'mossling',allyId:'katappo',action:'skill'}).damage,5);
 assert.equal(strikeFor({kind:'listen',foeId:'mossling',allyId:'katappo',repeated:true}).damage,2,'repeating one skill is weaker but never turns a correct answer into a failure');
 assert.equal(strikeFor({kind:'listen',foeId:'mossling',allyId:'katappo',boss:true,repeated:true}).damage,1,'fixed boss confirmations ignore repeat penalties');
 assert.throws(()=>strikeFor({kind:'read'}),/Invalid/);
});
test('foe attack cycles through four randomized skills without immediate repetition',()=>{
 const seen=new Set();
 for(let i=0;i<3;i++){const kind=nextEnemyKind('speak',()=>i/3);seen.add(kind);assert.notEqual(kind,'speak');}
 assert.equal(seen.size,3);
 for(const kind of BATTLE_KINDS)assert.ok(BATTLE_KINDS.includes(nextEnemyKind(kind,()=>.9)));
});
test('advanced foes have changing readable styles but entrance and boss encounters remain familiar',()=>{
 assert.equal(foeStyleFor({areaId:'entry',index:0}),null);
 assert.equal(foeStyleFor({areaId:'glade',index:7,boss:true}),null);
 assert.deepEqual([0,1,2].map(index=>foeStyleFor({areaId:'glade',index}).id),['shell','hunter','fury']);
 assert.deepEqual([0,1,2].map(index=>foeStyleFor({areaId:'glade',index,wave:2}).id),['hunter','fury','shift'],
  'repeat runs change the foe mix without additional story content');
 for(const areaId of ['thicket','sanctuary','city','city-market','city-terminal','city-blizzard']){
  const style=foeStyleFor({areaId,index:0});
  assert.ok(style.name&&style.tip&&['shell','hunter','fury','shift'].includes(style.id));
 }
});
test('shape-shifting foes exchange weakness and resistance after the first hit, never English grading',()=>{
 const style=foeStyleFor({areaId:'city',index:0});
 assert.equal(style.id,'shift');
 const before=foeBattleAffinity({foeId:'signbit',style});
 const after=foeBattleAffinity({foeId:'signbit',style,shifted:true});
 assert.deepEqual(before,{weak:'listen',resist:'grammar'});
 assert.deepEqual(after,{weak:'grammar',resist:'listen'});
 assert.deepEqual(foeBattleAffinity({foeId:'signbit',style:null,shifted:true}),before,
  'ordinary monsters keep their original weaknesses');
 const basic={foeId:'signbit',allyId:'koge',kind:'grammar'};
 const initial=strikeFor({...basic,foeProfile:before});
 const shifted=strikeFor({...basic,foeProfile:after});
 assert.ok(initial.resist&&!initial.weak,'grammar starts as a resisted attack');
 assert.ok(shifted.weak&&!shifted.resist,'after one hit grammar becomes a weakness');
 assert.ok(shifted.damage>initial.damage,'changing attack skills has a real damage payoff');
 const reserve=createBattleParty(['medamago','purupun']);
 const support={kind:'vocab',activeId:'medamago',party:reserve,selected:true,independent:true,
  partnerEvolved:true,foeId:'signbit'};
 assert.equal(supportComboFor({...support,foeProfile:before}).extraDamage,1);
 assert.equal(supportComboFor({...support,foeProfile:{weak:'listen',resist:'vocab'}}).extraDamage,2,
  'a changed enemy resistance also changes evolved partner piercing consistently');
 assert.equal(strikeFor({kind:'grammar',foeId:'signbit',allyId:'koge',boss:true,foeProfile:after}).damage,1,
  'boss confirmations cannot be skipped by a changed affinity');
});
test('shell, hunter and fury change battle strategy without changing independent English grades',()=>{
 const shell=foeStyleFor({areaId:'glade',index:0});
 assert.deepEqual(foeStyledStrike({style:shell,damage:3,kind:'speak',foeId:'sunmoss'}),
  {damage:2,mitigated:true,shieldBroken:true});
 assert.deepEqual(foeStyledStrike({style:shell,damage:3,kind:'listen',foeId:'sunmoss'}),
  {damage:3,mitigated:false,shieldBroken:true},'a weakness strike immediately pierces the shell');
 assert.equal(foeStyledStrike({style:shell,damage:3,kind:'speak',foeId:'sunmoss',shieldIntact:false}).damage,3,
  'after the first hit the foe cannot keep its first-hit shield');
 assert.equal(foeStyledStrike({style:shell,damage:1,kind:'grammar',foeId:'sunmoss'}).damage,1,
  'a shield cannot turn a correct answer into zero progress');
 const hunter=foeStyleFor({areaId:'glade',index:1});
 assert.equal(foePlannedAttack({style:hunter,activeId:'medamago',last:'grammar'}),'listen');
 assert.equal(foePlannedAttack({style:hunter,activeId:'katappo',last:'speak'}),'grammar',
  'party composition changes an explicitly announced attack');
 assert.notEqual(foePlannedAttack({style:hunter,activeId:'medamago',last:'listen',random:()=>0}),'listen',
  'even a hunter cannot repeat the same skill immediately');
 const fury=foeStyleFor({areaId:'glade',index:2});
 assert.equal(foeAttackPressure(fury),1);
 assert.equal(foeAttackPressure(hunter),0);
 const base={kind:'speak',allyId:'katappo'};
 assert.equal(incomingHit({...base,result:'correct',pressure:foeAttackPressure(fury)}).damage,0);
 assert.equal(incomingHit({...base,result:'ungraded',pressure:foeAttackPressure(fury)}).damage,0,
  'speech recognition uncertainty must never cause an enemy hit');
 assert.equal(incomingHit({...base,result:'incorrect',pressure:foeAttackPressure(fury)}).damage,
  incomingHit({...base,result:'incorrect'}).damage+1,'only a real miss increases damage');
});
test('each area boss advertises its own predictable three-phase attack sequence',()=>{
 const signatures=new Set();
 for(const boss of Object.values(AREA_BOSSES)){
  const phases=[0,1,2].map(phase=>bossAttackFor(boss.id,phase));
  assert.equal(phases.length,3);
  for(const attack of phases){
   assert.ok(BATTLE_KINDS.includes(attack.kind));
   assert.ok(attack.name.length>=4);
   assert.ok([0,1].includes(attack.pressure));
  }
  signatures.add(phases.map(attack=>`${attack.kind}:${attack.pressure}`).join(','));
  assert.deepEqual(bossAttackFor(boss.id,3),phases[0],'later waves repeat the explicit cycle');
 }
 assert.equal(signatures.size,Object.keys(AREA_BOSSES).length,'all eight bosses have distinct patterns');
});
test('all eight bosses give a distinct, telegraphed reason to bring a particular reserve',()=>{
 const names=new Set();
 for(const boss of Object.values(AREA_BOSSES)){
  const plan=bossFormationLinkPlan(boss.id);
  assert.ok(plan?.name&&plan.description,`${boss.id} needs a visible team tactic`);
  assert.ok([0,1].includes(plan.phase),'boss perks must happen before the final blow');
  assert.ok(BATTLE_KINDS.includes(plan.kind));
  names.add(plan.name);
  const reserve=MONSTERS.find(monster=>allyAffinity(monster.id).strong===plan.kind&&monster.id!=='medamago');
  assert.ok(reserve,`${boss.id} must have a recruitable counter`);
  const party=createBattleParty(['medamago',reserve.id]);
  const options={foeId:boss.id,phase:plan.phase,activeId:'medamago',party,independent:true,ultimate:0};
  const result=bossFormationLinkFor(options);
  assert.equal(result.partnerId,reserve.id);
  assert.equal(result.activated,true,`${boss.id} should reward a prepared party`);
  assert.ok(result.extraCharge||result.shield||result.heal||result.healTeam);
  assert.equal(bossFormationLinkFor({...options,independent:false}).activated,false,'hinted and incorrect English cannot trigger the link');
  assert.equal(bossFormationLinkFor({...options,used:true}).activated,false,'each boss link activates only once');
  assert.equal(bossFormationLinkFor({...options,phase:2}).activated,false,'the finishing phase cannot trigger a link');
  assert.equal(bossFormationLinkFor({...options,party:createBattleParty(['medamago'])}).activated,false,
   'a lone fighter never gets a phantom reserve');
  assert.equal(bossFormationLinkFor({...options,party:applyFighterDamage(party,reserve.id,99)}).activated,false,
   'defeated reserves cannot help');
 }
 assert.equal(names.size,Object.keys(AREA_BOSSES).length);
 assert.equal(bossFormationLinkPlan('mossling'),null,'regular enemies retain their own combat styles');
});
test('boss party links restore limited HP or grant shield without free damage or zero-HP revives',()=>{
 const team=createBattleParty(['medamago','katappo','koge']);
 const mist=applyFighterDamage(applyFighterDamage(team,'medamago',2),'katappo',1);
 const rally=bossFormationLinkFor({foeId:'mistknight',phase:1,activeId:'medamago',party:mist,independent:true});
 assert.equal(rally.healTeam,1);
 assert.equal(rally.partnerId,'katappo');
 assert.equal(bossFormationLinkFor({foeId:'mistknight',phase:1,activeId:'medamago',party:team,independent:true}).activated,true,
  'full health can still convert a prepared rally into charge');
 const fainted=applyFighterDamage(mist,'katappo',99);
 assert.equal(bossFormationLinkFor({foeId:'mistknight',phase:1,activeId:'medamago',party:fainted,independent:true}).activated,false,
  'fainted specialist never revives itself or enables a team heal');
 const shield=bossFormationLinkFor({foeId:'thornking',phase:0,activeId:'medamago',
  party:createBattleParty(['medamago','purupun']),independent:true,ultimate:0,shield:0});
 assert.equal(shield.shield,1);
 assert.equal(incomingHit({kind:'listen',allyId:'medamago',result:'incorrect',counterShield:shield.shield}).damage,
  incomingHit({kind:'listen',allyId:'medamago',result:'incorrect'}).damage-1);
 assert.equal(incomingHit({kind:'listen',allyId:'medamago',result:'ungraded',counterShield:shield.shield}).damage,0,
  'microphone uncertainty must never deal damage');
 assert.equal(bossFormationLinkFor({foeId:'thornking',phase:0,activeId:'medamago',
  party:createBattleParty(['medamago','purupun']),independent:true,ultimate:0,shield:1}).extraCharge,1,
  'an existing shield becomes a small charge instead of pointless stacking');
 assert.equal(bossFormationLinkFor({foeId:'sunwarden',phase:0,activeId:'katappo',
  party:createBattleParty(['katappo','medamago']),independent:true,ultimate:ULTIMATE_MAX,shield:0}).shield,1,
  'a full gauge can use the opening as cover instead');
 assert.equal(strikeFor({kind:'listen',foeId:'mistknight',allyId:'katappo',boss:true}).damage,1,
  'reserves never skip any of the three authored boss questions');
});
test('team-up options depend on living reserves with complementary English strengths',()=>{
 const party=createBattleParty(['medamago','katappo','koge']);
 assert.equal(supportPartnerFor({kind:'listen',activeId:'medamago',party}),'katappo');
 assert.equal(supportPartnerFor({kind:'grammar',activeId:'medamago',party}),'koge');
 assert.equal(supportPartnerFor({kind:'speak',activeId:'medamago',party}),null,'same-skill allies cannot self-support');
 assert.equal(supportPartnerFor({kind:'speak',activeId:'katappo',party}),'medamago','a switch changes available team-ups');
 assert.equal(supportPartnerFor({kind:'listen',activeId:'unknown',party}),null);
 const fainted=applyFighterDamage(party,'katappo',99);
 assert.equal(supportPartnerFor({kind:'listen',activeId:'medamago',party:fainted}),null,'fainted reserves cannot lend a skill');
});
test('a chosen team-up rewards only an independent answer, once per encounter',()=>{
 const party=createBattleParty(['medamago','katappo']);
 const base={kind:'listen',activeId:'medamago',party,selected:true};
 assert.deepEqual(supportComboFor({...base,independent:true}),{
  partnerId:'katappo',activated:true,extraDamage:1,extraCharge:0,extraHeal:0,awakened:null});
 assert.deepEqual(supportComboFor({...base,independent:true,boss:true}),{
  partnerId:'katappo',activated:true,extraDamage:0,extraCharge:1,extraHeal:0,awakened:null});
 for(const options of [{independent:false},{independent:true,used:true},{independent:true,selected:false}]){
  const result=supportComboFor({...base,...options});
  assert.equal(result.activated,false);
  assert.equal(result.extraDamage,0);
  assert.equal(result.extraCharge,0);
  assert.equal(result.extraHeal,0);
  assert.equal(result.awakened,null);
 }
 assert.equal(supportComboFor({...base,kind:'speak',independent:true}).activated,false);
 assert.equal(supportComboFor({...base,party:createBattleParty(['medamago']),independent:true}).activated,false);
});
test('evolved reserves unlock distinct support moves only after independently correct English',()=>{
 const charge=createBattleParty(['medamago','katappo']);
 const support={kind:'listen',activeId:'medamago',party:charge,selected:true,independent:true,partnerEvolved:true};
 const charged=supportComboFor(support);
 assert.equal(charged.extraDamage,1);
 assert.equal(charged.extraCharge,1,'evolved charge reserve adds a point on ordinary foes');
 assert.equal(charged.awakened,'覚醒・共鳴');
 assert.equal(supportComboFor({...support,boss:true}).extraCharge,2,'evolved charge reserve supports boss preparation');
 const burst=supportComboFor({kind:'speak',activeId:'katappo',party:charge,selected:true,independent:true,partnerEvolved:true});
 assert.equal(burst.extraDamage,2,'evolved burst adds a second strike only on ordinary foes');
 assert.equal(supportComboFor({kind:'speak',activeId:'katappo',party:charge,selected:true,independent:true,
  partnerEvolved:true,boss:true}).extraCharge,2,'boss still requires all three English confirmations');
 const breaker=createBattleParty(['medamago','purupun']);
 const piercing={kind:'vocab',activeId:'medamago',party:breaker,selected:true,independent:true,partnerEvolved:true};
 assert.equal(supportComboFor({...piercing,foeId:'bramblet'}).extraDamage,2,'break enemy resistance');
 assert.equal(supportComboFor({...piercing,foeId:'mossling'}).extraDamage,1,'no fake resistance bonus on a neutral foe');
 assert.equal(supportComboFor({...piercing,boss:true}).extraHeal,1,'piercing reserve supports survival against bosses');
 const healer=createBattleParty(['medamago','koge']);
 const healing=supportComboFor({kind:'grammar',activeId:'medamago',party:healer,selected:true,
  independent:true,partnerEvolved:true});
 assert.equal(healing.extraHeal,1);
 assert.equal(healing.awakened,'覚醒・回復');
 assert.deepEqual(evolvedSupportTalent('koge',{boss:true}),{name:'覚醒・回復',extraDamage:0,extraCharge:0,extraHeal:1});
 for(const mistake of [{independent:false},{used:true},{selected:false},{partnerEvolved:false}]){
  const grade=supportComboFor({...support,...mistake});
  assert.equal(grade.extraCharge,0,
   'no bonus charge from unearned or unevolved team-up');
  assert.equal(grade.awakened,null);
  assert.equal(grade.extraHeal,0);
 }
 assert.equal(supportComboFor({...support,party:applyFighterDamage(charge,'katappo',99)}).activated,false);
});
test('telegraphed heavy boss attacks affect HP only after verified misses',()=>{
 const basic={kind:'listen',allyId:'medamago'};
 assert.equal(incomingHit({...basic,result:'incorrect',pressure:1}).damage,
  incomingHit({...basic,result:'incorrect'}).damage+1);
 assert.equal(incomingHit({...basic,result:'correct',pressure:1}).damage,0);
 assert.equal(incomingHit({...basic,result:'review',pressure:1}).damage,0);
 assert.equal(incomingHit({...basic,result:'ungraded',pressure:1}).damage,0);
 assert.equal(incomingHit({...basic,result:'empty',pressure:1}).damage,0);
 assert.equal(incomingHit({...basic,result:'correct',hinted:true,pressure:1}).damage,
  incomingHit({...basic,result:'correct',hinted:true}).damage+1);
});
test('boss counter rewards correctly reading a telegraph once, never skipping English or a phase',()=>{
 const base={kind:'speak',allyId:'medamago',independent:true};
 assert.deepEqual(bossCounterFor(base),{matched:true,activated:true,extraCharge:1,shield:1,heal:0});
 assert.deepEqual(bossCounterFor({...base,evolved:true}),{matched:true,activated:true,extraCharge:1,shield:1,heal:1});
 for(const cases of [{independent:false},{used:true},{kind:'listen'},{kind:'read'}]){
  const result=bossCounterFor({...base,...cases});
  assert.equal(result.activated,false,'wrong answer, spent counter or mismatch never gives free charge');
  assert.equal(result.extraCharge,0);
  assert.equal(result.shield,0);
  assert.equal(result.heal,0);
 }
 for(const boss of Object.values(AREA_BOSSES)){
  const threat=bossAttackFor(boss.id,1);
  const specialist=MONSTERS.find(monster=>allyAffinity(monster.id).strong===threat.kind);
  assert.ok(specialist,'every boss telegraph should have at least one matching recruit');
  assert.equal(bossCounterFor({kind:threat.kind,allyId:specialist.id,independent:true}).activated,true);
 }
 const heavy={kind:'listen',allyId:'medamago',result:'incorrect',pressure:1};
 assert.equal(incomingHit({...heavy,counterShield:1}).damage,incomingHit(heavy).damage-1);
 assert.equal(incomingHit({...heavy,counterShield:99}).damage,incomingHit(heavy).damage-1,
  'counter protection is capped at one point, never an invincibility exploit');
 for(const status of ['correct','review','ungraded','empty']){
  assert.equal(incomingHit({...heavy,result:status,counterShield:1}).damage,0,
   `${status} must remain damage-free with or without the counter`);
 }
 assert.equal(strikeFor({kind:'listen',foeId:'thornking',allyId:'katappo',boss:true}).damage,1,
  'counter never provides free boss hits or skips a learning task');
});
test('a live reserve can intercept one confirmed hit in a weak matchup but never changes the English verdict',()=>{
 const party=createBattleParty(['katappo','koge','medamago']);
 const result=bossReserveCoverFor({kind:'grammar',activeId:'katappo',party,damage:4});
 assert.deepEqual(result,{partnerId:'koge',activated:true,activeDamage:2,partnerDamage:1});
 assert.equal(incomingHit({kind:'grammar',allyId:'katappo',result:'incorrect'}).damage,3);
 assert.equal(incomingHit({kind:'grammar',allyId:'katappo',result:'review'}).damage,0);
 for(const options of [{used:true},{damage:0},{damage:1},{kind:'listen'},{kind:'speak'},
   {party:createBattleParty(['katappo'])},{activeId:'unknown'},
   {party:applyFighterDamage(party,'koge',99)}]){
   assert.equal(bossReserveCoverFor({kind:'grammar',activeId:'katappo',party,damage:3,...options}).activated,false,
    `No invalid or repeat intercept: ${JSON.stringify(options)}`);
 }
 const damaged=applyFighterDamage(party,'koge',5);
 const worn=bossReserveCoverFor({kind:'grammar',activeId:'katappo',party:damaged,damage:3});
 assert.equal(worn.activated,true,'reserve is still able to sacrifice their last HP');
 assert.equal(worn.partnerDamage,1);
 assert.equal(bossReserveCoverFor({kind:'grammar',activeId:'katappo',party,damage:0}).activeDamage,0,
  'a clean or uncertain defense never consumes a reserve');
});
test('reactive defense questions reuse authored learning banks without skipping worlds or repeating prompts',()=>{
 for(const kind of BATTLE_KINDS){
  for(const difficulty of ['easy','normal','hard']){
   const chosen=pickBattlePrompt({prompts:ALL_PROMPTS,kind,difficulty,areaId:'entry',random:()=>.5});
   assert.ok(chosen,`Missing ${kind} ${difficulty} defense prompt`);
   assert.equal(chosen.kind,kind);
   assert.equal(chosen.difficulty||'easy',difficulty);
   assert.ok(!chosen.world||chosen.world==='entry');
   const next=pickBattlePrompt({prompts:ALL_PROMPTS,kind,difficulty,areaId:'entry',usedIds:[chosen.id],random:()=>.5});
   assert.ok(next&&next.id!==chosen.id);
  }
 }
 assert.equal(pickBattlePrompt({prompts:ALL_PROMPTS,kind:'listen',reservedIds:ALL_PROMPTS.map(p=>p.id)}),null);
});
test('battle questions retrieve scheduled and weak English before random fillers, without breaking constraints',()=>{
 const prompts=[
  {id:'new',kind:'listen',difficulty:'easy',phraseId:'new-phrase'},
  {id:'old',kind:'listen',difficulty:'easy',phraseId:'old-phrase'},
  {id:'due',kind:'listen',difficulty:'easy',phraseId:'due-phrase'},
  {id:'weak',kind:'listen',difficulty:'easy',phraseId:'weak-phrase',baseId:'weak-topic'},
  {id:'related',kind:'listen',difficulty:'easy',phraseId:'related-phrase',baseId:'weak-topic'},
  {id:'transfer',kind:'listen',difficulty:'easy',phraseId:'due-phrase'},
  {id:'hard-due',kind:'listen',difficulty:'hard',phraseId:'due-phrase'},
  {id:'city-due',kind:'listen',difficulty:'easy',phraseId:'due-phrase',world:'city-terminal'},
  {id:'boss-due',kind:'listen',difficulty:'easy',phraseId:'due-phrase',bossOnly:true},
  {id:'speaking-due',kind:'speak',difficulty:'easy',phraseId:'due-phrase'}
 ];
 const options={prompts,kind:'listen',difficulty:'easy',areaId:'entry',
  dueIds:['due','hard-due','city-due','boss-due','speaking-due'],weakIds:['weak'],duePhraseIds:['due-phrase'],
  recentIds:['old'],random:()=>.999};
 assert.equal(pickBattlePrompt(options).id,'due','the exact scheduled task beats random and general weakness');
 assert.equal(pickBattlePrompt({...options,usedIds:['due']}).id,'weak','next revisit a specific missed task');
 assert.equal(pickBattlePrompt({...options,usedIds:['due','weak']}).id,'related','a different task on a weak topic can reinforce it');
 assert.equal(pickBattlePrompt({...options,usedIds:['due','weak','related']}).id,'transfer','related phrase can transfer to another task');
 assert.equal(pickBattlePrompt({...options,usedIds:['due','weak','related','transfer']}).id,'new','do not repeat recent filler when fresh content exists');
 assert.equal(pickBattlePrompt({...options,usedIds:['due','weak','related','transfer','new']}).id,'old');
 assert.equal(pickBattlePrompt({...options,usedIds:['due','weak','related','transfer','new','old']}),null);
 assert.equal(pickBattlePrompt({...options,reservedIds:['due']}).id,'weak','a scripted chapter question cannot be duplicated by an enemy turn');
});
test('verified answers block attacks, hinted answers reduce damage, uncertainty never harms',()=>{
 const base={kind:'listen',allyId:'katappo'};
 assert.equal(incomingHit({...base,result:'correct'}).damage,0);
 assert.equal(incomingHit({...base,result:'correct',hinted:true}).damage,0,'strong listening ally absorbs hinted hit');
 assert.equal(incomingHit({...base,result:'incorrect'}).damage,1);
 assert.equal(incomingHit({...base,result:'incorrect',action:'guard'}).damage,0);
 assert.equal(incomingHit({...base,result:'review'}).damage,0);
 assert.equal(incomingHit({...base,result:'ungraded'}).damage,0);
 assert.equal(incomingHit({kind:'listen',allyId:'medamago',result:'incorrect'}).damage,3);
 assert.equal(incomingHit({kind:'listen',allyId:'medamago',result:'correct',hinted:true}).damage,2);
});
test('evolution improves combat only in a companion strength, never changes learning verdict',()=>{
 const strike={kind:'speak',foeId:'mossling',allyId:'medamago',action:'attack'};
 assert.equal(strikeFor(strike).damage,2);
 assert.equal(strikeFor({...strike,evolved:true}).damage,3);
 assert.equal(strikeFor({...strike,evolved:true}).evolutionBoost,true);
 assert.equal(strikeFor({...strike,kind:'listen',evolved:true}).evolutionBoost,false);
 assert.equal(strikeFor({...strike,evolved:true,boss:true}).damage,1,'evolution does not skip boss questions');
 const defense={kind:'speak',allyId:'medamago',result:'incorrect'};
 assert.equal(incomingHit(defense).damage,1);
 assert.equal(incomingHit({...defense,evolved:true}).damage,0);
 assert.equal(incomingHit({...defense,kind:'listen',evolved:true}).damage,3,'evolution does not erase weakness');
 assert.equal(incomingHit({...defense,evolved:true,result:'review'}).uncertain,true);
});
test('ultimate gauge rewards independent correct answers and cannot be farmed by hints or retries',()=>{
 assert.equal(ULTIMATE_MAX,3);
 assert.equal(advanceUltimate(0,{independent:true}),1);
 assert.equal(advanceUltimate(1,{independent:true,bonus:true}),3);
 assert.equal(advanceUltimate(2,{independent:false,bonus:true}),2);
 assert.equal(advanceUltimate(3,{independent:true}),3);
 assert.equal(advanceUltimate(3,{spend:true,independent:true}),1,'a successful ultimate spends its stored charge before earning the next point');
 assert.equal(advanceUltimate(3,{spend:true,independent:false}),0,'hinted ultimates spend charge but grant no charge');
});
test('companion specialties have observable effects without bypassing English grades or bosses',()=>{
 assert.equal(allySkill('medamago').type,'burst');
 assert.equal(allySkill('katappo').type,'charge');
 assert.equal(allySkill('purupun').type,'pierce');
 assert.equal(allySkill('koge').type,'ward');
 const burst=strikeFor({kind:'speak',foeId:'mossling',allyId:'medamago',action:'skill'});
 assert.equal(burst.damage,5);
 assert.equal(burst.burst,true);
 assert.equal(strikeFor({kind:'speak',foeId:'mossling',allyId:'medamago',action:'skill',boss:true}).damage,1,'ultimate must not skip a boss confirmation');
 const pierced=strikeFor({kind:'vocab',foeId:'bramblet',allyId:'purupun'});
 assert.equal(pierced.pierce,true);
 assert.equal(pierced.resist,false);
 assert.equal(pierced.damage,2);
 assert.equal(incomingHit({kind:'grammar',allyId:'koge',result:'incorrect'}).damage,0,'ward reduces damage, but answer stays incorrect');
 assert.equal(incomingHit({kind:'grammar',allyId:'koge',result:'review'}).uncertain,true);
});
