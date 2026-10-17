import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../reflex.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const data=vm.runInNewContext(script.slice(script.indexOf('const cards='),script.indexOf('const deck='))+';cards.flatMap(card=>["easy","standard","challenge"].map(level=>({id:card.id,level,...taskFor(card,level)})))');
test('all cards and levels have three distinct, nonempty model answers',()=>{
 assert.equal(data.length,300);
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
test('all 100 cards are reachable through one of the four category filters',()=>{
 const cards=vm.runInNewContext(script.slice(script.indexOf('const cards='),script.indexOf('const deck='))+';cards');
 for(const c of cards)assert.ok(['repair','hold','boundaries','connect'].includes(c.group),c.id);
 for(const group of ['repair','hold','boundaries','connect'])assert.equal(cards.filter(c=>c.group===group).length,25);
});
