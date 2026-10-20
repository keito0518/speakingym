import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('scenes.html');
const worker=read('worker/ai-worker.js');
const scenes=vm.runInNewContext(html.slice(html.indexOf('const SCENES='),html.indexOf('function task(){'))+';SCENES');
const sceneNames=Object.keys(scenes);

test('all 16 roleplay scenes have three distinct missions and actionable English opening lines',()=>{
 assert.equal(sceneNames.length,16);
 const allIntros=[];
 for(const [id,scene] of Object.entries(scenes)){
  assert.match(scene.speaker,/\w+ · /,id+' speaker');
  const stories=new Set();
  for(const level of ['easy','standard','challenge']){
   const data=scene[level];
   assert.ok(data, id+'/'+level);
   assert.equal(data.goals.length,3,id+'/'+level+' goals');
   for(const [i,goal] of data.goals.entries())assert.ok(goal.trim().length>=3,id+'/'+level+'/'+i);
   assert.ok(data.story.length>=20,id+'/'+level+' scenario missing');
   assert.ok(data.mission.trim(),id+'/'+level+' mission missing');
   assert.ok(data.intro.trim().length>=15,id+'/'+level+' first line too short');
   assert.ok(data.intro.trim().length<=170,id+'/'+level+' first line too long');
   assert.doesNotMatch(data.intro,/[\u3040-\u30ff\u3400-\u9fff]/,id+'/'+level+' first line should be spoken English');
   assert.doesNotMatch(data.intro,/\b(?:lorem ipsum|TODO|placeholder)\b/i);
   assert.ok((data.intro.match(/\?/g)||[]).length<=1,id+'/'+level+' opening should ask at most one question');
   allIntros.push(data.intro);
   stories.add(data.story);
  }
  assert.equal(stories.size,3,id+' difficulty scenarios not distinct');
 }
 assert.equal(allIntros.length,48);
});

test('cafe standard starts BEFORE ordering: introduction, learner goal and backend scenario agree',()=>{
 const d=scenes.cafe.standard;
 assert.match(d.headline,/ミルクを変更して注文したい/);
 assert.match(d.story,/注文する前/);
 assert.match(d.mission,/飲み物を注文し/);
 assert.match(d.intro,/What would you like to order\?/);
 assert.match(d.goals[0],/飲み物を注文する/);
 assert.match(d.goals[1],/ミルクなどの変更/);
 assert.match(worker,/standard:\{situation:"The customer is ordering a drink and wants to replace regular milk/);
 assert.doesNotMatch(worker,/The customer wants to change the milk type after ordering/);
 assert.match(worker,/step1: the customer orders a drink/);
});

test('baggage and salon openings invite the learner to explain instead of presuming an answer',()=>{
 const bag=scenes.airport.standard;
 assert.match(bag.story,/スーツケースが見当たらない/);
 assert.match(bag.goals[0],/状況を説明する/);
 assert.match(bag.intro,/What happened at the carousel\?/);
 assert.doesNotMatch(bag.intro,/Have all the other bags come through/);
 const salon=scenes.phone.challenge;
 assert.match(salon.story,/cancellation fee/);
 assert.match(salon.mission,/Confirm the new time/);
 assert.match(salon.intro,/What would you like to change about this afternoon's appointment\?/);
 assert.match(salon.intro,/may involve a fee/);
});

test('scene material edits cannot alter free-plan quota, D1 schema or production billing guards',()=>{
 const client=html.slice(html.indexOf('const SCENES='),html.indexOf('function task(){'));
 assert.doesNotMatch(client,/stripe|\/checkout|GEMINI_API_KEY|CREATE TABLE|DELETE FROM|localStorage\.clear/i);
 // The existing authorization gate must still precede starting a new scene.
 const start=html.slice(html.indexOf('async function start(){'),html.indexOf('function errorMessage(',html.indexOf('async function start(){')));
 assert.match(start,/if\(!token\)/);
 assert.ok(start.indexOf('if(!token)')<start.indexOf('serverSessionId=""'));
});
