import { ALL_PROMPTS, MONSTERS, PHRASES, PROMPTS } from './monster-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, chooseDifficulty, createSave, dayKey, finishRound, getMonsterProgress, getMonsterBondProgress, learningSummary, reviewOverview, quizWeaknessOverview, recordAnswer, toggleSavedPrompt, savedReviewPrompts, savedReviewQueue, captureEligibleMonsters, flagUncertainReview, selectRoundPrompts, validateSave, normalizeEnglish, normalizeEnglishNumbers } from './monster-engine.js';
import { monsterArt } from './monster-art.js';
import { gradeLocalResponse } from './monster-grader.js';
import { STAGING_SEMANTIC_GRADER_ENDPOINT, askSemanticGrader } from './semantic-client.js';
import { cleanForest, FOREST_ROUTES, CITY_ROUTES, FOREST_RELICS, FOREST_AREAS, CITY_AREAS, unlockedDungeonAreas, nextDungeonArea, dungeonAreaFor, finishForest } from './forest-engine.js';
import { BOSS_MEDAL_NAMES, evaluateBossMedal } from './boss-mastery.js';
import { forestWorldArt } from './forest-world.js';
import { buildForestWave, DIFFICULTY_TRIES, opponentFor, enemyTacticFor, FOREST_WAVE_LENGTH, REGULAR_ENCOUNTERS, AREA_BOSSES, BOSS_HITS, specialStrike, regularEncountersFor, forestWaveLengthFor } from './forest-battle.js';
import { BATTLE_KINDS, BATTLE_LABELS, ULTIMATE_MAX, MASTERY_LEVEL, foeAffinity, allyAffinity, allySkill, masterySkillFor, masteryEffectFor, supportPartnerFor, supportComboFor, evolvedSupportTalent, advanceUltimate, advanceBattleChain, strikeFor, incomingHit, nextEnemyKind, foeStyleFor, foeBattleAffinity, foeStyledStrike, foePlannedAttack, foeAttackPressure, bossAttackFor, bossCounterFor, bossReserveCoverFor, bossFormationLinkPlan, bossFormationLinkFor, pickBattlePrompt } from './battle-tactics.js';
import { createBattleParty, levelHpBonus, editBattleFormation, fighterHealth, applyFighterDamage, healFighter, firstStandingAlly, consumeTacticalSwap, canTacticalSwap, restorePartyForNextWave, encounterVitality } from './battle-party.js';
import { enemyArt } from './forest-enemies.js';
import { battleArenaArt, guardArt, relicArt } from './game-visuals.js';
import { createCollectionViews } from './monster-collection.js';
import { quizControlsHtml, wireQuizControls } from './forest-quiz-ui.js';
import { listeningChallengeFor } from './listening-challenges.js';
import { LISTENING_AUDIO } from './listening-audio-manifest.js';
import { quizTeachingFor } from './forest-teaching.js';
import { speakingFeedbackFor } from './speaking-feedback.js';
import { speakingHintSteps, beginnerClozeFor } from './speaking-guidance.js';
import { forestBossPhase } from './forest-boss-phases.js';
import { dailyTrainingPlan, recordDailyCompletion, dailyGrowthSummary } from './daily-training.js';
import { retentionOverview, retentionPracticePlan, retentionTitle } from './retention.js';
import { setupHomeNavigation } from './home-navigation.js';
import { summarizeDungeonAttempt, dungeonBossBrief, DUNGEON_SKILLS } from './dungeon-learning.js';
import { createBetaTelemetry } from './beta-telemetry.js';
import { setupBetaFeedback } from './beta-feedback.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
// Every dungeon encounter uses a single arena for characters, the question and its
// answer controls. Move the existing live nodes instead of duplicating a form:
// recognition, quiz choices, hints and review listeners must keep one owner.
function arrangeBattleScene(forestMode){
  const world=$('#forest-world-stage'),consolePanel=$('#forest-arena-console');
  const home=$('.forest-command-window');
  const info=$('.forest-battle-info'),partyHp=$('#forest-party-hp');
  if(forestMode){
    world.insertBefore(info,consolePanel);
    // All HP meters belong in ONE slim HUD row. A separately positioned ally
    // meter used to straddle the question layer and got clipped on iPhone.
    info.insertBefore(partyHp,$('#forest-boss-hp'));
    for(const selector of ['.play-progress','#forest-battle-log','#play-card','#answer-area','#forest-tactics'])
      consolePanel.appendChild($(selector));
  }else{
    world.after(info);
    info.after(partyHp);
    for(const selector of ['.play-progress','#forest-battle-log','#forest-tactics','#play-card','#answer-area'])
      home.appendChild($(selector));
  }
  consolePanel.hidden=!forestMode;
}
function playBattleCinematic(kind){
  if(play?.mode!=='forest')return;
  const world=$('#forest-world-stage');
  if(kind==='attack'||kind==='victory'){
    const effects=['arc','burst','storm'];
    const choice=Math.floor(Math.random()*effects.length);
    world.dataset.fxVariant=effects[(choice+(effects[choice]===world.dataset.fxVariant?1:0))%effects.length];
    // Preserve each monster's signature attack while adding a varied sprite
    // motion inside it. Consecutive hits never repeat the same choreography.
    const motions=['dash','rising','spiral'];
    const motionChoice=Math.floor(Math.random()*motions.length);
    world.dataset.strikeMotion=motions[(motionChoice+(motions[motionChoice]===world.dataset.strikeMotion?1:0))%motions.length];
  }
  world.dataset.finisher=kind==='victory'?(world.classList.contains('forest-boss-stage')?'boss':'regular'):'none';
  world.dataset.cinematic='idle';
  void world.offsetWidth; // Restart CSS cut-ins for each independently graded turn.
  world.dataset.cinematic=kind;
}
function syncBattleAura(){
  const world=$('#forest-world-stage'),chain=play?.mode==='forest'?play.combo||0:0;
  world.dataset.chainTier=String(chain>=5?3:chain>=3?2:chain>=2?1:0);
  world.classList.toggle('forest-combo-boost',chain>=3);
  $('#forest-combo').textContent=chain>=2?`${chain} CHAIN`:'';
}
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const phraseFor = id => PHRASES.find(phrase => phrase.id === id);
const monsterFor = id => MONSTERS.find(monster => monster.id === id);
function createTrainedBattleParty(ids){
 return createBattleParty(ids,{evolvedIds:ids.filter(id=>getMonsterProgress(save,id).evolved),
  levels:Object.fromEntries(ids.map(id=>[id,getMonsterProgress(save,id).level]))});
}
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
// Keep the useful learning point visible after a correct spoken response.
// The reference is ONE example, never a mandated script.
function speakingSuccessHtml(prompt,learnerAnswer){
 const alternatives=[...(prompt.alternatives||[])].filter(reply=>reply?.trim()&&
   reply.trim().toLowerCase()!==learnerAnswer.trim().toLowerCase()&&
   reply.trim().toLowerCase()!==prompt.answer.trim().toLowerCase()).slice(0,2);
 const task=prompt.task||prompt.cue;
 const takeaway=prompt.tip||phraseFor(prompt.phraseId)?.tip||'同じ意味をほかの表現でも言ってみよう。';
 return `<section class="forest-teaching speaking-success-guide" aria-label="英語を身につけるポイント">
  <strong class="forest-teaching-title">今回伝えられたこと</strong>
  <p>${escapeHtml(task)}</p>
  <p class="forest-teaching-learner"><strong>あなたの回答</strong> <span lang="en">${escapeHtml(learnerAnswer)}</span></p>
  <p><strong>覚えておくポイント</strong> ${escapeHtml(takeaway)}</p>
  ${alternatives.length?`<p class="forest-teaching-transfer"><strong>こんな言い方もできる</strong> <span lang="en">${alternatives.map(escapeHtml).join(' / ')}</span></p>`:''}
  </section>`;
}
let save = loadSave() || createSave();
let lastDungeonReviewIds = [];
let play = null, timer = null, recognition = null, recognitionStartTimer = null, recognitionWatchdog = null, recognitionNoResultTimer = null, recognitionStopping = false, recognitionFailures = 0, autoAdvanceTimer = null, spokenAudio = null, homeNavigation = null;
const betaTelemetry=createBetaTelemetry();
setupBetaFeedback(betaTelemetry);

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
    const native=button.dataset.nativeDictation==='true'&&mode==='ready';
    button.classList.toggle('active',mode==='listening');
    button.setAttribute('aria-pressed',String(mode==='listening'));
    button.innerHTML=mode==='listening'?'<span class="mic-glyph mic-glyph-stop" aria-hidden="true"></span><span>停止</span>':`<span class="mic-glyph mic-glyph-talk" aria-hidden="true"></span><span>${native?'入力':'話す'}</span>`;
    button.title=mode==='listening'?'録音を停止する':native?'iPhoneキーボードで音声入力する':'マイクで話す';
    button.setAttribute('aria-label',mode==='listening'?'録音を停止する':native?'iPhoneの音声入力を開く':'マイクで話す');
    button.hidden=mode==='done';
    button.disabled=mode==='done';
  }
  if(retry) retry.hidden=mode!=='captured';
}
function showSpeechFallback(){
 const alternatives=$('#speech-alternatives');
 if(alternatives&&!alternatives.hidden)alternatives.open=true;
}
function openNativeDictation(){
  // iOS does not allow websites to press the keyboard's microphone button.
  // Focus must happen inside a real user tap; describe the remaining tap
  // honestly instead of pretending the browser recognizer is recording.
  if(recognition)finishRecognition();
  const field=$('#spoken-answer');
  if(!field||field.disabled)return;
  field.focus();
  const helper=$('#speech-helper');
  if(helper)helper.textContent='キーボードのマイクを押して英語で話してね。文字になった英文を確認して判定できるよ。';
  const help=$('#speech-alternative-help');
  if(help)help.textContent='入力欄を開いたよ。iPhoneキーボードのマイクで話すと、英文が入力されるよ。';
}
function stopRecognition(mode='ready') {
  if(recognitionStartTimer)clearTimeout(recognitionStartTimer);
  if(recognitionWatchdog)clearTimeout(recognitionWatchdog);
  if(recognitionNoResultTimer)clearTimeout(recognitionNoResultTimer);
  recognitionStartTimer=null;
  recognitionWatchdog=null;
  recognitionNoResultTimer=null;
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
  if(recognitionStartTimer)clearTimeout(recognitionStartTimer);
  recognitionStartTimer=null;
  micView('ready');
  if(helper)helper.textContent='文字起こしを確定中です。英語が表示されてから判定してね。';
  if(recognitionWatchdog)clearTimeout(recognitionWatchdog);
  recognitionWatchdog=setTimeout(()=>{
    if(recognition!==active)return;
    const text=$('#spoken-answer')?.value.trim();
    if(!text){recognitionFailures++;showSpeechFallback();}
    stopRecognition(text?'captured':'ready');
    if(helper)helper.textContent=text
      ?'聞き取れた部分を残しました。英文を確認して判定してね。'
      :'内蔵ブラウザで文字にできませんでした。下のiPhone標準音声入力またはSafariを使ってね。';
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
  if(name==='home')homeNavigation?.showMenu();
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
  const nextHealthTier=[3,6,9].find(level=>level>growth.level);
  const mastery=masterySkillFor(creature.id,growth.level);
  $('#hero-next-level').textContent = `あと${growth.toNextLevel} XPでレベルアップ · ${nextHealthTier?`Lv.${nextHealthTier}で戦闘HP＋1`:'HP成長は最大＋3'}${growth.evolved?' · 進化援護が使用可能':' · 累計160 XPで進化援護を解放'} · ${mastery?`熟練技「${mastery.name}」解放済み`:`Lv.${MASTERY_LEVEL}で熟練技解放`}`;
  $('#home-wallet').textContent = save.xpWallet;
  const gym=dailyTrainingPlan(save);
  const dailyGrowth=dailyGrowthSummary(save);
  $('#daily-plan-status').textContent=`今日の8問：復習 ${gym.counts.review} · 応用 ${gym.counts.transfer} · 新しい問題 ${gym.counts.new}${gym.counts.mixed?' · その他 '+gym.counts.mixed:''}`;
  $('#start-daily-gym').disabled=!gym.prompts.length;
  $('#daily-last-rate').textContent=dailyGrowth.lastRate===null?'―':`${dailyGrowth.lastRate}%`;
  $('#daily-growth-note').textContent=dailyGrowth.changeSevenDays!==null
    ?`同じ難易度の7日以上前と比較：${dailyGrowth.changeSevenDays>=0?'+':''}${dailyGrowth.changeSevenDays}ポイント（${dailyGrowth.weekBeforeRate}% → ${dailyGrowth.lastRate}%）`
    :dailyGrowth.sessions?`完了 ${dailyGrowth.sessions}回 · 前回 ${dailyGrowth.lastDuration}秒 · 7日以上の記録がたまると比較できるよ。`
    :'5分ジムを完了すると、ヒントなしで正解した割合を記録するよ。';
  const recall=retentionOverview(save,dayKey());
  const recallPlan=retentionPracticePlan(save,dayKey());
  const bond=getMonsterBondProgress(save,save.selectedMonster);
  const bondSteps=[0,1,3,6,10];
  const bondFloor=bondSteps[bond.rank],bondCeiling=bondSteps[Math.min(bond.rank+1,bondSteps.length-1)];
  const bondRatio=bond.maxed?100:Math.round(100*(bond.points-bondFloor)/(bondCeiling-bondFloor));
  $('#retention-bond-label').textContent=bond.maxed
    ?`${creature.name}との絆 Lv.${bond.rank} · 最高ランク達成`
    :`${creature.name}との絆 Lv.${bond.rank} · 次まであと${bond.next}ポイント`;
  $('#retention-bond-meter').setAttribute('aria-valuenow',String(bondRatio));
  $('#retention-bond-fill').style.width=`${bondRatio}%`;
  $('#retention-due-label').textContent=`今日のチェック ${recall.due.length}問`;
  $('#retention-stable-label').textContent=`7日後チェック達成 ${recall.stable.length}問`;
  $('#retention-transfer-label').textContent=`別の場面で応用 ${recallPlan.transferIds.length}問`;
  $('#start-retention-review').disabled=!recall.due.length;
  $('#start-retention-review').textContent=`今日の定着チェック（${recall.due.length}問）`;
  $('#retention-next').textContent=recall.due.length
    ?`リスニングは意味の選択だけ。${recallPlan.transferIds.length?'覚えた表現は違う場面でも使ってみよう。':'ヒントなしで再挑戦しよう。'} 解説は自分のペースで読めるよ。`
    :recall.upcoming.length?`次の復習は ${recall.upcoming[0].nextDay}。日を空けてもう一度挑戦しよう。`
    :'最初の問題を解くと、翌日の定着チェックがここに届くよ。';
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
  const forestCount=FOREST_AREAS.filter(area=>forest.completedAreas.includes(area.id)).length;
  const cityCount=CITY_AREAS.filter(area=>forest.completedAreas.includes(area.id)).length;
  const cityClear=cityCount===CITY_AREAS.length;
  $('#forest-home-progress').textContent = `森 ${forestCount}/${FOREST_AREAS.length} · 街 ${cityCount}/${CITY_AREAS.length}`;
  const unlocked=new Set(unlockedDungeonAreas(save).map(area=>area.id));
  const dueRetention=retentionOverview(save,dayKey()).due;
  const areaCard=(area,index)=>{
    const cleared=forest.completedAreas.includes(area.id),open=unlocked.has(area.id);
    const chapterDue=dueRetention.filter(entry=>area.focus.some(key=>entry.prompt.phraseId.startsWith(key))).length;
    const bestRank=forest.medals[area.id]?.[save.difficulty]||0;
    const target=bestRank===3?'金ランク達成！':bestRank===2?'次は全問自力正解で金へ':bestRank===1?'次は自力正解75%で銀へ':'ボス3問を確認して銅勲章へ';
    return `<button type="button" class="forest-area-card ${area.world==='city'?'city-area-card':''}" data-enter-forest="${area.id}" ${open?'':'disabled'} aria-label="${escapeHtml(area.name)} ${cleared?'攻略済み':open?'挑戦可能':'未解放'} ${bestRank?BOSS_MEDAL_NAMES[bestRank]+'勲章':''}"><span class="forest-area-number">${String(index+1).padStart(2,'0')}</span><span class="forest-area-copy"><strong>${escapeHtml(area.name)}</strong><small><span class="forest-area-goal">${escapeHtml(area.goal)}</span><span class="forest-area-count">通常${regularEncountersFor(area.id)}戦＋ボス3段階 · 敵の反撃あり${chapterDue?' · 復習候補'+chapterDue+'問':''}</span><span class="boss-medal-target">${target}</span></small></span><span class="forest-area-status" data-medal-rank="${bestRank}">${bestRank?`${BOSS_MEDAL_NAMES[bestRank]}勲章`:cleared?'CLEAR':open?'挑戦する':area.world==='city'&&forestCount<FOREST_AREAS.length?'森の4エリアを攻略で解放':'前のエリアを攻略で解放'}</span></button>`;
  };
  const forestCards=FOREST_AREAS.map((area,index)=>areaCard(area,index)).join('');
  const cityCards=CITY_AREAS.map((area,index)=>areaCard(area,index)).join('');
  $('#forest-area-list').innerHTML=`
    <section class="dungeon-world-card dungeon-world-forest" aria-labelledby="dungeon-world-forest-title">
      <header class="dungeon-world-header"><div class="dungeon-world-heading"><span>WORLD 01 · FOREST</span><h3 id="dungeon-world-forest-title">はじまりの森</h3><p>聞く・話す・読む力を身につける冒険</p></div><strong class="dungeon-world-badge">${forestCount} / ${FOREST_AREAS.length} エリア攻略</strong></header>
      <div class="dungeon-world-areas">${forestCards}</div>
    </section>
    <div class="dungeon-world-transition" aria-hidden="true"><span>森をクリアすると次の世界へ ↓</span></div>
    <section class="dungeon-world-card dungeon-world-city" aria-labelledby="dungeon-world-city-title">
      <header class="dungeon-world-header"><div class="dungeon-world-heading"><span>WORLD 02 · SNOW CITY</span><h3 id="dungeon-world-city-title">雪灯りの街</h3><p>中央広場から吹雪の街外れまで、4エリアで実践英語に挑戦</p></div><strong class="dungeon-world-badge">${cityCount} / ${CITY_AREAS.length} エリア攻略${forestCount<FOREST_AREAS.length?' · 森の攻略で解放':''}</strong></header>
      <div class="dungeon-world-areas">${cityCards}</div>
    </section>`;
  $$('[data-enter-forest]').forEach(button=>button.addEventListener('click',()=>startMainDungeon(button.dataset.enterForest)));
  $('#start-forest').textContent=cityClear?'雪灯りの街をもう一度冒険':`次へ：${nextDungeonArea(save).name}`;
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
  $('#review-mastery-description').textContent=`ヒントなしで取り組めた表現 ${journal.learned}/${journal.total}。聞く・話す両方の練習を重ねよう。`;
  const top=[...journal.due,...journal.upcoming].slice(0,3);
  $('#review-journal-list').innerHTML=top.length?top.map(entry=>
    `<div class="review-journal-entry"><strong>${escapeHtml(entry.label)}</strong><span>${entry.dueNow?'今日の復習':'次の復習 '+escapeHtml(entry.due)}</span></div>`).join(''):
    '<p class="review-journal-empty">今日の復習はありません。新しい表現に挑戦してみよう。</p>';
  $('#start-review-practice').textContent=journal.due.length?'今日の復習をする':'英語を練習する';
  $('#stat-monsters').innerHTML = `${save.ownedMonsters.length}<span> / ${MONSTERS.length}</span>`;
  $('#hero-vocab').innerHTML = creature.roots.map(root=>`<span class="vocab-chip"><strong>${escapeHtml(root.word)}</strong> <span>${escapeHtml(root.meaning)}</span></span>`).join('');
  renderDifficulty();
  homeNavigation?.updateHero({
    art:monsterArt(creature.id,growth.evolved),name:growth.evolved?creature.evolvedName:creature.name,
    level:growth.level,mastered:summary.independent,due:journal.due.length,xp:save.xpWallet,
    areasCleared:forestCount,bondRank:bond.rank,cityUnlocked:forestCount===FOREST_AREAS.length,cityCleared:cityClear
  });
  // Reuse art for already recruited creatures only; never preview locked ones.
  // Pick the selected companion first so that the home genuinely reflects
  // the user's own team, and cap moving sprites at three for mobile performance.
  const walkingIds=[save.selectedMonster,...save.ownedMonsters.filter(id=>id!==save.selectedMonster)].slice(0,3);
  homeNavigation?.updateWalkers(walkingIds.map(id=>{
    const progress=getMonsterProgress(save,id);
    return {art:monsterArt(id,progress.evolved)};
  }));
  showView('home');
}
function dueForestPhrases(){
  const today=dayKey();
  const recallIds=new Set(retentionOverview(save,today).due.map(entry=>entry.prompt.phraseId));
  return PHRASES.filter(phrase=>{
    const item=save.progress?.[phrase.id];
    return recallIds.has(phrase.id)||(item?.nextReviewDay && item.nextReviewDay<=today) ||
      Object.entries(save.reviewPrompts||{}).some(([id,due])=>due<=today &&
        ALL_PROMPTS.find(prompt=>prompt.id===id)?.phraseId===phrase.id);
  }).map(phrase=>phrase.id);
}
function dueForestPromptIds(){
  const today=dayKey();
  return [...new Set([...Object.entries(save.reviewPrompts||{}).filter(([,due])=>due<=today).map(([id])=>id),...retentionOverview(save,today).due.map(entry=>entry.id)])];
}
function dueQuizWeaknessIds(){return quizWeaknessOverview(save).due.map(item=>item.id);}
function tacticalReviewTargets(){
 return {dueIds:dueForestPromptIds(),weakIds:dueQuizWeaknessIds(),
   duePhraseIds:dueForestPhrases(),recentIds:cleanForest(save.forest).recentPromptIds};
}
// The main dungeon starts immediately with the player's current companions.
// Party formation remains optional in the advanced battle mode.
function startMainDungeon(areaId=null){startSession('forest-tactics',areaId,false,true);}
function startSession(mode,requestedAreaId=null,onlyDue=false,quickStart=false) {
  cancelAutoAdvance();clearTimer(); stopAudio();
  const difficulty=save.difficulty;
  const endless=mode==='forest-endless',tactical=mode==='forest-tactics',forestMode=mode==='forest'||endless||tactical;
  if(mode==='saved'&&!savedReviewQueue(save).some(item=>!onlyDue||item.due)){renderHome();return;}
  if(mode==='retention'&&!retentionOverview(save,dayKey()).due.length){renderHome();return;}
  const area=forestMode?(endless?FOREST_AREAS[0]:unlockedDungeonAreas(save).find(a=>a.id===requestedAreaId)||nextDungeonArea(save)):null;
  const promptCount=mode==='challenge'?{easy:6,normal:4,hard:3}[difficulty]:3;
  const firstWave=forestMode?buildForestWave({difficulty,wave:1,areaId:area.id,progression:endless?'endless':'story',previousIds:cleanForest(save.forest).recentPromptIds,reviewPhraseIds:dueForestPhrases(),reviewPromptIds:dueForestPromptIds(),quizWeaknessIds:dueQuizWeaknessIds(),bossConversation:true}):null;
  const gym=mode==='daily'?dailyTrainingPlan(save,{difficulty}):null;
  const recallPlan=mode==='retention'?retentionPracticePlan(save,dayKey()):null;
  if(mode==='dungeon-review'&&!lastDungeonReviewIds.length){renderHome();return;}
  const focused=mode==='retention'?recallPlan.prompts:
    mode==='dungeon-review'?lastDungeonReviewIds.map(id=>ALL_PROMPTS.find(p=>p.id===id)).filter(Boolean):
    (mode==='listening'||mode==='speaking')?ALL_PROMPTS
    .filter(p=>p.kind===(mode==='listening'?'listen':'speak')&&(p.difficulty||'easy')===difficulty&&!p.bossOnly)
    .sort((x,y)=>Number(Boolean(save.reviewPrompts?.[y.id]&&save.reviewPrompts[y.id]<=dayKey()))-Number(Boolean(save.reviewPrompts?.[x.id]&&save.reviewPrompts[x.id]<=dayKey())))
    .slice(0,6):null;
  const prompts=forestMode?firstWave.prompts:focused||(mode==='daily'?gym.prompts:mode==='saved'?savedReviewQueue(save).filter(item=>!onlyDue||item.due).map(item=>item.prompt):selectRoundPrompts(save,promptCount,Math.random,dayKey(),difficulty));
  const roster=[save.selectedMonster,...(save.ownedMonsters||[])].filter(id=>(save.ownedMonsters||[]).includes(id));
  const battleTeam=tactical?createTrainedBattleParty(roster):null;
  play={mode:forestMode?'forest':mode,endless,quickStart:Boolean(tactical&&quickStart),areaId:area?.id||null,baseDifficulty:difficulty,difficulty:firstWave?.level||difficulty,
    prompts,index:0,wave:1,seenIds:[],remainingTries:0,encounterKey:null,eventChoices:{},eventMemories:[],
    bossHits:0,usedPower:false,usedShield:false,forestRelics:[],bossMedal:null,dungeonOutcomes:[],encounterHelp:false,smooth:0,hintedCount:0,dailyPhases:gym?.phases||[],retentionTransferIds:recallPlan?.transferIds||[],earnedXp:0,captured:[],hintUsed:false,
    revealed:false,speechState:'',startedAt:Date.now(),deadline:mode==='challenge'?Date.now()+60000:null,
    // The expedition follows one clear route. Decorative story/NPC choices
    // did not change grading or outcomes and interrupted every battle.
    route:area?.world==='city'?CITY_ROUTES[0].id:FOREST_ROUTES[0].id,companionId:save.selectedMonster,combo:0,bestCombo:0,
    tactics:tactical?{hp:fighterHealth(battleTeam,save.selectedMonster).hp,maxHp:fighterHealth(battleTeam,save.selectedMonster).maxHp,
      party:battleTeam,enemyHp:3,enemyMax:3,turn:'player',action:'attack',ultimate:0,
      formationPending:!quickStart,formationIds:[...battleTeam.roster],attackPrompt:null,defensePrompt:null,usedPromptIds:new Set(),lastEnemyKind:null,enemyKind:null,
      encounterIndex:-1,pendingAdvance:false,defenseHitTaken:false,bonusChargeUsed:false,comboUsed:false,lastAttackKind:null,nextEnemyKind:null,
      bossCounterUsed:false,bossLinkUsed:false,counterShield:0,bossCoverUsed:false,lastCoverNote:'',bossReactionCompleted:false,styleShieldIntact:true,foeShifted:false,masteryUsed:false}:null};
  $('#play-mode-label').textContent=`${forestMode?(endless?'∞ 森のエンドレス':tactical&&!quickStart?'戦略バトル · '+area.name:area.name):mode==='challenge'?'60秒チャレンジ':mode==='daily'?'今日の5分ジム':mode==='listening'?'リスニング道場':mode==='speaking'?'スピーキング道場':mode==='dungeon-review'?'ダンジョンの復習':mode==='saved'?'保存した問題の復習':mode==='retention'?'1・3・7日の定着チェック':'練習モード'} · ${mode==='retention'?'難易度ミックス':difficultyCopy[difficulty].label}`;
  $('#open-battle-guide').hidden=!forestMode;
  $('#forest-journey').hidden=!forestMode;
  $('#forest-battle-log').hidden=!forestMode;
  $('#play-view').classList.toggle('forest-active',forestMode);
 $('#play-view').classList.toggle('tactical-battle',Boolean(tactical));
  $('#play-view').classList.toggle('scene-battle',forestMode);
  arrangeBattleScene(forestMode);
  $('#play-view').classList.toggle('review-only',mode==='saved'||mode==='daily'||mode==='listening'||mode==='speaking'||mode==='dungeon-review'||mode==='retention');
  $('#play-clock').textContent=mode==='daily'?'5分目安 · 時間制限なし':'自分のペースで';
  if(forestMode){
    $('#forest-journey').classList.remove('forest-victory');
    $('#forest-world-stage').dataset.route='wild';
    $('#forest-world-stage').dataset.renderedRoute='';
  }
  showView('play');
  betaTelemetry.track('monsters_beta_start',{
    mode:mode==='forest-endless'?'forest-endless':tactical&&quickStart?'forest':mode,
    difficulty:mode==='retention'?'mixed':difficulty,
    chapter:area?.id||'other'
  });
  if(forestMode)showForestExplore(false);
  else renderQuestion();
  if (mode === 'challenge') timer = setInterval(updateClock,200);
  updateClock();
}
function updateClock() {
  if (!play) return;
  const clock=$('#play-clock');
  if (!play.deadline) { clock.textContent=play.mode==='daily'?'5分目安 · 時間制限なし':'自分のペースで';clock.classList.remove('urgent');return; }
  const left=Math.max(0,Math.ceil((play.deadline-Date.now())/1000));
  clock.textContent=`残り ${left} 秒`;
  clock.classList.toggle('urgent',left<=10);
  if (!left) finishSession(true);
}
function currentPrompt() {
  if(play?.mode==='forest'&&play.tactics){
    if(play.tactics.turn==='enemy'&&play.tactics.defensePrompt)return play.tactics.defensePrompt;
    if(play.tactics.turn==='player'&&play.tactics.attackPrompt)return play.tactics.attackPrompt;
  }
  return play?.prompts[play.index];
}
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
    $('#forest-world-backdrop').innerHTML=battleArenaArt(play.index>=regularCount(),play.areaId);
    world.dataset.renderedRoute=arenaKey;
  }
  world.dataset.stage='arena';
  world.dataset.tactics=String(Boolean(play.tactics));
  world.dataset.attack=companion.id;
  world.dataset.evolved=String(evolved);
  $('#forest-guard').innerHTML=guardArt();
  world.classList.toggle('forest-boss-stage',play.index>=regularCount());
  const area=dungeonAreaFor(play.areaId);
  $('.forest-chapter-pin').textContent=play.index>=regularCount()?`${area.english} · BOSS`:area.english;
  world.classList.remove('forest-attack','forest-player-damaged','forest-boss-defeated','forest-guarding','forest-defended','forest-reading-hit','forest-weakness-hit','forest-spell-cast');
  world.dataset.finisher='none';
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
    !play.tactics?'英語で攻撃！':play.tactics.turn==='enemy'?'敵のターン':'味方のターン';
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
  const route=[...FOREST_ROUTES,...CITY_ROUTES].find(entry=>entry.id===play.route);
  $('#forest-route-status').textContent=route ? route.name : '道を選ぶ前に、最初の関門へ';
  $$('[data-forest-gate]').forEach((node,index)=>{
    node.classList.toggle('is-current',play.index===index);
    node.classList.toggle('is-cleared',index<play.index);
    node.setAttribute('aria-current',play.index===index?'step':'false');
  });
  const bossMarker=$('[data-forest-boss]');
  bossMarker.classList.toggle('is-current',play.index>=regularCount());
  bossMarker.classList.toggle('is-cleared',play.index>=regularCount()+BOSS_HITS);
  const kind=currentPrompt()?.kind;
  const objective=DUNGEON_SKILLS[kind]||DUNGEON_SKILLS.speak;
  const brief=bossPhase?dungeonBossBrief(play.areaId,bossPhase.turn):null;
  $('#forest-scene-story').textContent=brief?`ボス確認 ${brief.phase}/3 · ${brief.objective}`:
    `${play.index+1}/${regularCount()}問 · ${objective.label}：${objective.goal}`;
  const log=$('#forest-battle-log');
  log.textContent=bossPhase?`ボス ${bossPhase.turn}/3 · ${bossPhase.kind==='listen'?'聞き取り':bossPhase.kind==='speak'?'スピーキング':'言葉の問題'}`:'';
}
function updateEnemyHealth(hit=false) {
  if(play?.mode!=='forest')return;
  const boss=play.index>=regularCount(),max=boss?BOSS_HITS:play.tactics?.enemyMax||1;
  const left=boss?Math.max(0,BOSS_HITS-play.bossHits):(play.tactics?play.tactics.enemyHp:hit?0:1);
  const meter=$('#forest-boss-hp');
  meter.hidden=false;
  meter.textContent=`HP ${left} / ${max}`;
  meter.setAttribute('aria-label',boss?'ボスのHP':'敵のHP');
  meter.setAttribute('aria-valuemax',String(max));
  meter.setAttribute('aria-valuenow',String(left));
  meter.style.setProperty('--boss-health',`${100*left/max}%`);
  const party=$('#forest-party-hp');
  if(party){
    party.hidden=!play.tactics;
  }
  if(party&&play.tactics){
    const active=monsterFor(play.companionId);
    // The active monster is named in the battle header. Keep this HUD meter
    // short enough to share one line with the foe's name and HP on iPhone.
    party.textContent=`味方 ${play.tactics.hp}/${play.tactics.maxHp}`;
    party.setAttribute('aria-label',`${active?.name||'味方'}のHP`);
    party.setAttribute('aria-valuenow',String(play.tactics.hp));
    party.setAttribute('aria-valuemax',String(play.tactics.maxHp));
    party.style.setProperty('--party-health',`${100*play.tactics.hp/play.tactics.maxHp}%`);
  }
}
function battleParty(){
 return play?.tactics?.party?.roster||[];
}
function syncActiveFighter(){
 const t=play?.tactics;
 if(!t)return;
 const fighter=fighterHealth(t.party,play.companionId);
 t.hp=fighter.hp;t.maxHp=fighter.maxHp;
}
function damageActiveFighter(damage){
 const t=play?.tactics;
 if(!t)return;
 t.party=applyFighterDamage(t.party,play.companionId,damage);
 syncActiveFighter();
}
function absorbIncomingBossHit(damage){
 const t=play?.tactics;
 if(!t)return {activeDamage:damage,partnerId:null};
 const cover=play.index>=regularCount()?bossReserveCoverFor({kind:t.enemyKind,activeId:play.companionId,
   party:t.party,used:t.bossCoverUsed,damage}):null;
 let actual=damage;
 t.lastCoverNote='';
 if(cover?.activated){
   t.party=applyFighterDamage(t.party,cover.partnerId,cover.partnerDamage);
   t.bossCoverUsed=true;
   actual=cover.activeDamage;
   t.lastCoverNote=`${monsterFor(cover.partnerId).name}が身代わり！ 出撃中の仲間へのダメージを2軽減し、控えHP−1。`;
 }
 damageActiveFighter(actual);
 return {activeDamage:actual,partnerId:cover?.partnerId||null};
}
function healActiveFighter(amount){
 const t=play?.tactics;
 if(!t)return;
 t.party=healFighter(t.party,play.companionId,amount);
 syncActiveFighter();
}
function awardTacticalCharge(rating,{spent=false}={}){
 const t=play?.tactics;
 if(!t)return;
 const skill=allySkill(play.companionId),strength=allyAffinity(play.companionId).strong;
 const bonus=rating==='smooth'&&t.turn==='enemy'&&skill.type==='charge'&&
   t.enemyKind===strength&&!t.bonusChargeUsed;
 t.ultimate=advanceUltimate(t.ultimate,{independent:rating==='smooth',bonus,spend:spent});
 if(bonus)t.bonusChargeUsed=true;
}
function compactBattleNotes(panel,t){
 const boss=panel.querySelector('.forest-boss-tactical-plan');
 let bossDetail=null;
 if(boss){
   const detail=document.createElement('details'),summary=document.createElement('summary');
   detail.className='forest-boss-brief';detail.open=Boolean(t.bossPlanOpen);
   summary.textContent='ボスの攻撃順・相性を確認';detail.append(summary);
   while(boss.firstChild)detail.append(boss.firstChild);
   boss.append(detail);
   bossDetail=detail;
   detail.addEventListener('toggle',()=>{if(play?.tactics===t&&detail.isConnected)t.bossPlanOpen=detail.open;});
 }
 const link=panel.querySelector('.forest-boss-link');
 if(link&&bossDetail&&link.dataset.linkReady!=='true')bossDetail.append(link);
 const secondary=[...panel.querySelectorAll('.forest-boss-counter,.forest-boss-cover,.forest-tactic-evolution,.forest-tactic-ability,.forest-tactic-note')];
 if(t.masteryUsed)secondary.push(...panel.querySelectorAll('.forest-tactic-mastery'));
 if(secondary.length){
   if(bossDetail)secondary.forEach(element=>bossDetail.append(element));
   else{
     const detail=document.createElement('details'),summary=document.createElement('summary');
     detail.className='forest-tactic-more';detail.open=Boolean(t.notesOpen);
     summary.textContent='相性・固有スキルなど詳しく見る';detail.append(summary);
     secondary.forEach(element=>detail.append(element));
     panel.append(detail);
     detail.addEventListener('toggle',()=>{if(play?.tactics===t&&detail.isConnected)t.notesOpen=detail.open;});
   }
 }
 const allies=panel.querySelector('.forest-tactic-party'),label=panel.querySelector('.forest-tactic-party-label');
 if(allies&&label){
   const detail=document.createElement('details'),summary=document.createElement('summary');
   detail.className='forest-party-brief';detail.open=Boolean(t.partyOpen);
   summary.textContent=t.turn==='enemy'?'敵の反撃中は仲間交代できないよ':`仲間を交代（残り${Math.max(0,1-t.party.swapsUsed)}回） · 控え${battleParty().length-1}体`;
   detail.append(summary);label.before(detail);detail.append(label,allies);
   detail.addEventListener('toggle',()=>{if(play?.tactics===t&&detail.isConnected)t.partyOpen=detail.open;});
 }
}
// The story battle is a language exercise first. Keep the four question types
// available, but let the player opt in to matchup calculations, alternate
// actions, party swaps and long boss notes only when they need them.
function simplifyTacticalInterface(panel,t,{incoming,supportReady}){
 const kinds=panel.querySelector('.forest-tactic-kinds');
 if(kinds){
   kinds.hidden=incoming||play.index>=regularCount();
   const label=document.createElement('p');
   label.className='forest-tactic-kind-label';
   label.textContent='問題の種類を変える';
   label.hidden=kinds.hidden;
   kinds.before(label);
 }
 const strategy=document.createElement('details'),summary=document.createElement('summary');
 strategy.className='forest-tactic-strategy';
 strategy.open=Boolean(t.strategyOpen);
 const ready=t.ultimate>=ULTIMATE_MAX&&(play.index<regularCount()||t.hp<t.maxHp);
 const status=!incoming&&ready?'必殺技が使える！':!incoming&&supportReady?'連携チャンス！':`必殺 ${t.ultimate}/${ULTIMATE_MAX}`;
 summary.innerHTML=`<span>${incoming?'戦況を詳しく見る':'出題・戦術を変更する'}</span><small>${status}</small>`;
 strategy.append(summary);
 [...panel.children].filter(child=>child!==strategy&&
   !child.matches('.forest-turn-task'))
   .forEach(child=>strategy.append(child));
 panel.append(strategy);
 strategy.addEventListener('toggle',()=>{
   if(play?.tactics===t&&strategy.isConnected)t.strategyOpen=strategy.open;
 });
}
function renderTacticalControls(){
 const panel=$('#forest-tactics'),t=play?.tactics;
 if(!panel)return;
 panel.hidden=play?.mode!=='forest'||!t;
 if(panel.hidden)return;
 const foe=opponentFor(play.index,play.wave,play.areaId);
 const ally=allyAffinity(play.companionId);
 const evolved=getMonsterProgress(save,play.companionId).evolved;
 const ability=allySkill(play.companionId);
 const mastery=masterySkillFor(play.companionId,getMonsterProgress(save,play.companionId).level);
 const boss=play.index>=regularCount();
 const foeStyle=foeStyleFor({areaId:play.areaId,index:play.index,wave:play.wave,boss});
 const element=foeBattleAffinity({foeId:foe.id,style:foeStyle,shifted:t.foeShifted});
 const finalBossStrike=boss&&play.index===regularCount()+BOSS_HITS-1;
 const incoming=t.turn==='enemy';
 const party=battleParty();
 const attackKind=currentPrompt()?.kind==='read'?'speak':currentPrompt()?.kind;
 const supportId=!incoming?supportPartnerFor({kind:attackKind,activeId:play.companionId,party:t.party}):null;
 const supportEvolved=Boolean(supportId&&getMonsterProgress(save,supportId).evolved);
 const preview=supportId?supportComboFor({kind:attackKind,activeId:play.companionId,party:t.party,
   selected:true,independent:true,boss,foeId:foe.id,foeProfile:element,partnerEvolved:supportEvolved}):null;
 const supportReady=Boolean(supportId&&!t.comboUsed&&(!boss||t.ultimate<ULTIMATE_MAX||preview.extraHeal));
 const previewEffect=preview?[
   boss?`必殺ゲージ＋${preview.extraCharge}`:`ダメージ＋${preview.extraDamage}`,
   preview.extraCharge&&!boss?`必殺ゲージ＋${preview.extraCharge}`:'',
   preview.extraHeal?`HP＋${preview.extraHeal}`:'',
   supportEvolved?`進化技：${evolvedSupportTalent(supportId,{boss,foeId:foe.id,foeProfile:element}).name}`:''
 ].filter(Boolean).join(' · '):'';
 const bossThreat=boss?bossAttackFor(foe.id,play.index-regularCount()):null;
 const bossLink=boss?bossFormationLinkPlan(foe.id):null;
 const linkPreview=boss?bossFormationLinkFor({foeId:foe.id,phase:play.index-regularCount(),
   activeId:play.companionId,party:t.party,independent:true,used:t.bossLinkUsed,
   ultimate:t.ultimate,shield:t.counterShield}):null;
 const counter=bossThreat?bossCounterFor({kind:bossThreat.kind,allyId:play.companionId,used:t.bossCounterUsed,
   evolved}):null;
 const coverKind=incoming?t.enemyKind:bossThreat?.kind;
 const coverPreview=boss?bossReserveCoverFor({kind:coverKind,activeId:play.companionId,
   party:t.party,used:t.bossCoverUsed,damage:3}):null;
 const recallTargets=tacticalReviewTargets();
 const pendingRecall=new Set([...recallTargets.dueIds,...recallTargets.weakIds]);
 const reserved=new Set([...t.usedPromptIds,...play.prompts.map(p=>p.id)]);
 const recallCounts=Object.fromEntries(BATTLE_KINDS.map(kind=>[kind,ALL_PROMPTS.filter(p=>
   p.kind===kind&&(p.difficulty||'easy')===play.difficulty&&!p.bossOnly&&
   (!p.world||p.world===play.areaId)&&!reserved.has(p.id)&&pendingRecall.has(p.id)).length]));
 const recallText=BATTLE_KINDS.filter(kind=>recallCounts[kind]>0)
   .map(kind=>`${BATTLE_LABELS[kind]} ${recallCounts[kind]}問`).join(' · ');
 if(!incoming){
   if(boss)t.nextEnemyKind=finalBossStrike?null:bossThreat.kind;
   else if(!t.nextEnemyKind)t.nextEnemyKind=foePlannedAttack({style:foeStyle,activeId:play.companionId,last:t.lastEnemyKind});
 }
 panel.innerHTML=`<p class="forest-turn-task" data-turn="${incoming?'enemy':'player'}"><strong>${incoming?'敵のターン':'あなたのターン'}</strong><span>${incoming?`${BATTLE_LABELS[t.enemyKind]}の問題に答えて防ごう。`:'英語で答えると攻撃！'}</span></p><div class="forest-tactic-heading"><strong>${incoming?'敵のターン · 防御問題':'味方のターン · 行動を選ぼう'}</strong><span>${incoming?'正解ならダメージ0':`敵の弱点：${BATTLE_LABELS[element.weak]}　耐性：${BATTLE_LABELS[element.resist]}`}</span></div>
  ${!incoming&&t.autoSwitchedTo?`<p class="forest-tactic-forecast" role="status">前の仲間が倒れたため、${escapeHtml(monsterFor(t.autoSwitchedTo).name)}が出撃！ 続けて英語で戦おう。</p>`:''}
  ${foeStyle?`<p class="forest-tactic-foe-style" data-foe-style="${foeStyle.id}" data-foe-shifted="${String(t.foeShifted)}"><strong>${foeStyle.name}</strong> ${foeStyle.id==='shift'&&t.foeShifted?`弱点変化済み：${BATTLE_LABELS[element.weak]}に弱い · ${BATTLE_LABELS[element.resist]}に耐性`:foeStyle.tip}${foeStyle.id==='shell'&&!t.styleShieldIntact?' · 殻は破れた！':''}</p>`:''}
  <p class="forest-tactic-matchup">${incoming?`${BATTLE_LABELS[t.enemyKind]}が飛んでくる！ 答えれば防げるよ。`:`仲間の得意：${BATTLE_LABELS[ally.strong]} · 苦手：${BATTLE_LABELS[ally.weak]}`}</p>
  ${boss?`<div class="forest-boss-tactical-plan" role="group" aria-label="ボスの3手の攻撃予告"><strong>ボスの攻撃パターン</strong><ol>${[0,1,2].map(phase=>{const threat=bossAttackFor(foe.id,phase);return `<li data-boss-plan-phase="${phase}" data-current="${String(phase===play.index-regularCount())}"><span>${phase+1}手目</span><b>${BATTLE_LABELS[threat.kind]}</b><small>${phase===2?'撃破で反撃なし':threat.pressure?'強攻撃':'通常攻撃'}</small></li>`;}).join('')}</ol><small>最初の2手は敵が反撃する。3つの英語確認をすべてクリアすると勝利！</small></div>`:''}
  ${boss?`<p class="forest-boss-link" data-link-ready="${String(!t.bossLinkUsed&&linkPreview?.partnerId&&play.index-regularCount()===bossLink.phase)}" data-link-used="${String(t.bossLinkUsed)}"><strong>連携：${escapeHtml(bossLink.name)}</strong> ${bossLink.phase+1}手目 · 控えの${BATTLE_LABELS[bossLink.kind]}で${bossLink.description}。${t.bossLinkUsed?' 発動済み。':linkPreview?.partnerId?` ${escapeHtml(monsterFor(linkPreview.partnerId).name)}が待機中！`:' 控えが必要。'}</p>`:''}
  ${boss&&!incoming&&!finalBossStrike?`<p class="forest-boss-counter" data-counter-ready="${String(counter.matched&&!t.bossCounterUsed)}">${t.bossCounterUsed?'このボスへの迎撃は使用済み。':counter.matched?`迎撃チャンス！ ${escapeHtml(monsterFor(play.companionId).name)}の得意な${BATTLE_LABELS[bossThreat.kind]}で自力正解すると、必殺ゲージ＋1・次の敵攻撃を1軽減${evolved?'・HP＋1':''}（ボス戦で1回）。`:`迎撃するなら${BATTLE_LABELS[bossThreat.kind]}が得意な仲間を出そう。自力正解なら必殺ゲージ＋1と次の敵攻撃−1（ボス戦で1回）。`}</p>`:''}
  ${boss&&party.length>1&&!finalBossStrike?`<p class="forest-boss-cover" data-cover-ready="${String(coverPreview?.activated)}">${t.bossCoverUsed?'控えの身代わりはこのボス戦で使用済み。':coverPreview?.activated?`控えの${escapeHtml(monsterFor(coverPreview.partnerId).name)}が身代わり待機。${BATTLE_LABELS[coverKind]}で自力防御を失い、HPが2以上減るときにダメージを2軽減・控えHP−1（ボス戦で1回）。自力正解・判定保留なら発動しない。`:'控えの身代わりは「出撃中の仲間が苦手・控えが得意」な技能の敵攻撃でだけ発動するよ。'}</p>`:''}
  ${incoming?'':`<p class="forest-tactic-forecast"><strong>${finalBossStrike?'最終撃：正解で勝利！':`次の敵攻撃：${BATTLE_LABELS[t.nextEnemyKind]}`}</strong></p>`}
  ${!incoming&&evolved?`<p class="forest-tactic-evolution">進化ボーナス：得意な${BATTLE_LABELS[ally.strong]}の威力＋1 / 同技能の被ダメージ−1</p>`:''}
  <div class="forest-ultimate-meter" role="progressbar" aria-label="必殺ゲージ" aria-valuemin="0" aria-valuemax="${ULTIMATE_MAX}" aria-valuenow="${t.ultimate}"><strong>必殺ゲージ ${t.ultimate} / ${ULTIMATE_MAX}</strong><span class="forest-ultimate-track"><span style="width:${100*t.ultimate/ULTIMATE_MAX}%"></span></span></div>
  <p class="forest-tactic-ability"><strong>固有スキル：${escapeHtml(ability.name)}</strong> ${escapeHtml(ability.description)}</p>
  ${mastery?`<p class="forest-tactic-mastery" data-mastery-used="${String(t.masteryUsed)}"><strong>Lv.${MASTERY_LEVEL}技：${escapeHtml(mastery.name)}${t.masteryUsed?' · 使用済み':' · 準備OK'}</strong> ${escapeHtml(mastery.description)}</p>`:''}
  ${incoming?'':`<div class="forest-tactic-actions" role="group" aria-label="行動を選ぶ">${[
    ['attack','こうげき','何度でも使用可能'],['skill','必殺技',boss?'ボス戦：味方HPを2回復':`高威力 · ${ability.name}`],
    ...(party.length>1?[['assist','仲間と連携',t.comboUsed?'この敵には使用済み':supportId?`${monsterFor(supportId).name}が援護 · ${previewEffect}${!supportReady?'（ゲージが満タン）':''}`:'控えの得意技能を選ぶと使える']]:[])
  ].map(([id,label,desc])=>`<button type="button" data-tactic-action="${id}" aria-pressed="${String(t.action===id)}" ${id==='skill'&&(t.ultimate<ULTIMATE_MAX||(boss&&t.hp===t.maxHp))||id==='assist'&&!supportReady?'disabled':''}><strong>${label}</strong><small>${escapeHtml(desc)}</small></button>`).join('')}</div>
  <div class="forest-tactic-kinds" role="group" aria-label="攻撃する英語の種類">${BATTLE_KINDS.map(kind=>`<button type="button" data-tactic-kind="${kind}" aria-pressed="${String((currentPrompt().kind==='read'?'speak':currentPrompt().kind)===kind)}" ${boss?'disabled':''}>${BATTLE_LABELS[kind]}</button>`).join('')}</div>
  ${!boss&&recallText?`<p class="forest-tactic-review"><strong>今日の復習候補</strong> ${escapeHtml(recallText)}<small>技能を切り替えると、期限が来た復習・苦手問題を優先するよ。</small></p>`:''}
  ${boss?'<small class="forest-tactic-note">ボスは3問すべて正解で勝利。必殺技も英語の正解が必要。</small>':t.lastAttackKind?`<small class="forest-tactic-note">${BATTLE_LABELS[t.lastAttackKind]}を連続使用すると威力−1。</small>`:'<small class="forest-tactic-note">技能を変えると攻撃問題も切り替わるよ。</small>'}
  ${party.length>1?`<div class="forest-tactic-party-label">仲間交代 · 残り${1-t.party.swapsUsed}回</div><div class="forest-tactic-party" role="group" aria-label="戦う仲間を交代">${party.map(id=>{const growth=getMonsterProgress(save,id),monster=monsterFor(id),affinity=allyAffinity(id),health=fighterHealth(t.party,id),active=id===play.companionId;return `<button type="button" data-tactic-ally="${id}" aria-pressed="${String(active)}" ${!active&&!canTacticalSwap(t.party,play.companionId,id)?'disabled':''} data-fainted="${health.hp===0}"><strong>${escapeHtml(growth.evolved?monster.evolvedName:monster.name)}${active?' · 出撃中':''}</strong><small>HP ${health.hp}/${health.maxHp} · ${health.hp===0?'戦闘不能':`${BATTLE_LABELS[affinity.strong]}が得意`}</small></button>`;}).join('')}</div>`:''}`}`;
 panel.dataset.turn=incoming?'enemy':'player';
 compactBattleNotes(panel,t);
 simplifyTacticalInterface(panel,t,{incoming,supportReady});
 if(incoming){
   $$('[data-tactic-ally]',panel).forEach(button=>{button.disabled=true;button.title='敵の反撃中は交代できません';});
   return;
 }
 $$('[data-tactic-action]',panel).forEach(button=>button.addEventListener('click',()=>{
   if(!play||play.revealed||play.tactics.turn!=='player')return;
   if(button.dataset.tacticAction==='skill'&&(play.tactics.ultimate<ULTIMATE_MAX||(boss&&play.tactics.hp===play.tactics.maxHp)))return;
   if(button.dataset.tacticAction==='assist'&&!supportReady)return;
   play.tactics.action=button.dataset.tacticAction;
   renderTacticalControls();
 }));
 $$('[data-tactic-ally]',panel).forEach(button=>button.addEventListener('click',()=>{
   if(!play||play.revealed||play.tactics.turn!=='player'||!canTacticalSwap(play.tactics.party,play.companionId,button.dataset.tacticAlly))return;
   play.tactics.party=consumeTacticalSwap(play.tactics.party,play.companionId,button.dataset.tacticAlly);
   play.companionId=button.dataset.tacticAlly;play.tactics.action='attack';syncActiveFighter();
   renderForestHud();renderTacticalControls();
 }));
 $$('[data-tactic-kind]',panel).forEach(button=>button.addEventListener('click',()=>{
   if(!play||play.revealed||play.tactics.turn!=='player'||play.index>=regularCount())return;
   const kind=button.dataset.tacticKind;
   if((currentPrompt().kind==='read'?'speak':currentPrompt().kind)===kind)return;
   const base=play.prompts[play.index];
   const candidate=(base.kind===kind&&!play.tactics.usedPromptIds.has(base.id))?base:
     pickBattlePrompt({prompts:ALL_PROMPTS,kind,difficulty:play.difficulty,areaId:play.areaId,
       usedIds:play.tactics.usedPromptIds,reservedIds:play.prompts.filter(p=>p.id!==base.id).map(p=>p.id),
       ...tacticalReviewTargets()});
   if(!candidate){$('#forest-battle-log').textContent='この技能の未出題問題が見つからなかったよ。別の技能を選んでね。';return;}
   play.tactics.attackPrompt=candidate;
   play.tactics.action='attack';
   renderQuestion();
 }));
}
function startEnemyTurn(){
 const t=play?.tactics;
 if(!t)return;
 t.turn='enemy';t.autoSwitchedTo=null;t.actionAtAttack=t.action;t.defenseHitTaken=false;t.lastHitDamage=0;t.lastCoverNote='';
 const boss=play.index>=regularCount();
 const threat=boss?bossAttackFor(opponentFor(play.index,play.wave,play.areaId).id,play.index-regularCount()):null;
 t.enemyKind=threat?.kind||t.nextEnemyKind||nextEnemyKind(t.lastEnemyKind);
 t.enemyPressure=threat?.pressure||foeAttackPressure(foeStyleFor({areaId:play.areaId,index:play.index,wave:play.wave,boss}));
 t.nextEnemyKind=null;
 t.lastEnemyKind=t.enemyKind;
 t.defensePrompt=pickBattlePrompt({prompts:ALL_PROMPTS,kind:t.enemyKind,difficulty:play.difficulty,
   areaId:play.areaId,usedIds:t.usedPromptIds,reservedIds:play.prompts.map(p=>p.id),
   ...tacticalReviewTargets()});
 // All four skill banks are expected to be available at each difficulty.
 if(!t.defensePrompt){
   t.turn='player';
   if(t.pendingAdvance){advanceClearedEncounter();return;}
   t.attackPrompt=null;renderQuestion();return;
 }
 renderQuestion();
}
function advanceClearedEncounter(){
 const t=play?.tactics;
 // Keep pendingAdvance until advanceQuestion consumes the cleared encounter.
 // Clearing it here would mistakenly launch a second enemy turn after a
 // completed boss defense (and could trap players in endless retaliation).
 if(t){t.attackPrompt=null;t.defensePrompt=null;t.turn='player';t.action='attack';t.counterShield=0;}
 advanceQuestion();
}
function finishEnemyTurn(){
 const t=play?.tactics;
 if(!t)return;
 const active=firstStandingAlly(t.party,play.companionId);
 if(!active){finishSession(false,true);return;}
 if(active!==play.companionId){
   play.companionId=active;syncActiveFighter();
   t.autoSwitchedTo=active;
 }
 t.turn='player';t.defensePrompt=null;t.action='attack';t.counterShield=0;
 t.nextEnemyKind=foePlannedAttack({style:foeStyleFor({areaId:play.areaId,index:play.index,wave:play.wave,boss:play.index>=regularCount()}),activeId:play.companionId,last:t.lastEnemyKind});
 if(t.pendingAdvance){advanceClearedEncounter();return;}
 t.attackPrompt=pickBattlePrompt({prompts:ALL_PROMPTS,kind:nextEnemyKind(currentPrompt()?.kind),difficulty:play.difficulty,
   areaId:play.areaId,usedIds:t.usedPromptIds,reservedIds:play.prompts.map(p=>p.id),
   ...tacticalReviewTargets()});
 if(!t.attackPrompt){t.attackPrompt=null;}
 renderQuestion();
}
function renderPartyFormation(){
 const t=play?.tactics,screen=$('#forest-party-formation');
 if(!t||!t.formationPending)return;
 const foe=opponentFor(0,play.wave,play.areaId),weakness=foeAffinity(foe.id);
 const roster=t.formationIds,owned=(save.ownedMonsters||[]).filter(id=>MONSTERS.some(monster=>monster.id===id));
 const candidates=[...roster,...owned.filter(id=>!roster.includes(id))];
 const bossId=(AREA_BOSSES[play.areaId]||{}).id;
 const bossForecast=bossId?[0,1,2].map(phase=>bossAttackFor(bossId,phase)):[];
 const link=bossFormationLinkPlan(bossId);
 const currentLeader=roster[0];
 const reserveMatches=kind=>roster.slice(1).filter(id=>allyAffinity(id).strong===kind);
 const coverCount=currentLeader?bossForecast.filter(move=>allyAffinity(currentLeader).weak===move.kind&&reserveMatches(move.kind).length).length:0;
 const rangeCount=new Set(roster.map(id=>allyAffinity(id).strong)).size;
 const guide=owned.length===1?'この仲間で始められるよ。下の「出発」を押そう。':'仲間をタップして選ぼう。準備できたら出発！';
 screen.innerHTML=`<div class="forest-formation-target"><strong>最初の敵：${escapeHtml(foe.name)}</strong><span>弱点：${BATTLE_LABELS[weakness.weak]} ／ 耐性：${BATTLE_LABELS[weakness.resist]}</span></div>
 <details class="forest-formation-boss-wrap"><summary>ボスの攻撃・連携を見る</summary><div class="forest-formation-boss-plan" role="group" aria-label="ボスへの編成作戦"><strong>ボスの反撃予告</strong><div>${bossForecast.map((move,i)=>`<span>${i+1}手目：${i===2?'最終撃':BATTLE_LABELS[move.kind]}${i===2?'':move.pressure?' · 強':''}</span>`).join('')}</div>${link?`<p class="forest-formation-link"><strong>連携：${escapeHtml(link.name)}</strong> ${link.phase+1}手目 · 控えの${BATTLE_LABELS[link.kind]}で${link.description}。${reserveMatches(link.kind).length?' この編成で狙える！':' 控えを選ぼう。'}</p>`:''}<details class="forest-formation-extra"><summary>${coverCount?'身代わりできる組み合わせあり':'身代わり・相性の詳しい条件'}</summary><p>編成の得意技能は${rangeCount}種類。控えが先頭の苦手技能を得意としていると、ボスの反撃で身代わりできることがあるよ。身代わりはボス戦で1回。英語の正誤判定は変わらない。</p></details></div></details>
 <div class="forest-formation-title"><strong>出撃メンバー ${roster.length} / 3体</strong><span>先頭の仲間から戦闘スタート</span></div>
 <div class="forest-formation-slots" aria-label="選んだ出撃メンバー">${[0,1,2].map((_,index)=>{
   const id=roster[index],monster=id?monsterFor(id):null,progress=id?getMonsterProgress(save,id):null;
   return `<div class="forest-formation-slot" data-formation-slot="${index}"><small>${index===0?'先頭':`控え${index}`}</small><strong>${monster?escapeHtml(monster.japaneseName||monster.name)+(progress.evolved?' ★':''):'未選択'}</strong></div>`;
 }).join('')}</div>
 <div class="forest-formation-choices" role="group" aria-label="仲間を編成する">${candidates.map(id=>{
   const monster=monsterFor(id),progress=getMonsterProgress(save,id),affinity=allyAffinity(id);
   const selected=roster.includes(id),leader=id===roster[0];
   const match=affinity.strong===weakness.weak?'弱点を狙える！':affinity.strong===weakness.resist?'敵に耐性あり':'技能を使い分けよう';
   const mastery=masterySkillFor(id,progress.level);
   const label=leader?'先頭で出撃中':selected?'控えから外す':roster.length===3?'控え3と交代':'仲間に加える';
   return `<div class="forest-formation-card" data-formation-card="${escapeHtml(id)}" data-formation-selected="${selected}" data-formation-leader="${leader}">
    <div class="forest-formation-creature" aria-hidden="true">${monsterArt(id,progress.evolved)}</div>
    <div class="forest-formation-detail"><strong>${escapeHtml(monster.japaneseName||monster.name)}${progress.evolved?' ★':''}</strong><span>Lv.${progress.level} · 得意 ${BATTLE_LABELS[affinity.strong]}</span><details class="forest-formation-monster-more"><summary>能力を見る</summary><span>${escapeHtml(progress.evolved?monster.evolvedName:monster.name)} · HP成長＋${levelHpBonus(progress.level)+(progress.evolved?1:0)} · 苦手 ${BATTLE_LABELS[affinity.weak]}</span><small>${match}${progress.evolved?` · 進化援護「${evolvedSupportTalent(id).name}」`:''}${mastery?` · 熟練技「${escapeHtml(mastery.name)}」`:` · Lv.${MASTERY_LEVEL}で熟練技`}</small></details></div>
    <div class="forest-formation-buttons"><button type="button" data-formation-choice="${escapeHtml(id)}" aria-pressed="${String(selected)}">${label}</button>${selected&&!leader?`<button type="button" class="forest-formation-lead" data-formation-lead="${escapeHtml(id)}">先頭にする</button>`:''}</div>
   </div>`;
 }).join('')}</div><p class="forest-formation-status" role="status" aria-live="polite" id="forest-formation-status">${escapeHtml(t.formationMessage||guide)}</p>`;
 $$('[data-formation-choice]',screen).forEach(button=>button.addEventListener('click',()=>{
   if(!play?.tactics?.formationPending)return;
   const target=button.dataset.formationChoice;
   if(target===t.formationIds[0]){
     t.formationMessage=owned.length===1?'今はこの仲間1体で出撃するよ。仲間が増えたらここで編成できる！':'この仲間が先頭で出撃中だよ。ほかの仲間を選ぶか「先頭にする」で変更できるよ。';
   }else{
     const wasSelected=t.formationIds.includes(target);
     t.formationIds=editBattleFormation(t.formationIds,owned,target);
     t.formationMessage=wasSelected?'控えから外したよ。もう一度タップすると戻せるよ。':'編成を更新したよ！「この編成で出発する」から戦おう。';
   }
   renderPartyFormation();
 }));
 // The artwork and empty area of each card also respond to a finger tap.
 $$('[data-formation-card]',screen).forEach(card=>card.addEventListener('click',event=>{
   if(event.target.closest('button,summary,details'))return;
   card.querySelector('[data-formation-choice]')?.click();
 }));
 $$('[data-formation-lead]',screen).forEach(button=>button.addEventListener('click',()=>{
   if(!play?.tactics?.formationPending)return;
   t.formationIds=editBattleFormation(t.formationIds,owned,button.dataset.formationLead,{leader:true});
   t.formationMessage='先頭の仲間を変更したよ！';
   const leader=t.formationIds[0],evolved=getMonsterProgress(save,leader).evolved;
   $('#forest-explore-art .forest-explore-companion').innerHTML=monsterArt(leader,evolved);
   renderPartyFormation();
 }));
}
function showForestExplore() {
  if(!play || play.mode!=='forest')return;
  cancelAutoAdvance();
  stopAudio();
  const view=$('#play-view'), map=$('#forest-explore-art');
  const formation=Boolean(play.tactics?.formationPending);
  $('#forest-explore-screen').classList.toggle('is-forming-party',formation);
  const displayCompanion=formation?play.tactics.formationIds[0]:play.companionId;
  const companion=monsterFor(displayCompanion);
  const evolved=getMonsterProgress(save,displayCompanion).evolved;
  const foe=opponentFor(play.index,play.wave,play.areaId);
  const area=dungeonAreaFor(play.areaId);
  const isBoss=play.index>=regularCount();
  const stage=Math.min(4,Math.max(0,Math.round(4*play.index/Math.max(1,regularCount()))));
  map.innerHTML=forestWorldArt(play.route,play.areaId)+
    '<div class="forest-explore-depth" aria-hidden="true"></div>'+
    '<div class="forest-explore-companion">'+monsterArt(companion.id,evolved)+'</div>'+
    '<div class="forest-explore-destination" aria-hidden="true"></div>';
  // Repeat a softly blurred crop behind the legible, full-width route map.
  // A landscape SVG in a portrait iPhone would otherwise leave huge blank
  // bands above and below the path, making the opening feel unfinished.
  const routeSvg=map.querySelector('svg.forest-world-svg');
  if(routeSvg){
    const ambient=routeSvg.cloneNode(true);
    ambient.classList.remove('forest-world-svg','city-world-svg');ambient.classList.add('forest-depth-svg');
    ambient.setAttribute('preserveAspectRatio','xMidYMid slice');
    map.querySelector('.forest-explore-depth').appendChild(ambient);
  }
  map.dataset.step=String(stage);
  map.dataset.route=play.route||'wild';
  map.dataset.area=play.areaId;
  $('#forest-explore-screen').classList.toggle('boss-approach',isBoss);
  $('#forest-explore-title').textContent=formation?'出撃する仲間を選ぼう':isBoss?`${area.name}のボスへ`:play.index===0?`${area.name}へ出発`:`${area.name} · ${play.index+1}戦目`;
  $('#forest-explore-description').textContent=formation?'この編成で出発できるよ。':
    isBoss?'ボスが待っている！':
    play.index===0?'出発して最初の問題に挑もう。':
    '次の戦闘へ進もう。';
  const eventPanel=$('#forest-explore-event');
  $('#forest-explore-screen').classList.remove('has-story-event');
  eventPanel.hidden=true;
  eventPanel.replaceChildren();
  const formationPanel=$('#forest-party-formation');
  formationPanel.hidden=!formation;
  if(formation)renderPartyFormation();
  const options=$('#forest-explore-options');
  options.hidden=true;
  options.replaceChildren();
  const forward=$('#forest-explore-continue');
  forward.hidden=false;
  forward.textContent=formation?'この仲間で出発':isBoss?'ボスと戦う':play.index===0?'冒険を始める':'次の問題へ';
  view.classList.add('forest-exploring');
  $('#forest-explore-screen').hidden=false;
  $('#forest-journey').hidden=true;
  $('.forest-command-window').hidden=true;
  window.scrollTo({top:0,behavior:'instant'});
}
function keepMobileQuestionInView(){
 if(play?.mode!=='forest'||window.innerWidth>690)return;
 if($('#play-view').classList.contains('scene-battle'))return; // The characters remain onscreen; only the inner console scrolls.
 const session=play;
 // A long previous answer can leave Safari scrolled below the new question.
 // Correct that upward only. Never pull the learner downward on the first
 // encounter or when the new task is already visible; that felt like a jump.
 requestAnimationFrame(()=>{
   const card=$('#play-card'),field=$('#forest-journey');
   if(play!==session||$('#play-view').hidden||!card||!field||field.hidden||document.hidden)return;
   if(card.getBoundingClientRect().top>=16)return;
   const reserved=Math.min(300,field.getBoundingClientRect().height)+12;
   const desired=window.scrollY+card.getBoundingClientRect().top-reserved;
   const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
   const target=Math.max(0,Math.min(desired,max));
   if(target<window.scrollY-24)window.scrollTo({top:target,behavior:'instant'});
 });
}

