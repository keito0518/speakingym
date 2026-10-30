const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
  const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
  const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  const base=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
  try{
    for(const width of [320,375,390,430]){
      const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:engine==='webkit'});
      const page=await context.newPage();
      const vendor=[];
      await page.route('https://www.googletagmanager.com/**',async route=>{
        vendor.push(route.request().url());
        await route.fulfill({status:200,contentType:'text/javascript',body:''});
      });
      await page.goto(base,{waitUntil:'networkidle'});
      assert.equal(await page.locator('#beta-feedback-disclosure').getAttribute('open'),null,
        'Feedback and consent are optional information, hidden until requested');
      await page.locator('#beta-feedback-disclosure > summary').click();
      assert.equal(vendor.length,0,'No Google request before opt-in');
      assert.equal(await page.locator('[data-beta-reaction]').count(),5);
      assert.equal(await page.locator('[data-beta-reaction="fun"]').isDisabled(),true);
      assert.match(await page.locator('#beta-consent-status').innerText(),/未選択/);
      const initial=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(initial.scroll<=initial.width+1,`${engine}/${width}: feedback overflow ${JSON.stringify(initial)}`);
      const policy=await page.locator('.beta-consent a').getAttribute('href');
      assert.equal(policy,'./beta-privacy.html');
      if(width===390){
        await page.locator('#beta-consent-no').click();
        assert.equal(vendor.length,0,'Refusal never loads Google');
        assert.equal(await page.locator('[data-beta-reaction="fun"]').isDisabled(),true);
      }
      const analyticsRequested=page.waitForRequest(request=>request.url().startsWith('https://www.googletagmanager.com/gtag/js?'));
      await page.locator('#beta-consent-yes').click();
      await analyticsRequested;
      assert.equal(await page.locator('[data-beta-reaction="fun"]').isEnabled(),true);
      assert.equal(vendor.length,1,'Google code loads just once after explicit consent');
      await page.locator('[data-beta-reaction="grading"]').click();
      assert.match(await page.locator('#beta-feedback-status').innerText(),/今日の感想を記録/);
      assert.equal(await page.locator('[data-beta-reaction="hard"]').isDisabled(),true,'At most one vote each day');
      assert.equal(await page.locator('[data-beta-reaction="grading"]').getAttribute('aria-pressed'),'true');
      const events=await page.evaluate(()=>window.dataLayer.map(args=>Array.from(args)).filter(args=>args[0]==='event'));
      assert.deepEqual(events.map(args=>args[1]),['monsters_beta_visit','monsters_beta_feedback']);
      assert.equal(events[1][2].reaction,'grading');
      assert.equal(Object.prototype.hasOwnProperty.call(events[1][2],'transcript'),false);
      await page.locator('[data-feature-dungeon]').click();
      assert.equal(await page.locator('#forest-explore-screen').isVisible(),true,
        'Primary CTA enters the dungeon without an extra selection step');
      const started=await page.evaluate(()=>window.dataLayer.map(args=>Array.from(args)).filter(args=>args[1]==='monsters_beta_start'));
      assert.equal(started.length,1);
      assert.equal(started[0][2].mode,'forest');
      assert.equal(started[0][2].chapter,'entry');
      assert.equal(started[0][2].difficulty,'easy');
      const pageMetrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(pageMetrics.scroll<=pageMetrics.width+1,`${engine}/${width}: play overflow ${JSON.stringify(pageMetrics)}`);
      await page.reload({waitUntil:'networkidle'});
      assert.equal(await page.locator('[data-beta-reaction="fun"]').isDisabled(),true);
      assert.equal(await page.locator('#beta-consent-yes').getAttribute('aria-pressed'),'true');
      if(width===390){
        await page.locator('#beta-feedback-disclosure > summary').click();
        await page.locator('#beta-consent-no').click();
        assert.equal(await page.evaluate(()=>window['ga-disable-G-DRH440861Y']),true);
        assert.equal(await page.locator('[data-beta-reaction="fun"]').isDisabled(),true);
      }
      await context.close();
      console.log(`${engine} ${width}px beta consent, survey and first chapter start: OK`);
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
