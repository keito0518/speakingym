import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PROMPTS, MONSTERS, PHRASES, PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { DIFFICULTIES, EVOLUTION_XP, STORAGE_KEY, addDays, chooseDifficulty, compareWithExamples, createSave, feedMonster, finishRound, getMonsterProgress, learningSummary, masteryLevel, normalizeEnglish, recordAnswer, selectMonster, selectRoundPrompts, validateSave } from '../prototype/speakingym-monsters/monster-engine.js';

const rate = (save, promptId, rating = 'smooth', date = '2026-10-26') => recordAnswer(save, promptId, rating, date);

test('curriculum has six expressions, two situations, and three authored difficulty levels', () => {
  assert.equal(PHRASES.length,6);assert.equal(PROMPTS.length,12);assert.equal(MONSTERS.length,9);
  assert.deepEqual(DIFFICULTIES,['easy','normal','hard']);
  assert.equal(ALL_PROMPTS.length,36);
  for(const difficulty of ['normal','hard']) {
    const level=ALL_PROMPTS.filter(p=>p.difficulty===difficulty);
    assert.equal(level.length,12);
    assert.equal(new Set(level.map(p=>p.id)).size,12);
    assert.ok(level.every(p=>p.task&&p.hint&&p.tip&&p.kind==='speak'));
    assert.ok(level.every(p=>[...p.cue+p.task].every(char=>char.charCodeAt(0)<128)));
    assert.ok(level.every(p=>PROMPTS.some(e=>e.id===p.baseId&&e.phraseId===p.phraseId)));
  }
  const averageLength = level => ALL_PROMPTS.filter(p=>p.difficulty===level).reduce((sum,p)=>sum+p.cue.length+p.task.length,0)/12;
  assert.ok(averageLength('hard')>averageLength('normal')*1.3);
  assert.equal(new Set(PROMPTS.map(p => p.id)).size,12);
  assert.equal(new Set(MONSTERS.map(m => m.id)).size,MONSTERS.length);
  assert.ok(MONSTERS.every(monster=>monster.name&&monster.kind&&monster.note));
  for(const phrase of PHRASES) {
    assert.equal(PROMPTS.filter(prompt=>prompt.phraseId===phrase.id).length,2);
    assert.ok(phrase.hint&&phrase.tip);
  }
  for(const prompt of PROMPTS) {assert.ok(prompt.scene&&prompt.cue&&prompt.answer);if(prompt.kind==='listen')assert.ok(prompt.audio);}
});

test('fresh save has a fried-egg companion and does not call account or AI APIs', () => {
  const save=createSave();
  assert.equal(STORAGE_KEY,'speakingym-monsters-prototype-v1');
  assert.deepEqual(save.ownedMonsters,['medamago']);assert.equal(save.selectedMonster,'medamago');
  assert.equal(save.xpWallet,0);
  assert.equal(save.difficulty,'easy');
  assert.equal(learningSummary(save,'2026-10-26').independent,0);
  assert.deepEqual(validateSave(save),save);
});

test('practice and challenge pick distinct expressions and prioritize overdue reviews', () => {
  let save=createSave();
  const round=selectRoundPrompts(save,6,()=>0,'2026-10-26');
  assert.equal(round.length,6);assert.equal(new Set(round.map(p=>p.phraseId)).size,6);
  save=rate(save,'think-cafe','again','2026-10-23').save;
  const review=selectRoundPrompts(save,1,()=>0,'2026-10-26');
  assert.equal(review[0].phraseId,'think');
  assert.throws(()=>selectRoundPrompts(save,7),/Choose/);
});

