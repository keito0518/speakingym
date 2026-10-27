import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PROMPTS, MONSTERS, PHRASES, PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { cleanForest, FOREST_ROUTES, FOREST_STAGES, FOREST_RELICS, finishForest, getForestPrompts } from '../prototype/speakingym-monsters/forest-engine.js';
import { forestWorldArt } from '../prototype/speakingym-monsters/forest-world.js';
import { buildForestWave, forestLevel, DIFFICULTY_TRIES, opponentFor, FOREST_WAVE_LENGTH, REGULAR_ENCOUNTERS, BOSS_HITS, specialStrike, FOREST_TACTICS, enemyTacticFor } from '../prototype/speakingym-monsters/forest-battle.js';
import { enemyArt } from '../prototype/speakingym-monsters/forest-enemies.js';
import { gradeLocalResponse } from '../prototype/speakingym-monsters/monster-grader.js';
import { DIFFICULTIES, EVOLUTION_XP, STORAGE_KEY, addDays, chooseDifficulty, compareWithExamples, createSave, feedMonster, finishRound, getMonsterProgress, learningSummary, reviewOverview, masteryLevel, normalizeEnglish, recordAnswer, flagUncertainReview, selectMonster, selectRoundPrompts, validateSave } from '../prototype/speakingym-monsters/monster-engine.js';

const rate = (save, promptId, rating = 'smooth', date = '2026-10-26') => recordAnswer(save, promptId, rating, date);

test('curriculum retains 156 speaking exercises and includes 36 forest quizzes', () => {
  assert.equal(PHRASES.length,16);assert.equal(PROMPTS.length,52);assert.equal(MONSTERS.length,9);
  assert.deepEqual(DIFFICULTIES,['easy','normal','hard']);
  assert.equal(ALL_PROMPTS.length,192);
  for(const difficulty of ['normal','hard']) {
    const level=ALL_PROMPTS.filter(p=>p.difficulty===difficulty);
    assert.equal(level.length,64);
    assert.equal(new Set(level.map(p=>p.id)).size,64);
    assert.ok(level.every(p=>p.task&&p.hint&&p.tip&&['speak','listen','read','vocab','grammar'].includes(p.kind)));
    assert.equal(level.filter(p=>p.kind==='vocab').length,6);
    assert.equal(level.filter(p=>p.kind==='grammar').length,6);
    assert.ok(level.filter(p=>p.kind==='listen').length>=8);
    assert.ok(level.filter(p=>p.kind==='read').length>=8);
    assert.ok(level.every(p=>[...p.cue+p.task].every(char=>char.charCodeAt(0)<128)));
    assert.ok(level.every(p=>['vocab','grammar'].includes(p.kind)||PROMPTS.some(e=>e.id===p.baseId&&e.phraseId===p.phraseId)));
  }
  const averageLength = level => ALL_PROMPTS.filter(p=>p.difficulty===level).reduce((sum,p)=>sum+p.cue.length+p.task.length,0)/64;
  assert.ok(averageLength('hard')>averageLength('normal')*1.1);
  assert.equal(new Set(PROMPTS.map(p => p.id)).size,52);
  assert.equal(new Set(MONSTERS.map(m => m.id)).size,MONSTERS.length);
  assert.ok(MONSTERS.every(monster=>monster.name&&monster.kind&&monster.note));
  assert.ok(MONSTERS.every(monster => /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(monster.name) && monster.japaneseName && monster.evolvedName));
  assert.equal(new Set(MONSTERS.map(monster=>monster.name)).size,MONSTERS.length);
  assert.ok(MONSTERS.every(monster => monster.roots.length>=1 && monster.roots.every(root=>root.word&&root.meaning)));
  assert.ok(MONSTERS.every(monster => monster.skill?.name && monster.skill?.description));
  assert.deepEqual(MONSTERS.find(monster=>monster.id==='medamago').roots.map(root=>root.word),['yolk','sunny-side up']);
  for(const phrase of PHRASES) {
    assert.equal(PROMPTS.filter(prompt=>prompt.phraseId===phrase.id).length,phrase.id==='think'||['repeat','agree','late','clarify','prefer'].includes(phrase.id)?2:4);
    assert.ok(phrase.hint&&phrase.tip);
  }
  for(const prompt of PROMPTS) {assert.ok(prompt.scene&&prompt.cue&&prompt.answer);if(prompt.kind==='listen')assert.ok(prompt.audio);}
});

