import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTERS, PHRASES, PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { EVOLUTION_XP, STORAGE_KEY, addDays, compareWithExamples, createSave, finishRound, getMonsterProgress, learningSummary, masteryLevel, normalizeEnglish, recordAnswer, selectMonster, selectRoundPrompts, validateSave } from '../prototype/speakingym-monsters/monster-engine.js';

const rate = (save, promptId, rating = 'smooth', date = '2026-10-26') => recordAnswer(save, promptId, rating, date);

test('curriculum has six useful expressions and two curated situations for each', () => {
  assert.equal(PHRASES.length,6);assert.equal(PROMPTS.length,12);assert.equal(MONSTERS.length,5);
  assert.equal(new Set(PROMPTS.map(p => p.id)).size,12);
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
  assert.equal(initial.progress.think,undefined); // input is not mutated
  const second=rate(first.save,'repeat-class');
  assert.deepEqual(second.reward.captured,['katappo']);
  assert.equal(learningSummary(second.save).independent,2);
  assert.ok(second.save.ownedMonsters.includes('katappo'));
  const selected=selectMonster(second.save,'katappo');assert.equal(selected.selectedMonster,'katappo');
  assert.throws(()=>selectMonster(second.save,'cone'),/まだ仲間/);
});

test('repeating the same phrase on the same day cannot farm XP', () => {
  let save=rate(createSave(),'think-cafe','again').save;
  const current=save.monsterXp.medamago;
  const another=rate(save,'think-trip','smooth');
  assert.equal(another.reward.xp,0);
  assert.equal(another.save.monsterXp.medamago,current);
  assert.equal(another.reward.mastery,2);
  assert.equal(another.save.progress.think.attempts,2);
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

test('monsters unlock through skill growth; evolution takes real practice across days', () => {
  let save=createSave();
  const dayOne=PROMPTS.filter((p,index)=>index%2===0);
  for(const prompt of dayOne)save=rate(save,prompt.id).save;
  assert.equal(learningSummary(save).independent,6);
  assert.ok(save.ownedMonsters.includes('purupun'));
  assert.equal(getMonsterProgress(save).evolved,false);
  for(const prompt of PROMPTS.filter((p,index)=>index%2===1))save=rate(save,prompt.id,'smooth','2026-10-27').save;
  assert.equal(learningSummary(save,'2026-10-27').mastered,6);
  assert.ok(save.ownedMonsters.includes('koge'));
  assert.ok(save.ownedMonsters.includes('cone'));
  assert.ok(save.monsterXp.medamago>=EVOLUTION_XP);
  assert.equal(getMonsterProgress(save).evolved,true);
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

test('unknown save formats are rejected, while harmless missing values migrate safely', () => {
  const legacy={...createSave(),monsterXp:undefined,rewardedDays:undefined,progress:{think:{attempts:1,smoothContexts:['think-cafe','bad'],smoothDays:['2026-10-26'],lastRating:'smooth'}}};
  const safe=validateSave(legacy);
  assert.equal(safe.monsterXp.medamago,0);
  assert.deepEqual(safe.progress.think.smoothContexts,['think-cafe']);
  assert.deepEqual(safe.rewardedDays,[]);
  assert.equal(validateSave({...createSave(),version:2}),null);
  assert.equal(validateSave({...createSave(),ownedMonsters:['unknown']}),null);
});
