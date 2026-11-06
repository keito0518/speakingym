import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WEAPONS,weaponBattleVisual} from '../prototype/speakingym-monsters/monster-equipment.js';
import {weaponAttackSoundPlan,createWeaponBattleSoundPlayer} from '../prototype/speakingym-monsters/weapon-battle-sound.js';

const src=new URL('../prototype/speakingym-monsters/',import.meta.url);
const html=readFileSync(new URL('index.html',src),'utf8');
const css=readFileSync(new URL('weapon-battle-effects.css',src),'utf8');
const ui=readFileSync(new URL('monsters.js',src),'utf8');

test('every earned and gacha weapon has a distinctive, bounded sound identity',()=>{
 const names=new Map();
 for(const weapon of WEAPONS){
  const visual=weaponBattleVisual(weapon);
  const notes=weaponAttackSoundPlan(visual);
  assert.ok(notes.length>=2&&notes.length<=6,`${weapon.id}: short attack motif plus rarity accents`);
  for(const note of notes){
   assert.ok(note.frequency>=60&&note.frequency<2000);
   assert.ok(note.gain>0&&note.gain<=.045);
   assert.ok(note.delay>=0&&note.duration<=.43);
  }
  if(weapon.source==='gacha'){
   const normalized=weaponAttackSoundPlan({...visual,rarity:'common'});
   names.set(visual.shape,normalized.map(n=>`${n.wave}:${n.frequency}`).join(','));
  }
  const ultimate=weaponAttackSoundPlan(visual,{ultimate:true});
  assert.ok(ultimate.length>notes.length,`${weapon.id}: the finisher sounds larger`);
  assert.ok(ultimate.every(note=>note.delay+note.duration<.8),'Never mask the next English prompt with long effects');
 }
 assert.equal(names.size,16);
 assert.equal(new Set(names.values()).size,16,'All 16 gacha shapes have different pitches or motifs');
});

test('rarity and each duplicate resonance level add audible identity without altering combat',()=>{
 const base={shape:'sword',motion:'sweep',rarity:'common',rank:0};
 const countByTier=['common','rare','epic','legend'].map(rarity=>weaponAttackSoundPlan({...base,rarity}).length);
 assert.deepEqual(countByTier,[2,3,4,5],'Higher rarity must feel more layered than common');
 for(const rarity of ['common','rare','epic','legend']){
  const lengths=[0,1,2,3].map(rank=>weaponAttackSoundPlan({...base,rarity,rank}).length);
  assert.deepEqual(lengths,[0,1,2,3].map(rank=>countByTier[['common','rare','epic','legend'].indexOf(rarity)]+rank));
  for(const rank of [0,1,2,3]){
   const notes=weaponAttackSoundPlan({...base,rarity,rank},{ultimate:true});
   assert.ok(notes.length<=10&&notes.every(note=>note.delay+note.duration<.8));
   assert.ok(notes.every(note=>note.gain<=.045&&note.gain>0));
  }
 }
});

test('no audio context exists until explicit opt-in, and unsupported audio is harmless',()=>{
 let created=0,started=0;
 const gainParam={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 const context={state:'running',currentTime:0,destination:{},
  createOscillator:()=>({frequency:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},start(){started++},stop(){}}),
  createGain:()=>({gain:gainParam,connect(){}})};
 const player=createWeaponBattleSoundPlayer({environment:()=>({AudioContext:class {constructor(){created++;return context}}})});
 const visual=weaponBattleVisual(WEAPONS.find(w=>w.id==='solar_blade'));
 assert.equal(player.isEnabled(),false);
 assert.equal(player.play(visual),false);
 assert.equal(created,0,'Muted by default; do not instantiate Web Audio');
 assert.equal(player.setEnabled(true),true);
 assert.equal(created,1,'User tap primes iPhone Web Audio before async grading');
 assert.equal(player.play(visual,{ultimate:true}),true);
 assert.equal(started,6);
 player.setEnabled(false);
 assert.equal(player.play(visual),false);
 assert.equal(started,6,'Muted battle cannot schedule any note');
 const unsupported=createWeaponBattleSoundPlayer({environment:()=>({})});
 assert.equal(unsupported.setEnabled(true),false);
 assert.equal(unsupported.play(visual),false);
});

test('sound switch and special FX are wired without covering questions or ignoring motion settings',()=>{
 assert.match(html,/id="battle-sound-toggle"[^>]*aria-pressed="false"[^>]*hidden/);
 assert.match(ui,/battleSounds\.setEnabled\(!battleSounds\.isEnabled\(\)\)/);
 assert.match(ui,/world\.dataset\.weaponUltimate=String\(Boolean\(ultimate\)\)/);
 assert.match(ui,/playBattleCinematic\(defeated\?'victory':'attack',[^\n]*\{ultimate:usedUltimate\}\)/);
 assert.match(css,/data-weapon-ultimate="true"/);
 assert.match(css,/weapon-ultimate-halo/);
 for(const animation of ['weapon-tier-glint','weapon-tier-orbit','weapon-tier-crest','weapon-resonance-echo'])
  assert.match(css,new RegExp(animation),`Missing decorative animation: ${animation}`);
 for(const part of ['weapon-fx-glint','weapon-fx-orbit','weapon-fx-crest','weapon-fx-resonance'])
  assert.match(html,new RegExp(`class="${part}"`),`Missing contained FX layer: ${part}`);
 assert.match(css,/html\.monsters-quiet-motion \.forest-weapon-fx\{display:none!important\}/);
 assert.match(css,/\.forest-weapon-fx\{[\s\S]*?pointer-events:none/);
});
