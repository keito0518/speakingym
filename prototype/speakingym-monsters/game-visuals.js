// Original vector assets. No platform emoji, external images or image-map reuse.
export function relicArt(id) {
  const shapes = {
    'sunlit-leaf': '<path d="M15 47Q5 14 49 10Q56 42 23 49Z" fill="#aaca78"/><path d="M12 55L44 20M25 42L22 29M34 33L45 34"/>',
    'moss-lantern': '<path d="M23 14H41L45 24V47L32 54L19 47V24Z" fill="#b6d8bb"/><path d="M24 14V9H40V14M19 26H45M19 44H45"/><ellipse cx="32" cy="35" rx="6" ry="10" fill="#ffe39c" stroke="none"/>',
    'golden-yolk': '<path d="M16 39C16 26 25 10 32 10S48 26 48 39A16 16 0 0 1 16 39Z" fill="#f8d17b"/><ellipse cx="28" cy="30" rx="5" ry="9" fill="#fff3be" stroke="none"/>',
    'lost-button': '<circle cx="32" cy="32" r="23" fill="#b7a6da"/><circle cx="32" cy="32" r="17"/><path d="M26 26L38 38M38 26L26 38"/><g fill="#493e66"><circle cx="26" cy="26" r="2"/><circle cx="38" cy="26" r="2"/><circle cx="26" cy="38" r="2"/><circle cx="38" cy="38" r="2"/></g>'
  };
  return `<svg class="relic-svg" viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g stroke="#655b40" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">${shapes[id] || shapes['sunlit-leaf']}</g></svg>`;
}
export function guardArt() {
  return '<svg viewBox="0 0 100 110" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M50 5L90 20V55Q86 88 50 104Q14 88 10 55V20Z" fill="#76cddc44" stroke="#d4f8ff" stroke-width="4"/><path d="M50 18L77 28V54Q74 76 50 88Q26 76 23 54V28Z" fill="none" stroke="#8dd8e8" stroke-width="2"/><path d="M50 27V76M30 47H70" stroke="#e0faff" stroke-width="3"/></svg>';
}
export function battleArenaArt(boss = false) {
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
