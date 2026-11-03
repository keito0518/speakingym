// Original, tiny pixel silhouettes for the twelve new forest/city companions.
// Drawn as crisp SVG geometry so no atlas rewrite or network image is needed.
// Each creature has its own shape, a brighter trained form and a second-form
// crown/wing silhouette. These are characters, not random mosaic tiles.
const C={
 tsubomi:['#395e45','#73bc78','#b9ed8d','#eecb83'],
 kinokko:['#66465d','#b97691','#f4b7c2','#fff1ca'],
 shizurin:['#365b75','#6ab4d8','#b5edff','#f4faff'],
 hoshiri:['#755335','#e8b65d','#fff1a5','#f7ffff'],
 pipino:['#765049','#db8f79','#ffce9f','#f4e06e'],
 hiokko:['#71412e','#de8145','#ffc377','#fff0a7'],
 kippu:['#69543d','#dfbd79','#ffe8ad','#d86d5a'],
 kofuu:['#684b43','#b7896b','#f1d7aa','#f4f2e5'],
 mafura:['#544966','#ad90c8','#dec5f7','#f9d0d9'],
 yukidama:['#42687d','#9acddf','#e1f9ff','#fdfdf5'],
 tegami:['#705947','#d9bd8a','#fff3ca','#dc8784'],
 tokirin:['#564934','#cba760','#f5db8e','#a1d7db']
};
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const poly=(points,c)=>`<polygon points="${points}" fill="${c}"/>`;
const eyes=(x,y,o)=>rect(x,y,3,4,o)+rect(x+12,y,3,4,o)+rect(x+1,y,1,1,'#fff9e6')+rect(x+13,y,1,1,'#fff9e6');

