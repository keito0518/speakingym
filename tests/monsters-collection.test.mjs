import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../prototype/speakingym-monsters/monster-engine.js';
import { resultGrowthActionFor } from '../prototype/speakingym-monsters/monster-collection.js';

test('result directs to ready first evolution even with zero unspent XP',()=>{
 const save={...createSave(),xpWallet:0,monsterXp:{medamago:280},monsterTrials:{medamago:['entry']}};
 assert.deepEqual(resultGrowthActionFor(save,'medamago'),{id:'medamago',label:'Yolkieを進化させる！'});
});

test('second evolution remains directly accessible after XP has been spent',()=>{
 const save={...createSave(),xpWallet:0,monsterXp:{medamago:630},
  monsterEvolution:{medamago:1},monsterTrials:{medamago:['entry','glade','thicket']}};
 assert.deepEqual(resultGrowthActionFor(save,'medamago'),{id:'medamago',label:'Yolkieを進化させる！'});
});

test('result prioritizes evolution over spending remaining XP',()=>{
 const save={...createSave(),xpWallet:40,monsterXp:{medamago:280},monsterTrials:{medamago:['entry']}};
 assert.match(resultGrowthActionFor(save,'medamago').label,/進化させる/);
});

test('result still offers XP training and safe catalog fallback',()=>{
 const save={...createSave(),xpWallet:80};
 assert.match(resultGrowthActionFor(save,'medamago').label,/使える80 XP/);
 assert.deepEqual(resultGrowthActionFor({...save,xpWallet:0},'medamago'),
  {id:'',label:'仲間の図鑑・進化を見る'});
});
