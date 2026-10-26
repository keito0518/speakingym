import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildFreezeCoachingRequests,normalizeFreezeCoachResponse} from '../freeze-coach-data.mjs';

test('conversation recovery coaching stays within existing one-call teacher payload limits',()=>{
 const requests=buildFreezeCoachingRequests({scene:'カフェで予想外の注文',question:'What kind of milk would you like?',
  followup:'Sure, please take your time.',reason:'急に聞かれて驚いた',firstText:'Could I have soy milk?',retryText:'Thanks. Soy milk is fine.'});
 assert.equal(requests.length,2);
 assert.deepEqual(requests.map(x=>x.index),[0,1]);
 assert.equal(requests[0].text,'Could I have soy milk?');
 assert.match(requests[0].situation,/What kind of milk/);
 assert.match(requests[1].goal,/詰まった後/);
 assert.ok(requests.every(x=>x.text.length<=450&&x.situation.length<=270&&x.goal.length<=330));
});

test('only actual written answers are sent; imported AI utterances remain private',()=>{
 assert.deepEqual(buildFreezeCoachingRequests({imported:true,firstText:'private',retryText:'private'}),[]);
 const one=buildFreezeCoachingRequests({scene:'ホテル',question:'Hello?',firstText:'',retryText:'  Please wait.  '});
 assert.equal(one.length,1);
 assert.equal(one[0].index,0);
 assert.equal(one[0].text,'Please wait.');
 assert.equal(buildFreezeCoachingRequests({firstText:'x'.repeat(900)})[0].text.length,400);
 assert.deepEqual(buildFreezeCoachingRequests({firstText:42,retryText:null}),[]);
 const source=readFileSync(new URL('../freeze-coach-data.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/fetch\s*\(|localStorage|sessionStorage|GEMINI_API_KEY|Authorization/);
});

test('malformed or synthetic coaching is rejected before it reaches the learner',()=>{
 const good=(index)=>({index,praise:'具体的で伝わります',improvement:'語順を直そう',
  improved:'Could you say that again?',why:'丁寧な依頼です',practice:'Ask again politely.'});
 assert.deepEqual(normalizeFreezeCoachResponse([good(0)],1)?.map(x=>x.improved),['Could you say that again?']);
 for(const bad of [null,[],[good(1)],[{...good(0),why:''}],[good(0),good(0)]]){
  assert.equal(normalizeFreezeCoachResponse(bad,1),null);
 }
 assert.equal(normalizeFreezeCoachResponse([good(0)],3),null);
});
