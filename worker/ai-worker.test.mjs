import test from "node:test";
import assert from "node:assert/strict";
import worker from "./ai-worker.js";

const ORIGIN = "https://speakingym.pages.dev";
const LEGACY_ORIGIN = "https://keito0518.github.io";
const ENDPOINT = "https://speakingym-test.workers.dev/";
const goodLimit = { limit: async () => ({ success: true }) };
const enabled = () => ({
  GEMINI_API_KEY: "test-key-not-real",
  ALLOW_AI: "true",
  USER_LIMIT: goodLimit,
  GLOBAL_LIMIT: goodLimit
});
const payload = {
  level: "standard",
  userText: "Excuse me, I ordered an iced oat latte. Could you remake it?",
  facts: { problem: false, iced: false, oat: false, fix: false },
  history: [{ role: "assistant", content: "Is everything okay?" }]
};
const request = (data = payload, origin = ORIGIN) =>
  new Request(ENDPOINT, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

test("health only indicates ready with key AND owner opt-in", async () => {
  const req = new Request(ENDPOINT + "health", { method: "GET" });
  const disabledResult = await worker.fetch(req, { ...enabled(), ALLOW_AI: "false" });
  const disabled = await disabledResult.json();
  assert.equal(disabled.aiConfigured, false);
  assert.equal(disabled.aiEnabled, false);
  assert.equal(disabled.keyConfigured, true);
  const readyResult = await worker.fetch(req, enabled());
  const ready = await readyResult.json();
  assert.equal(ready.aiConfigured, true);
  assert.equal(ready.aiEnabled, true);
  assert.equal(ready.keyConfigured, true);
  assert.deepEqual(ready.sceneIds,["hotel","airport","smalltalk"]);
  assert.equal(ready.reflexCoachSupported,true);
});

test("missing Gemini secret has a distinct error code, not a generic AI shutdown", async () => {
 const response = await worker.fetch(request(), {...enabled(), GEMINI_API_KEY: undefined});
 assert.equal(response.status, 503);
 assert.equal((await response.json()).error, "ai_key_missing");
});

test("Gemini remains disabled by default even when API key exists", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Should never contact Gemini");
  });
  const result = await worker.fetch(request(), { ...enabled(), ALLOW_AI: undefined });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, "ai_disabled");
  assert.equal(upstream.mock.callCount(), 0);
});

test("new Pages and old GitHub pages origins have CORS access", async () => {
  for (const origin of [ORIGIN, LEGACY_ORIGIN]) {
    const request = new Request(ENDPOINT, {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "POST" }
    });
    const result = await worker.fetch(request, enabled());
    assert.equal(result.status, 204);
    assert.equal(result.headers.get("Access-Control-Allow-Origin"), origin);
  }
});

test("requests from other web origins are rejected", async () => {
  const result = await worker.fetch(request(payload, "https://attacker.example"), enabled());
  assert.equal(result.status, 403);
});

test("invalid or oversized user speech cannot use the AI", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Should never contact Gemini");
  });
  const empty = await worker.fetch(request({ ...payload, userText: " " }), enabled());
  assert.equal(empty.status, 400);
  const large = await worker.fetch(request({ ...payload, userText: "a".repeat(451) }), enabled());
  assert.equal(large.status, 400);
  assert.equal(upstream.mock.callCount(), 0);
});

test("throttled requests never call Gemini", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Should never contact Gemini");
  });
  const result = await worker.fetch(request(), {
    ...enabled(), USER_LIMIT: { limit: async () => ({ success: false }) }
  });
  assert.equal(result.status, 429);
  assert.equal((await result.json()).error, "rate_limited");
  assert.equal(upstream.mock.callCount(), 0);
});

test("free-tier quota exhaustion pauses AI without retries", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => new Response(
    JSON.stringify({ error: { message: "Resource exhausted" } }),
    { status: 429, headers: { "Content-Type": "application/json" } }
  ));
  const result = await worker.fetch(request(), enabled());
  assert.equal(result.status, 429);
  assert.equal((await result.json()).error, "gemini_quota");
  assert.equal(upstream.mock.callCount(), 1);
});

