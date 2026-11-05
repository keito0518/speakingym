// A summon is an earned in-game reward, never a paid lottery. The economy
// commits the result BEFORE this presentation begins; skipping or closing the
// animation cannot draw a second item or change the saved result.
import {weaponPixelOverlay} from './weapon-visuals.js';

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

const rarityOrder=['common','rare','epic','legend'];
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function createGachaCinematic({onEquip,onRepeat,onRepeatTen}){
 let root=null,active=null,previousFocus=null;
 let soundEnabled=false,audioContext=null;
 let crankProgress=0,lastCrankAngle=null,crankPointer=null,crankDragged=false,suppressCrankClick=false;
 const timers=[];
 const clearTimers=()=>{while(timers.length)clearTimeout(timers.pop());};
 const later=(fn,delay)=>timers.push(setTimeout(fn,delay));
 const reducedMotion=()=>document.documentElement.classList.contains('monsters-quiet-motion')||
   window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      <div class="gashapon-stage" id="gashapon-stage">
       <div class="gashapon-machine" aria-label="手動ガシャポン筐体">
        <div class="gashapon-glass"><div class="gashapon-glass-glare"></div><div class="gashapon-capsules" aria-hidden="true">${Array.from({length:16},(_,i)=>`<span class="gashapon-ball" style="--ball-x:${7+(i*37)%78}%;--ball-y:${39+(i*19)%44}%;--ball-hue:${i*37}deg;--ball-index:${i}"></span>`).join('')}</div></div>
        <div class="gashapon-neck"></div>
        <div class="gashapon-cabinet"><div class="gashapon-marquee">STAR CAPSULE <small>WEAPON SUMMON</small></div>
          <div class="gashapon-controls"><button type="button" id="summon-crank" class="gashapon-crank" aria-label="ハンドルを時計回りに回す。タップでも回せる"><span class="gashapon-handle"></span><span class="gashapon-handle-center"></span></button>
          <div class="gashapon-coinplate"><span>GOLD</span><strong id="summon-gashapon-price">120 G</strong><i></i><small>ゲーム内通貨</small></div></div>
          <div class="gashapon-hatch"><span>CAPSULE EXIT</span><div class="gashapon-dropped-ball"></div></div>
        </div><div class="gashapon-feet"></div>
       </div>
       <div class="gashapon-guide"><strong id="summon-crank-status" role="status">ハンドルを時計回りに回そう</strong><span>指で回す／タップ4回でもOK</span><div id="summon-crank-meter" class="gashapon-meter" role="progressbar" aria-label="ハンドルの回転進行" aria-valuemin="0" aria-valuemax="300" aria-valuenow="0"><span></span></div></div>
      </div>
      <div class="summon-portal" aria-hidden="true">
        <div class="summon-confetti">${Array.from({length:24},(_,i)=>`<span style="--spark-rotation:${i*15}deg;--spark-delay:${(i%6)*.045}s"></span>`).join('')}</div><div class="summon-shockwave"></div>
        <div class="summon-meteors"><span></span><span></span><span></span><span></span><span></span><span></span></div>
        <div class="summon-ascension"></div>
        <div class="summon-orbit orbit-one"></div><div class="summon-orbit orbit-two"></div>
        <svg class="summon-sigil" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="150" cy="150" r="133" stroke="currentColor" stroke-width="2"/><circle cx="150" cy="150" r="112" stroke="currentColor" stroke-width="1" stroke-dasharray="5 13"/><path d="M150 28 270 219H30L150 28ZM150 272 30 81h240L150 272Z" stroke="currentColor" stroke-width="1.5"/><circle cx="150" cy="150" r="70" stroke="currentColor" stroke-width="1.5"/><path d="M150 96 204 150 150 204 96 150Z" stroke="currentColor" stroke-width="2"/></svg>
        <div class="summon-core"><span class="summon-core-inner"></span><span class="summon-crack crack-one"></span><span class="summon-crack crack-two"></span><span class="summon-crack crack-three"></span></div>
        <div class="summon-reveal-art" id="summon-reveal-art"></div><div class="summon-flash"></div>
      </div>
      <div class="summon-reward" id="summon-reward"><span id="summon-rarity" class="summon-rarity">RARE</span><h2 id="summon-title">武器を召喚</h2><p id="summon-attack"></p><p id="summon-duplicate" class="summon-duplicate" hidden></p></div>
      <div class="summon-batch-rewards" id="summon-batch-rewards" aria-label="10連で獲得した武器" hidden></div>
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
  const crank=root.querySelector('#summon-crank');
  const angleAt=event=>{
   const r=crank.getBoundingClientRect();
   return Math.atan2(event.clientY-r.top-r.height/2,event.clientX-r.left-r.width/2)*180/Math.PI;
  };
  crank.addEventListener('pointerdown',event=>{
   if(root.dataset.phase!=='manual')return;
   crankPointer=event.pointerId;lastCrankAngle=angleAt(event);crankDragged=false;
   crank.setPointerCapture?.(event.pointerId);
  });
  crank.addEventListener('pointermove',event=>{
   if(root.dataset.phase!=='manual'||event.pointerId!==crankPointer||lastCrankAngle===null)return;
   const angle=angleAt(event),delta=(angle-lastCrankAngle+540)%360-180;
   if(Math.abs(delta)>2)crankDragged=true;
   if(delta>0)advanceCrank(Math.min(65,delta));
   lastCrankAngle=angle;
  });
  crank.addEventListener('pointerup',event=>{
   if(event.pointerId===crankPointer){
    suppressCrankClick=crankDragged;
    crankPointer=null;lastCrankAngle=null;
   }
  });
  crank.addEventListener('pointercancel',()=>{crankPointer=null;lastCrankAngle=null;});
  crank.addEventListener('click',()=>{
   if(suppressCrankClick){suppressCrankClick=false;return;}
   advanceCrank(90);
  });
  root.querySelector('#summon-equip').addEventListener('click',()=>{
   if(!active||root.dataset.phase!=='reveal')return;
   if(onEquip(active.weapon)){close();document.querySelector('#collection-weapons')?.scrollIntoView({block:'start',behavior:'instant'});}
  });
  root.querySelector('#summon-batch-rewards').addEventListener('click',event=>{
   const button=event.target.closest('[data-batch-equip]');
   if(!button||!active?.results||root.dataset.phase!=='reveal')return;
   const item=active.results[Number(button.dataset.batchEquip)];
   if(item&&onEquip(item.weapon)){
    close();document.querySelector('#collection-weapons')?.scrollIntoView({block:'start',behavior:'instant'});
   }
  });
  root.querySelector('#summon-repeat').addEventListener('click',()=>{
   if(!active||root.dataset.phase!=='reveal')return;
   const button=root.querySelector('#summon-repeat');button.disabled=true;
   try{
    const next=active.results?onRepeatTen?.():onRepeat?.();
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
  root.scrollTop=0;
  root.querySelector('#summon-story').textContent=active.results?
   `10連召喚完了！ 新しい武器 ${active.results.filter(item=>!item.duplicate).length} 種`:
   active.duplicate?'すでに持っている武器だった！':'新しい武器が仲間になった！';
  root.querySelector('#summon-skip').hidden=true;
  root.querySelector('#summon-equip').hidden=Boolean(active.results);
  root.querySelector('#summon-repeat').hidden=!active.canRepeat;
  root.querySelector('#summon-batch-rewards').hidden=!active.results;
  playCue('reveal');
  const firstAction=active.results?root.querySelector('[data-batch-equip]')||root.querySelector('#summon-repeat'):
   root.querySelector('#summon-equip');
  (firstAction?.hidden?root.querySelector('#summon-close'):firstAction)?.focus({preventScroll:true});
 }
 function show(data,{keepFocus=false}={}){
  ensure();clearTimers();
  if(!keepFocus||!previousFocus)previousFocus=document.querySelector(data.results?'#shop-draw-ten':'#shop-draw')||document.activeElement;
  active=data;
  const batch=Array.isArray(data.results);
  const best=batch?data.results.reduce((a,b)=>rarityOrder.indexOf(a.tier)>=rarityOrder.indexOf(b.tier)?a:b):data;
  const rarity=RARITY_COPY[best.tier]||RARITY_COPY.common;
  root.dataset.mode=batch?'batch':'single';
  root.dataset.rarity=best.tier in RARITY_COPY?best.tier:'common';root.dataset.phase='charge';
  root.querySelector('#summon-story').textContent=batch?'10の武器の気配が、ひとつの召喚陣に集う…':rarity.intro;
  root.querySelector('#summon-rarity').textContent=batch?'10 SUMMONS · '+rarity.label:rarity.label+' · '+rarity.name;
  root.querySelector('#summon-title').textContent=batch?'10連召喚 結果':data.weapon.name;
  root.querySelector('#summon-attack').textContent=batch?`消費 ${data.spent} G · 重複返還 ${data.refunded} G`:
   `ATTACK +${data.weapon.attack} · ${data.affinity}`;
  root.querySelector('#summon-duplicate').hidden=batch||!data.duplicate;
  root.querySelector('#summon-duplicate').textContent=!batch&&data.duplicate?`所持済み：${data.refund} G 返還 ＋ 覚醒の欠片1個`:'';
  root.querySelector('#summon-reveal-art').innerHTML=batch?'':data.art;
  const rewards=root.querySelector('#summon-batch-rewards');
  rewards.hidden=true;
  rewards.innerHTML=batch?data.results.map((item,index)=>`<div class="summon-batch-card" data-tier="${item.tier}" data-duplicate="${item.duplicate}">
    <span class="summon-batch-number">${String(index+1).padStart(2,'0')}</span>
    <svg class="summon-batch-weapon" viewBox="25 0 28 49" aria-hidden="true">${weaponPixelOverlay(item.weapon)}</svg>
    <span class="summon-batch-rarity">${RARITY_COPY[item.tier].label}</span>
    <strong>${escapeHtml(item.weapon.name)}</strong>
    <small>ATTACK +${item.weapon.attack}${item.duplicate?` · 重複 +${item.refund} G / 覚醒の欠片 +1`:' · NEW'}</small>
    <button type="button" data-batch-equip="${index}" aria-label="${escapeHtml(item.weapon.name)}を装備する">装備する</button>
   </div>`).join(''):'';
  root.querySelector('#summon-skip').hidden=false;
  root.querySelector('#summon-equip').hidden=true;
  root.querySelector('#summon-repeat').hidden=true;
  root.querySelector('#summon-repeat').textContent=batch?'10連をもう一度召喚する':'もう一度召喚する';
  root.querySelector('#summon-gashapon-price').textContent=batch?'1,200 G':'120 G';
  root.hidden=false;document.body.classList.add('summon-active');root.scrollTop=0;
  crankProgress=0;lastCrankAngle=null;crankPointer=null;crankDragged=false;suppressCrankClick=false;
  root.style.setProperty('--crank-angle','0deg');
  root.querySelector('#summon-crank-meter').setAttribute('aria-valuenow','0');
  root.querySelector('#summon-crank-meter span').style.width='0%';
  root.querySelector('#summon-crank-status').textContent='ハンドルを時計回りに回そう';
  root.querySelector('#summon-crank').disabled=false;
  root.dataset.phase='manual';
  root.querySelector('#summon-skip').textContent='操作をスキップして結果を見る';
  root.querySelector('#summon-crank').focus({preventScroll:true});
  if(reducedMotion()){reveal();return;}
 }
 function advanceCrank(degrees){
  if(!root||root.hidden||root.dataset.phase!=='manual')return;
  crankProgress=Math.min(300,crankProgress+Math.max(0,degrees));
  root.style.setProperty('--crank-angle',`${crankProgress}deg`);
  root.querySelector('#summon-crank-meter').setAttribute('aria-valuenow',String(Math.round(crankProgress)));
  root.querySelector('#summon-crank-meter span').style.width=`${Math.round(100*crankProgress/300)}%`;
  root.querySelector('#summon-crank-status').textContent=crankProgress>=300?'カプセル排出！':`あと ${Math.ceil(300-crankProgress)}° 回そう！`;
  if(crankProgress>=300){
   root.dataset.phase='vend';root.querySelector('#summon-crank').disabled=true;
   root.querySelector('#summon-story').textContent='カプセルが落ちてきた！';
   playCue('crack');later(startMagicSequence,680);
  }else if(Math.round(crankProgress)%90<10)playCue('turn');
 }
 function startMagicSequence(){
  if(!root||root.hidden||!active||root.dataset.phase!=='vend')return;
  root.dataset.phase='charge';
  root.querySelector('#summon-story').textContent=active.results?'10個のカプセルが星の光と共鳴する…':RARITY_COPY[active.tier].intro;
  root.querySelector('#summon-skip').textContent='演出をスキップ';
  playCue('charge');
  const rarity=RARITY_COPY[root.dataset.rarity];
  const timeline=SUMMON_TIMINGS[root.dataset.rarity];
  later(()=>{root.dataset.phase='crack';root.querySelector('#summon-story').textContent='封印が解ける――';playCue('crack');},timeline.crack);
  if(timeline.surge!==null)later(()=>{
   root.dataset.phase='surge';root.querySelector('#summon-story').textContent=rarity.surge;
   playCue('surge');
  },timeline.surge);
  later(reveal,timeline.reveal);
 }
 function showBatch(data,options){show(data,options);}
 function close(){
  if(!root||root.hidden)return;
  clearTimers();root.hidden=true;document.body.classList.remove('summon-active');active=null;
  previousFocus?.focus?.({preventScroll:true});previousFocus=null;
 }
 return {show,showBatch,close};
}
