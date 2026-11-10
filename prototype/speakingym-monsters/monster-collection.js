import { MONSTERS, monsterFormName } from './monster-data.js';
import { getMonsterProgress, getEvolutionTrialGuide, learningSummary, feedMonster, evolveMonster, selectMonster, XP_PER_LEVEL, EVOLUTION_XP, SECOND_EVOLUTION_XP, companionUnlockProgress, getMonsterBondProgress } from './monster-engine.js';
import { monsterArt, mysteryMonsterArt } from './monster-art.js';
import {equippedWeapon} from './monster-equipment.js';
import { FOREST_RELICS, FOREST_AREAS, CITY_AREAS, RUINS_AREAS, FOREST_ROUTES, unlockedCityAreas, unlockedRuinsAreas, cleanForest } from './forest-engine.js';
import { FOREST_EVENTS } from './forest-events.js';
import { relicArt } from './game-visuals.js';
import { BOSS_MEDAL_NAMES } from './boss-mastery.js';
import { allyAffinity, allySkill, BATTLE_LABELS, MASTERY_LEVEL, masterySkillFor } from './battle-tactics.js';
import { levelHpBonus } from './battle-party.js';

const html = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s);
const all = s => [...document.querySelectorAll(s)];
const creatureFor = id => MONSTERS.find(c => c.id === id);
const displayName = (c, g) => monsterFormName(c,g.stage);
const EVOLUTION_LEVEL = 1 + Math.floor(EVOLUTION_XP / XP_PER_LEVEL);
const ASCENSION_LEVEL = 1 + Math.floor(SECOND_EVOLUTION_XP / XP_PER_LEVEL);
const evolutionGoal = `Lv.${EVOLUTION_LEVEL}・累計${EVOLUTION_XP} XP＋ボス攻略1エリア`;
const evolutionRemaining = g => Math.max(0,EVOLUTION_XP-g.xp);
const ascensionRemaining = g => Math.max(0,SECOND_EVOLUTION_XP-g.xp);
const growthStatus = g => g.ascended?'第2進化済み':g.evolved?'第1進化済み':'未進化';
const growthGoal = g => g.ascended?'第2進化達成！ 得意攻撃＋1・戦闘HP＋1':g.stage===1
  ?`第2進化：Lv.${ASCENSION_LEVEL}（累計${SECOND_EVOLUTION_XP} XP）＋異なるボス攻略 ${g.trialCount}/3エリア。残り${ascensionRemaining(g)} XP${g.canEvolve?' · 進化できる！':''}`
  :`第1進化：Lv.${EVOLUTION_LEVEL}（累計${EVOLUTION_XP} XP）＋ボス攻略 ${g.trialCount}/1エリア。残り${evolutionRemaining(g)} XP${g.canEvolve?' · 進化できる！':''}`;
