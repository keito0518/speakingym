/* Opt-in, prototype-only measurement. Never transmit answers, transcripts,
 * saved learning progress, monster IDs, or identifiers chosen by the player.
 * The consent key is deliberately separate from Speakingym's production GA4.
 */
export const BETA_CONSENT_KEY = 'speakingym-monsters-beta-consent-v1';
const LAST_VISIT_KEY = 'speakingym-monsters-beta-visit-day-v1';
const SESSION_VISIT_KEY = 'speakingym-monsters-beta-visit-session-v1';
const EVENT_FIELDS = Object.freeze({
  monsters_beta_visit: {returning:['yes','no']},
  monsters_beta_start: {mode:['forest','forest-endless','daily','speaking','listening','challenge','practice','saved','retention','dungeon-review'],difficulty:['easy','normal','hard','mixed'],chapter:['entry','glade','thicket','sanctuary','city','city-market','city-terminal','city-blizzard','other']},
  monsters_beta_chapter_clear: {chapter:['entry','glade','thicket','sanctuary','city','city-market','city-terminal','city-blizzard'],difficulty:['easy','normal','hard']},
  monsters_beta_feedback: {reaction:['fun','hard','grading','usability','audio']}
});

export function safeBetaEvent(name, fields = {}) {
  const rules=EVENT_FIELDS[name];
  if (!rules || fields===null || typeof fields!=='object' || Array.isArray(fields))return null;
  const safe={};
  for (const [field, choices] of Object.entries(rules)) {
    if (!choices.includes(fields[field]))return null;
    safe[field]=fields[field];
  }
  // No extra properties are ever passed through, even if caller makes a mistake.
  return {name,fields:safe};
}

export function createBetaTelemetry({root=window,doc=document,id=root.SPEAKINGYM_GA4_ID,now=()=>new Date()}={}) {
  const validId=typeof id==='string'&&/^G-[A-Z0-9]{6,16}$/.test(id);
  const read=(key)=>{try{return root.localStorage?.getItem(key)||'';}catch{return '';}};
  const write=(key,value)=>{try{root.localStorage?.setItem(key,value);}catch{/* Private browsing */}};
  const sessionRead=(key)=>{try{return root.sessionStorage?.getItem(key)||'';}catch{return '';}};
  const sessionWrite=(key,value)=>{try{root.sessionStorage?.setItem(key,value);}catch{/* Private browsing */}};
  let consent=read(BETA_CONSENT_KEY)==='yes'?'yes':read(BETA_CONSENT_KEY)==='no'?'no':'';
  let loaded=false;
  const today=()=>{const d=now();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

  function enable() {
    if (consent!=='yes'||!validId)return false;
    if(loaded)return true;
    root[`ga-disable-${id}`]=false;
    root.dataLayer=Array.isArray(root.dataLayer)?root.dataLayer:[];
    if(typeof root.gtag!=='function')root.gtag=function(){root.dataLayer.push(arguments);};
    root.gtag('js',new Date());
    root.gtag('config',id,{
      send_page_view:false,allow_google_signals:false,
      allow_ad_personalization_signals:false,anonymize_ip:true
    });
    if(!doc.querySelector('script[data-monsters-beta-analytics]')){
      const script=doc.createElement('script');
      script.async=true;script.dataset.monstersBetaAnalytics='true';
      script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      doc.head.appendChild(script);
    }
    loaded=true;
    return true;
  }
  function track(name,fields) {
    const safe=safeBetaEvent(name,fields);
    if(consent!=='yes'||!safe||!enable()||typeof root.gtag!=='function')return false;
    root.gtag('event',safe.name,{...safe.fields,send_to:id});
    return true;
  }
  function markVisit() {
    if(consent!=='yes'||sessionRead(SESSION_VISIT_KEY)==='yes')return false;
    const old=read(LAST_VISIT_KEY),current=today();
    if(!track('monsters_beta_visit',{returning:old&&old!==current?'yes':'no'}))return false;
    sessionWrite(SESSION_VISIT_KEY,'yes');
    write(LAST_VISIT_KEY,current);
    return true;
  }
  function setConsent(choice) {
    if(!['yes','no'].includes(choice))return false;
    consent=choice;write(BETA_CONSENT_KEY,choice);
    if(choice==='no') {
      if(validId)root[`ga-disable-${id}`]=true;
    }else markVisit();
    return true;
  }
  if(consent==='yes')markVisit();
  return {getConsent:()=>consent,setConsent,track,markVisit,configured:validId};
}
