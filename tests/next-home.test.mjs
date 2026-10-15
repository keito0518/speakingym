import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";

const home=readFileSync(new URL("../home-preview.html",import.meta.url),"utf8");
const sprint=readFileSync(new URL("../reflex.html",import.meta.url),"utf8");
const jsOf=html=>html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function fakeDocument(storageEntries={}){
 const store=new Map(Object.entries(storageEntries));
 const elements=new Map();
 let intervalFn=null;
 function element(id){
  if(elements.has(id))return elements.get(id);
  const set=new Set();
  const e={id,textContent:"",value:id==="mode"?"mix":"",hidden:false,style:{},children:[],disabled:false,
   listeners:{},
   classList:{add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle(x,force){
    const selected=force===undefined?!set.has(x):force;
    if(selected)set.add(x);else set.delete(x);return selected;
   }},
   addEventListener(type,fn){this.listeners[type]=fn},
   replaceChildren(...items){this.children=[...items]},
   append(...items){this.children.push(...items)}
  };
  elements.set(id,e);return e;
 }
 const sandbox={
  document:{getElementById:element,createElement:()=>element("generated-"+elements.size)},
  localStorage:{
   getItem:key=>store.get(key)??null,
   setItem:(key,value)=>store.set(key,String(value)),
   removeItem:key=>store.delete(key)
  },
  window:{addEventListener(){}},
  setInterval:fn=>{intervalFn=fn;return 1},
  clearInterval:()=>{intervalFn=null},
  Math,console
 };
 const run=(html)=>vm.runInNewContext(jsOf(html),sandbox,{timeout:3000});
 const click=id=>{const fn=element(id).listeners.click;assert.equal(typeof fn,"function",id+" is not clickable");fn()};
 return {element,click,run,store,interval:()=>intervalFn};
}

test("new home and reflex app both have valid browser JavaScript",()=>{
 for(const html of [home,sprint]){
  assert.ok(jsOf(html));
  assert.doesNotThrow(()=>new vm.Script(jsOf(html)));
 }
});

test("preview is AI-first and does not replace the existing index or duplicate its Free/Pro mode",()=>{
 assert.match(home,/href="\.\/scenes\.html"/);
 assert.match(home,/href="\.\/reflex\.html"/);
 assert.match(home,/href="\.\/index\.html"/);
 assert.doesNotMatch(home,/data-action="switch-plan"/);
 assert.doesNotMatch(home,/href="\.\/live\.html"/);
 assert.match(home,/NEW HOME · PREVIEW/);
 assert.match(home,/@media\(max-width:520px\)/);
});

test("saved AI rewrites appear on home, and can cycle without network requests",()=>{
 const words=[
  {original:"I want a refund",natural:"Would it be possible to get a refund?"},
  {original:"I do not understand",natural:"Could you explain that a little more?"}
 ];
 const app=fakeDocument({
  "speakingym-saved-coaching-v1":JSON.stringify(words),
  "speakingym-reflex-stats-v1":JSON.stringify({sessions:3,spoken:17})
 });
 app.run(home);
 assert.equal(app.element("totalRuns").textContent,"3");
 assert.equal(app.element("totalSpoken").textContent,"17");
 assert.equal(app.element("savedWords").children.length,1);
 const first=app.element("savedWords").children[0].children[1].textContent;
 app.click("nextWord");
 assert.notEqual(app.element("savedWords").children[0].children[1].textContent,first);
});

test("reflex uses twenty-four unique practical reactions and has no network request",()=>{
 assert.equal((sprint.match(/\{id:"(?:repair|hold|bound|connect)/g)||[]).length,24);
 assert.doesNotMatch(jsOf(sprint),/\bfetch\s*\(/);
 assert.doesNotMatch(jsOf(sprint),/\bXMLHttpRequest\b/);
 assert.match(jsOf(sprint),/window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
 assert.match(sprint,/id="micBtn"/);
 assert.match(sprint,/id="resumeMic"/);
 assert.match(sprint,/id="stopMic"/);
 assert.match(sprint,/id="transcript"/);
 assert.match(sprint,/id="hearSample"/);
 assert.match(sprint,/id="sampleQuick"/);
 assert.match(sprint,/id="samplePolite"/);
 assert.match(sprint,/@media\(max-width:550px\)/);
});

test("60 second game counts self-assessment and saves stats locally",()=>{
 const app=fakeDocument();
 app.run(sprint);
 app.click("start");
 assert.equal(app.element("playPane").classList.contains("active"),true);
 assert.equal(app.element("time").textContent,"01:00");
 assert.ok(app.element("challenge").textContent.length>3);
 app.click("spoken");
 app.click("stuck");
 assert.equal(app.element("sample").classList.contains("hidden"),false);
 app.click("next");
 app.click("showSample");
 assert.equal(app.element("next").classList.contains("hidden"),false);
 app.click("finishEarly");
 assert.equal(app.element("endPane").classList.contains("active"),true);
 assert.equal(app.element("total").textContent,"3");
 assert.equal(app.element("wins").textContent,"1");
 assert.equal(app.element("misses").textContent,"2");
 const totals=JSON.parse(app.store.get("speakingym-reflex-stats-v1"));
 assert.deepEqual(totals,{sessions:1,spoken:1,attempted:3});
 assert.equal(app.interval(),null);
 const missed=JSON.parse(app.store.get("speakingym-reflex-misses-v1"));
 assert.equal(missed.length,2);
});

test("timer finishes session at zero and no fabricated score is calculated",()=>{
 const app=fakeDocument();
 app.run(sprint);app.click("start");
 for(let i=0;i<60;i++)app.interval()?.();
 assert.equal(app.element("endPane").classList.contains("active"),true);
 assert.equal(app.element("total").textContent,"0");
 assert.equal(app.element("wins").textContent,"0");
 assert.equal(app.interval(),null);
});

test("all 24 reflex questions have three English examples and a usage tip",()=>{
 const quick=(jsOf(sprint).match(/(?:repair|hold|bound|connect)[1-6]:\{quick:/g)||[]);
 assert.equal(quick.length,24);
 assert.match(jsOf(sprint),/EXTRA_ANSWERS\[current\.id\]/);
 assert.match(jsOf(sprint),/options\.tip/);
 assert.equal((jsOf(sprint).match(/await fetch\(/g)||[]).length,0);
});
