// Organize the prototype into clear destinations without cloning content or
// disrupting existing IDs/listeners. This is a navigation-only change.
// Keep long explanations here, where players deliberately ask for them. The
// dungeon itself only needs the current question, action and next threat.
const STEPS=Object.freeze([
 {chapter:'basic',title:'1. Englishダンジョンに挑戦',body:'ホームの「冒険をはじめる」を押すだけでスタート。森→雪の街→遺跡の全10エリアを、英語の問題とボス戦で攻略しよう。',
  scene:['冒険をはじめる','森の入口','問題に挑戦'],tips:['最初は「やさしい」がオススメ。','先に英語を覚えていなくても始められるよ。']},
 {chapter:'basic',title:'2. 聞く・選ぶ・話すは別々の問題',body:'リスニングとスピーキングは別の問題。画面のお題を見て、今必要な操作だけをしよう。',
  scene:['リスニング','音声を再生','意味を選ぶ'],tips:['単語・文法は選択問題で確認するよ。','リスニングのあとに同じ英文を話す必要はないよ。']},
 {chapter:'basic',title:'3. iPhoneでマイクが使えないとき',body:'話す問題は文字入力でも挑戦できる。認識に失敗しただけで英語の不正解にはならないよ。',
  scene:['スピーキング','話す / 文字入力','回答を確認'],tips:['iPhoneでは「入力を開く」→英語キーボードのマイクで話してね。','自然な別表現は判定保留になることもあるよ。']},
 {chapter:'battle',title:'4. まず仲間を編成しよう',body:'仲間が増えたらホームの「仲間を編成して出発」から最大3体を選ぼう。先頭と控えの得意技能が違うと出撃HPが増え、育てると開幕必殺も強くなるよ。',
  scene:['出撃編成','先頭 1体 + 控え 2体','この編成で出発'],tips:['おすすめ編成で最初の敵の弱点に合わせられる。手動変更もOK。','出撃編成は次回の冒険にも保存される。戦闘中の交代は1戦に1回。']},
 {chapter:'battle',title:'5. 英語で攻撃しよう',body:'自分のターンは、4つから攻撃の種類を選ぼう。その種類の問題に正解すると仲間が自動で攻撃するよ。',
  scene:['問題の種類を選ぶ','問題に答える','正解 → 自動で攻撃'],tips:['攻撃の種類を選んでから問題が出るよ。出題後は種類を変更できない。','敵の弱点は敵の上に表示。正解すればダメージが増えるよ。']},
 {chapter:'battle',title:'6. 敵の反撃は問題で防ぐ',body:'敵が生き残ると反撃。予告された技能の問題に自力正解すれば、HPは減らないよ。',
  scene:['次の敵攻撃：文法','英語の問題に回答','正解 → ダメージ 0'],tips:['敵の攻撃を予告で確認して仲間を選ぼう。','音声認識エラーや判定保留だけではHPを減らさないよ。']},
 {chapter:'battle',title:'7. 連携・必殺技を使い分ける',body:'詳しい作戦は「戦術・仲間を変更する」を開けば使えるよ。ヒントなしで正解すると必殺ゲージがたまる。',
  scene:['必殺ゲージ','1 / 3 → 2 / 3 → 3 / 3','必殺技を使う'],tips:['必殺技は使うタイミングが大事。','ボスによって役立つ控えが違う。詳しい相性は攻略メモで見よう。']},
 {chapter:'growth',title:'8. 育成と武器で強くなろう',body:'冒険でXPをため、仲間を育てよう。Lv.4・7・10・13で攻撃力が上昇し、Lv.4で熟練技も覚えるよ。武器には英語の得意攻撃による追撃がある。',
  scene:['強敵やボスを倒す','武器をドロップ！','図鑑で装備する'],tips:['自力正解3問以上＋ボス撃破で章の武器を初回確定入手。再挑戦ではレアも狙えるよ。','5体目の強敵は自力攻撃2回以上で限定装備が18%の確率で落ちる。ボスの封印は英語3問のままだよ。']},
 {chapter:'growth',title:'9. 狙う仲間と連勝宝箱',body:'ホームで次に欲しい仲間を選ぼう。獲得条件が少しずつ進むのを確認できるよ。各エリアで3・5・8 CHAINに初めて到達すると宝箱から育成XPと召喚用ゴールドを獲得。',
  scene:['モンスターハント','狙う仲間を選ぶ','3 CHAIN → 宝箱'],tips:['仲間のレア度が高いと、別の日の復習や複数エリアのボス攻略も必要。','宝箱はエリアごとに1回だけ。ヒントなしの連続成功が条件だよ。']},
 {chapter:'growth',title:'10. 間違いは復習につなげよう',body:'問題のあとで解説を読もう。「問題を保存」から後日やり直すと、使える英語として定着していくよ。',
  scene:['学習の記録','間違い・保存した問題','復習に挑戦'],tips:['ヒントは使ってOK。ただし自力正解とは区別して記録。','毎日長く遊ぶ必要はないよ。少しずつ続けよう。']}
]);
export function setupHomeNavigation({home,startMode,showCollection,onHuntTarget}){
 const sections={
  daily:document.createElement('section'),
  roleplay:document.createElement('section'),
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
 move('.roleplay-hub','roleplay');
 move('.saved-review','review');
 move('.retention-hub','review');
 move('.hero-grid','training');
 move('.review-journal','review');
 move('.section-head','progress');
 move('.stat-grid','progress');
 move('.skill-growth','progress');
 move('.notice-card','progress');
 const buttons=[
  {id:'forest',icon:'02',title:'Englishダンジョン',desc:'次のエリアを攻略して仲間と成長',action:()=>showPage('forest')},
  {id:'daily',icon:'01',title:'今日の5分ジム',desc:'8問でサクッと英語トレーニング',action:()=>showPage('daily')},
  {id:'roleplay',icon:'11',title:'3ターン実践会話',desc:'お店や駅で相手と英語をやり取り',action:()=>showPage('roleplay')},
  {id:'training',icon:'03',title:'スピーキング道場',desc:'英語で伝える力を鍛えよう',action:()=>showPage('training')},
  {id:'listening',icon:'09',title:'リスニング道場',desc:'聞いて意味を理解する問題だけ',action:()=>startMode('listening')},
  {id:'review',icon:'04',title:'復習する',desc:'保存した問題と苦手を解き直す',action:()=>showPage('review')},
  {id:'challenge',icon:'05',title:'60秒チャレンジ',desc:'瞬発力を鍛える短時間練習',action:()=>startMode('challenge')},
  {id:'collection',icon:'06',title:'なかま・図鑑',desc:'仲間と冒険の記録を確認',action:showCollection},
  {id:'progress',icon:'07',title:'学習記録',desc:'復習や定着度を確認する',action:()=>showPage('progress')},
  {id:'save',icon:'10',title:'セーブの引き継ぎ',desc:'進化や学習記録を別のURLへ移す',action:()=>{showPage('training');const transfer=document.querySelector('#save-transfer');transfer.open=true;transfer.scrollIntoView({block:'start',behavior:'instant'});}},
  {id:'tutorial',icon:'08',title:'遊び方ガイド',desc:'英語の問題・戦闘・育成を図解で確認',action:openTutorial}
 ];
 const menu=document.createElement('section');
 menu.className='home-navigation';menu.id='home-navigation';
 const head=document.createElement('div');head.className='home-navigation-head';
 head.innerHTML='<span class="tiny-caps">ADVENTURE BASE · 冒険の拠点</span><h1><span class="home-title-phrase">英語で戦って、</span><em class="home-title-phrase">仲間と冒険へ。</em></h1><p>知っている英語を、話せる英語に。仲間を育てて、まだ見ぬ世界へ。</p>';
 const chapter=document.createElement('div');chapter.className='home-chapter-status';
 chapter.innerHTML='<span class="home-chapter-label">CURRENT STORY <b id="home-chapter-counter">01 / 10</b></span><strong id="home-chapter-area">緑風の森</strong><div class="home-chapter-progress" role="meter" aria-label="攻略済みエリアの割合" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="home-chapter-progress"></span></div>';
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
 <button type="button" class="home-feature-cta" data-feature-dungeon>冒険をはじめる <span aria-hidden="true">›</span></button><button type="button" class="home-world-link home-formation-link" data-feature-formation hidden>仲間を編成して出発</button><button type="button" class="home-world-link home-armory-link" data-feature-armory>星の祭壇 · 武器召喚</button><button type="button" class="home-world-link" data-feature-worlds>エリア・出撃設定</button><button type="button" id="home-feature-practice" class="home-feature-practice">初めてなら約1分の操作練習</button><p class="home-feature-progress" id="home-feature-progress">森の入口から冒険開始</p></div>
 <div class="home-feature-companion"><div id="home-menu-art" aria-hidden="true"></div><strong id="home-menu-name">Yolkie</strong><small id="home-menu-level">Lv.1 · 今日も一緒に</small></div>`;
 feature.querySelector('[data-feature-dungeon]').addEventListener('click',()=>startMode('forest'));
 feature.querySelector('[data-feature-formation]').addEventListener('click',()=>startMode('forest-formation'));
 feature.querySelector('[data-feature-armory]').addEventListener('click',()=>startMode('armory'));
 feature.querySelector('[data-feature-worlds]').addEventListener('click',()=>showPage('forest'));
 feature.querySelector('#home-feature-practice').addEventListener('click',()=>startPracticeBattle());
 const quest=document.createElement('section');quest.className='home-next-quest';quest.id='home-next-quest';quest.setAttribute('aria-labelledby','home-next-quest-title');
 quest.innerHTML='<div class="home-next-quest-copy"><span class="home-next-quest-kicker">YOUR NEXT QUEST · 今日のおすすめ</span><h2 id="home-next-quest-title">今日の英語を練習しよう</h2><p id="home-next-quest-detail">学習記録に合わせて、次の練習を案内するよ。</p><button type="button" id="home-learning-proof" hidden>日を空けた学習記録を見る</button></div><button type="button" id="home-next-quest-button">練習を始める</button>';
 const hunt=document.createElement('section');hunt.className='home-monster-hunt';hunt.id='home-monster-hunt';hunt.hidden=true;
 hunt.setAttribute('aria-label','モンスターハントと連勝宝箱');
 hunt.innerHTML='<div class="hunt-heading"><span class="home-next-quest-kicker">MONSTER HUNT · 次に仲間にしたいのは？</span><span id="hunt-collection-count"></span></div><div class="hunt-main"><div class="hunt-silhouette" aria-hidden="true"><span>?</span></div><div class="hunt-content"><label for="hunt-target-select">狙うモンスター</label><select id="hunt-target-select" aria-label="狙うモンスターを選ぶ"></select><div class="hunt-meter" role="progressbar" aria-label="仲間にする条件の達成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="hunt-meter-fill"></span></div><ul id="hunt-requirements"></ul></div></div><div class="hunt-footer"><span id="hunt-next-chest"></span><button type="button" id="hunt-go-battle">続きを冒険する →</button></div>';
 hunt.querySelector('#hunt-target-select').addEventListener('change',event=>onHuntTarget?.(event.target.value));
 hunt.querySelector('#hunt-go-battle').addEventListener('click',()=>startMode('forest'));
 let questAction='daily',hasPlayed=false;
 quest.querySelector('#home-next-quest-button').addEventListener('click',()=>startMode(questAction));
 quest.querySelector('#home-learning-proof').addEventListener('click',()=>showPage('review'));
 const label=document.createElement('div');label.className='home-navigation-label';label.innerHTML='<h2>冒険メニュー</h2><p>QUEST BOARD</p>';
 // Local vector symbols make each destination recognizable on iOS as well
 // as desktop. No fonts, animations or image downloads are required.
 const iconPaths={
  forest:'<path d="M3 20h18M5 20l4-8 3 5 3-8 5 11M5 9l4-6 4 6-3 0M16 12l3-6 3 6"/><path d="M9 20v-5M19 20v-5"/>',
  daily:'<path d="M12 3l-8 11h7l-1 7 10-12h-7l1-6Z"/>',
  roleplay:'<path d="M4 5h13a3 3 0 013 3v7a3 3 0 01-3 3H9l-5 3v-6a3 3 0 01-2-3V8a3 3 0 012-3Z"/><path d="M7 10h9M7 14h6"/>',
  training:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11a6 6 0 0012 0M12 17v4M8 21h8"/>',
  listening:'<path d="M4 14v-3a8 8 0 0116 0v3M4 13h3v7H5a2 2 0 01-2-2v-3a2 2 0 012-2Zm13 0h3a2 2 0 012 2v3a2 2 0 01-2 2h-2v-7Z"/>',
  review:'<path d="M12 6a9 9 0 00-9 9v6h17v-6a9 9 0 00-8-9ZM6 6l3-4h6l3 4"/><path d="M8 15h8M8 18h6"/>',
  challenge:'<circle cx="12" cy="13" r="9"/><path d="M12 13l4-4M12 13V6M9 2h6"/>',
  collection:'<path d="M6 10l6-6 6 6-2 10H8l-2-10Z"/><path d="M9 11l3 4 3-4M12 4v-2"/>',
  progress:'<path d="M3 21V11h4v10M10 21V6h4v15M17 21V3h4v18"/>',
  save:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9zM8 11h8M8 15h8"/>',
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
  (['daily','roleplay','review','collection'].includes(item.id)?grid:extraGrid).append(button);
 }
 extra.append(extraGrid,motionToggle);
 menu.append(head,chapter,feature,quest,hunt,label,grid,extra);home.prepend(menu);
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
  dialog.querySelector('#tutorial-next').textContent=step===STEPS.length-1?(fromGame?'バトルへ戻る':'冒険を選ぶ'):'次へ →';
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
 practice.innerHTML='<section class="practice-battle-dialog" role="dialog" aria-modal="true" aria-labelledby="practice-battle-title"><button type="button" class="practice-battle-close" id="practice-battle-close" aria-label="練習をやめる">閉じる</button><p class="practice-battle-progress" id="practice-battle-progress"></p><h2 id="practice-battle-title">はじめてのバトル</h2><div class="practice-battle-arena" aria-label="練習バトルのHP"><span>なかま <b id="practice-ally-hp">HP 4/4</b></span><span class="practice-battle-foe" aria-hidden="true"></span><span>敵 <b id="practice-enemy-hp">HP 2/2</b></span></div><p id="practice-battle-prompt"></p><div class="practice-battle-actions" id="practice-battle-actions"></div><p class="practice-battle-feedback" id="practice-battle-feedback" role="status" aria-live="polite"></p><p class="practice-battle-no-reward">練習バトルです。XPや仲間の記録は変わりません。</p></section>';
 document.body.append(practice);
 let practiceStage=0,practiceMessage='',practiceReturnFocus=null,practiceFromGame=false,practiceReturnToTutorial=false;
 const practiceQuestions=[
  {type:'choose',title:'1. 攻撃タイプを選ぼう',prompt:'敵の弱点は「単語」！ 4種類の攻撃から「単語」を選ぼう。問題は選んだあとに出るよ。',options:[['speak','スピーキング'],['listen','リスニング'],['vocab','単語（敵の弱点）'],['grammar','文法']],answer:'vocab',success:'単語を選んだので、単語の問題が出たよ。'},
  {type:'answer',title:'2. 英語で攻撃！',prompt:'「確認する」という意味の英単語はどれ？',options:[['confirm','confirm'],['forget','forget'],['invite','invite']],answer:'confirm',success:'正解！ 単語で攻撃して敵のHPが1減ったよ。'},
  {type:'answer',title:'3. 敵のターン・文法で防御',prompt:'敵が「文法」で攻撃！「I ___ happy.」に入る単語は？ 敵の問題は変更できないよ。',options:[['am','am'],['is','is']],answer:'am',success:'正解！ 敵の攻撃を防いだので、味方HPは減らなかったよ。'},
  {type:'choose',title:'4. もう一度攻撃を選ぼう',prompt:'あなたのターンに戻った！ 今度は「スピーキング」で攻撃しよう。',options:[['speak','スピーキング'],['listen','リスニング'],['vocab','単語'],['grammar','文法']],answer:'speak',success:'スピーキングを選んだね。本番では話すか文字で入力するよ。'},
  {type:'answer',title:'5. スピーキングでとどめ',prompt:'「ありがとう」を英語で伝えるなら？（練習は選択式。本番はマイク・文字入力）',options:[['thanks','Thank you.'],['sorry','I am sorry.']],answer:'thanks',success:'正解！ 最後の攻撃で敵を倒したよ。'},
 ];
 let practiceHp=4;
 const practiceMissedChoices=new Map();
 const resetPractice=()=>{practiceStage=0;practiceMessage='';practiceHp=4;practiceMissedChoices.clear();};
 const closePractice=({resumeGuide=true}={})=>{
  practice.hidden=true;
  if(resumeGuide&&practiceReturnToTutorial){
   dialog.hidden=false;
   dialog.querySelector('#tutorial-try-battle').focus({preventScroll:true});
  }else if(practiceReturnToTutorial){
   (practiceFromGame?document.querySelector('#open-battle-guide'):document.querySelector('[data-feature-dungeon]'))?.focus({preventScroll:true});
  }else practiceReturnFocus?.focus?.({preventScroll:true});
  practiceReturnToTutorial=false;
 };
 function renderPractice(){
  const done=practiceStage>=practiceQuestions.length;
  const current=practiceQuestions[practiceStage];
  practice.querySelector('#practice-battle-progress').textContent=done?'練習クリア':`練習 ${practiceStage+1} / ${practiceQuestions.length}`;
  practice.querySelector('#practice-battle-title').textContent=done?'練習バトル、クリア！':current.title;
  practice.querySelector('#practice-battle-prompt').textContent=done?(practiceFromGame?'練習は完了！ 元の画面に戻ろう。':'攻撃タイプを選ぶ → 問題に答える → 敵の反撃を防ぐ。これが本編の流れだよ！'):current.prompt;
  practice.querySelector('#practice-ally-hp').textContent=`HP ${practiceHp}/4`;
  practice.querySelector('#practice-enemy-hp').textContent=`HP ${done?0:practiceStage>=2?1:2}/2`;
  practice.querySelector('#practice-battle-feedback').textContent=practiceMessage;
  const attempted=practiceMissedChoices.get(practiceStage)||new Set();
  practice.querySelector('#practice-battle-actions').innerHTML=done?`<button type="button" data-practice-action="begin" class="practice-battle-main">${practiceFromGame?'戦闘へ戻る':'本編の冒険を始める'}</button><button type="button" data-practice-action="again">もう一度練習する</button>`:
   current.options.map(([id,label])=>`<button type="button" data-practice-action="${id}" ${attempted.has(id)?'disabled aria-disabled="true"':''}>${label}${attempted.has(id)?'（選択済み）':''}</button>`).join('');
  practice.querySelectorAll('[data-practice-action]').forEach(button=>button.addEventListener('click',()=>{
   const action=button.dataset.practiceAction;
   if(action==='begin'){closePractice({resumeGuide:false});if(!practiceFromGame)startMode('forest');return;}
   if(action==='again'){resetPractice();renderPractice();return;}
   if(action!==current.answer){
    if(current.type==='choose'){
     practiceMessage='その種類でも攻撃できるけど、今回は案内された種類を選んでみよう。';
    }else if(!attempted.has(action)){
     attempted.add(action);
     practiceMissedChoices.set(practiceStage,attempted);
     const healthBefore=practiceHp;
     practiceHp=Math.max(1,practiceHp-1);
     practiceMessage=healthBefore===1?'不正解！ 本編では別の間違いごとに反撃されるよ。操作練習はHP1で続けられるよ。':'不正解！ 敵の反撃でHP−1。間違えた選択肢は選べなくなるので、ほかの答えを試してみよう。';
    }
    renderPractice();return;
   }
   practiceMessage=current.success;practiceStage++;renderPractice();
  }));
  practice.querySelector('[data-practice-action]:not(:disabled)')?.focus({preventScroll:true});
 }
 function startPracticeBattle(){
  practiceReturnFocus=document.activeElement;
  practiceReturnToTutorial=!dialog.hidden;
  if(practiceReturnToTutorial)dialog.hidden=true;
  practiceFromGame=!document.querySelector('#play-view')?.hidden;
  resetPractice();
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
   updateQuest(next,proof=null){
     if(!next)return;
     // The first visit has ONE clear call to action: enter the adventure.
     // Personal recommendations become useful only after an actual attempt.
     quest.hidden=!hasPlayed;
     quest.dataset.questKind=next.kind;
     questAction=next.action;
     quest.querySelector('#home-next-quest-title').textContent=next.title;
     quest.querySelector('#home-next-quest-detail').textContent=next.detail;
     quest.querySelector('#home-next-quest-button').textContent=next.button+' →';
     const proofButton=quest.querySelector('#home-learning-proof');
     proofButton.hidden=!proof;
     if(proof)proofButton.textContent=proof.label;
   },
   updateHero({art,name,level,mastered,due,xp,ownedCount=1,hasAttempted=false,areasCleared=0,cityAreasCleared=0,ruinsAreasCleared=0,totalAreas=10,nextAreaName='森の入口',bondRank=0,summon=null}){
     const cleared=areasCleared+cityAreasCleared+ruinsAreasCleared;
     const allCleared=totalAreas>0&&cleared===totalAreas;
     chapter.querySelector('#home-chapter-counter').textContent=String(Math.min(cleared+1,totalAreas)).padStart(2,'0')+' / '+totalAreas;
     chapter.querySelector('#home-chapter-area').textContent=allCleared?'全エリア攻略！':nextAreaName;
     chapter.querySelector('#home-chapter-progress').style.width=(totalAreas?Math.round(cleared/totalAreas*100):0)+'%';
     chapter.querySelector('.home-chapter-progress').setAttribute('aria-valuenow',String(totalAreas?Math.round(cleared/totalAreas*100):0));
     hasPlayed=hasAttempted||cleared>0;
     quest.hidden=!hasPlayed;
     hunt.hidden=!hasPlayed;
     menu.querySelector('#home-menu-art').innerHTML=art;
     menu.querySelector('#home-menu-name').textContent=name;
     menu.querySelector('#home-menu-level').textContent='Lv.'+level+' · 絆 Lv.'+bondRank;
     menu.querySelector('#home-menu-mastered').textContent='練習できた表現 '+mastered;
     menu.querySelector('#home-menu-due').textContent='復習 '+due;
     menu.querySelector('#home-menu-xp').textContent=xp+' XP';
     menu.querySelector('[data-feature-dungeon]').firstChild.textContent=allCleared?'もう一度冒険 ':cleared?'つづきから冒険 ':'冒険をはじめる ';
     menu.querySelector('[data-feature-formation]').hidden=ownedCount<2;
     const armory=menu.querySelector('[data-feature-armory]');
     if(summon){
       armory.textContent=summon.readyNow?'星の祭壇 · 召喚できる！':summon.readyAfterSale?'星の祭壇 · お宝を売れば召喚！':`星の祭壇 · あと${summon.missing} Gで召喚`;
       armory.dataset.summonReady=String(summon.readyNow||summon.readyAfterSale);
     }
     menu.querySelector('#home-feature-practice').hidden=cleared>0;
     menu.querySelector('#home-feature-progress').textContent=allCleared?`全${totalAreas}エリア攻略！好きな場所で遊ぼう`:
       hasPlayed?`${cleared}/${totalAreas} エリア攻略 · 次は「${nextAreaName}」`:
       `最初の目的地「${nextAreaName}」 · ボス撃破を目指そう`;
   },
   updateHunt(board,chest,areaName,treasures,totalTreasures){
     hunt.querySelector('#hunt-collection-count').textContent=`図鑑 ${board.ownedCount}/${board.totalCount} · 宝箱 ${treasures}/${totalTreasures}`;
     const picker=hunt.querySelector('#hunt-target-select');
     picker.replaceChildren(...board.options.map(entry=>{
       const item=document.createElement('option');item.value=entry.id;
       item.textContent=`No.${String(entry.catalogNo).padStart(2,'0')} · ？？？ · 発見まで ${entry.percent}%`;
       return item;
     }));
     picker.disabled=!board.selected;
     picker.hidden=!board.selected;
     hunt.querySelector('.hunt-silhouette').hidden=!board.selected;
     const reqs=hunt.querySelector('#hunt-requirements');
     const meter=hunt.querySelector('.hunt-meter');
     if(board.selected){
       picker.value=board.selected.id;
       meter.hidden=false;meter.setAttribute('aria-valuenow',String(board.selected.percent));
       hunt.querySelector('#hunt-meter-fill').style.width=board.selected.percent+'%';
       reqs.replaceChildren(...board.selected.gates.map(gate=>{
         const item=document.createElement('li');item.className=gate.remaining?'hunt-pending':'hunt-cleared';
         item.textContent=`${gate.remaining?'○':'✓'} ${gate.label} ${Math.min(gate.current,gate.required)}/${gate.required}`;
         return item;
       }));
       hunt.querySelector('#hunt-go-battle').hidden=false;
     }else{
       reqs.replaceChildren();meter.hidden=true;
       const item=document.createElement('li');item.textContent='全モンスターを仲間にした！ 図鑑コンプリート！';reqs.append(item);
       hunt.querySelector('#hunt-go-battle').hidden=true;
     }
     hunt.querySelector('#hunt-next-chest').textContent=chest
       ?`${areaName}の宝箱：${chest.chain} CHAIN · 初回＋${chest.xp} XP / ＋${chest.gold} G`
       :`「${areaName}」の連勝宝箱コンプリート！ 別のエリアにも挑戦しよう`;
   }
 };
}
