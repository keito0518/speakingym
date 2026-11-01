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
        const helpLinks=await page.locator('footer .monster-support-links a').evaluateAll(links=>links.map(a=>({
          label:a.textContent.trim(),href:a.getAttribute('href')
        })));
        assert.deepEqual(helpLinks.map(a=>a.href),[
          './beta-privacy.html','../../terms.html','../../contact.html','./audio-credits.html'
        ]);
        for(const link of helpLinks){
          const response=await page.request.get(new URL(link.href,base).href);
          assert.equal(response.status(),200,`${engine}: broken ${link.label} link`);
        }
        const helpWidth=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
        assert.ok(helpWidth.scroll<=helpWidth.width+1,`${engine}: help links overflow ${JSON.stringify(helpWidth)}`);
      }
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
      if(width===390){
        await page.locator('#home-extra-modes > summary').click();
        await page.locator('[data-home-page="save"]').click();
        const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
        const broken={...original,xpWallet:'1e309',monsterXp:{...original.monsterXp,medamago:'Infinity'}};
        await page.locator('#save-import').fill(JSON.stringify(broken));
        page.once('dialog',dialog=>dialog.accept());
        await page.locator('#save-import-button').click();
        const safe=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
        assert.equal(safe.xpWallet,0,'Non-finite imported wallet must be sanitized');
        assert.equal(safe.monsterXp.medamago,0,'Non-finite imported XP must be sanitized');
        assert.match(await page.locator('#save-transfer-status').innerText(),/復元できた/);
        assert.equal(await page.locator('#save-import').isVisible(),true,
          'The restore screen must stay open so the success message is visible');
        assert.equal(await page.locator('#save-transfer-status').isVisible(),true);
        await page.evaluate(()=>{
          const native=Storage.prototype.setItem;
          window.__monstersOriginalSetItem=native;
          Storage.prototype.setItem=function(key,value){
            if(key==='speakingym-monsters-prototype-v1')throw new DOMException('Storage full','QuotaExceededError');
            return native.call(this,key,value);
          };
        });
        await page.locator('#save-import').fill(JSON.stringify({...safe,xpWallet:99}));
        page.once('dialog',dialog=>dialog.accept());
        await page.locator('#save-import-button').click();
        assert.match(await page.locator('#save-transfer-status').innerText(),/復元できなかった/);
        await page.locator('#save-export').click();
        const active=JSON.parse(await page.locator('#save-import').inputValue());
        assert.equal(active.xpWallet,safe.xpWallet,'Failed import must not replace the in-memory save');
        // Regression: Safari/private-mode storage failures must be visible
        // inside the fullscreen dungeon, not only in the home footer.
        await page.locator('.home-destination:not([hidden]) .home-menu-back').click();
        await page.locator('[data-feature-dungeon]').click();
        assert.equal(await page.locator('#save-warning-live').isVisible(),true,
          'Storage failure must warn the player during an ongoing adventure');
        assert.match(await page.locator('#save-warning-live').innerText(),/セーブの引き継ぎ/);
        const warningMetrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
        assert.ok(warningMetrics.scroll<=warningMetrics.width+1,
          'The storage warning must fit a narrow phone without horizontal scrolling');
        await page.evaluate(()=>{Storage.prototype.setItem=window.__monstersOriginalSetItem;});
        await page.reload({waitUntil:'networkidle'});
        assert.equal(await page.locator('#save-warning-live').isVisible(),false,
          'A working storage write must clear a stale warning');
        const onDisk=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
        assert.equal(onDisk.xpWallet,safe.xpWallet,'Failed import must not overwrite the saved record');
      }
      await context.close();
      console.log(`${engine} ${width}px beta consent, survey, safe import and first chapter: OK`);
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
