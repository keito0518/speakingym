// Original, low-cost vector adversaries for the Speaking Forest.
const eye='<ellipse cx="53" cy="76" rx="5" ry="7" fill="#272c2b"/><ellipse cx="91" cy="76" rx="5" ry="7" fill="#272c2b"/>';
const smile='<path d="M57 95Q72 107 88 95" fill="none" stroke="#29362e" stroke-width="4" stroke-linecap="round"/>';
const sprites={
 mossling:`<path d="M29 61Q4 47 25 29Q39 18 51 32Q71 6 91 30Q115 14 122 42Q140 58 120 74L121 107Q108 131 69 126Q26 127 22 105Z" fill="#79b66c" stroke="#315e4a" stroke-width="6"/><path d="M30 51Q44 13 63 46Q74 9 93 43Q115 13 123 54" fill="none" stroke="#b4dd84" stroke-width="12" stroke-linecap="round"/>${eye}${smile}`,
 thistlet:`<path d="M71 16L83 38L110 25L111 54L133 66L112 84L126 115L92 112L73 138L56 114L24 119L35 87L14 63L42 52L39 24L63 39Z" fill="#b28bc9" stroke="#66517c" stroke-width="6"/><path d="M36 49L59 63M104 44L89 61" stroke="#dbc8f0" stroke-width="8" stroke-linecap="round"/>${eye}${smile}`,
 spookap:`<path d="M20 81Q16 34 71 25Q126 28 130 82Z" fill="#e29a78" stroke="#845a63" stroke-width="6"/><circle cx="52" cy="50" r="10" fill="#ffebbf"/><circle cx="97" cy="60" r="12" fill="#ffe7b7"/><path d="M45 81L47 126Q72 142 99 125L101 81Z" fill="#f6e0ba" stroke="#9f7f6c" stroke-width="6"/>${eye}${smile}`,
 bramblet:`<path d="M70 15L87 39Q132 44 128 84Q133 127 81 133Q25 135 20 89Q18 47 58 37Z" fill="#a76f4a" stroke="#64462f" stroke-width="6"/><path d="M65 44L71 18M43 59L26 43M112 58L134 41" fill="none" stroke="#655131" stroke-width="8" stroke-linecap="round"/><path d="M34 113Q72 99 111 116" fill="none" stroke="#dfad75" stroke-width="7"/>${eye}${smile}`,
 mothum:`<path d="M68 68Q27 10 17 65Q12 103 58 100M76 70Q125 8 131 64Q139 106 82 102" fill="#a8c5df" stroke="#4e758e" stroke-width="6"/><path d="M65 39Q73 25 82 39L88 106Q72 135 57 106Z" fill="#6a8196" stroke="#40576c" stroke-width="5"/><circle cx="38" cy="69" r="9" fill="#e5d69d"/><circle cx="110" cy="69" r="9" fill="#e5d69d"/>${eye}`,
 thornking:`<path d="M22 107Q8 75 29 43L19 17L48 35L68 8L88 31L121 13L117 47Q141 67 121 104Q111 134 74 137Q34 138 22 107Z" fill="#44694d" stroke="#173c32" stroke-width="7"/><path d="M19 19L28 1L51 31L71 0L91 29L121 4L124 29L112 55L33 57Z" fill="#d0b574" stroke="#74562c" stroke-width="6"/><path d="M36 57Q64 41 82 55Q100 41 112 59" stroke="#789667" stroke-width="12" stroke-linecap="round"/><path d="M43 84L59 80M84 80L100 84" stroke="#f1d9a3" stroke-width="7" stroke-linecap="round"/><ellipse cx="52" cy="84" rx="6" ry="8" fill="#fae2a2"/><ellipse cx="94" cy="84" rx="6" ry="8" fill="#fae2a2"/><path d="M60 113L72 108L85 113" fill="none" stroke="#edd59e" stroke-width="5" stroke-linecap="round"/><path d="M17 105L3 87M125 105L144 92" stroke="#638450" stroke-width="8" stroke-linecap="round"/>`,
 sunwarden:`<path d="M74 8L90 36L123 27L119 59L143 78L115 93L117 127L85 115L70 143L53 115L21 123L27 91L4 76L31 57L25 25L59 38Z" fill="#e7aa57" stroke="#856038" stroke-width="6"/><circle cx="72" cy="80" r="44" fill="#f6d98e" stroke="#b77d42" stroke-width="7"/><path d="M51 76L59 72M85 72L94 76" stroke="#795a43" stroke-width="7" stroke-linecap="round"/><path d="M57 100Q73 115 91 99" stroke="#795a43" fill="none" stroke-width="5"/>`,
 mistknight:`<path d="M28 49L72 8L118 49V115L72 137L25 112Z" fill="#7682b2" stroke="#343e69" stroke-width="7"/><path d="M42 57L30 20L69 34L112 19L101 58" fill="#4f5b8a" stroke="#2e365c" stroke-width="5"/><path d="M40 69Q73 57 108 69L104 97Q73 119 40 97Z" fill="#c4d5e9"/><path d="M47 81L62 86M85 86L101 81" stroke="#3a4d70" stroke-width="6"/><path d="M48 112L70 127L97 111" fill="none" stroke="#384668" stroke-width="7"/>`,
 elderroot:`<path d="M24 135Q18 100 34 73L19 45L38 55L47 17L63 48L80 4L96 49L120 25L111 64L132 55L113 90Q131 117 110 138Z" fill="#6c8053" stroke="#304b3b" stroke-width="7"/><path d="M43 68Q72 48 102 68V127Q74 146 44 126Z" fill="#b89a6b" stroke="#745b49" stroke-width="6"/><path d="M51 87L64 84M81 84L94 87" stroke="#3a5039" stroke-width="7" stroke-linecap="round"/><path d="M61 108Q75 100 89 108" fill="none" stroke="#61794c" stroke-width="6"/><path d="M10 130L42 112M134 127L106 113" stroke="#54734c" stroke-width="8"/>`
};
const variants=Object.freeze({
 sunmoss:'mossling',beethorn:'thistlet',glowcap:'spookap',ambernut:'bramblet',daymoth:'mothum',
 fogling:'mossling',nightthorn:'thistlet',whispercap:'spookap',bitterbud:'bramblet',duskmoth:'mothum',
 rootlet:'mossling',ancienthorn:'thistlet',oraclecap:'spookap',stonebud:'bramblet',starmoth:'mothum'
});
export function enemyArt(id){
 const base=variants[id]||id;
 const tint=['sunmoss','beethorn','glowcap','ambernut','daymoth'].includes(id)?'hue-rotate(-24deg) saturate(1.25)':
   ['fogling','nightthorn','whispercap','bitterbud','duskmoth'].includes(id)?'hue-rotate(105deg) saturate(.78)':
   ['rootlet','ancienthorn','oraclecap','stonebud','starmoth'].includes(id)?'sepia(.42) saturate(.9)':'';
 const motif=tint?`<circle cx="117" cy="22" r="12" fill="${tint.includes('105')?'#9bb8dd':tint.includes('sepia')?'#bbcc83':'#ffe49b'}" stroke="#fff4d7" stroke-width="2"/><path d="M111 22h12m-6-6v12" stroke="#4d5c48" stroke-width="2"/>`:'';
 return `<svg class="forest-enemy-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 150" role="img" aria-label="森の敵モンスター"><ellipse cx="74" cy="142" rx="58" ry="7" fill="#09271b" opacity=".23"/><g ${tint?`style="filter:${tint}"`:''}>${sprites[base]||sprites.mossling}</g>${motif}</svg>`;
}
