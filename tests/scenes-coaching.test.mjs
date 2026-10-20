import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const html=readFileSync(new URL("../scenes.html",import.meta.url),"utf8");
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
function mockScene(coaching){
 const elements=new Map(),store=new Map();
 const classes=()=>{const set=new Set(["hidden"]);return {
  add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x)
 }};
 function makeElement(id=""){
  return {
   id,value:id==="level"?"standard":id==="speed"?"normal":"",textContent:"",children:[],disabled:false,
   className:"",classList:classes(),style:{},dataset:{scene:id},listeners:{},attributes:{},
   setAttribute(name,value){this.attributes[name]=value},
   addEventListener(name,fn){this.listeners[name]=fn},
   append(...xs){this.children.push(...xs)},
   replaceChildren(...xs){this.children=xs},
   scrollIntoView(){},focus(){}
  };
 }
 const get=id=>{if(!elements.has(id))elements.set(id,makeElement(id));return elements.get(id)};
 let count=0;
 const sandbox={
  document:{
   getElementById:get,
   createElement:()=>makeElement(),
   querySelectorAll:()=>["hotel","airport","smalltalk"].map(x=>get("selector-"+x))
  },
  window:{speechSynthesis:null,SpeechRecognition:null,speakingymAccount:{getIdToken:async()=>"mock-token"},addEventListener(){}},
  localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
  setInterval:()=>1,clearInterval(){},
  setTimeout:()=>1,clearTimeout(){},AbortController,URL,console,
  fetch:async url=>{if(String(url).endsWith("/health"))return {ok:true,status:200,json:async()=>({plansEnabled:false})};count++;return {
   ok:true,status:200,json:async()=>({
    sceneId:"hotel",reply:"I understand. Let me check that for you.",
    progress:{step1:true,step2:true,step3:true},
    ...(coaching===null?{}:{coaching})
   })
  }}
 };
 vm.runInNewContext(source,sandbox,{timeout:3000});
 return {get,store,click:id=>get(id).listeners.click(),get count(){return count}};
}
const wait=()=>new Promise(resolve=>setImmediate(resolve));
test("AI report appears from the existing conversation request and saves review locally",async()=>{
 const ui=mockScene({
  natural:"Would it be possible to check in early?",
  tip:"Could I より丁寧な依頼として伝わります。",
  praise:"早く到着した事情を伝えられました。"
 });
 await ui.click("start");ui.get("reply").value="I want check in early";
 ui.click("send");await wait();await wait();
 assert.equal(ui.count,1,"No extra API call is allowed for feedback");
 const report=ui.get("coachReport");
 assert.equal(report.classList.contains("hidden"),false);
 assert.match(report.children.map(x=>x.textContent).join(" " ),/AI Speaking Report/);
 assert.equal(ui.get("saveReview").classList.contains("hidden"),false);
 ui.click("saveReview");
 const entries=JSON.parse(ui.store.get("speakingym-saved-coaching-v1"));
 assert.equal(entries.length,1);
 assert.equal(entries[0].natural,"Would it be possible to check in early?");
 assert.equal(ui.count,1,"Saving offline must not call an API");
});

test("no coaching from Gemini means no invented report",async()=>{
 const ui=mockScene(null);
 await ui.click("start");ui.get("reply").value="Can I check in?";
 ui.click("send");await wait();await wait();
 assert.equal(ui.count,1);
 assert.equal(ui.get("coachReport").classList.contains("hidden"),true);
 assert.equal(ui.get("saveReview").classList.contains("hidden"),true);
});


test("case and punctuation-only changes do not create fake speaking corrections",async()=>{
 const ui=mockScene({natural:"CAN I CHECK IN?!",tip:"",praise:""});
 await ui.click("start");
 ui.get("reply").value="Can I check in?";
 ui.click("send");await wait();await wait();
 assert.equal(ui.count,1,"The existing single AI turn must remain the only request");
 assert.equal(ui.get("coachReport").classList.contains("hidden"),true);
 assert.equal(ui.get("saveReview").classList.contains("hidden"),true);
});

test("already-natural English receives a useful next practice, not an imaginary rewrite",async()=>{
 const ui=mockScene({
  natural:"Can I check in?!",
  tip:"check in はホテルで到着を伝える表現。",
  praise:"チェックインしたいことを質問で伝えられました。"
 });
 await ui.click("start");
 ui.get("reply").value="Can I check in?";
 ui.click("send");await wait();await wait();
 const report=ui.get("coachReport");
 assert.equal(report.classList.contains("hidden"),false);
 assert.equal(ui.get("saveReview").classList.contains("hidden"),true);
 const text=report.children.map(x=>x.textContent||"").join(" ");
 assert.match(text,/言い換え候補：0件/);
 assert.match(text,/今回伝わった表現を使って、次の質問に/);
 assert.doesNotMatch(text,/上の言い換えから1つ選び/);
 assert.equal(ui.count,1,"Feedback remains part of the initial AI request");
});

test("meaningful changes still appear and can be saved for practice",async()=>{
 const ui=mockScene({
  natural:"Could I check in, please?",
  tip:"please を付けると依頼が少し丁寧になります。",
  praise:"ホテルでの用件を簡潔に伝えられました。"
 });
 await ui.click("start");
 ui.get("reply").value="Can I check in?";
 ui.click("send");await wait();await wait();
 const report=ui.get("coachReport");
 assert.match(report.children.map(x=>x.textContent||"").join(" "),/言い換え候補：1件/);
 assert.equal(ui.get("saveReview").classList.contains("hidden"),false);
 ui.click("saveReview");
 const entries=JSON.parse(ui.store.get("speakingym-saved-coaching-v1"));
 assert.equal(entries.length,1);
 assert.equal(entries[0].natural,"Could I check in, please?");
 assert.equal(ui.count,1);
});
