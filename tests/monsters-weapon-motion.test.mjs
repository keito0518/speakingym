import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WEAPONS,WEAPON_SHAPE_LABELS,WEAPON_ATTACK_MOTIONS,weaponBattleVisual} from '../prototype/speakingym-monsters/monster-equipment.js';

const root=new URL('../prototype/speakingym-monsters/',import.meta.url);
const css=readFileSync(new URL('weapon-battle-effects.css',root),'utf8');
const html=readFileSync(new URL('index.html',root),'utf8');
const ui=readFileSync(new URL('monsters.js',root),'utf8');

test('all 64 gacha weapons select one of nine choreography families and a unique shape motif',()=>{
 const gacha=WEAPONS.filter(weapon=>weapon.source==='gacha');
 assert.equal(gacha.length,64);
 assert.equal(new Set(gacha.map(weapon=>weapon.shape)).size,16);
 assert.deepEqual(new Set(Object.keys(WEAPON_ATTACK_MOTIONS)),new Set(Object.keys(WEAPON_SHAPE_LABELS)));
 assert.equal(new Set(Object.values(WEAPON_ATTACK_MOTIONS)).size,9);
 for(const weapon of gacha){
  const visual=weaponBattleVisual({...weapon,awakeningRank:2});
  assert.equal(visual.shape,weapon.shape);
  assert.equal(visual.rarity,weapon.rarity);
  assert.equal(visual.rank,2);
  assert.ok(visual.motion&&visual.motion!=='unarmed');
  assert.match(css,new RegExp(`\\[data-weapon-shape="${weapon.shape}"\\]`),`${weapon.shape} needs its own rendered path`);
  assert.match(css,new RegExp(`data-weapon-motion="${visual.motion}"`),`${visual.motion} needs a motion keyframe`);
 }
});

test('battle effects obey rarity and awakening palette, and do not alter battle outcomes',()=>{
 const bare=weaponBattleVisual(null);
 assert.deepEqual(bare,{shape:'unarmed',motion:'unarmed',rarity:'none',rank:0});
 assert.equal(weaponBattleVisual({shape:'invented',rarity:'mythic',awakeningRank:999}).shape,'unarmed');
 assert.equal(weaponBattleVisual({shape:'sword',rarity:'legend',awakeningRank:999}).rank,3);
 assert.match(css,/data-weapon-rarity="legend"/);
 assert.match(css,/data-weapon-rank="3"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/forest-attack:not\(\[data-weapon-shape="unarmed"\]\)/);
 assert.match(css,/pointer-events:none/);
 assert.match(ui,/syncBattleWeaponPresentation\(world\)/);
 assert.match(ui,/world\.dataset\.weaponShape=visual\.shape/);
 assert.match(html,/id="forest-weapon-fx"/);
 assert.match(html,/weapon-battle-effects\.css/);
 assert.equal((html.match(/id="forest-weapon-fx"/g)||[]).length,1,'Only one FX overlay can occupy the combat stage');
});
