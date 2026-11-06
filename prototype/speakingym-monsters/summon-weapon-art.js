// Illustrated summon portraits, separate from the tiny in-world pixel sprites.
// These are vector art: no remote textures, font glyphs, emoji or costly filters.
// The original 12 silhouettes remain recognizable, even on a two-column phone card.
import {weaponShapeFor} from './weapon-visuals.js';

const tiers=Object.freeze({
 common:{bright:'#e4f6f8',mid:'#9cc7d7',dark:'#365b73',jewel:'#99edf4'},
 rare:{bright:'#f3fbff',mid:'#60c5fa',dark:'#195395',jewel:'#74e9ff'},
 epic:{bright:'#fff1fb',mid:'#d89aff',dark:'#7043ba',jewel:'#fbc3ff'},
 legend:{bright:'#fffbe5',mid:'#ffc96e',dark:'#a35524',jewel:'#fff0a0'}
});
const escapeAttribute=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const presentation=(id)=>({
 metal:`url(#${id}-metal)`,
 gold:`url(#${id}-gold)`,
 grip:`url(#${id}-grip)`,
 gem:`url(#${id}-gem)`
});

const bladeEngraving='<path d="M90 58 90 115M90 119V129" stroke="#fff" stroke-opacity=".65" stroke-width="1.8"/>';
const art={
 sword:p=>`<path d="M89 23 106 49 100 143 90 156 79 143 74 49Z" fill="${p.metal}" stroke="#eff9ff" stroke-width="2.2"/>
  <path d="M89 24 91 146 99 136 103 49Z" fill="#fff" opacity=".34"/>${bladeEngraving}
  <path d="m61 151 26-9 7 0 26 9-3 10-27-4-25 4Z" fill="${p.gold}" stroke="#fff1c2" stroke-width="2"/>
  <path d="M85 156h11v52H85z" fill="${p.grip}" stroke="#e8c98f" stroke-width="2"/>
  <path d="M82 204 90 218 99 204Z" fill="${p.gold}"/><path d="m84 163 12 6m-12 9 12 6m-12 9 12 6" stroke="#f8d8a0" stroke-width="3"/>
  <path d="M90 145 97 152 90 160 83 152Z" fill="${p.gem}" stroke="#fff" stroke-width="1.5"/>`,
 dagger:p=>`<path d="M89 50 108 89 103 139 90 155 77 139 72 89Z" fill="${p.metal}" stroke="#f5fbff" stroke-width="2.5"/>
  <path d="M90 58V146l12-13 3-43Z" fill="#fff" opacity=".31"/>
  <path d="M70 153 89 145 111 153 115 161 91 159 66 161Z" fill="${p.gold}" stroke="#fff1cd" stroke-width="2"/>
  <path d="M85 157h10v48H85z" fill="${p.grip}" stroke="#f0c887" stroke-width="2"/>
  <path d="m82 204 8 12 9-12-9-6Z" fill="${p.gold}"/>
  <path d="M90 105 95 119 90 129 85 119Z" fill="${p.gem}"/>`,
 spear:p=>`<path d="M84 96h12v122H84z" fill="${p.grip}" stroke="#efcc91" stroke-width="2"/>
  <path d="M90 17 115 77 106 107 90 122 74 107 65 77Z" fill="${p.metal}" stroke="#f7f9ff" stroke-width="2.5"/>
  <path d="M90 19 91 113 105 97 110 77Z" fill="#fff" opacity=".32"/>
  <path d="M67 117 90 127 113 117 107 131 90 136 73 131Z" fill="${p.gold}"/>
  <path d="m84 142 12 9m-12 13 12 9m-12 13 12 9" stroke="#e9cd8e" stroke-width="3"/>
  <path d="M90 72 98 87 90 98 82 87Z" fill="${p.gem}" stroke="#fff" stroke-width="1.5"/>`,
 staff:p=>`<path d="M84 89q7-14 12 0l-3 128H80z" fill="${p.grip}" stroke="#e7c890" stroke-width="2.5"/>
  <path d="M69 68 79 32 89 42 100 21 110 50 104 81 88 98Z" fill="${p.gold}" stroke="#fff1cd" stroke-width="2"/>
  <circle cx="90" cy="58" r="27" fill="${p.metal}" stroke="#e9faff" stroke-width="3.5"/>
  <circle cx="90" cy="58" r="18" fill="${p.gem}" opacity=".9"/>
  <path d="M90 35 110 58 90 81 70 58Z" fill="none" stroke="#fff" stroke-width="1.8"/>
  <path d="m84 121 12 8m-12 18 12 8m-12 18 12 8" stroke="#f5d99c" stroke-width="3"/>
  <path d="m76 201 14 18 14-18" fill="none" stroke="#e9bd73" stroke-width="5"/>`,
 bow:p=>`<path d="M118 22Q34 50 50 119q1 63 68 91l-8-21Q72 154 69 119 66 84 110 43Z" fill="${p.grip}" stroke="#f7d99f" stroke-width="3"/>
  <path d="M116 24Q48 75 51 121q4 53 66 90" fill="none" stroke="${p.gold}" stroke-width="5"/>
  <path d="m117 29-3 176" stroke="#ebfaff" stroke-width="2.5"/>
  <path d="M38 117h107" stroke="${p.metal}" stroke-width="6"/><path d="m145 117-20-11v22Z" fill="${p.metal}"/>
  <path d="M38 117 54 109v16Z" fill="${p.gold}"/>
  <path d="M68 116 83 104 102 116 83 128Z" fill="${p.gem}" stroke="#fff4d2" stroke-width="2"/>
  <path d="m108 25 11-5m-11 190 11 5" stroke="#fff0c2" stroke-width="5"/>`,
 hammer:p=>`<path d="M82 71h15v146H82Z" fill="${p.grip}" stroke="#eacb97" stroke-width="2.3"/>
  <path d="M38 47h105l7 51-15 13H46L31 98Z" fill="${p.metal}" stroke="#f1faff" stroke-width="3"/>
  <path d="M40 49h100l-7 16H46Z" fill="#fff" opacity=".29"/>
  <path d="M54 59h72v36H54Z" fill="none" stroke="${p.gold}" stroke-width="4"/>
  <path d="M90 65 107 80 90 96 73 80Z" fill="${p.gem}" stroke="#fff" stroke-width="2"/>
  <path d="m82 132 15 10m-15 17 15 10m-15 17 15 10" stroke="#f0cf9b" stroke-width="3.3"/>
  <path d="M75 210h29l-7 11H82Z" fill="${p.gold}"/>`,
 axe:p=>`<path d="M87 52h13v166H87Z" fill="${p.grip}" stroke="#f8d4a1" stroke-width="2"/>
  <path d="M88 38Q54 22 31 41l-9 47 17 50q23-21 49-19Z" fill="${p.metal}" stroke="#f4f9ff" stroke-width="3"/>
  <path d="m29 52 42 3-6 53-30 20-8-35Z" fill="#fff" opacity=".26"/>
  <path d="M100 38q34-15 54 14l5 42-15 34-44-11Z" fill="${p.gold}" stroke="#fff0c8" stroke-width="2"/>
  <path d="M67 75 90 62 114 75 114 101 90 115 67 101Z" fill="${p.gem}" stroke="#f2ffff" stroke-width="2"/>
  <path d="m87 147 13 10m-13 15 13 10m-13 15 13 10" stroke="#fff1c2" stroke-width="3"/>`,
 scythe:p=>`<path d="M84 75 96 78 112 219 99 219Z" fill="${p.grip}" stroke="#f1d2a1" stroke-width="2.4"/>
  <path d="M89 80Q110 11 157 16 140 43 139 58 108 89 53 94q-20 1-37-16 34 4 61-15Z" fill="${p.metal}" stroke="#f8faff" stroke-width="3"/>
  <path d="M156 18Q108 44 98 70 73 90 20 79q29 24 72 7 34-19 48-40Z" fill="#fff" opacity=".34"/>
  <path d="M80 82 97 66 110 85 97 101Z" fill="${p.gem}" stroke="#fff6c7" stroke-width="2"/>
  <path d="m91 119 14 9m-10 15 14 9m-10 15 14 9" stroke="#f2d29a" stroke-width="3"/>
  <path d="M96 209 111 216 108 226 99 221Z" fill="${p.gold}"/>`,
 crossbow:p=>`<path d="M83 86h15l9 128H89Z" fill="${p.grip}" stroke="#ead2a5" stroke-width="2.4"/>
  <path d="M17 57Q52 20 90 68q41-49 74-11l-20 49q-18-32-54-20-36-12-55 20Z" fill="${p.metal}" stroke="#f5faff" stroke-width="3"/>
  <path d="M21 61 90 76 159 61" fill="none" stroke="#fff8df" stroke-width="2.2"/>
  <path d="M88 42h5v115h-5Z" fill="${p.gold}" stroke="#fff4d4" stroke-width="2"/>
  <path d="m90 30 14 24-14 7-14-7Z" fill="${p.metal}"/>
  <path d="M70 86 90 69 111 86 107 114 74 114Z" fill="${p.gold}"/>
  <path d="M90 81 100 95 90 109 80 95Z" fill="${p.gem}" stroke="#fff" stroke-width="2"/>
  <path d="m91 153 14 8m-12 16 14 8m-12 15 14 8" stroke="#f4d59e" stroke-width="3"/>`,
 claw:p=>`<path d="M55 150 79 139 113 151 123 199 97 215 64 198Z" fill="${p.grip}" stroke="#f4d9aa" stroke-width="3"/>
  <path d="M30 150Q19 91 53 21l23 110 8 20Zm45-16Q61 71 89 13l17 119-15 29Zm32 4q7-74 48-116l-20 125-15 20Z" fill="${p.metal}" stroke="#f5fbff" stroke-width="2.6"/>
  <path d="M53 32 65 125M89 21l4 104M148 35l-23 105" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="3"/>
  <path d="M76 164 96 154 110 169 95 189 73 182Z" fill="${p.gem}" stroke="#fff6da" stroke-width="2"/>
  <path d="m69 197 22 10 23-10" stroke="${p.gold}" stroke-width="5" fill="none"/>`,
 shield:p=>`<path d="M90 25q44 14 64 19l-5 87q-10 52-59 88-47-33-59-88l-5-87Z" fill="${p.gold}" stroke="#fff3cf" stroke-width="3"/>
  <path d="M90 38q36 12 51 15l-5 77q-10 42-46 72-37-30-46-72l-5-77Z" fill="${p.metal}" stroke="#fcfdff" stroke-width="2"/>
  <path d="M90 40v160q-38-27-47-73l-3-72Z" fill="#fff" opacity=".21"/>
  <path d="M90 61l31 33-5 40-26 36-26-36-5-40Z" fill="${p.gold}" stroke="#fff4d4" stroke-width="3"/>
  <path d="M90 80 111 105 90 146 69 105Z" fill="${p.gem}" stroke="#fff" stroke-width="2.5"/>
  <path d="M47 63 60 68m73-5-13 5M90 179v15" stroke="#e9fbff" stroke-width="3"/>`,
 whip:p=>`<path d="M87 155 103 159 109 217 91 220Z" fill="${p.grip}" stroke="#f7d59f" stroke-width="3"/>
  <path d="M93 166q64-19 54-74Q140 30 90 29 30 29 29 87q-1 52 58 51 50-1 40-50-5-30-35-27-22 0-25 21-5 20 22 25" fill="none" stroke="${p.gold}" stroke-width="15" stroke-linecap="round"/>
  <path d="M93 166q64-19 54-74Q140 30 90 29 30 29 29 87q-1 52 58 51 50-1 40-50-5-30-35-27-22 0-25 21-5 20 22 25" fill="none" stroke="${p.metal}" stroke-width="8" stroke-linecap="round"/>
  <path d="m94 154 21 7-10 15-22-5Z" fill="${p.gem}" stroke="#fff3d7" stroke-width="2"/>
  <path d="m91 185 15-2m-14 12 15-2m-14 12 15-2" stroke="#f9e1ae" stroke-width="3"/>`
};

