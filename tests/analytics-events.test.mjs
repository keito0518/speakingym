import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const adapter=source('analytics-events.js');
function load(gtag){
  const window={};
  if(gtag!==undefined){window.gtag=gtag;window.SPEAKINGYM_GA4_READY=true;}
  vm.runInNewContext(adapter,{window});
  return window;
}
test('no analytics integration means no transmission, no cookies, no local storage',()=>{
 const win=load();
 assert.equal(win.speakingymAnalytics.track('sg_sprint_start',{mode:'standard'}),false);
 assert.equal(win.speakingymAnalytics.track('sg_ai_first_reply'),false);
 assert.equal(Object.isFrozen(win.speakingymAnalytics),true);
 assert.doesNotMatch(adapter,/fetch\s*\(|sendBeacon|XMLHttpRequest|localStorage|document\.cookie/);
});
test('only approved events and enum parameters can reach gtag; arbitrary PII is discarded',()=>{
 const calls=[];
 const win=load((...args)=>calls.push(args));
 assert.equal(win.speakingymAnalytics.track('login',{email:'x@example.com'}),false);
 assert.equal(win.speakingymAnalytics.track('sg_home_cta',{destination:'sprint',email:'x@example.com',user_id:'uid123',token:'secret',url:'?ref=personal'}),true);
 assert.equal(win.speakingymAnalytics.track('sg_sprint_start',{mode:'custom speech',transcript:'my secret'}),true);
 assert.equal(win.speakingymAnalytics.track('sg_sprint_complete',{result:'timer'}),true);
 assert.equal(win.speakingymAnalytics.track('sg_ai_scene_start',{scene:'cafe',prompt:'secret'}),true);
 assert.equal(win.speakingymAnalytics.track('sg_ai_first_reply',{response:'private'}),true);
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[
  ['event','sg_home_cta',{destination:'sprint'}],
  ['event','sg_sprint_start',{}],
  ['event','sg_sprint_complete',{result:'timer'}],
  ['event','sg_ai_scene_start',{}],
  ['event','sg_ai_first_reply',{}]
 ]);
});
test('foreign analytics tags never receive speakingym events without explicit site activation',()=>{
 const window={gtag(){throw Error('unexpected vendor')},SPEAKINGYM_GA4_READY:false};
 vm.runInNewContext(adapter,{window});
 assert.equal(window.speakingymAnalytics.track('sg_sprint_start',{mode:'standard'}),false);
});
test('gtag failure cannot interrupt practice',()=>{
 const win=load(()=>{throw Error('analytics unavailable')});
 assert.equal(win.speakingymAnalytics.track('sg_sprint_start',{mode:'standard'}),false);
});
test('events are wired to actual learning milestones, not merely page views',()=>{
 const home=source('index.html'),sprint=source('reflex.html'),ai=source('scenes.html');
 for(const html of [home,sprint,ai]){
  assert.match(html,/<script src="\.\/analytics-events\.js"><\/script>/);
 }
 assert.match(home,/data-sg-cta="sprint"/);
 assert.match(home,/data-sg-cta="ai"/);
 assert.match(home,/track\("sg_home_cta"/);
 assert.match(sprint,/track\("sg_sprint_start"/);
 assert.match(sprint,/track\("sg_sprint_complete"/);
 assert.match(ai,/track\("sg_ai_scene_start"/);
 assert.match(ai,/if\(turn===1\)window\.speakingymAnalytics\?\.track\("sg_ai_first_reply"\)/);
 assert.ok(ai.indexOf('if(turn===1)window.speakingymAnalytics')>ai.indexOf('if(!running||requestToken!==runToken)return;',ai.indexOf('async function answer(')));
});
