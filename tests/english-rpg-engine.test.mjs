import test from 'node:test';
import assert from 'node:assert/strict';
import { companions, monsters, questions, stages } from '../prototype/english-rpg/rpg-data.js';
import { FOREST_TILES, STORAGE_KEY, XP_PER_LEVEL, changeActiveCompanion, chooseStageMonster, createSave, enemyIntent, finishStage, getMonster, makeBattle, makePartyBattle, newForestWalk, pickQuestion, rememberQuestion, resolveTurn, setPartySlot, switchBattleCompanion, traitFor, unlockedStageCount, validateSave, walkForest } from '../prototype/english-rpg/rpg-engine.js';

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

test('winning a stage saves progress, gives replay training XP, catches companions and unlocks the next stage',()=>{
  const initial=createSave('momo');
  const victory=finishStage(initial,winBattle(1,'mimip'),()=>0.01);
  assert.deepEqual(victory.save.stageClears,[1]);assert.equal(unlockedStageCount(victory.save),2);
  assert.ok(victory.rewards.captured);assert.ok(victory.save.captures.includes('mimip'));
  assert.ok(victory.save.roster.some(member=>member.id==='mimip'));
  const replay=finishStage(victory.save,winBattle(1,'mimip'),()=>0.99);
  assert.equal(replay.rewards.xpAwarded,12);assert.equal(replay.rewards.alreadyCaught,true);
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

test('forest detours are optional, solid trees block progress, rewards persist along walk',()=>{
  assert.equal(FOREST_TILES.length,7);
  let walk=newForestWalk();
  assert.equal(walkForest(walk,-1,0).event,'blocked');
  assert.throws(()=>walkForest(walk,2,0),/one tile/);
  for(let step=0;step<4;step++) walk=walkForest(walk,0,-1).walk;
  assert.equal(walk.chest,true);
  assert.equal(walkForest(walk,0,-1).event,'blocked');
  for(let step=0;step<4;step++) walk=walkForest(walk,0,1).walk;
  for(let step=0;step<3;step++) walk=walkForest(walk,1,0).walk;
  for(let step=0;step<2;step++) walk=walkForest(walk,0,-1).walk;
  assert.equal(walk.shrine,true);
  walk=walkForest(walk,0,1).walk;
  walk=walkForest(walk,0,1).walk;
  walk=walkForest(walk,1,0).walk;
  let event;
  for(let step=0;step<4;step++){const result=walkForest(walk,0,-1); walk=result.walk;event=result.event;}
  assert.equal(event,'encounter');
  assert.equal(walk.chest,true);assert.equal(walk.shrine,true);
});

test('tactical turn has enemy telegraphs, focus management, shields and companion advantages',()=>{
  const base={...makeBattle(1,'mimip'),tactical:true,companionId:'momo',focus:1,shield:14,enemyHp:96,maxEnemyHp:96};
  assert.deepEqual(enemyIntent(base),{name:'つるの一撃',damage:10,strong:false});
  const attack=resolveTurn(base,'word',true);
  assert.equal(attack.outcome.damage,29);assert.equal(attack.outcome.absorbed,10);
  assert.equal(attack.battle.playerHp,base.playerHp);assert.equal(attack.battle.shield,4);
  assert.deepEqual(enemyIntent(attack.battle),{name:'大きく跳ねる',damage:21,strong:true});
  const braced=resolveTurn({...attack.battle,companionId:'lumi'},'listen',true);
  assert.equal(braced.outcome.enemyAttack,5); // heavy 21, guard 12, remaining shield 4
  assert.equal(braced.battle.focus,2);
  const koro=resolveTurn({...base,companionId:'koro',shield:0},'phrase',true);
  assert.equal(koro.outcome.damage,38);assert.equal(koro.battle.focus,0);
  assert.throws(()=>resolveTurn(koro.battle,'phrase',true),/focus/);
  assert.equal(traitFor('mimip').name,'道ふさぎ');
});

test('party grows through captures, bench selection, and prior saves can migrate',()=>{
  const initial=createSave('momo');
  assert.deepEqual(initial.partyIds,['momo']);
  assert.deepEqual(validateSave({...initial,partyIds:undefined}).partyIds,['momo']);
  const afterCatch=finishStage(initial,winBattle(1,'mimip'),()=>0).save;
  assert.deepEqual(afterCatch.partyIds,['momo','mimip']);
  assert.throws(()=>setPartySlot(afterCatch,2,'mimip'),/two slots/);
  assert.throws(()=>setPartySlot(afterCatch,2,'unknown'),/not caught/);
  assert.deepEqual(setPartySlot(afterCatch,1,null).partyIds,['momo']);
  const changed=changeActiveCompanion(afterCatch,'mimip');
  assert.deepEqual(changed.partyIds,['mimip','momo']);
  assert.equal(changed.activeCompanionId,'mimip');
  assert.equal(traitFor('pebblet').move,'listen');
});

test('tactical battle swaps to caught companions with their own HP and a real turn cost',()=>{
  const save=finishStage(createSave('momo'),winBattle(1,'mimip'),()=>0).save;
  const battle=makePartyBattle(1,'mimip',save,{focus:2,shield:14});
  assert.deepEqual(battle.partyIds,['momo','mimip']);
  assert.equal(battle.partyHp.mimip,70);
  const swapped=switchBattleCompanion(battle,'mimip');
  assert.equal(swapped.battle.companionId,'mimip');
  assert.equal(swapped.battle.turn,1);
  assert.equal(swapped.battle.partyHp.mimip,70);
  assert.equal(swapped.battle.shield,4);
  assert.throws(()=>switchBattleCompanion(swapped.battle,'mimip'),/Cannot switch/);
  const low={...battle,shield:0,playerHp:5,partyHp:{momo:5,mimip:70}};
  const downed=resolveTurn(low,'word',false).battle;
  assert.equal(downed.playerHp,0);
  assert.equal(downed.ended,false);
  assert.equal(downed.partyHp.mimip,70);
  const rescue=switchBattleCompanion(downed,'mimip').battle;
  assert.equal(rescue.playerHp,49); // Next telegraphed hit costs 21 HP on swap
  assert.equal(rescue.ended,false);
});
