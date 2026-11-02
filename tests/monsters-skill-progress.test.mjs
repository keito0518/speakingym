import test from 'node:test';
import assert from 'node:assert/strict';
import {createSave,validateSave,recordAnswer} from '../prototype/speakingym-monsters/monster-engine.js';
import {SKILL_KINDS,skillProgressFor,skillFocusPrompts,sanitizeSkillAttempts} from '../prototype/speakingym-monsters/skill-progress.js';
import {ALL_PROMPTS} from '../prototype/speakingym-monsters/monster-data.js';

test('four skills use real answers, not a guessed legacy speaking accuracy',()=>{
 let save=createSave();
 assert.deepEqual(skillProgressFor(save,'2026-11-01').map(x=>[x.kind,x.sample,x.percent]),SKILL_KINDS.map(kind=>[kind,0,null]));
 const speak=ALL_PROMPTS.find(p=>p.kind==='speak'&&!p.bossOnly);
 const listen=ALL_PROMPTS.find(p=>p.kind==='listen'&&!p.bossOnly);
 const vocab=ALL_PROMPTS.find(p=>p.kind==='vocab'&&!p.bossOnly);
 const grammar=ALL_PROMPTS.find(p=>p.kind==='grammar'&&!p.bossOnly);
 for(const [prompt,rating] of [[speak,'smooth'],[listen,'hint'],[vocab,'again'],[grammar,'smooth']]){
  assert.ok(prompt);
  save=recordAnswer(save,prompt.id,rating,'2026-11-01').save;
 }
 const stats=skillProgressFor(save,'2026-11-01');
 assert.deepEqual(stats.map(s=>[s.sample,s.independent,s.assisted]),[[1,1,0],[1,0,1],[1,0,0],[1,1,0]]);
 assert.deepEqual(stats.map(s=>s.percent),[100,0,0,100]);
 assert.ok(stats.find(s=>s.kind==='vocab').needsReview>=1);
 const restored=validateSave(save);
 assert.deepEqual(restored.skillAttempts,save.skillAttempts);
 assert.equal(validateSave(createSave()).skillAttempts.speak.length,0);
});
test('legacy retention milestones survive and are not invented from historical answer totals',()=>{
 let save=createSave();
 save.totalAnswers=320;
 save.retention={'think-cafe':{stage:3,lastDay:'2026-10-28',nextDay:'2026-11-01'}};
 let rows=skillProgressFor(save,'2026-11-03');
 const speak=rows.find(r=>r.kind==='speak');
 assert.equal(speak.spaced,1);
 assert.equal(speak.needsReview,1);
 assert.equal(speak.sample,0);
 assert.equal(speak.percent,null);
});
test('recent evidence is bounded to 20, tied to vetted prompt kind and requires valid days',()=>{
 const id=ALL_PROMPTS.find(p=>p.kind==='speak').id;
 const bad={speak:[{id,day:'no',rating:'smooth'},{id,day:'2026-11-01',rating:'madeup'},...Array.from({length:30},()=>({id,day:'2026-11-01',rating:'smooth'}))],listen:[{id,day:'2026-11-01',rating:'smooth'}],invalid:[{id,day:'2026-11-01',rating:'smooth'}]};
 const clean=sanitizeSkillAttempts(bad);
 assert.deepEqual(Object.keys(clean),SKILL_KINDS);
 assert.equal(clean.speak.length,20);
 assert.equal(clean.listen.length,0);
 assert.equal(validateSave({...createSave(),skillAttempts:bad}).skillAttempts.speak.length,20);
});
test('every skill has authored questions at every level with due priority',()=>{
 for(const difficulty of ['easy','normal','hard']){
  for(const kind of SKILL_KINDS){
   const save=createSave();
   const initial=skillFocusPrompts(save,kind,{difficulty,today:'2026-11-03'});
   assert.ok(initial.length>0,kind+' '+difficulty);
   assert.ok(initial.length<=6);
   assert.equal(new Set(initial.map(p=>p.baseId||p.id)).size,initial.length);
   assert.ok(initial.every(p=>p.kind===kind&& (p.difficulty||'easy')===difficulty));
   const picked=initial[initial.length-1];
   save.reviewPrompts[picked.id]='2026-11-02';
   const next=skillFocusPrompts(save,kind,{difficulty,today:'2026-11-03'});
   assert.equal(next[0].id,picked.id);
  }
 }
});
