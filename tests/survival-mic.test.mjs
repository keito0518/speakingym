import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../mission.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function startApp(){
 const nodes=new Map(),scheduled=[];
 const element=id=>{
  if(!nodes.has(id)){
   const classes=new Set();
   nodes.set(id,{
    id,value:id==="level"?"standard":id==="speed"?"auto":"",
    textContent:"",disabled:false,style:{},listeners:{},children:[],
    classList:{
     add:c=>classes.add(c),remove:c=>classes.delete(c),
     contains:c=>classes.has(c),toggle:(c,on)=>{if(on===undefined?(!classes.has(c)):on)classes.add(c);else classes.delete(c);}
    },
    addEventListener(type,callback){this.listeners[type]=callback},
    scrollIntoView(){},setAttribute(){},
    replaceChildren(...children){this.children=children},
    append(...children){this.children.push(...children)},
    focus(){}
   });
  }
  return nodes.get(id);
 };
 class FakeRecognizer{
  static instances=[];
  constructor(){this.aborted=false;FakeRecognizer.instances.push(this)}
  start(){this.onstart?.()}
  abort(){this.aborted=true}
  emit(text){this.onresult?.({results:[Object.assign([{transcript:text}],{isFinal:true})]})}
 }
 const data=new Map();
 const sandbox={
  window:{SpeechRecognition:FakeRecognizer,speechSynthesis:null,addEventListener(){}},
  document:{getElementById:element,createElement:()=>({value:"",textContent:"",className:"",style:{},append(){}})},
  localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)},
  setInterval:()=>1,clearInterval(){},setTimeout:(fn)=>{scheduled.push(fn);return scheduled.length},clearTimeout(){},
  console,URL
 };
 vm.runInNewContext(script,sandbox,{timeout:3000});
 const click=(id)=>{const callback=element(id).listeners.click;assert.equal(typeof callback,"function",id+" needs click handler");return callback()};
 const start=()=>{click("startBtn");const readIntro=scheduled.shift();assert.ok(readIntro,"initial line should complete");readIntro();};
 return {element,click,start,FakeRecognizer,scheduled,data};
}

test("second mic tap removes wrong transcription and starts from scratch",()=>{
 const ui=startApp();ui.start();
 ui.click("micBtn");
 const first=ui.FakeRecognizer.instances[0];
 first.emit("I ordered a salad by mistake");
 assert.equal(ui.element("reply").value,"I ordered a salad by mistake");
 assert.match(ui.element("micBtn").textContent,/最初から話す/);
 ui.click("micBtn");
 const second=ui.FakeRecognizer.instances[1];
 assert.equal(first.aborted,true);
 assert.equal(ui.element("reply").value,"");
 assert.equal(ui.element("stopMicBtn").classList.contains("hidden"),false);
 second.emit("I ordered an iced oat latte");
 assert.equal(ui.element("reply").value,"I ordered an iced oat latte");
});

test("clear button stops listening, removes all speech, and does not send",()=>{
 const ui=startApp();ui.start();
 ui.click("micBtn");
 const rec=ui.FakeRecognizer.instances[0];rec.emit("garbled speech");
 ui.click("clearTextBtn");
 assert.equal(rec.aborted,true);
 assert.equal(ui.element("reply").value,"");
 assert.equal(ui.element("stopMicBtn").classList.contains("hidden"),true);
 assert.match(ui.element("micBtn").textContent,/話して入力/);
});

test("stop button preserves transcribed text for manual corrections",()=>{
 const ui=startApp();ui.start();
 ui.click("micBtn");
 const rec=ui.FakeRecognizer.instances[0];rec.emit("I order oat");
 ui.click("stopMicBtn");
 assert.equal(rec.aborted,true);
 assert.equal(ui.element("reply").value,"I order oat");
 assert.equal(ui.element("stopMicBtn").classList.contains("hidden"),true);
 ui.element("reply").value="I ordered oat milk";
 ui.click("clearTextBtn");
 assert.equal(ui.element("reply").value,"");
});

test("new recognition never reuses the previous text even after it finished",()=>{
 const ui=startApp();ui.start();
 ui.click("micBtn");
 const first=ui.FakeRecognizer.instances[0];first.emit("wrong words");
 first.onend();
 assert.equal(ui.element("reply").value,"wrong words");
 ui.click("micBtn");
 assert.equal(ui.element("reply").value,"");
 ui.FakeRecognizer.instances[1].emit("correct words");
 assert.equal(ui.element("reply").value,"correct words");
});

test("voice picker is present without exposing any Gemini API secret",()=>{
 assert.match(html,/id="voiceChoice"/);
 assert.match(script,/speech\.getVoices\(\)/);
 assert.match(script,/voicePreference=\$\('voiceChoice'\)\.value/);
 assert.doesNotMatch(html,/AIza[0-9A-Za-z_-]{20,}/);
});