test('difficulty selection preserves progress and rewards, and variants share scene mastery', () => {
  const start=createSave();
  assert.throws(()=>chooseDifficulty(start,'extreme'),/Invalid difficulty/);
  const normal=chooseDifficulty(start,'normal');
  assert.equal(normal.difficulty,'normal');assert.equal(start.difficulty,'easy');
  const normalRound=selectRoundPrompts(normal,4,()=>0,'2026-10-26');
  assert.equal(normalRound.length,4);assert.ok(normalRound.every(p=>p.difficulty==='normal'));
  const hard=chooseDifficulty(normal,'hard');
  const hardRound=selectRoundPrompts(hard,3,()=>0,'2026-10-26');
  assert.ok(hardRound.every(p=>p.difficulty==='hard'));
  assert.throws(()=>selectRoundPrompts(hard,3,()=>0,'2026-10-26','extreme'),/Invalid difficulty/);
  const first=rate(normal,'think-cafe-normal','smooth','2026-10-26');
  assert.equal(first.reward.xp,24);
  assert.equal(first.save.xpWallet,24);
  const second=rate(first.save,'think-cafe-hard','smooth','2026-10-27');
  assert.equal(second.reward.xp,32);
  assert.equal(second.save.progress.think.smoothContexts.length,1);
  assert.equal(masteryLevel(second.save.progress.think),2);
  const third=rate(second.save,'think-trip-hard','smooth','2026-10-27');
  assert.equal(masteryLevel(third.save.progress.think),3);
  assert.equal(third.save.xpWallet,88);
  assert.equal(validateSave(third.save).difficulty,'normal');
  assert.equal(validateSave({...third.save,difficulty:'invalid'}).difficulty,'easy');
  assert.equal(rate(start,'late-bus-hard','hint').reward.xp,16);
  assert.equal(rate(start,'late-bus-normal','again').reward.xp,3);
});

test('example matching is intentionally narrow, not a claim to grade free-form speech', () => {
  const prompt=PROMPTS.find(p=>p.id==='late-bus');
  assert.equal(compareWithExamples(prompt,"I'm running a little late!").matchesExample,true);
  assert.equal(compareWithExamples(prompt,'I am running a little late').matchesExample,true);
  assert.equal(compareWithExamples(prompt,'I might not arrive on time').matchesExample,false);
  assert.equal(compareWithExamples(prompt,'').empty,true);
  assert.equal(normalizeEnglish('  THAT works for me!  '),'that works for me');
});

test('a genuine new expression grows the companion and unlocks the odd sock', () => {
  const initial=createSave();
  const first=rate(initial,'think-cafe');
  assert.equal(first.reward.xp,16);assert.equal(first.reward.mastery,2);
  assert.equal(first.save.xpWallet,16);
  assert.equal(first.save.monsterXp.medamago,0);
  assert.equal(initial.progress.think,undefined); // input is not mutated
  const second=rate(first.save,'repeat-class');
  assert.deepEqual(second.reward.captured,['katappo']);
  assert.equal(learningSummary(second.save).independent,2);
  assert.ok(second.save.ownedMonsters.includes('katappo'));
  const selected=selectMonster(second.save,'katappo');assert.equal(selected.selectedMonster,'katappo');
  assert.throws(()=>selectMonster(second.save,'cone'),/まだ仲間/);
});

test('every completed prompt stocks XP, even when practising a familiar phrase', () => {
  let save=rate(createSave(),'think-cafe','again').save;
  const current=save.xpWallet;
  const another=rate(save,'think-trip','smooth');
  assert.equal(another.reward.xp,16);
  assert.equal(another.save.xpWallet,current+16);
  assert.equal(another.save.monsterXp.medamago,0);
  assert.equal(another.reward.mastery,2);
  assert.equal(another.save.progress.think.attempts,2);
});

