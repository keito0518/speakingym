import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { createSave, EVOLUTION_XP, SECOND_EVOLUTION_XP } from '../prototype/speakingym-monsters/monster-engine.js';
import { dungeonVictoryRecapFor } from '../prototype/speakingym-monsters/dungeon-victory-recap.js';

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
