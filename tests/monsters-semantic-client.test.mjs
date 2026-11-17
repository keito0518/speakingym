import test from 'node:test';
import assert from 'node:assert/strict';
import {askSemanticGrader,STAGING_SEMANTIC_GRADER_ENDPOINT} from '../prototype/speakingym-monsters/semantic-client.js';

const prompt={id:'think-cafe'};
const endpoint='https://isolated-staging.example.test';
test('AI judging is opt-in off by default; does not make network requests',async()=>{
 assert.equal(STAGING_SEMANTIC_GRADER_ENDPOINT,'');
 let used=false;
 const res=await askSemanticGrader(prompt,'Let me think.',{request:()=>{used=true;throw Error('bad')}});
 assert.equal(res.state,'disabled');
 assert.equal(used,false);
});
test('staging semantic client requires a Firebase token and returns a sanitized verdict',async()=>{
 let used=false;
 const noToken=await askSemanticGrader(prompt,'Let me think.',{
  endpoint,getToken:async()=>null,request:async()=>{used=true;throw Error('should not request')}
 });
 assert.equal(noToken.state,'login_required');assert.equal(used,false);
 let auth,url,payload;
 const result=await askSemanticGrader(prompt,'Let me think.',{
  endpoint,getToken:async()=> 'valid_test_jwt',
  request:async (u,o)=>{
   url=u;auth=o.headers.Authorization;payload=JSON.parse(o.body);
   return new Response(JSON.stringify({results:[{promptId:prompt.id,verdict:'correct',feedback:'意味が伝わりました。',missing:[]}]}),{status:200});
  }
 });
 assert.equal(url,endpoint+'/grade');
 assert.equal(auth,'Bearer valid_test_jwt');
 assert.deepEqual(payload,{attempts:[{promptId:'think-cafe',answer:'Let me think.'}]});
 assert.equal(result.state,'correct');
});
test('staging semantic client fails safely on errors and ambiguous response payloads',async()=>{
 const shared={endpoint,getToken:async()=> 'token'};
 assert.equal((await askSemanticGrader(prompt,'',shared)).state,'unavailable');
 assert.equal((await askSemanticGrader(prompt,'Some words',{...shared,request:async()=>new Response('busy',{status:429})})).state,'rate_limited');
 assert.equal((await askSemanticGrader(prompt,'Some words',{...shared,request:async()=>new Response('{}',{status:200})})).state,'unavailable');
 assert.equal((await askSemanticGrader(prompt,'Some words',{...shared,request:async()=>{throw Error('offline')}})).state,'unavailable');
});
