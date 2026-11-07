const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
  const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  const base=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
  const shots=path.join(process.cwd(),'qa-screenshots');fs.mkdirSync(shots,{recursive:true});
  const errors=[];
  async function boot(width,reducedMotion='reduce'){
    const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:engine==='webkit',reducedMotion});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    page.on('crash',()=>errors.push('Browser page crashed'));
    await page.addInitScript(()=>{
      window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(){},cancel(){}}});
    });
    await page.goto(base,{waitUntil:'networkidle'});
    return {context,page};
  }
  async function seed(page,overrides={}){
    await page.evaluate(async data=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const {MONSTERS}=await import('./monster-data.js');
      const save={...createSave(),ownedMonsters:MONSTERS.map(c=>c.id),xpWallet:200,...data};
      localStorage.setItem(STORAGE_KEY,JSON.stringify(save));
    },overrides);
    await page.reload();
  }
  async function noOverflow(page,label){
    const m=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(m.scroll<=m.width+1,`${engine} ${label}: ${JSON.stringify(m)}`);
  }
  async function answer(page){
    if(await page.locator('#play-audio').count()){
      await page.locator('#play-audio').click();
      await page.locator('#listening-meaning').waitFor({state:'visible',timeout:12000});
      const correct=await page.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        const {listeningChallengeFor}=await import('./listening-challenges.js');
        return listeningChallengeFor(ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)).correctIndex;
      });
      await page.locator(`[data-listening-choice="${correct}"]`).click();
    }
    if(!await page.locator('#play-audio').count()){
      const example=await page.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
      });
      await page.locator('#spoken-answer').fill(example);await page.locator('#show-answer').click();
    }
  }
  try{
    for(const width of [320,375,390,430]){
      const {context,page}=await boot(width,'no-preference');
      // A new player must land on the one companion they can actually use,
      // without scrolling past the armory or forty-three hidden silhouettes.
      await page.locator('#game-tabs [data-game-tab="party"]').click();
      assert.equal(await page.locator('[data-open-monster]').count(),1,`${width}: party shows owned companions by default`);
      assert.equal(await page.locator('#collection-shop').isVisible(),false,
        `${width}: the companion tab is not preceded by the entire gacha`);
      assert.equal(await page.locator('#collection-weapons').isVisible(),false,
        `${width}: equipment is a separate one-tap destination`);
      assert.equal(await page.locator('[data-catalog-filter="owned"]').getAttribute('aria-pressed'),'true');
      await page.waitForFunction(()=>{
        const bounds=document.querySelector('.collection-sortbar').getBoundingClientRect();
        return bounds.top>=0&&bounds.top<window.innerHeight*.65;
      },null,{timeout:4000});
      assert.ok(await page.locator('.collection-sortbar').evaluate(el=>{
        const bounds=el.getBoundingClientRect();return bounds.top>=0&&bounds.top<window.innerHeight*.65;
      }),`${width}: party tab jumps straight to its companion filters`);
      await page.locator('#collection-open-equipment').click();
      await page.waitForFunction(()=>{
        const bounds=document.querySelector('#collection-weapons').getBoundingClientRect();
        return bounds.top>=0&&bounds.top<window.innerHeight*.65;
      },null,{timeout:4000});
      assert.ok(await page.locator('#collection-weapons').evaluate(el=>{
        const bounds=el.getBoundingClientRect();return bounds.top>=0&&bounds.top<window.innerHeight*.65;
      }),`${width}: party can still reach equipment with one tap`);
      assert.equal(await page.locator('.weapon-awakening').isVisible(),false,
        `${width}: an empty weapon bag must not show awakening instructions`);
      assert.equal(await page.locator('#equipment-go-gacha').isVisible(),true,
        `${width}: an empty bag points to a useful next action`);
      await page.locator('#collection-equipment-back').click();
      assert.equal(await page.locator('#collection-weapons').isVisible(),false,
        `${width}: equipment has an obvious return to the roster`);
      await page.locator('[data-catalog-filter="all"]').click();
      assert.equal(await page.locator('[data-open-monster]').count(),44,'Full discovery catalog remains available');
      await page.locator('[data-catalog-filter="owned"]').click();
      assert.equal(await page.locator('[data-open-monster]').count(),1);
      await page.locator('#game-tabs [data-game-tab="forge"]').click();
      assert.match(await page.locator('.shop-next-adventure').innerText(),/あと 120 G/);
      await page.locator('#shop-go-quest').click();
      assert.equal(await page.locator('#play-view').isVisible(),true,'Empty gacha routes directly to an adventure');
      await seed(page,{xpWallet:300,monsterTrials:{medamago:['entry']}});
      assert.equal(await page.locator('#home-navigation .home-walker').count(),3,'Three recruited friends decorate the menu, no more');
      assert.equal(await page.locator('[data-home-page="forest"] .home-walker').count(),0,'Hidden extra menu does not carry a walker');
      assert.equal(await page.locator('[data-home-page="collection"] .home-walker svg').count(),1);
      assert.equal(await page.locator('[data-home-page="daily"] .home-walker svg').count(),1);
      assert.equal(await page.locator('[data-home-page="review"] .home-walker svg').count(),1,'All three walkers remain on visible menu actions');
      assert.equal(await page.locator('.home-walker').first().evaluate(el=>getComputedStyle(el).animationName),'home-roam');
      assert.equal(await page.locator('.home-walker').first().evaluate(el=>getComputedStyle(el).pointerEvents),'none');
      await noOverflow(page,`${width} colorful home and companion walkers`);
      await page.screenshot({path:path.join(shots,`home-runners-${engine}-${width}.png`),fullPage:true});
      await page.locator('[data-home-page="collection"]').click();
      assert.equal(await page.locator('[data-open-monster]').count(),44);
      assert.match(await page.locator('#collection-progress').innerText(),/仲間 44 \/ 44体/);
      await page.locator('[data-catalog-filter="rare"]').click();
      assert.ok(await page.locator('[data-open-monster]').count()>=10,'rare filter shows hard-to-recruit characters');
      await page.locator('[data-catalog-filter="all"]').click();
      assert.equal(await page.locator('[data-open-monster]').count(),44);
      assert.equal(await page.locator('#collection-grid .word-row, #collection-grid [data-feed-monster]').count(),0);
      assert.equal(await page.locator('#forest-journal-areas .forest-journal-area').count(),4);
      assert.equal(await page.locator('#forest-journal-events .forest-journal-entry').count(),0,
        'Removed branching story targets must not clutter a fresh save');
      assert.equal(await page.locator('#forest-story-archive-heading').isVisible(),false);
      assert.equal(await page.locator('#forest-journal-badges .forest-journal-badge').count(),6);
      assert.equal(await page.locator('#collection-archive').getAttribute('open'),null,
        'Achievements and detailed learning records start folded');
      await page.locator('#collection-archive summary').click();
      assert.match(await page.locator('#forest-journal-badges').innerText(),/三世界の踏破者/);
      assert.match(await page.locator('[data-open-monster="medamago"] .catalog-evolution').textContent(),/Lv\.5 · ボス 1\/1 · あと280 XP/);
      await noOverflow(page,`${width} catalog`);
      await page.waitForTimeout(300); // Let the entry fade finish before visual QA.
      await page.screenshot({path:path.join(shots,`catalog-${engine}-${width}.png`),fullPage:true});
      await page.locator('[data-open-monster="medamago"]').click();
      assert.equal(await page.locator('#collection-view').isVisible(),false);
      assert.match(await page.locator('#detail-content').innerText(),/Yolkie.*メダマゴ/s);
      assert.match(await page.locator('#detail-content').innerText(),/卵の黄身/);
      assert.equal(await page.locator('#detail-notes').getAttribute('open'),null,
        'Secondary monster lore should not separate the player from the Grow button');
      assert.equal(await page.locator('#open-training').isVisible(),true);
      await page.locator('#detail-notes summary').click();
      assert.match(await page.locator('#detail-content').innerText(),/第1進化：Lv\.5（累計280 XP）＋ボス攻略 1\/1エリア。残り280 XP/,
        'The level and boss-clear prerequisites must be visible in the field notes');
      await page.evaluate(()=>{
        window.__spoken=[];
        window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
        Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(u){window.__spoken.push({text:u.text,lang:u.lang});}}});
      });
      await page.locator('[data-pronounce-word="sunny-side up"]').click();
      assert.deepEqual(await page.evaluate(()=>window.__spoken),[{text:'sunny-side up',lang:'en-US'}]);
      await noOverflow(page,`${width} detail`);
      await page.waitForTimeout(300);
      await page.screenshot({path:path.join(shots,`detail-${engine}-${width}.png`),fullPage:true});
      await page.locator('#open-training').click();
      assert.equal(await page.locator('#detail-view').isVisible(),false);
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'idle');
      assert.equal(await page.locator('#training-evolution-notes').getAttribute('open'),null,
        'Detailed evolution rules should start folded, behind the actual growth action');
      await page.locator('#training-evolution-notes summary').click();
      assert.match(await page.locator('.training-sheet').innerText(),/第1進化：Lv\.5（累計280 XP）＋ボス攻略 1\/1エリア。残り280 XP/);
      assert.match(await page.locator('.growth-roadmap > summary').innerText(),/次の成長：Lv\.4/);
      assert.equal(await page.locator('[data-evolve-monster]').isDisabled(),true);
      await page.locator('.growth-roadmap > summary').click();
      assert.equal(await page.locator('.growth-roadmap li').count(),5);
      assert.match(await page.locator('.growth-roadmap').innerText(),/Lv\.4.*熟練技/s);
      assert.match(await page.locator('.growth-roadmap').innerText(),/Lv\.6.*戦闘HP/s);
      assert.match(await page.locator('.growth-roadmap').innerText(),/Lv\.10.*第2進化/s);
      await page.locator('[data-feed-amount="10"]').click();
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'xp');
      assert.equal(await page.locator('.growth-character').evaluate(e=>getComputedStyle(e).animationName),'grow-xp');
      assert.equal(await page.locator('#training-wallet').innerText(),'290 XP');
      for(let i=0;i<6;i++) await page.locator('[data-feed-amount="10"]').click();
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'level');
      assert.match(await page.locator('.training-level').innerText(),/Lv.2/);
      assert.equal(await page.locator('.training-xp').getAttribute('aria-valuenow'),'0');
      assert.equal(await page.locator('.growth-character').evaluate(e=>getComputedStyle(e).animationName),'grow-level');
      await noOverflow(page,`${width} training`);
      await page.screenshot({path:path.join(shots,`training-${engine}-${width}-level.png`),fullPage:true});
      await page.locator('[data-feed-amount="all"]').click();
      assert.equal(await page.locator('[data-evolve-monster]').isEnabled(),true);
      assert.equal(await page.locator('.training-sheet h1').innerText(),'Yolkie','feeding only raises the level');
      await page.locator('[data-evolve-monster]').click();
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'evolution');
      assert.equal(await page.locator('.growth-character').evaluate(e=>getComputedStyle(e).animationName),'grow-evolution');
      assert.match(await page.locator('.training-sheet h1').innerText(),/Sunnyolk/);
      assert.match(await page.locator('#growth-feedback').innerText(),/進化/);
      assert.equal(await page.locator('#training-wallet').innerText(),'0 XP');
      assert.equal(await page.locator('[data-feed-amount="all"]').count(),0,
        'Zero XP should not leave useless disabled feed buttons on the main screen');
      assert.equal(await page.locator('#training-earn-xp').isVisible(),true);
      await page.waitForTimeout(1400);
      await page.screenshot({path:path.join(shots,`training-${engine}-${width}-evolution.png`),fullPage:true});
      const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
      assert.equal(before.monsterXp.medamago,300);assert.equal(before.ownedMonsters.length,44);
      assert.equal(before.monsterEvolution.medamago,1);
      await page.locator('#training-back').click();
      await page.locator('#detail-notes summary').click();
      assert.match(await page.locator('#detail-content').innerText(),/進化後、控えからの連携で「覚醒・追撃」/,
        'Evolved companion notes should describe the real tactical combo instead of the old placeholder');
      await page.locator('#detail-back').click();
      assert.match(await page.locator('[data-open-monster="medamago"]').innerText(),/Sunnyolk.*Lv.5/s);
      assert.match(await page.locator('[data-open-monster="medamago"] .catalog-evolution').textContent(),/第2進化：Lv.10/);
      await page.reload();
      assert.equal(await page.locator('#home-wallet').innerText(),'0');
      assert.match(await page.locator('#hero-monster-name').innerText(),/Sunnyolk/);
      const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
      assert.deepEqual(after,before);
      await context.close();
    }
    // Exact-cost growth gives a satisfying single tap to the next evolution
    // level without burning XP earmarked for the player's other companions.
    for(const width of [320,390]){
      const {context,page}=await boot(width);
      await seed(page,{xpWallet:300,monsterTrials:{medamago:['entry']}});
      await page.locator('[data-home-page="collection"]').click();
      await page.locator('[data-open-monster="medamago"]').click();
      await page.locator('#open-training').click();
      assert.match(await page.locator('[data-feed-amount="evolution"]').innerText(),/Lv\.5.*280 XP/);
      assert.match(await page.locator('[data-feed-amount="next"]').innerText(),/Lv\.2.*70 XP/,
        'An affordable evolution shortcut must not remove the next-level choice');
      await page.locator('[data-feed-amount="evolution"]').click();
      assert.match(await page.locator('.training-level').innerText(),/Lv\.5/);
      assert.equal(await page.locator('#training-wallet').innerText(),'20 XP');
      assert.equal(await page.locator('[data-evolve-monster]').isEnabled(),true,'Boss mark and level are both required');
      assert.equal(await page.locator('[data-feed-amount="evolution"]').count(),0,'Reached levels must not offer another identical shortcut');
      await noOverflow(page,`${width} exact first evolution feed`);
      await context.close();
    }
    // A fully qualified companion should be visibly evolvable even when no
    // banked XP remains, and a failed local save must never show fake fanfare.
    for(const width of [320,390]){
      const {context,page}=await boot(width);
      await seed(page,{xpWallet:0,monsterXp:{medamago:280},monsterTrials:{medamago:['entry']}});
      await page.locator('[data-home-page="collection"]').click();
      assert.match(await page.locator('[data-open-monster="medamago"] .catalog-evolution').innerText(),/進化できる！/);
      await page.locator('[data-open-monster="medamago"]').click();
      await page.locator('#open-training').click();
      await page.evaluate(()=>{
        const rawSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
          if(key==='speakingym-monsters-prototype-v1')throw new DOMException('Storage is full','QuotaExceededError');
          return rawSet.call(this,key,value);
        };
      });
      await page.locator('[data-evolve-monster]').click();
      assert.match(await page.locator('#growth-feedback').innerText(),/進化を保存できませんでした/);
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'idle',
        'An unsaved evolution must not play a successful evolution celebration');
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).monsterEvolution?.medamago||0),0);
      await noOverflow(page,`${width} unsaved evolution warning`);
      await context.close();
    }
    for(const width of [320,390]){
      const {context,page}=await boot(width);
      await seed(page,{xpWallet:80});
      await page.locator('[data-home-page="collection"]').click();
      await page.locator('[data-open-monster="medamago"]').click();
      await page.locator('#open-training').click();
      await page.evaluate(()=>{
        const rawSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
          if(key==='speakingym-monsters-prototype-v1')throw new DOMException('Storage is full','QuotaExceededError');
          return rawSet.call(this,key,value);
        };
      });
      await page.locator('[data-feed-amount="next"]').click();
      assert.match(await page.locator('#growth-feedback').innerText(),/XPの変更を保存できませんでした/);
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'idle',
        'An unsaved level up must not play a success animation');
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).monsterXp.medamago||0),0);
      await context.close();
    }
    for(const width of [320,390]){
      const {context,page}=await boot(width);
      await seed(page,{xpWallet:350,monsterXp:{medamago:290},monsterEvolution:{medamago:1},monsterTrials:{medamago:['entry']}});
      await page.locator('[data-home-page="collection"]').click();
      await page.locator('[data-open-monster="medamago"]').click();
      await page.locator('#open-training').click();
      assert.match(await page.locator('[data-feed-amount="evolution"]').innerText(),/Lv\.10.*340 XP/);
      await page.locator('[data-feed-amount="evolution"]').click();
      assert.match(await page.locator('.training-level').innerText(),/Lv\.10/);
      assert.equal(await page.locator('#training-wallet').innerText(),'10 XP');
      assert.equal(await page.locator('[data-evolve-monster]').isDisabled(),true,'XP cannot bypass the three distinct boss marks');
      await page.locator('#training-evolution-notes summary').click();
      assert.match(await page.locator('.evolution-trial').innerText(),/ボス攻略 1\/3エリア/);
      await noOverflow(page,`${width} exact second evolution feed`);
      await context.close();
    }
    // Smart feeding spends only the XP needed for one level, rather than all
    // earned XP. The existing 10 XP and all-XP controls remain available.
    for(const width of [320,390]){
      const {context,page}=await boot(width);await seed(page,{xpWallet:75});
      await page.locator('[data-home-page="collection"]').click();
      await page.locator('[data-open-monster="medamago"]').click();
      await page.locator('#open-training').click();
      assert.match(await page.locator('[data-feed-amount="next"]').innerText(),/Lv\.2.*70 XP/);
      assert.equal(await page.locator('[data-feed-amount="10"]').isEnabled(),true);
      assert.equal(await page.locator('[data-feed-amount="all"]').isEnabled(),true);
      await page.locator('[data-feed-amount="next"]').click();
      assert.match(await page.locator('.training-level').innerText(),/Lv\.2/);
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'level');
      assert.equal(await page.locator('#training-wallet').innerText(),'5 XP');
      assert.equal(await page.locator('[data-feed-amount="next"]').count(),0,'Unaffordable next level is not offered');
      assert.equal(await page.locator('[data-feed-amount="10"]').count(),0,
        'Unaffordable ten-XP action should not take space from the affordable option');
      assert.equal(await page.locator('[data-feed-amount="all"]').isEnabled(),true);
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
      assert.equal(saved.monsterXp.medamago,70);
      assert.equal(saved.xpWallet,5);
      await noOverflow(page,`${width} smart level-up`);
      await context.close();
    }
    // A new player with zero XP needs an obvious route into the game instead
    // of a screen made entirely of disabled training buttons.
    for(const width of [320,390]){
      const {context,page}=await boot(width);
      await page.locator('[data-home-page="collection"]').click();
      await page.locator('[data-open-monster="medamago"]').click();
      await page.locator('#open-training').click();
      assert.equal(await page.locator('.training-feed').count(),0);
      assert.equal(await page.locator('#growth-feedback').innerText(),'');
      assert.equal(await page.locator('#training-earn-xp').isVisible(),true);
      await page.locator('#training-earn-xp').click();
      assert.equal(await page.locator('#play-view').isVisible(),true,
        'Earn XP should open the playable dungeon immediately');
      await noOverflow(page,`${width} earn XP route`);
      await context.close();
    }
    // Level milestones announce the *actual* bonuses already used in combat,
    // including multi-level feeding, without granting unearned battle power.
    for(const width of [320,390]){
      // Keep the evolution shortcut out of this milestone-by-milestone case:
      // 150 XP would jump straight from Lv.2 to the Lv.5 evolution threshold.
      const {context,page}=await boot(width);await seed(page,{xpWallet:140,monsterXp:{medamago:130}});
      await page.locator('[data-home-page="collection"]').click();
      await page.locator('[data-open-monster="medamago"]').click();
      await page.locator('#open-training').click();
      await page.locator('[data-feed-amount="next"]').click();
      assert.match(await page.locator('.training-battle-unlock').innerText(),/戦闘HP＋1/,
        'Lv.3 should celebrate the real HP milestone');
      await page.locator('[data-feed-amount="next"]').click();
      assert.match(await page.locator('.training-battle-unlock').innerText(),/熟練技「黄身の二連撃」解放/,
        'Lv.4 should celebrate the real specialty unlock');
      assert.equal(await page.locator('#training-wallet').innerText(),'60 XP');
      await noOverflow(page,`${width} training combat payoff`);
      await context.close();
    }
    // The second evolution needs three distinct boss marks and Lv.10; merely
    // feeding across the threshold must never skip the deliberate ceremony.
    for(const width of [320,390]){
      const {context,page}=await boot(width,'no-preference');
      await seed(page,{monsterXp:{medamago:629},monsterEvolution:{medamago:1},
        monsterTrials:{medamago:['entry','glade','thicket']},xpWallet:10});
      assert.match(await page.locator('#hero-monster-name').innerText(),/Sunnyolk/);
      assert.match(await page.locator('#hero-next-level').innerText(),/Lv\.10.*ボス 3\/3/);
      await page.locator('[data-home-page="collection"]').click();
      await page.locator('[data-open-monster="medamago"]').click();
      await page.locator('#detail-notes summary').click();
      assert.match(await page.locator('#detail-content').innerText(),/第2進化：Lv\.10（累計630 XP）＋異なるボス攻略 3\/3エリア。残り1 XP/);
      await page.locator('#open-training').click();
      await page.locator('[data-feed-amount="10"]').click();
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'level');
      await page.locator('[data-evolve-monster]').click();
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'ascension');
      assert.match(await page.locator('.training-sheet h1').innerText(),/Solaryolk/);
      assert.match(await page.locator('#growth-feedback').innerText(),/第2進化/);
      assert.equal(await page.locator('.growth-character svg').getAttribute('data-stage'),'2');
      assert.equal(await page.locator('.growth-before svg').getAttribute('data-stage'),'1');
      assert.equal(await page.locator('.growth-character').evaluate(e=>getComputedStyle(e).animationName),'ascension-arrive');
      await noOverflow(page,`${width} second evolution`);
      await page.screenshot({path:path.join(shots,`training-${engine}-${width}-ascension.png`),fullPage:true});
      await page.reload();
      assert.equal(await page.locator('#hero-monster-art svg').getAttribute('data-stage'),'2');
      assert.match(await page.locator('#hero-monster-name').innerText(),/Solaryolk/);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).monsterXp.medamago),639);
      await context.close();
    }
    // Every owned character uses a distinct actual CSS attack with motion enabled.
    const motions={medamago:'yolk-dive',katappo:'sock-spring',purupun:'pudding-slam',koge:'toast-flip',cone:'cone-drill',nororo:'roll-charge',keshipon:'eraser-sweep',donako:'doughnut-spin',amekurage:'umbrella-float',fuwari:'cloud-gust',kompass:'compass-dash',pikap:'firefly-flash',mokuryu:'dragon-leap'};
    for(const [id,motion] of Object.entries(motions)){
      const {context,page}=await boot(390,'no-preference');
      await seed(page,{selectedMonster:id});
      console.log(`${engine}: testing ${id} attack`);
      await page.locator('[data-feature-worlds]').click();await page.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await page.locator('#start-forest-simple').click();
      assert.equal(await page.locator('#forest-journey').isVisible(),false);
      assert.equal(await page.locator('#spoken-answer').isVisible(),false);
      assert.equal(await page.locator('#forest-explore-art > .forest-world-svg').count(),1);
      await page.locator('#forest-explore-continue').click();
      assert.equal(await page.locator('#forest-explore-screen').isVisible(),false);
      assert.equal(await page.locator('#forest-world-stage .forest-world-svg').count(),0);
      assert.equal(await page.locator('#forest-world-stage').getAttribute('data-stage'),'arena');
      assert.notEqual(await page.locator('#forest-player-art').evaluate(e=>getComputedStyle(e).animationName),'none');
      const hp=await page.locator('#forest-boss-hp').getAttribute('aria-valuenow');
      await page.locator('#show-answer').click(); // Empty answer: no guard, no attempt.
      assert.equal(await page.locator('.forest-guarding').count(),0);
      await page.locator('#spoken-answer').fill('An unexpected but possibly valid expression.');
      await page.locator('#show-answer').click();
      assert.equal(await page.locator('#forest-guard').evaluate(e=>getComputedStyle(e).animationName),'guard-rise');
      assert.equal(await page.locator('#forest-enemy').evaluate(e=>getComputedStyle(e).animationName),'enemy-brace');
      assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),hp);
      assert.equal(await page.locator('.forest-attack').count(),0);
      assert.match(await page.locator('#forest-battle-log').textContent(),/判定保留/);
      assert.doesNotMatch(await page.locator('#forest-battle-log').textContent(),/不正解/);
      await answer(page);
      const action=await page.locator('#forest-world-stage').getAttribute('data-action');
      const expected=action==='defense'?'companion-shield':action==='reading'?'companion-reading-strike':motion;
      assert.equal(await page.locator('#forest-party').evaluate(e=>getComputedStyle(e).animationName),expected);
      assert.equal(await page.locator('.forest-guarding').count(),0);
      assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'0');
      await page.waitForTimeout(1400); // Verify the whole motion, then navigate out.
      // The motion test ends here; the normal QA covers the Leave button.
      // Closing the isolated context avoids waiting on an offscreen navigation control in mobile WebKit.
      await context.close();
    }
    // The expansion stays inexpensive to verify: test all twelve new sprite
    // identities and attack CSS in one mounted arena, without 12 extra runs.
    const expansionMotions={tsubomi:'bud-spring',kinokko:'spore-spin',shizurin:'drizzle-arc',
      hoshiri:'star-flare',pipino:'chirp-swoop',hiokko:'ember-hop',kippu:'ticket-slice',
      kofuu:'steam-spiral',mafura:'scarf-whip',yukidama:'snow-roll',tegami:'post-dash',tokirin:'clock-pulse'};
    const expanded=await boot(390,'no-preference');await seed(expanded.page);
    await expanded.page.locator('[data-feature-worlds]').click();
    await expanded.page.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});
    await expanded.page.locator('#start-forest-simple').click();
    await expanded.page.locator('#forest-explore-continue').click();
    for(const [id,motion] of Object.entries(expansionMotions)){
      const result=await expanded.page.evaluate(async id=>{
        const {monsterArt}=await import('./monster-art.js');
        const stage=document.querySelector('#forest-world-stage');
        stage.dataset.attack=id;stage.classList.add('forest-attack');
        return {art:monsterArt(id,2),animation:getComputedStyle(document.querySelector('#forest-party')).animationName};
      },id);
      assert.match(result.art,new RegExp(`data-pixel-sprite="${id}"`));
      assert.match(result.art,/data-stage="2"/);
      assert.equal(result.animation,motion,`${id} must not use a generic combat motion`);
    }
    await expanded.context.close();
    // Evolved versions preserve per-character motions and gain an independent aura.
    for(const id of ['medamago','katappo']){
      const {context,page}=await boot(390,'no-preference');
      await seed(page,{selectedMonster:id,monsterXp:{medamago:160,katappo:160},
        monsterEvolution:{medamago:1,katappo:1}});
      console.log(`${engine}: testing evolved ${id} attack`);
      await page.locator('[data-feature-worlds]').click();await page.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await page.locator('#start-forest-simple').click();await page.locator('#forest-explore-continue').click();
      assert.equal(await page.locator('#forest-world-stage').getAttribute('data-evolved'),'true');
      await answer(page);
      const action=await page.locator('#forest-world-stage').getAttribute('data-action');
      const expected=action==='defense'?'companion-shield':action==='reading'?'companion-reading-strike':motions[id];
      assert.equal(await page.locator('#forest-party').evaluate(e=>getComputedStyle(e).animationName),expected);
      assert.equal(await page.locator('#forest-player-art').evaluate(e=>getComputedStyle(e).animationName),'evolved-strike');
      await page.waitForTimeout(1400);
      // The motion test ends here; the normal QA covers the Leave button.
      // Closing the isolated context avoids waiting on an offscreen navigation control in mobile WebKit.
      await context.close();
    }
    const locked=await boot(320);await locked.page.locator('[data-home-page="collection"]').click();
    await locked.page.locator('[data-catalog-filter="all"]').click();
    await locked.page.locator('[data-open-monster="katappo"]').click();
    assert.equal(await locked.page.locator('#open-training').count(),0);
    assert.match(await locked.page.locator('#detail-content').innerText(),/？？？.*未発見の仲間/s);
    assert.equal(await locked.page.locator('[data-pronounce-word]').count(),0,'Undiscovered names and pronunciation stay hidden');
    await locked.page.locator('#detail-back').click();
    await locked.page.locator('[data-open-monster="medamago"]').click();
    await locked.page.evaluate(()=>Object.defineProperty(window,'speechSynthesis',{configurable:true,value:null}));
    await locked.page.locator('[data-pronounce-word]').first().click();
    assert.match(await locked.page.locator('#pronounce-feedback').innerText(),/利用できません/);
    await locked.context.close();
    assert.deepEqual(errors,[]);
    console.log(`${engine}: 4 widths × catalog/detail/training, pronunciation dispatch/fallback, XP/level/evolution/save, 25 distinct attacks and 44 pixel companions, idle/evolved FX, guard/empty-answer, map isolation passed`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
