import test from 'node:test';
import assert from 'node:assert/strict';
import {roleplayFor,roleplayReplyFor,roleplayOpeningFor,roleplayRecapFor} from '../prototype/speakingym-monsters/roleplay-scenarios.js';
import {normalizeEnglish} from '../prototype/speakingym-monsters/monster-engine.js';

for(const scene of ['restaurant','station','hotel','market']){
 for(const difficulty of ['easy','normal','hard']){
  test(`${scene}/${difficulty}: only verified authored alternatives branch`,()=>{
   const roleplay=roleplayFor(scene,difficulty);
   assert.equal(roleplay.turns.length,3);
   for(const [index,turn] of roleplay.turns.entries()){
    const standard=roleplayReplyFor(turn,turn.prompt.answer,{confirmed:true});
    assert.deepEqual(standard,{branch:'standard',response:turn.response,responseJa:turn.responseJa});
    assert.equal(roleplayReplyFor(turn,'unconfirmed invented text',{confirmed:false}).branch,'supported');
    assert.equal(roleplayReplyFor(turn,'unconfirmed invented text',{confirmed:true}).branch,'standard');
    const skipped=roleplayReplyFor(turn,'',{confirmed:false});
    assert.equal(skipped.branch,'supported');
    assert.notEqual(skipped.response,turn.response);
    assert.ok(skipped.responseJa);
    const alternative=turn.prompt.alternatives?.find(example=>normalizeEnglish(example)!==normalizeEnglish(turn.prompt.answer));
    if(alternative){
     const alternate=roleplayReplyFor(turn,alternative,{confirmed:true});
     assert.equal(alternate.branch,'alternate');
     assert.notEqual(alternate.response,turn.response);
     assert.notEqual(alternate.response,skipped.response);
     assert.equal(roleplayReplyFor(turn,` ${alternative.toUpperCase()} `,{confirmed:true}).branch,'alternate');
     assert.equal(roleplayReplyFor(turn,alternative,{confirmed:false}).branch,'supported',
      'A registered phrase must not select a rewarded branch before verification');
    }
    if(index){
     assert.equal(roleplayOpeningFor(roleplay,index).npc,turn.npc);
     roleplay.history=[{branch:'alternate'}];
     if(index===2)roleplay.history.push({branch:'alternate'});
     assert.notEqual(roleplayOpeningFor(roleplay,index).npc,turn.npc);
     assert.ok(roleplayOpeningFor(roleplay,index).npcJa);
     roleplay.history[index-1]={branch:'supported'};
     assert.notEqual(roleplayOpeningFor(roleplay,index).npc,turn.npc);
     assert.notEqual(roleplayOpeningFor(roleplay,index).npc,turn.openingBranches.alternate.text);
     roleplay.history=[];
    }
   }
  });
 }
}

test('recap records the actual authored reaction without treating example-only turns as spoken',()=>{
 const roleplay={...roleplayFor('restaurant','easy'),history:[]};
 const opening=roleplayOpeningFor(roleplay,0);
 const reaction=roleplayReplyFor(roleplay.turns[0],roleplay.turns[0].prompt.alternatives[0],{confirmed:true});
 roleplay.history.push({npc:opening.npc,...reaction,answer:roleplay.turns[0].prompt.alternatives[0],outcome:'smooth',checked:['希望を表現']});
 const second=roleplayOpeningFor(roleplay,1);
 assert.match(second.npc,/all set at your table/);
 roleplay.history.push({npc:second.npc,...roleplayReplyFor(roleplay.turns[1],''),answer:'',outcome:'skipped'});
 const third=roleplayOpeningFor(roleplay,2);
 assert.match(third.npc,/keep checking the order/);
 const recap=roleplayRecapFor(roleplay);
 assert.equal(recap.rows[0].responseLabel,'言い換えに反応');
 assert.equal(recap.rows[0].response,reaction.response);
 assert.equal(recap.rows[1].responseLabel,'例文練習へのサポート');
 assert.equal(recap.rows[1].confirmed,false);
 assert.equal(recap.rows[1].answer,'');
 assert.equal(recap.independent,1);
 assert.equal(recap.skipped,2);
});
