import { MONSTERS, PHRASES, PROMPTS } from './monster-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, chooseDifficulty, createSave, dayKey, finishRound, getMonsterProgress, learningSummary, recordAnswer, flagUncertainReview, selectRoundPrompts, validateSave } from './monster-engine.js';
import { monsterArt } from './monster-art.js';
import { gradeLocalResponse } from './monster-grader.js';
import { STAGING_SEMANTIC_GRADER_ENDPOINT, askSemanticGrader } from './semantic-client.js';
import { cleanForest, FOREST_ROUTES, FOREST_RELICS, finishForest } from './forest-engine.js';
import { forestWorldArt } from './forest-world.js';
import { buildForestWave, DIFFICULTY_TRIES, opponentFor, FOREST_WAVE_LENGTH, REGULAR_ENCOUNTERS, BOSS_HITS, specialStrike } from './forest-battle.js';
import { enemyArt } from './forest-enemies.js';
import { battleArenaArt, guardArt, relicArt } from './game-visuals.js';
import { createCollectionViews } from './monster-collection.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const phraseFor = id => PHRASES.find(phrase => phrase.id === id);
const monsterFor = id => MONSTERS.find(monster => monster.id === id);
const difficultyCopy = {
  easy: { label: 'やさしい', description: '日本語の状況を読んで、英語で答える。' },
  normal: { label: 'ふつう', description: '英語の状況と指示を読み、英語で答える。' },
  hard: { label: 'むずかしい', description: '長めの英文を読み、複数の条件を満たして英語で答える。' }
};
let save = loadSave() || createSave();
let play = null, timer = null, recognition = null, recognitionWatchdog = null;

