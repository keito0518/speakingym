import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProStudyPlan} from '../pro-study-data.mjs';

const html=readFileSync(new URL('../pro-study.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../pro-study.js',import.meta.url),'utf8');
const plans=readFileSync(new URL('../plans.html',import.meta.url),'utf8');
const account=readFileSync(new URL('../account.html',import.meta.url),'utf8');
const hub=readFileSync(new URL('../phrasebook.html',import.meta.url),'utf8');
const utc=(day)=>new Date(day+'T12:00:00Z');
test('pro study cards only derive from saved expressions/teacher feedback, no invented AI content',()=>{
 const snap={
  'speakingym-reflex-ai-teacher-v1':[{notes:[{feedback:{improved:'Could you repeat that, please?',improvement:'丁寧にお願いする'}}]}],
  'speakingym-saved-coaching-v1':[{natural:'Could you repeat that, please?',original:'もう一度言って'},{natural:'I would like some tea.',original:'紅茶がほしい'}],
  'speakingym-reflex-saved-phrases-v1':[{text:'May I sit here?',goal:'ここに座ってもいい？'}]
 };
 const a=buildProStudyPlan(snap,utc('2026-10-20'));
 assert.equal(a.cards.length,3);
 assert.equal(a.totalUniqueExpressions,3);
 assert.equal(a.cards[0].origin,'AI先生の言い換え');
 assert.ok(a.cards.some(p=>p.text==='I would like some tea.'));
 assert.ok(a.cards.some(p=>p.text==='May I sit here?'));
 assert.equal(a.report.savedSessions,0);
 assert.equal(a.report.comparison,null);
 assert.match(a.limits.notProficiency,/発音/);
});
test('saved history can report two groups of up to 5, not claim proficiency or improved skill',()=>{
 const snap={'speakingym-reflex-history-v1':Array.from({length:10},(_,i)=>({
  date:utc('2026-10-'+String(20-i).padStart(2,'0')).toISOString(),
  level:'standard',attempts:[
   {outcome:i<5?'spoken':'stuck'},{outcome:i<5?'spoken':'stuck'},
   {outcome:'skipped'}]
 }))};
 const b=buildProStudyPlan(snap,utc('2026-10-20'));
 assert.deepEqual(b.report.recent,{attempted:10,spoken:10,stuck:0});
 assert.deepEqual(b.report.previous,{attempted:10,spoken:0,stuck:10});
 assert.deepEqual(b.report.comparison,{recentPct:100,previousPct:0});
 assert.equal(b.report.recordedLast7Days,7);
 assert.ok(b.report.savedSessions===10);
 assert.deepEqual(b.cards,[]);
});
test('malformed data stays safe; only recorded data can drive lessons',()=>{
 const fake={
 'speakingym-reflex-ai-teacher-v1':[null,{notes:[{feedback:{improved:null}},{}]}],
 'speakingym-saved-coaching-v1':[{natural:'   '},null,{}, {natural:' Good   morning. '}],
 'speakingym-reflex-saved-phrases-v1':[null,{text:''},{text:'good morning.'}]
 };
 const plan=buildProStudyPlan(fake,utc('2026-10-20'));
 assert.equal(plan.cards.length,1);
 assert.equal(plan.cards[0].text,'Good   morning.');
 assert.equal(buildProStudyPlan({},utc('2026-10-20')).report.recent.attempted,0);
 assert.equal(buildProStudyPlan(null,utc('2026-10-20')).cards.length,0);
});
test('UI is mobile accessible, signed-entitlement-gated, non-AI and discoverable',()=>{
 for(const id of ['pro-locked','pro-content','pro-access-title','review-list','study-report','review-progress'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/@media\(max-width:650px\)/);
 assert.ok(plans.includes('href="./phrasebook.html"'));
 assert.ok(account.includes('href="./phrasebook.html"'));
 assert.ok(hub.includes('href="./pro-study.html"'));
 assert.ok(hub.includes('href="./pro-demo.html"'));
 assert.ok(!account.includes('href="./pro-study.html"'),'advanced study no longer duplicates the My Page entry');
 assert.match(js,/getIdToken/);
 assert.match(js,/Authorization:'Bearer '/);
 assert.match(js,/data\?\.plan!=='pro'/);
 assert.match(js,/if\(current!==epoch\)return/);
 assert.match(js,/readSnapshot\(localStorage\)/);
 assert.match(js,/credentials:'omit'/);
 assert.match(js,/speakingym:account-ready/);
 assert.match(js,/window\.speakingymSpeech\?\.speak/);
 assert.doesNotMatch(js,/checkout\.stripe\.com|payment_intents|generateContent|GEMINI_API_KEY/);
 assert.doesNotMatch(js,/innerHTML\s*=/);
});

test('Pro review fairly mixes teacher, real AI conversation and saved sprint phrases',()=>{
 const snap={
  'speakingym-reflex-ai-teacher-v1':[{notes:Array.from({length:5},(_,i)=>({
   feedback:{improved:'Teacher example '+(i+1)+'.',improvement:'実際の講評から保存'}
  }))},{notes:[{feedback:{improved:'Teacher extra example.',improvement:'講評'}}]}],
  'speakingym-saved-coaching-v1':[{natural:'Could I have a seat?',original:'座っていい？'}],
  'speakingym-reflex-saved-phrases-v1':[{text:'Please give me a moment.',goal:'少し待って'}]
 };
 const result=buildProStudyPlan(snap,utc('2026-10-21'));
 assert.equal(result.cards.length,5);
 assert.ok(result.cards.some(x=>x.origin==='AI先生の言い換え'));
 assert.ok(result.cards.some(x=>x.origin==='AI実践英会話の保存表現'));
 assert.ok(result.cards.some(x=>x.origin==='60秒チャレンジの保存表現'));
 assert.equal(new Set(result.cards.map(x=>x.id)).size,5);
 // The non-AI, no-persistence contract is preserved.
 assert.equal(result.totalUniqueExpressions,8);
});