test('every reading encounter has an authored passage, including higher difficulty levels', () => {
  const reading=ALL_PROMPTS.filter(prompt=>prompt.kind==='read');
  assert.ok(reading.length>=24);
  for(const prompt of reading) {
    assert.ok(typeof prompt.readText==='string' && prompt.readText.length>=30, `Missing passage for ${prompt.id}`);
    assert.ok(prompt.answer && prompt.phraseId);
    assert.ok(!prompt.readText.includes('<script') && !prompt.readText.includes('<img') && !prompt.readText.includes('http://') && !prompt.readText.includes('https://'));
  }
  for(const level of ['normal','hard']) {
    const set=reading.filter(prompt=>prompt.difficulty===level);
    assert.ok(set.length>=8);
    for(const prompt of set) {
      const simpler=ALL_PROMPTS.find(other=>other.id===prompt.baseId);
      assert.ok(simpler?.readText);
      assert.notEqual(prompt.readText,simpler.readText,`Difficulty passage was duplicated for ${prompt.id}`);
    }
  }
});

test('the illustrated adventure scene has distinct accessible route art and stable landmarks', () => {
  const before=forestWorldArt();
  const moss=forestWorldArt('moss');
  const sun=forestWorldArt('sunlit');
  for(const svg of [before,moss,sun]){
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.endsWith('</svg>'));
    assert.equal((svg.match(/forest-landmark/g)||[]).length,3);
    assert.match(svg,/viewBox="0 0 720 270"/);
    assert.match(svg,/aria-label="深い森/);
    assert.ok(!/https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')));
  }
  assert.match(moss,/forest-world-moss/);
  assert.match(sun,/forest-world-sunlit/);
  assert.notEqual(moss,sun);
});
test('randomized 5-mob + three-hit boss wave: varied tasks and escalating endless difficulty',()=>{
 assert.equal(REGULAR_ENCOUNTERS,5);
 assert.equal(BOSS_HITS,3);
 assert.equal(FOREST_WAVE_LENGTH,8);
 assert.deepEqual(DIFFICULTY_TRIES,{easy:3,normal:2,hard:1});
 const a=buildForestWave({difficulty:'easy',wave:1,random:()=>.99});
 const b=buildForestWave({difficulty:'easy',wave:1,random:()=>0});
 assert.equal(a.prompts.length,8);
 assert.equal(new Set(a.prompts.map(x=>x.id)).size,8);
 assert.notDeepEqual(a.prompts.map(x=>x.id),b.prompts.map(x=>x.id));
 assert.ok(a.prompts.every(x=>!x.difficulty||x.difficulty==='easy'));
 assert.ok(a.prompts.some(x=>x.kind==='listen'));
 assert.ok(a.prompts.some(x=>x.kind==='vocab'));
 assert.ok(a.prompts.some(x=>x.kind==='grammar'));
 assert.equal(a.prompts[5].kind,'listen');
 assert.equal(a.prompts[6].kind,'grammar');
 assert.equal(a.prompts[7].kind,'speak');
 assert.ok(new Set(a.prompts.map(x=>x.phraseId)).size>=7);
 assert.ok(new Set(a.prompts.map(x=>x.phraseId)).size>=6);
 assert.equal(forestLevel('easy',1),'easy');
 assert.equal(forestLevel('easy',2),'easy');
 assert.equal(forestLevel('easy',3),'normal');
 assert.equal(forestLevel('easy',5),'hard');
 assert.equal(forestLevel('normal',3),'hard');
 assert.equal(forestLevel('hard',100),'hard');
 const boosted=buildForestWave({difficulty:'easy',wave:3,previousIds:a.prompts.map(x=>x.id),random:()=>0.2});
 assert.equal(boosted.level,'normal');
 assert.ok(boosted.prompts.every(x=>x.difficulty==='normal'));
 const reviewWave=buildForestWave({difficulty:'easy',wave:2,reviewPhraseIds:['booking','price'],random:()=>0.31});
 assert.ok(reviewWave.prompts.some(p=>p.phraseId==='booking'));
 assert.ok(reviewWave.prompts.some(p=>p.phraseId==='price'));
 assert.ok(reviewWave.prompts.some(p=>p.kind==='listen'));
 assert.ok(reviewWave.prompts.some(p=>p.kind==='vocab'));
 assert.ok(reviewWave.prompts.some(p=>p.kind==='grammar'));
 assert.equal(opponentFor(0,1).id,'mossling');
 assert.equal(opponentFor(4,1).id,'mothum');
 assert.equal(opponentFor(5,1).id,'thornking');
 assert.match(enemyArt('thornking'),/<svg/);
 for(let i=0;i<5;i++)assert.match(enemyArt(opponentFor(i).id),/forest-enemy-svg/);
 assert.deepEqual(specialStrike({companionId:'medamago',evolved:true,boss:true}),{strikes:2,ability:'DOUBLE YOLK',usedPower:true});
 assert.equal(specialStrike({companionId:'medamago',evolved:true,boss:true,usedPower:true}).strikes,1);
 assert.equal(specialStrike({companionId:'katappo',evolved:true,boss:true}).strikes,1);
 assert.throws(()=>forestLevel('extreme'),/Invalid/);
});
test('Speaking Forest is three authored speaking gates across all difficulty levels', () => {
  assert.equal(FOREST_STAGES.length,3);
  assert.equal(FOREST_ROUTES.length,2);
  const start=createSave();
  for(const level of DIFFICULTIES){
    const prompts=getForestPrompts(start,level);
    assert.equal(prompts.length,3);
    assert.equal(new Set(prompts.map(x=>x.phraseId)).size,3);
    assert.deepEqual(prompts.map(x=>x.phraseId),['think','repeat','prefer']);
    assert.ok(prompts.every(x=>(x.difficulty||'easy')===level));
  }
  assert.deepEqual(getForestPrompts(start,'easy').map(x=>x.id),['think-cafe','repeat-station','prefer-city']);
  assert.deepEqual(getForestPrompts({...start,forest:{clears:1}},'easy').map(x=>x.id),['think-trip','repeat-class','prefer-friend']);
  assert.throws(()=>getForestPrompts(start,'expert'),/Invalid forest difficulty/);
});
test('Forest stamp unlocks only on full route completion; evolved companions find extra cosmetic relics', () => {
  const initial=createSave();
  assert.deepEqual(cleanForest(null),{clears:0,bestWave:0,routes:[],relics:[]});
  assert.throws(()=>finishForest(initial,'unknown','medamago'),/Invalid forest route/);
  assert.throws(()=>finishForest(initial,'moss','katappo'),/not owned/);
  const one=finishForest(initial,'sunlit','medamago');
  assert.equal(one.save.forest.clears,1);
  assert.deepEqual(one.discovered,['sunlit-leaf']);
  assert.deepEqual(initial.forest.relics,[]);
  assert.equal(one.save.xpWallet,0);
  const repeated=finishForest(one.save,'sunlit','medamago');
  assert.equal(repeated.save.forest.clears,2);
  assert.deepEqual(repeated.discovered,[]);
  const two=finishForest(repeated.save,'moss','medamago');
  assert.deepEqual(two.save.forest.routes,['sunlit','moss']);
  assert.deepEqual(two.discovered,['moss-lantern']);
  assert.equal(two.save.xpWallet,0);
  const evolved={...two.save,monsterXp:{...two.save.monsterXp,medamago:160}};
  const secret=finishForest(evolved,'sunlit','medamago');
  assert.deepEqual(secret.discovered,['golden-yolk']);
  assert.equal(secret.save.forest.relics.length,3);
  const soxie={...initial,ownedMonsters:['medamago','katappo'],monsterXp:{medamago:0,katappo:160}};
  assert.deepEqual(finishForest(soxie,'moss','katappo').discovered,['moss-lantern','lost-button']);
  assert.equal(FOREST_RELICS['lost-button'].name,'Lost Button');
});
test('Forest souvenirs persist when old saves are loaded without a forest field', () => {
 const initial=createSave();
 assert.deepEqual(validateSave({...initial,forest:undefined}).forest,cleanForest(null));
 const completed=finishForest(initial,'sunlit','medamago').save;
 assert.deepEqual(validateSave(completed).forest,completed.forest);
 const polluted=validateSave({...completed,forest:{clears:-1,relics:['sunlit-leaf','x','sunlit-leaf'],routes:['sunlit','bad']}});
 assert.deepEqual(polluted.forest,{clears:0,bestWave:0,relics:['sunlit-leaf'],routes:['sunlit']});
});

test('fresh save has a fried-egg companion and does not call account or AI APIs', () => {
  const save=createSave();
  assert.equal(STORAGE_KEY,'speakingym-monsters-prototype-v1');
  assert.deepEqual(save.ownedMonsters,['medamago']);assert.equal(save.selectedMonster,'medamago');
  assert.equal(save.xpWallet,0);
  assert.equal(save.difficulty,'easy');
  assert.equal(learningSummary(save,'2026-10-26').independent,0);
  assert.deepEqual(validateSave(save),save);
});

test('study journal accurately summarizes due, upcoming and learned expressions',()=>{
  const initial=createSave();
  const empty=reviewOverview(initial,'2026-10-27');
  assert.equal(empty.due.length,0);
  assert.equal(empty.upcoming.length,0);
  assert.equal(empty.learned,0);
  assert.equal(empty.mastered,0);
  assert.equal(empty.total,PHRASES.length);
  let save=recordAnswer(initial,'think-cafe','smooth','2026-10-26').save;
  save=flagUncertainReview(save,'help-bag','2026-10-26');
  save=flagUncertainReview(save,'help-form','2026-10-26');
  save=flagUncertainReview(save,'booking-table','2026-10-27');
  const now=reviewOverview(save,'2026-10-27');
  assert.equal(now.due.length,1);
  assert.equal(now.due[0].phraseId,'help');
  assert.equal(now.upcoming.length,2);
  assert.equal(now.learned,1);
  assert.equal(now.mastered,0);
  assert.ok(now.scheduled.every((item,i,array)=>i===0||item.due>=array[i-1].due));
  assert.deepEqual(save.reviewPrompts['booking-table'],'2026-10-28');
  assert.equal(learningSummary(save,'2026-10-27').reviewCount,1);
  const later=reviewOverview(save,'2026-10-30');
  assert.equal(later.due.length,3);
});
test('enemy identity determines which English skill appears at each of five mob gates',()=>{
  for(const difficulty of DIFFICULTIES){
    for(const wave of [1,2,3]){
      const picked=buildForestWave({difficulty,wave,random:()=>0.31});
      for(let i=0;i<REGULAR_ENCOUNTERS;i++){
        const tactic=enemyTacticFor(i,wave);
        assert.equal(picked.prompts[i].kind,tactic.preferredKind,
          `Wave ${wave} foe ${opponentFor(i,wave).id} did not receive ${tactic.preferredKind}`);
      }
      assert.equal(picked.prompts.length,FOREST_WAVE_LENGTH);
      assert.equal(new Set(picked.prompts.map(p=>p.id)).size,FOREST_WAVE_LENGTH);
    }
  }
});
test('every forest monster advertises its own visual tactic with immutable battle reward rules',()=>{
  const names=new Set();
  const guards=new Set();
  for(let i=0;i<REGULAR_ENCOUNTERS+BOSS_HITS;i++){
    const foe=opponentFor(i);
    const tactic=enemyTacticFor(i);
    assert.deepEqual(tactic,FOREST_TACTICS[foe.id]);
    assert.ok(tactic.name&&tactic.tell&&tactic.guard);
    names.add(tactic.name);
    guards.add(tactic.guard);
  }
  assert.equal(names.size,6);
  assert.equal(guards.size,6);
  assert.equal(enemyTacticFor(0,2).name,FOREST_TACTICS.thistlet.name);
  assert.deepEqual(specialStrike({companionId:'katappo',evolved:false,boss:false}),{strikes:1,ability:null,usedPower:false});
});
test('practice and challenge pick distinct expressions and prioritize overdue reviews', () => {
  let save=createSave();
  const round=selectRoundPrompts(save,6,()=>0,'2026-10-26');
  assert.equal(round.length,6);assert.equal(new Set(round.map(p=>p.phraseId)).size,6);
  save=rate(save,'think-cafe','again','2026-10-23').save;
  const review=selectRoundPrompts(save,1,()=>0,'2026-10-26');
  assert.equal(review[0].phraseId,'think');
  assert.throws(()=>selectRoundPrompts(save,17),/Choose/);
});

test('uncertain answers are revisited without awarding XP or erasing mastery', () => {
  const fresh=createSave();
  const flagged=flagUncertainReview(fresh,'help-bag','2026-10-26');
  assert.deepEqual(fresh.reviewPrompts,{});
  assert.equal(flagged.xpWallet,0);
  assert.equal(flagged.totalAnswers,0);
  assert.equal(flagged.progress.help,undefined);
  assert.equal(flagged.reviewPrompts['help-bag'],'2026-10-27');
  assert.equal(learningSummary(flagged,'2026-10-26').reviewCount,0);
  assert.equal(learningSummary(flagged,'2026-10-27').reviewCount,1);
  const due=selectRoundPrompts(flagged,1,()=>0,'2026-10-27','easy');
  assert.equal(due[0].id,'help-bag');
  const repeated=flagUncertainReview(flagged,'help-bag','2026-10-27');
  assert.equal(repeated.reviewPrompts['help-bag'],'2026-10-27');
  const passed=recordAnswer(flagged,'help-bag','smooth','2026-10-27');
  assert.equal(passed.reward.xp,16);
  assert.equal(passed.save.reviewPrompts['help-bag'],'2026-10-30');
  assert.equal(learningSummary(passed.save,'2026-10-27').reviewCount,0);
  const viewed=recordAnswer(flagged,'help-bag','again','2026-10-27');
  assert.equal(viewed.reward.xp,0);
  assert.equal(viewed.save.reviewPrompts['help-bag'],'2026-10-28');
  assert.equal(viewed.save.xpWallet,0);
  assert.equal(validateSave(passed.save).reviewPrompts['help-bag'],'2026-10-30');
  assert.deepEqual(validateSave({...fresh,reviewPrompts:{'fake-id':'2026-10-28','help-bag':'invalid'}}).reviewPrompts,{});
  assert.throws(()=>flagUncertainReview(fresh,'not-a-prompt'),/Invalid/);
  assert.throws(()=>flagUncertainReview(fresh,'help-bag','tomorrow'),/Invalid/);
});
test('review-focused forest waves retain listening and reading attacks', () => {
  const wave=buildForestWave({difficulty:'easy',random:()=>0.43,reviewPromptIds:['booking-table','help-bag']});
  assert.ok(wave.prompts.some(p=>p.id==='booking-table'));
  assert.ok(wave.prompts.some(p=>p.id==='help-bag'));
  assert.ok(wave.prompts.some(p=>p.kind==='listen'));
  assert.ok(wave.prompts.some(p=>p.kind==='vocab'));
 assert.ok(wave.prompts.some(p=>p.kind==='grammar'));
  assert.equal(new Set(wave.prompts.map(p=>p.id)).size,8);
});
test('narrow natural paraphrases are accepted but contradictory meanings stay unresolved', () => {
  const prompt=id=>ALL_PROMPTS.find(p=>p.id===id);
  for(const [id,reply] of [
    ['help-bag','Could you give me a hand with this bag?'],
    ['help-phone','Would you mind helping me with my phone?'],
    ['order-coffee','May I have an iced coffee, please?'],
    ['direction-station','Could you show me the way to the station?'],
    ['booking-table','Could I reserve a table for two?'],
    ['change-room','Would it be possible to move to another room?'],
    ['problem-wifi','I cannot get the Wi-Fi to work in my room.']
  ]) {
    assert.equal(gradeLocalResponse(prompt(id),reply).status,'correct',id);
  }
  assert.equal(gradeLocalResponse(prompt('order-coffee'),'I would like a hot tea.').status,'review');
  assert.equal(gradeLocalResponse(prompt('booking-table'),'Could I reserve a table for six?').status,'review');
  assert.equal(gradeLocalResponse(prompt('problem-wifi'),'The Wi-Fi is working perfectly.').status,'review');
});
test('difficulty selection preserves progress and rewards, and variants share scene mastery', () => {
  const start=createSave();
  assert.throws(()=>chooseDifficulty(start,'extreme'),/Invalid difficulty/);
  const normal=chooseDifficulty(start,'normal');
  assert.equal(normal.difficulty,'normal');assert.equal(start.difficulty,'easy');
  const normalRound=selectRoundPrompts(normal,4,()=>0,'2026-10-26');
  assert.equal(normalRound.length,4);assert.ok(normalRound.every(p=>p.difficulty==='normal'));
  const hard=chooseDifficulty(normal,'hard');
  const hardRound=selectRoundPrompts(hard,3,()=>0,'2026-10-26');
  assert.ok(hardRound.every(p=>p.difficulty==='hard'));
  assert.throws(()=>selectRoundPrompts(hard,3,()=>0,'2026-10-26','extreme'),/Invalid difficulty/);
  const first=rate(normal,'think-cafe-normal','smooth','2026-10-26');
  assert.equal(first.reward.xp,24);
  assert.equal(first.save.xpWallet,24);
  const second=rate(first.save,'think-cafe-hard','smooth','2026-10-27');
  assert.equal(second.reward.xp,32);
  assert.equal(second.save.progress.think.smoothContexts.length,1);
  assert.equal(masteryLevel(second.save.progress.think),2);
  const third=rate(second.save,'think-trip-hard','smooth','2026-10-27');
  assert.equal(masteryLevel(third.save.progress.think),3);
  assert.equal(third.save.xpWallet,88);
  assert.equal(validateSave(third.save).difficulty,'normal');
  assert.equal(validateSave({...third.save,difficulty:'invalid'}).difficulty,'easy');
  assert.equal(rate(start,'late-bus-hard','hint').reward.xp,16);
  assert.equal(rate(start,'late-bus-normal','again').reward.xp,0);
});

test('example matching is intentionally narrow, not a claim to grade free-form speech', () => {
  const prompt=PROMPTS.find(p=>p.id==='late-bus');
  assert.equal(compareWithExamples(prompt,"I'm running a little late!").matchesExample,true);
  assert.equal(compareWithExamples(prompt,'I am running a little late').matchesExample,true);
  assert.equal(compareWithExamples(PROMPTS.find(p=>p.id==='help-bag'),'Excuse me, can you help me with this bag, please?').matchesExample,true);
  assert.equal(compareWithExamples(PROMPTS.find(p=>p.id==='help-bag'),'Can you NOT help me with this bag?').matchesExample,false);
  assert.equal(compareWithExamples(prompt,'I might not arrive on time').matchesExample,false);
  assert.equal(compareWithExamples(prompt,'').empty,true);
  assert.equal(normalizeEnglish('  THAT works for me!  '),'that works for me');
});


test('objective local checks accept authored examples and some natural paraphrases, abstain on ambiguous content', () => {
  for(const prompt of ALL_PROMPTS) {
    const graded=gradeLocalResponse(prompt,prompt.answer);
    assert.equal(graded.status,'correct',prompt.id);
    assert.equal(graded.method,['vocab','grammar'].includes(prompt.kind)?'exact-quiz':'registered-example');
  }
  const byId=id=>ALL_PROMPTS.find(p=>p.id===id);
  assert.equal(gradeLocalResponse(byId('think-cafe'),'Can I have a moment to decide?').status,'correct');
  assert.equal(gradeLocalResponse(byId('late-bus'),'I might arrive a little late.').status,'correct');
  assert.equal(gradeLocalResponse(byId('prefer-city-normal'),'I prefer the train since it is quicker.').status,'correct');
  assert.equal(gradeLocalResponse(byId('late-bus-hard'),'Sorry! My bus has been cancelled, so I will be around 20 minutes late. Please wait inside.').status,'correct');
  assert.equal(gradeLocalResponse(byId('late-bus-hard'),'My bus was canceled.').status,'review');
  assert.equal(gradeLocalResponse(byId('late-bus-hard'),'I have no idea.').status,'review');
  assert.equal(gradeLocalResponse(byId('help-bag'),'Could you help me with this bag?').status,'correct');
  assert.equal(gradeLocalResponse(byId('help-bag'),'Would you mind giving me a hand with my suitcase?').status,'review');
  assert.equal(gradeLocalResponse(byId('booking-table-hard'),'I do not know').status,'review');
  assert.equal(gradeLocalResponse(byId('late-bus-hard'),'').status,'empty');
  assert.equal(gradeLocalResponse(byId('late-bus-hard'),'OK').status,'empty');
  assert.equal(gradeLocalResponse(null,'hello').status,'ungraded');
  assert.equal(gradeLocalResponse(byId('late-bus-hard'),'No '.repeat(400)).status,'ungraded');
  assert.equal(rate(createSave(),'think-cafe','again').reward.xp,0);
});
test('forest four-skill questions grade deterministically and never reward incorrect taps',()=>{
  for(const difficulty of DIFFICULTIES){
    const quizzes=ALL_PROMPTS.filter(p=>p.difficulty===difficulty&&['vocab','grammar'].includes(p.kind));
    assert.equal(quizzes.length,12);
    assert.equal(quizzes.filter(p=>p.kind==='vocab').length,6);
    assert.equal(quizzes.filter(p=>p.kind==='grammar').length,6);
    assert.deepEqual(new Set(quizzes.filter(p=>p.kind==='vocab').map(p=>p.options.indexOf(p.answer))),new Set([0,1,2]));
    for(const p of quizzes){
      assert.equal(gradeLocalResponse(p,p.answer).status,'correct');
      assert.equal(gradeLocalResponse(p,'').status,'empty');
      assert.equal(gradeLocalResponse(p,'a very wrong answer').status,'incorrect');
      if(p.kind==='vocab'){
        assert.equal(p.options.length,3);
        assert.ok(p.options.includes(p.answer));
        assert.equal(new Set(p.options).size,3);
      }else{
        assert.ok(p.tokens.length>=4);
        const original=p.answer.replace(/[.!?]/g,'').split(' ');
        assert.deepEqual([...p.tokens].sort(),[...original].sort());
      }
      const earned=recordAnswer(createSave(),p.id,'smooth','2026-10-27');
      assert.ok(earned.reward.xp>0);
      assert.equal(masteryLevel(earned.save.progress[p.phraseId]),1,'Quiz XP must not create spoken fluency mastery');
      assert.equal(learningSummary(earned.save,'2026-10-27').independent,0);
      const miss=recordAnswer(createSave(),p.id,'again','2026-10-27');
      assert.equal(miss.reward.xp,0);
      assert.equal(miss.save.reviewPrompts[p.id],'2026-10-28');
      assert.equal(validateSave(miss.save).reviewPrompts[p.id],'2026-10-28');
    }
  }
});
test('a genuine new expression grows the companion and unlocks the odd sock', () => {
  const initial=createSave();
  const first=rate(initial,'think-cafe');
  assert.equal(first.reward.xp,16);assert.equal(first.reward.mastery,2);
  assert.equal(first.save.xpWallet,16);
  assert.equal(first.save.monsterXp.medamago,0);
  assert.equal(initial.progress.think,undefined); // input is not mutated
  const second=rate(first.save,'repeat-class');
  assert.deepEqual(second.reward.captured,['katappo']);
  assert.equal(learningSummary(second.save).independent,2);
  assert.ok(second.save.ownedMonsters.includes('katappo'));
  const selected=selectMonster(second.save,'katappo');assert.equal(selected.selectedMonster,'katappo');
  assert.throws(()=>selectMonster(second.save,'cone'),/まだ仲間/);
});

test('correct completions stock XP, skips do not, and familiar phrases can be practised', () => {
  let save=rate(createSave(),'think-cafe','again').save;
  const current=save.xpWallet;
  const another=rate(save,'think-trip','smooth');
  assert.equal(another.reward.xp,16);
  assert.equal(another.save.xpWallet,current+16);
  assert.equal(another.save.monsterXp.medamago,0);
  assert.equal(another.reward.mastery,2);
  assert.equal(another.save.progress.think.attempts,2);
});

test('saved XP may be freely allocated to any owned companion', () => {
  let save=createSave();
  save=rate(save,'think-cafe','smooth').save;
  save=rate(save,'repeat-class','smooth').save;
  assert.equal(save.xpWallet,32);
  const first=feedMonster(save,'katappo',10);
  assert.equal(first.save.xpWallet,22);
  assert.equal(first.save.monsterXp.katappo,10);
  assert.equal(first.save.monsterXp.medamago,0);
  assert.equal(save.xpWallet,32);
  const second=feedMonster(first.save,'medamago',22);
  assert.equal(second.save.xpWallet,0);
  assert.equal(second.save.monsterXp.medamago,22);
  assert.throws(()=>feedMonster(second.save,'katappo',1),/足りません/);
  assert.throws(()=>feedMonster(save,'cone',1),/まだ仲間/);
  assert.throws(()=>feedMonster(save,'katappo',0),/整数/);
  assert.throws(()=>feedMonster(save,'katappo',1.5),/整数/);
});

test('mastery needs independent speaking in another context on another day', () => {
  let save=rate(createSave(),'think-cafe','smooth','2026-10-26').save;
  save=rate(save,'think-trip','smooth','2026-10-26').save;
  assert.equal(masteryLevel(save.progress.think),2);
  save=rate(save,'think-trip','smooth','2026-10-27').save;
  assert.equal(masteryLevel(save.progress.think),3);
  assert.equal(save.progress.think.nextReviewDay,'2026-11-03');
  assert.equal(learningSummary(save,'2026-11-03').reviewCount,1);
});

test('monsters unlock through skill growth; evolution occurs when banked XP is spent', () => {
  let save=createSave();
  const dayOne=PROMPTS.filter((p,index)=>index%2===0);
  for(const prompt of dayOne)save=rate(save,prompt.id).save;
  assert.equal(learningSummary(save).independent,16);
  assert.ok(save.ownedMonsters.includes('purupun'));
  assert.ok(save.ownedMonsters.includes('nororo'));
  assert.ok(save.ownedMonsters.includes('keshipon'));
  assert.ok(save.ownedMonsters.includes('amekurage'));
  assert.equal(getMonsterProgress(save).evolved,false);
  for(const prompt of PROMPTS.filter((p,index)=>index%2===1))save=rate(save,prompt.id,'smooth','2026-10-27').save;
  assert.equal(learningSummary(save,'2026-10-27').mastered,16);
  assert.ok(save.ownedMonsters.includes('koge'));
  assert.ok(save.ownedMonsters.includes('cone'));
  assert.ok(save.ownedMonsters.includes('donako'));
  assert.ok(save.xpWallet>=EVOLUTION_XP);
  assert.equal(getMonsterProgress(save).evolved,false);
  const given=feedMonster(save,'purupun',EVOLUTION_XP);
  assert.equal(given.reward.evolved,true);
  assert.equal(given.reward.leveledUp,true);
  assert.equal(getMonsterProgress(given.save,'purupun').evolved,true);
  assert.equal(getMonsterProgress(given.save,'medamago').evolved,false);
});

test('manual and hinted ratings keep review due, and a completed challenge tracks a personal best', () => {
  let save=rate(createSave(),'prefer-city','hint','2026-10-26').save;
  assert.equal(masteryLevel(save.progress.prefer),1);
  assert.equal(save.progress.prefer.nextReviewDay,'2026-10-27');
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
  save=finishRound(save,3);save=finishRound(save,1);
  assert.equal(save.completedRuns,2);assert.equal(save.bestSmooth,3);
  assert.throws(()=>finishRound(save,PHRASES.length+1),/Invalid/);
});

test('unknown save formats are rejected, while old pre-wallet saves migrate safely', () => {
  const legacy={...createSave(),monsterXp:undefined,rewardedDays:undefined,progress:{think:{attempts:1,smoothContexts:['think-cafe','bad'],smoothDays:['2026-10-26'],lastRating:'smooth'}}};
  delete legacy.xpWallet;
  const safe=validateSave(legacy);
  assert.equal(safe.monsterXp.medamago,0);
  assert.equal(safe.xpWallet,0);
  assert.deepEqual(safe.progress.think.smoothContexts,['think-cafe']);
  assert.deepEqual(safe.rewardedDays,[]);
  assert.equal(validateSave({...createSave(),version:2}),null);
  assert.equal(validateSave({...createSave(),ownedMonsters:['unknown']}),null);
});

test('battle arena is independent artwork and game assets contain no platform pictographs', async () => {
  const {battleArenaArt,guardArt,relicArt}=await import('../prototype/speakingym-monsters/game-visuals.js');
  const {readdir,readFile}=await import('node:fs/promises');
  const mob=battleArenaArt(), boss=battleArenaArt(true);
  assert.match(mob,/data-arena="moonstone-court"/);
  assert.match(boss,/data-arena="thorn-vault"/);
  assert.notEqual(mob,boss);
  for(const arena of [mob,boss]) {
    assert.doesNotMatch(arena,/class="forest-world-svg"|data-landmark=|forest-world-trail/);
    assert.notEqual(arena,forestWorldArt());
  }
  assert.match(guardArt(),/<svg/);
  for(const id of Object.keys(FOREST_RELICS))assert.match(relicArt(id),/<svg/);
  const dir=new URL('../prototype/speakingym-monsters/',import.meta.url);
  for(const file of (await readdir(dir)).filter(f=>/\.(js|html|css)$/.test(f))) {
    assert.doesNotMatch(await readFile(new URL(file,dir),'utf8'),/\p{Extended_Pictographic}/u,`${file} must not contain platform emoji`);
  }
});
