import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Exercise the exact page script with synthetic Firebase/Worker responses.
// No real user, Stripe, Gemini, Cloudflare or network requests are involved.
const html=readFileSync(new URL('../scenes.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'scene page script must exist');
function fixture({replay=false,ready=true,outcomes=['network-error'],healthFailOnce=false}={}){
 const nodes=new Map(),requests=[],listeners={},timers=new Map();
 let elementIndex=0,timerId=0,uuids=0,healthCount=0;
 const classes=()=>{const current=new Set(['hidden']);return {
  add:key=>current.add(key),remove:key=>current.delete(key),contains:key=>current.has(key),
  toggle:(key,force)=>{const yes=force===undefined?!current.has(key):force;
   if(yes)current.add(key);else current.delete(key);return yes}
 }};
 const make=id=>{
  if(nodes.has(id))return nodes.get(id);
  const el={id,value:id==='level'?'standard':id==='speed'?'normal':'',
   disabled:false,hidden:false,textContent:'',className:'',dataset:{scene:id},
   children:[],style:{},events:{},attributes:{},classList:classes(),
   setAttribute(key,value){this.attributes[key]=value},
   addEventListener(name,cb){this.events[name]=cb},
   append(...children){this.children.push(...children)},
   replaceChildren(...children){this.children=children},
   scrollIntoView(){},focus(){},closest(){return this}
  };
  nodes.set(id,el);return el;
 };
 const body={};
 const store=new Map();
 const context={
  window:{
   speakingymAccount:{getIdToken:async()=> 'synthetic-user',isLoggedIn:()=>true},
   speakingymQuota:{refresh(){}},
   speakingymAnalytics:{track(){}},
   SpeechRecognition:null,speechSynthesis:null,
   location:{search:'',href:'http://example.invalid/scenes.html'},
   addEventListener:(name,cb)=>{listeners[name]=cb},
   dispatchEvent(){},history:{replaceState(){}}
  },
  document:{
   getElementById:make,
   createElement:tag=>make('anonymous-'+(++elementIndex)+'-'+tag),
   querySelectorAll:selector=>selector==='[data-scene]'?[]:[]
  },
  localStorage:{
   getItem:key=>store.get(key)||null,
   setItem:(key,value)=>store.set(key,String(value))
  },
  fetch:async (endpoint,options={})=>{
   const url=String(endpoint);
   if(url.endsWith('/health')){
    healthCount++;
    if(healthFailOnce&&healthCount===1)return {ok:false,status:503,json:async()=>({})};
    return {ok:true,status:200,json:async()=>({
     plansEnabled:true,aiReplayEnabled:replay,aiReplaySchemaReady:ready,
     turnLedgerEnabled:true,turnLedgerSchemaReady:true
    })};
   }
   if(url.endsWith('/sessions'))
    return {ok:true,status:200,json:async()=>({sessionId:'synthetic-session'})};
   const payload=JSON.parse(options.body);
   requests.push(payload);
   const outcome=outcomes[Math.min(requests.length-1,outcomes.length-1)];
   if(outcome==='network-error')throw new TypeError('Failed to fetch');
   if(outcome==='invalid-response')return {ok:true,status:200,json:async()=>({sceneId:'hotel',reply:''})};
   if(typeof outcome==='object'&&outcome.error)
    return {ok:false,status:outcome.status||409,json:async()=>({error:outcome.error})};
   return {ok:true,status:200,json:async()=>({
    sceneId:'hotel',reply:'Thanks. How can I help you further?',
    progress:{step1:false,step2:false,step3:false},coaching:null
   })};
  },
  crypto:{randomUUID:()=> 'synthetic-uuid-'+(++uuids)},
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId},
  clearTimeout:id=>timers.delete(id),
  setInterval:fn=>{timers.set(++timerId,fn);return timerId},
  clearInterval:id=>timers.delete(id),
  AbortController,DOMException,URL,URLSearchParams,Date,console
 };
 vm.runInNewContext(source,context,{timeout:3000});
 return {
  node:make,requests,
  async start(){await make('start').events.click();},
  async send(text){
   make('reply').value=text;make('send').events.click();
   await this.settle();
  },
  async retry(){make('retry').events.click();await this.settle()},
  async settle(){for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve))},
  get userBubbles(){return make('chat').children.filter(x=>x.className.includes(' me')).length},
  get responseBubbles(){return make('chat').children.filter(x=>x.className.includes('bubble')&&!x.className.includes(' me')).length}
 };
}
test('with verified replay, lost AI response can be retried with the SAME request ID once',async()=>{
 const ui=fixture({replay:true,outcomes:['network-error','success']});
 await ui.start();await ui.send('Could I check out late?');
 assert.equal(ui.requests.length,1);
 assert.equal(ui.node('retry').disabled,false);
 assert.equal(ui.userBubbles,1);
 await ui.retry();
 assert.equal(ui.requests.length,2);
 assert.equal(ui.requests[0].requestId,ui.requests[1].requestId,'never generate a new id after ambiguous failure');
 assert.equal(ui.userBubbles,1,'retry must not duplicate learner history');
 assert.equal(ui.responseBubbles,2,'one initial prompt and one actual AI reply');
 assert.equal(ui.node('retry').disabled,true,'successful turn must clear retry state');
});
test('without replay, lost response blocks duplicate POST and explains why',async()=>{
 const ui=fixture({replay:false,outcomes:['network-error','success']});
 await ui.start();await ui.send('Please repeat your question.');
 assert.equal(ui.requests.length,1);
 assert.equal(ui.node('retry').disabled,true);
 assert.match(ui.node('errorReason').textContent,/二重消費/);
 await ui.retry();
 assert.equal(ui.requests.length,1);
 assert.equal(ui.userBubbles,1);
});
test('replay requested but unhealthy schema still blocks an ambiguous POST',async()=>{
 const ui=fixture({replay:true,ready:false,outcomes:['network-error']});
 await ui.start();await ui.send('Please help.');
 assert.equal(ui.node('retry').disabled,true);
 await ui.retry();assert.equal(ui.requests.length,1);
});
test('terminal receipt states and invalid 200 responses must not be retried',async()=>{
 for(const outcome of [
  {error:'request_uncertain',status:409},
  {error:'request_result_expired',status:410},
  {error:'request_id_conflict',status:409},
  'invalid-response'
 ]){
  const ui=fixture({replay:true,outcomes:[outcome,'success']});
  await ui.start();await ui.send('Is this my reservation?');
  assert.equal(ui.node('retry').disabled,true,JSON.stringify(outcome));
  await ui.retry();
  assert.equal(ui.requests.length,1,JSON.stringify(outcome));
  assert.equal(ui.userBubbles,1);
 }
});
test('a failed health GET has not sent an AI turn, so retry can recover safely',async()=>{
 const ui=fixture({replay:false,healthFailOnce:true,outcomes:['success']});
 await ui.start();await ui.send('Could you help me?');
 assert.equal(ui.requests.length,0,'preflight error is before AI POST');
 assert.equal(ui.node('retry').disabled,false);
 await ui.retry();
 assert.equal(ui.requests.length,1);
 assert.equal(ui.userBubbles,1);
 assert.equal(ui.node('retry').disabled,true);
});
