import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, validateSave } from '../prototype/speakingym-monsters/monster-engine.js';
import { CHAIN_CHESTS, awardChainChests, chainChestAt, monsterHuntBoard, nextChainChest } from '../prototype/speakingym-monsters/monster-engagement.js';

test('three battle chests per area reward verified chain thresholds once, without feeding monsters',()=>{
  const initial=createSave();
  assert.equal(nextChainChest(initial,'entry')?.chain,3);
  assert.deepEqual(awardChainChests(initial,2,'entry'),{save:initial,unlocked:[],bonusXp:0});
  const bronze=awardChainChests(initial,3,'entry');
  assert.deepEqual(bronze.unlocked.map(chest=>chest.chain),[3]);
  assert.equal(bronze.bonusXp,12);
  assert.equal(bronze.save.xpWallet,12);
  assert.equal(bronze.save.monsterXp.medamago,0,'Bonus is a spendable reward, not an evolution shortcut');
  assert.equal(nextChainChest(bronze.save,'entry')?.chain,5);
  assert.equal(chainChestAt(bronze.save,3,'entry'),null,'Replaying a 3-chain in the same area never pays again');
  assert.equal(awardChainChests(bronze.save,4,'entry').bonusXp,0);
  const gold=awardChainChests(bronze.save,8,'entry');
  assert.deepEqual(gold.unlocked.map(chest=>chest.chain),[5,8]);
  assert.equal(gold.save.xpWallet,CHAIN_CHESTS.reduce((sum,chest)=>sum+chest.xp,0));
  assert.equal(nextChainChest(gold.save,'entry'),null);
  assert.equal(awardChainChests(gold.save,99,'entry').bonusXp,0);
  assert.equal(nextChainChest(gold.save,'glade')?.chain,3,'Clearing one area does not consume another area’s reward');
  assert.equal(awardChainChests(gold.save,3,'glade').bonusXp,12);
  assert.equal(awardChainChests(gold.save,8,null).bonusXp,0,'Unattributed endless runs cannot claim a chapter chest');
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(gold.save))),gold.save);
});

test('imported chest ledger and hunter target are strictly validated',()=>{
  const initial=createSave();
  const sanitized=validateSave({...initial,battleTreasures:['entry:8','entry:3','entry:3','entry:5','bad:5','entry:99',8],huntTargetId:'bogus'});
  assert.deepEqual(sanitized.battleTreasures,['entry:3','entry:5','entry:8']);
  assert.equal(sanitized.huntTargetId,null);
  assert.equal(validateSave({...initial,huntTargetId:'medamago'}).huntTargetId,null);
  assert.equal(validateSave({...initial,huntTargetId:'katappo'}).huntTargetId,'katappo');
  assert.deepEqual(validateSave(initial).battleTreasures,[],'Legacy saves migrate without any false rewards');
});

test('the hunter can choose a distant rare target while default recommendations are attainable',()=>{
  const save=createSave();
  const board=monsterHuntBoard(save,'2026-11-05');
  assert.equal(board.ownedCount,1);
  assert.equal(board.totalCount,44);
  assert.ok(board.selected);
  assert.ok(board.selected.remaining.length>0);
  assert.ok(board.selected.percent>=0&&board.selected.percent<=100);
  assert.ok(board.options.some(option=>option.id==='tokirin'));
  const chosen=monsterHuntBoard({...save,huntTargetId:'tokirin'},'2026-11-05');
  assert.equal(chosen.selected.id,'tokirin');
  assert.ok(chosen.selected.remaining.some(gate=>gate.key==='recall'));
  assert.ok(chosen.selected.gates.some(gate=>gate.key==='city'));
  const captured=monsterHuntBoard({...save,huntTargetId:'tokirin',ownedMonsters:['medamago','tokirin']},'2026-11-05');
  assert.notEqual(captured.selected.id,'tokirin','Already recruited targets auto-rotate to a new chase');
  const complete=monsterHuntBoard({...save,ownedMonsters:[...save.ownedMonsters,...board.options.map(entry=>entry.id)]});
  assert.equal(complete.selected,null);
  assert.deepEqual(complete.options,[]);
});
