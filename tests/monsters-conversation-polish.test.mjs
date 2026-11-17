import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { conversationPolishFor } from '../prototype/speakingym-monsters/conversation-polish.js';

const prompt=ALL_PROMPTS.find(p=>p.id==='prefer-window-easy');

test('only authored speaking/reading prompts can offer paraphrase practice',()=>{
 assert.equal(conversationPolishFor(null,'test'),null);
 for(const kind of ['listen','vocab','grammar']){
  assert.equal(conversationPolishFor(ALL_PROMPTS.find(p=>p.kind===kind),'test'),null);
 }
});

test('empty and repeated answers are teaching prompts, not extra confirmed wins',()=>{
 const empty=conversationPolishFor(prompt,' ');
 assert.equal(empty.status,'empty');
 assert.equal(empty.confirmed,false);
 const same=conversationPolishFor(prompt,prompt.answer,{originalAnswer:prompt.answer});
 assert.equal(same.status,'same');
 assert.equal(same.confirmed,false);
 assert.deepEqual(same.checked,[]);
});

test('an authored alternative is confirmed without fabricated component or pronunciation checks',()=>{
 const alternative=prompt.alternatives[0];
 const outcome=conversationPolishFor(prompt,alternative,{originalAnswer:prompt.answer});
 assert.equal(outcome.status,'correct');
 assert.equal(outcome.confirmed,true);
 assert.deepEqual(outcome.checked,[],
  'Matching a whole registered example must not invent per-component grading');
 assert.ok(outcome.tip.length>0);
 assert.doesNotMatch(JSON.stringify(outcome),/発音が正確|流暢に話せた/);
});

test('unknown natural variants remain unconfirmed and known phrase mistakes get an authored clue',()=>{
 const unknown=conversationPolishFor(prompt,'I have no idea.',{originalAnswer:prompt.answer});
 assert.equal(unknown.status,'review');
 assert.equal(unknown.confirmed,false);
 assert.match(unknown.headline,/確認できない/);
 const known=conversationPolishFor(prompt,'I am prefer a window seat.',{originalAnswer:prompt.answer});
 assert.equal(known.confirmed,false);
 assert.match(known.tip,/prefer|be 動詞/);
});