function renderQuestion() {
  if (!play) return;
  let openingEncounter=false;
  cancelAutoAdvance();
  $('#play-view').classList.remove('forest-exploring');
  $('#forest-explore-screen').hidden=true;
  $('#forest-journey').hidden=play.mode!=='forest';
  $('.forest-command-window').hidden=false;
  stopAudio();
  $('#answer-area').hidden=false;
  $('#answer-area').classList.remove('listening-result-only');
  $('#forest-journey').classList.remove('forest-victory');
  play.hintUsed=play.mode==='forest'&&Boolean(play.encounterHelp);play.revealed=false;play.speechState='';play.quizMissRecorded=false;
  if(play.mode==='forest'){
    const key=`${play.wave}:${play.index}`;
    if(play.encounterKey!==key){
      openingEncounter=true;
      play.encounterKey=key;
      play.encounterHelp=false;play.hintUsed=false;
      play.remainingTries=DIFFICULTY_TRIES[play.difficulty];
      play.attemptReviewed=false;
      const t=play.tactics;
      if(t){
        t.encounterIndex=play.index;t.enemyHp=play.index>=regularCount()?BOSS_HITS-play.bossHits:encounterVitality(play.areaId,play.index);
        t.enemyMax=encounterVitality(play.areaId,play.index,{boss:play.index>=regularCount()});
        t.turn='player';t.action='attack';t.attackPrompt=null;t.defensePrompt=null;t.pendingAdvance=false;
        t.bonusChargeUsed=false;t.comboUsed=false;t.lastAttackKind=null;t.autoSwitchedTo=null;t.party={...t.party,swapsUsed:0};t.bossReactionCompleted=false;t.styleShieldIntact=true;t.foeShifted=false;
        if(play.index<=regularCount())t.masteryUsed=false; // Boss phases share one mastery use.
        t.counterShield=0;
        if(play.index===regularCount()){t.bossCounterUsed=false;t.bossCoverUsed=false;t.bossLinkUsed=false;}
      }
    }
    renderForestHud();
    $('#forest-world-stage').dataset.cinematic='idle';
    $('#forest-world-stage').dataset.encounter=String(play.index+1);
    syncBattleAura();
  }
  renderTacticalControls();
  const prompt=currentPrompt();
  if (!prompt) {finishSession();return;}
  if(play.mode==='forest')$('#forest-world-stage').dataset.challenge={speak:'スピーキング',listen:'リスニング',vocab:'単語',grammar:'文法',read:'読解'}[prompt.kind]||'英語チャレンジ';
  const hintKey=`${play.mode}:${play.wave||1}:${play.index}:${prompt.id}`;
  if(play.hintKey!==hintKey){play.hintKey=hintKey;play.hintStep=0;if(play.tactics)play.hintUsed=false;}
  const reviewing=!!(save.reviewPrompts?.[prompt.id] && save.reviewPrompts[prompt.id]<=dayKey());
  if(play.mode==='forest'){
    const enemyTurn=play.tactics?.turn==='enemy';
    const style=enemyTurn?'incoming':prompt.kind==='listen'?'defense':prompt.kind==='read'?'reading':prompt.kind==='vocab'?'weakness':prompt.kind==='grammar'?'spell':'attack';
    $('#forest-world-stage').dataset.action=style;
    const move=forestBossPhase({areaId:play.areaId,index:play.index,wave:play.wave,level:play.difficulty,prompt});
    // Tactical turn instructions are already next to the question. Reserve
    // the large battle log for meaningful results and state changes.
    $('#forest-battle-log').textContent=play.tactics?'':enemyTurn?`敵の反撃：${BATTLE_LABELS[play.tactics.enemyKind]}。正解で防ごう。`:style==='defense'?'音声を聞いて選ぼう。':style==='reading'?'文章を読んで答えよう。':style==='weakness'?'単語を選ぼう。':style==='spell'?'単語を並べよう。':'英語で答えよう。';
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
  $('#play-card').innerHTML=`<div class="question-top"><span>${play.mode==='forest'&&play.tactics?.turn==='enemy'?'ENEMY TURN':play.mode==='forest'?(play.index>=regularCount()?'BOSS ATTACK':'ENCOUNTER'):'QUESTION'} ${play.mode==='forest'?(play.index>=regularCount()?play.bossHits+1:play.index+1):play.index+1} / ${play.mode==='forest'?(play.index>=regularCount()?BOSS_HITS:regularCount()):play.prompts.length}</span><span class="question-tag">${play.mode==='forest'&&prompt.kind==='listen'?'LISTEN & CHOOSE':play.mode==='forest'&&prompt.kind==='read'?'READING STRIKE':prompt.kind==='vocab'?'VOCAB WEAKNESS':prompt.kind==='grammar'?'GRAMMAR MAGIC':englishMode?'ENGLISH → ENGLISH':prompt.kind==='listen'?'LISTENING ONLY':'JAPANESE → ENGLISH'}</span></div>${listenMode?`<div class="listening-first" id="listening-first" data-level="${comprehension.level}"><p class="scenario-label">AUDIO FIRST · ${comprehension.level.toUpperCase()}</p><h1 class="listening-heading">${englishMode?'Listen first. Decide what you heard.':'英語を聞いて、意味を選ぼう。'}</h1><p class="question-caption">${englishMode?'Listen carefully before choosing. The English transcript is hidden.':'英語の文章は隠れています。音声を聞いてから意味を選んでね。'}</p><button type="button" class="listen-control listening-play" id="play-audio"><span class="audio-glyph" aria-hidden="true"></span> ${englishMode?'Play / replay audio':'英語を聞く・もう一度聞く'}</button><div id="listening-meaning" class="listening-meaning" hidden><p class="listening-check-title">${escapeHtml(comprehension.question)}</p><div class="listening-choices" role="group" aria-label="音声の意味を選択">${comprehension.options.map((choice,index)=>`<button type="button" class="listening-choice" data-listening-choice="${index}" lang="${englishMode?'en':'ja'}">${escapeHtml(choice)}</button>`).join('')}</div><p id="listening-status" class="listening-status" role="status" aria-live="polite">${englishMode?'Choose what you heard. No microphone needed.':'聞き取れた内容を選ぼう。'}</p></div><button type="button" class="hint-button listening-fallback" id="reveal-transcript">${englishMode?'Audio unavailable? Show transcript (hint)':'音が出ない場合は英文を表示（ヒント扱い）'}</button><p class="transcript-fallback" id="transcript" lang="en" hidden></p></div>`:`${readingPassage}${questionBody}`}`;
  if(play.mode==='forest'&&retentionOverview(save,dayKey()).due.some(row=>row.id===prompt.id)){
    const tag=document.createElement('span');tag.className='dungeon-recall-tag';
    tag.textContent='記憶の試練 · 復習問題';
    $('#play-card').querySelector('.question-top').append(tag);
  }
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
  if(play.mode==='daily'){
    const category=play.dailyPhases[play.index]||'mixed';
    const stage=document.createElement('p');
    stage.className='daily-question-kind';
    stage.textContent=englishMode?({review:'REVIEW',transfer:'TRANSFER',new:'NEW SKILL',mixed:'PRACTICE'}[category]):
      ({review:'苦手を復習',transfer:'別の場面で応用',new:'新しい表現',mixed:'今日の練習'}[category]);
    bookmark.after(stage);
  }
  if(play.mode==='retention'){
    const isTransfer=play.retentionTransferIds.includes(prompt.id);
    const stage=document.createElement('p');stage.className='daily-question-kind';
    stage.textContent=isTransfer?'別の場面で応用 · この問題は新しい復習予定に入るよ':'予定日の記憶チェック · ヒントなしで思い出そう';
    bookmark.after(stage);
  }
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
    const brief=dungeonBossBrief(play.areaId,bossTurn.turn);
    warning.textContent=`確認 ${bossTurn.turn}/3 · ${brief?.objective||'学んだことを使う'}`;
    dialogue.append(counter,title,context,warning);
    $('#play-card').querySelector('.question-top').after(dialogue);
  }
  const beginnerTip=!englishMode&&!quizMode?`<p class="beginner-speak-tip">やさしいモード：長い英文は必要ないよ。${prompt.bossOnly?'短い2つの内容を伝えよう。':'まずは短い1文で伝えよう。'}</p>`:'';
  const guidedCloze=beginnerClozeFor(prompt);
  $('#answer-area').innerHTML=`${quizControlsHtml(prompt)}${beginnerTip}
    <label class="answer-label" for="spoken-answer">${quizMode?'選んだ答え（手入力もOK）':'英語で答えよう · 話すか入力'}</label>
    <div class="answer-row"><textarea id="spoken-answer" class="answer-input" rows="3" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="ここに英語を入力（マイクもOK）"></textarea><button id="mic-button" type="button" class="mic-button" title="マイクで話す" aria-label="マイクで話す" aria-pressed="false"><span class="mic-glyph mic-glyph-talk" aria-hidden="true"></span><span>話す</span></button></div>
    <div class="answer-quick-help"><div><strong>${guidedCloze?'空欄だけの練習から始められるよ':'困ったらヒントを使おう'}</strong><small>${guidedCloze?'1単語だけ言ったら確認。そのあとで全文に挑戦しよう。':'考え方 → 英語の書き出し。ヒント後の正解も練習として記録するよ。'}</small></div><button class="hint-button speaking-hint-action" id="show-hint" type="button" aria-controls="hint-panel" aria-expanded="false">${guidedCloze?'穴埋めヒントを見る':'ヒントを見る'}</button></div>
    <div id="hint-panel" class="hint-box speaking-hint-panel" role="status" aria-live="polite" hidden></div>
    <button id="retry-mic" type="button" class="retry-mic" hidden>↻ 録音し直す</button><p id="speech-helper" class="answer-helper" role="status" aria-live="polite">マイクが使えないときは英文を入力して判定できます。</p><details id="speech-alternatives" class="speech-alternatives" hidden><summary>マイクが使えないときの入力方法</summary><div class="speech-alternatives-actions"><button type="button" id="native-dictation" class="speech-native-button">iPhone標準の音声入力を使う</button><button type="button" id="copy-safari-url" class="speech-copy-button">URLをコピーしてSafariで開く</button><p id="speech-alternative-help">アプリ内ブラウザでは音声認識が止まることがあります。入力欄を開き、キーボードのマイクを押して話してね。</p></div></details><div class="learning-controls"><button class="reveal-button" id="show-answer">答えを判定する →</button></div><div id="feedback-panel"></div>`;
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
  if(play.hintStep)renderHintPanel(speakingHintSteps(prompt,phraseFor(prompt.phraseId)),play.hintStep);
  $('#show-answer').addEventListener('click',gradeAnswer);
  $('#spoken-answer').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();gradeAnswer();}});
  const isIOS=/iPad|iPhone|iPod/i.test(navigator.userAgent);
  const nativeBossSpeech=isIOS && play.mode==='forest' && play.index===regularCount()+BOSS_HITS-1 && !quizMode;
  $('#mic-button').dataset.nativeDictation=String(nativeBossSpeech);
  $('#speech-alternatives').hidden=quizMode||!isIOS;
  $('#speech-alternatives').open=play.mode!=='forest';
  if(nativeBossSpeech){
    // The final boss's speaking prompt follows listening playback. iOS
    // embedded browsers can fire onstart but never return a transcript.
    // Use keyboard dictation as the primary mic path, not the stalled API.
    $('#speech-alternatives').classList.add('speech-alternatives-priority');
    $('#native-dictation').textContent='おすすめ：iPhone標準の音声入力で答える';
    $('#speech-alternative-help').textContent='話すボタンはiPhoneのキーボードを開くよ。キーボードのマイクを押して話してね。';
  }
  $('#native-dictation').addEventListener('click',openNativeDictation);
  $('#copy-safari-url').addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(location.href);
      $('#speech-alternative-help').textContent='URLをコピーしました。Safariを開いてアドレス欄に貼り付けてね。';
    }catch{
      $('#speech-alternative-help').textContent='コピーできませんでした。共有メニューからSafariで開くか、URLをSafariに貼り付けてね。';
    }
  });
  $('#spoken-answer').addEventListener('input',()=>{
    $('#spoken-answer').classList.remove('transcript-interim');
    if(!recognition&&!quizMode)micView('ready');
  });
  if(!quizMode){
    micView('ready');
    if(isIOS)$('#speech-helper').textContent=nativeBossSpeech
      ?'ボス最終問：緑の「入力」でキーボードを開き、キーボードのマイクを押して話そう。'
      :'内蔵ブラウザの音声認識が使えない場合は、下のiPhone標準の音声入力に切り替えてね。';
    else if(play.mode==='forest')$('#speech-helper').textContent='';
  }
  if(reviewing)$('#speech-helper').textContent=quizMode?'苦手の復習です。前回のヒントを思い出して解いてみよう。':'復習問題です。前回とは違う言い方でも挑戦してみよう。';
  if(listenMode){
    $('#answer-area').hidden=true;
    const state=play.listeningState;
    const showChoices=()=>{$('#listening-meaning').hidden=false;};
    const revealTranscript=()=>{
      if(!play||play.listeningState!==state||state.understood)return;
      state.usedTranscript=true;
      play.hintUsed=true; // A transcript-assisted listening clear is supported, not independent.
      if(play.mode==='forest')play.encounterHelp=true;
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
      $('#listening-status').textContent=englishMode?'Correct! Listening complete.':'正解！聞き取れたね。スピーキングは別の問題で練習できるよ。';
      $('#play-audio').disabled=true;
      $$('[data-listening-choice]').forEach(choice=>choice.disabled=true);
      $('#reveal-transcript').hidden=true;
      $('#transcript').hidden=false;
      $('#transcript').textContent=comprehension.audio;
      $('#answer-area').hidden=false;
      $('#answer-area').classList.add('listening-result-only');
      // The selection itself is the complete assessed task: NO mic, WebSpeech,
      // hidden typing requirement, or false claim of speaking proficiency.
      void gradeAnswer();
    }));
  }
  if(openingEncounter)playBattleCinematic('opening');
  if(play.mode==='forest')$('#forest-arena-console').scrollTop=0;
  keepMobileQuestionInView();
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
      audio.onended=()=>{
        if(spokenAudio===audio)spokenAudio=null;
        // On iOS a retained HTMLAudioElement can hold on to the audio session
        // and suppress the following WebSpeech onresult callback.
        audio.onerror=null;
        try{audio.pause();audio.removeAttribute('src');audio.load();}catch{}
      };
      const pending=audio.play();
      if(pending?.catch)pending.catch(fallback);
      return;
    }catch{/* Fall through to the browser's own voice. */}
  }
  browserSpeakLine(line,onUnavailable,level);
}
function startRecognition() {
  if(!play || play.revealed)return;
  if($('#mic-button')?.dataset.nativeDictation==='true'){
    openNativeDictation();
    return;
  }
  const helper=$('#speech-helper');
  if(recognition){
    finishRecognition();
    return;
  }
  // Release the preceding listening clip before opening a microphone.
  // This can mitigate an iOS WebKit audio-session conflict but is not a
  // substitute for native speech recognition in restricted in-app browsers.
  stopListeningPlayback();
  const Constructor=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Constructor){
    micView('ready');
    showSpeechFallback();
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
      if(recognitionStartTimer)clearTimeout(recognitionStartTimer);
      recognitionStartTimer=null;
      if(helper&&!recognitionStopping)helper.textContent='音声認識中です。英語が文字にならなければ標準の音声入力に切り替えられます。';
      recognitionNoResultTimer=setTimeout(()=>{
        if(recognition!==instance||recognitionStopping||$('#spoken-answer')?.value.trim())return;
        if(helper)helper.textContent='まだ英文が届いていません。内蔵ブラウザではマイク認識が使えない場合があります。';
      },7000);
      recognitionWatchdog=setTimeout(()=>{
        if(recognition!==instance||recognitionStopping)return;
        finishRecognition(); // stop() allows WebKit to deliver pending speech.
      },/iPad|iPhone|iPod/i.test(navigator.userAgent)?10000:14000);
    };
    instance.onresult=event=>{
      if(recognition!==instance || play!==session || !$('#spoken-answer'))return;
      const segments=[...event.results];
      const transcript=segments.map(result=>result[0]?.transcript||'').join(' ').replace(/\s+/g,' ').trim();
      if(!transcript)return;
      if(recognitionNoResultTimer)clearTimeout(recognitionNoResultTimer);
      recognitionNoResultTimer=null;
      recognitionFailures=0;
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
      recognitionFailures++;
      stopRecognition();
      showSpeechFallback();
      if(helper){
        const error=event?.error;
        helper.textContent=error==='not-allowed'||error==='service-not-allowed'
          ?'マイクの利用が許可されていません。Safariのマイク設定を確認するか英文を入力してね。'
          :error==='network'||error==='language-not-supported'
          ?'このブラウザの音声認識サービスに接続できません。Safariで開くか、iPhoneキーボードのマイクを使ってね。'
          :error==='audio-capture'
          ?'マイクを利用できませんでした。Safariのマイク許可を確認してね。'
          :recognitionFailures>=2?'このブラウザでは音声認識が続けて失敗しています。下のiPhone標準音声入力を試してね。':'英語を認識できませんでした。再試行か標準の音声入力を試してね。';
      }
    };
    instance.onend=()=>{
      if(recognition!==instance || play!==session)return;
      const transcript=$('#spoken-answer')?.value.trim();
      $('#spoken-answer')?.classList.remove('transcript-interim');
      if(!transcript){recognitionFailures++;showSpeechFallback();}
      else recognitionFailures=0;
      stopRecognition(transcript?'captured':'ready');
      if(helper)helper.textContent=transcript
        ?'音声認識が終了しました。表示された英文を確認してから判定してね。'
        :recognitionFailures>=2?'このブラウザは声を文字にできていません。iPhone標準音声入力かSafariを使ってね。':'声を文字にできませんでした。下に別の入力方法があるよ。';
    };
    // Some iPhone Safari builds silently hang AFTER a listening <audio> clip:
    // no onstart, onerror or onend ever arrives. The old code left the mic
    // orange forever. Recover locally even if the browser sends no callbacks.
    recognitionStartTimer=setTimeout(()=>{
      if(recognition!==instance||play!==session)return;
      recognitionFailures++;
      stopRecognition();
      showSpeechFallback();
      if(helper)helper.textContent='マイクから応答がありません。iPhoneでは下の標準音声入力（キーボードのマイク）か手入力で続けられるよ。';
    },4500);
    instance.start();
    micView('listening');
    if(helper)helper.textContent='音声認識を開始しています。7秒たっても文字にならなければ、標準の音声入力を試してね。';
  }catch{
    stopRecognition();
    showSpeechFallback();
    if(helper)helper.textContent='マイクを開始できません。英文入力で続けられます。';
  }
}
function renderHintPanel(steps,step){
  const panel=$('#hint-panel'),button=$('#show-hint');
  panel.hidden=false;
  panel.innerHTML=steps.slice(0,step).map(item=>`<div class="speaking-hint-step"><strong>${escapeHtml(item.label)}</strong>${item.cloze?`<p class="speaking-cloze" lang="en">${escapeHtml(item.cloze.template)}</p>`:''}<span>${escapeHtml(item.detail)}</span></div>`).join('')+
    `<small>${steps[0]?.cloze?'空欄だけの練習ではXPは発生しないよ。全文を言えて初めて「ヒントあり正解」になるよ。':'ヒントを見て正解した場合は「ヒントあり」の記録になるよ。'}</small><p id="cloze-practice-status" class="cloze-practice-status" role="status" aria-live="polite"></p>`;
  button.setAttribute('aria-expanded','true');
  button.textContent=step<steps.length?'もう少しヒントを見る':'ヒントを表示中';
  button.disabled=step===steps.length;
}
function showHint() {
  if(!play||play.revealed)return;
  const prompt=currentPrompt(), phrase=phraseFor(prompt.phraseId);
  const steps=speakingHintSteps(prompt,phrase);
  const step=Math.min((play.hintStep||0)+1,steps.length);
  play.hintStep=step;play.hintUsed=true;
  if(play.mode==='forest')play.encounterHelp=true;
  renderHintPanel(steps,step);
}
async function gradeAnswer() {
  if(!play || play.revealed || play.grading)return;
  if(currentPrompt()?.kind==='listen'&&!play.listeningState?.understood)return;
  // Grading during active listening would abort Safari's pending final
  // transcript. Finish recognition first, then let the learner review it.
  if(recognition){finishRecognition();return;}
  const session=play,prompt=currentPrompt();
  const listeningComplete=prompt.kind==='listen'&&play.listeningState?.understood===true;
  const raw=listeningComplete?'':$('#spoken-answer').value.trim();
  // One-word cloze practice is a non-scored stepping stone. It cannot mint
  // XP or clear a boss, even when the blank is perfectly completed.
  const cloze=play.hintStep?beginnerClozeFor(prompt):null;
  if(cloze&&raw&&!/\s/.test(raw)){
    const matched=normalizeEnglishNumbers(raw)===normalizeEnglishNumbers(cloze.word);
    const helper=$('#cloze-practice-status');
    if(helper)helper.textContent=matched?'空欄は正解！ よくできたね。次は英文全体を声に出してみよう。':'空欄の単語をもう一度考えてみよう。全文の判定にはまだ進んでいないよ。';
    if(matched){$('#spoken-answer').value='';$('#spoken-answer').focus();}
    return;
  }
  let grade=listeningComplete?{status:'correct',reasons:[],method:'listening-check'}:gradeLocalResponse(prompt,raw);
  if(grade.status==='review' && grade.method!=='context-safety' && !['vocab','grammar'].includes(prompt.kind) && STAGING_SEMANTIC_GRADER_ENDPOINT){
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
    const defending=play.mode==='forest'&&play.tactics?.turn==='enemy';
    if(defending&&raw&&!play.tactics.defenseHitTaken&&['incorrect','incomplete'].includes(grade.status)){
      const blow=incomingHit({kind:play.tactics.enemyKind,allyId:play.companionId,
        evolved:getMonsterProgress(save,play.companionId).evolved,
        action:play.tactics.actionAtAttack,result:'incorrect',pressure:play.tactics.enemyPressure,
        counterShield:play.tactics.counterShield});
      const rescue=absorbIncomingBossHit(blow.damage);
      play.tactics.lastHitDamage=rescue.activeDamage;
      play.tactics.defenseHitTaken=true;
      updateEnemyHealth();
      const arena=$('#forest-world-stage');
      arena.classList.remove('forest-player-damaged');void arena.offsetWidth;
      if(rescue.activeDamage)arena.classList.add('forest-player-damaged');
      playBattleCinematic('enemy');
      $('#forest-world-fx').textContent=rescue.partnerId?'COVER!':rescue.activeDamage?`−${rescue.activeDamage} HP`:'GUARDED';
      $('#forest-battle-log').textContent=rescue.partnerId
        ?`${play.tactics.lastCoverNote} 正解にはならないので、英語は確認しよう。`
        :`敵の${BATTLE_LABELS[play.tactics.enemyKind]}攻撃！ 味方HP−${rescue.activeDamage}。英語を確認して言い直そう。`;
    }
    if(['review','incomplete'].includes(grade.status) && raw)persist(flagUncertainReview(save,prompt.id));
    if(grade.status==='incomplete' && raw){
      // A confirmed missing detail is instructional feedback. A later
      // corrected answer is earned, but cannot count as a first-try combo.
      play.hintUsed=true;
      if(play.mode==='forest'){play.combo=0;play.encounterHelp=true;syncBattleAura();}
    }
    if(grade.status==='incorrect' && raw){
      // Only a confident contradiction or an objective wrong quiz is a miss.
      if(!play.quizMissRecorded){persist(recordAnswer(save,prompt.id,'again').save);play.quizMissRecorded=true;}
      play.hintUsed=true;
      if(play.mode==='forest'){play.combo=0;play.encounterHelp=true;syncBattleAura();}
    }
    if(play.mode==='forest' && raw && !defending){
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
    if(defending&&raw&&['review','ungraded'].includes(grade.status))
      $('#forest-battle-log').textContent='判定保留：敵の攻撃によるダメージはありません。音声や入力を確認して再挑戦しよう。';
    if(play.mode==='forest'&&!defending&&play.endless&&['incorrect','incomplete'].includes(grade.status)&&raw){
      play.attemptReviewed=true;
      // An uncertain paraphrase or failed recognizer never consumes a try.
      const soxieShield=play.companionId==='katappo'&&getMonsterProgress(save,play.companionId).evolved&&!play.usedShield;
      if(soxieShield){play.usedShield=true;$('#forest-world-fx').textContent='LOST & FOUND · SHIELD';}
      else play.remainingTries=Math.max(0,play.remainingTries-1);
      $('#forest-tries').textContent=`あと${play.remainingTries}回 · ${difficultyCopy[play.difficulty].label}`;
      if(!play.remainingTries){
        play.dungeonOutcomes.push({promptId:prompt.id,kind:prompt.kind,outcome:'review'});
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
      play.dungeonOutcomes.push({promptId:prompt.id,kind:prompt.kind,outcome:'review'});
      play.encounterHelp=true;play.hintUsed=true;
      play.combo=0;syncBattleAura();
      play.revealed=true;
      if(play.tactics?.turn==='enemy'){
        play.tactics.usedPromptIds.add(prompt.id);
        $('#forest-battle-log').textContent='判定保留：英語の誤答とは判断せず、HPとXPを変えずに次のターンへ進むよ。';
        finishEnemyTurn();
        return;
      }
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
  else if(rating==='hint')play.hintedCount++;
  if(play.mode==='forest')play.dungeonOutcomes.push({promptId:prompt.id,kind:prompt.kind,
    outcome:rating==='smooth'?'independent':'supported'});
  if(play.tactics)play.tactics.usedPromptIds.add(prompt.id);
  play.revealed=true;
  stopAudio();
  $('#show-answer').disabled=true;$('#show-hint').disabled=true;$('#spoken-answer').disabled=true;micView('done');
  if(play.mode==='forest'&&play.tactics?.turn==='enemy'){
    const t=play.tactics;
    const hit=t.defenseHitTaken?{damage:0,blocked:false}:
      incomingHit({kind:t.enemyKind,allyId:play.companionId,evolved:getMonsterProgress(save,play.companionId).evolved,
        action:t.actionAtAttack,result:'correct',hinted:rating==='hint',pressure:t.enemyPressure,
        counterShield:t.counterShield});
    let rescue=null;
    if(!t.defenseHitTaken){rescue=absorbIncomingBossHit(hit.damage);t.lastHitDamage=rescue.activeDamage;}
    const alreadyHit=t.defenseHitTaken;
    t.defenseHitTaken=true;
    const stage=$('#forest-world-stage');
    stage.classList.remove('forest-player-damaged','forest-defended');void stage.offsetWidth;
    stage.classList.add(t.lastHitDamage?'forest-player-damaged':'forest-defended');
    $('#forest-world-fx').textContent=alreadyHit?`HP −${t.lastHitDamage||0}`:rescue?.partnerId?'COVER!':t.lastHitDamage?`−${t.lastHitDamage} HP`:'BLOCK!';
    playBattleCinematic(t.lastHitDamage?'enemy':'guard');
    $('#forest-battle-log').textContent=alreadyHit
      ?`言い直しは成功！ ただし最初の被ダメージ${t.lastHitDamage||0}は残るよ。 ${t.lastCoverNote}`
      :rescue?.partnerId?`${t.lastCoverNote} 英語はヒントありで確認できたよ。`
      :t.lastHitDamage?`敵の${BATTLE_LABELS[t.enemyKind]}攻撃を軽減！ 味方HP −${t.lastHitDamage}。`
      :`敵の${BATTLE_LABELS[t.enemyKind]}攻撃を防いだ！ 味方HPは減らないよ。`;
    awardTacticalCharge(rating);
    updateEnemyHealth();
    renderTacticalControls();
  }
  if(play.mode==='forest'&&play.tactics?.turn!=='enemy'){
    const boss=play.index>=regularCount();
    const foe=opponentFor(play.index,play.wave,play.areaId);
    const companion=monsterFor(play.companionId);
    const companionName=getMonsterProgress(save,play.companionId).evolved?companion.evolvedName:companion.name;
    const t=play.tactics;
    const attackKind=prompt.kind==='read'?'speak':prompt.kind;
    const foeStyle=foeStyleFor({areaId:play.areaId,index:play.index,wave:play.wave,boss});
    const foeProfile=foeBattleAffinity({foeId:foe.id,style:foeStyle,shifted:t?.foeShifted});
    const choseAssist=Boolean(t?.action==='assist');
    const supportId=t?supportPartnerFor({kind:attackKind,activeId:play.companionId,party:t.party}):null;
    const duo=t?supportComboFor({kind:attackKind,activeId:play.companionId,party:t.party,
      selected:choseAssist,independent:rating==='smooth',used:t.comboUsed,boss,foeId:foe.id,foeProfile,
      partnerEvolved:Boolean(supportId&&getMonsterProgress(save,supportId).evolved)}):null;
    const baseSpecial=t?strikeFor({kind:attackKind,foeId:foe.id,
      allyId:play.companionId,action:t.action==='assist'?'attack':t.action,boss,evolved:getMonsterProgress(save,play.companionId).evolved,
      repeated:t.lastAttackKind===attackKind,foeProfile}):specialStrike({companionId:play.companionId,
      evolved:getMonsterProgress(save,play.companionId).evolved,boss,usedPower:play.usedPower||!play.endless});
    const usedUltimate=Boolean(t&&t.action==='skill');
    const bossCounter=t&&boss&&play.index<regularCount()+BOSS_HITS-1?bossCounterFor({kind:bossAttackFor(foe.id,play.index-regularCount()).kind,
      allyId:play.companionId,independent:rating==='smooth',used:t.bossCounterUsed,
      evolved:getMonsterProgress(save,play.companionId).evolved}):null;
    const mastery=t?masteryEffectFor({allyId:play.companionId,level:getMonsterProgress(save,play.companionId).level,
      kind:attackKind,independent:rating==='smooth',used:t.masteryUsed,boss,
      canHeal:t.hp+(usedUltimate&&boss?2:0)+(duo?.extraHeal||0)+(bossCounter?.heal||0)<t.maxHp,
      canShield:t.counterShield===0&&!bossCounter?.activated&&!(boss&&play.index===regularCount()+BOSS_HITS-1)}):null;
    const amplified={...baseSpecial,damage:baseSpecial.damage+(duo?.extraDamage||0)+(mastery?.extraDamage||0),
      tag:duo?.activated?'DUO!':mastery?.extraDamage?'MASTERY!':baseSpecial.tag};
    const styled=t?foeStyledStrike({style:foeStyle,damage:amplified.damage,kind:attackKind,foeId:foe.id,
      shieldIntact:t.styleShieldIntact}):null;
    const special=styled?{...amplified,damage:styled.damage}:amplified;
    const healed=t?Math.min((usedUltimate&&boss?2:0)+(duo?.extraHeal||0)+(bossCounter?.heal||0)+(mastery?.heal||0),t.maxHp-t.hp):0;
    let foeShiftNow=false;
    let bossLink=null,linkHealAmount=0;
    if(t){
      if(styled.shieldBroken)t.styleShieldIntact=false;
      if(healed)healActiveFighter(healed);
      if(boss){
        const expectedGauge=Math.min(ULTIMATE_MAX,(usedUltimate?0:t.ultimate)+(rating==='smooth'?1:0)+
          (duo?.extraCharge||0)+(bossCounter?.extraCharge||0)+(mastery?.extraCharge||0));
        bossLink=bossFormationLinkFor({foeId:foe.id,phase:play.index-regularCount(),activeId:play.companionId,
          party:t.party,independent:rating==='smooth',used:t.bossLinkUsed,
          ultimate:expectedGauge,shield:Math.max(t.counterShield,bossCounter?.shield||0,mastery?.shield||0)});
        if(bossLink.activated){
          if(bossLink.heal){
            const before=t.hp;healActiveFighter(bossLink.heal);linkHealAmount=t.hp-before;
          }
          if(bossLink.healTeam){
            for(const id of t.party.roster){
              const before=fighterHealth(t.party,id);
              if(before.hp===0)continue; // Team healing never revives a knocked-out companion.
              t.party=healFighter(t.party,id,bossLink.healTeam);
              linkHealAmount+=fighterHealth(t.party,id).hp-before.hp;
            }
            syncActiveFighter();
          }
        }
      }
      if(boss)play.bossHits=Math.min(BOSS_HITS,play.bossHits+1);
      else t.enemyHp=Math.max(0,t.enemyHp-special.damage);
      if(foeStyle?.id==='shift'&&!t.foeShifted&&t.enemyHp>0){t.foeShifted=true;foeShiftNow=true;}
      t.pendingAdvance=boss||t.enemyHp<=0;
      awardTacticalCharge(rating,{spent:usedUltimate});
      if(duo?.activated){
        t.comboUsed=true;
        if(duo.extraCharge)t.ultimate=advanceUltimate(t.ultimate,{independent:true,bonus:duo.extraCharge>1});
      }
      if(bossCounter?.activated){
        t.bossCounterUsed=true;
        t.counterShield=Math.max(t.counterShield,bossCounter.shield);
        t.ultimate=advanceUltimate(t.ultimate,{independent:true});
      }
      if(mastery?.activated){
        t.masteryUsed=true;
        if(mastery.extraCharge)t.ultimate=advanceUltimate(t.ultimate,{independent:true});
        if(mastery.shield)t.counterShield=Math.max(t.counterShield,mastery.shield);
      }
      if(bossLink?.activated){
        t.bossLinkUsed=true;
        if(bossLink.shield)t.counterShield=Math.max(t.counterShield,bossLink.shield);
        if(bossLink.extraCharge)t.ultimate=advanceUltimate(t.ultimate,{independent:true});
      }
      t.lastAttackKind=attackKind;
      t.action='attack';
    }else{
      play.usedPower ||= special.usedPower;
      if(boss)play.bossHits=Math.min(BOSS_HITS,play.bossHits+special.strikes);
    }
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
    $('#forest-damage').textContent=`−${t?special.damage:special.strikes}`;
    $('#forest-world-fx').textContent=t?special.tag:prompt.kind==='listen'?'BLOCK':prompt.kind==='read'?'BREAK':prompt.kind==='vocab'?'WEAKNESS':prompt.kind==='grammar'?'MAGIC':special.ability?special.ability:boss?'BOSS HIT':'HIT';
    updateEnemyHealth(true);
    const defeated=boss?play.bossHits>=BOSS_HITS:Boolean(t&&t.enemyHp<=0);
    playBattleCinematic(defeated?'victory':'attack');
    if(defeated)$('#forest-world-stage').classList.add('forest-boss-defeated');
    const bossMove=boss?forestBossPhase({areaId:play.areaId,index:play.index,wave:play.wave,level:play.difficulty,prompt}):null;
    const sealNote=bossMove?`「${bossMove.signature.name}」を打ち破った！ `:'';
    const duoNote=duo?.activated?`${monsterFor(duo.partnerId).name}との連携成功！ ${duo.awakened?`${duo.awakened}発動！ `:''}${duo.extraDamage?`援護でダメージ＋${duo.extraDamage}。 `:''}${duo.extraCharge?`必殺ゲージ＋${duo.extraCharge}（最大${ULTIMATE_MAX}）。 `:''}${duo.extraHeal?(healed?`回復効果が発動！ `:'HP満タンで回復効果は不要だったよ。 '):''}`:choseAssist?'連携はヒントなしの自力正解で発動するよ。 ':'';
    const masteryNote=mastery?.activated?`Lv.${MASTERY_LEVEL}技「${mastery.name}」発動！ ${mastery.extraDamage?'追撃ダメージ＋1。 ':''}${mastery.extraCharge?'必殺ゲージ＋1。 ':''}${mastery.heal?'仲間HPを回復。 ':''}${mastery.shield?'次の敵攻撃を1軽減。 ':''}`:'';
    const shiftNote=foeShiftNow?`属性変化！ 次の弱点は${BATTLE_LABELS[foeBattleAffinity({foeId:foe.id,style:foeStyle,shifted:true}).weak]}に変わった。 `:'';
    const counterNote=bossCounter?.activated?`迎撃成功！ 必殺ゲージ＋1・次の敵攻撃−1${bossCounter.heal&&healed?'・進化回復':''}。 `:'';
    const linkNote=bossLink?.activated?`ボス連携「${bossLink.name}」成功！ ${monsterFor(bossLink.partnerId).name}の援護で${bossLink.shield?'次の反撃−1':bossLink.extraCharge?'必殺ゲージ＋1':`味方HP合計＋${linkHealAmount}`}。 `:'';
    $('#forest-battle-log').textContent=t
      ?sealNote+`${companionName}の${usedUltimate?'必殺技！':`${BATTLE_LABELS[attackKind]}攻撃！`} ${duoNote}${masteryNote}${counterNote}${linkNote}${special.pierce?'耐性を突破！ ':special.weak?'弱点をついた！ ':special.resist?'敵に耐性あり！ ':''}${styled?.mitigated?'敵の殻に威力を1防がれた！ ':''}${special.repeatPenalty?'連続攻撃で威力−1。 ':''}${special.damage}ダメージ。${shiftNote}${healed?`味方HP＋${healed}。 `:''}${defeated?` ${foe.name}をたおした！`:'次は敵の反撃！'}`
      :sealNote+(prompt.kind==='listen'?`${companionName}が敵の攻撃を防御！反撃で${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='read'?`${companionName}が敵の作戦を見破った！${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='vocab'?`弱点を発見！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='grammar'?`魔法が発動！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:`${companionName}のこうげき！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`);
    if(t)renderTacticalControls();
  }
  // Count clean attack AND defense answers. A tactical round alternates the
  // two, so resetting on each enemy turn made its old combo effect unreachable.
  let streak=null;
  if(play.mode==='forest'){
    streak=advanceBattleChain({chain:play.combo,best:play.bestCombo,independent:rating==='smooth'});
    play.combo=streak.chain;
    play.bestCombo=streak.best;
    syncBattleAura();
  }
  const autoForest=play.mode==='forest';
  const objectiveQuiz=prompt.kind==='vocab'||prompt.kind==='grammar';
  const explanationTitle=objectiveQuiz?(prompt.kind==='vocab'?'単語の使い分け':'文法・語順のポイント'):'使える表現の一例';
  const quizState=next.quizProgress?.[prompt.id];
  const retentionNote=reward.retentionAdvanced?`<p class="retention-result"><strong>${retentionTitle(reward.retentionStage)}</strong> · 次のチェック ${reward.nextRetentionDay}${reward.bondGained?` · 仲間との絆 +${reward.bondGained}`:''}</p>`:
    reward.nextRetentionDay?`<p class="retention-result">${reward.recovering?'定着を再確認中 · ':'次の定着チェック：'}${reward.nextRetentionDay}（ヒントあり・同じ日の再挑戦では段階は進みません）</p>`:'';
  const quizLearningNote=quizState&&!wasQuizResolved?`<p class="forest-quiz-review-status">${quizState.resolved?'苦手克服！日を空けて2回、自力で答えられたね。':quizState.nextReviewDay<=dayKey()?'このポイントは次の冒険でもう一度出題するよ。':'復習予定に登録したよ。次回もヒントなしで挑戦！'}</p>`:'';
  const explanationHtml=prompt.kind==='listen'
    ?`<section class="forest-teaching listening-success-guide"><strong class="forest-teaching-title">聞き取れたポイント</strong><p>相手の発言：<span lang="en">${escapeHtml(listeningChallengeFor(prompt).audio)}</span></p><p><strong>確認できた意味</strong> ${escapeHtml(listeningChallengeFor(prompt).options[listeningChallengeFor(prompt).correctIndex])}</p><p>${escapeHtml(prompt.tip||phraseFor(prompt.phraseId)?.tip||'聞こえた内容の意味を確認しよう。')}</p></section>`
    :objectiveQuiz?quizTeachingHtml(prompt):speakingSuccessHtml(prompt,raw);
  const checkingNote=prompt.kind==='listen'?'音声を聞き、正しい意味を選べたかを確認したよ。スピーキングや発音の判定はしていません。':objectiveQuiz?'この問題では登録された単語・語順との一致を確認しているよ。':grade.method==='semantic-beta'?'AIによる意味の確認（試験運用）です。発音評価ではありません。':'教材ごとの簡易判定です。発音や自由な言い回しを完全に採点するものではありません。';
  const expressionCoaching=grade.coaching?`<div class="speaking-natural-coaching"><strong>意味はOK！ もっと自然に言うなら</strong><p>${escapeHtml(grade.coaching)}</p><span lang="en">${escapeHtml(grade.preferredAnswer||prompt.answer)}</span></div>`:'';
  const acceptedVariant=!objectiveQuiz&&prompt.kind!=='listen'&&grade.method==='registered-example'&&normalizeEnglish(raw)!==normalizeEnglish(prompt.answer)
    ?'<div class="speaking-natural-coaching"><strong>その言い方でもOK！</strong><p>登録済みの言い換えとして意味を確認できたよ。表示された例文だけが正解ではないよ。</p></div>':'';
  const autoNote=autoForest?`<p class="forest-auto-status" id="forest-auto-status" role="status">準備ができたら次へ。詳しい解説は必要なときに開けるよ。</p>`:'';
  const defending=autoForest&&play.tactics?.turn==='enemy';
  const correctBody=`${explanationHtml}<p class="forest-checking-note">${checkingNote}</p>${retentionNote}${quizLearningNote}`;
  const answerPreview=prompt.kind==='listen'
    ?(autoForest?`<div class="feedback-answer forest-listen-answer">${escapeHtml(listeningChallengeFor(prompt).options[listeningChallengeFor(prompt).correctIndex])}</div>`:'')
    :`<div class="feedback-answer">${escapeHtml(prompt.answer)}</div>`;
  const nextLabel=defending?'自分のターンへ →':autoForest&&play.tactics?'次のターンへ →':autoForest?'今すぐ次へ →':'次の問題へ →';
  const nextButton=`<button id="next-question" class="grading-next">${nextLabel}</button>`;
  const learningDetails=autoForest
    ?`<details id="forest-success-explanation" class="forest-success-explanation"><summary>解説・復習のポイントを見る</summary><div class="forest-success-explanation-body">${correctBody}</div></details>`
    :correctBody;
  // Keep the payoff where the learner answered; the arena may be off-screen
  // on mobile. This is a short-lived result, never another battle control.
  const streakNote=streak?.chain>=2
    ?`<p class="forest-chain-result${streak.milestone?' forest-chain-milestone':''}"><strong>${streak.chain} CHAIN</strong><span>${play.tactics&&streak.chain>(save.bestBattleChain||0)?'自己ベスト更新！':streak.milestone?'攻守連続成功！':'連続正解！'}</span></p>`:'';
  $('#feedback-panel').innerHTML=`<div class="feedback-box grading-correct" role="status"><div class="feedback-head">${defending?'防御を確認！':autoForest&&play.tactics?(play.tactics.pendingAdvance?'関門突破！':'攻撃成功！'):autoForest?'関門突破！':'内容を確認できた！'} +${reward.xp} XP</div>${streakNote}${answerPreview}${acceptedVariant}${expressionCoaching}${autoForest?`${nextButton}${autoNote}${learningDetails}`:`${learningDetails}${nextButton}`}</div>`;
  $('#next-question').addEventListener('click',defending?finishEnemyTurn:advanceQuestion);
  // Deliberately no auto-advance: explanations must remain until tapped.
}
function skipAnswer(){
  if(!play || play.revealed)return;
  const prompt=currentPrompt();
  const defending=play.mode==='forest'&&play.tactics?.turn==='enemy';
  if(play.mode==='forest'){play.encounterHelp=true;play.hintUsed=true;}
  const learnerAnswer=$('#spoken-answer')?.value||'';
  if(!play.quizMissRecorded){persist(recordAnswer(save,prompt.id,'again').save);play.quizMissRecorded=true;}
  play.revealed=true;stopAudio();
  if(play.mode==='forest'){play.combo=0;syncBattleAura();}
  if(defending){
    if(!play.tactics.defenseHitTaken&&['vocab','grammar'].includes(prompt.kind)){
      const blow=incomingHit({kind:play.tactics.enemyKind,allyId:play.companionId,
        evolved:getMonsterProgress(save,play.companionId).evolved,
        action:play.tactics.actionAtAttack,result:'incorrect',counterShield:play.tactics.counterShield});
      const rescue=absorbIncomingBossHit(blow.damage);
      play.tactics.lastHitDamage=rescue.activeDamage;
      play.tactics.defenseHitTaken=true;
      updateEnemyHealth();
      if(rescue.partnerId)$('#forest-battle-log').textContent=play.tactics.lastCoverNote;
    }
    play.tactics.usedPromptIds.add(prompt.id);
    play.dungeonOutcomes.push({promptId:prompt.id,kind:prompt.kind,outcome:'review'});
    $('#forest-battle-log').textContent='この攻撃は練習扱い。正解とは数えず、音声や判定の不調だけで追加ダメージは与えないよ。';
  }
  $('#show-answer').disabled=true;$('#show-hint').disabled=true;$('#spoken-answer').disabled=true;micView('done');
  const explanation=quizTeachingFor(prompt)?quizTeachingHtml(prompt,learnerAnswer):speakingFeedbackFor(prompt,learnerAnswer)
    ? speakingTeachingHtml(prompt,learnerAnswer,true)
    :`<p class="feedback-note">${escapeHtml(prompt.tip || phraseFor(prompt.phraseId).tip)}</p>`;
  $('#feedback-panel').innerHTML=`<div class="feedback-box" role="status"><div class="feedback-head">${['vocab','grammar'].includes(prompt.kind)?'正解と理由を確認しよう':'例文を確認しよう'} · 0 XP</div><div class="feedback-answer">${escapeHtml(prompt.answer)}</div>${explanation}<button id="next-question" class="grading-next">${defending?'味方のターンへ →':play.mode==='forest'?'同じ関門にもう一度挑戦 →':'次の問題へ →'}</button></div>`;
  $('#next-question').addEventListener('click',()=>{
    if(defending){finishEnemyTurn();return;}
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
  if(play.mode==='forest'&&play.tactics?.turn==='enemy'){finishEnemyTurn();return;}
  if(play.mode==='forest'&&play.tactics){
    const t=play.tactics;
    if(!t.pendingAdvance){startEnemyTurn();return;}
    // A boss phase is NOT a knockout: after the first two successful
    // English gates, the living boss retaliates with its advertised skill.
    // Only the final third hit defeats it before the next reaction.
    if(play.index>=regularCount()&&play.bossHits<BOSS_HITS&&!t.bossReactionCompleted){
      t.bossReactionCompleted=true;
      startEnemyTurn();
      return;
    }
  }
  if(play.mode==='forest'){
    play.index=play.index>=regularCount()?regularCount()+play.bossHits:play.index+1;
    if(play.index>=waveLength()){
      // Reward a wave only after its full chapter and three verified boss hits.
      const medalResult=!play.endless?evaluateBossMedal(play.prompts,play.dungeonOutcomes):null;
      const reward=finishForest(save,play.route,play.companionId,play.areaId,
        play.tactics?[...new Set([...play.prompts.map(p=>p.id),...play.tactics.usedPromptIds])]:play.prompts.map(p=>p.id),!play.endless,
        medalResult?{difficulty:play.difficulty,rank:medalResult.rank}:null);
      // Unlock chapter-gated allies only after the boss was actually beaten.
      // Endless replay does not unlock new story chapters.
      const awarded=captureEligibleMonsters(reward.save);
      persist(awarded.save);
      play.captured.push(...awarded.captured);
      play.forestRelics.push(...reward.discovered);
      if(medalResult)play.bossMedal={...reward.medal,...medalResult};
      if(!play.endless){play.completedForest=true;finishSession();return;}
      play.seenIds=cleanForest(save.forest).recentPromptIds;
      play.wave++;
      play.areaId=FOREST_AREAS[(play.wave-1)%FOREST_AREAS.length].id;
      const wave=buildForestWave({difficulty:play.baseDifficulty,wave:play.wave,areaId:play.areaId,previousIds:play.seenIds,reviewPhraseIds:dueForestPhrases(),reviewPromptIds:dueForestPromptIds(),quizWeaknessIds:dueQuizWeaknessIds(),bossConversation:true});
      play.prompts=wave.prompts;
      play.difficulty=wave.level;
      play.index=0;play.bossHits=0;play.usedPower=false;
      if(play.tactics){
        play.tactics.usedPromptIds=new Set();
        play.tactics.party=restorePartyForNextWave(play.tactics.party,4);
        play.companionId=firstStandingAlly(play.tactics.party,play.companionId)||play.companionId;
        syncActiveFighter();
        play.tactics.ultimate=0;play.tactics.lastEnemyKind=null;play.tactics.nextEnemyKind=null;
      }
      play.combo=0;play.dungeonOutcomes=[];play.encounterHelp=false;
      play.encounterKey=null;
      $('#play-mode-label').textContent=`∞ WAVE ${play.wave} · ${dungeonAreaFor(play.areaId).name} · ${difficultyCopy[wave.level].label}`;
      showForestExplore(false);queueForestEncounter();return;
    }
    // Ordinary encounters progress directly; show only the boss approach.
    const bossApproach=play.index===regularCount();
    if(bossApproach){
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
function renderDungeonLearningReport(ended){
 const region=$('#dungeon-learning-report');
 region.hidden=ended.mode!=='forest';
 if(region.hidden){region.replaceChildren();return;}
 const report=summarizeDungeonAttempt(ended.areaId,ended.dungeonOutcomes||[]);
 const replayable=new Set(ended.prompts.map(p=>p.id));
 lastDungeonReviewIds=report.retryIds.filter(id=>replayable.has(id));
 const groups=report.groups.map(row=>{
   const ratio=Math.round(100*row.independent/row.total);
   return `<article class="dungeon-report-skill"><div class="dungeon-report-skill-head"><strong>${escapeHtml(row.label)}</strong><span>${row.independent}/${row.total} 自力で確認</span></div><div class="dungeon-report-meter" role="meter" aria-label="${escapeHtml(row.label)}の自力確認率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio}"><span style="width:${ratio}%"></span></div><small>ヒントあり ${row.supported} · 練習ルート ${row.review}</small></article>`;
 }).join('');
 const advice=report.weakest
  ?`<p class="dungeon-report-coach"><strong>次のおすすめ：</strong>${escapeHtml(report.weakest.label)} — ${escapeHtml(report.weakest.tip)}</p>`
  :'<p>まだ結果がありません。最初の問題から挑戦しよう。</p>';
 const badge=report.complete?'この章の全問題を確認':'途中までの練習記録';
 const label=report.strongest&&report.strongest.independent
  ?`今回自力でできたのは「${escapeHtml(report.strongest.label)}」の問題！`
  :'解説を読みながら、少しずつ自分の力にしていこう。';
 region.innerHTML=`<div class="dungeon-report-top"><span class="tiny-caps">YOUR ENGLISH GROWTH</span><h2 id="dungeon-report-title">${escapeHtml(report.areaName)} · 学習レポート</h2><p>${escapeHtml(report.focus)}</p><span class="dungeon-report-status">${badge}</span></div><div class="dungeon-report-stats"><div><strong>${report.independent}</strong><small>自力で確認できた問題</small></div><div><strong>${report.supported}</strong><small>ヒントありで確認</small></div><div><strong>${report.review}</strong><small>判定保留・練習ルート</small></div></div><div class="dungeon-report-skills">${groups}</div>${advice}<p class="dungeon-report-practice">${label} 数値は今回の教材内での結果で、発音力や総合英語力の認定ではないよ。</p><button id="dungeon-retry-weak" type="button" class="dungeon-report-retry" ${lastDungeonReviewIds.length?'':'disabled'}>${lastDungeonReviewIds.length?`つまずいた${lastDungeonReviewIds.length}問を復習する →`:'今すぐ復習が必要な問題はありません'}</button>`;
 region.querySelector('#dungeon-retry-weak').addEventListener('click',()=>startSession('dungeon-review'));
}
function finishSession(timedOut=false,defeated=false) {
  if(!play)return;
  cancelAutoAdvance();
  const ended=play;play=null;clearTimer();stopAudio();
  if(ended.tactics&&ended.bestCombo>(save.bestBattleChain||0))
    persist({...save,bestBattleChain:ended.bestCombo});
  if(ended.mode==='challenge')persist(finishRound(save,ended.smooth));
  if(ended.mode==='daily'&&ended.index>=ended.prompts.length){
    persist(recordDailyCompletion(save,{difficulty:ended.difficulty,date:dayKey(),
      total:ended.prompts.length,independent:ended.smooth,hinted:ended.hintedCount,
      elapsedSeconds:(Date.now()-ended.startedAt)/1000}));
  }
  $('#play-view').classList.remove('forest-active','review-only');
  $('#result-view').classList.toggle('forest-results',ended.mode==='forest');
  const forestFinished=ended.mode==='forest'&&ended.completedForest===true;
  if(forestFinished&&!ended.endless)betaTelemetry.track('monsters_beta_chapter_clear',{
    chapter:ended.areaId,difficulty:ended.baseDifficulty
  });
  if(ended.mode==='forest'&&ended.endless){
    const forest=cleanForest(save.forest);
    persist({...save,forest:{...forest,bestWave:Math.max(forest.bestWave||0,ended.wave-(ended.index===0?1:0))}});
  }
  $('#result-title').textContent=ended.mode==='daily'?'今日の5分ジム完了！':ended.mode==='listening'?'リスニング道場クリア！':ended.mode==='speaking'?'スピーキング道場クリア！':ended.mode==='forest'?
    (defeated?'ダンジョン挑戦終了':ended.endless?'∞ エンドレス WAVE '+ended.wave:dungeonAreaFor(ended.areaId)?.world==='city'?'雪灯りの街のボスを討伐！':'森のボスを討伐！'):
    ended.smooth>=4?'すごい！言葉が出てきたね。':'今日の一歩、しっかり前進。';
  $('#result-description').textContent=ended.mode==='daily'?'練習した表現は、明日や別の場面でまた使ってみよう。自力での正解率はこの端末だけに記録したよ。':ended.mode==='listening'?'聞き取った内容の理解を確認したよ。音声認識や発音の評価はしていません。':ended.mode==='forest'?
    (defeated?ended.tactics?'味方のHPがなくなったよ。学んだ英語は消えないから、仲間の相性や防御を工夫して再挑戦しよう！':'挑戦回数を使い切ったよ。言い換えが簡易判定で通らない場合もあるので、また挑戦してね！':
     ended.endless?'ここまでの冒険の記録！難易度が上がるほどリトライ回数が減るよ。':
     `${dungeonAreaFor(ended.areaId).name}を攻略！ ${nextDungeonArea(save).id!==ended.areaId?'次のエリアの扉が開いたよ。':'学んだ表現を別の場面や後日の復習でも使ってみよう。'}`):
    timedOut?'60秒おつかれさま！ 言えなかった表現は、次の練習で取り戻そう。':
    '練習した表現は、別の場面や後日の復習でも使ってみよう。';
  $('#result-rewards').innerHTML=`${ended.mode==='daily'?`<span class="reward-pill">ヒントなし正解率 ${Math.round(100*ended.smooth/ended.prompts.length)}%（全${ended.prompts.length}問）</span>`:''}<span class="reward-pill">${ended.mode==='forest'?'自力で正解':ended.mode==='listening'?'自力で聞き取れた':'自力で正解'} ${ended.smooth} / ${ended.index}</span>${ended.assistedGates?`<span class="reward-pill">練習ルート ${ended.assistedGates}関門 · 0 XP</span>`:''}<span class="reward-pill">+${ended.earnedXp} XP ストック！</span><span class="reward-pill">使えるXP ${save.xpWallet}</span><span class="reward-pill">仲間 ${save.ownedMonsters.length} / ${MONSTERS.length}</span>`;
  const medal=ended.bossMedal;
  if(medal?.bonusXp)$('#result-rewards').insertAdjacentHTML('beforeend',`<span class="reward-pill boss-bonus-pill">ボス勲章 初回・昇格報酬 ＋${medal.bonusXp} XP</span>`);
  const medalDisplay=medal?`<section class="boss-medal-result" data-medal-rank="${medal.rank}"><span class="boss-medal-symbol" aria-hidden="true"></span><div><span class="tiny-caps">BOSS MASTERY · ${escapeHtml(difficultyCopy[medal.difficulty].label)}</span><h2>${medal.rank?`${BOSS_MEDAL_NAMES[medal.rank]}ランク${medal.upgraded?'獲得！':'でクリア！'}`:'練習クリア · 勲章は次の挑戦で'}</h2><p>章の問題 ${medal.independent}/${medal.total}問を自力で確認 · ボス ${medal.verifiedBoss}/3問を確認。${medal.rank===3?'全問自力でクリア！':medal.rank===2?'全問自力で金ランクを目指そう。':medal.rank===1?'75%以上を自力で確認し、ボスも2問以上自力で銀ランクへ。':'ボス3問をヒントありでも確認すると銅ランクを獲得できるよ。'}</p>${medal.best>medal.rank?`<small>この難易度の最高記録は${BOSS_MEDAL_NAMES[medal.best]}ランクのまま保存したよ。</small>`:''}</div></section>`:'';
  const newMonsters=[...new Set(ended.captured)].map(id=>{const creature=monsterFor(id);return `<div class="discovery-card">${monsterArt(id)}<div><strong>${escapeHtml(creature.name)}が仲間入り！</strong><p>${escapeHtml(creature.kind)} · 図鑑に追加</p></div></div>`;}).join('');
  const newRelics=ended.mode==='forest'?ended.forestRelics.map(id=>`<div class="forest-result-relic"><span aria-hidden="true">${relicArt(id)}</span><div><strong>${escapeHtml(FOREST_RELICS[id].name)} を発見！</strong><p>${escapeHtml(FOREST_RELICS[id].meaning)} · 冒険の宝物</p></div></div>`).join(''):'';
  const memories=ended.mode==='forest'?(ended.eventMemories||[]).slice(-8).map(memory=>
    `<div class="forest-event-memory"><strong>${escapeHtml(memory.title)} · ${escapeHtml(memory.memento)}</strong><p>${escapeHtml(memory.outcome)}</p><small>探索の記録 · XPなし</small></div>`).join(''):'';
  $('#result-discoveries').innerHTML=medalDisplay+newMonsters+newRelics+memories;
  renderDungeonLearningReport(ended);
  if(forestFinished&&!ended.forestRelics.length)$('#result-description').textContent+=' 今回は新しい宝物はなかったけど、英語の練習は積み重なった！';
  const nextArea=forestFinished&&!ended.endless?nextDungeonArea(save):null;
  const canContinue=Boolean(nextArea&&nextArea.id!==ended.areaId&&unlockedDungeonAreas(save).some(area=>area.id===nextArea.id));
  const canRetry=ended.mode==='forest'&&defeated;
  $('#result-quick-summary').hidden=ended.mode!=='forest';
  if(ended.mode==='forest')$('#result-quick-summary').textContent=`今回の獲得 ＋${ended.earnedXp} XP · 仲間 ${save.ownedMonsters.length}体${ended.tactics&&ended.bestCombo>=2?` · 最高 ${ended.bestCombo} CHAIN`:''}`;
  $('#result-detail-panel').open=ended.mode!=='forest';
  $('#result-next-panel').hidden=!canContinue&&!canRetry;
  if(canContinue){
    $('#result-next-message').textContent='次のエリアが解放されたよ！';
    $('#result-next').textContent=`次へ：${nextArea.name}`;
    $('#result-next').onclick=()=>ended.quickStart?startMainDungeon(nextArea.id):startSession(ended.tactics?'forest-tactics':'forest',nextArea.id);
  }else if(canRetry){
    $('#result-next-message').textContent='ここまでの経験を生かして、もう一度！';
    $('#result-next').textContent='同じエリアに再挑戦する';
    $('#result-next').onclick=()=>ended.quickStart?startMainDungeon(ended.areaId):startSession(ended.tactics?'forest-tactics':'forest',ended.areaId);
  }else $('#result-next').onclick=null;
  $('#result-collection').classList.toggle('button-ghost',canContinue||canRetry);
  $('#result-collection').classList.toggle('button-primary',!canContinue&&!canRetry);
  $('#replay-run').hidden=canRetry;
  $('#replay-run').textContent=ended.mode==='daily'?'今日の5分をもう一度':ended.mode==='forest'?(dungeonAreaFor(ended.areaId)?.world==='city'?'雪灯りの街へもう一度挑戦':'森をもう一度探検する'):ended.mode==='challenge'?'もう一度60秒に挑む':'別の表現も練習する';
  $('#replay-run').onclick=()=>ended.quickStart?startMainDungeon(ended.areaId):startSession(ended.endless?'forest-endless':ended.tactics?'forest-tactics':ended.mode,ended.areaId);
  showView('result');
}
const {renderCollection} = createCollectionViews({getSave:()=>save,persist,showView,stopAudio});

$$('[data-difficulty]').forEach(button => button.addEventListener('click', () => {
  persist(chooseDifficulty(save, button.dataset.difficulty));
  renderDifficulty();
}));
$$('[data-start]').forEach(button=>button.addEventListener('click',()=>startSession(button.dataset.start)));
$('#start-forest').addEventListener('click',()=>startMainDungeon());
$('#start-forest-simple').addEventListener('click',()=>startSession('forest'));
$('#start-forest-tactics').addEventListener('click',()=>startSession('forest-tactics'));
$('#start-forest-endless').addEventListener('click',()=>startSession('forest-endless'));
$('#start-review-practice').addEventListener('click',()=>startSession('practice'));
$('#start-saved-review').addEventListener('click',()=>startSession('saved'));
$('#start-due-saved-review').addEventListener('click',()=>startSession('saved',null,true));
$('#start-daily-gym').addEventListener('click',()=>startSession('daily'));
$('#start-retention-review').addEventListener('click',()=>startSession('retention'));
homeNavigation=setupHomeNavigation({home:$('#home-view'),startMode:startSession,showCollection:()=>renderCollection()});
$('#open-dungeon-tutorial').addEventListener('click',()=>homeNavigation.openTutorial('basic'));
$('#start-practice-battle').addEventListener('click',()=>homeNavigation.startPracticeBattle());
$('#open-battle-guide').addEventListener('click',()=>homeNavigation.openTutorial(play?.tactics?'battle':'basic'));
$('#forest-explore-continue').addEventListener('click',()=>{
  if(play?.mode!=='forest'||!$('#play-view').classList.contains('forest-exploring')||!$('#forest-explore-options').hidden)return;
  cancelAutoAdvance();
  if(play.tactics?.formationPending){
    const t=play.tactics,ids=t.formationIds;
    if(!ids.length)return;
    t.party=createTrainedBattleParty(ids);
    play.companionId=ids[0];syncActiveFighter();
    t.formationPending=false;
    $('#forest-party-formation').hidden=true;
  }
  renderQuestion();
});
$('#open-collection').addEventListener('click',()=>renderCollection());
$('#open-wallet').addEventListener('click',()=>renderCollection());
$('#leave-play').addEventListener('click',()=>{cancelAutoAdvance();clearTimer();stopAudio();play=null;$('#play-view').classList.remove('forest-active','review-only');renderHome();});
$('#result-home').addEventListener('click',renderHome);
$('#result-collection').addEventListener('click',()=>renderCollection());
$('#result-feedback').addEventListener('click',()=>{
 $('#beta-feedback-disclosure').open=true;
 $('#beta-feedback').scrollIntoView({behavior:'smooth',block:'start'});
});
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
