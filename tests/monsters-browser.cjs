const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
  const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  const shots=path.join(process.cwd(),'qa-screenshots');fs.mkdirSync(shots,{recursive:true});
  const base='http://127.0.0.1:8766/prototype/speakingym-monsters/';
  const boot=async width=>{
    const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:engine==='webkit',hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage();
    await page.addInitScript(()=>{Math.random=()=>.99;});
    await page.goto(base,{waitUntil:'networkidle'});
    return {context,page};
  };
  try{
    for(const width of [320,375,390,430]){
      const {context,page}=await boot(width);
      assert.equal(await page.getByRole('heading',{name:/英語を話すほど/}).isVisible(),true);
      assert.equal(await page.locator('#hero-monster-name').innerText(),'Yolkie');
      assert.match(await page.locator('#hero-vocab').innerText(),/yolk/);
      assert.equal(await page.locator('#home-wallet').innerText(),'0');
      const metrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(metrics.scroll<=metrics.inner+1,`${engine}/${width} horizontal overflow: ${JSON.stringify(metrics)}`);
      await page.screenshot({path:path.join(shots,`monsters-${engine}-${width}-home.png`),fullPage:true});
      await page.getByRole('button',{name:/まず練習する/}).click();
      const playMetrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(playMetrics.scroll<=playMetrics.inner+1,`${engine}/${width} question horizontal overflow: ${JSON.stringify(playMetrics)}`);
      await page.screenshot({path:path.join(shots,`monsters-${engine}-${width}-question.png`),fullPage:true});
      await context.close();
    }
    // Verify English-only task cards at both higher difficulties and narrow widths.
    for (const width of [320,375,390,430]) {
      const {context:levelContext,page:levelPage}=await boot(width);
      for (const difficulty of ['normal','hard']) {
        await levelPage.locator(`[data-difficulty="${difficulty}"]`).click();
        assert.equal(await levelPage.locator(`[data-difficulty="${difficulty}"]`).getAttribute('aria-pressed'),'true');
        await levelPage.getByRole('button',{name:/まず練習する/}).click();
        assert.match(await levelPage.locator('#play-card').innerText(),/ENGLISH → ENGLISH/);
        assert.equal(await levelPage.locator('.task-panel').isVisible(),true);
        assert.equal(await levelPage.locator('#play-card').evaluate(el=>/[ぁ-んァ-ン一-龯]/.test(el.innerText)),false);
        const metrics=await levelPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
        assert.ok(metrics.scroll<=metrics.inner+1,`${engine}/${width} ${difficulty} overflow: ${JSON.stringify(metrics)}`);
        await levelPage.screenshot({path:path.join(shots,`monsters-${engine}-${width}-${difficulty}.png`),fullPage:true});
        await levelPage.locator('#leave-play').click();
      }
      await levelContext.close();
    }
    const {context:hardContext,page:hardPage}=await boot(390);
    await hardPage.locator('[data-difficulty="hard"]').click();
    await hardPage.getByRole('button',{name:/60秒チャレンジ/}).click();
    assert.match(await hardPage.locator('.question-top').innerText(),/1 \/ 3/);
    for(let i=0;i<3;i++){
      await hardPage.locator('#spoken-answer').fill('I do not know yet.');
      await hardPage.locator('#show-answer').click();
      await hardPage.locator('#show-example').click();
      await hardPage.locator('#next-question').click();
    }
    assert.equal(await hardPage.locator('#result-view').isVisible(),true);
    await hardPage.locator('#result-home').click();
    await hardPage.reload();
    assert.equal(await hardPage.locator('[data-difficulty="hard"]').getAttribute('aria-pressed'),'true');
    await hardContext.close();
    // Full 5-mob + 3-hit-boss adventure on responsive viewports.
    for(const width of [320,375,390,430]){
      const {context:forestContext,page:forestPage}=await boot(width);
      await forestPage.locator('#start-forest').click();
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),true);
      assert.equal(await forestPage.locator('#forest-journey').isVisible(),false);
      assert.equal(await forestPage.locator('#forest-explore-art svg').count(),1);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-explore.png`),fullPage:true});
      await forestPage.locator('#forest-explore-continue').click();
      assert.equal(await forestPage.locator('#forest-journey').isVisible(),true);
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),false);
      assert.equal(await forestPage.locator('.forest-battle-shell #play-card').count(),1);
      assert.equal(await forestPage.locator('.forest-battle-shell #answer-area').count(),1);
      assert.equal(await forestPage.locator('.forest-battle-shell #forest-battle-log').count(),1);
      assert.match(await forestPage.locator('#forest-companion-name').innerText(),/Yolkie/);
      assert.equal(await forestPage.locator('#forest-world-backdrop svg').count(),1);
      assert.equal(await forestPage.locator('#forest-enemy svg').count(),1);
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-route'),'wild');
      assert.match(await forestPage.locator('#forest-foe-name').innerText(),/Mossling/);
      assert.match(await forestPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 5/);
      const battleMetrics=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(battleMetrics.scroll<=battleMetrics.inner+1,`${engine}/${width} forest battle overflow: ${JSON.stringify(battleMetrics)}`);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-battle.png`),fullPage:true});
      const answer=async()=>{
        const example=await forestPage.evaluate(async()=>{
          const {ALL_PROMPTS}=await import('./monster-data.js');
          return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
        });
        await forestPage.locator('#spoken-answer').fill(example);
        await forestPage.locator('#show-answer').click();
        assert.match(await forestPage.locator('#feedback-panel').innerText(),/関門突破/);
        assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-attack')),true);
        assert.equal(await forestPage.locator('#forest-damage').isVisible(),true);
        assert.match(await forestPage.locator('#forest-battle-log').innerText(),/のこうげき！.*1ダメージ！/);
      };
      // Seeing a model answer cannot open a gate or mint any XP.
      await forestPage.locator('#spoken-answer').fill('I have no idea.');
      await forestPage.locator('#show-answer').click();
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-attack')),false);
      assert.match(await forestPage.locator('#forest-battle-log').innerText(),/攻撃は発生しません/);
      await forestPage.locator('#show-example').click();
      await forestPage.locator('#next-question').click();
      assert.match(await forestPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 5/);
      await answer();
      await forestPage.locator('#next-question').click();
      assert.match(await forestPage.locator('#forest-explore-title').innerText(),/分かれ道/);
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),true);
      assert.equal(await forestPage.locator('#answer-area').isVisible(),false);
      assert.equal(await forestPage.locator('[data-forest-route]').count(),2);
      const routeMetrics=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(routeMetrics.scroll<=routeMetrics.inner+1,`${engine}/${width} forest choice overflow: ${JSON.stringify(routeMetrics)}`);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-route.png`),fullPage:true});
      await forestPage.locator('[data-forest-route="moss"]').click();
      assert.equal(await forestPage.locator('#forest-explore-art').getAttribute('data-route'),'moss');
      await forestPage.locator('#forest-explore-continue').click();
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-route'),'moss');
      for(let mob=2;mob<=5;mob++){
        assert.match(await forestPage.locator('.question-top').innerText(),new RegExp('ENCOUNTER '+mob+' \/ 5'));
        await answer();
        await forestPage.locator('#next-question').click();
        assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),true);
        await forestPage.locator('#forest-explore-continue').click();
      }
      assert.match(await forestPage.locator('.question-top').innerText(),/BOSS ATTACK 1 \/ 3/);
      assert.match(await forestPage.locator('#forest-foe-name').innerText(),/Thorn King/);
      assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'3');
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-boss-stage')),true);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-boss.png`),fullPage:true});
      for(let hit=1;hit<=3;hit++){
        assert.match(await forestPage.locator('.question-top').innerText(),new RegExp('BOSS ATTACK '+hit+' \/ 3'));
        await answer();
        assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),String(3-hit));
        if(hit===3)assert.match(await forestPage.locator('#forest-battle-log').innerText(),/Thorn Kingをたおした！/);
        await forestPage.locator('#next-question').click();
      }
      assert.equal(await forestPage.locator('#result-view').isVisible(),true);
      assert.match(await forestPage.locator('#result-title').innerText(),/ボスを討伐/);
      assert.match(await forestPage.locator('#result-discoveries').innerText(),/Mosslight/);
      assert.match(await forestPage.locator('#result-rewards').innerText(),/128 XP/);
      await forestPage.locator('#result-collection').click();
      assert.match(await forestPage.locator('#forest-collection-relics').innerText(),/Mosslight/);
      await forestPage.reload();
      await forestPage.locator('#open-collection').click();
      assert.match(await forestPage.locator('#forest-collection-relics').innerText(),/Mosslight/);
      await forestPage.locator('#collection-home').click();
      assert.match(await forestPage.locator('#forest-home-progress').innerText(),/討伐 1回/);
      const saved=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
      assert.equal(saved.forest.clears,1);
      assert.deepEqual(saved.forest.relics,['moss-lantern']);
      assert.equal(saved.xpWallet,128);
      await forestContext.close();
    }
    // Endless mode limits attempts by difficulty; ambiguous results are not falsely called wrong.
    const {context:endlessContext,page:endlessPage}=await boot(390);
    await endlessPage.locator('[data-difficulty="hard"]').click();
    await endlessPage.locator('#start-forest-endless').click();
    assert.equal(await endlessPage.locator('#forest-explore-screen').isVisible(),true);
    await endlessPage.locator('#forest-explore-continue').click();
    assert.match(await endlessPage.locator('#play-mode-label').innerText(),/エンドレス/);
    assert.match(await endlessPage.locator('#forest-tries').innerText(),/あと1回/);
    await endlessPage.locator('#spoken-answer').fill('I have no idea what to say here.');
    await endlessPage.locator('#show-answer').click();
    assert.match(await endlessPage.locator('#feedback-panel').innerText(),/挑戦回数を使い切った/);
    await endlessPage.locator('#forest-exit').click();
    assert.match(await endlessPage.locator('#result-title').innerText(),/挑戦終了/);
    const endedSave=await endlessPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(endedSave.xpWallet,0);
    assert.equal(endedSave.forest.clears,0);
    await endlessContext.close();
    // Fake the browser speech API: check start/stop, stale onend, capture,
    // retry, denied permission, and changing views without a stuck mic.
    const {context:micContext,page:micPage}=await boot(390);
    await micPage.evaluate(()=>{
      class FakeRecognition {
        start(){window.__activeMic=this;}
        abort(){this.aborted=true;queueMicrotask(()=>this.onend?.());}
      }
      window.SpeechRecognition=FakeRecognition;
    });
    await micPage.getByRole('button',{name:/まず練習する/}).click();
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
    await micButton.click(); // Explicit stop must remove the orange recording state.
    assert.equal(await micButton.getAttribute('aria-pressed'),'false');
    await micButton.click();
    await micPage.evaluate(()=>window.__activeMic.onerror?.({error:'not-allowed'}));
    assert.equal(await micButton.getAttribute('aria-pressed'),'false');
    assert.match(await micPage.locator('#speech-helper').innerText(),/許可されていません/);
    await micPage.locator('#spoken-answer').fill('Let me think about it.');
    await micPage.locator('#show-answer').click();
    assert.equal(await micButton.isVisible(),false);
    await micPage.locator('#next-question').click();
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'false');
    await micPage.locator('#mic-button').click();
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Could you'}],{isFinal:false})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Could you');
    // An interim recognition that ends without final text must not leave an active mic.
    await micPage.evaluate(()=>window.__activeMic.onend());
    assert.equal(await micPage.locator('#mic-button').isVisible(),false);
    assert.equal(await micPage.locator('#retry-mic').isVisible(),true);
    await micPage.locator('#retry-mic').click();
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await micPage.locator('#leave-play').click();
    assert.equal(await micPage.locator('#home-view').isVisible(),true);
    assert.equal(await micPage.locator('#play-view').isVisible(),false);
    await micContext.close();
    const {context,page}=await boot(390);
    await page.getByRole('button',{name:/まず練習する/}).click();
    assert.match(await page.locator('#play-mode-label').innerText(),/練習モード/);
    assert.equal(await page.locator('#reveal-transcript').isVisible(),true);
    await page.locator('#reveal-transcript').click();
    assert.match(await page.locator('#transcript').innerText(),/book the tour now/);
    await page.locator('#show-answer').click(); // Empty answer never grants XP.
    assert.match(await page.locator('#feedback-panel').innerText(),/英語を入力/);
    await page.locator('#show-hint').click();
    assert.match(await page.locator('#hint-panel').innerText(),/Let me/);
    await page.locator('#spoken-answer').fill('Let me think about it.');
    await page.locator('#show-answer').click();
    assert.match(await page.locator('.feedback-answer').innerText(),/Let me think/);
    assert.match(await page.locator('#feedback-panel').innerText(),/\+8 XP/); // Hint lowers awarded XP.
    await page.locator('#next-question').click();
    for(let i=0;i<2;i++){
      await page.locator('#spoken-answer').fill(i===0?'Could you say that again?':'That works for me.');
      await page.locator('#show-answer').click();
      assert.match(await page.locator('#feedback-panel').innerText(),/\+16 XP/);
      await page.locator('#next-question').click();
    }
    await page.locator('#result-view').waitFor({state:'visible'});
    assert.match(await page.locator('#result-discoveries').innerText(),/Soxie/);
    assert.match(await page.locator('#result-rewards').innerText(),/40 XP ストック/);
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-result.png`),fullPage:true});
    await page.locator('#result-collection').click();
    assert.equal(await page.locator('#collection-wallet').innerText(),'40 XP');
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="10"]').click();
    assert.equal(await page.locator('#collection-wallet').innerText(),'30 XP');
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="all"]').click();
    assert.equal(await page.locator('#collection-wallet').innerText(),'0 XP');
    assert.match(await page.locator('#feed-feedback').innerText(),/Soxieに30 XP/);
    assert.match(await page.locator('[data-select-monster="katappo"]').locator('xpath=ancestor::article').innerText(),/sock/);
    assert.equal(await page.locator('[data-pronounce-word="sock"]').isVisible(),true);
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-collection.png`),fullPage:true});
    const collectionMetrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(collectionMetrics.scroll<=collectionMetrics.inner+1,`${engine}/390 collection horizontal overflow: ${JSON.stringify(collectionMetrics)}`);
    await page.locator('[data-select-monster="katappo"]').click();
    await page.locator('#collection-home').click();
    assert.match(await page.locator('#stat-independent').innerText(),/2 \/ 6/);
    assert.match(await page.locator('#hero-monster-name').innerText(),/Soxie/);
    await page.getByRole('button',{name:/60秒チャレンジ/}).click();
    assert.match(await page.locator('#play-clock').innerText(),/残り/);
    for(let i=0;i<6;i++){
      await page.locator('#spoken-answer').fill('I do not know yet.');
      await page.locator('#show-answer').click();
      await page.locator('#show-example').click();
      await page.locator('#next-question').click();
    }
    assert.equal(await page.locator('#result-view').isVisible(),true);
    await page.locator('#result-home').click();
    await page.reload();
    assert.match(await page.locator('#hero-monster-name').innerText(),/Soxie/);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(saved.completedRuns,1);assert.ok(saved.totalAnswers>=9);
    assert.ok(saved.ownedMonsters.includes('katappo'));
    assert.equal(saved.monsterXp.katappo,40);
    assert.equal(saved.xpWallet,0); // Skipping questions never grants XP.
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-persisted.png`),fullPage:true});
    await context.close();
    console.log(`${engine}: 320/375/390/430 responsive, listening fallback, capture, XP banking/allocation, 60-sec flow and persistence passed`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
