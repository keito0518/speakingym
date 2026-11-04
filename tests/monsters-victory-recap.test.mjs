import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { createSave, EVOLUTION_XP, SECOND_EVOLUTION_XP } from '../prototype/speakingym-monsters/monster-engine.js';
import { dungeonVictoryRecapFor, nextBossMedalGoal } from '../prototype/speakingym-monsters/dungeon-victory-recap.js';

const prompt=kind=>{
 const value=ALL_PROMPTS.find(item=>item.kind===kind);
 assert.ok(value,`A ${kind} example exists`);
 return value;
};
const scenario=()=>({
 mode:'forest',completedForest:true,endless:false,areaId:'entry',companionId:'medamago',
 earnedXp:70,bossMedal:{bonusXp:20},dungeonOutcomes:[
  {promptId:prompt('vocab').id,kind:'vocab',outcome:'review'},
  {promptId:prompt('listen').id,kind:'listen',outcome:'independent'},
  {promptId:prompt('grammar').id,kind:'grammar',outcome:'supported'},
  {promptId:prompt('speak').id,kind:'speak',outcome:'independent'}
 ]
});

test('victory loot includes only verified English, with honest independent/hinted labels',()=>{
 const base=createSave();
 const save={...base,monsterXp:{...base.monsterXp,medamago:280},
  monsterTrials:{medamago:['entry']},xpWallet:30};
 const recap=dungeonVictoryRecapFor(scenario(),save,{monsterName:'Yolkie',nextArea:{name:'次の森'},canContinue:true});
 assert.equal(recap.xp.answers,70);
 assert.equal(recap.xp.medal,20);
 assert.equal(recap.xp.total,90,'A first-time medal bonus counts in displayed loot but does not award twice');
 assert.equal(recap.xp.wallet,30);
 assert.equal(recap.expressions.length,2,'Two recent verified pieces are enough for a compact victory card');
 assert.ok(recap.expressions.every(item=>ALL_PROMPTS.some(prompt=>prompt.id===item.promptId)),
  'Every English loot item retains its original prompt ID for exact saved review');
 assert.ok(recap.expressions.every(item=>item.english.length>0));
 assert.ok(recap.expressions.every(item=>item.kind!=='vocab'),'Review-only vocabulary must not be claimed as confirmed');
 assert.ok(recap.expressions.some(item=>item.independent));
 assert.ok(recap.expressions.some(item=>!item.independent),'Supported practice is labelled separately');
 assert.equal(recap.evolution.goal,EVOLUTION_XP);
 assert.equal(recap.evolution.remaining,0);
 assert.equal(recap.evolution.percent,100);
 assert.equal(recap.evolution.canEvolve,true);
 assert.match(recap.recommendation,/試練達成/);
 assert.equal(save.monsterXp.medamago,280,'Rendering does not spend earned XP');
});

test('the recommendation points to the next area when the wallet cannot yet evolve the ally',()=>{
 const base=createSave();
 const save={...base,monsterXp:{...base.monsterXp,medamago:500},
  monsterEvolution:{medamago:1},monsterTrials:{medamago:['entry']},xpWallet:8};
 const recap=dungeonVictoryRecapFor(scenario(),save,{nextArea:{name:'草原のエリア'},canContinue:true,monsterName:'Yolkie'});
 assert.equal(recap.evolution.stage,1);
 assert.equal(recap.evolution.goal,SECOND_EVOLUTION_XP);
 assert.equal(recap.evolution.remaining,130);
 assert.match(recap.evolution.label,/Lv\.10/);
 assert.match(recap.recommendation,/草原のエリア/);
});

test('fully evolved allies receive a completed gauge, not an invented third form',()=>{
 const base=createSave();
 const save={...base,monsterXp:{...base.monsterXp,medamago:630},monsterEvolution:{medamago:2}};
 const recap=dungeonVictoryRecapFor(scenario(),save);
 assert.equal(recap.evolution.goal,null);
 assert.equal(recap.evolution.percent,100);
 assert.match(recap.evolution.label,/第2進化達成/);
});

test('boss victory recommends a new chapter when XP is enough but trial marks are missing',()=>{
 const base=createSave();
 const save={...base,monsterXp:{medamago:280},xpWallet:200};
 const recap=dungeonVictoryRecapFor(scenario(),save,{monsterName:'Yolkie'});
 assert.equal(recap.evolution.canEvolve,false);
 assert.equal(recap.evolution.trialCount,0);
 assert.equal(recap.evolution.requiredTrials,1);
 assert.match(recap.recommendation,/違うボス/);
});

test('defeats, endless results and ordinary training cannot show boss victory loot',()=>{
 const save=createSave();
 assert.equal(dungeonVictoryRecapFor({...scenario(),completedForest:false},save),null);
 assert.equal(dungeonVictoryRecapFor({...scenario(),endless:true},save),null);
 assert.equal(dungeonVictoryRecapFor({...scenario(),mode:'daily'},save),null);
 const noVerification={...scenario(),dungeonOutcomes:[{promptId:prompt('speak').id,kind:'speak',outcome:'review'}]};
 assert.equal(dungeonVictoryRecapFor(noVerification,save).expressions.length,0);
});

test('medal rematch shows accurate next-rank requirements and only the upgrade XP',()=>{
 const silver=nextBossMedalGoal({difficulty:'easy',rank:2,best:2,total:8,independent:7,independentBoss:3,verifiedBoss:3});
 assert.equal(silver.label,'金');
 assert.equal(silver.bonusXp,16,'Silver to gold pays only the difference from the already-earned bonus');
 assert.match(silver.goal,/全8問とボス3問をヒントなし/);
 assert.match(silver.goal,/今回 全体7問・ボス3問/);
 const bronze=nextBossMedalGoal({difficulty:'normal',rank:1,best:1,total:13,independent:8,independentBoss:1,verifiedBoss:3});
 assert.equal(bronze.label,'銀');
 assert.equal(bronze.bonusXp,16);
 assert.match(bronze.goal,/10問以上を自力/,'Silver requires ceil(75%) of the chapter');
 assert.match(bronze.goal,/ボスも2\/3問を自力/);
 const unearned=nextBossMedalGoal({difficulty:'hard',rank:0,best:0,total:8,independent:2,independentBoss:0,verifiedBoss:2});
 assert.equal(unearned.bonusXp,16);
 assert.match(unearned.goal,/ボス3問を確認（今回 2\/3問）/);
 const replayedWorse=nextBossMedalGoal({difficulty:'easy',rank:1,best:2,total:8,independent:3,independentBoss:0,verifiedBoss:3});
 assert.equal(replayedWorse.label,'金','A worse replay cannot downgrade the earned best medal');
 assert.equal(replayedWorse.bonusXp,16,'A worse replay cannot advertise a duplicate bronze or silver reward');
 assert.equal(nextBossMedalGoal({...silver,best:3,difficulty:'easy',total:8}),null);
 assert.equal(nextBossMedalGoal({difficulty:'invalid',best:1,total:8}),null);
 const recap=dungeonVictoryRecapFor({...scenario(),bossMedal:{difficulty:'easy',rank:2,best:2,total:8,independent:7,independentBoss:3,verifiedBoss:3}},createSave());
 assert.equal(recap.medalGoal.label,'金');
 assert.equal(dungeonVictoryRecapFor(scenario(),createSave()).medalGoal,null,
  'A historical or partial medal record must not invent a reachable rank');
});