const evolutionPath = c => `<div class="evolution-path"><span lang="en">${html(c.name)}<small>通常</small></span><span aria-hidden="true">→</span><span lang="en">${html(c.evolvedName)}<small>Lv.${EVOLUTION_LEVEL}＋ボス1</small></span><span aria-hidden="true">→</span><span lang="en">${html(c.ascendedName)}<small>Lv.${ASCENSION_LEVEL}＋ボス3</small></span></div>`;
// Result screens must not hide an already unlocked evolution just because
// the player has spent every available XP on this companion.
export function resultGrowthActionFor(save,preferredId){
 const id=save.ownedMonsters.includes(preferredId)?preferredId:save.selectedMonster;
 if(!save.ownedMonsters.includes(id))return {id:'',label:'仲間の図鑑・進化を見る'};
 const progress=getMonsterProgress(save,id),creature=creatureFor(id);
 if(progress.canEvolve)return {id,label:`${creature.name}を進化させる！`};
 if(save.xpWallet>0)return {id,label:`${creature.name}を育てる（使える${save.xpWallet} XP）`};
 return {id:'',label:'仲間の図鑑・進化を見る'};
}
function unlockText(c,save){
 const p=companionUnlockProgress(save,c);
 const language=`${p.skillLabel} ${p.currentSkill}/${p.requiredSkill}`;
 const recallLabel={2:'翌日',3:'3日後',4:'7日後'}[p.recallStage]||'復習';
 const recall=p.requiredRecall?` · ${recallLabel}の定着チェック ${p.currentRecall}/${p.requiredRecall}表現`:'';
 if(c.ruinsAreas)return `${language} · 星影の遺跡 ${p.ruinsCount}/${p.requiredRuinsAreas}エリア${recall}。すべて達成で仲間になるよ。`;
 if(c.cityAreas)return `${language} · 雪灯りの街 ${p.cityCount}/${p.requiredCityAreas}エリア${recall}。すべて達成で仲間になるよ。`;
 return c.forestAreas?`${language} · 森の攻略 ${p.areaCount}/${p.requiredAreas}エリア${recall}。すべて達成で仲間になるよ。`:`${language} で出会えるよ。`;
}
const chapterMarks=Object.freeze([
 {name:'森の一歩',goal:'森の1章を攻略',condition:f=>FOREST_AREAS.some(area=>f.completedAreas.includes(area.id))},
 {name:'森の探検家',goal:'森の2章を攻略',condition:f=>FOREST_AREAS.filter(area=>f.completedAreas.includes(area.id)).length>=2},
 {name:'森の守護者',goal:'森の4章をすべて攻略',condition:f=>FOREST_AREAS.every(area=>f.completedAreas.includes(area.id))},
 {name:'雪の旅人',goal:'雪の街の2章を攻略',condition:f=>CITY_AREAS.filter(area=>f.completedAreas.includes(area.id)).length>=2},
 {name:'遺跡の探究者',goal:'星影の遺跡の1章を攻略',condition:f=>RUINS_AREAS.some(area=>f.completedAreas.includes(area.id))},
 {name:'三世界の踏破者',goal:'全10章を攻略',condition:f=>[...FOREST_AREAS,...CITY_AREAS,...RUINS_AREAS].every(area=>f.completedAreas.includes(area.id))}
]);
// Titles follow the current, single-route adventure. Legacy branching choices
// remain in old saves as a readable archive, but cannot gate new achievements.
export function adventureTitleProgress(forest){
 return chapterMarks.map(mark=>({name:mark.name,goal:mark.goal,earned:mark.condition(forest)}));
}
function powerFor(id) {
  const skill=allySkill(id),specialty=BATTLE_LABELS[allyAffinity(id).strong];
  const legacy=id==='medamago'?' 従来の森モードでは進化後のDouble Yolkも使える。':
    id==='katappo'?' 従来のエンドレスでは進化後のLost & Foundも使える。':'';
  return {name:skill.name,description:`Englishダンジョンでは${specialty}が得意。${skill.description}。${legacy}`};
}
export function createCollectionViews({getSave, persist, showView, stopAudio, onStartAdventure}) {
  let currentId = null;
  // The party tab is primarily for raising and selecting companions. Showing
  // dozens of undiscovered silhouettes first buried the one usable companion.
  // The full mystery catalog remains one tap away under "すべて".
  let catalogFilter = 'owned';
  function renderCollection() {
    stopAudio();
    const save = getSave(), summary = learningSummary(save), forest = cleanForest(save.forest);
    $('#collection-wallet').textContent = `${save.xpWallet} XP`;
    $('#forest-collection-count').textContent = `踏破 ${forest.clears}回 · 宝物 ${forest.relics.length}/${Object.keys(FOREST_RELICS).length}`;
    $('#forest-collection-relics').innerHTML = forest.relics.length ? forest.relics.map(id => `<article class="forest-relic">${relicArt(id)}<div><strong lang="en">${html(FOREST_RELICS[id].name)}</strong><small>${html(FOREST_RELICS[id].meaning)}</small></div></article>`).join('') : '<p class="forest-empty">仲間と森を探検して、宝物を見つけよう。</p>';
    const awardedMedals=Object.values(forest.medals).reduce((sum,levels)=>sum+Object.keys(levels).length,0);
    $('#boss-medal-collection-progress').textContent=`勲章 ${awardedMedals}/${(FOREST_AREAS.length+CITY_AREAS.length+RUINS_AREAS.length)*3} · 一度獲得した最高ランクは下がらないよ`;
    $('#boss-medal-collection-grid').innerHTML=[...FOREST_AREAS,...CITY_AREAS,...RUINS_AREAS].map(area=>{
      const earned=forest.medals[area.id]||{};
      const levels=[['easy','やさしい'],['normal','標準'],['hard','応用']].map(([key,label])=>{
        const rank=earned[key]||0;
        return `<span class="boss-medal-slot" data-medal-rank="${rank}" aria-label="${html(area.name)} ${label} ${rank?BOSS_MEDAL_NAMES[rank]+'勲章':'未獲得'}"><small>${label}</small><strong>${rank?BOSS_MEDAL_NAMES[rank]:'未'}</strong></span>`;
      }).join('');
      return `<article class="boss-medal-collection-area"><strong>${html(area.name)}</strong><div class="boss-medal-slots">${levels}</div></article>`;
    }).join('');
    const legacyEvents=new Set(forest.journal.map(row=>row.eventId));
    const titles=adventureTitleProgress(forest);
    const earnedBadges=titles.filter(mark=>mark.earned);
    const forestCount=FOREST_AREAS.filter(area=>forest.completedAreas.includes(area.id)).length;
    const cityCount=CITY_AREAS.filter(area=>forest.completedAreas.includes(area.id)).length;
    const ruinsCount=RUINS_AREAS.filter(area=>forest.completedAreas.includes(area.id)).length;
    const cityOpen=new Set(unlockedCityAreas(save).map(area=>area.id));
    const ruinsOpen=new Set(unlockedRuinsAreas(save).map(area=>area.id));
    $('#forest-journal-summary').textContent=`森 ${forestCount}/4 · 街 ${cityCount}/4 · 遺跡 ${ruinsCount}/2エリア · 称号 ${earnedBadges.length}/6${legacyEvents.size?` · 旧探索記録 ${legacyEvents.size}件`:''}`;
    $('#forest-journal-areas').innerHTML=FOREST_AREAS.map((area,index)=>
      `<article class="forest-journal-area ${forest.completedAreas.includes(area.id)?'is-cleared':'is-locked'}"><span class="journal-number">CHAPTER ${index+1}</span><strong>${html(area.name)}</strong><small>${html(area.goal)}</small><span class="journal-status">${forest.completedAreas.includes(area.id)?'攻略済み':index<=forest.completedAreas.length?'未攻略':'未解放'}</span></article>`).join('');
    $('#city-journal-areas').innerHTML=CITY_AREAS.map((area,index)=>
      `<article class="forest-journal-area ${forest.completedAreas.includes(area.id)?'is-cleared':'is-locked'}"><span class="journal-number">CITY ${String(index+1).padStart(2,'0')}</span><strong>${html(area.name)}</strong><small>${html(area.goal)}</small><span class="journal-status">${forest.completedAreas.includes(area.id)?'攻略済み':cityOpen.has(area.id)?'挑戦可能':'未解放'}</span></article>`).join('');
    $('#ruins-journal-areas').innerHTML=RUINS_AREAS.map((area,index)=>
      `<article class="forest-journal-area ${forest.completedAreas.includes(area.id)?'is-cleared':'is-locked'}"><span class="journal-number">RUINS ${String(index+1).padStart(2,'0')}</span><strong>${html(area.name)}</strong><small>${html(area.goal)}</small><span class="journal-status">${forest.completedAreas.includes(area.id)?'攻略済み':ruinsOpen.has(area.id)?'挑戦可能':'未解放'}</span></article>`).join('');
    const archivedStories=FOREST_AREAS.flatMap(area=>FOREST_ROUTES.map(route=>{
      const event=FOREST_EVENTS[area.id][route.id], choices=forest.journal.filter(x=>x.eventId===event.id);
      if(!choices.length)return '';
      const title=event.title;
      const revealed=choices.map(entry=>event.options.find(opt=>opt.id===entry.choiceId)).filter(Boolean);
      return `<article class="forest-journal-entry ${revealed.length?'is-found':'is-hidden'}"><span class="journal-number">${html(area.name)} · ${html(route.name)}</span><strong>${html(title)}</strong><div class="forest-journal-choices">${revealed.length?revealed.map(choice=>`<p><b>${html(choice.memento)}</b><span>${html(choice.outcome)}</span></p>`).join(''):'<p>この道を冒険して、物語を発見しよう。</p>'}</div><small>選択 ${revealed.length}/2</small></article>`;
    })).filter(Boolean);
    $('#forest-journal-events').innerHTML=archivedStories.join('');
    $('#forest-journal-events').hidden=archivedStories.length===0;
    $('#forest-story-archive-heading').hidden=archivedStories.length===0;
    $('#forest-journal-badges').innerHTML=titles.map(mark=>
      `<article class="forest-journal-badge ${mark.earned?'earned':'locked'}"><strong>${html(mark.name)}</strong><span>${html(mark.goal)}</span><small>${mark.earned?'獲得済み':'未達成'}</small></article>`).join('');
    const ownedCount=MONSTERS.filter(c=>save.ownedMonsters.includes(c.id)).length;
    const catalogVisible=MONSTERS.filter(c=>catalogFilter==='all'||
      (catalogFilter==='owned'&&save.ownedMonsters.includes(c.id))||
      (catalogFilter==='undiscovered'&&!save.ownedMonsters.includes(c.id))||
      (catalogFilter==='rare'&&Boolean(c.rarity)));
    $('#collection-progress').textContent=`仲間 ${ownedCount} / ${MONSTERS.length}体 · 表示 ${catalogVisible.length}体`;
    all('[data-catalog-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.catalogFilter===catalogFilter)));
    $('#collection-grid').innerHTML = catalogVisible.map(c => {
      const owned = save.ownedMonsters.includes(c.id), g = getMonsterProgress(save,c.id);
      const p=companionUnlockProgress(save,c);
      const bond=getMonsterBondProgress(save,c.id);
      const hint=c.ruinsAreas?'遺跡':c.cityAreas?'雪の街':c.forestAreas?'森':'冒険';
      return `<button type="button" class="catalog-card ${owned?'':'locked'} ${c.rarity&&owned?'catalog-rare':''} ${owned&&g.canEvolve?'evolution-ready':''}" data-open-monster="${c.id}" aria-label="${owned?html(c.name)+'の詳細':'未発見の仲間の手がかり'}"><span class="catalog-portrait">${owned?monsterArt(c.id,g.stage,equippedWeapon(save)):mysteryMonsterArt()}</span><strong lang="en">${owned?html(displayName(c,g)):'？？？'}</strong><span class="catalog-state">${owned?`Lv.${g.level} · 所持`:'未発見'}</span><span class="catalog-evolution">${owned?`${growthStatus(g)} · 絆 Lv.${bond.rank}`:`${hint}で出会う · 手がかりを見る`}</span></button>`;
    }).join('');
    all('[data-open-monster]').forEach(b => {
      const id=b.dataset.openMonster;
      if(save.ownedMonsters.includes(id)){
        const growth=getMonsterProgress(save,id);
        if(!growth.ascended)b.querySelector('.catalog-evolution').textContent=growth.canEvolve?'進化できる！ この仲間をタップ'
          :growth.evolved?`第2進化：Lv.${ASCENSION_LEVEL} · ボス ${growth.trialCount}/3 · あと${ascensionRemaining(growth)} XP`
          :`第1進化：Lv.${EVOLUTION_LEVEL} · ボス ${growth.trialCount}/1 · あと${evolutionRemaining(growth)} XP`;
      }
      b.addEventListener('click',()=>renderDetail(id));
    });
    $('#phrase-grid').innerHTML = summary.entries.map(({phrase,entry,level}) => `<article class="phrase-card"><strong>${html(phrase.label)}</strong><p>${html(phrase.expression)}</p><div class="phrase-progress" aria-label="習得レベル ${level} / 3">${[1,2,3].map(i=>`<span class="${i<=level?'full':''}"></span>`).join('')}</div><p>${level===3?'MASTER · 別の場面と別の日でも使えた':level===2?'自力で言えた':level===1?'練習中':'これから出会う表現'}${entry?.nextReviewDay?' · 次の目安 '+html(entry.nextReviewDay):''}</p></article>`).join('');
    showView('collection');
  }
  function renderDetail(id, message='') {
    const c = creatureFor(id); if(!c) return;
    currentId = id; stopAudio();
    const save = getSave(), owned = save.ownedMonsters.includes(id), g = getMonsterProgress(save,id), power = powerFor(id), bond=getMonsterBondProgress(save,id);
    if(!owned){
      $('#detail-content').innerHTML=`<div class="character-sheet character-mystery">
       <div class="character-portrait unowned">${mysteryMonsterArt()}</div>
       <span class="tiny-caps">UNDISCOVERED</span><h1>？？？</h1>
       <p class="character-subtitle">未発見の仲間</p>
       <p class="character-description">仲間になると、名前・姿・進化先・固有能力が公開されます。</p>
       <section class="character-section"><h2>発見の手がかり</h2><p>${html(unlockText(c,save))}</p></section>
      </div>`;
      showView('detail');return;
    }
    const trial=getEvolutionTrialGuide(save,id);
    $('#detail-content').innerHTML = `<div class="character-sheet">
      <div class="character-portrait ${owned?'':'unowned'}">${monsterArt(id,owned?g.stage:0,owned?equippedWeapon(save):null)}</div>
      <h1 lang="en">${html(owned?displayName(c,g):c.name)}</h1>
      <p class="character-subtitle">${html(c.japaneseName)} · ${html(c.kind)}</p>
      <span class="character-badge">${owned?`Lv.${g.level} · ${growthStatus(g)} · 仲間`:'まだ仲間になっていないよ'}</span>
      ${owned?`<div class="character-actions"><button type="button" id="open-training" class="button button-primary">育てる</button><button type="button" class="button button-ghost" data-select-monster="${id}" ${save.selectedMonster===id?'disabled':''}>${save.selectedMonster===id?'冒険中':'一緒に冒険'}</button></div>`:''}
      <p id="detail-feedback" role="status">${html(message)}</p>
      <section class="character-section"><h2>名前の由来</h2>${c.roots.map(r=>`<div class="word-row"><span><b lang="en">${html(r.word)}</b><small>${html(r.meaning)}</small></span><button type="button" class="word-audio" data-pronounce-word="${html(r.word)}" aria-label="${html(r.word)} の発音を聞く"><span class="audio-glyph" aria-hidden="true"></span>聞く</button></div>`).join('')}<p id="pronounce-feedback" role="status"></p></section>
      <details id="detail-notes" class="character-more"><summary>能力・進化の詳細 <span aria-hidden="true">＋</span></summary>
      <section class="character-section"><h2>この仲間について</h2><p>${html(c.note)}</p></section>
      <section class="character-section"><h2>固有能力</h2><strong>${html(power.name)}</strong><p>${html(power.description)}</p><small>選んだ仲間1体で冒険できます。第2進化では得意攻撃＋1・戦闘HP＋1（英語の採点は変わりません）。</small></section>
      <section class="character-section"><h2>学習で深まる絆</h2><p>絆 Lv.${bond.rank} · ${bond.points}ポイント</p><p>${bond.maxed?'絆レベルMAX！これからも英語を使っていこう。':`次の絆レベルまで ${bond.next}ポイント`}</p><small>翌日・3日後・7日後の定着チェックを、日を空けてヒントなしでクリアすると増えるよ。XPや戦闘力には影響しない。</small></section>
      <section class="character-section"><h2>進化の記録</h2>${evolutionPath(c)}<p>${owned?growthGoal(g):html(unlockText(c,save))}</p>${owned&&trial.remaining&&trial.target?`<p class="evolution-next-boss">次の討伐目標：${html(trial.target.name)}。この仲間と一緒にボスを倒そう。</p>`:''}</section>
      </details>
    </div>`;
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
      const persisted=persist(selectMonster(getSave(),id));
      renderDetail(id,persisted?`${c.name}と一緒に冒険しよう。`:'仲間の変更を保存できませんでした。このタブでの変更を残すには、ホームからセーブをファイルに保存してね。');
    });
    showView('detail');
  }
  function renderTraining(id, reward=null) {
    const c = creatureFor(id), save = getSave();
    if(!c || !save.ownedMonsters.includes(id)) return;
    currentId=id; stopAudio();
    const bond=getMonsterBondProgress(save,id),trial=getEvolutionTrialGuide(save,id);
    const g=getMonsterProgress(save,id),effect=reward?(reward.ascended?'ascension':reward.evolved?'evolution':reward.leveledUp?'level':'xp'):'idle';
    const evolutionNeed=g.nextEvolutionXp===null?0:Math.max(0,g.nextEvolutionXp-g.xp);
    // A full-wallet feed can waste XP intended for other companions. When the
    // player can afford the next evolution's level, offer an exact-cost shortcut
    // while leaving the independent boss-mark requirement unchanged.
    const evolutionFeed=g.nextEvolutionXp!==null&&evolutionNeed>g.toNextLevel&&save.xpWallet>=evolutionNeed;
    const message=reward?(reward.ascended?`${c.ascendedName}へ第2進化！ 得意攻撃＋1・戦闘HP＋1！`:reward.evolved?`${c.evolvedName}へ進化！ 新しい能力が使えるよ！`:`${c.name}に${reward.xp} XP！${reward.leveledUp?` Lv.${g.level}になった！`:''}${reward.readyEvolution?' 進化条件を達成！ 下のボタンから進化しよう。':''}`):'';
    const battleUnlocks=[];
    if(reward?.leveledUp){
      const hpGain=levelHpBonus(reward.after.level)-levelHpBonus(reward.before.level);
      if(hpGain>0)battleUnlocks.push(`戦闘HP＋${hpGain}`);
      if(reward.before.level<MASTERY_LEVEL){
        const mastery=masterySkillFor(id,reward.after.level);
        if(mastery)battleUnlocks.push(`熟練技「${mastery.name}」解放`);
      }
    }
    const beforeForm=reward?.before?.stage??0;
    $('#training-content').innerHTML = `<div class="training-sheet" data-growth="${effect}" data-monster="${id}">
      <h1 lang="en">${html(displayName(c,g))}</h1>
      <div class="growth-stage"><div class="growth-ring" aria-hidden="true"></div>
        ${reward&&(reward.evolved||reward.ascended)?`<div class="growth-before" aria-hidden="true">${monsterArt(id,beforeForm)}</div>`:''}
        <div class="growth-character">${monsterArt(id,g.stage)}</div>
        <span class="growth-label" aria-hidden="true">${reward?(effect==='ascension'?'2ND EVOLUTION!':effect==='evolution'?'EVOLUTION':effect==='level'?'LEVEL UP':`+${reward.xp} XP`):''}</span>
      </div>
      <div class="training-level"><strong>Lv.${g.level}</strong><span>${growthStatus(g)}</span></div>
      ${battleUnlocks.length?`<div class="training-battle-unlock" role="status"><span>BATTLE POWER UP</span><strong>${battleUnlocks.map(html).join(' · ')}</strong><small>次の戦闘から使えるよ！</small></div>`:''}
      <div class="training-xp" role="meter" aria-label="次のレベルへのXP" aria-valuemin="0" aria-valuemax="${XP_PER_LEVEL}" aria-valuenow="${XP_PER_LEVEL-g.toNextLevel}"><span style="width:${100*(XP_PER_LEVEL-g.toNextLevel)/XP_PER_LEVEL}%"></span></div>
      <p class="training-next">${g.canEvolve?'進化の準備ができた！':`次のレベルまで <strong>${g.toNextLevel} XP</strong>`}</p>
      <div class="training-wallet">育成に使えるXP <strong id="training-wallet">${save.xpWallet} XP</strong></div>
      ${g.canEvolve?`<button type="button" class="button button-primary evolution-trigger" data-evolve-monster="${id}">進化する！</button>`:''}
      ${!g.canEvolve&&evolutionFeed?`<button type="button" class="button button-primary training-next-level" data-feed-monster="${id}" data-feed-amount="evolution">進化レベル Lv.${1+Math.floor(g.nextEvolutionXp/XP_PER_LEVEL)}まで育てる · ${evolutionNeed} XP</button>`:''}
      ${!g.canEvolve&&save.xpWallet>=g.toNextLevel?`<button type="button" class="button ${evolutionFeed?'button-ghost':'button-primary'} training-next-level" data-feed-monster="${id}" data-feed-amount="next">次のLv.${g.level+1}まで育てる · ${g.toNextLevel} XP</button>`:''}
      ${!g.canEvolve&&save.xpWallet>0?`<div class="training-feed">${save.xpWallet>=10?`<button type="button" class="button ${save.xpWallet>=g.toNextLevel?'button-ghost':'button-primary'}" data-feed-monster="${id}" data-feed-amount="10">10 XPあげる</button>`:''}<button type="button" class="button button-ghost" data-feed-monster="${id}" data-feed-amount="all">全部あげる</button></div>`:g.canEvolve?'':`<button type="button" id="training-earn-xp" class="button button-primary training-earn-xp">冒険してXPを集める</button>`}
      <p id="growth-feedback" class="growth-feedback" role="status" aria-live="polite">${html(message)}</p>
      <details id="training-evolution-notes" class="training-evolution-more"><summary>進化条件・絆を見る <span aria-hidden="true">＋</span></summary>
      ${evolutionPath(c)}
      ${g.stage<2?`<section class="evolution-trial" aria-label="次の進化の試練"><strong>進化の試練 · ${g.stage===0?'第1進化':'第2進化'}</strong><p>${growthGoal(g)}</p><div class="evolution-trial-marks" aria-label="異なるボス攻略 ${Math.min(g.trialCount,g.requiredTrials)} / ${g.requiredTrials}エリア">${trial.earned.map(area=>`<span data-cleared="true">${html(area.name)}<small>討伐済み</small></span>`).join('')}${Array.from({length:trial.remaining},(_,index)=>`<span data-cleared="false">未獲得の印 ${index+1}</span>`).join('')}</div><p class="evolution-next-boss">${trial.remaining?(trial.target?`次の討伐目標：${html(trial.target.name)}。この仲間とボスを倒そう！`:'次のボスエリアを解放すると、新しい印を集められるよ。'):'ボスの印はそろった！ あとは必要なXPを育成に使おう。'}</p>${g.canEvolve?'':`<button type="button" class="button button-primary evolution-trigger" data-evolve-monster="${id}" disabled>レベルと試練を達成すると進化できる</button>`}</section>`:'<p class="training-next">すべての進化試練を達成したよ！</p>'}
      <p class="training-next">絆 Lv.${bond.rank} · ${bond.points}ポイント。${bond.maxed?'絆の称号達成！':`あと${bond.next}ポイントで絆ランクUP！`}</p></details>
    </div>`;
    const milestones=[
      {goal:`Lv.${MASTERY_LEVEL}`,reward:'仲間固有の熟練技を解放',done:g.level>=MASTERY_LEVEL},
      {goal:`Lv.${EVOLUTION_LEVEL}＋ボス攻略1エリア`,reward:`${c.evolvedName}に第1進化`,done:g.evolved},
      {goal:'Lv.6',reward:'戦闘HPがさらに＋1',done:g.level>=6},
      {goal:'Lv.9',reward:'戦闘HPがさらに＋1',done:g.level>=9},
      {goal:`Lv.${ASCENSION_LEVEL}＋異なるボス攻略3エリア`,reward:`${c.ascendedName}に第2進化 · 得意攻撃＋1・戦闘HP＋1`,done:g.ascended}
    ];
    const upcoming=milestones.find(mark=>!mark.done);
    const roadmap=document.createElement('details');
    roadmap.className='growth-roadmap';
    roadmap.innerHTML=`<summary>${upcoming?`次の成長：${html(upcoming.goal)} · ${html(upcoming.reward)}`:'主な成長目標をすべて達成！'}<span>一覧を見る</span></summary><ol>${milestones.map(mark=>`<li data-achieved="${String(mark.done)}"><span>${html(mark.goal)}</span><strong>${html(mark.reward)}</strong><small>${mark.done?'達成済み':'これから'}</small></li>`).join('')}</ol></details>`;
    $('#training-content .training-sheet').append(roadmap);
    $('#training-earn-xp')?.addEventListener('click',()=>onStartAdventure?.());
    all('[data-feed-monster]').forEach(b=>b.addEventListener('click',()=>{
      try {
        const currentSave=getSave();
        const currentGrowth=getMonsterProgress(currentSave,id);
        const amount=b.dataset.feedAmount==='all'?currentSave.xpWallet:
          b.dataset.feedAmount==='next'?currentGrowth.toNextLevel:
          b.dataset.feedAmount==='evolution'?Math.max(0,(currentGrowth.nextEvolutionXp??0)-currentGrowth.xp):10;
        const result=feedMonster(currentSave,id,amount);
        const persisted=persist(result.save);
        renderTraining(id,persisted?result.reward:null);
        if(!persisted)$('#growth-feedback').textContent='XPの変更を保存できませんでした。現在の育成はこのタブだけに反映されています。ページを閉じる前にホームからセーブをファイルに保存してね。';
      } catch(error) { $('#growth-feedback').textContent=error.message; }
    }));
    $('[data-evolve-monster]')?.addEventListener('click',()=>{
      try {
        const result=evolveMonster(getSave(),id),persisted=persist(result.save);
        renderTraining(id,persisted?result.reward:null);
        if(!persisted)$('#growth-feedback').textContent='進化を保存できませんでした。このタブの進化記録を残すには、ページを閉じる前にホームからセーブをファイルに保存してね。';
      }
      catch(error){$('#growth-feedback').textContent=error.message;}
    });
    // Feeding refreshes only this sheet; keep the viewport on the character.
    if($('#training-view').hidden) showView('training');
  }
  $('#detail-back').addEventListener('click',renderCollection);
  all('[data-catalog-filter]').forEach(button=>button.addEventListener('click',()=>{
    catalogFilter=button.dataset.catalogFilter;renderCollection();
  }));
  $('#training-back').addEventListener('click',()=>renderDetail(currentId));
  return {renderCollection,renderDetail,renderTraining};
}
