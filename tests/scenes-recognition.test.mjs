import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const html=readFileSync(new URL("../scenes.html",import.meta.url),"utf8");
const appScript=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function app(){
 const elements=new Map(),scheduled=new Map();
 let nextTimer=1;
 class FakeRecognition{
  static sessions=[];
  constructor(){this.aborted=false;this.started=false;FakeRecognition.sessions.push(this)}
  start(){this.started=true;this.onstart?.()}
  abort(){this.aborted=true}
  heard(text,final=true){
   this.onresult?.({results:[Object.assign([{transcript:text}],{isFinal:final})]});
  }
  end(){this.onend?.()}
 }
 function node(id){
  if(elements.has(id))return elements.get(id);
  const classes=new Set(["hidden"]), attrs={};
  const el={
   id,value:id==="level"?"standard":id==="speed"?"normal":"",
   dataset:{scene:id},disabled:false,textContent:"",className:"",
   children:[],attributes:attrs,style:{},handlers:{},
   classList:{
    add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)}
   },
   setAttribute(k,v){attrs[k]=v},
   addEventListener(k,f){this.handlers[k]=f},
   append(...xs){this.children.push(...xs)},
   replaceChildren(...xs){this.children=xs},
   scrollIntoView(){},
   closest(){return this}
  };
  elements.set(id,el);return el;
 }
 const context={
  document:{
   getElementById:node,
   createElement:t=>node("anon-"+String(elements.size)+"-"+t),
   querySelectorAll:s=>s==="[data-scene]"?["hotel","airport","smalltalk"].map(x=>node("button-"+x)):[],
  },
  window:{SpeechRecognition:FakeRecognition,speechSynthesis:null,speakingymAccount:{getIdToken:async()=>"mock-token"},addEventListener(){}},
  setTimeout(fn){const id=nextTimer++;scheduled.set(id,fn);return id},
  clearTimeout(id){scheduled.delete(id)},
  setInterval(){return ++nextTimer},clearInterval(){},
  AbortController,URL,console
 };
 // The tests don't send actual network requests.
 vm.runInNewContext(appScript,context);
 const click=id=>{const fn=node(id).handlers.click;assert.equal(typeof fn,"function",id+" handler missing");return fn()};
 const flush=()=>{const entry=scheduled.entries().next().value;assert.ok(entry,"Expected pending microphone restart");scheduled.delete(entry[0]);entry[1]()};
 return {node,click,flush,FakeRecognition};
}

test("short pause restarts the recognition engine without losing or repeating earlier words",async()=>{
 const ui=app();await ui.click("start");ui.click("mic");
 const first=ui.FakeRecognition.sessions[0];
 assert.equal(first.continuous,true,"request continuous listening where supported");
 first.heard("I booked a room",true);
 assert.equal(ui.node("reply").value,"I booked a room");
 first.end();
 assert.equal(ui.node("reply").value,"I booked a room");
 ui.flush();
 const second=ui.FakeRecognition.sessions[1];
 second.heard("but the room is not ready",true);
 assert.equal(ui.node("reply").value,"I booked a room but the room is not ready");
 ui.click("stopMic");
 assert.equal(ui.node("reply").value,"I booked a room but the room is not ready");
 assert.equal(second.aborted,true);
});

test("interim speech survives stopping, and resume appends rather than erasing",async()=>{
 const ui=app();await ui.click("start");ui.click("mic");
 const rec=ui.FakeRecognition.sessions[0];
 rec.heard("Could you please",false);
 ui.click("stopMic");
 assert.equal(ui.node("reply").value,"Could you please");
 ui.click("resumeMic");
 ui.FakeRecognition.sessions[1].heard("check the fee",true);
 assert.equal(ui.node("reply").value,"Could you please check the fee");
});

test("manual rerecord still clears an incorrect transcript",async()=>{
 const ui=app();await ui.click("start");ui.click("mic");
 const rec=ui.FakeRecognition.sessions[0];rec.heard("wrong phrase");
 ui.click("mic");
 assert.equal(ui.node("reply").value,"");
 assert.equal(rec.aborted,true);
 ui.FakeRecognition.sessions[1].heard("correct phrase");
 assert.equal(ui.node("reply").value,"correct phrase");
});

test("challenge task description and all goals are English-only, with distinct difficulty",()=>{
 const ui=app();
 ui.node("level").value="challenge";ui.node("level").handlers.change();
 const p=ui.node("setupAssignment");
 assert.equal(p.attributes.lang,"en");
 const challengeText=p.children.map(x=>x.textContent).join(" ");
 assert.match(challengeText,/prepaid.*room.*available|ocean-view/i);
 assert.doesNotMatch(challengeText,/[\u3040-\u30ff\u3400-\u9fff]/);
 const goals=ui.node("setupGoals");
 assert.equal(goals.attributes.lang,"en");
 assert.equal(goals.children.length,3);
 assert.doesNotMatch(goals.children.map(x=>x.textContent).join(" "),/[\u3040-\u30ff\u3400-\u9fff]/);
 ui.node("level").value="standard";ui.node("level").handlers.change();
 assert.equal(p.attributes.lang,"ja");
 assert.match(p.children.map(x=>x.textContent).join(" "),/早く|料金/);
});