test('saved XP may be freely allocated to any owned companion', () => {
  let save=createSave();
  save=rate(save,'think-cafe','smooth').save;
  save=rate(save,'repeat-class','smooth').save;
  assert.equal(save.xpWallet,32);
  const first=feedMonster(save,'katappo',10);
  assert.equal(first.save.xpWallet,22);
  assert.equal(first.save.monsterXp.katappo,10);
  assert.equal(first.save.monsterXp.medamago,0);
  assert.equal(save.xpWallet,32);
  const second=feedMonster(first.save,'medamago',22);
  assert.equal(second.save.xpWallet,0);
  assert.equal(second.save.monsterXp.medamago,22);
  assert.throws(()=>feedMonster(second.save,'katappo',1),/足りません/);
  assert.throws(()=>feedMonster(save,'cone',1),/まだ仲間/);
  assert.throws(()=>feedMonster(save,'katappo',0),/整数/);
  assert.throws(()=>feedMonster(save,'katappo',1.5),/整数/);
});

test('mastery needs independent speaking in another context on another day', () => {
  let save=rate(createSave(),'think-cafe','smooth','2026-10-26').save;
  save=rate(save,'think-trip','smooth','2026-10-26').save;
  assert.equal(masteryLevel(save.progress.think),2);
  save=rate(save,'think-trip','smooth','2026-10-27').save;
  assert.equal(masteryLevel(save.progress.think),3);
  assert.equal(save.progress.think.nextReviewDay,'2026-11-03');
  assert.equal(learningSummary(save,'2026-11-03').reviewCount,1);
});

test('monsters unlock through skill growth; evolution occurs when banked XP is spent', () => {
  let save=createSave();
  const dayOne=PROMPTS.filter((p,index)=>index%2===0);
  for(const prompt of dayOne)save=rate(save,prompt.id).save;
  assert.equal(learningSummary(save).independent,6);
  assert.ok(save.ownedMonsters.includes('purupun'));
  assert.ok(save.ownedMonsters.includes('nororo'));
  assert.ok(save.ownedMonsters.includes('keshipon'));
  assert.ok(save.ownedMonsters.includes('amekurage'));
  assert.equal(getMonsterProgress(save).evolved,false);
  for(const prompt of PROMPTS.filter((p,index)=>index%2===1))save=rate(save,prompt.id,'smooth','2026-10-27').save;
  assert.equal(learningSummary(save,'2026-10-27').mastered,6);
  assert.ok(save.ownedMonsters.includes('koge'));
  assert.ok(save.ownedMonsters.includes('cone'));
  assert.ok(save.ownedMonsters.includes('donako'));
  assert.ok(save.xpWallet>=EVOLUTION_XP);
  assert.equal(getMonsterProgress(save).evolved,false);
  const given=feedMonster(save,'purupun',EVOLUTION_XP);
  assert.equal(given.reward.evolved,true);
  assert.equal(given.reward.leveledUp,true);
  assert.equal(getMonsterProgress(given.save,'purupun').evolved,true);
  assert.equal(getMonsterProgress(given.save,'medamago').evolved,false);
});

test('manual and hinted ratings keep review due, and a completed challenge tracks a personal best', () => {
  let save=rate(createSave(),'prefer-city','hint','2026-10-26').save;
  assert.equal(masteryLevel(save.progress.prefer),1);
  assert.equal(save.progress.prefer.nextReviewDay,'2026-10-27');
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
  save=finishRound(save,3);save=finishRound(save,1);
  assert.equal(save.completedRuns,2);assert.equal(save.bestSmooth,3);
  assert.throws(()=>finishRound(save,7),/Invalid/);
});

test('unknown save formats are rejected, while old pre-wallet saves migrate safely', () => {
  const legacy={...createSave(),monsterXp:undefined,rewardedDays:undefined,progress:{think:{attempts:1,smoothContexts:['think-cafe','bad'],smoothDays:['2026-10-26'],lastRating:'smooth'}}};
  delete legacy.xpWallet;
  const safe=validateSave(legacy);
  assert.equal(safe.monsterXp.medamago,0);
  assert.equal(safe.xpWallet,0);
  assert.deepEqual(safe.progress.think.smoothContexts,['think-cafe']);
  assert.deepEqual(safe.rewardedDays,[]);
  assert.equal(validateSave({...createSave(),version:2}),null);
  assert.equal(validateSave({...createSave(),ownedMonsters:['unknown']}),null);
});
