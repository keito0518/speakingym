// Hand-built vector level art: no paid image assets or external network calls.
// A readable map, layered foliage, checkpoint landmarks and forest companion.
const evergreen=(x,y,s,tint='#204f43')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0L-10 32L-22 37L-12 55L-27 65L-8 76L-5 108L7 108L10 76L27 65L12 55L22 37L10 32Z" fill="${tint}"/><path d="M0 14L-8 56M0 45L10 73" stroke="#83c59c" stroke-opacity=".24" stroke-width="3" fill="none"/><path d="M-4 79L-3 115L4 115L4 79" fill="#5d443a"/></g>`;
const shrub=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse rx="26" ry="13" fill="#193e35"/><ellipse cx="-15" cy="-5" rx="16" ry="11" fill="#28664c"/><ellipse cx="12" cy="-7" rx="17" ry="12" fill="#306f55"/><circle cx="-10" cy="-10" r="2" fill="#a8e5aa" opacity=".5"/></g>`;
const glimmer=(x,y,i)=>`<circle class="forest-glimmer forest-glimmer-${i%4}" cx="${x}" cy="${y}" r="${2+(i%2)}" fill="#ffefa7"/>`;
export function forestWorldArt(route=null,areaId='entry'){
 const moss=route==='moss',sunlit=route==='sunlit';
 const mode=moss?'moss':sunlit?'sunlit':'wild';
 const near=[[-17,70,1.18],[63,29,.85],[135,57,1.15],[217,14,.96],[309,28,1],[404,26,.86],[502,18,1.12],[582,43,1.1],[680,6,.99],[741,57,1.23]];
 const far=[[9,33,.65],[113,1,.8],[177,16,.66],[255,-8,.74],[355,4,.9],[446,-19,.85],[552,0,.82],[628,-12,.76],[716,-8,.85]];
 const lights=[[83,118],[137,152],[197,100],[268,160],[332,113],[391,87],[462,127],[536,81],[608,102],[673,56]];
 const path=moss?'M88 222C172 188 224 202 293 183S419 168 495 142S630 141 667 91':'M88 222C182 201 217 189 294 180S414 143 494 140S608 105 667 91';
 const landmarks={
  entry:'',
  glade:'<g opacity=".65"><path d="M310 0L350 0L444 201L398 199Z" fill="#ffe9a4"/><path d="M535 0L553 0L636 172L610 178Z" fill="#ffe9a4"/></g><g transform="translate(550 116)"><path d="M0 22Q-28 -5 0 -38Q24 -8 0 22Z" fill="#f6d675" stroke="#e6ab60" stroke-width="5"/></g>',
  thicket:'<g opacity=".6"><path d="M0 154Q90 111 186 148T370 134T720 148" stroke="#c1d2e2" stroke-width="34" fill="none"/><path d="M0 201Q110 160 221 193T440 180T720 175" stroke="#aeb9d4" stroke-width="25" fill="none"/></g><g transform="translate(581 79)"><path d="M-19 18L0 -27L19 18Z" fill="#bed1e6" stroke="#67809c" stroke-width="5"/></g>',
  sanctuary:'<g opacity=".94"><path d="M523 234Q503 122 540 44Q593 9 651 56Q690 130 672 233" fill="none" stroke="#705c3d" stroke-width="29"/><path d="M539 53Q496 14 438 39M626 51Q660 9 719 34" stroke="#53784a" stroke-width="38" fill="none" stroke-linecap="round"/><circle cx="595" cy="66" r="29" fill="#e6d4a0" opacity=".6"/></g>'
 };
 return `<svg class="forest-world-svg forest-world-${mode} forest-world-area-${landmarks[areaId]!==undefined?areaId:'entry'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 270" role="img" aria-label="深い森の中に続く曲がり道と3つの関門">
 <defs>
  <linearGradient id="forestSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${moss?'#122c45':'#133d43'}"/><stop offset=".58" stop-color="${moss?'#356264':'#417e68'}"/><stop offset="1" stop-color="#83ab74"/></linearGradient>
  <radialGradient id="forestLight" cx="${moss?'36%':'83%'}" cy="14%" r="62%"><stop stop-color="${moss?'#aac9eb':'#f9d88a'}" stop-opacity="${moss?'.32':'.55'}"/><stop offset="1" stop-color="#f2dba6" stop-opacity="0"/></radialGradient>
  <linearGradient id="forestEarth" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#457252"/><stop offset="1" stop-color="#1a4537"/></linearGradient>
  <linearGradient id="forestTrail" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f9de94"/><stop offset="1" stop-color="#b87c42"/></linearGradient>
 </defs>
 <rect width="720" height="270" fill="url(#forestSky)"/><rect width="720" height="270" fill="url(#forestLight)"/>
 <circle cx="${moss?242:603}" cy="${moss?33:23}" r="49" fill="${moss?'#d4e6fe':'#ffedb8'}" opacity=".29"/>
 <path d="M0 132Q91 69 193 110T370 82T548 90T720 55V270H0Z" fill="#467c65" opacity=".49"/>
 <path d="M0 150Q82 92 178 132T362 114T540 103T720 108V270H0Z" fill="#31634f" opacity=".85"/>
 <g opacity=".61">${far.map(([x,y,s])=>evergreen(x,y,s,'#234e43')).join('')}</g>
 <path d="M0 191Q138 160 248 187T459 160T720 149V270H0Z" fill="url(#forestEarth)"/>
 <path d="M0 247Q142 212 255 232T484 209T720 177V270H0Z" fill="#21503e"/>
 <g opacity=".9">${near.map(([x,y,s])=>evergreen(x,y,s,x%2?'#1e5443':'#215947')).join('')}</g>
 <path d="${path}" stroke="#183f36" stroke-width="34" stroke-linecap="round" fill="none" opacity=".55"/>
 <path d="${path}" stroke="url(#forestTrail)" stroke-width="24" stroke-linecap="round" fill="none" />
 <path d="${path}" stroke="#ffeebc" stroke-width="2" stroke-dasharray="3 19" stroke-linecap="round" fill="none" opacity=".55"/>
 ${shrub(35,231,1.1)}${shrub(222,246,.9)}${shrub(425,214,1.2)}${shrub(688,183,1.1)}
 <g class="forest-world-lights">${lights.map(([x,y],i)=>glimmer(x,y,i)).join('')}</g>
 ${landmarks[areaId]||''}
 <g class="forest-landmark" transform="translate(132 216)"><circle r="22" fill="#113d32" opacity=".72"/><circle r="17" fill="#ecd193" stroke="#fff4cb" stroke-width="3"/><path d="M-7 1L-1 8L10 -8" stroke="#53744b" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
 <g class="forest-landmark" transform="translate(354 167)"><circle r="22" fill="#173e35" opacity=".7"/><path d="M-13 12V-14H13V12M-18 12H18M-7-14V-24H7V-14" stroke="#e6dfb9" stroke-width="5" stroke-linejoin="round" fill="none"/><circle cy="-6" r="4" fill="#c3a56d"/></g>
 <g class="forest-landmark" transform="translate(591 101)"><circle r="22" fill="#143b33" opacity=".7"/><path d="M-12 5L0 -11L12 5L0 14Z" fill="#ffdc86" stroke="#f8edc8" stroke-width="2"/><path d="M0-17V-22M17-3L21-5M-17-3L-21-5" stroke="#ffeeba" stroke-width="3" stroke-linecap="round"/></g>
 <path d="M0 250Q53 215 92 236M617 236Q677 207 720 222" stroke="#659271" stroke-width="4" fill="none" opacity=".5"/>
 </svg>`;
}
