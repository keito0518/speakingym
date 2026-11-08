import test from 'node:test';
import assert from 'node:assert/strict';
import {createSave,validateSave,recordAnswer} from '../prototype/speakingym-monsters/monster-engine.js';
import {SKILL_KINDS,skillProgressFor,skillFocusPrompts,nextSkillFocusFor,improvementHighlightsFor,earnedImprovementFor,appendSkillAttempt,sanitizeSkillAttempts} from '../prototype/speakingym-monsters/skill-progress.js';
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
test('speaking progress reports microphone transcript evidence separately from typed correctness',()=>{
 const prompt=ALL_PROMPTS.find(p=>p.kind==='speak'&&!p.bossOnly);
 let save=createSave();
 save=recordAnswer(save,prompt.id,'smooth','2026-11-04','microphone').save;
 save=recordAnswer(save,prompt.id,'smooth','2026-11-04','keyboard').save;
 save=recordAnswer(save,prompt.id,'hint','2026-11-04').save;
 let speech=skillProgressFor(save,'2026-11-04').find(row=>row.kind==='speak');
 assert.deepEqual([speech.sample,speech.independent,speech.microphone,speech.keyboard],[3,2,1,1]);
 const restored=validateSave(save);
 speech=skillProgressFor(restored,'2026-11-04').find(row=>row.kind==='speak');
 assert.equal(speech.microphone,1);
 assert.equal(speech.keyboard,1);
 const malformed=sanitizeSkillAttempts({speak:[{id:prompt.id,day:'2026-11-04',rating:'smooth',inputSource:'pretend-voice'}]});
 assert.equal(malformed.speak[0].inputSource,'unknown','Unrecognized source cannot impersonate a microphone result');
});
test('before/after highlights require the same question on different days with a later independent success',()=>{
 const prompt=ALL_PROMPTS.find(p=>p.kind==='speak'&&!p.bossOnly);
 let save=createSave();
 assert.deepEqual(improvementHighlightsFor(save,{today:'2026-11-08'}),[]);
 save.skillAttempts=appendSkillAttempt(save.skillAttempts,prompt,'again','2026-11-05');
 save.skillAttempts=appendSkillAttempt(save.skillAttempts,prompt,'smooth','2026-11-05','microphone');
 assert.deepEqual(improvementHighlightsFor(save,{today:'2026-11-08'}),[], 'Same-day retries are not spaced growth');
 save.skillAttempts=appendSkillAttempt(save.skillAttempts,prompt,'smooth','2026-11-08','keyboard');
 const wins=improvementHighlightsFor(validateSave(save),{today:'2026-11-08'});
 assert.equal(wins.length,1);
 assert.deepEqual([wins[0].id,wins[0].before,wins[0].previousDay,wins[0].afterDay,wins[0].inputSource],
  [prompt.id,'again','2026-11-05','2026-11-08','keyboard']);
 assert.equal(wins[0].expression,prompt.answer);
 assert.deepEqual(improvementHighlightsFor(save,{today:'2026-11-07'}),[], 'Future answers do not count yet');
 save.skillAttempts=appendSkillAttempt(save.skillAttempts,prompt,'again','2026-11-08');
 assert.deepEqual(improvementHighlightsFor(save,{today:'2026-11-08'}),[], 'A later miss revokes the claimed win');
});
test('before/after highlights distinguish listening evidence, hint use and malformed imports',()=>{
 const listen=ALL_PROMPTS.find(p=>p.kind==='listen'&&!p.bossOnly);
 const vocab=ALL_PROMPTS.find(p=>p.kind==='vocab'&&!p.bossOnly);
 const grammar=ALL_PROMPTS.find(p=>p.kind==='grammar'&&!p.bossOnly);
 let save=createSave();
 for(const prompt of [listen,vocab,grammar]){
  save.skillAttempts=appendSkillAttempt(save.skillAttempts,prompt,'hint','2026-11-04');
  save.skillAttempts=appendSkillAttempt(save.skillAttempts,prompt,'smooth','2026-11-07');
 }
 let wins=improvementHighlightsFor(save,{today:'2026-11-08',limit:2});
 assert.equal(wins.length,2);
 assert.ok(wins.every(row=>row.before==='hint'&&row.expression===''));
 assert.ok(wins.every(row=>row.kind!=='speak'));
 assert.throws(()=>improvementHighlightsFor(save,{today:'2026-11-08',limit:0}),/Invalid improvement/);
 const malformed=validateSave({...save,skillAttempts:{listen:[{id:'injected',day:'2026-11-04',rating:'again'},{id:'injected',day:'2026-11-08',rating:'smooth'}]}});
 assert.deepEqual(improvementHighlightsFor(malformed,{today:'2026-11-08'}),[]);
});

