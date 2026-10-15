import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";

const html=readFileSync(new URL("../reflex.html",import.meta.url),"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
function app(){
 const elements=new Map(),timeouts=new Map(),storage=new Map();
 let counter=0,interval=null;
 const voicesRead=[];
 const fakeSynth={speak:voice=>voicesRead.push(voice),cancel(){},getVoices(){return [{lang:"en-US",name:"English test voice"}]}};
 class FakeRecognizer{
  static instances=[];
  constructor(){this.aborted=false;FakeRecognizer.instances.push(this)}
  start(){this.onstart?.()}
  abort(){this.aborted=true}
  heard(phrase,final=true){
   this.onresult?.({results:[Object.assign([{transcript:phrase}],{isFinal:final})]});
  }
  end(){this.onend?.()}
 }
 const makeNode=id=>{
  if(elements.has(id))return elements.get(id);
  const classes=new Set(["hidden"]);
  const node={id,value:id==="mode"?"mix":id==="level"?"standard":"",textContent:"",disabled:false,hidden:false,checked:false,style:{},
   children:[],classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,v)=>{
    const result=v===undefined?!classes.has(c):v;if(result)classes.add(c);else classes.delete(c);return result;
   }},
   listeners:{},setAttribute(name,value){this[name]=value},addEventListener(k,v){this.listeners[k]=v},
   replaceChildren(...nodes){this.children=nodes},append(...nodes){this.children.push(...nodes)}
  };
  elements.set(id,node);return node;
 };
 const sandbox={
  document:{getElementById:makeNode,createElement:()=>makeNode("node-"+elements.size)},
  window:{SpeechRecognition:FakeRecognizer,speechSynthesis:fakeSynth,SpeechSynthesisUtterance:class{constructor(text){this.text=text}},addEventListener(){}},
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  setInterval:fn=>{interval=fn;return 1},clearInterval:()=>{interval=null},
  setTimeout:fn=>{const id=++counter;timeouts.set(id,fn);return id},
  clearTimeout:id=>timeouts.delete(id),
  console,Math
 };
 vm.runInNewContext(script,sandbox,{timeout:3000});
 return {
  click:id=>{const action=makeNode(id).listeners.click;assert.equal(typeof action,"function","Missing control "+id);return action()},
  node:makeNode,FakeRecognizer,voicesRead,
  flush:()=>{const entry=timeouts.entries().next().value;assert.ok(entry,"A restart should be scheduled");timeouts.delete(entry[0]);entry[1]()},
  tick:()=>interval?.(),storage
 };
}

test("voice recognition is optional, starts by touch and displays English without sending it anywhere",()=>{
 const ui=app();ui.click("start");
 assert.equal(ui.FakeRecognizer.instances.length,0,"mic must not start without permission/user action");
 ui.click("micBtn");
 const rec=ui.FakeRecognizer.instances[0];
 assert.equal(rec.continuous,true);
 assert.equal(rec.lang,"en-US");
 rec.heard("Could you say that again?");
 assert.equal(ui.node("transcript").value,"Could you say that again?");
 ui.click("stopMic");
 assert.equal(rec.aborted,true);
 assert.equal(ui.node("transcript").value,"Could you say that again?");
 ui.click("spoken");
 assert.equal(ui.node("count").textContent,"1 問チャレンジ");
});

test("on mobile, speech pauses can resume without losing earlier phrases",()=>{
 const ui=app();ui.click("start");ui.click("micBtn");
 const first=ui.FakeRecognizer.instances[0];
 first.heard("I understand",true);
 first.end();
 assert.equal(ui.node("transcript").value,"I understand");
 ui.flush();
 const second=ui.FakeRecognizer.instances[1];
 second.heard("but I disagree",true);
 assert.equal(ui.node("transcript").value,"I understand but I disagree");
 ui.click("stopMic");
 ui.click("resumeMic");
 ui.FakeRecognizer.instances[2].heard("because of the cost",true);
 assert.equal(ui.node("transcript").value,"I understand but I disagree because of the cost");
});

test("mic re-tap discards wrong transcript; manual clear and edits remain possible",()=>{
 const ui=app();ui.click("start");ui.click("micBtn");
 const rec=ui.FakeRecognizer.instances[0];rec.heard("wrong recognition");
 ui.click("micBtn");
 assert.equal(rec.aborted,true);
 assert.equal(ui.node("transcript").value,"");
 ui.FakeRecognizer.instances[1].heard("correct");
 assert.equal(ui.node("transcript").value,"correct");
 ui.click("clearSpeech");assert.equal(ui.node("transcript").value,"");
});

test("model answers and contextual advice appear only after timed play",()=>{
 const ui=app();ui.click("start");ui.click("stuck");
 assert.equal(ui.node("reportReview").classList.contains("hidden"),true);
 ui.click("finishEarly");
 assert.equal(ui.node("reportReview").classList.contains("hidden"),false);
 assert.equal(ui.node("reviewAnswers").children.length,3);
 assert.ok(ui.node("reviewGood").textContent.length>10);
 assert.ok(ui.node("reviewImprove").textContent.length>10);
 const answer=ui.node("reviewAnswers").children[1];
 assert.match(answer.children[0].textContent,/NATURAL/);
 answer.children[2].listeners.click();
 assert.equal(ui.voicesRead.length,1);
 assert.equal(ui.voicesRead[0].text,answer.children[1].textContent);
});

test("advanced problem statement and goal are in English",()=>{
 const ui=app();ui.node("level").value="challenge";ui.click("start");
 assert.equal(ui.node("prompt").lang,"en");
 const prompt=ui.node("situation").textContent+" "+ui.node("challenge").textContent;
 assert.match(prompt,/[A-Za-z]{5}/);
 assert.doesNotMatch(prompt,/[\u3040-\u30ff\u3400-\u9fff]/);
 ui.node("level").value="easy";
 // Level stays stable during an active run.
 ui.click("stuck");
 assert.equal(ui.node("prompt").lang,"en");
});

test("transcript is not saved without opt-in but review remains available",()=>{
 const ui=app();ui.click("start");ui.node("transcript").value="my private sentence";
 ui.click("spoken");ui.click("finishEarly");
 assert.match(ui.node("reviewYou").textContent,/my private sentence/);
 const saved=JSON.parse(ui.storage.get("speakingym-reflex-history-v1"));
 assert.equal(saved[0].attempts[0].transcript,"");
});

test("when transcript history is opted into, stored words and ratings can be replayed",()=>{
 const ui=app();ui.node("saveTranscripts").checked=true;ui.click("start");
 ui.node("transcript").value="Could you repeat that, please?";
 ui.click("spoken");ui.click("finishEarly");
 const stored=JSON.parse(ui.storage.get("speakingym-reflex-history-v1"));
 assert.equal(stored[0].attempts[0].transcript,"Could you repeat that, please?");
 ui.click("openHistory");
 assert.equal(ui.node("historyPane").classList.contains("active"),true);
 ui.node("historyList").children[0].children[1].listeners.click();
 assert.equal(ui.node("endPane").classList.contains("active"),true);
 assert.match(ui.node("reviewYou").textContent,/Could you repeat that, please/);
});

test("end of sixty seconds safely stops any active microphone capture",()=>{
 const ui=app();ui.click("start");ui.click("micBtn");const rec=ui.FakeRecognizer.instances[0];
 for(let i=0;i<60;i++)ui.tick();
 assert.equal(rec.aborted,true);
 assert.equal(ui.node("endPane").classList.contains("active"),true);
 assert.equal(ui.node("transcript").value,"");
});
