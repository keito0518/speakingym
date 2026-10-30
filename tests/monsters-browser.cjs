const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
  const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  const shots=path.join(process.cwd(),'qa-screenshots');fs.mkdirSync(shots,{recursive:true});
  const base=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
  const boot=async width=>{
    const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:engine==='webkit',hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage();
    page.on('pageerror',error=>console.error('[monsters-pageerror]',error.message));
    await page.addInitScript(()=>{
      Math.random=()=>.99;
      // Headless voices differ by OS. Verify the intended audio-first path
      // with a stable stand-in, and test the no-audio fallback separately.
      window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(){}}});
    });
    await page.goto(base,{waitUntil:'networkidle'});
    return {context,page};
  };
  const enterHomePanel=async(page,target)=>{
    if(await page.locator('#home-navigation').isVisible()){
      const tile=page.locator(`[data-home-page="${target}"]`);
      if(!await tile.isVisible())await page.locator('#home-extra-modes > summary').click();
      await tile.click();
    }
  };
  const unlockListening=async page=>{
    if(!await page.locator('#play-audio').count())return;
    await page.locator('#play-audio').click();
    const correct=await page.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const {listeningChallengeFor}=await import('./listening-challenges.js');
      return listeningChallengeFor(ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)).correctIndex;
    });
    await page.locator(`[data-listening-choice="${correct}"]`).click();
  };
  try{
    const {context:quickContext,page:quickPage}=await boot(390);
    await quickPage.locator('[data-feature-dungeon]').click();
    assert.equal(await quickPage.locator('#play-view').isVisible(),true,
      'Main CTA enters the actual adventure in one tap, bypassing the area catalogue');
    assert.equal(await quickPage.locator('#forest-explore-continue').isVisible(),true);
    await quickPage.locator('#forest-explore-continue').click();
    assert.equal(await quickPage.locator('#play-card').isVisible(),true,
      'New players reach the first English prompt directly from the main CTA');
    const firstFight=await quickPage.evaluate(()=>({
      stage:document.querySelector('#forest-world-stage').getBoundingClientRect().height,
      answerTop:document.querySelector('#spoken-answer').getBoundingClientRect().top,
      viewport:innerHeight
    }));
    assert.ok(firstFight.stage<=130&&firstFight.answerTop<firstFight.viewport,
      `Mobile first fight must show the answer field without a long decorative scroll: ${JSON.stringify(firstFight)}`);
    await quickContext.close();
    for(const width of [320,375,390,430]){
      const {context,page}=await boot(width);
      assert.equal(await page.getByRole('heading',{name:/英語で戦って/}).isVisible(),true);
      // Regression for actual iPhone screenshot: do NOT orphan the final 「へ。」
      // as a third line. Verify rendered line boxes, not just CSS declarations.
      const headingLines=await page.locator('.home-navigation-head h1 .home-title-phrase').evaluateAll(items=>items.map(el=>{
        const css=getComputedStyle(el),rect=el.getBoundingClientRect(),range=document.createRange();
        range.selectNodeContents(el);
        return {display:css.display,whiteSpace:css.whiteSpace,height:rect.height,lineHeight:parseFloat(css.lineHeight),
          text:el.textContent,renderedLines:range.getClientRects().length,overflow:el.scrollWidth>el.clientWidth+1};
      }));
      assert.deepEqual(headingLines.map(x=>x.text),['英語で戦って、','仲間と冒険へ。']);
      assert.ok(headingLines.every(x=>x.display==='block'&&x.whiteSpace==='nowrap'&&x.renderedLines===1&&!x.overflow&&x.height<=x.lineHeight+2),
        `${engine}/${width} unnatural Japanese wrapping: ${JSON.stringify(headingLines)}`);
      assert.equal(await page.locator('#hero-monster-name').innerText(),'Yolkie');
      assert.match(await page.locator('#hero-vocab').innerText(),/yolk/);
      assert.equal(await page.locator('#home-wallet').innerText(),'0');
      assert.equal(await page.locator('#review-mastery-meter').getAttribute('aria-valuenow'),'0');
      assert.match(await page.locator('#review-journal-list').innerText(),/今日の復習はありません/);
      const metrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(metrics.scroll<=metrics.inner+1,`${engine}/${width} horizontal overflow: ${JSON.stringify(metrics)}`);
      const credits=await page.getByRole('link',{name:'音声クレジット'}).getAttribute('href');
      assert.equal(credits,'./audio-credits.html');
      await page.screenshot({path:path.join(shots,`monsters-${engine}-${width}-home.png`),fullPage:true});
      await page.locator('[data-feature-worlds]').click();
      assert.equal(await page.locator('#dungeon-stage-list').getAttribute('open'),null,
        'Locked stages and chapter metadata start hidden');
      await page.locator('#dungeon-stage-list > summary').click();
      const dungeonLayout=await page.evaluate(()=>{
        const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
        return {banner:rect('.dungeon-selection-banner'),forest:rect('.dungeon-world-forest'),city:rect('.dungeon-world-city'),
          background:getComputedStyle(document.querySelector('.dungeon-selection')).backgroundColor,
          title:document.querySelector('#forest-invite-title').textContent,
          overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      assert.equal(dungeonLayout.title,'Englishダンジョン');
      assert.equal(dungeonLayout.background,'rgba(0, 0, 0, 0)','Dungeon does not wrap both worlds in another green card');
      assert.ok(dungeonLayout.banner.bottom<dungeonLayout.forest.top&&dungeonLayout.forest.bottom<dungeonLayout.city.top,
        `${engine}/${width} standalone dungeon hero and world cards: ${JSON.stringify(dungeonLayout)}`);
      assert.equal(dungeonLayout.overflow,false,`${engine}/${width} dungeon world selection overflows horizontally`);
      assert.equal(await page.locator('.dungeon-world-card').count(),2);
      assert.equal(await page.locator('.dungeon-selection-banner .dungeon-world-card').count(),0);
      await page.screenshot({path:path.join(shots,`monsters-${engine}-${width}-world-select.png`),fullPage:true});
      await page.locator('#home-destination-forest .home-menu-back').click();
      await enterHomePanel(page,'training');
    await page.getByRole('button',{name:/スピーキングを始める/}).click();
      const playMetrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(playMetrics.scroll<=playMetrics.inner+1,`${engine}/${width} question horizontal overflow: ${JSON.stringify(playMetrics)}`);
      await page.screenshot({path:path.join(shots,`monsters-${engine}-${width}-question.png`),fullPage:true});
      await context.close();
    }
    // The home is an actual menu, not eight stacked screens. Tutorial works on mobile.
    const {context:menuContext,page:menuPage}=await boot(390);
    assert.equal(await menuPage.locator('#home-navigation [data-home-page]').count(),9);
    assert.equal(await menuPage.locator('.home-main-actions [data-home-page]').count(),3,
      'Only training, review and companions compete with the main adventure');
    assert.equal(await menuPage.locator('#home-extra-modes').getAttribute('open'),null);
    assert.equal(await menuPage.locator('[data-home-page="forest"]').isVisible(),false);
    await menuPage.locator('#home-extra-modes > summary').click();
    assert.equal(await menuPage.locator('[data-home-page="forest"]').isVisible(),true);
    assert.equal(await menuPage.locator('#home-menu-art svg').count(),1);
    assert.match(await menuPage.locator('.home-feature h2').innerText(),/English\s*ダンジョン/);
    assert.equal(await menuPage.locator('[data-feature-dungeon]').isVisible(),true);
    assert.equal(await menuPage.locator('#home-feature-practice').isVisible(),true,'First-time visitors see a practice shortcut');
    assert.equal(await menuPage.locator('#home-navigation .home-walker').count(),1,'Only the one unlocked starter companion walks');
    assert.equal(await menuPage.locator('#toggle-simple-motion').getAttribute('aria-pressed'),'false');
    await menuPage.locator('#toggle-simple-motion').click();
    assert.equal(await menuPage.locator('#toggle-simple-motion').getAttribute('aria-pressed'),'true');
    assert.equal(await menuPage.locator('.home-walker').evaluate(el=>getComputedStyle(el).animationName),'none');
    await menuPage.reload();
    assert.equal(await menuPage.locator('#toggle-simple-motion').getAttribute('aria-pressed'),'true','Lightweight mode persists across reload');
    await menuPage.locator('#home-extra-modes > summary').click();
    await menuPage.locator('#toggle-simple-motion').click();
    assert.equal(await menuPage.locator('#toggle-simple-motion').getAttribute('aria-pressed'),'false');
    assert.equal(await menuPage.locator('.home-walker').getAttribute('aria-hidden'),'true');
    assert.equal(await menuPage.locator('.home-walker').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    assert.equal(await menuPage.locator('.home-walker').evaluate(el=>getComputedStyle(el).animationName),'none','Reduced motion setting stops movement');
    assert.equal(await menuPage.locator('[data-home-page="forest"] .home-navigation-icon svg').count(),1);
    const forestColumnSpan=await menuPage.locator('[data-home-page="forest"]').evaluate(el=>getComputedStyle(el).gridColumnStart);
    assert.equal(forestColumnSpan,'auto','Optional stage selection should not dominate the main menu');
    assert.match(await menuPage.locator('.home-feature').innerText(),/英語/);
    assert.equal(await menuPage.locator('#home-navigation').isVisible(),true);
    assert.equal(await menuPage.locator('.home-destination:visible').count(),0);
    await menuPage.locator('[data-home-page="tutorial"]').click();
    assert.equal(await menuPage.locator('#monsters-tutorial').isVisible(),true);
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/Englishダンジョン/);
    await menuPage.locator('#tutorial-next').click();
    await menuPage.locator('#tutorial-next').click();
    assert.match(await menuPage.locator('#tutorial-tips').innerText(),/iPhone/);
    assert.equal(await menuPage.locator('#tutorial-tips li').count(),2,'Every step explains a practical action');
    assert.match(await menuPage.locator('#tutorial-scene-main').innerText(),/話す \/ 文字入力/);
    await menuPage.locator('[data-tutorial-chapter="battle"]').click();
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/仲間を編成/);
    assert.equal(await menuPage.locator('[data-tutorial-chapter="battle"]').getAttribute('aria-pressed'),'true');
    await menuPage.locator('#tutorial-next').click();
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/英語で攻撃/);
    await menuPage.locator('[data-tutorial-chapter="growth"]').click();
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/育てて進化/);
    assert.match(await menuPage.locator('#tutorial-counter').innerText(),/STEP 8 \/ 9/);
    await menuPage.locator('#tutorial-close').click();
    assert.equal(await menuPage.locator('#monsters-tutorial').isVisible(),false);
    await menuPage.locator('[data-home-page="forest"]').click();
    await menuPage.locator('#start-practice-battle').click();
    assert.equal(await menuPage.locator('#monsters-practice-battle').isVisible(),true);
    assert.match(await menuPage.locator('#practice-battle-progress').innerText(),/1 \/ 4/);
    await menuPage.locator('[data-practice-action="attack"]').click();
    await menuPage.locator('[data-practice-action="night"]').click();
    assert.match(await menuPage.locator('#practice-battle-feedback').innerText(),/もう一度/);
    assert.match(await menuPage.locator('#practice-battle-progress').innerText(),/2 \/ 4/);
    await menuPage.locator('[data-practice-action="wait"]').click();
    await menuPage.locator('[data-practice-action="am"]').click();
    assert.equal(await menuPage.locator('#practice-enemy-hp').innerText(),'HP 1/2','Successful guard does not harm enemy');
    await menuPage.locator('[data-practice-action="thanks"]').click();
    assert.match(await menuPage.locator('#practice-battle-title').innerText(),/クリア/);
    assert.equal(await menuPage.locator('#practice-enemy-hp').innerText(),'HP 0/2');
    const practiceSaveAfter=await menuPage.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1'));
    assert.ok(practiceSaveAfter,'Practice should leave the ordinary save in place');
    assert.match(await menuPage.locator('[data-practice-action="begin"]').innerText(),/本編の冒険を始める/);
    await menuPage.locator('[data-practice-action="begin"]').click();
    assert.equal(await menuPage.locator('#monsters-practice-battle').isVisible(),false);
    assert.equal(await menuPage.locator('#forest-explore-screen').isVisible(),true,
      'Beginner practice leads to the main story dungeon, not advanced tactics');
    assert.equal(await menuPage.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1')),practiceSaveAfter,
      'The practice must not award XP or change save data');
    await menuPage.locator('#leave-play').click();
    await menuPage.locator('[data-feature-worlds]').click();
    assert.equal(await menuPage.locator('#forest-invite-title').isVisible(),true);
    assert.equal(await menuPage.locator('#forest-invite-title').textContent(),'Englishダンジョン');
    assert.equal(await menuPage.locator('#dungeon-other-modes').getAttribute('open'),null,'Optional modes start collapsed');
    assert.equal(await menuPage.locator('#start-forest-tactics').isVisible(),false,'Beginner sees only the main start action');
    assert.equal(await menuPage.locator('#start-forest').isVisible(),true,'Main adventure is immediately available');
    assert.equal(await menuPage.locator('#dungeon-stage-list').getAttribute('open'),null);
    await menuPage.locator('#dungeon-stage-list > summary').click();
    const startBeforeWorlds=await menuPage.evaluate(()=>document.querySelector('#start-forest').getBoundingClientRect().top < document.querySelector('#forest-area-list').getBoundingClientRect().top);
    assert.equal(startBeforeWorlds,true,'New players can start before reading eight area cards');
    await menuPage.locator('#open-dungeon-tutorial').click();
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/Englishダンジョン/);
    await menuPage.locator('#tutorial-close').click();
    await menuPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    assert.equal(await menuPage.locator('#home-navigation').isVisible(),true);
    await menuPage.locator('[data-home-page="forest"]').click();
    assert.equal(await menuPage.locator('#forest-invite-title').isVisible(),true);
    await menuPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    await menuPage.locator('[data-home-page="listening"]').click();
    assert.match(await menuPage.locator('#play-mode-label').innerText(),/リスニング道場/);
    assert.equal(await menuPage.locator('#play-audio').count(),1);
    await unlockListening(menuPage);
    assert.equal(await menuPage.locator('#spoken-answer').isVisible(),false);
    assert.equal(await menuPage.locator('#next-question').isVisible(),true);
    await menuPage.locator('#leave-play').click();
    await menuPage.locator('[data-home-page="training"]').click();
    await menuPage.locator('[data-start="speaking"]').click();
    assert.match(await menuPage.locator('#play-mode-label').innerText(),/スピーキング道場/);
    assert.equal(await menuPage.locator('#play-audio').count(),0);
    await menuPage.locator('#leave-play').click();
    await menuPage.locator('[data-home-page="review"]').click();
    assert.equal(await menuPage.locator('#saved-review-title').isVisible(),true);
    assert.equal(await menuPage.locator('#review-journal-title').isVisible(),true);
    await menuContext.close();
    // Retention mode is deliberately no-animation, honors completed review
    // dates and records a single companion bond for the spaced second day.
    const {context:recallContext,page:recallPage}=await boot(390);
    await recallPage.evaluate(()=>{
      const raw=JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1'));
      raw.retention={'think-cafe':{stage:1,lastDay:'2026-10-20',nextDay:'2026-10-21'}};
      raw.progress.think={attempts:1,smoothContexts:['think-cafe'],smoothDays:['2026-10-20'],lastDay:'2026-10-20',nextReviewDay:'2026-10-21',lastRating:'smooth'};
      localStorage.setItem('speakingym-monsters-prototype-v1',JSON.stringify(raw));
    });
    await recallPage.reload();
    await enterHomePanel(recallPage,'review');
    assert.equal(await recallPage.locator('#start-retention-review').isEnabled(),true);
    assert.match(await recallPage.locator('#retention-due-label').innerText(),/1問/);
    await recallPage.locator('#start-retention-review').click();
    assert.match(await recallPage.locator('#play-mode-label').innerText(),/定着チェック/);
    assert.equal(await recallPage.locator('#forest-journey').isVisible(),false);
    assert.equal(await recallPage.locator('#play-card').getAttribute('data-prompt-id'),'think-cafe');
    await recallPage.locator('#spoken-answer').fill('Let me think about it.');
    await recallPage.locator('#show-answer').click();
    assert.match(await recallPage.locator('.retention-result').innerText(),/翌日チェック達成/);
    assert.match(await recallPage.locator('.retention-result').innerText(),/仲間との絆/);
    await recallPage.locator('#next-question').click();
    const afterReview=await recallPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(afterReview.monsterBonds.medamago,1);
    assert.equal(afterReview.retention['think-cafe'].stage,2);
    await recallContext.close();
    // Daily five-minute workout stays calm, explains answers and records
    // completed offline work without a hard timer or a battle animation.
    const {context:gymContext,page:gymPage}=await boot(390);
    await enterHomePanel(gymPage,'daily');
    assert.equal(await gymPage.locator('#start-daily-gym').isVisible(),true);
    assert.match(await gymPage.locator('#daily-plan-status').innerText(),/8問/);
    await enterHomePanel(gymPage,'daily');
    await gymPage.locator('#start-daily-gym').click();
    assert.match(await gymPage.locator('#play-mode-label').innerText(),/今日の5分ジム/);
    assert.equal(await gymPage.locator('#play-view').evaluate(e=>e.classList.contains('review-only')),true);
    assert.equal(await gymPage.locator('#forest-journey').isVisible(),false);
    assert.equal(await gymPage.locator('#play-clock').innerText(),'5分目安 · 時間制限なし');
    const allDaily=[];
    for(let i=0;i<8;i++){
      const id=await gymPage.locator('#play-card').getAttribute('data-prompt-id');
      const listening=await gymPage.locator('#play-audio').count()>0;
      allDaily.push(id);
      const answer=await gymPage.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
      });
      if(i===0){
        await gymPage.locator('#bookmark-question').click();
        assert.equal(await gymPage.locator('#bookmark-question').getAttribute('aria-pressed'),'true');
      }
      if(listening)await unlockListening(gymPage);
      else{await gymPage.locator('#spoken-answer').fill(answer);await gymPage.locator('#show-answer').click();}
      assert.equal(await gymPage.locator('#next-question').isVisible(),true);
      const held=await gymPage.locator('#play-card').getAttribute('data-prompt-id');
      await gymPage.waitForTimeout(150);
      assert.equal(await gymPage.locator('#play-card').getAttribute('data-prompt-id'),held,'Explanation stays until next tap');
      await gymPage.locator('#next-question').click();
    }
    assert.equal(new Set(allDaily).size,8);
    assert.match(await gymPage.locator('#result-title').innerText(),/今日の5分ジム完了/);
    assert.match(await gymPage.locator('#result-rewards').innerText(),/ヒントなし正解率/);
    const gymSaved=await gymPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(gymSaved.dailyHistory.length,1);
    assert.equal(gymSaved.dailyHistory[0].total,8);
    assert.equal(gymSaved.dailyHistory[0].independent,8);
    assert.equal(gymSaved.savedPromptIds.length,1);
    await gymPage.locator('#result-home').click();
    assert.match(await gymPage.locator('#daily-last-rate').innerText(),/100%/);
    await gymContext.close();
    // Verify English-only task cards at both higher difficulties and narrow widths.
    for (const width of [320,375,390,430]) {
      const {context:levelContext,page:levelPage}=await boot(width);
      for (const difficulty of ['normal','hard']) {
        await enterHomePanel(levelPage,'training');
        await levelPage.locator(`[data-difficulty="${difficulty}"]`).click();
        assert.equal(await levelPage.locator(`[data-difficulty="${difficulty}"]`).getAttribute('aria-pressed'),'true');
        await levelPage.getByRole('button',{name:/スピーキングを始める/}).click();
        assert.match(await levelPage.locator('#play-card').innerText(),/ENGLISH → ENGLISH|LISTENING ONLY/);
        if(await levelPage.locator('#play-audio').count()){
          assert.equal(await levelPage.locator('.task-panel').isVisible(),false,'Listening task text must start hidden');
          assert.equal(await levelPage.locator('#answer-area').isVisible(),false);
          await unlockListening(levelPage);
          assert.equal(await levelPage.locator('[data-listening-choice]').count(),difficulty==='hard'?4:3);
          assert.equal(await levelPage.locator('.task-panel').isVisible(),false,'Listening ends with understanding, without speaking');
          assert.equal(await levelPage.locator('#spoken-answer').isVisible(),false);
          assert.equal(await levelPage.locator('#next-question').isVisible(),true);
        }else assert.equal(await levelPage.locator('.task-panel').isVisible(),true);
        assert.equal(await levelPage.locator('#play-card').evaluate(el=>/[ぁ-んァ-ン一-龯]/.test(el.innerText)),false);
        const metrics=await levelPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
        assert.ok(metrics.scroll<=metrics.inner+1,`${engine}/${width} ${difficulty} overflow: ${JSON.stringify(metrics)}`);
        await levelPage.screenshot({path:path.join(shots,`monsters-${engine}-${width}-${difficulty}.png`),fullPage:true});
        await levelPage.locator('#leave-play').click();
      }
      await levelContext.close();
    }
    const {context:hardContext,page:hardPage}=await boot(390);
    await enterHomePanel(hardPage,'training');
    await hardPage.locator('[data-difficulty="hard"]').click();
    await hardPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    await enterHomePanel(hardPage,'challenge');
    assert.match(await hardPage.locator('.question-top').innerText(),/1 \/ 3/);
    for(let i=0;i<3;i++){
      if(await hardPage.locator('#play-audio').count())await unlockListening(hardPage);
      else{
        await hardPage.locator('#spoken-answer').fill('I do not know yet.');
        await hardPage.locator('#show-answer').click();
        await hardPage.locator('#show-example').click();
      }
      await hardPage.locator('#next-question').click();
    }
    assert.equal(await hardPage.locator('#result-view').isVisible(),true);
    await hardPage.locator('#result-home').click();
    await hardPage.reload();
    assert.equal(await hardPage.locator('[data-difficulty="hard"]').getAttribute('aria-pressed'),'true');
    await hardContext.close();
    // Audio-first gate: guessing the meaning incorrectly cannot expose the
    // response or grant XP; a later successful reply is marked as hinted.
    const {context:listenContext,page:listenPage}=await boot(320);
    const auPath=await listenPage.evaluate(async()=>{
      const {LISTENING_AUDIO}=await import('./listening-audio-manifest.js');
      return LISTENING_AUDIO['recommend-gift'].src;
    });
    assert.match(auPath,/-au-[a-f0-9]{12}\.mp3$/);
    const auResponse=await listenPage.request.get(new URL(auPath,base).toString());
    assert.equal(auResponse.status(),200,'Australian accent audio must be served as a real MP3 file');
    // With the expanded speaking pool, the first random practice prompt is
    // no longer guaranteed to be listening. Seed one due listening review so
    // this test reliably exercises the audio-first gate, not shuffle order.
    await listenPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();
      seeded.reviewPrompts['late-call']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await listenPage.reload();
    await enterHomePanel(listenPage,'listening');
    assert.equal(await listenPage.locator('#play-card').getAttribute('data-prompt-id'),'late-call');
    assert.equal(await listenPage.locator('#answer-area').isVisible(),false);
    assert.equal(await listenPage.locator('#listening-response').isVisible(),false);
    const realAudio=listenPage.waitForResponse(response=>
      /\/audio\/listening\/late-call-[a-f0-9]{12}\.mp3$/.test(response.url())&&response.status()===200,
    {timeout:15000});
    await listenPage.locator('#play-audio').click();
    await realAudio;
    assert.equal(await listenPage.locator('[data-listening-choice]').count(),3);
    const listened=await listenPage.evaluate(async()=>{
      const {listeningChallengeFor}=await import('./listening-challenges.js');
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
      return {correct:listeningChallengeFor(prompt).correctIndex,answer:prompt.answer};
    });
    await listenPage.locator(`[data-listening-choice="${(listened.correct+1)%3}"]`).click();
    assert.equal(await listenPage.locator('#answer-area').isVisible(),false);
    assert.match(await listenPage.locator('#listening-status').innerText(),/もう一度聞いて/);
    assert.equal(await listenPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),0);
    await listenPage.locator(`[data-listening-choice="${listened.correct}"]`).click();
    assert.equal(await listenPage.locator('#answer-area').isVisible(),true);
    assert.equal(await listenPage.locator('#spoken-answer').isVisible(),false,'Listening never asks for microphone/typing');
    assert.equal(await listenPage.locator('#transcript').isVisible(),true,'Reveal actual clip transcript as feedback');
    assert.match(await listenPage.locator('#feedback-panel').innerText(),/\+8 XP/);
    assert.equal(await listenPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),8);
    await listenContext.close();
    // Previously uncertain answers are surfaced again in a later practice run.
    const {context:reviewContext,page:reviewPage}=await boot(390);
    await reviewPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();
      seeded.reviewPrompts['help-bag']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await reviewPage.reload();
    assert.equal(await reviewPage.locator('#review-due-count').innerText(),'1');
    assert.match(await reviewPage.locator('#review-journal-list').innerText(),/助けを求める/);
    await enterHomePanel(reviewPage,'review');
    await reviewPage.locator('#start-review-practice').click();
    assert.equal(await reviewPage.locator('#play-card').getAttribute('data-prompt-id'),'help-bag');
    assert.match(await reviewPage.locator('#speech-helper').innerText(),/復習問題/);
    await reviewPage.locator('#spoken-answer').fill('I do not know what to say here.');
    await reviewPage.locator('#show-answer').click();
    const queued=await reviewPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(queued.xpWallet,0);
    assert.equal(queued.reviewPrompts['help-bag'],'2020-01-01');
    await reviewContext.close();
    // A natural request with a different verb must earn the same XP on mobile
    // and show the alternate-meaning note (article omissions have their own
    // dedicated coaching message, covered by the unit tests).
    {
      const {context:variantContext,page:variantPage}=await boot(375);
      await variantPage.evaluate(async()=>{
        const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
        const seeded=createSave();
        seeded.reviewPrompts['prefer-window-easy']='2020-01-01';
        localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
      });
      await variantPage.reload();
      await enterHomePanel(variantPage,'review');
      await variantPage.locator('#start-review-practice').click();
      assert.equal(await variantPage.locator('#play-card').getAttribute('data-prompt-id'),'prefer-window-easy');
      await variantPage.locator('#spoken-answer').fill('May I have a window seat, please?');
      await variantPage.locator('#show-answer').click();
      assert.match(await variantPage.locator('#feedback-panel').innerText(),/その言い方でもOK！/);
      assert.match(await variantPage.locator('#feedback-panel').innerText(),/\+16 XP/);
      assert.equal(await variantPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),16);
      await variantContext.close();
    }
    // A real due 3-day checkpoint must precede a DIFFERENT real-world use
    // of the same expression. No RPG animation, extra speech requirement or
    // false progression from merely opening the plan.
    {
    const {context:recallContext,page:recallPage}=await boot(320);
    const dueId='think-cafe';
    await recallPage.evaluate(async id=>{
      const {createSave,recordAnswer,STORAGE_KEY,dayKey,addDays}=await import('./monster-engine.js');
      const today=dayKey();
      let seeded=recordAnswer(createSave(),id,'smooth',addDays(today,-4)).save;
      seeded=recordAnswer(seeded,id,'smooth',addDays(today,-3)).save;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    },dueId);
    await recallPage.reload();
    await enterHomePanel(recallPage,'review');
    assert.match(await recallPage.locator('#retention-due-label').innerText(),/1問/);
    assert.match(await recallPage.locator('#retention-transfer-label').innerText(),/1問/);
    await recallPage.locator('#start-retention-review').click();
    assert.equal(await recallPage.locator('#play-card').getAttribute('data-prompt-id'),dueId);
    assert.match(await recallPage.locator('.daily-question-kind').innerText(),/予定日の記憶チェック/);
    assert.equal(await recallPage.locator('#forest-journey').isVisible(),false);
    let answer=await recallPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await recallPage.locator('#spoken-answer').fill(answer);
    await recallPage.locator('#show-answer').click();
    await recallPage.locator('#next-question').click();
    const transferId=await recallPage.locator('#play-card').getAttribute('data-prompt-id');
    assert.notEqual(transferId,dueId);
    assert.match(await recallPage.locator('.daily-question-kind').innerText(),/別の場面で応用/);
    const recallMetrics=await recallPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(recallMetrics.scroll<=recallMetrics.inner+1,`320px retention overflow: ${JSON.stringify(recallMetrics)}`);
    answer=await recallPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await recallPage.locator('#spoken-answer').fill(answer);
    await recallPage.locator('#show-answer').click();
    const recallSaved=await recallPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(recallSaved.retention[dueId].stage,3);
    assert.equal(recallSaved.retention[transferId].stage,1,'New scene has its own spaced schedule');
    await recallContext.close();
    }
    // A recognisable speaking word-order mistake gives a reason without
    // declaring all unfamiliar wording wrong or awarding full unhinted XP.
    const {context:coachContext,page:coachPage}=await boot(390);
    await coachPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();
      seeded.reviewPrompts['late-traffic-easy']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await coachPage.reload();
    await enterHomePanel(coachPage,'training');
    await coachPage.getByRole('button',{name:/スピーキングを始める/}).click();
    assert.equal(await coachPage.locator('#play-card').getAttribute('data-prompt-id'),'late-traffic-easy');
    await coachPage.locator('#spoken-answer').fill("I'll be late five minutes.");
    await coachPage.locator('#show-answer').click();
    assert.match(await coachPage.locator('#feedback-panel').innerText(),/five minutes late/);
    assert.match(await coachPage.locator('#feedback-panel').innerText(),/ヒントありXP/);
    await coachPage.locator('#spoken-answer').fill('I will be 5 minutes late.');
    await coachPage.locator('#show-answer').click();
    assert.match(await coachPage.locator('#feedback-panel').innerText(),/\+8 XP/);
    await coachContext.close();
    // Missed objective answers remain visible at home and return as a specific
    // vocabulary battle instead of becoming a generic speaking review.
    const {context:weakContext,page:weakPage}=await boot(320);
    await weakPage.evaluate(async()=>{
      const {createSave,recordAnswer,STORAGE_KEY}=await import('./monster-engine.js');
      localStorage.setItem(STORAGE_KEY,JSON.stringify(recordAnswer(createSave(),'forest-vocab-ticket-easy','again').save));
    });
    await weakPage.reload();
    assert.match(await weakPage.locator('#forest-weakness-summary').innerText(),/苦手の復習 1問/);
    await enterHomePanel(weakPage,'forest');
    await weakPage.locator('#start-forest').click();
    await weakPage.locator('#forest-explore-continue').click();
    const firstAnswer=await weakPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await weakPage.locator('#spoken-answer').fill(firstAnswer);
    await weakPage.locator('#show-answer').click();
    await weakPage.locator('#next-question').click();
    await weakPage.locator('[data-forest-route="moss"]').click();
    if(await weakPage.locator('#forest-explore-screen').isVisible())await weakPage.locator('#forest-explore-continue').click();
    await unlockListening(weakPage);
    assert.equal(await weakPage.locator('#spoken-answer').isVisible(),false);
    await weakPage.locator('#next-question').click();
    if(await weakPage.locator('#forest-explore-screen').isVisible())await weakPage.locator('#forest-explore-continue').click();
    assert.equal(await weakPage.locator('#play-card').getAttribute('data-prompt-id'),'forest-vocab-ticket-easy');
    assert.match(await weakPage.locator('.forest-review-banner').innerText(),/苦手の再挑戦/);
    await weakPage.locator('#spoken-answer').fill('wrong vocabulary word');
    await weakPage.locator('#show-answer').click();
    assert.match(await weakPage.locator('.forest-teaching-nudge').innerText(),/考え方のヒント/);
    const afterMiss=await weakPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).quizProgress['forest-vocab-ticket-easy'].misses);
    assert.equal(afterMiss,2);
    await weakPage.locator('#show-example').click();
    assert.match(await weakPage.locator('.forest-teaching-title').innerText(),/なぜこの単語を使う/);
    assert.match(await weakPage.locator('.forest-teaching-transfer').innerText(),/別の場面でも使おう/);
    const afterReveal=await weakPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).quizProgress['forest-vocab-ticket-easy'].misses);
    assert.equal(afterReveal,afterMiss,'Revealing an answer must not double-count the same wrong tap');
    await weakContext.close();
    // A natural-sounding but locally unverified reply must not trap learners
    // in the forest. They may choose a non-rewarded practice route instead.
    const {context:practiceContext,page:practicePage}=await boot(390);
    await enterHomePanel(practicePage,'forest');
    await practicePage.locator('#start-forest').click();
    await practicePage.locator('#forest-explore-continue').click();
    const recordedPrompt=await practicePage.locator('#play-card').getAttribute('data-prompt-id');
    await practicePage.locator('#bookmark-question').click();
    assert.equal(await practicePage.locator('#bookmark-question').getAttribute('aria-pressed'),'true');
    await practicePage.locator('#spoken-answer').fill('I would like some extra seconds to make my decision.');
    await practicePage.locator('#show-answer').click();
    assert.match(await practicePage.locator('#feedback-panel').innerText(),/判定保留/);
    assert.equal(await practicePage.locator('#continue-as-practice').isVisible(),true);
    const practiceXp=await practicePage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet);
    await practicePage.locator('#continue-as-practice').click();
    assert.equal(await practicePage.locator('#forest-explore-options').isVisible(),true,'Opt-in practice should advance without demanding the model sentence');
    assert.equal(await practicePage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),practiceXp,'No XP for unverified expression');
    await practicePage.locator('#leave-play').click();
    await enterHomePanel(practicePage,'review');
    assert.match(await practicePage.locator('#start-saved-review').innerText(),/1問/);
    assert.match(await practicePage.locator('#saved-question-list').innerText(),/森|カフェ|待ち合わせ|旅行|英語|聞/);
    await enterHomePanel(practicePage,'review');
    await practicePage.locator('#start-saved-review').click();
    assert.equal(await practicePage.locator('#play-card').getAttribute('data-prompt-id'),recordedPrompt);
    assert.equal(await practicePage.locator('#forest-journey').isVisible(),false,'Saved review must have no RPG battles');
    assert.equal(await practicePage.locator('#play-view').evaluate(el=>el.classList.contains('review-only')),true);
    await practicePage.locator('#leave-play').click();
    await practiceContext.close();
    // Full 5-mob + 3-hit-boss adventure on responsive viewports.
    for(const width of [320,375,390,430]){
      const {context:forestContext,page:forestPage}=await boot(width);
      await enterHomePanel(forestPage,'forest');
    await forestPage.locator('#start-forest').click();
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),true);
      assert.equal(await forestPage.locator('#forest-journey').isVisible(),false);
      assert.equal(await forestPage.locator('#forest-explore-art > svg').count(),1);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-explore.png`),fullPage:true});
      // Start from the page top without Playwright's auto-scroll. The game
      // must not drag a learner down to the answer box on encounter entry.
      await forestPage.evaluate(()=>{
        window.scrollTo({top:0,behavior:'instant'});
        document.querySelector('#forest-explore-continue').click();
      });
      await forestPage.waitForTimeout(80);
      assert.ok((await forestPage.evaluate(()=>window.scrollY))<=2,
        `${engine}/${width}: a new encounter must not force downward scrolling`);
      assert.equal(await forestPage.locator('#forest-journey').isVisible(),true);
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),false);
      assert.equal(await forestPage.locator('.forest-battle-shell #play-card').count(),1);
      assert.equal(await forestPage.locator('.forest-battle-shell #answer-area').count(),1);
      assert.equal(await forestPage.locator('.forest-battle-shell #forest-battle-log').count(),1);
      assert.match(await forestPage.locator('#forest-companion-name').innerText(),/Yolkie/);
      assert.equal(await forestPage.locator('#forest-world-backdrop .battle-arena-svg').count(),1);
      assert.equal(await forestPage.locator('#forest-world-stage .forest-world-svg').count(),0);
      assert.equal(await forestPage.locator('#forest-world-stage [data-landmark]').count(),0);
      assert.equal(await forestPage.locator('#forest-enemy svg').count(),1);
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-route'),'wild');
      assert.match(await forestPage.locator('#forest-foe-name').innerText(),/Mossling/);
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-foe'),'mossling');
      assert.match(await forestPage.locator('#forest-foe-pattern').innerText(),/霧のこだま/);
      assert.match(await forestPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 5/);
      assert.equal(await forestPage.locator('.answer-quick-help > div').isVisible(),false,
        'Dungeon inputs keep the optional hint, without an extra competing instruction card');
      assert.equal(await forestPage.locator('#show-hint').isVisible(),true);
      assert.ok((await forestPage.locator('#show-hint').boundingBox()).height>=44,
        'The streamlined hint remains easy to tap');
      const battleMetrics=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(battleMetrics.scroll<=battleMetrics.inner+1,`${engine}/${width} forest battle overflow: ${JSON.stringify(battleMetrics)}`);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-battle.png`),fullPage:true});
      const answer=async()=>{
        if(await forestPage.locator('#play-audio').count()){
          assert.equal(await forestPage.locator('#answer-area').isVisible(),false);
          await unlockListening(forestPage);
          assert.equal(await forestPage.locator('#answer-area').isVisible(),true);
        }
        if(!await forestPage.locator('#play-audio').count()){
          const example=await forestPage.evaluate(async()=>{
            const {ALL_PROMPTS}=await import('./monster-data.js');
            return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
          });
          await forestPage.locator('#spoken-answer').fill(example);
          await forestPage.locator('#show-answer').click();
        }
        assert.match(await forestPage.locator('#feedback-panel').innerText(),/関門突破/);
        assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-attack')),true);
        assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-guarding')),false);
        assert.equal(await forestPage.locator('#forest-damage').isVisible(),true);
        const action=await forestPage.locator('#forest-world-stage').getAttribute('data-action');
        assert.match(await forestPage.locator('#forest-battle-log').innerText(),/1ダメージ！/);
        if(action==='defense')assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-defended')),true);
        if(action==='reading')assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-reading-hit')),true);
      };
      const moveOn=async()=>{
        const next=forestPage.locator('#next-question');
        if(await next.isVisible())await next.click();
      };
      // Seeing a model answer cannot open a gate or mint any XP.
      await forestPage.locator('#spoken-answer').fill('I have no idea.');
      await forestPage.locator('#show-answer').click();
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-attack')),false);
      assert.match(await forestPage.locator('#forest-battle-log').innerText(),/霧に身を隠して.*判定保留.*攻撃は発生しません/);
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-guarding')),true);
      assert.equal(await forestPage.locator('#forest-guard svg').count(),1);
      assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'1');
      await forestPage.locator('#show-example').click();
      await moveOn();
      assert.match(await forestPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 5/);
      await answer();
      await moveOn();
      assert.match(await forestPage.locator('#forest-explore-title').innerText(),/分かれ道/);
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),true);
      assert.equal(await forestPage.locator('#answer-area').isVisible(),false);
      assert.equal(await forestPage.locator('[data-forest-route]').count(),2);
      const routeMetrics=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(routeMetrics.scroll<=routeMetrics.inner+1,`${engine}/${width} forest choice overflow: ${JSON.stringify(routeMetrics)}`);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-route.png`),fullPage:true});
      await forestPage.locator('[data-forest-route="moss"]').click();
      assert.equal(await forestPage.locator('#forest-explore-art').getAttribute('data-route'),'moss');
      if(await forestPage.locator('#forest-explore-screen').isVisible())await forestPage.locator('#forest-explore-continue').click();
      await forestPage.locator('#forest-journey').waitFor({state:'visible'});
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-route'),'moss');
      for(let mob=2;mob<=5;mob++){
        assert.match(await forestPage.locator('.question-top').innerText(),new RegExp('ENCOUNTER '+mob+' \/ 5'));
        if(mob===3){
          // Word-weakness buttons are functional, and a wrong choice gives no XP.
          assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-action'),'weakness');
          const info=await forestPage.evaluate(async()=>{
            const {ALL_PROMPTS}=await import('./monster-data.js');
            const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
            return {answer:prompt.answer,options:prompt.options};
          });
          const bad=info.options.findIndex(x=>x!==info.answer);
          const good=info.options.indexOf(info.answer);
          const originalXp=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet);
          await forestPage.locator(`[data-vocab-option="${bad}"]`).click();
          assert.equal(await forestPage.locator('#spoken-answer').inputValue(),info.options[bad]);
          await forestPage.locator('#show-answer').click();
          // Incorrect choices now display a specific meaning-error category
          // instead of the former generic retry heading.
          assert.match(await forestPage.locator('#feedback-panel').innerText(),/伝わる意味が違うよ/);
          assert.match(await forestPage.locator('.forest-teaching-nudge').innerText(),/考え方のヒント/);
          assert.equal(await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),originalXp);
          await forestPage.locator(`[data-vocab-option="${good}"]`).click();
          assert.equal(await forestPage.locator('#spoken-answer').inputValue(),info.answer);
          // Editing a selected word changes the highlighted option but never
          // turns this multiple-choice battle into a microphone question.
          await forestPage.locator('#spoken-answer').fill('different answer');
          assert.equal(await forestPage.locator('[data-vocab-option][aria-pressed="true"]').count(),0);
          assert.equal(await forestPage.locator('#mic-button').isVisible(),false);
          await forestPage.locator('#spoken-answer').fill(info.answer);
          assert.equal(await forestPage.locator(`[data-vocab-option="${good}"]`).getAttribute('aria-pressed'),'true');
          assert.equal(await forestPage.locator('#mic-button').isVisible(),false);
        }
        if(mob===4){
          assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-action'),'spell');
          const info=await forestPage.evaluate(async()=>{
            const {ALL_PROMPTS}=await import('./monster-data.js');
            const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
            return {answer:prompt.answer,tokens:prompt.tokens};
          });
          const words=info.answer.replace(/[.!?]/g,'').split(' '),used=new Set();
          for(const word of words){
            const i=info.tokens.findIndex((candidate,i)=>candidate===word&&!used.has(i));
            assert.ok(i>=0,`Missing word ${word}`);
            used.add(i);
            await forestPage.locator(`[data-grammar-piece="${i}"]`).click();
          }
          assert.equal(await forestPage.locator('#spoken-answer').inputValue(),words.join(' '));
          assert.match(await forestPage.locator('#forest-grammar-built').innerText(),/ /);
        }
        await answer();
        assert.equal(await forestPage.locator('#forest-success-explanation').getAttribute('open'),null,
          'Success feedback starts concise, with extra teaching available on request');
        assert.equal(await forestPage.locator('#next-question').isVisible(),true,
          'Next step remains immediately available without reading long details');
        if(mob===3 || mob===4){
          assert.equal(await forestPage.locator('.forest-teaching-title').isVisible(),false,
            'The detailed explanation must not push the next button below it');
          await forestPage.locator('#forest-success-explanation > summary').click();
          assert.equal(await forestPage.locator('.forest-teaching-title').isVisible(),true,
            'Learners can choose to inspect the full teaching content');
          assert.match(await forestPage.locator('.forest-teaching-title').innerText(),mob===3?/なぜこの単語を使う/:/なぜこの語順になる/);
          assert.match(await forestPage.locator('#forest-auto-status').innerText(),/準備ができたら次へ/);
          assert.equal(await forestPage.locator('#pause-auto').count(),0);
          assert.ok((await forestPage.locator('.feedback-note').innerText()).length>35,'Objective quizzes should explain the answer, not only mark it right');
        }
        await moveOn();
        if(await forestPage.locator('#forest-explore-screen').isVisible()){
          if(mob===4){
            // One interactive story event per chapter, before the fifth foe.
            // Choosing a scene must not affect XP, attempts or language gates.
            assert.equal(await forestPage.locator('#forest-explore-event').isVisible(),true);
            assert.equal(await forestPage.locator('[data-forest-event-option]').count(),2);
            assert.equal(await forestPage.locator('.forest-npc-dialogue').isVisible(),true);
            assert.match(await forestPage.locator('.forest-npc-dialogue [lang="en"]').innerText(),/Did you hear that voice/);
            assert.match(await forestPage.locator('[data-forest-event-option]').first().innerText(),/Let's listen again/);
            assert.equal(await forestPage.locator('.forest-npc-dialogue > small').isVisible(),true,
              'Easy mode retains a clear Japanese meaning underneath the NPC line');
            assert.equal(await forestPage.locator('#forest-explore-continue').isVisible(),true,'Optional story may be skipped');
            const beforeChoice=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
            await forestPage.locator('[data-forest-event-option]').first().click();
            assert.match(await forestPage.locator('#forest-explore-event').innerText(),/探索の記録|EXPEDITION MEMORY/);
            assert.match(await forestPage.locator('.forest-npc-reply [lang="en"]').innerText(),/sound is bouncing off the rocks/);
            assert.equal(await forestPage.locator('[data-forest-event-option]').count(),0);
            const afterChoice=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
            assert.equal(afterChoice.xpWallet,beforeChoice.xpWallet,'Story choices cannot award XP');
            assert.deepEqual(afterChoice.ownedMonsters,beforeChoice.ownedMonsters);
            assert.deepEqual(afterChoice.progress,beforeChoice.progress);
            assert.deepEqual(afterChoice.reviewPrompts,beforeChoice.reviewPrompts);
            assert.equal(afterChoice.forest.journal.length,beforeChoice.forest.journal.length+1,'Events should persist to the adventure journal');
            assert.equal(afterChoice.forest.journal.at(-1).eventId,'entry-moss');
          }
          await forestPage.locator('#forest-explore-continue').click();
        }
        await forestPage.locator('#forest-journey').waitFor({state:'visible'});
      }
      assert.match(await forestPage.locator('.question-top').innerText(),/BOSS ATTACK 1 \/ 3/);
      assert.equal(await forestPage.locator('.battle-arena-svg').getAttribute('data-arena'),'thorn-vault');
      assert.match(await forestPage.locator('#forest-foe-name').innerText(),/Thorn King/);
      assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'3');
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-boss-stage')),true);
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-boss-power'),'echo');
      assert.match(await forestPage.locator('.forest-boss-special').textContent(),/確認 1\/3 · 相手の言葉を理解/);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-boss.png`),fullPage:true});
      for(let hit=1;hit<=3;hit++){
        assert.match(await forestPage.locator('.question-top').innerText(),new RegExp('BOSS ATTACK '+hit+' \/ 3'));
        assert.match(await forestPage.locator('.forest-boss-dialogue').innerText(),new RegExp('BOSS DIALOGUE · '+hit+'\/3'));
        assert.equal(await forestPage.locator('#play-card').getAttribute('data-prompt-id'),['late-call','forest-grammar-arrive-easy','boss-delay-apology-easy'][hit-1]);
        assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-action'),hit===1?'defense':hit===2?'spell':'attack');
        assert.match(await forestPage.locator('#forest-foe-pattern').innerText(),/こだま|暗号|トゲ王の問い/);
        if(width===390&&hit===3){
          // Regression: after the boss's recorded listening task, iOS WebKit
          // may never send onstart/onerror/onend at the final speaking task.
          // The mic must recover and expose actual keyboard dictation, rather
          // than trap the learner with a permanently orange dead button.
          assert.equal(await forestPage.locator('#speech-alternatives').isVisible(),true);
          assert.equal(await forestPage.locator('#speech-alternatives').getAttribute('open'),'','Final boss keeps the iPhone fallback ready');
          assert.match(await forestPage.locator('#native-dictation').innerText(),/おすすめ/);
          await forestPage.locator('#mic-button').click();
          assert.equal(await forestPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
          await forestPage.locator('#speech-helper').filter({hasText:/マイクから応答がありません/}).waitFor({timeout:6500});
          assert.equal(await forestPage.locator('#mic-button').getAttribute('aria-pressed'),'false');
          await forestPage.locator('#native-dictation').click();
          assert.equal(await forestPage.locator('#spoken-answer').evaluate(el=>document.activeElement===el),true);
        }
        await answer();
        assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),String(3-hit));
        if(hit===3)assert.match(await forestPage.locator('#forest-battle-log').innerText(),/Thorn Kingをたおした！/);
        if(width===390&&hit===2){
          // Emulate iPhone Safari immediately before its final boss card is
          // rendered; Chrome and WebKit each exercise this no-callback path.
          await forestPage.evaluate(()=>{
            Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15'});
            class HungRecognition{start(){}stop(){this.stopped=true;}abort(){this.aborted=true;}}
            Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:HungRecognition});
          });
        }
        await moveOn();
      }
      assert.equal(await forestPage.locator('#result-view').isVisible(),true);
      assert.match(await forestPage.locator('#result-title').innerText(),/ボスを討伐/);
    assert.equal(await forestPage.locator('#result-next-panel').isVisible(),true,'Cleared chapter should offer a direct next action');
    assert.match(await forestPage.locator('#result-next').innerText(),/次へ/);
      assert.equal(await forestPage.locator('#result-detail-panel').getAttribute('open'),null,
        'Detailed medals and learning report should begin collapsed for clarity');
      assert.match(await forestPage.locator('#result-quick-summary').innerText(),/XP/);
      await forestPage.locator('#result-detail-panel > summary').click();
      assert.equal(await forestPage.locator('.boss-medal-result').getAttribute('data-medal-rank'),'2',
        'Seven independently verified chapter gates and all three boss checks earn silver, not gold');
      assert.match(await forestPage.locator('.boss-medal-result').innerText(),/銀ランク獲得/);
      assert.match(await forestPage.locator('#result-rewards').innerText(),/ボス勲章 初回・昇格報酬 ＋20 XP/);
      const medalLayout=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(medalLayout.scroll<=medalLayout.inner+1,`${engine}/${width}: trophy card overflow ${JSON.stringify(medalLayout)}`);
      assert.match(await forestPage.locator('#result-discoveries').innerText(),/Mosslight/);
      assert.match(await forestPage.locator('#result-discoveries').innerText(),/探索の記録/);
      assert.equal(await forestPage.locator('#dungeon-learning-report').isVisible(),true);
      assert.match(await forestPage.locator('#dungeon-report-title').innerText(),/森の入口 · 学習レポート/);
      assert.equal(await forestPage.locator('.dungeon-report-skill').count(),4);
      assert.match(await forestPage.locator('#dungeon-learning-report').innerText(),/自力で確認できた問題/);
      assert.match(await forestPage.locator('#dungeon-learning-report').innerText(),/文法・語順/);
      assert.match(await forestPage.locator('#dungeon-learning-report').innerText(),/次のおすすめ/);
      assert.equal(await forestPage.locator('#dungeon-retry-weak').isVisible(),true);
      const xp=Number((await forestPage.locator('#result-rewards').innerText()).match(/\+(\d+) XP/)?.[1]);
      assert.ok(xp>0&&xp<=120,'Hint-assisted review should not inflate XP: '+xp);
      await forestPage.locator('#dungeon-retry-weak').click();
      assert.match(await forestPage.locator('#play-mode-label').innerText(),/ダンジョンの復習/);
      assert.equal(await forestPage.locator('#forest-journey').isVisible(),false);
      assert.equal(await forestPage.locator('#play-view').evaluate(el=>el.classList.contains('review-only')),true);
      assert.ok(await forestPage.locator('#play-card').getAttribute('data-prompt-id'),'Review must replay original question');
      await forestPage.locator('#leave-play').click();
      await forestPage.locator('[data-home-page="collection"]').click();
      assert.match(await forestPage.locator('#forest-collection-relics').innerText(),/Mosslight/);
      assert.match(await forestPage.locator('#forest-journal-summary').innerText(),/イベント 1\/8種類/);
      assert.match(await forestPage.locator('#forest-journal-events').innerText(),/光るキノコの輪/);
      await forestPage.reload();
      await forestPage.locator('[data-home-page="collection"]').click();
      assert.match(await forestPage.locator('#forest-collection-relics').innerText(),/Mosslight/);
      await forestPage.locator('#collection-home').click();
      assert.match(await forestPage.locator('#forest-home-progress').innerText(),/森 1\/4/);
      assert.match(await forestPage.locator('[data-enter-forest="entry"] .forest-area-status').innerText(),/銀勲章/);
      await forestPage.locator('[data-home-page="collection"]').click();
      assert.equal(await forestPage.locator('.boss-medal-collection-area').count(),8);
      assert.equal(await forestPage.locator('.boss-medal-slot').count(),24);
      assert.equal(await forestPage.locator('.boss-medal-collection-area').first().locator('[data-medal-rank="2"]').count(),1,
        'Silver trophy must also appear in the companion collection');
      const collectionWidth=await forestPage.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}));
      assert.ok(collectionWidth.content<=collectionWidth.viewport+1,
        `${engine}/${width}: boss medal collection must fit the phone screen: ${JSON.stringify(collectionWidth)}`);
      await forestPage.locator('[data-open-monster="medamago"]').click();
      assert.match(await forestPage.locator('#detail-content').innerText(),/ことばの連撃/,
        'Companion field notes must describe actual tactical abilities instead of saying not implemented');
      await forestPage.locator('#detail-back').click();
      await forestPage.locator('#collection-home').click();
      const saved=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
      assert.equal(saved.forest.clears,1);
      assert.deepEqual(saved.forest.medals,{entry:{easy:2}},'Boss medal must survive a full WebKit/Chromium reload');
      assert.deepEqual(saved.forest.relics,['moss-lantern']);
      assert.equal(saved.forest.journal.length,1);
      assert.equal(saved.forest.journal[0].eventId,'entry-moss');
      assert.equal(saved.xpWallet,xp+20,'first silver trophy adds a one-time, spendable training bonus');
      await forestContext.close();
    }
    // A second world needs a genuine locked-to-unlocked play path, distinct
    // map/battle artwork and non-overflowing mobile controls on every viewport.
    for(const width of [320,375,390,430]){
      const {context:cityContext,page:cityPage}=await boot(width);
      await enterHomePanel(cityPage,'forest');
      await cityPage.locator('#dungeon-stage-list > summary').click();
      assert.equal(await cityPage.locator('.dungeon-world-card').count(),2,'Forest and City must be separate, clearly labelled world panels');
      assert.equal(await cityPage.locator('#dungeon-world-forest-title').innerText(),'はじまりの森');
      assert.equal(await cityPage.locator('#dungeon-world-city-title').innerText(),'雪灯りの街');
      assert.match(await cityPage.locator('.dungeon-world-city .dungeon-world-heading').innerText(),/4エリア/);
      assert.equal(await cityPage.locator('.dungeon-world-forest [data-enter-forest]').count(),4);
      assert.equal(await cityPage.locator('.dungeon-world-city [data-enter-forest]').count(),4);
      const worldColors=await cityPage.evaluate(()=>({forest:getComputedStyle(document.querySelector('.dungeon-world-forest')).backgroundImage,city:getComputedStyle(document.querySelector('.dungeon-world-city')).backgroundImage,scroll:document.documentElement.scrollWidth,inner:innerWidth}));
      assert.notEqual(worldColors.forest,worldColors.city,'Distinct destinations need distinct color themes');
      assert.ok(worldColors.scroll<=worldColors.inner+1,`${engine}/${width} world-select overflow: ${JSON.stringify(worldColors)}`);
      const cityCard=cityPage.locator('[data-enter-forest="city"]');
      assert.equal(await cityCard.isEnabled(),false,'City is locked on fresh saves');
      assert.match(await cityCard.innerText(),/森の4エリアを攻略で解放/);
      assert.match(await cityPage.locator('[data-enter-forest="glade"]').innerText(),/前のエリアを攻略で解放/);
      await cityPage.evaluate(async()=>{
        const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
        const {FOREST_AREAS,finishForest}=await import('./forest-engine.js');
        let save=createSave();
        for(const area of FOREST_AREAS)save=finishForest(save,'sunlit','medamago',area.id).save;
        localStorage.setItem(STORAGE_KEY,JSON.stringify(save));
      });
      await cityPage.reload({waitUntil:'networkidle'});
      await enterHomePanel(cityPage,'forest');
      assert.equal(await cityCard.isEnabled(),true,'Four forest victories unlock the City');
      assert.match(await cityPage.locator('#forest-home-progress').innerText(),/森 4\/4 · 街 0\/4/);
      assert.match(await cityPage.locator('#start-forest').innerText(),/雪灯りの街/);
      if(width===390)await cityPage.screenshot({path:path.join(shots,`city-${engine}-${width}-selection.png`),fullPage:true});
      await cityCard.click();
      assert.match(await cityPage.locator('#forest-explore-title').innerText(),/雪灯りの街/);
      assert.equal(await cityPage.locator('#forest-explore-art .city-world-svg').count(),1);
      assert.match(await cityPage.locator('#forest-explore-art .city-world-svg').getAttribute('aria-label'),/雪の積もった街/);
      const mapMetrics=await cityPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(mapMetrics.scroll<=mapMetrics.inner+1,`${engine}/${width} City map overflow ${JSON.stringify(mapMetrics)}`);
      if(width===390)await cityPage.screenshot({path:path.join(shots,`city-${engine}-${width}-map.png`),fullPage:true});
      await cityPage.locator('#forest-explore-continue').click();
      assert.equal(await cityPage.locator('#forest-world-stage').getAttribute('data-area'),'city');
      assert.equal(await cityPage.locator('.battle-arena-svg').getAttribute('data-arena'),'city-platform');
      assert.equal(await cityPage.locator('#forest-world-backdrop .forest-world-svg').count(),0);
      assert.match(await cityPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 10/);
      assert.equal(await cityPage.locator('#forest-enemy svg').getAttribute('aria-label'),'街の敵モンスター');
      const battleMetrics=await cityPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(battleMetrics.scroll<=battleMetrics.inner+1,`${engine}/${width} City battle overflow ${JSON.stringify(battleMetrics)}`);
      if(width===390)await cityPage.screenshot({path:path.join(shots,`city-${engine}-${width}-battle.png`),fullPage:true});
      await unlockListening(cityPage);
      await cityPage.locator('#next-question').click();
      assert.equal(await cityPage.locator('#forest-explore-options').isVisible(),true);
      assert.equal(await cityPage.locator('[data-forest-route]').count(),2);
      await cityPage.locator('[data-forest-route="market"]').click();
      await cityPage.locator('#forest-journey').waitFor({state:'visible'});
      assert.match(await cityPage.locator('#forest-route-status').innerText(),/マーケット通り/);
      assert.match(await cityPage.locator('.question-top').innerText(),/ENCOUNTER 2 \/ 10/);
      await cityPage.locator('#leave-play').click();
      if(width===390){
        const upcoming=[['city','city-market'],['city-market','city-terminal'],['city-terminal','city-blizzard']];
        for(const [clearedId,nextId] of upcoming){
          await cityPage.evaluate(async areaId=>{
            const {STORAGE_KEY}=await import('./monster-engine.js');
            const {finishForest}=await import('./forest-engine.js');
            const old=JSON.parse(localStorage.getItem(STORAGE_KEY));
            const cleared=finishForest(old,'market','medamago',areaId);
            localStorage.setItem(STORAGE_KEY,JSON.stringify(cleared.save));
          },clearedId);
          await cityPage.reload({waitUntil:'networkidle'});
          await enterHomePanel(cityPage,'forest');
          assert.equal(await cityPage.locator(`[data-enter-forest="${nextId}"]`).isEnabled(),true,`${nextId} unlocks after its predecessor`);
          await cityPage.locator(`[data-enter-forest="${nextId}"]`).click();
          assert.equal(await cityPage.locator('#forest-explore-art .city-world-svg').getAttribute('data-city-chapter'),nextId);
          await cityPage.locator('#forest-explore-continue').click();
          assert.equal(await cityPage.locator('.battle-arena-svg').getAttribute('data-city-chapter'),nextId);
          assert.match(await cityPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 10/);
          const m=await cityPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
          assert.ok(m.scroll<=m.inner+1,`${engine} ${nextId} scene overflow: ${JSON.stringify(m)}`);
          await cityPage.locator('#leave-play').click();
        }
      }
      await cityContext.close();
    }
    // Explanations remain visible until the learner chooses to continue.
    // A route remains a manual choice, without an automatic explanation timer.
    const {context:autoContext,page:autoPage}=await boot(390);
    const autoAnswer=async()=>{
      if(await autoPage.locator('#play-audio').count())await unlockListening(autoPage);
      else{
        const answer=await autoPage.evaluate(async()=>{
          const {ALL_PROMPTS}=await import('./monster-data.js');
          return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
        });
        await autoPage.locator('#spoken-answer').fill(answer);
        await autoPage.locator('#show-answer').click();
      }
    };
    await enterHomePanel(autoPage,'forest');
    await autoPage.locator('#start-forest').click();
    await autoPage.locator('#forest-explore-continue').click();
    await autoAnswer();
    assert.match(await autoPage.locator('#forest-auto-status').innerText(),/準備ができたら次へ/);
    assert.equal(await autoPage.locator('#forest-success-explanation').getAttribute('open'),null);
    const nextAboveDetails=await autoPage.evaluate(()=>document.querySelector('#next-question').getBoundingClientRect().top<document.querySelector('#forest-success-explanation').getBoundingClientRect().top);
    assert.equal(nextAboveDetails,true,'Progress is accessible ahead of optional teaching on phones');
    const firstPrompt=await autoPage.locator('#play-card').getAttribute('data-prompt-id');
    await autoPage.waitForTimeout(3000);
    assert.equal(await autoPage.locator('#play-card').getAttribute('data-prompt-id'),firstPrompt,'Reading time is unlimited');
    assert.equal(await autoPage.locator('#next-question').isVisible(),true);
    await autoPage.locator('#next-question').click();
    assert.match(await autoPage.locator('#forest-explore-title').innerText(),/分かれ道/);
    await autoPage.locator('[data-forest-route="sunlit"]').click();
    await autoPage.locator('#forest-journey').waitFor({state:'visible',timeoutMs:4500});
    assert.match(await autoPage.locator('.question-top').innerText(),/ENCOUNTER 2/);
    await autoAnswer();
    assert.match(await autoPage.locator('#forest-combo').innerText(),/2 HIT COMBO/);
    await autoPage.locator('#next-question').click();
    if(await autoPage.locator('#forest-explore-screen').isVisible())await autoPage.locator('#forest-explore-continue').click();
    await autoPage.locator('#forest-journey').waitFor({state:'visible',timeoutMs:4500});
    assert.match(await autoPage.locator('.question-top').innerText(),/ENCOUNTER 3/);
    await autoAnswer();
    const thirdPrompt=await autoPage.locator('#play-card').getAttribute('data-prompt-id');
    await autoPage.waitForTimeout(800);
    assert.equal(await autoPage.locator('#play-card').getAttribute('data-prompt-id'),thirdPrompt);
    await autoPage.locator('#next-question').click();
    if(await autoPage.locator('#forest-explore-screen').isVisible())await autoPage.locator('#forest-explore-continue').click();
    await autoPage.locator('#forest-journey').waitFor({state:'visible',timeoutMs:4500});
    assert.match(await autoPage.locator('.question-top').innerText(),/ENCOUNTER 4/);
    await autoPage.locator('#leave-play').click();
    assert.equal(await autoPage.locator('#home-view').isVisible(),true);
    await autoContext.close();
    // Endless mode limits attempts by difficulty; ambiguous results are not falsely called wrong.
    const {context:endlessContext,page:endlessPage}=await boot(390);
    await enterHomePanel(endlessPage,'training');
    await endlessPage.locator('[data-difficulty="hard"]').click();
    await endlessPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    await enterHomePanel(endlessPage,'forest');
    await endlessPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await endlessPage.locator('#start-forest-endless').click();
    assert.equal(await endlessPage.locator('#forest-explore-screen').isVisible(),true);
    await endlessPage.locator('#forest-explore-continue').click();
    assert.match(await endlessPage.locator('#play-mode-label').innerText(),/エンドレス/);
    assert.match(await endlessPage.locator('#forest-tries').innerText(),/あと1回/);
    await endlessPage.locator('#spoken-answer').fill('I have no idea what to say here.');
    await endlessPage.locator('#show-answer').click();
    assert.match(await endlessPage.locator('#feedback-panel').innerText(),/判定保留/);
    assert.match(await endlessPage.locator('#forest-tries').innerText(),/あと1回/,'An uncertain speaking reply must not consume the final try');
    assert.equal(await endlessPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),0);
    const openingAnswer=await endlessPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await endlessPage.locator('#spoken-answer').fill(openingAnswer);
    await endlessPage.locator('#show-answer').click();
    await endlessPage.locator('#next-question').click();
    if(await endlessPage.locator('#forest-explore-screen').isVisible()){
      await endlessPage.locator('[data-forest-route="moss"]').click();
      if(await endlessPage.locator('#forest-explore-screen').isVisible())await endlessPage.locator('#forest-explore-continue').click();
    }
    // Continue past the listening task with an authored answer, then verify
    // that an objectively incorrect vocabulary choice does spend the try.
    await unlockListening(endlessPage);
    assert.equal(await endlessPage.locator('#spoken-answer').isVisible(),false);
    await endlessPage.locator('#next-question').click();
    await endlessPage.locator('#forest-journey').waitFor({state:'visible',timeout:6500});
    assert.match(await endlessPage.locator('.question-top').innerText(),/ENCOUNTER 3/);
    const xpBeforeWrong=await endlessPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet);
    const wrongVocab=await endlessPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
      return {kind:prompt.kind,wrong:prompt.options?.find(option=>option!==prompt.answer)};
    });
    assert.equal(wrongVocab.kind,'vocab');
    assert.ok(wrongVocab.wrong);
    await endlessPage.locator('#spoken-answer').fill(wrongVocab.wrong);
    await endlessPage.locator('#show-answer').click();
    assert.match(await endlessPage.locator('#feedback-panel').innerText(),/挑戦回数を使い切った/);
    await endlessPage.locator('#forest-exit').click();
    assert.match(await endlessPage.locator('#result-title').innerText(),/挑戦終了/);
    const endedSave=await endlessPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(endedSave.xpWallet,xpBeforeWrong,'An incorrect quiz answer cannot grant XP');
    assert.equal(endedSave.forest.clears,0);
    await endlessContext.close();
    // Fake the browser speech API: check start/stop, stale onend, capture,
    // retry, denied permission, and changing views without a stuck mic.
    const {context:micContext,page:micPage}=await boot(390);
    await micPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();
      seeded.reviewPrompts['think-cafe']='2020-01-01';
      seeded.reviewPrompts['repeat-class']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await micPage.reload();
    await micPage.evaluate(()=>{
      class FakeRecognition {
        start(){window.__activeMic=this;}
        abort(){this.aborted=true;queueMicrotask(()=>this.onend?.());}
        stop(){this.stopped=true;}
      }
      window.SpeechRecognition=FakeRecognition;
    });
    await enterHomePanel(micPage,'training');
    await micPage.getByRole('button',{name:/スピーキングを始める/}).click();
    assert.equal(await micPage.locator('#play-card').getAttribute('data-prompt-id'),'think-cafe');
    await unlockListening(micPage);
    const micButton=micPage.locator('#mic-button');
    await micButton.click();
    assert.equal(await micButton.getAttribute('aria-pressed'),'true');
    assert.equal(await micButton.getAttribute('aria-label'),'録音を停止する');
    // Interim results must be visible as the learner speaks, before onend.
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Let me'}],{isFinal:false})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Let me');
    assert.equal(await micPage.locator('#spoken-answer').evaluate(el=>el.classList.contains('transcript-interim')),true);
    assert.equal(await micButton.getAttribute('aria-pressed'),'true');
    assert.equal(await micButton.isVisible(),true);
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Let me think'}],{isFinal:false})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Let me think');
    assert.match(await micPage.locator('#speech-helper').innerText(),/リアルタイム/);
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Let me think about it.'}],{isFinal:true})]}));
    assert.equal(await micButton.isVisible(),true);
    assert.equal(await micPage.locator('#retry-mic').isVisible(),true);
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Let me think about it.');
    assert.equal(await micPage.locator('#spoken-answer').evaluate(el=>el.classList.contains('transcript-interim')),false);
    await micPage.locator('#retry-mic').click();
    assert.equal(await micButton.getAttribute('aria-pressed'),'true');
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Could you'}],{isFinal:false})]}));
    await micButton.click(); // stop(), NOT abort(): still waiting for WebKit's final transcript.
    assert.equal(await micButton.getAttribute('aria-pressed'),'false');
    assert.equal(await micPage.evaluate(()=>window.__activeMic.stopped),true);
    assert.equal(await micPage.evaluate(()=>Boolean(window.__activeMic.aborted)),false,'Stopping must not discard pending speech');
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Could you help me?'}],{isFinal:true})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Could you help me?');
    assert.equal(await micPage.locator('#retry-mic').isVisible(),true);
    await micButton.click();
    await micPage.evaluate(()=>window.__activeMic.onerror?.({error:'not-allowed'}));
    assert.equal(await micButton.getAttribute('aria-pressed'),'false');
    assert.match(await micPage.locator('#speech-helper').innerText(),/許可されていません/);
    await micPage.locator('#spoken-answer').fill('Let me think about it.');
    await micPage.locator('#show-answer').click();
    assert.equal(await micButton.isVisible(),false);
    await micPage.locator('#next-question').click();
    assert.equal(await micPage.locator('#play-card').getAttribute('data-prompt-id'),'repeat-class');
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'false');
    await micPage.locator('#mic-button').click();
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Could you'}],{isFinal:false})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Could you');
    // An interim recognition that ends without final text must not leave an active mic.
    await micPage.evaluate(()=>window.__activeMic.onend());
    assert.equal(await micPage.locator('#mic-button').isVisible(),true);
    assert.equal(await micPage.locator('#retry-mic').isVisible(),true);
    await micPage.locator('#retry-mic').click();
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await micPage.locator('#leave-play').click();
    assert.equal(await micPage.locator('#home-view').isVisible(),true);
    assert.equal(await micPage.locator('#play-view').isVisible(),false);
    await micContext.close();
    // Simulate an iPhone embedded browser which exposes SpeechRecognition but
    // returns no words. Never keep a fake active microphone indefinitely.
    const {context:iosContext,page:iosPage}=await boot(390);
    await iosPage.addInitScript(()=>{
      Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15'});
      class SilentSpeech{
        start(){window.__silentSpeech=this;queueMicrotask(()=>this.onstart?.());}
        stop(){this.stopped=true;queueMicrotask(()=>this.onend?.());}
        abort(){this.aborted=true;}
      }
      Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:SilentSpeech});
    });
    await iosPage.reload();
    await enterHomePanel(iosPage,'training');
    await iosPage.getByRole('button',{name:/スピーキングを始める/}).click();
    await unlockListening(iosPage);
    assert.equal(await iosPage.locator('#speech-alternatives').isVisible(),true);
    assert.equal(await iosPage.locator('#native-dictation').isVisible(),true);
    await iosPage.locator('#mic-button').click();
    assert.equal(await iosPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await iosPage.evaluate(()=>window.__silentSpeech.onend());
    assert.equal(await iosPage.locator('#mic-button').getAttribute('aria-pressed'),'false');
    await iosPage.locator('#mic-button').click();
    await iosPage.evaluate(()=>window.__silentSpeech.onend());
    assert.match(await iosPage.locator('#speech-helper').innerText(),/声を文字にできていません/);
    await iosPage.locator('#native-dictation').click();
    assert.equal(await iosPage.locator('#spoken-answer').evaluate(e=>document.activeElement===e),true,'Native keyboard fallback must focus the editable field after an explicit tap');
    await iosPage.locator('#spoken-answer').fill('That is fine with me.');
    assert.equal(await iosPage.locator('#spoken-answer').inputValue(),'That is fine with me.');
    await iosPage.locator('#leave-play').click();
    await enterHomePanel(iosPage,'forest');
    await iosPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await iosPage.locator('#start-forest-tactics').click();
    await iosPage.locator('#forest-explore-continue').click();
    assert.equal(await iosPage.locator('#speech-alternatives').isVisible(),true,'iPhone always retains microphone alternatives');
    assert.equal(await iosPage.locator('#speech-alternatives').getAttribute('open'),null,'Normal battle starts with the extra help collapsed');
    assert.equal(await iosPage.locator('#native-dictation').isVisible(),false,'Alternative input is one optional disclosure, not a wall of text');
    await iosPage.locator('#mic-button').click();
    await iosPage.evaluate(()=>window.__silentSpeech.onend());
    assert.equal(await iosPage.locator('#speech-alternatives').getAttribute('open'),'','Microphone failure reveals native dictation automatically');
    assert.equal(await iosPage.locator('#native-dictation').isVisible(),true);
    await iosContext.close();
    const {context,page}=await boot(390);
    await page.evaluate(async()=>{
      const {createSave,recordAnswer,STORAGE_KEY}=await import('./monster-engine.js');
      // One authentic prior expression keeps the short flow focused on rewards
      // while Soxie still requires FOUR independent expressions to recruit.
      let seeded=recordAnswer(createSave(),'help-bag','smooth','2026-10-25').save;
      seeded=recordAnswer(seeded,'prefer-city','smooth','2026-10-25').save;
      // The first exercise in this scenario uses a hint, so it does not
      // increase the independent expression count.
      seeded.xpWallet=0;
      for(const id of ['think-trip','repeat-station','agree-friend'])seeded.reviewPrompts[id]='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await page.reload();
    await enterHomePanel(page,'training');
    await page.getByRole('button',{name:/スピーキングを始める/}).click();
    assert.match(await page.locator('#play-mode-label').innerText(),/スピーキング道場/);
    const speakingSeen=[];
    for(let i=0;i<6;i++){
      const id=await page.locator('#play-card').getAttribute('data-prompt-id');
      speakingSeen.push(id);
      assert.equal(await page.locator('#play-audio').count(),0,'Speaking-only must not depend on listening audio');
      const answer=await page.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
      });
      if(i===0){
        assert.equal(await page.locator('#hint-panel').isHidden(),true);
        const positions=await page.evaluate(()=>({hint:document.querySelector('#show-hint').getBoundingClientRect().top,answer:document.querySelector('#spoken-answer').getBoundingClientRect().top}));
        assert.ok(positions.hint>positions.answer,'A beginner sees the cloze hint below their own answer');
        await page.locator('#show-hint').click();
        assert.match(await page.locator('#hint-panel').innerText(),/穴埋めヒント/);
        assert.match(await page.locator('#hint-panel').innerText(),/____/);
        assert.equal(await page.locator('#show-hint').getAttribute('aria-expanded'),'true');
        assert.equal(await page.locator('#show-hint').isDisabled(),true);
        const clozeWord=await page.evaluate(async()=>{
          const {ALL_PROMPTS}=await import('./monster-data.js');
          const {beginnerClozeFor}=await import('./speaking-guidance.js');
          return beginnerClozeFor(ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)).word;
        });
        await page.locator('#spoken-answer').fill(clozeWord);
        await page.locator('#show-answer').click();
        assert.match(await page.locator('#cloze-practice-status').innerText(),/空欄は正解/);
        assert.equal(await page.locator('#spoken-answer').inputValue(),'','Word practice is not graded as a full reply');
        assert.equal(await page.locator('#feedback-panel .grading-correct').count(),0);
        const mobile=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
        assert.ok(mobile.scroll<=mobile.inner+1,`390px guided speaking must not overflow: ${JSON.stringify(mobile)}`);
      }
      await page.locator('#spoken-answer').fill(answer);
      await page.locator('#show-answer').click();
      assert.ok((await page.locator('#feedback-panel').innerText()).includes(i===0?'+8 XP':'+16 XP'));
      await page.locator('#next-question').click();
    }
    assert.equal(new Set(speakingSeen).size,6);
    await page.locator('#result-view').waitFor({state:'visible'});
    assert.match(await page.locator('#result-discoveries').innerText(),/Soxie/);
    const trainingEarned=88;
    assert.ok((await page.locator('#result-rewards').innerText()).includes('+88 XP ストック'));
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-result.png`),fullPage:true});
    await page.locator('#result-collection').click();
    assert.equal(await page.locator('#collection-wallet').innerText(),trainingEarned+' XP');
    assert.equal(await page.locator('#collection-grid [data-feed-monster]').count(),0);
    await page.locator('[data-open-monster="katappo"]').click();
    assert.equal(await page.locator('#detail-view').isVisible(),true);
    assert.match(await page.locator('#detail-content').innerText(),/sock/);
    assert.equal(await page.locator('[data-pronounce-word="sock"]').isVisible(),true);
    await page.locator('#open-training').click();
    assert.equal(await page.locator('#training-view').isVisible(),true);
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="10"]').click();
    assert.equal(await page.locator('#training-wallet').innerText(),(trainingEarned-10)+' XP');
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="all"]').click();
    assert.equal(await page.locator('#training-wallet').innerText(),'0 XP');
    assert.match(await page.locator('#growth-feedback').innerText(),new RegExp('Soxieに'+(trainingEarned-10)+' XP'));
    await page.locator('#training-back').click();
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-collection.png`),fullPage:true});
    const collectionMetrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(collectionMetrics.scroll<=collectionMetrics.inner+1,`${engine}/390 collection horizontal overflow: ${JSON.stringify(collectionMetrics)}`);
    await page.locator('[data-select-monster="katappo"]').click();
    await page.locator('#detail-back').click();
    await page.locator('#collection-home').click();
    assert.ok((await page.locator('#stat-independent').innerText()).includes(' / 16'));
    assert.match(await page.locator('#hero-monster-name').innerText(),/Soxie/);
    await page.getByRole('button',{name:/60秒チャレンジ/}).click();
    assert.match(await page.locator('#play-clock').innerText(),/残り/);
    let listeningXp=0;
    for(let i=0;i<6;i++){
      if(await page.locator('#play-audio').count()){
        await unlockListening(page);
        listeningXp+=16; // Verified comprehension is rewarded, unlike skipped speaking.
      }else{
        await page.locator('#spoken-answer').fill('I do not know yet.');
        await page.locator('#show-answer').click();
        await page.locator('#show-example').click();
      }
      await page.locator('#next-question').click();
    }
    assert.equal(await page.locator('#result-view').isVisible(),true);
    await page.locator('#result-home').click();
    await page.reload();
    assert.match(await page.locator('#hero-monster-name').innerText(),/Soxie/);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(saved.completedRuns,1);assert.ok(saved.totalAnswers>=9);
    assert.ok(saved.ownedMonsters.includes('katappo'));
    assert.equal(saved.monsterXp.katappo,trainingEarned);
    assert.equal(saved.xpWallet,listeningXp); // Skips give zero XP; genuine listening comprehension earns XP.
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-persisted.png`),fullPage:true});
    await context.close();
    console.log(`${engine}: 320/375/390/430 responsive, listening fallback, capture, XP banking/allocation, 60-sec flow and persistence passed`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
