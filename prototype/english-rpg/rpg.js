import { companions, monsters, stages, questions } from './rpg-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, changeActiveCompanion, chooseStageMonster, createSave, finishStage, getCompanion, getMonster, getStage, makeBattle, pickQuestion, rememberQuestion, resolveTurn, unlockedStageCount, validateSave } from './rpg-engine.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const screens = ['welcome-screen','map-screen','battle-screen','camp-screen'];
let save = null, battle = null, currentStage = null, currentQuestion = null, currentMove = null, phraseBuilt = [], lastOutcome = null, phraseOrder = [], selectedStarter = null, preferredMonster = null, fallbackMemorySave = null;
const params = new URLSearchParams(location.search);
const random = () => window.__RPG_TEST__?.random?.() ?? Math.random();

function persist(next = save) {
  save = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    $('#save-state').textContent = 'この端末に保存';
  } catch {
    fallbackMemorySave = save;
    $('#save-state').textContent = 'この画面を開いている間だけ保存';
  }
}
function loadSave() {
  try { return validateSave(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
  catch { return null; }
}
function showScreen(id) { for (const screen of screens) $(`#${screen}`).classList.toggle('hidden', screen !== id); window.scrollTo({top:0,behavior:'smooth'}); }
function avatar(id, sizeClass = '', evolved = false) {
  const info = getCompanion(id) || getMonster(id);
  const color = info?.color || '#a9c28a', accent = info?.accent || '#6d8b61';
  const isMonster = Boolean(getMonster(id));
  const ears = id === 'pebblet' || id === 'craggle'
    ? '<path d="M23 46 20 20l23 18M77 38l23-18-3 28" fill="currentColor" stroke="#544c46" stroke-width="3" stroke-linejoin="round"/>'
    : '<path d="M25 45 22 14l24 19M75 33l24-19-3 31" fill="currentColor" stroke="#544c46" stroke-width="3" stroke-linejoin="round"/>';
  const marks = evolved ? '<path d="M30 45q30-25 60 0" fill="none" stroke="#f3d46d" stroke-width="7" stroke-linecap="round"/><path d="m56 29 4-9 4 9" fill="#ffe38a" stroke="#c78e46" stroke-width="2"/>' : id === 'aurora' || id === 'crown' ? '<path d="m35 20 5-11 7 10 7-14 7 14 7-9 3 13" fill="#ffeaa5" stroke="#b78747" stroke-width="2"/>' : '';
  const tail = id === 'momo' || id === 'cinder' ? '<path d="M74 73c25-4 23 17 12 19-5 1-8-4-4-7" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>' : '';
  const wings = id === 'glimmer' || id === 'starling' ? '<path d="M26 58Q4 37 11 71q8 15 21 4m42-17q22-21 15 13-8 15-21 4" fill="#ffffff9c" stroke="#655d83" stroke-width="2"/>' : '';
  return `<span class="creature-icon ${sizeClass}"><svg viewBox="0 0 120 110" role="img" aria-label="${info?.name || '相棒'}" style="color:${accent}"><ellipse cx="60" cy="98" rx="34" ry="6" fill="#5b745245"/>${wings}${ears}<ellipse cx="60" cy="63" rx="34" ry="31" fill="${color}" stroke="#544c46" stroke-width="3"/>${marks}${tail}<ellipse cx="46" cy="60" rx="3.8" ry="5" fill="#273a37"/><ellipse cx="73" cy="60" rx="3.8" ry="5" fill="#273a37"/><path d="M54 73q6 7 12 0" fill="none" stroke="#6e5148" stroke-width="2.5" stroke-linecap="round"/><circle cx="39" cy="70" r="4" fill="#f18d7d99"/><circle cx="81" cy="70" r="4" fill="#f18d7d99"/><path d="M45 88q15 9 30 0" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/></svg></span>`;
}
function activeEntry() { return save.roster.find(entry => entry.id === save.activeCompanionId); }
function activeInfo() { return getCompanion(save.activeCompanionId) || getMonster(save.activeCompanionId); }
function setScreenInitial() { if (save) { renderMap(); showScreen('map-screen'); } else { renderStarter(); showScreen('welcome-screen'); } }
function renderStarter() {
  $('#starter-list').innerHTML = companions.map(c => `<button class="starter-option ${selectedStarter === c.id?'selected':''}" data-starter="${c.id}">${avatar(c.id)}<span><b>${c.name} · ${c.kind}</b><small>${c.line}</small></span><span>${selectedStarter===c.id?'✓':''}</span></button>`).join('');
  $$('.starter-option').forEach(button => button.addEventListener('click', () => { selectedStarter = button.dataset.starter; renderStarter(); $('#choose-starter').disabled = false; }));
}
function renderMap() {
  if (!save) return;
  const hero = activeEntry(), info = activeInfo(), maxXp = XP_PER_LEVEL;
  $('#hero-mini').innerHTML = avatar(info.id,'',hero.evolved);
  $('#hero-name').textContent = `${info.name} · ${hero.evolved?'進化済み':''}`;
  $('#hero-level').textContent = `Lv.${hero.level}　${hero.xp} / ${maxXp} XP`;
  $('#xp-fill').style.width = `${hero.xp/maxXp*100}%`;
  $('#stage-progress').textContent = `${new Set(save.stageClears).size} / ${stages.length}`;
  const unlocked = unlockedStageCount(save);
  $('#stage-list').innerHTML = stages.map(stage => {
    const cleared = save.stageClears.includes(stage.id), locked = stage.id > unlocked;
    const foeNames = stage.foes.map(id => getMonster(id).name).join(' / ');
    return `<button class="stage-card ${stage.boss?'boss':''}" data-stage="${stage.id}" ${locked?'disabled':''}><span class="stage-number">${stage.boss?'✦':String(stage.id).padStart(2,'0')}</span><span><strong>${stage.name}</strong><small>${stage.jp}</small><small class="stage-foes">${foeNames}</small></span><span class="stage-status">${locked?'🔒':cleared?'✓':stage.boss?'BOSS':'→'}</span></button>`;
  }).join('');
  $$('.stage-card:not(:disabled)').forEach(button => button.addEventListener('click', () => startStage(Number(button.dataset.stage))));
  $('#collection-mini').innerHTML = `<div class="collection-row">${monsters.slice(0,8).map(monster=>`<span class="mini-dot ${save.captures.includes(monster.id)?'found':''}" title="${save.captures.includes(monster.id)?monster.name:'未発見'}">${save.captures.includes(monster.id)?monster.glyph:'?'}</span>`).join('')}<b>+${Math.max(0,save.captures.length-8)}</b></div><p style="margin-top:8px">${save.captures.length}体が仲間</p>`;
}
function renderBattleField() {
  const stage = getStage(currentStage), foe = getMonster(battle.monsterId), hero = activeInfo(), entry = activeEntry();
  $('#battle-stage-label').textContent = `STAGE ${stage.id} · ${stage.jp}`;
  $('#battle-title').textContent = stage.boss ? 'ボスの気配がする…！' : '野生の仲間が現れた！';
  $('#boss-tag').classList.toggle('hidden', !foe.boss);
  $('#battle-hero-art').innerHTML = avatar(hero.id,'',entry.evolved);
  $('#battle-hero-name').textContent = `${hero.name} Lv.${entry.level}`;
  $('#foe-art').innerHTML = avatar(foe.id);
  $('#foe-name').textContent = foe.name;
  $('#ally-hp-name').textContent = hero.name;
  $('#foe-hp-name').textContent = foe.name;
  updateHp();
  updateFocus();
}
function updateHp() {
  $('#ally-hp-fill').style.width = `${battle.playerHp/battle.maxPlayerHp*100}%`;
  $('#foe-hp-fill').style.width = `${battle.enemyHp/battle.maxEnemyHp*100}%`;
  $('#ally-hp-text').textContent = `${battle.playerHp}/${battle.maxPlayerHp}`;
  $('#foe-hp-text').textContent = `${battle.enemyHp}/${battle.maxEnemyHp}`;
}
function updateFocus() { $('#focus-count').textContent = `集中 ${'●'.repeat(battle.focus)}${'○'.repeat(2-battle.focus)}`; $$('.move-card[data-move="phrase"]').forEach(b=>b.disabled=battle.focus<1); }
function startStage(id, forcedMonster = null) {
  if (id > unlockedStageCount(save)) return;
  currentStage = id;
  const monsterId = chooseStageMonster(id, save, forcedMonster);
  const hero = activeEntry();
  battle = makeBattle(id, monsterId, hero.level);
  currentQuestion = null; currentMove = null; lastOutcome = null;
  renderBattleField();
  $('#move-screen').classList.remove('hidden');
  $('#question-screen').classList.add('hidden');
  $('#battle-result').classList.add('hidden');
  showScreen('battle-screen');
}
const typeNames = {word:'ことば斬り',listen:'聞き耳ウェーブ',phrase:'フレーズ連結'};
function beginMove(move) {
  if (move === 'phrase' && battle.focus < 1) return;
  currentMove = move;
  currentQuestion = pickQuestion(move, save, random);
  persist(rememberQuestion(save, currentQuestion));
  phraseBuilt = []; phraseOrder = shuffle(currentQuestion.tokens.map((token,index)=>({token,index})),random);
  $('#move-screen').classList.add('hidden');
  $('#question-screen').classList.remove('hidden');
  $('#feedback').classList.add('hidden');
  $('#after-answer').classList.add('hidden');
  $('#question-type').textContent = typeNames[move];
  $('#question-prompt').textContent = currentQuestion.prompt;
  $('#answer-options').classList.add('hidden');
  $('#phrase-options').classList.add('hidden');
  $('#question-target-wrap').classList.toggle('hidden', move !== 'word');
  $('#question-audio-row').classList.toggle('hidden', move === 'phrase');
  $('#reveal-listen-text').classList.add('hidden');
  $('#question-target').classList.toggle('revealed',false);
  if (move !== 'phrase') {
    $('#question-target').textContent = currentQuestion.target;
    const correctChoice = currentQuestion.type === 'listen' ? currentQuestion.choices[currentQuestion.answer] : currentQuestion.meaning;
    const choices = currentQuestion.choices.map((text,index)=>({text,correct:text===correctChoice,key:`c${index}`}));
    shuffle(choices,random);
    $('#answer-options').innerHTML = choices.map(choice=>`<button class="answer-option" data-value="${escapeAttr(choice.text)}">${escapeHtml(choice.text)}</button>`).join('');
    $$('.answer-option').forEach(button=>button.addEventListener('click',()=>answer(button.dataset.value)));
    $('#answer-options').classList.remove('hidden');
  } else renderPhrase();
  $('#speak-question').textContent=move==='listen'?'▶ 英文を聞く':'▶ 発音を聞く';
}
function renderPhrase() {
  $('#phrase-options').classList.remove('hidden');
  $('#phrase-built').innerHTML = phraseBuilt.map((token,index)=>`<button class="word-chip built-chip" data-built-index="${index}">${escapeHtml(token)}</button>`).join('') || '<span class="microcopy">ここに文ができます</span>';
  $$('.built-chip').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.builtIndex);phraseBuilt.splice(index,1);renderPhrase();}));
  $('#phrase-bank').innerHTML=phraseOrder.map(item=>`<button class="word-chip bank-chip" data-token-index="${item.index}" ${phraseBuilt.includes(item.index)?'disabled':''}>${escapeHtml(item.token)}</button>`).join('');
  $$('.bank-chip:not(:disabled)').forEach(button=>button.addEventListener('click',()=>{phraseBuilt.push(Number(button.dataset.tokenIndex));renderPhrase();}));
  $('#submit-phrase').disabled=phraseBuilt.length!==currentQuestion.tokens.length;
}
function answer(value) {
  if (!currentQuestion || $('#after-answer').classList.contains('hidden')===false) return;
  const correct = value === (currentQuestion.type === 'listen' ? currentQuestion.choices[currentQuestion.answer] : currentQuestion.meaning);
  const options = $$('.answer-option');
  for(const option of options){option.disabled=true;if(option.dataset.value===(currentQuestion.type === 'listen' ? currentQuestion.choices[currentQuestion.answer] : currentQuestion.meaning)) option.classList.add('correct');if(option.dataset.value===value&&!correct)option.classList.add('wrong');}
  resolveAnswer(correct);
}
function answerPhrase() {
  const assembled = phraseBuilt.map(index=>currentQuestion.tokens[index]).join(' ');
  const correct = normalize(assembled)===normalize(currentQuestion.target);
  resolveAnswer(correct);
}
function resolveAnswer(correct) {
  const result=resolveTurn(battle,currentMove,correct);
  battle=result.battle;lastOutcome=result.outcome;updateHp();updateFocus();
  const feedback=$('#feedback');feedback.classList.remove('hidden','incorrect');
  if(!correct)feedback.classList.add('incorrect');
  let line=correct?`正解！ ${lastOutcome.damage} ダメージ。`:`今回は違った。${lastOutcome.enemyAttack} ダメージを受けた。`;
  if(correct&&lastOutcome.guard)line+=` 守りが${lastOutcome.guard}回復。`;
  if(currentQuestion.type==='word')line+=` “${currentQuestion.target}” は「${currentQuestion.meaning}」。 ${currentQuestion.example}`;
  if(currentQuestion.type==='listen')line+=` “${currentQuestion.target}” — ${currentQuestion.meaning} ${currentQuestion.tip}`;
  if(currentQuestion.type==='phrase')line+=` ${currentQuestion.target} — ${currentQuestion.meaning}`;
  feedback.innerHTML=`<b>${escapeHtml(line)}</b><small>${escapeHtml(currentQuestion.tip||'')}</small>`;
  $('#after-answer').classList.remove('hidden');
  $('#continue-battle').textContent=battle.enemyHp===0?'勝利を確認する':battle.playerHp===0?'このステージをもう一度':'次の手へ';
  if(correct)$('#battle-field').classList.add('pulse'); else $('#battle-field').classList.add('shake');
  setTimeout(()=>$('#battle-field').classList.remove('pulse','shake'),400);
}
function continueBattle() {
  if (battle.enemyHp===0) { finishEncounter(); return; }
  if (battle.playerHp===0) { showDefeat(); return; }
  $('#question-screen').classList.add('hidden');$('#move-screen').classList.remove('hidden');currentQuestion=null;
}
function finishEncounter() {
  const result=finishStage(save,battle,random);persist(result.save);
  const {rewards}=result, foe=getMonster(battle.monsterId), stage=getStage(currentStage);
  const modal=$('#modal-root');
  const capturedMarkup=rewards.captured?`<div class="modal-badge">NEW FRIEND</div><h2>${foe.name}が仲間になった！</h2><p>図鑑に登録したよ。いっしょに冒険できる仲間が増えました。</p>`:rewards.alreadyCaught?`<div class="modal-badge">BATTLE WON</div><h2>${foe.name}に勝った！</h2><p>捕獲率 ${Math.round(rewards.captureChance*100)}%。同じ相手に3回勝つと必ず仲間になります（${rewards.winCount}/3）。</p>`:`<div class="modal-badge">BATTLE WON</div><h2>${foe.name}に勝った！</h2><p>捕獲率 ${Math.round(rewards.captureChance*100)}%。今回は逃げたけれど、勝利を重ねれば必ず仲間になります（${rewards.winCount}/3）。</p>`;
  const xpLine=rewards.xpAwarded?`相棒に ${rewards.xpAwarded} XP${rewards.levelUps?` · レベルアップ！ Lv.${rewards.companion.level}`:''}${rewards.evolvedNow?' · 進化した！':''}`:'今回はクリア済みの道。経験値は初回クリアでもらえます。';
  const nextStage=unlockedStageCount(save)>=stages.length?null:getStage(unlockedStageCount(save));
  modal.innerHTML=`<div class="modal-backdrop"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="capture-title">${avatar(foe.id)}${capturedMarkup}<p id="capture-title"><b>${escapeHtml(stage.name)}</b> をクリア！</p><p class="${rewards.levelUps?'level-up':''}">${escapeHtml(xpLine)}</p><button class="primary-button" id="capture-return">${nextStage?`次のステージへ · ${nextStage.jp}`:'冒険マップへ'}</button>${rewards.captured&&rewards.levelUps?'<p class="level-up">仲間入りとレベルアップ！育成が進んだね。</p>':''}</div></div>`;
  $('#capture-return').addEventListener('click',()=>{modal.innerHTML='';renderMap();showScreen('map-screen');});
}
function showDefeat() {
  $('#battle-result').innerHTML=`<div class="modal-badge">TRY AGAIN</div><h2>いったん立て直そう</h2><p>正解すると攻撃できるよ。技を変えたり、聞き直したりしてもう一度挑戦しよう。</p><div class="result-buttons"><button class="primary-button" id="retry-battle">同じ相手に再挑戦</button><button class="secondary-button" id="result-map">マップへ戻る</button></div>`;
  $('#question-screen').classList.add('hidden');$('#move-screen').classList.add('hidden');$('#battle-result').classList.remove('hidden');
  $('#retry-battle').addEventListener('click',()=>startStage(currentStage,battle.monsterId));$('#result-map').addEventListener('click',()=>{renderMap();showScreen('map-screen');});
}
function renderCamp() {
  const roster=save.roster;
  $('#camp-hero').innerHTML=roster.map(entry=>{const info=getCompanion(entry.id)||getMonster(entry.id);return `<div class="companion-row ${entry.id===save.activeCompanionId?'active':''}">${avatar(info.id,'',entry.evolved)}<div class="companion-meta"><b>${escapeHtml(info.name)}${entry.id===save.activeCompanionId?' · 相棒':''}</b><small>Lv.${entry.level} · ${entry.xp}/${XP_PER_LEVEL} XP ${entry.evolved?' · 進化済み':''}</small></div>${entry.id!==save.activeCompanionId?`<button class="small-button switch-companion" data-id="${entry.id}">相棒にする</button>`:''}</div>`;}).join('');
  $$('.switch-companion').forEach(button=>button.addEventListener('click',()=>{persist(changeActiveCompanion(save,button.dataset.id));renderCamp();}));
  $('#dex-count').textContent=`${save.captures.length} / ${monsters.length}`;
  $('#dex-grid').innerHTML=monsters.map(monster=>{const found=save.captures.includes(monster.id);return `<article class="dex-card ${found?'':'unknown'}">${avatar(monster.id)}<b>${found?escapeHtml(monster.name):'？？？'}</b><small>${found?escapeHtml(monster.kind):monster.boss?'ボス · '+monster.id:'野生 · '+monster.id}</small>${!found?`<button class="hunt-button" data-hunt="${monster.id}">生息地を探す</button>`:''}</article>`;}).join('');
  $$('.hunt-button').forEach(button=>button.addEventListener('click',()=>{const monster=getMonster(button.dataset.hunt);const stage=stages.find(item=>item.foes.includes(monster.id));if(stage.id>unlockedStageCount(save)){showScreen('map-screen');return;}preferredMonster=monster.id;startStage(stage.id,monster.id);}));
}
function shuffle(list, rng=Math.random) { const array=[...list];for(let i=array.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[array[i],array[j]]=[array[j],array[i]];}return array; }
function normalize(text){return text.toLowerCase().replace(/[.!?,'’]/g,'').replace(/\s+/g,' ').trim();}
function escapeHtml(text){return String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function escapeAttr(text){return escapeHtml(text);}
function showListenTextFallback() {
  $('#speak-question').textContent='音声を再生できません';
  $('#reveal-listen-text').classList.remove('hidden');
}
function speakCurrent() {
  const text=currentQuestion?.target;
  if(!text)return;
  if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)) { showListenTextFallback(); return; }
  try { speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=.88;utterance.onerror=()=>{showListenTextFallback();};utterance.onend=()=>{$('#speak-question').textContent='▶ もう一度聞く';};speechSynthesis.speak(utterance);$('#speak-question').textContent='再生中…'; }
  catch { showListenTextFallback(); }
}

$('#choose-starter').addEventListener('click',()=>{if(!selectedStarter)return;persist(createSave(selectedStarter));renderMap();showScreen('map-screen');});
$('#open-companions').addEventListener('click',()=>{renderCamp();showScreen('camp-screen');});$('#open-dex').addEventListener('click',()=>{renderCamp();showScreen('camp-screen');});$('#camp-to-map').addEventListener('click',()=>{renderMap();showScreen('map-screen');});
$('#leave-battle').addEventListener('click',()=>{if(battle&&!battle.ended&&!confirm('戦闘を中断してマップへ戻りますか？'))return;renderMap();showScreen('map-screen');});
$$('.move-card').forEach(button=>button.addEventListener('click',()=>beginMove(button.dataset.move)));
$('#change-move').addEventListener('click',()=>{$('#question-screen').classList.add('hidden');$('#move-screen').classList.remove('hidden');currentQuestion=null;});
$('#continue-battle').addEventListener('click',continueBattle);
$('#speak-question').addEventListener('click',speakCurrent);
$('#reveal-listen-text').addEventListener('click',()=>{$('#question-target-wrap').classList.remove('hidden');$('#question-target').textContent=currentQuestion?.target||'';$('#reveal-listen-text').classList.add('hidden');});
$('#submit-phrase').addEventListener('click',answerPhrase);
$('#undo-word').addEventListener('click',()=>{phraseBuilt.pop();renderPhrase();});$('#clear-phrase').addEventListener('click',()=>{phraseBuilt=[];renderPhrase();});
$('#reset-game').addEventListener('click',()=>{if(!confirm('この試作端末の冒険データだけを消して、最初から遊びますか？'))return;try{localStorage.removeItem(STORAGE_KEY);}catch{}save=null;battle=null;currentQuestion=null;selectedStarter=null;$('#modal-root').innerHTML='';$('#choose-starter').disabled=true;renderStarter();showScreen('welcome-screen');$('#save-state').textContent='この端末に保存';});
if(params.has('qa')) window.__SPEAKINGYM_RPG_QA__=true;
save=loadSave();
// A malformed or unsupported save never touches Speakingym account, review, or billing keys.
renderStarter();setScreenInitial();
