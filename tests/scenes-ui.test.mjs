import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html=readFileSync(new URL("../scenes.html",import.meta.url),"utf8");
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test("multi-scene page has valid JavaScript",()=>{
 assert.ok(source,"scene application script");
 assert.doesNotThrow(()=>new vm.Script(source));
});

test("hotel, airport and small talk have distinct selectable cards",()=>{
 for(const id of ["hotel","airport","smalltalk"]){
  assert.match(html,new RegExp('data-scene="'+id+'"'));
  assert.match(source,new RegExp("\\b"+id+":\\{"));
 }
 assert.match(html,/id="setupGoals"/);
 assert.match(html,/id="progress"/);
});

test("new practice automatically uses public Worker endpoint without shipping API keys",()=>{
 assert.match(source,/const API="https:\/\/speakingym-survival-ai\./);
 assert.match(source,/sceneId,level:.*userText:text,history:history\.slice\(-10\),progress/);
 assert.doesNotMatch(html,/AIza[0-9A-Za-z_-]{20,}/);
});

test("free preview limits a session to eight user turns and shows errors",()=>{
 assert.match(source,/turn>=turnLimit\(\)/);
 assert.match(html,/id="errorReason"/);
 assert.match(html,/id="retry"/);
 assert.match(source,/if\(!response\.ok\)throw Error/);
});

test("audio recognition can be restarted and clears its previous transcript",()=>{
 assert.match(source,/stopRecognition\(\);\s*\$\("reply"\)\.value=""/);
 assert.match(html,/id="clear"/);
 assert.match(html,/id="mic"/);
 assert.match(html,/id="stopMic"/);
});

test("level picker contains readable scenario briefs, and challenge briefs are English",()=>{
 assert.match(source,/function renderAssignment\(/);
 assert.match(html,/id="setupAssignment"/);
 assert.match(html,/id="practiceAssignment"/);
 assert.match(html,/assignment-title\{font-size:clamp\(21px/);
 assert.match(source,/challenge:\s*\{/);
 assert.match(source,/function missionLanguage\(\)/);
 assert.match(source,/missionLanguage\(\)==="en"/);
 for(const text of ["Your prepaid room is unavailable","Your missing suitcase is now urgent","Can you defend your point of view?"])assert.ok(source.includes(text));
});

test("recognition keeps listening across pauses, preserves recognized text and supports resuming",()=>{
 assert.match(source,/rec\.continuous=true/);
 assert.match(source,/micBase=joinSpeech\(micBase,joinSpeech\(micCycleFinal,micCycleInterim\)\)/);
 assert.match(source,/micRestartTimer=setTimeout/);
 assert.match(source,/function resumeMicrophone\(\)/);
 assert.match(source,/function stopMicrophone\(\)/);
 assert.match(source,/pendingText\|\|micWanted/);
 assert.match(html,/id="resumeMic"/);
});
