import assert from 'node:assert/strict';
import test from 'node:test';
import {savedReviewRecap} from '../prototype/speakingym-monsters/saved-review-coach.js';

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
