import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_KINDS,BATTLE_LABELS,foeAffinity,allyAffinity,strikeFor,nextEnemyKind,incomingHit,pickBattlePrompt} from '../prototype/speakingym-monsters/battle-tactics.js';
import {MONSTERS,ALL_PROMPTS} from '../prototype/speakingym-monsters/monster-data.js';

test('all four English skills have names and every companion has a useful strength and weakness',()=>{
 assert.deepEqual(BATTLE_KINDS,['speak','listen','vocab','grammar']);
 for(const kind of BATTLE_KINDS)assert.ok(BATTLE_LABELS[kind]);
 for(const monster of MONSTERS){
  const ally=allyAffinity(monster.id);
  assert.ok(BATTLE_KINDS.includes(ally.strong));
  assert.ok(BATTLE_KINDS.includes(ally.weak));
  assert.notEqual(ally.strong,ally.weak);
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
 assert.equal(strikeFor({kind:'listen',foeId:'mossling',allyId:'katappo',action:'skill'}).damage,3);
 assert.throws(()=>strikeFor({kind:'read'}),/Invalid/);
});
test('foe attack cycles through four randomized skills without immediate repetition',()=>{
 const seen=new Set();
 for(let i=0;i<3;i++){const kind=nextEnemyKind('speak',()=>i/3);seen.add(kind);assert.notEqual(kind,'speak');}
 assert.equal(seen.size,3);
 for(const kind of BATTLE_KINDS)assert.ok(BATTLE_KINDS.includes(nextEnemyKind(kind,()=>.9)));
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
