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
      assert.equal(await page.locator('#hero-monster-name').innerText(),'メダマゴ');
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
    const {context,page}=await boot(390);
    await page.getByRole('button',{name:/まず練習する/}).click();
    assert.match(await page.locator('#play-mode-label').innerText(),/練習モード/);
    assert.equal(await page.locator('#reveal-transcript').isVisible(),true);
    await page.locator('#reveal-transcript').click();
    assert.match(await page.locator('#transcript').innerText(),/book the tour now/);
    await page.locator('#show-hint').click();
    assert.match(await page.locator('#hint-panel').innerText(),/Let me/);
    await page.locator('#show-answer').click();
    assert.match(await page.locator('.feedback-answer').innerText(),/Let me think/);
    await page.locator('.rating-button.best').click(); // Hinted answer is not falsely counted as independent.
    for(let i=0;i<2;i++){
      await page.locator('#spoken-answer').fill(i===0?'Could you say that again?':'That works for me.');
      await page.locator('#show-answer').click();
      await page.locator('.rating-button.best').click();
    }
    await page.locator('#result-view').waitFor({state:'visible'});
    assert.match(await page.locator('#result-discoveries').innerText(),/カタッポ/);
    assert.match(await page.locator('#result-rewards').innerText(),/40 XP ストック/);
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-result.png`),fullPage:true});
    await page.locator('#result-collection').click();
    assert.equal(await page.locator('#collection-wallet').innerText(),'40 XP');
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="10"]').click();
    assert.equal(await page.locator('#collection-wallet').innerText(),'30 XP');
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="all"]').click();
    assert.equal(await page.locator('#collection-wallet').innerText(),'0 XP');
    assert.match(await page.locator('#feed-feedback').innerText(),/カタッポに30 XP/);
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-collection.png`),fullPage:true});
    const collectionMetrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(collectionMetrics.scroll<=collectionMetrics.inner+1,`${engine}/390 collection horizontal overflow: ${JSON.stringify(collectionMetrics)}`);
    await page.locator('[data-select-monster="katappo"]').click();
    await page.locator('#collection-home').click();
    assert.match(await page.locator('#stat-independent').innerText(),/2 \/ 6/);
    assert.match(await page.locator('#hero-monster-name').innerText(),/カタッポ/);
    await page.getByRole('button',{name:/60秒チャレンジ/}).click();
    assert.match(await page.locator('#play-clock').innerText(),/残り/);
    for(let i=0;i<6;i++){
      await page.locator('#show-answer').click();
      await page.locator('[data-rating="again"]').click();
    }
    assert.equal(await page.locator('#result-view').isVisible(),true);
    await page.locator('#result-home').click();
    await page.reload();
    assert.match(await page.locator('#hero-monster-name').innerText(),/カタッポ/);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(saved.completedRuns,1);assert.ok(saved.totalAnswers>=9);
    assert.ok(saved.ownedMonsters.includes('katappo'));
    assert.equal(saved.monsterXp.katappo,40);
    assert.equal(saved.xpWallet,12);
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-persisted.png`),fullPage:true});
    await context.close();
    console.log(`${engine}: 320/375/390/430 responsive, listening fallback, capture, XP banking/allocation, 60-sec flow and persistence passed`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
