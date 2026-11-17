import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMonstersSemantic,validateSemanticBatch,validateSemanticOutput} from './monsters-semantic-worker.js';

const origin='https://monsters-staging.example.test';
const buildEnv=()=>({
 MONSTERS_ALLOWED_ORIGIN:origin,
 MONSTERS_STAGING_ONLY:'true',
 MONSTERS_AI_ENABLED:'true',
 GEMINI_API_KEY:'test_key_in_memory_only',
 MONSTERS_USER_LIMIT:{limit:async()=>({success:true})},
 MONSTERS_GLOBAL_LIMIT:{limit:async()=>({success:true})},
 MONSTERS_GRADER_DB:{prepare:()=>({bind:()=>({first:async()=>({used:1})})})}
});
const request=(attempts,method='POST')=>new Request('https://grader.example.test/grade',{method,headers:{
 Origin:origin,'Content-Type':'application/json','Authorization':'Bearer test_fake_token'
},...(method==='POST'?{body:JSON.stringify({attempts})}:{})});
const attempts=[{promptId:'late-bus-hard',answer:'Sorry, my bus was canceled. I will be 20 minutes late. Please wait inside.'}];
const mocks={
 verifyUser:async()=> 'test-uid',
 modelFetch:async(_url,options)=>{
  const source=JSON.parse(JSON.parse(options.body).contents[0].parts[0].text).attempts;
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({results:source.map(a=>({
   promptId:a.promptId,verdict:'correct',feedback:'必要な内容が伝わりました。',missing:[]
  }))})}]}}]}),{status:200});
 }
};
test('validates known curated prompts; rejects untrusted question text, duplicates and oversized answers',()=>{
 assert.equal(validateSemanticBatch({attempts})?.length,1);
 assert.equal(validateSemanticBatch({attempts:[...attempts,...attempts]}),null);
 assert.equal(validateSemanticBatch({attempts:[{promptId:'unknown',answer:'Let me think.'}]}),null);
 assert.equal(validateSemanticBatch({attempts:[{promptId:'late-bus-hard',answer:' '}]}),null);
 assert.equal(validateSemanticBatch({attempts:[{promptId:'late-bus-hard',answer:'a'.repeat(501)}]}),null);
 assert.equal(validateSemanticBatch({attempts:Array(7).fill(attempts[0])}),null);
 assert.equal(validateSemanticOutput({results:[{promptId:'late-bus-hard',verdict:'correct',feedback:'ok'}]},validateSemanticBatch({attempts}))?.[0].verdict,'correct');
 assert.equal(validateSemanticOutput({results:[{promptId:'late-bus-hard',verdict:'pass',feedback:'ok'}]},validateSemanticBatch({attempts})),null);
});

test('fails closed without staging opt-in, exact origin, Firebase auth, quota or rate-limit binding',async()=>{
 const e=buildEnv(),call={...mocks};
 let providers=0;
 call.modelFetch=async()=>{providers++;return new Response('should not call')};
 const badOrigin=new Request('https://grader.example.test/grade',{method:'POST',headers:{Origin:'https://evil.example'},body:JSON.stringify({attempts})});
 assert.equal((await handleMonstersSemantic(badOrigin,e,call)).status,403);
 assert.equal((await handleMonstersSemantic(request(attempts),{...e,MONSTERS_STAGING_ONLY:'false'},call)).status,503);
 assert.equal((await handleMonstersSemantic(request(attempts),{...e,MONSTERS_GRADER_DB:null},call)).status,503);
 assert.equal((await handleMonstersSemantic(request(attempts),{...e,MONSTERS_USER_LIMIT:null},call)).status,503);
 assert.equal((await handleMonstersSemantic(request(attempts),e,{...call,verifyUser:async()=>{throw Error('invalid')}})).status,401);
 const quotaExhausted={...e,MONSTERS_GRADER_DB:{prepare:()=>({bind:()=>({first:async()=>null})})}};
 assert.equal((await handleMonstersSemantic(request(attempts),quotaExhausted,call)).status,429);
 const brokenQuota={...e,MONSTERS_GRADER_DB:{prepare:()=>{throw Error('no schema')}}};
 assert.equal((await handleMonstersSemantic(request(attempts),brokenQuota,call)).status,503);
 assert.equal((await handleMonstersSemantic(request(attempts),{...e,MONSTERS_USER_LIMIT:{limit:async()=>({success:false})}},call)).status,429);
 assert.equal((await handleMonstersSemantic(request([{promptId:'unknown',answer:'OK now'}]),e,call)).status,400);
 assert.equal(providers,0);
});
test('only a valid authorized quota-controlled request sends one batched provider request',async()=>{
 let count=0,seen;
 const call={...mocks,modelFetch:async(url,opts)=>{count++;seen={url,opts};return mocks.modelFetch(url,opts)}};
 const response=await handleMonstersSemantic(request(attempts),buildEnv(),call);
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.results[0].verdict,'correct');
 assert.equal(data.grader,'semantic-beta');
 assert.equal(count,1);
 assert.ok(seen.url.startsWith('https://generativelanguage.googleapis.com/'));
 assert.ok(seen.opts.signal);
 assert.equal(JSON.parse(seen.opts.body).contents[0].parts[0].text.includes('late-bus-hard'),true);
});
test('malformed provider output never earns a successful verdict',async()=>{
 const broken={...mocks,modelFetch:async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'not json'}]}}]}),{status:200})};
 const r=await handleMonstersSemantic(request(attempts),buildEnv(),broken);
 assert.equal(r.status,502);
 assert.equal((await r.json()).error,'invalid_provider_json');
 const limited={...mocks,modelFetch:async()=>new Response('busy',{status:429})};
 assert.equal((await handleMonstersSemantic(request(attempts),buildEnv(),limited)).status,429);
});