test('the immediate growth badge is earned once by this exact spaced, unassisted answer',()=>{
 const prompt=ALL_PROMPTS.find(p=>p.kind==='speak'&&!p.bossOnly);
 const other=ALL_PROMPTS.find(p=>p.kind==='listen'&&!p.bossOnly);
 const fresh=createSave();
 const first=recordAnswer(fresh,prompt.id,'smooth','2026-11-08','keyboard').save;
 assert.equal(earnedImprovementFor(fresh,first,prompt.id,'2026-11-08'),null,'First-time success is not an improvement claim');
 let before=recordAnswer(fresh,prompt.id,'hint','2026-11-07','keyboard').save;
 let after=recordAnswer(before,prompt.id,'smooth','2026-11-08','keyboard').save;
 const win=earnedImprovementFor(before,after,prompt.id,'2026-11-08');
 assert.ok(win);
 assert.deepEqual([win.before,win.afterDay,win.inputSource],['hint','2026-11-08','keyboard']);
 assert.equal(earnedImprovementFor(before,after,other.id,'2026-11-08'),null,'Another task cannot claim this win');
 assert.equal(earnedImprovementFor(after,after,prompt.id,'2026-11-08'),null,'Reload or repeated rendering grants no new win');
 const repeated=recordAnswer(after,prompt.id,'smooth','2026-11-08','keyboard').save;
 assert.equal(earnedImprovementFor(after,repeated,prompt.id,'2026-11-08'),null,'Repeating a win the same day has no new badge');
 before=recordAnswer(fresh,prompt.id,'hint','2026-11-08','keyboard').save;
 after=recordAnswer(before,prompt.id,'smooth','2026-11-08','keyboard').save;
 assert.equal(earnedImprovementFor(before,after,prompt.id,'2026-11-08'),null,'Same-day retry is not spaced improvement');
 const assisted=recordAnswer(before,prompt.id,'hint','2026-11-09','keyboard').save;
 assert.equal(earnedImprovementFor(before,assisted,prompt.id,'2026-11-09'),null,'Hint-dependent answers cannot earn a win');
 assert.equal(earnedImprovementFor(before,after,prompt.id,'bad-date'),null);
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

test('learning focus never calls a fresh skill weak and respects the selected difficulty',()=>{
 const save=createSave();
 assert.equal(nextSkillFocusFor(save,{difficulty:'easy',today:'2026-11-03'}),null);
 // A single failed question is not enough evidence for a weak skill.
 const grammar=ALL_PROMPTS.filter(p=>p.kind==='grammar'&&!p.bossOnly&&(p.difficulty||'easy')==='easy');
 assert.ok(grammar.length>=2);
 save.skillAttempts=appendSkillAttempt(save.skillAttempts,grammar[0],'hint','2026-11-01');
 assert.equal(nextSkillFocusFor(save,{difficulty:'easy',today:'2026-11-03'}),null);
 for(const [prompt,rating] of [[grammar[1],'hint'],[grammar[0],'smooth'],[grammar[1],'hint']]){
  save.skillAttempts=appendSkillAttempt(save.skillAttempts,prompt,rating,'2026-11-02');
 }
 const focus=nextSkillFocusFor(save,{difficulty:'easy',today:'2026-11-03'});
 assert.equal(focus.kind,'grammar');
 assert.equal(focus.reason,'needs-practice');
 assert.match(focus.detail,/直近4回答/);
 assert.equal(nextSkillFocusFor(save,{difficulty:'hard',today:'2026-11-03'}),null,
  'Easy-level attempts cannot become a hard-level weakness score');
});
test('due work wins over weak-rate guesses and a daily plan includes the selected skill',async()=>{
 const {dailyTrainingPlan}=await import('../prototype/speakingym-monsters/daily-training.js');
 const {nextLearningQuestFor}=await import('../prototype/speakingym-monsters/next-learning-quest.js');
 const save=createSave(),day='2026-11-03';
 const grammar=ALL_PROMPTS.filter(p=>p.kind==='grammar'&&!p.bossOnly&&(p.difficulty||'easy')==='easy');
 for(let i=0;i<6;i++)save.skillAttempts=appendSkillAttempt(save.skillAttempts,grammar[i%2],'hint','2026-11-01');
 const focus=nextSkillFocusFor(save,{difficulty:'easy',today:day});
 assert.equal(focus.kind,'grammar');
 const plan=dailyTrainingPlan(save,{difficulty:'easy',today:day});
 assert.ok(plan.prompts.some(p=>p.kind==='grammar'),'Daily practice must give the flagged skill a real question');
 assert.equal(plan.prompts.length,8);
 assert.equal(plan.focus?.kind,'grammar');
 const quest=nextLearningQuestFor(save,day);
 assert.equal(quest.action,'skill-focus:grammar');
 assert.match(quest.button,/文法/);
 const due=ALL_PROMPTS.find(p=>p.kind==='listen'&&(p.difficulty||'easy')==='easy'&&!p.bossOnly);
 save.reviewPrompts[due.id]='2026-11-02';
 const urgent=nextSkillFocusFor(save,{difficulty:'easy',today:day});
 assert.equal(urgent.kind,'listen');
 assert.equal(urgent.reason,'due');
 assert.ok(skillFocusPrompts(save,'listen',{difficulty:'easy',today:day})[0].id===due.id);
});
