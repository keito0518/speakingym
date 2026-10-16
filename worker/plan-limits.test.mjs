import test from "node:test";
import assert from "node:assert/strict";
import worker from "./ai-worker.js";
import {verifyFirebaseIdToken,PLAN_LIMITS,tokyoDay,tokyoMonthBounds} from "./plan-limits.js";

const ORIGIN="https://speakingym.pages.dev";
const API="https://speakingym-worker-test.example/";
const limit={limit:async()=>({success:true})};
function env(PLAN_DB){return{ENFORCE_PLANS:"true",PLAN_DB,ALLOW_AI:"true",GEMINI_API_KEY:"unit-test-not-real",USER_LIMIT:limit,GLOBAL_LIMIT:limit}}
function fakeD1(){
 const sessions=[],teachers=[],plans=new Map();
 return {plans,sessions,teachers,prepare(sql){
  return {bind(...args){
   return {
    async first(){
     if(sql.startsWith("SELECT tier"))return plans.has(args[0])?{tier:plans.get(args[0])}:null;
     if(sql.startsWith("SELECT (SELECT COUNT"))return{sessions:sessions.filter(x=>x.uid===args[0]&&x.day===args[1]).length,teacher:teachers.filter(x=>x.uid===args[2]&&x.day===args[3]).length};
     if(sql.startsWith("SELECT (SELECT COALESCE"))return {
      monthlyTurns:sessions.filter(x=>x.uid===args[0]&&x.day>=args[1]&&x.day<args[2]).reduce((n,x)=>n+x.turns,0),
      monthlyTeacher:teachers.filter(x=>x.uid===args[3]&&x.day>=args[4]&&x.day<args[5]).length
     };
     if(sql.startsWith("INSERT INTO ai_sessions")){
      const [id,uid,day,started,expires]=args;
      if(!sql.includes(" VALUES ")){
       if(args.length===9){
        const [, , , , ,checkUid,from,to,max]=args;
        const total=sessions.filter(x=>x.uid===checkUid&&x.day>=from&&x.day<to).reduce((n,x)=>n+x.turns,0);
        if(total>=max)return null;
       }else{
        const checkUid=args[5],checkDay=args[6],max=args[7];
        if(sessions.filter(x=>x.uid===checkUid&&x.day===checkDay).length>=max)return null;
       }
      }
      sessions.push({id,uid,day,started,expires,turns:0});return{id};
     }
     if(sql.startsWith("UPDATE ai_sessions")){
      const [id,uid,time]=args;
      const row=sessions.find(x=>x.id===id&&x.uid===uid&&x.expires>time&&x.turns<20);
      if(!row)return null;
      if(args.length===9){
       const [, , ,from,to,checkUid,checkFrom,checkTo,max]=args;
       if(row.day<from||row.day>=to)return null;
       const total=sessions.filter(x=>x.uid===checkUid&&x.day>=checkFrom&&x.day<checkTo).reduce((n,x)=>n+x.turns,0);
       if(total>=max)return null;
      }
      row.turns++;return{turns:row.turns};
     }
     if(sql.startsWith("INSERT INTO teacher_uses")){
      const[id,uid,day,created]=args;
      if(!sql.includes(" VALUES ")){
       if(args.length===8){
        const checkUid=args[4],from=args[5],to=args[6],max=args[7];
        if(teachers.filter(x=>x.uid===checkUid&&x.day>=from&&x.day<to).length>=max)return null;
       }else{
        const checkUid=args[4],checkDay=args[5],max=args[6];
        if(teachers.filter(x=>x.uid===checkUid&&x.day===checkDay).length>=max)return null;
       }
      }
      teachers.push({id,uid,day,created});return{id};
     }
     throw Error("Unexpected query: "+sql);
    },
    async run(){
     if(sql.startsWith("DELETE FROM teacher_uses")){
      const index=teachers.findIndex(x=>x.id===args[0]&&x.uid===args[1]);
      if(index!==-1)teachers.splice(index,1);
      return {success:true};
     }
     throw Error("Unexpected mutation: "+sql);
    }
   };
  }};
 }};
}
const toB64url=bytes=>Buffer.from(bytes).toString("base64url");
async function signer(){
 const pair=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
 const jwk=await crypto.subtle.exportKey("jwk",pair.publicKey);
 jwk.kid="test-signing-"+crypto.randomUUID();
 const now=Math.floor(Date.now()/1000);
 async function token(uid,claims={}){
  const head=toB64url(JSON.stringify({alg:"RS256",kid:jwk.kid,typ:"JWT"}));
  const body=toB64url(JSON.stringify({aud:"speakingym",iss:"https://securetoken.google.com/speakingym",sub:uid,iat:now-20,auth_time:now-120,exp:now+2400,...claims}));
  const data=head+"."+body;
  const sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,new TextEncoder().encode(data));
  return data+"."+toB64url(new Uint8Array(sig));
 }
 return{jwk,token};
}
const request=(path,method="POST",token=null,body=null)=>{
 const headers={Origin:ORIGIN};if(token)headers.Authorization="Bearer "+token;
 if(body){headers["Content-Type"]="application/json"}
 return new Request(API+path,{method,headers,body:body?JSON.stringify(body):undefined});
};
test("free/pro limits are explicit and reset by Japan day",()=>{
 assert.deepEqual(PLAN_LIMITS.free,{sessions:5,teacher:3});
 assert.deepEqual(PLAN_LIMITS.pro,{sessions:null,teacher:null,monthlyTurns:600,monthlyTeacher:20});
 assert.equal(tokyoDay(Date.parse("2026-10-15T14:59:59Z")),"2026-10-15");
 assert.equal(tokyoDay(Date.parse("2026-10-15T15:00:00Z")),"2026-10-16");
 assert.deepEqual(tokyoMonthBounds(Date.parse("2026-10-31T14:59:59Z")),{start:"2026-10-01",end:"2026-11-01"});
 assert.deepEqual(tokyoMonthBounds(Date.parse("2026-10-31T15:00:00Z")),{start:"2026-11-01",end:"2026-12-01"});
 assert.deepEqual(tokyoMonthBounds(Date.parse("2026-12-31T15:00:00Z")),{start:"2027-01-01",end:"2027-02-01"});
});
test("Firebase ID tokens are signature-checked: wrong aud, issuer and invalid signature are rejected",async t=>{
 const {jwk,token}=await signer();
 t.mock.method(globalThis,"fetch",async url=>{
  assert.match(String(url),/googleapis.com\/service_accounts/);
  return new Response(JSON.stringify({keys:[jwk]}),{status:200,headers:{"cache-control":"public,max-age=3600"}});
 });
 const signed=await token("student_a");
 assert.equal(await verifyFirebaseIdToken(request("entitlement","GET",signed)),"student_a");
 await assert.rejects(verifyFirebaseIdToken(request("entitlement","GET",await token("student_b",{aud:"other-project"}))),/invalid_token/);
 await assert.rejects(verifyFirebaseIdToken(request("entitlement","GET",await token("student_b",{iss:"https://securetoken.google.com/other"}))),/invalid_token/);
 await assert.rejects(verifyFirebaseIdToken(request("entitlement","GET",signed.slice(0,-2)+"aa")),/invalid_token/);
 await assert.rejects(verifyFirebaseIdToken(request("entitlement","GET")),/login_required/);
});
test("Worker denies guests, makes D1 authoritative and enforces Free and Pro quotas",async t=>{
 const {token,jwk}=await signer();const db=fakeD1();
 const a=await token("test_student_A"),b=await token("test_student_B");
 let aiCalls=0;
 t.mock.method(globalThis,"fetch",async (url,options)=>{
  if(String(url).includes("/service_accounts/v1/jwk/"))return new Response(JSON.stringify({keys:[jwk]}),{status:200,headers:{"cache-control":"max-age=3600"}});
  aiCalls++;
  const requestData=JSON.parse(options.body);
  const isTeacher=requestData?.contents?.[0]?.parts?.[0]?.text?.includes('"attempts"');
  const data=isTeacher?{feedback:[{index:0,praise:"意図が伝わります。",improvement:"より丁寧に伝えましょう。",improved:"Could you repeat that, please?",why:"丁寧な依頼表現です。",practice:"Ask again politely."}]}:{reply:"Sure!",progress:{step1:false,step2:false,step3:false}};
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(data)}]}}]}),{status:200});
 });
 const config=env(db);
 const health=await (await worker.fetch(request("health","GET"),config)).json();
 assert.equal(health.plansEnabled,true);
 assert.equal(health.plansReady,true);
 assert.equal((await worker.fetch(request("sessions"),config)).status,401);
 assert.equal((await worker.fetch(request("entitlement","GET"),config)).status,401);
 const starts=[];
 for(let i=0;i<5;i++){
  const r=await worker.fetch(request("sessions","POST",a),config);assert.equal(r.status,200);
  starts.push((await r.json()).sessionId);
 }
 const blocked=await worker.fetch(request("sessions","POST",a),config);
 assert.equal(blocked.status,429);
 assert.equal((await blocked.json()).error,"daily_session_limit");
 const ownTurn=await worker.fetch(request("", "POST",a,{sceneId:"hotel",level:"easy",userText:"Hi!",sessionId:starts[0]}),config);
 assert.equal(ownTurn.status,200);
 const crossAccount=await worker.fetch(request("", "POST",b,{sceneId:"hotel",level:"easy",userText:"Hi!",sessionId:starts[0]}),config);
 assert.equal(crossAccount.status,403);
 assert.equal((await crossAccount.json()).error,"session_not_active");
 assert.equal(aiCalls,1,"invalid and over-limit requests must not call Gemini");
 const usage=(await (await worker.fetch(request("entitlement","GET",a),config)).json());
 assert.equal(usage.plan,"free");assert.equal(usage.used.sessions,5);
 assert.equal(usage.limits.sessions,5);
 db.plans.set("test_student_B","pro");
 const pro=await worker.fetch(request("sessions","POST",b),config);
 assert.equal(pro.status,200);
 const proSessionId=(await pro.json()).sessionId;
 assert.equal((await (await worker.fetch(request("entitlement","GET",b),config)).json()).limits.sessions,null);
 for(let i=0;i<25;i++)assert.equal((await worker.fetch(request("sessions","POST",b),config)).status,200,"Pro has no daily session cap");
 assert.equal((await (await worker.fetch(request("entitlement","GET",b),config)).json()).used.sessions,26);
 const teacher={action:"reflex_coach",level:"standard",attempts:[{index:0,text:"Can you repeat?",situation:"You did not hear.",goal:"Ask politely to repeat."}]};
 for(let k=0;k<3;k++){
  const firstTeacher=await worker.fetch(request("","POST",a,teacher),config);
  assert.equal(firstTeacher.status,200);
  assert.equal((await firstTeacher.json()).feedback.length,1);
 }
 const fourthTeacher=await worker.fetch(request("","POST",a,teacher),config);
 assert.equal(fourthTeacher.status,429);
 assert.equal((await fourthTeacher.json()).error,"daily_teacher_limit");
 assert.equal((await (await worker.fetch(request("entitlement","GET",a),config)).json()).used.teacher,3);
 assert.equal(aiCalls,4,"Blocked teacher use and session replay must not call Gemini");
 const proTeacher=await worker.fetch(request("","POST",b,teacher),config);
 assert.equal(proTeacher.status,200,"Operator-granted Pro allows month quota");
 for(let k=1;k<20;k++)assert.equal((await worker.fetch(request("","POST",b,teacher),config)).status,200,"20 monthly teacher uses allowed");
 const blockedProTeacher=await worker.fetch(request("","POST",b,teacher),config);
 assert.equal(blockedProTeacher.status,429);
 assert.equal((await blockedProTeacher.json()).error,"monthly_teacher_limit");
 const teacherUsage=(await (await worker.fetch(request("entitlement","GET",b),config)).json());
 assert.equal(teacherUsage.limits.teacher,null);
 assert.equal(teacherUsage.limits.monthlyTeacher,20);
 assert.equal(teacherUsage.used.monthlyTeacher,20);
 // Seed prior completed sessions so only one monthly AI turn remains.
 const now=Math.floor(Date.now()/1000),day=tokyoDay();
 for(let k=0;k<30;k++)db.sessions.push({id:crypto.randomUUID(),uid:"test_student_B",day,started:now-100,expires:now+100,turns:k===29?19:20});
 let entitlement=(await (await worker.fetch(request("entitlement","GET",b),config)).json());
 assert.equal(entitlement.used.monthlyTurns,599);
 const conversation={sceneId:"hotel",level:"easy",userText:"Hi!",sessionId:proSessionId};
 const lastTurn=await worker.fetch(request("","POST",b,conversation),config);
 assert.equal(lastTurn.status,200,"the 600th AI request is allowed");
 const aiCallsBefore=aiCalls;
 const overTurn=await worker.fetch(request("","POST",b,conversation),config);
 assert.equal(overTurn.status,429);
 assert.equal((await overTurn.json()).error,"monthly_turn_limit");
 const blockedProSession=await worker.fetch(request("sessions","POST",b),config);
 assert.equal(blockedProSession.status,429);
 assert.equal((await blockedProSession.json()).error,"monthly_turn_limit");
 assert.equal(aiCalls,aiCallsBefore,"quota-blocked requests cannot call Gemini");
 entitlement=(await (await worker.fetch(request("entitlement","GET",b),config)).json());
 assert.equal(entitlement.limits.monthlyTurns,600);
 assert.equal(entitlement.used.monthlyTurns,600);
});
test("missing D1 binding rejects requests without invoking Gemini when plans are enabled",async t=>{
 const {token}=await signer();
 const id=await token("studentA");
 t.mock.method(globalThis,"fetch",async ()=>{throw Error("must not call Gemini")});
 const r=await worker.fetch(request("", "POST",id,{sceneId:"hotel",level:"standard",userText:"Hello",sessionId:"untrusted"}),env(null));
 assert.equal(r.status,503);
 assert.equal((await r.json()).error,"plans_not_ready");
});
