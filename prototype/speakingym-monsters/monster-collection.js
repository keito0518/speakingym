import { MONSTERS } from './monster-data.js';
import { getMonsterProgress, learningSummary, feedMonster, selectMonster, XP_PER_LEVEL, EVOLUTION_XP } from './monster-engine.js';
import { monsterArt } from './monster-art.js';
import { FOREST_RELICS, cleanForest } from './forest-engine.js';
import { relicArt } from './game-visuals.js';

const html = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s);
const all = s => [...document.querySelectorAll(s)];
const creatureFor = id => MONSTERS.find(c => c.id === id);
const displayName = (c, g) => g.evolved ? c.evolvedName : c.name;
function unlockText(c) {
  return c.masteryUnlock !== undefined ? `${c.masteryUnlock}つの表現をMASTERすると出会えるよ。` : `ヒントなしで${c.unlock}つの表現を話すと出会えるよ。`;
}
function powerFor(id) {
  if(id === 'medamago') return {name:'Double Yolk',description:'森のボス戦で、1ウェーブに一度だけ2回攻撃。ひだまりの小道では隠し宝物も見つける。'};
  if(id === 'katappo') return {name:'Lost & Found',description:'エンドレスで判定保留になったとき、1回の冒険に一度だけ挑戦回数を守る。こけむした抜け道では隠し宝物も見つける。'};
  return {name:'未発見',description:'固有の戦闘モーションは実装済み。冒険に影響する能力は、今後のエリア拡張で追加予定。'};
}
export function createCollectionViews({getSave, persist, showView, stopAudio}) {
  let currentId = null;
  function renderCollection() {
    stopAudio();
    const save = getSave(), summary = learningSummary(save), forest = cleanForest(save.forest);
    $('#collection-wallet').textContent = `${save.xpWallet} XP`;
    $('#forest-collection-count').textContent = `踏破 ${forest.clears}回 · 宝物 ${forest.relics.length}/${Object.keys(FOREST_RELICS).length}`;
    $('#forest-collection-relics').innerHTML = forest.relics.length ? forest.relics.map(id => `<article class="forest-relic">${relicArt(id)}<div><strong lang="en">${html(FOREST_RELICS[id].name)}</strong><small>${html(FOREST_RELICS[id].meaning)}</small></div></article>`).join('') : '<p class="forest-empty">仲間と森を探検して、宝物を見つけよう。</p>';
    $('#collection-grid').innerHTML = MONSTERS.map(c => {
      const owned = save.ownedMonsters.includes(c.id), g = getMonsterProgress(save,c.id);
      return `<button type="button" class="catalog-card ${owned?'':'locked'}" data-open-monster="${c.id}" aria-label="${html(c.name)}の詳細${owned?'':'・未所持'}"><span class="catalog-portrait">${monsterArt(c.id,owned&&g.evolved)}</span><strong lang="en">${html(owned?displayName(c,g):c.name)}</strong><span class="catalog-state">${owned?`Lv.${g.level} · 所持`:'未所持'}</span><span class="catalog-evolution">${owned&&g.evolved?'進化済み':'未進化'}</span></button>`;
    }).join('');
    all('[data-open-monster]').forEach(b => b.addEventListener('click',()=>renderDetail(b.dataset.openMonster)));
    $('#phrase-grid').innerHTML = summary.entries.map(({phrase,entry,level}) => `<article class="phrase-card"><strong>${html(phrase.label)}</strong><p>${html(phrase.expression)}</p><div class="phrase-progress" aria-label="習得レベル ${level} / 3">${[1,2,3].map(i=>`<span class="${i<=level?'full':''}"></span>`).join('')}</div><p>${level===3?'MASTER · 別の場面と別の日でも使えた':level===2?'自力で言えた':level===1?'練習中':'これから出会う表現'}${entry?.nextReviewDay?' · 次の目安 '+html(entry.nextReviewDay):''}</p></article>`).join('');
    showView('collection');
  }
  function renderDetail(id, message='') {
    const c = creatureFor(id); if(!c) return;
    currentId = id; stopAudio();
    const save = getSave(), owned = save.ownedMonsters.includes(id), g = getMonsterProgress(save,id), power = powerFor(id);
    $('#detail-content').innerHTML = `<div class="character-sheet"><div class="character-portrait ${owned?'':'unowned'}">${monsterArt(id,owned&&g.evolved)}</div><span class="tiny-caps">MONSTER FIELD NOTES</span><h1 lang="en">${html(owned?displayName(c,g):c.name)}</h1><p class="character-subtitle">${html(c.japaneseName)} · ${html(c.kind)}</p><p class="character-description">${html(c.note)}</p><span class="character-badge">${owned?`Lv.${g.level} · 仲間`:'まだ仲間になっていないよ'}</span><section class="character-section"><h2>名前の由来</h2>${c.roots.map(r=>`<div class="word-row"><span><b lang="en">${html(r.word)}</b><small>${html(r.meaning)}</small></span><button type="button" class="word-audio" data-pronounce-word="${html(r.word)}" aria-label="${html(r.word)} の発音を聞く"><span class="audio-glyph" aria-hidden="true"></span>聞く</button></div>`).join('')}<p id="pronounce-feedback" role="status"></p></section><section class="character-section"><h2>固有能力</h2><strong lang="en">${html(power.name)}</strong><p>${html(power.description)}</p><small>${id==='medamago'||id==='katappo'?(owned&&g.evolved?'進化で解放済み':'進化すると解放'):'今後追加予定'}</small></section><section class="character-section"><h2>進化の記録</h2><div class="evolution-path"><span lang="en">${html(c.name)}</span><span aria-hidden="true">→</span><span lang="en">${html(c.evolvedName)}</span></div><p>${owned?(g.evolved?'進化済み。さらにXPをあげるとレベルが上がるよ。':`あと${Math.max(0,EVOLUTION_XP-g.xp)} XPで進化。`):html(unlockText(c))}</p></section><p id="detail-feedback" role="status">${html(message)}</p>${owned?`<div class="character-actions"><button type="button" id="open-training" class="button button-primary">この仲間を育てる</button><button type="button" class="button button-ghost" data-select-monster="${id}" ${save.selectedMonster===id?'disabled':''}>${save.selectedMonster===id?'ホームに表示中':'一緒に冒険する'}</button></div>`:''}</div>`;
    all('[data-pronounce-word]').forEach(b => b.addEventListener('click',()=>{
      const feedback = $('#pronounce-feedback');
      try {
        if(!window.speechSynthesis || !window.SpeechSynthesisUtterance) throw new Error();
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(b.dataset.pronounceWord);
        utterance.lang='en-US'; utterance.rate=.82;
        utterance.onerror=()=>{if(feedback.isConnected)feedback.textContent='再生できませんでした。もう一度「聞く」を押してね。';};
        window.speechSynthesis.speak(utterance);
        feedback.textContent=`${b.dataset.pronounceWord} の発音を再生します。`;
      } catch { feedback.textContent='このブラウザでは発音再生を利用できません。'; }
    }));
    $('#open-training')?.addEventListener('click',()=>renderTraining(id));
    $('[data-select-monster]')?.addEventListener('click',()=>{
      persist(selectMonster(getSave(),id));renderDetail(id,`${c.name}と一緒に冒険しよう。`);
    });
    showView('detail');
  }
  function renderTraining(id, reward=null) {
    const c = creatureFor(id), save = getSave();
    if(!c || !save.ownedMonsters.includes(id)) return;
    currentId=id; stopAudio();
    const g=getMonsterProgress(save,id), effect=reward?(reward.evolved?'evolution':reward.leveledUp?'level':'xp'):'idle';
    const message=reward?`${c.name}に${reward.xp} XP！${reward.evolved?` ${c.evolvedName}に進化した！`:reward.leveledUp?` Lv.${g.level}になった！`:''}`:'';
    $('#training-content').innerHTML = `<div class="training-sheet" data-growth="${effect}" data-monster="${id}"><span class="tiny-caps">COMPANION GROWTH</span><h1 lang="en">${html(displayName(c,g))}</h1><p class="character-subtitle">${html(c.japaneseName)}を育てよう</p><div class="growth-stage"><div class="growth-ring" aria-hidden="true"></div>${reward?.evolved?`<div class="growth-before" aria-hidden="true">${monsterArt(id,false)}</div>`:''}<div class="growth-character">${monsterArt(id,g.evolved)}</div><span class="growth-label" aria-hidden="true">${reward?(effect==='evolution'?'EVOLUTION':effect==='level'?'LEVEL UP':`+${reward.xp} XP`):''}</span></div><div class="training-level"><strong>Lv.${g.level}</strong><span>${g.evolved?'進化済み':`進化まで ${Math.max(0,EVOLUTION_XP-g.xp)} XP`}</span></div><div class="training-xp" role="meter" aria-label="次のレベルへのXP" aria-valuemin="0" aria-valuemax="${XP_PER_LEVEL}" aria-valuenow="${XP_PER_LEVEL-g.toNextLevel}"><span style="width:${100*(XP_PER_LEVEL-g.toNextLevel)/XP_PER_LEVEL}%"></span></div><p class="training-next">次のレベルまで <strong>${g.toNextLevel} XP</strong> · 累計 ${g.xp} XP</p><div class="training-wallet">育成に使えるXP <strong id="training-wallet">${save.xpWallet} XP</strong></div><div class="training-feed"><button type="button" class="button button-primary" data-feed-monster="${id}" data-feed-amount="10" ${save.xpWallet<10?'disabled':''}>10 XPあげる</button><button type="button" class="button button-ghost" data-feed-monster="${id}" data-feed-amount="all" ${save.xpWallet<1?'disabled':''}>全部あげる</button></div><p id="growth-feedback" class="growth-feedback" role="status" aria-live="polite">${html(message||'問題でためたXPを、この仲間にあげられます。')}</p><div class="evolution-path"><span lang="en">${html(c.name)}</span><span aria-hidden="true">→</span><span lang="en">${html(c.evolvedName)}</span></div><p class="training-next">${g.evolved?'進化達成。これからも一緒に強くなろう。':`累計${EVOLUTION_XP} XPで進化します。`}</p></div>`;
    all('[data-feed-monster]').forEach(b=>b.addEventListener('click',()=>{
      try {
        const amount=b.dataset.feedAmount==='all'?getSave().xpWallet:10;
        const result=feedMonster(getSave(),id,amount);
        persist(result.save);renderTraining(id,result.reward);
      } catch(error) { $('#growth-feedback').textContent=error.message; }
    }));
    // Feeding refreshes only this sheet; keep the viewport on the character.
    if($('#training-view').hidden) showView('training');
  }
  $('#detail-back').addEventListener('click',renderCollection);
  $('#training-back').addEventListener('click',()=>renderDetail(currentId));
  return {renderCollection,renderDetail,renderTraining};
}
