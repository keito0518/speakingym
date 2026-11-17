import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PROMPTS, MONSTERS, PHRASES } from '../prototype/speakingym-monsters/monster-data.js';
import { CITY_AREAS, FOREST_AREAS, RUINS_AREAS, RUINS_ROUTES, DUNGEON_AREAS, unlockedDungeonAreas, unlockedRuinsAreas, nextDungeonArea, finishForest } from '../prototype/speakingym-monsters/forest-engine.js';
import { createSave, validateSave, companionUnlockProgress, captureEligibleMonsters, getEvolutionTrialGuide } from '../prototype/speakingym-monsters/monster-engine.js';
import { buildForestWave, AREA_BOSSES, regularEncountersFor, opponentFor } from '../prototype/speakingym-monsters/forest-battle.js';
import { forestWorldArt } from '../prototype/speakingym-monsters/forest-world.js';
import { battleArenaArt, relicArt } from '../prototype/speakingym-monsters/game-visuals.js';
import { monsterArt } from '../prototype/speakingym-monsters/monster-art.js';
import { allyAffinity, allySkill, masterySkillFor, bossAttackFor } from '../prototype/speakingym-monsters/battle-tactics.js';
import { quizTeachingFor } from '../prototype/speakingym-monsters/forest-teaching.js';

const ruinsIds=['runerun','gearbat','shardling','astrowisp'];
const complete=(save,area,route)=>finishForest(save,route,'medamago',area).save;

test('the Starlit Ruins unlock only after all eight previous chapters and preserve old saves',()=>{
 let save=createSave();
 assert.equal(unlockedRuinsAreas(save).length,0);
 assert.throws(()=>complete(save,'ruins-gate','starlight'),/locked/);
 for(const area of FOREST_AREAS)save=complete(save,area.id,'sunlit');
 for(const area of CITY_AREAS.slice(0,-1))save=complete(save,area.id,'market');
 assert.equal(unlockedRuinsAreas(save).length,0);
 assert.equal(nextDungeonArea(save).id,'city-blizzard');
 save=complete(save,'city-blizzard','station');
 assert.deepEqual(unlockedRuinsAreas(save).map(area=>area.id),['ruins-gate']);
 assert.equal(nextDungeonArea(save).id,'ruins-gate');
 assert.throws(()=>complete(save,'ruins-core','starlight'),/locked/);
 assert.throws(()=>complete(save,'ruins-gate','sunlit'),/route/);
 const reward=finishForest(save,'starlight','medamago','ruins-gate');
 assert.deepEqual(reward.discovered,['star-rune','rune-seal']);
 const restored=validateSave(reward.save);
 assert.deepEqual(restored.forest.completedAreas, [...FOREST_AREAS,...CITY_AREAS,RUINS_AREAS[0]].map(area=>area.id));
 assert.equal(nextDungeonArea(restored).id,'ruins-core');
 assert.deepEqual(unlockedRuinsAreas(restored).map(area=>area.id),['ruins-gate','ruins-core']);
 assert.equal(getEvolutionTrialGuide(restored).earned[0].name,FOREST_AREAS[0].name);
 save=complete(restored,'ruins-core','clockwork');
 assert.equal(nextDungeonArea(save).id,'ruins-core');
 assert.ok(validateSave(save).forest.relics.includes('time-key'));
 assert.equal(DUNGEON_AREAS.length,10);
});

test('each ruins chapter has unique scene-grounded exams at all difficulties',()=>{
 const local=ALL_PROMPTS.filter(p=>p.world?.startsWith('ruins-'));
 assert.equal(local.length,42);
 for(const area of RUINS_AREAS){
  assert.equal(regularEncountersFor(area.id),10);
  assert.ok(AREA_BOSSES[area.id]);
  assert.equal(opponentFor(10,1,area.id).id,AREA_BOSSES[area.id].id);
  for(const difficulty of ['easy','normal','hard']){
   const wave=buildForestWave({areaId:area.id,difficulty,progression:'story',bossConversation:true,random:()=>.45});
   assert.equal(wave.prompts.length,13);
   assert.equal(new Set(wave.prompts.map(p=>p.id)).size,13);
   assert.ok(wave.prompts.filter(p=>p.world===area.id).length>=4,'each chapter must actually teach its own words');
   assert.deepEqual(wave.prompts.slice(-3).map(p=>p.kind),['listen',area.id==='ruins-gate'?'vocab':'grammar','speak']);
   assert.ok(local.filter(p=>p.world===area.id&&p.difficulty===difficulty).length>=7);
  }
 }
 for(const quiz of local.filter(p=>p.kind==='grammar'||p.kind==='vocab')){
  const lesson=quizTeachingFor(quiz);
  assert.ok(lesson.clue.length>=22&&lesson.transfer.length>=30,quiz.id);
 }
});

test('four new illustrated species require ruins progress plus distinct mastery/recall checks',()=>{
 assert.equal(MONSTERS.length,44);
 const save=createSave();
 for(const id of ruinsIds){
  const creature=MONSTERS.find(m=>m.id===id);
  assert.ok(creature?.ruinsAreas>=1);
  assert.ok(companionUnlockProgress(save,creature).requiredRuinsAreas>=1);
  assert.equal(companionUnlockProgress(save,creature).ready,false);
  assert.ok(allyAffinity(id).strong);
  assert.ok(allySkill(id).name);
  assert.ok(masterySkillFor(id,4)?.name);
  for(const stage of [0,1,2]){
   const art=monsterArt(id,stage);
   assert.match(art,/shape-rendering="crispEdges"/);
   assert.match(art,new RegExp(`data-pixel-sprite="${id}"`));
  }
  assert.notEqual(monsterArt(id,0),monsterArt(id,1));
  assert.notEqual(monsterArt(id,1),monsterArt(id,2));
 }
 assert.equal(captureEligibleMonsters(save).captured.some(id=>ruinsIds.includes(id)),false);
 // An earned lesson count can never bypass a missing chapter-clear record.
 const trained={...save,progress:Object.fromEntries(PHRASES.map(p=>[p.id,{attempts:4,smoothContexts:['think-cafe','think-trip'],smoothDays:['2026-10-24','2026-10-27']}]))};
 assert.equal(companionUnlockProgress(trained,MONSTERS.find(m=>m.id==='runerun')).ready,false);
});

test('ruins maps, arenas, rewards and boss tactics are distinct from the forest and city',()=>{
 assert.deepEqual(RUINS_ROUTES.map(route=>route.id),['starlight','clockwork']);
 for(const area of RUINS_AREAS){
  const explore=forestWorldArt('starlight',area.id);
  const battle=battleArenaArt(true,area.id);
  assert.match(explore,/ruins-world-svg/);
  assert.match(explore,/forest-landmark/);
  assert.match(battle,/battle-arena-ruins/);
  assert.doesNotMatch(battle,/city-world-svg|forest-world-svg/);
  assert.equal(bossAttackFor(AREA_BOSSES[area.id].id,0).kind,'listen');
 }
 assert.notEqual(forestWorldArt('starlight','ruins-gate'),forestWorldArt('clockwork','ruins-core'));
 for(const relic of ['star-rune','rusted-gear','rune-seal','time-key'])assert.match(relicArt(relic),/<svg/);
});