test("successful Gemini JSON response returns conversational reply and facts", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{
      text: JSON.stringify({
        reply: "Of course! Let me make you the correct iced oat latte.",
        missionState: { problem: true, iced: true, oat: true, fix: true }
      })
    }] } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  ));
  const result = await worker.fetch(request(), enabled());
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.match(body.reply, /iced oat latte/);
  assert.deepEqual(body.missionState, { problem: true, iced: true, oat: true, fix: true });
  const opts = upstream.mock.calls[0].arguments[1];
  assert.equal(opts.headers["x-goog-api-key"], "test-key-not-real");
  assert.match(opts.body, /You are Emma/);
  assert.match(opts.body, /"maxOutputTokens":1100/);
  assert.match(opts.body, /"thinkingLevel":"minimal"/);
});

test("Gemini API errors are classified without leaking upstream text", async (t) => {
 for (const [status, expected] of [[400,"gemini_http_400"],[401,"gemini_auth"],[403,"gemini_auth"],[404,"gemini_model"],[503,"gemini_http_503"]]) {
  const mock = t.mock.method(globalThis,"fetch",async ()=>new Response(JSON.stringify({
   error:{message:"Private Gemini key must not be sent back"}
  }),{status,headers:{"content-type":"application/json"}}));
  const response = await worker.fetch(request(),enabled());
  const body = await response.json();
  assert.equal(body.error,expected);
  assert.equal(JSON.stringify(body).includes("Private Gemini key"),false);
  mock.mock.restore();
 }
});

test("three approved AI scenes use distinct characters and return their own progress", async (t) => {
 const cases = [
  ["hotel","Sophie","check in"],
  ["airport","Jordan","suitcase"],
  ["smalltalk","Mia","language exchange"]
 ];
 const prompts = [];
 const mock = t.mock.method(globalThis,"fetch",async (_url,opts)=>{
  const body=JSON.parse(opts.body);
  prompts.push(body.systemInstruction.parts[0].text);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{
   text:JSON.stringify({reply:"That makes sense. What would you like to do next?",progress:{step1:true,step2:false,step3:true}})
  }]}}]}),{status:200,headers:{"content-type":"application/json"}});
 });
 for(const [sceneId,character,subject] of cases){
  const response=await worker.fetch(request({...payload,sceneId,progress:{step1:false,step2:false,step3:false}}),enabled());
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.sceneId,sceneId);
  assert.deepEqual(data.progress,{step1:true,step2:false,step3:true});
  assert.ok(data.reply.length>0);
  assert.match(prompts.at(-1),new RegExp(character,"i"));
  assert.match(prompts.at(-1),new RegExp(subject,"i"));
 }
 assert.equal(mock.mock.callCount(),3);
});

test("previously completed goals persist even if Gemini forgets them",async t=>{
 t.mock.method(globalThis,"fetch",async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{
  text:JSON.stringify({reply:"Welcome! Do you have a reservation?",progress:{step1:false,step2:false,step3:false}})
 }]}}]}),{status:200}));
 const response=await worker.fetch(request({...payload,sceneId:"hotel",progress:{step1:true,step2:false,step3:true}}),enabled());
 assert.deepEqual((await response.json()).progress,{step1:true,step2:false,step3:true});
});

test("unknown scene identifiers cannot send requests to Gemini",async t=>{
 const mock=t.mock.method(globalThis,"fetch",async()=>{throw Error("should not call Gemini")});
 for(const sceneId of ["freeform","__proto__","constructor", "hotel-wrong"]){
  const response=await worker.fetch(request({...payload,sceneId}),enabled());
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,"unknown_scene");
 }
 assert.equal(mock.mock.callCount(),0);
});

test("old cafe clients receive the original missionState response schema",async t=>{
 t.mock.method(globalThis,"fetch",async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{
  text:JSON.stringify({reply:"I am sorry. Let me replace it.",missionState:{problem:true,iced:true,oat:true,fix:true}})
 }]}}]}),{status:200}));
 const response=await worker.fetch(request(),enabled());
 const body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.missionState.problem,true);
 assert.equal(body.progress,undefined);
 assert.equal(body.sceneId,undefined);
});

