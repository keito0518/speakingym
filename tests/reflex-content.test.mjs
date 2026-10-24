import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../reflex.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const data=vm.runInNewContext(script.slice(script.indexOf('const cards='),script.indexOf('const deck='))+';cards.flatMap(card=>["easy","standard","challenge"].map(level=>({id:card.id,level,...taskFor(card,level)})))');
test('all cards and levels have three distinct, nonempty model answers',()=>{
 assert.equal(data.length,453);
 for(const card of data){
  const answers=[card.quick,card.sample,card.polite];
  assert.ok(answers.every(x=>typeof x==='string'&&x.trim().length>0),card.id+'/'+card.level);
  assert.equal(new Set(answers.map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,''))).size,3,card.id+'/'+card.level);
 }
});
test('every level has a meaningful prompt; advanced prompts are English',()=>{
 for(const card of data){
  assert.ok(typeof card.situation==='string'&&card.situation.trim().length>0,card.id+'/'+card.level);
  assert.ok(typeof card.challenge==='string'&&card.challenge.trim().length>0,card.id+'/'+card.level);
  if(card.level==='challenge')assert.doesNotMatch(card.situation+card.challenge,/[\u3040-\u30ff\u3400-\u9fff]/);
 }
});
test('all 151 cards are reachable through one of the four category filters',()=>{
 const cards=vm.runInNewContext(script.slice(script.indexOf('const cards='),script.indexOf('const deck='))+';cards');
 for(const c of cards)assert.ok(['repair','hold','boundaries','connect'].includes(c.group),c.id);
 for(const group of ['repair','hold','boundaries','connect'])assert.ok(cards.filter(c=>c.group===group).length>=25);
});

test('different questions never reuse an entire model-answer set at the same level',()=>{
 for(const level of ['easy','standard','challenge']){const seen=new Map();for(const c of data.filter(c=>c.level===level)){const key=[c.quick,c.sample,c.polite].map(t=>t.toLowerCase().replace(/[^a-z0-9]/g,'')).join('|');assert.ok(!seen.has(key),c.id+' duplicates '+seen.get(key));seen.set(key,c.id)}}
});

test('new sprint front-loads unpracticed prompts without permanently removing recent questions',()=>{
 const fn=script.slice(script.indexOf('function orderPracticeDeck('),script.indexOf('function pane('));
 assert.match(script,/historySessions\(\)\.flatMap\(s=>s\.attempts\.map\(a=>a\.cardId\)\)\.slice\(0,12\)/);
 const order=new Function('shuffle',fn+';return orderPracticeDeck')((cards)=>[...cards]);
 const pool=[{id:'old-1'},{id:'fresh-1'},{id:'old-2'},{id:'fresh-2'}];
 const sorted=order(pool,['old-1','old-2']);
 assert.deepEqual(Array.from(sorted,x=>x.id),['fresh-1','fresh-2','old-1','old-2']);
 assert.equal(sorted.length,pool.length,'nothing is removed from the deck');
 assert.equal(order(pool,[]).length,pool.length);
 assert.deepEqual(Array.from(order([{id:'one'}],['one']),x=>x.id),['one']);
});
