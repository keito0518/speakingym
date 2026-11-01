// Hand-authored pixel sprites. Every edge and facial feature is painted on a
// 48x44 integer grid: no vector rasterization, resampling or dithering.
// Run `node prototype/speakingym-monsters/pixel-art-source.mjs` from the repo;
// the two PNGs are rebuilt alongside this file without npm dependencies.
import {writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
const W=48,H=44;
const colorCache=new Map();
function rgba(hex){
 if(!colorCache.has(hex)){
  const v=hex.replace('#','');
  colorCache.set(hex,[parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16),v.length===8?parseInt(v.slice(6,8),16):255]);
 }
 return colorCache.get(hex);
}
class Pix {
 constructor(){this.b=new Uint8Array(W*H*4);}
 p(x,y,col){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*4,c=rgba(col);this.b.set(c,i);}
 r(x,y,w,h,c){for(let yy=Math.floor(y);yy<y+h;yy++)for(let xx=Math.floor(x);xx<x+w;xx++)this.p(xx,yy,c);}
 line(x0,y0,x1,y1,c,t=1){const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx-dy;for(;;){this.r(x0-Math.floor(t/2),y0-Math.floor(t/2),t,t,c);if(x0===x1&&y0===y1)break;const d=2*e;if(d>-dy){e-=dy;x0+=sx;}if(d<dx){e+=dx;y0+=sy;}}}
 star(x,y,c){this.r(x-1,y-4,2,9,c);this.r(x-4,y-1,9,2,c);this.r(x,y,1,1,'#fffbed');}
 shadow(x=24,y=39,w=24){this.r(x-w/2,y,w,2,'#29383a23');this.r(x-w/2+4,y+2,w-8,1,'#29383a15');}
 // Shapes are unions of integer-grid ellipses, polygons and rectangles.
 mask(parts){const m=new Uint8Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  for(const q of parts){let hit=false;
   if(q[0]==='e')hit=((x+.5-q[1])/q[3])**2+((y+.5-q[2])/q[4])**2<=1;
   else if(q[0]==='r')hit=x>=q[1]&&y>=q[2]&&x<q[1]+q[3]&&y<q[2]+q[4];
   else if(q[0]==='p'){
    const points=q[1];let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
     const [xi,yi]=points[i],[xj,yj]=points[j];
     if((yi>y+.5)!==(yj>y+.5)&&(x+.5)<(xj-xi)*(y+.5-yi)/(yj-yi)+xi)inside=!inside;
    }hit=inside;
   }
   if(hit){m[y*W+x]=1;break;}
  }
 }return m;}
 shape(parts,{base,outline,light,shade,center=[24,23],lightY=17,shadeY=29,shadeX=15}={}){
  const m=this.mask(parts);
  // The one-pixel outer contour is an intentional solid staircase.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!m[y*W+x]){
   let near=false;for(let yy=Math.max(0,y-1);yy<=Math.min(H-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(W-1,x+1);xx++)if(m[yy*W+xx])near=true;
   if(near)this.p(x,y,outline);
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(m[y*W+x]){
   let col=base;
   if(light&&x<center[0]+5&&y<lightY)col=light;
   if(shade&&x>shadeX&&y>=shadeY)col=shade;
   this.p(x,y,col);
  }
 }
 face(x=24,y=24,ink='#342d34',blush='#ef8790',mode='smile'){
  this.r(x-7,y-2,2,3,ink);this.r(x+5,y-2,2,3,ink);
  this.p(x-7,y-2,'#fffaf0');this.p(x+5,y-2,'#fffaf0');
  if(mode==='sleep'){this.r(x-7,y,3,1,ink);this.r(x+4,y,3,1,ink);}
  else if(mode==='stern'){this.r(x-2,y+6,5,1,ink);}
  else {this.r(x-3,y+4,1,2,ink);this.r(x-2,y+6,5,1,ink);this.r(x+3,y+4,1,2,ink);}
  if(blush){this.r(x-11,y+3,3,1,blush);this.r(x+9,y+3,3,1,blush);}
 }
 feet(c='#6d594c',y=37){this.r(14,y,7,3,c);this.r(29,y,7,3,c);}
 arms(c='#62574c',y=27){this.r(9,y,6,2,c);this.r(33,y,6,2,c);this.r(8,y-1,2,3,c);this.r(38,y-1,2,3,c);}
}
const P={
 egg:{base:'#fff5df',outline:'#6d4d47',light:'#fffdf0',shade:'#dbc9b2'},
 sock:{base:'#9a81d3',outline:'#4c456c',light:'#c9b7f4',shade:'#6f64a5'},
 pud:{base:'#ffcf66',outline:'#765143',light:'#fff29a',shade:'#e8a64c'},
 toast:{base:'#e6a66b',outline:'#704b3c',light:'#ffdc9b',shade:'#bf7448'},
 cone:{base:'#edc17d',outline:'#765143',light:'#ffe4a3',shade:'#cf9057'},
 roll:{base:'#374f45',outline:'#283d38',light:'#54705f',shade:'#283f37'},
 eraser:{base:'#7fc5cf',outline:'#49667f',light:'#bcebea',shade:'#5d9dae'},
 donut:{base:'#eeb0b8',outline:'#855b69',light:'#ffd8cf',shade:'#d68b9f'},
 jelly:{base:'#77c4da',outline:'#4a718e',light:'#b3eced',shade:'#5696be'},
 cloud:{base:'#ecf9f4',outline:'#7994a3',light:'#ffffff',shade:'#b7d4df'},
 compass:{base:'#d8b97d',outline:'#746149',light:'#fff0ba',shade:'#b99457'},
 bug:{base:'#9fcb6e',outline:'#536647',light:'#d7e889',shade:'#79a752'},
 dragon:{base:'#83bd82',outline:'#416b56',light:'#b3df92',shade:'#5b966c'},
 bell:{base:'#95cfe0',outline:'#526a91',light:'#d6f5f1',shade:'#639fc2'},
 fox:{base:'#e9a06c',outline:'#784b49',light:'#ffd390',shade:'#bf704e'}
};
function companion(id,evo){const c=new Pix(),v=evo?1:0;const e=(x,y,rx,ry)=>['e',x,y,rx,ry],r=(x,y,w,h)=>['r',x,y,w,h],p=(...a)=>['p',a];
 const shape=(parts,pal,opts={})=>c.shape(parts,{...pal,...opts});
 const feet=(color,y=37)=>c.feet(color,y),face=(x=24,y=24,ink='#3b3640',blush='#ed9990',mode='smile')=>c.face(x,y,ink,blush,mode);
 c.shadow();
 switch(id){
 case 'medamago':{
  feet('#946946');c.arms('#755e4b');
  if(v){c.star(7,8,'#f7ce62');c.star(41,11,'#f7ce62');shape([p([17,13],[14,3],[20,8],[24,2],[28,8],[33,3],[33,14])],{base:'#e5a944',outline:'#75513e',light:'#ffe187',shade:'#c68732'});}
  shape([e(24,23,17+v,14+v),e(12,23,9,10),e(17,13,10,8),e(29,13,11,8),e(38,21,7,10),e(34,32,10,7),e(14,32,10,7)],P.egg,{shadeY:33,shadeX:13});
  shape([e(24,24,11+v,10+v)],{base:'#ffb52f',outline:'#ac692b',light:'#ffdb68',shade:'#ed9426'},{lightY:20,shadeY:31,shadeX:24});
  if(v){shape([e(33,14,5,5)],{base:'#ffd05a',outline:'#ad6e2a',light:'#ffe88c',shade:'#e9a831'},{shadeY:17});c.r(31,13,2,2,'#75513e');c.r(36,13,2,2,'#75513e');}
  face(24,23,'#583d36','#f88d7b');c.r(18,17,4,2,'#fff9d0');break;}
 case 'katappo':{
  feet('#5a4c80',38);if(v){c.star(37,7,'#f9d97f');c.r(15,6,4,5,'#6c579f');}
  shape([r(17-v,10-v,16+v,20),r(17,25,20,10),e(33,30,8,6),e(20,29,7,6)],P.sock,{lightY:17,shadeY:30,shadeX:22});
  c.r(18,11-v,13+v,2,'#eee7ff');c.r(18,15-v,13+v,2,'#d6bcea');
  c.r(32,31,8,3,'#f2a5c7');c.r(18,32,9,3,'#6b599f');
  if(v){shape([p([10,20],[16,16],[20,24],[17,30],[9,27])],{base:'#f7c96e',outline:'#846748',light:'#ffe89d',shade:'#dba652'},{shadeY:27});c.r(19,6,12,3,'#f7d7e4');}
  face(27,24,'#40385d','#ef96b0');break;}
 case 'purupun':{
  feet('#935a48');if(v){c.star(38,10,'#ffdc8b');c.r(23,5,2,5,'#7d5d41');c.r(21,3,6,4,'#ef6d70');}
  shape([p([14,13],[34,13],[39+v,33],[9-v,33])],P.pud,{lightY:23,shadeY:29});
  shape([p([14,12],[34,12],[36,18],[12,18])],{base:'#a76241',outline:'#754633',light:'#dc9462',shade:'#8d513c'},{lightY:15,shadeY:17});
  c.r(15,17,18,2,'#edb979');if(v){c.r(13,10,22,3,'#fff1bc');c.r(10,33,29,2,'#d8a64f');}
  face(24,25,'#76513f','#f7a277');break;}
 case 'koge':{
  feet('#7c5245');if(v){shape([p([9,15],[3,21],[9,31],[14,30])],{base:'#c95b4f',outline:'#793e3c',light:'#ec8b64',shade:'#9e4546'},{shadeY:26});c.star(40,12,'#fbd67b');}
  shape([r(10,17,28,18),e(15,17,7,8),e(24,13,10,7),e(33,17,7,8)],P.toast,{lightY:19,shadeY:30});
  shape([r(15,20,18,12)],{base:'#ffe3ad',outline:'#a8704e',light:'#fff0c6',shade:'#f7c88d'},{shadeY:29});
  if(v){c.r(22,13,9,6,'#fff0a2');c.r(25,15,3,2,'#ffd465');c.r(38,25,3,3,'#f6ba6c');}
  face(24,24,'#735143','#e7aa8d');break;}
 case 'cone':{
  feet('#88674c',39);
  shape([p([14,19],[34,19],[24,38])],P.cone,{shadeY:31,shadeX:22});
  for(let y=23;y<35;y+=5)c.line(18,y,29,y+4,'#c18d57');
  if(v){shape([e(18,13,9,8)],{base:'#e7a6bc',outline:'#946681',light:'#ffd8de',shade:'#c889a4'},{lightY:10,shadeY:19});shape([e(31,12,9,8)],{base:'#fff1cd',outline:'#997e73',light:'#fffdf0',shade:'#e2c9a4'},{shadeY:17});}
  shape([e(24,16-v,13,10),e(16,19,7,7),e(32,19,7,7)],{base:'#f8ebd3',outline:'#8f735f',light:'#fffdf0',shade:'#deceb9'},{lightY:13,shadeY:23});
  if(v){c.r(23,5,2,5,'#80583f');c.r(21,3,6,5,'#e76e83');c.r(23,3,2,2,'#fff0ab');}
  face(24,15,'#6b534a','#f7ad9d');break;}
 case 'nororo':{
  feet('#355246');if(v){shape([p([10,20],[4,13],[18,16])],{base:'#a7cdb9',outline:'#4f7465',light:'#d5eee0',shade:'#8eae99'},{shadeY:22});}
  shape([e(24,24,16+v,13+v)],P.roll,{shadeY:30});
  shape([e(24,24,11,10)],{base:'#f6efe1',outline:'#d0c5af',light:'#fffef8',shade:'#dcd1ba'},{shadeY:29});
  shape([e(24,24,6+v,5+v)],{base:v?'#f4b68d':'#f5a5a4',outline:'#ae777c',light:'#ffd6b9',shade:'#d98b82'},{shadeY:27});
  if(v){c.r(15,12,18,3,'#e2ad6b');c.r(20,8,8,5,'#759a80');}
  face(24,22,'#5a4d4d',null);break;}
 case 'keshipon':{
  feet('#4f657a');c.arms('#62889a',28);
  shape([r(11-v,13-v,26+v*2,23+v)],P.eraser,{shadeY:31});
  c.r(13,14,22,8,'#f6c3d0');c.r(13,22,22,3,'#fce7d8');c.r(15,16,14,2,'#fff3f1');
  if(v){c.r(19,6,10,8,'#537c9a');c.r(22,3,4,5,'#a8dbe0');c.star(39,9,'#ffde7b');}
  face(24,27,'#425d6f','#ed969c');break;}
 case 'donako':{
  feet('#885b6a');if(v){c.star(39,9,'#fcd17d');c.r(20,4,8,3,'#d888af');}
  const ring=[e(24,24,17+v,15+v)];
  // A real transparent donut hole, outlined by a compact chocolate inner rim.
  shape(ring,P.donut,{lightY:19,shadeY:32});
  shape([e(24,24,8,7)],{base:'#b97f64',outline:'#855a59',light:'#dba487',shade:'#9e6c61'},{shadeY:27});
  // Pink frosting drips are separate deliberate pixel clusters.
  c.r(14,15,5,4,'#ffd0de');c.r(19,12,11,3,'#ffbfd1');c.r(30,15,5,4,'#f5a9c8');
  if(v){c.r(11,21,4,5,'#ffd5e0');c.r(33,23,4,6,'#f4b2cf');c.r(15,19,3,1,'#f2d76e');c.r(31,18,3,1,'#83d4ca');}
  face(24,31,'#764b55','#ef9aaa');break;}
 case 'amekurage':{
  for(const x of [14,21,28,35]){c.r(x,28,3,v?10:8,'#5a91bb');c.r(x,33,2,4,'#88c8e4');}
  if(v){c.star(7,12,'#d8f6ff');c.star(41,13,'#d8f6ff');}
  shape([e(24,22,16+v,13+v),r(9-v,22,30+v*2,6)],P.jelly,{lightY:19,shadeY:28});
  c.r(13,26,22,2,'#b1e7ec');c.r(17,14,8,2,'#d9fcf5');
  if(v){c.r(21,7,6,4,'#c2e8f5');c.r(23,5,2,3,'#8ccfe6');c.star(40,23,'#f3f5b1');}
  face(24,22,'#41647d','#f5a4ad');break;}
 case 'fuwari':{
  feet('#889e9e');if(v){for(const [yy,cc] of [[12,'#f2a1a7'],[14,'#f5d58d'],[16,'#9ccca5']])c.r(11,yy,26,2,cc);}
  shape([e(24,24,17+v,11+v),e(14,22,9,10),e(24,17,10,10),e(34,22,9,10),r(11,24,26,9)],P.cloud,{shadeY:32});
  if(v){c.star(7,15,'#f8c99e');c.star(41,21,'#f8d698');}
  face(24,26,'#657985','#f5adb0');break;}
 case 'kompass':{
  feet('#76664e');if(v){shape([p([11,16],[2,10],[9,27],[13,26])],{base:'#d7ddbf',outline:'#7a947c',light:'#f0f2d2',shade:'#afc4a0'},{shadeY:22});shape([p([37,16],[46,10],[39,27],[35,26])],{base:'#d7ddbf',outline:'#7a947c',light:'#f0f2d2',shade:'#afc4a0'},{shadeY:22});}
  shape([e(24,23,15+v,15+v)],P.compass,{lightY:16,shadeY:31});
  shape([e(24,23,11,11)],{base:'#edf5db',outline:'#8c9d83',light:'#fffceb',shade:'#cbd9be'},{shadeY:30});
  c.line(24,14,24,30,'#bf6261',2);c.line(19,24,29,24,'#587e83',2);c.r(22,21,4,4,'#e8c77c');
  if(v){c.star(24,5,'#ffda84');c.r(39,26,3,3,'#e9af65');}
  face(24,24,'#545d56',null);break;}
 case 'pikap':{
  feet('#51684d');if(v){shape([e(12,23,10,9),e(36,23,10,9)],{base:'#bfdef2',outline:'#6695a0',light:'#f0f8f3',shade:'#86b5cb'},{shadeY:28});}
  else{shape([e(14,22,8,7),e(34,22,8,7)],{base:'#d6eff0',outline:'#709e9e',light:'#fffef4',shade:'#afd4d7'},{shadeY:26});}
  shape([e(24,24,11+v,13+v)],P.bug,{shadeY:30});
  c.r(20,11,2,5,'#536647');c.r(27,11,2,5,'#536647');c.r(19,8,4,4,'#e5c86f');c.r(27,8,4,4,'#e5c86f');
  shape([e(24,31,7+v,6+v)],{base:'#fce889',outline:'#b39b5b',light:'#fff4bb',shade:'#e3c76d'},{shadeY:35});
  if(v){c.star(40,11,'#fff2a3');c.star(7,29,'#fff2a3');}
  face(24,22,'#4d5b41','#efae84');break;}
 case 'mokuryu':{
  feet('#41694c');shape([p([34,28],[43,18],[40,32],[36,35])],{base:'#79b881',outline:'#42674f',light:'#a0d88e',shade:'#539968'},{shadeY:31});
  if(v){shape([p([15,23],[5,10],[18,15],[22,26])],{base:'#a3d3a0',outline:'#4f886d',light:'#d5e9b3',shade:'#79ae8a'},{shadeY:25});shape([p([30,21],[43,8],[38,25],[33,27])],{base:'#9ccba1',outline:'#4f886d',light:'#cfebb7',shade:'#6da884'},{shadeY:24});}
  shape([e(24,26,14+v,11+v),e(17,17,11,9),e(32,20,9,10)],P.dragon,{shadeY:32});
  shape([p([13,13],[17,5-v*3],[22,13]),p([27,13],[33,6-v*3],[36,18])],{base:'#d7c38a',outline:'#677656',light:'#ffefbb',shade:'#b6a16a'},{shadeY:16});
  c.r(19,30,10,4,'#bce1a7');if(v)c.r(28,15,5,2,'#d5e99d');
  face(24,22,'#345646','#edae91');break;}
 case 'yukibell':{
  feet('#5a708b');if(v){c.star(40,10,'#d4f8f4');shape([p([14,14],[18,5],[23,15]),p([25,15],[30,3],[35,14])],{base:'#daeef2',outline:'#688ca3',light:'#fffefa',shade:'#a3c9d8'},{shadeY:13});}
  shape([e(24,15,8,7),p([17,17],[31,17],[38+v,32],[10-v,32])],P.bell,{shadeY:30});
  c.r(15,31,18,3,'#e2d7ab');c.r(21,34,6,4,'#c2a16b');c.r(22,8,4,3,'#e5f4f1');
  if(v){c.r(10,27,5,2,'#e6f8f3');c.r(33,27,5,2,'#e6f8f3');}
  face(24,24,'#4e6882','#f5a9b4');break;}
 case 'railfox':{
  if(v){shape([e(37,29,9,7),e(11,29,9,7)],{base:'#e7a373',outline:'#865044',light:'#ffd393',shade:'#c97c59'},{shadeY:32});}
  else{shape([e(36,31,9,7)],{base:'#e7a373',outline:'#865044',light:'#ffd393',shade:'#c97c59'},{shadeY:33});}
  feet('#754a43');shape([p([12,19],[12,7-v*2],[22,14]),p([36,19],[36,7-v*2],[26,14]),e(24,25,15,13)],P.fox,{lightY:19,shadeY:33});
  shape([e(24,29,10,7)],{base:'#fff0d1',outline:'#a57860',light:'#fffaf0',shade:'#e0c5a3'},{shadeY:34});
  c.r(14,14,4,5,'#f5b8a2');c.r(30,14,4,5,'#f5b8a2');
  if(v){c.r(14,7,20,4,'#547283');c.r(18,4,12,5,'#709cab');c.r(24,5,3,3,'#f9dc92');}
  face(24,24,'#583f3e','#ed9d8c');break;}
 }
 return c.b;
}
const ALLY=['medamago','katappo','purupun','koge','cone','nororo','keshipon','donako','amekurage','fuwari','kompass','pikap','mokuryu','yukibell','railfox'];
const FOES=['mossling','thistlet','spookap','bramblet','mothum','thornking','sunwarden','mistknight','elderroot','signbit','tickety','signalyn','parceloo','lanternet','metroguardian'];
function enemy(id){const c=new Pix();const e=(x,y,rx,ry)=>['e',x,y,rx,ry],r=(x,y,w,h)=>['r',x,y,w,h],p=(...a)=>['p',a];const s=(parts,pal,opt={})=>c.shape(parts,{...pal,...opt}),face=(x=24,y=24,ink='#293d37',blush=null,mode='smile')=>c.face(x,y,ink,blush,mode);
 c.shadow();
 switch(id){
 case 'mossling': c.feet('#3d7655');s([r(13,16,22,18),e(24,24,16,12),e(14,17,8,9),e(23,13,9,8),e(33,18,8,10)],{base:'#7cbe71',outline:'#3d6956',light:'#b4de86',shade:'#539b68'},{shadeY:30});c.r(14,16,5,4,'#a2d47b');c.r(23,12,6,4,'#bae58b');face(24,23,'#355344','#edba91');break;
 case 'thistlet': s([p([24,6],[31,15],[39,12],[37,23],[42,29],[33,32],[27,38],[20,33],[11,34],[12,25],[6,20],[17,17])],{base:'#b48ed4',outline:'#62517b',light:'#dac3ea',shade:'#8d6cae'},{shadeY:30});c.r(15,14,4,4,'#d8baf1');c.r(31,20,4,4,'#9d7ebd');face(24,23,'#554765','#e4a9ce');break;
 case 'spookap': s([r(18,23,12,14),e(24,21,17,12)],{base:'#e6a18b',outline:'#795b62',light:'#ffd1ac',shade:'#c77b7e'},{shadeY:30});c.r(20,27,8,9,'#f4ebd8');c.r(16,16,5,3,'#fff4b9');c.r(29,19,6,4,'#fff4b9');face(24,24,'#725258',null);break;
 case 'bramblet': s([e(24,25,16,13),p([18,17],[24,5],[30,18])],{base:'#b28159',outline:'#6b4c39',light:'#dbaf77',shade:'#885b47'},{shadeY:31});c.r(19,13,7,4,'#8d9b5c');c.r(13,20,4,5,'#d0a16e');face(24,25,'#5f493a','#daa076');break;
 case 'mothum': s([e(13,23,12,11),e(35,23,12,11)],{base:'#b0bbcf',outline:'#697b8c',light:'#dce7e9',shade:'#879db5'},{shadeY:28});s([e(24,24,7,12)],{base:'#9c8baf',outline:'#5b6178',light:'#d2bed9',shade:'#7d739e'},{shadeY:30});c.r(19,10,2,6,'#77738a');c.r(27,10,2,6,'#77738a');face(24,23,'#4e5871',null);break;
 case 'thornking': s([p([13,20],[8,6],[18,14],[24,4],[30,15],[40,6],[35,22]),e(24,27,16,11)],{base:'#6eab73',outline:'#3b6655',light:'#a9d48b',shade:'#467d64'},{shadeY:32});c.r(17,17,14,4,'#d8c275');c.r(21,23,3,3,'#fff1b5');c.r(29,23,3,3,'#fff1b5');face(24,26,'#304d41',null,'stern');break;
 case 'sunwarden': s([p([24,5],[29,14],[40,11],[36,22],[43,29],[30,31],[24,40],[17,31],[5,29],[12,21],[9,10],[20,14])],{base:'#f4cb76',outline:'#8f6e52',light:'#ffeaa8',shade:'#d8a856'},{shadeY:31});s([e(24,24,10,10)],{base:'#83b88b',outline:'#5c7a60',light:'#bde1a3',shade:'#639777'},{shadeY:28});face(24,24,'#42614d',null,'stern');break;
 case 'mistknight': s([p([24,5],[36,13],[36,29],[41,36],[24,32],[7,36],[12,29],[12,13])],{base:'#8ba5bc',outline:'#4f6980',light:'#c1d4df',shade:'#6b839e'},{shadeY:31});c.r(16,18,16,8,'#536c87');c.r(20,21,3,3,'#f7dfa9');c.r(28,21,3,3,'#f7dfa9');c.r(23,6,3,10,'#d3dbca');c.r(35,28,4,8,'#b2cdd4');break;
 case 'elderroot': s([r(18,14,12,22),e(24,20,17,13),e(14,14,9,9),e(34,15,9,9)],{base:'#8da776',outline:'#4f684c',light:'#bcd296',shade:'#6c875e'},{shadeY:31});c.r(16,22,5,9,'#8b674b');c.r(28,18,5,14,'#8b674b');c.r(21,30,6,8,'#6d5b46');face(24,23,'#52634c',null,'stern');break;
 case 'signbit': c.r(22,33,4,7,'#7389a0');s([r(8,10,32,24)],{base:'#aac5d7',outline:'#4f6d84',light:'#e0eced',shade:'#83a3bd'},{shadeY:29});c.r(13,15,22,3,'#6f96ad');c.r(13,21,15,2,'#eef3e9');face(24,26,'#425e74',null);break;
 case 'tickety': s([p([11,12],[37,12],[37,18],[34,22],[37,26],[37,35],[11,35],[11,27],[14,23],[11,19])],{base:'#e5c47f',outline:'#806f57',light:'#fff0b9',shade:'#c39e63'},{shadeY:30});for(let y=15;y<33;y+=5)c.r(24,y,2,3,'#fff7d6');face(24,24,'#645c4d',null);break;
 case 'signalyn': s([r(16,7,16,32)],{base:'#668496',outline:'#43566e',light:'#96aec0',shade:'#4e687c'},{shadeY:32});c.r(20,11,8,7,'#f2a77e');c.r(20,20,8,7,'#f2d483');c.r(20,29,8,6,'#8dc4a2');c.r(22,22,2,2,'#465968');c.r(26,22,2,2,'#465968');break;
 case 'parceloo': s([p([24,6],[39,14],[39,32],[24,40],[9,32],[9,14])],{base:'#c99b78',outline:'#7b5b4e',light:'#ead0a3',shade:'#9f765e'},{shadeY:32});c.line(9,15,24,23,'#f1d4a7',2);c.line(39,15,24,23,'#f1d4a7',2);c.line(24,23,24,37,'#f1d4a7',2);face(24,27,'#685348',null);break;
 case 'lanternet': s([r(16,12,16,25),e(24,15,9,8)],{base:'#8ac1cc',outline:'#4e7887',light:'#c4e8e5',shade:'#6699ad'},{shadeY:31});s([e(24,25,9,9)],{base:'#f3d389',outline:'#ac8f63',light:'#fff2bc',shade:'#d7b776'},{shadeY:29});c.r(21,5,6,5,'#527c89');c.r(19,8,10,2,'#527c89');c.r(19,36,10,3,'#527c89');face(24,25,'#665b51',null);break;
 case 'metroguardian': s([p([10,14],[24,5],[38,14],[38,35],[24,40],[10,35])],{base:'#607e9a',outline:'#364e65',light:'#8dafbf',shade:'#46627e'},{shadeY:31});c.r(13,16,22,12,'#b6d5de');c.r(16,20,6,5,'#eac784');c.r(27,20,6,5,'#eac784');c.r(21,8,6,3,'#e8d393');c.r(19,31,10,2,'#ebd59f');c.r(6,27,5,3,'#7596a7');c.r(37,27,5,3,'#7596a7');break;
 }
 return c.b;
}
function atlas(ids,rows,renderer,cellHeight=H,padY=0){const out=new Uint8Array(ids.length*W*rows*cellHeight*4),stride=ids.length*W;for(let y=0;y<rows;y++)for(let i=0;i<ids.length;i++){const b=renderer(ids[i],!!y);for(let py=0;py<H;py++)out.set(b.subarray(py*W*4,(py+1)*W*4),(((y*cellHeight+padY+py)*stride+i*W)*4));}return {data:out,info:{width:stride,height:rows*cellHeight,channels:4}};}
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function chunk(name,bytes){const tag=Buffer.from(name),b=Buffer.alloc(12+bytes.length);b.writeUInt32BE(bytes.length,0);tag.copy(b,4);Buffer.from(bytes).copy(b,8);let crc=0xffffffff;for(let i=4;i<8+bytes.length;i++)crc=crcTable[(crc^b[i])&255]^(crc>>>8);b.writeUInt32BE((crc^0xffffffff)>>>0,8+bytes.length);return b;}
function png({data,info:{width,height}}){
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 const row=width*4,raw=Buffer.alloc((row+1)*height);
 for(let y=0;y<height;y++)Buffer.from(data.subarray(y*row,(y+1)*row)).copy(raw,y*(row+1)+1);
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const target=process.argv[2]||dirname(fileURLToPath(import.meta.url));
const allies=atlas(ALLY,2,companion);
writeFileSync(join(target,'pixel-companions.png'),png(allies));
// The battle layout's historical enemy viewport is 48px tall. The hand-drawn
// 44px character is vertically centered in that viewport, preserving sizing.
const foes=atlas(FOES,1,enemy,48,2);
writeFileSync(join(target,'pixel-enemies.png'),png(foes));
console.log('Hand-authored 48x44 sprites:',ALLY.length*2,'companion forms;',FOES.length,'base enemies');
