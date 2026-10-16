import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../mission.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test("browser application script parses", () => {
 assert.ok(script, "An inline application script exists");
 assert.doesNotThrow(() => new vm.Script(script));
});

test("AI failure does not silently answer with repetitive static lines", () => {
 assert.match(script, /function showAiFailure\(/);
 assert.match(script, /aiFailureText=text;busy=false;sync\(\);showAiFailure\(\)/);
 assert.doesNotMatch(script, /if\(!result\)\s*\{[^}]*result\s*=\s*resolveLocal\(text\)/);
 assert.match(html, /id="retryAiBtn"/);
 assert.match(html, /id="manualModeBtn"/);
 assert.match(script, /manualMode\|\|!endpoint\?resolveLocal\(text\):await fromAI/);
});

test("AI errors pause the mission and can be retried without duplicating user text", () => {
 assert.match(script, /function tick\(\)\{if\(!running\|\|ended\|\|aiPaused\)return/);
 assert.match(script, /await finishCurrentTurn\(aiFailureText,turn,runId\)/);
 assert.match(script, /\$\('sendBtn'\)\.disabled=.*aiPaused/);
});

test("cafe mission displays Gemini coaching only after completed run, without another API call",()=>{
 assert.match(html,/id="missionCoachReport"/);
 assert.match(script,/function drawMissionCoaching\(/);
 assert.match(script,/missionCoaching\.push\(item\)/);
 assert.match(script,/drawMissionCoaching\(\)/);
 assert.match(script,/result\.coaching&&typeof result\.coaching==='object'/);
 assert.equal((script.match(/await fetch\(/g)||[]).length,3,"One optional plan status request, one session start, one AI request per turn");
});