test("difficulty changes the actual scenario, objections, and goal criteria sent to Gemini",async t=>{
 const systems=[];
 const mock=t.mock.method(globalThis,"fetch",async (_url,options)=>{
  const body=JSON.parse(options.body);
  systems.push(body.systemInstruction.parts[0].text);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{
   text:JSON.stringify({reply:"Let's discuss that in more detail.",progress:{step1:false,step2:false,step3:false}})
  }]}}]}),{status:200});
 });
 const cases=[
  ["hotel","standard","two hours early","ready"],
  ["hotel","challenge","ocean-view","compensation"],
  ["airport","standard","two distinct identifying features","delivery"],
  ["airport","challenge","essential work equipment","deadline"],
  ["smalltalk","standard","common interests","reasoned preference"],
  ["smalltalk","challenge","remote vs office work","counterarguments"]
 ];
 for(const [sceneId,level,scenarioTerm,goalTerm] of cases){
  const response=await worker.fetch(request({...payload,sceneId,level}),enabled());
  assert.equal(response.status,200,sceneId+" "+level);
  const prompt=systems.at(-1);
  assert.ok(prompt.includes(scenarioTerm),sceneId+" "+level+" needs new complication: "+scenarioTerm);
  assert.ok(prompt.includes(goalTerm),sceneId+" "+level+" needs stricter goal: "+goalTerm);
 }
 assert.equal(mock.mock.callCount(),6);
});

test("easy level still retains accessible core tasks",async t=>{
 const prompts=[];
 t.mock.method(globalThis,"fetch",async (_url,options)=>{
  const body=JSON.parse(options.body);prompts.push(body.systemInstruction.parts[0].text);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{
   text:JSON.stringify({reply:"Certainly, I can help.",progress:{step1:false,step2:false,step3:false}})
  }]}}]}),{status:200});
 });
 const response=await worker.fetch(request({...payload,sceneId:"hotel",level:"easy"}),enabled());
 assert.equal(response.status,200);
 assert.match(prompts[0],/front desk/);
 assert.match(prompts[0],/booking name/i);
 assert.doesNotMatch(prompts[0],/prepaid ocean-view booking discrepancy/);
});

test("coaching is supplied within the SAME Gemini request as a normal scene reply", async t=>{
 const upstream=t.mock.method(globalThis,"fetch",async (_url,request)=>{
  const data=JSON.parse(request.body);
  assert.match(data.systemInstruction.parts[0].text,/latest English user utterance/);
  assert.match(data.systemInstruction.parts[0].text,/NEVER evaluate actual pronunciation/);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({
   reply:"I see, let me look into that.",
   progress:{step1:true,step2:false,step3:false},
   coaching:{natural:"Would it be possible to check in early?",tip:"丁寧な疑問文でお願いしよう。",praise:"早くチェックインしたい意図が伝わる英語でした。"}
  })}]}}]}),{status:200});
 });
 const result=await worker.fetch(request({...payload,sceneId:"hotel",userText:"Can I check in early?"}),enabled());
 assert.equal(result.status,200);
 const json=await result.json();
 assert.equal(json.coaching.natural,"Would it be possible to check in early?");
 assert.match(json.coaching.tip,/丁寧/);
 assert.equal(upstream.mock.callCount(),1,"extra coaching endpoint must not call Gemini a second time");
});

test("cafe feedback is optional and never breaks existing clients",async t=>{
 const upstream=t.mock.method(globalThis,"fetch",async ()=>new Response(JSON.stringify({
  candidates:[{content:{parts:[{text:JSON.stringify({
   reply:"Let me fix the coffee.",
   missionState:{problem:true,iced:true,oat:true,fix:true}
  })}]}}]
 }),{status:200}));
 const response=await worker.fetch(request(),enabled());
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.missionState.fix,true);
 assert.deepEqual(data.coaching,{natural:"",tip:"",praise:""});
 assert.equal(upstream.mock.callCount(),1);
});

test("coaching output is length-limited and untrusted values cannot break the reply",async t=>{
 t.mock.method(globalThis,"fetch",async ()=>new Response(JSON.stringify({
  candidates:[{content:{parts:[{text:JSON.stringify({
   reply:"Certainly!",progress:{step1:false,step2:false,step3:false},
   coaching:{natural:"a".repeat(1000),tip:999,praise:{danger:"not a string"}}
  })}]}}]
 }),{status:200}));
 const response=await worker.fetch(request({...payload,sceneId:"smalltalk"}),enabled());
 const body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.coaching.natural.length,260);
 assert.equal(body.coaching.tip,"");
 assert.equal(body.coaching.praise,"");
});

