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
  const node={id,value:id==="mode"?"mix":"",textContent:"",disabled:false,hidden:false,style:{},
   children:[],classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,v)=>{
    const result=v===undefined?!classes.has(c):v;if(result)classes.add(c);else classes.delete(c);return result;
   }},
   listeners:{},addEventListener(k,v){this.listeners[k]=v},
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
  tick:()=>interval?.()
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

test("revealing sample shows all three variants, tip and can read aloud for free",()=>{
 const ui=app();ui.click("start");ui.click("stuck");
 assert.equal(ui.node("sample").classList.contains("hidden"),false);
 for(const id of ["sampleQuick","sampleText","samplePolite","sampleTip"])assert.ok(ui.node(id).textContent.length>8,id+" must show detailed example");
 assert.notEqual(ui.node("sampleQuick").textContent,ui.node("sampleText").textContent);
 ui.click("hearSample");
 assert.equal(ui.voicesRead.length,1);
 assert.equal(ui.voicesRead[0].text,ui.node("sampleText").textContent);
});

test("end of sixty seconds safely stops any active microphone capture",()=>{
 const ui=app();ui.click("start");ui.click("micBtn");const rec=ui.FakeRecognizer.instances[0];
 for(let i=0;i<60;i++)ui.tick();
 assert.equal(rec.aborted,true);
 assert.equal(ui.node("endPane").classList.contains("active"),true);
 assert.equal(ui.node("transcript").value,"");
});
