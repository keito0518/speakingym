import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLEPLAY_SCENARIOS,roleplayFor} from '../prototype/speakingym-monsters/roleplay-scenarios.js';
import {roleplayTransferFor,roleplayTransferFeedbackFor} from '../prototype/speakingym-monsters/roleplay-transfer.js';

const completed=(id,difficulty,outcomes=['smooth','smooth','smooth'])=>{
 const roleplay=roleplayFor(id,difficulty);
 return {...roleplay,history:outcomes.map(outcome=>({outcome}))};
};

test('each of the 4 scenes at 3 difficulties offers a vetted scene-changing speaking task',()=>{
 for(const scenario of ROLEPLAY_SCENARIOS)for(const difficulty of ['easy','normal','hard']){
  const roleplay=completed(scenario.id,difficulty);
  const transfer=roleplayTransferFor(roleplay);
  assert.ok(transfer,`${scenario.id}/${difficulty} has a transfer`);
  const source=roleplay.turns[transfer.sourceTurn-1].prompt;
  assert.equal(transfer.prompt.phraseId,source.phraseId);
  assert.equal(transfer.difficulty,difficulty);
  assert.equal(transfer.prompt.difficulty||'easy',difficulty);
  assert.equal(transfer.prompt.kind,'speak');
  assert.notEqual(transfer.sourceScene,transfer.destinationScene);
  assert.ok(!roleplay.turns.some(t=>t.prompt.id===transfer.prompt.id));
  assert.equal(transfer.sourceOutcome,'smooth');
  assert.equal(roleplayTransferFeedbackFor(transfer,transfer.prompt.answer).status,'correct');
 }
});

test('prefers self-confirmed turns, labels hint/example-only correctly, and never invents a success',()=>{
 const roleplay=completed('restaurant','easy',['skipped','hint','smooth']);
 const transfer=roleplayTransferFor(roleplay);
 assert.equal(transfer.sourceTurn,3);
 assert.equal(transfer.sourceOutcome,'smooth');
 const allSkipped=roleplayTransferFor(completed('hotel','normal',['skipped','skipped','skipped']));
 assert.equal(allSkipped.sourceOutcome,'skipped');
 assert.equal(roleplayTransferFeedbackFor(transfer,'').status,'empty');
 const unknown=roleplayTransferFeedbackFor(transfer,'I have no idea.');
 assert.equal(unknown.status,'review');
 assert.doesNotMatch(unknown.headline,/成功|正解/);
 assert.equal(unknown.example,null);
 assert.equal(roleplayTransferFeedbackFor(transfer,'I have no idea.',{revealed:true}).example,transfer.prompt.answer);
 assert.match(roleplayTransferFeedbackFor(transfer,transfer.prompt.answer,{revealed:true}).headline,/例文を見ながら/);
 assert.equal(roleplayTransferFor({...roleplay,history:[]}),null);
 assert.equal(roleplayTransferFor(null),null);
});

test('cannot select a reused task, a different-level task or a mismatched phrase',()=>{
 const roleplay=completed('market','hard');
 const source=roleplay.turns[0].prompt;
 const invalid=[
  {...source,id:'bad-same-scene'},
  {...source,id:'bad-difficulty',scene:'別の場面',difficulty:'easy'},
  {...source,id:'bad-phrase',scene:'別の場面',phraseId:'unrelated'},
  {...source,id:'bad-boss',scene:'別の場面',bossOnly:true}
 ];
 assert.equal(roleplayTransferFor(roleplay,invalid),null);
});
