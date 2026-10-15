import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildLearningDashboard,japaneseDate} from "../dashboard-data.mjs";

const html=readFileSync(new URL("../account.html",import.meta.url),"utf8");
const sync=readFileSync(new URL("../account-sync.js",import.meta.url),"utf8");
const now=new Date(2026,9,15,13,30);
test("new dashboard displays real records with meaningful call to action",()=>{
 const snapshot={
  "speakingym-reflex-stats-v1":{sessions:7,spoken:36},
  "speakingym-reflex-saved-phrases-v1":[{id:"hold2:easy:quick",text:"Just a moment.",goal:"少し待ってもらう",level:"easy"}],
  "speakingym-saved-coaching-v1":[{original:"I want coffee",natural:"Could I get a coffee, please?"}],
  "speakingym-scenes-stats-v1":{total:4,hotel_standard_completed:2},
  "speakingym-survival-stats-v1":{attempts:10,clears:5},
  "speakingym-reflex-history-v1":[
   {date:"2026-10-15T01:00:00Z",level:"challenge",attempts:[{outcome:"spoken"},{outcome:"stuck"}]},
   {date:"2026-10-14T12:00:00Z",level:"easy",attempts:[{outcome:"spoken"}]},
   {date:"2026-10-11T04:00:00Z",level:"standard",attempts:[{outcome:"stuck"}]}
  ],
  "speakingym-reflex-ai-teacher-v1":[{
   date:"2026-10-15T01:00:00Z",
   notes:[{attemptIndex:0,feedback:{
    praise:"Could you を使えていて丁寧です。",
    improvement:"少し短くすると自然です。",
    improved:"Could you explain that again, please?"
   }}]
  }]
 };
 const result=buildLearningDashboard(snapshot,now);
 assert.deepEqual(result.totals,{sprint:7,phrases:2,ai:4,cafe:10,savedSessions:3});
 assert.equal(result.weekly.activeDays,3);
 assert.equal(result.weekly.recordedSessions,3);
 assert.equal(result.weekly.days.length,7);
 assert.equal(result.weekly.days.at(-1).today,true);
 assert.equal(result.weekly.days.at(-1).completed,1);
 assert.equal(result.phrases[0].english,"Just a moment.");
 assert.equal(result.phrases[1].english,"Could I get a coffee, please?");
 assert.equal(result.recentTeacher.length,1);
 assert.match(result.recentTeacher[0].praise,/Could you/);
 assert.equal(result.recentSessions.length,3);
 assert.equal(result.recentSessions[0].spoke,1);
 assert.equal(result.nextAction.href,"./reflex.html#phrases");
});
test("brand-new guests see honest zero state rather than invented skill, streak or teacher feedback",()=>{
 const result=buildLearningDashboard({},now);
 assert.deepEqual(result.totals,{sprint:0,phrases:0,ai:0,cafe:0,savedSessions:0});
 assert.equal(result.weekly.activeDays,0);
 assert.equal(result.weekly.recordedSessions,0);
 assert.deepEqual(result.phrases,[]);
 assert.deepEqual(result.recentTeacher,[]);
 assert.deepEqual(result.recentSessions,[]);
 assert.equal(result.nextAction.href,"./reflex.html");
 assert.equal(result.weekly.days.length,7);
});
test("malformed histories and future activity cannot give bogus streak or AI grades",()=>{
 const result=buildLearningDashboard({
  "speakingym-reflex-stats-v1":{sessions:"not-a-number"},
  "speakingym-reflex-history-v1":[
   {date:"bad",attempts:[]},
   {date:"2031-12-09T00:00:00Z",attempts:[]},
   {date:"2026-10-15T03:30:00Z",level:"standard",attempts:[{outcome:"unanswered"}]}
  ],
  "speakingym-reflex-ai-teacher-v1":[{date:"2026-10-15",notes:[{feedback:{praise:null,improvement:null}}]}]
 },now);
 assert.equal(result.totals.sprint,0);
 assert.equal(result.weekly.activeDays,1);
 assert.equal(result.recentTeacher.length,0);
 assert.equal(result.recentSessions[0].spoke,0);
});
test("dashboard contains responsive sections, meaningful links, privacy accordion and accessible summaries",()=>{
 for(const id of [
  "sg-account-stats","sg-weekly-days","sg-weekly-active","sg-next-title","sg-next-description",
  "sg-next-action","sg-hero-action","sg-saved-list","sg-feedback-list","sg-session-list",
  "sg-session-total","greeting-name","sg-account-details"
 ]){
  assert.match(html,new RegExp('id="'+id+'"'),"Missing UI region "+id);
 }
 for(const dest of ["./reflex.html#phrases","./scenes.html","./mission.html","./home-preview.html"])
  assert.ok(html.includes(dest),"Missing working navigation "+dest);
 assert.match(html,/class="privacy-info"/);
 assert.match(html,/<details class="privacy-info">/);
 assert.match(html,/@media\(max-width:600px\)/);
 assert.match(html,/YOUR SPEAKING SPACE/);
 assert.match(html,/WEEKLY RHYTHM/);
 assert.match(sync,/buildLearningDashboard\(readSnapshot\(localStorage\)\)/);
 assert.match(sync,/textContent=displayName/);
 assert.doesNotMatch(html,/<script[^>]+src="https:\/\/[^"]+chart/i);
});
test("teacher feedback on account page comes from saved real AI results, not hardcoded sample praise",()=>{
 assert.match(sync,/view\.recentTeacher/);
 assert.match(sync,/feedback\.praise/);
 assert.match(sync,/feedback\.improvement/);
 assert.match(sync,/feedback\.rewrite/);
 assert.match(sync,/emptySection\(feedbackRoot,"まだAI先生の講評はありません/);
 assert.match(sync,/\.textContent=/);
 assert.match(sync,/node\("p",feedback\.praise\)/);
});
test("date rendering is friendly and handles invalid values",()=>{
 assert.equal(japaneseDate(new Date(2026,9,15)),"10/15");
 assert.equal(japaneseDate("invalid"),"日時不明");
});
