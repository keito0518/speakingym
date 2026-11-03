import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { createSave, EVOLUTION_XP } from '../prototype/speakingym-monsters/monster-engine.js';
import { nextLearningQuestFor } from '../prototype/speakingym-monsters/next-learning-quest.js';

const today='2026-11-02';
const first=kind=>ALL_PROMPTS.find(p=>p.kind===kind&&(p.difficulty||'easy')==='easy'&&!p.bossOnly);

test('a new player gets one actionable short lesson, not a fabricated weak area',()=>{
 const mission=nextLearningQuestFor(createSave(),today);
 assert.equal(mission.kind,'daily');
 assert.equal(mission.action,'daily');
 assert.match(mission.detail,/8問|5分/);
});

test('a cross-scene answer creates a single direct review mission on the due day only',()=>{
 const prompt=ALL_PROMPTS.find(p=>p.id==='prefer-city');
 const save={...createSave(),reviewPrompts:{[prompt.id]:'2026-11-03'},
  transferReviews:{[prompt.id]:{due:'2026-11-03',status:'confirmed'}}};
 assert.equal(nextLearningQuestFor(save,today).kind,'daily');
 const mission=nextLearningQuestFor(save,'2026-11-03');
 assert.equal(mission.kind,'transfer');
 assert.equal(mission.action,'transfer-review');
 assert.match(mission.detail,/街の移動/);
 assert.match(mission.button,/1問/);
});

test('due 1/3/7-day recall has highest priority over XP and new adventures',()=>{
 const base=createSave(),id=first('speak').id;
 const save={...base,xpWallet:EVOLUTION_XP,retention:{[id]:{stage:1,lastDay:'2026-10-31',nextDay:'2026-11-01'}}};
 const mission=nextLearningQuestFor(save,today);
 assert.equal(mission.kind,'retention');
 assert.equal(mission.action,'retention');
 assert.match(mission.detail,/1件/);
});

test('scheduled saved lines get a direct review action without counting all bookmarks as due',()=>{
 const base=createSave(),due=first('speak'),later=first('grammar');
 const save={...base,savedPromptIds:[due.id,later.id],reviewPrompts:{[due.id]:today,[later.id]:'2026-11-10'}};
 const mission=nextLearningQuestFor(save,today);
 assert.equal(mission.kind,'saved');
 assert.equal(mission.action,'saved-due');
 assert.match(mission.detail,/1件/);
});

test('truly due quiz weakness appears in the authored 8-question plan',()=>{
 const base=createSave(),quiz=first('grammar');
 const save={...base,quizProgress:{[quiz.id]:{misses:1,nextReviewDay:today,resolved:false}}};
 const mission=nextLearningQuestFor(save,today);
 assert.equal(mission.kind,'review');
 assert.equal(mission.action,'daily');
 assert.match(mission.detail,/復習 \d+問/);
});

test('a wallet-ready ally is guided to the missing boss trial instead of a fake free evolution',()=>{
 const base=createSave(),save={...base,xpWallet:EVOLUTION_XP};
 const trialMission=nextLearningQuestFor(save,today);
 assert.equal(trialMission.kind,'forest');
 assert.match(trialMission.detail,/ボス攻略/);
 const withTrial={...save,monsterTrials:{medamago:['entry']}};
 const mission=nextLearningQuestFor(withTrial,today);
 assert.equal(mission.kind,'growth');
 assert.equal(mission.action,'growth');
 assert.match(mission.detail,/ボス試練 1\/1/);
 assert.equal(save.monsterXp[save.selectedMonster]||0,0);
 const ready={...withTrial,monsterXp:{medamago:EVOLUTION_XP}};
 assert.match(nextLearningQuestFor(ready,today).title,/試練クリア/);
});

test('completed daily training leads back to adventure when no review is due',()=>{
 const base=createSave(),save={...base,dailyHistory:[{date:today,difficulty:'easy',total:8,independent:8,hinted:0,elapsedSeconds:240}]};
 const mission=nextLearningQuestFor(save,today);
 assert.equal(mission.kind,'forest');
 assert.equal(mission.action,'forest');
});
