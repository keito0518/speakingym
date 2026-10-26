import test from 'node:test';
import assert from 'node:assert/strict';
import { companions, monsters, questions, stages } from '../prototype/english-rpg/rpg-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, changeActiveCompanion, chooseStageMonster, createSave, finishStage, getMonster, makeBattle, pickQuestion, rememberQuestion, resolveTurn, unlockedStageCount, validateSave } from '../prototype/english-rpg/rpg-engine.js';

const winBattle = (stageId, monsterId, level=1, move='word') => {
  let battle=makeBattle(stageId,monsterId,level);
  while(!battle.ended) battle=resolveTurn(battle,move,true).battle;
  return battle;
};

test('prototype data has 10 stages, 12 original creatures, three starters and 60 distinct questions',()=>{
  assert.equal(stages.length,10);assert.equal(monsters.length,12);assert.equal(companions.length,3);assert.equal(questions.length,60);
  assert.equal(new Set(questions.map(q=>q.id)).size,60);
  assert.deepEqual(['word','listen','phrase'].map(type=>questions.filter(q=>q.type===type).length),[20,20,20]);
  assert.equal(new Set(stages.flatMap(s=>s.foes)).size,12);
  for(const q of questions.filter(q=>q.choices)) assert.equal(new Set(q.choices).size,q.choices.length,`${q.id} has distinct options`);
  for(const q of questions.filter(q=>q.type==='listen')) { assert.ok(q.answer>=0&&q.answer<q.choices.length,`${q.id} has an answer index`);assert.equal(q.choices.filter(choice=>choice===q.choices[q.answer]).length,1,`${q.id} has one correct choice`); }
  for(const q of questions.filter(q=>q.type==='phrase')) assert.equal(q.tokens.join(' '),q.target,`${q.id} word tiles form the stated sentence`);
});

test('new save is isolated, validates and unlocks stages sequentially',()=>{
  const save=createSave('momo');
  assert.equal(STORAGE_KEY,'speakingym-rpg-prototype-v1');
  assert.deepEqual(save.captures,['momo']);assert.equal(unlockedStageCount(save),1);assert.ok(validateSave(save));
  save.stageClears.push(1);assert.equal(unlockedStageCount(save),2);
  assert.equal(validateSave({...save,activeCompanionId:'unknown'}),null);
});

test('wrong answers do not damage the foe and the player may recover through listening',()=>{
  const battle=makeBattle(1,'mimip');
  const wrong=resolveTurn(battle,'word',false);
  assert.equal(wrong.battle.enemyHp,battle.enemyHp);assert.equal(wrong.battle.playerHp,battle.playerHp-12);assert.equal(wrong.outcome.correct,false);
  const listening=resolveTurn(wrong.battle,'listen',true);
  assert.equal(listening.battle.enemyHp,battle.enemyHp-18);assert.equal(listening.battle.playerHp,Math.min(battle.maxPlayerHp,wrong.battle.playerHp+7));assert.equal(listening.battle.focus,1);
});

test('three actions have different power and phrase focus recovers through listening',()=>{
  let battle=makeBattle(1,'mimip');
  const firstListen=resolveTurn(battle,'listen',true).battle;
  const locked=resolveTurn(firstListen,'phrase',true);
  assert.equal(locked.battle.enemyHp,battle.enemyHp-18-29);assert.equal(locked.battle.focus,0);
  assert.throws(()=>resolveTurn(locked.battle,'phrase',true),/focus/);
  battle=resolveTurn(locked.battle,'listen',true).battle;
  assert.equal(battle.focus,1);
  assert.equal(resolveTurn(battle,'phrase',true).battle.enemyHp,0);
});

test('winning a stage saves progress, awards XP once, catches companions and unlocks the next stage',()=>{
  const initial=createSave('momo');
  const victory=finishStage(initial,winBattle(1,'mimip'),()=>0.01);
  assert.deepEqual(victory.save.stageClears,[1]);assert.equal(unlockedStageCount(victory.save),2);
  assert.ok(victory.rewards.captured);assert.ok(victory.save.captures.includes('mimip'));
  assert.ok(victory.save.roster.some(member=>member.id==='mimip'));
  const replay=finishStage(victory.save,winBattle(1,'mimip'),()=>0.99);
  assert.equal(replay.rewards.xpAwarded,0);assert.equal(replay.rewards.alreadyCaught,true);
});

test('capture chance is visible in state and three wins guarantee a catch',()=>{
  let save=createSave('lumi');
  for(let i=0;i<2;i++) save=finishStage(save,winBattle(1,'mimip'),()=>0.99).save;
  const third=finishStage(save,winBattle(1,'mimip'),()=>0.99);
  assert.equal(third.rewards.captureChance,.4);assert.equal(third.rewards.winCount,3);assert.equal(third.rewards.captured,true);
});

test('boss rewards, level ups and first evolution work; captured companion can be selected',()=>{
  let save=createSave('koro');
  for(const id of [1,2,3,4,5]) {
    const stage=stages[id-1];
    const monsterId=stage.foe;
    const battle=winBattle(id,monsterId,id===5?4:1);
    const result=finishStage(save,battle,()=>0.01);save=result.save;
    if(id===5){assert.equal(result.rewards.xpAwarded,70);assert.ok(result.rewards.levelUps>=1);assert.equal(result.rewards.evolvedNow,true);}
  }
  assert.ok(save.roster[0].level>=4);assert.equal(save.roster[0].evolved,true);
  const changed=changeActiveCompanion(save,'aurora');assert.equal(changed.activeCompanionId,'aurora');
});

test('repeat selection avoids recently served questions within each skill',()=>{
  let save=createSave('momo');const seen=new Set();
  for(let i=0;i<20;i++){const q=pickQuestion('word',save,()=>0);assert.ok(!seen.has(q.id));seen.add(q.id);save=rememberQuestion(save,q);}
  assert.equal(seen.size,20);
});

test('missed species can be targeted again from a multi-creature habitat',()=>{
  const save=createSave('momo');
  assert.equal(chooseStageMonster(4,save),'twiggle');
  const one={...save,captures:[...save.captures,'twiggle']};
  assert.equal(chooseStageMonster(4,one),'glimmer');
  assert.equal(getMonster('craggle').boss,false);
});