function loadSave() {
  try { return validateSave(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
  catch { return null; }
}
function persist(next = save) {
  save = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); $('#save-note').textContent = '学習記録はこの端末に保存されます'; }
  catch { $('#save-note').textContent = '保存できない環境です。このタブを閉じると進捗が消えます'; }
}
function micView(mode='ready') {
  const button=$('#mic-button'), retry=$('#retry-mic');
  if(button){
    button.classList.toggle('active',mode==='listening');
    button.setAttribute('aria-pressed',String(mode==='listening'));
    button.innerHTML=mode==='listening'?'<span class="mic-glyph mic-glyph-stop" aria-hidden="true"></span><span>停止</span>':'<span class="mic-glyph mic-glyph-talk" aria-hidden="true"></span><span>話す</span>';
    button.title=mode==='listening'?'録音を停止する':'マイクで話す';
    button.setAttribute('aria-label',mode==='listening'?'録音を停止する':'マイクで話す');
    button.hidden=mode==='done';
    button.disabled=mode==='done';
  }
  if(retry) retry.hidden=mode!=='captured';
}
function stopRecognition(mode='ready') {
  if(recognitionWatchdog)clearTimeout(recognitionWatchdog);
  recognitionWatchdog=null;
  const active=recognition;
  recognition=null; // Disarm callbacks before abort: Safari fires onend asynchronously.
  if(active)try{active.abort();}catch{}
  if(mode==='done')$('#spoken-answer')?.classList.remove('transcript-interim');
  micView(mode);
}
function stopAudio() {
  stopRecognition('done');
  try { window.speechSynthesis?.cancel(); } catch {}
}
function clearTimer() { if (timer) clearInterval(timer); timer = null; }
function showView(name) {
  for (const id of ['home','play','result','collection','detail','training']) $(`#${id}-view`).hidden = id !== name;
  stopAudio();
  const heading = $(`#${name}-view h1`);
  if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  window.scrollTo({top:0,behavior:'instant'});
}
function renderDifficulty() {
  $$('[data-difficulty]').forEach(button => {
    const active = button.dataset.difficulty === save.difficulty;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#difficulty-description').textContent = difficultyCopy[save.difficulty].description;
}
function renderHome() {
  const creature = monsterFor(save.selectedMonster), growth = getMonsterProgress(save), summary = learningSummary(save);
  $('#hero-monster-art').innerHTML = monsterArt(creature.id,growth.evolved);
  $('#hero-monster-name').textContent = (growth.evolved ? creature.evolvedName : creature.name) + (growth.evolved ? ' / 進化済み' : '');
  $('#hero-monster-species').textContent = `${creature.japaneseName} · ${creature.roots.map(root=>root.word).join(' + ')}`;
  $('#hero-level').textContent = `Lv.${growth.level}`;
  $('#hero-xp-fill').style.width = `${100 - growth.toNextLevel / XP_PER_LEVEL * 100}%`;
  $('#hero-next-level').textContent = growth.evolved ? `進化済み · あと${growth.toNextLevel} XPで次のレベル` : `あと${growth.toNextLevel} XPでレベルアップ · 160 XPで進化`;
  $('#home-wallet').textContent = save.xpWallet;
  const forest=cleanForest(save.forest);
  $('#forest-home-progress').textContent = forest.clears ? `討伐 ${forest.clears}回 · 宝物 ${forest.relics.length}個 · 最長 ${forest.bestWave||0}W` : 'まだ未踏の森';
  $('#stat-independent').innerHTML = `${summary.independent}<span> / ${summary.total}</span>`;
  $('#stat-review').textContent = summary.reviewCount;
  $('#stat-monsters').innerHTML = `${save.ownedMonsters.length}<span> / ${MONSTERS.length}</span>`;
  $('#hero-vocab').innerHTML = creature.roots.map(root=>`<span class="vocab-chip"><strong>${escapeHtml(root.word)}</strong> <span>${escapeHtml(root.meaning)}</span></span>`).join('');
  renderDifficulty();
  showView('home');
}
function dueForestPhrases(){
  const today=dayKey();
  return PHRASES.filter(phrase=>{
    const item=save.progress?.[phrase.id];
    return (item?.nextReviewDay && item.nextReviewDay<=today) ||
      Object.entries(save.reviewPrompts||{}).some(([id,due])=>due<=today &&
        ALL_PROMPTS.find(prompt=>prompt.id===id)?.phraseId===phrase.id);
  }).map(phrase=>phrase.id);
}
function dueForestPromptIds(){
  const today=dayKey();
  return Object.entries(save.reviewPrompts||{}).filter(([,due])=>due<=today).map(([id])=>id);
}
function startSession(mode) {
  clearTimer(); stopAudio();
  const difficulty=save.difficulty;
  const endless=mode==='forest-endless',forestMode=mode==='forest'||endless;
  const promptCount=mode==='challenge'?{easy:6,normal:4,hard:3}[difficulty]:3;
  const firstWave=forestMode?buildForestWave({difficulty,wave:1,reviewPhraseIds:dueForestPhrases(),reviewPromptIds:dueForestPromptIds()}):null;
  const prompts=forestMode?firstWave.prompts:selectRoundPrompts(save,promptCount,Math.random,dayKey(),difficulty);
  play={mode:forestMode?'forest':mode,endless,baseDifficulty:difficulty,difficulty:firstWave?.level||difficulty,
    prompts,index:0,wave:1,seenIds:[],remainingTries:0,encounterKey:null,
    bossHits:0,usedPower:false,usedShield:false,forestRelics:[],smooth:0,earnedXp:0,captured:[],hintUsed:false,
    revealed:false,speechState:'',startedAt:Date.now(),deadline:mode==='challenge'?Date.now()+60000:null,
    route:null,companionId:save.selectedMonster};
  $('#play-mode-label').textContent=`${forestMode?(endless?'∞ 森のエンドレス':'森のボス討伐'):mode==='challenge'?'60秒チャレンジ':'練習モード'} · ${difficultyCopy[difficulty].label}`;
  $('#forest-journey').hidden=!forestMode;
  $('#forest-battle-log').hidden=!forestMode;
  $('#play-view').classList.toggle('forest-active',forestMode);
  if(forestMode){
    $('#forest-journey').classList.remove('forest-victory');
    $('#forest-world-stage').dataset.route='wild';
    $('#forest-world-stage').dataset.renderedRoute='';
  }
  showView('play');
  if(forestMode)showForestExplore(false);
  else renderQuestion();
  if (mode === 'challenge') timer = setInterval(updateClock,200);
  updateClock();
}
function updateClock() {
  if (!play) return;
  const clock=$('#play-clock');
  if (!play.deadline) { clock.textContent='自分のペースで';clock.classList.remove('urgent');return; }
  const left=Math.max(0,Math.ceil((play.deadline-Date.now())/1000));
  clock.textContent=`残り ${left} 秒`;
  clock.classList.toggle('urgent',left<=10);
  if (!left) finishSession(true);
}
function currentPrompt() { return play?.prompts[play.index]; }
function renderForestHud() {
  if(!play || play.mode!=='forest')return;
  const companion=monsterFor(play.companionId);
  const evolved=getMonsterProgress(save,play.companionId).evolved;
  $('#forest-companion-art').innerHTML=monsterArt(companion.id,evolved);
  if($('#forest-party').dataset.companion!==companion.id || $('#forest-party').dataset.evolved!==String(evolved)){
    $('#forest-player-art').innerHTML=monsterArt(companion.id,evolved);
    $('#forest-party').dataset.companion=companion.id;
    $('#forest-party').dataset.evolved=String(evolved);
  }
  $('#forest-companion-name').textContent=(evolved?companion.evolvedName:companion.name)+' と戦闘中';
  const world=$('#forest-world-stage');
  const currentRoute=play.route||'wild';
  const arenaKey=currentRoute+':'+(play.index>=REGULAR_ENCOUNTERS?'boss':'mob');
  if(world.dataset.renderedRoute!==arenaKey){
    $('#forest-world-backdrop').innerHTML=battleArenaArt(play.index>=REGULAR_ENCOUNTERS);
    world.dataset.renderedRoute=arenaKey;
  }
  world.dataset.stage='arena';
  world.dataset.attack=companion.id;
  world.dataset.evolved=String(evolved);
  $('#forest-guard').innerHTML=guardArt();
  world.classList.toggle('forest-boss-stage',play.index>=REGULAR_ENCOUNTERS);
  $('.forest-chapter-pin').textContent=play.index>=REGULAR_ENCOUNTERS?'THORN VAULT':'MOONSTONE ARENA';
  world.classList.remove('forest-attack','forest-player-damaged','forest-boss-defeated','forest-guarding');
  const foe=opponentFor(play.index,play.wave);
  $('#forest-enemy').innerHTML=enemyArt(foe.id);
  $('#forest-foe-name').textContent=foe.name+' · '+foe.japanese;
  updateEnemyHealth();
  $('#forest-tries').textContent=play.endless?`あと${play.remainingTries}回 · ${difficultyCopy[play.difficulty].label}`:
    '英語で攻撃！';
  $('#forest-world-fx').textContent='';
  world.dataset.route=currentRoute;
  $('#forest-world-counter').textContent=play.index>=REGULAR_ENCOUNTERS?`WAVE ${play.wave} · BOSS ${play.bossHits+1}/${BOSS_HITS}`:`WAVE ${play.wave} · BATTLE ${play.index+1}/${REGULAR_ENCOUNTERS}`;
  const route=FOREST_ROUTES.find(entry=>entry.id===play.route);
  $('#forest-route-status').textContent=route ? route.name : '道を選ぶ前に、最初の関門へ';
  $$('[data-forest-gate]').forEach((node,index)=>{
    node.classList.toggle('is-current',play.index===index);
    node.classList.toggle('is-cleared',index<play.index);
    node.setAttribute('aria-current',play.index===index?'step':'false');
  });
  const bossMarker=$('[data-forest-boss]');
  bossMarker.classList.toggle('is-current',play.index>=REGULAR_ENCOUNTERS);
  bossMarker.classList.toggle('is-cleared',play.index>=REGULAR_ENCOUNTERS+BOSS_HITS);
  $('#forest-scene-story').textContent=play.index>=REGULAR_ENCOUNTERS?
    '森のトゲ王が立ちはだかる！ 英語を伝えて3回の攻撃で倒そう。':
    `BATTLE ${play.index+1}/5 · ${foe.japanese} が現れた！ 英語で応えて道を切り開こう。`;
  const log=$('#forest-battle-log');
  log.textContent=play.index>=REGULAR_ENCOUNTERS && play.bossHits===0?
    `${foe.name} が現れた！ 英語の攻撃を3回当てよう。`:
    `${foe.name} が現れた。英語で応えて仲間に攻撃の合図を出そう。`;
}
function updateEnemyHealth(hit=false) {
  if(play?.mode!=='forest')return;
  const boss=play.index>=REGULAR_ENCOUNTERS,max=boss?BOSS_HITS:1;
  const left=boss?Math.max(0,BOSS_HITS-play.bossHits):hit?0:1;
  const meter=$('#forest-boss-hp');
  meter.hidden=false;
  meter.textContent=`HP ${left} / ${max}`;
  meter.setAttribute('aria-label',boss?'ボスのHP':'敵のHP');
  meter.setAttribute('aria-valuemax',String(max));
  meter.setAttribute('aria-valuenow',String(left));
  meter.style.setProperty('--boss-health',`${100*left/max}%`);
}
function showForestExplore(routeChoice=false) {
  if(!play || play.mode!=='forest')return;
  stopAudio();
  const view=$('#play-view'), map=$('#forest-explore-art');
  const companion=monsterFor(play.companionId);
  const evolved=getMonsterProgress(save,play.companionId).evolved;
  const foe=opponentFor(play.index,play.wave);
  const isBoss=play.index>=REGULAR_ENCOUNTERS;
  const stage=Math.min(4,Math.max(0,play.index));
  map.innerHTML=forestWorldArt(play.route)+
    '<div class="forest-explore-companion">'+monsterArt(companion.id,evolved)+'</div>'+
    '<div class="forest-explore-destination" aria-hidden="true"></div>';
  map.dataset.step=String(stage);
  map.dataset.route=play.route||'wild';
  $('#forest-explore-screen').classList.toggle('boss-approach',isBoss);
  $('#forest-explore-title').textContent=routeChoice?'分かれ道に到着':isBoss?'森の奥に、強い気配がする':play.index===0?'冒険の始まり':`次の目的地へ · ${play.index+1}戦目`;
  $('#forest-explore-description').textContent=routeChoice?'進む道を選ぼう。道によって見つかる宝物が変わるよ。':
    isBoss?'この先に森のボスが待っている。準備ができたら進もう。':
    play.index===0?'仲間と森を探検しよう。先に進むとモンスターが現れる。':
    `${foe.japanese} の気配がする。次の戦闘へ進もう。`;
  const options=$('#forest-explore-options');
  options.hidden=!routeChoice;
  options.innerHTML=routeChoice?FOREST_ROUTES.map(route=>
    `<button type="button" class="forest-explore-route" data-forest-route="${route.id}"><strong>${escapeHtml(route.name)}</strong><small>${escapeHtml(route.detail)}</small></button>`).join(''):'';
  const forward=$('#forest-explore-continue');
  forward.hidden=routeChoice;
  forward.textContent=isBoss?'ボス戦へ進む':play.index===0?'森へ出発する':'次の地点へ進む';
  if(routeChoice){
    $$('[data-forest-route]',options).forEach(button=>button.addEventListener('click',()=>{
      if(!play || play.mode!=='forest'||play.route)return;
      play.route=button.dataset.forestRoute;
      showForestExplore(false);
    }));
  }
  view.classList.add('forest-exploring');
  $('#forest-explore-screen').hidden=false;
  $('#forest-journey').hidden=true;
  $('.forest-command-window').hidden=true;
  window.scrollTo({top:0,behavior:'instant'});
}
function showForestRouteChoice() {
  if(!play || play.mode!=='forest')return;
  play.revealed=true;
  showForestExplore(true);
}

function renderQuestion() {
  if (!play) return;
  $('#play-view').classList.remove('forest-exploring');
  $('#forest-explore-screen').hidden=true;
  $('#forest-journey').hidden=play.mode!=='forest';
  $('.forest-command-window').hidden=false;
  stopAudio();
  $('#answer-area').hidden=false;
  $('#forest-journey').classList.remove('forest-victory');
  play.hintUsed=false;play.revealed=false;play.speechState='';
  if(play.mode==='forest'){
    const key=`${play.wave}:${play.index}`;
    if(play.encounterKey!==key){
      play.encounterKey=key;
      play.remainingTries=DIFFICULTY_TRIES[play.difficulty];
      play.attemptReviewed=false;
    }
    renderForestHud();
  }
  const prompt=currentPrompt();
  if (!prompt) {finishSession();return;}
  if(play.mode==='forest'){
    const style=prompt.kind==='listen'?'defense':prompt.kind==='read'?'reading':'attack';
    $('#forest-world-stage').dataset.action=style;
    $('#forest-battle-log').textContent=style==='defense'?'敵のリスニング攻撃！音声を聞いて、英語で返して防御しよう。':style==='reading'?'敵の作戦を読んで、英語で応答して突破しよう。':'英語で応えて、仲間の攻撃を決めよう。';
  }
  $('#play-progress-fill').style.width=`${100*play.index/play.prompts.length}%`;
  const englishMode = (prompt.difficulty||'easy')!=='easy';
  const questionBody = englishMode
    ? `<p class="scenario-label">SITUATION</p><h1 class="english-situation" lang="en">${escapeHtml(prompt.cue)}</h1><div class="task-panel"><strong>YOUR TASK</strong><p lang="en">${escapeHtml(prompt.task)}</p></div><p class="question-caption" lang="en">${escapeHtml(prompt.scene)} · Respond aloud in your own words.</p>`
    : `<h1 lang="ja">${escapeHtml(prompt.cue)}</h1><p class="question-caption">${escapeHtml(prompt.scene)} · 正解の形は1つじゃない。まず声に出そう。</p>`;
  $('#play-card').dataset.promptId=prompt.id;
  const readingPassage=prompt.kind==='read'&&prompt.readText?`<div class="reading-passage" lang="en"><span>READ THE MESSAGE</span><p>${escapeHtml(prompt.readText)}</p></div>`:'';
  $('#play-card').innerHTML=`<div class="question-top"><span>${play.mode==='forest'?(play.index>=REGULAR_ENCOUNTERS?'BOSS ATTACK':'ENCOUNTER'):'QUESTION'} ${play.mode==='forest'?(play.index>=REGULAR_ENCOUNTERS?play.bossHits+1:play.index+1):play.index+1} / ${play.mode==='forest'?(play.index>=REGULAR_ENCOUNTERS?BOSS_HITS:REGULAR_ENCOUNTERS):play.prompts.length}</span><span class="question-tag">${play.mode==='forest'&&prompt.kind==='listen'?'LISTENING DEFENSE':play.mode==='forest'&&prompt.kind==='read'?'READING STRIKE':englishMode?'ENGLISH → ENGLISH':prompt.kind==='listen'?'LISTEN & RESPOND':'JAPANESE → ENGLISH'}</span></div>${readingPassage}${questionBody}${prompt.kind==='listen'?'<button class="listen-control" id="play-audio"><span class="audio-glyph" aria-hidden="true"></span> 相手の英語を聞く</button><button class="hint-button" id="reveal-transcript" style="display:block">音声が聞こえない場合</button><p class="transcript-fallback" id="transcript" hidden></p>':''}`;
  $('#answer-area').innerHTML=`<label class="answer-label" for="spoken-answer">英語で答えよう（音声認識または入力）</label><div class="answer-row"><input id="spoken-answer" class="answer-input" autocomplete="off" autocapitalize="sentences" placeholder="ここに英語を入力してもOK"><button id="mic-button" type="button" class="mic-button" title="マイクで話す" aria-label="マイクで話す" aria-pressed="false"><span class="mic-glyph mic-glyph-talk" aria-hidden="true"></span><span>話す</span></button></div><button id="retry-mic" type="button" class="retry-mic" hidden>↻ 録音し直す</button><p id="speech-helper" class="answer-helper" role="status" aria-live="polite">マイクが使えないときは英文を入力して判定できます。</p><div class="learning-controls"><button class="hint-button" id="show-hint">ヒントを見る</button><button class="reveal-button" id="show-answer">答えを判定する →</button></div><div id="hint-panel" class="hint-box" hidden></div><div id="feedback-panel"></div>`;
  $('#mic-button').addEventListener('click',startRecognition);
  $('#retry-mic').addEventListener('click',()=>{
    if(!play || play.revealed)return;
    $('#spoken-answer').value='';
    $('#spoken-answer').classList.remove('transcript-interim');
    micView('ready');startRecognition();
  });
  $('#show-hint').addEventListener('click',showHint);
  $('#show-answer').addEventListener('click',gradeAnswer);
  $('#spoken-answer').addEventListener('keydown',event=>{if(event.key==='Enter')gradeAnswer();});
  $('#spoken-answer').addEventListener('input',()=>{
    $('#spoken-answer').classList.remove('transcript-interim');
    if(!recognition)micView('ready');
  });
  micView('ready');
  if(prompt.kind==='listen'){
    $('#play-audio').addEventListener('click',()=>speakLine(prompt.audio));
    $('#reveal-transcript').addEventListener('click',()=>{$('#transcript').hidden=false;$('#transcript').textContent=prompt.audio;});
  }
}
function speakLine(line) {
  try {
    if(!window.speechSynthesis || !window.SpeechSynthesisUtterance) throw new Error('no speech');
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(line);utterance.lang='en-US';utterance.rate=.89;
    utterance.onerror=()=>{$('#transcript').hidden=false;$('#transcript').textContent=line;};
    window.speechSynthesis.speak(utterance);
  } catch { $('#transcript').hidden=false;$('#transcript').textContent=line; }
}
function startRecognition() {
  if(!play || play.revealed)return;
  const helper=$('#speech-helper');
  if(recognition){
    stopRecognition();
    if(helper)helper.textContent='録音を停止しました。「話す」を押すと再開できます。';
    return;
  }
  const Constructor=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Constructor){
    micView('ready');
    if(helper)helper.textContent='このブラウザは音声認識に対応していません。英文を入力して判定できます。';
    return;
  }
  try{
    const instance=new Constructor(),session=play;
    recognition=instance;
    instance.lang='en-US';instance.interimResults=true;instance.continuous=false;instance.maxAlternatives=1;
    instance.onresult=event=>{
      if(recognition!==instance || play!==session || !$('#spoken-answer'))return;
      const segments=[...event.results];
      const transcript=segments.map(result=>result[0]?.transcript||'').join(' ').replace(/\s+/g,' ').trim();
      if(!transcript)return;
      // Display partial recognition immediately, without counting it as a final answer.
      // The orange recording button stays only while recognition is actually active.
      const finalized=segments.length>0 && segments.every(result=>result.isFinal===true);
      const field=$('#spoken-answer');
      field.value=transcript;
      field.classList.toggle('transcript-interim',!finalized);
      field.setAttribute('aria-label',finalized?'音声認識が確定した英文':'リアルタイムで聞き取った英文（認識中）');
      if(helper)helper.textContent=finalized
        ?'聞き取った英文を表示しました。確認して「答えを判定する」を押してね。'
        :'聞き取り中… 英文がリアルタイムで表示されています（まだ確定前）。';
      if(finalized) stopRecognition('captured');
    };
    instance.onerror=event=>{
      if(recognition!==instance || play!==session)return;
      stopRecognition();
      if(helper)helper.textContent=event.error==='not-allowed'||event.error==='service-not-allowed'
        ?'マイクの利用が許可されていません。英文を入力して判定できます。'
        :'うまく聞き取れませんでした。もう一度録音するか、英文を入力してね。';
    };
    instance.onend=()=>{
      if(recognition!==instance || play!==session)return;
      const transcript=$('#spoken-answer')?.value.trim();
      $('#spoken-answer')?.classList.remove('transcript-interim');
      stopRecognition(transcript?'captured':'ready');
      if(helper)helper.textContent=transcript
        ?'音声認識が終了しました。表示された英文を確認してから判定してね。'
        :'録音が終了しました。もう一度マイクを押すか英文を入力してね。';
    };
    recognitionWatchdog=setTimeout(()=>{
      if(recognition!==instance)return;
      stopRecognition();
      if(helper)helper.textContent='録音が長く続いたため自動停止しました。もう一度試すか英文を入力してね。';
    },15000);
    instance.start();
    micView('listening');
    if(helper)helper.textContent='録音中です。話し終えるか「停止」を押してください。';
  }catch{
    stopRecognition();
    if(helper)helper.textContent='マイクを開始できません。英文入力で続けられます。';
  }
}
function showHint() {
  const prompt=currentPrompt(), phrase=phraseFor(prompt.phraseId);play.hintUsed=true;
  $('#hint-panel').hidden=false;$('#hint-panel').textContent=`ヒント：${prompt.hint || phrase.hint}　${prompt.tip || phrase.tip}`;
}
async function gradeAnswer() {
  if(!play || play.revealed || play.grading)return;
  stopRecognition('done');
  const session=play,prompt=currentPrompt(),raw=$('#spoken-answer').value.trim();
  let grade=gradeLocalResponse(prompt,raw);
  if(grade.status==='review' && STAGING_SEMANTIC_GRADER_ENDPOINT){
    session.grading=true;
    $('#show-answer').disabled=true;
    $('#speech-helper').textContent='意味を確認中…';
    const result=await askSemanticGrader(prompt,raw);
    if(play!==session)return; // Ignore delayed remote results from a previous question.
    session.grading=false;
    $('#show-answer').disabled=false;
    if(result.state==='correct')grade={status:'correct',reasons:[],method:'semantic-beta'};
    if(result.state==='review')grade={status:'review',reasons:result.missing.length?result.missing:[result.feedback||'内容をもう少し具体的にしてみよう。'],method:'semantic-beta'};
    if(result.state==='unavailable'||result.state==='rate_limited'||result.state==='login_required')
      $('#speech-helper').textContent='AI判定を利用できないため、教材の簡易判定で確認しています。';
  }
  if(grade.status!=='correct'){
    if(grade.status==='review' && raw)persist(flagUncertainReview(save,prompt.id));
    if(play.mode==='forest' && raw){
      const world=$('#forest-world-stage');
      world.classList.remove('forest-attack','forest-guarding','forest-player-damaged');
      void world.offsetWidth;
      world.classList.add('forest-guarding');
      $('#forest-world-fx').textContent='';
      $('#forest-battle-log').textContent='敵が身構えた。判定保留のため攻撃は発生しません。正しい別表現の可能性もあるので、言い換えて再挑戦できます。';
    }
    if(play.mode==='forest'&&play.endless&&grade.status==='review'&&raw){
      play.attemptReviewed=true;
      // Ambiguous recognizer output is explicitly not called wrong; limited attempts are a challenge rule.
      const soxieShield=play.companionId==='katappo'&&getMonsterProgress(save,play.companionId).evolved&&!play.usedShield;
      if(soxieShield){play.usedShield=true;$('#forest-world-fx').textContent='LOST & FOUND · SHIELD';}
      else play.remainingTries=Math.max(0,play.remainingTries-1);
      $('#forest-tries').textContent=`あと${play.remainingTries}回 · ${difficultyCopy[play.difficulty].label}`;
      if(!play.remainingTries){
        $('#feedback-panel').innerHTML='<div class="feedback-box grading-review" role="status"><div class="feedback-head">挑戦回数を使い切った！</div><p class="grading-intro">簡易判定では確認できない回答もあるよ。今回はここまで。もう一度遊んでみよう！</p><button id="forest-exit" class="grading-next">冒険の結果を見る →</button></div>';
        $('#forest-exit').addEventListener('click',()=>finishSession(false,true));
        micView('done');return;
      }
    }
    const empty=grade.status==='empty';
    const uncertain=grade.status==='review'||grade.status==='ungraded';
    $('#feedback-panel').innerHTML=`<div class="feedback-box grading-review" role="status"><div class="feedback-head">${empty?'英語を入力してみよう':'自動判定では確認できませんでした'}</div><p class="grading-intro">${uncertain?'簡易判定で確認できない部分があります。正しい別表現の可能性もあるので、言い換えてみてね。今回の表現は復習にも登録しました。':'回答を入力または音声認識で取り込んでね。'}</p>${grade.reasons.length?`<ul class="grading-reasons">${grade.reasons.map(reason=>`<li>${escapeHtml(reason)}</li>`).join('')}</ul>`:''}${empty?'':'<button type="button" class="grading-skip" id="show-example">例文を見て次へ（XPなし）</button>'}</div>`;
    if(!empty)$('#show-example').addEventListener('click',skipAnswer);
    micView('ready');
    return;
  }
  const rating=play.hintUsed?'hint':'smooth';
  const {save:next,reward}=recordAnswer(save,prompt.id,rating);
  persist(next);
  play.earnedXp+=reward.xp;
  play.captured.push(...reward.captured);
  if(rating==='smooth')play.smooth++;
  play.revealed=true;
  stopAudio();
  $('#show-answer').disabled=true;$('#show-hint').disabled=true;$('#spoken-answer').disabled=true;micView('done');
  if(play.mode==='forest'){
    const boss=play.index>=REGULAR_ENCOUNTERS;
    const foe=opponentFor(play.index,play.wave);
    const companion=monsterFor(play.companionId);
    const companionName=getMonsterProgress(save,play.companionId).evolved?companion.evolvedName:companion.name;
    const special=specialStrike({companionId:play.companionId,
      evolved:getMonsterProgress(save,play.companionId).evolved,boss,usedPower:play.usedPower});
    play.usedPower ||= special.usedPower;
    if(boss)play.bossHits=Math.min(BOSS_HITS,play.bossHits+special.strikes);
    $('#forest-journey').classList.add('forest-victory');
    const stage=$('#forest-world-stage');
    stage.classList.remove('forest-attack','forest-guarding','forest-defended','forest-reading-hit');
    void stage.offsetWidth;
    stage.classList.add('forest-attack');
    if(prompt.kind==='listen')stage.classList.add('forest-defended');
    if(prompt.kind==='read')stage.classList.add('forest-reading-hit');
    $('#forest-world-stage').dataset.attack=play.companionId;
    $('#forest-damage').textContent=`−${special.strikes}`;
    $('#forest-world-fx').textContent=prompt.kind==='listen'?'BLOCK':prompt.kind==='read'?'BREAK':special.ability?special.ability:boss?'BOSS HIT':'HIT';
    updateEnemyHealth(true);
    const defeated=boss&&play.bossHits>=BOSS_HITS;
    if(defeated)$('#forest-world-stage').classList.add('forest-boss-defeated');
    $('#forest-battle-log').textContent=prompt.kind==='listen'?`${companionName}が敵の攻撃を防御！反撃で${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='read'?`${companionName}が敵の作戦を見破った！${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:`${companionName}のこうげき！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`;
  }
  $('#feedback-panel').innerHTML=`<div class="feedback-box grading-correct" role="status"><div class="feedback-head">${play.mode==='forest'?'関門突破！':'内容を確認できた！'} +${reward.xp} XP</div><div class="feedback-answer">${escapeHtml(prompt.answer)}</div><div class="feedback-note">使える表現の一例。 ${escapeHtml(prompt.tip || phraseFor(prompt.phraseId).tip)}<p>${grade.method==='semantic-beta'?'AIによる意味の確認（試験運用）です。発音評価ではありません。':'教材ごとの簡易判定です。発音や自由な言い回しを完全に採点するものではありません。'}</p></div><button id="next-question" class="grading-next">次の問題へ →</button></div>`;
  $('#next-question').addEventListener('click',advanceQuestion);
}
function skipAnswer(){
  if(!play || play.revealed)return;
  const prompt=currentPrompt(),{save:next}=recordAnswer(save,prompt.id,'again');
  persist(next);
  play.revealed=true;stopAudio();
  $('#show-answer').disabled=true;$('#show-hint').disabled=true;$('#spoken-answer').disabled=true;micView('done');
  $('#feedback-panel').innerHTML=`<div class="feedback-box" role="status"><div class="feedback-head">例文を確認しよう · 0 XP</div><div class="feedback-answer">${escapeHtml(prompt.answer)}</div><p class="feedback-note">${escapeHtml(prompt.tip || phraseFor(prompt.phraseId).tip)}</p><button id="next-question" class="grading-next">${play.mode==='forest'?'同じ関門にもう一度挑戦 →':'次の問題へ →'}</button></div>`;
  $('#next-question').addEventListener('click',()=>{
    if(play?.mode==='forest'&&play.endless&&!play.attemptReviewed){
      play.remainingTries=Math.max(0,play.remainingTries-1);
      if(!play.remainingTries){finishSession(false,true);return;}
    }
    if(play?.mode==='forest'){
      play.attemptReviewed=false;
      renderQuestion();
    }
    else advanceQuestion();
  });
}
function advanceQuestion(){
  if(!play || !play.revealed)return;
  if(play.mode==='forest' && play.index===0 && !play.route){
    play.index=1;
    showForestRouteChoice();
    return;
  }
  if(play.mode==='forest'){
    play.index=play.index>=REGULAR_ENCOUNTERS?REGULAR_ENCOUNTERS+play.bossHits:play.index+1;
    if(play.index>=FOREST_WAVE_LENGTH){
      // Reward a wave only after five mobs and three verified boss hits.
      const reward=finishForest(save,play.route,play.companionId);
      persist(reward.save);
      play.forestRelics.push(...reward.discovered);
      if(!play.endless){play.completedForest=true;finishSession();return;}
      play.seenIds=play.prompts.map(p=>p.id);
      play.wave++;
      const wave=buildForestWave({difficulty:play.baseDifficulty,wave:play.wave,previousIds:play.seenIds,reviewPhraseIds:dueForestPhrases()});
      play.prompts=wave.prompts;
      play.difficulty=wave.level;
      play.index=0;play.bossHits=0;play.usedPower=false;
      play.encounterKey=null;
      $('#play-mode-label').textContent=`∞ WAVE ${play.wave} · ${difficultyCopy[wave.level].label}`;
      showForestExplore(false);return;
    }
    // The boss keeps its dedicated arena until defeated; normal encounters
    // return to exploration before the next battle.
    if(play.index>REGULAR_ENCOUNTERS && play.index<FOREST_WAVE_LENGTH){
      renderQuestion();
    } else {
      showForestExplore(false);
    }
    updateClock();return;
  }
  play.index++;
  if(play.index===play.prompts.length){finishSession();return;}
  if(play.deadline && Date.now()>=play.deadline){finishSession(true);return;}
  renderQuestion();updateClock();
}
function finishSession(timedOut=false,defeated=false) {
  if(!play)return;
  const ended=play;play=null;clearTimer();stopAudio();
  if(ended.mode==='challenge')persist(finishRound(save,ended.smooth));
  $('#play-view').classList.remove('forest-active');
  $('#result-view').classList.toggle('forest-results',ended.mode==='forest');
  const forestFinished=ended.mode==='forest'&&ended.completedForest===true;
  if(ended.mode==='forest'&&ended.endless){
    const forest=cleanForest(save.forest);
    persist({...save,forest:{...forest,bestWave:Math.max(forest.bestWave||0,ended.wave-(ended.index===0?1:0))}});
  }
  $('#result-title').textContent=ended.mode==='forest'?
    (defeated?'森の挑戦終了':ended.endless?'∞ エンドレス WAVE '+ended.wave:'森のボスを討伐！'):
    ended.smooth>=4?'すごい！言葉が出てきたね。':'今日の一歩、しっかり前進。';
  $('#result-description').textContent=ended.mode==='forest'?
    (defeated?'挑戦回数を使い切ったよ。言い換えが簡易判定で通らない場合もあるので、また挑戦してね！':
     ended.endless?'ここまでの冒険の記録！難易度が上がるほどリトライ回数が減るよ。':
     '5体のモブを突破してトゲ王を撃破！ 仲間と宝物を確認しよう。'):
    timedOut?'60秒おつかれさま！ 言えなかった表現は、次の練習で取り戻そう。':
    '練習した表現は、別の場面や後日の復習でも使ってみよう。';
  $('#result-rewards').innerHTML=`<span class="reward-pill">自力で言えた ${ended.smooth} / ${ended.index}</span><span class="reward-pill">+${ended.earnedXp} XP ストック！</span><span class="reward-pill">使えるXP ${save.xpWallet}</span><span class="reward-pill">仲間 ${save.ownedMonsters.length} / ${MONSTERS.length}</span>`;
  const newMonsters=[...new Set(ended.captured)].map(id=>{const creature=monsterFor(id);return `<div class="discovery-card">${monsterArt(id)}<div><strong>${escapeHtml(creature.name)}が仲間入り！</strong><p>${escapeHtml(creature.kind)} · 図鑑に追加</p></div></div>`;}).join('');
  const newRelics=ended.mode==='forest'?ended.forestRelics.map(id=>`<div class="forest-result-relic"><span aria-hidden="true">${relicArt(id)}</span><div><strong>${escapeHtml(FOREST_RELICS[id].name)} を発見！</strong><p>${escapeHtml(FOREST_RELICS[id].meaning)} · 冒険の宝物</p></div></div>`).join(''):'';
  $('#result-discoveries').innerHTML=newMonsters+newRelics;
  if(forestFinished&&!ended.forestRelics.length)$('#result-description').textContent+=' 今回は新しい宝物はなかったけど、英語の練習は積み重なった！';
  $('#replay-run').textContent=ended.mode==='forest'?'森をもう一度探検する':ended.mode==='challenge'?'もう一度60秒に挑む':'別の表現も練習する';
  $('#replay-run').onclick=()=>startSession(ended.endless?'forest-endless':ended.mode);
  showView('result');
}
const {renderCollection} = createCollectionViews({getSave:()=>save,persist,showView,stopAudio});

$$('[data-difficulty]').forEach(button => button.addEventListener('click', () => {
  persist(chooseDifficulty(save, button.dataset.difficulty));
  renderDifficulty();
}));
$$('[data-start]').forEach(button=>button.addEventListener('click',()=>startSession(button.dataset.start)));
$('#start-forest').addEventListener('click',()=>startSession('forest'));
$('#start-forest-endless').addEventListener('click',()=>startSession('forest-endless'));
$('#forest-explore-continue').addEventListener('click',()=>{
  if(play?.mode!=='forest'||!$('#play-view').classList.contains('forest-exploring')||!$('#forest-explore-options').hidden)return;
  renderQuestion();
});
$('#open-collection').addEventListener('click',()=>renderCollection());
$('#open-wallet').addEventListener('click',()=>renderCollection());
$('#leave-play').addEventListener('click',()=>{clearTimer();stopAudio();play=null;$('#play-view').classList.remove('forest-active');renderHome();});
$('#result-home').addEventListener('click',renderHome);
$('#result-collection').addEventListener('click',()=>renderCollection());
$('#collection-home').addEventListener('click',renderHome);
persist(save);
window.addEventListener('pagehide',()=>stopAudio());
document.addEventListener('visibilitychange',()=>{if(document.hidden && recognition)stopRecognition();});
renderHome();
