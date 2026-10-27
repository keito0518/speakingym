import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { ALL_PROMPTS, MONSTERS, PHRASES, PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { cleanForest, FOREST_ROUTES, FOREST_STAGES, FOREST_RELICS, FOREST_AREAS, unlockedForestAreas, nextForestArea, finishForest, getForestPrompts } from '../prototype/speakingym-monsters/forest-engine.js';
import { forestWorldArt } from '../prototype/speakingym-monsters/forest-world.js';
import { buildForestWave, forestLevel, DIFFICULTY_TRIES, opponentFor, FOREST_WAVE_LENGTH, REGULAR_ENCOUNTERS, BOSS_HITS, specialStrike, FOREST_TACTICS, enemyTacticFor } from '../prototype/speakingym-monsters/forest-battle.js';
import { enemyArt } from '../prototype/speakingym-monsters/forest-enemies.js';
import { gradeLocalResponse } from '../prototype/speakingym-monsters/monster-grader.js';
import { gradeDelayMeaning } from '../prototype/speakingym-monsters/speaking-meaning.js';
import { quizControlsHtml, wireQuizControls } from '../prototype/speakingym-monsters/forest-quiz-ui.js';
import { listeningChallengeFor } from '../prototype/speakingym-monsters/listening-challenges.js';
import { LISTENING_AUDIO } from '../prototype/speakingym-monsters/listening-audio-manifest.js';
import { quizTeachingFor } from '../prototype/speakingym-monsters/forest-teaching.js';
import { bossConversationFor, bossConversationTurn } from '../prototype/speakingym-monsters/forest-boss-story.js';
import { SPEAKING_ADVENTURES } from '../prototype/speakingym-monsters/speaking-adventures.js';
import { DIFFICULTIES, EVOLUTION_XP, STORAGE_KEY, VETTED_PARAPHRASES, VETTED_LEVEL_PARAPHRASES, addDays, chooseDifficulty, compareWithExamples, createSave, feedMonster, finishRound, getMonsterProgress, learningSummary, reviewOverview, quizWeaknessOverview, masteryLevel, normalizeEnglish, recordAnswer, flagUncertainReview, selectMonster, selectRoundPrompts, validateSave } from '../prototype/speakingym-monsters/monster-engine.js';
import { speakingFeedbackFor } from '../prototype/speakingym-monsters/speaking-feedback.js';

const rate = (save, promptId, rating = 'smooth', date = '2026-10-26') => recordAnswer(save, promptId, rating, date);

test('arrival meaning distinguishes natural replies, missing time, contradiction and uncertainty',()=>{
 for(const [answer,status] of [
   ["I'll be ten minutes late.",'correct'],
   ["I'm running ten minutes late.",'correct'],
   ['I will arrive 10 minutes late.','correct'],
   ["I'm delayed by ten minutes.",'correct'],
   ["I'll be late.",'incomplete'],
   ["I'll be there in ten minutes.",'review'],
   ["I won't be ten minutes late.",'incorrect'],
   ["I will not be ten minutes late.",'incorrect'],
   ["I'm ten minutes early.",'incorrect'],
   ["I'll be twenty minutes late.",'incorrect'],
   ["I'm not sure if I'll be ten minutes late.",'review'],
   ['The bus is ten minutes late.','review']
 ])assert.equal(gradeDelayMeaning(answer,10).status,status,answer);
 const byId=id=>ALL_PROMPTS.find(p=>p.id===id);
 for(const answer of ["I'm running five minutes late.","I'm delayed by 5 minutes."])
   assert.equal(gradeLocalResponse(byId('late-traffic-easy'),answer).status,'correct',answer);
 for(const [answer,status] of [
   ["I'll be late.",'incomplete'],
   ["I'll be there in five minutes.",'review'],
   ["I won't be five minutes late.",'incorrect'],
   ["I'll be ten minutes late.",'incorrect']
 ])assert.equal(gradeLocalResponse(byId('late-traffic-easy'),answer).status,status,answer);
 for(const [answer,status] of [
   ["I'll be ten minutes late.",'correct'],
   ["I'm running ten minutes late.",'correct'],
   ["I'm delayed by ten minutes.",'correct'],
   ["I'll be late.",'incomplete'],
   ["I'll be there in ten minutes.",'review'],
   ["I won't be ten minutes late.",'incorrect'],
   ["I'll be twenty minutes late.",'incorrect']
 ])assert.equal(gradeLocalResponse(byId('late-call-normal'),answer).status,status,`late-call-normal: ${answer}`);
 assert.equal(gradeLocalResponse(byId('late-traffic-hard'),"I'll be thirty minutes late.").status,'review','More conditions are required at hard difficulty');
 assert.equal(gradeLocalResponse(byId('late-traffic-hard'),"I'll be twenty minutes late.").status,'incorrect');
});

test('all listening prompts have a real, matching and locally hosted humanlike AI voice clip',()=>{
  const prompts=ALL_PROMPTS.filter(prompt=>prompt.kind==='listen');
  assert.equal(prompts.length,81);
  assert.equal(Object.keys(LISTENING_AUDIO).length,prompts.length);
  const voices=new Set();
  const australian=new Map();
  for(const prompt of prompts){
    const clip=LISTENING_AUDIO[prompt.id];
    assert.ok(clip,'Missing voice clip for '+prompt.id);
    assert.equal(clip.text,listeningChallengeFor(prompt).audio,'Audio and transcript must match: '+prompt.id);
    assert.match(clip.src,/^\.\/audio\/listening\/[a-z0-9-]+-[a-f0-9]{12}\.mp3$/);
    const path=new URL('../prototype/speakingym-monsters/'+clip.src.slice(2),import.meta.url);
    assert.equal(existsSync(path),true,'Missing hosted audio: '+clip.src);
    assert.ok(statSync(path).size>5000,'Audio clip is unexpectedly empty: '+prompt.id);
    const header=readFileSync(path).subarray(0,3).toString('ascii');
    assert.equal(header,'ID3','MP3 metadata header is missing: '+prompt.id);
    voices.add(clip.voice);
    if(clip.voice.startsWith('au_')){
      const scene=prompt.baseId||prompt.id.replace(/-(normal|hard)$/,'');
      australian.set(scene,(australian.get(scene)||0)+1);
      assert.match(clip.src,/-au-[a-f0-9]{12}\.mp3$/,'Australian audio must bust stale US/UK caches: '+prompt.id);
    }
  }
  assert.equal([...australian.values()].reduce((sum,count)=>sum+count,0),18);
  assert.equal(australian.size,6,'Australian accent must be mixed into six distinct scenarios');
  assert.ok([...australian.values()].every(count=>count===3),'Keep the same AU voice at all difficulties of each scene');
  assert.ok(voices.has('au_magdalena')&&voices.has('au_timothy_ferguson'));
  assert.ok(voices.size>=6,'Listening should include six distinct English voices including both Australian narrators');
});

test('curriculum contains 156 original situations, 24 new adventures, 72 quizzes and three boss replies', () => {
  assert.equal(PHRASES.length,16);assert.equal(PROMPTS.length,52);assert.equal(MONSTERS.length,9);
  assert.deepEqual(DIFFICULTIES,['easy','normal','hard']);
  assert.equal(ALL_PROMPTS.length,255);
  for(const difficulty of ['normal','hard']) {
    const level=ALL_PROMPTS.filter(p=>p.difficulty===difficulty);
    assert.equal(level.length,85);
    assert.equal(new Set(level.map(p=>p.id)).size,85);
    assert.ok(level.every(p=>p.task&&p.hint&&p.tip&&['speak','listen','read','vocab','grammar'].includes(p.kind)));
    assert.equal(level.filter(p=>p.kind==='vocab').length,12);
    assert.equal(level.filter(p=>p.kind==='grammar').length,12);
    assert.ok(level.filter(p=>p.kind==='listen').length>=8);
    assert.ok(level.filter(p=>p.kind==='read').length>=8);
    assert.ok(level.every(p=>[...p.cue+p.task].every(char=>char.charCodeAt(0)<128)));
    assert.ok(level.every(p=>p.bossOnly||p.extraAdventure||['vocab','grammar'].includes(p.kind)||PROMPTS.some(e=>e.id===p.baseId&&e.phraseId===p.phraseId)));
  }
  const averageLength = level => {const prompts=ALL_PROMPTS.filter(p=>p.difficulty===level);return prompts.reduce((sum,p)=>sum+p.cue.length+p.task.length,0)/prompts.length;};
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

test('eight new speaking contexts each grow from one simple idea into a different advanced task',()=>{
  assert.equal(SPEAKING_ADVENTURES.length,24);
  assert.equal(new Set(SPEAKING_ADVENTURES.map(p=>p.id)).size,24);
  const names=new Set(SPEAKING_ADVENTURES.map(p=>p.baseId));
  assert.equal(names.size,8);
  for(const baseId of names){
    const tasks=DIFFICULTIES.map(level=>SPEAKING_ADVENTURES.find(p=>p.baseId===baseId&&p.difficulty===level));
    assert.ok(tasks.every(Boolean),'Missing difficulty in '+baseId);
    assert.equal(new Set(tasks.map(p=>p.answer)).size,3,'Difficulty must change what learners say: '+baseId);
    assert.ok(tasks[2].cue.length>tasks[1].cue.length&&tasks[1].cue.length>15,'Hard must describe a richer scenario: '+baseId);
    assert.ok(tasks[2].answer.length>tasks[0].answer.length*1.2,'Hard answers must do more than repeat an easy phrase: '+baseId);
    assert.ok(/[\u3040-\u30ff\u3400-\u9fff]/.test(tasks[0].cue),'Easy requires Japanese guidance: '+baseId);
    for(const task of tasks){
      assert.equal(task.kind,'speak');
      assert.equal(task.extraAdventure,true);
      assert.ok(PHRASES.some(p=>p.id===task.phraseId));
      assert.ok(task.scene&&task.cue&&task.task&&task.hint&&task.tip);
      assert.ok(task.alternatives.length>=1);
      assert.ok(ALL_PROMPTS.some(p=>p.id===task.id));
      assert.equal(gradeLocalResponse(task,task.answer).status,'correct');
      assert.equal(gradeLocalResponse(task,task.alternatives[0]).status,'correct');
      assert.equal(gradeLocalResponse(task,'I have no idea.').status,'review');
    }
  }
  assert.equal(gradeLocalResponse(ALL_PROMPTS.find(p=>p.id==='late-traffic-easy'),"I'll be five minutes late.").status,'correct');
  assert.equal(gradeLocalResponse(ALL_PROMPTS.find(p=>p.id==='late-traffic-hard'),"I'll be five minutes late.").status,'incorrect');
  assert.equal(gradeLocalResponse(ALL_PROMPTS.find(p=>p.id==='help-locker-hard'),'Could you help me open this locker?').status,'review');
  // The extra story pool can appear in a shuffled Forest without replacing
  // its required five foe skills or the three connected boss turns.
  let foundNew=false;
  for(let i=1;i<=24;i++){
    const wave=buildForestWave({difficulty:'easy',wave:1,bossConversation:true,random:()=>i/25});
    if(wave.prompts.slice(0,5).some(p=>p.extraAdventure))foundNew=true;
    assert.deepEqual(wave.prompts.map(p=>p.kind),['speak','listen','vocab','grammar','speak','listen','grammar','speak']);
  }
  assert.ok(foundNew,'New situation prompts must be reachable during Forest encounters');
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

test('every listening task requires an authored audio-first meaning check at its own difficulty',()=>{
  const listening=ALL_PROMPTS.filter(p=>p.kind==='listen');
  assert.equal(listening.length,81);
  for(const level of ['easy','normal','hard'])assert.equal(listening.filter(p=>(p.difficulty||'easy')===level).length,27);
  for(const prompt of listening){
    const challenge=listeningChallengeFor(prompt);
    assert.ok(challenge.audio.length>=prompt.audio.length,`Audio must not be shorter at higher levels: ${prompt.id}`);
    if(prompt.difficulty)assert.notEqual(challenge.audio,prompt.audio,`Unique audio is required for ${prompt.id}`);
    assert.equal(challenge.level,prompt.difficulty||'easy');
    assert.equal(challenge.options.length,challenge.level==='hard'?4:3);
    assert.equal(new Set(challenge.options).size,challenge.options.length,`Duplicate choices for ${prompt.id}`);
    assert.ok(challenge.options.every(choice=>choice.length>5));
    assert.ok(challenge.correctIndex>=0&&challenge.correctIndex<challenge.options.length);
    assert.equal(challenge.options.filter(choice=>choice===challenge.options[challenge.correctIndex]).length,1);
    if(challenge.level==='easy')assert.ok(challenge.options.every(choice=>/[ぁ-んァ-ン一-龯]/.test(choice)));
    else assert.ok(challenge.options.every(choice=>!/[^\x00-\x7F]/.test(choice)));
    assert.ok(challenge.options.every(choice=>!choice.includes(prompt.answer)));
  }
  assert.equal(listeningChallengeFor(ALL_PROMPTS.find(p=>p.kind==='speak')),null);
  assert.notEqual(listeningChallengeFor(ALL_PROMPTS.find(p=>p.id==='problem-wifi-normal')).correctIndex,
    listeningChallengeFor(ALL_PROMPTS.find(p=>p.id==='problem-wifi-hard')).correctIndex);
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
  assert.deepEqual(cleanForest(null),{clears:0,bestWave:0,routes:[],relics:[],completedAreas:[],recentPromptIds:[]});
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
 assert.deepEqual(polluted.forest,{clears:0,bestWave:0,relics:['sunlit-leaf'],routes:['sunlit'],completedAreas:[],recentPromptIds:[]});
});

test('four Forest areas unlock one at a time, preserve earlier progress and avoid recent repeats',()=>{
 assert.equal(FOREST_AREAS.length,4);
 let save=createSave();
 const visitedIds=new Set(),bosses=new Set(),enemies=new Set();
 assert.deepEqual(unlockedForestAreas(save).map(a=>a.id),['entry']);
 assert.throws(()=>finishForest(save,'sunlit','medamago','sanctuary'),/locked/);
 for(let i=0;i<FOREST_AREAS.length;i++){
   const area=FOREST_AREAS[i];
   assert.equal(nextForestArea(save).id,area.id);
   const run=buildForestWave({difficulty:'easy',wave:i+1,areaId:area.id,progression:'story',
     previousIds:save.forest.recentPromptIds,random:()=>.47,bossConversation:true});
   assert.equal(run.level,'easy','Story chapters preserve the chosen learner difficulty');
   assert.equal(run.prompts.length,8);
   assert.equal(new Set(run.prompts.map(p=>p.id)).size,8);
   assert.ok(['speak','listen','vocab','grammar','read'].every(kind=>run.prompts.some(p=>p.kind===kind)||area.id==='entry'&&kind==='read'));
   for(const prompt of run.prompts){
     assert.ok(!visitedIds.has(prompt.id),`Reused ${prompt.id} with unused questions still available`);
     visitedIds.add(prompt.id);
   }
   const boss=opponentFor(7,i+1,area.id);
   bosses.add(boss.id);
   assert.match(enemyArt(boss.id),/forest-enemy-svg/);
   for(let j=0;j<5;j++){
     const foe=opponentFor(j,i+1,area.id);
     enemies.add(foe.id);
     assert.equal(run.prompts[j].kind,enemyTacticFor(j,i+1,area.id).preferredKind);
     assert.match(enemyArt(foe.id),/forest-enemy-svg/);
   }
   assert.match(forestWorldArt('sunlit',area.id),new RegExp(`forest-world-area-${area.id}`));
   save=finishForest(save,i%2?'moss':'sunlit','medamago',area.id,run.prompts.map(p=>p.id)).save;
   assert.equal(save.forest.completedAreas.length,i+1);
   assert.equal(unlockedForestAreas(save).length,Math.min(i+2,4));
   assert.ok(save.forest.recentPromptIds.length>=8);
   assert.deepEqual(validateSave(save).forest,save.forest);
 }
 assert.equal(visitedIds.size,32,'Four chapters should deliver 32 distinct prompts on a fresh campaign');
 assert.equal(bosses.size,4);
 assert.equal(enemies.size,20);
 assert.equal(save.forest.relics.length,5,'Three chapter relics plus two route relics');
 assert.equal(nextForestArea(save).id,'sanctuary','After victory, replay the finale');
 const endless=finishForest(createSave(),'sunlit','medamago','thicket',[],false);
 assert.deepEqual(endless.save.forest.completedAreas,[],'Endless should not bypass story chapter unlocks');
 const legacy=validateSave({...createSave(),forest:{clears:3,routes:['moss'],relics:['moss-lantern']}});
 assert.deepEqual(legacy.forest.completedAreas,['entry']);
 assert.deepEqual(unlockedForestAreas(legacy).map(area=>area.id),['entry','glade']);
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

test('speech-recognition spelling variants pass vetted examples without reversing their meaning',()=>{
  const byId=id=>ALL_PROMPTS.find(p=>p.id===id);
  assert.equal(compareWithExamples(byId('late-traffic-easy'),'I will be 5 minutes late.').matchesExample,true);
  assert.equal(gradeLocalResponse(byId('late-traffic-easy'),'I will be 5 minutes late.').status,'correct');
  assert.equal(compareWithExamples(byId('late-traffic-easy'),"I'll be late five minutes.").matchesExample,false);
  assert.notEqual(gradeLocalResponse(byId('late-traffic-easy'),"I'll be late five minutes.").status,'correct');
  assert.equal(gradeLocalResponse(byId('problem-ticket-easy'),'I have not received my e ticket.').status,'correct');
  assert.equal(gradeLocalResponse(byId('late-bus-hard'),"Sorry, the bus was canceled, so I will be 20 minutes late. You can wait indoors.").status,'correct');
  assert.notEqual(gradeLocalResponse(byId('late-call'),"I won't be ten minutes late.").status,'correct');
  assert.notEqual(gradeLocalResponse(byId('late-call'),'I will not be ten minutes late.').status,'correct');
  assert.notEqual(gradeLocalResponse(byId('prefer-city-normal'),'I prefer the bus, not the train, because it is faster.').status,'correct');
});

test('speaking review gives specific corrective clues but never decides correctness',()=>{
  const byId=id=>ALL_PROMPTS.find(p=>p.id===id);
  for(const [id,answer,expected] of [
    ['late-traffic-easy',"I'll be late five minutes",/ten minutes late/],
    ['prefer-window-easy','I am prefer a window seat',/I am prefer/],
    ['problem-ticket-easy',"I didn't received my ticket",/didn't receive/],
    ['direction-station','Could you tell me where is the station?',/where \+ 主語/],
    ['repeat-class','Could you repeat me the instructions?',/repeat that for me/]
  ]){
    const feedback=speakingFeedbackFor(byId(id),answer);
    assert.equal(feedback.specific,true,id);
    assert.match(feedback.clue+feedback.detail,expected,id);
  }
  const unclear=speakingFeedbackFor(byId('help-bag'),'Can you carry this for me?');
  assert.equal(unclear.specific,false);
  assert.match(unclear.clue,/手伝/);
  assert.equal(speakingFeedbackFor(byId('forest-vocab-ticket-easy'),'buy'),null);
  assert.equal(speakingFeedbackFor(byId('late-traffic-easy'),' '),null);
});

test('all 52 easy speaking situations recognize reviewed natural paraphrases without guessing contradictory answers',()=>{
  assert.equal(Object.keys(VETTED_PARAPHRASES).length,PROMPTS.length);
  for(const prompt of PROMPTS){
    const replies=VETTED_PARAPHRASES[prompt.id];
    assert.ok(Array.isArray(replies)&&replies.length>=1,'Missing curated paraphrase: '+prompt.id);
    const unique=new Set(replies.map(normalizeEnglish));
    assert.equal(unique.size,replies.length,'Duplicate paraphrase: '+prompt.id);
    for(const reply of replies){
      assert.equal(compareWithExamples(prompt,reply).matchesExample,true,prompt.id+' / '+reply);
      const graded=gradeLocalResponse(prompt,reply);
      assert.equal(graded.status,'correct',prompt.id+' / '+reply);
      assert.equal(graded.method,'registered-example',prompt.id);
    }
  }
  const overtime=PROMPTS.find(p=>p.id==='decline-overtime');
  assert.equal(gradeLocalResponse(overtime,"I can't work overtime today.").status,'correct');
  for(const reply of ['I can work overtime today.',"I can't work overtime tomorrow.","I can't work overtime today, but I can stay late today."]){
    assert.notEqual(gradeLocalResponse(overtime,reply).status,'correct','Do not reward a contradictory / changed / unvetted response: '+reply);
  }
  const help=PROMPTS.find(p=>p.id==='help-bag');
  assert.equal(gradeLocalResponse(help,'Would you mind giving me a hand with my suitcase?').status,'correct');
  assert.notEqual(gradeLocalResponse(help,'I do not need help with my suitcase.').status,'correct');
  assert.notEqual(gradeLocalResponse(PROMPTS.find(p=>p.id==='direction-station'),'Could you show me the way to the bus stop?').status,'correct');
  assert.notEqual(gradeLocalResponse(ALL_PROMPTS.find(p=>p.id==='decline-overtime-hard'),"I can't work overtime today.").status,'correct','Hard tasks have additional requirements');
});

test('additional natural examples at normal and hard levels never inherit easier conditions',()=>{
  const entries=Object.entries(VETTED_LEVEL_PARAPHRASES);
  assert.ok(entries.length>=23);
  for(const [id,replies] of entries){
    const prompt=ALL_PROMPTS.find(p=>p.id===id);
    assert.ok(prompt&&['normal','hard'].includes(prompt.difficulty),'Invalid level-specific scene: '+id);
    for(const reply of replies){
      assert.equal(gradeLocalResponse(prompt,reply).status,'correct',id+' / '+reply);
      assert.equal(compareWithExamples(prompt,reply).matchesExample,true,id+' / '+reply);
    }
  }
  const hard=ALL_PROMPTS.find(p=>p.id==='decline-overtime-hard');
  assert.notEqual(gradeLocalResponse(hard,"Sorry, I can't work overtime today.").status,'correct','Hard refusal requires reason and alternative');
  assert.notEqual(gradeLocalResponse(ALL_PROMPTS.find(p=>p.id==='booking-table-hard'),'Can I reserve a table for two for dinner?').status,'correct','Hard booking requires time and seating preference');
  assert.notEqual(gradeLocalResponse(ALL_PROMPTS.find(p=>p.id==='prefer-city-hard'),'I prefer taking the train.').status,'correct','Hard travel preference needs bus tradeoff and reason');
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
  assert.equal(gradeLocalResponse(byId('help-bag'),'Would you mind giving me a hand with my suitcase?').status,'correct');
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
    assert.equal(quizzes.length,24);
    assert.equal(quizzes.filter(p=>p.kind==='vocab').length,12);
    assert.equal(quizzes.filter(p=>p.kind==='grammar').length,12);
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
        assert.notDeepEqual(p.tokens,original,`Grammar tiles should not already be solved: ${p.id}`);
      }
      const earned=recordAnswer(createSave(),p.id,'smooth','2026-10-27');
      assert.ok(earned.reward.xp>0);
      assert.equal(masteryLevel(earned.save.progress[p.phraseId]),1,'Quiz XP must not create spoken fluency mastery');
      assert.equal(learningSummary(earned.save,'2026-10-27').independent,0);
      const miss=recordAnswer(createSave(),p.id,'again','2026-10-27');
      assert.equal(miss.reward.xp,0);
      assert.equal(miss.save.reviewPrompts[p.id],'2026-10-27');
      assert.equal(validateSave(miss.save).reviewPrompts[p.id],'2026-10-27');
    }
  }
});
test('objective quiz weaknesses are stored safely and survive old-save migration',()=>{
  const initial=createSave();
  assert.deepEqual(initial.quizProgress,{});
  assert.deepEqual(validateSave({...initial,quizProgress:undefined}).quizProgress,{});
  const wrong=rate(initial,'forest-vocab-ticket-easy','again','2026-10-27').save;
  assert.equal(wrong.quizProgress['forest-vocab-ticket-easy'].misses,1);
  assert.equal(wrong.quizProgress['forest-vocab-ticket-easy'].nextReviewDay,'2026-10-27');
  assert.deepEqual(quizWeaknessOverview(wrong,'2026-10-27').due.map(entry=>entry.id),['forest-vocab-ticket-easy']);
  assert.equal(quizWeaknessOverview(wrong,'2026-10-26').upcoming.length,1);
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(wrong))).quizProgress,wrong.quizProgress);
  const legacy=validateSave({...initial,reviewPrompts:{'forest-grammar-yesterday-easy':'2026-10-25'}});
  assert.deepEqual(quizWeaknessOverview(legacy,'2026-10-27').due.map(entry=>entry.id),['forest-grammar-yesterday-easy']);
  const polluted=validateSave({...wrong,quizProgress:{
    'forest-vocab-ticket-easy':{misses:999999999,cleanStreak:45,lastMissDay:'javascript:bad',lastCleanDay:'2026-10-27',nextReviewDay:'not-a-date',resolved:true},
    'think-cafe':{misses:100},'fake-quiz':{misses:100}
  }});
  assert.deepEqual(Object.keys(polluted.quizProgress),['forest-vocab-ticket-easy']);
  assert.equal(polluted.quizProgress['forest-vocab-ticket-easy'].misses,10000);
  assert.equal(polluted.quizProgress['forest-vocab-ticket-easy'].cleanStreak,2);
  assert.equal(polluted.quizProgress['forest-vocab-ticket-easy'].lastMissDay,null);
  assert.equal(polluted.quizProgress['forest-vocab-ticket-easy'].nextReviewDay,null);
});

test('quiz mastery takes two clean spaced reviews, not same-day retries or hints',()=>{
  const id='forest-vocab-ticket-easy';
  const empty=createSave();
  assert.equal(quizWeaknessOverview(rate(empty,id,'smooth','2026-10-27').save,'2026-10-27').total,0);
  let save=rate(empty,id,'again','2026-10-27').save;
  save=rate(save,id,'hint','2026-10-27').save;
  assert.equal(save.quizProgress[id].cleanStreak,0);
  assert.equal(save.quizProgress[id].nextReviewDay,'2026-10-27');
  save=rate(save,id,'smooth','2026-10-27').save;
  assert.equal(save.quizProgress[id].cleanStreak,0);
  assert.equal(save.quizProgress[id].nextReviewDay,'2026-10-28');
  save=rate(save,id,'smooth','2026-10-27').save;
  assert.equal(save.quizProgress[id].cleanStreak,0);
  save=rate(save,id,'smooth','2026-10-28').save;
  assert.equal(save.quizProgress[id].cleanStreak,1);
  assert.equal(save.quizProgress[id].nextReviewDay,'2026-10-31');
  save=rate(save,id,'smooth','2026-10-29').save;
  assert.equal(save.quizProgress[id].cleanStreak,1,'Replaying before the scheduled date is not a spaced review');
  assert.equal(save.quizProgress[id].nextReviewDay,'2026-10-31');
  save=rate(save,id,'hint','2026-10-31').save;
  assert.equal(save.quizProgress[id].cleanStreak,1,'Hinted answer cannot count toward mastery');
  save=rate(save,id,'smooth','2026-10-31').save;
  assert.equal(save.quizProgress[id].cleanStreak,1,'Earlier hint on the same day disqualifies a clean review');
  save=rate(save,id,'smooth','2026-11-01').save;
  assert.equal(save.quizProgress[id].cleanStreak,2);
  assert.equal(save.quizProgress[id].resolved,true);
  assert.equal(save.reviewPrompts[id],undefined);
  assert.equal(quizWeaknessOverview(save,'2026-11-01').resolved.length,1);
  assert.equal(quizWeaknessOverview(save,'2026-11-01').due.length,0);
  const relapsed=rate(save,id,'again','2026-11-02').save;
  assert.equal(relapsed.quizProgress[id].cleanStreak,0);
  assert.equal(relapsed.quizProgress[id].resolved,false);
  assert.equal(quizWeaknessOverview(relapsed,'2026-11-02').due.length,1);
});

test('an overdue word or grammar point takes priority in a later forest encounter',()=>{
  const repeatVocabulary=buildForestWave({difficulty:'easy',wave:1,quizWeaknessIds:['forest-vocab-ticket-easy'],random:()=>.25});
  assert.equal(repeatVocabulary.prompts[2].id,'forest-vocab-ticket-easy');
  const repeatGrammar=buildForestWave({difficulty:'easy',wave:1,quizWeaknessIds:['forest-grammar-yesterday-easy'],random:()=>.25});
  assert.equal(repeatGrammar.prompts[3].id,'forest-grammar-yesterday-easy');
  const harder=buildForestWave({difficulty:'normal',wave:1,quizWeaknessIds:['forest-vocab-ticket-easy'],random:()=>.25});
  assert.equal(harder.prompts[2].baseId,'forest-vocab-ticket');
  assert.equal(harder.prompts[2].difficulty,'normal');
  assert.equal(new Set(harder.prompts.map(prompt=>prompt.id)).size,8);
});
test('all 72 objective quiz questions have an authored why, comparison and transfer lesson',()=>{
  const quizzes=ALL_PROMPTS.filter(prompt=>['vocab','grammar'].includes(prompt.kind));
  assert.equal(quizzes.length,72);
  for(const prompt of quizzes){
    const lesson=quizTeachingFor(prompt);
    assert.ok(lesson?.label&&lesson.clue.length>=22,`Missing explanatory clue: ${prompt.id}`);
    assert.ok(lesson.detail.length>=16,`Missing example reasoning: ${prompt.id}`);
    assert.ok(lesson.transfer.length>=30,`Missing transfer context: ${prompt.id}`);
    assert.ok(!lesson.clue.includes('<')&&!lesson.transfer.includes('<'),`Unsafe markup in ${prompt.id}`);
  }
  const order=quizTeachingFor(ALL_PROMPTS.find(prompt=>prompt.id==='forest-grammar-arrive-easy'));
  assert.match(order.clue,/late の前/);
  assert.match(order.transfer,/late ten minutes/);
  const advancedPrice=quizTeachingFor(ALL_PROMPTS.find(prompt=>prompt.id==='forest-grammar-price-hard'));
  assert.match(advancedPrice.clue,/複数形/);
  assert.equal(quizTeachingFor(ALL_PROMPTS.find(prompt=>prompt.kind==='speak')),null);
});
test('first-wave boss conversation joins listening, word order and speaking without duplicating encounters',()=>{
  for(const level of DIFFICULTIES){
    const turns=bossConversationFor(1,level);
    assert.equal(turns.length,3);
    assert.deepEqual(turns.map(turn=>turn.turn),[1,2,3]);
    for(const [i,kind] of ['listen','grammar','speak'].entries()){
      const prompt=ALL_PROMPTS.find(item=>item.id===turns[i].id);
      assert.ok(prompt,`Missing ${level} boss turn ${i+1}`);
      assert.equal(prompt.kind,kind);
      assert.equal(prompt.difficulty||'easy',level);
      assert.ok(turns[i].title&&turns[i].context);
      assert.deepEqual(bossConversationTurn(1,level,i+5),turns[i]);
    }
    const reply=ALL_PROMPTS.find(prompt=>prompt.id===turns[2].id);
    assert.equal(reply.bossOnly,true);
    assert.equal(gradeLocalResponse(reply,reply.answer).status,'correct');
    assert.equal(gradeLocalResponse(reply,'I have no idea.').status,'review','Unverified natural speech must never be labeled objectively wrong');
    const wave=buildForestWave({difficulty:level,wave:1,bossConversation:true,random:()=>.99});
    assert.deepEqual(wave.prompts.slice(5).map(p=>p.id),turns.map(t=>t.id));
    assert.equal(new Set(wave.prompts.map(p=>p.id)).size,8);
    assert.deepEqual(wave.prompts.map(p=>p.kind),['speak','listen','vocab','grammar','speak','listen','grammar','speak']);
  }
  assert.equal(bossConversationFor(2,'easy'),null);
  assert.equal(bossConversationTurn(1,'easy',4),null);
  assert.equal(bossConversationTurn(1,'easy',8),null);
  assert.equal(bossConversationFor(1,'invalid'),null);
  const later=buildForestWave({difficulty:'easy',wave:2,bossConversation:true,random:()=>.51});
  assert.equal(later.prompts[6].kind,'vocab','Endless later waves retain alternating boss skills');
  assert.ok(!later.prompts.some(prompt=>prompt.bossOnly));
  const normal=ALL_PROMPTS.find(prompt=>prompt.id==='boss-delay-apology-normal');
  assert.equal(gradeLocalResponse(normal,'Sorry, the bus is running late, please go inside.').status,'correct');
  assert.equal(gradeLocalResponse(normal,'I am having a lovely day.').status,'review');
  const hard=ALL_PROMPTS.find(prompt=>prompt.id==='boss-delay-apology-hard');
  assert.equal(gradeLocalResponse(hard,'Sorry, my bus was canceled. I will be 20 minutes late. Please stay inside.').status,'correct');
  for(const level of DIFFICULTIES){
    const selected=selectRoundPrompts(createSave(),16,()=>.5,'2026-10-27',level);
    assert.ok(selected.every(prompt=>!prompt.bossOnly),`${level} normal practice must not include boss-only dialogue`);
  }
});
test('expanded forest quizzes change targets across levels and explain the language point',()=>{
  const quizzes=ALL_PROMPTS.filter(p=>['vocab','grammar'].includes(p.kind));
  assert.equal(quizzes.length,72);
  assert.equal(new Set(quizzes.map(p=>p.id)).size,72);
  const baseIds=new Set(quizzes.map(p=>p.baseId));
  assert.equal(baseIds.size,24);
  for(const baseId of baseIds){
    const variants=quizzes.filter(p=>p.baseId===baseId);
    assert.deepEqual(variants.map(p=>p.difficulty),['easy','normal','hard']);
    for(const p of variants){
      assert.ok(p.hint.length>=12,`${p.id} needs a useful hint`);
      assert.ok(p.tip.length>=24,`${p.id} needs a useful explanation`);
      assert.ok(!p.cue.includes('<')&&!p.tip.includes('<'),`${p.id} must remain plain text`);
    }
  }
  // Harder *new* topics are not a padded restatement of the same answer.
  for(const baseId of ['forest-vocab-bill','forest-vocab-route','forest-vocab-allergy','forest-vocab-timing','forest-vocab-hotel','forest-vocab-details']){
    assert.equal(new Set(quizzes.filter(p=>p.baseId===baseId).map(p=>p.answer)).size,3,baseId);
  }
  const drink=ALL_PROMPTS.find(p=>p.id==='recommend-drink');
  assert.match(drink.cue,/甘すぎない/);
  assert.match(drink.answer,/not?\s+too\s+sweet|isn't\s+too\s+sweet/i);
  assert.ok(drink.alternatives.every(answer=>/not too sweet|isn't too sweet/i.test(answer)),
    'All model answers must retain the key sweetness constraint');
  assert.equal(gradeLocalResponse(drink,drink.answer).status,'correct');
});
test('forest quiz controls respect English-only difficulty and keep typed vocabulary choices in sync',()=>{
  for(const difficulty of DIFFICULTIES){
    const vocab=ALL_PROMPTS.find(p=>p.kind==='vocab'&&p.difficulty===difficulty);
    const grammar=ALL_PROMPTS.find(p=>p.kind==='grammar'&&p.difficulty===difficulty);
    const vocabHtml=quizControlsHtml(vocab),grammarHtml=quizControlsHtml(grammar);
    assert.match(vocabHtml,/data-vocab-option="2"/);
    assert.match(grammarHtml,/data-grammar-piece="0"/);
    if(difficulty==='easy'){
      assert.match(vocabHtml,/単語を選ぼう/);
      assert.match(grammarHtml,/単語を順番にタップ/);
    }else{
      assert.match(vocabHtml,/Find the word that completes/);
      assert.match(grammarHtml,/Tap the words to build/);
      assert.doesNotMatch(vocabHtml+grammarHtml,/[ぁ-んァ-ン一-龯]/);
    }
  }
  const prompt=ALL_PROMPTS.find(p=>p.kind==='vocab'&&p.difficulty==='normal');
  const makeButton=i=>({dataset:{vocabOption:String(i)},attrs:{},handlers:{},
    addEventListener(type,handler){this.handlers[type]=handler;},
    setAttribute(name,value){this.attrs[name]=value;}});
  const buttons=prompt.options.map((_,i)=>makeButton(i));
  const input={value:'',handlers:{},addEventListener(type,handler){this.handlers[type]=handler;}};
  wireQuizControls(prompt,{querySelector:()=>input,querySelectorAll:()=>buttons});
  buttons[1].handlers.click();
  assert.equal(input.value,prompt.options[1]);
  assert.deepEqual(buttons.map(b=>b.attrs['aria-pressed']),['false','true','false']);
  input.value='another answer';input.handlers.input();
  assert.deepEqual(buttons.map(b=>b.attrs['aria-pressed']),['false','false','false']);
  input.value=prompt.options[2].toUpperCase();input.handlers.input();
  assert.deepEqual(buttons.map(b=>b.attrs['aria-pressed']),['false','false','true']);
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