test("opt-in reflex tutor batches learner answers in one Gemini call with contextual teacher feedback",async t=>{
 const upstream=t.mock.method(globalThis,"fetch",async (_url,options)=>{
  const prompt=JSON.parse(options.body);
  assert.match(prompt.systemInstruction.parts[0].text,/experienced English conversation coach/);
  assert.match(prompt.systemInstruction.parts[0].text,/do not evaluate actual pronunciation/i);
  const context=JSON.parse(prompt.contents[0].parts[0].text);
  assert.equal(context.attempts.length,2);
  assert.equal(context.level,"challenge");
  assert.equal(context.attempts[0].text,"I want my money back");
  return new Response(JSON.stringify({candidates:[{content:{parts:[{
   text:JSON.stringify({feedback:[
    {index:0,praise:"返金したいという意図が明確に伝わります。",improvement:"丁寧な依頼の形にすると自然です。",improved:"Could I request a refund, please?",why:"request a refund は店舗やホテルでよく使う表現。Could I... で柔らかく聞けます。",practice:"Ask for a refund while explaining a reason."},
    {index:1,praise:"理由を示す構文が使えています。",improvement:"前置きをより明確にしましょう。",improved:"I understand your point, but I'd suggest a different approach.",why:"I understand your point で相手の意見を認めてから反論できます。",practice:"Disagree politely about a plan."}
   ]})
  }]}}]}),{status:200});
 });
 const response=await worker.fetch(request({action:"reflex_coach",level:"challenge",attempts:[
  {index:0,text:"I want my money back",situation:"The hotel room is not available",goal:"Negotiate a refund"},
  {index:1,text:"I disagree because of cost",situation:"Two colleagues disagree",goal:"Disagree with a reason"}
 ]}),enabled());
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.feedback.length,2);
 assert.match(result.feedback[0].improved,/Could I request/);
 assert.match(result.feedback[1].praise,/理由/);
 assert.equal(upstream.mock.callCount(),1);
});
test("reflex tutor refuses empty, overlong, and excessive prompts before calling Gemini",async t=>{
 const gemini=t.mock.method(globalThis,"fetch",async()=>{throw Error("No upstream should be called")});
 const valid={index:0,text:"I would like a refund",situation:"Hotel room issue",goal:"Ask for a refund"};
 const bad=[
  [],Array.from({length:6},(_,i)=>({...valid,index:i})),
  [{...valid,text:" "}],
  [{...valid,text:"A".repeat(451)}],
  [{...valid,situation:"A".repeat(271)}],
  [{...valid,goal:"A".repeat(331)}],
  [{...valid,index:7}]
 ];
 for(const attempts of bad){
  const result=await worker.fetch(request({action:"reflex_coach",level:"standard",attempts}),enabled());
  assert.equal(result.status,400);
  assert.equal((await result.json()).error,"invalid_coaching_input");
 }
 assert.equal(gemini.mock.callCount(),0);
});
test("reflex tutor remains disabled when owner has not enabled Gemini",async t=>{
 const gemini=t.mock.method(globalThis,"fetch",async()=>{throw Error("No upstream allowed")});
 const body={action:"reflex_coach",level:"easy",attempts:[{index:0,text:"Please slow down",situation:"Fast speaker",goal:"Ask to slow down"}]};
 const result=await worker.fetch(request(body),{...enabled(),ALLOW_AI:"false"});
 assert.equal(result.status,503);
 assert.equal((await result.json()).error,"ai_disabled");
 assert.equal(gemini.mock.callCount(),0);
});
test("invalid teacher responses are rejected and never manufactured locally",async t=>{
 t.mock.method(globalThis,"fetch",async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{
  text:JSON.stringify({feedback:[{index:0,praise:"Generic praise"}]})
 }]}}]}),{status:200}));
 const result=await worker.fetch(request({action:"reflex_coach",level:"easy",attempts:[
  {index:0,text:"Could you repeat it?",situation:"Didn't hear",goal:"Ask to repeat"}
 ]}),enabled());
 assert.equal(result.status,502);
 assert.equal((await result.json()).error,"invalid_ai_response");
});
