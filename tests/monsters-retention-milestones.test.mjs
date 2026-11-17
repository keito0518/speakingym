import test from 'node:test';
import assert from 'node:assert/strict';
import {createSave} from '../prototype/speakingym-monsters/monster-engine.js';
import {recordRetention, retentionMilestoneSummary, retentionCheckpointLabel} from '../prototype/speakingym-monsters/retention.js';

test('1/3/7-day checkpoints reflect independently confirmed days, not mere practice',()=>{
 let save=createSave();
 const advance=(date,rating='smooth')=>{save=recordRetention(save,'think-cafe',rating,date).save;};
 advance('2026-10-01');
 assert.deepEqual([retentionMilestoneSummary(save,'2026-10-01').day1,retentionMilestoneSummary(save,'2026-10-01').day3,retentionMilestoneSummary(save,'2026-10-01').day7],[0,0,0]);
 assert.equal(retentionCheckpointLabel(save.retention['think-cafe'].stage),'翌日のチェック');
 advance('2026-10-01'); // same-day cannot accelerate a milestone
 assert.equal(retentionMilestoneSummary(save,'2026-10-01').day1,0);
 advance('2026-10-02');
 assert.deepEqual([retentionMilestoneSummary(save,'2026-10-02').day1,retentionMilestoneSummary(save,'2026-10-02').day3],[1,0]);
 assert.equal(retentionCheckpointLabel(save.retention['think-cafe'].stage),'3日後のチェック');
 advance('2026-10-05');
 assert.deepEqual([retentionMilestoneSummary(save,'2026-10-05').day3,retentionMilestoneSummary(save,'2026-10-05').day7],[1,0]);
 advance('2026-10-12');
 assert.equal(retentionMilestoneSummary(save,'2026-10-12').day7,1);
 advance('2026-10-13','hint');
 assert.equal(retentionMilestoneSummary(save,'2026-10-13').day7,0,'Hints pause active retention, without deleting earned history');
 assert.equal(retentionMilestoneSummary(save,'2026-10-13').recovering,1);
 assert.match(retentionCheckpointLabel(4,true),/再確認/);
});