export function summonWeaponArtwork(weapon,{instance='single',decorative=false}={}){
 if(!weapon?.id||!Object.hasOwn(tiers,weapon.rarity))return '';
 const shape=weaponShapeFor(weapon);
 const safeId=String(weapon.id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);
 const safeInstance=String(instance).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32);
 const id=`summon-${safeId}-${safeInstance}`;
 const colors=tiers[weapon.rarity],p=presentation(id);
 const rank=Math.max(0,Math.min(3,Number(weapon.awakeningRank)||0));
 const sparks=Array.from({length:rank+2},(_,i)=>{
  const x=35+(i*47)%113,y=26+(i*31)%164,size=i%2?3:5;
  return `<path d="M${x} ${y-size}v${size*2}m-${size} -${size}h${size*2}" stroke="${colors.bright}" stroke-width="1.8"/>`;
 }).join('');
 return `<svg class="summon-weapon-illustration" viewBox="0 0 180 240" role="${decorative?'presentation':'img'}" aria-label="${decorative?'':escapeAttribute(weapon.name)}" xmlns="http://www.w3.org/2000/svg">
  <defs>
   <linearGradient id="${id}-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors.bright}"/><stop offset=".32" stop-color="${colors.mid}"/><stop offset=".67" stop-color="${colors.dark}"/><stop offset=".88" stop-color="${colors.mid}"/><stop offset="1" stop-color="${colors.bright}"/></linearGradient>
   <linearGradient id="${id}-gold" x1="0" x2="1"><stop stop-color="#59442e"/><stop offset=".32" stop-color="#ffe5a0"/><stop offset=".65" stop-color="#8b603c"/><stop offset="1" stop-color="#f1c67b"/></linearGradient>
   <linearGradient id="${id}-grip" x1="0" x2="1"><stop stop-color="#271d27"/><stop offset=".5" stop-color="#9c684a"/><stop offset="1" stop-color="#3b2838"/></linearGradient>
   <radialGradient id="${id}-gem"><stop stop-color="#fff"/><stop offset=".25" stop-color="${colors.bright}"/><stop offset=".8" stop-color="${colors.jewel}"/><stop offset="1" stop-color="${colors.dark}"/></radialGradient>
  </defs>
  <g data-equipped-weapon="${escapeAttribute(weapon.id)}" data-weapon-shape="${shape}" data-awakening="${rank}">
   <g opacity=".4" stroke="${colors.mid}" fill="none"><circle cx="90" cy="119" r="76" stroke-width=".8"/><path d="m90 30 75 89-75 90-75-90Z" stroke-width="1.1"/><circle cx="90" cy="119" r="63" stroke-dasharray="3 10"/></g>
   <g transform="rotate(-12 90 120)" stroke-linejoin="round" stroke-linecap="round">${art[shape](p)}</g>
   <g opacity="${rank>0?'1':'.6'}">${sparks}</g>
   <path d="M16 119h12m124 0h12M90 14v14m0 182v14" fill="none" stroke="${colors.mid}" stroke-opacity=".8" stroke-width="1.3"/>
  </g>
 </svg>`;
}
