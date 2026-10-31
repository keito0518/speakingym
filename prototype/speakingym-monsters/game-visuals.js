// Original vector assets. No platform emoji, external images or image-map reuse.
export function relicArt(id) {
  const shapes = {
    'sunlit-leaf': '<path d="M15 47Q5 14 49 10Q56 42 23 49Z" fill="#aaca78"/><path d="M12 55L44 20M25 42L22 29M34 33L45 34"/>',
    'moss-lantern': '<path d="M23 14H41L45 24V47L32 54L19 47V24Z" fill="#b6d8bb"/><path d="M24 14V9H40V14M19 26H45M19 44H45"/><ellipse cx="32" cy="35" rx="6" ry="10" fill="#ffe39c" stroke="none"/>',
    'golden-yolk': '<path d="M16 39C16 26 25 10 32 10S48 26 48 39A16 16 0 0 1 16 39Z" fill="#f8d17b"/><ellipse cx="28" cy="30" rx="5" ry="9" fill="#fff3be" stroke="none"/>',
    'lost-button': '<circle cx="32" cy="32" r="23" fill="#b7a6da"/><circle cx="32" cy="32" r="17"/><path d="M26 26L38 38M38 26L26 38"/><g fill="#493e66"><circle cx="26" cy="26" r="2"/><circle cx="38" cy="26" r="2"/><circle cx="26" cy="38" r="2"/><circle cx="38" cy="38" r="2"/></g>',
    'sunbeam': '<path d="M32 5L40 22L58 32L41 40L32 59L23 41L6 32L24 23Z" fill="#f8dd91"/><circle cx="32" cy="32" r="9" fill="#fff9d6" stroke="#c6a75a"/><path d="M32 7V17M32 47V57M7 32H16M48 32H57"/>',
    'mist-seal': '<circle cx="32" cy="32" r="23" fill="#aec3d7"/><path d="M17 40Q28 19 49 28M14 27Q27 13 48 19M17 48Q32 38 48 48" stroke="#617e9d" stroke-width="4" fill="none"/><circle cx="32" cy="32" r="5" fill="#f2f4ef" stroke="#617e9d"/>',
    'ancient-acorn': '<path d="M18 28Q16 15 32 12Q50 15 46 29L45 45Q32 59 19 45Z" fill="#ba9762"/><path d="M14 26Q15 13 33 15Q49 13 50 26L44 35H20Z" fill="#7e935c"/><path d="M29 14Q27 6 36 5M24 23L32 19L40 24M24 32L31 29L39 32" stroke="#566d4b" fill="none"/>'
    ,'city-pass':'<rect x="10" y="17" width="44" height="30" rx="6" fill="#b8e2dc"/><path d="M15 26H49M17 39H31M37 39H47" stroke="#4d8290" stroke-width="4"/><circle cx="41" cy="31" r="5" fill="#f8d794" stroke="none"/>'
    ,'market-stamp':'<rect x="14" y="12" width="36" height="39" rx="7" fill="#efd4a0"/><path d="M19 26H45L41 40H23Z" fill="#c99a65"/><path d="M17 24L32 15L47 24" stroke="#617d78" stroke-width="4"/>'
    ,'station-stamp':'<circle cx="32" cy="32" r="23" fill="#a7d2db"/><rect x="20" y="17" width="24" height="27" rx="5" fill="#4f7e90"/><path d="M23 23H41M24 34H40M25 49L20 55M39 49L44 55" stroke="#e6f6f0" stroke-width="3"/>'
    ,'market-bell':'<path d="M18 38Q15 19 31 14Q47 18 46 38L52 46H12Z" fill="#c7e4f1"/><circle cx="32" cy="50" r="7" fill="#efd19b"/><path d="M26 11Q32 5 38 11" stroke="#9bc1d1" stroke-width="4" fill="none"/>'
    ,'terminal-ticket':'<path d="M10 20H54V44H10V35Q16 32 10 28Z" fill="#c8def1"/><path d="M34 20V44" stroke="#64849c" stroke-dasharray="3 4"/><path d="M16 27H29M39 27H49M16 36H29M39 36H49" stroke="#557a96" stroke-width="3"/>'
    ,'snow-crystal':'<path d="M32 6V58M6 32H58M14 14L50 50M50 14L14 50" stroke="#9cd4ee" stroke-width="5"/><path d="M22 13L32 21L42 13M22 51L32 43L42 51M13 22L21 32L13 42M51 22L43 32L51 42" stroke="#d4f5ff" stroke-width="3"/>'
  };
  return `<svg class="relic-svg" viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g stroke="#655b40" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">${shapes[id] || shapes['sunlit-leaf']}</g></svg>`;
}
export function guardArt() {
  return '<svg viewBox="0 0 100 110" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M50 5L90 20V55Q86 88 50 104Q14 88 10 55V20Z" fill="#76cddc44" stroke="#d4f8ff" stroke-width="4"/><path d="M50 18L77 28V54Q74 76 50 88Q26 76 23 54V28Z" fill="none" stroke="#8dd8e8" stroke-width="2"/><path d="M50 27V76M30 47H70" stroke="#e0faff" stroke-width="3"/></svg>';
}
export function battleArenaArt(boss = false,areaId='entry') {
  if(areaId==='city'||areaId.startsWith('city-'))return `<svg class="battle-arena-svg battle-arena-city" data-arena="${areaId==='city'?(boss?'metro-nexus':'city-platform'):`${areaId}-${boss?'boss':'street'}`}" data-city-chapter="${areaId}" style="filter:hue-rotate(${{'city-market':-16,'city-terminal':12,'city-blizzard':35}[areaId]||0}deg)" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
   <defs><linearGradient id="city-arena" x2="0" y2="1"><stop stop-color="${boss?'#1d2e59':'#24436e'}"/><stop offset="1" stop-color="#8eb6ce"/></linearGradient><linearGradient id="city-floor" x2="0" y2="1"><stop stop-color="#91b7c8"/><stop offset="1" stop-color="#29485d"/></linearGradient></defs>
   <rect width="800" height="300" fill="url(#city-arena)"/><circle cx="634" cy="47" r="35" fill="#e9faff" opacity=".55"/><g fill="#344d6c"><path d="M0 160V50H90V160M114 160V20H205V160M235 160V75H320V160M485 160V45H557V160M585 160V13H700V160M720 160V61H800V160"/></g>
   <g fill="#e4f6ff" stroke="#aecfe0" stroke-width="3"><path d="M0 55Q46 38 90 55H0ZM114 24Q160 7 205 24H114ZM235 80Q280 63 320 80H235ZM485 49Q524 32 557 49H485ZM585 17Q644 1 700 17H585ZM720 66Q761 50 800 66H720Z"/></g>
   <g stroke="#9fcbdb" stroke-width="2" fill="#ffdea3">${Array.from({length:8},(_,i)=>`<rect x="${16+i*100}" y="${58+(i%3)*23}" width="14" height="30" rx="2"/>`).join('')}</g>
   <g fill="#f6fbff" opacity=".82">${Array.from({length:19},(_,i)=>`<circle cx="${21+i*41}" cy="${18+(i*29)%130}" r="${i%3===0?3:1.8}"/>`).join('')}</g>
   <path d="M0 192H800V300H0Z" fill="url(#city-floor)"/><path d="M0 203Q70 183 143 201T328 201T528 197T800 198V222Q699 211 614 219T378 219T144 221T0 220Z" fill="#e8f7ff" opacity=".73"/><path d="M0 235H800M0 276H800" stroke="#d7eefa" stroke-width="5" opacity=".4"/><path d="M186 192V300M635 192V300" stroke="#617883" stroke-width="8"/>
   <g fill="#243c50" stroke="#cee3d7" stroke-width="3"><rect x="61" y="54" width="135" height="50" rx="8"/><rect x="603" y="54" width="135" height="50" rx="8"/></g>
   <text x="128" y="86" fill="#f8d799" font-size="19" font-weight="700" text-anchor="middle">SNOW CITY</text><text x="670" y="86" fill="#b8f1ff" font-size="19" font-weight="700" text-anchor="middle">${boss?'BOSS GATE':'PLATFORM'}</text>
   <ellipse cx="185" cy="259" rx="102" ry="24" fill="#203949" stroke="#91acb7" stroke-width="3"/><ellipse cx="626" cy="241" rx="106" ry="23" fill="#203949" stroke="#91acb7" stroke-width="3"/>
   ${boss?'<path d="M400 0V184M375 126L400 146L425 126" stroke="#f3c27f" stroke-width="8" fill="none"/>':'<path d="M400 65V194" stroke="#b6d5d6" stroke-width="6"/>'}
   </svg>`;
  const sky = boss ? '#382d49' : '#253c53', stone = boss ? '#68526d' : '#577581';
  // A side-on ruined arena with stone platforms; deliberately no forest paths,
  // landmarks, trees, map coordinates or forestWorldArt content.
  return `<svg class="battle-arena-svg" data-arena="${boss?'thorn-vault':'moonstone-court'}" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="arena-sky" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="#91a6a2"/></linearGradient><linearGradient id="arena-floor" x2="0" y2="1"><stop stop-color="${stone}"/><stop offset="1" stop-color="#233840"/></linearGradient><radialGradient id="arena-light"><stop stop-color="#f6dfad" stop-opacity=".8"/><stop offset="1" stop-color="#f6dfad" stop-opacity="0"/></radialGradient></defs>
  <path fill="url(#arena-sky)" d="M0 0H800V300H0Z"/><circle cx="405" cy="59" r="36" fill="#f7eac1" opacity=".75"/><circle cx="405" cy="59" r="110" fill="url(#arena-light)" opacity=".25"/>
  <path d="M0 171L75 115L156 161L240 95L331 155L445 112L547 170L654 100L800 155V253H0" fill="#1b3145" opacity=".65"/>
  <g fill="#263e4b" stroke="#789194" stroke-width="3"><path d="M78 220V20H116V220M684 220V20H722V220"/><path d="M62 20H132V40H62ZM668 20H738V40H668Z"/><path d="M180 218V80H207V218M593 218V80H620V218"/><path d="M171 74H215V88H171ZM585 74H628V88H585Z"/></g>
  <path d="M0 213Q400 162 800 213V300H0Z" fill="url(#arena-floor)"/><g fill="none" stroke="#a4b3ab" opacity=".3"><ellipse cx="400" cy="262" rx="250" ry="72"/><ellipse cx="400" cy="262" rx="185" ry="50"/><path d="M400 203V300M163 241L640 285M641 241L160 285"/></g>
  <g fill="#344b51" stroke="#91a8a1" stroke-width="2"><ellipse cx="185" cy="252" rx="103" ry="24"/><ellipse cx="624" cy="229" rx="111" ry="24"/></g><g fill="#f5d394"><path d="M148 101Q129 80 146 62Q162 82 148 101ZM652 101Q634 80 651 62Q666 82 652 101Z"/><circle cx="310" cy="87" r="2"/><circle cx="530" cy="49" r="2"/><circle cx="458" cy="118" r="2"/></g>
  ${boss?'<g fill="none" stroke="#b17f98" stroke-width="5"><path d="M0 239L52 207L38 175L74 193L119 161M800 239L751 199L766 171L725 187L689 157"/></g>':''}</svg>`;
}
