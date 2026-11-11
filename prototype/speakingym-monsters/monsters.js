import { ALL_PROMPTS, MONSTERS, PHRASES, PROMPTS, monsterFormName } from './monster-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, chooseDifficulty, createSave, dayKey, finishRound, getMonsterProgress, getEvolutionTrialGuide, getMonsterBondProgress, learningSummary, reviewOverview, quizWeaknessOverview, recordAnswer, recordLethalBattleReview, toggleSavedPrompt, savedReviewPrompts, savedReviewQueue, captureEligibleMonsters, flagUncertainReview, selectMonster, selectRoundPrompts, validateSave, normalizeEnglish, normalizeEnglishNumbers } from './monster-engine.js';
import { monsterHuntBoard, chainChestAt, awardChainChests } from './monster-engagement.js';
import { WEAPONS, WEAPON_RARITY_LABELS, WEAPON_AFFINITY_LABELS, WEAPON_SHAPE_LABELS, equippedWeapon, equipWeapon, awakenWeapon, awakeningProgress, nextWeaponResonancePreview, weaponBattleVisual, weaponAttack, weaponEffectDescription, weaponTechniqueDescription, resolveWeaponTechniqueTurn, filteredWeaponInventory, levelAttackBonus, weaponAffinityBonus, scaledStrikeDamage, dungeonWeaponDrop, eliteWeaponDrop } from './monster-equipment.js';
import {GACHA_COST,GACHA_TEN_PULL_COST,GACHA_ODDS,RARE_PITY,EPIC_PITY,WEAPON_DISCOVERY_REWARDS,TREASURES,treasureValue,summonProgress,summonPityProgress,weaponDiscoveryProgress,grantDungeonTreasure,sellTreasure,sellAllTreasures,drawWeaponGacha,drawWeaponGachaTen,gachaPoolSummary,normalizeEconomy} from './monster-economy.js';
import { loadProtectedSave, unreadableSaveForDownload, conflictingArchiveForDownload, writeSaveIfCurrent, lazyStorage, UNREADABLE_BACKUP_KEY } from './save-recovery.js';
import { monsterArt, forestEncounterEyesArt } from './monster-art.js';
import { gradeLocalResponse } from './monster-grader.js';
import { STAGING_SEMANTIC_GRADER_ENDPOINT, askSemanticGrader } from './semantic-client.js';
import { cleanForest, FOREST_ROUTES, CITY_ROUTES, RUINS_ROUTES, FOREST_RELICS, FOREST_AREAS, CITY_AREAS, RUINS_AREAS, DUNGEON_AREAS, unlockedDungeonAreas, nextDungeonArea, dungeonAreaFor, finishForest } from './forest-engine.js';
import { BOSS_MEDAL_NAMES, evaluateBossMedal } from './boss-mastery.js';
import { forestWorldArt } from './forest-world.js';
import { buildForestWave, DIFFICULTY_TRIES, opponentFor, enemyTacticFor, FOREST_WAVE_LENGTH, REGULAR_ENCOUNTERS, AREA_BOSSES, BOSS_HITS, specialStrike, regularEncountersFor, forestWaveLengthFor } from './forest-battle.js';
import { BATTLE_KINDS, BATTLE_LABELS, ULTIMATE_MAX, MASTERY_LEVEL, foeAffinity, allyAffinity, allySkill, masterySkillFor, masteryEffectFor, supportPartnerFor, supportComboFor, evolvedSupportTalent, advanceUltimate, advanceBattleChain, battleChainTier, pickBattleSpectacle, strikeFor, incomingHit, shouldCounterPlayerMiss, nextEnemyKind, foeStyleFor, foeBattleAffinity, foeStyledStrike, foePlannedAttack, foeAttackPressure, bossAttackFor, bossCounterFor, bossReserveCoverFor, bossFormationLinkPlan, bossFormationLinkFor, pickBattlePrompt } from './battle-tactics.js';
import { battleImpactFor, battlePayoffFor, battleLogSummaryFor } from './battle-impact.js';
import { createBattleParty, levelHpBonus, editBattleFormation, fighterHealth, applyFighterDamage, healFighter, firstStandingAlly, consumeTacticalSwap, canTacticalSwap, restorePartyForNextWave, encounterVitality } from './battle-party.js';
import {plannedBattleFormation,formationResonance,recommendBattleFormation} from './battle-formation.js';
import { enemyArt } from './forest-enemies.js';
import { battleArenaArt, guardArt, relicArt } from './game-visuals.js';
import { createCollectionViews, resultGrowthActionFor } from './monster-collection.js';
import { companionRevealFor, renderCompanionSpotlight } from './companion-reveal.js';
import { quizControlsHtml, wireQuizControls } from './forest-quiz-ui.js';
import { listeningChallengeFor } from './listening-challenges.js';
import { LISTENING_AUDIO } from './listening-audio-manifest.js';
import { quizTeachingFor } from './forest-teaching.js';
import { quizRetryCoachFor } from './forest-quiz-retry-coach.js';
import { speakingFeedbackFor, conversationFeedbackFor } from './speaking-feedback.js';
import { forestLearningPulseFor } from './forest-learning-pulse.js';
import { conversationPolishFor } from './conversation-polish.js';
import { speakingHintSteps, beginnerClozeFor } from './speaking-guidance.js';
import { forestBossPhase } from './forest-boss-phases.js';
import { dailyTrainingPlan, recordDailyCompletion, dailyGrowthSummary, dailyGoldStatus } from './daily-training.js';
import { roleplayFor, recommendedRoleplay, roleplayRecapFor, roleplayReplyFor, roleplayOpeningFor } from './roleplay-scenarios.js';
import { roleplayTransferFor, roleplayTransferFeedbackFor, scheduleRoleplayTransfer, dueRoleplayTransfers } from './roleplay-transfer.js';
import { retentionOverview, retentionPracticePlan, retentionTitle, retentionMilestoneSummary, retentionCheckpointLabel } from './retention.js';
import { SKILL_KINDS, SKILL_LABELS, skillProgressFor, skillFocusPrompts, nextSkillFocusFor, improvementHighlightsFor, earnedImprovementFor } from './skill-progress.js';
import { setupHomeNavigation } from './home-navigation.js';
import { createGachaCinematic } from './gacha-cinematic.js';
import { createWeaponBattleSoundPlayer } from './weapon-battle-sound.js';
import { summonWeaponArtwork } from './summon-weapon-art.js';
import { summarizeDungeonAttempt, attemptedDungeonPromptIds, dungeonBossBrief, DUNGEON_SKILLS } from './dungeon-learning.js';
import { dungeonVictoryRecapFor } from './dungeon-victory-recap.js';
import { nextLearningQuestFor, learningProofFor, nextReturnCueFor, homeLearningSignalFor } from './next-learning-quest.js';
import { savedReviewRecap, savedReviewTrend, rememberSavedReview } from './saved-review-coach.js';
import { createBetaTelemetry, betaSessionFields } from './beta-telemetry.js';
import { setupBetaFeedback } from './beta-feedback.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
// Keep the badge above the foe terse and in English. Beginner explanations
// belong to the separate answer controls, not over the battle sprites.
const WEAK_BADGE_LABELS=Object.freeze({speak:'Speak',listen:'Listen',vocab:'Vocab',grammar:'Grammar'});
const battleSounds=createWeaponBattleSoundPlayer();
// Every dungeon encounter uses a single arena for characters, the question and its
// answer controls. Move the existing live nodes instead of duplicating a form:
// recognition, quiz choices, hints and review listeners must keep one owner.
function arrangeBattleScene(forestMode){
  const world=$('#forest-world-stage'),consolePanel=$('#forest-arena-console');
  const home=$('.forest-command-window');
  const info=$('.forest-battle-info'),partyHp=$('#forest-party-hp');
  $('#battle-sound-toggle').hidden=!forestMode;
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
function syncBattleWeaponPresentation(world){
 const visual=weaponBattleVisual(equippedWeapon(save));
 world.dataset.weaponShape=visual.shape;
 world.dataset.weaponMotion=visual.motion;
 world.dataset.weaponRarity=visual.rarity;
 world.dataset.weaponRank=String(visual.rank);
}
function playBattleCinematic(kind,chain=play?.combo||0,{ultimate=false}={}){
  if(play?.mode!=='forest')return;
  const world=$('#forest-world-stage');
  syncBattleWeaponPresentation(world);
  world.dataset.weaponUltimate=String(Boolean(ultimate));
  if(kind==='attack'||kind==='victory'){
    const style=pickBattleSpectacle({chain,previousFx:world.dataset.fxVariant,
      previousMotion:world.dataset.strikeMotion});
    world.dataset.fxVariant=style.fxVariant;
    world.dataset.strikeMotion=style.strikeMotion;
    world.dataset.specialFx=style.specialFx;
  }else world.dataset.specialFx='none';
  world.dataset.finisher=kind==='victory'?(world.classList.contains('forest-boss-stage')?'boss':'regular'):'none';
  world.dataset.cinematic='idle';
  void world.offsetWidth; // Restart CSS cut-ins for each independently graded turn.
  world.dataset.cinematic=kind;
  if(kind==='attack'||kind==='victory')battleSounds.play(weaponBattleVisual(equippedWeapon(save)),{ultimate});
}
function syncBattleAura(){
  const world=$('#forest-world-stage'),chain=play?.mode==='forest'?play.combo||0:0;
  world.dataset.chainTier=String(battleChainTier(chain));
  world.classList.toggle('forest-combo-boost',chain>=3);
  $('#forest-combo').textContent=chain>=1?`${chain} CHAIN`:'';
}
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
function battlePayoffHtml(payoff){
 if(!payoff)return '';
 return `<div class="forest-hit-payoff" data-payoff-turn="${payoff.turn}" data-payoff-impact="${escapeHtml(payoff.impact)}" role="group" aria-label="${escapeHtml(payoff.title+' '+payoff.amountLabel+' '+payoff.remainder)}">
   <div class="forest-hit-payoff-head"><strong>${escapeHtml(payoff.title)}</strong><b>${escapeHtml(payoff.amountLabel)}</b></div>
   <div class="forest-hit-payoff-progress"><span class="forest-hit-payoff-meter" role="meter" aria-label="${payoff.turn==='defense'?'味方の残りHP':'敵の残りHPまたはボスの封印'}" aria-valuemin="0" aria-valuemax="${payoff.max}" aria-valuenow="${payoff.current}"><i style="width:${payoff.percent}%"></i></span><small>${escapeHtml(payoff.remainder)}</small></div>
 </div>`;
}
function learningWinHtml(win){
 if(!win)return '';
 const before=win.before==='again'?'前はつまずいた':'前はヒントあり';
 return `<div class="forest-learning-win" role="note" aria-label="別の日の同じ問題で自力正解"><strong>GROWTH!</strong><span>${before}<b aria-hidden="true">→</b>今日はヒントなし</span></div>`;
}
function roleplayIntroMarkup(){
 const roleplay=play?.roleplay;
 if(!roleplay)return '';
 const turn=roleplay.turns[play.index];
 if(!turn)return '';
 const opening=roleplayOpeningFor(roleplay,play.index);
 const history=roleplay.history.map((row,index)=>`<div class="roleplay-line"><strong>${escapeHtml(roleplay.partner)} · ${index+1}</strong><span lang="en">${escapeHtml(row.npc)}</span></div><div class="roleplay-line player"><strong>あなた · ${row.outcome==='skipped'?'例文で確認':row.outcome==='hint'?'ヒントあり':'自力'}</strong><span lang="en">${row.outcome==='skipped'?'例文を確認（XPなし）':escapeHtml(row.answer)}</span></div>${row.response?`<div class="roleplay-line"><strong>${escapeHtml(roleplay.partner)} · 返事</strong><span lang="en">${escapeHtml(row.response)}</span></div>`:''}`).join('');
 // Listen first at normal/hard difficulty. Reading is always available when
 // TTS cannot start; the speaking answer must never depend on device audio.
 const npcLine=play.difficulty==='easy'?`<span lang="en">${escapeHtml(opening.npc)}</span>`:
  `<details id="roleplay-npc-transcript" class="roleplay-npc-transcript"><summary>相手の英文を見る（ヒント）</summary><p lang="en">${escapeHtml(opening.npc)}</p></details>`;
 const translation=play.difficulty==='easy'?`<p class="roleplay-gloss">${escapeHtml(opening.npcJa)}</p>`:
  `<details id="roleplay-translation" class="roleplay-translation"><summary>相手の日本語を確認（ヒント扱い）</summary><p>${escapeHtml(opening.npcJa)}</p></details>`;
 return `<section class="roleplay-conversation" aria-label="3ターンの会話履歴"><div class="roleplay-progress">会話 ${play.index+1} / ${roleplay.turns.length}<span style="--roleplay-progress:${100*play.index/roleplay.turns.length}%"></span></div><h2>${escapeHtml(roleplay.title)}</h2><p class="roleplay-scene">${escapeHtml(roleplay.setting)}</p>${history}<div class="roleplay-line current"><strong>${escapeHtml(roleplay.partner)} · 今のひと言</strong><button type="button" id="roleplay-npc-audio" class="roleplay-npc-audio">相手の声を聞く</button><p id="roleplay-npc-status" class="roleplay-npc-status" role="status" aria-live="polite"></p>${npcLine}${translation}</div></section>`;
}
const phraseFor = id => PHRASES.find(phrase => phrase.id === id);
const monsterFor = id => MONSTERS.find(monster => monster.id === id);
function createTrainedBattleParty(ids){
 const levels=Object.fromEntries(ids.map(id=>[id,getMonsterProgress(save,id).level]));
 const bonus=formationResonance(ids,levels);
 return createBattleParty(ids,{evolvedIds:ids.filter(id=>getMonsterProgress(save,id).evolved),
  ascendedIds:ids.filter(id=>getMonsterProgress(save,id).ascended),
  levels,resonanceHp:bonus.hpBonus});
}
const difficultyCopy = {
  easy: { label: 'やさしい', description: '日本語の状況を読んで、英語で答える。' },
  normal: { label: 'ふつう', description: '英語の状況と指示を読み、英語で答える。' },
  hard: { label: 'むずかしい', description: '長めの英文を読み、複数の条件を満たして英語で答える。' }
};
function quizTeachingHtml(prompt,learnerAnswer='',{previousMistake=false}={}){
  const note=quizTeachingFor(prompt);
  if(!note)return '';
  const retryCoach=quizRetryCoachFor(prompt,learnerAnswer);
  const contrast=learnerAnswer.trim()&&learnerAnswer.trim().toLowerCase()!==prompt.answer.toLowerCase()
    ? `<p class="forest-teaching-learner"><strong>${previousMistake?'前に選んだ答え':'今回の回答'}</strong> <span lang="en">${escapeHtml(learnerAnswer)}</span>${retryCoach?`<small>${escapeHtml(retryCoach.message)}</small>`:''}</p>`:'';
  return `<section class="forest-teaching feedback-note" aria-label="${escapeHtml(note.label)}"><strong class="forest-teaching-title">${escapeHtml(note.label)}</strong>${contrast}<p>${escapeHtml(note.clue)}</p><p>${escapeHtml(note.detail)}</p><p class="forest-teaching-transfer"><strong>別の場面でも使おう</strong> ${escapeHtml(note.transfer)}</p></section>`;
}
// One explanation model serves free speaking, boss battles and roleplay.
// Before a verified clear, no full example is revealed for rewarded retries.
function conversationFeedbackHtml(prompt,learnerAnswer,grade,{hinted=false,revealExample=false}={}){
 const feedback=conversationFeedbackFor(prompt,learnerAnswer,grade,{hinted,revealExample});
 if(!feedback)return '';
 const checked=feedback.checked.length?`<div class="conversation-feedback-part"><strong>簡易チェックで見つかった要素</strong><ul>${feedback.checked.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`:'';
 const missing=feedback.missing.length?`<div class="conversation-feedback-part"><strong>まだ確認できなかった要素</strong><ul>${feedback.missing.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`:'';
 const correction=feedback.correction?`<div class="conversation-feedback-part"><strong>${escapeHtml(feedback.correction.label)}</strong><p>${escapeHtml(feedback.correction.clue)}</p><p>${escapeHtml(feedback.correction.detail)}</p></div>`:'';
 const sample=feedback.example&&revealExample?`<p class="conversation-feedback-example"><strong>参考例（唯一の正解ではないよ）</strong> <span lang="en">${escapeHtml(feedback.example)}</span></p>`:'';
 const variants=feedback.variants.length?`<p class="conversation-feedback-example"><strong>別の伝え方</strong> <span lang="en">${feedback.variants.map(escapeHtml).join(' / ')}</span></p>`:'';
 const summary=feedback.confirmed?'教材で確認した用件':'この場面で伝えたいこと';
 const tip=feedback.tip?`<p><strong>表現のコツ</strong> ${escapeHtml(feedback.tip)}</p>`:'';
 return `<section class="conversation-feedback" aria-label="会話フィードバック" data-conversation-verdict="${escapeHtml(feedback.status)}">
  <strong class="conversation-feedback-title">会話フィードバック · ${escapeHtml(feedback.verdict)}</strong>
  <p><strong>${summary}</strong> ${escapeHtml(feedback.target)}</p>
  ${feedback.hasAnswer?`<p class="conversation-feedback-input"><strong>今回の英文</strong> <span lang="en">${escapeHtml(learnerAnswer)}</span></p>`:''}
  ${checked}${missing}${correction}${tip}${sample}${variants}
  <p class="conversation-feedback-next"><strong>次の一歩</strong> ${escapeHtml(feedback.next)}</p>
  <small>これは教材に登録した英文・条件の確認です。発音や流暢さ、自由会話の意味を完全に評価したものではありません。</small>
 </section>`;
}
function conversationPolishHtml(prompt){
 if(play?.mode==='forest'||!['speak','read'].includes(prompt.kind))return '';
 return `<details id="conversation-polish" class="conversation-polish"><summary>別の言い方を試す（追加XPなし）</summary><div class="conversation-polish-body"><p id="conversation-polish-guide">今の意味を保ったまま、別の英文にしてみよう。ここでの練習は会話の返答・XP・成績を変えないよ。</p><label for="conversation-polish-input">言い換えた英文</label><textarea id="conversation-polish-input" lang="en" rows="2" maxlength="350" placeholder="例文を参考に、別の英語で伝えてみよう" aria-describedby="conversation-polish-guide"></textarea><button id="conversation-polish-check" type="button">言い換えを確認する</button><div id="conversation-polish-result" role="status" aria-live="polite"></div><small>教材の簡易チェックです。自由な英文のすべてや発音・流暢さは判定していません。</small></div></details>`;
}
function wireConversationPolish(prompt,originalAnswer=''){
 const button=$('#conversation-polish-check');
 if(!button)return;
 button.addEventListener('click',()=>{
  const result=conversationPolishFor(prompt,$('#conversation-polish-input').value,{originalAnswer});
  if(!result)return;
  const checked=result.checked.length?`<p><strong>教材で確認した内容</strong> ${result.checked.map(escapeHtml).join('・')}</p>`:'';
  const model=result.status==='empty'||result.status==='same'?'':`<p><strong>参考表現（唯一の正解ではないよ）</strong> <span lang="en">${escapeHtml(prompt.answer)}</span></p>`;
  $('#conversation-polish-result').innerHTML=`<div class="conversation-polish-verdict" data-polish-status="${escapeHtml(result.status)}"><strong>${escapeHtml(result.headline)} · 追加XP 0</strong>${checked}<p><strong>次のヒント</strong> ${escapeHtml(result.tip)}</p>${model}</div>`;
 });
}
function roleplayTransferHtml(challenge){
 if(!challenge)return '';
 const before=challenge.sourceOutcome==='smooth'?'自力で確認した表現':
  challenge.sourceOutcome==='hint'?'ヒントを使って確認した表現':'例文で見た表現';
 return `<details id="roleplay-transfer" class="roleplay-transfer">
  <summary><span class="roleplay-transfer-tag">NEW MISSION</span><strong>別の場面で1問チャレンジ</strong><small>任意 · 追加XP 0</small></summary>
  <div class="roleplay-transfer-body">
   <p class="roleplay-transfer-lead">${before}を、今度は違う状況で使ってみよう。</p>
   <div class="roleplay-transfer-scenes"><span>${escapeHtml(challenge.sourceScene)}</span><b aria-label="次の場面">→</b><span>${escapeHtml(challenge.destinationScene)}</span></div>
   <p class="roleplay-transfer-prompt">${escapeHtml(challenge.prompt.cue)}</p>
   <label for="roleplay-transfer-input">あなたなら英語でどう言う？</label>
   <textarea id="roleplay-transfer-input" lang="en" rows="2" maxlength="350" placeholder="英文を入力して確認しよう"></textarea>
   <div class="roleplay-transfer-actions"><button type="button" id="roleplay-transfer-check">英文を確認する</button><button type="button" id="roleplay-transfer-reveal">参考例を見る</button></div>
   <div id="roleplay-transfer-result" role="status" aria-live="polite"></div>
   <small>この1問ではXP・習得度・会話成績は増えません。確認・例文表示をすると、問題IDと復習予定だけを端末に保存するよ。回答の英文は保存しません。発音・流暢さ・自由な英文の意味すべては評価していないよ。</small>
  </div>
 </details>`;
}
function wireRoleplayTransfer(challenge){
 const check=$('#roleplay-transfer-check'),reveal=$('#roleplay-transfer-reveal');
 if(!challenge||!check||!reveal)return;
 let revealed=false,verifiedBeforeReveal=false;
 const render=()=>{
  const feedback=roleplayTransferFeedbackFor(challenge,$('#roleplay-transfer-input').value,{revealed});
  if(!feedback)return;
  if(feedback.status==='correct'&&!revealed)verifiedBeforeReveal=true;
  let scheduleMessage='';
  if(feedback.status!=='empty'){
   const status=verifiedBeforeReveal?'confirmed':revealed?'example':'review';
   const scheduled=scheduleRoleplayTransfer(save,challenge,{status});
   if(scheduled){
    const due=scheduled.transferReviews[challenge.prompt.id].due;
    const dateLabel=due<=dayKey()?'今日':`${Number(due.slice(5,7))}/${Number(due.slice(8,10))}`;
    scheduleMessage=persist(scheduled)?`<p class="roleplay-transfer-due"><strong>次のミッション</strong> ${dateLabel}に、この場面を例文なしで復習しよう。ホームのおすすめから1問で始められるよ。</p>`:
     '<p class="roleplay-transfer-due"><strong>保存できなかったよ</strong> 端末の保存設定を確認してね。</p>';
   }
  }
  const checked=feedback.checked.length?`<p><strong>確認できた点</strong> ${feedback.checked.map(escapeHtml).join('・')}</p>`:'';
  const missing=feedback.missing.length?`<p><strong>確認したい条件</strong> ${feedback.missing.map(escapeHtml).join('・')}</p>`:'';
  const example=feedback.example?`<p><strong>参考表現（唯一の正解ではないよ）</strong> <span lang="en">${escapeHtml(feedback.example)}</span></p>`:'';
  $('#roleplay-transfer-result').innerHTML=`<div class="roleplay-transfer-verdict" data-transfer-status="${escapeHtml(feedback.status)}"><strong>${escapeHtml(feedback.headline)}</strong>${checked}${missing}<p>${escapeHtml(feedback.next)}</p>${example}${scheduleMessage}<small>追加XP 0 · 応用問題の復習予定のみ登録</small></div>`;
 };
 check.addEventListener('click',render);
 reveal.addEventListener('click',()=>{revealed=true;reveal.disabled=true;reveal.textContent='参考例を表示中';render();});
}
function forestLearningPulseHtml(prompt,learnerAnswer,grade,{hinted=false}={}){
 const pulse=forestLearningPulseFor(prompt,grade,{answer:learnerAnswer,hinted});
 if(!pulse)return '';
 return `<section class="forest-learning-pulse" aria-label="今回の英語の学び" data-learning-kind="${escapeHtml(pulse.kind)}">
  <div class="forest-learning-pulse-head"><strong>今回の表現</strong><span>${escapeHtml(pulse.badge)}</span></div>
  <p data-field="achieved"><strong>${escapeHtml(pulse.achievedLabel)}</strong><span>${escapeHtml(pulse.achieved)}</span></p>
  <p data-field="tip"><strong>表現のコツ</strong><span>${escapeHtml(pulse.tip)}</span></p>
  <p data-field="next"><strong>次の一歩</strong><span>${escapeHtml(pulse.next)}</span></p>
 </section>`;
}
function questionBookmarkLabel(prompt,saved){
 const english=(prompt.difficulty||'easy')!=='easy';
 return english?(saved?'★ Saved':'☆ Save this question'):(saved?'★ 保存済み':'☆ 問題を保存');
}
function syncQuestionBookmarks(prompt){
 const saved=save.savedPromptIds?.includes(prompt.id)||false;
 const inQuestion=$('#bookmark-question');
 if(inQuestion&&$('#play-card')?.dataset.promptId===prompt.id){
  inQuestion.setAttribute('aria-pressed',String(saved));
  inQuestion.textContent=questionBookmarkLabel(prompt,saved);
 }
 const afterFeedback=$('#feedback-bookmark');
 if(afterFeedback){
  afterFeedback.setAttribute('aria-pressed',String(saved));
  afterFeedback.textContent=saved?'★ 復習に保存済み（押すと解除）':'☆ この問題を復習に保存';
 }
}
function attachFeedbackBookmark(prompt){
 const box=$('#feedback-panel .feedback-box');
 if(!box||!prompt)return;
 const button=document.createElement('button');
 button.type='button';button.id='feedback-bookmark';button.className='feedback-bookmark';
 button.addEventListener('click',()=>{
  if(!play||currentPrompt()?.id!==prompt.id)return;
  const persisted=persist(toggleSavedPrompt(save,prompt.id));
  syncQuestionBookmarks(prompt);
  if(!persisted)button.textContent='保存できませんでした。ブラウザの保存設定を確認してね。';
 });
 const next=box.querySelector('#show-example,#next-question,#continue-as-practice');
 if(next)next.before(button);else box.append(button);
 syncQuestionBookmarks(prompt);
}
// Public prototype QA: let testers experience real summon buttons and their
// animations without grinding first or altering their normal adventure save.
// This mode is intentionally unavailable on the production site.
const gachaTestMode=new URLSearchParams(window.location.search).get('gacha-test')==='1'
 && ['prototype-speakingym-monster.speakingym.pages.dev','localhost','127.0.0.1'].includes(window.location.hostname);
const gachaTestSaveKey=`${STORAGE_KEY}-gacha-test`;
const currentStorageKey=gachaTestMode?gachaTestSaveKey:STORAGE_KEY;
const gameStorage=lazyStorage(()=>window.localStorage,key=>gachaTestMode
 ?key===STORAGE_KEY?gachaTestSaveKey:key===UNREADABLE_BACKUP_KEY?`${gachaTestSaveKey}-unreadable-backup`:key
 :key);
let unreadableSaveStatus=null;
let lastStoredSaveRaw=null,storageConflict=false;
let save = loadSave() || (gachaTestMode?{...createSave(),coins:2400}:createSave());
let lastDungeonReviewIds = [];
let play = null, timer = null, recognition = null, recognitionStartTimer = null, recognitionWatchdog = null, recognitionNoResultTimer = null, recognitionStopping = false, recognitionFailures = 0, autoAdvanceTimer = null, spokenAudio = null, playbackGeneration = 0, homeNavigation = null;
// WebKit may still own the microphone after a final result or an error. Do not
// start a second recognizer until the previous session actually fires onend.
let retiringRecognition = null, recognitionRetireTimer = null, queuedRecognitionSession = null;
// iOS 27 has a WebKit regression where a second recognition session can be
// deaf. A short speech-synthesis cue between naturally ended sessions is a
// best-effort browser workaround; native iPhone dictation stays available.
let iosSpeechCueDue = false, iosSpeechCue = null, iosSpeechCueTimer = null;
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
  try{
    const loaded=loadProtectedSave(gameStorage,validateSave);
    lastStoredSaveRaw=loaded.raw;
    unreadableSaveStatus=loaded.status==='protected'||loaded.status==='blocked'?loaded.status:null;
    return loaded.save;
  }catch{return null;} // Accessing localStorage itself can throw in private browsers.
}
function syncUnreadableSaveUI(){
  const notice=$('#save-recovery-notice'),warning=$('#save-note');
  if(!notice||!warning)return;
  notice.hidden=!unreadableSaveStatus;
  $('#save-recovery-reset').hidden=unreadableSaveStatus!=='blocked';
  let hasConflictingArchive=false;
  try{hasConflictingArchive=conflictingArchiveForDownload(gameStorage,unreadableSaveStatus)!==null;}catch{}
  $('#save-recovery-archive-download').hidden=!hasConflictingArchive;
  $('#save-download').textContent=unreadableSaveStatus==='blocked'
    ?'このタブの新しい記録を保存（元のセーブとは別）':'セーブをファイルに保存（おすすめ）';
  $('#save-export').textContent=unreadableSaveStatus==='blocked'
    ?'このタブの新しい記録をコピー':'今のセーブをコピー';
  const live=$('#save-warning-live');
  const liveMessage=$('#save-warning-message');
  liveMessage.textContent='このブラウザに進捗を保存できません。ページを閉じる前に、下のボタンから今のセーブを保管してください。';
  if(unreadableSaveStatus==='protected'){
    warning.textContent='古いセーブを読み込めなかったため保護しました。引き継ぎ欄から保存してね。';
    $('#save-recovery-description').textContent='前の記録を読み込めなかったので、上書きする前に元データを別の領域へ保護しました。新しい記録とは別に保存できます。元のセーブは自動復元されません。';
  }else if(unreadableSaveStatus==='blocked'){
    warning.textContent='以前のセーブを保護できず、自動上書きを止めています。引き継ぎ欄から元データを保存してね。';
    $('#save-recovery-description').textContent=hasConflictingArchive
      ?'読み込めないセーブが2つ残っています。自動上書きを停止しました。下の2つのファイルを両方保存してね。通常の保存・コピーは、このタブで新しく遊んだ記録だけが対象です。'
      :'以前の記録を読み込めません。保存領域の空きがないなどの理由で、自動上書きを停止しました。まず元データをファイルに保存してね。通常の保存・コピーは、このタブの新しい記録だけが対象です。';
    liveMessage.textContent='前のセーブを守るため自動保存を停止中。下から今のセーブを保管してね。元のセーブはホームの「セーブの引き継ぎ」で別に保存してね。';
    live.hidden=false;
  }
  $('#save-conflict-notice').hidden=!storageConflict;
  if(storageConflict){
    warning.textContent='別のタブでセーブが更新されたため、このタブの自動保存を停止しました。';
    liveMessage.textContent='別のタブの新しい記録を守るため保存を停止中。下からこのタブのセーブを保管してね。別タブの記録はホームの「セーブの引き継ぎ」から保存できるよ。';
    live.hidden=false;
  }
}
function persist(next = save,{replaceUnreadable=false}={}) {
  save = next;
  if(unreadableSaveStatus==='blocked'&&!replaceUnreadable){
    syncUnreadableSaveUI();
    return false;
  }
  if(storageConflict){syncUnreadableSaveUI();return false;}
  try {
    const result=writeSaveIfCurrent(gameStorage,lastStoredSaveRaw,JSON.stringify(save));
    if(result.status==='conflict'){
      storageConflict=true;
      syncUnreadableSaveUI();
      return false;
    }
    lastStoredSaveRaw=result.raw;
    $('#save-note').textContent = '記録はこのブラウザ・URLに保存されます（別のURLとは共有されません）';
    $('#save-warning-live').hidden = true;
    if(replaceUnreadable)unreadableSaveStatus=null;
    syncUnreadableSaveUI();
    return true;
  } catch {
    $('#save-note').textContent = '保存できない環境です。このタブを閉じると進捗が消えます';
    // A home-only message is invisible inside the full-screen dungeon.
    // Keep the warning readable while playing, until a write succeeds.
    $('#save-warning-live').hidden = false;
    syncUnreadableSaveUI();
    return false;
  }
}
function micView(mode='ready') {
  const button=$('#mic-button'), retry=$('#retry-mic');
  if(button){
    const unavailable=button.dataset.speechUnavailable==='true';
    const iOSNatural=isIOSDevice()&&mode==='listening';
    const readyLabel=play?.mode==='forest'&&play.tactics?.turn==='player'&&currentPrompt()?.kind==='speak'?'声で攻撃':'話す';
    button.classList.toggle('active',mode==='listening');
    button.setAttribute('aria-pressed',String(mode==='listening'));
    button.innerHTML=mode==='finishing'?'<span>確定中…</span>':iOSNatural?'<span>聞き取り中…</span>':mode==='listening'?'<span class="mic-glyph mic-glyph-stop" aria-hidden="true"></span><span>停止</span>':`<span class="mic-glyph mic-glyph-talk" aria-hidden="true"></span><span>${readyLabel}</span>`;
    button.title=mode==='finishing'?'音声の文字起こしを確定中':iOSNatural?'iPhoneで音声認識中。話し終えると自動で確定します':mode==='listening'?'録音を停止する':'マイクで音声認識を開始する';
    button.setAttribute('aria-label',mode==='finishing'?'文字起こしを確定中':iOSNatural?'音声認識中。話し終えると自動で確定します':mode==='listening'?'録音を停止する':'マイクで音声認識を開始する');
    button.hidden=mode==='done'||unavailable;
    // On iOS, manually stopping a successful session can permanently mute
    // subsequent Web Speech sessions (WebKit 321436). Wait for natural end.
    button.disabled=mode==='done'||mode==='finishing'||iOSNatural||unavailable;
  }
  const submit=$('#show-answer');
  if(submit&&isIOSDevice()&&!play?.revealed&&!play?.grading)
    submit.disabled=mode==='listening'||mode==='finishing';
  const keyboard=$('#native-ios-dictation');
  if(keyboard)keyboard.hidden=mode==='done';
  if(retry) retry.hidden=mode!=='captured';
}
function showSpeechFallback(){
 const alternatives=$('#speech-alternatives');
 if(alternatives){
   alternatives.hidden=false;
   alternatives.open=true;
   alternatives.classList.add('speech-alternatives-priority');
 }
}
function isIOSDevice(){
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}
function openNativeDictation(){
  // iOS does not allow websites to press the keyboard's microphone button.
  // Focus must happen inside a real user tap; describe the remaining tap
  // honestly instead of pretending the browser recognizer is recording.
  if(isIOSDevice())cancelPendingSpeech();
  else if(recognition)finishRecognition();
  const field=$('#spoken-answer');
  if(!field||field.disabled)return;
  field.focus({preventScroll:false});
  const helper=$('#speech-helper');
  if(helper)helper.textContent='入力欄を開いたよ。英語キーボードに切り替え、キーボードのマイクを押して話してね。';
  const help=$('#speech-alternative-help');
  if(help)help.textContent='英語キーボードに切り替え、キーボード上のマイクをタップ。英文が入力欄に出たら「答えを判定する」を押してね。Webページから標準のマイクを自動起動することはできません。';
}
function recognitionReleased(active) {
  if(retiringRecognition!==active)return;
  retiringRecognition=null;
  if(recognitionRetireTimer)clearTimeout(recognitionRetireTimer);
  recognitionRetireTimer=null;
  const requested=queuedRecognitionSession;
  queuedRecognitionSession=null;
  if(requested&&play===requested&&!play.revealed&&$('#mic-button')){
    if(isIOSDevice()){
      // In iOS 27, WebKit can leave every subsequent recognizer deaf even
      // though onend fired. An automatic restart inside this async callback
      // also loses the learner's tap. Require a fresh explicit gesture.
      micView('ready');
      const helper=$('#speech-helper');
      if(helper)helper.textContent='録音の準備ができました。もう一度「話す」を押してね。';
    }else startRecognition();
  }
}
function clearIOSSpeechCue(){
  if(iosSpeechCueTimer!==null)clearTimeout(iosSpeechCueTimer);
  iosSpeechCueTimer=null;
  if(iosSpeechCue){iosSpeechCue.onend=null;iosSpeechCue.onerror=null;}
  iosSpeechCue=null;
}
// Keyboard input and page suspension supersede every outstanding mic request,
// including a retry waiting for the cue or the previous recognizer's end.
function cancelPendingSpeech(){
  const pending=recognition||iosSpeechCue||queuedRecognitionSession;
  queuedRecognitionSession=null;
  if(iosSpeechCue){
    clearIOSSpeechCue();
    window.speechSynthesis?.cancel();
  }
  if(pending)stopRecognition();
}
function stopRecognition(mode='ready', options={}) {
  if(recognitionStartTimer)clearTimeout(recognitionStartTimer);
  if(recognitionWatchdog)clearTimeout(recognitionWatchdog);
  if(recognitionNoResultTimer)clearTimeout(recognitionNoResultTimer);
  recognitionStartTimer=null;
  recognitionWatchdog=null;
  recognitionNoResultTimer=null;
  const active=recognition;
  recognition=null; // Disarm callbacks before abort: Safari fires onend asynchronously.
  recognitionStopping=false;
  if(mode==='done'){
    queuedRecognitionSession=null;
    iosSpeechCueDue=false;
    clearIOSSpeechCue();
  }
  if(mode==='done')$('#spoken-answer')?.classList.remove('transcript-interim');
  micView(mode);
  if(active&&!options.ended){
    // A finalized transcript must close with stop(), never abort(): Safari
    // sometimes keeps the audio service busy if a final result is aborted.
    if(recognitionRetireTimer)clearTimeout(recognitionRetireTimer);
    const answerField=$('#spoken-answer');
    retiringRecognition=active;
    active.onend=()=>recognitionReleased(active);
    recognitionRetireTimer=setTimeout(()=>{
      if(retiringRecognition!==active)return;
      if(options.natural){
        // A natural ending is preferred on iOS, but never trap the learner
        // indefinitely if a buggy recognizer refuses to dispatch `end`.
        try{active.stop();}catch{}
        if(answerField && answerField===$('#spoken-answer') && !play?.revealed && !answerField.disabled){
          showSpeechFallback();
          const helper=$('#speech-helper');
          if(helper)helper.textContent='iPhone側で録音の終了を確認できません。下のiPhone標準音声入力でも続けられます。';
        }
      }
      recognitionReleased(active);
    },options.natural?5500:2000);
    if(!options.alreadyStopping&&!options.natural){
      try{
        if(options.graceful)active.stop();
        else active.abort();
      }catch{recognitionReleased(active);}
    }
  }
}
function finishRecognition(){
  // A deliberate STOP must call stop(), not abort(): on iOS/WebKit abort()
  // discards speech still waiting to be delivered by onresult/onend.
  const active=recognition,helper=$('#speech-helper');
  if(!active||recognitionStopping)return;
  recognitionStopping=true;
  if(recognitionStartTimer)clearTimeout(recognitionStartTimer);
  recognitionStartTimer=null;
  // stop() can take several seconds to deliver the final transcript on iOS.
  // Keep that pending state visible rather than offering a dead "話す" button.
  micView('finishing');
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
  playbackGeneration++;
  const previous=spokenAudio;
  spokenAudio=null;
  const native=$('#listening-native-audio');
  if(native&&native!==previous){
    try{
      native.pause();
      // The player can be started directly from iPhone's native controls,
      // without becoming spokenAudio. A later "replay" must still begin at 0.
      native.currentTime=0;
    }catch{}
  }
  if(previous){
    previous.onerror=null;
    previous.onended=null;
    previous.onplaying=null;
    try{
      previous.pause();
      // The visible iPhone media player must retain its source for direct
      // replay, while short-lived Audio objects can release their session.
      if(previous.id==='listening-native-audio')previous.currentTime=0;
      else {previous.removeAttribute('src');previous.load();}
    }catch{}
  }
  try { window.speechSynthesis?.cancel(); } catch {}
}
function pauseInterruptedListening(){
  const state=play?.listeningState;
  const native=$('#listening-native-audio');
  const inFlight=Boolean(spokenAudio&&!spokenAudio.ended)||
    Boolean(native&&!native.paused&&!native.ended)||
    Boolean(window.speechSynthesis?.speaking||window.speechSynthesis?.pending);
  stopListeningPlayback();
  // An interrupted clip is not evidence of listening comprehension. Keep a
  // fully finished replay available, and retain transcript-only practice.
  if(!inFlight||!state||state.understood||state.usedTranscript)return;
  state.played=false;
  const choices=$('#listening-meaning'),slow=$('#play-slow-audio'),status=$('#listening-status');
  if(choices)choices.hidden=true;
  if(slow)slow.hidden=true;
  if(status)status.textContent='音声が途中で中断されたよ。もう一度再生して聞いてね。';
}
function clearTimer() { if (timer) clearInterval(timer); timer = null; }
function showView(name) {
  cancelAutoAdvance();
  for (const id of ['home','play','result','collection','detail','training']) $(`#${id}-view`).hidden = id !== name;
  document.body.dataset.gameView=name;
  if(name==='home')document.body.dataset.gameTab='home';
  else if(name==='collection'&&!['forge','party'].includes(document.body.dataset.gameTab))document.body.dataset.gameTab='party';
  syncGameHud();
  syncGameTabs();
  stopAudio();
  if(name==='home')homeNavigation?.showMenu();
  const heading = $(`#${name}-view h1`);
  if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  window.scrollTo({top:0,behavior:'instant'});
}
function syncGameHud(){
  const coins=$('#game-hud-coins'),level=$('#game-hud-level'),xp=$('#game-hud-xp');
  if(coins)coins.textContent=(save.coins||0).toLocaleString('ja-JP')+' G';
  if(level)level.textContent='Lv.'+getMonsterProgress(save).level;
  if(xp)xp.textContent=(save.xpWallet||0)+' XP';
}
function syncGameTabs(){
  $$('#game-tabs [data-game-tab]').forEach(button=>{
    const active=button.dataset.gameTab===document.body.dataset.gameTab;
    button.setAttribute('aria-current',active?'page':'false');
  });
}
function renderDifficulty() {
  $$('[data-difficulty]').forEach(button => {
    const active = button.dataset.difficulty === save.difficulty;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $$('[data-roleplay-level]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.roleplayLevel===save.difficulty)));
  $$('[data-dungeon-level]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.dungeonLevel===save.difficulty)));
  $('#dungeon-current-level').textContent=`現在：${difficultyCopy[save.difficulty].label}`;
  $('#difficulty-description').textContent = difficultyCopy[save.difficulty].description;
  const roleplayPick=recommendedRoleplay(save);
  $('#roleplay-recommendation').textContent=`今日のおすすめ：${roleplayFor(roleplayPick.id,save.difficulty).title} · ${roleplayPick.reason}`;
  $$('[data-roleplay-card]').forEach(card=>{
    const selected=card.dataset.roleplayCard===roleplayPick.id;
    card.dataset.recommended=String(selected);
    card.querySelector('.roleplay-badge').hidden=!selected;
  });
  // The recommended scene stays first in both visual and keyboard order,
  // including when a due speaking expression changes the recommendation.
  const selectedRoleplayCard=$(`[data-roleplay-card="${roleplayPick.id}"]`);
  selectedRoleplayCard?.parentElement?.prepend(selectedRoleplayCard);
}
function renderHome() {
  const creature = monsterFor(save.selectedMonster), growth = getMonsterProgress(save), summary = learningSummary(save);
  // A brand-new player has not met the companion yet. Do not greet them
  // with an unexplained fried-egg sprite before they enter the first world.
  const firstEncounterPending = save.totalAnswers===0 && save.completedRuns===0 &&
    cleanForest(save.forest).completedAreas.length===0 && (save.ownedMonsters||[]).length===1;
  $('#hero-monster-art').innerHTML = monsterArt(creature.id,growth.stage,equippedWeapon(save));
  $('#hero-monster-name').textContent = monsterFormName(creature,growth.stage) + (growth.ascended ? ' / 第2進化' : growth.evolved ? ' / 進化済み' : '');
  $('#hero-monster-species').textContent = `${creature.japaneseName} · ${creature.roots.map(root=>root.word).join(' + ')}`;
  $('#hero-level').textContent = `Lv.${growth.level}`;
  const equipped=equippedWeapon(save);
  $('#hero-weapon-summary').textContent=`攻撃成長 +${levelAttackBonus(growth.level)} · 装備：${equipped?`${equipped.name}（攻撃+${equipped.attack}・${WEAPON_AFFINITY_LABELS[equipped.affinity]}特性）`:'素手'}`;
  $('#hero-xp-fill').style.width = `${100 - growth.toNextLevel / XP_PER_LEVEL * 100}%`;
  const nextHealthTier=[3,6,9].find(level=>level>growth.level);
  const mastery=masterySkillFor(creature.id,growth.level);
  const evolutionBrief=growth.ascended?'第2進化達成！':growth.canEvolve?'進化条件達成！ 図鑑で「進化する」を押そう':`次の進化：Lv.${growth.evolved?10:5}＋ボス ${growth.trialCount}/${growth.requiredTrials}エリア`;
  const nextAttackLevel=growth.level<13?4+3*levelAttackBonus(growth.level):null;
  $('#hero-next-level').textContent = `次のLv.まで ${growth.toNextLevel} XP · ${evolutionBrief}${nextHealthTier?` · Lv.${nextHealthTier}でHP＋1`:''}${nextAttackLevel?` · Lv.${nextAttackLevel}で攻撃＋1`:''}${!mastery?` · Lv.${MASTERY_LEVEL}で熟練技`:''}`;
  $('#home-wallet').textContent = save.xpWallet;
  const gym=dailyTrainingPlan(save);
  const dailyGrowth=dailyGrowthSummary(save);
  const skillFocus=nextSkillFocusFor(save,{difficulty:save.difficulty,today:dayKey()});
  const dailyGold=dailyGoldStatus(save);
  $('#daily-plan-status').textContent=dailyGold.claimed
    ?`今日のボーナス ＋${dailyGold.bonus} G 獲得済み`
    :`今日の8問 · 自力${dailyGold.required}問で ＋${dailyGold.bonus} G`;
  $('#start-daily-gym').disabled=!gym.prompts.length;
  $('#daily-last-rate').textContent=dailyGrowth.lastRate===null?'―':`${dailyGrowth.lastRate}%`;
  $('.daily-gym').dataset.hasHistory=String(dailyGrowth.sessions>0);
  $('.daily-gym-progress').dataset.hasHistory=String(dailyGrowth.sessions>0);
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
  const milestones=retentionMilestoneSummary(save,dayKey());
  $('#retention-day1-label').textContent=`翌日達成 ${milestones.day1}問`;
  $('#retention-day3-label').textContent=`3日後達成 ${milestones.day3}問`;
  $('#retention-stable-label').textContent=`7日後チェック達成 ${recall.stable.length}問`;
  $('#retention-transfer-label').textContent=`別の場面で応用 ${recallPlan.transferIds.length}問`;
  $('#start-retention-review').disabled=!recall.due.length;
  $('.retention-hub').dataset.hasHistory=String(Object.keys(save.retention||{}).length>0);
  $('.retention-hub').dataset.hasDue=String(recall.due.length>0);
  $('#start-retention-review').textContent=`今日の定着チェック（${recall.due.length}問）`;
  $('#retention-next').textContent=recall.due.length
    ?`リスニングは意味の選択だけ。${recallPlan.transferIds.length?'覚えた表現は違う場面でも使ってみよう。':'ヒントなしで再挑戦しよう。'} 解説は自分のペースで読めるよ。`
    :recall.upcoming.length?`次の復習は ${recall.upcoming[0].nextDay}。日を空けてもう一度挑戦しよう。`
    :'最初の問題を解くと、翌日の定着チェックがここに届くよ。';
  const bookmarked=savedReviewQueue(save);
  const needsReview=bookmarked.filter(item=>item.due);
  $('.saved-review').dataset.hasSaved=String(bookmarked.length>0);
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
  const ruinsCount=RUINS_AREAS.filter(area=>forest.completedAreas.includes(area.id)).length;
  const allClear=forestCount===FOREST_AREAS.length&&cityCount===CITY_AREAS.length&&ruinsCount===RUINS_AREAS.length;
  $('#dungeon-total-areas').querySelector('strong').textContent=DUNGEON_AREAS.length;
  $('#dungeon-total-areas').setAttribute('aria-label',`全${DUNGEON_AREAS.length}エリアを順番に攻略`);
  $('#forest-home-progress').textContent = `森 ${forestCount}/${FOREST_AREAS.length} · 街 ${cityCount}/${CITY_AREAS.length} · 遺跡 ${ruinsCount}/${RUINS_AREAS.length}`;
  const unlocked=new Set(unlockedDungeonAreas(save).map(area=>area.id));
  const dueRetention=retentionOverview(save,dayKey()).due;
  const areaCard=(area,index)=>{
    const cleared=forest.completedAreas.includes(area.id),open=unlocked.has(area.id);
    const chapterDue=dueRetention.filter(entry=>area.focus.some(key=>entry.prompt.phraseId.startsWith(key))).length;
    const bestRank=forest.medals[area.id]?.[save.difficulty]||0;
    const target=bestRank===3?'金ランク達成！':bestRank===2?'次は全問自力正解で金へ':bestRank===1?'次は自力正解75%で銀へ':'ボス3問を確認して銅勲章へ';
    return `<button type="button" class="forest-area-card ${area.world==='city'?'city-area-card':area.world==='ruins'?'ruins-area-card':''}" data-enter-forest="${area.id}" ${open?'':'disabled'} aria-label="${escapeHtml(area.name)} ${cleared?'攻略済み':open?'挑戦可能':'未解放'} ${bestRank?BOSS_MEDAL_NAMES[bestRank]+'勲章':''}"><span class="forest-area-number">${String(index+1).padStart(2,'0')}</span><span class="forest-area-copy"><strong>${escapeHtml(area.name)}</strong><small><span class="forest-area-goal">${escapeHtml(area.goal)}</span><span class="forest-area-count">通常${regularEncountersFor(area.id)}戦＋ボス3段階 · 敵の反撃あり${chapterDue?' · 復習候補'+chapterDue+'問':''}</span><span class="boss-medal-target">${target}</span></small></span><span class="forest-area-status" data-medal-rank="${bestRank}">${bestRank?`${BOSS_MEDAL_NAMES[bestRank]}勲章`:cleared?'CLEAR':open?'挑戦する':area.world==='ruins'&&!cityClear?'街の4エリアを攻略で解放':area.world==='city'&&forestCount<FOREST_AREAS.length?'森の4エリアを攻略で解放':'前のエリアを攻略で解放'}</span></button>`;
  };
  const forestCards=FOREST_AREAS.map((area,index)=>areaCard(area,index)).join('');
  const cityCards=CITY_AREAS.map((area,index)=>areaCard(area,index)).join('');
  const ruinsCards=RUINS_AREAS.map((area,index)=>areaCard(area,index)).join('');
  $('#forest-area-list').innerHTML=`
    <section class="dungeon-world-card dungeon-world-forest" aria-labelledby="dungeon-world-forest-title">
      <header class="dungeon-world-header"><div class="dungeon-world-heading"><span>WORLD 01 · FOREST</span><h3 id="dungeon-world-forest-title">緑風の森</h3><p>聞く・話す・読む力を身につける冒険</p></div><strong class="dungeon-world-badge">${forestCount} / ${FOREST_AREAS.length} エリア攻略</strong></header>
      <div class="dungeon-world-areas">${forestCards}</div>
    </section>
    <div class="dungeon-world-transition" aria-hidden="true"><span>森をクリアすると次の世界へ ↓</span></div>
    <section class="dungeon-world-card dungeon-world-city" aria-labelledby="dungeon-world-city-title">
      <header class="dungeon-world-header"><div class="dungeon-world-heading"><span>WORLD 02 · SNOW CITY</span><h3 id="dungeon-world-city-title">雪灯りの街</h3><p>中央広場から吹雪の街外れまで、4エリアで実践英語に挑戦</p></div><strong class="dungeon-world-badge">${cityCount} / ${CITY_AREAS.length} エリア攻略${forestCount<FOREST_AREAS.length?' · 森の攻略で解放':''}</strong></header>
      <div class="dungeon-world-areas">${cityCards}</div>
    </section>
    <div class="dungeon-world-transition" aria-hidden="true"><span>雪の街をクリアすると古代の遺跡へ ↓</span></div>
    <section class="dungeon-world-card dungeon-world-ruins" aria-labelledby="dungeon-world-ruins-title">
      <header class="dungeon-world-header"><div class="dungeon-world-heading"><span>WORLD 03 · STARLIT RUINS</span><h3 id="dungeon-world-ruins-title">星影の遺跡</h3><p>石碑の暗号と時の仕掛けを解く、2つの高難度エリア</p></div><strong class="dungeon-world-badge">${ruinsCount} / ${RUINS_AREAS.length} エリア攻略${!cityClear?' · 雪の街を攻略で解放':''}</strong></header>
      <div class="dungeon-world-areas">${ruinsCards}</div>
    </section>`;
  $$('[data-enter-forest]').forEach(button=>button.addEventListener('click',()=>startMainDungeon(button.dataset.enterForest)));
  const nextArea=nextDungeonArea(save);
  $('#dungeon-next-area').textContent=allClear?'全エリア攻略！ 次は好きな場所へ':`次の目的地：${nextArea.name}`;
  $('#dungeon-next-goal').textContent=allClear
    ?'好きなエリアを再挑戦して、使える英語をさらに増やそう。'
    :`${nextArea.goal} · ${difficultyCopy[save.difficulty].label}モード`;
  $('#start-forest').textContent=allClear?'星影の遺跡をもう一度冒険する':`${nextArea.name}の冒険を始める →`;
  const weak=quizWeaknessOverview(save);
  const weakSummary=$('#forest-weakness-summary');
  weakSummary.hidden=weak.due.length===0&&weak.upcoming.length===0;
  weakSummary.textContent=weak.due.length?`苦手の復習 ${weak.due.length}問 · 次の冒険で優先出題するよ。`:`苦手の復習 ${weak.upcoming.length}問 · 次の復習日にもう一度挑戦しよう。`;
  $('#stat-independent').innerHTML = `${summary.independent}<span> / ${summary.total}</span>`;
  $('#stat-review').textContent = summary.reviewCount;
  const journal=reviewOverview(save);
  $('.review-journal').dataset.hasHistory=String((save.totalAnswers||0)>0);
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
  const skillStats=skillProgressFor(save,dayKey());
  $('#skill-growth-list').innerHTML=skillStats.map(stat=>{
    const measured=stat.sample>0;
    const evidence=measured?`直近${stat.sample}回答：自力で確認 ${stat.independent}回（${stat.percent}%）`:'自力での確認率はまだ記録なし';
    const voiceEvidence=stat.kind==='speak'&&measured?` · ブラウザのマイクで文字化した回答 ${stat.microphone}/${stat.sample}回`:'';
    const detail=(measured?`ヒントあり ${stat.assisted}回 · ${stat.sample}回答に基づく${stat.sample<4?'（少数のため参考値）':''}`:'この更新後の回答から集計するよ')+voiceEvidence;
    return `<article class="skill-growth-card" data-skill="${stat.kind}" data-learning-priority="${String(skillFocus?.kind===stat.kind)}"><div class="skill-growth-head"><strong>${escapeHtml(stat.label)}${skillFocus?.kind===stat.kind?' · 今日の重点':''}</strong><span>${stat.needsReview?'要復習 '+stat.needsReview+'問':'復習予定なし'}</span></div>
      <p class="skill-growth-count">${escapeHtml(evidence)}</p>
      <div class="skill-growth-track" aria-hidden="true"><span style="width:${stat.percent??0}%"></span></div>
      <p class="skill-growth-detail">${escapeHtml(detail)} · 翌日以降に自力で確認 ${stat.spaced}問</p>
      <button type="button" data-skill-start="${stat.kind}" class="skill-growth-start">${escapeHtml(stat.label)}を練習する</button></article>`;
  }).join('');
  const improvementRows=improvementHighlightsFor(save,{today:dayKey()});
  const improvementPanel=$('#improvement-highlights');
  improvementPanel.hidden=improvementRows.length===0;
  if(improvementRows.length){
    $('#improvement-highlights-count').textContent=`${improvementRows.length}件の成長記録`;
    $('#improvement-highlights-list').innerHTML=improvementRows.map(row=>{
      const first=row.before==='again'?'前は間違えた':'前はヒントが必要だった';
      const method=row.kind==='speak'?(row.inputSource==='microphone'?' · マイクで回答':row.inputSource==='keyboard'?' · 文字で回答':' · 回答手段は未記録'):'';
      return `<article class="improvement-highlight"><span class="improvement-highlight-kind">${escapeHtml(row.label)} · ${escapeHtml(row.scene)}</span>
        <strong>${escapeHtml(row.kind==='speak'?row.expression:row.cue)}</strong>
        <p><span>${escapeHtml(row.previousDay)}：${first}</span><span class="improvement-highlight-arrow" aria-hidden="true">→</span><span>${escapeHtml(row.afterDay)}：ヒントなしで正解${escapeHtml(method)}</span></p></article>`;
    }).join('');
  }
  $('#stat-monsters').innerHTML = `${save.ownedMonsters.length}<span> / ${MONSTERS.length}</span>`;
  $('#hero-vocab').innerHTML = creature.roots.map(root=>`<span class="vocab-chip"><strong>${escapeHtml(root.word)}</strong> <span>${escapeHtml(root.meaning)}</span></span>`).join('');
  renderDifficulty();
  homeNavigation?.updateHero({
    // Tease the SAME eyes that appear on the first forest route. The generic
    // square mystery tile looked like a missing asset on the opening screen.
    art:firstEncounterPending?forestEncounterEyesArt():monsterArt(creature.id,growth.stage,equippedWeapon(save)),
    name:firstEncounterPending?'まだ見ぬ仲間':monsterFormName(creature,growth.stage),
    firstEncounterPending,
    level:growth.level,mastered:summary.independent,due:journal.due.length,xp:save.xpWallet,ownedCount:save.ownedMonsters.length,
    // Keep imported/legacy review queues reachable even when their older save
    // has no modern answer counter. Only a truly empty save gets the single CTA.
    hasAttempted:save.totalAnswers>0||summary.practiced>0||skillStats.some(stat=>stat.sample>0)||
      Object.keys(save.reviewPrompts||{}).length>0||Object.keys(save.transferReviews||{}).length>0||
      (save.savedPromptIds||[]).length>0,
    areasCleared:forestCount,cityAreasCleared:cityCount,ruinsAreasCleared:ruinsCount,totalAreas:DUNGEON_AREAS.length,
    nextAreaName:nextArea.name,bondRank:bond.rank,summon:summonProgress(save)
  });
  const homeQuest=nextLearningQuestFor(save);
  homeNavigation?.updateQuest(homeQuest,learningProofFor(save),homeLearningSignalFor(save,dayKey(),homeQuest));
  // Reuse art for already recruited creatures only; never preview locked ones.
  // Pick the selected companion first so that the home genuinely reflects
  // the user's own team, and cap moving sprites at three for mobile performance.
  const walkingIds=firstEncounterPending?[]:[save.selectedMonster,...save.ownedMonsters.filter(id=>id!==save.selectedMonster)].slice(0,3);
  homeNavigation?.updateWalkers(walkingIds.map(id=>{
    const progress=getMonsterProgress(save,id);
    return {art:monsterArt(id,progress.stage,equippedWeapon(save))};
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
// The main dungeon is a solo adventure with exactly the selected companion.
// Legacy formations remain in saves for a future redesign, but do not affect this run.
function startMainDungeon(areaId=null,{skipOpening=false}={}){startSession('forest-tactics',areaId,false,true,null,{skipOpening});}
function startSession(mode,requestedAreaId=null,onlyDue=false,quickStart=false,retrySavedIds=null,{reviewLimit=null,skipOpening=false}={}) {
  cancelAutoAdvance();clearTimer(); stopAudio();
  const focusKind=mode==='skill-focus'?requestedAreaId:null;
  if(mode==='skill-focus'&&!SKILL_KINDS.includes(focusKind)){renderHome();return;}
  const transferPick=mode==='transfer-review'?dueRoleplayTransfers(save)[0]:null;
  if(mode==='transfer-review'&&!transferPick){renderHome();return;}
  const difficulty=transferPick?(transferPick.prompt.difficulty||'easy'):save.difficulty;
  const endless=mode==='forest-endless',tactical=mode==='forest-tactics',forestMode=mode==='forest'||endless||tactical;
  if(mode==='saved'&&!savedReviewQueue(save).some(item=>!onlyDue||item.due)){renderHome();return;}
  if(mode==='retention'&&!retentionOverview(save,dayKey()).due.length){renderHome();return;}
  const area=forestMode?(endless?FOREST_AREAS[0]:unlockedDungeonAreas(save).find(a=>a.id===requestedAreaId)||nextDungeonArea(save)):null;
  const promptCount=mode==='challenge'?{easy:6,normal:4,hard:3}[difficulty]:3;
  const firstWave=forestMode?buildForestWave({difficulty,wave:1,areaId:area.id,progression:endless?'endless':'story',previousIds:cleanForest(save.forest).recentPromptIds,reviewPhraseIds:dueForestPhrases(),reviewPromptIds:dueForestPromptIds(),quizWeaknessIds:dueQuizWeaknessIds(),bossConversation:true}):null;
  const gym=mode==='daily'?dailyTrainingPlan(save,{difficulty}):null;
  const roleplay=mode==='roleplay'?roleplayFor(requestedAreaId,difficulty):null;
  if(mode==='roleplay'&&!roleplay){renderHome();return;}
  const quickRetention=mode==='retention'&&reviewLimit===3;
  const recallPlan=mode==='retention'?retentionPracticePlan(save,dayKey(),quickRetention?{limit:3,maxTransfers:0}:undefined):null;
  if(mode==='dungeon-review'&&!lastDungeonReviewIds.length){renderHome();return;}
  const focused=mode==='skill-focus'?skillFocusPrompts(save,focusKind,{difficulty,today:dayKey()}):
    mode==='transfer-review'?[transferPick.prompt]:mode==='retention'?recallPlan.prompts:
    mode==='dungeon-review'?lastDungeonReviewIds.map(id=>ALL_PROMPTS.find(p=>p.id===id)).filter(Boolean):
    (mode==='listening'||mode==='speaking')?ALL_PROMPTS
    .filter(p=>p.kind===(mode==='listening'?'listen':'speak')&&(p.difficulty||'easy')===difficulty&&!p.bossOnly)
    .sort((x,y)=>Number(Boolean(save.reviewPrompts?.[y.id]&&save.reviewPrompts[y.id]<=dayKey()))-Number(Boolean(save.reviewPrompts?.[x.id]&&save.reviewPrompts[x.id]<=dayKey())))
    .slice(0,6):null;
  const prompts=forestMode?firstWave.prompts:roleplay?roleplay.turns.map(turn=>turn.prompt):focused||(mode==='daily'?gym.prompts:mode==='saved'?savedReviewQueue(save).filter(item=>(!onlyDue||item.due)&&(!retrySavedIds||retrySavedIds.includes(item.prompt.id))).map(item=>item.prompt):selectRoundPrompts(save,promptCount,Math.random,dayKey(),difficulty));
  if(!prompts.length){renderHome();return;}
  const roster=tactical&&quickStart?[save.selectedMonster]:plannedBattleFormation(save);
  const battleTeam=tactical?createTrainedBattleParty(roster):null;
  const openingCharge=tactical?formationResonance(roster,Object.fromEntries(roster.map(id=>[id,getMonsterProgress(save,id).level]))).openingCharge:0;
  const huntBefore=forestMode?monsterHuntBoard(save).selected:null;
  const improvementsAtStart=improvementHighlightsFor(save,{today:dayKey(),limit:80}).map(row=>row.id);
  play={mode:forestMode?'forest':mode,focusKind,endless,quickStart:Boolean(tactical&&quickStart),quickRetention,
    firstCompanionMeeting:forestMode&&save.totalAnswers===0&&save.completedRuns===0&&(save.ownedMonsters||[]).length===1,
    areaId:area?.id||null,baseDifficulty:difficulty,difficulty:firstWave?.level||difficulty,tradeDrops:[],
    prompts,index:0,wave:1,seenIds:[],remainingTries:0,encounterKey:null,eventChoices:{},eventMemories:[],roleplay:roleplay?{...roleplay,history:[]}:null,
    bossHits:0,usedPower:false,usedShield:false,forestRelics:[],eliteDrops:[],bossMedal:null,bossTrialNewArea:null,huntTargetId:huntBefore?.id||null,huntBefore:huntBefore?.count||0,dungeonOutcomes:[],reviewOutcomes:[],encounterHelp:false,smooth:0,hintedCount:0,dailyPhases:gym?.phases||[],retentionTransferIds:recallPlan?.transferIds||[],retentionDueIds:recallPlan?.dueIds||[],retentionPassedIds:[],improvementsAtStart,earnedXp:0,captured:[],hintUsed:false,
    revealed:false,speechState:'',startedAt:Date.now(),deadline:mode==='challenge'?Date.now()+60000:null,
    // The expedition follows one clear route. Decorative story/NPC choices
    // did not change grading or outcomes and interrupted every battle.
    route:area?.world==='ruins'?RUINS_ROUTES[0].id:area?.world==='city'?CITY_ROUTES[0].id:FOREST_ROUTES[0].id,companionId:save.selectedMonster,combo:0,bestCombo:0,
    tactics:tactical?{hp:fighterHealth(battleTeam,save.selectedMonster).hp,maxHp:fighterHealth(battleTeam,save.selectedMonster).maxHp,
      party:battleTeam,enemyHp:3,enemyMax:3,turn:'player',action:'attack',ultimate:openingCharge,
      formationPending:!quickStart,formationIds:[...battleTeam.roster],attackPrompt:null,defensePrompt:null,usedPromptIds:new Set(),lastEnemyKind:null,enemyKind:null,
      encounterIndex:-1,pendingAdvance:false,defenseHitTaken:false,bonusChargeUsed:false,comboUsed:false,lastAttackKind:null,lastIndependentKind:null,weaponTechniqueUsed:false,nextEnemyKind:null,eliteIndependentHits:0,
      bossCounterUsed:false,bossLinkUsed:false,counterShield:0,bossCoverUsed:false,lastCoverNote:'',bossReactionCompleted:false,styleShieldIntact:true,foeShifted:false,masteryUsed:false,playerMissCountered:false,kindRerolled:false,attackCommitted:false,attackKindChosen:false}:null};
  $('#play-mode-label').textContent=`${forestMode?(endless?'∞ 森のエンドレス':tactical&&!quickStart?'戦略バトル · '+area.name:area.name):mode==='roleplay'?roleplay.title:mode==='transfer-review'?'場面チェンジの復習':mode==='skill-focus'?SKILL_LABELS[focusKind]+'集中練習':mode==='challenge'?'60秒チャレンジ':mode==='daily'?'今日の5分ジム':mode==='listening'?'リスニング道場':mode==='speaking'?'スピーキング道場':mode==='dungeon-review'?'ダンジョンの復習':mode==='saved'?'保存した問題の復習':mode==='retention'?(quickRetention?'3問の定着チェック':'1・3・7日の定着チェック'):'練習モード'} · ${mode==='retention'?'難易度ミックス':difficultyCopy[difficulty].label}`;
  $('#open-battle-guide').hidden=!forestMode;
  $('#forest-journey').hidden=!forestMode;
  $('#forest-battle-log').hidden=!forestMode;
  $('#play-view').classList.toggle('forest-active',forestMode);
 $('#play-view').classList.toggle('tactical-battle',Boolean(tactical));
  $('#play-view').classList.toggle('scene-battle',forestMode);
  arrangeBattleScene(forestMode);
  $('#play-view').classList.toggle('review-only',mode==='saved'||mode==='daily'||mode==='listening'||mode==='speaking'||mode==='roleplay'||mode==='transfer-review'||mode==='skill-focus'||mode==='dungeon-review'||mode==='retention');
  $('#play-clock').textContent=mode==='daily'?'5分目安 · 時間制限なし':'自分のペースで';
  if(forestMode){
    $('#forest-journey').classList.remove('forest-victory');
    $('#forest-world-stage').dataset.route='wild';
    $('#forest-world-stage').dataset.renderedRoute='';
  }
  showView('play');
  betaTelemetry.track('monsters_beta_start',betaSessionFields(play));
  // The primary adventure button already means "start". Going through a
  // second "start adventure" screen before choosing an attack adds a tap
  // without a decision. Keep exploration between encounters and optional
  // party formation intact, but begin a quick-start battle immediately.
  if(forestMode){
    if(tactical&&quickStart&&skipOpening){
      // A fresh run may follow a cancelled exploration on this same page.
      // Discard stale map actions instead of carrying them into the battle.
      $('#forest-explore-options').hidden=true;
      $('#forest-explore-options').replaceChildren();
      $('#forest-explore-event').hidden=true;
      $('#forest-explore-event').replaceChildren();
      $('#forest-party-formation').hidden=true;
      $('#forest-world-stage').dataset.action='idle';
      renderQuestion();
    }
    else showForestExplore();
  }
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
  const progress=getMonsterProgress(save,play.companionId),evolved=progress.evolved;
  $('#forest-companion-art').innerHTML=monsterArt(companion.id,progress.stage,equippedWeapon(save));
  if($('#forest-party').dataset.companion!==companion.id || $('#forest-party').dataset.formStage!==String(progress.stage)){
    $('#forest-player-art').innerHTML=monsterArt(companion.id,progress.stage,equippedWeapon(save));
    $('#forest-party').dataset.companion=companion.id;
    $('#forest-party').dataset.formStage=String(progress.stage);
    // Keep the legacy flag for existing battle UI and save-transfer QA.
    $('#forest-party').dataset.evolved=String(evolved);
  }
  $('#forest-companion-name').textContent=`${play.firstCompanionMeeting?'初めての仲間 · ':''}${monsterFormName(companion,progress.stage)} · Lv.${progress.level}`;
  const world=$('#forest-world-stage');
  // The opening forest's hidden eyes resolve into an ally when the first
  // battle opens. Later encounters retain their normal combat presentation.
  world.dataset.firstCompanion=String(play.firstCompanionMeeting&&play.index===0&&play.wave===1);
  const currentRoute=play.route||'wild';
  const arenaKey=play.areaId+':'+currentRoute+':'+(play.index>=regularCount()?'boss':'mob');
  if(world.dataset.renderedRoute!==arenaKey){
    $('#forest-world-backdrop').innerHTML=battleArenaArt(play.index>=regularCount(),play.areaId);
    world.dataset.renderedRoute=arenaKey;
  }
  world.dataset.stage='arena';
  world.dataset.tactics=String(Boolean(play.tactics));
  world.dataset.attack=companion.id;
  syncBattleWeaponPresentation(world);
  world.dataset.evolved=String(evolved);
  world.dataset.ascended=String(progress.ascended);
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
  const affinity=play.tactics?foeBattleAffinity({foeId:foe.id,style:foeStyleFor({areaId:play.areaId,index:play.index,wave:play.wave,boss:play.index>=regularCount()}),shifted:play.tactics.foeShifted}):foeAffinity(foe.id);
  const weak=$('#forest-enemy-weakness');
  weak.hidden=!play.tactics;
  if(play.tactics){weak.textContent=`Weak: ${WEAK_BADGE_LABELS[affinity.weak]}`;weak.setAttribute('aria-label',`敵の弱点：${BATTLE_LABELS[affinity.weak]}`);weak.dataset.kind=affinity.weak;}
  // The enemy artwork is already identifiable. Use this scarce mobile HUD
  // space for current health rather than a second English/Japanese name.
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
  const route=[...FOREST_ROUTES,...CITY_ROUTES,...RUINS_ROUTES].find(entry=>entry.id===play.route);
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
  $('#forest-foe-name').textContent=boss?'ボス':`敵 HP ${left}/${max}`;
  // Show regular-foe vitality as a clean bar, not a second row of numbers.
  // Screen readers retain exact HP and the boss still shows three seals.
  meter.dataset.healthMode=boss?'seals':'bar';
  meter.textContent=boss?`封印 ${left} / ${max}`:'';
  meter.setAttribute('aria-label',boss?`ボスの残り封印 ${left}/${max}`:`敵のHP ${left}/${max}`);
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
function absorbIncomingBossHit(damage,kind=play?.tactics?.enemyKind){
 const t=play?.tactics;
 if(!t)return {activeDamage:damage,partnerId:null};
 // A shield protects against one incoming strike, not every retry forever.
 // The already-computed hit used its reduction before this call.
 t.counterShield=0;
 const cover=play.index>=regularCount()?bossReserveCoverFor({kind,activeId:play.companionId,
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
 // A defeated front-line ally cannot absorb later misses without consequence.
 // Bring in a healthy reserve immediately; this is not a manual party swap.
 const next=firstStandingAlly(t.party,play.companionId);
 let autoSwitchedTo=null;
 if(next&&next!==play.companionId){
  play.companionId=next;t.action='attack';syncActiveFighter();t.autoSwitchedTo=next;
  renderForestHud();renderTacticalControls();autoSwitchedTo=next;
 }
 return {activeDamage:actual,partnerId:cover?.partnerId||null,autoSwitchedTo};
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
   kinds.hidden=true; // Type selection happens before the question.
   const label=document.createElement('p');
   label.className='forest-tactic-kind-label';
   label.textContent='攻撃タイプ';
   label.hidden=kinds.hidden;
   kinds.before(label);
 }
 const strategy=document.createElement('details'),summary=document.createElement('summary');
 strategy.className='forest-tactic-strategy';
 strategy.open=Boolean(t.strategyOpen);
 const ready=t.ultimate>=ULTIMATE_MAX;
 const status=!incoming&&ready?'必殺技が使える！':!incoming&&supportReady?'連携チャンス！':`必殺 ${t.ultimate}/${ULTIMATE_MAX}`;
 const kind=currentPrompt()?.kind==='read'?'speak':currentPrompt()?.kind;
 // Even with the detail drawer closed, the defender must instantly know
 // which English skill the enemy is using; never hide that in a long note.
 summary.innerHTML=`<span>${incoming?`敵の攻撃：${BATTLE_LABELS[t.enemyKind]}`:`攻撃：${BATTLE_LABELS[kind]}`}</span><small>${status}</small>`;
 strategy.append(summary);
 [...panel.children].filter(child=>child!==strategy)
   .forEach(child=>strategy.append(child));
 panel.append(strategy);
 // Swapping allies matters in battle. Do not bury it under two accordion
 // menus; the actual roster stays one tap from the question on small phones.
 const party=panel.querySelector('.forest-party-brief');
 if(party)panel.append(party);
 if(!incoming&&ready){
   const shortcut=document.createElement('button');
   shortcut.type='button';shortcut.className='forest-ultimate-shortcut';
   shortcut.setAttribute('aria-pressed',String(t.action==='skill'));
   shortcut.textContent=t.action==='skill'?'必殺技をセット中 · タップで解除':'必殺技を使う · ゲージ満タン！';
   strategy.before(shortcut);
   shortcut.addEventListener('click',()=>{
     if(play?.tactics!==t||play.revealed||t.turn!=='player')return;
     const keepFocus=document.activeElement===shortcut;
     t.action=t.action==='skill'?'attack':'skill';renderTacticalControls();
     // Re-rendering the actions otherwise drops keyboard/switch focus. Keep
     // the same control active without auto-scrolling the mobile battlefield.
     if(keepFocus)panel.querySelector('.forest-ultimate-shortcut')?.focus({preventScroll:true});
   });
 }
 strategy.addEventListener('toggle',()=>{
   if(play?.tactics===t&&strategy.isConnected)t.strategyOpen=strategy.open;
 });
}
function renderAttackChoice(panel,t){
 const foe=opponentFor(play.index,play.wave,play.areaId);
 const style=foeStyleFor({areaId:play.areaId,index:play.index,wave:play.wave,boss:false});
 const affinity=foeBattleAffinity({foeId:foe.id,style,shifted:t.foeShifted});
 const focus=nextSkillFocusFor(save,{difficulty:play.difficulty,today:dayKey()});
 const firstFight=play.wave===1&&play.index===0&&save.completedRuns===0&&!t.usedPromptIds.size;
 panel.dataset.turn='choose';
 // The small '復習' badge on an attack button already communicates the focus.
 // A second explanatory accordion made the choice screen feel like a manual.
 panel.innerHTML=`<div class="forest-attack-select" data-first-fight="${firstFight}" role="group" aria-label="攻撃タイプを先に選ぶ">
  <strong>攻撃を選ぶ</strong>
  <div class="forest-tactic-kinds">${BATTLE_KINDS.map(kind=>`<button type="button" data-tactic-kind="${kind}" data-weak="${kind===affinity.weak}" data-learning-focus="${String(focus?.kind===kind)}" aria-label="${BATTLE_LABELS[kind]}${kind===affinity.weak?'：敵の弱点・ダメージアップ':''}${focus?.kind===kind?'：復習対象':''}">${BATTLE_LABELS[kind]}${kind===affinity.weak&&focus?.kind===kind?'<small>WEAK · 復習</small>':kind===affinity.weak?'<small>WEAK</small>':focus?.kind===kind?'<small>復習</small>':''}</button>`).join('')}</div></div>`;
 panel.querySelectorAll('[data-tactic-kind]').forEach(button=>button.addEventListener('click',event=>{
  if(!play||play.revealed||play.tactics!==t||t.turn!=='player'||t.attackKindChosen)return;
  const kind=button.dataset.tacticKind;
  if(!BATTLE_KINDS.includes(kind))return;
  const base=play.prompts[play.index];
  const targets=tacticalReviewTargets();
  const selected=pickBattlePrompt({prompts:ALL_PROMPTS,kind,difficulty:play.difficulty,areaId:play.areaId,
    usedIds:t.usedPromptIds,reservedIds:play.prompts.filter(p=>p.id!==base.id).map(p=>p.id),
    allowReviewRepeat:true,...targets});
  const priority=p=>Boolean(p&&(targets.dueIds.includes(p.id)||targets.weakIds.includes(p.id)||
    targets.duePhraseIds.includes(p.phraseId)));
  // Keep the authored wave unless the chosen skill has scheduled review.
  // Otherwise clicking the learning-focus chip could show a random new
  // question while its genuine due task remains silently skipped.
  const candidate=base.kind===kind&&!t.usedPromptIds.has(base.id)&&!priority(selected)?base:selected;
  if(!candidate||candidate.kind!==kind){
   $('#forest-battle-log').textContent='この種類の問題が見つからなかったよ。別の攻撃を選んでね。';
   return;
  }
  const practiceRepeat=t.usedPromptIds.has(candidate.id);
  t.attackPrompt=candidate;t.attackKindChosen=true;t.attackCommitted=true;t.action='attack';
  renderQuestion();
  // The button is removed when the question opens. Restore keyboard focus
  // without scrolling the battle scene or raising an iPhone keyboard.
  if(event.detail===0){
   const heading=$('#play-card h1');
   if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  }
  if(practiceRepeat)$('#forest-battle-log').textContent='復習問題で攻撃！ 前に解いた英語をもう一度使ってみよう。';
 }));
}
function renderTacticalControls(){
 const panel=$('#forest-tactics'),t=play?.tactics;
 if(!panel)return;
 panel.hidden=play?.mode!=='forest'||!t;
 if(panel.hidden)return;
 if(t.turn==='player'&&play.index<regularCount()&&!t.attackKindChosen){renderAttackChoice(panel,t);return;}
 const foe=opponentFor(play.index,play.wave,play.areaId);
 const ally=allyAffinity(play.companionId);
 const evolved=getMonsterProgress(save,play.companionId).evolved;
 const ability=allySkill(play.companionId);
 const mastery=masterySkillFor(play.companionId,getMonsterProgress(save,play.companionId).level);
 const boss=play.index>=regularCount();
 const foeStyle=foeStyleFor({areaId:play.areaId,index:play.index,wave:play.wave,boss});
 const element=foeBattleAffinity({foeId:foe.id,style:foeStyle,shifted:t.foeShifted});
 const weak=$('#forest-enemy-weakness');
 if(weak){weak.hidden=false;weak.textContent=`Weak: ${WEAK_BADGE_LABELS[element.weak]}`;weak.setAttribute('aria-label',`敵の弱点：${BATTLE_LABELS[element.weak]}`);weak.dataset.kind=element.weak;}
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
 // The question, battle HUD and optional "遊び方" guide already explain the
 // turn. Avoid a numbered tutorial banner competing with the answer area.
 panel.innerHTML=`<div class="forest-tactic-heading"><strong>${incoming?'敵のターン · 防御問題':'味方のターン · 攻撃問題'}</strong><span>${incoming?'正解ならダメージ0':`敵の弱点：${BATTLE_LABELS[element.weak]}　耐性：${BATTLE_LABELS[element.resist]}`}</span></div>
  ${!incoming&&t.autoSwitchedTo?`<p class="forest-tactic-forecast" role="status">前の仲間が倒れたため、${escapeHtml(monsterFor(t.autoSwitchedTo).name)}が出撃！ 続けて英語で戦おう。</p>`:''}
  ${foeStyle?`<p class="forest-tactic-foe-style" data-foe-style="${foeStyle.id}" data-foe-shifted="${String(t.foeShifted)}"><strong>${foeStyle.name}</strong> ${foeStyle.id==='shift'&&t.foeShifted?`弱点変化済み：${BATTLE_LABELS[element.weak]}に弱い · ${BATTLE_LABELS[element.resist]}に耐性`:foeStyle.tip}${foeStyle.id==='shell'&&!t.styleShieldIntact?' · 殻は破れた！':''}</p>`:''}
  <p class="forest-tactic-matchup">${incoming?`${BATTLE_LABELS[t.enemyKind]}が飛んでくる！ 答えれば防げるよ。`:`仲間の得意：${BATTLE_LABELS[ally.strong]} · 苦手：${BATTLE_LABELS[ally.weak]}`}</p>
  ${!incoming?`<p class="forest-tactic-weapon">Lv.${getMonsterProgress(save,play.companionId).level} 攻撃成長 +${levelAttackBonus(getMonsterProgress(save,play.companionId).level)} · ${equippedWeapon(save)?`${escapeHtml(equippedWeapon(save).name)} 攻撃+${equippedWeapon(save).attack}`:'素手'}</p>`:''}
  ${boss?`<div class="forest-boss-tactical-plan" role="group" aria-label="ボスの3手の攻撃予告"><strong>ボスの攻撃パターン</strong><ol>${[0,1,2].map(phase=>{const threat=bossAttackFor(foe.id,phase);return `<li data-boss-plan-phase="${phase}" data-current="${String(phase===play.index-regularCount())}"><span>${phase+1}手目</span><b>${BATTLE_LABELS[threat.kind]}</b><small>${phase===2?'撃破で反撃なし':threat.pressure?'強攻撃':'通常攻撃'}</small></li>`;}).join('')}</ol><small>最初の2手は敵が反撃する。3つの英語確認をすべてクリアすると勝利！</small></div>`:''}
  ${boss&&party.length>1?`<p class="forest-boss-link" data-link-ready="${String(!t.bossLinkUsed&&linkPreview?.partnerId&&play.index-regularCount()===bossLink.phase)}" data-link-used="${String(t.bossLinkUsed)}"><strong>連携：${escapeHtml(bossLink.name)}</strong> ${bossLink.phase+1}手目 · 控えの${BATTLE_LABELS[bossLink.kind]}で${bossLink.description}。${t.bossLinkUsed?' 発動済み。':linkPreview?.partnerId?` ${escapeHtml(monsterFor(linkPreview.partnerId).name)}が待機中！`:' 控えが必要。'}</p>`:''}
  ${boss&&!incoming&&!finalBossStrike?`<p class="forest-boss-counter" data-counter-ready="${String(counter.matched&&!t.bossCounterUsed)}">${t.bossCounterUsed?'このボスへの迎撃は使用済み。':counter.matched?`迎撃チャンス！ ${escapeHtml(monsterFor(play.companionId).name)}の得意な${BATTLE_LABELS[bossThreat.kind]}で自力正解すると、必殺ゲージ＋1・次の敵攻撃を1軽減${evolved?'・HP＋1':''}（ボス戦で1回）。`:party.length>1?`迎撃するなら${BATTLE_LABELS[bossThreat.kind]}が得意な仲間を出そう。自力正解なら必殺ゲージ＋1と次の敵攻撃−1（ボス戦で1回）。`:`この仲間では迎撃の相性なし。英語に正解して次の反撃を防ごう。`}</p>`:''}
  ${boss&&party.length>1&&!finalBossStrike?`<p class="forest-boss-cover" data-cover-ready="${String(coverPreview?.activated)}">${t.bossCoverUsed?'控えの身代わりはこのボス戦で使用済み。':coverPreview?.activated?`控えの${escapeHtml(monsterFor(coverPreview.partnerId).name)}が身代わり待機。${BATTLE_LABELS[coverKind]}で自力防御を失い、HPが2以上減るときにダメージを2軽減・控えHP−1（ボス戦で1回）。自力正解・判定保留なら発動しない。`:'控えの身代わりは「出撃中の仲間が苦手・控えが得意」な技能の敵攻撃でだけ発動するよ。'}</p>`:''}
  ${incoming?'':`<p class="forest-tactic-forecast"><strong>${finalBossStrike?'最終撃：正解で勝利！':`次の敵攻撃：${BATTLE_LABELS[t.nextEnemyKind]}`}</strong></p>`}
  ${!incoming&&evolved?`<p class="forest-tactic-evolution">進化ボーナス：得意な${BATTLE_LABELS[ally.strong]}の威力＋1 / 同技能の被ダメージ−1</p>`:''}
  <div class="forest-ultimate-meter" role="progressbar" aria-label="必殺ゲージ" aria-valuemin="0" aria-valuemax="${ULTIMATE_MAX}" aria-valuenow="${t.ultimate}"><strong>必殺ゲージ ${t.ultimate} / ${ULTIMATE_MAX}</strong><span class="forest-ultimate-track"><span style="width:${100*t.ultimate/ULTIMATE_MAX}%"></span></span></div>
  <p class="forest-tactic-ability"><strong>固有スキル：${escapeHtml(ability.name)}</strong> ${escapeHtml(ability.description)}</p>
  ${mastery?`<p class="forest-tactic-mastery" data-mastery-used="${String(t.masteryUsed)}"><strong>Lv.${MASTERY_LEVEL}技：${escapeHtml(mastery.name)}${t.masteryUsed?' · 使用済み':' · 準備OK'}</strong> ${escapeHtml(mastery.description)}</p>`:''}
  ${incoming?'':`<div class="forest-tactic-actions" role="group" aria-label="行動を選ぶ">${[
    ['attack','こうげき','何度でも使用可能'],['skill','必殺技',boss?'基本威力3以上＋HPを2回復 · 次の反撃を2軽減（最終撃を除く）':`基本威力3以上 · ${ability.name}`],
    ...(party.length>1?[['assist','仲間と連携',t.comboUsed?'この敵には使用済み':supportId?`${monsterFor(supportId).name}が援護 · ${previewEffect}${!supportReady?'（ゲージが満タン）':''}`:'控えの得意技能を選ぶと使える']]:[])
  ].map(([id,label,desc])=>`<button type="button" data-tactic-action="${id}" aria-pressed="${String(t.action===id)}" ${id==='skill'&&t.ultimate<ULTIMATE_MAX||id==='assist'&&!supportReady?'disabled':''}><strong>${label}</strong><small>${escapeHtml(desc)}</small></button>`).join('')}</div>
  <div class="forest-tactic-kinds" role="group" aria-label="攻撃する英語の種類">${BATTLE_KINDS.map(kind=>`<button type="button" data-tactic-kind="${kind}" aria-pressed="${String((currentPrompt().kind==='read'?'speak':currentPrompt().kind)===kind)}" ${boss||t.kindRerolled||t.attackCommitted?'disabled':''}>${BATTLE_LABELS[kind]}</button>`).join('')}</div>
  ${!boss&&recallText?`<p class="forest-tactic-review"><strong>今日の復習候補</strong> ${escapeHtml(recallText)}<small>攻撃タイプを選ぶとき、期限が来た復習・苦手問題を優先するよ。</small></p>`:''}
  ${boss?'<small class="forest-tactic-note">ボスの封印は残りHPではなく英語の確認数。高威力でも3問は必要だけど、必殺技は反撃のダメージも2軽減するよ。</small>':t.kindRerolled?'<small class="forest-tactic-note">この敵への攻撃タイプ変更は使い切ったよ。次の敵との戦闘で回復するよ。</small>':t.attackCommitted?'<small class="forest-tactic-note">この攻撃を始めたので変更できないよ。次のターンで選べるよ。</small>':'<small class="forest-tactic-note">攻撃タイプは問題を見る前に選ぼう。出題後は変更できないよ。</small>'}
  ${party.length>1?`<div class="forest-tactic-party-label">仲間交代 · 残り${1-t.party.swapsUsed}回</div><div class="forest-tactic-party" role="group" aria-label="戦う仲間を交代">${party.map(id=>{const growth=getMonsterProgress(save,id),monster=monsterFor(id),affinity=allyAffinity(id),health=fighterHealth(t.party,id),active=id===play.companionId;return `<button type="button" data-tactic-ally="${id}" aria-pressed="${String(active)}" ${!active&&!canTacticalSwap(t.party,play.companionId,id)?'disabled':''} data-fainted="${health.hp===0}"><strong>${escapeHtml(monsterFormName(monster,growth.stage))}${active?' · 出撃中':''}</strong><small>HP ${health.hp}/${health.maxHp} · ${health.hp===0?'戦闘不能':`${BATTLE_LABELS[affinity.strong]}が得意`}</small></button>`;}).join('')}</div>`:''}`}`;
 panel.dataset.turn=incoming?'enemy':'player';
 compactBattleNotes(panel,t);
 simplifyTacticalInterface(panel,t,{incoming,supportReady});
 if(incoming){
   $$('[data-tactic-ally]',panel).forEach(button=>{button.disabled=true;button.title='敵の反撃中は交代できません';});
   return;
 }
 $$('[data-tactic-action]',panel).forEach(button=>button.addEventListener('click',()=>{
   if(!play||play.revealed||play.tactics.turn!=='player')return;
   if(button.dataset.tacticAction==='skill'&&play.tactics.ultimate<ULTIMATE_MAX)return;
   if(button.dataset.tacticAction==='assist'&&!supportReady)return;
   const keepFocus=document.activeElement===button;
   const action=button.dataset.tacticAction;
   play.tactics.action=action;
   renderTacticalControls();
   if(keepFocus)panel.querySelector(`[data-tactic-action="${action}"]`)?.focus({preventScroll:true});
 }));
 $$('[data-tactic-ally]',panel).forEach(button=>button.addEventListener('click',()=>{
   if(!play||play.revealed||play.tactics.turn!=='player'||!canTacticalSwap(play.tactics.party,play.companionId,button.dataset.tacticAlly))return;
   play.tactics.party=consumeTacticalSwap(play.tactics.party,play.companionId,button.dataset.tacticAlly);
   play.companionId=button.dataset.tacticAlly;play.tactics.action='attack';syncActiveFighter();
   renderForestHud();renderTacticalControls();
 }));
 $$('[data-tactic-kind]',panel).forEach(button=>button.addEventListener('click',()=>{
   if(!play||play.revealed||play.tactics.turn!=='player'||play.index>=regularCount()||play.tactics.kindRerolled||play.tactics.attackCommitted)return;
   const kind=button.dataset.tacticKind;
   if((currentPrompt().kind==='read'?'speak':currentPrompt().kind)===kind)return;
   const base=play.prompts[play.index];
   const candidate=(base.kind===kind&&!play.tactics.usedPromptIds.has(base.id))?base:
     pickBattlePrompt({prompts:ALL_PROMPTS,kind,difficulty:play.difficulty,areaId:play.areaId,
       usedIds:play.tactics.usedPromptIds,reservedIds:play.prompts.filter(p=>p.id!==base.id).map(p=>p.id),
       allowReviewRepeat:true,...tacticalReviewTargets()});
   if(!candidate){$('#forest-battle-log').textContent='この技能の未出題問題が見つからなかったよ。別の技能を選んでね。';return;}
   play.tactics.attackPrompt=candidate;
   play.tactics.kindRerolled=true;
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
   allowReviewRepeat:true,...tacticalReviewTargets()});
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
 t.turn='player';t.defensePrompt=null;t.action='attack';t.counterShield=0;t.playerMissCountered=false;t.attackCommitted=false;t.attackKindChosen=false;
 t.nextEnemyKind=foePlannedAttack({style:foeStyleFor({areaId:play.areaId,index:play.index,wave:play.wave,boss:play.index>=regularCount()}),activeId:play.companionId,last:t.lastEnemyKind});
 if(t.pendingAdvance){advanceClearedEncounter();return;}
 t.attackPrompt=null;t.attackKindChosen=false;
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
 const levels=Object.fromEntries(owned.map(id=>[id,getMonsterProgress(save,id).level]));
 const resonance=formationResonance(roster,levels);
 const resonanceDetail=resonance.openingCharge?'出撃HPが全員＋1、開幕必殺ゲージ＋1！':resonance.kindCount>=2
   ?`出撃HPが全員＋1。${resonance.kindCount===3?`Lv.4以上の仲間をあと${Math.max(0,2-resonance.trainedCount)}体育てると開幕必殺ゲージ＋1。`:'得意技能を3種類そろえると、さらに育成ボーナスが狙えるよ。'}`
   :'得意技能が違う仲間を編成すると、出撃HPが全員＋1になるよ。';
 const guide=owned.length===1?'この仲間で始められるよ。下の「出発」を押そう。':'仲間をタップして選ぼう。準備できたら出発！';
 screen.innerHTML=`<div class="forest-formation-target"><strong>最初の敵：${escapeHtml(foe.name)}</strong><span>弱点：${BATTLE_LABELS[weakness.weak]} ／ 耐性：${BATTLE_LABELS[weakness.resist]}</span></div>
 <div class="forest-formation-bonus" role="status" data-resonance="${resonance.kindCount}" data-opening-charge="${resonance.openingCharge}"><strong>チーム連携 · 得意${rangeCount}種類</strong><span>${resonanceDetail}</span></div>
 <details class="forest-formation-boss-wrap"><summary>ボスの攻撃・連携を見る</summary><div class="forest-formation-boss-plan" role="group" aria-label="ボスへの編成作戦"><strong>ボスの反撃予告</strong><div>${bossForecast.map((move,i)=>`<span>${i+1}手目：${i===2?'最終撃':BATTLE_LABELS[move.kind]}${i===2?'':move.pressure?' · 強':''}</span>`).join('')}</div>${link?`<p class="forest-formation-link"><strong>連携：${escapeHtml(link.name)}</strong> ${link.phase+1}手目 · 控えの${BATTLE_LABELS[link.kind]}で${link.description}。${reserveMatches(link.kind).length?' この編成で狙える！':' 控えを選ぼう。'}</p>`:''}<details class="forest-formation-extra"><summary>${coverCount?'身代わりできる組み合わせあり':'身代わり・相性の詳しい条件'}</summary><p>編成の得意技能は${rangeCount}種類。控えが先頭の苦手技能を得意としていると、ボスの反撃で身代わりできることがあるよ。身代わりはボス戦で1回。英語の正誤判定は変わらない。</p></details></div></details>
 <div class="forest-formation-title"><strong>出撃メンバー ${roster.length} / 3体</strong>${owned.length>1?'<button type="button" class="forest-formation-recommend" id="forest-formation-recommend">おすすめ編成</button>':'<span>先頭の仲間から戦闘スタート</span>'}</div>
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
    <div class="forest-formation-creature" aria-hidden="true">${monsterArt(id,progress.stage,equippedWeapon(save))}</div>
   <div class="forest-formation-detail"><strong>${escapeHtml(monster.japaneseName||monster.name)}${progress.ascended?' ★★':progress.evolved?' ★':''}</strong><span>Lv.${progress.level} · 得意 ${BATTLE_LABELS[affinity.strong]}</span><details class="forest-formation-monster-more"><summary>能力を見る</summary><span>${escapeHtml(monsterFormName(monster,progress.stage))} · HP成長＋${levelHpBonus(progress.level)+progress.stage} · 苦手 ${BATTLE_LABELS[affinity.weak]}</span><small>${match}${progress.ascended?' · 第2進化：得意攻撃＋1':progress.evolved?' · 次の進化はLv.10＋ボス3エリア':''}${progress.evolved?` · 進化援護「${evolvedSupportTalent(id).name}」`:''}${mastery?` · 熟練技「${escapeHtml(mastery.name)}」`:` · Lv.${MASTERY_LEVEL}で熟練技`}</small></details></div>
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
   const leader=t.formationIds[0],formStage=getMonsterProgress(save,leader).stage;
   $('#forest-explore-art .forest-explore-companion').innerHTML=monsterArt(leader,formStage,equippedWeapon(save));
   renderPartyFormation();
 }));
 screen.querySelector('#forest-formation-recommend')?.addEventListener('click',()=>{
   if(!play?.tactics?.formationPending)return;
   t.formationIds=recommendBattleFormation(owned,{foeWeak:weakness.weak,bossKind:link?.kind,levels});
   t.formationMessage='最初の敵の弱点と仲間の得意技能を見て編成したよ！ 自由に変更できるよ。';
   const leader=t.formationIds[0];
   $('#forest-explore-art .forest-explore-companion').innerHTML=monsterArt(leader,getMonsterProgress(save,leader).stage,equippedWeapon(save));
   renderPartyFormation();
 });
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
  const formStage=getMonsterProgress(save,displayCompanion).stage;
  const foe=opponentFor(play.index,play.wave,play.areaId);
  const area=dungeonAreaFor(play.areaId);
  const isBoss=play.index>=regularCount();
  const stage=Math.min(4,Math.max(0,Math.round(4*play.index/Math.max(1,regularCount()))));
  const meetingFirstCompanion=play.firstCompanionMeeting && play.index===0;
  // The first world should reveal its companion during the adventure, not
  // suddenly place an unexplained fried-egg sprite on the opening route.
  const mapCompanionArt=meetingFirstCompanion?forestEncounterEyesArt():monsterArt(companion.id,formStage,equippedWeapon(save));
  map.innerHTML=forestWorldArt(play.route,play.areaId)+
    '<div class="forest-explore-depth" aria-hidden="true"></div>'+
    '<div class="forest-explore-companion">'+mapCompanionArt+'</div>'+
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
    meetingFirstCompanion?'森の入口に小さな影。先へ進むと正体がわかる。':
    play.index===0?(play.quickStart?'次は「おすすめの攻撃」を選んで、英語の問題に答えよう。':'出発して最初の問題に挑もう。'):
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
  forward.textContent=formation?'この編成で出発':isBoss?'ボスと戦う':play.index===0?'冒険を始める':'次の問題へ';
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
  $('#play-card').hidden=false;
  $('#answer-area').classList.remove('listening-result-only');
  $('#forest-journey').classList.remove('forest-victory');
  play.hintUsed=play.mode==='forest'&&Boolean(play.encounterHelp);play.revealed=false;play.speechState='';play.micTranscript=false;play.quizMissRecorded=false;play.quizMistake='';play.justDroppedWeapon=null;
  if(play.mode==='forest'){
    $('#forest-battle-log').removeAttribute('data-result');
    $('#forest-battle-log').removeAttribute('aria-label');
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
        t.bonusChargeUsed=false;t.comboUsed=false;t.lastAttackKind=null;t.eliteIndependentHits=0;t.autoSwitchedTo=null;t.party={...t.party,swapsUsed:0};t.bossReactionCompleted=false;t.styleShieldIntact=true;t.foeShifted=false;t.playerMissCountered=false;t.kindRerolled=false;t.attackCommitted=false;t.attackKindChosen=false;
        if(play.index<=regularCount())t.weaponTechniqueUsed=false; // All boss seal phases share one use.
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
  if(play.mode==='forest'&&play.tactics?.turn==='player'&&play.index<regularCount()&&!play.tactics.attackKindChosen){
   $('#play-card').hidden=true;
   delete $('#play-card').dataset.promptId;
   $('#answer-area').hidden=true;
   $('#forest-battle-log').textContent='';
   $('#forest-world-stage').dataset.challenge='攻撃タイプ選択';
   return;
  }
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
  const listenClip=listenMode&&LISTENING_AUDIO[prompt.id]?.text===comprehension.audio?LISTENING_AUDIO[prompt.id]:null;
  play.listeningState=listenMode?{played:false,understood:false,misses:0,usedTranscript:false}:null;
  // The prompt, task and scene carry learning content. Generic instructions
  // duplicate the visible action buttons and distract from the actual task.
  const questionBody = quizMode
    ? `<h1 class="forest-quiz-question" lang="${englishMode?'en':'ja'}">${escapeHtml(prompt.cue)}</h1>${englishMode?`<div class="task-panel"><p lang="en">${escapeHtml(prompt.task)}</p></div>`:''}<p class="question-caption" ${englishMode?'lang="en"':''}>${escapeHtml(prompt.scene)}</p>`
    : englishMode
    ? `<h1 class="english-situation" lang="en">${escapeHtml(prompt.cue)}</h1><div class="task-panel"><p lang="en">${escapeHtml(prompt.task)}</p></div><p class="question-caption" lang="en">${escapeHtml(prompt.scene)}</p>`
    : `<h1 lang="ja">${escapeHtml(prompt.cue)}</h1><p class="question-caption">${escapeHtml(prompt.scene)}</p>`;
  $('#play-card').dataset.promptId=prompt.id;
  const readingPassage=prompt.kind==='read'&&prompt.readText?`<div class="reading-passage" lang="en"><span>READ THE MESSAGE</span><p>${escapeHtml(prompt.readText)}</p></div>`:'';
  const nativeAudio=listenClip?`<div class="listening-native"><label for="listening-native-audio">${isIOSDevice()?'音が出ないときはiPhone標準プレーヤー':'標準プレーヤーで再生'}</label><audio id="listening-native-audio" controls preload="none" playsinline src="${escapeHtml(listenClip.src)}" aria-label="リスニング音声を直接再生"></audio></div>`:'';
  // A visible native player on iPhone keeps playback one tap away. On other
  // devices it stays in the troubleshooting drawer; never duplicate the ID.
  const nativeFirst=Boolean(listenClip&&isIOSDevice());
  const listeningBody=listenMode?`<div class="listening-first" id="listening-first" data-level="${comprehension.level}"><button type="button" class="listen-control listening-play" id="play-audio"><span class="audio-glyph" aria-hidden="true"></span> ${englishMode?'Play audio':'英語を聞く'}</button><button type="button" class="listen-control listening-slow" id="play-slow-audio" hidden>${englishMode?'0.8× (hint)':'ゆっくり聞く（ヒント）'}</button>${nativeFirst?nativeAudio:''}<p id="listening-status" class="listening-status" role="status" aria-live="polite"></p><div id="listening-meaning" class="listening-meaning" hidden><p class="listening-check-title">${escapeHtml(comprehension.question)}</p><div class="listening-choices" role="group" aria-label="音声の意味を選択">${comprehension.options.map((choice,index)=>`<button type="button" class="listening-choice" data-listening-choice="${index}" lang="${englishMode?'en':'ja'}">${escapeHtml(choice)}</button>`).join('')}</div></div><details class="listening-fallback-options"><summary>${englishMode?'No sound?':'音が出ないとき'}</summary>${nativeFirst?'':nativeAudio}<button type="button" class="hint-button listening-fallback" id="reveal-transcript">${englishMode?'Show transcript (hint)':'英文を見る（ヒント）'}</button></details><p class="transcript-fallback" id="transcript" lang="en" hidden></p></div>`:'';
  $('#play-card').innerHTML=`<div class="question-top"><span>${play.mode==='forest'&&play.tactics?.turn==='enemy'?'ENEMY TURN':play.mode==='forest'?(play.index>=regularCount()?'BOSS ATTACK':'ENCOUNTER'):'QUESTION'} ${play.mode==='forest'?(play.index>=regularCount()?play.bossHits+1:play.index+1):play.index+1} / ${play.mode==='forest'?(play.index>=regularCount()?BOSS_HITS:regularCount()):play.prompts.length}</span><span class="question-tag">${play.mode==='forest'&&prompt.kind==='listen'?'聞いて選ぶ':play.mode==='forest'&&prompt.kind==='read'?'読んで答える':prompt.kind==='vocab'?'単語を選ぶ':prompt.kind==='grammar'?'文法の問題':englishMode?'英語 → 英語':prompt.kind==='listen'?'リスニング':'日本語 → 英語'}</span></div>${listenMode?listeningBody:`${readingPassage}${questionBody}`}`;
  if(play.roleplay){
    const session=play,turnIndex=play.index,npc=roleplayOpeningFor(play.roleplay,turnIndex).npc;
    $('#play-card').insertAdjacentHTML('afterbegin',roleplayIntroMarkup());
    $('#roleplay-npc-audio')?.addEventListener('click',()=>{
      const status=$('#roleplay-npc-status');
      status.textContent='音声を準備中…';
      speakLine(npc,()=>{
        if(play!==session||play.index!==turnIndex)return;
        const transcript=$('#roleplay-npc-transcript');
        if(transcript){transcript.dataset.audioFallback='true';transcript.open=true;}
        status.textContent='音声を再生できなかったため英文を表示したよ。ヒント扱いにはしないよ。';
      },session.difficulty,'',()=>{
        if(play===session&&play.index===turnIndex)status.textContent='相手の声を再生中。聞き取って英語で返そう。';
      });
    });
    $('#roleplay-npc-transcript')?.addEventListener('toggle',event=>{
      if(!event.target.open||play!==session||play.index!==turnIndex||play.revealed)return;
      // An automatic fallback is not the learner asking for a text hint.
      if(event.target.dataset.audioFallback==='true')delete event.target.dataset.audioFallback;
      else play.hintUsed=true;
    });
    $('#roleplay-translation')?.addEventListener('toggle',event=>{
      if(event.target.open&&play&&!play.revealed)play.hintUsed=true;
    });
  }
  if(play.mode==='forest'&&retentionOverview(save,dayKey()).due.some(row=>row.id===prompt.id)){
    const tag=document.createElement('span');tag.className='dungeon-recall-tag';
    tag.textContent='記憶の試練 · 復習問題';
    $('#play-card').querySelector('.question-top').append(tag);
  }
  const saved=save.savedPromptIds?.includes(prompt.id)||false;
  const bookmark=document.createElement('button');
  bookmark.type='button';bookmark.id='bookmark-question';bookmark.className='bookmark-question';
  bookmark.setAttribute('aria-pressed',String(saved));
  const bookmarkText=enabled=>questionBookmarkLabel(prompt,enabled);
  bookmark.textContent=bookmarkText(saved);
  bookmark.addEventListener('click',()=>{
    const persisted=persist(toggleSavedPrompt(save,prompt.id));
    syncQuestionBookmarks(prompt);
    if(!persisted)bookmark.textContent='保存できませんでした。';
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
    stage.textContent=isTransfer?'別の場面で応用':retentionCheckpointLabel(save.retention?.[prompt.id]?.stage,Boolean(save.retention?.[prompt.id]?.recoveryPhase));
    bookmark.after(stage);
  }
  if(play.mode==='forest'&&quizMode&&quizWeaknessOverview(save).due.some(item=>item.id===prompt.id||item.baseId===(prompt.baseId||prompt.id))){
    const banner=document.createElement('p');
    banner.className='forest-review-banner';
    banner.textContent='苦手の再挑戦';
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
  const guidedCloze=beginnerClozeFor(prompt);
  const voiceAttack=play.mode==='forest'&&play.tactics?.turn==='player'&&prompt.kind==='speak';
  const answerAction=play.mode==='forest'?(play.tactics?.turn==='enemy'?'答えて防御':'答えて攻撃'):play.roleplay?'返答を確認':'答えを判定';
  $('#answer-area').innerHTML=`${quizControlsHtml(prompt)}
    <label class="answer-label" for="spoken-answer">${quizMode?'選んだ答え':'英語の回答'}</label>
    <div class="answer-row"><textarea id="spoken-answer" class="answer-input" rows="3" lang="en" inputmode="text" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="話す / 入力"></textarea><button id="mic-button" type="button" class="mic-button" title="マイクで話す" aria-label="マイクで話す" aria-pressed="false"><span class="mic-glyph mic-glyph-talk" aria-hidden="true"></span><span>${voiceAttack?'声で攻撃':'話す'}</span></button></div>
    <p id="speech-helper" class="answer-helper" role="status" aria-live="polite"></p>
    <div class="answer-quick-help"><button class="hint-button speaking-hint-action" id="show-hint" type="button" aria-controls="hint-panel" aria-expanded="false">${guidedCloze?'穴埋めヒント':'ヒント'}</button></div>
    <div id="hint-panel" class="hint-box speaking-hint-panel" role="status" aria-live="polite" hidden></div>
    <button id="retry-mic" type="button" class="retry-mic" hidden>↻ 録音し直す</button><details id="speech-alternatives" class="speech-alternatives" hidden><summary>マイクが使えないとき</summary><div class="speech-alternatives-actions"><button type="button" id="native-dictation" class="speech-native-button">キーボードの音声入力を使う</button><button type="button" id="copy-safari-url" class="speech-copy-button">URLをコピーしてSafariで開く</button><p id="speech-alternative-help">英語キーボードのマイクからも入力できるよ。</p></div></details><div class="learning-controls"><button class="reveal-button" id="show-answer">${answerAction}</button></div><div id="feedback-panel"></div>`;
  if(quizMode){
    $('#mic-button').hidden=true;
    $('#mic-button').disabled=true;
    wireQuizControls(prompt,$('#answer-area'));
    $('#speech-helper').textContent='';
  } else $('#mic-button').addEventListener('click',startRecognition);
  $('#retry-mic').addEventListener('click',()=>{
    if(!play || play.revealed)return;
    $('#spoken-answer').value='';
    play.micTranscript=false;
    $('#spoken-answer').classList.remove('transcript-interim');
    micView('ready');startRecognition();
  });
  $('#show-hint').addEventListener('click',showHint);
  if(play.hintStep)renderHintPanel(speakingHintSteps(prompt,phraseFor(prompt.phraseId)),play.hintStep);
  $('#show-answer').addEventListener('click',gradeAnswer);
  $('#spoken-answer').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();gradeAnswer();}});
  const isIOS=isIOSDevice();
  // A microphone button must actually start recognition. The previous iOS
  // primary control was only a <label> focusing the text field, misleading
  // learners who expected recording to begin from their tap.
  const iosSpeaking=isIOS&&!quizMode&&prompt.kind==='speak';
  if(iosSpeaking){
    // iOS does not permit a webpage to press the native keyboard's dictation
    // key. Keep that honest, reliable fallback separate from the real mic.
    const keyboardButton=document.createElement('button');
    keyboardButton.id='native-ios-dictation';
    keyboardButton.type='button';
    keyboardButton.className='speech-native-label';
    keyboardButton.textContent='iPhone音声入力';
    $('#speech-helper').after(keyboardButton);
    keyboardButton.addEventListener('click',openNativeDictation);
    $('#spoken-answer').addEventListener('focus',()=>{
      cancelPendingSpeech();
      $('#speech-helper').textContent='入力欄が選ばれたよ。英語キーボードに切り替えて、キーボードのマイクを押してね。';
    });
    if(!(window.SpeechRecognition||window.webkitSpeechRecognition)){
      $('#mic-button').dataset.speechUnavailable='true';
    }
  }
  // This was accidentally hidden for iPhone speaking, even after a silent
  // recognizer failed. Keep a usable path in the same question on all iOS
  // tasks; reveal it on demand on other devices when Web Speech fails.
  $('#speech-alternatives').hidden=quizMode||(!isIOS&&Boolean(window.SpeechRecognition||window.webkitSpeechRecognition));
  $('#speech-alternatives').open=false;
  if(iosSpeaking)$('#native-dictation').hidden=true; // The prominent button above opens the keyboard.
  if(iosSpeaking){
    $('#spoken-answer').placeholder='英語キーボードのマイクで話すか、直接入力';
    $('#answer-area').classList.add('native-ios-speech');
  }else $('#answer-area').classList.remove('native-ios-speech');
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
    // An edited recognition result may be correct English, but we can no
    // longer attribute that entire answer to captured speech alone.
    if(play)play.micTranscript=false;
    $('#spoken-answer').classList.remove('transcript-interim');
    // A user who types while an iPhone recognizer is silent has chosen the
    // fallback. Release that recognizer and re-enable judging their text;
    // otherwise the disabled submit button traps the entire battle.
    if(isIOSDevice())cancelPendingSpeech();
    if(!recognition&&!quizMode)micView('ready');
  });
  if(!quizMode){
    micView('ready');
    if(iosSpeaking)$('#speech-helper').textContent=$('#mic-button').dataset.speechUnavailable==='true'
      ?'自動音声認識に非対応。キーボードのマイクを使ってね。'
      :'「話す」で録音。反応しないときはキーボードのマイクへ。';
    else if(isIOS)$('#speech-helper').textContent='キーボードのマイクでも入力できるよ。';
    else if(play.mode==='forest')$('#speech-helper').textContent='';
  }
  if(reviewing&&!iosSpeaking)$('#speech-helper').textContent=quizMode?'苦手の復習です。前回のヒントを思い出して解いてみよう。':'復習問題です。前回とは違う言い方でも挑戦してみよう。';
  if(listenMode){
    $('#answer-area').hidden=true;
    const state=play.listeningState;
    if(comprehension.coaching)
      $('#listening-status').insertAdjacentHTML('afterend','<p id="listening-coach" class="listening-coach" hidden></p>');
    const showChoices=()=>{$('#listening-meaning').hidden=false;};
    const markAudioReady=()=>{
      if(document.hidden||!play||play.listeningState!==state||state.understood)return;
      state.played=true;
      $('#play-slow-audio').hidden=false;
      showChoices();
      $('#listening-status').textContent=state.usedSlowAudio?'ゆっくり再生で練習中。ヒントありとして記録するよ。':'音声を再生できたよ。聞こえた意味を選ぼう。';
    };
    const native=$('#listening-native-audio');
    // Direct iPhone playback is a first-class way to start this question.
    // A button press alone is not evidence that any audio actually played.
    native?.addEventListener('playing',markAudioReady);
    native?.addEventListener('error',()=>{
      if(play?.listeningState===state&&!state.played)
        $('#listening-status').textContent='音源を読み込めませんでした。上の再生ボタンを試すか、字幕で練習してね。';
    });
    const revealTranscript=()=>{
      if(!play||play.listeningState!==state||state.understood)return;
      state.usedTranscript=true;
      play.hintUsed=true; // A transcript-assisted listening clear is supported, not independent.
      if(play.mode==='forest')play.encounterHelp=true;
      if(play.tactics?.turn==='player')play.tactics.attackCommitted=true;
      $('#transcript').hidden=false;
      $('#transcript').textContent=comprehension.audio;
      showChoices();
      $('#listening-status').textContent='字幕を使った練習モードです。聞き直してから意味を選んでね。';
    };
    $('#play-audio').addEventListener('click',()=>{
      if(state.understood)return;
      if(play.tactics?.turn==='player')play.tactics.attackCommitted=true;
      if(play.tactics?.turn==='player')renderTacticalControls();
      $('#listening-status').textContent='音声を準備中… 音が出たら選択肢が開くよ。';
      speakLine(comprehension.audio,()=>{
        if(play?.listeningState!==state)return;
        revealTranscript();
        $('#listening-status').textContent='この環境では音声を再生できなかったよ。字幕を使って続けられるよ（ヒント扱い）。';
      },comprehension.level,prompt.id,markAudioReady);
    });
    $('#play-slow-audio').addEventListener('click',()=>{
      if(state.understood||!state.played)return;
      state.usedSlowAudio=true;
      play.hintUsed=true;
      if(play.mode==='forest')play.encounterHelp=true;
      if(play.tactics?.turn==='player'){play.tactics.attackCommitted=true;renderTacticalControls();}
      $('#listening-status').textContent='0.8倍で聞き直しているよ。ヒントありとして記録するね。';
      speakLine(comprehension.audio,()=>{
        if(play?.listeningState!==state)return;
        revealTranscript();
        $('#listening-status').textContent='再生できなかったため字幕で練習しよう（ヒント扱い）。';
      },comprehension.level,prompt.id,markAudioReady,.8);
    });
    $('#reveal-transcript').addEventListener('click',revealTranscript);
    $$('[data-listening-choice]').forEach(button=>button.addEventListener('click',()=>{
      if(!play||play.listeningState!==state||state.understood||(!state.played&&!state.usedTranscript))return;
      const selected=Number(button.dataset.listeningChoice);
      if(selected!==comprehension.correctIndex){
        state.misses++;
        play.hintUsed=true;
        // A selected wrong meaning is an objective listening miss. This is
        // different from a failed player microphone or uncertain transcript.
        if(!play.quizMissRecorded){persist(recordAnswer(save,prompt.id,'again').save);play.quizMissRecorded=true;}
        if(play.mode==='forest'){
          play.encounterHelp=true;play.combo=0;syncBattleAura();
          const outcome=play.tactics?.turn==='enemy'?counterEnemyDefenseMiss('incorrect'):counterPlayerMiss('incorrect');
          if(outcome==='finished')return;
          if(outcome)$('#listening-status').textContent='聞き取り失敗！ 敵の攻撃を受けたよ。意味を確認して再挑戦しよう。';
        }
        button.classList.add('is-miss');
        button.setAttribute('aria-invalid','true');
        // Do not charge accidental repeat taps on a previously rejected option.
        // A different wrong meaning remains a new damaging attempt.
        button.disabled=true;
        if(comprehension.coaching){
          const cue=$('#listening-coach');
          cue.hidden=false;
          cue.textContent=`聞き直すポイント：${comprehension.coaching.focus}`;
        }
        if(!play.tactics||(!play.tactics.playerMissCountered&&!play.tactics.defenseHitTaken))
          $('#listening-status').textContent=englishMode?'Not quite. Listen again and compare the details.':'少し違うかも。もう一度聞いて、細かい違いに注目しよう。';
        return;
      }
      state.understood=true;
      stopListeningPlayback();
      button.classList.add('is-correct');
      if($('#listening-coach'))$('#listening-coach').hidden=true;
      $('#listening-status').textContent=state.usedTranscript?'字幕で意味を確認できたね。聞き取り成績はつけず、0 XPの復習として進むよ。':
        state.usedSlowAudio?'ゆっくり再生で意味を確認できたね。今回はヒントありの記録だよ。':
        englishMode?'Correct! Listening complete.':'正解！聞き取れたね。スピーキングは別の問題で練習できるよ。';
      $('#play-audio').disabled=true;
      $('#play-slow-audio').disabled=true;
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
function browserSpeakLine(line,onUnavailable,level='easy',onStart=()=>{},generation=playbackGeneration,rateMultiplier=1) {
  try {
    if(!window.speechSynthesis || !window.SpeechSynthesisUtterance) throw new Error('no speech');
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(line);utterance.lang='en-US';utterance.rate=(level==='easy'?.88:level==='normal'?.95:1)*rateMultiplier;
    const voices=window.speechSynthesis.getVoices?.()||[];
    const english=voices.filter(voice=>/^en[-_]/i.test(voice.lang));
    const voice=english.find(item=>/natural|premium|enhanced/i.test(item.name))||
      english.find(item=>/^en[-_]us/i.test(item.lang))||english[0];
    if(voice)utterance.voice=voice;
    let started=false,finished=false;
    const watchdog=setTimeout(()=>{
      if(finished||started||generation!==playbackGeneration)return;
      finished=true;
      try{window.speechSynthesis.cancel();}catch{}
      onUnavailable?.();
    },4500);
    utterance.onstart=()=>{
      if(generation!==playbackGeneration||finished)return;
      started=true;clearTimeout(watchdog);onStart();
    };
    utterance.onend=()=>{
      if(finished)return;
      finished=true;clearTimeout(watchdog);
      // Some WebKit speech engines silently end without ever starting audio.
      if(!started&&generation===playbackGeneration)onUnavailable?.();
    };
    utterance.onerror=()=>{
      if(generation!==playbackGeneration||finished)return;
      finished=true;clearTimeout(watchdog);
      if(!started)onUnavailable?.();
    };
    window.speechSynthesis.speak(utterance);
  } catch { if(generation===playbackGeneration)onUnavailable?.(); }
}
function speakLine(line,onUnavailable,level='easy',promptId='',onStart=()=>{},rateMultiplier=1){
  stopListeningPlayback();
  const generation=playbackGeneration;
  const clip=LISTENING_AUDIO[promptId];
  // Keep a real <audio controls> element in the DOM: iPhone's native player is
  // an independent direct-play route if the custom button cannot start sound.
  if(clip?.text===line){
    try{
      const audio=$('#listening-native-audio')||new Audio(clip.src);
      spokenAudio=audio;
      audio.playbackRate=rateMultiplier;
      let fallen=false,started=false;
      const watchdog=setTimeout(()=>fallback(),6500);
      const fallback=()=>{
        if(fallen||spokenAudio!==audio||generation!==playbackGeneration)return;
        fallen=true;clearTimeout(watchdog);
        spokenAudio=null;
        audio.onerror=null;audio.onplaying=null;audio.onended=null;
        try{audio.pause();}catch{}
        browserSpeakLine(line,onUnavailable,level,onStart,generation,rateMultiplier);
      };
      audio.onerror=fallback;
      audio.onplaying=()=>{
        if(generation!==playbackGeneration||fallen||started)return;
        started=true;clearTimeout(watchdog);onStart();
      };
      audio.onended=()=>{
        if(!started){fallback();return;}
        clearTimeout(watchdog);
        if(spokenAudio===audio)spokenAudio=null;
        audio.onerror=null;audio.onplaying=null;
        // Retain the visible native player's source so its replay button
        // continues to work, even after the custom button has finished.
        if(audio.id!=='listening-native-audio')
          try{audio.pause();audio.removeAttribute('src');audio.load();}catch{}
      };
      // iOS/WebKit can throw from play() before returning a Promise. Take the
      // same cleanup route as an async rejection so its 6.5s watchdog cannot
      // unexpectedly launch a second, overlapping speech fallback.
      try{
        const pending=audio.play();
        if(pending?.catch)pending.catch(fallback);
      }catch{fallback();}
      return;
    }catch{/* Fall through to the browser's own voice. */}
  }
  browserSpeakLine(line,onUnavailable,level,onStart,generation,rateMultiplier);
}
function startRecognition(options={}) {
  if(!play || play.revealed)return;
  const helper=$('#speech-helper');
  if(recognition){
    finishRecognition();
    return;
  }
  if(retiringRecognition){
    // A quick retry after a wrong answer is common on iPhone. Queue exactly
    // one restart while WebKit releases the previous microphone session.
    queuedRecognitionSession=play;
    micView('finishing');
    if(helper)helper.textContent=isIOSDevice()?'前の録音を終了中です。準備ができたら「話す」を押してください。':'前の録音が終わるまでお待ちください。';
    return;
  }
  queuedRecognitionSession=null;
  if(isIOSDevice()&&iosSpeechCueDue&&!options.skipIOSCue&&
    window.speechSynthesis&&window.SpeechSynthesisUtterance){
    // iOS 27 WebKit reports successful repeated dictation when a TTS phrase
    // precedes each session, provided the previous result ended naturally.
    // Play it from the learner's actual tap; never silently start a mic in
    // the old recognition callback. If Safari hangs on TTS, show recovery.
    iosSpeechCueDue=false;
    stopListeningPlayback();
    clearIOSSpeechCue();
    const cue=new window.SpeechSynthesisUtterance('Ready');
    cue.lang='en-US';cue.rate=1.7;cue.volume=.55;
    iosSpeechCue=cue;
    const session=play;
    const resume=(succeeded)=>{
      if(iosSpeechCue!==cue)return;
      clearIOSSpeechCue();
      if(play!==session||play.revealed)return;
      if(succeeded)startRecognition({skipIOSCue:true});
      else{
        micView('ready');showSpeechFallback();
        const help=$('#speech-helper');
        if(help)help.textContent='音声入力の準備が止まりました。もう一度「話す」を押すか、iPhone音声入力を使ってね。';
      }
    };
    cue.onend=()=>resume(true);
    cue.onerror=()=>resume(false);
    iosSpeechCueTimer=setTimeout(()=>resume(false),2300);
    micView('finishing');
    // The cue plays before SpeechRecognition.start(). Speaking during it is
    // not recorded, so never invite speech until onstart confirms readiness.
    if(helper)helper.textContent='マイクを準備中…「いま話してね」と表示されるまで待ってね。';
    try{window.speechSynthesis.speak(cue);}catch{resume(false);}
    return;
  }
  play.micTranscript=false;
  // The previous (possibly incorrect) answer is NOT a transcript of this
  // attempt. Keeping it also defeats the silence watchdog on subsequent taps.
  const previousAnswer=$('#spoken-answer');
  if(previousAnswer){previousAnswer.value='';previousAnswer.classList.remove('transcript-interim');}
  // Release the preceding listening clip before opening a microphone.
  // This can mitigate an iOS WebKit audio-session conflict but is not a
  // substitute for native speech recognition in restricted in-app browsers.
  if(!options.skipIOSCue)stopListeningPlayback();
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
      // A late onstart after the learner pressed Stop must not arm a second
      // watchdog over the stop/final-transcript timeout.
      if(recognitionStopping)return;
      if(helper&&!recognitionStopping)helper.textContent=isIOSDevice()
        ?'いま話してね。話し終えると自動で文字になります。反応しないときはiPhone音声入力へ。'
        :'音声認識中です。英語が文字にならなければ標準の音声入力に切り替えられます。';
      recognitionNoResultTimer=setTimeout(()=>{
        if(recognition!==instance||recognitionStopping||$('#spoken-answer')?.value.trim())return;
        if(helper)helper.textContent='まだ英文が届いていません。内蔵ブラウザではマイク認識が使えない場合があります。';
        showSpeechFallback();
        // iOS may report "start" while its audio service is deaf. The old
        // 15-second watchdog kept the battle's answer button locked even
        // after the native keyboard fallback was offered. Release a truly
        // silent recognizer sooner; do not touch sessions with any transcript.
        if(isIOSDevice())recognitionNoResultTimer=setTimeout(()=>{
          if(recognition!==instance||recognitionStopping||$('#spoken-answer')?.value.trim())return;
          recognitionFailures++;
          stopRecognition();
          showSpeechFallback();
          if(helper)helper.textContent='声を認識できませんでした。iPhone音声入力か手入力で続けられます。';
        },6000);
      },/iPad|iPhone|iPod/i.test(navigator.userAgent)?2500:7000);
      recognitionWatchdog=setTimeout(()=>{
        if(recognition!==instance||recognitionStopping)return;
        // A silent iPhone recognizer must not appear to keep recording forever.
        if(!$('#spoken-answer')?.value.trim()){
          recognitionFailures++;
          stopRecognition();showSpeechFallback();
          if(helper)helper.textContent='録音に反応がありません。このブラウザでは制限されることがあります。下の「キーボードのマイクで入力」を試してね。';
        }else finishRecognition();
      },/iPad|iPhone|iPod/i.test(navigator.userAgent)?15000:18000);
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
      if(finalized)play.micTranscript=true;
      const field=$('#spoken-answer');
      field.value=transcript;
      field.classList.toggle('transcript-interim',!finalized);
      field.setAttribute('aria-label',finalized?'音声認識が確定した英文':'リアルタイムで聞き取った英文（認識中）');
      if(helper)helper.textContent=finalized
        ?'英文を確認して回答を送ってください。'
        :'聞き取り中… 英文がリアルタイムで表示されています（まだ確定前）。';
      if(finalized){
        if(isIOSDevice())iosSpeechCueDue=true;
        // iOS 27 WebKit regression: calling stop()/abort() on a successful
        // session can poison the microphone for every later session, even
        // if a new recognizer starts after `end`. With continuous=false,
        // allow Safari to end successful recognition on its own instead.
        stopRecognition('captured',isIOSDevice()&&!recognitionStopping
          ?{natural:true}:{graceful:true,alreadyStopping:recognitionStopping});
      }
    };
    instance.onerror=event=>{
      if(recognition!==instance || play!==session)return;
      recognitionFailures++;
      stopRecognition();
      showSpeechFallback();
      if(helper){
        const error=event?.error;
        helper.textContent=error==='not-allowed'||error==='service-not-allowed'
          ?'マイクが許可されていません。Safariの設定を確認するか、下のキーボード音声入力を使ってね。'
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
      stopRecognition(transcript?'captured':'ready',{ended:true});
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
    },/iPad|iPhone|iPod/i.test(navigator.userAgent)?12000:8000);
    // Arm the timeout and update the UI before start(). Some browsers (or
    // permission failures) deliver onstart/onresult/onerror synchronously.
    // Updating the button afterward would turn a completed capture orange
    // again and leave a stale start timer behind.
    micView('listening');
    if(helper)helper.textContent='音声認識を開始しています。許可が出たらマイクを許可して英語を話してね。';
    instance.start();
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
  if(play.tactics?.turn==='player'){play.tactics.attackCommitted=true;renderTacticalControls();}
  renderHintPanel(steps,step);
}
// A lethal counter exits before normal grading records the question. Preserve
// its *exact* authored task for a later-day replay before ending the session.
// An incomplete reply is review-worthy but is not a proven incorrect answer.
function finishMissedBattle(status){
  const prompt=currentPrompt();
  const source=prompt.kind==='speak'?(play.micTranscript?'microphone':'keyboard'):'unknown';
  const retained=recordLethalBattleReview(save,prompt.id,{status,alreadyRecorded:play.quizMissRecorded,inputSource:source});
  if(retained.save!==save)persist(retained.save);
  if(retained.recorded)play.quizMissRecorded=true;
  play.dungeonOutcomes.push({promptId:prompt.id,kind:prompt.kind,outcome:'review'});
  finishSession(false,true);
  return 'finished';
}
function defenseOutcomeHeadline(damage,covered=false){
  const t=play?.tactics;
  if(!t)return '';
  return battleLogSummaryFor(battlePayoffFor({turn:'defense',damage,
    partyHp:t.hp,partyMax:t.maxHp,covered}));
}
function counterPlayerMiss(status){
  const t=play?.mode==='forest'&&play.tactics?.turn==='player'?play.tactics:null;
  if(!t||!shouldCounterPlayerMiss({status,hasInput:true,turn:t.turn}))return false;
  // A failed attack breaks the independent-answer chain immediately; fixing
  // the answer later cannot masquerade as two consecutive clean strikes.
  t.lastIndependentKind=null;
  const foe=opponentFor(play.index,play.wave,play.areaId),boss=play.index>=regularCount();
  const style=foeStyleFor({areaId:play.areaId,index:play.index,wave:play.wave,boss});
  const attack=t.playerMissCountered&&t.lastEnemyKind?t.lastEnemyKind:
    t.nextEnemyKind||foePlannedAttack({style,activeId:play.companionId,last:t.lastEnemyKind});
  const pressure=boss?bossAttackFor(foe.id,play.index-regularCount())?.pressure||0:foeAttackPressure(style);
  const blow=incomingHit({kind:attack,allyId:play.companionId,
    evolved:getMonsterProgress(save,play.companionId).evolved,
    result:'incorrect',action:t.action,pressure,counterShield:t.counterShield});
  const rescue=absorbIncomingBossHit(blow.damage,attack);
  t.playerMissCountered=true;t.lastEnemyKind=attack;t.nextEnemyKind=null;
  updateEnemyHealth();
  const arena=$('#forest-world-stage');
  arena.classList.remove('forest-guarding','forest-attack','forest-player-damaged');void arena.offsetWidth;
  if(rescue.activeDamage)arena.classList.add('forest-player-damaged');
  playBattleCinematic('enemy');
  $('#forest-world-fx').textContent=rescue.partnerId?'COVER!':rescue.activeDamage?`−${rescue.activeDamage} HP`:'BLOCK!';
  $('#forest-battle-log').textContent=`${defenseOutcomeHeadline(rescue.activeDamage,Boolean(rescue.partnerId)&&!rescue.activeDamage)} ${foe.name}の反撃！ ${BATTLE_LABELS[attack]}で味方HP−${rescue.activeDamage}。答えを直して反撃しよう。`;
  if(rescue.autoSwitchedTo)$('#forest-battle-log').textContent+=` ${monsterFor(rescue.autoSwitchedTo).name}が交代！`;
  if(!firstStandingAlly(t.party,play.companionId))return finishMissedBattle(status);
  return true;
}
function counterEnemyDefenseMiss(status){
  const t=play?.mode==='forest'&&play.tactics?.turn==='enemy'?play.tactics:null;
  if(!t)return false;
  t.lastIndependentKind=null;
  const blow=incomingHit({kind:t.enemyKind,allyId:play.companionId,
    evolved:getMonsterProgress(save,play.companionId).evolved,
    action:t.actionAtAttack,result:'incorrect',pressure:t.enemyPressure,counterShield:t.counterShield});
  const rescue=absorbIncomingBossHit(blow.damage);
  t.lastHitDamage=rescue.activeDamage;t.defenseHitTaken=true;
  updateEnemyHealth();
  const arena=$('#forest-world-stage');
  arena.classList.remove('forest-player-damaged');void arena.offsetWidth;
  if(rescue.activeDamage)arena.classList.add('forest-player-damaged');
  playBattleCinematic('enemy');
  $('#forest-world-fx').textContent=rescue.partnerId?'COVER!':rescue.activeDamage?`−${rescue.activeDamage} HP`:'GUARDED';
  $('#forest-battle-log').textContent=`${defenseOutcomeHeadline(rescue.activeDamage,Boolean(rescue.partnerId)&&!rescue.activeDamage)} ${rescue.partnerId
    ?`${t.lastCoverNote} 正解にはならないので、英語は確認しよう。`
    :`敵の${BATTLE_LABELS[t.enemyKind]}攻撃！ 味方HP−${rescue.activeDamage}。英語を確認して言い直そう。`}`;
  if(rescue.autoSwitchedTo)$('#forest-battle-log').textContent+=` ${monsterFor(rescue.autoSwitchedTo).name}が交代！`;
  if(!firstStandingAlly(t.party,play.companionId))return finishMissedBattle(status);
  return true;
}
async function gradeAnswer() {
  if(!play || play.revealed || play.grading)return;
  if(currentPrompt()?.kind==='listen'&&!play.listeningState?.understood)return;
  // Grading during active listening would abort Safari's pending final
  // transcript. Finish recognition first, then let the learner review it.
  if(recognition){finishRecognition();return;}
  const session=play,prompt=currentPrompt();
  if(!prompt)return;
  const listeningComplete=prompt.kind==='listen'&&play.listeningState?.understood===true;
  const transcriptPractice=Boolean(listeningComplete&&play.listeningState?.usedTranscript);
  const raw=listeningComplete?'':$('#spoken-answer').value.trim();
  if(play.tactics?.turn==='player'&&(raw||listeningComplete))play.tactics.attackCommitted=true;
  // One-word cloze practice is a non-scored stepping stone. It cannot mint
  // XP or clear a boss, even when the blank is perfectly completed.
  const cloze=play.hintStep?beginnerClozeFor(prompt):null;
  if(cloze&&raw&&!/\s/.test(raw)){
    const matched=normalizeEnglishNumbers(raw)===normalizeEnglishNumbers(cloze.word);
    const helper=$('#cloze-practice-status');
    if(helper)helper.textContent=matched?'空欄は正解！ よくできたね。次は英文全体を声に出してみよう。':'空欄の単語をもう一度考えてみよう。全文の判定にはまだ進んでいないよ。';
    if(matched){
      $('#spoken-answer').value='';
      // The hint is completed by pressing the grading button. Focusing an
      // input from that click opens iPhone's keyboard without asking and
      // covers the next instruction. Keep focus on the button on iOS; the
      // dedicated dictation button still opens the keyboard on an actual tap.
      if(!isIOSDevice())$('#spoken-answer').focus({preventScroll:true});
    }
    return;
  }
  let grade=listeningComplete?{status:'correct',reasons:[],method:'listening-check'}:gradeLocalResponse(prompt,raw);
  if(grade.status==='review' && grade.method!=='context-safety' && !['vocab','grammar'].includes(prompt.kind) && STAGING_SEMANTIC_GRADER_ENDPOINT){
    session.grading=true;
    $('#show-answer').disabled=true;
    $('#speech-helper').textContent='意味を確認中…';
    const result=await askSemanticGrader(prompt,raw);
    if(play!==session||currentPrompt()!==prompt||play.revealed)return; // Ignore stale grading responses.
    session.grading=false;
    $('#show-answer').disabled=false;
    if(result.state==='correct')grade={status:'correct',reasons:[],method:'semantic-beta'};
    if(result.state==='review')grade={status:'review',reasons:result.missing.length?result.missing:[result.feedback||'内容をもう少し具体的にしてみよう。'],method:'semantic-beta'};
    if(result.state==='unavailable'||result.state==='rate_limited'||result.state==='login_required')
      $('#speech-helper').textContent='AI判定を利用できないため、教材の簡易判定で確認しています。';
  }
  if(grade.status!=='correct'){
    const defending=play.mode==='forest'&&play.tactics?.turn==='enemy';
    const t=play.mode==='forest'&&!defending?play.tactics:null;
    const missResult=!defending&&raw&&['incorrect','incomplete'].includes(grade.status)?counterPlayerMiss(grade.status):false;
    if(missResult==='finished')return;
    const playerCounteredNow=missResult===true;
    if(defending&&raw&&['incorrect','incomplete'].includes(grade.status)){
      if(counterEnemyDefenseMiss(grade.status)==='finished')return;
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
      if(['vocab','grammar'].includes(prompt.kind))play.quizMistake=raw;
      if(play.mode==='forest'){play.combo=0;play.encounterHelp=true;syncBattleAura();}
    }
    if(play.mode==='forest' && raw && !defending&&!playerCounteredNow){
      const world=$('#forest-world-stage');
      if(t?.playerMissCountered){
        $('#forest-battle-log').textContent='敵の反撃はこのターンで発生済み。答えを直せば攻撃できるよ。';
      }else{
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
    const quizRetry=teaching?quizRetryCoachFor(prompt,raw):null;
    const speakingLesson=['review','incomplete','incorrect'].includes(grade.status)&&raw?speakingFeedbackFor(prompt,raw):null;
    // A concrete correction is instructional help, so subsequent success
    // cannot quietly earn the same XP as an independent first attempt.
    if(speakingLesson?.specific||grade.checks?.missing?.length)play.hintUsed=true;
    const nudge=teaching?`<p class="forest-teaching-nudge"><strong>考え方のヒント</strong> ${escapeHtml(teaching.clue)}</p>`:'';
    const quizContrast=quizRetry?`<p class="forest-quiz-retry-contrast"><strong>今回の回答を見直そう</strong> ${escapeHtml(quizRetry.message)}</p>`:'';
    const speakingNudge=conversationFeedbackHtml(prompt,raw,grade,{hinted:play.hintUsed});
    const aidedNote=speakingLesson?.specific||grade.checks?.missing?.length?'<p class="forest-checking-note">言い直しのヒントを表示したため、次の正答はヒントありXPになります。</p>':'';
    // A low-confidence browser judgement is not a proven English error.
    // Give story-mode learners an explicit opt-in practice route instead of
    // trapping them in a gate that the offline scorer cannot recognize.
    const allowPractice=play.mode==='forest'&&!play.endless&&uncertain&&Boolean(raw)&&!['vocab','grammar'].includes(prompt.kind);
    const practiceButton=allowPractice?'<button type="button" class="grading-skip" id="continue-as-practice">判定保留のまま次のターンへ（XPなし） →</button>':'';
    const feedbackReasons=`${quizContrast}${nudge}${grade.reasons.length&&(!speakingNudge||!grade.checks?.missing?.length)?`<ul class="grading-reasons">${grade.reasons.map(reason=>`<li>${escapeHtml(reason)}</li>`).join('')}</ul>`:''}${speakingNudge}${aidedNote}`;
    const feedbackExplanation=allowPractice?`<details class="grading-review-details"><summary>判定の理由を見る</summary>${feedbackReasons}</details>`:feedbackReasons;
    $('#feedback-panel').innerHTML=`<div class="feedback-box grading-review" role="status"><div class="feedback-head">${empty?'英語を入力してみよう':incomplete?'大事な情報が足りないよ':incorrect?'伝わる意味が違うよ':'判定保留 · もう一度確認'}</div><p class="grading-intro">${incorrect?'登録された条件と食い違う部分があるよ。必要な情報を確認して言い直してみよう。':incomplete?'必要な情報が一部確認できなかったよ。条件を足してもう一度試そう。':uncertain?'別の言い方かもしれません。誤答・HP減少にはしないよ。':'入力や音声認識に失敗しても、英語力の評価には含みません。'}</p>${practiceButton}${feedbackExplanation}${empty?'':`<button type="button" class="grading-skip" id="show-example">${teaching||speakingLesson?'正解と理由を見る（XPなし）':'例文を見て次へ（XPなし）'}</button>`}</div>`;
    if(!empty)attachFeedbackBookmark(prompt);
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
      if(play.tactics){
        // A review-only answer is not a successful attack: it cannot remove
        // enemy HP or clear a boss phase. Yield the action without XP instead.
        play.tactics.lastIndependentKind=null;
        play.tactics.usedPromptIds.add(prompt.id);
        $('#forest-battle-log').textContent='判定保留：攻撃は命中していないよ。HP・XPはそのままで敵のターンへ。';
        advanceQuestion();
        return;
      }
      if(play.index>=regularCount())play.bossHits=Math.min(BOSS_HITS,play.bossHits+1);
      $('#forest-battle-log').textContent='自然な別表現かもしれないので、判定を保留して練習ルートで進むよ。XP・習得実績は増えません。';
      advanceQuestion();
    });
    if(!['vocab','grammar'].includes(prompt.kind))micView('ready');
    return;
  }
  // Text-assisted comprehension is useful practice, but not evidence that
  // audio was heard. It must not mint XP, advance spaced recall, or earn a
  // verified boss seal when media playback was unavailable.
  const rating=transcriptPractice?'practice':play.hintUsed?'hint':'smooth';
  const wasQuizResolved=save.quizProgress?.[prompt.id]?.resolved===true;
  const inputSource=prompt.kind==='speak'?(play.micTranscript?'microphone':'keyboard'):'unknown';
  const beforeAnswerSave=save;
  const {save:next,reward}=transcriptPractice?{save:save,reward:{xp:0,captured:[]}}:recordAnswer(save,prompt.id,rating,dayKey(),inputSource);
  const answerSaved=!transcriptPractice&&persist(next);
  const learningWin=answerSaved&&rating==='smooth'?earnedImprovementFor(beforeAnswerSave,save,prompt.id,dayKey()):null;
  play.earnedXp+=reward.xp;
  play.captured.push(...reward.captured);
  if(rating==='smooth')play.smooth++;
  else if(rating==='hint')play.hintedCount++;
  if(play.mode==='saved')play.reviewOutcomes.push({promptId:prompt.id,outcome:transcriptPractice?'review':rating==='smooth'?'independent':'supported'});
  if(play.mode==='retention'&&rating==='smooth'&&play.retentionDueIds.includes(prompt.id))play.retentionPassedIds.push(prompt.id);
  if(transcriptPractice)play.assistedGates=(play.assistedGates||0)+1;
  if(play.mode==='forest')play.dungeonOutcomes.push({promptId:prompt.id,kind:prompt.kind,
    outcome:transcriptPractice?'review':rating==='smooth'?'independent':'supported'});
  if(play.tactics)play.tactics.usedPromptIds.add(prompt.id);
  play.revealed=true;
  if(play.roleplay){
    const turn=play.roleplay.turns[play.index];
    const opening=roleplayOpeningFor(play.roleplay,play.index);
    const reaction=roleplayReplyFor(turn,raw,{confirmed:true});
    play.roleplay.history.push({npc:opening.npc,...reaction,answer:raw,
      outcome:rating==='smooth'?'smooth':'hint',
      checked:Array.isArray(grade.checks?.met)?grade.checks.met.slice(0,3):[]});
  }
  stopAudio();
  $('#show-answer').disabled=true;$('#show-hint').disabled=true;$('#spoken-answer').disabled=true;micView('done');
  let battlePayoff=null,battleDetailLog='';
  if(play.mode==='forest'&&play.tactics?.turn==='enemy'){
    const t=play.tactics;
    const hit=t.defenseHitTaken?{damage:0,blocked:false}:
      incomingHit({kind:t.enemyKind,allyId:play.companionId,evolved:getMonsterProgress(save,play.companionId).evolved,
        action:t.actionAtAttack,result:'correct',hinted:rating!=='smooth',pressure:t.enemyPressure,
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
    battlePayoff=battlePayoffFor({turn:'defense',damage:t.lastHitDamage,partyHp:t.hp,
      partyMax:t.maxHp,covered:!t.lastHitDamage&&Boolean(rescue?.partnerId||t.lastCoverNote)});
  }
  if(play.mode==='forest'&&play.tactics?.turn!=='enemy'){
    const boss=play.index>=regularCount();
    const foe=opponentFor(play.index,play.wave,play.areaId);
    const companion=monsterFor(play.companionId);
    const form=getMonsterProgress(save,play.companionId);
    const companionName=monsterFormName(companion,form.stage);
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
      allyId:play.companionId,action:t.action==='assist'?'attack':t.action,boss,evolved:form.evolved,ascended:form.ascended,
      repeated:t.lastAttackKind===attackKind,foeProfile}):specialStrike({companionId:play.companionId,
      evolved:getMonsterProgress(save,play.companionId).evolved,boss,usedPower:play.usedPower||!play.endless});
    const usedUltimate=Boolean(t&&t.action==='skill');
    const bossUltimateBarrier=usedUltimate&&boss&&play.index<regularCount()+BOSS_HITS-1;
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
    const rawSpecial=styled?{...amplified,damage:styled.damage}:amplified;
    const weaponBonus=t?weaponAffinityBonus(save,attackKind,{independent:rating==='smooth'}):0;
    let weaponTechnique=null,weaponTechniqueHeal=0;
    const special=t?{...rawSpecial,damage:scaledStrikeDamage(rawSpecial.damage,form.level,save,{kind:attackKind,independent:rating==='smooth'})}:rawSpecial;
    let actualHitDamage=special.damage;
    const healed=t?Math.min((usedUltimate&&boss?2:0)+(duo?.extraHeal||0)+(bossCounter?.heal||0)+(mastery?.heal||0),t.maxHp-t.hp):0;
    let foeShiftNow=false;
    let eliteLoot=null;
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
      else{
        const previousHp=t.enemyHp;
        actualHitDamage=Math.min(previousHp,special.damage);
        t.enemyHp=Math.max(0,t.enemyHp-special.damage);
        if(rating==='smooth')t.eliteIndependentHits++;
        if(previousHp>0&&t.enemyHp===0){
          const loot=eliteWeaponDrop(save,{areaId:play.areaId,foeIndex:play.index,
            defeated:true,independentHits:t.eliteIndependentHits});
          if(loot.weapon){
            const before=save;
            if(persist(loot.save)){
              play.eliteDrops.push(loot.weapon);
              eliteLoot=loot.weapon;
              play.justDroppedWeapon=loot.weapon;
            }else save=before;
          }
        }
      }
      // A boss seal represents one independently verified English task, not
      // one HP. Preserve all three tasks while making a high-damage ultimate
      // genuinely useful against the next counterattack as well as healing.
      if(bossUltimateBarrier)t.counterShield=Math.max(t.counterShield,2);
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
      const techniqueTurn=resolveWeaponTechniqueTurn(save,t,{kind:attackKind,
       independent:rating==='smooth',
       canCharge:t.ultimate<ULTIMATE_MAX,
       canShield:t.counterShield===0&&(!t.pendingAdvance||(boss&&play.bossHits<BOSS_HITS)),
       canHeal:t.hp<t.maxHp});
      weaponTechnique=techniqueTurn.technique;
      t.weaponTechniqueUsed=techniqueTurn.weaponTechniqueUsed;
      t.lastIndependentKind=techniqueTurn.lastIndependentKind;
      if(weaponTechnique){
        if(weaponTechnique.charge)t.ultimate=advanceUltimate(t.ultimate,{independent:true});
        if(weaponTechnique.shield)t.counterShield=Math.max(t.counterShield,weaponTechnique.shield);
        if(weaponTechnique.heal){
          const before=t.hp;healActiveFighter(weaponTechnique.heal);weaponTechniqueHeal=t.hp-before;
        }
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
    const impact=t?battleImpactFor({damage:special.damage,ultimate:usedUltimate,weak:special.weak,
      pierce:special.pierce,resist:special.resist,boss,sealsBroken:play.bossHits,sealsTotal:BOSS_HITS}):null;
    if(t)battlePayoff=battlePayoffFor({turn:'attack',damage:actualHitDamage,impact:impact.kind,
      enemyHp:t.enemyHp,enemyMax:t.enemyMax,boss,sealsBroken:play.bossHits,sealsTotal:BOSS_HITS});
    stage.dataset.impact=impact?.kind||'normal';
    $('#forest-damage').dataset.impactLabel=impact?.label||'';
    $('#forest-damage').textContent=impact?impact.damageText:'−'+special.strikes;
    $('#forest-world-fx').textContent=t?(usedUltimate?`必殺 ${special.damage} DMG`:special.ascensionBoost?`覚醒 ${special.damage} DMG`:special.tag):prompt.kind==='listen'?'BLOCK':prompt.kind==='read'?'BREAK':prompt.kind==='vocab'?'WEAKNESS':prompt.kind==='grammar'?'MAGIC':special.ability?special.ability:boss?'BOSS HIT':'HIT';
    updateEnemyHealth(true);
    const defeated=boss?play.bossHits>=BOSS_HITS:Boolean(t&&t.enemyHp<=0);
    // Use the clean answer being resolved *now*, so the third and fifth hits
    // immediately unlock their stronger animations instead of lagging a turn.
    playBattleCinematic(defeated?'victory':'attack',play.combo+(rating==='smooth'?1:0),{ultimate:usedUltimate});
    if(defeated)$('#forest-world-stage').classList.add('forest-boss-defeated');
    const bossMove=boss?forestBossPhase({areaId:play.areaId,index:play.index,wave:play.wave,level:play.difficulty,prompt}):null;
    const sealNote=bossMove?`「${bossMove.signature.name}」を打ち破った！ `:'';
    const duoNote=duo?.activated?`${monsterFor(duo.partnerId).name}との連携成功！ ${duo.awakened?`${duo.awakened}発動！ `:''}${duo.extraDamage?`援護でダメージ＋${duo.extraDamage}。 `:''}${duo.extraCharge?`必殺ゲージ＋${duo.extraCharge}（最大${ULTIMATE_MAX}）。 `:''}${duo.extraHeal?(healed?`回復効果が発動！ `:'HP満タンで回復効果は不要だったよ。 '):''}`:choseAssist?'連携はヒントなしの自力正解で発動するよ。 ':'';
    const masteryNote=mastery?.activated?`Lv.${MASTERY_LEVEL}技「${mastery.name}」発動！ ${mastery.extraDamage?'追撃ダメージ＋1。 ':''}${mastery.extraCharge?'必殺ゲージ＋1。 ':''}${mastery.heal?'仲間HPを回復。 ':''}${mastery.shield?'次の敵攻撃を1軽減。 ':''}`:'';
    const ascensionNote=special.ascensionBoost?'第2進化ボーナス！ 得意攻撃の威力＋1。 ':'';
    const weaponNote=weaponBonus?`武器特性発動！ ${WEAPON_AFFINITY_LABELS[attackKind]}自力正解で威力＋${weaponBonus}。 `:'';
    const techniqueNote=weaponTechnique?`武器技「${weaponTechnique.name}」：${weaponTechnique.charge?'必殺ゲージ＋1':weaponTechnique.shield?'次の被ダメージ−1':`HP＋${weaponTechniqueHeal}`}。 `:'';
    const dropNote=eliteLoot?` 強敵限定ドロップ！「${eliteLoot.name}」を獲得。図鑑で装備できるよ！`:'';
    const shiftNote=foeShiftNow?`属性変化！ 次の弱点は${BATTLE_LABELS[foeBattleAffinity({foeId:foe.id,style:foeStyle,shifted:true}).weak]}に変わった。 `:'';
    const counterNote=bossCounter?.activated?`迎撃成功！ 必殺ゲージ＋1・次の敵攻撃−1${bossCounter.heal&&healed?'・進化回復':''}。 `:'';
    const linkNote=bossLink?.activated?`ボス連携「${bossLink.name}」成功！ ${monsterFor(bossLink.partnerId).name}の援護で${bossLink.shield?'次の反撃−1':bossLink.extraCharge?'必殺ゲージ＋1':`味方HP合計＋${linkHealAmount}`}。 `:'';
    $('#forest-battle-log').textContent=t
      ?sealNote+`${companionName}の${usedUltimate?'必殺技！':`${BATTLE_LABELS[attackKind]}攻撃！`} ${ascensionNote}${weaponNote}${techniqueNote}${duoNote}${masteryNote}${counterNote}${linkNote}${special.pierce?'耐性を突破！ ':special.weak?'弱点をついた！ ':special.resist?'敵に耐性あり！ ':''}${styled?.mitigated?'敵の殻に威力を1防がれた！ ':''}${special.repeatPenalty?'連続攻撃で威力−1。 ':''}${special.damage}ダメージ。${boss?`封印を1枚解除（${play.bossHits}/${BOSS_HITS}、ダメージとは別）。 `:''}${bossUltimateBarrier?'必殺バリア発動！ 次の敵の反撃を2軽減。 ':''}${shiftNote}${healed?`味方HP＋${healed}。 `:''}${defeated?` ${foe.name}をたおした！`:t.playerMissCountered?'敵はすでに反撃済み。次は味方の攻撃！':'次は敵の反撃！'}${dropNote}`
      :sealNote+(prompt.kind==='listen'?`${companionName}が敵の攻撃を防御！反撃で${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='read'?`${companionName}が敵の作戦を見破った！${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='vocab'?`弱点を発見！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:prompt.kind==='grammar'?`魔法が発動！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`:`${companionName}のこうげき！ ${foe.name}に${special.strikes}ダメージ！${defeated?` ${foe.name}をたおした！`:''}`);
    if(t){
      battleDetailLog=$('#forest-battle-log').textContent;
      const summary=battleLogSummaryFor(battlePayoff);
      $('#forest-battle-log').textContent=`${summary} ${battleDetailLog}`;
      $('#forest-battle-log').dataset.result='success';
      $('#forest-battle-log').setAttribute('aria-label',summary);
    }
    if(t)renderTacticalControls();
  }
  if(battlePayoff?.turn==='defense'){
    battleDetailLog=$('#forest-battle-log').textContent;
    const summary=battleLogSummaryFor(battlePayoff);
    $('#forest-battle-log').textContent=`${summary} ${battleDetailLog}`;
    $('#forest-battle-log').dataset.result='success';
    $('#forest-battle-log').setAttribute('aria-label',summary);
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
  const listeningCheck=prompt.kind==='listen'?listeningChallengeFor(prompt):null;
  const explanationHtml=listeningCheck
    ?`<section class="forest-teaching listening-success-guide"><strong class="forest-teaching-title">${transcriptPractice?'字幕で確認した意味':'聞き取れたポイント'}</strong><p>相手の発言：<span lang="en">${escapeHtml(listeningCheck.audio)}</span></p><p><strong>確認できた意味</strong> ${escapeHtml(listeningCheck.options[listeningCheck.correctIndex])}</p>${listeningCheck.coaching?`<p class="listening-evidence-note"><strong>聞き取りの根拠</strong> <span lang="en">${escapeHtml(listeningCheck.coaching.quote)}</span> — ${escapeHtml(listeningCheck.coaching.meaning)}</p>`:''}<p>${escapeHtml(prompt.tip||phraseFor(prompt.phraseId)?.tip||'聞こえた内容の意味を確認しよう。')}</p></section>`
    :objectiveQuiz?quizTeachingHtml(prompt,play.quizMistake||'',{previousMistake:Boolean(play.quizMistake)}):conversationFeedbackHtml(prompt,raw,grade,{hinted:rating==='hint'});
  const checkingNote=transcriptPractice?'音声の再生を確認できなかったため、字幕を読んで意味を練習したよ。聞き取りの実績・XP・定着記録には含めていません。':prompt.kind==='listen'?'音声を聞き、正しい意味を選べたかを確認したよ。スピーキングや発音の判定はしていません。':objectiveQuiz?'この問題では登録された単語・語順との一致を確認しているよ。':grade.method==='semantic-beta'?'AIによる意味の確認（試験運用）です。発音評価ではありません。':'教材ごとの簡易判定です。発音や自由な言い回しを完全に採点するものではありません。';
  const expressionCoaching=grade.coaching?`<div class="speaking-natural-coaching"><strong>意味はOK！ もっと自然に言うなら</strong><p>${escapeHtml(grade.coaching)}</p><span lang="en">${escapeHtml(grade.preferredAnswer||prompt.answer)}</span></div>`:'';
  const acceptedVariant=!objectiveQuiz&&prompt.kind!=='listen'&&grade.method==='registered-example'&&normalizeEnglish(raw)!==normalizeEnglish(prompt.answer)
    ?'<div class="speaking-natural-coaching"><strong>その言い方でもOK！</strong></div>':'';
  const learningPulse=autoForest&&!transcriptPractice?forestLearningPulseHtml(prompt,raw,grade,{hinted:rating==='hint'}):'';
  const defending=autoForest&&play.tactics?.turn==='enemy';
  const battleDetailHtml=battleDetailLog?`<p class="forest-checking-note"><strong>戦闘効果の内訳</strong> ${escapeHtml(battleDetailLog)}</p>`:'';
  const correctBody=`${explanationHtml}<p class="forest-checking-note">${checkingNote}</p>${retentionNote}${quizLearningNote}${battleDetailHtml}`;
  const answerPreview=prompt.kind==='listen'
    ?(autoForest?`<div class="feedback-answer forest-listen-answer">${escapeHtml(listeningChallengeFor(prompt).options[listeningChallengeFor(prompt).correctIndex])}</div>`:'')
    :`<div class="feedback-answer">${escapeHtml(prompt.answer)}</div>`;
  const nextLabel=defending?'自分のターンへ →':autoForest&&play.tactics?'次のターンへ →':autoForest?'今すぐ次へ →':'次の問題へ →';
  const nextButton=`<button id="next-question" class="grading-next">${nextLabel}</button>`;
  const learningDetails=autoForest
    ?`<details id="forest-success-explanation" class="forest-success-explanation"><summary>解説・復習のポイントを見る</summary><div class="forest-success-explanation-body">${learningPulse}${correctBody}</div></details>`
    :correctBody;
  const roleplayReaction=play.roleplay?.history[play.index];
  const roleplayReply=roleplayReaction?`<p class="roleplay-reply" data-roleplay-branch="${roleplayReaction.branch}"><strong>${escapeHtml(play.roleplay.partner)}：${roleplayReaction.branch==='alternate'?'言い換えに反応！':''}</strong><span lang="en">${escapeHtml(roleplayReaction.response)}</span><small>${escapeHtml(roleplayReaction.responseJa)} · 次の会話へ進もう。</small></p>`:'';
  // Keep the payoff where the learner answered; the arena may be off-screen
  // on mobile. This is a short-lived result, never another battle control.
  const streakNote=streak?.chain>=1
    ?`<p class="forest-chain-result${streak.milestone?' forest-chain-milestone':''}" data-chain-start="${streak.chain===1}"><strong>${streak.chain} CHAIN</strong><span>${!play.endless&&chainChestAt(save,streak.chain,play.areaId)?'このエリアの宝箱を発見！ 冒険終了時に獲得':streak.chain===1?'コンボ開始！':play.tactics&&streak.chain>(save.bestBattleChain||0)?'自己ベスト更新！':streak.milestone?'攻守連続成功！':'連続正解！'}</span></p>`:'';
  const lootPulse=play.justDroppedWeapon?`<p class="forest-drop-flash"><strong>EPIC DROP!</strong><span>${escapeHtml(play.justDroppedWeapon.name)}を獲得！ 図鑑で装備できるよ。</span></p>`:'';
  const voiceStrike=autoForest&&!defending&&prompt.kind==='speak'&&inputSource==='microphone'&&rating==='smooth'
    ?'<p class="forest-voice-strike"><strong>VOICE STRIKE</strong><span>マイクで英語を答えて攻撃！</span></p>':'';
  $('#feedback-panel').innerHTML=`<div class="feedback-box grading-correct" role="status"><div class="feedback-head">${transcriptPractice?'字幕で意味を復習したよ！':defending?'防御を確認！':autoForest&&play.tactics?(play.tactics.pendingAdvance?'関門突破！':'攻撃成功！'):autoForest?'関門突破！':'内容を確認できた！'} +${reward.xp} XP</div>${battlePayoffHtml(battlePayoff)}${learningWinHtml(learningWin)}${voiceStrike}${streakNote}${lootPulse}${answerPreview}${acceptedVariant}${expressionCoaching}${roleplayReply}${autoForest?`${nextButton}${learningDetails}`:`${learningDetails}${nextButton}${conversationPolishHtml(prompt)}`}</div>`;
  attachFeedbackBookmark(prompt);
  if(!autoForest)wireConversationPolish(prompt,raw);
  $('#next-question').addEventListener('click',defending?finishEnemyTurn:advanceQuestion);
  // Deliberately no auto-advance: explanations must remain until tapped.
}
function skipAnswer(){
  if(!play || play.revealed)return;
  if(play.tactics)play.tactics.lastIndependentKind=null;
  const prompt=currentPrompt();
  const defending=play.mode==='forest'&&play.tactics?.turn==='enemy';
  if(play.mode==='forest'){play.encounterHelp=true;play.hintUsed=true;}
  const learnerAnswer=$('#spoken-answer')?.value||'';
  if(!play.quizMissRecorded){persist(recordAnswer(save,prompt.id,'again').save);play.quizMissRecorded=true;}
  if(play.mode==='saved')play.reviewOutcomes.push({promptId:prompt.id,outcome:'review'});
  play.revealed=true;stopAudio();
  if(play.roleplay){
    const opening=roleplayOpeningFor(play.roleplay,play.index);
    const reaction=roleplayReplyFor(play.roleplay.turns[play.index],'');
    play.roleplay.history.push({npc:opening.npc,...reaction,answer:'',outcome:'skipped'});
  }
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
  const explanation=quizTeachingFor(prompt)?quizTeachingHtml(prompt,learnerAnswer):
    conversationFeedbackHtml(prompt,learnerAnswer,{status:'review'}, {hinted:true,revealExample:true});
  const roleplaySupport=play.roleplay?`<p class="roleplay-reply" data-roleplay-branch="supported"><strong>${escapeHtml(play.roleplay.partner)} · 練習のサポート：</strong><span lang="en">${escapeHtml(play.roleplay.history[play.index].response)}</span><small>${escapeHtml(play.roleplay.history[play.index].responseJa)} · 自分で返答した扱いにはならないよ。</small></p>`:'';
  $('#feedback-panel').innerHTML=`<div class="feedback-box" role="status"><div class="feedback-head">${['vocab','grammar'].includes(prompt.kind)?'正解と理由を確認しよう':'例文を確認しよう'} · 0 XP</div><div class="feedback-answer">${escapeHtml(prompt.answer)}</div>${explanation}${roleplaySupport}<button id="next-question" class="grading-next">${defending?'味方のターンへ →':play.mode==='forest'?'同じ関門にもう一度挑戦 →':'次の問題へ →'}</button>${conversationPolishHtml(prompt)}</div>`;
  attachFeedbackBookmark(prompt);
  wireConversationPolish(prompt,learnerAnswer);
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
    // The foe already counterattacked this confirmed player miss. Never
    // punish the same attack with another mandatory defense turn.
    if(t.playerMissCountered){
      if(play.index>=regularCount()&&play.bossHits<BOSS_HITS)t.bossReactionCompleted=true;
      finishEnemyTurn();return;
    }
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
      // Every clear grants one tradable trophy only after enough independent
      // answers. Keeps unique story souvenirs forever; selling uses copies.
      const loot=play.endless?{save:reward.save,item:null,count:0}:grantDungeonTreasure(reward.save,{
        areaId:play.areaId,independent:play.smooth,
        firstClear:!cleanForest(save.forest).completedAreas.includes(play.areaId)});
      if(loot.item)play.tradeDrops.push({item:loot.item,count:loot.count});
      const awarded=captureEligibleMonsters(loot.save);
      persist(awarded.save);
      if(reward.trialEarned)play.bossTrialNewArea=play.areaId;
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
 // Tactical attacks and defenses can draw outside the initial chapter deck.
 const replayable=new Set(ALL_PROMPTS.map(p=>p.id));
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
function renderDungeonVictoryRecap(ended,{nextArea=null,canContinue=false}={}){
 const region=$('#dungeon-victory-recap');
 const creature=monsterFor(save.ownedMonsters.includes(ended.companionId)?ended.companionId:save.selectedMonster);
 const recap=dungeonVictoryRecapFor(ended,save,{nextArea,canContinue,monsterName:creature.name});
 region.hidden=!recap;
 if(!recap){region.replaceChildren();return;}
 const phrases=recap.expressions.length?`<ul class="victory-english-list">${recap.expressions.map(item=>`<li data-victory-prompt="${escapeHtml(item.promptId)}"><span>${escapeHtml(item.label)} · ${item.independent?'自力で確認':'ヒントありで確認'}</span><strong lang="en">${escapeHtml(item.english)}</strong></li>`).join('')}</ul>`
  :'<p class="victory-english-empty">今回は教材で確認できた英文はまだないよ。次の冒険で1つ増やそう。</p>';
 const unsavedLoot=recap.expressions.filter(item=>!save.savedPromptIds?.includes(item.promptId));
 const saveLootButton=recap.expressions.length?`<button id="victory-save-english" class="victory-save-english" type="button" data-saved="${String(!unsavedLoot.length)}" ${unsavedLoot.length?'':'disabled'}>${unsavedLoot.length?`今回の英文${unsavedLoot.length}つを復習に保存`:'今回の英文は復習に保存済み'}</button>`:'';
 const evolution=recap.evolution;
 const growthDetail=evolution.goal===null
  ?`累計 ${evolution.xp} XP · 第2進化達成済み。これからもレベルを上げられるよ。`
  :`育成済み ${evolution.xp} / ${evolution.goal} XP · ボス攻略 ${evolution.trialCount}/${evolution.requiredTrials}エリア · 残り${evolution.remaining} XP${evolution.canEvolve?' · 進化するボタンを押せる！':evolution.canReachWithWallet?' · 手持ちXPでレベル条件に届くよ！':''}`;
 const potentialGrowth=evolution.potentialPercent>evolution.percent
  ?`<small class="victory-evolution-preview">淡いゲージは手持ちの${evolution.potentialXp} XPを育成に使った場合の見込み（${evolution.percent}% → ${evolution.potentialPercent}%）。まだXPは使っていないよ。</small>`:'';
 const medalGoal=recap.medalGoal;
 const medalChase=medalGoal?`<section class="victory-medal-chase" aria-label="次のボス勲章の目標"><div><span class="tiny-caps">NEXT MEDAL · BOSS MASTERY</span><strong>次は${medalGoal.label}勲章！ 昇格で +${medalGoal.bonusXp} XP</strong><p>${escapeHtml(medalGoal.goal)}</p></div><button type="button" id="victory-medal-retry">この章で${medalGoal.label}を目指す</button></section>`:'';
 region.innerHTML=`<div class="victory-loot-top"><span class="victory-loot-kicker">BOSS CLEAR · ENGLISH LOOT</span><div class="victory-loot-total"><small>今回の獲得</small><strong>+${recap.xp.total} <span>XP</span></strong></div><p>問題 +${recap.xp.answers} XP${recap.xp.medal?` · 勲章 +${recap.xp.medal} XP`:''} · 育成に使える ${recap.xp.wallet} XP</p></div>
  <div class="victory-loot-grid"><section class="victory-english" aria-label="今回確認した英語"><h2>今回確認した英語 <span>${recap.expressions.length}つ</span></h2>${phrases}${saveLootButton}</section>
  <section class="victory-evolution" aria-label="仲間の進化までの距離"><h2>${escapeHtml(evolution.monsterName)} の成長 <span>Lv.${evolution.level}</span></h2><strong>${escapeHtml(evolution.label)}</strong><div class="victory-evolution-track" role="progressbar" aria-label="${escapeHtml(evolution.monsterName)}の育成済み進化ゲージ" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${evolution.percent}"><span class="victory-evolution-potential" aria-hidden="true" style="width:${evolution.potentialPercent}%"></span><span class="victory-evolution-earned" aria-hidden="true" style="width:${evolution.percent}%"></span></div><p>${escapeHtml(growthDetail)}</p>${potentialGrowth}<small>獲得XPは自動で仲間に入らないよ。下の「仲間を育てる」で使ってね。</small></section></div>
  ${medalChase}<p class="victory-next-tip"><strong>次のおすすめ</strong><span>${escapeHtml(recap.recommendation)}</span></p>`;
 region.querySelector('#victory-medal-retry')?.addEventListener('click',()=>ended.quickStart?startMainDungeon(ended.areaId):startSession(ended.tactics?'forest-tactics':'forest',ended.areaId));
 region.querySelector('#victory-save-english')?.addEventListener('click',event=>{
   const button=event.currentTarget;
   const pending=recap.expressions.filter(item=>!save.savedPromptIds?.includes(item.promptId));
   if(!pending.length)return;
   let next=save;
   for(const item of pending)next=toggleSavedPrompt(next,item.promptId);
   if(!pending.every(item=>next.savedPromptIds.includes(item.promptId))){
     button.textContent='保存上限の255問です。ホームで保存済みの問題を整理してね。';
     return;
   }
   const before=save;
   if(!persist(next)){
     save=before;
     button.textContent='保存できませんでした。ブラウザの保存設定を確認してね。';
     return;
   }
   button.disabled=true;button.dataset.saved='true';
   button.textContent=`英文${pending.length}つを保存！ ホームの「保存した問題」から復習できるよ。`;
 });
}
function finishSession(timedOut=false,defeated=false) {
  if(!play)return;
  cancelAutoAdvance();
  const ended=play;play=null;clearTimer();stopAudio();
  betaTelemetry.track('monsters_beta_end',{...betaSessionFields(ended),
    outcome:ended.mode==='forest'?(defeated?'defeat':ended.endless?'endless_end':ended.completedForest?'clear':'stopped'):
      timedOut?'timeout':'complete'});
  if(ended.mode==='forest'){
    const chestReward=ended.endless?{save,unlocked:[],bonusXp:0,bonusGold:0}:awardChainChests(save,ended.bestCombo,ended.areaId);
    ended.newChainChests=chestReward.unlocked;
    ended.newChainGold=chestReward.bonusGold;
    if(chestReward.unlocked.length||ended.bestCombo>(save.bestBattleChain||0))
      persist({...chestReward.save,bestBattleChain:Math.max(save.bestBattleChain||0,ended.bestCombo)});
    const loot=dungeonWeaponDrop(save,{areaId:ended.areaId,
      completed:ended.completedForest===true&&!ended.endless,
      independent:ended.smooth});
    ended.weaponDrop=loot.weapon;
    if(loot.weapon)persist(loot.save);
  }
  if(ended.mode==='challenge')persist(finishRound(save,ended.smooth));
  if(ended.mode==='daily'&&ended.index>=ended.prompts.length){
    const beforeGold=normalizeEconomy(save).coins;
    const recorded=recordDailyCompletion(save,{difficulty:ended.difficulty,date:dayKey(),
      total:ended.prompts.length,independent:ended.smooth,hinted:ended.hintedCount,
      elapsedSeconds:(Date.now()-ended.startedAt)/1000});
    ended.dailyGoldAward=persist(recorded)?normalizeEconomy(recorded).coins-beforeGold:0;
  }
  $('#play-view').classList.remove('forest-active','review-only');
  $('#result-view').classList.toggle('forest-results',ended.mode==='forest');
  const forestFinished=ended.mode==='forest'&&ended.completedForest===true;
  $('#result-view').classList.toggle('boss-clear',forestFinished);
  $('#result-kicker').textContent=ended.mode==='forest'?(defeated?'BATTLE LOST':forestFinished?'DUNGEON CLEAR':'ADVENTURE RESULT'):ended.roleplay?'CONVERSATION COMPLETE':ended.mode==='saved'?'SAVED ENGLISH REVIEW':ended.mode==='transfer-review'?'TRANSFER REVIEW':'TRAINING COMPLETE';
  if(forestFinished&&!ended.endless)betaTelemetry.track('monsters_beta_chapter_clear',{
    chapter:ended.areaId,difficulty:ended.baseDifficulty
  });
  if(ended.mode==='forest'&&ended.endless){
    const forest=cleanForest(save.forest);
    persist({...save,forest:{...forest,bestWave:Math.max(forest.bestWave||0,ended.wave-(ended.index===0?1:0))}});
  }
  $('#result-title').textContent=ended.roleplay?`${ended.roleplay.title} · 会話完了！`:ended.mode==='saved'?'保存した英語を復習したよ！':ended.mode==='transfer-review'?'場面チェンジの復習完了！':ended.mode==='retention'?'定着チェック完了！':ended.mode==='skill-focus'?SKILL_LABELS[ended.focusKind]+'の集中練習完了！':ended.mode==='daily'?'今日の5分ジム完了！':ended.mode==='listening'?'リスニング道場クリア！':ended.mode==='speaking'?'スピーキング道場クリア！':ended.mode==='forest'?
    (defeated?'ダンジョン挑戦終了':ended.endless?'∞ エンドレス WAVE '+ended.wave:dungeonAreaFor(ended.areaId)?.world==='ruins'?'星影の遺跡のボスを討伐！':dungeonAreaFor(ended.areaId)?.world==='city'?'雪灯りの街のボスを討伐！':'森のボスを討伐！'):
    ended.smooth>=4?'すごい！言葉が出てきたね。':'今日の一歩、しっかり前進。';
  $('#result-description').textContent=ended.roleplay?'3ターン完了！ どこまで自力で言えたか振り返ろう。':ended.mode==='saved'?'保存した英語を復習したよ。':ended.mode==='transfer-review'?(ended.smooth?'別の場面でも自力で使えたね！':'明日また、自力で言えるか試そう。'):ended.mode==='daily'?'今日の8問完了！ 明日も少しずつ続けよう。':ended.mode==='listening'?'聞き取った内容を確認できたよ。発音の採点はしていません。':ended.mode==='forest'?
    (defeated?ended.tactics?'味方のHPがなくなったよ。学んだ英語は消えないから、仲間の相性や防御を工夫して再挑戦しよう！':'挑戦回数を使い切ったよ。言い換えが簡易判定で通らない場合もあるので、また挑戦してね！':
     ended.endless?'ここまでの冒険の記録！難易度が上がるほどリトライ回数が減るよ。':
     `${dungeonAreaFor(ended.areaId).name}を攻略！ ${nextDungeonArea(save).id!==ended.areaId?'次のエリアの扉が開いたよ。':'学んだ表現を別の場面や後日の復習でも使ってみよう。'}`):
    timedOut?'60秒おつかれさま！ 言えなかった表現は、次の練習で取り戻そう。':
    '練習した表現は、別の場面や後日の復習でも使ってみよう。';
  let resultImprovement=$('#result-improvement');
  if(!resultImprovement){
    resultImprovement=document.createElement('section');
    resultImprovement.id='result-improvement';resultImprovement.className='result-improvement';
    resultImprovement.setAttribute('aria-label','今回増えた自力正解の記録');
    $('#result-detail-panel').before(resultImprovement);
  }
  const previousWins=new Set(ended.improvementsAtStart||[]);
  const attemptedIds=attemptedDungeonPromptIds(ended);
  const newWins=improvementHighlightsFor(save,{today:dayKey(),limit:80})
    .filter(row=>attemptedIds.has(row.id)&&!previousWins.has(row.id));
  resultImprovement.hidden=!newWins.length;
  resultImprovement.dataset.tier=newWins.length>=3?'gold':newWins.length===2?'silver':newWins.length===1?'bronze':'none';
  if(newWins.length){
    // This medal is visual recognition of documented, later-day improvement.
    // It does not mint coins/XP or claim permanent language proficiency.
    resultImprovement.innerHTML=`<div class="result-improvement-medal" aria-hidden="true"><span class="result-improvement-star"></span><strong>${newWins.length}</strong><small>COMEBACK</small></div><div class="result-improvement-copy"><span class="result-improvement-kicker">ENGLISH COMEBACK</span><strong>リベンジ成功！</strong><p>前に苦手だった${newWins.length}問を、別の日に自力で正解！</p><details class="result-improvement-proof"><summary>成長の記録を見る</summary><ul>${newWins.slice(0,3).map(row=>`<li>${escapeHtml(row.label)} · ${escapeHtml(row.kind==='speak'?row.expression:row.cue)}</li>`).join('')}</ul><small>同じ教材での自力正解の記録です。発音や会話力の採点ではありません。</small></details></div>`;
  }
  let nextReturn=$('#result-next-return');
  if(!nextReturn){
    nextReturn=document.createElement('section');nextReturn.id='result-next-return';
    nextReturn.className='result-next-return';
    nextReturn.setAttribute('aria-label','次の復習予定');
    $('#result-detail-panel').before(nextReturn);
  }
  const returnCue=nextReturnCueFor(save,dayKey());
  nextReturn.hidden=!returnCue;
  if(returnCue)nextReturn.innerHTML=`<strong>${escapeHtml(returnCue.title)}</strong><span>${escapeHtml(returnCue.detail)}</span>`;
  let recallResult=$('#result-retention-summary');
  if(!recallResult){
    recallResult=document.createElement('section');
    recallResult.id='result-retention-summary';
    recallResult.className='retention-result';
    recallResult.setAttribute('aria-label','定着チェックの振り返り');
    $('#result-detail-panel').before(recallResult);
  }
  recallResult.hidden=ended.mode!=='retention';
  if(ended.mode==='retention'){
    const checked=new Set(ended.retentionPassedIds).size;
    const scheduled=ended.retentionDueIds.length;
    const remaining=retentionOverview(save,dayKey()).due.length;
    const milestones=retentionMilestoneSummary(save,dayKey());
    const next=remaining? '今日の復習がまだ残っているよ。続けて確認しよう'
      :milestones.nextDate?`次の予定は ${milestones.nextDate}`:'今日の予定は完了！ 新しい英語にも挑戦してみよう';
    recallResult.textContent=`今回の定着チェック：自力で確認 ${checked}/${scheduled}問（別場面の追加問題は含まない）。翌日 ${milestones.day1}問・3日後 ${milestones.day3}問・7日後 ${milestones.day7}問達成。未確認の復習 ${remaining}問。 ${next}。ヒントや例文だけでは達成にならないよ。`;
  }
  let savedResult=$('#result-saved-review');
  if(!savedResult){
    savedResult=document.createElement('section');
    savedResult.id='result-saved-review';savedResult.className='saved-review-result';
    savedResult.setAttribute('aria-label','保存した英語の復習結果');
    $('#result-detail-panel').before(savedResult);
  }
  savedResult.hidden=ended.mode!=='saved';
  if(ended.mode==='saved'){
    const recap=savedReviewRecap(ended.prompts,ended.reviewOutcomes);
    const today=dayKey();
    const trend=savedReviewTrend(ended.prompts,ended.reviewOutcomes,save.savedReviewHistory,today);
    persist(rememberSavedReview(save,ended.prompts,ended.reviewOutcomes,today));
    const trendNote=trend.compared
      ?`<div class="saved-review-trend" aria-label="同じ問題の前回との比較"><strong>前回の復習からの変化（同じ問題 ${trend.compared}問）</strong>${trend.improvedLater?`<p>日を空けて、自力でできるようになった ${trend.improvedLater}問</p>`:''}${trend.improvedToday?`<p>今日の再挑戦で、自力でできるようになった ${trend.improvedToday}問</p>`:''}${trend.maintained?`<p>今回も自力で確認 ${trend.maintained}問</p>`:''}${trend.needsPractice?`<p>前回は自力・今回は要復習 ${trend.needsPractice}問</p>`:''}<small>前回の同じ問題と比較した練習記録。語学力の評価や1・3・7日の定着実績とは別だよ。</small></div>`
      :'<p class="saved-review-next">次に同じ問題を復習すると、前回からの変化もここに表示されるよ。</p>';
    savedResult.innerHTML=`<span class="tiny-caps">YOUR ENGLISH RECALL</span><h2>${recap.independent===recap.total?'全問、自力で確認！':'自力で確認 '+recap.independent+' / '+recap.total+'問'}</h2><div class="saved-review-meter" role="meter" aria-label="今回の自力確認率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${recap.percentage}"><span style="width:${recap.percentage}%"></span></div><p>ヒントあり ${recap.supported}問 · 例文・字幕で確認 ${recap.review}問${recap.pending?' · 未回答 '+recap.pending+'問':''}</p>${trendNote}${recap.retryIds.length?`<button type="button" id="retry-saved-weak" class="button button-primary">自力で再挑戦する（${recap.retryIds.length}問）</button>`:'<p class="saved-review-next">よくできたね！ 次は日を空けてもう一度、自力で思い出してみよう。</p>'}<small>今回の教材内での確認結果だよ。ヒント・字幕・例文だけでは自力正解に含めません。</small>`;
    savedResult.querySelector('#retry-saved-weak')?.addEventListener('click',()=>startSession('saved',null,false,false,[...recap.retryIds]));
  }
  $('#result-rewards').innerHTML=`${ended.mode==='daily'?`<span class="reward-pill">ヒントなし正解率 ${Math.round(100*ended.smooth/ended.prompts.length)}%（全${ended.prompts.length}問）</span>${ended.dailyGoldAward?`<span class="reward-pill">今日のごほうび ＋${ended.dailyGoldAward} G</span>`:''}`:''}<span class="reward-pill">${ended.mode==='forest'?'自力で正解':ended.mode==='listening'?'自力で聞き取れた':'自力で正解'} ${ended.smooth} / ${ended.index}</span>${ended.assistedGates?`<span class="reward-pill">練習ルート ${ended.assistedGates}関門 · 0 XP</span>`:''}<span class="reward-pill">+${ended.earnedXp} XP ストック！</span><span class="reward-pill">使えるXP ${save.xpWallet}</span><span class="reward-pill">仲間 ${save.ownedMonsters.length} / ${MONSTERS.length}</span>`;
  const medal=ended.bossMedal;
  if(medal?.bonusXp)$('#result-rewards').insertAdjacentHTML('beforeend',`<span class="reward-pill boss-bonus-pill">ボス勲章 初回・昇格報酬 ＋${medal.bonusXp} XP</span>`);
  const medalDisplay=medal?`<section class="boss-medal-result" data-medal-rank="${medal.rank}"><span class="boss-medal-symbol" aria-hidden="true"></span><div><span class="tiny-caps">BOSS MASTERY · ${escapeHtml(difficultyCopy[medal.difficulty].label)}</span><h2>${medal.rank?`${BOSS_MEDAL_NAMES[medal.rank]}ランク${medal.upgraded?'獲得！':'でクリア！'}`:'練習クリア · 勲章は次の挑戦で'}</h2><p>章の問題 ${medal.independent}/${medal.total}問を自力で確認 · ボス ${medal.verifiedBoss}/3問を確認。${medal.rank===3?'全問自力でクリア！':medal.rank===2?'全問自力で金ランクを目指そう。':medal.rank===1?'75%以上を自力で確認し、ボスも2問以上自力で銀ランクへ。':'ボス3問をヒントありでも確認すると銅ランクを獲得できるよ。'}</p>${medal.best>medal.rank?`<small>この難易度の最高記録は${BOSS_MEDAL_NAMES[medal.best]}ランクのまま保存したよ。</small>`:''}</div></section>`:'';
  const companions=companionRevealFor(ended.captured,save.ownedMonsters,MONSTERS);
  renderCompanionSpotlight($('#result-companion-reveal'),companions,monsterArt);
  let chaseReward=$('#result-game-goals');
  if(!chaseReward){
    chaseReward=document.createElement('section');chaseReward.id='result-game-goals';
    $('#result-detail-panel').before(chaseReward);
  }
  chaseReward.replaceChildren();
  chaseReward.hidden=ended.mode!=='forest';
  if(ended.mode==='forest'){
    for(const weapon of [...(ended.eliteDrops||[]),...(ended.weaponDrop?[ended.weaponDrop]:[])]){
      const panel=document.createElement('div');panel.className='result-weapon-drop';
      panel.dataset.rarity=weapon.rarity;
      const heading=document.createElement('strong');heading.textContent=`${weapon.rarity==='epic'?'強敵限定ドロップ！':'装備ドロップ！'} ${weapon.name}`;
      const detail=document.createElement('p');detail.textContent=`${WEAPON_RARITY_LABELS[weapon.rarity]} · 攻撃＋${weapon.attack} · ${WEAPON_AFFINITY_LABELS[weapon.affinity]}を自力正解で追撃＋${weapon.rarity==='epic'?2:1}${save.equippedWeaponId===weapon.id?' · 自動装備したよ':' · 図鑑で装備を変更できるよ'}`;
      const button=document.createElement('button');button.type='button';button.textContent='装備を確認する';
      button.addEventListener('click',()=>renderCollection());
      panel.append(heading,detail,button);chaseReward.append(panel);
    }
    if(!ended.weaponDrop&&ended.completedForest&&!ended.endless&&ended.smooth<3){
      const panel=document.createElement('p');panel.className='result-weapon-hint';
      panel.textContent=`武器の獲得まであと${3-ended.smooth}問。ボス撃破＋自力正解3問以上で、その章の武器を手に入れられるよ。`;
      chaseReward.append(panel);
    }
    const chests=ended.newChainChests||[];
    if(chests.length){
      const panel=document.createElement('div');panel.className='result-chain-chest';
      const heading=document.createElement('strong');heading.textContent=`宝箱オープン！ ＋${chests.reduce((sum,chest)=>sum+chest.xp,0)} XP / ＋${ended.newChainGold||0} G`;
      const detail=document.createElement('p');detail.textContent=chests.map(chest=>`${chest.name}（${chest.chain} CHAIN）`).join(' · ')+' · エリアごとに初回1回だけ。次はもっと長い連勝に挑戦！';
      panel.append(heading,detail);chaseReward.append(panel);
    }
    if(ended.completedForest&&!ended.endless){
      const summon=summonProgress(save),panel=document.createElement('section');
      panel.className='result-summon-goal';panel.setAttribute('aria-label','次の武器ガチャまでの進捗');
      const summary=document.createElement('div');summary.className='result-summon-copy';
      summary.innerHTML=`<span>GACHA PROGRESS · 次の武器ガチャ</span><strong>${summon.readyNow?'武器ガチャを引ける！':summon.readyAfterSale?'お宝を売ればガチャを引ける！':`あと ${summon.missing} G でガチャを引ける`}</strong><small>所持 ${summon.coins} G · お宝の売却見込み ${summon.sellableGold} G / 1回 ${summon.cost} G</small>`;
      const track=document.createElement('div');track.className='result-summon-track';track.setAttribute('role','progressbar');track.setAttribute('aria-label','次の武器ガチャに必要なゴールドの達成度');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(summon.percent));
      const fill=document.createElement('span');fill.style.width=summon.percent+'%';track.append(fill);
      panel.append(summary,track);
      if(summon.readyNow||summon.sellableGold){
        const button=document.createElement('button');button.type='button';
        button.textContent=summon.readyNow?'武器ガチャを引く':'お宝を売りに行く';
        button.addEventListener('click',openForge);panel.append(button);
      }
      chaseReward.append(panel);
    }
    const hunted=monsterFor(ended.huntTargetId);
    if(hunted){
      const captured=ended.captured.includes(hunted.id);
      const current=save.ownedMonsters.includes(hunted.id)?null:monsterHuntBoard(save).options.find(entry=>entry.id===hunted.id);
      const after=current?.count??0;
      if(captured||after>ended.huntBefore){
        const panel=document.createElement('div');panel.className='result-chain-chest';
        const heading=document.createElement('strong');heading.textContent=captured?`新しい仲間を発見！ ${hunted.name}が仲間に！`:'未発見の仲間に近づいた';
        const detail=document.createElement('p');detail.textContent=captured?'図鑑で新しい仲間を確認しよう。':`獲得条件 ${ended.huntBefore} → ${after}。冒険と復習を続けて、新しい仲間との出会いを目指そう。`;
        panel.append(heading,detail);chaseReward.append(panel);
      }
    }
    chaseReward.hidden=chaseReward.children.length===0;
  }
  const newTrial=ended.mode==='forest'&&ended.bossTrialNewArea?dungeonAreaFor(ended.bossTrialNewArea):null;
  const evolutionTrial= newTrial&&getMonsterProgress(save,ended.companionId).stage<2 ?(()=>{
    const guide=getEvolutionTrialGuide(save,ended.companionId),growth=getMonsterProgress(save,ended.companionId);
    return `<section class="victory-trial-award" aria-label="進化の試練・新しいボスの印"><span class="victory-trial-seal" aria-hidden="true"><span>NEW</span></span><div><small>EVOLUTION TRIAL · BOSS MARK</small><strong>${escapeHtml(newTrial.name)}の印を獲得！</strong><p>進化に必要な討伐の印 ${Math.min(growth.trialCount,growth.requiredTrials)} / ${growth.requiredTrials}エリア。${growth.canEvolve?'進化の条件達成！ 図鑑で進化させよう。':guide.remaining?(guide.target?`次は${escapeHtml(guide.target.name)}のボスへ！`:'次のボスエリアを解放しよう。'):'ボスの印がそろった！ XPを育成に使おう。'}</p></div></section>`;
  })():'';
  const newRelics=ended.mode==='forest'?ended.forestRelics.map(id=>`<div class="forest-result-relic"><span aria-hidden="true">${relicArt(id)}</span><div><strong>${escapeHtml(FOREST_RELICS[id].name)} を発見！</strong><p>${escapeHtml(FOREST_RELICS[id].meaning)} · 冒険の宝物</p></div></div>`).join(''):'';
  const tradableLoot=ended.mode==='forest'?(ended.tradeDrops||[]).map(({item,count})=>
    `<div class="forest-result-relic trade-loot-result"><div><strong>換金できるお宝！ ${escapeHtml(item.name)} ×${count}</strong><p>武器の鍛冶屋で売ると ${item.price*count} G。冒険の記念品は図鑑に残るよ。</p></div></div>`).join(''):'';
  const memories=ended.mode==='forest'?(ended.eventMemories||[]).slice(-8).map(memory=>
    `<div class="forest-event-memory"><strong>${escapeHtml(memory.title)} · ${escapeHtml(memory.memento)}</strong><p>${escapeHtml(memory.outcome)}</p><small>探索の記録 · XPなし</small></div>`).join(''):'';
  const transfer=ended.roleplay?roleplayTransferFor(ended.roleplay):null;
  const roleplayResult=ended.roleplay?(()=>{
    const recap=roleplayRecapFor(ended.roleplay);
    if(!recap)return '';
    const turns=recap.rows.map((row,index)=>{
      const spoken=row.answer?`<p><strong>あなたの英文</strong> <span lang="en">${escapeHtml(row.answer)}</span></p>`:'';
      const evidence=row.elements.length?`<p class="roleplay-recap-evidence"><strong>良かったところ</strong>${escapeHtml(row.coaching.observed)}<small>教材で確認できた点：${row.elements.map(escapeHtml).join('・')}</small></p>`:
        `<p class="roleplay-recap-evidence"><strong>${row.confirmed?'良かったところ':'今回の確認'}</strong>${row.confirmed?escapeHtml(row.coaching.observed):'例文を見て学習。自力で伝わったかはまだ判定していないよ。'}</p>`;
      const examples=`<p><strong>参考表現（唯一の正解ではないよ）</strong> <span lang="en">${escapeHtml(row.example)}</span></p>${row.alternative?`<p><strong>別の伝え方</strong> <span lang="en">${escapeHtml(row.alternative)}</span></p>`:''}`;
      const examplePanel=row.confirmed?`<details class="roleplay-recap-examples"><summary>参考表現・別の言い方を確認</summary>${examples}</details>`:examples;
      return `<li class="roleplay-recap-turn" data-recap-status="${row.status}"><strong>${index+1}. ${escapeHtml(row.scene)} <span>${row.label}</span></strong>${spoken}${evidence}<div class="roleplay-recap-coaching"><p><strong>この場面のコツ</strong>${escapeHtml(row.coaching.why)}</p><p><strong>次に試すこと</strong>${escapeHtml(row.next)}</p></div>${row.response?`<p class="roleplay-recap-reaction"><strong>${escapeHtml(row.responseLabel)}</strong><span lang="en">${escapeHtml(row.response)}</span></p>`:''}${examplePanel}</li>`;
    }).join('');
    const track=recap.rows.map((row,index)=>`<div data-recap-status="${row.status}"><strong>${index+1}</strong><span>${row.label}</span></div>`).join('');
    return `<section class="roleplay-result"><span class="tiny-caps">CONVERSATION RECAP</span><h3>${recap.independent} / ${recap.rows.length}ターンを自力で返答</h3><div class="roleplay-recap-track" aria-label="会話の3ターンの到達状況">${track}</div><p>ヒントあり ${recap.hinted} · 例文で確認 ${recap.skipped}</p><div class="roleplay-coaching-card"><strong>${escapeHtml(recap.headline)}</strong><p>${escapeHtml(recap.summary)}</p></div>${roleplayTransferHtml(transfer)}<div class="roleplay-coaching-card focus"><strong>次回のミッション</strong><p>${escapeHtml(recap.next)}</p>${recap.focus?`<span lang="en">${escapeHtml(recap.focus.example)}</span>`:''}</div><h4 class="roleplay-recap-heading">3ターンをふりかえる</h4><ol class="roleplay-recap-list" aria-label="会話3ターンの振り返り">${turns}</ol><small>相手の反応は教材で用意した分岐だよ。表示した英文はセーブデータに保存されず、発音評価やAI自由会話の採点ではありません。</small></section>`;
  })():'';
  // The fresh seal is a headline reward: do not bury it in the collapsed
  // detailed medal report, where mobile players never see it.
  let trialAwardRegion=$('#result-trial-award');
  if(!trialAwardRegion){
    trialAwardRegion=document.createElement('div');trialAwardRegion.id='result-trial-award';
    $('#result-detail-panel').before(trialAwardRegion);
  }
  trialAwardRegion.hidden=!evolutionTrial;
  trialAwardRegion.innerHTML=evolutionTrial;
  $('#result-discoveries').innerHTML=medalDisplay+newRelics+tradableLoot+(tradableLoot?'<button type="button" id="result-visit-armory" class="button button-primary">お宝を売って武器ガチャへ</button>':'')+memories+roleplayResult;
  $('#result-visit-armory')?.addEventListener('click',()=>renderCollection());
  wireRoleplayTransfer(transfer);
  renderDungeonLearningReport(ended);
  let targetedReview=$('#result-targeted-review');
  if(!targetedReview){
    targetedReview=document.createElement('button');
    targetedReview.type='button';targetedReview.id='result-targeted-review';
    $('#result-detail-panel').before(targetedReview);
    targetedReview.addEventListener('click',()=>startSession('dungeon-review'));
  }
  targetedReview.hidden=ended.mode!=='forest'||lastDungeonReviewIds.length===0;
  targetedReview.textContent=`今回つまずいた${lastDungeonReviewIds.length}問を復習する →`;
  if(forestFinished&&!ended.forestRelics.length)$('#result-description').textContent+=' 今回は新しい宝物はなかったけど、英語の練習は積み重なった！';
  const nextArea=forestFinished&&!ended.endless?nextDungeonArea(save):null;
  const canContinue=Boolean(nextArea&&nextArea.id!==ended.areaId&&unlockedDungeonAreas(save).some(area=>area.id===nextArea.id));
  const canRetry=ended.mode==='forest'&&defeated;
  const canResumeReview=ended.mode==='retention'&&retentionOverview(save,dayKey()).due.length>0;
  renderDungeonVictoryRecap(ended,{nextArea,canContinue});
  const quickResult=$('#result-quick-summary');
  quickResult.hidden=forestFinished;
  quickResult.textContent=ended.mode==='forest'
    ?`今回の獲得 ＋${ended.earnedXp} XP · 仲間 ${save.ownedMonsters.length}体${ended.tactics&&ended.bestCombo>=2?` · 最高 ${ended.bestCombo} CHAIN`:''}`
    :`${ended.roleplay?'自力で返答':ended.mode==='listening'?'自力で聞き取れた':'自力で正解'} ${ended.smooth}/${ended.index} · ＋${ended.earnedXp} XP${ended.dailyGoldAward?` · ＋${ended.dailyGoldAward} G`:''}`;
  $('#result-detail-panel').open=false;
  $('#result-detail-panel > summary').textContent=ended.roleplay?'会話の振り返り・参考表現を見る':ended.mode==='saved'?'復習の詳しい記録を見る':'報酬と学習記録を見る';
  $('#result-next-panel').hidden=!canContinue&&!canRetry&&!canResumeReview;
  if(canContinue){
    $('#result-next-message').textContent='次のエリアが解放されたよ！';
    $('#result-next').textContent=`次へ：${nextArea.name}`;
    $('#result-next').onclick=()=>ended.quickStart?startMainDungeon(nextArea.id):startSession(ended.tactics?'forest-tactics':'forest',nextArea.id);
  }else if(canResumeReview){
    const remain=retentionOverview(save,dayKey()).due.length;
    $('#result-next-message').textContent=`未確認の復習があと${remain}問あるよ`;
    $('#result-next').textContent='残りの定着チェックを続ける';
    $('#result-next').onclick=()=>startSession('retention');
  }else if(canRetry){
    $('#result-next-message').textContent='ここまでの経験を生かして、もう一度！';
    $('#result-next').textContent='同じエリアに再挑戦する';
    $('#result-next').onclick=()=>ended.quickStart?startMainDungeon(ended.areaId):startSession(ended.tactics?'forest-tactics':'forest',ended.areaId);
  }else $('#result-next').onclick=null;
  $('#result-collection').classList.toggle('button-ghost',canContinue||canRetry||canResumeReview);
  $('#result-collection').classList.toggle('button-primary',!canContinue&&!canRetry&&!canResumeReview);
  const growthAction=resultGrowthActionFor(save,ended.companionId);
  $('#result-collection').dataset.growthId=growthAction.id;
  $('#result-collection').textContent=growthAction.label;
  $('#replay-run').hidden=canRetry||Boolean($('#victory-medal-retry'));
  $('#replay-run').textContent=ended.roleplay?'この会話にもう一度挑戦':ended.mode==='skill-focus'?SKILL_LABELS[ended.focusKind]+'をもう一度':ended.mode==='transfer-review'?'別の表現も練習する':ended.mode==='daily'?'今日の5分をもう一度':ended.mode==='forest'?(dungeonAreaFor(ended.areaId)?.world==='ruins'?'星影の遺跡へもう一度挑戦':dungeonAreaFor(ended.areaId)?.world==='city'?'雪灯りの街へもう一度挑戦':'森をもう一度探検する'):ended.mode==='challenge'?'もう一度60秒に挑む':'別の表現も練習する';
  $('#replay-run').onclick=()=>ended.quickStart?startMainDungeon(ended.areaId):startSession(ended.endless?'forest-endless':ended.tactics?'forest-tactics':ended.mode==='transfer-review'?'speaking':ended.mode,ended.mode==='skill-focus'?ended.focusKind:ended.roleplay?.id||ended.areaId);
  showView('result');
}
const collectionViews=createCollectionViews({getSave:()=>save,persist,showView,stopAudio,onStartAdventure:()=>startMainDungeon()});
const {renderDetail,renderTraining}=collectionViews;
let forgeMessage='';
let drawNextSummon=()=>null;
let drawNextTenSummons=()=>null;
let shopInfoOpen=false;
const equipmentView={rarity:'all',affinity:'all',sort:'attack'};
let equipmentFiltersOpen=false;
let shopCatalogOpen=false;
const gachaCinematic=createGachaCinematic({
 onEquip:weapon=>{
  if(!persist(equipWeapon(save,weapon.id)))return false;
  renderEquipmentCollection();syncGameHud();return true;
 },
 onShowEquipment:()=>openEquipment(),
 onPlayWithWeapon:()=>startMainDungeon(),
 onRepeat:()=>drawNextSummon(),
 onRepeatTen:()=>drawNextTenSummons()
});
function gachaCatalogHtml(save,weapons){
 const inventory=new Set(save.weaponInventory||[]);
 const sections=['common','rare','epic','legend'].map(tier=>{
  const rows=weapons.filter(weapon=>weapon.rarity===tier);
  const found=rows.filter(weapon=>inventory.has(weapon.id)).length;
  return `<section class="shop-catalog-tier"><h4>${WEAPON_RARITY_LABELS[tier]} <span>${found} / ${rows.length}</span></h4><div class="shop-catalog-grid">${rows.map(weapon=>{
   const owned=inventory.has(weapon.id);
   const rank=owned?awakeningProgress(save,weapon.id).visualRank:0;
   return `<article class="shop-catalog-card${owned?' is-found':' is-mystery'}" data-catalog-rarity="${tier}">
     <div class="shop-catalog-image" aria-hidden="true">${owned?summonWeaponArtwork({...weapon,awakeningRank:rank},{instance:`shop-catalog-${weapon.id}`,decorative:true}):'<span class="shop-unknown-weapon">?</span>'}</div>
     <strong>${owned?escapeHtml(weapon.name):'？？？'}</strong>
     <small>${owned?`攻撃＋${weaponAttack(save,weapon)} · ${escapeHtml(weaponEffectDescription(save,weapon))}`:'未発見'}</small>
    </article>`;
  }).join('')}</div></section>`;
 }).join('');
 return sections;
}
function renderEconomyShop(){
 const panel=$('#collection-shop');
 const bag=save.treasureBag||{};
 const goods=TREASURES.filter(item=>bag[item.id]>0);
 const totalValue=treasureValue(save);
 panel.dataset.needsSale=String((save.coins||0)<GACHA_COST&&totalValue>0);
 const nextGacha=summonProgress(save);
 const odds=gachaPoolSummary();
 const pity=summonPityProgress(save);
 const featured=WEAPONS.filter(weapon=>weapon.source==='gacha');
 const ownedDraws=featured.filter(weapon=>save.weaponInventory?.includes(weapon.id)).length;
 const discovery=weaponDiscoveryProgress(save);
 panel.innerHTML=`${gachaTestMode?'<div class="gacha-qa-notice" role="status"><strong>ガチャ体験テスト</strong><span>テスト専用の2,400 Gで10連と単発を確認できます。通常の冒険データとは別に保存されます。</span><button type="button" id="gacha-test-refill">テスト用2,400 Gを補充</button></div>':''}<div class="shop-heading"><h2>武器ガチャ</h2></div>
 <button type="button" id="shop-open-inventory" class="shop-open-inventory">装備をみる <span>${save.weaponInventory?.length||0}件</span></button>
 <div class="shop-wallet"><span>ゴールド</span><strong id="shop-coins">${save.coins||0} G</strong>${totalValue?`<small>お宝 ${totalValue} G</small>`:''}</div>
 <div class="shop-bag" data-has-loot="${totalValue>0}"><div class="shop-section-heading"><strong>お宝を売る</strong><button type="button" id="shop-sell-all" ${totalValue===0?'disabled':''}>まとめて売る</button></div>${goods.length?goods.map(item=>`<div class="shop-good"><span><strong>${escapeHtml(item.name)} ×${bag[item.id]}</strong><small>1個 ${item.price} G</small></span><button type="button" data-sell-treasure="${item.id}">1個売る</button></div>`).join(''):'<p class="shop-empty">お宝は冒険で手に入ります</p>'}</div>
 <div class="shop-gacha"><div class="shop-section-heading"><strong>武器ガチャ</strong><span class="shop-price">1回 ${GACHA_COST} G</span></div><div class="summon-banner" aria-hidden="true"><span class="summon-banner-ring"></span><span class="summon-banner-title">WEAPON<br><b>GACHA</b></span><span class="summon-banner-spark"></span></div>
 <div class="shop-collection-track" aria-label="限定武器の収集状況"><div class="shop-collection-copy"><strong>WEAPON COLLECTION</strong><span>入手 ${ownedDraws} / ${featured.length} 種</span></div><div class="shop-collection-meter" role="progressbar" aria-label="限定武器の収集率" aria-valuemin="0" aria-valuemax="${featured.length}" aria-valuenow="${ownedDraws}"><span style="width:${Math.round(ownedDraws*100/featured.length)}%"></span></div><small>${discovery.next?`次の図鑑報酬まであと ${discovery.remaining} 種 · ${discovery.next.gold} G`:'全武器を発見・図鑑完成'}</small></div>
 <div class="shop-draw-options"><button type="button" id="shop-draw" class="button button-primary" ${(save.coins||0)<GACHA_COST?'disabled':''}><span class="shop-draw-label">1回ガチャ</span><span class="shop-draw-caption">${GACHA_COST} G</span></button><button type="button" id="shop-draw-ten" ${(save.coins||0)<GACHA_TEN_PULL_COST?'disabled':''}><span class="shop-draw-label">10連ガチャ</span><span class="shop-draw-caption">${GACHA_TEN_PULL_COST} G</span></button></div>
 ${nextGacha.missing>0?`<div class="shop-next-adventure"><span>あと <strong>${nextGacha.missing} G</strong> で1回ガチャ</span><button id="shop-go-quest" type="button">冒険でお宝を集める</button></div>`:''}
 <p class="shop-gacha-result" id="shop-gacha-result" role="status" aria-live="polite">${escapeHtml(forgeMessage||'')}</p>
 <details class="shop-gacha-disclosure shop-catalog-disclosure" id="shop-gacha-catalog" ${shopCatalogOpen?'open':''}><summary>武器図鑑 <span>発見 ${ownedDraws}/${featured.length} 種</span></summary><div class="shop-gacha-disclosure-content"><p>入手した武器だけ、名前・姿・性能を公開します。</p>${gachaCatalogHtml(save,featured)}<div class="shop-discovery-rewards"><strong>発見報酬</strong><div>${WEAPON_DISCOVERY_REWARDS.map(reward=>`<span class="${ownedDraws>=reward.count?'is-earned':''}">${reward.count}種 · ${reward.gold} G ${ownedDraws>=reward.count?'獲得済み':''}</span>`).join('')}</div></div></div></details>
 <details class="shop-gacha-disclosure" id="shop-gacha-details" ${shopInfoOpen?'open':''}><summary>ガチャの詳細 <span>排出率・確定枠・ルール</span></summary><div class="shop-gacha-disclosure-content"><p>限定武器全 ${featured.length} 種。重複した武器は色と追撃効果が変化。攻撃力は上位レアリティを追い越せません。</p>
 <div class="shop-odds">${odds.map(item=>`<span data-tier="${item.rarity}">${WEAPON_RARITY_LABELS[item.rarity]} ${item.odds}%<small>${item.count}種</small></span>`).join('')}</div>
 <div class="shop-pity-tracks" aria-label="レアリティ確定までの最長回数"><div class="shop-pity-row"><div class="shop-pity-copy"><strong>RARE+ 確定</strong><span>最大あと ${pity.rare.remaining} 回 · ${pity.rare.current} / ${pity.rare.limit}</span></div><div class="shop-pity-meter" role="progressbar" aria-label="レア以上の確定までのガチャ記録" aria-valuemin="0" aria-valuemax="${pity.rare.limit}" aria-valuenow="${pity.rare.current}"><span style="width:${pity.rare.percent}%"></span></div></div><div class="shop-pity-row"><div class="shop-pity-copy"><strong>EPIC+ 確定</strong><span>最大あと ${pity.epic.remaining} 回 · ${pity.epic.current} / ${pity.epic.limit}</span></div><div class="shop-pity-meter" role="progressbar" aria-label="エピック以上の確定までのガチャ記録" aria-valuemin="0" aria-valuemax="${pity.epic.limit}" aria-valuenow="${pity.epic.current}"><span style="width:${pity.epic.percent}%"></span></div></div></div>
 <p class="shop-pity">早めにレア武器が出た場合は対応する確定カウントがリセットされます。重複すると20〜90 Gを返還し、欠片が1個増えます。欠片を1個入手した時点で色と追撃が変わり、覚醒すると次の変化を解放できます。</p><p>10連は単発10回と同じ抽選・確定カウントを使い、${GACHA_TEN_PULL_COST} Gを消費します。割引や別の確定枠はありません。</p><p>ゲーム内ゴールド専用。現金購入・課金ガチャ・換金はできません。装備によって英語の正誤判定・XP・ボスの必須3問は変わりません。</p></div></details></div>`;
 // Visual order and keyboard/tab order must agree. Put the draw first when
 // affordable; otherwise surface sellable loot before the disabled draw.
 const needsSale=panel.dataset.needsSale==='true';
 const priority=['.gacha-qa-notice','.shop-heading','.shop-wallet',
  ...(needsSale?['.shop-bag','.shop-gacha']:['.shop-gacha','.shop-bag']),
  '#shop-open-inventory'];
 for(const selector of priority){const element=panel.querySelector(selector);if(element)panel.append(element);}
 panel.querySelector('#shop-gacha-details')?.addEventListener('toggle',event=>{shopInfoOpen=event.currentTarget.open;});
 panel.querySelector('#shop-gacha-catalog')?.addEventListener('toggle',event=>{shopCatalogOpen=event.currentTarget.open;});
 const commitResult=(next,successMessage)=>{
  const previous=save;
  if(!persist(next)){
   // A failed save must not appear to spend G or grant a weapon in memory.
   save=previous;
   forgeMessage='保存に失敗しました。売却やガチャは反映していません。';
   renderEconomyShop();return false;
  }
  // Selling or summoning must not navigate away from the forge before the
  // player can equip the item they just earned. Returning home redraws art.
  forgeMessage=successMessage;renderEconomyShop();renderEquipmentCollection();syncGameHud();return true;
 };
 panel.querySelector('#shop-sell-all').addEventListener('click',()=>{
  const result=sellAllTreasures(save);
  if(result.coins>0)commitResult(result.save,`お宝を売って ${result.coins} G 手に入れた！`);
 });
 panel.querySelector('#shop-open-inventory')?.addEventListener('click',openEquipment);
 panel.querySelector('#shop-go-quest')?.addEventListener('click',()=>startMainDungeon());
 panel.querySelectorAll('[data-sell-treasure]').forEach(button=>button.addEventListener('click',()=>{
  const item=TREASURES.find(good=>good.id===button.dataset.sellTreasure);
  const result=sellTreasure(save,item?.id,1);
  if(result.coins>0)commitResult(result.save,`${item.name} を売って ${result.coins} G 手に入れた！`);
 }));
 const drawAndCommit=()=>{
  if((save.coins||0)<GACHA_COST)return null;
  const result=drawWeaponGacha(save);
  if(!result.weapon)return null;
  // Commit before animation, but keep the underlying live status generic:
  // revealing a name here would spoil the chest for screen-reader players.
  if(!commitResult(result.save,'ガチャ結果を保存しました。'))return null;
  return {...result,art:monsterArt(save.selectedMonster,getMonsterProgress(save).stage,result.weapon),
   affinity:WEAPON_AFFINITY_LABELS[result.weapon.affinity],canRepeat:(save.coins||0)>=GACHA_COST};
 };
 drawNextSummon=drawAndCommit;
 const drawTenAndCommit=()=>{
  if((save.coins||0)<GACHA_TEN_PULL_COST)return null;
  const result=drawWeaponGachaTen(save);
  if(result.error)return null;
  if(!commitResult(result.save,'10連ガチャの結果を保存しました。'))return null;
  return {...result,canRepeat:(save.coins||0)>=GACHA_TEN_PULL_COST};
 };
 drawNextTenSummons=drawTenAndCommit;
 panel.querySelector('#shop-draw').addEventListener('click',()=>{
  const result=drawAndCommit();if(result)gachaCinematic.show(result);
 });
 panel.querySelector('#gacha-test-refill')?.addEventListener('click',()=>{
  if(!persist({...save,coins:Math.min(999999,(save.coins||0)+2400)}))return;
  forgeMessage='テスト用ゴールドを補充しました。通常の冒険データには影響しません。';
  renderEconomyShop();syncGameHud();
 });
 panel.querySelector('#shop-draw-ten').addEventListener('click',()=>{
  const result=drawTenAndCommit();if(result)gachaCinematic.showBatch(result);
 });
}
function renderEquipmentCollection(){
 const panel=$('#collection-weapons');
 const current=equippedWeapon(save);
 const inventory=filteredWeaponInventory(save);
 panel.dataset.hasWeapons=String(inventory.length>0);
 const shown=filteredWeaponInventory(save,equipmentView);
 const awaken=current?awakeningProgress(save,current.id):null;
 const upcoming=current?nextWeaponResonancePreview(save,current.id):null;
 const cards=shown.map(weapon=>{
  const rank=awakeningProgress(save,weapon.id).visualRank;
  const isEquipped=weapon.id===current?.id;
  return `<article class="equipment-item${isEquipped?' is-equipped':''}" data-item-id="${weapon.id}" data-rarity="${weapon.rarity}">
   <div class="equipment-item-image" aria-hidden="true">${summonWeaponArtwork({...weapon,awakeningRank:rank},{instance:`inventory-${weapon.id}`,decorative:true})}</div>
   <div class="equipment-item-details"><span class="equipment-item-rarity">${WEAPON_RARITY_LABELS[weapon.rarity]}${weapon.shape?` · ${WEAPON_SHAPE_LABELS[weapon.shape]||'武器'}`:''}${rank?` · 共鳴 ${rank}/3`:''}</span><h3>${escapeHtml(weapon.name)}</h3>
    <dl><div><dt>攻撃</dt><dd>＋${weaponAttack(save,weapon)}</dd></div><div><dt>追加効果</dt><dd>${escapeHtml(weaponEffectDescription(save,weapon))}</dd></div></dl>
    ${weaponTechniqueDescription(weapon,save)?`<details class="equipment-item-technique"><summary>武器技</summary><p>${escapeHtml(weaponTechniqueDescription(weapon,save))}</p></details>`:''}
    <small>${weapon.source==='gacha'?'ガチャ限定':'冒険で入手'}</small>
   </div>
   <button type="button" data-equip-weapon="${weapon.id}" ${isEquipped?'disabled':''} aria-label="${escapeHtml(weapon.name)}を${isEquipped?'装備中':'装備する'}">${isEquipped?'装備中':'装備する'}</button>
  </article>`;
 }).join('');
 panel.innerHTML=`<div class="forest-treasures-heading"><h2>武器・装備</h2></div>
  <div class="equipment-current" aria-label="現在の出撃装備"><strong class="equipment-current-title" tabindex="-1">現在の出撃装備</strong>
   <div class="equipment-monster-preview" aria-label="現在の装備を身につけた仲間">${monsterArt(save.selectedMonster,getMonsterProgress(save).stage,current)}<span>${current?escapeHtml(current.name):'武器なし'}</span></div>
   <p id="equipment-weapon-status" role="status" data-rarity="${current?.rarity||'none'}">${current?`${WEAPON_RARITY_LABELS[current.rarity]} · 攻撃＋${weaponAttack(save,current)} · ${escapeHtml(weaponEffectDescription(save,current))}`:'武器を装備していません（攻撃＋0）'}</p>
   ${current&&weaponTechniqueDescription(current,save)?`<p class="equipment-current-technique">${escapeHtml(weaponTechniqueDescription(current,save))}</p>`:''}
   ${current?'<button type="button" id="equipment-unequip">装備を外す</button>':''}</div>
  <div class="equipment-item-list"><div class="equipment-item-list-heading"><strong>所持武器 <span>${inventory.length}</span> / ${WEAPONS.length}</strong><span>装備中を先頭に表示</span></div>
   ${inventory.length>1?`<details class="equipment-filter-disclosure" id="equipment-filters" ${equipmentFiltersOpen?'open':''}><summary>絞り込み・並び替え <span>表示 ${shown.length}/${inventory.length} 件</span></summary><div class="equipment-filter-controls">
    <label>レア度<select id="equipment-filter-rarity"><option value="all">すべて</option>${Object.entries(WEAPON_RARITY_LABELS).map(([key,label])=>`<option value="${key}" ${equipmentView.rarity===key?'selected':''}>${label}</option>`).join('')}</select></label>
    <label>得意分野<select id="equipment-filter-affinity"><option value="all">すべて</option>${Object.entries(WEAPON_AFFINITY_LABELS).map(([key,label])=>`<option value="${key}" ${equipmentView.affinity===key?'selected':''}>${label}</option>`).join('')}</select></label>
    <label>並び順<select id="equipment-filter-sort"><option value="attack" ${equipmentView.sort==='attack'?'selected':''}>攻撃力順</option><option value="resonance" ${equipmentView.sort==='resonance'?'selected':''}>共鳴順</option><option value="recent" ${equipmentView.sort==='recent'?'selected':''}>最近入手順</option></select></label>
   </div></details>`:''}
   <div class="equipment-item-grid">${cards||(inventory.length?' <p class="equipment-item-empty">条件に合う武器がありません。</p>':'<p class="equipment-item-empty">武器はまだありません。冒険やガチャで入手できます。</p>')}</div></div>
  <div class="equipment-select-sync"><label for="equipment-weapon-choice">武器選択</label><select id="equipment-weapon-choice"><option value="">武器なし · 攻撃＋0</option>${inventory.map(weapon=>`<option value="${weapon.id}" ${weapon.id===current?.id?'selected':''}>${escapeHtml(weapon.name)} · 攻撃＋${weaponAttack(save,weapon)} · ${WEAPON_RARITY_LABELS[weapon.rarity]}</option>`).join('')}</select></div>
  ${current&&!awaken.canAwaken?`<details class="equipment-awakening-more"><summary>武器覚醒 <span>${awaken.maxed?'MAX':`欠片 ${awaken.shards}/${awaken.requirement}`}</span></summary>`:''}
  <section class="weapon-awakening" aria-label="重複武器で覚醒" ${current?'':'hidden'}><div class="weapon-awakening-heading"><strong>武器覚醒</strong><span>${current?`覚醒 ${awaken.rank} / 3`:'装備武器を選択'}</span></div>
    <p>同じ武器を引くと色と追撃が変化。欠片を集めて覚醒すると変化が定着し、次の段階へ進めます（最大3段階）。レア度の強さは逆転しません。</p>
    ${current?`<div class="weapon-awakening-track"><span>欠片 ${awaken.shards} ${awaken.maxed?'· MAX':`/ ${awaken.requirement}`}</span><div class="weapon-awakening-meter"><span style="width:${awaken.maxed?100:Math.min(100,Math.round(100*awaken.shards/awaken.requirement))}%"></span></div></div><button type="button" id="weapon-awaken" ${awaken.canAwaken?'':'disabled'}>${awaken.maxed?'最大覚醒に到達':awaken.canAwaken?'欠片を使って覚醒する':`覚醒まであと ${awaken.requirement-awaken.shards} 個`}</button>${upcoming?`<details class="weapon-resonance-preview"><summary>次の共鳴で変わる効果</summary><p>共鳴 ${upcoming.rank}/3 · ${escapeHtml(upcoming.effect)}</p>${upcoming.technique?`<p>武器技：${escapeHtml(upcoming.technique)}</p>`:''}</details>`:''}`:'<small>武器を装備すると、覚醒に必要な欠片を確認できます。</small>'}
  </section>${current&&!awaken.canAwaken?'</details>':''}`;
 // An actionable awakening belongs beside the companion. A locked awakening
 // is optional reference material after the weapon cards, not a dead-end CTA.
 const awakening=panel.querySelector('.equipment-awakening-more')||panel.querySelector('.weapon-awakening');
 if(awaken?.canAwaken)panel.querySelector('.equipment-current')?.after(awakening);
 else panel.querySelector('.equipment-item-list')?.after(awakening);
 if(!inventory.length){
  const go=document.createElement('button');
  go.type='button';go.id='equipment-go-gacha';go.className='equipment-empty-cta';go.textContent='武器ガチャへ ›';
  go.addEventListener('click',openForge);
  panel.querySelector('.equipment-item-list')?.append(go);
 }
 panel.querySelector('#equipment-filters')?.addEventListener('toggle',event=>{
  // A rerender can detach this disclosure before its deferred toggle fires.
  // Ignore stale events instead of closing the freshly rendered filters.
  if(event.currentTarget.isConnected)equipmentFiltersOpen=event.currentTarget.open;
 });
 for(const [id,key] of [['equipment-filter-rarity','rarity'],['equipment-filter-affinity','affinity'],['equipment-filter-sort','sort']]){
  panel.querySelector(`#${id}`)?.addEventListener('change',event=>{
   equipmentView[key]=event.target.value;
   // Preserve the open state even if the initial summary toggle is still queued.
   equipmentFiltersOpen=true;
   renderEquipmentCollection();
   panel.querySelector(`#${id}`)?.focus({preventScroll:true});
  });
 }
 const equip=id=>{
  if(!persist(equipWeapon(save,id)))return false;
  renderEquipmentCollection();syncGameHud();
  panel.querySelector('.equipment-current-title')?.focus({preventScroll:true});
  return true;
 };
 panel.querySelectorAll('[data-equip-weapon]').forEach(button=>button.addEventListener('click',()=>equip(button.dataset.equipWeapon)));
 panel.querySelector('#equipment-unequip')?.addEventListener('click',()=>equip(null));
 panel.querySelector('#equipment-weapon-choice').addEventListener('change',event=>{
   const id=event.target.value||null;
   if(!equip(id))event.target.value=equippedWeapon(save)?.id||'';
 });
 panel.querySelector('#weapon-awaken')?.addEventListener('click',()=>{
  const result=awakenWeapon(save,current?.id);
  if(!result.awakened||!persist(result.save))return;
  renderEquipmentCollection();syncGameHud();
  const status=$('#equipment-weapon-status');
  status.textContent=`覚醒成功：${current.name} · 覚醒 ${result.rank}/3。色と追加効果の進行状況を更新しました。`;
 });
}
function renderCollection(){
 document.body.dataset.gameTab='party';
 document.body.dataset.collectionFocus='roster';
 collectionViews.renderCollection();renderEconomyShop();renderEquipmentCollection();syncGameTabs();
}
function jumpToCollectionSection(selector){
 const section=$(selector);
 if(!section)return;
 const jump=()=>{if(!$('#collection-view').hidden)section.scrollIntoView({block:'start',behavior:'instant'});};
 // showView resets the prior page's scroll while the new view is entering.
 // Reapply after layout, especially on narrow iPhone-sized screens.
 jump();requestAnimationFrame(jump);
}
function openForge(){
 renderCollection();document.body.dataset.gameTab='forge';document.body.dataset.collectionFocus='gacha';syncGameTabs();
 jumpToCollectionSection('#collection-shop');
}
function openEquipment(){
 document.body.dataset.collectionFocus='equipment';
 const back=$('#collection-equipment-back');
 back.hidden=false;
 back.textContent=document.body.dataset.gameTab==='forge'?'← ガチャに戻る':'← 仲間に戻る';
 jumpToCollectionSection('#collection-equipment-back');
}
$('#collection-equipment-back').addEventListener('click',()=>{
 if(document.body.dataset.gameTab==='forge')openForge();
 else {renderCollection();jumpToCollectionSection('.collection-sortbar');}
});
$('#collection-open-equipment').addEventListener('click',()=>{
 openEquipment();
});

$$('[data-difficulty]').forEach(button => button.addEventListener('click', () => {
  persist(chooseDifficulty(save, button.dataset.difficulty));
  renderDifficulty();
}));
$$('[data-roleplay-level]').forEach(button=>button.addEventListener('click',()=>{
  persist(chooseDifficulty(save,button.dataset.roleplayLevel));
  renderDifficulty();
}));
$$('[data-dungeon-level]').forEach(button=>button.addEventListener('click',()=>{
  persist(chooseDifficulty(save,button.dataset.dungeonLevel));
  renderDifficulty();
  renderHome();
  homeNavigation?.showPage('forest');
  $('#dungeon-other-modes').open=true;
}));
$$('[data-start]').forEach(button=>button.addEventListener('click',()=>startSession(button.dataset.start)));
$$('[data-roleplay]').forEach(button=>button.addEventListener('click',()=>startSession('roleplay',button.dataset.roleplay)));
$('#start-forest').addEventListener('click',()=>startMainDungeon());
$('#start-forest-simple').addEventListener('click',()=>startSession('forest'));
$('#start-forest-tactics').addEventListener('click',()=>startSession('forest-tactics'));
$('#start-forest-endless').addEventListener('click',()=>startSession('forest-endless'));
$('#start-review-practice').addEventListener('click',()=>startSession('practice'));
$('#start-saved-review').addEventListener('click',()=>startSession('saved'));
$('#start-due-saved-review').addEventListener('click',()=>startSession('saved',null,true));
$('#start-daily-gym').addEventListener('click',()=>startSession('daily'));
$('#start-retention-review').addEventListener('click',()=>startSession('retention'));
$('#skill-growth-list').addEventListener('click',event=>{const button=event.target.closest('[data-skill-start]');if(button&&SKILL_KINDS.includes(button.dataset.skillStart))startSession('skill-focus',button.dataset.skillStart);});
homeNavigation=setupHomeNavigation({home:$('#home-view'),startMode:mode=>mode.startsWith('skill-focus:')?startSession('skill-focus',mode.slice('skill-focus:'.length)):mode==='retention-quick'?startSession('retention',null,false,false,null,{reviewLimit:3}):mode==='forest'?startMainDungeon(null,{skipOpening:true}):mode==='armory'?openForge():mode==='saved-due'?startSession('saved',null,true):mode==='growth'?renderCollection():startSession(mode),showCollection:()=>renderCollection()});
$$('#game-tabs [data-game-tab]').forEach(button=>button.addEventListener('click',()=>{
 const target=button.dataset.gameTab;
 if(target==='adventure'){startMainDungeon(null,{skipOpening:true});return;}
 if(target==='forge'){openForge();return;}
 if(target==='party'){
  renderCollection();
  // This tab is labelled "仲間": land on the usable party, not the armory.
  // Players can jump back to equipment through the adjacent explicit button.
  jumpToCollectionSection('.collection-sortbar');
  return;
 }
 renderHome();
 if(target==='review')homeNavigation.showPage('review');
 document.body.dataset.gameTab=target;syncGameTabs();
}));
$('.game-topbar .brand')?.addEventListener('click',event=>{event.preventDefault();renderHome();});
$('#open-dungeon-tutorial').addEventListener('click',()=>homeNavigation.openTutorial('basic'));
$('#start-practice-battle').addEventListener('click',()=>homeNavigation.startPracticeBattle());
$('#open-battle-guide').addEventListener('click',()=>homeNavigation.openTutorial(play?.tactics?'battle':'basic'));
$('#forest-explore-continue').addEventListener('click',()=>{
  if(play?.mode!=='forest'||!$('#play-view').classList.contains('forest-exploring')||!$('#forest-explore-options').hidden)return;
  cancelAutoAdvance();
  if(play.tactics?.formationPending){
    const t=play.tactics,ids=t.formationIds;
    if(!ids.length)return;
    if(!persist({...save,selectedMonster:ids[0],battleFormation:[...ids]})){
      t.formationMessage='編成を保存できませんでした。端末の保存設定を確認してね。';
      renderPartyFormation();return;
    }
    t.party=createTrainedBattleParty(ids);
    play.companionId=ids[0];syncActiveFighter();
    t.ultimate=formationResonance(ids,Object.fromEntries(ids.map(id=>[id,getMonsterProgress(save,id).level]))).openingCharge;
    t.formationPending=false;
    $('#forest-party-formation').hidden=true;
  }
  renderQuestion();
});
$('#open-collection').addEventListener('click',()=>renderCollection());
$('#open-wallet').addEventListener('click',()=>renderCollection());
$('#leave-play').addEventListener('click',()=>{
 if(play&&!window.confirm('今の挑戦を中断してホームへ戻る？\n\n途中の戦闘や問題の進み具合は失われます。すでに獲得したXP・保存した問題は残るよ。'))return;
 if(play)betaTelemetry.track('monsters_beta_end',{...betaSessionFields(play),outcome:'quit'});
 cancelAutoAdvance();clearTimer();stopAudio();play=null;
 $('#play-view').classList.remove('forest-active','review-only');renderHome();
});
$('#result-home').addEventListener('click',renderHome);
$('#result-companion-reveal').addEventListener('click',event=>{
  const useButton=event.target.closest('[data-result-use-companion]');
  if(useButton){
    const id=useButton.dataset.resultUseCompanion;
    if(!save.ownedMonsters.includes(id))return;
    const previous=save;
    if(!persist(selectMonster(save,id))){
      save=previous;
      useButton.textContent='保存できませんでした。設定を確認してね';
      return;
    }
    $$('[data-result-use-companion]').forEach(button=>{
      const selected=button.dataset.resultUseCompanion===id;
      button.textContent=selected?'次の冒険にセット済み':'次の冒険で使う';
      button.setAttribute('aria-pressed',String(selected));
      button.closest('.companion-reveal-card')?.classList.toggle('is-selected',selected);
    });
    const growth=resultGrowthActionFor(save,id);
    $('#result-collection').dataset.growthId=growth.id;
    $('#result-collection').textContent=growth.label;
    return;
  }
  const button=event.target.closest('[data-result-companion]');
  if(button&&save.ownedMonsters.includes(button.dataset.resultCompanion))renderDetail(button.dataset.resultCompanion);
});
$('#result-collection').addEventListener('click',()=>{
  const id=$('#result-collection').dataset.growthId;
  if(id&&save.ownedMonsters.includes(id))renderTraining(id);
  else renderCollection();
});
$('#result-feedback').addEventListener('click',()=>{
 $('#beta-feedback-disclosure').open=true;
 $('#beta-feedback').scrollIntoView({behavior:'smooth',block:'start'});
});
$('#collection-home').addEventListener('click',renderHome);
// Keep progression portable between Cloudflare preview URLs and iOS browsers.
// Imported saves are strictly validated before anything replaces the current one.
function downloadUnreadableSave(raw,suffix,successMessage='元データを書き出したよ。読み込めない形式のため、今すぐ復元することはできません。大切に保管してね。'){
  const status=$('#save-transfer-status');
  if(raw===null){status.textContent='元のセーブを取り出せませんでした。ブラウザの保存設定を確認してね。';return;}
  try{
    const url=URL.createObjectURL(new Blob([raw],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;
    link.download=`speakingym-monsters-${suffix}-${dayKey()}.json`;
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    status.textContent=successMessage;
  }catch{status.textContent='ファイルに保存できませんでした。別のブラウザで試すか、ブラウザの保存設定を確認してね。';}
}
$('#save-recovery-download').addEventListener('click',()=>{
  let raw=null;
  try{raw=unreadableSaveForDownload(gameStorage,unreadableSaveStatus);}catch{}
  downloadUnreadableSave(raw,'recovery');
});
$('#save-recovery-archive-download').addEventListener('click',()=>{
  let raw=null;
  try{raw=conflictingArchiveForDownload(gameStorage,unreadableSaveStatus);}catch{}
  downloadUnreadableSave(raw,'earlier-recovery');
});
$('#save-conflict-latest-download').addEventListener('click',()=>{
  let raw=null;
  try{raw=gameStorage.getItem(STORAGE_KEY);}catch{}
  downloadUnreadableSave(raw,'other-tab','別のタブで保存されたセーブを書き出したよ。このタブの記録も別に保存してから、どちらを復元するか選んでね。');
});
$('#save-recovery-reset').addEventListener('click',()=>{
  if(unreadableSaveStatus!=='blocked')return;
  if(!window.confirm('読み込めなかった元のセーブを上書きします。元データを先にファイルへ保存したことを確認してください。最初からやり直しますか？'))return;
  const previous=save;
  if(!persist(createSave(),{replaceUnreadable:true})){
    save=previous;
    $('#save-transfer-status').textContent='保存できず、元のセーブは上書きしていません。';return;
  }
  renderHome();homeNavigation?.showPage('save');$('#save-transfer').open=true;
  $('#save-transfer-status').textContent='新しい記録で始められるよ。';
});
function downloadCurrentSave(status){
  status.hidden=false;
  try{
    const blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=`speakingym-monsters-save-${dayKey()}.json`;
    document.body.append(link);
    link.click();link.remove();
    // Give iPhone Safari time to hand the download to its Files interface.
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    status.textContent='セーブファイルを書き出したよ。iPhoneなら「ファイル」のダウンロード先を確認してね。';
  }catch{
    status.textContent='ファイル保存が使えません。セーブのコピーを試してね。';
  }
}
async function copyCurrentSave(field,status,{emergency=false}={}){
  const backup=JSON.stringify(save);
  field.value=backup;
  status.hidden=false;
  try{
    await navigator.clipboard.writeText(backup);
    if(emergency)field.hidden=true;
    status.textContent='今のセーブをコピーしたよ。メモなどに貼り付けて保管してね。';
  }catch{
    field.hidden=false;
    field.focus({preventScroll:true});field.select();
    status.textContent='コピーが自動でできない環境だよ。下の選択されたデータを手動でコピーして保管してね。';
  }
}
$('#save-download').addEventListener('click',()=>downloadCurrentSave($('#save-transfer-status')));
$('#save-warning-download').addEventListener('click',()=>downloadCurrentSave($('#save-warning-status')));
$('#save-warning-copy').addEventListener('click',()=>copyCurrentSave($('#save-warning-copy-text'),$('#save-warning-status'),{emergency:true}));
$('#save-export').addEventListener('click',()=>{
  return copyCurrentSave($('#save-import'),$('#save-transfer-status'));
});
$('#save-import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0],field=$('#save-import'),status=$('#save-transfer-status');
  if(!file)return;
  field.value='';
  if(file.size>300000||!file.name.toLowerCase().endsWith('.json')){
    status.textContent='300KB以下のセーブ用 .json ファイルを選んでね。今の記録は変更していません。';
    return;
  }
  try{
    const contents=await file.text();
    if(!validateSave(JSON.parse(contents)))throw Error('invalid save');
    // Import is staged only. The existing confirmation and safe persistence
    // path below is the sole way to overwrite a user's current progress.
    field.value=contents;
    status.textContent='セーブファイルを読み込んだよ。まだ復元していません。下の「復元」を押すと内容を確認できるよ。';
  }catch{
    status.textContent='セーブを読み込めませんでした。Speakingym Monstersの正しい保存ファイルか確認してね。';
  }
});
$('#save-import-button').addEventListener('click',()=>{
  const field=$('#save-import'),status=$('#save-transfer-status');
  let restored=null;
  try{
    if(field.value.length>300000)throw Error('too long');
    restored=validateSave(JSON.parse(field.value));
  }catch{/* invalid content */}
  if(!restored){status.textContent='正しいセーブデータではないよ。コピーした内容を全部貼り付けてね。';return;}
  const currentAreas=save.forest?.completedAreas?.length||0;
  const incomingAreas=restored.forest?.completedAreas?.length||0;
  const message='今のセーブを上書きします。\n\n'
    +`今：仲間${save.ownedMonsters.length}体・クリア${currentAreas}エリア\n`
    +`復元後：仲間${restored.ownedMonsters.length}体・クリア${incomingAreas}エリア\n\n`
    +'今の記録に戻せなくなるため、必要なら先に「今のセーブをコピー」してね。続けますか？';
  if(!window.confirm(message))return;
  const previous=save;
  if(!persist(restored,{replaceUnreadable:true})){
    save=previous; // Failed writes must never replace the active save in memory.
    status.textContent=storageConflict
      ?'別のタブの新しいセーブを守るため復元を止めたよ。両方の記録をファイルに保存して、新しく開いたタブでやり直してね。'
      :'保存領域に書き込めず、復元できなかったよ。今の記録はそのままです。';
    return;
  }
  field.value='';
  $('#save-import-file').value='';
  renderHome();
  // Keep the restore result visible instead of sending the player to the home menu.
  homeNavigation?.showPage('save');
  $('#save-transfer').open=true;
  status.textContent='復元できたよ。図鑑でも進化状態を確認してね。';
  status.scrollIntoView({block:'center',behavior:'instant'});
});
persist(save);
window.addEventListener('storage',event=>{
  if(event.key!==currentStorageKey||event.newValue===lastStoredSaveRaw)return;
  storageConflict=true;
  syncUnreadableSaveUI();
});
window.addEventListener('pagehide',()=>{
  cancelAutoAdvance();cancelPendingSpeech();pauseInterruptedListening();
});
$('#battle-sound-toggle').addEventListener('click',()=>{
  const button=$('#battle-sound-toggle');
  const enabled=battleSounds.setEnabled(!battleSounds.isEnabled());
  button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',enabled?'戦闘効果音をオフにする':'戦闘効果音をオンにする');
  button.textContent=enabled?'戦闘音 ON':'戦闘音 OFF';
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    cancelAutoAdvance();
    cancelPendingSpeech();
    pauseInterruptedListening();
  }
});
renderHome();
if(gachaTestMode&&!unreadableSaveStatus)openForge();
if(unreadableSaveStatus){
  // The standalone backup panel must be visible when recovery is required.
  homeNavigation?.showPage('save');
  $('#save-transfer').open=true;
}
