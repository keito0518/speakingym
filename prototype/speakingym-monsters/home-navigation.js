// Organize the prototype into clear destinations without cloning content or
// disrupting existing IDs/listeners. This is a navigation-only change.
// Keep long explanations here, where players deliberately ask for them. The
// dungeon itself only needs the current question, action and next threat.
const STEPS=Object.freeze([
 {chapter:'basic',title:'1. Englishダンジョンに挑戦',body:'ホームの「冒険をはじめる」を押すだけでスタート。問題をクリアして敵を倒し、最後のボスを目指そう。',
  scene:['冒険をはじめる','森の入口','問題に挑戦'],tips:['最初は「やさしい」がオススメ。','先に英語を覚えていなくても始められるよ。']},
 {chapter:'basic',title:'2. 聞く・選ぶ・話すを順番に',body:'リスニングとスピーキングは別の問題。画面のお題を見て、今必要な操作だけをしよう。',
  scene:['リスニング','音声を再生','意味を選ぶ'],tips:['単語・文法は選択問題で確認するよ。','リスニングのあとに同じ英文を話す必要はないよ。']},
 {chapter:'basic',title:'3. iPhoneでマイクが使えないとき',body:'話す問題は文字入力でも挑戦できる。認識に失敗しただけで英語の不正解にはならないよ。',
  scene:['スピーキング','話す / 文字入力','回答を確認'],tips:['iPhoneならSafariやキーボードの音声入力も試してね。','自然な別表現は判定保留になることもあるよ。']},
 {chapter:'battle',title:'4. まず仲間を編成しよう',body:'戦略バトルでは、出撃前に最大3体を選べる。先頭の仲間と控えの得意技能が作戦のカギ。',
  scene:['出撃編成','先頭 1体 + 控え 2体','この編成で出発'],tips:['仲間カードをタップして追加・入れ替え。','戦闘中の手動交代は1戦に1回。HPは仲間ごとに違うよ。']},
 {chapter:'battle',title:'5. 英語で攻撃しよう',body:'自分のターンは、問題を選んで英語で答えるだけ。正解すると仲間が自動で攻撃するよ。',
  scene:['問題の種類を選ぶ','英語で答える','正解 → 自動で攻撃'],tips:['まずは表示された問題をそのまま解いてOK。','敵の弱点や耐性は「戦術・仲間を変更する」から確認できるよ。']},
 {chapter:'battle',title:'6. 敵の反撃は問題で防ぐ',body:'敵が生き残ると反撃。予告された技能の問題に自力正解すれば、HPは減らないよ。',
  scene:['次の敵攻撃：文法','英語の問題に回答','正解 → ダメージ 0'],tips:['敵の攻撃を予告で確認して仲間を選ぼう。','音声認識エラーや判定保留だけではHPを減らさないよ。']},
 {chapter:'battle',title:'7. 連携・必殺技を使い分ける',body:'詳しい作戦は「戦術・仲間を変更する」を開けば使えるよ。ヒントなしで正解すると必殺ゲージがたまる。',
  scene:['必殺ゲージ','1 / 3 → 2 / 3 → 3 / 3','必殺技を使う'],tips:['必殺技は使うタイミングが大事。','ボスによって役立つ控えが違う。詳しい相性は攻略メモで見よう。']},
 {chapter:'growth',title:'8. 仲間を育てて進化させよう',body:'冒険でXPをため、好きな仲間に分けて育成。レベル4では仲間固有の熟練技も解放されるよ。',
  scene:['仲間の図鑑','XPを使ってレベルアップ','進化・熟練技'],tips:['仲間の得意技能や固有能力はそれぞれ違うよ。','育てた仲間の組み合わせで攻略方法が変わる。']},
 {chapter:'growth',title:'9. 間違いは復習につなげよう',body:'問題のあとで解説を読もう。「問題を保存」から後日やり直すと、使える英語として定着していくよ。',
  scene:['学習の記録','間違い・保存した問題','復習に挑戦'],tips:['ヒントは使ってOK。ただし自力正解とは区別して記録。','毎日長く遊ぶ必要はないよ。少しずつ続けよう。']}
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
  {id:'tutorial',icon:'08',title:'遊び方ガイド',desc:'英語の問題・戦闘・育成を図解で確認',action:openTutorial}
 ];
 const menu=document.createElement('section');
 menu.className='home-navigation';menu.id='home-navigation';
 const head=document.createElement('div');head.className='home-navigation-head';
 head.innerHTML='<span class="tiny-caps">SPEAKINGYM MONSTERS</span><h1><span class="home-title-phrase">英語で戦って、</span><em class="home-title-phrase">仲間と冒険へ。</em></h1><p>問題に答えて敵を倒そう。仲間と一緒に強くなる英語RPG。</p>';
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
 <div class="home-feature-content"><span class="home-feature-eyebrow">MAIN ADVENTURE</span><h2>English<br>ダンジョン</h2><p>英語で攻撃して、ボスを倒せばクリア。<br>まずは森の入口から！</p>
 <div class="home-feature-info"><span id="home-menu-mastered">練習できた表現 0</span><span id="home-menu-due">復習 0</span><span id="home-menu-xp">0 XP</span></div>
 <button type="button" class="home-feature-cta" data-feature-dungeon>冒険をはじめる <span aria-hidden="true">›</span></button><button type="button" class="home-world-link" data-feature-worlds>ステージを選ぶ</button><button type="button" id="home-feature-practice" class="home-feature-practice">初めてなら30秒の操作練習</button><p class="home-feature-progress" id="home-feature-progress">森の入口から冒険開始</p></div>
 <div class="home-feature-companion"><div id="home-menu-art" aria-hidden="true"></div><strong id="home-menu-name">Yolkie</strong><small id="home-menu-level">Lv.1 · 今日も一緒に</small></div>`;
 feature.querySelector('[data-feature-dungeon]').addEventListener('click',()=>startMode('forest'));
 feature.querySelector('[data-feature-worlds]').addEventListener('click',()=>showPage('forest'));
 feature.querySelector('#home-feature-practice').addEventListener('click',()=>startPracticeBattle());
 const label=document.createElement('div');label.className='home-navigation-label';label.innerHTML='<h2>ほかにできること</h2><p>冒険以外はここから</p>';
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
 const grid=document.createElement('div');grid.className='home-navigation-grid home-main-actions';
 const extra=document.createElement('details');extra.className='home-extra-modes';extra.id='home-extra-modes';
 extra.innerHTML='<summary>ほかの練習・設定を見る</summary>';
 const extraGrid=document.createElement('div');extraGrid.className='home-navigation-grid home-extra-grid';
 for(const item of buttons){
  const button=document.createElement('button');button.type='button';button.className='home-navigation-tile';button.dataset.homePage=item.id;
  const icon=document.createElement('span');icon.className='home-navigation-icon';icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[item.id]}</svg>`;icon.setAttribute('aria-hidden','true');
  const copy=document.createElement('span');copy.className='home-navigation-copy';
  const strong=document.createElement('strong');strong.textContent=item.title;
  const small=document.createElement('small');small.textContent=item.desc;
  copy.append(strong,small);
  const arrow=document.createElement('span');arrow.className='home-navigation-arrow';arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
  button.append(icon,copy,arrow);button.addEventListener('click',item.action);
  (['daily','review','collection'].includes(item.id)?grid:extraGrid).append(button);
 }
 extra.append(extraGrid,motionToggle);
 menu.append(head,feature,label,grid,extra);home.prepend(menu);
 const dialog=document.createElement('div');dialog.className='tutorial-backdrop';dialog.id='monsters-tutorial';dialog.hidden=true;
 dialog.innerHTML='<div class="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-heading"><button type="button" id="tutorial-close" class="tutorial-close" aria-label="チュートリアルを閉じる">✕</button><p class="tiny-caps" id="tutorial-counter"></p><div class="tutorial-chapters" role="group" aria-label="ガイドの項目"><button type="button" data-tutorial-chapter="basic">基本操作</button><button type="button" data-tutorial-chapter="battle">戦略バトル</button><button type="button" data-tutorial-chapter="growth">育成・復習</button></div><div class="tutorial-step-progress" aria-hidden="true"><span id="tutorial-progress-fill"></span></div><h2 id="tutorial-heading"></h2><p id="tutorial-description"></p><div class="tutorial-scene" aria-label="画面操作の例"><span id="tutorial-scene-label"></span><strong id="tutorial-scene-main"></strong><span id="tutorial-scene-result"></span></div><ul id="tutorial-tips" class="tutorial-tips"></ul><button type="button" id="tutorial-try-battle" class="tutorial-try-battle">操作して覚える練習バトル</button><div class="tutorial-actions"><button type="button" id="tutorial-previous">戻る</button><button type="button" id="tutorial-next">次へ</button></div></div>';
 document.body.append(dialog);
 let step=0,lastFocused=null,fromGame=false;
 const close=()=>{dialog.hidden=true;lastFocused?.focus?.({preventScroll:true});};
 function renderStep(){
  const record=STEPS[step];dialog.querySelector('#tutorial-counter').textContent=`STEP ${step+1} / ${STEPS.length}`;
  dialog.querySelector('#tutorial-heading').textContent=record.title;
  dialog.querySelector('#tutorial-description').textContent=record.body;
  dialog.querySelector('#tutorial-scene-label').textContent=record.scene[0];
  dialog.querySelector('#tutorial-scene-main').textContent=record.scene[1];
  dialog.querySelector('#tutorial-scene-result').textContent=record.scene[2];
  dialog.querySelector('#tutorial-tips').replaceChildren(...record.tips.map(tip=>{const li=document.createElement('li');li.textContent=tip;return li;}));
  dialog.querySelector('#tutorial-progress-fill').style.width=`${100*(step+1)/STEPS.length}%`;
  dialog.querySelectorAll('[data-tutorial-chapter]').forEach(button=>{
   const selected=button.dataset.tutorialChapter===record.chapter;
   button.setAttribute('aria-pressed',String(selected));
  });
  dialog.querySelector('#tutorial-previous').disabled=step===0;
  dialog.querySelector('#tutorial-next').textContent=step===STEPS.length-1?'使ってみる':'次へ →';
 }
 function openTutorial(topic='basic'){
  lastFocused=document.activeElement;fromGame=!document.querySelector('#play-view')?.hidden;
  step=topic==='battle'?3:topic==='growth'?7:0;
  renderStep();dialog.hidden=false;dialog.querySelector('#tutorial-close').focus();
 }
 // Four real taps teach the flow without awards or changes to player saves.
 // This is a standalone, deterministic simulation, never the English grader.
 const practice=document.createElement('div');
 practice.id='monsters-practice-battle';practice.className='practice-battle-backdrop';practice.hidden=true;
 practice.innerHTML='<section class="practice-battle-dialog" role="dialog" aria-modal="true" aria-labelledby="practice-battle-title"><button type="button" class="practice-battle-close" id="practice-battle-close" aria-label="練習をやめる">閉じる</button><p class="practice-battle-progress" id="practice-battle-progress"></p><h2 id="practice-battle-title">はじめてのバトル</h2><div class="practice-battle-arena" aria-label="練習バトルのHP"><span>なかま <b id="practice-ally-hp">HP 3/3</b></span><span class="practice-battle-foe" aria-hidden="true"></span><span>敵 <b id="practice-enemy-hp">HP 2/2</b></span></div><p id="practice-battle-prompt"></p><div class="practice-battle-actions" id="practice-battle-actions"></div><p class="practice-battle-feedback" id="practice-battle-feedback" role="status" aria-live="polite"></p><p class="practice-battle-no-reward">練習バトルです。XPや仲間の記録は変わりません。</p></section>';
 document.body.append(practice);
 let practiceStage=0,practiceMessage='',practiceReturnFocus=null,practiceFromGame=false;
 const practiceQuestions=[
  {title:'1. 敵を見つけよう',prompt:'敵が出てきた！「こうげき」を押してみよう。',options:[['attack','こうげき'],['skill','必殺技（まだ使えない）']],answer:'attack',success:'よし！ 英語の問題に答えて敵を倒そう。'},
  {title:'2. 英語で攻撃！',prompt:'「少し待ってください」を英語で伝えるなら？',options:[['wait','Just a moment, please.'],['night','Good night.']],answer:'wait',success:'正解！ 攻撃が当たり、敵のHPが減ったよ。'},
  {title:'3. 次の問題に答えよう',prompt:'次は文法！「I ___ happy.」に入る単語は？',options:[['am','am'],['is','is']],answer:'am',success:'正解！ いろいろな英語の問題が出てくるよ。'},
  {title:'4. 最後のひと押し',prompt:'敵のHPは残り1！「ありがとう」を英語で伝えるなら？',options:[['thanks','Thank you.'],['sorry','I am sorry.']],answer:'thanks',success:'正解！ 最後の攻撃で敵を倒したよ。'},
 ];
 const closePractice=()=>{practice.hidden=true;practiceReturnFocus?.focus?.({preventScroll:true});};
 function renderPractice(){
  const done=practiceStage>=practiceQuestions.length;
  const current=practiceQuestions[practiceStage];
  practice.querySelector('#practice-battle-progress').textContent=done?'練習クリア':`練習 ${practiceStage+1} / ${practiceQuestions.length}`;
  practice.querySelector('#practice-battle-title').textContent=done?'練習バトル、クリア！':current.title;
  practice.querySelector('#practice-battle-prompt').textContent=done?(practiceFromGame?'練習は完了！ 元の画面に戻ろう。':'お題を読んで英語で答える。それだけで冒険は進むよ！'):current.prompt;
  practice.querySelector('#practice-ally-hp').textContent='HP 3/3';
  practice.querySelector('#practice-enemy-hp').textContent=`HP ${practiceStage>=practiceQuestions.length?0:practiceStage>=2?1:2}/2`;
  practice.querySelector('#practice-battle-feedback').textContent=practiceMessage;
  practice.querySelector('#practice-battle-actions').innerHTML=done?`<button type="button" data-practice-action="begin" class="practice-battle-main">${practiceFromGame?'戦闘へ戻る':'本編の冒険を始める'}</button><button type="button" data-practice-action="again">もう一度練習する</button>`:
   current.options.map(([id,label])=>`<button type="button" data-practice-action="${id}" ${id==='skill'?'disabled':''}>${label}</button>`).join('');
  practice.querySelectorAll('[data-practice-action]').forEach(button=>button.addEventListener('click',()=>{
   const action=button.dataset.practiceAction;
   if(action==='begin'){closePractice();if(!practiceFromGame)startMode('forest');return;}
   if(action==='again'){practiceStage=0;practiceMessage='';renderPractice();return;}
   if(action!==current.answer){practiceMessage='惜しい！ 問題を見て、もう一度選んでみよう。';renderPractice();return;}
   practiceMessage=current.success;practiceStage++;renderPractice();
  }));
  practice.querySelector('[data-practice-action]:not(:disabled)')?.focus({preventScroll:true});
 }
 function startPracticeBattle(){
  if(!dialog.hidden)close();
  practiceReturnFocus=document.activeElement;
  practiceFromGame=!document.querySelector('#play-view')?.hidden;
  practiceStage=0;practiceMessage='';
  practice.hidden=false;renderPractice();
 }
 practice.querySelector('#practice-battle-close').addEventListener('click',closePractice);
 practice.addEventListener('click',event=>{if(event.target===practice)closePractice();});
 practice.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closePractice();return;}
  if(event.key!=='Tab')return;
  const controls=[...practice.querySelectorAll('button:not(:disabled)')];
  if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
  if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
 });
 dialog.querySelector('#tutorial-try-battle').addEventListener('click',startPracticeBattle);
 dialog.querySelector('#tutorial-close').addEventListener('click',close);
 dialog.querySelector('#tutorial-previous').addEventListener('click',()=>{if(step>0){step--;renderStep();}});
 dialog.querySelector('#tutorial-next').addEventListener('click',()=>{if(step===STEPS.length-1){close();if(!fromGame)showPage('forest');}else{step++;renderStep();}});
 dialog.querySelectorAll('[data-tutorial-chapter]').forEach(button=>button.addEventListener('click',()=>{
  step=button.dataset.tutorialChapter==='battle'?3:button.dataset.tutorialChapter==='growth'?7:0;renderStep();
 }));
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
   const positions=['daily','collection','review'];
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
 return {showMenu,showPage,openTutorial,startPracticeBattle,updateWalkers,
   updateHero({art,name,level,mastered,due,xp,areasCleared=0,bondRank=0,cityUnlocked=false,cityCleared=false}){
     menu.querySelector('#home-menu-art').innerHTML=art;
     menu.querySelector('#home-menu-name').textContent=name;
     menu.querySelector('#home-menu-level').textContent='Lv.'+level+' · 絆 Lv.'+bondRank;
     menu.querySelector('#home-menu-mastered').textContent='練習できた表現 '+mastered;
     menu.querySelector('#home-menu-due').textContent='復習 '+due;
     menu.querySelector('#home-menu-xp').textContent=xp+' XP';
     menu.querySelector('[data-feature-dungeon]').firstChild.textContent=cityCleared?'もう一度冒険 ':areasCleared?'つづきから冒険 ':'冒険をはじめる ';
     menu.querySelector('#home-feature-practice').hidden=areasCleared>0;
     menu.querySelector('#home-feature-progress').textContent=cityCleared?'全エリア攻略！好きな場所で遊ぼう':cityUnlocked?'次は雪灯りの街へ！':'森の攻略 '+areasCleared+' / 4';
   }
 };
}
