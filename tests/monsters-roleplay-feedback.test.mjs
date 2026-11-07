import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLEPLAY_SCENARIOS,roleplayFor,roleplayRecapFor} from '../prototype/speakingym-monsters/roleplay-scenarios.js';
import {ROLEPLAY_LESSONS,roleplayCoachingFor} from '../prototype/speakingym-monsters/roleplay-feedback.js';

test('all 12 authored roleplay situations have concrete, distinct guidance at every difficulty',()=>{
 const bases=new Set(ROLEPLAY_SCENARIOS.flatMap(s=>s.turns.map(t=>t.baseId)));
 assert.equal(bases.size,12);
 assert.deepEqual(new Set(Object.keys(ROLEPLAY_LESSONS)),bases);
 for(const scenario of ROLEPLAY_SCENARIOS){
  for(const difficulty of ['easy','normal','hard']){
   const roleplay=roleplayFor(scenario.id,difficulty);
   for(const turn of roleplay.turns){
    const base=roleplayCoachingFor(turn,{status:'smooth',branch:'standard'});
    const alt=roleplayCoachingFor(turn,{status:'smooth',branch:'alternate'});
    const hinted=roleplayCoachingFor(turn,{status:'hint'});
    const skipped=roleplayCoachingFor(turn,{status:'skipped'});
    assert.match(base.observed,/自力確認/);
    assert.match(alt.observed,/登録された言い換え/);
    assert.match(hinted.observed,/ヒント/);
    assert.match(skipped.observed,/まだ判定していない/);
    assert.notEqual(base.next,hinted.next);
    assert.notEqual(hinted.next,skipped.next);
    assert.ok(base.why.length>=20);
    assert.ok(base.next.length>=20);
    assert.ok(skipped.next.includes('例文を見ず'));
    assert.ok(hinted.next.includes('ヒントを開かず'));
    assert.notEqual(base.why,base.next);
   }
  }
 }
});

test('recap uses the actual branch and turn status, not imagined answer quality',()=>{
 const play=roleplayFor('hotel','easy');
 const recap=roleplayRecapFor({...play,history:[
  {outcome:'smooth',branch:'alternate',answer:play.turns[0].prompt.alternatives[0],checked:['宿泊日数']},
  {outcome:'hint',branch:'standard',answer:play.turns[1].prompt.answer,checked:[]},
  {outcome:'skipped',branch:'supported',answer:'',checked:['false claim']}
 ]});
 assert.match(recap.rows[0].coaching.observed,/言い換え/);
 assert.deepEqual(recap.rows[0].elements,['宿泊日数']);
 assert.match(recap.rows[1].coaching.observed,/ヒント/);
 assert.match(recap.rows[1].coaching.why,/謝罪/);
 assert.equal(recap.rows[2].confirmed,false);
 assert.deepEqual(recap.rows[2].elements,[]);
 assert.match(recap.rows[2].coaching.next,/例文を見ず/);
 assert.match(recap.next,/チェックアウト/);
 assert.match(recap.next,/Just to make sure/);
 assert.equal(recap.skipped,1);
});
