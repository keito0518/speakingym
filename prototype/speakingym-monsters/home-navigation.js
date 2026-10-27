// Organize the prototype into clear destinations without cloning content or
// disrupting existing IDs/listeners. This is a navigation-only change.
const STEPS=Object.freeze([
 {title:'1. 今日の5分ジムから始めよう',body:'最初は短い8問。復習・新しい表現・別場面での応用が組み合わさるよ。時間制限はなく、解説は自分で「次へ」を押すまで残る。'},
 {title:'2. リスニングとスピーキングは別々',body:'リスニングは音声を聞いて意味を選ぶだけでクリア。話す問題は独立しているよ。聞き終わったあとマイクを使う必要はないから、安心して挑戦してね。'},
 {title:'3. 話す問題でマイクが動かないとき',body:'スピーキングではSafariで試すか、iPhone標準キーボードのマイクから英文を入力できるよ。声が文字にならないだけで英語の成績を下げることはないよ。'},
 {title:'4. 解説を読んで問題を保存',body:'答えたあとに「なぜそうなるか」を確認。「☆ 問題を保存」を押すと、復習から同じ問題を解き直せる。間違えた問題は復習候補にもなるよ。'},
 {title:'5. 森と図鑑は、自分のペースで',body:'ゲームを楽しみたいときは「はじまりの森」。仲間を育てたり英語の成長を確認したりするなら「なかま・図鑑」「学習記録」を開こう。'}
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
 move('.hero-grid','training');
 move('.review-journal','review');
 move('.section-head','progress');
 move('.stat-grid','progress');
 move('.notice-card','progress');
 const buttons=[
  {id:'daily',icon:'01',title:'今日の5分ジム',desc:'まずは8問、短く続ける',action:()=>showPage('daily')},
  {id:'forest',icon:'02',title:'はじまりの森',desc:'英語を使いながら冒険する',action:()=>showPage('forest')},
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
 head.innerHTML='<span class="tiny-caps">YOUR ENGLISH ADVENTURE</span><h1>今日のひとことが、<em>冒険を進める。</em></h1><p>知っている英語を、話せる英語へ。相棒と一緒に、ちょっとずつ強くなろう。</p>';
 const feature=document.createElement('section');feature.className='home-feature';
 feature.innerHTML=`<div class="home-feature-sky" aria-hidden="true"><span class="home-moon"></span><span class="home-mountain mountain-back"></span><span class="home-mountain mountain-front"></span><span class="home-forest-line"></span></div>
 <div class="home-feature-content"><span class="home-feature-eyebrow">SPEAKINGYM MONSTERS · YOUR JOURNEY</span><h2>英語が使えるほど、<br>世界が広がる。</h2><p>今日のトレーニングをクリアして、仲間と次のステージへ。</p>
 <div class="home-feature-info"><span id="home-menu-mastered">練習できた表現 0</span><span id="home-menu-due">復習 0</span><span id="home-menu-xp">0 XP</span></div>
 <button type="button" class="home-feature-cta" data-feature-daily>今日の5分をスタート <span aria-hidden="true">›</span></button></div>
 <div class="home-feature-companion"><div id="home-menu-art" aria-hidden="true"></div><strong id="home-menu-name">Yolkie</strong><small id="home-menu-level">Lv.1 · 今日も一緒に</small></div>`;
 feature.querySelector('[data-feature-daily]').addEventListener('click',()=>showPage('daily'));
 const label=document.createElement('div');label.className='home-navigation-label';label.innerHTML='<h2>トレーニングを選ぶ</h2><p>目的に合わせて、自分のペースで</p>';
 const grid=document.createElement('div');grid.className='home-navigation-grid';
 for(const item of buttons){
  const button=document.createElement('button');button.type='button';button.className='home-navigation-tile';button.dataset.homePage=item.id;
  const icon=document.createElement('span');icon.className='home-navigation-icon';icon.textContent=item.icon;icon.setAttribute('aria-hidden','true');
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
 dialog.querySelector('#tutorial-next').addEventListener('click',()=>{if(step===STEPS.length-1){close();showPage('daily');}else{step++;renderStep();}});
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
 return {showMenu,showPage,openTutorial,
   updateHero({art,name,level,mastered,due,xp}){
     menu.querySelector('#home-menu-art').innerHTML=art;
     menu.querySelector('#home-menu-name').textContent=name;
     menu.querySelector('#home-menu-level').textContent='Lv.'+level+' · 今日も一緒に';
     menu.querySelector('#home-menu-mastered').textContent='練習できた表現 '+mastered;
     menu.querySelector('#home-menu-due').textContent='復習 '+due;
     menu.querySelector('#home-menu-xp').textContent=xp+' XP';
   }
 };
}
