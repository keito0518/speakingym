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
      const {context,page}=await boot(width,'no-preference');await seed(page);
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
      assert.equal(await page.locator('[data-open-monster]').count(),15);
      assert.equal(await page.locator('#collection-grid .word-row, #collection-grid [data-feed-monster]').count(),0);
      assert.equal(await page.locator('#forest-journal-areas .forest-journal-area').count(),4);
      assert.equal(await page.locator('#forest-journal-events .forest-journal-entry').count(),8);
      assert.equal(await page.locator('#forest-journal-badges .forest-journal-badge').count(),6);
      await noOverflow(page,`${width} catalog`);
      await page.waitForTimeout(300); // Let the entry fade finish before visual QA.
      await page.screenshot({path:path.join(shots,`catalog-${engine}-${width}.png`),fullPage:true});
      await page.locator('[data-open-monster="medamago"]').click();
      assert.equal(await page.locator('#collection-view').isVisible(),false);
      assert.match(await page.locator('#detail-content').innerText(),/Yolkie.*メダマゴ/s);
      assert.match(await page.locator('#detail-content').innerText(),/卵の黄身/);
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
      await page.locator('[data-feed-amount="10"]').click();
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'xp');
      assert.equal(await page.locator('.growth-character').evaluate(e=>getComputedStyle(e).animationName),'grow-xp');
      assert.equal(await page.locator('#training-wallet').innerText(),'190 XP');
      for(let i=0;i<6;i++) await page.locator('[data-feed-amount="10"]').click();
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'level');
      assert.match(await page.locator('.training-level').innerText(),/Lv.2/);
      assert.equal(await page.locator('.training-xp').getAttribute('aria-valuenow'),'0');
      assert.equal(await page.locator('.growth-character').evaluate(e=>getComputedStyle(e).animationName),'grow-level');
      await noOverflow(page,`${width} training`);
      await page.screenshot({path:path.join(shots,`training-${engine}-${width}-level.png`),fullPage:true});
      await page.locator('[data-feed-amount="all"]').click();
      assert.equal(await page.locator('.training-sheet').getAttribute('data-growth'),'evolution');
      assert.equal(await page.locator('.growth-character').evaluate(e=>getComputedStyle(e).animationName),'grow-evolution');
      assert.match(await page.locator('.training-sheet h1').innerText(),/Sunnyolk/);
      assert.match(await page.locator('#growth-feedback').innerText(),/進化した/);
      assert.equal(await page.locator('#training-wallet').innerText(),'0 XP');
      assert.equal(await page.locator('[data-feed-amount="all"]').isDisabled(),true);
      await page.waitForTimeout(1400);
      await page.screenshot({path:path.join(shots,`training-${engine}-${width}-evolution.png`),fullPage:true});
      const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
      assert.equal(before.monsterXp.medamago,200);assert.equal(before.ownedMonsters.length,15);
      await page.locator('#training-back').click();
      assert.match(await page.locator('#detail-content').innerText(),/進化後、控えからの連携で「覚醒・追撃」/,
        'Evolved companion notes should describe the real tactical combo instead of the old placeholder');
      await page.locator('#detail-back').click();
      assert.match(await page.locator('[data-open-monster="medamago"]').innerText(),/Sunnyolk.*Lv.3.*進化済み/s);
      await page.reload();
      assert.equal(await page.locator('#home-wallet').innerText(),'0');
      assert.match(await page.locator('#hero-monster-name').innerText(),/Sunnyolk/);
      const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
      assert.deepEqual(after,before);
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
      assert.equal(await page.locator('.forest-attack-select').isVisible(),true,'Attack selection precedes character action tests');
      await page.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
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
    // Evolved versions preserve per-character motions and gain an independent aura.
    for(const id of ['medamago','katappo']){
      const {context,page}=await boot(390,'no-preference');
      await seed(page,{selectedMonster:id,monsterXp:{medamago:160,katappo:160}});
      console.log(`${engine}: testing evolved ${id} attack`);
      await page.locator('[data-feature-worlds]').click();await page.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await page.locator('#start-forest-simple').click();await page.locator('#forest-explore-continue').click();
      await page.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
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
    await locked.page.locator('[data-open-monster="katappo"]').click();
    assert.equal(await locked.page.locator('#open-training').count(),0);
    assert.match(await locked.page.locator('#detail-content').innerText(),/まだ仲間になっていない/);
    await locked.page.evaluate(()=>Object.defineProperty(window,'speechSynthesis',{configurable:true,value:null}));
    await locked.page.locator('[data-pronounce-word="sock"]').click();
    assert.match(await locked.page.locator('#pronounce-feedback').innerText(),/利用できません/);
    await locked.context.close();
    assert.deepEqual(errors,[]);
    console.log(`${engine}: 4 widths × catalog/detail/training, pronunciation dispatch/fallback, XP/level/evolution/save, 15 unique attacks, idle/evolved FX, guard/empty-answer, map isolation passed`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
