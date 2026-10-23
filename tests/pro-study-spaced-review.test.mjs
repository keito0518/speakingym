import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProStudyPlan,markReview,reviewDay,normalizeReviewProgress,summarizeReviews} from '../pro-study-data.mjs';

const when=s=>new Date(s+'T12:00:00');
const sample=()=>({'speakingym-reflex-ai-teacher-v1':[{
 notes:[{feedback:{improved:'Could you repeat that?',improvement:'聞き返す'}},
 {feedback:{improved:'Could I pay by card?',improvement:'カード払いを確認'}}]
}], 'speakingym-saved-coaching-v1':[{
 natural:'Would you mind speaking more slowly?',original:'もっとゆっくりお願い'}],
 'speakingym-reflex-saved-phrases-v1':[{
 text:'I would like to check in.',goal:'チェックイン'}]});

test('saved phrases become due today, and remembered intervals are 1, 3, 7, 14, 30 days',()=>{
 const snap=sample();
 let progress={},id=buildProStudyPlan(snap,when('2026-10-23')).cards[0].id;
 let day='2026-10-23';
 for(const [nextDay,stage,due] of [
  ['2026-10-23',1,'2026-10-24'],
  ['2026-10-24',2,'2026-10-27'],
  ['2026-10-27',3,'2026-11-03'],
  ['2026-11-03',4,'2026-11-17'],
  ['2026-11-17',5,'2026-12-17'],
  ['2026-12-17',5,'2027-01-16']
 ]){
  progress=markReview(progress,id,'remembered',when(nextDay));
  assert.equal(progress.cards[id].stage,stage);
  assert.equal(progress.cards[id].due,due);
  assert.equal(buildProStudyPlan(snap,when(nextDay),progress).cards.some(x=>x.id===id),false,
   'reviewed expression should leave today\'s due cards');
  day=nextDay;
 }
 assert.equal(progress.cards[id].remembered,6);
 assert.equal(progress.cards[id].attempts,6);
 assert.equal(reviewDay(when(day)),day);
});
test('not-yet-due cards are hidden; an overdue review is shown before fresh cards',()=>{
 const snap=sample();
 const t=when('2026-10-23'),base=buildProStudyPlan(snap,t);
 const oldest=base.cards[0].id;
 let state=markReview({},oldest,'remembered',t);
 const same=buildProStudyPlan(snap,t,state);
 assert.equal(same.cards.length,3);
 assert.ok(!same.cards.some(x=>x.id===oldest));
 const tomorrow=buildProStudyPlan(snap,when('2026-10-24'),state);
 assert.equal(tomorrow.cards.length,4);
 assert.equal(tomorrow.cards[0].id,oldest,'due reviews should be prioritized');
});
test('failed recall resets spacing, counts as an attempt and does not fabricate proficiency',()=>{
 const id='Could you repeat that?'.toLowerCase();
 let state=markReview({},id,'remembered',when('2026-10-23'));
 state=markReview(state,id,'retry',when('2026-10-24'));
 assert.equal(state.cards[id].stage,0);
 assert.equal(state.cards[id].due,'2026-10-25');
 assert.equal(state.days['2026-10-24'].remembered,0);
 assert.equal(state.cards[id].remembered,1);
 assert.equal(state.cards[id].attempts,2);
 const after=markReview(state,id,'remembered',when('2026-10-24'));
 assert.deepEqual(after,state,'duplicate grading on the same day must not inflate activity');
});
test('daily 5-minute plan includes saved phrase practice without extra AI calls',()=>{
 const view=buildProStudyPlan(sample(),when('2026-10-23'));
 assert.equal(view.dailyPlan.length,3);
 assert.ok(view.dailyPlan[0].title.includes('復習'));
 assert.equal(view.dailyPlan[1].href,'./reflex.html');
 assert.equal(view.dailyPlan[2].href,'./scenes.html');
 assert.ok(view.dailyPlan[2].detail.includes(view.cards[0].text));
 const summary=summarizeReviews({},view.cards,when('2026-10-23'));
 assert.equal(summary.due,4);
 assert.equal(summary.attemptedToday,0);
});
test('activity, streak and next due date reflect only learner self-reports',()=>{
 const snap=sample(),day=when('2026-10-23'),id=buildProStudyPlan(snap,day).cards[0].id;
 let state=markReview({},id,'remembered',when('2026-10-21'));
 state=markReview(state,id,'remembered',when('2026-10-22'));
 state=markReview(state,id,'retry',when('2026-10-23'));
 const summary=buildProStudyPlan(snap,day,state).reviewSummary;
 assert.equal(summary.streak,3);
 assert.equal(summary.attemptedToday,1);
 assert.equal(summary.rememberedToday,0);
 assert.equal(summary.attemptedLast7Days,3);
 assert.equal(summary.seen,1);
 assert.equal(summary.mastered,0);
 assert.equal(summary.nextDue,'2026-10-24');
});
test('untrusted or excessive local review metadata is sanitized; prototype keys remain safe',()=>{
 const polluted={cards:{__proto__:{stage:3,due:'2026-10-01'},bad:{stage:999,due:'today'},
  valid:{stage:3,due:'2026-12-01',attempts:-4,remembered:'4',last:'bad-date'}},
  days:{'2026-10-23':{attempted:5,remembered:2},'bad':{attempted:5}}};
 const clean=normalizeReviewProgress(polluted);
 assert.equal(Object.getPrototypeOf(clean.cards),null);
 assert.equal(Object.hasOwn(clean.cards,'bad'),false);
 assert.equal(clean.cards.valid.attempts,0);
 assert.equal(clean.cards.valid.remembered,0);
 assert.equal(clean.cards.valid.last,'2026-12-01');
 assert.equal(Object.hasOwn(clean.days,'bad'),false);
 const altered=markReview(clean,'__proto__','remembered',when('2026-10-23'));
 assert.equal({}.polluted,undefined);
 assert.ok(altered.cards['__proto__']);
 assert.equal(markReview({},'', 'remembered',when('2026-10-23')).days['2026-10-23'],undefined);
});
