import { MONSTERS, PHRASES, PROMPTS } from './monster-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, compareWithExamples, createSave, dayKey, finishRound, getMonsterProgress, learningSummary, masteryLevel, recordAnswer, selectMonster, selectRoundPrompts, validateSave } from './monster-engine.js';
import { monsterArt } from './monster-art.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const phraseFor = id => PHRASES.find(phrase => phrase.id === id);
const monsterFor = id => MONSTERS.find(monster => monster.id === id);
let save = loadSave() || createSave();
let play = null, timer = null, recognition = null;

function loadSave() {
  try { return validateSave(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
  catch { return null; }
}
function persist(next = save) {
  save = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); $('#save-note').textContent = '学習記録はこの端末に保存されます'; }
  catch { $('#save-note').textContent = '保存できない環境です。このタブを閉じると進捗が消えます'; }
}
function stopAudio() {
  try { recognition?.abort(); } catch {}
  recognition = null;
  try { speechSynthesis?.cancel(); } catch {}
}
function clearTimer() { if (timer) clearInterval(timer); timer = null; }
function showView(name) {
  for (const id of ['home','play','result','collection']) $(`#${id}-view`).hidden = id !== name;
  window.scrollTo({top:0,behavior:'instant'});
}
function renderHome() {
  const creature = monsterFor(save.selectedMonster), growth = getMonsterProgress(save), summary = learningSummary(save);
  $('#hero-monster-art').innerHTML = monsterArt(creature.id,growth.evolved);
  $('#hero-monster-name').textContent = creature.name + (growth.evolved ? ' ✨' : '');
  $('#hero-monster-species').textContent = creature.kind;
  $('#hero-level').textContent = `Lv.${growth.level}`;
  $('#hero-xp-fill').style.width = `${100 - growth.toNextLevel / XP_PER_LEVEL * 100}%`;
  $('#hero-next-level').textContent = growth.evolved ? `進化済み · あと${growth.toNextLevel} XPで次のレベル` : `あと${growth.toNextLevel} XPでレベルアップ · 160 XPで進化`;
  $('#stat-independent').innerHTML = `${summary.independent}<span> / ${summary.total}</span>`;
  $('#stat-review').textContent = summary.reviewCount;
  $('#stat-monsters').innerHTML = `${save.ownedMonsters.length}<span> / ${MONSTERS.length}</span>`;
  showView('home');
}
function startSession(mode) {
  clearTimer(); stopAudio();
  const promptCount = mode === 'challenge' ? 6 : 3;
  play = { mode, prompts: selectRoundPrompts(save,promptCount), index:0, smooth:0, earnedXp:0, captured:[], evolved:false, hintUsed:false, revealed:false, speechState:'', startedAt:Date.now(), deadline:mode==='challenge'?Date.now()+60000:null };
  $('#play-mode-label').textContent = mode === 'challenge' ? '60秒チャレンジ' : '練習モード';
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
  $('#play-card').innerHTML=`<div class="question-top"><span>QUESTION ${play.index+1} / ${play.prompts.length}</span><span class="question-tag">${prompt.kind==='listen'?'LISTEN & RESPOND':'SPEAK IN ENGLISH'}</span></div><h1>${escapeHtml(prompt.cue)}</h1><p class="question-caption">${escapeHtml(prompt.scene)} · 正解の形は1つじゃない。まず声に出そう。</p>${prompt.kind==='listen'?'<button class="listen-control" id="play-audio">▶ 相手の英語を聞く</button><button class="hint-button" id="reveal-transcript" style="display:block">音声が聞こえない場合</button><p class="transcript-fallback" id="transcript" hidden></p>':''}`;
  $('#answer-area').innerHTML=`<label class="answer-label" for="spoken-answer">声に出してから、認識結果または入力文を確認</label><div class="answer-row"><input id="spoken-answer" class="answer-input" autocomplete="off" autocapitalize="sentences" placeholder="ここに英語を入力してもOK"><button id="mic-button" class="mic-button" title="マイクで話す" aria-label="マイクで話す">🎙</button></div><p id="speech-helper" class="answer-helper">マイクが使えなければ、声に出したあと入力なしで答え合わせもできます。</p><div class="learning-controls"><button class="hint-button" id="show-hint">ヒントを見る</button><button class="reveal-button" id="show-answer">答えを確認する →</button></div><div id="hint-panel" class="hint-box" hidden></div><div id="feedback-panel"></div>`;
  $('#mic-button').addEventListener('click',startRecognition);
  $('#show-hint').addEventListener('click',showHint);
  $('#show-answer').addEventListener('click',revealAnswer);
  $('#spoken-answer').addEventListener('keydown',event=>{if(event.key==='Enter')revealAnswer();});
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
  const Constructor=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Constructor){$('#speech-helper').textContent='このブラウザでは音声認識を利用できません。声に出してから自分で確認、または英文を入力してください。';return;}
  try{
    if(recognition){recognition.stop();recognition=null;return;}
    recognition=new Constructor();recognition.lang='en-US';recognition.interimResults=false;
    recognition.onresult=event=>{const transcript=[...event.results].map(result=>result[0].transcript).join(' ').trim();$('#spoken-answer').value=transcript;$('#speech-helper').textContent='聞き取った英語を表示しました。内容を確認して答え合わせへ。';};
    recognition.onerror=()=>{$('#speech-helper').textContent='聞き取れませんでした。英文を入力するか、自分で答え合わせしてください。';};
    recognition.onend=()=>{recognition=null;$('#mic-button').classList.remove('active');};
    recognition.start();$('#mic-button').classList.add('active');$('#speech-helper').textContent='聞き取り中… 話したら結果を確認してください。';
  }catch{$('#speech-helper').textContent='マイクを開始できません。入力または自己チェックで続けられます。';recognition=null;}
}
function showHint() {
  const phrase=phraseFor(currentPrompt().phraseId);play.hintUsed=true;
  $('#hint-panel').hidden=false;$('#hint-panel').textContent=`ヒント：${phrase.hint}　${phrase.tip}`;
}
function revealAnswer() {
  if(!play || play.revealed)return;
  play.revealed=true;stopAudio();
  const prompt=currentPrompt(), raw=$('#spoken-answer').value;
  const match=compareWithExamples(prompt,raw);
  $('#show-answer').disabled=true;$('#show-hint').disabled=true;$('#mic-button').disabled=true;
  $('#feedback-panel').innerHTML=`<div class="feedback-box"><div class="feedback-head">使える表現の一例</div><div class="feedback-answer">${escapeHtml(prompt.answer)}</div><div class="feedback-note">${escapeHtml(phraseFor(prompt.phraseId).tip)}${match.matchesExample?' 入力した英文は登録例文と一致しました。':' 自然な言い方は複数あります。表示例文と比べてみよう。'}</div></div><p class="rating-legend">実際にどれくらい自力で話せた？（自己チェック・自動採点ではありません）</p><div class="rating-row"><button class="rating-button best" data-rating="smooth">自力で言えた！</button><button class="rating-button" data-rating="hint">ヒントで言えた</button><button class="rating-button" data-rating="again">まだ難しい</button></div>`;
  $$('.rating-button').forEach(button=>button.addEventListener('click',()=>rateAnswer(button.dataset.rating)));
}
function rateAnswer(rating) {
  if(!play || !play.revealed)return;
  const prompt=currentPrompt();
  const effectiveRating=rating==='smooth'&&play.hintUsed?'hint':rating;
  const {save:next,reward}=recordAnswer(save,prompt.id,effectiveRating);
  persist(next);
  play.earnedXp+=reward.xp;
  play.captured.push(...reward.captured);
  if(reward.evolved)play.evolved=true;
  if(effectiveRating==='smooth')play.smooth++;
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
  $('#result-rewards').innerHTML=`<span class="reward-pill">自力で言えた ${ended.smooth} / ${ended.index}</span><span class="reward-pill">+${ended.earnedXp} XP</span><span class="reward-pill">仲間 ${save.ownedMonsters.length} / ${MONSTERS.length}</span>`;
  $('#result-discoveries').innerHTML=[...new Set(ended.captured)].map(id=>{const creature=monsterFor(id);return `<div class="discovery-card">${monsterArt(id)}<div><strong>${escapeHtml(creature.name)}が仲間入り！</strong><p>${escapeHtml(creature.kind)} · 図鑑に追加</p></div></div>`;}).join('')+(ended.evolved?'<p class="reward-pill">✨ 相棒が進化した！</p>':'');
  $('#replay-run').textContent=ended.mode==='challenge'?'もう一度60秒に挑む':'別の表現も練習する';
  $('#replay-run').onclick=()=>startSession(ended.mode);
  showView('result');
}
function renderCollection() {
  const summary=learningSummary(save);
  $('#collection-grid').innerHTML=MONSTERS.map(creature=>{
    const owned=save.ownedMonsters.includes(creature.id), active=save.selectedMonster===creature.id;
    const growth=getMonsterProgress(save,creature.id);
    const unlock=creature.masteryUnlock!==undefined?`MASTER ${creature.masteryUnlock}表現で出会える`:`自力で${creature.unlock}表現を話せると出会える`;
    return `<article class="monster-card ${owned?'':'locked'}"><div class="monster-picture">${monsterArt(creature.id,owned&&growth.evolved)}</div><h3>${owned?escapeHtml(creature.name):'？？？'}</h3><p>${owned?escapeHtml(creature.kind+' · '+creature.note):escapeHtml(unlock)}</p>${owned?`<span class="mini-tag">Lv.${growth.level} ${growth.evolved?'· 進化済み':''}</span><br><button data-select-monster="${creature.id}" ${active?'disabled':''}>${active?'育成中':'この子を育てる'}</button>`:'<span class="mini-tag">未発見</span>'}</article>`;
  }).join('');
  $$('[data-select-monster]').forEach(button=>button.addEventListener('click',()=>{persist(selectMonster(save,button.dataset.selectMonster));renderCollection();}));
  $('#phrase-grid').innerHTML=summary.entries.map(({phrase,entry,level})=>`<article class="phrase-card"><strong>${escapeHtml(phrase.label)}</strong><p>${escapeHtml(phrase.expression)}</p><div class="phrase-progress" aria-label="習得レベル ${level} / 3">${[1,2,3].map(index=>`<span class="${index<=level?'full':''}"></span>`).join('')}</div><p>${level===3?'MASTER · 別の場面と別の日でも使えた':level===2?'自力で言えた · 次は別場面と後日の確認':level===1?'練習中 · まずヒントなしで言ってみよう':'これから出会う表現'}${entry?.nextReviewDay?' · 次の目安 '+escapeHtml(entry.nextReviewDay):''}</p></article>`).join('');
  showView('collection');
}

$$('[data-start]').forEach(button=>button.addEventListener('click',()=>startSession(button.dataset.start)));
$('#open-collection').addEventListener('click',renderCollection);
$('#leave-play').addEventListener('click',()=>{clearTimer();stopAudio();play=null;renderHome();});
$('#result-home').addEventListener('click',renderHome);
$('#collection-home').addEventListener('click',renderHome);
persist(save);
renderHome();
