import assert from 'node:assert/strict';
import test from 'node:test';
import {summonWeaponArtwork} from '../prototype/speakingym-monsters/summon-weapon-art.js';

const silhouettes=['sword','dagger','spear','staff','bow','hammer','axe','scythe','crossbow','claw','shield','whip'];

test('every weapon class gets its own detailed, responsive summoning portrait',()=>{
 const illustrations=silhouettes.map(shape=>summonWeaponArtwork({
  id:`test_${shape}`,name:`Test ${shape}`,rarity:'rare',shape
 },{instance:'deck'}));
 for(let index=0;index<silhouettes.length;index++){
  const picture=illustrations[index];
  assert.match(picture,/viewBox="0 0 180 240"/);
  assert.match(picture,new RegExp(`data-weapon-shape="${silhouettes[index]}"`));
  assert.match(picture,new RegExp(`data-equipped-weapon="test_${silhouettes[index]}"`));
  assert.match(picture,/linearGradient/);
  assert.match(picture,/radialGradient/);
  assert.match(picture,/<path /);
 }
 assert.equal(new Set(illustrations).size,silhouettes.length);
});

test('a duplicate can display multiple instances without colliding paint IDs',()=>{
 const weapon={id:'comet_bow',name:'Comet bow',shape:'bow',rarity:'legend',awakeningRank:3};
 const main=summonWeaponArtwork(weapon,{instance:'main'});
 const tenth=summonWeaponArtwork(weapon,{instance:'batch-9',decorative:true});
 assert.match(main,/id="summon-comet_bow-main-metal"/);
 assert.match(tenth,/id="summon-comet_bow-batch-9-metal"/);
 assert.match(main,/data-awakening="3"/);
 assert.match(tenth,/role="presentation"/);
 assert.match(main,/stop-color="#ffc96e"/);
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
