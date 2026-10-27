import { MONSTERS } from './monster-data.js';
import { getMonsterProgress, learningSummary, feedMonster, selectMonster, XP_PER_LEVEL, EVOLUTION_XP, companionUnlockProgress, getMonsterBondProgress } from './monster-engine.js';
import { monsterArt } from './monster-art.js';
import { FOREST_RELICS, FOREST_AREAS, FOREST_ROUTES, cleanForest } from './forest-engine.js';
import { FOREST_EVENTS } from './forest-events.js';
import { relicArt } from './game-visuals.js';

const html = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s);
const all = s => [...document.querySelectorAll(s)];
const creatureFor = id => MONSTERS.find(c => c.id === id);
const displayName = (c, g) => g.evolved ? c.evolvedName : c.name;
function unlockText(c,save){
 const p=companionUnlockProgress(save,c);
 const language=`${p.skillLabel} ${p.currentSkill}/${p.requiredSkill}`;
 return c.forestAreas?`${language} · 森の攻略 ${p.areaCount}/${p.requiredAreas}エリア。両方達成で仲間になるよ。`:`${language} で出会えるよ。`;
}
const chapterMarks=Object.freeze([
 {name:'森の一歩',goal:'最初のエリアを攻略',condition:f=>f.completedAreas.length>=1},
 {name:'分かれ道の探検家',goal:'両方の道を歩く',condition:f=>f.routes.length===2},
 {name:'物語の収集家',goal:'異なる4つのイベントを記録',condition:f=>new Set(f.journal.map(x=>x.eventId)).size>=4},
 {name:'森の守護者',goal:'4エリアを攻略',condition:f=>f.completedAreas.length===4},
 {name:'冒険の語り部',goal:'8つのイベントすべてを記録',condition:f=>new Set(f.journal.map(x=>x.eventId)).size>=8},
 {name:'もうひとつの物語',goal:'全16種類の選択を見届ける',condition:f=>f.journal.length===16}
]);
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
    const seenEvents=new Set(forest.journal.map(row=>row.eventId));
    const earnedBadges=chapterMarks.filter(mark=>mark.condition(forest));
    $('#forest-journal-summary').textContent=`攻略 ${forest.completedAreas.length}/4エリア · イベント ${seenEvents.size}/8種類 · 選択 ${forest.journal.length}/16 · 称号 ${earnedBadges.length}/6`;
    $('#forest-journal-areas').innerHTML=FOREST_AREAS.map((area,index)=>
      `<article class="forest-journal-area ${forest.completedAreas.includes(area.id)?'is-cleared':'is-locked'}"><span class="journal-number">CHAPTER ${index+1}</span><strong>${html(area.name)}</strong><small>${html(area.goal)}</small><span class="journal-status">${forest.completedAreas.includes(area.id)?'攻略済み':index<=forest.completedAreas.length?'未攻略':'未解放'}</span></article>`).join('');
    $('#forest-journal-events').innerHTML=FOREST_AREAS.flatMap(area=>FOREST_ROUTES.map(route=>{
      const event=FOREST_EVENTS[area.id][route.id], choices=forest.journal.filter(x=>x.eventId===event.id);
      const title=seenEvents.has(event.id)?event.title:'未発見の物語';
      const revealed=choices.map(entry=>event.options.find(opt=>opt.id===entry.choiceId)).filter(Boolean);
      return `<article class="forest-journal-entry ${revealed.length?'is-found':'is-hidden'}"><span class="journal-number">${html(area.name)} · ${html(route.name)}</span><strong>${html(title)}</strong><div class="forest-journal-choices">${revealed.length?revealed.map(choice=>`<p><b>${html(choice.memento)}</b><span>${html(choice.outcome)}</span></p>`).join(''):'<p>この道を冒険して、物語を発見しよう。</p>'}</div><small>選択 ${revealed.length}/2</small></article>`;
    })).join('');
    $('#forest-journal-badges').innerHTML=chapterMarks.map(mark=>
      `<article class="forest-journal-badge ${mark.condition(forest)?'earned':'locked'}"><strong>${html(mark.name)}</strong><span>${html(mark.goal)}</span><small>${mark.condition(forest)?'獲得済み':'未達成'}</small></article>`).join('');
    $('#collection-grid').innerHTML = MONSTERS.map(c => {
      const owned = save.ownedMonsters.includes(c.id), g = getMonsterProgress(save,c.id);
      const p=companionUnlockProgress(save,c);
      const bond=getMonsterBondProgress(save,c.id);
      return `<button type="button" class="catalog-card ${owned?'':'locked'} ${c.rarity?'catalog-rare':''}" data-open-monster="${c.id}" aria-label="${html(c.name)}の詳細${owned?'':'・未所持'}"><span class="catalog-portrait">${monsterArt(c.id,owned&&g.evolved)}</span><strong lang="en">${html(owned?displayName(c,g):c.name)}</strong><span class="catalog-state">${owned?`Lv.${g.level} · 所持`:'未所持'}</span><span class="catalog-evolution">${owned&&g.evolved?`進化済み · 絆 Lv.${bond.rank}`:owned?`未進化 · 絆 Lv.${bond.rank}`:c.forestAreas?`森 ${p.areaCount}/${p.requiredAreas} · 英語 ${p.currentSkill}/${p.requiredSkill}`:'未解放'}</span></button>`;
    }).join('');
    all('[data-open-monster]').forEach(b => b.addEventListener('click',()=>renderDetail(b.dataset.openMonster)));
    $('#phrase-grid').innerHTML = summary.entries.map(({phrase,entry,level}) => `<article class="phrase-card"><strong>${html(phrase.label)}</strong><p>${html(phrase.expression)}</p><div class="phrase-progress" aria-label="習得レベル ${level} / 3">${[1,2,3].map(i=>`<span class="${i<=level?'full':''}"></span>`).join('')}</div><p>${level===3?'MASTER · 別の場面と別の日でも使えた':level===2?'自力で言えた':level===1?'練習中':'これから出会う表現'}${entry?.nextReviewDay?' · 次の目安 '+html(entry.nextReviewDay):''}</p></article>`).join('');
    showView('collection');
  }
  function renderDetail(id, message='') {
    const c = creatureFor(id); if(!c) return;
    currentId = id; stopAudio();
    const save = getSave(), owned = save.ownedMonsters.includes(id), g = getMonsterProgress(save,id), power = powerFor(id), bond=getMonsterBondProgress(save,id);
    $('#detail-content').innerHTML = `<div class="character-sheet"><div class="character-portrait ${owned?'':'unowned'}">${monsterArt(id,owned&&g.evolved)}</div><span class="tiny-caps">MONSTER FIELD NOTES</span><h1 lang="en">${html(owned?displayName(c,g):c.name)}</h1><p class="character-subtitle">${html(c.japaneseName)} · ${html(c.kind)}</p><p class="character-description">${html(c.note)}</p><span class="character-badge">${owned?`Lv.${g.level} · 仲間`:'まだ仲間になっていないよ'}</span><section class="character-section"><h2>名前の由来</h2>${c.roots.map(r=>`<div class="word-row"><span><b lang="en">${html(r.word)}</b><small>${html(r.meaning)}</small></span><button type="button" class="word-audio" data-pronounce-word="${html(r.word)}" aria-label="${html(r.word)} の発音を聞く"><span class="audio-glyph" aria-hidden="true"></span>聞く</button></div>`).join('')}<p id="pronounce-feedback" role="status"></p></section><section class="character-section"><h2>固有能力</h2><strong lang="en">${html(power.name)}</strong><p>${html(power.description)}</p><small>${id==='medamago'||id==='katappo'?(owned&&g.evolved?'進化で解放済み':'進化すると解放'):'今後追加予定'}</small></section><section class="character-section"><h2>学習で深まる絆</h2><p>絆 Lv.${bond.rank} · ${bond.points}ポイント</p><p>${bond.maxed?'絆レベルMAX！これからも英語を使っていこう。':`次の絆レベルまで ${bond.next}ポイント`}</p><small>翌日・3日後・7日後の定着チェックを、日を空けてヒントなしでクリアすると増えるよ。XPや戦闘力には影響しない。</small></section><section class="character-section"><h2>進化の記録</h2><div class="evolution-path"><span lang="en">${html(c.name)}</span><span aria-hidden="true">→</span><span lang="en">${html(c.evolvedName)}</span></div><p>${owned?(g.evolved?'進化済み。さらにXPをあげるとレベルが上がるよ。':`あと${Math.max(0,EVOLUTION_XP-g.xp)} XPで進化。`):html(unlockText(c,save))}</p></section><p id="detail-feedback" role="status">${html(message)}</p>${owned?`<div class="character-actions"><button type="button" id="open-training" class="button button-primary">この仲間を育てる</button><button type="button" class="button button-ghost" data-select-monster="${id}" ${save.selectedMonster===id?'disabled':''}>${save.selectedMonster===id?'ホームに表示中':'一緒に冒険する'}</button></div>`:''}</div>`;
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
    const bond=getMonsterBondProgress(save,id);
    const g=getMonsterProgress(save,id), effect=reward?(reward.evolved?'evolution':reward.leveledUp?'level':'xp'):'idle';
    const message=reward?`${c.name}に${reward.xp} XP！${reward.evolved?` ${c.evolvedName}に進化した！`:reward.leveledUp?` Lv.${g.level}になった！`:''}`:'';
    $('#training-content').innerHTML = `<div class="training-sheet" data-growth="${effect}" data-monster="${id}"><span class="tiny-caps">COMPANION GROWTH</span><h1 lang="en">${html(displayName(c,g))}</h1><p class="character-subtitle">${html(c.japaneseName)}を育てよう</p><div class="growth-stage"><div class="growth-ring" aria-hidden="true"></div>${reward?.evolved?`<div class="growth-before" aria-hidden="true">${monsterArt(id,false)}</div>`:''}<div class="growth-character">${monsterArt(id,g.evolved)}</div><span class="growth-label" aria-hidden="true">${reward?(effect==='evolution'?'EVOLUTION':effect==='level'?'LEVEL UP':`+${reward.xp} XP`):''}</span></div><div class="training-level"><strong>Lv.${g.level}</strong><span>${g.evolved?'進化済み':`進化まで ${Math.max(0,EVOLUTION_XP-g.xp)} XP`}</span></div><div class="training-xp" role="meter" aria-label="次のレベルへのXP" aria-valuemin="0" aria-valuemax="${XP_PER_LEVEL}" aria-valuenow="${XP_PER_LEVEL-g.toNextLevel}"><span style="width:${100*(XP_PER_LEVEL-g.toNextLevel)/XP_PER_LEVEL}%"></span></div><p class="training-next">次のレベルまで <strong>${g.toNextLevel} XP</strong> · 累計 ${g.xp} XP</p><div class="training-wallet">育成に使えるXP <strong id="training-wallet">${save.xpWallet} XP</strong></div><div class="training-feed"><button type="button" class="button button-primary" data-feed-monster="${id}" data-feed-amount="10" ${save.xpWallet<10?'disabled':''}>10 XPあげる</button><button type="button" class="button button-ghost" data-feed-monster="${id}" data-feed-amount="all" ${save.xpWallet<1?'disabled':''}>全部あげる</button></div><p id="growth-feedback" class="growth-feedback" role="status" aria-live="polite">${html(message||'問題でためたXPを、この仲間にあげられます。')}</p><div class="evolution-path"><span lang="en">${html(c.name)}</span><span aria-hidden="true">→</span><span lang="en">${html(c.evolvedName)}</span></div><p class="training-next">絆 Lv.${bond.rank} · ${bond.points}ポイント。${bond.maxed?'絆の称号達成！':`あと${bond.next}ポイントで絆ランクUP！`}</p><p class="training-next">${g.evolved?'進化達成。これからも一緒に強くなろう。':`累計${EVOLUTION_XP} XPで進化します。`}</p></div>`;
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
