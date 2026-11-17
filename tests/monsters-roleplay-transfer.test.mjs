import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLEPLAY_SCENARIOS,roleplayFor} from '../prototype/speakingym-monsters/roleplay-scenarios.js';
import {roleplayTransferFor,roleplayTransferFeedbackFor,scheduleRoleplayTransfer,dueRoleplayTransfers} from '../prototype/speakingym-monsters/roleplay-transfer.js';
import {createSave,recordAnswer,validateSave,addDays} from '../prototype/speakingym-monsters/monster-engine.js';
import {dailyTrainingPlan} from '../prototype/speakingym-monsters/daily-training.js';

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

test('a checked transfer only queues a vetted exact task for tomorrow, without earning XP or recording text',()=>{
 const challenge=roleplayTransferFor(completed('restaurant','easy'));
 const original=createSave(),today='2026-11-02',tomorrow=addDays(today,1);
 const scheduled=scheduleRoleplayTransfer(original,challenge,{status:'confirmed',today});
 assert.deepEqual(original.transferReviews,{});
 assert.equal(scheduled.transferReviews[challenge.prompt.id].due,tomorrow);
 assert.equal(scheduled.transferReviews[challenge.prompt.id].status,'confirmed');
 assert.equal(scheduled.reviewPrompts[challenge.prompt.id],tomorrow);
 assert.equal(scheduled.xpWallet,0);
 assert.deepEqual(scheduled.progress,{});
 assert.deepEqual(scheduled.retention,{});
 assert.equal(dueRoleplayTransfers(scheduled,today).length,0);
 assert.deepEqual(dueRoleplayTransfers(scheduled,tomorrow).map(r=>r.prompt.id),[challenge.prompt.id]);
 assert.ok(dailyTrainingPlan(scheduled,{today:tomorrow}).prompts.some(p=>p.id===challenge.prompt.id),
  'The previously practiced exact question also becomes due in ordinary daily training');
 const restored=validateSave(JSON.parse(JSON.stringify(scheduled)));
 assert.deepEqual(restored.transferReviews,scheduled.transferReviews);
 assert.ok(!JSON.stringify(scheduled).includes("I'd rather take the train"));
});

test('tomorrow independent answer clears the transfer task; a hint or skip keeps one more day of review',()=>{
 const challenge=roleplayTransferFor(completed('hotel','normal'));
 const today='2026-11-02',tomorrow='2026-11-03';
 const scheduled=scheduleRoleplayTransfer(createSave(),challenge,{status:'example',today});
 const verified=recordAnswer(scheduled,challenge.prompt.id,'smooth',tomorrow);
 assert.deepEqual(verified.save.transferReviews,{});
 assert.ok(verified.reward.xp>0);
 assert.equal(verified.save.progress[challenge.prompt.phraseId].attempts,1);
 const assisted=recordAnswer(scheduled,challenge.prompt.id,'hint',tomorrow);
 assert.equal(assisted.save.transferReviews[challenge.prompt.id].due,'2026-11-04');
 assert.equal(assisted.save.transferReviews[challenge.prompt.id].status,'review');
 assert.equal(assisted.save.reviewPrompts[challenge.prompt.id],'2026-11-04');
 const skipped=recordAnswer(scheduled,challenge.prompt.id,'again',tomorrow);
 assert.equal(skipped.reward.xp,0);
 assert.equal(skipped.save.transferReviews[challenge.prompt.id].due,'2026-11-04');
});

test('invalid schedules never mutate or import transcript-like transfer payloads',()=>{
 const source=createSave(),challenge=roleplayTransferFor(completed('market','hard'));
 assert.equal(scheduleRoleplayTransfer(source,{prompt:{id:'fake-unvetted'}},{status:'confirmed',today:'2026-11-02'}),null);
 assert.equal(scheduleRoleplayTransfer(source,challenge,{status:'wrong',today:'2026-11-02'}),null);
 assert.equal(scheduleRoleplayTransfer(source,challenge,{status:'confirmed',today:'untrusted'}),null);
 const restored=validateSave({...source,transferReviews:{
  [challenge.prompt.id]:{due:'2026-11-03',status:'review',raw:'my private sentence'},
  'fake-unknown':{due:'2026-11-03',status:'confirmed'},
  [roleplayTransferFor(completed('restaurant','easy')).prompt.id]:{due:'tomorrow',status:'confirmed'}
 }});
 assert.deepEqual(restored.transferReviews,{[challenge.prompt.id]:{due:'2026-11-03',status:'review'}});
});
