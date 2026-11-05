// Lightweight native-pixel equipment that is layered on the actual character
// portrait, at battle, on the home screen and in the collection. No emoji or
// network images; rarity and silhouette remain visible even at 48x44.
const shapes=Object.freeze({
 sword:'<rect x="37" y="8" width="4" height="22" fill="BLADE"/><rect x="38" y="5" width="2" height="5" fill="LIGHT"/><rect x="32" y="28" width="14" height="4" fill="EDGE"/><rect x="37" y="31" width="4" height="10" fill="HANDLE"/>',
 dagger:'<polygon points="38,14 43,19 39,29 35,25" fill="BLADE"/><rect x="37" y="27" width="3" height="13" fill="HANDLE"/><rect x="33" y="27" width="10" height="3" fill="EDGE"/>',
 spear:'<rect x="38" y="17" width="3" height="25" fill="HANDLE"/><polygon points="39,3 45,18 39,23 33,18" fill="BLADE"/><rect x="38" y="9" width="2" height="10" fill="LIGHT"/>',
 staff:'<rect x="37" y="12" width="4" height="30" fill="HANDLE"/><rect x="33" y="4" width="12" height="12" fill="EDGE"/><rect x="35" y="6" width="8" height="8" fill="BLADE"/><rect x="37" y="7" width="3" height="3" fill="LIGHT"/>',
 bow:'<path d="M39 5L33 9L29 21L33 34L40 39L42 35L36 31L33 21L36 12L42 9Z" fill="HANDLE"/><path d="M40 7L41 37" fill="none" stroke="LIGHT" stroke-width="1.5"/><rect x="31" y="20" width="11" height="2" fill="BLADE"/>',
 hammer:'<rect x="37" y="13" width="4" height="29" fill="HANDLE"/><rect x="29" y="8" width="18" height="11" fill="EDGE"/><rect x="31" y="9" width="14" height="9" fill="BLADE"/><rect x="32" y="10" width="5" height="2" fill="LIGHT"/>',
 axe:'<rect x="38" y="10" width="4" height="32" fill="HANDLE"/><polygon points="38,7 45,4 47,11 44,20 38,22 30,18 30,11" fill="EDGE"/><polygon points="39,9 44,7 45,12 42,19 37,19 33,15 33,12" fill="BLADE"/>'
});
function shapeFor(weapon){
 if(weapon?.shape&&Object.hasOwn(shapes,weapon.shape))return weapon.shape;
 if(/staff|wand|scepter/.test(weapon?.id||''))return 'staff';
 if(/bow/.test(weapon?.id||''))return 'bow';
 if(/hammer/.test(weapon?.id||''))return 'hammer';
 if(/spear|lance/.test(weapon?.id||''))return 'spear';
 if(/dagger|knife|fang/.test(weapon?.id||''))return 'dagger';
 return 'sword';
}
export function weaponPixelOverlay(weapon,{legacy=false}={}){
 if(!weapon?.id||!['common','rare','epic','legend'].includes(weapon.rarity))return '';
 const colors={common:['#b0c8cd','#f0f6f3','#455766'],rare:['#65b6e8','#e8faff','#27639c'],
  epic:['#e6a5ff','#fff4cc','#8248bb'],legend:['#ffc85d','#fffbe0','#b46620']}[weapon.rarity];
 const shape=shapeFor(weapon),[blade,light,edge]=colors;
 const art=shapes[shape].replaceAll('BLADE',blade).replaceAll('LIGHT',light).replaceAll('EDGE',edge).replaceAll('HANDLE','#695145');
 const center=`<g data-equipped-weapon="${weapon.id}" data-weapon-shape="${shape}" aria-hidden="true" shape-rendering="crispEdges">${art}</g>`;
 return legacy?`<g transform="scale(3.75 3.72727)">${center}</g>`:center;
}
