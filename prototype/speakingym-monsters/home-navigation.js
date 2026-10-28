// Organize the prototype into clear destinations without cloning content or
// disrupting existing IDs/listeners. This is a navigation-only change.
const STEPS=Object.freeze([
 {title:'1. Englishダンジョンに挑戦',body:'最初の冒険は英語の5問と最後の確認。聞く・話す・単語・文法を組み合わせて進もう。ダンジョン選択では解放したエリアを選べるよ。'},
 {title:'2. リスニングとスピーキングは別々',body:'リスニングは音声を聞いて意味を選ぶだけでクリア。話す問題は独立しているよ。聞き終わったあとマイクを使う必要はないから、安心して挑戦してね。'},
 {title:'3. 話す問題でマイクが動かないとき',body:'スピーキングではSafariで試すか、iPhone標準キーボードのマイクから英文を入力できるよ。声が文字にならないだけで英語の成績を下げることはないよ。'},
 {title:'4. 解説を読んで問題を保存',body:'答えたあとに「なぜそうなるか」を確認。「☆ 問題を保存」を押すと、復習から同じ問題を解き直せる。間違えた問題は復習候補にもなるよ。'},
 {title:'5. ダンジョンと図鑑は、自分のペースで',body:'ダンジョンで経験を積み、仲間を育てよう。短時間の練習なら「今日の5分ジム」。仲間や学習記録は別のメニューから確認できるよ。'}
]);
export function setupHomeNavigation({home,startMode,showCollection}){
 const sections={
  daily:document.createElement('section'),
  training:document.createElement('section'),
  forest:document.createElement('section'),
  review:document.createElement('section'),
  progress:document.createElement('section')
 };
 for(const [id,panel] of Object.entries(sections)){
  panel.className='home-destination';panel.id='home-destination-'+id;panel.hidden=true;
  panel.innerHTML='<button type="button" class="home-menu-back">← メニューへ戻る</button>';
  home.append(panel);
  panel.querySelector('button').addEventListener('click',()=>showMenu());
 }
 const move=(selector,page)=>{const element=home.querySelector(selector);if(!element)throw Error('Missing home section: '+selector);sections[page].append(element);};
 // Move the forest out of the hero so the home page no longer repeats a full
 // game, catalogue and review dashboard in one long scrolling page.
 move('.forest-invite','forest');
 move('.daily-gym','daily');
 move('.saved-review','review');
 move('.retention-hub','review');
 move('.hero-grid','training');
 move('.review-journal','review');
 move('.section-head','progress');
 move('.stat-grid','progress');
 move('.notice-card','progress');
 const buttons=[
  {id:'forest',icon:'02',title:'Englishダンジョン',desc:'次のエリアを攻略して仲間と成長',action:()=>showPage('forest')},
  {id:'daily',icon:'01',title:'今日の5分ジム',desc:'8問でサクッと英語トレーニング',action:()=>showPage('daily')},
  {id:'training',icon:'03',title:'スピーキング道場',desc:'英語で伝える力を鍛えよう',action:()=>showPage('training')},
  {id:'listening',icon:'09',title:'リスニング道場',desc:'聞いて意味を理解する問題だけ',action:()=>startMode('listening')},
  {id:'review',icon:'04',title:'復習する',desc:'保存した問題と苦手を解き直す',action:()=>showPage('review')},
  {id:'challenge',icon:'05',title:'60秒チャレンジ',desc:'瞬発力を鍛える短時間練習',action:()=>startMode('challenge')},
  {id:'collection',icon:'06',title:'なかま・図鑑',desc:'仲間と冒険の記録を確認',action:showCollection},
  {id:'progress',icon:'07',title:'学習記録',desc:'復習や定着度を確認する',action:()=>showPage('progress')},
  {id:'tutorial',icon:'08',title:'はじめての方へ',desc:'操作方法と音声入力のコツ',action:openTutorial}
 ];
 const menu=document.createElement('section');
 menu.className='home-navigation';menu.id='home-navigation';
 const head=document.createElement('div');head.className='home-navigation-head';
 head.innerHTML='<span class="tiny-caps">WELCOME TO SPEAKINGYM MONSTERS</span><h1><span class="home-title-phrase">英語で戦って、</span><em class="home-title-phrase">仲間と冒険へ。</em></h1><p>知っている英語を、実際に使える英語へ。今日はどこまで進める？</p>';
 // Optional lower-motion UI for iPhone users; CSS still honors system
 // Reduced Motion. This setting changes visuals only, not English grading.
 const motionToggle=document.createElement('button');
 motionToggle.type='button';motionToggle.id='toggle-simple-motion';motionToggle.className='motion-toggle';
 let quiet=false;
 try{quiet=localStorage.getItem('speakingym-monsters-reduce-motion')==='1';}catch{}
 const applyMotion=()=>{
  document.documentElement.classList.toggle('monsters-quiet-motion',quiet);
  motionToggle.setAttribute('aria-pressed',String(quiet));
  motionToggle.textContent=quiet?'演出：ひかえめ（変更）':'演出：通常（ひかえめにする）';
 };
 motionToggle.addEventListener('click',()=>{
  quiet=!quiet;
  try{localStorage.setItem('speakingym-monsters-reduce-motion',quiet?'1':'0');}catch{}
  applyMotion();
 });
 applyMotion();head.append(motionToggle);
 const feature=document.createElement('section');feature.className='home-feature';
 feature.innerHTML=`<div class="home-feature-sky" aria-hidden="true"><span class="home-moon"></span><span class="home-mountain mountain-back"></span><span class="home-mountain mountain-front"></span><span class="home-forest-line"></span></div>
 <div class="home-feature-content"><span class="home-feature-eyebrow">MAIN ADVENTURE · 2 WORLDS</span><h2>English<br>ダンジョン</h2><p>森の4エリアを攻略したら、新しい「会話の街」へ。英語を使って仲間と進もう。</p>
 <div class="home-feature-info"><span id="home-menu-mastered">練習できた表現 0</span><span id="home-menu-due">復習 0</span><span id="home-menu-xp">0 XP</span></div>
 <button type="button" class="home-feature-cta" data-feature-dungeon>ダンジョンへ進む <span aria-hidden="true">›</span></button><p class="home-feature-progress" id="home-feature-progress">森の入口から冒険開始</p></div>
 <div class="home-feature-companion"><div id="home-menu-art" aria-hidden="true"></div><strong id="home-menu-name">Yolkie</strong><small id="home-menu-level">Lv.1 · 今日も一緒に</small></div>`;
 feature.querySelector('[data-feature-dungeon]').addEventListener('click',()=>showPage('forest'));
 const label=document.createElement('div');label.className='home-navigation-label';label.innerHTML='<h2>トレーニング & 仲間</h2><p>学びたいことから選ぼう</p>';
 // Local vector symbols make each destination recognizable on iOS as well
 // as desktop. No fonts, animations or image downloads are required.
 const iconPaths={
  forest:'<path d="M3 20h18M5 20l4-8 3 5 3-8 5 11M5 9l4-6 4 6-3 0M16 12l3-6 3 6"/><path d="M9 20v-5M19 20v-5"/>',
  daily:'<path d="M12 3l-8 11h7l-1 7 10-12h-7l1-6Z"/>',
  training:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11a6 6 0 0012 0M12 17v4M8 21h8"/>',
  listening:'<path d="M4 14v-3a8 8 0 0116 0v3M4 13h3v7H5a2 2 0 01-2-2v-3a2 2 0 012-2Zm13 0h3a2 2 0 012 2v3a2 2 0 01-2 2h-2v-7Z"/>',
  review:'<path d="M12 6a9 9 0 00-9 9v6h17v-6a9 9 0 00-8-9ZM6 6l3-4h6l3 4"/><path d="M8 15h8M8 18h6"/>',
  challenge:'<circle cx="12" cy="13" r="9"/><path d="M12 13l4-4M12 13V6M9 2h6"/>',
  collection:'<path d="M6 10l6-6 6 6-2 10H8l-2-10Z"/><path d="M9 11l3 4 3-4M12 4v-2"/>',
  progress:'<path d="M3 21V11h4v10M10 21V6h4v15M17 21V3h4v18"/>',
  tutorial:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 116 0c0 2-3 2-3 4M12 17h.01"/>'
 };
 const grid=document.createElement('div');grid.className='home-navigation-grid';
 for(const item of buttons){
  const button=document.createElement('button');button.type='button';button.className='home-navigation-tile';button.dataset.homePage=item.id;
  const icon=document.createElement('span');icon.className='home-navigation-icon';icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[item.id]}</svg>`;icon.setAttribute('aria-hidden','true');
  const copy=document.createElement('span');copy.className='home-navigation-copy';
  const strong=document.createElement('strong');strong.textContent=item.title;
  const small=document.createElement('small');small.textContent=item.desc;
  copy.append(strong,small);
  const arrow=document.createElement('span');arrow.className='home-navigation-arrow';arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
  button.append(icon,copy,arrow);button.addEventListener('click',item.action);grid.append(button);
 }
 menu.append(head,feature,label,grid);home.prepend(menu);
 const dialog=document.createElement('div');dialog.className='tutorial-backdrop';dialog.id='monsters-tutorial';dialog.hidden=true;
 dialog.innerHTML='<div class="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-heading"><button type="button" id="tutorial-close" class="tutorial-close" aria-label="チュートリアルを閉じる">✕</button><p class="tiny-caps" id="tutorial-counter"></p><h2 id="tutorial-heading"></h2><p id="tutorial-description"></p><div class="tutorial-actions"><button type="button" id="tutorial-previous">戻る</button><button type="button" id="tutorial-next">次へ</button></div></div>';
 home.append(dialog);
 let step=0,lastFocused=null;
 const close=()=>{dialog.hidden=true;lastFocused?.focus?.({preventScroll:true});};
 function renderStep(){
  const record=STEPS[step];dialog.querySelector('#tutorial-counter').textContent=`STEP ${step+1} / ${STEPS.length}`;
  dialog.querySelector('#tutorial-heading').textContent=record.title;
  dialog.querySelector('#tutorial-description').textContent=record.body;
  dialog.querySelector('#tutorial-previous').disabled=step===0;
  dialog.querySelector('#tutorial-next').textContent=step===STEPS.length-1?'使ってみる':'次へ →';
 }
 function openTutorial(){lastFocused=document.activeElement;step=0;renderStep();dialog.hidden=false;dialog.querySelector('#tutorial-close').focus();}
 dialog.querySelector('#tutorial-close').addEventListener('click',close);
 dialog.querySelector('#tutorial-previous').addEventListener('click',()=>{if(step>0){step--;renderStep();}});
 dialog.querySelector('#tutorial-next').addEventListener('click',()=>{if(step===STEPS.length-1){close();showPage('forest');}else{step++;renderStep();}});
 dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();}
  if(event.key==='Tab'){
   const controls=[...dialog.querySelectorAll('button:not(:disabled)')];
   if(!controls.length)return;
   if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
   else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
  }
 });
 function showMenu(){dialog.hidden=true;menu.hidden=false;Object.values(sections).forEach(panel=>panel.hidden=true);window.scrollTo({top:0,behavior:'instant'});}
 function showPage(id){
  if(!sections[id])return;
  menu.hidden=true;Object.entries(sections).forEach(([name,panel])=>panel.hidden=name!==id);
  window.scrollTo({top:0,behavior:'instant'});
  sections[id].querySelector('.home-menu-back')?.focus({preventScroll:true});
 }
 showMenu();
 // Decorative companions never receive focus or pointer events; the entire
 // menu tile remains one large tap target. Only owned monsters are eligible.
 function updateWalkers(owned){
   for(const tile of grid.querySelectorAll('.home-navigation-tile'))
     tile.querySelectorAll('.home-walker').forEach(node=>node.remove());
   const positions=['forest','collection','daily'];
   owned.slice(0,3).forEach((entry,index)=>{
     const tile=grid.querySelector('[data-home-page="'+positions[index]+'"]');
     if(!tile||!entry?.art)return;
     const walker=document.createElement('span');
     walker.className='home-walker';walker.setAttribute('aria-hidden','true');
     walker.style.setProperty('--wander-duration',String(16+index*5)+'s');
     walker.style.setProperty('--wander-delay',String(-index*4)+'s');
     walker.innerHTML=entry.art;
     tile.append(walker);
   });
 }
 return {showMenu,showPage,openTutorial,updateWalkers,
   updateHero({art,name,level,mastered,due,xp,areasCleared=0,bondRank=0,cityUnlocked=false,cityCleared=false}){
     menu.querySelector('#home-menu-art').innerHTML=art;
     menu.querySelector('#home-menu-name').textContent=name;
     menu.querySelector('#home-menu-level').textContent='Lv.'+level+' · 絆 Lv.'+bondRank;
     menu.querySelector('#home-menu-mastered').textContent='練習できた表現 '+mastered;
     menu.querySelector('#home-menu-due').textContent='復習 '+due;
     menu.querySelector('#home-menu-xp').textContent=xp+' XP';
     menu.querySelector('#home-feature-progress').textContent=cityCleared?'森と会話の街を攻略！復習で英語を定着させよう':cityUnlocked?'森の4エリア攻略！次は「会話の街」へ':'森の冒険 '+areasCleared+' / 4エリア · 街は森の攻略後に解放';
   }
 };
}
