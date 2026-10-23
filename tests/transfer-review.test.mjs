import test from 'node:test';
import assert from 'node:assert/strict';
import {TRANSFER_PAIRS} from '../transfer-data.mjs';
import {addDays,reviewSchedule,chooseReviewPair,reviewTrend,REVIEW_STEPS} from '../transfer-review.mjs';
import {readFileSync} from 'node:fs';

const pair=TRANSFER_PAIRS[0],other=TRANSFER_PAIRS[1];
const at=(day,hour='03:00:00')=>day+'T'+hour+'.000Z';
const e=(pairId,date,first=true,second=true)=>({pairId,first,second,at:at(date)});
const now=date=>new Date(date+'T12:00:00.000Z');

test('correct JST calendar arithmetic and explicit 1/3/7 day policy',()=>{
 assert.deepEqual([...REVIEW_STEPS],[1,3,7]);
 assert.equal(addDays('2026-10-21',1),'2026-10-22');
 assert.equal(addDays('2026-10-31',3),'2026-11-03');
 assert.equal(addDays('2026-12-30',7),'2027-01-06');
 assert.equal(addDays('invalid',1),null);
 assert.equal(addDays('2026-10-21',400),null);
});
test('successive successful self-ratings propose next day, 3 days and 7 days',()=>{
 const first=[e(pair.id,'2026-10-21')];
 assert.equal(reviewSchedule(first,now('2026-10-21')).entries[0].dueDay,'2026-10-22');
 const second=[...first,e(pair.id,'2026-10-22')];
 assert.equal(reviewSchedule(second,now('2026-10-22')).entries[0].dueDay,'2026-10-25');
 const third=[...second,e(pair.id,'2026-10-25')];
 assert.equal(reviewSchedule(third,now('2026-10-25')).entries[0].dueDay,'2026-11-01');
 assert.equal(reviewSchedule(third,now('2026-11-02')).due.length,1);
});
test('a new failure resets to next day and same-day repeats do not inflate spacing',()=>{
 const first=[e(pair.id,'2026-10-21')];
 const same=[...first,e(pair.id,'2026-10-21',true,true)];
 assert.equal(reviewSchedule(same,now('2026-10-21')).entries[0].dueDay,'2026-10-22');
 const afterFailure=[...same,e(pair.id,'2026-10-22',true,false)];
 const record=reviewSchedule(afterFailure,now('2026-10-22')).entries[0];
 assert.equal(record.dueDay,'2026-10-23');
 assert.equal(record.streak,0);
 assert.equal(record.lastSuccess,false);
});
test('today due beats new drills, with earliest due first',()=>{
 const past=[e(pair.id,'2026-10-20'),e(other.id,'2026-10-21')];
 const choice=chooseReviewPair(past,now('2026-10-23'));
 assert.equal(choice.id,pair.id);
 assert.equal(chooseReviewPair(past,now('2026-10-20')),null);
 assert.equal(reviewSchedule(past,now('2026-10-23')).due.length,2);
});
test('self-reported improvement is not proof of measured fluency',()=>{
 const rows=[
  e(pair.id,'2026-10-21',false,false),
  e(pair.id,'2026-10-22',true,true),
  e(other.id,'2026-10-22',true,true),
  e(other.id,'2026-10-25',true,true)
 ];
 const trend=reviewTrend(rows);
 assert.equal(trend.repeatedPairs,2);
 assert.equal(trend.improvedSelfRatings,1);
 assert.equal(trend.maintainedSelfRatings,1);
 assert.equal(trend.stillPractising,0);
 const stats=reviewSchedule(rows,now('2026-10-25'));
 assert.equal(stats.practisedPairs,2);
 assert.equal(stats.bothSaidNow,2);
 assert.equal(stats.needRetry,0);
});
test('malformed, future and unknown results are not promoted into due reminders',()=>{
 const rows=[
  {pairId:'attacker',first:true,second:true,at:at('2026-10-21')},
  e(pair.id,'2026-11-30'),
  {pairId:other.id,first:'yes',second:true,at:at('2026-10-22')}
 ];
 assert.equal(reviewSchedule(rows,now('2026-10-23')).practisedPairs,0);
});
test('account dashboard and transfer page use one canonical scheduler and do not upload learner data',()=>{
 const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const transfer=file('transfer.js'),account=file('account-transfer-progress.mjs');
 const transferPage=file('transfer.html'),myPage=file('account.html');
 assert.match(transfer,/chooseReviewPair/);
 assert.match(transfer,/reviewSchedule/);
 assert.match(account,/reviewSchedule/);
 assert.match(account,/speakingym:account-changing',mask/);
 assert.match(account,/speakingym-account-owner-v1/);
 assert.match(myPage,/id="sg-transfer-improved"/);
 assert.match(myPage,/src="\.\/account-transfer-progress\.mjs"/);
 assert.match(transferPage,/id="reviewDashboard"/);
 assert.match(transferPage,/id="nextReview"/);
 assert.doesNotMatch(transfer,/fetch\s*\(|XMLHttpRequest/);
 assert.doesNotMatch(account,/fetch\s*\(|XMLHttpRequest/);
});