function design(id,stage){
 const [d,b,l,a]=C[id],R=rect,P=poly;
 const glow=stage>=1,royal=stage>=2;
 switch(id){
  case 'tsubomi':return `${glow?R(5,19,10,7,d)+R(33,17,10,7,d)+R(7,20,8,5,l)+R(33,18,8,5,l):''}
   ${R(20,8,8,31,d)+R(22,9,4,28,b)+R(12,10,24,8,d)+R(13,11,22,6,b)}
   ${R(7,9,10,7,d)+R(9,11,8,5,l)+R(31,6,10,8,d)+R(31,8,8,5,l)}
   ${R(14,22,20,13,d)+R(16,24,16,11,b)+eyes(17,27,d)+R(22,34,5,2,a)}
   ${royal?R(19,2,10,8,a)+R(16,4,16,3,d)+R(4,14,7,6,l)+R(37,13,7,6,l):''}`;
  case 'kinokko':return `${glow?R(3,15,8,12,d)+R(37,15,8,12,d)+R(5,16,6,9,b)+R(37,16,6,9,b):''}
   ${R(14,19,20,20,d)+R(16,21,16,16,l)+R(7,11,34,13,d)+R(11,6,26,7,d)+R(9,12,30,10,b)}
   ${R(15,9,8,5,l)+R(29,13,6,5,l)+R(10,19,7,4,l)+eyes(17,27,d)+R(21,35,7,2,b)}
   ${royal?R(18,2,12,6,a)+R(13,4,5,6,d)+R(30,4,5,6,d)+R(22,3,4,3,l):''}`;
  case 'shizurin':return `${glow?R(8,21,8,8,d)+R(32,21,8,8,d)+R(10,22,6,6,l)+R(32,22,6,6,l):''}
   ${P('23,2 17,11 12,17 8,27 10,35 15,40 33,40 39,35 40,26 34,16 27,9',d)}
   ${P('23,7 17,17 12,27 14,34 19,37 30,37 35,33 36,26 29,16',b)}
   ${R(17,19,6,5,l)+R(15,25,4,8,l)+eyes(17,29,d)+R(23,36,5,2,a)}
   ${royal?R(21,1,6,4,a)+R(3,26,6,6,l)+R(39,26,6,6,l)+R(8,38,6,4,b)+R(34,38,6,4,b):''}`;
  case 'hoshiri':return `${glow?R(3,22,9,7,a)+R(36,22,9,7,a):''}
   ${P('24,2 31,14 45,16 36,26 39,40 24,33 9,40 12,26 3,16 17,14',d)}
   ${P('24,7 29,17 40,18 32,26 35,35 24,29 13,35 16,26 8,18 19,17',b)}
   ${R(19,10,5,6,l)+R(24,10,4,5,l)+eyes(16,22,d)+R(21,29,6,2,a)}
   ${royal?R(22,0,5,4,a)+R(1,11,6,6,l)+R(41,11,6,6,l)+R(20,37,8,6,a):''}`;
  case 'pipino':return `${glow?R(3,20,13,11,d)+R(32,18,13,11,d)+R(5,20,10,8,l)+R(33,19,10,8,l):''}
   ${R(13,12,23,25,d)+R(10,18,29,16,d)+R(14,15,21,20,b)+R(15,13,13,6,l)}
   ${R(35,23,9,5,d)+R(37,24,7,3,a)+R(7,23,9,10,d)+R(9,24,7,6,b)}
   ${eyes(17,21,d)+R(23,28,6,3,a)+R(17,37,4,5,d)+R(29,37,4,5,d)}
   ${royal?R(15,5,5,8,a)+R(22,4,5,7,a)+R(30,5,5,8,a)+R(17,3,16,3,d):''}`;
  case 'hiokko':return `${glow?R(7,24,10,8,d)+R(31,24,10,8,d)+R(9,26,7,5,a)+R(32,26,7,5,a):''}
   ${R(13,4,9,19,d)+R(26,2,9,21,d)+R(15,6,6,15,b)+R(28,4,5,17,a)}
   ${R(10,18,28,21,d)+R(12,20,24,17,b)+R(15,19,18,8,l)+eyes(16,27,d)}
   ${R(19,36,4,5,d)+R(28,36,4,5,d)+R(22,35,6,2,a)}
   ${royal?R(19,0,10,6,a)+R(5,13,7,13,a)+R(36,12,7,13,a)+R(20,2,5,6,l):''}`;
  case 'kippu':return `${glow?R(4,15,10,7,a)+R(34,15,10,7,a):''}
   ${R(6,9,36,29,d)+R(8,11,32,25,b)+R(6,17,6,7,'#f7f1df')+R(36,17,6,7,'#f7f1df')}
   ${R(14,13,20,4,l)+R(14,32,20,3,l)+R(22,13,4,22,d)+eyes(13,23,d)+R(21,30,5,2,a)}
   ${royal?R(18,3,12,8,a)+R(3,30,7,7,l)+R(38,30,7,7,l):''}`;
  case 'kofuu':return `${glow?R(4,17,11,7,l)+R(34,17,11,7,l):''}
   ${R(12,15,27,23,d)+R(14,17,23,19,b)+R(36,19,9,15,d)+R(38,21,5,10,'#f6e8cd')}
   ${R(16,14,19,4,l)+R(19,8,4,7,l)+R(26,4,4,10,l)+R(33,7,4,7,l)}
   ${eyes(17,24,d)+R(22,32,6,2,a)+R(14,37,25,3,d)}
   ${royal?R(15,1,5,8,a)+R(25,0,6,7,a)+R(36,2,5,8,a):''}`;
  case 'mafura':return `${glow?R(3,21,12,10,d)+R(33,21,12,10,d)+R(4,23,10,6,l)+R(34,23,10,6,l):''}
   ${R(11,13,28,22,d)+R(13,15,24,18,b)+R(16,16,18,6,l)}
   ${R(28,31,13,11,d)+R(30,32,9,9,b)+R(34,38,4,4,l)+R(13,31,8,8,d)}
   ${eyes(16,24,d)+R(24,32,5,2,a)+R(7,12,9,8,a)}
   ${royal?R(13,5,10,10,l)+R(26,4,9,10,a)+R(19,8,11,4,d):''}`;
  case 'yukidama':return `${glow?R(2,22,12,7,l)+R(34,22,12,7,l):''}
   ${R(13,8,23,31,d)+R(8,14,33,20,d)+R(11,12,27,25,b)}
   ${R(15,16,9,6,l)+R(26,13,7,8,l)+R(11,28,26,7,l)+eyes(17,25,d)+R(22,34,6,2,a)}
   ${R(22,3,5,9,d)+R(21,5,7,5,l)+R(3,22,9,4,d)+R(37,22,8,4,d)}
   ${royal?R(20,0,9,5,l)+R(5,8,7,7,l)+R(36,8,7,7,l)+R(8,37,7,5,l)+R(33,37,7,5,l):''}`;
  case 'tegami':return `${glow?R(2,13,10,13,d)+R(36,13,10,13,d)+R(4,15,8,9,l)+R(36,15,8,9,l):''}
   ${R(8,12,32,27,d)+R(10,14,28,23,l)+P('10,14 24,28 38,14',b)+R(12,31,24,5,b)}
   ${eyes(15,25,d)+R(22,33,6,2,a)+R(15,38,5,4,d)+R(29,38,5,4,d)}
   ${royal?R(19,4,10,8,a)+R(16,6,16,3,d)+R(1,27,9,8,l)+R(38,27,9,8,l):''}`;
  case 'tokirin':return `${glow?R(4,14,10,9,d)+R(34,14,10,9,d)+R(6,16,8,6,a)+R(34,16,8,6,a):''}
   ${R(12,7,24,33,d)+R(8,13,32,22,d)+R(11,11,26,26,b)+R(16,15,16,16,l)}
   ${R(22,13,4,11,d)+R(23,22,9,3,d)+R(7,6,8,8,d)+R(33,6,8,8,d)}
   ${R(17,28,4,4,d)+R(29,28,4,4,d)+R(23,33,6,2,a)+R(20,38,8,5,d)}
   ${royal?R(21,0,6,7,a)+R(2,29,8,8,l)+R(38,29,8,8,l):''}`;
  default:return '';
 }
}

export function newPixelCompanionArt(id,stage=0){
 if(!Object.hasOwn(C,id))return null;
 const s=Math.min(2,Math.max(0,Math.floor(stage)));
 const evolved=s>=1,ascended=s===2;
 // A fixed 48×44 grid matches the original atlas' native pixel resolution.
 const scale=s===0?1:s===1?1.035:1.08;
 const silhouette=`<g transform="translate(24 22) scale(${scale}) translate(-24 -22)">${design(id,s)}</g>`;
 const sparks=ascended?`<g aria-hidden="true">${rect(1,8,4,4,'#f4eab2')}${rect(43,4,4,4,'#b2f6f1')}${rect(3,37,3,3,'#e9fdb9')}${rect(42,35,4,4,'#ffe2a4')}</g>`:'';
 return `<svg viewBox="0 0 48 44" class="monster-svg pixel-art ${evolved?'monster-evolved':''} ${ascended?'monster-ascended':''}" data-pixel-sprite="${id}" data-evolved="${evolved}" data-stage="${s}" role="img" aria-label="${ascended?'第2進化した':evolved?'進化した':'通常の'}モンスターのイラスト" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${silhouette}${sparks}</svg>`;
}
