import { ALL_PROMPTS, MONSTERS, PHRASES, PROMPTS } from './monster-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, chooseDifficulty, createSave, dayKey, finishRound, getMonsterProgress, learningSummary, reviewOverview, quizWeaknessOverview, recordAnswer, toggleSavedPrompt, savedReviewPrompts, savedReviewQueue, captureEligibleMonsters, flagUncertainReview, selectRoundPrompts, validateSave } from './monster-engine.js';
import { monsterArt } from './monster-art.js';
import { gradeLocalResponse } from './monster-grader.js';
import { STAGING_SEMANTIC_GRADER_ENDPOINT, askSemanticGrader } from './semantic-client.js';
import { cleanForest, FOREST_ROUTES, FOREST_RELICS, FOREST_AREAS, unlockedForestAreas, nextForestArea, finishForest, recordForestEvent } from './forest-engine.js';
import { forestWorldArt } from './forest-world.js';
import { buildForestWave, DIFFICULTY_TRIES, opponentFor, enemyTacticFor, FOREST_WAVE_LENGTH, REGULAR_ENCOUNTERS, BOSS_HITS, specialStrike, regularEncountersFor, forestWaveLengthFor } from './forest-battle.js';
import { enemyArt } from './forest-enemies.js';
import { battleArenaArt, guardArt, relicArt } from './game-visuals.js';
import { createCollectionViews } from './monster-collection.js';
import { quizControlsHtml, wireQuizControls } from './forest-quiz-ui.js';
import { listeningChallengeFor } from './listening-challenges.js';
import { LISTENING_AUDIO } from './listening-audio-manifest.js';
import { quizTeachingFor } from './forest-teaching.js';
import { speakingFeedbackFor } from './speaking-feedback.js';
import { forestBossPhase } from './forest-boss-phases.js';
import { forestEventFor, forestEventChoice } from './forest-events.js';

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
function quizTeachingHtml(prompt,learnerAnswer=''){
  const note=quizTeachingFor(prompt);
  if(!note)return '';
  const contrast=learnerAnswer.trim()&&learnerAnswer.trim().toLowerCase()!==prompt.answer.toLowerCase()
    ? `<p class="forest-teaching-learner"><strong>今回の回答</strong> <span lang="en">${escapeHtml(learnerAnswer)}</span></p>`:'';
  return `<section class="forest-teaching feedback-note" aria-label="${escapeHtml(note.label)}"><strong class="forest-teaching-title">${escapeHtml(note.label)}</strong>${contrast}<p>${escapeHtml(note.clue)}</p><p>${escapeHtml(note.detail)}</p><p class="forest-teaching-transfer"><strong>別の場面でも使おう</strong> ${escapeHtml(note.transfer)}</p></section>`;
}
function speakingTeachingHtml(prompt,learnerAnswer='',reveal=false){
  const note=speakingFeedbackFor(prompt,learnerAnswer);
  if(!note)return '';
  const response=reveal?`<p class="forest-teaching-learner"><strong>今回の回答</strong> <span lang="en">${escapeHtml(learnerAnswer)}</span></p>`:'';
  const details=reveal?`<p>${escapeHtml(note.detail)}</p>`:'';
  return `<section class="forest-teaching feedback-note" aria-label="${escapeHtml(note.label)}"><strong class="forest-teaching-title">${escapeHtml(note.label)}</strong>${response}<p>${escapeHtml(note.clue)}</p>${details}</section>`;
}
let save = loadSave() || createSave();
let play = null, timer = null, recognition = null, recognitionWatchdog = null, recognitionStopping = false, autoAdvanceTimer = null, spokenAudio = null;

