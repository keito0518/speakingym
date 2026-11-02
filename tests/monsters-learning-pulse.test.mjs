import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { gradeLocalResponse } from '../prototype/speakingym-monsters/monster-grader.js';
import { listeningChallengeFor } from '../prototype/speakingym-monsters/listening-challenges.js';
import { quizTeachingFor } from '../prototype/speakingym-monsters/forest-teaching.js';
import { forestLearningPulseFor } from '../prototype/speakingym-monsters/forest-learning-pulse.js';

const first=kind=>{
 const prompt=ALL_PROMPTS.find(item=>item.kind===kind);
 assert.ok(prompt,`An authored ${kind} prompt exists`);
 return prompt;
};

test('the dungeon takeaway never celebrates an unverified or unanswered attempt',()=>{
 const prompt=first('speak');
 for(const status of ['review','incomplete','incorrect','empty']){
  assert.equal(forestLearningPulseFor(prompt,{status},{answer:prompt.answer}),null);
 }
 assert.equal(forestLearningPulseFor(null,{status:'correct'}),null);
 assert.equal(forestLearningPulseFor(prompt,null,{answer:prompt.answer}),null);
});

test('verified speaking shows the actual task and next expression without claiming pronunciation evaluation',()=>{
 const prompt=first('speak');
 const grade=gradeLocalResponse(prompt,prompt.answer);
 assert.equal(grade.status,'correct');
 const pulse=forestLearningPulseFor(prompt,grade,{answer:prompt.answer,hinted:true});
 assert.equal(pulse.kind,'speaking');
 assert.equal(pulse.achieved,prompt.task||prompt.cue||prompt.scene);
 assert.match(pulse.badge,/ヒントあり/);
 assert.ok(pulse.tip.length>0&&pulse.next.length>0);
 assert.doesNotMatch(JSON.stringify(pulse),/発音が正確|流暢に話せた/);
});

test('listening reports the correct selected meaning, not a speaking or pronunciation score',()=>{
 const prompt=first('listen');
 const pulse=forestLearningPulseFor(prompt,{status:'correct'});
 const check=listeningChallengeFor(prompt);
 assert.equal(pulse.kind,'listen');
 assert.equal(pulse.achievedLabel,'聞き取れた意味');
 assert.equal(pulse.achieved,check.options[check.correctIndex]);
 assert.match(pulse.next,/選択肢を見ずに/);
});

test('vocabulary and grammar show only authored, challenge-specific learning tips',()=>{
 for(const kind of ['vocab','grammar']){
  const prompt=first(kind);
  const pulse=forestLearningPulseFor(prompt,{status:'correct'});
  const authored=quizTeachingFor(prompt);
  assert.equal(pulse.kind,kind);
  assert.equal(pulse.achieved,prompt.answer);
  assert.equal(pulse.tip,authored.clue);
  assert.equal(pulse.next,authored.transfer);
 }
});
