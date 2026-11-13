import { newPixelCompanionArt } from './monster-new-sprites.js';
import {weaponPixelOverlay} from './weapon-visuals.js';

// Original pixel sprites, made from the 15 existing companion designs at a
// deliberate 48x44 native resolution. All three forms live in one cached atlas.
// The SVG wrapper preserves battle animations, layout and accessible labels;
// the inner PNG is enlarged with nearest-neighbor instead of vector smoothing.
const IDS=Object.freeze([
  'medamago','katappo','purupun','koge','cone','nororo','keshipon',
  'donako','amekurage','fuwari','kompass','pikap','mokuryu',
  'yukibell','railfox'
]);
const CELL_WIDTH=48,CELL_HEIGHT=44,ATLAS_WIDTH=IDS.length*CELL_WIDTH;
let nextClip=0;

// Catalog placeholders must never leak the silhouette or asset ID of a
// companion before it has actually joined the party.
export function mysteryMonsterArt(){
 return '<svg viewBox="0 0 180 164" class="monster-svg pixel-art mystery-monster-art" role="img" aria-label="未発見の仲間" xmlns="http://www.w3.org/2000/svg"><g shape-rendering="crispEdges"><path d="M50 141h80v8H50z" fill="#b9cfce"/><path d="M62 62h56v16h14v50H48V78h14z" fill="#637f8c"/><path d="M70 44h40v16H70z" fill="#637f8c"/><path d="M54 79h8v43h-8zM118 79h8v43h-8z" fill="#415f72"/><path d="M78 66h24v11H90v12H79v-12h-1zM79 99h11v11H79z" fill="#f8ebbc"/><rect x="37" y="52" width="8" height="8" fill="#b8d8d1"/><rect x="137" y="37" width="6" height="6" fill="#d6e3c5"/><rect x="143" y="96" width="7" height="7" fill="#c9dbcf"/></g></svg>';
}

// First forest meeting: eyes peeking through foliage feel like a creature in
// the world, not a placeholder '?' tile standing in for a finished character.
export function forestEncounterEyesArt(){
 return '<svg viewBox="0 0 180 164" class="monster-svg pixel-art forest-encounter-eyes" role="img" aria-label="茂みの奥に小さな目が光る" xmlns="http://www.w3.org/2000/svg"><g shape-rendering="crispEdges"><path d="M23 136v-16h12v-22h15V80h16V65h18V51h16v14h18v15h14v18h15v22h12v16z" fill="#1a4235" stroke="#3b7959" stroke-width="5"/><path d="M28 127h20v-20h19V91h46v16h21v20h18v11H28z" fill="#102e2c"/><path d="M38 97h15V78h17V66h15v19H70v17H54v17H38zM108 62h14v17h16v19h13v20h-17V99h-16V85h-10z" fill="#2c6549"/><g class="forest-encounter-gaze"><rect x="61" y="98" width="20" height="11" fill="#e7d993"/><rect x="101" y="98" width="20" height="11" fill="#e7d993"/><rect x="71" y="98" width="7" height="11" fill="#213e32"/><rect x="101" y="98" width="7" height="11" fill="#213e32"/></g><rect x="29" y="52" width="7" height="7" fill="#91bfa1"/><rect x="140" y="67" width="6" height="6" fill="#a5c390"/></g></svg>';
}

export function monsterArt(id,form=false,weapon=null){
  // Keep the established 15-character atlas intact; new residents have their
  // own authored, crisp-edged silhouettes at the same native pixel scale.
  const stage=typeof form==='number'?Math.max(0,Math.min(2,Math.floor(form))):form?1:0;
  const expansionArt=newPixelCompanionArt(id,stage);
  if(expansionArt)return weapon?expansionArt.replace('</svg>',`${weaponPixelOverlay(weapon)}</svg>`):expansionArt;
  const index=IDS.indexOf(id);
  if(index<0){
    // Unknown catalog entries stay undiscovered rather than reusing Yolkie.
    return mysteryMonsterArt();
  }
  // Accept the historical boolean API while letting all screens show stage 2.
  const evolved=stage>=1,ascended=stage===2;
  const row=stage*CELL_HEIGHT;
  // A clipPath on the one root SVG prevents home-walker/global CSS from
  // stretching a nested SVG and revealing the whole sprite sheet.
  const clipId=`pixel-companion-crop-${nextClip++}`;
  const sprite=`<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="${CELL_WIDTH}" height="${CELL_HEIGHT}"/></clipPath></defs><g transform="scale(${180/CELL_WIDTH} ${164/CELL_HEIGHT})" aria-hidden="true"><g clip-path="url(#${clipId})"><image href="./pixel-companions.png" x="${-index*CELL_WIDTH}" y="${-row}" width="${ATLAS_WIDTH}" height="${CELL_HEIGHT*3}" style="image-rendering:pixelated"/></g></g>`;
  // Distinct evolved silhouettes are already baked into the second atlas row.
  // Square glints make the evolution reveal read as pixel art, not vector rays.
  const back=evolved?'<g class="monster-evolution-morph monster-evolution-back" aria-hidden="true"><rect x="21" y="34" width="8" height="8" fill="#f8dc8e"/><rect x="151" y="22" width="10" height="10" fill="#ffe69b"/><rect x="160" y="48" width="5" height="5" fill="#fff4c1"/></g>':'';
  const front=evolved?'<g class="monster-evolution-morph monster-evolution-front" aria-hidden="true"><rect x="13" y="81" width="6" height="6" fill="#fff2b4"/><rect x="158" y="112" width="7" height="7" fill="#f8d783"/><rect x="144" y="132" width="4" height="4" fill="#fff9dd"/></g>':'';
  const crown=ascended?'<g class="monster-ascension-sparks" aria-hidden="true"><rect x="5" y="34" width="9" height="9" fill="#a8ffea"/><rect x="166" y="67" width="9" height="9" fill="#fff2aa"/><rect x="36" y="10" width="6" height="6" fill="#fff2aa"/><rect x="143" y="13" width="7" height="7" fill="#a8ffea"/></g>':'';
  return `<svg viewBox="0 0 180 164" class="monster-svg pixel-art ${evolved?'monster-evolved':''} ${ascended?'monster-ascended':''}" data-pixel-sprite="${id}" data-evolved="${evolved}" data-stage="${stage}" role="img" aria-label="${ascended?'第2進化した':evolved?'進化した':'通常の'}モンスターのイラスト" xmlns="http://www.w3.org/2000/svg">${back}${sprite}${front}${crown}${weaponPixelOverlay(weapon,{legacy:true})}</svg>`;
}
