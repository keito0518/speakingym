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
 axe:'<rect x="38" y="10" width="4" height="32" fill="HANDLE"/><polygon points="38,7 45,4 47,11 44,20 38,22 30,18 30,11" fill="EDGE"/><polygon points="39,9 44,7 45,12 42,19 37,19 33,15 33,12" fill="BLADE"/>',
 scythe:'<rect x="36" y="15" width="4" height="29" fill="HANDLE"/><path d="M39 13 43 6 48 3 46 14 39 22 28 24 34 18Z" fill="EDGE"/><path d="M38 12 42 7 46 5 44 13 38 19 31 22 35 17Z" fill="BLADE"/>',
 crossbow:'<rect x="36" y="19" width="5" height="24" fill="HANDLE"/><path d="M25 12 31 8 40 12 48 8 52 12 49 20 43 22 40 17 32 22 27 20Z" fill="EDGE"/><path d="M28 13 32 11 40 14 48 11 50 13 45 19 40 16 32 19Z" fill="BLADE"/><rect x="38" y="9" width="3" height="23" fill="LIGHT"/>',
 claw:'<rect x="34" y="29" width="9" height="12" fill="HANDLE"/><path d="M28 25 30 5 34 21 38 2 41 21 49 8 46 31 39 35 32 32Z" fill="EDGE"/><path d="M30 24 31 11 35 28 38 11 41 29 47 14 44 31 37 33Z" fill="BLADE"/>',
 shield:'<path d="M27 8 40 5 51 9 50 27 40 40 29 28Z" fill="EDGE"/><path d="M31 12 40 9 47 13 46 26 40 34 33 25Z" fill="BLADE"/><path d="M40 12 40 31 M34 20 46 20" stroke="LIGHT" stroke-width="2" fill="none"/>',
 whip:'<rect x="37" y="29" width="5" height="13" fill="HANDLE"/><path d="M40 29Q51 22 47 13Q45 6 38 7Q29 8 30 18Q31 24 37 23" fill="none" stroke="EDGE" stroke-width="6"/><path d="M40 29Q51 22 47 13Q45 6 38 7Q29 8 30 18Q31 24 37 23" fill="none" stroke="BLADE" stroke-width="3"/><rect x="29" y="19" width="4" height="4" fill="LIGHT"/>'
});
export function weaponShapeFor(weapon){
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
 const shape=weaponShapeFor(weapon),[blade,light,edge]=colors;
 const art=shapes[shape].replaceAll('BLADE',blade).replaceAll('LIGHT',light).replaceAll('EDGE',edge).replaceAll('HANDLE','#695145');
 const rank=Number.isSafeInteger(weapon.awakeningRank)?Math.max(0,Math.min(3,weapon.awakeningRank)):0;
 const aura=rank?`<g data-weapon-awakened="${rank}"><rect x="27" y="${20-rank*4}" width="4" height="4" fill="${rank===3?'#ffea8b':'#83f4fb'}"/><rect x="49" y="${24-rank*3}" width="3" height="3" fill="#fffceb"/>${rank>1?'<rect x="41" y="1" width="5" height="5" fill="#fff5b4"/>':''}${rank===3?'<rect x="25" y="4" width="3" height="3" fill="#ffe18f"/><rect x="51" y="33" width="3" height="3" fill="#ffe18f"/>':''}</g>`:'';
 const center=`<g data-equipped-weapon="${weapon.id}" data-weapon-shape="${shape}" data-awakening="${rank}" aria-hidden="true" shape-rendering="crispEdges">${art}${aura}</g>`;
 return legacy?`<g transform="scale(3.75 3.72727)">${center}</g>`:center;
}
