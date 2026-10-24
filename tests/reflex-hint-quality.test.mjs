import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../reflex.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'sprint inline script must be present');
const data=script.slice(script.indexOf('const cards='),script.indexOf('const deck='));
const cards=vm.runInNewContext(data+';cards');

test('all 151 challenge cards have unique IDs, useful non-placeholder learning hints',()=>{
 assert.equal(cards.length,151);
 assert.equal(new Set(cards.map(c=>c.id)).size,151);
 const generic=/短く自然に伝えてみよう|短い一言でもOK。自分の言葉で言ってみよう/;
 for(const card of cards){
  assert.ok(typeof card.hint==='string'&&card.hint.trim().length>=16,card.id+' hint is missing');
  assert.doesNotMatch(card.hint,generic,card.id+' has generic hint');
  assert.ok(typeof card.sample==='string'&&card.sample.trim(),card.id+' sample missing');
  const norm=x=>x.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
  const fullAnswer=norm(card.sample);
  if(fullAnswer.length>=12)assert.ok(!norm(card.hint).includes(fullAnswer),card.id+' hint reveals the whole example');
 }
 assert.ok(new Set(cards.map(c=>c.hint)).size>=140,'hints should be specific, not recycled for every question');
});

test('sprint optionally reveals one contextual hint, hides it again for each new challenge',()=>{
 assert.match(html,/<details id="hintPanel"[^>]*>/);
 assert.match(html,/<summary[^>]*>💡 まず自分で答えて、困ったらヒントを見る<\/summary>/);
 assert.match(html,/<p id="hintText"/);
 assert.match(script,/\$\("hintText"\)\.textContent=current\.hint/);
 assert.match(script,/\$\("hintPanel"\)\.open=false/);
 assert.match(html,/短い一文でも意図が伝わればOK。例文は終了後に公開/);
 assert.doesNotMatch(html,/<p id="hintText"[^>]*>[^<]+<\/p>/,'do not leak model answers into static HTML');
});

test('boarding-gate question requests the new gate number, not only whether gate changed',()=>{
 const card=cards.find(c=>c.id==='practical23');
 assert.ok(card);
 assert.match(card.challenge,/搭乗口/);
 assert.match(card.sample,/new gate number/);
 assert.doesNotMatch(card.sample,/Has the gate.*changed/);
 const task=vm.runInNewContext(data+';taskFor(cards.find(c=>c.id==="practical23"),"standard")');
 assert.match(task.sample,/new gate number/);
 const advanced=vm.runInNewContext(data+';taskFor(cards.find(c=>c.id==="practical23"),"challenge")');
 assert.match(advanced.quick,/Which gate is correct/);
});

test('learning cues for practical questions match the actual worked examples',()=>{
 const pairs=[
  ['practical6',/How did you two meet/],
  ['practical8',/go your way/],
  ['practical20',/cooling/],
  ['practical26',/stop at/],
  ['practical28',/near here/],
  ['practical32',/call me back/],
  ['practical37',/finished most/],
  ['practical40',/prefer to/],
  ['practical44',/looks like/],
  ['practical46',/reply sooner/],
  ['practical48',/but I can/]
 ];
 for(const [id,re] of pairs){
  const card=cards.find(c=>c.id===id);
  assert.ok(card,id+' missing');
  assert.match(card.hint,re,id+' hint must teach from the example');
  const standard=vm.runInNewContext(data+';taskFor(cards.find(c=>c.id="'+id+'"),"standard")');
  assert.match(standard.improve,re,id+' review advice should match the example');
 }
});
