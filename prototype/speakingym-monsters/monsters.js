import { MONSTERS, PHRASES, PROMPTS } from './monster-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, chooseDifficulty, compareWithExamples, createSave, dayKey, feedMonster, finishRound, getMonsterProgress, learningSummary, masteryLevel, recordAnswer, selectMonster, selectRoundPrompts, validateSave } from './monster-engine.js';
import { monsterArt } from './monster-art.js';
import { gradeLocalResponse } from './monster-grader.js';
import { STAGING_SEMANTIC_GRADER_ENDPOINT, askSemanticGrader } from './semantic-client.js';
import { cleanForest, FOREST_ROUTES, FOREST_STAGES, FOREST_RELICS, finishForest, getForestPrompts } from './forest-engine.js';
import { forestWorldArt } from './forest-world.js';
import { buildForestWave, DIFFICULTY_TRIES, opponentFor, FOREST_WAVE_LENGTH, REGULAR_ENCOUNTERS, BOSS_HITS, specialStrike } from './forest-battle.js';
import { enemyArt } from './forest-enemies.js';

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
    button.textContent=mode==='listening'?'停止':'話す';
    button.title=mode==='listening'?'録音を停止する':'マイクで話す';
    button.setAttribute('aria-label',mode==='listening'?'録音を停止する':'マイクで話す');
    button.hidden=mode==='captured' || mode==='done';
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
  for (const id of ['home','play','result','collection']) $(`#${id}-view`).hidden = id !== name;
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
function startSession(mode) {
  clearTimer(); stopAudio();
  const difficulty=save.difficulty;
  const endless=mode==='forest-endless',forestMode=mode==='forest'||endless;
  const promptCount=mode==='challenge'?{easy:6,normal:4,hard:3}[difficulty]:3;
  const firstWave=forestMode?buildForestWave({difficulty,wave:1}):null;
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
  renderQuestion();
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
  $('#forest-companion-name').textContent=(evolved?companion.evolvedName:companion.name)+' と探検中';
  const world=$('#forest-world-stage');
  const currentRoute=play.route||'wild';
  if(world.dataset.renderedRoute!==currentRoute){
    $('#forest-world-backdrop').innerHTML=forestWorldArt(play.route);
    world.dataset.renderedRoute=currentRoute;
  }
  world.dataset.stage=String(play.index<REGULAR_ENCOUNTERS?Math.min(2,Math.floor(play.index*3/REGULAR_ENCOUNTERS)):2);
  world.classList.toggle('forest-boss-stage',play.index>=REGULAR_ENCOUNTERS);
  world.classList.remove('forest-attack','forest-player-damaged','forest-boss-defeated');
  const foe=opponentFor(play.index,play.wave);
  $('#forest-enemy').innerHTML=enemyArt(foe.id);
  $('#forest-foe-name').textContent=foe.name+' · '+foe.japanese;
  $('#forest-boss-hp').hidden=play.index<REGULAR_ENCOUNTERS;
  $('#forest-boss-hp').textContent=play.index>=REGULAR_ENCOUNTERS?
    '◆ '.repeat(Math.max(0,BOSS_HITS-play.bossHits))+'◇ '.repeat(play.bossHits):'';
  $('#forest-boss-hp').setAttribute('aria-valuenow',String(Math.max(0,BOSS_HITS-play.bossHits)));
  $('#forest-boss-hp').style.setProperty('--boss-health',`${100*(BOSS_HITS-play.bossHits)/BOSS_HITS}%`);
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
function showForestRouteChoice() {
  if(!play || play.mode!=='forest')return;
  stopAudio();
  play.revealed=true;
  $('#answer-area').hidden=true;
  $('#forest-journey').classList.add('forest-route-reveal');
  renderForestHud();
  $('#play-card').innerHTML=`<div class="forest-route-choice"><span class="forest-kicker">THE FIRST GATE IS OPEN</span><h1>森に二つの道が現れた。</h1><p class="forest-choice-intro">仲間とどっちへ進む？ 道によって見つかる宝物が変わるよ。英語の採点やXPは変わらない。</p><div class="forest-route-grid">${FOREST_ROUTES.map(route=>`<button type="button" class="forest-route-option" data-forest-route="${route.id}"><span class="forest-route-symbol" aria-hidden="true">${route.symbol}</span><strong>${route.name}</strong><small lang="en">${route.tag}</small><span>${route.detail}</span></button>`).join('')}</div></div>`;
  $$('[data-forest-route]').forEach(button=>button.addEventListener('click',()=>{
    if(!play||play.mode!=='forest'||play.route)return;
    play.route=button.dataset.forestRoute;
    $('#forest-journey').classList.remove('forest-route-reveal');
    renderQuestion();
  }));
}

function renderQuestion() {
  if (!play) return;
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
  $('#play-progress-fill').style.width=`${100*play.index/play.prompts.length}%`;
  const englishMode = (prompt.difficulty||'easy')!=='easy';
  const questionBody = englishMode
    ? `<p class="scenario-label">SITUATION</p><h1 class="english-situation" lang="en">${escapeHtml(prompt.cue)}</h1><div class="task-panel"><strong>YOUR TASK</strong><p lang="en">${escapeHtml(prompt.task)}</p></div><p class="question-caption" lang="en">${escapeHtml(prompt.scene)} · Respond aloud in your own words.</p>`
    : `<h1 lang="ja">${escapeHtml(prompt.cue)}</h1><p class="question-caption">${escapeHtml(prompt.scene)} · 正解の形は1つじゃない。まず声に出そう。</p>`;
  $('#play-card').dataset.promptId=prompt.id;
  $('#play-card').innerHTML=`<div class="question-top"><span>${play.mode==='forest'?(play.index>=REGULAR_ENCOUNTERS?'BOSS ATTACK':'ENCOUNTER'):'QUESTION'} ${play.mode==='forest'?(play.index>=REGULAR_ENCOUNTERS?play.bossHits+1:play.index+1):play.index+1} / ${play.mode==='forest'?(play.index>=REGULAR_ENCOUNTERS?BOSS_HITS:REGULAR_ENCOUNTERS):play.prompts.length}</span><span class="question-tag">${englishMode?'ENGLISH → ENGLISH':prompt.kind==='listen'?'LISTEN & RESPOND':'JAPANESE → ENGLISH'}</span></div>${questionBody}${prompt.kind==='listen'?'<button class="listen-control" id="play-audio">▶ 相手の英語を聞く</button><button class="hint-button" id="reveal-transcript" style="display:block">音声が聞こえない場合</button><p class="transcript-fallback" id="transcript" hidden></p>':''}`;
  $('#answer-area').innerHTML=`<label class="answer-label" for="spoken-answer">英語で答えよう（音声認識または入力）</label><div class="answer-row"><input id="spoken-answer" class="answer-input" autocomplete="off" autocapitalize="sentences" placeholder="ここに英語を入力してもOK"><button id="mic-button" type="button" class="mic-button" title="マイクで話す" aria-label="マイクで話す" aria-pressed="false">話す</button></div><button id="retry-mic" type="button" class="retry-mic" hidden>↻ 録音し直す</button><p id="speech-helper" class="answer-helper" role="status" aria-live="polite">マイクが使えないときは英文を入力して判定できます。</p><div class="learning-controls"><button class="hint-button" id="show-hint">ヒントを見る</button><button class="reveal-button" id="show-answer">答えを判定する →</button></div><div id="hint-panel" class="hint-box" hidden></div><div id="feedback-panel"></div>`;
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
    if(helper)helper.textContent='録音を停止しました。もう一度マイクを押すか、英文を入力してね。';
    return;
  }
  const Constructor=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Constructor){
    micView('done');
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
    if(helper)helper.textContent='録音中… 話し終えたら自動的に停止します。■で手動停止もできます。';
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
    if(play.mode==='forest' && raw)$('#forest-battle-log').textContent='判定保留。攻撃は発生しません。言い換えて再挑戦できます。';
    if(play.mode==='forest'&&play.endless&&grade.status==='review'&&raw){
      play.attemptReviewed=true;
      // Ambiguous recognizer output is explicitly not called wrong; limited attempts are a challenge rule.
      const soxieShield=play.companionId==='katappo'&&getMonsterProgress(save,play.companionId).evolved&&!play.usedShield;
      if(soxieShield){play.usedShield=true;$('#forest-world-fx').textContent='LOST & FOUND · SHIELD';}
      else play.remainingTries=Math.max(0,play.remainingTries-1);
      $('#forest-tries').textContent=`あと${play.remainingTries}回 · ${difficultyCopy[play.difficulty].label}`;
      $('#forest-world-stage').classList.remove('forest-player-damaged');
      void $('#forest-world-stage').offsetWidth;
      $('#forest-world-stage').classList.add('forest-player-damaged');
      if(!play.remainingTries){
        $('#feedback-panel').innerHTML='<div class="feedback-box grading-review" role="status"><div class="feedback-head">挑戦回数を使い切った！</div><p class="grading-intro">簡易判定では確認できない回答もあるよ。今回はここまで。もう一度遊んでみよう！</p><button id="forest-exit" class="grading-next">冒険の結果を見る →</button></div>';
        $('#forest-exit').addEventListener('click',()=>finishSession(false,true));
        micView('done');return;
      }
    }
    const empty=grade.status==='empty';
    const uncertain=grade.status==='review'||grade.status==='ungraded';
    $('#feedback-panel').innerHTML=`<div class="feedback-box grading-review" role="status"><div class="feedback-head">${empty?'英語を入力してみよう':'もう少しで伝わりそう！'}</div><p class="grading-intro">${uncertain?'簡易判定で確認できない部分があります。正しい別表現の可能性もあるので、言い換えてみてね。':'回答を入力または音声認識で取り込んでね。'}</p>${grade.reasons.length?`<ul class="grading-reasons">${grade.reasons.map(reason=>`<li>${escapeHtml(reason)}</li>`).join('')}</ul>`:''}${empty?'':'<button type="button" class="grading-skip" id="show-example">例文を見て次へ（XPなし）</button>'}</div>`;
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
    $('#forest-world-stage').classList.remove('forest-attack');
    void $('#forest-world-stage').offsetWidth;
    $('#forest-world-stage').classList.add('forest-attack');
    $('#forest-world-stage').dataset.attack=play.companionId;
    $('#forest-damage').textContent=`−${special.strikes}`;
    $('#forest-world-fx').textContent=special.ability?special.ability:boss?'BOSS HIT':'HIT';
    $('#forest-boss-hp').textContent='◆ '.repeat(Math.max(0,BOSS_HITS-play.bossHits))+'◇ '.repeat(play.bossHits);
    $('#forest-boss-hp').setAttribute('aria-valuenow',String(Math.max(0,BOSS_HITS-play.bossHits)));
    $('#forest-boss-hp').style.setProperty('--boss-health',`${100*(BOSS_HITS-play.bossHits)/BOSS_HITS}%`);
    const defeated=boss&&play.bossHits>=BOSS_HITS;
    if(defeated)$('#forest-world-stage').classList.add('forest-boss-defeated');
    $('#forest-battle-log').textContent=`${companionName}のこうげき！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`;
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
      const wave=buildForestWave({difficulty:play.baseDifficulty,wave:play.wave,previousIds:play.seenIds});
      play.prompts=wave.prompts;
      play.difficulty=wave.level;
      play.index=0;play.bossHits=0;play.usedPower=false;
      play.encounterKey=null;
      $('#play-mode-label').textContent=`∞ WAVE ${play.wave} · ${difficultyCopy[wave.level].label}`;
      renderQuestion();return;
    }
    renderQuestion();updateClock();return;
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
  const newRelics=ended.mode==='forest'?ended.forestRelics.map(id=>`<div class="forest-result-relic"><span aria-hidden="true">${FOREST_RELICS[id].emoji}</span><div><strong>${escapeHtml(FOREST_RELICS[id].name)} を発見！</strong><p>${escapeHtml(FOREST_RELICS[id].meaning)} · 冒険の宝物</p></div></div>`).join(''):'';
  $('#result-discoveries').innerHTML=newMonsters+newRelics;
  if(forestFinished&&!ended.forestRelics.length)$('#result-description').textContent+=' 今回は新しい宝物はなかったけど、英語の練習は積み重なった！';
  $('#replay-run').textContent=ended.mode==='forest'?'森をもう一度探検する':ended.mode==='challenge'?'もう一度60秒に挑む':'別の表現も練習する';
  $('#replay-run').onclick=()=>startSession(ended.endless?'forest-endless':ended.mode);
  showView('result');
}
function renderCollection(message = '') {
  const summary=learningSummary(save);
  $('#collection-wallet').textContent = `${save.xpWallet} XP`;
  $('#feed-feedback').textContent = message;
  const forest=cleanForest(save.forest);
  $('#forest-collection-count').textContent=`踏破 ${forest.clears}回 · 発見した宝物 ${forest.relics.length}/${Object.keys(FOREST_RELICS).length}`;
  $('#forest-collection-relics').innerHTML=forest.relics.length?forest.relics.map(id=>{
    const relic=FOREST_RELICS[id];
    return `<article class="forest-relic"><span aria-hidden="true">${relic.emoji}</span><div><strong lang="en">${escapeHtml(relic.name)}</strong><small>${escapeHtml(relic.meaning)}</small><p>${escapeHtml(relic.description)}</p></div></article>`;
  }).join(''):'<p class="forest-empty">まだお宝はないよ。仲間を連れて森を探検してみよう！</p>';
  $('#collection-grid').innerHTML=MONSTERS.map(creature=>{
    const owned=save.ownedMonsters.includes(creature.id), active=save.selectedMonster===creature.id;
    const growth=getMonsterProgress(save,creature.id);
    const unlock=creature.masteryUnlock!==undefined?`MASTER ${creature.masteryUnlock}表現で出会える`:`自力で${creature.unlock}表現を話せると出会える`;
    const walletActions=`<div class="feed-actions"><button data-feed-monster="${creature.id}" data-feed-amount="10" ${save.xpWallet<10?'disabled':''}>+10 XP</button><button data-feed-monster="${creature.id}" data-feed-amount="all" ${save.xpWallet<1?'disabled':''}>全部あげる</button></div>`;
    const displayName = growth.evolved ? creature.evolvedName : creature.name;
    const roots = creature.roots.map(root=>`<div class="word-row"><span><b lang="en">${escapeHtml(root.word)}</b><small>${escapeHtml(root.meaning)}</small></span><button type="button" class="word-audio" data-pronounce-word="${escapeHtml(root.word)}" aria-label="${escapeHtml(root.word)} の発音を聞く">▶ 聞く</button></div>`).join('');
    const forestPower=creature.id==='medamago'
      ? {name:'Double Yolk', description:'森のボス戦で一度だけ2回攻撃！進化すると隠し宝物も発見できる。'}
      : creature.id==='katappo'
      ? {name:'Lost & Found', description:'エンドレスで一度だけ失敗時の挑戦回数を守る。隠し宝物も発見できる。'}
      : null;
    const powerLabel=forestPower
      ? `<strong lang="en">${escapeHtml(forestPower.name)}</strong><small>${escapeHtml(forestPower.description)}</small>`
      : '<strong lang="en">???</strong><small>まだ未発見の能力。冒険エリアの拡張で追加予定！</small>';
    const powerState=forestPower?(growth.evolved?'発動できるよ · 森へ一緒に行こう':'進化すると解放'):'今後のダンジョンで解放予定';
    return `<article class="monster-card ${owned?'':'locked'}"><div class="monster-picture">${monsterArt(creature.id,owned&&growth.evolved)}</div><h3 lang="en">${owned?escapeHtml(displayName):'???'}</h3><p class="monster-japanese">${owned?escapeHtml(creature.japaneseName+' · '+creature.kind):escapeHtml(unlock)}</p>${owned?`<p class="monster-note">${escapeHtml(creature.note)}</p><div class="word-roots"><strong>NAME ORIGIN · 名前の由来</strong>${roots}</div><div class="monster-skill"><span>${powerState}</span>${powerLabel}</div><span class="mini-tag">Lv.${growth.level} ${growth.evolved?'· 進化済み':''}</span><div class="mini-xp-track"><span style="width:${100-growth.toNextLevel/XP_PER_LEVEL*100}%"></span></div><div class="monster-card-tools"><button class="select-companion" data-select-monster="${creature.id}" ${active?'disabled':''}>${active?'ホームに表示中':'ホームに表示'}</button>${walletActions}</div>`:'<span class="mini-tag">未発見</span>'}</article>`;
  }).join('');
  $$('[data-pronounce-word]').forEach(button=>button.addEventListener('click',()=>{
    const word=button.dataset.pronounceWord;
    if(!window.speechSynthesis || !window.SpeechSynthesisUtterance){ $('#feed-feedback').textContent='このブラウザでは発音再生ができません。'; return; }
    try{
      window.speechSynthesis.cancel();
      const utterance=new SpeechSynthesisUtterance(word);
      utterance.lang='en-US'; utterance.rate=.82;
      window.speechSynthesis.speak(utterance);
    }catch { $('#feed-feedback').textContent='発音再生を開始できませんでした。'; }
  }));
  $$('[data-select-monster]').forEach(button=>button.addEventListener('click',()=>{persist(selectMonster(save,button.dataset.selectMonster));renderCollection(`${monsterFor(button.dataset.selectMonster).name}をホームに表示します。`);}));
  $$('[data-feed-monster]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.feedMonster, amount=button.dataset.feedAmount==='all'?save.xpWallet:10;
    try {
      const {save:next,reward}=feedMonster(save,id,amount);
      persist(next);
      const message=`${monsterFor(id).name}に${reward.xp} XP！${reward.evolved?' 進化した！':reward.leveledUp?` Lv.${reward.after.level}になった！`:''}`;
      renderCollection(message);
    } catch(error) { $('#feed-feedback').textContent=error.message; }
  }));
  $('#phrase-grid').innerHTML=summary.entries.map(({phrase,entry,level})=>`<article class="phrase-card"><strong>${escapeHtml(phrase.label)}</strong><p>${escapeHtml(phrase.expression)}</p><div class="phrase-progress" aria-label="習得レベル ${level} / 3">${[1,2,3].map(index=>`<span class="${index<=level?'full':''}"></span>`).join('')}</div><p>${level===3?'MASTER · 別の場面と別の日でも使えた':level===2?'自力で言えた · 次は別場面と後日の確認':level===1?'練習中 · まずヒントなしで言ってみよう':'これから出会う表現'}${entry?.nextReviewDay?' · 次の目安 '+escapeHtml(entry.nextReviewDay):''}</p></article>`).join('');
  if ($('#collection-view').hidden) showView('collection');
}

$$('[data-difficulty]').forEach(button => button.addEventListener('click', () => {
  persist(chooseDifficulty(save, button.dataset.difficulty));
  renderDifficulty();
}));
$$('[data-start]').forEach(button=>button.addEventListener('click',()=>startSession(button.dataset.start)));
$('#start-forest').addEventListener('click',()=>startSession('forest'));
$('#start-forest-endless').addEventListener('click',()=>startSession('forest-endless'));
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
