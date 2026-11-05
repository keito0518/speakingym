// A summon is an earned in-game reward, never a paid lottery. The economy
// commits the result BEFORE this presentation begins; skipping or closing the
// animation cannot draw a second item or change the saved result.
const RARITY_COPY=Object.freeze({
 common:{label:'COMMON',name:'旅の武器',intro:'装備の気配が集まっていく…',surge:''},
 rare:{label:'RARE',name:'希少な武器',intro:'青い光が召喚陣を包む…',surge:''},
 epic:{label:'EPIC',name:'秘宝級の武器',intro:'紫の雷光が走る…',surge:'召喚陣が共鳴している！'},
 legend:{label:'LEGEND',name:'伝説の武器',intro:'金色の星が目を覚ます…',surge:'伝説の封印が、いま解き放たれる！'}
});

// A high rarity has more anticipation, not different odds or extra draws.
// Every sequence remains skippable; reduced-motion reveals immediately.
export const SUMMON_TIMINGS=Object.freeze({
 common:Object.freeze({crack:800,surge:null,reveal:1900}),
 rare:Object.freeze({crack:850,surge:null,reveal:2250}),
 epic:Object.freeze({crack:900,surge:1500,reveal:2900}),
 legend:Object.freeze({crack:950,surge:1650,reveal:3500})
});

