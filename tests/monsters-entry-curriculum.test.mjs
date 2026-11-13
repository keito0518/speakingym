import test from 'node:test';
import assert from 'node:assert/strict';
import { FOREST_ENTRY_PROMPTS } from '../prototype/speakingym-monsters/forest-entry-curriculum.js';
import { ALL_PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { buildForestWave, regularEncountersFor } from '../prototype/speakingym-monsters/forest-battle.js';
import { gradeLocalResponse } from '../prototype/speakingym-monsters/monster-grader.js';
import { VETTED_LEVEL_PARAPHRASES } from '../prototype/speakingym-monsters/monster-engine.js';
import { quizTeachingFor } from '../prototype/speakingym-monsters/forest-teaching.js';

const seeded=initial=>{let state=initial;return ()=>((state=(state*1664525+1013904223)>>>0)/4294967296);};

test('first forest gate teaches 30 distinct, chapter-specific real-world tasks at three levels',()=>{
  assert.equal(FOREST_ENTRY_PROMPTS.length,30);
  assert.equal(new Set(FOREST_ENTRY_PROMPTS.map(p=>p.id)).size,30);
  for(const difficulty of ['easy','normal','hard']){
    const level=FOREST_ENTRY_PROMPTS.filter(p=>p.difficulty===difficulty);
    assert.equal(level.length,10);
    assert.equal(level.filter(p=>p.kind==='vocab').length,3);
    assert.equal(level.filter(p=>p.kind==='grammar').length,3);
    assert.equal(level.filter(p=>p.kind==='speak').length,4);
    assert.ok(level.every(p=>p.world==='entry'&&p.cue&&p.hint&&p.tip));
    assert.ok(level.every(p=>ALL_PROMPTS.filter(other=>other.id===p.id).length===1));
    for(const prompt of level){
      assert.equal(gradeLocalResponse(prompt,prompt.answer).status,'correct',prompt.id);
      assert.notEqual(gradeLocalResponse(prompt,'').status,'correct',prompt.id);
      if(prompt.kind==='vocab'){
        assert.equal(prompt.options.length,3);
        assert.equal(new Set(prompt.options).size,3);
        assert.ok(prompt.options.includes(prompt.answer));
      }
      if(prompt.kind==='grammar'){
        assert.deepEqual([...prompt.tokens].sort(),[...prompt.answer.replace(/[.!?]$/,'').split(' ')].sort());
      }
      if(prompt.kind!=='speak'){
        const lesson=quizTeachingFor(prompt);
        assert.ok(lesson.clue.length>=22&&lesson.transfer.length>=30,prompt.id);
      }
    }
  }
  assert.equal(new Set(FOREST_ENTRY_PROMPTS.map(p=>p.baseId)).size,10);
});

test('all twelve forest conversations accept verified natural rewording without requiring paid AI',()=>{
  const speaking=FOREST_ENTRY_PROMPTS.filter(prompt=>prompt.kind==='speak');
  assert.equal(speaking.length,12);
  for(const prompt of speaking){
    const variants=VETTED_LEVEL_PARAPHRASES[prompt.id];
    assert.ok(variants?.length>=2,`${prompt.id}: at least two additional natural replies`);
    for(const reply of variants){
      const result=gradeLocalResponse(prompt,reply);
      assert.equal(result.status,'correct',`${prompt.id}: ${reply}`);
      assert.equal(result.method,'registered-example',`${prompt.id}: vetted, not guessed from keywords`);
      assert.equal(result.confidence,'high',`${prompt.id}: a reviewed example`);
    }
  }
});

test('offering to carry the bag accepts a natural demonstrative without rewarding opposite intent',()=>{
  const prompt=FOREST_ENTRY_PROMPTS.find(item=>item.id==='entry-speak-offer-trail-help-easy');
  const natural=gradeLocalResponse(prompt,'Can I help you carry that?');
  assert.equal(natural.status,'correct');
  assert.equal(natural.method,'registered-example');
  assert.notEqual(gradeLocalResponse(prompt,'Can I borrow that?').status,'correct');
  assert.notEqual(gradeLocalResponse(prompt,"I can't help you carry that.").status,'correct');
});

test('forest speaking never credits changed place, action, polarity or omitted advanced details',()=>{
  const prompt=id=>FOREST_ENTRY_PROMPTS.find(item=>item.id===`entry-speak-${id}`);
  for(const [id,reply] of [
    ['meet-at-gate-easy',"I'll wait by the gate."], // A future offer is not a present location update.
    ['meet-at-gate-easy',"I'm not waiting by the gate."],
    ['meet-at-gate-easy',"I'm waiting beside the wooden bridge."],
    ['find-the-way-easy','Could you help me find the exit?'],
    ['check-bridge-safety-easy','This bridge is safe to cross.'], // A statement does not check safety.
    ['offer-trail-help-easy','I cannot help you carry your bag.'],
    ['meet-at-gate-normal','Can you come and meet me?'], // No landmark.
    ['find-the-way-normal','I think I took the wrong path.'], // No request for the way back.
    ['check-bridge-safety-normal','Is the bridge safe to cross?'], // No rain or alternate route.
    ['offer-trail-help-normal','I can carry your bag.'], // No rest suggestion.
    ['meet-at-gate-hard','The bridge is blocked. Can we meet at the entrance?'], // Missing own position.
    ['find-the-way-hard','I got lost. Could you help me?'], // Missing sign, lake and return route.
    ['check-bridge-safety-hard','The bridge is wet. Is it safe?'], // Missing heavy bags and alternative.
    ['offer-trail-help-hard','I can call for help.'], // Missing stop and injured companion context.
  ]){
    const result=gradeLocalResponse(prompt(id),reply);
    assert.notEqual(result.status,'correct',`${id}: no XP for changed or incomplete meaning: ${reply}`);
  }
});

test('entrance encounters actually show local English without overriding overdue questions or leaking worlds',()=>{
  for(const difficulty of ['easy','normal','hard']){
    for(let seed=1;seed<=35;seed++){
      const wave=buildForestWave({areaId:'entry',difficulty,wave:1,progression:'story',random:seeded(seed)});
      const regular=wave.prompts.slice(0,regularEncountersFor('entry'));
      const local=regular.filter(p=>p.world==='entry');
      assert.ok(local.length>=3,`${difficulty}/${seed}: expected at least three local tasks`);
      assert.ok(wave.prompts.every(p=>!p.world||p.world==='entry'),`${difficulty}/${seed}: leaked from another chapter`);
      assert.equal(new Set(wave.prompts.map(p=>p.id)).size,wave.prompts.length);
      assert.ok(local.some(p=>['vocab','grammar'].includes(p.kind)),`${difficulty}/${seed}: no objective forest language`);
    }
  }
  const overdue=buildForestWave({areaId:'entry',difficulty:'easy',progression:'story',
    reviewPromptIds:['forest-vocab-ticket-easy'],random:seeded(5)});
  assert.ok(overdue.prompts.some(p=>p.id==='forest-vocab-ticket-easy'),
    'An overdue exact question must not be displaced by the new entrance tasks');
});