function cancelAutoAdvance(){
  if(autoAdvanceTimer!==null)clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer=null;
}
function queueAutoAdvance(callback,delay){
  cancelAutoAdvance();
  const session=play,index=play?.index;
  autoAdvanceTimer=setTimeout(()=>{
    autoAdvanceTimer=null;
    if(play!==session||play?.index!==index||document.hidden)return;
    callback();
  },delay);
}
function queueForestEncounter(){
  if(play?.mode!=='forest'||!$('#forest-explore-options').hidden||!$('#forest-explore-event').hidden)return;
  queueAutoAdvance(()=>{
    if($('#play-view').classList.contains('forest-exploring')&&$('#forest-explore-options').hidden)renderQuestion();
  },1050);
}

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
  recognitionStopping=false;
  if(active)try{active.abort();}catch{}
  if(mode==='done')$('#spoken-answer')?.classList.remove('transcript-interim');
  micView(mode);
}
function finishRecognition(){
  // A deliberate STOP must call stop(), not abort(): on iOS/WebKit abort()
  // discards speech still waiting to be delivered by onresult/onend.
  const active=recognition,helper=$('#speech-helper');
  if(!active||recognitionStopping)return;
  recognitionStopping=true;
  micView('ready');
  if(helper)helper.textContent='文字起こしを確定中です。英語が表示されてから判定してね。';
  if(recognitionWatchdog)clearTimeout(recognitionWatchdog);
  recognitionWatchdog=setTimeout(()=>{
    if(recognition!==active)return;
    const text=$('#spoken-answer')?.value.trim();
    stopRecognition(text?'captured':'ready');
    if(helper)helper.textContent=text
      ?'聞き取れた部分を残しました。英文を確認して判定してね。'
      :'音声を文字にできませんでした。Safariで開くか、iPhoneのキーボードの音声入力も試してね。';
  },4500);
  try{active.stop();}catch{
    const text=$('#spoken-answer')?.value.trim();
    stopRecognition(text?'captured':'ready');
    if(helper)helper.textContent=text?'聞き取れた英文を確認して判定してね。':'音声を文字にできませんでした。英文入力も利用できます。';
  }
}
function stopAudio() {
  stopRecognition('done');
  stopListeningPlayback();
}
function stopListeningPlayback(){
  const previous=spokenAudio;
  spokenAudio=null;
  if(previous){
    previous.onerror=null;
    previous.onended=null;
    try{previous.pause();previous.removeAttribute('src');previous.load();}catch{}
  }
  try { window.speechSynthesis?.cancel(); } catch {}
}
function clearTimer() { if (timer) clearInterval(timer); timer = null; }
function showView(name) {
  cancelAutoAdvance();
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
  const bookmarked=savedReviewQueue(save);
  const needsReview=bookmarked.filter(item=>item.due);
  $('#start-saved-review').disabled=!bookmarked.length;
  $('#start-saved-review').textContent=`保存した問題を解く（${bookmarked.length}問）`;
  $('#start-due-saved-review').disabled=!needsReview.length;
  $('#start-due-saved-review').textContent=`要復習から練習（${needsReview.length}問）`;
  $('#saved-question-list').innerHTML=bookmarked.length?bookmarked.map(({prompt,due,weak})=>
    `<div class="saved-question"><span>${escapeHtml(prompt.scene)} · ${escapeHtml(prompt.difficulty||'easy')} · ${due?'今日の復習':weak?'苦手を練習':'保存済み'}</span><strong>${escapeHtml(prompt.cue)}</strong><button type="button" data-remove-saved="${escapeHtml(prompt.id)}" aria-label="${escapeHtml(prompt.scene)}の保存を解除">保存解除</button></div>`).join(''):'<p class="review-journal-empty">まだ保存した問題はありません。問題画面の「☆ 問題を保存」から追加できるよ。</p>';
  $$('[data-remove-saved]').forEach(button=>button.addEventListener('click',()=>{persist(toggleSavedPrompt(save,button.dataset.removeSaved));renderHome();}));
  const forest=cleanForest(save.forest);
  $('#forest-home-progress').textContent = `攻略 ${forest.completedAreas.length}/${FOREST_AREAS.length}エリア · 討伐 ${forest.clears}回 · 宝物 ${forest.relics.length}個`;
  const unlocked=new Set(unlockedForestAreas(save).map(area=>area.id));
  $('#forest-area-list').innerHTML=FOREST_AREAS.map((area,index)=>{
    const cleared=forest.completedAreas.includes(area.id),open=unlocked.has(area.id);
    return `<button type="button" class="forest-area-card" data-enter-forest="${area.id}" ${open?'':'disabled'} aria-label="${escapeHtml(area.name)} ${cleared?'攻略済み':open?'挑戦可能':'未解放'}"><span class="forest-area-number">${String(index+1).padStart(2,'0')}</span><span class="forest-area-copy"><strong>${escapeHtml(area.name)}</strong><small>${escapeHtml(area.goal)} · ${forestWaveLengthFor(area.id)}問（通常${regularEncountersFor(area.id)}＋確認3）</small></span><span class="forest-area-status">${cleared?'CLEAR':open?'挑戦する':'LOCKED'}</span></button>`;
  }).join('');
  $$('[data-enter-forest]').forEach(button=>button.addEventListener('click',()=>startSession('forest',button.dataset.enterForest)));
  $('#start-forest').textContent=forest.completedAreas.length===FOREST_AREAS.length?'森をもう一度冒険':`次へ：${nextForestArea(save).name}`;
  const weak=quizWeaknessOverview(save);
  const weakSummary=$('#forest-weakness-summary');
  weakSummary.hidden=weak.due.length===0&&weak.upcoming.length===0;
  weakSummary.textContent=weak.due.length?`苦手の復習 ${weak.due.length}問 · 次の冒険で優先出題するよ。`:`苦手の復習 ${weak.upcoming.length}問 · 次の復習日にもう一度挑戦しよう。`;
  $('#stat-independent').innerHTML = `${summary.independent}<span> / ${summary.total}</span>`;
  $('#stat-review').textContent = summary.reviewCount;
  const journal=reviewOverview(save);
  $('#review-due-count').textContent=String(journal.due.length);
  $('#review-upcoming-count').textContent=String(journal.upcoming.length);
  $('#review-mastered-count').textContent=String(journal.mastered);
  $('#review-mastery-meter').setAttribute('aria-valuenow',String(journal.learned));
  $('#review-mastery-meter').setAttribute('aria-valuemax',String(journal.total));
  $('#review-mastery-fill').style.width=`${Math.round(journal.learned/journal.total*100)}%`;
  $('#review-mastery-description').textContent=`ヒントなしで使えた表現 ${journal.learned}/${journal.total}。別の日・別の場面でも使えると定着が進みます。`;
  const top=[...journal.due,...journal.upcoming].slice(0,3);
  $('#review-journal-list').innerHTML=top.length?top.map(entry=>
    `<div class="review-journal-entry"><strong>${escapeHtml(entry.label)}</strong><span>${entry.dueNow?'今日の復習':'次の復習 '+escapeHtml(entry.due)}</span></div>`).join(''):
    '<p class="review-journal-empty">今日の復習はありません。新しい表現に挑戦してみよう。</p>';
  $('#start-review-practice').textContent=journal.due.length?'今日の復習をする':'英語を練習する';
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
function dueQuizWeaknessIds(){return quizWeaknessOverview(save).due.map(item=>item.id);}
function startSession(mode,requestedAreaId=null,onlyDue=false) {
  cancelAutoAdvance();clearTimer(); stopAudio();
  const difficulty=save.difficulty;
  const endless=mode==='forest-endless',forestMode=mode==='forest'||endless;
  if(mode==='saved'&&!savedReviewQueue(save).some(item=>!onlyDue||item.due)){renderHome();return;}
  const area=forestMode?(endless?FOREST_AREAS[0]:unlockedForestAreas(save).find(a=>a.id===requestedAreaId)||nextForestArea(save)):null;
  const promptCount=mode==='challenge'?{easy:6,normal:4,hard:3}[difficulty]:3;
  const firstWave=forestMode?buildForestWave({difficulty,wave:1,areaId:area.id,progression:endless?'endless':'story',previousIds:cleanForest(save.forest).recentPromptIds,reviewPhraseIds:dueForestPhrases(),reviewPromptIds:dueForestPromptIds(),quizWeaknessIds:dueQuizWeaknessIds(),bossConversation:true}):null;
  const prompts=forestMode?firstWave.prompts:mode==='saved'?savedReviewQueue(save).filter(item=>!onlyDue||item.due).map(item=>item.prompt):selectRoundPrompts(save,promptCount,Math.random,dayKey(),difficulty);
  play={mode:forestMode?'forest':mode,endless,areaId:area?.id||null,baseDifficulty:difficulty,difficulty:firstWave?.level||difficulty,
    prompts,index:0,wave:1,seenIds:[],remainingTries:0,encounterKey:null,eventChoices:{},eventMemories:[],
    bossHits:0,usedPower:false,usedShield:false,forestRelics:[],smooth:0,earnedXp:0,captured:[],hintUsed:false,
    revealed:false,speechState:'',startedAt:Date.now(),deadline:mode==='challenge'?Date.now()+60000:null,
    route:null,companionId:save.selectedMonster,combo:0};
  $('#play-mode-label').textContent=`${forestMode?(endless?'∞ 森のエンドレス':area.name):mode==='challenge'?'60秒チャレンジ':mode==='saved'?'保存した問題の復習':'練習モード'} · ${difficultyCopy[difficulty].label}`;
  $('#forest-journey').hidden=!forestMode;
  $('#forest-battle-log').hidden=!forestMode;
  $('#play-view').classList.toggle('forest-active',forestMode);
  $('#play-view').classList.toggle('review-only',mode==='saved');
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
function regularCount(){return regularEncountersFor(play?.areaId);}
function waveLength(){return forestWaveLengthFor(play?.areaId);}
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
  const arenaKey=play.areaId+':'+currentRoute+':'+(play.index>=regularCount()?'boss':'mob');
  if(world.dataset.renderedRoute!==arenaKey){
    $('#forest-world-backdrop').innerHTML=battleArenaArt(play.index>=regularCount());
    world.dataset.renderedRoute=arenaKey;
  }
  world.dataset.stage='arena';
  world.dataset.attack=companion.id;
  world.dataset.evolved=String(evolved);
  $('#forest-guard').innerHTML=guardArt();
  world.classList.toggle('forest-boss-stage',play.index>=regularCount());
  const area=FOREST_AREAS.find(a=>a.id===play.areaId);
  $('.forest-chapter-pin').textContent=play.index>=regularCount()?`${area.english} · BOSS`:area.english;
  world.classList.remove('forest-attack','forest-player-damaged','forest-boss-defeated','forest-guarding','forest-defended','forest-reading-hit','forest-weakness-hit','forest-spell-cast');
  const foe=opponentFor(play.index,play.wave,play.areaId);
  const tactic=enemyTacticFor(play.index,play.wave,play.areaId);
  const bossPhase=forestBossPhase({areaId:play.areaId,index:play.index,wave:play.wave,level:play.difficulty,prompt:currentPrompt()});
  world.dataset.bossPhase=bossPhase?String(bossPhase.turn):'0';
  world.dataset.bossPower=bossPhase?bossPhase.signature.id:'none';
  world.dataset.foe=foe.id;
  world.dataset.area=play.areaId;
  $('#forest-enemy').innerHTML=enemyArt(foe.id);
  // Separate the English name and Japanese epithet at a meaningful line break.
  $('#forest-foe-name').innerHTML=`<span class="forest-foe-english">${escapeHtml(foe.name)}</span><span class="forest-foe-japanese">${escapeHtml(foe.japanese)}</span>`;
  $('#forest-foe-pattern').textContent=bossPhase?`${tactic.name} · ${bossPhase.signature.name}`:tactic.name;
  updateEnemyHealth();
  $('#forest-tries').textContent=play.endless?`あと${play.remainingTries}回 · ${difficultyCopy[play.difficulty].label}`:
    '英語で攻撃！';
  $('#forest-world-fx').textContent='';
  $('#forest-combo').textContent='';
  world.classList.remove('forest-combo-boost');
  world.dataset.route=currentRoute;
  $('#forest-world-counter').textContent=play.index>=regularCount()?`WAVE ${play.wave} · BOSS ${play.bossHits+1}/${BOSS_HITS}`:`WAVE ${play.wave} · BATTLE ${play.index+1}/${regularCount()}`;
  const bar=$('#forest-gates');
  if(bar){
    const wanted=regularCount();
    if(bar.dataset.count!==String(wanted)){
      bar.dataset.count=String(wanted);
      bar.innerHTML=Array.from({length:wanted},(_,i)=>`<span class="forest-gate" data-forest-gate="${i}">${i+1}</span>`).join('')+
        '<span class="forest-gate forest-boss-gate" data-forest-boss="true">BOSS</span>';
      bar.setAttribute('aria-label',`${wanted}問の練習とボス戦`);
    }
  }
  const route=FOREST_ROUTES.find(entry=>entry.id===play.route);
  $('#forest-route-status').textContent=route ? route.name : '道を選ぶ前に、最初の関門へ';
  $$('[data-forest-gate]').forEach((node,index)=>{
    node.classList.toggle('is-current',play.index===index);
    node.classList.toggle('is-cleared',index<play.index);
    node.setAttribute('aria-current',play.index===index?'step':'false');
  });
  const bossMarker=$('[data-forest-boss]');
  bossMarker.classList.toggle('is-current',play.index>=regularCount());
  bossMarker.classList.toggle('is-cleared',play.index>=regularCount()+BOSS_HITS);
  $('#forest-scene-story').textContent=play.index>=regularCount()?`最後の確認：聞く・ことば・話す（${play.bossHits+1}/3）`:`${play.index+1}/${regularCount()}問 · 内容を理解して英語で答えよう。`;
  const log=$('#forest-battle-log');
  log.textContent=bossPhase?`最後の確認 ${bossPhase.turn}/3 · ${bossPhase.kind==='listen'?'聞き取り':bossPhase.kind==='speak'?'英語で話す':'言葉の問題'}`:'まず問題に集中しよう。';
}
function updateEnemyHealth(hit=false) {
  if(play?.mode!=='forest')return;
  const boss=play.index>=regularCount(),max=boss?BOSS_HITS:1;
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
  cancelAutoAdvance();
  stopAudio();
  const view=$('#play-view'), map=$('#forest-explore-art');
  const companion=monsterFor(play.companionId);
  const evolved=getMonsterProgress(save,play.companionId).evolved;
  const foe=opponentFor(play.index,play.wave,play.areaId);
  const area=FOREST_AREAS.find(a=>a.id===play.areaId);
  const isBoss=play.index>=regularCount();
  const stage=Math.min(4,Math.max(0,Math.round(4*play.index/Math.max(1,regularCount()))));
  map.innerHTML=forestWorldArt(play.route,play.areaId)+
    '<div class="forest-explore-companion">'+monsterArt(companion.id,evolved)+'</div>'+
    '<div class="forest-explore-destination" aria-hidden="true"></div>';
  map.dataset.step=String(stage);
  map.dataset.route=play.route||'wild';
  map.dataset.area=play.areaId;
  $('#forest-explore-screen').classList.toggle('boss-approach',isBoss);
  const storyEvent=routeChoice?null:forestEventFor({areaId:play.areaId,route:play.route,index:play.index});
  const storyKey=storyEvent?`${play.wave}:${storyEvent.id}`:null;
  const selected=storyEvent?forestEventChoice(storyEvent,play.eventChoices[storyKey]):null;
  $('#forest-explore-title').textContent=routeChoice?'分かれ道に到着':storyEvent?storyEvent.title:isBoss?`${area.name}のボスへ`:play.index===0?`${area.name}へ出発`:`${area.name} · ${play.index+1}戦目`;
  $('#forest-explore-description').textContent=routeChoice?'進む道を選ぼう。道によって見つかる宝物が変わるよ。':
    storyEvent?storyEvent.story:
    isBoss?'この先に森のボスが待っている。準備ができたら進もう。':
    play.index===0?`${area.story} 学習目標：${area.goal}。`:
    `${foe.japanese} の気配がする。次の戦闘へ進もう。`;
  const eventPanel=$('#forest-explore-event');
  eventPanel.hidden=!storyEvent;
  if(storyEvent){
    eventPanel.innerHTML=selected
      ? `<p class="forest-event-label">EXPEDITION MEMORY</p><strong>${escapeHtml(selected.memento)}</strong><p class="forest-event-outcome" role="status">${escapeHtml(selected.outcome)}</p><small>この選択によるXPや正誤判定の変化はありません。</small>`
      : `<p class="forest-event-label">STORY EVENT · 行動を選ぼう</p><div class="forest-event-choices">${storyEvent.options.map(choice=>
        `<button type="button" data-forest-event-option="${escapeHtml(choice.id)}"><strong>${escapeHtml(choice.label)}</strong><small>${escapeHtml(choice.detail)}</small></button>`).join('')}</div><small>どちらを選んでも英語の問題・XPは同じです。</small>`;
    if(!selected){
      $$('[data-forest-event-option]',eventPanel).forEach(button=>button.addEventListener('click',()=>{
        if(!play || play.mode!=='forest'||play.eventChoices[storyKey])return;
        const choice=forestEventChoice(storyEvent,button.dataset.forestEventOption);
        if(!choice)return;
        play.eventChoices[storyKey]=choice.id;
        persist(recordForestEvent(save,storyEvent.id,choice.id).save);
        play.eventMemories.push({title:storyEvent.title,memento:choice.memento,outcome:choice.outcome});
        showForestExplore(false);
      }));
    }
  }else eventPanel.innerHTML='';
  const options=$('#forest-explore-options');
  options.hidden=!routeChoice;
  options.innerHTML=routeChoice?FOREST_ROUTES.map(route=>
    `<button type="button" class="forest-explore-route" data-forest-route="${route.id}"><strong>${escapeHtml(route.name)}</strong><small>${escapeHtml(route.detail)}</small></button>`).join(''):'';
  const forward=$('#forest-explore-continue');
  forward.hidden=routeChoice;
  forward.textContent=storyEvent&&!selected?'物語をスキップして次の問題へ':isBoss?'最後の確認へ進む':storyEvent?'次の問題へ進む':play.index===0?'森へ出発する':'次の問題へ進む';
  if(routeChoice){
    $$('[data-forest-route]',options).forEach(button=>button.addEventListener('click',()=>{
      if(!play || play.mode!=='forest'||play.route)return;
      play.route=button.dataset.forestRoute;
      showForestExplore(false);
      queueForestEncounter();
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
  cancelAutoAdvance();
  $('#play-view').classList.remove('forest-exploring');
  $('#forest-explore-screen').hidden=true;
  $('#forest-journey').hidden=play.mode!=='forest';
  $('.forest-command-window').hidden=false;
  stopAudio();
  $('#answer-area').hidden=false;
  $('#forest-journey').classList.remove('forest-victory');
  play.hintUsed=false;play.revealed=false;play.speechState='';play.quizMissRecorded=false;
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
  const reviewing=!!(save.reviewPrompts?.[prompt.id] && save.reviewPrompts[prompt.id]<=dayKey());
  if(play.mode==='forest'){
    const style=prompt.kind==='listen'?'defense':prompt.kind==='read'?'reading':prompt.kind==='vocab'?'weakness':prompt.kind==='grammar'?'spell':'attack';
    $('#forest-world-stage').dataset.action=style;
    const move=forestBossPhase({areaId:play.areaId,index:play.index,wave:play.wave,level:play.difficulty,prompt});
    $('#forest-battle-log').textContent=style==='defense'?'音声を聞き、意味を選んだら英語で返そう。':style==='reading'?'文章を読んで英語で答えよう。':style==='weakness'?'文脈に合う単語を選ぼう。':style==='spell'?'単語を自然な語順に並べよう。':'自分の英語で意味を伝えよう。';
  }
  $('#play-progress-fill').style.width=`${100*play.index/play.prompts.length}%`;
  const englishMode = (prompt.difficulty||'easy')!=='easy';
  const quizMode=prompt.kind==='vocab'||prompt.kind==='grammar';
  const listenMode=prompt.kind==='listen';
  const comprehension=listenMode?listeningChallengeFor(prompt):null;
  play.listeningState=listenMode?{played:false,understood:false,misses:0,usedTranscript:false}:null;
  const questionBody = quizMode
    ? `<p class="scenario-label">${prompt.kind==='vocab'?'WORD WEAKNESS':'GRAMMAR MAGIC'}</p><h1 class="forest-quiz-question" lang="${englishMode?'en':'ja'}">${escapeHtml(prompt.cue)}</h1>${englishMode?`<div class="task-panel"><strong>YOUR TASK</strong><p lang="en">${escapeHtml(prompt.task)}</p></div>`:''}<p class="question-caption" ${englishMode?'lang="en"':''}>${escapeHtml(prompt.scene)} · ${englishMode?(prompt.kind==='vocab'?'Choose the word that fits.':'Put the words in order.'):(prompt.kind==='vocab'?'正しい単語で弱点を見つけよう':'正しい語順で魔法を完成させよう')}</p>`
    : englishMode
    ? `<p class="scenario-label">SITUATION</p><h1 class="english-situation" lang="en">${escapeHtml(prompt.cue)}</h1><div class="task-panel"><strong>YOUR TASK</strong><p lang="en">${escapeHtml(prompt.task)}</p></div><p class="question-caption" lang="en">${escapeHtml(prompt.scene)} · Respond aloud in your own words.</p>`
    : `<h1 lang="ja">${escapeHtml(prompt.cue)}</h1><p class="question-caption">${escapeHtml(prompt.scene)} · 正解の形は1つじゃない。まず声に出そう。</p>`;
  $('#play-card').dataset.promptId=prompt.id;
  const readingPassage=prompt.kind==='read'&&prompt.readText?`<div class="reading-passage" lang="en"><span>READ THE MESSAGE</span><p>${escapeHtml(prompt.readText)}</p></div>`:'';
  $('#play-card').innerHTML=`<div class="question-top"><span>${play.mode==='forest'?(play.index>=regularCount()?'BOSS ATTACK':'ENCOUNTER'):'QUESTION'} ${play.mode==='forest'?(play.index>=regularCount()?play.bossHits+1:play.index+1):play.index+1} / ${play.mode==='forest'?(play.index>=regularCount()?BOSS_HITS:regularCount()):play.prompts.length}</span><span class="question-tag">${play.mode==='forest'&&prompt.kind==='listen'?'LISTENING DEFENSE':play.mode==='forest'&&prompt.kind==='read'?'READING STRIKE':prompt.kind==='vocab'?'VOCAB WEAKNESS':prompt.kind==='grammar'?'GRAMMAR MAGIC':englishMode?'ENGLISH → ENGLISH':prompt.kind==='listen'?'LISTEN & RESPOND':'JAPANESE → ENGLISH'}</span></div>${listenMode?`<div class="listening-first" id="listening-first" data-level="${comprehension.level}"><p class="scenario-label">AUDIO FIRST · ${comprehension.level.toUpperCase()}</p><h1 class="listening-heading">${englishMode?'Listen first. Decide what you heard.':'英語を聞いて、意味を選ぼう。'}</h1><p class="question-caption">${englishMode?'Listen carefully before choosing. The English transcript is hidden.':'英語の文章は隠れています。音声を聞いてから意味を選んでね。'}</p><button type="button" class="listen-control listening-play" id="play-audio"><span class="audio-glyph" aria-hidden="true"></span> ${englishMode?'Play / replay audio':'英語を聞く・もう一度聞く'}</button><div id="listening-meaning" class="listening-meaning" hidden><p class="listening-check-title">${escapeHtml(comprehension.question)}</p><div class="listening-choices" role="group" aria-label="音声の意味を選択">${comprehension.options.map((choice,index)=>`<button type="button" class="listening-choice" data-listening-choice="${index}" lang="${englishMode?'en':'ja'}">${escapeHtml(choice)}</button>`).join('')}</div><p id="listening-status" class="listening-status" role="status" aria-live="polite">${englishMode?'Choose what you heard, then respond in English.':'聞き取れた内容を選ぼう。'}</p></div><button type="button" class="hint-button listening-fallback" id="reveal-transcript">${englishMode?'Audio unavailable? Show transcript (hint)':'音が出ない場合は英文を表示（ヒント扱い）'}</button><p class="transcript-fallback" id="transcript" lang="en" hidden></p><div class="listening-response" id="listening-response" hidden><p class="scenario-label">${englishMode?'YOUR REPLY':'次は英語で返そう'}</p>${questionBody}</div></div>`:`${readingPassage}${questionBody}`}`;
  const saved=save.savedPromptIds?.includes(prompt.id)||false;
  const bookmark=document.createElement('button');
  bookmark.type='button';bookmark.id='bookmark-question';bookmark.className='bookmark-question';
  bookmark.setAttribute('aria-pressed',String(saved));
  const bookmarkText=enabled=>englishMode?(enabled?'★ Saved':'☆ Save this question'):(enabled?'★ 保存済み':'☆ 問題を保存');
  bookmark.textContent=bookmarkText(saved);
  bookmark.addEventListener('click',()=>{
    persist(toggleSavedPrompt(save,prompt.id));
    const active=save.savedPromptIds.includes(prompt.id);
    bookmark.setAttribute('aria-pressed',String(active));
    bookmark.textContent=bookmarkText(active);
  });
  $('#play-card').querySelector('.question-top').after(bookmark);
  if(play.mode==='forest'&&quizMode&&quizWeaknessOverview(save).due.some(item=>item.id===prompt.id||item.baseId===(prompt.baseId||prompt.id))){
    const banner=document.createElement('p');
    banner.className='forest-review-banner';
    banner.textContent='苦手の再挑戦 · 前回つまずいたポイントを考えよう';
    $('#play-card').querySelector('.question-top').after(banner);
  }
  const bossTurn=play.mode==='forest'?forestBossPhase({areaId:play.areaId,index:play.index,wave:play.wave,level:play.difficulty,prompt}):null;
  if(bossTurn){
    const dialogue=document.createElement('section');
    dialogue.className='forest-boss-dialogue';
    dialogue.dataset.area=play.areaId;
    dialogue.setAttribute('aria-label',`ボスとの会話 ${bossTurn.turn}/3`);
    const counter=document.createElement('span');
    counter.className='forest-boss-dialogue-turn';
    counter.textContent=`BOSS DIALOGUE · ${bossTurn.turn}/3 · ${bossTurn.chapter}`;
    const title=document.createElement('strong');title.textContent=bossTurn.title;
    const context=document.createElement('p');context.textContent=bossTurn.context;
    const warning=document.createElement('p');warning.className='forest-boss-special';
    warning.textContent=`練習のポイント：${bossTurn.kind==='listen'?'聞いた意味を理解':bossTurn.kind==='speak'?'自分の言葉で話す':'正しい言葉と語順'}`;
    dialogue.append(counter,title,context,warning);
    $('#play-card').querySelector('.question-top').after(dialogue);
  }
  $('#answer-area').innerHTML=`${quizControlsHtml(prompt)}<label class="answer-label" for="spoken-answer">${quizMode?'選んだ答え（直接入力もできます）':'英語で答えよう（音声認識または入力）'}</label><div class="answer-row"><textarea id="spoken-answer" class="answer-input" rows="3" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="話した英語がここに表示されるよ。手入力もOK"></textarea><button id="mic-button" type="button" class="mic-button" title="マイクで話す" aria-label="マイクで話す" aria-pressed="false"><span class="mic-glyph mic-glyph-talk" aria-hidden="true"></span><span>話す</span></button></div><button id="retry-mic" type="button" class="retry-mic" hidden>↻ 録音し直す</button><p id="speech-helper" class="answer-helper" role="status" aria-live="polite">マイクが使えないときは英文を入力して判定できます。</p><div class="learning-controls"><button class="hint-button" id="show-hint">ヒントを見る</button><button class="reveal-button" id="show-answer">答えを判定する →</button></div><div id="hint-panel" class="hint-box" hidden></div><div id="feedback-panel"></div>`;
  if(quizMode){
    $('#mic-button').hidden=true;
    $('#mic-button').disabled=true;
    wireQuizControls(prompt,$('#answer-area'));
    $('#speech-helper').textContent=prompt.kind==='vocab'?'3つの中から選んで、「答えを判定する」を押そう。':'並び替えてから判定しよう。手入力でもOK！';
  } else $('#mic-button').addEventListener('click',startRecognition);
  $('#retry-mic').addEventListener('click',()=>{
    if(!play || play.revealed)return;
    $('#spoken-answer').value='';
    $('#spoken-answer').classList.remove('transcript-interim');
    micView('ready');startRecognition();
  });
  $('#show-hint').addEventListener('click',showHint);
  $('#show-answer').addEventListener('click',gradeAnswer);
  $('#spoken-answer').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();gradeAnswer();}});
  $('#spoken-answer').addEventListener('input',()=>{
    $('#spoken-answer').classList.remove('transcript-interim');
    if(!recognition&&!quizMode)micView('ready');
  });
  if(!quizMode){
    micView('ready');
    if(/iPhone|iPad|iPod/i.test(navigator.userAgent))
      $('#speech-helper').textContent='iPhoneで声が文字にならないときはSafariで開くか、入力欄をタップしてキーボードのマイクも使えるよ。';
  }
  if(reviewing)$('#speech-helper').textContent=quizMode?'苦手の復習です。前回のヒントを思い出して解いてみよう。':'復習問題です。前回とは違う言い方でも挑戦してみよう。';
  if(listenMode){
    $('#answer-area').hidden=true;
    const state=play.listeningState;
    const showChoices=()=>{$('#listening-meaning').hidden=false;};
    const revealTranscript=()=>{
      if(!play||play.listeningState!==state||state.understood)return;
      state.usedTranscript=true;
      play.hintUsed=true; // A transcript-assisted clear cannot count as independent speaking mastery.
      $('#transcript').hidden=false;
      $('#transcript').textContent=comprehension.audio;
      showChoices();
      $('#listening-status').textContent='字幕を使った練習モードです。聞き直してから意味を選んでね。';
    };
    $('#play-audio').addEventListener('click',()=>{
      if(state.understood)return;
      state.played=true;
      showChoices();
      speakLine(comprehension.audio,revealTranscript,comprehension.level,prompt.id);
    });
    $('#reveal-transcript').addEventListener('click',revealTranscript);
    $$('[data-listening-choice]').forEach(button=>button.addEventListener('click',()=>{
      if(!play||play.listeningState!==state||state.understood||(!state.played&&!state.usedTranscript))return;
      const selected=Number(button.dataset.listeningChoice);
      if(selected!==comprehension.correctIndex){
        state.misses++;
        play.hintUsed=true;
        persist(flagUncertainReview(save,prompt.id));
        button.classList.add('is-miss');
        button.setAttribute('aria-invalid','true');
        $('#listening-status').textContent=englishMode?'Not quite. Listen again and compare the details.':'少し違うかも。もう一度聞いて、細かい違いに注目しよう。';
        return;
      }
      state.understood=true;
      stopListeningPlayback();
      button.classList.add('is-correct');
      $('#listening-status').textContent=englishMode?'You understood it. Now respond.':'聞き取れた！次は英語で返してみよう。';
      $('#listening-response').hidden=false;
      $('#answer-area').hidden=false;
      $('#play-audio').disabled=true;
      $$('[data-listening-choice]').forEach(choice=>choice.disabled=true);
      $('#reveal-transcript').hidden=true;
      // Do not focus the input here. On iPhone this opens the software
      // keyboard over the battle immediately after selecting an audio answer.
      // Learners can tap the input themselves if they want to type.
    }));
  }
}
function browserSpeakLine(line,onUnavailable,level='easy') {
  try {
    if(!window.speechSynthesis || !window.SpeechSynthesisUtterance) throw new Error('no speech');
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(line);utterance.lang='en-US';utterance.rate=level==='easy'?.88:level==='normal'?.95:1;
    const voices=window.speechSynthesis.getVoices?.()||[];
    const english=voices.filter(voice=>/^en[-_]/i.test(voice.lang));
    const voice=english.find(item=>/natural|premium|enhanced/i.test(item.name))||
      english.find(item=>/^en[-_]us/i.test(item.lang))||english[0];
    if(voice)utterance.voice=voice;
    utterance.onerror=()=>onUnavailable?.();
    window.speechSynthesis.speak(utterance);
  } catch { onUnavailable?.(); }
}
function speakLine(line,onUnavailable,level='easy',promptId=''){
  stopListeningPlayback();
  const clip=LISTENING_AUDIO[promptId];
  // Use generated speech only if its transcript is still an exact curriculum
  // match. On network/codec failure, keep the original browser voice fallback.
  if(clip?.text===line){
    try{
      const audio=new Audio(clip.src);
      spokenAudio=audio;
      let fallen=false;
      const fallback=()=>{
        if(fallen||spokenAudio!==audio)return;
        fallen=true;
        spokenAudio=null;
        audio.onerror=null;
        try{audio.pause();}catch{}
        browserSpeakLine(line,onUnavailable,level);
      };
      audio.onerror=fallback;
      audio.onended=()=>{if(spokenAudio===audio)spokenAudio=null;};
      const pending=audio.play();
      if(pending?.catch)pending.catch(fallback);
      return;
    }catch{/* Fall through to the browser's own voice. */}
  }
  browserSpeakLine(line,onUnavailable,level);
}
function startRecognition() {
  if(!play || play.revealed)return;
  const helper=$('#speech-helper');
  if(recognition){
    finishRecognition();
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
    recognitionStopping=false;
    // A keyboard can obscure the answer in iOS embedded browsers. Starting
    // speech doesn't require the text field to be focused.
    if(document.activeElement===$('#spoken-answer'))$('#spoken-answer').blur();
    recognition=instance;
    instance.lang='en-US';instance.interimResults=true;instance.continuous=false;instance.maxAlternatives=1;
    instance.onstart=()=>{
      if(recognition!==instance||play!==session)return;
      if(helper&&!recognitionStopping)helper.textContent='聞き取り中です。話すと英文が表示されます。終わったら「停止」を押してね。';
    };
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
      if(helper){
        const error=event?.error;
        helper.textContent=error==='not-allowed'||error==='service-not-allowed'
          ?'マイクの利用が許可されていません。Safariのマイク設定を確認するか英文を入力してね。'
          :error==='network'||error==='language-not-supported'
          ?'このブラウザの音声認識サービスに接続できません。Safariで開くか、iPhoneキーボードのマイクを使ってね。'
          :error==='audio-capture'
          ?'マイクを利用できませんでした。Safariのマイク許可を確認してね。'
          :'英語を認識できませんでした。静かな場所で再度話すか、文字で入力してね。';
      }
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
    },30000);
    instance.start();
    micView('listening');
    if(helper)helper.textContent='録音中です。英文が表示されなければ、話し終わって「停止」を押してね。';
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
  if(currentPrompt()?.kind==='listen'&&!play.listeningState?.understood)return;
  // Grading during active listening would abort Safari's pending final
  // transcript. Finish recognition first, then let the learner review it.
  if(recognition){finishRecognition();return;}
  const session=play,prompt=currentPrompt(),raw=$('#spoken-answer').value.trim();
  let grade=gradeLocalResponse(prompt,raw);
  if(grade.status==='review' && !['vocab','grammar'].includes(prompt.kind) && STAGING_SEMANTIC_GRADER_ENDPOINT){
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
    if(['review','incomplete'].includes(grade.status) && raw)persist(flagUncertainReview(save,prompt.id));
    if(grade.status==='incomplete' && raw){
      // A confirmed missing detail is instructional feedback. A later
      // corrected answer is earned, but cannot count as a first-try combo.
      play.hintUsed=true;
      if(play.mode==='forest')play.combo=0;
    }
    if(grade.status==='incorrect' && raw){
      // Only a confident contradiction or an objective wrong quiz is a miss.
      if(!play.quizMissRecorded){persist(recordAnswer(save,prompt.id,'again').save);play.quizMissRecorded=true;}
      play.hintUsed=true;
      if(play.mode==='forest')play.combo=0;
    }
    if(play.mode==='forest' && raw){
      const world=$('#forest-world-stage');
      world.classList.remove('forest-attack','forest-guarding','forest-player-damaged');
      void world.offsetWidth;
      world.classList.add('forest-guarding');
      $('#forest-world-fx').textContent='';
      const tactic=enemyTacticFor(play.index,play.wave,play.areaId);
      const move=forestBossPhase({areaId:play.areaId,index:play.index,wave:play.wave,level:play.difficulty,prompt});
      const guard=move?move.signature.guard:tactic.guard;
      $('#forest-battle-log').textContent=grade.status==='incorrect'
        ? `${guard}。今回は攻撃できなかった。別の答えを試そう。`
        : `${guard}。判定保留のため攻撃は発生しません。正しい別表現の可能性もあるので、言い換えて再挑戦できます。`;
    }
    if(play.mode==='forest'&&play.endless&&['incorrect','incomplete'].includes(grade.status)&&raw){
      play.attemptReviewed=true;
      // An uncertain paraphrase or failed recognizer never consumes a try.
      const soxieShield=play.companionId==='katappo'&&getMonsterProgress(save,play.companionId).evolved&&!play.usedShield;
      if(soxieShield){play.usedShield=true;$('#forest-world-fx').textContent='LOST & FOUND · SHIELD';}
      else play.remainingTries=Math.max(0,play.remainingTries-1);
      $('#forest-tries').textContent=`あと${play.remainingTries}回 · ${difficultyCopy[play.difficulty].label}`;
      if(!play.remainingTries){
        $('#feedback-panel').innerHTML='<div class="feedback-box grading-review" role="status"><div class="feedback-head">挑戦回数を使い切った！</div><p class="grading-intro">今回の回答では必要な意味が伝わりませんでした。例文を復習して再挑戦しよう！</p><button id="forest-exit" class="grading-next">冒険の結果を見る →</button></div>';
        $('#forest-exit').addEventListener('click',()=>finishSession(false,true));
        micView('done');return;
      }
    }
    const empty=grade.status==='empty';
    const incorrect=grade.status==='incorrect';
    const incomplete=grade.status==='incomplete';
    const uncertain=grade.status==='review'||grade.status==='ungraded';
    const teaching=incorrect?quizTeachingFor(prompt):null;
    const speakingLesson=['review','incomplete','incorrect'].includes(grade.status)&&raw?speakingFeedbackFor(prompt,raw):null;
    // A concrete correction is instructional help, so subsequent success
    // cannot quietly earn the same XP as an independent first attempt.
    if(speakingLesson?.specific)play.hintUsed=true;
    const nudge=teaching?`<p class="forest-teaching-nudge"><strong>考え方のヒント</strong> ${escapeHtml(teaching.clue)}</p>`:'';
    const speakingNudge=speakingLesson?speakingTeachingHtml(prompt,raw):'';
    const aidedNote=speakingLesson?.specific?'<p class="forest-checking-note">語順などのヒントを表示したため、次の正答はヒントありXPになります。</p>':'';
    // A low-confidence browser judgement is not a proven English error.
    // Give story-mode learners an explicit opt-in practice route instead of
    // trapping them in a gate that the offline scorer cannot recognize.
    const allowPractice=play.mode==='forest'&&!play.endless&&uncertain&&Boolean(raw)&&!['vocab','grammar'].includes(prompt.kind);
    const practiceButton=allowPractice?'<button type="button" class="grading-skip" id="continue-as-practice">判定できない表現として先へ進む（XPなし） →</button>':'';
    $('#feedback-panel').innerHTML=`<div class="feedback-box grading-review" role="status"><div class="feedback-head">${empty?'英語を入力してみよう':incomplete?'大事な情報が足りないよ':incorrect?'伝わる意味が違うよ':'判定保留 · もう一度確認'}</div><p class="grading-intro">${incorrect?'別の意味だと判断できました。必要な情報を確認して言い直してみよう。':incomplete?'伝わった部分は合っているよ。抜けている情報を付け足してみよう。':uncertain?'自然な別表現の可能性があります。誤答扱いも挑戦回数の消費もしません。音声認識の文字起こしを確認してね。':'入力や音声認識に失敗しても、英語力の評価には含みません。'}</p>${nudge}${grade.reasons.length?`<ul class="grading-reasons">${grade.reasons.map(reason=>`<li>${escapeHtml(reason)}</li>`).join('')}</ul>`:''}${speakingNudge}${aidedNote}${empty?'':`<button type="button" class="grading-skip" id="show-example">${teaching||speakingLesson?'正解と理由を見る（XPなし）':'例文を見て次へ（XPなし）'}</button>`}${practiceButton}</div>`;
    if(!empty)$('#show-example').addEventListener('click',skipAnswer);
    if(allowPractice)$('#continue-as-practice').addEventListener('click',()=>{
      if(!play||play.revealed)return;
      // This is a *navigation choice*, not a correct verdict, speaking
      // mastery or rewarded boss strike. No XP or accuracy is granted.
      play.assistedGates=(play.assistedGates||0)+1;
      play.hintUsed=true;
      play.combo=0;
      play.revealed=true;
      if(play.index>=regularCount())play.bossHits=Math.min(BOSS_HITS,play.bossHits+1);
      $('#forest-battle-log').textContent='自然な別表現かもしれないので、判定を保留して練習ルートで進むよ。XP・習得実績は増えません。';
      advanceQuestion();
    });
    if(!['vocab','grammar'].includes(prompt.kind))micView('ready');
    return;
  }
  const rating=play.hintUsed?'hint':'smooth';
  const wasQuizResolved=save.quizProgress?.[prompt.id]?.resolved===true;
  const {save:next,reward}=recordAnswer(save,prompt.id,rating);
  persist(next);
  play.earnedXp+=reward.xp;
  play.captured.push(...reward.captured);
  if(rating==='smooth')play.smooth++;
  play.revealed=true;
  stopAudio();
  $('#show-answer').disabled=true;$('#show-hint').disabled=true;$('#spoken-answer').disabled=true;micView('done');
  if(play.mode==='forest'){
    const boss=play.index>=regularCount();
    const foe=opponentFor(play.index,play.wave,play.areaId);
    const companion=monsterFor(play.companionId);
    const companionName=getMonsterProgress(save,play.companionId).evolved?companion.evolvedName:companion.name;
    const special=specialStrike({companionId:play.companionId,
      evolved:getMonsterProgress(save,play.companionId).evolved,boss,usedPower:play.usedPower||!play.endless});
    play.usedPower ||= special.usedPower;
    if(boss)play.bossHits=Math.min(BOSS_HITS,play.bossHits+special.strikes);
    $('#forest-journey').classList.add('forest-victory');
    const stage=$('#forest-world-stage');
    stage.classList.remove('forest-attack','forest-guarding','forest-defended','forest-reading-hit','forest-weakness-hit','forest-spell-cast');
    void stage.offsetWidth;
    stage.classList.add('forest-attack');
    if(prompt.kind==='listen')stage.classList.add('forest-defended');
    if(prompt.kind==='read')stage.classList.add('forest-reading-hit');
    if(prompt.kind==='vocab')stage.classList.add('forest-weakness-hit');
    if(prompt.kind==='grammar')stage.classList.add('forest-spell-cast');
    $('#forest-world-stage').dataset.attack=play.companionId;
    $('#forest-damage').textContent=`−${special.strikes}`;
    $('#forest-world-fx').textContent=prompt.kind==='listen'?'BLOCK':prompt.kind==='read'?'BREAK':prompt.kind==='vocab'?'WEAKNESS':prompt.kind==='grammar'?'MAGIC':special.ability?special.ability:boss?'BOSS HIT':'HIT';
    updateEnemyHealth(true);
    const defeated=boss&&play.bossHits>=BOSS_HITS;
    play.combo++;
    $('#forest-combo').textContent=play.combo>=2?`${play.combo} HIT COMBO`:'';
    stage.classList.toggle('forest-combo-boost',play.combo>=3);
    if(defeated)$('#forest-world-stage').classList.add('forest-boss-defeated');
    const bossMove=boss?forestBossPhase({areaId:play.areaId,index:play.index,wave:play.wave,level:play.difficulty,prompt}):null;
    const sealNote=bossMove?`「${bossMove.signature.name}」を打ち破った！ `:'';
    $('#forest-battle-log').textContent=sealNote+(prompt.kind==='listen'?`${companionName}が敵の攻撃を防御！反撃で${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='read'?`${companionName}が敵の作戦を見破った！${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='vocab'?`弱点を発見！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='grammar'?`魔法が発動！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:`${companionName}のこうげき！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`);
  }
  const autoForest=play.mode==='forest';
  const objectiveQuiz=prompt.kind==='vocab'||prompt.kind==='grammar';
  const explanationTitle=objectiveQuiz?(prompt.kind==='vocab'?'単語の使い分け':'文法・語順のポイント'):'使える表現の一例';
  const quizState=next.quizProgress?.[prompt.id];
  const quizLearningNote=quizState&&!wasQuizResolved?`<p class="forest-quiz-review-status">${quizState.resolved?'苦手克服！日を空けて2回、自力で答えられたね。':quizState.nextReviewDay<=dayKey()?'このポイントは次の冒険でもう一度出題するよ。':'復習予定に登録したよ。次回もヒントなしで挑戦！'}</p>`:'';
  const explanationHtml=objectiveQuiz?quizTeachingHtml(prompt):`<div class="feedback-note"><strong>${explanationTitle}</strong> ${escapeHtml(prompt.tip || phraseFor(prompt.phraseId).tip)}</div>${speakingTeachingHtml(prompt,raw,true)}`;
  const checkingNote=objectiveQuiz?'この問題では登録された単語・語順との一致を確認しているよ。':grade.method==='semantic-beta'?'AIによる意味の確認（試験運用）です。発音評価ではありません。':'教材ごとの簡易判定です。発音や自由な言い回しを完全に採点するものではありません。';
  const autoNote=autoForest?`<p class="forest-auto-status" id="forest-auto-status" role="status">解説を読んで、準備ができたら次へ進もう。</p>`:'';
  $('#feedback-panel').innerHTML=`<div class="feedback-box grading-correct" role="status"><div class="feedback-head">${autoForest?'関門突破！':'内容を確認できた！'} +${reward.xp} XP</div><div class="feedback-answer">${escapeHtml(prompt.answer)}</div>${explanationHtml}<p class="forest-checking-note">${checkingNote}</p>${quizLearningNote}${autoNote}<button id="next-question" class="grading-next">${autoForest?'今すぐ次へ →':'次の問題へ →'}</button></div>`;
  $('#next-question').addEventListener('click',advanceQuestion);
  // Deliberately no auto-advance: explanations must remain until tapped.
}
function skipAnswer(){
  if(!play || play.revealed)return;
  const prompt=currentPrompt();
  const learnerAnswer=$('#spoken-answer')?.value||'';
  if(!play.quizMissRecorded){persist(recordAnswer(save,prompt.id,'again').save);play.quizMissRecorded=true;}
  play.revealed=true;stopAudio();
  if(play.mode==='forest')play.combo=0;
  $('#show-answer').disabled=true;$('#show-hint').disabled=true;$('#spoken-answer').disabled=true;micView('done');
  const explanation=quizTeachingFor(prompt)?quizTeachingHtml(prompt,learnerAnswer):speakingFeedbackFor(prompt,learnerAnswer)
    ? speakingTeachingHtml(prompt,learnerAnswer,true)
    :`<p class="feedback-note">${escapeHtml(prompt.tip || phraseFor(prompt.phraseId).tip)}</p>`;
  $('#feedback-panel').innerHTML=`<div class="feedback-box" role="status"><div class="feedback-head">${['vocab','grammar'].includes(prompt.kind)?'正解と理由を確認しよう':'例文を確認しよう'} · 0 XP</div><div class="feedback-answer">${escapeHtml(prompt.answer)}</div>${explanation}<button id="next-question" class="grading-next">${play.mode==='forest'?'同じ関門にもう一度挑戦 →':'次の問題へ →'}</button></div>`;
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
  cancelAutoAdvance();
  if(play.mode==='forest' && play.index===0 && !play.route){
    play.index=1;
    showForestRouteChoice();
    return;
  }
  if(play.mode==='forest'){
    play.index=play.index>=regularCount()?regularCount()+play.bossHits:play.index+1;
    if(play.index>=waveLength()){
      // Reward a wave only after its full chapter and three verified boss hits.
      const reward=finishForest(save,play.route,play.companionId,play.areaId,play.prompts.map(p=>p.id),!play.endless);
      // Unlock chapter-gated allies only after the boss was actually beaten.
      // Endless replay does not unlock new story chapters.
      const awarded=captureEligibleMonsters(reward.save);
      persist(awarded.save);
      play.captured.push(...awarded.captured);
      play.forestRelics.push(...reward.discovered);
      if(!play.endless){play.completedForest=true;finishSession();return;}
      play.seenIds=cleanForest(save.forest).recentPromptIds;
      play.wave++;
      play.areaId=FOREST_AREAS[(play.wave-1)%FOREST_AREAS.length].id;
      const wave=buildForestWave({difficulty:play.baseDifficulty,wave:play.wave,areaId:play.areaId,previousIds:play.seenIds,reviewPhraseIds:dueForestPhrases(),reviewPromptIds:dueForestPromptIds(),quizWeaknessIds:dueQuizWeaknessIds(),bossConversation:true});
      play.prompts=wave.prompts;
      play.difficulty=wave.level;
      play.index=0;play.bossHits=0;play.usedPower=false;
      play.combo=0;
      play.encounterKey=null;
      $('#play-mode-label').textContent=`∞ WAVE ${play.wave} · ${FOREST_AREAS.find(a=>a.id===play.areaId).name} · ${difficultyCopy[wave.level].label}`;
      showForestExplore(false);queueForestEncounter();return;
    }
    // Learning first: ordinary questions flow directly into the next task.
    // Only route decisions, optional story discoveries and boss approaches
    // briefly return to exploration. Keep explanations manual above.
    const storyDetour=Boolean(forestEventFor({areaId:play.areaId,route:play.route,index:play.index}));
    const bossApproach=play.index===regularCount();
    if(storyDetour||bossApproach){
      showForestExplore(false);
      if(bossApproach)queueForestEncounter();
    }else renderQuestion();
    updateClock();return;
  }
  play.index++;
  if(play.index===play.prompts.length){finishSession();return;}
  if(play.deadline && Date.now()>=play.deadline){finishSession(true);return;}
  renderQuestion();updateClock();
}
function finishSession(timedOut=false,defeated=false) {
  if(!play)return;
  cancelAutoAdvance();
  const ended=play;play=null;clearTimer();stopAudio();
  if(ended.mode==='challenge')persist(finishRound(save,ended.smooth));
  $('#play-view').classList.remove('forest-active','review-only');
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
     `${FOREST_AREAS.find(area=>area.id===ended.areaId).name}を攻略！ 次のエリアの扉が開いたよ。`):
    timedOut?'60秒おつかれさま！ 言えなかった表現は、次の練習で取り戻そう。':
    '練習した表現は、別の場面や後日の復習でも使ってみよう。';
  $('#result-rewards').innerHTML=`<span class="reward-pill">${ended.mode==='forest'?'自力で正解':'自力で言えた'} ${ended.smooth} / ${ended.index}</span>${ended.assistedGates?`<span class="reward-pill">練習ルート ${ended.assistedGates}関門 · 0 XP</span>`:''}<span class="reward-pill">+${ended.earnedXp} XP ストック！</span><span class="reward-pill">使えるXP ${save.xpWallet}</span><span class="reward-pill">仲間 ${save.ownedMonsters.length} / ${MONSTERS.length}</span>`;
  const newMonsters=[...new Set(ended.captured)].map(id=>{const creature=monsterFor(id);return `<div class="discovery-card">${monsterArt(id)}<div><strong>${escapeHtml(creature.name)}が仲間入り！</strong><p>${escapeHtml(creature.kind)} · 図鑑に追加</p></div></div>`;}).join('');
  const newRelics=ended.mode==='forest'?ended.forestRelics.map(id=>`<div class="forest-result-relic"><span aria-hidden="true">${relicArt(id)}</span><div><strong>${escapeHtml(FOREST_RELICS[id].name)} を発見！</strong><p>${escapeHtml(FOREST_RELICS[id].meaning)} · 冒険の宝物</p></div></div>`).join(''):'';
  const memories=ended.mode==='forest'?(ended.eventMemories||[]).slice(-8).map(memory=>
    `<div class="forest-event-memory"><strong>${escapeHtml(memory.title)} · ${escapeHtml(memory.memento)}</strong><p>${escapeHtml(memory.outcome)}</p><small>探索の記録 · XPなし</small></div>`).join(''):'';
  $('#result-discoveries').innerHTML=newMonsters+newRelics+memories;
  if(forestFinished&&!ended.forestRelics.length)$('#result-description').textContent+=' 今回は新しい宝物はなかったけど、英語の練習は積み重なった！';
  $('#replay-run').textContent=ended.mode==='forest'?'森をもう一度探検する':ended.mode==='challenge'?'もう一度60秒に挑む':'別の表現も練習する';
  $('#replay-run').onclick=()=>startSession(ended.endless?'forest-endless':ended.mode,ended.areaId);
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
$('#start-review-practice').addEventListener('click',()=>startSession('practice'));
$('#start-saved-review').addEventListener('click',()=>startSession('saved'));
$('#start-due-saved-review').addEventListener('click',()=>startSession('saved',null,true));
$('#forest-explore-continue').addEventListener('click',()=>{
  if(play?.mode!=='forest'||!$('#play-view').classList.contains('forest-exploring')||!$('#forest-explore-options').hidden)return;
  cancelAutoAdvance();
  renderQuestion();
});
$('#open-collection').addEventListener('click',()=>renderCollection());
$('#open-wallet').addEventListener('click',()=>renderCollection());
$('#leave-play').addEventListener('click',()=>{cancelAutoAdvance();clearTimer();stopAudio();play=null;$('#play-view').classList.remove('forest-active','review-only');renderHome();});
$('#result-home').addEventListener('click',renderHome);
$('#result-collection').addEventListener('click',()=>renderCollection());
$('#collection-home').addEventListener('click',renderHome);
persist(save);
window.addEventListener('pagehide',()=>{cancelAutoAdvance();stopAudio();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    cancelAutoAdvance();
    if(recognition)stopRecognition();
    if($('#forest-auto-status'))$('#forest-auto-status').textContent='戻ってきたら「今すぐ次へ」で再開できるよ。';
  }
});
renderHome();
