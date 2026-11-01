// Original pixel sprites, made from the 15 existing companion designs at a
// deliberate 48x44 native resolution. Both forms live in one cached atlas.
// The SVG wrapper preserves battle animations, layout and accessible labels;
// the inner PNG is enlarged with nearest-neighbor instead of vector smoothing.
const IDS=Object.freeze([
  'medamago','katappo','purupun','koge','cone','nororo','keshipon',
  'donako','amekurage','fuwari','kompass','pikap','mokuryu',
  'yukibell','railfox'
]);
const CELL_WIDTH=48,CELL_HEIGHT=44,ATLAS_WIDTH=IDS.length*CELL_WIDTH;
let nextClip=0;

export function monsterArt(id,evolved=false){
  const index=IDS.indexOf(id);
  if(index<0){
    // Unknown catalog entries stay undiscovered rather than reusing Yolkie.
    return '<svg viewBox="0 0 180 164" class="monster-svg pixel-art" role="img" aria-label="未発見のモンスター" xmlns="http://www.w3.org/2000/svg"><rect x="39" y="28" width="102" height="108" fill="#a1afa4"/><rect x="49" y="38" width="82" height="88" fill="#dce5db"/><path d="M75 67h30v12H93v15H81V79h-6Z" fill="#758b7a"/><rect x="81" y="103" width="12" height="12" fill="#758b7a"/></svg>';
  }
  const row=evolved?CELL_HEIGHT:0;
  // A clipPath on the one root SVG prevents home-walker/global CSS from
  // stretching a nested SVG and revealing the whole sprite sheet.
  const clipId=`pixel-companion-crop-${nextClip++}`;
  const sprite=`<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="${CELL_WIDTH}" height="${CELL_HEIGHT}"/></clipPath></defs><g transform="scale(${180/CELL_WIDTH} ${164/CELL_HEIGHT})" aria-hidden="true"><g clip-path="url(#${clipId})"><image href="./pixel-companions.png" x="${-index*CELL_WIDTH}" y="${-row}" width="${ATLAS_WIDTH}" height="${CELL_HEIGHT*2}" style="image-rendering:pixelated"/></g></g>`;
  // Distinct evolved silhouettes are already baked into the second atlas row.
  // Square glints make the evolution reveal read as pixel art, not vector rays.
  const back=evolved?'<g class="monster-evolution-morph monster-evolution-back" aria-hidden="true"><rect x="21" y="34" width="8" height="8" fill="#f8dc8e"/><rect x="151" y="22" width="10" height="10" fill="#ffe69b"/><rect x="160" y="48" width="5" height="5" fill="#fff4c1"/></g>':'';
  const front=evolved?'<g class="monster-evolution-morph monster-evolution-front" aria-hidden="true"><rect x="13" y="81" width="6" height="6" fill="#fff2b4"/><rect x="158" y="112" width="7" height="7" fill="#f8d783"/><rect x="144" y="132" width="4" height="4" fill="#fff9dd"/></g>':'';
  return `<svg viewBox="0 0 180 164" class="monster-svg pixel-art ${evolved?'monster-evolved':''}" data-pixel-sprite="${id}" data-evolved="${evolved}" role="img" aria-label="${evolved?'進化した':'通常の'}モンスターのイラスト" xmlns="http://www.w3.org/2000/svg">${back}${sprite}${front}</svg>`;
}
