import { companions, monsters, stages, questions } from './rpg-data.js';
import { STORAGE_KEY, XP_PER_LEVEL, changeActiveCompanion, chooseStageMonster, createSave, finishStage, getCompanion, getMonster, getStage, makeBattle, pickQuestion, rememberQuestion, resolveTurn, unlockedStageCount, validateSave } from './rpg-engine.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const screens = ['welcome-screen','map-screen','story-screen','battle-screen','camp-screen'];
let save = null, battle = null, currentStage = null, currentQuestion = null, currentMove = null, phraseBuilt = [], lastOutcome = null, phraseOrder = [], selectedStarter = null, preferredMonster = null, fallbackMemorySave = null;
let recognition = null, muted = false, stageOneMove = 'word';
const forest = {
  listen: 'I need to get to the village, but I can’t find the bridge.',
  word: {id:'story1-word',type:'word',prompt:'ミミップが道をふさいだ！ “clear the path” の clear は？',target:'clear',meaning:'ふさぐものを取り除く',choices:['道を遠ざける','道を照らす','ふさぐものを取り除く','道を隠す'],example:'Let’s clear the path.',tip:'clear the path は、通れるように道をあけること。'},
  phrase: {id:'story1-phrase',type:'phrase',prompt:'ミミップに道をあけてもらおう。語をつないで声にも出してみよう。',target:'Please let us pass.',meaning:'通してくれる？',tokens:['Please','let','us','pass.'],tip:'let us pass は「私たちを通して」。丁寧に頼むなら Please を添える。'}
};
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
function showScreen(id) { for (const screen of screens) $(`#${screen}`).classList.toggle('hidden', screen !== id); window.scrollTo(0,0); }
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
    const here = stage.id === Math.min(unlocked,stages.length);
    return `<button class="stage-card ${stage.boss?'boss':''} ${here?'current':''} ${cleared?'cleared':''}" data-stage="${stage.id}" ${locked?'disabled':''} aria-label="${stage.id} ${stage.jp} ${locked?'未解放':cleared?'クリア済み':'冒険する'}"><span class="stage-number">${stage.boss?'✦':String(stage.id).padStart(2,'0')}</span><span><strong>${stage.jp}</strong><small>${stage.id===1?'旅人を橋へ案内する':stage.name}</small></span><span class="stage-status">${locked?'🔒':cleared?'✓':here?'現在地':'→'}</span></button>`;
  }).join('');
  $$('.stage-card:not(:disabled)').forEach(button => button.addEventListener('click', () => startStage(Number(button.dataset.stage))));
  $('#collection-mini').innerHTML = `<div class="collection-row">${monsters.slice(0,8).map(monster=>`<span class="mini-dot ${save.captures.includes(monster.id)?'found':''}" title="${save.captures.includes(monster.id)?monster.name:'未発見'}">${save.captures.includes(monster.id)?monster.glyph:'?'}</span>`).join('')}</div><p style="margin-top:8px">${monsters.filter(monster=>save.captures.includes(monster.id)).length}体が仲間</p>`;
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
  if (id === 1) { startForest(); return; }
  currentStage = id;
  const monsterId = chooseStageMonster(id, save, forcedMonster);
  const hero = activeEntry();
  battle = makeBattle(id, monsterId, hero.level);
  $$('.move-card').forEach(button=>{button.disabled=false;button.classList.remove('quest-move');});
  $('#move-screen h2').textContent='どの技で英語に挑戦する？';
  currentQuestion = null; currentMove = null; lastOutcome = null;
  renderBattleField();
  $('#move-screen').classList.remove('hidden');
  $('#question-screen').classList.add('hidden');
  $('#battle-result').classList.add('hidden');
  showScreen('battle-screen');
}
const typeNames = {word:'ことば斬り',listen:'聞き耳ウェーブ',phrase:'フレーズ連結'};
function beginMove(move) {
  if (currentStage === 1 && battle && move !== stageOneMove && !(stageOneMove==='choice' && ['word','phrase'].includes(move))) return;
  if (move === 'phrase' && battle.focus < 1) return;
  currentMove = move;
  currentQuestion = currentStage === 1 ? forest[move] : pickQuestion(move, save, random);
  persist(rememberQuestion(save, currentQuestion));
  phraseBuilt = []; phraseOrder = move === 'phrase' ? shuffle(currentQuestion.tokens.map((token,index)=>({token,index})),random) : [];
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
  $('#phrase-built').innerHTML = phraseBuilt.map((tokenIndex,index)=>`<button class="word-chip built-chip" data-built-index="${index}">${escapeHtml(currentQuestion.tokens[tokenIndex])}</button>`).join('') || '<span class="microcopy">ここに文ができます</span>';
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
  if(!currentQuestion || !$('#after-answer').classList.contains('hidden')) return;
  const assembled = phraseBuilt.map(index=>currentQuestion.tokens[index]).join(' ');
  const correct = normalize(assembled)===normalize(currentQuestion.target);
  resolveAnswer(correct);
}
function resolveAnswer(correct) {
  const result=resolveTurn(battle,currentMove,correct);
  battle=result.battle;lastOutcome=result.outcome;
  // A missed story action can be retried without trapping the player behind focus.
  if(currentStage===1 && currentMove==='phrase' && !correct) battle.focus=1;
  updateHp();updateFocus();
  if(currentStage===1){save.storyRun={phase:'battle',battle,move:stageOneMove};persist();}
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
  if(correct){$('#battle-field').classList.add('pulse');playTone(440);floatDamage(lastOutcome.damage);} else {$('#battle-field').classList.add('shake');playTone(160);}
  setTimeout(()=>$('#battle-field').classList.remove('pulse','shake'),500);
}
function continueBattle() {
  if (battle.enemyHp===0) { if(currentStage===1){save.storyRun={phase:'speak',battle};persist();renderForest();} else finishEncounter(); return; }
  if (battle.playerHp===0) { showDefeat(); return; }
  if(currentStage===1 && lastOutcome?.correct){stageOneMove=currentMove==='word'?'phrase':'word';save.storyRun={phase:'battle',battle,move:stageOneMove};persist();}
  $('#question-screen').classList.add('hidden');$('#move-screen').classList.remove('hidden');currentQuestion=null;
  if(currentStage===1) renderForestBattleMove();
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
  $('#retry-battle').addEventListener('click',()=>{if(currentStage===1){save.storyRun={phase:'battle',move:'choice'};persist();renderForest();}else startStage(currentStage,battle.monsterId);});$('#result-map').addEventListener('click',()=>{renderMap();showScreen('map-screen');});
}
function renderCamp() {
  const roster=save.roster;
  $('#camp-hero').innerHTML=roster.map(entry=>{const info=getCompanion(entry.id)||getMonster(entry.id);return `<div class="companion-row ${entry.id===save.activeCompanionId?'active':''}">${avatar(info.id,'',entry.evolved)}<div class="companion-meta"><b>${escapeHtml(info.name)}${entry.id===save.activeCompanionId?' · 相棒':''}</b><small>Lv.${entry.level} · ${entry.xp}/${XP_PER_LEVEL} XP ${entry.evolved?' · 進化済み':''}</small></div>${entry.id!==save.activeCompanionId?`<button class="small-button switch-companion" data-id="${entry.id}">相棒にする</button>`:''}</div>`;}).join('');
  $$('.switch-companion').forEach(button=>button.addEventListener('click',()=>{persist(changeActiveCompanion(save,button.dataset.id));renderCamp();}));
  $('#dex-count').textContent=`${monsters.filter(monster=>save.captures.includes(monster.id)).length} / ${monsters.length}`;
  $('#dex-grid').innerHTML=monsters.map(monster=>{const found=save.captures.includes(monster.id);const habitat=stages.find(stage=>stage.foes.includes(monster.id));return `<article class="dex-card ${found?'':'unknown'}">${avatar(monster.id)}<b>${found?escapeHtml(monster.name):'？？？'}</b><small>${found?escapeHtml(monster.kind):`${monster.boss?'ボス':'野生'} · ${escapeHtml(habitat.jp)}に生息`}</small>${!found?`<button class="hunt-button" data-hunt="${monster.id}">生息地を探す</button>`:''}</article>`;}).join('');
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

function playTone(frequency=440) {
  if(muted || !window.AudioContext) return;
  try { const context=new AudioContext(), oscillator=context.createOscillator(), gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.07,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.17);oscillator.connect(gain).connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.18);oscillator.onended=()=>context.close(); } catch {}
}
function floatDamage(amount) {
  const field=$('#battle-field'), label=document.createElement('span');label.className='floating-damage';label.textContent=`−${amount}`;field.append(label);setTimeout(()=>label.remove(),800);
}
function speakLine(text, button, onFailure=()=>{}) {
  if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){onFailure();return;}
  try {speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=.86;utterance.onerror=onFailure;utterance.onend=()=>{button.textContent='▶ もう一度聞く';};speechSynthesis.speak(utterance);button.textContent='再生中…';}catch{onFailure();}
}
function startForest() {
  currentStage=1;
  if(!save.storyRun) {save.storyRun={phase:'listen'};persist();}
  renderForest();
}
function advanceForest(phase) {save.storyRun={...save.storyRun,phase};persist();renderForest();}
function renderForestBattleMove() {
  $$('.move-card').forEach(button=>{const available=button.dataset.move===stageOneMove||(stageOneMove==='choice'&&['word','phrase'].includes(button.dataset.move));button.disabled=!available;button.classList.toggle('quest-move',available);});
  $('#move-screen h2').textContent=stageOneMove==='choice'?'どちらの技から道をひらく？':'もう一つの技で道をひらこう';
  $('#battle-title').textContent=stageOneMove==='choice'?'ミミップが道をふさいだ！':'力を合わせて道をあけよう！';
}
function enterForestBattle() {
  stageOneMove=save.storyRun.move||'choice';
  battle=save.storyRun.battle || {...makeBattle(1,chooseStageMonster(1,save),activeEntry().level),enemyHp:51,maxEnemyHp:51,focus:1};
  save.storyRun={phase:'battle',battle,move:stageOneMove};persist();
  renderBattleField();renderForestBattleMove();
  $('#move-screen').classList.remove('hidden');$('#question-screen').classList.add('hidden');$('#battle-result').classList.add('hidden');
  showScreen('battle-screen');
}
function renderForest() {
  const phase=save.storyRun?.phase;
  if(phase==='battle'){enterForestBattle();return;}
  showScreen('story-screen');
  const steps=['listen','read','battle','speak','learn'];
  $('#quest-progress').innerHTML=steps.map((step,i)=>`<span class="${i<=steps.indexOf(phase)?'reached':''}">${['声を聞く','道標を読む','道をひらく','道案内','旅の記録'][i]}</span>`).join('');
  $('#story-scene').dataset.phase=phase;
  $('#story-character').innerHTML=phase==='speak'||phase==='learn'?avatar(save.activeCompanionId,'',activeEntry().evolved):`<svg class="traveler-art" viewBox="0 0 120 145" role="img" aria-label="迷っている旅人"><ellipse cx="60" cy="138" rx="42" ry="6" fill="#22473588"/><path d="M44 82 31 135h23l9-31 8 31h23L78 82" fill="#415b70" stroke="#263e49" stroke-width="3"/><path d="M33 133h24v8H27q-3-7 6-8m44 0h24q8 1 8 8H76z" fill="#523d3a"/><path d="M34 72q25-18 52 0l8 53-23 5-10-16-12 16-25-5z" fill="#d58c64" stroke="#754f45" stroke-width="4"/><path d="m39 79-21 33 10 8 20-25m32-16 20 29-9 9-22-23" fill="#e5aa7d" stroke="#754f45" stroke-width="3"/><path d="M22 115q-10 14 5 15l7-11m62-8q13 12 1 19l-9-14" fill="#edbd91"/><path d="M33 72q-12 1-12 22l7 11 13-20" fill="#587666" stroke="#3d5e53" stroke-width="3"/><circle cx="60" cy="50" r="26" fill="#efc69a" stroke="#754f45" stroke-width="3"/><path d="M36 45q-3-30 25-28 25 1 23 29-18-12-37-5z" fill="#513d3c"/><path d="M30 36q17-39 50-18l11 20q-28 11-61-2" fill="#809765" stroke="#4b684c" stroke-width="4"/><circle cx="51" cy="52" r="2.5" fill="#373c36"/><circle cx="70" cy="52" r="2.5" fill="#373c36"/><path d="M53 65q9 5 16-1" fill="none" stroke="#a56e5d" stroke-width="2" stroke-linecap="round"/><path d="M83 78q22-6 18 23l-11 10-7-17" fill="#7c9a6d" stroke="#486750" stroke-width="3"/></svg>`;
  const task=$('#story-task');
  if(phase==='listen'){
    $('#story-speaker').textContent='森で出会った旅人';$('#story-line').textContent='旅人は橋を探している。声を聞こう。';
    task.innerHTML=`<p class="eyebrow">01 · LISTEN</p><h2>旅人は何に困っている？</h2><p>最初は英文を伏せて、声を聞こう。</p><button class="sound-button" data-action="listen-audio">▶ 旅人の声を聞く</button><button class="small-button" data-action="reveal-transcript">英文を見る</button><p id="story-transcript" class="transcript hidden" lang="en">${escapeHtml(forest.listen)}</p><div class="answer-options"><button data-action="listen-choice" data-correct="false">村への切符をなくした</button><button data-action="listen-choice" data-correct="true">橋が見つからない</button><button data-action="listen-choice" data-correct="false">村が見つからない</button></div><div id="story-feedback" class="feedback hidden" role="status"></div>`;
    shuffle($$('.answer-options button',task),random).forEach(button=>$('.answer-options',task).append(button));
  }else if(phase==='read'){
    $('#story-speaker').textContent='古い道標';$('#story-line').textContent='二つの道に分かれている。道標を読んで橋へ向かおう。';
    task.innerHTML=`<p class="eyebrow">02 · READ</p><h2>橋へ続く道を選ぼう</h2><blockquote class="forest-sign" lang="en">BRIDGE → Follow the mossy path.<br>The left path ends at a cliff.</blockquote><div class="answer-options"><button data-action="read-choice" data-correct="false">左の道を進む</button><button data-action="read-choice" data-correct="true">苔の生えた右の道を進む</button></div><div id="story-feedback" class="feedback hidden" role="status"></div>`;
  }else if(phase==='speak'){
    $('#story-speaker').textContent='旅人';$('#story-line').textContent='「橋へは、どちらを進めばいい？」あなたの英語で伝えよう。';
    task.innerHTML=`<p class="eyebrow">04 · SPEAK</p><h2>旅人に道を教えよう</h2><p>苔の生えた道を進めば橋に着く。短い英語で伝えてみよう。言い方は一つではありません。</p><button class="sound-button" data-action="repeat-npc">▶ 旅人の声をもう一度聞く</button><div class="speech-box"><button class="primary-button" data-action="record">🎙 英語を話す</button><span id="speech-status">音声認識は対応ブラウザで利用できます</span><label for="forest-speech">認識された文を直す、または英文を入力</label><textarea id="forest-speech" rows="3" lang="en" placeholder="例を見ずに、まず自分の言葉で伝えてみよう"></textarea><button class="primary-button" data-action="submit-speech" disabled>伝えた内容を見る</button></div><p class="microcopy">音声認識の文字起こしは採点しません。使えない端末では、声に出してから英文を入力できます。</p>`;
    const input=$('#forest-speech');input.value=save.storyRun.transcript||'';input.addEventListener('input',()=>{$('[data-action="submit-speech"]').disabled=!input.value.trim();});input.dispatchEvent(new Event('input'));
  }else if(phase==='learn'){
    $('#story-speaker').textContent='旅人';$('#story-line').textContent='“Thank you! Now I know where to go.” 旅人は橋へ向かった。';
    task.innerHTML=`<p class="eyebrow">05 · YOUR WORDS</p><h2>道を伝えられた！</h2><p>あなたの文（文字起こし・入力、未採点）</p><blockquote class="your-words" lang="en">${escapeHtml(save.storyRun.transcript)}</blockquote><h3>こんな言い方もできる</h3><ul class="example-lines"><li lang="en">Follow the mossy path to the bridge.</li><li lang="en">Take the path on the right. It leads to the bridge.</li><li lang="en">The bridge is down this mossy path.</li></ul><p class="learning-tip">道順には <b>follow the path</b>、つながりを説明するなら <b>leads to the bridge</b>。自由な表現の正確さは自動判定していません。</p><button class="primary-button" data-action="finish-forest">旅を終えて仲間のもとへ</button>`;
  }
}
function startRecognition() {
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){$('#speech-status').textContent='この端末では音声認識を使えません。声に出してから入力してください。';return;}
  recognition?.abort();
  try {recognition=new SpeechRecognition();recognition.lang='en-US';recognition.interimResults=true;recognition.continuous=true;const existing=$('#forest-speech').value.trim();recognition.onresult=event=>{let finalText=existing, interim='';for(let i=0;i<event.results.length;i++){const phrase=event.results[i][0].transcript;if(event.results[i].isFinal)finalText+=` ${phrase}`;else interim+=` ${phrase}`;}$('#forest-speech').value=(finalText+interim).trim();$('#forest-speech').dispatchEvent(new Event('input'));};recognition.onerror=()=>{$('#speech-status').textContent='認識できませんでした。もう一度試すか、英文を入力してください。';};recognition.onend=()=>{$('[data-action="record"]').textContent='🎙 もう一度話す';};recognition.start();$('#speech-status').textContent='聞き取り中… 話し終えたら文を確認してください。';$('[data-action="record"]').textContent='■ 停止';}catch{$('#speech-status').textContent='マイクを開始できません。英文入力で続けられます。';}
}
$('#story-task').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(action==='listen-audio'||action==='repeat-npc')speakLine(forest.listen,button,()=>{$('#story-transcript')?.classList.remove('hidden');button.textContent='再生できません · 英文を確認';});
  if(action==='reveal-transcript')$('#story-transcript').classList.remove('hidden');
  if(action==='listen-choice'||action==='read-choice'){
    if(button.dataset.correct==='true'){playTone(620);advanceForest(action==='listen-choice'?'read':'battle');}
    else {playTone(190);const feedback=$('#story-feedback');feedback.classList.remove('hidden');feedback.innerHTML=action==='listen-choice'?'もう一度聞いてみよう。聞き取れないときは <b>Could you say that again?</b> と聞き返せるよ。':'道標には <b>left path ends at a cliff</b> とある。橋は別の道だ。';if(action==='listen-choice')$('#story-transcript').classList.remove('hidden');}
  }
  if(action==='record'){if(recognition&&button.textContent.startsWith('■')){recognition.stop();return;}startRecognition();}
  if(action==='submit-speech'){const transcript=$('#forest-speech').value.trim();if(!transcript)return;recognition?.stop();save.storyRun.transcript=transcript;advanceForest('learn');}
  if(action==='finish-forest'){battle=save.storyRun.battle;delete save.storyRun;finishEncounter();}
});
$('#leave-story').addEventListener('click',()=>{recognition?.stop();renderMap();showScreen('map-screen');});
$('#toggle-sound').addEventListener('click',()=>{muted=!muted;$('#toggle-sound').textContent=muted?'♪̸':'♫';$('#toggle-sound').setAttribute('aria-pressed',String(muted));});

$('#choose-starter').addEventListener('click',()=>{if(!selectedStarter)return;persist(createSave(selectedStarter));renderMap();showScreen('map-screen');});
$('#open-companions').addEventListener('click',()=>{renderCamp();showScreen('camp-screen');});$('#open-dex').addEventListener('click',()=>{renderCamp();showScreen('camp-screen');});$('#camp-to-map').addEventListener('click',()=>{renderMap();showScreen('map-screen');});
$('#leave-battle').addEventListener('click',()=>{if(currentStage!==1&&battle&&!battle.ended&&!confirm('戦闘を中断してマップへ戻りますか？'))return;renderMap();showScreen('map-screen');});
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
