import test from 'node:test';
import assert from 'node:assert/strict';
import { battleImpactFor, battlePayoffFor, battleLogSummaryFor } from '../prototype/speakingym-monsters/battle-impact.js';

test('ultimate attack is visibly stronger without inventing extra damage',()=>{
  const view=battleImpactFor({damage:5,ultimate:true,weak:true});
  assert.deepEqual(view,{kind:'ultimate',label:'ULTIMATE',damage:5,damageText:'−5 DMG'});
});

test('enemy weakness, pierce, resistance and hard hits look meaningfully different',()=>{
  assert.equal(battleImpactFor({damage:3,weak:true}).kind,'weak');
  assert.equal(battleImpactFor({damage:3,pierce:true,resist:true}).kind,'pierce');
  assert.equal(battleImpactFor({damage:1,resist:true}).label,'RESIST');
  assert.equal(battleImpactFor({damage:4}).label,'POWER HIT');
  assert.equal(battleImpactFor({damage:2}).label,'');
});

test('boss impact shows the exact earned seal count, not false boss HP depletion',()=>{
  const first=battleImpactFor({damage:5,ultimate:true,boss:true,sealsBroken:1,sealsTotal:3});
  assert.equal(first.damageText,'−5 DMG');
  assert.equal(first.label,'封印 1/3 解除');
  assert.equal(first.kind,'ultimate');
  assert.equal(battleImpactFor({damage:5,boss:true,sealsBroken:99,sealsTotal:3}).label,'封印 3/3 解除');
  assert.equal(battleImpactFor({damage:0,boss:true,sealsBroken:-3,sealsTotal:3}).label,'封印 0/3 解除');
});

test('answer-adjacent payoff reports the resolved HP and the remaining foe',()=>{
  const hit=battlePayoffFor({damage:3,impact:'weak',enemyHp:2,enemyMax:5});
  assert.deepEqual(hit,{turn:'attack',impact:'weak',title:'WEAK HIT!',amountLabel:'−3 DMG',
    remainder:'敵 HP 2/5',current:2,max:5,percent:40});
  const finishingBlow=battlePayoffFor({damage:2,enemyHp:0,enemyMax:5});
  assert.equal(finishingBlow.title,'K.O.!');
  assert.equal(finishingBlow.amountLabel,'−2 DMG','Do not invent damage beyond the verified strike');
  assert.equal(finishingBlow.current,0);
  assert.equal(finishingBlow.percent,0);
});

test('boss seals show true task progress without treating attack power as boss HP',()=>{
  assert.deepEqual(battlePayoffFor({boss:true,sealsBroken:1,sealsTotal:3,damage:5,impact:'ultimate'}),{
    turn:'attack',impact:'ultimate',title:'SEAL BREAK!',amountLabel:'封印 1/3',
    remainder:'残り封印 2/3',current:2,max:3,percent:67});
  assert.equal(battlePayoffFor({boss:true,sealsBroken:3}).current,0);
  assert.equal(battlePayoffFor({boss:true,sealsBroken:100}).percent,0);
});

test('mobile battle log starts with real damage and remaining HP before optional effects',()=>{
  const regular=battlePayoffFor({damage:3,enemyHp:2,enemyMax:5});
  assert.equal(battleLogSummaryFor(regular),'敵に3ダメージ！ 残りHP 2/5');
  assert.equal(battleLogSummaryFor(battlePayoffFor({damage:2,enemyHp:0,enemyMax:5})),'敵に2ダメージ！ 撃破！');
  assert.equal(battleLogSummaryFor(battlePayoffFor({damage:6,enemyHp:0,enemyMax:5})),
    '敵に6ダメージ！ 撃破！','a finishing strike displays the same full power as its damage animation');
  assert.equal(battleLogSummaryFor(battlePayoffFor({boss:true,sealsBroken:1,sealsTotal:3,damage:5})),
    '封印 1/3 解除！');
  assert.equal(battleLogSummaryFor(battlePayoffFor({boss:true,sealsBroken:3,sealsTotal:3,damage:5})),
    '封印 3/3 解除！ボス突破！');
  assert.equal(battleLogSummaryFor(battlePayoffFor({turn:'defense',damage:1,partyHp:2,partyMax:3})),
    '敵の攻撃で1ダメージ！ 味方HP 2/3','defense reports damage to the ally, not to the enemy');
  assert.equal(battleLogSummaryFor(battlePayoffFor({turn:'defense',damage:0,partyHp:3,partyMax:3})),
    '敵の攻撃を防御！ 味方HP 3/3','a full block still shows current ally HP');
  assert.equal(battleLogSummaryFor(battlePayoffFor({turn:'defense',damage:0,partyHp:3,partyMax:3,covered:true})),
    '仲間が援護！ 味方HP 3/3','legacy cover cases do not fabricate damage');
});

test('defense payoff reflects blocked, damaged and covered outcomes separately',()=>{
  const guard=battlePayoffFor({turn:'defense',damage:0,partyHp:12,partyMax:12});
  assert.equal(guard.title,'GUARD!');
  assert.equal(guard.amountLabel,'0 DAMAGE');
  assert.equal(guard.remainder,'味方 HP 12/12');
  assert.equal(guard.percent,100);
  const hurt=battlePayoffFor({turn:'defense',damage:2,partyHp:10,partyMax:12});
  assert.equal(hurt.title,'HIT TAKEN');
  assert.equal(hurt.amountLabel,'−2 HP');
  assert.equal(hurt.current,10);
  assert.equal(battlePayoffFor({turn:'defense',damage:0,partyHp:12,partyMax:12,covered:true}).title,'COVER!');
});

test('payoff presentation clamps corrupt HP and does not exceed its maximum',()=>{
  const extreme=battlePayoffFor({damage:10000,enemyHp:-200,enemyMax:5});
  assert.equal(extreme.amountLabel,'−999 DMG');
  assert.equal(extreme.current,0);
  assert.equal(extreme.max,5);
  assert.equal(battlePayoffFor({partyHp:999,partyMax:5,turn:'defense'}).percent,100);
  assert.equal(battlePayoffFor({boss:true,sealsBroken:-10,sealsTotal:3}).current,3);
});
