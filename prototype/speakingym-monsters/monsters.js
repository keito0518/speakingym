import { MONSTERS, PHRASES, PROMPTS } from './monster-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, chooseDifficulty, compareWithExamples, createSave, dayKey, feedMonster, finishRound, getMonsterProgress, learningSummary, masteryLevel, recordAnswer, selectMonster, selectRoundPrompts, validateSave } from './monster-engine.js';
import { monsterArt } from './monster-art.js';
import { gradeLocalResponse } from './monster-grader.js';

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
    button.textContent=mode==='listening'?'■':'🎙';
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
  $('#hero-monster-name').textContent = (growth.evolved ? creature.evolvedName : creature.name) + (growth.evolved ? ' ✨' : '');
  $('#hero-monster-species').textContent = `${creature.japaneseName} · ${creature.roots.map(root=>root.word).join(' + ')}`;
  $('#hero-level').textContent = `Lv.${growth.level}`;
  $('#hero-xp-fill').style.width = `${100 - growth.toNextLevel / XP_PER_LEVEL * 100}%`;
  $('#hero-next-level').textContent = growth.evolved ? `進化済み · あと${growth.toNextLevel} XPで次のレベル` : `あと${growth.toNextLevel} XPでレベルアップ · 160 XPで進化`;
  $('#home-wallet').textContent = save.xpWallet;
  $('#stat-independent').innerHTML = `${summary.independent}<span> / ${summary.total}</span>`;
  $('#stat-review').textContent = summary.reviewCount;
  $('#stat-monsters').innerHTML = `${save.ownedMonsters.length}<span> / ${MONSTERS.length}</span>`;
  $('#hero-vocab').innerHTML = creature.roots.map(root=>`<span class="vocab-chip"><strong>${escapeHtml(root.word)}</strong> <span>${escapeHtml(root.meaning)}</span></span>`).join('');
  renderDifficulty();
  showView('home');
}
function startSession(mode) {
  clearTimer(); stopAudio();
  const difficulty = save.difficulty;
  // Higher levels require more reading; adjust 60-second challenge length.
  const promptCount = mode === 'challenge' ? {easy:6,normal:4,hard:3}[difficulty] : 3;
  play = { mode, difficulty, prompts: selectRoundPrompts(save,promptCount,Math.random,dayKey(),difficulty), index:0, smooth:0, earnedXp:0, captured:[], hintUsed:false, revealed:false, speechState:'', startedAt:Date.now(), deadline:mode==='challenge'?Date.now()+60000:null };
  $('#play-mode-label').textContent = `${mode === 'challenge' ? '60秒チャレンジ' : '練習モード'} · ${difficultyCopy[difficulty].label}`;
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
function renderQuestion() {
  if (!play) return;
  stopAudio();
  play.hintUsed=false;play.revealed=false;play.speechState='';
  const prompt=currentPrompt();
  if (!prompt) {finishSession();return;}
  $('#play-progress-fill').style.width=`${100*play.index/play.prompts.length}%`;
  const englishMode = play.difficulty !== 'easy';
  const questionBody = englishMode
    ? `<p class="scenario-label">SITUATION</p><h1 class="english-situation" lang="en">${escapeHtml(prompt.cue)}</h1><div class="task-panel"><strong>YOUR TASK</strong><p lang="en">${escapeHtml(prompt.task)}</p></div><p class="question-caption" lang="en">${escapeHtml(prompt.scene)} · Respond aloud in your own words.</p>`
    : `<h1 lang="ja">${escapeHtml(prompt.cue)}</h1><p class="question-caption">${escapeHtml(prompt.scene)} · 正解の形は1つじゃない。まず声に出そう。</p>`;
  $('#play-card').innerHTML=`<div class="question-top"><span>QUESTION ${play.index+1} / ${play.prompts.length}</span><span class="question-tag">${englishMode?'ENGLISH → ENGLISH':prompt.kind==='listen'?'LISTEN & RESPOND':'JAPANESE → ENGLISH'}</span></div>${questionBody}${prompt.kind==='listen'?'<button class="listen-control" id="play-audio">▶ 相手の英語を聞く</button><button class="hint-button" id="reveal-transcript" style="display:block">音声が聞こえない場合</button><p class="transcript-fallback" id="transcript" hidden></p>':''}`;
  $('#answer-area').innerHTML=`<label class="answer-label" for="spoken-answer">英語で答えよう（音声認識または入力）</label><div class="answer-row"><input id="spoken-answer" class="answer-input" autocomplete="off" autocapitalize="sentences" placeholder="ここに英語を入力してもOK"><button id="mic-button" type="button" class="mic-button" title="マイクで話す" aria-label="マイクで話す" aria-pressed="false">🎙</button></div><button id="retry-mic" type="button" class="retry-mic" hidden>↻ 録音し直す</button><p id="speech-helper" class="answer-helper">マイクが使えないときは英文を入力して判定できます。</p><div class="learning-controls"><button class="hint-button" id="show-hint">ヒントを見る</button><button class="reveal-button" id="show-answer">答えを判定する →</button></div><div id="hint-panel" class="hint-box" hidden></div><div id="feedback-panel"></div>`;
  $('#mic-button').addEventListener('click',startRecognition);
  $('#retry-mic').addEventListener('click',()=>{
    if(!play || play.revealed)return;
    $('#spoken-answer').value='';
    micView('ready');startRecognition();
  });
  $('#show-hint').addEventListener('click',showHint);
  $('#show-answer').addEventListener('click',gradeAnswer);
  $('#spoken-answer').addEventListener('keydown',event=>{if(event.key==='Enter')gradeAnswer();});
  $('#spoken-answer').addEventListener('input',()=>{if(!recognition)micView('ready');});
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
    instance.lang='en-US';instance.interimResults=false;instance.continuous=false;instance.maxAlternatives=1;
    instance.onresult=event=>{
      if(recognition!==instance || play!==session || !$('#spoken-answer'))return;
      const transcript=[...event.results].map(result=>result[0]?.transcript||'').join(' ').trim();
      if(transcript){
        $('#spoken-answer').value=transcript;
        if(helper)helper.textContent='聞き取った英文を表示しました。確認して「答えを判定する」を押してね。';
        stopRecognition('captured');
      }
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
      stopRecognition($('#spoken-answer')?.value.trim()?'captured':'ready');
      if(helper && !$('#spoken-answer')?.value.trim())helper.textContent='録音が終了しました。もう一度マイクを押すか英文を入力してね。';
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
function gradeAnswer() {
  if(!play || play.revealed)return;
  stopRecognition('done');
  const prompt=currentPrompt(),raw=$('#spoken-answer').value.trim();
  const grade=gradeLocalResponse(prompt,raw);
  if(grade.status!=='correct'){
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
  $('#feedback-panel').innerHTML=`<div class="feedback-box grading-correct" role="status"><div class="feedback-head">✓ 内容を確認できた！ +${reward.xp} XP</div><div class="feedback-answer">${escapeHtml(prompt.answer)}</div><div class="feedback-note">使える表現の一例。 ${escapeHtml(prompt.tip || phraseFor(prompt.phraseId).tip)}<p>※教材ごとの簡易判定です。発音や自由な言い回しを完全に採点するものではありません。</p></div><button id="next-question" class="grading-next">次の問題へ →</button></div>`;
  $('#next-question').addEventListener('click',advanceQuestion);
}
function skipAnswer(){
  if(!play || play.revealed)return;
  const prompt=currentPrompt(),{save:next}=recordAnswer(save,prompt.id,'again');
  persist(next);
  play.revealed=true;stopAudio();
  $('#show-answer').disabled=true;$('#show-hint').disabled=true;$('#spoken-answer').disabled=true;micView('done');
  $('#feedback-panel').innerHTML=`<div class="feedback-box" role="status"><div class="feedback-head">例文を確認しよう · 0 XP</div><div class="feedback-answer">${escapeHtml(prompt.answer)}</div><p class="feedback-note">${escapeHtml(prompt.tip || phraseFor(prompt.phraseId).tip)}</p><button id="next-question" class="grading-next">次の問題へ →</button></div>`;
  $('#next-question').addEventListener('click',advanceQuestion);
}
function advanceQuestion(){
  if(!play || !play.revealed)return;
  play.index++;
  if(play.index===play.prompts.length){finishSession();return;}
  if(play.deadline && Date.now()>=play.deadline){finishSession(true);return;}
  renderQuestion();updateClock();
}
function finishSession(timedOut=false) {
  if(!play)return;
  const ended=play;play=null;clearTimer();stopAudio();
  if(ended.mode==='challenge')persist(finishRound(save,ended.smooth));
  $('#result-title').textContent=ended.smooth>=4?'すごい！言葉が出てきたね。':'今日の一歩、しっかり前進。';
  $('#result-description').textContent=timedOut?'60秒おつかれさま！ 言えなかった表現は、次の練習で取り戻そう。':'練習した表現は、別の場面や後日の復習でも使ってみよう。';
  $('#result-rewards').innerHTML=`<span class="reward-pill">自力で言えた ${ended.smooth} / ${ended.index}</span><span class="reward-pill">+${ended.earnedXp} XP ストック！</span><span class="reward-pill">使えるXP ${save.xpWallet}</span><span class="reward-pill">仲間 ${save.ownedMonsters.length} / ${MONSTERS.length}</span>`;
  $('#result-discoveries').innerHTML=[...new Set(ended.captured)].map(id=>{const creature=monsterFor(id);return `<div class="discovery-card">${monsterArt(id)}<div><strong>${escapeHtml(creature.name)}が仲間入り！</strong><p>${escapeHtml(creature.kind)} · 図鑑に追加</p></div></div>`;}).join('');
  $('#replay-run').textContent=ended.mode==='challenge'?'もう一度60秒に挑む':'別の表現も練習する';
  $('#replay-run').onclick=()=>startSession(ended.mode);
  showView('result');
}
function renderCollection(message = '') {
  const summary=learningSummary(save);
  $('#collection-wallet').textContent = `${save.xpWallet} XP`;
  $('#feed-feedback').textContent = message;
  $('#collection-grid').innerHTML=MONSTERS.map(creature=>{
    const owned=save.ownedMonsters.includes(creature.id), active=save.selectedMonster===creature.id;
    const growth=getMonsterProgress(save,creature.id);
    const unlock=creature.masteryUnlock!==undefined?`MASTER ${creature.masteryUnlock}表現で出会える`:`自力で${creature.unlock}表現を話せると出会える`;
    const walletActions=`<div class="feed-actions"><button data-feed-monster="${creature.id}" data-feed-amount="10" ${save.xpWallet<10?'disabled':''}>+10 XP</button><button data-feed-monster="${creature.id}" data-feed-amount="all" ${save.xpWallet<1?'disabled':''}>全部あげる</button></div>`;
    const displayName = growth.evolved ? creature.evolvedName : creature.name;
    const roots = creature.roots.map(root=>`<div class="word-row"><span><b lang="en">${escapeHtml(root.word)}</b><small>${escapeHtml(root.meaning)}</small></span><button type="button" class="word-audio" data-pronounce-word="${escapeHtml(root.word)}" aria-label="${escapeHtml(root.word)} の発音を聞く">▶ 聞く</button></div>`).join('');
    return `<article class="monster-card ${owned?'':'locked'}"><div class="monster-picture">${monsterArt(creature.id,owned&&growth.evolved)}</div><h3 lang="en">${owned?escapeHtml(displayName):'???'}</h3><p class="monster-japanese">${owned?escapeHtml(creature.japaneseName+' · '+creature.kind):escapeHtml(unlock)}</p>${owned?`<p class="monster-note">${escapeHtml(creature.note)}</p><div class="word-roots"><strong>NAME ORIGIN · 名前の由来</strong>${roots}</div><div class="monster-skill"><span>固有能力</span><strong lang="en">???</strong><small>集める楽しさにつながる能力を検討中！</small></div><span class="mini-tag">Lv.${growth.level} ${growth.evolved?'· 進化済み':''}</span><div class="mini-xp-track"><span style="width:${100-growth.toNextLevel/XP_PER_LEVEL*100}%"></span></div><div class="monster-card-tools"><button class="select-companion" data-select-monster="${creature.id}" ${active?'disabled':''}>${active?'ホームに表示中':'ホームに表示'}</button>${walletActions}</div>`:'<span class="mini-tag">未発見</span>'}</article>`;
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
      const message=`${monsterFor(id).name}に${reward.xp} XP！${reward.evolved?' ✨進化した！':reward.leveledUp?` Lv.${reward.after.level}になった！`:''}`;
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
$('#open-collection').addEventListener('click',()=>renderCollection());
$('#open-wallet').addEventListener('click',()=>renderCollection());
$('#leave-play').addEventListener('click',()=>{clearTimer();stopAudio();play=null;renderHome();});
$('#result-home').addEventListener('click',renderHome);
$('#result-collection').addEventListener('click',()=>renderCollection());
$('#collection-home').addEventListener('click',renderHome);
persist(save);
window.addEventListener('pagehide',()=>stopAudio());
document.addEventListener('visibilitychange',()=>{if(document.hidden && recognition)stopRecognition();});
renderHome();
