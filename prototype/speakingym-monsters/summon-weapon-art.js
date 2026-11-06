// The summoning illustration uses the VERY SAME authored pixel weapon as
// the character equipment. A glossy vector sword beside a pixel companion
// broke the game's visual language and looked like an unrelated product.
import {weaponPixelOverlay,weaponShapeFor} from './weapon-visuals.js';

const palette=Object.freeze({
 common:{frame:'#8fb6d6',paper:'#e3f6ff',spark:'#fff7c5'},
 rare:{frame:'#5ba4ef',paper:'#d9edff',spark:'#f5ffff'},
 epic:{frame:'#b67be8',paper:'#f0deff',spark:'#ffe0fc'},
 legend:{frame:'#efa44a',paper:'#fff0b3',spark:'#fffdf0'}
});
const escapeAttribute=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function summonWeaponArtwork(weapon,{instance='single',decorative=false}={}){
 if(!weapon?.id||!Object.hasOwn(palette,weapon.rarity))return '';
 const shape=weaponShapeFor(weapon),colors=palette[weapon.rarity];
 const safeId=String(weapon.id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);
 const safeInstance=String(instance).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32);
 const id=`summon-${safeId}-${safeInstance}`;
 const rank=Number.isSafeInteger(weapon.awakeningRank)?Math.min(3,Math.max(0,weapon.awakeningRank)):0;
 const pixels=weaponPixelOverlay(weapon);
 // All 12 equipment silhouettes fit the 48x44 companion atlas. Scaling the
 // SAME geometry lets a pull reveal match the weapon carried in battle.
 const twinkles=Array.from({length:7+rank*2},(_,index)=>{
  const x=16+(index*53)%150,y=14+(index*67)%205;
  const size=index%3===0?6:3;
  return `<path d="M${x} ${y-size}v${size*2}m-${size} -${size}h${size*2}" stroke="${index%3===0?colors.spark:colors.frame}" stroke-width="${index%3===0?3:2}" />`;
 }).join('');
 return `<svg class="summon-weapon-illustration" viewBox="0 0 180 240" role="${decorative?'presentation':'img'}" aria-label="${decorative?'':escapeAttribute(weapon.name)}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <g id="${id}-pixel" data-weapon-shape="${shape}" data-awakening="${rank}">
   <rect x="13" y="11" width="154" height="218" rx="23" fill="${colors.frame}" opacity=".11"/>
   <rect x="22" y="20" width="136" height="200" rx="18" fill="${colors.paper}" opacity=".07"/>
   <path d="M19 63h12M149 63h12M19 179h12M149 179h12" stroke="${colors.frame}" stroke-width="3" opacity=".8"/>
   <g fill="none" stroke-linecap="square">${twinkles}</g>
   <g class="summon-pixel-weapon" transform="translate(-80 22) scale(4.9 4.4)">${pixels}</g>
   <path d="M52 220h76" stroke="${colors.frame}" stroke-width="3" opacity=".7"/>
  </g>
 </svg>`;
}
