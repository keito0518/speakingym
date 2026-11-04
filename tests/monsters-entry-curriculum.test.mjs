import test from 'node:test';
import assert from 'node:assert/strict';
import { FOREST_ENTRY_PROMPTS } from '../prototype/speakingym-monsters/forest-entry-curriculum.js';
import { ALL_PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { buildForestWave, regularEncountersFor } from '../prototype/speakingym-monsters/forest-battle.js';
import { gradeLocalResponse } from '../prototype/speakingym-monsters/monster-grader.js';
import { quizTeachingFor } from '../prototype/speakingym-monsters/forest-teaching.js';

const seeded=initial=>{let state=initial;return ()=>((state=(state*1664525+1013904223)>>>0)/4294967296);};

test('first forest gate teaches 18 distinct, chapter-specific real-world tasks at three levels',()=>{
  assert.equal(FOREST_ENTRY_PROMPTS.length,18);
  assert.equal(new Set(FOREST_ENTRY_PROMPTS.map(p=>p.id)).size,18);
  for(const difficulty of ['easy','normal','hard']){
    const level=FOREST_ENTRY_PROMPTS.filter(p=>p.difficulty===difficulty);
    assert.equal(level.length,6);
    assert.equal(level.filter(p=>p.kind==='vocab').length,2);
    assert.equal(level.filter(p=>p.kind==='grammar').length,2);
    assert.equal(level.filter(p=>p.kind==='speak').length,2);
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
  assert.equal(new Set(FOREST_ENTRY_PROMPTS.map(p=>p.baseId)).size,6);
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
