import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../sprint-diagnosis.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../reflex.html',import.meta.url),'utf8');
const CTX={date:'2026-10-23T13:14:15.123Z',index:2,cardId:'hold1',outcome:'stuck'};

function harness(initial={}){
 const store=new Map(Object.entries(initial)),events={};
 const elements=new Map();
 function node(tag='div'){
  return {
   tagName:tag.toUpperCase(),hidden:false,textContent:'',className:'',dataset:{},children:[],attrs:{},
   append(...children){this.children.push(...children)},
   replaceChildren(...children){this.children=[...children]},
   setAttribute(key,value){this.attrs[key]=value},
   addEventListener(name,fn){(this.listeners??={})[name]=fn},
   click(){this.listeners?.click?.()}
  };
 }
 for(const id of ['diagnosisPanel','diagnosisChoices','diagnosisResult','diagnosisSummary','diagnosisSummaryText'])
  elements.set(id,node());
 const localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>store.set(k,String(v)),
  removeItem:k=>store.delete(k)
 };
 const window={
  addEventListener:(n,cb)=>{events[n]=cb},
  speakingymAccount:{isLoggedIn:()=>false,getUid:()=>null}
 };
 const context={window,document:{getElementById:id=>elements.get(id)||null,createElement:node},localStorage};
 vm.runInNewContext(source,context,{filename:'sprint-diagnosis.js'});
 return {ui:window.speakingymSprintDiagnosis,store,elements,events,window,localStorage};
}
const get=(h,id)=>h.elements.get(id);
test('post-sprint stuck reflection is optional, accessible, and offers AI-free follow-up',()=>{
 const h=harness();
 h.ui.render(CTX);
 assert.equal(get(h,'diagnosisPanel').hidden,false);
 assert.equal(get(h,'diagnosisChoices').children.length,6);
 assert.equal(get(h,'diagnosisChoices').children[0].attrs['aria-pressed'],'false');
 assert.equal(h.store.size,0,'opening a reflection does not persist anything');
 get(h,'diagnosisChoices').children[0].click();
 assert.equal(get(h,'diagnosisChoices').children[0].attrs['aria-pressed'],'true');
 assert.match(get(h,'diagnosisResult').children[1].textContent,/難しい単語/);
 const anchor=get(h,'diagnosisResult').children[2];
 assert.equal(anchor.href,'./freeze-breaker.html');
 assert.equal(h.store.size,1);
 assert.doesNotMatch([...h.store.values()].join(''),'My raw speech transcript');
 h.ui.render({...CTX,outcome:'spoken'});
 assert.equal(get(h,'diagnosisPanel').hidden,true);
});
test('records are bounded, account-separated and protected while auth owner changes',()=>{
 const h=harness();
 h.ui.render(CTX);
 get(h,'diagnosisChoices').children[2].click();
 const guest=h.store.get('speakingym-sprint-reasons-v1:guest');
 assert.match(guest,/"retrieval"/);
 h.window.speakingymAccount={isLoggedIn:()=>true,getUid:()=> 'userA'};
 h.events['speakingym:account-changing']();
 assert.equal(get(h,'diagnosisPanel').hidden,true);
 h.ui.render(CTX);
 assert.equal(get(h,'diagnosisPanel').hidden,true,'unverified account owner cannot write');
 h.localStorage.setItem('speakingym-account-owner-v1','userA');
 h.ui.render(CTX);
 assert.equal(get(h,'diagnosisPanel').hidden,false);
 assert.equal(get(h,'diagnosisChoices').children[2].attrs['aria-pressed'],'false','guest reason never leaks to signed-in user');
 get(h,'diagnosisChoices').children[1].click();
 assert.match(h.store.get('speakingym-sprint-reasons-v1:user:userA'),/"structure"/);
 assert.equal(h.store.get('speakingym-sprint-reasons-v1:guest'),guest);
 h.ui.clearHistory();
 assert.equal(h.store.has('speakingym-sprint-reasons-v1:user:userA'),false);
 assert.equal(h.store.get('speakingym-sprint-reasons-v1:guest'),guest);
});
test('malformed storage and invalid session identities fail closed',()=>{
 const h=harness({'speakingym-sprint-reasons-v1:guest':'{broken'});
 assert.doesNotThrow(()=>h.ui.render(CTX));
 get(h,'diagnosisChoices').children[5].click();
 assert.match(h.store.get('speakingym-sprint-reasons-v1:guest'),/"other"/);
 h.ui.render({...CTX,date:'bad;date'});
 assert.equal(get(h,'diagnosisPanel').hidden,true);
 h.ui.render({...CTX,cardId:'<script>'});
 assert.equal(get(h,'diagnosisPanel').hidden,true);
 h.ui.render({...CTX,index:9000});
 assert.equal(get(h,'diagnosisPanel').hidden,true);
});
test('reason is removable without erasing existing sprint history',()=>{
 const h=harness({'speakingym-reflex-history-v1':'[{"date":"old"}]'});
 h.ui.render(CTX);
 get(h,'diagnosisChoices').children[3].click();
 assert.equal(get(h,'diagnosisSummary').hidden,false);
 get(h,'diagnosisResult').children[3].click();
 assert.equal(h.store.get('speakingym-sprint-reasons-v1:guest'),'[]');
 assert.equal(h.store.get('speakingym-reflex-history-v1'),'[{"date":"old"}]');
});
test('existing sprint review integrates diagnosis with no new AI calls or quota mutations',()=>{
 assert.match(html,/src="\.\/sprint-diagnosis\.js"/);
 assert.match(html,/id="diagnosisChoices"/);
 assert.match(html,/id="diagnosisSummary"/);
 assert.match(html,/speakingymSprintDiagnosis\?\.render\(\{date:reviewSession\.date,index:reviewIndex,cardId:card\.id,outcome:item\.outcome\}\)/);
 assert.match(html,/speakingymSprintDiagnosis\?\.clearHistory\(\)/);
 assert.match(html,/new URLSearchParams\(window\.location\.search\)\.get\("mode"\)/);
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|gemini|AIza/);
});
