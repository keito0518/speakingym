import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTERS, PHRASES, monsterFormName } from '../prototype/speakingym-monsters/monster-data.js';
import { createSave, companionUnlockProgress, captureEligibleMonsters, validateSave } from '../prototype/speakingym-monsters/monster-engine.js';
import { FOREST_AREAS, CITY_AREAS, RUINS_AREAS } from '../prototype/speakingym-monsters/forest-engine.js';
import { allyAffinity, allySkill, masterySkillFor } from '../prototype/speakingym-monsters/battle-tactics.js';
import { monsterArt } from '../prototype/speakingym-monsters/monster-art.js';

const newIds=['namihana','michiru','sorella','kometta'];
const latestIds=['kohan','domoro','lumika','pofuyu','neonko','shirobue','runezo','orbitto','tokeru'];

test('four new forest, snow-city and ruins companions have unique battle roles and three proper pixel forms',()=>{
 assert.equal(MONSTERS.length,44);
 assert.equal(new Set(MONSTERS.map(m=>m.id)).size,44);
 assert.equal(new Set(MONSTERS.map(m=>m.name)).size,44);
 assert.equal(new Set(MONSTERS.map(m=>m.evolvedName)).size,44);
 assert.equal(new Set(MONSTERS.map(m=>m.ascendedName)).size,44);
 for(const id of newIds){
  const creature=MONSTERS.find(monster=>monster.id===id);
  assert.ok(creature?.roots.length>=2,id);
  assert.ok(creature.note.length>=25,id);
  assert.ok(creature.retentionUnlock>=1,'New rare captures should require spaced recall');
  assert.ok(allyAffinity(id).strong);
  assert.notEqual(allyAffinity(id).strong,allyAffinity(id).weak);
  assert.ok(allySkill(id).name);
  assert.ok(masterySkillFor(id,4)?.name,'Every new companion needs its own Lv.4 skill');
  const art=[0,1,2].map(stage=>monsterArt(id,stage));
  for(let stage=0;stage<3;stage++){
   assert.match(art[stage],/shape-rendering="crispEdges"/);
   assert.match(art[stage],new RegExp(`data-pixel-sprite="${id}"`));
   assert.match(art[stage],new RegExp(`data-stage="${stage}"`));
   assert.ok(monsterFormName(creature,stage));
  }
  assert.notEqual(art[0],art[1]);
  assert.notEqual(art[1],art[2]);
 }
 assert.equal(MONSTERS.find(m=>m.id==='namihana').forestAreas,3);
 assert.equal(MONSTERS.find(m=>m.id==='michiru').forestAreas,4);
 assert.equal(MONSTERS.find(m=>m.id==='sorella').cityAreas,3);
 assert.equal(MONSTERS.find(m=>m.id==='kometta').ruinsAreas,2);
});

test('new rare species cannot be captured by same-day XP or chapter clears without spaced English recall',()=>{
 const initial=createSave();
 const cleared=[...FOREST_AREAS,...CITY_AREAS,...RUINS_AREAS].map(area=>area.id);
 const trained={...initial,
  xpWallet:99999,
  forest:{...initial.forest,completedAreas:cleared},
  progress:Object.fromEntries(PHRASES.map(phrase=>[phrase.id,{
   attempts:4,smoothContexts:['think-cafe','think-trip'],smoothDays:['2026-10-22','2026-10-26']
  }]))
 };
 for(const id of newIds){
  const creature=MONSTERS.find(monster=>monster.id===id);
  assert.equal(companionUnlockProgress(initial,creature).ready,false,id);
  const p=companionUnlockProgress(trained,creature);
  assert.ok(p.currentSkill>=p.requiredSkill,`${id} must be possible after learning`);
  assert.equal(p.currentRecall,0);
  assert.equal(p.ready,false,`${id} must still require spaced recall`);
 }
 assert.equal(captureEligibleMonsters(trained).captured.some(id=>newIds.includes(id)),false);
});

test('an existing 31-companion save stays unchanged when the collection expands to 44',()=>{
 const oldIds=MONSTERS.filter(monster=>![...newIds,...latestIds].includes(monster.id)).map(monster=>monster.id);
 assert.equal(oldIds.length,31);
 const save={...createSave(),ownedMonsters:oldIds,selectedMonster:oldIds.at(-1),
  monsterXp:Object.fromEntries(oldIds.map(id=>[id,630])),
  monsterEvolution:Object.fromEntries(oldIds.map(id=>[id,2])),
  monsterTrials:Object.fromEntries(oldIds.map(id=>[id,['entry','glade','thicket']]))};
 const restored=validateSave(JSON.parse(JSON.stringify(save)));
 assert.equal(restored.ownedMonsters.length,31);
 assert.equal(restored.selectedMonster,oldIds.at(-1));
 for(const id of oldIds){
  assert.equal(restored.monsterXp[id],630);
  assert.equal(restored.monsterEvolution[id],2);
 }
 assert.equal(restored.ownedMonsters.some(id=>newIds.includes(id)),false,
  'Installing a new version must not grant companions or reset the old roster');
});

test('nine more story-only monsters have distinct pixel silhouettes, evolution names and hard learning gates',()=>{
 assert.equal(latestIds.length,9);
 for(const id of latestIds){
  const monster=MONSTERS.find(entry=>entry.id===id);
  assert.ok(monster?.roots.length>=2,id);
  assert.ok(monster.evolvedName&&monster.ascendedName,id);
  assert.ok(monster.masteryUnlock>=7,id);
  assert.ok(monster.retentionUnlock>=2,id);
  assert.ok(monster.forestAreas||monster.cityAreas||monster.ruinsAreas,id);
  assert.ok(!companionUnlockProgress(createSave(),monster).ready,id);
  assert.ok(allySkill(id).name,`own combat skill for ${id}`);
  assert.ok(masterySkillFor(id,4)?.name,`own level-four skill for ${id}`);
  const stages=[0,1,2].map(stage=>monsterArt(id,stage));
  stages.forEach((svg,stage)=>{assert.match(svg,new RegExp(`data-pixel-sprite="${id}"`));assert.match(svg,new RegExp(`data-stage="${stage}"`));});
  assert.notEqual(stages[0],stages[1]);assert.notEqual(stages[1],stages[2]);
 }
});
