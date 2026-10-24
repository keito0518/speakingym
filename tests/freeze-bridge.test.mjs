import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../freeze-bridge.js',import.meta.url),'utf8');
const OWNER='speakingym-account-owner-v1';
const SOURCE='speakingym-freeze-chat-handoff-v1';
const RETURN='speakingym-freeze-return-v1';
function fixture(uid='learner-A'){
 const sessions=new Map(),local=new Map([[OWNER,uid]]);
 const store=data=>({
  getItem:key=>data.get(key)??null,setItem:(key,val)=>data.set(key,String(val)),
  removeItem:key=>data.delete(key)
 });
 const state={uid,loggedIn:true};
 const window={sessionStorage:store(sessions),localStorage:store(local),
  speakingymAccount:{getUid:()=>state.uid,isLoggedIn:()=>state.loggedIn}};
 vm.runInNewContext(script,{window,Date},{timeout:1000});
 return {bridge:window.speakingymFreezeBridge,state,sessions,local};
}
const input={sceneId:'cafe',level:'challenge',
 question:'Sorry, there is no oat milk. Would soy milk work?'};
test('explicit handoff carries only last AI utterance and owner-scoped scene/level once',()=>{
 const f=fixture();
 assert.equal(f.bridge.stageChallenge(input),true);
 const str=f.sessions.get(SOURCE);
 assert.ok(str.includes(input.question));
 assert.doesNotMatch(str,/accessToken|firebaseToken|learnerAnswer|history|email/);
 const cue=f.bridge.consumeChallenge();
 assert.equal(cue.sceneId,'cafe');assert.equal(cue.level,'challenge');
 assert.equal(cue.question,input.question);
 assert.equal(f.sessions.has(SOURCE),false);
 assert.equal(f.bridge.consumeChallenge(),null);
});
test('account switching cannot reveal an earlier learner’s transferred AI question',()=>{
 const f=fixture();
 assert.equal(f.bridge.stageChallenge(input),true);
 f.state.uid='learner-B';f.local.set(OWNER,'learner-B');
 assert.equal(f.bridge.consumeChallenge(),null);
 assert.equal(f.sessions.has(SOURCE),false);
 f.state.uid='learner-A';f.local.set(OWNER,'learner-A');
 assert.equal(f.bridge.consumeChallenge(),null);
});
test('uninitialized auth leaves pending cue concealed until rightful account is ready',()=>{
 const f=fixture();
 f.bridge.stageChallenge(input);
 f.state.loggedIn=false;
 assert.equal(f.bridge.consumeChallenge(),null);
 assert.equal(f.sessions.has(SOURCE),true);
 f.state.loggedIn=true;
 assert.equal(f.bridge.consumeChallenge().question,input.question);
});
test('expired, malformed or unauthorized cues fail closed',()=>{
 const f=fixture();
 assert.equal(f.bridge.stageChallenge({sceneId:'fake',level:'easy',question:'Test?'}),false);
 assert.equal(f.bridge.stageChallenge({sceneId:'cafe',level:'easy',question:'<b>unsafe</b>'}),false);
 assert.equal(f.bridge.stageChallenge({sceneId:'cafe',level:'easy',question:'x'.repeat(451)}),false);
 assert.equal(f.sessions.has(SOURCE),false);
 f.bridge.stageChallenge(input);
 const expired=JSON.parse(f.sessions.get(SOURCE));
 expired.createdAt=Date.now()-11*60*1000;
 f.sessions.set(SOURCE,JSON.stringify(expired));
 assert.equal(f.bridge.consumeChallenge(),null);
 assert.equal(f.sessions.has(SOURCE),false);
});
test('return handoff contains no AI question or learner transcript',()=>{
 const f=fixture();
 assert.equal(f.bridge.stageReturn({sceneId:'cafe',level:'standard',reason:'words',
  userText:'NEVER STORE THIS',question:input.question}),true);
 const raw=f.sessions.get(RETURN);
 assert.doesNotMatch(raw,/NEVER STORE THIS|oat milk|userText|question|history/);
 const back=f.bridge.consumeReturn();
 assert.equal(back.sceneId,'cafe');assert.equal(back.level,'standard');
 assert.equal(back.reason,'words');
 assert.equal(f.sessions.has(RETURN),false);
 assert.equal(f.bridge.consumeReturn(),null);
});
test('all 16 original roleplay scenes can return; unrelated scenes map to generic gym',()=>{
 const f=fixture();
 for(const sceneId of ['hotel','airport','smalltalk','cafe','restaurant','shopping','train',
  'directions','taxi','phone','tourism','pharmacy','work','introductions','plans','help']){
  assert.equal(f.bridge.stageChallenge({...input,sceneId}),true);
  assert.equal(f.bridge.consumeChallenge().sceneId,sceneId);
  assert.ok(f.bridge.freezeScene(sceneId));
 }
 assert.equal(f.bridge.freezeScene('taxi'),'anywhere');
 assert.equal(f.bridge.freezeScene('cafe'),'cafe');
});
test('owner mismatch or guest session cannot stage consented transfer',()=>{
 const f=fixture();
 f.local.set(OWNER,'learner-B');
 assert.equal(f.bridge.stageChallenge(input),false);
 assert.equal(f.bridge.stageReturn({sceneId:'cafe',level:'easy',reason:'surprise'}),false);
 f.local.delete(OWNER);
 f.state.loggedIn=false;
 assert.equal(f.bridge.stageChallenge(input),false);
 f.bridge.clear();
 assert.equal(f.sessions.size,0);
});
