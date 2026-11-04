import assert from 'node:assert/strict';
import test from 'node:test';
import {savedReviewRecap,savedReviewTrend,rememberSavedReview} from '../prototype/speakingym-monsters/saved-review-coach.js';
import {createSave,validateSave} from '../prototype/speakingym-monsters/monster-engine.js';

test('saved English recap counts only independent answers as confirmed',()=>{
  const prompts=[{id:'listen'},{id:'speak'},{id:'vocab'},{id:'grammar'}];
  const outcomes=[
    {promptId:'listen',outcome:'independent'},
    {promptId:'speak',outcome:'supported'},
    {promptId:'vocab',outcome:'review'},
    {promptId:'outside',outcome:'independent'}
  ];
  assert.deepEqual(savedReviewRecap(prompts,outcomes),{
    total:4,independent:1,supported:1,review:1,pending:1,percentage:25,
    retryIds:['speak','vocab','grammar']
  });
});

test('all independently confirmed saved prompts need no immediate retry',()=>{
  assert.deepEqual(savedReviewRecap([{id:'one'},{id:'two'}],[
    {promptId:'one',outcome:'independent'},{promptId:'two',outcome:'independent'}
  ]),{total:2,independent:2,supported:0,review:0,pending:0,percentage:100,retryIds:[]});
});

test('empty and duplicate bookmarks never invent progress or a high percentage',()=>{
  assert.equal(savedReviewRecap([],[]).percentage,0);
  const result=savedReviewRecap([{id:'same'},{id:'same'}],[]);
  assert.equal(result.total,1);
  assert.deepEqual(result.retryIds,['same']);
});

test('saved English comparison separates same-day retry from later independent recall',()=>{
  const prompts=[{id:'think-cafe'},{id:'repeat-station'}];
  const first=[{promptId:'think-cafe',outcome:'review'},
    {promptId:'repeat-station',outcome:'independent'}];
  const initial=createSave();
  const recorded=rememberSavedReview(initial,prompts,first,'2026-11-04');
  assert.deepEqual(initial.savedReviewHistory,{},'Remembering a result must not mutate earlier saves');
  assert.deepEqual(recorded.savedReviewHistory['think-cafe'],{day:'2026-11-04',outcome:'review'});
  const retry=[{promptId:'think-cafe',outcome:'independent'}];
  assert.deepEqual(savedReviewTrend([prompts[0]],retry,recorded.savedReviewHistory,'2026-11-04'),{
    compared:1,improvedLater:0,improvedToday:1,maintained:0,needsPractice:0
  });
  const afterRetry=rememberSavedReview(recorded,[prompts[0]],retry,'2026-11-04');
  assert.deepEqual(afterRetry.savedReviewHistory['repeat-station'],recorded.savedReviewHistory['repeat-station'],
    'A partial retry must preserve the unplayed saved task');
  const later=[{promptId:'think-cafe',outcome:'independent'},
    {promptId:'repeat-station',outcome:'supported'}];
  assert.deepEqual(savedReviewTrend(prompts,later,afterRetry.savedReviewHistory,'2026-11-07'),{
    compared:2,improvedLater:0,improvedToday:0,maintained:1,needsPractice:1
  });
  const spaced=rememberSavedReview(recorded,[prompts[0]],retry,'2026-11-07');
  assert.equal(savedReviewTrend([prompts[0]],retry,recorded.savedReviewHistory,'2026-11-07').improvedLater,1);
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(spaced))).savedReviewHistory,spaced.savedReviewHistory);
});

test('saved English history excludes unplayed tasks, unknown prompts, malformed records and raw answers',()=>{
  const initial=createSave();
  const next=rememberSavedReview(initial,[{id:'think-cafe'},{id:'repeat-station'}],
    [{promptId:'think-cafe',outcome:'supported'},
      {promptId:'unknown',outcome:'independent'}],'2026-11-04');
  assert.deepEqual(next.savedReviewHistory,{'think-cafe':{day:'2026-11-04',outcome:'supported'}});
  const polluted=validateSave({...next,savedReviewHistory:{
    ...next.savedReviewHistory,'repeat-station':{day:'bad',outcome:'independent'},
    'unknown':{day:'2026-11-04',outcome:'independent'},
    'late-call':{day:'2026-11-04',outcome:'mastered',answer:'Private English text'}
  }});
  assert.deepEqual(polluted.savedReviewHistory,next.savedReviewHistory);
  assert.deepEqual(validateSave({...initial,savedReviewHistory:[]}).savedReviewHistory,{});
  assert.deepEqual(savedReviewTrend([{id:'think-cafe'}],[],next.savedReviewHistory,'2026-11-05'),{
    compared:0,improvedLater:0,improvedToday:0,maintained:0,needsPractice:0
  },'Unfinished tasks must not be counted as a setback');
});
