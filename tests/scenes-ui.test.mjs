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
  assert.match(source,new RegExp("\\b"+id+":\\{name:"));
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
 assert.match(source,/turn>=8/);
 assert.match(html,/id="errorReason"/);
 assert.match(html,/id="retry"/);
 assert.match(source,/if\(!response\.ok\)throw Error/);
});

test("audio recognition can be restarted and clears its previous transcript",()=>{
 assert.match(source,/stopRecognition\(\);\$\("reply"\)\.value=""/);
 assert.match(html,/id="clear"/);
 assert.match(html,/id="mic"/);
 assert.match(html,/id="stopMic"/);
});
