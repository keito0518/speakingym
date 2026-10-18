import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const scenes=readFileSync(new URL('../scenes.html',import.meta.url),'utf8');
const reflex=readFileSync(new URL('../reflex.html',import.meta.url),'utf8');

test('AI upstream quota errors are distinguished from a paying user monthly limit',()=>{
 assert.match(scenes,/gemini_quota:"AI提供元の利用上限/);
 assert.match(scenes,/契約の残り回数とは別の制限/);
 assert.match(scenes,/monthly_turn_limit:"今月のProのAI英会話600往復/);
 assert.doesNotMatch(scenes,/gemini_quota:"無料枠の上限/);
 assert.match(reflex,/gemini_quota:"AI提供元の利用上限/);
 assert.match(reflex,/monthly_teacher_limit:"今月のProのAI先生100回/);
 assert.doesNotMatch(reflex,/無料枠のGemini/);
});
test('failed roleplay answers refresh authoritative quota balance rather than claiming a free refund',()=>{
 assert.match(scenes,/status\("返答に失敗したため、会話を一時停止しています。"\);void window\.speakingymQuota\?\.refresh\(\)/);
});
