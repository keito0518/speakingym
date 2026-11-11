import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MONSTERS } from '../prototype/speakingym-monsters/monster-data.js';
import { companionRevealFor } from '../prototype/speakingym-monsters/companion-reveal.js';

test('newly earned rares rank above ordinary friends without hiding any real capture',()=>{
  const ids=['katappo','namihana','astrowisp','kometta','katappo'];
  const revealed=companionRevealFor(ids,ids,MONSTERS);
  assert.deepEqual(revealed.map(item=>item.id),['astrowisp','kometta','namihana','katappo']);
  assert.deepEqual(revealed.map(item=>item.rarityLabel),['LEGENDARY','EPIC','RARE','NEW FRIEND']);
  assert.equal(revealed[0].rootWord,'nebula');
  assert.equal(revealed[0].rootMeaning,'星雲');
});

test('the spotlight cannot claim unowned, unknown or already-owned-but-not-earned monsters',()=>{
  assert.deepEqual(companionRevealFor([],['medamago'],MONSTERS),[]);
  assert.deepEqual(companionRevealFor(['astrowisp','missing'],['medamago'],MONSTERS),[]);
  assert.deepEqual(companionRevealFor(['medamago','missing','medamago'],['medamago'],MONSTERS).map(item=>item.id),['medamago']);
  assert.deepEqual(companionRevealFor(null,['medamago'],MONSTERS),[]);
  assert.deepEqual(companionRevealFor(['medamago'],null,MONSTERS),[]);
});

test('reward reveal lives before the collapsed battle report and never asks for a modal',()=>{
  const html=readFileSync(new URL('../prototype/speakingym-monsters/index.html',import.meta.url),'utf8');
  const spotlight=html.indexOf('id="result-companion-reveal"');
  const details=html.indexOf('id="result-detail-panel"');
  assert.ok(spotlight>0&&spotlight<details);
  const script=readFileSync(new URL('../prototype/speakingym-monsters/monsters.js',import.meta.url),'utf8');
  assert.match(script,/renderCompanionSpotlight\(\$\('#result-companion-reveal'\),companions,monsterArt\)/);
  assert.match(script,/renderDetail\(button\.dataset\.resultCompanion\)/);
});

test('newly earned companions can become the active solo ally from the reward screen',()=>{
  const reveal=readFileSync(new URL('../prototype/speakingym-monsters/companion-reveal.js',import.meta.url),'utf8');
  assert.match(reveal,/use\.dataset\.resultUseCompanion=creature\.id/);
  const script=readFileSync(new URL('../prototype/speakingym-monsters/monsters.js',import.meta.url),'utf8');
  const handler=script.slice(script.indexOf("$('#result-companion-reveal').addEventListener"),script.indexOf("$('#result-collection').addEventListener"));
  assert.match(handler,/save\.ownedMonsters\.includes\(id\)/);
  assert.match(handler,/persist\(selectMonster\(save,id\)\)/);
  assert.match(handler,/resultGrowthActionFor\(save,id\)/);
});
