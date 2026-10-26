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
