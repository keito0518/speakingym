import test from 'node:test';
import assert from 'node:assert/strict';
import { battleImpactFor } from '../prototype/speakingym-monsters/battle-impact.js';

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
