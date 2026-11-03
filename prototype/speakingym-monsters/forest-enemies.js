// Forest and Snow City enemies share one 48px pixel-art atlas. Variants retain
// their existing color affinities, but never change question or HP logic.
const IDS=Object.freeze([
  'mossling','thistlet','spookap','bramblet','mothum',
  'thornking','sunwarden','mistknight','elderroot',
  'signbit','tickety','signalyn','parceloo','lanternet','metroguardian'
]);
const VARIANTS=Object.freeze({
  sunmoss:'mossling',beethorn:'thistlet',glowcap:'spookap',ambernut:'bramblet',daymoth:'mothum',
  fogling:'mossling',nightthorn:'thistlet',whispercap:'spookap',bitterbud:'bramblet',duskmoth:'mothum',
  rootlet:'mossling',ancienthorn:'thistlet',oraclecap:'spookap',stonebud:'bramblet',starmoth:'mothum',
  marketwarden:'metroguardian',railkeeper:'metroguardian',blizzardking:'metroguardian',
  runewisp:'mossling',coglet:'bramblet',glasshade:'mothum',orbitbat:'thistlet',glyphcap:'spookap',
  astergolem:'elderroot',clockoracle:'metroguardian'
});
const CITY_IDS=new Set(['signbit','tickety','signalyn','parceloo','lanternet',
  'metroguardian','marketwarden','railkeeper','blizzardking']);
const SUN=new Set(['sunmoss','beethorn','glowcap','ambernut','daymoth']);
const FOG=new Set(['fogling','nightthorn','whispercap','bitterbud','duskmoth']);
const ROOT=new Set(['rootlet','ancienthorn','oraclecap','stonebud','starmoth']);
const RUINS=new Set(['runewisp','coglet','glasshade','orbitbat','glyphcap','astergolem','clockoracle']);
let nextClip=0;
export function enemyArt(id){
  const base=VARIANTS[id]||id;
  const index=Math.max(0,IDS.indexOf(base));
  const tint=SUN.has(id)?'hue-rotate(-24deg) saturate(1.25)':
    FOG.has(id)?'hue-rotate(105deg) saturate(.78)':
    ROOT.has(id)?'sepia(.42) saturate(.9)':
    id==='marketwarden'?'sepia(.35) saturate(1.4)':
    id==='railkeeper'?'hue-rotate(44deg) saturate(1.12)':
    id==='blizzardking'?'hue-rotate(146deg) saturate(1.35)':
    RUINS.has(id)?'hue-rotate(208deg) saturate(1.35) contrast(1.16)':'';
  const clipId=`pixel-enemy-crop-${nextClip++}`;
  const sprite=`<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="48" height="48"/></clipPath></defs><g transform="scale(${148/48} ${150/48})" aria-hidden="true"><g clip-path="url(#${clipId})"><image href="./pixel-enemies.png" x="${-index*48}" width="${IDS.length*48}" height="48" style="image-rendering:pixelated"/></g></g>`;
  const motif=tint?'<g class="pixel-enemy-motif" aria-hidden="true"><rect x="126" y="11" width="9" height="9" fill="#fff0bc"/><rect x="129" y="5" width="3" height="21" fill="#6d8b67"/><rect x="120" y="14" width="21" height="3" fill="#6d8b67"/></g>':'';
  return `<svg class="forest-enemy-svg pixel-art" data-pixel-foe="${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 150" role="img" aria-label="${RUINS.has(id)?'遺跡の敵モンスター':CITY_IDS.has(id)?'街の敵モンスター':'森の敵モンスター'}"><g ${tint?`style="filter:${tint}"`:''}>${sprite}</g>${motif}</svg>`;
}
