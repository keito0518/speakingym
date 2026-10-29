import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_KINDS,BATTLE_LABELS,ULTIMATE_MAX,foeAffinity,allyAffinity,allySkill,supportPartnerFor,supportComboFor,advanceUltimate,strikeFor,nextEnemyKind,bossAttackFor,incomingHit,pickBattlePrompt} from '../prototype/speakingym-monsters/battle-tactics.js';
import {AREA_BOSSES} from '../prototype/speakingym-monsters/forest-battle.js';
import {createBattleParty,applyFighterDamage} from '../prototype/speakingym-monsters/battle-party.js';
import {MONSTERS,ALL_PROMPTS} from '../prototype/speakingym-monsters/monster-data.js';

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
  partnerId:'katappo',activated:true,extraDamage:1,extraCharge:0});
 assert.deepEqual(supportComboFor({...base,independent:true,boss:true}),{
  partnerId:'katappo',activated:true,extraDamage:0,extraCharge:1});
 for(const options of [{independent:false},{independent:true,used:true},{independent:true,selected:false}]){
  const result=supportComboFor({...base,...options});
  assert.equal(result.activated,false);
  assert.equal(result.extraDamage,0);
  assert.equal(result.extraCharge,0);
 }
 assert.equal(supportComboFor({...base,kind:'speak',independent:true}).activated,false);
 assert.equal(supportComboFor({...base,party:createBattleParty(['medamago']),independent:true}).activated,false);
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
