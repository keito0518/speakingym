import assert from 'node:assert/strict';
import test from 'node:test';
import {summonWeaponArtwork} from '../prototype/speakingym-monsters/summon-weapon-art.js';
import {weaponPixelOverlay} from '../prototype/speakingym-monsters/weapon-visuals.js';

const silhouettes=['sword','dagger','spear','staff','bow','hammer','axe','scythe','crossbow','claw','shield','whip','fan','flute','lantern','ring'];

test('every weapon class has a matching crisp pixel summon portrait, not glossy vector art',()=>{
 const illustrations=silhouettes.map(shape=>summonWeaponArtwork({
  id:`test_${shape}`,name:`Test ${shape}`,rarity:'rare',shape
 },{instance:'deck'}));
 for(let index=0;index<silhouettes.length;index++){
  const picture=illustrations[index];
  assert.match(picture,/viewBox="0 0 180 240"/);
  assert.match(picture,new RegExp(`data-weapon-shape="${silhouettes[index]}"`));
  assert.match(picture,new RegExp(`data-equipped-weapon="test_${silhouettes[index]}"`));
  assert.equal((picture.match(/data-equipped-weapon=/g)||[]).length,1,
   'Only the actual pixel weapon should carry the equipment marker');
  assert.match(picture,/shape-rendering="crispEdges"/);
  assert.match(picture,/class="summon-pixel-weapon"/);
  assert.match(picture,/<rect /);
  assert.match(picture,/<path /);
  assert.doesNotMatch(picture,/linearGradient|radialGradient|stroke-linecap="round"/);
 }
 assert.equal(new Set(illustrations).size,silhouettes.length);
});

test('a duplicate can display multiple instances without colliding art IDs',()=>{
 const weapon={id:'comet_bow',name:'Comet bow',shape:'bow',rarity:'legend',awakeningRank:3};
 const main=summonWeaponArtwork(weapon,{instance:'main'});
 const tenth=summonWeaponArtwork(weapon,{instance:'batch-9',decorative:true});
 assert.match(main,/id="summon-comet_bow-main-pixel"/);
 assert.match(tenth,/id="summon-comet_bow-batch-9-pixel"/);
 assert.match(main,/data-awakening="3"/);
 assert.match(tenth,/role="presentation"/);
 assert.match(main,/fill="#fffdf1"/);
});

test('malformed weapon metadata cannot inject markup or unbounded gradient identifiers',()=>{
 assert.equal(summonWeaponArtwork({id:'x',rarity:'unknown'}),'');
 assert.equal(summonWeaponArtwork(null),'');
 const result=summonWeaponArtwork({
  id:'x"><script>alert(1)</script>',name:'"><img src=x onerror=alert(1)>',
  rarity:'common',shape:'sword'
 });
 assert.doesNotMatch(result,/<script>|<img/);
 assert.match(result,/data-equipped-weapon="x&quot;&gt;&lt;script&gt;/);
 assert.match(result,/aria-label="&quot;&gt;&lt;img/);
});

test('equipped weapon sprites have hand-authored pixels and do not cover the classic hero face',()=>{
 for(const shape of silhouettes){
  const art=weaponPixelOverlay({id:`hero_${shape}`,rarity:'legend',shape,awakeningRank:3},{legacy:true});
  assert.match(art,/transform="translate\(34 17\) scale\(2.65 2.65\)"/);
  assert.match(art,/shape-rendering="crispEdges"/);
  assert.match(art,/data-equipped-weapon="hero_/);
  assert.match(art,/fill="#fffdf1"/,'Every weapon gets a jewel-colored pixel detail');
 }
 assert.match(weaponPixelOverlay({id:'shield',shape:'shield',rarity:'rare'},{legacy:true}),/translate\(34 17\) scale\(2.65 2.65\)/);
 assert.ok(34+54*2.65<180,'Even a fully awakened classic weapon stays inside the 180px atlas');
});

test('all new-character weapons fit the 48x44 atlas and escape hostile IDs',()=>{
 for(const shape of silhouettes){
  const weapon={id:`new_${shape}`,rarity:'epic',shape,awakeningRank:3};
  const rendered=weaponPixelOverlay(weapon);
  assert.match(rendered,/transform="translate\(6 0\) scale\(\.77 \.94\)"/);
  assert.match(rendered,new RegExp(`data-weapon-shape="${shape}"`));
  assert.match(rendered,/shape-rendering="crispEdges"/);
 }
 const hostile=weaponPixelOverlay({id:'"><script>alert(1)</script>',rarity:'rare',shape:'sword'});
 assert.doesNotMatch(hostile,/<script>/);
 assert.match(hostile,/data-equipped-weapon="&quot;&gt;&lt;script&gt;/);
});

test('each duplicate resonance stage has a distinct pixel palette within its original rarity',()=>{
 for(const rarity of ['common','rare','epic','legend']){
  const variants=Array.from({length:4},(_,rank)=>weaponPixelOverlay({id:'tint_test',shape:'fan',rarity,awakeningRank:rank}));
  assert.equal(new Set(variants).size,4,`${rarity} has four distinguishable palettes`);
  for(let rank=0;rank<4;rank++)assert.match(variants[rank],new RegExp(`data-awakening="${rank}"`));
  assert.notEqual(variants[0].match(/fill="#[0-9a-f]{6}"/ig)?.join('|'),variants[1].match(/fill="#[0-9a-f]{6}"/ig)?.join('|'),
   'First duplicate changes the actual weapon pixels');
 }
});