export function createGachaCinematic({onEquip,onRepeat}){
 let root=null,active=null,previousFocus=null;
 let soundEnabled=false,audioContext=null;
 const timers=[];
 const clearTimers=()=>{while(timers.length)clearTimeout(timers.pop());};
 const later=(fn,delay)=>timers.push(setTimeout(fn,delay));
 function playCue(kind){
  if(!soundEnabled)return;
  try{
   const AudioEngine=window.AudioContext||window.webkitAudioContext;
   if(!AudioEngine)return;
   audioContext||=new AudioEngine();
   if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
   const tones=kind==='reveal'?(active?.tier==='legend'?[440,554,659,880]:active?.tier==='epic'?[392,523,659]:[392,523]):kind==='crack'?[155,120]:[261,329];
   const now=audioContext.currentTime;
   tones.forEach((frequency,index)=>{
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
    const start=now+index*(kind==='crack'?.045:.095),duration=kind==='reveal'?.38:.14;
    oscillator.type=kind==='crack'?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,start);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.065,start+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain);gain.connect(audioContext.destination);
    oscillator.start(start);oscillator.stop(start+duration+.02);
   });
  }catch{/* Audio is an optional effect; never interrupt English practice. */}
 }
 function ensure(){
  if(root)return root;
  root=document.createElement('div');
  root.id='summon-screen';root.className='summon-screen';root.hidden=true;
  root.dataset.phase='charge';root.dataset.rarity='common';
  root.innerHTML=`<div class="summon-universe" aria-hidden="true"><div class="summon-stardust"></div><div class="summon-rays"></div><div class="summon-aura"></div></div>
  <section class="summon-dialog" role="dialog" aria-modal="true" aria-labelledby="summon-title" aria-describedby="summon-story">
    <div class="summon-topline"><span class="summon-brand">SPEAKINGYM <b>SUMMON</b></span><div class="summon-top-actions"><button type="button" id="summon-sound" class="summon-icon-button" aria-pressed="false">効果音 OFF</button><button type="button" id="summon-close" class="summon-icon-button" aria-label="召喚画面を閉じる">閉じる</button></div></div>
    <div class="summon-center"><p id="summon-story" class="summon-story" aria-live="polite">武器の気配が集まっていく…</p>
      <div class="summon-portal" aria-hidden="true">
        <div class="summon-meteors"><span></span><span></span><span></span><span></span><span></span><span></span></div>
        <div class="summon-ascension"></div>
        <div class="summon-orbit orbit-one"></div><div class="summon-orbit orbit-two"></div>
        <svg class="summon-sigil" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="150" cy="150" r="133" stroke="currentColor" stroke-width="2"/><circle cx="150" cy="150" r="112" stroke="currentColor" stroke-width="1" stroke-dasharray="5 13"/><path d="M150 28 270 219H30L150 28ZM150 272 30 81h240L150 272Z" stroke="currentColor" stroke-width="1.5"/><circle cx="150" cy="150" r="70" stroke="currentColor" stroke-width="1.5"/><path d="M150 96 204 150 150 204 96 150Z" stroke="currentColor" stroke-width="2"/></svg>
        <div class="summon-core"><span class="summon-core-inner"></span><span class="summon-crack crack-one"></span><span class="summon-crack crack-two"></span><span class="summon-crack crack-three"></span></div>
        <div class="summon-reveal-art" id="summon-reveal-art"></div><div class="summon-flash"></div>
      </div>
      <div class="summon-reward" id="summon-reward"><span id="summon-rarity" class="summon-rarity">RARE</span><h2 id="summon-title">武器を召喚</h2><p id="summon-attack"></p><p id="summon-duplicate" class="summon-duplicate" hidden></p></div>
    </div>
    <div class="summon-actions"><button type="button" id="summon-skip" class="summon-secondary">演出をスキップ</button><button type="button" id="summon-equip" class="summon-primary" hidden>この武器を装備</button><button type="button" id="summon-repeat" class="summon-secondary" hidden>もう一度召喚する</button><p class="summon-game-only">ゲーム内ゴールドのみ。現金・課金による抽選はありません。</p></div>
  </section>`;
  document.body.append(root);
  root.querySelector('#summon-close').addEventListener('click',close);
  root.querySelector('#summon-sound').addEventListener('click',()=>{
   soundEnabled=!soundEnabled;
   const button=root.querySelector('#summon-sound');
   button.setAttribute('aria-pressed',String(soundEnabled));
   button.textContent='効果音 '+(soundEnabled?'ON':'OFF');
   if(soundEnabled)playCue('charge');
  });
  root.querySelector('#summon-skip').addEventListener('click',reveal);
  root.querySelector('#summon-equip').addEventListener('click',()=>{
   if(!active||root.dataset.phase!=='reveal')return;
   if(onEquip(active.weapon)){close();document.querySelector('#collection-weapons')?.scrollIntoView({block:'start',behavior:'instant'});}
  });
  root.querySelector('#summon-repeat').addEventListener('click',()=>{
   if(!active||root.dataset.phase!=='reveal')return;
   const button=root.querySelector('#summon-repeat');button.disabled=true;
   try{
    const next=onRepeat?.();
    if(next){show(next,{keepFocus:true});return;}
    button.textContent='ゴールドが足りないか、保存できませんでした';
   }finally{button.disabled=false;}
  });
  root.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close();return;}
   if(event.key!=='Tab')return;
   const focusables=[...root.querySelectorAll('button:not([hidden]):not([disabled])')];
   const first=focusables[0],last=focusables.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  return root;
 }
 function reveal(){
  if(!root||root.hidden||root.dataset.phase==='reveal')return;
  clearTimers();root.dataset.phase='reveal';
  root.querySelector('#summon-story').textContent=active.duplicate?'すでに持っている武器だった！':'新しい武器が仲間になった！';
  root.querySelector('#summon-skip').hidden=true;
  root.querySelector('#summon-equip').hidden=false;
  root.querySelector('#summon-repeat').hidden=!active.canRepeat;
  playCue('reveal');
  root.querySelector('#summon-equip').focus({preventScroll:true});
 }
 function show(data,{keepFocus=false}={}){
  ensure();clearTimers();
  if(!keepFocus||!previousFocus)previousFocus=document.querySelector('#shop-draw')||document.activeElement;
  active=data;
  const rarity=RARITY_COPY[data.tier]||RARITY_COPY.common;
  root.dataset.rarity=data.tier in RARITY_COPY?data.tier:'common';root.dataset.phase='charge';
  root.querySelector('#summon-story').textContent=rarity.intro;
  root.querySelector('#summon-rarity').textContent=rarity.label+' · '+rarity.name;
  root.querySelector('#summon-title').textContent=data.weapon.name;
  root.querySelector('#summon-attack').textContent=`ATTACK +${data.weapon.attack} · ${data.affinity}`;
  root.querySelector('#summon-duplicate').hidden=!data.duplicate;
  root.querySelector('#summon-duplicate').textContent=data.duplicate?`所持済みにつき ${data.refund} G 返還された`:'';
  root.querySelector('#summon-reveal-art').innerHTML=data.art;
  root.querySelector('#summon-skip').hidden=false;
  root.querySelector('#summon-equip').hidden=true;
  root.querySelector('#summon-repeat').hidden=true;
  root.querySelector('#summon-repeat').textContent='もう一度召喚する';
  root.hidden=false;document.body.classList.add('summon-active');
  root.querySelector('#summon-skip').focus({preventScroll:true});
  playCue('charge');
  const quiet=document.documentElement.classList.contains('monsters-quiet-motion')||
   window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(quiet){reveal();return;}
  const timeline=SUMMON_TIMINGS[root.dataset.rarity];
  later(()=>{root.dataset.phase='crack';root.querySelector('#summon-story').textContent='封印が解ける――';playCue('crack');},timeline.crack);
  if(timeline.surge!==null)later(()=>{
   root.dataset.phase='surge';root.querySelector('#summon-story').textContent=rarity.surge;
   playCue('surge');
  },timeline.surge);
  later(reveal,timeline.reveal);
 }
 function close(){
  if(!root||root.hidden)return;
  clearTimers();root.hidden=true;document.body.classList.remove('summon-active');active=null;
  previousFocus?.focus?.({preventScroll:true});previousFocus=null;
 }
 return {show,close};
}
