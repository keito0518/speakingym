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
 let lastTurnCue=0;
 let sealProgress=0,sealPointer=null,sealStartY=0,sealDragged=false,suppressSealClick=false;
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
   const now=audioContext.currentTime;
   if(kind==='turn'&&now-lastTurnCue<.16)return;
   if(kind==='turn')lastTurnCue=now;
   const tier=root?.dataset.rarity||active?.tier;
   const tones=kind==='reveal'?(tier==='legend'?[392,494,587,784,988]:tier==='epic'?[349,440,523,698]:[392,523,659]):
    kind==='crack'?[98,145,220]:kind==='surge'?[196,293,440,587]:kind==='turn'?[620]:[220,330,440];
   tones.forEach((frequency,index)=>{
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
    const start=now+index*(kind==='crack'?.03:kind==='reveal'?.085:.065),duration=kind==='reveal'?.8:kind==='surge'?.34:kind==='turn'?.07:.21;
    oscillator.type=kind==='crack'?'sawtooth':kind==='turn'?'sine':'triangle';oscillator.frequency.setValueAtTime(frequency,start);
    if(kind==='crack')oscillator.frequency.exponentialRampToValueAtTime(Math.max(50,frequency*.52),start+duration);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(kind==='turn'?.012:.035,start+.025);
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
  root.innerHTML=`<div class="summon-vault-backdrop" aria-hidden="true"></div><div class="summon-vault-doors" aria-hidden="true"><span></span><span></span></div><div class="summon-vault-heaven" aria-hidden="true"></div><div class="summon-tier-splash" aria-hidden="true"><span id="summon-tier-splash-text">LEGENDARY</span></div>
  <div class="summon-universe" aria-hidden="true"><div class="summon-stardust"></div><div class="summon-rays"></div><div class="summon-aura"></div></div>
  <section class="summon-dialog" role="dialog" aria-modal="true" aria-labelledby="summon-title" aria-describedby="summon-story">
    <div class="summon-topline"><span class="summon-brand">SPEAKINGYM <b>SUMMON</b></span><div class="summon-top-actions"><button type="button" id="summon-sound" class="summon-icon-button" aria-pressed="false">効果音 OFF</button><button type="button" id="summon-close" class="summon-icon-button" aria-label="召喚画面を閉じる">閉じる</button></div></div>
    <div class="summon-center"><p id="summon-story" class="summon-story" aria-live="polite">星の武器庫が目を覚ます…</p>
      <div class="summon-vault-stage" id="summon-vault-stage">
       <div class="summon-vault-crest" aria-hidden="true"><span class="crest-orbit orbit-a"></span><span class="crest-orbit orbit-b"></span><span class="crest-spokes"></span></div>
       <button type="button" id="summon-seal" class="summon-vault-seal" aria-label="封印を上へスワイプして解く。タップ3回でも解ける">
        <span class="summon-seal-inner"><svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 7 72 42 110 60 72 77 60 113 47 77 10 60 47 42Z"/><path d="M60 30 69 50 90 60 69 70 60 90 51 70 30 60 51 50Z"/><circle cx="60" cy="60" r="8"/></svg><b>UNSEAL</b></span>
       </button>
       <div class="summon-vault-shards" aria-hidden="true">${Array.from({length:18},(_,i)=>`<span style="--shard-angle:${i*20}deg;--shard-delay:${(i%6)*.035}s"></span>`).join('')}</div>
       <div class="summon-vault-guide"><span class="tiny-caps">ASTRAL VAULT · SUMMON RITUAL</span><strong id="summon-seal-status" role="status">封印を上へスワイプ</strong><span>指を上へ滑らせる / タップ3回でも解放</span><div id="summon-seal-meter" class="summon-seal-meter" role="progressbar" aria-label="封印解放の進行度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></div>
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
  const seal=root.querySelector('#summon-seal');
  seal.addEventListener('pointerdown',event=>{
   if(root.dataset.phase!=='manual')return;
   sealPointer=event.pointerId;sealStartY=event.clientY;sealDragged=false;
   seal.setPointerCapture?.(event.pointerId);
  });
  seal.addEventListener('pointermove',event=>{
   if(root.dataset.phase!=='manual'||event.pointerId!==sealPointer)return;
   const distance=sealStartY-event.clientY;
   if(Math.abs(distance)>6)sealDragged=true;
   if(distance>0)advanceSeal(Math.max(0,Math.min(100,distance/1.4))-sealProgress);
  });
  seal.addEventListener('pointerup',event=>{
   if(event.pointerId===sealPointer){
    suppressSealClick=sealDragged;
    sealPointer=null;
   }
  });
  seal.addEventListener('pointercancel',()=>{sealPointer=null;});
  seal.addEventListener('click',()=>{
   if(suppressSealClick){suppressSealClick=false;return;}
   advanceSeal(34);
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
  root.querySelector('#summon-tier-splash-text').textContent=best.tier==='legend'?'LEGENDARY':best.tier==='epic'?'EPIC AWAKENING':'RARE SUMMON';
  root.querySelector('#summon-story').textContent=batch?'10の武器の気配が、ひとつの召喚陣に集う…':rarity.intro;
  root.querySelector('#summon-rarity').textContent=batch?'10 SUMMONS · '+rarity.label:rarity.label+' · '+rarity.name;
  root.querySelector('#summon-title').textContent=batch?'10連召喚 結果':data.weapon.name;
  root.querySelector('#summon-attack').textContent=batch?`消費 ${data.spent} G · 重複返還 ${data.refunded} G`:
   `ATTACK +${data.weapon.attack} · ${data.affinity}`;
  root.querySelector('#summon-duplicate').hidden=batch||!data.duplicate;
  root.querySelector('#summon-duplicate').textContent=!batch&&data.duplicate?`所持済み：${data.refund} G 返還 ＋ 覚醒の欠片1個`:'';
  root.querySelector('#summon-reveal-art').innerHTML=`<div class="summon-weapon-pedestal"><svg viewBox="25 0 28 49" role="img" aria-label="${escapeHtml(best.weapon.name)}">${weaponPixelOverlay(best.weapon)}</svg></div>`;
  const rewards=root.querySelector('#summon-batch-rewards');
  rewards.hidden=true;
  rewards.innerHTML=batch?data.results.map((item,index)=>`<div class="summon-batch-card" style="--card-delay:${(index*.105).toFixed(3)}s" data-tier="${item.tier}" data-duplicate="${item.duplicate}">
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
  root.hidden=false;document.body.classList.add('summon-active');root.scrollTop=0;
  sealProgress=0;sealPointer=null;sealDragged=false;suppressSealClick=false;
  root.style.setProperty('--seal-progress','0');
  root.querySelector('#summon-seal-meter').setAttribute('aria-valuenow','0');
  root.querySelector('#summon-seal-meter span').style.width='0%';
  root.querySelector('#summon-seal-status').textContent='封印を上へスワイプ';
  root.querySelector('#summon-seal').disabled=false;
  root.dataset.phase='manual';
  root.querySelector('#summon-skip').textContent='操作をスキップして結果を見る';
  root.querySelector('#summon-seal').focus({preventScroll:true});
  if(reducedMotion()){reveal();return;}
 }
 function advanceSeal(amount){
  if(!root||root.hidden||root.dataset.phase!=='manual')return;
  sealProgress=Math.min(100,sealProgress+Math.max(0,amount));
  root.style.setProperty('--seal-progress',String(sealProgress));
  root.querySelector('#summon-seal-meter').setAttribute('aria-valuenow',String(Math.round(sealProgress)));
  root.querySelector('#summon-seal-meter span').style.width=`${Math.round(sealProgress)}%`;
  root.querySelector('#summon-seal-status').textContent=sealProgress>=100?'封印解放！':`封印解放 ${Math.round(sealProgress)}%`;
  if(sealProgress>=100){
   root.dataset.phase='unseal';root.querySelector('#summon-seal').disabled=true;
   root.querySelector('#summon-story').textContent='星の扉が、いま開く――';
   playCue('crack');later(startMagicSequence,900);
  }else playCue('turn');
 }
 function startMagicSequence(){
  if(!root||root.hidden||!active||root.dataset.phase!=='unseal')return;
  root.dataset.phase='charge';
  root.querySelector('#summon-story').textContent=active.results?'十の星が、星核へと集う…':RARITY_COPY[active.tier].intro;
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
