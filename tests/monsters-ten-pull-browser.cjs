// Automated earned-only 10-pull acceptance: genuine shop buttons and modal
// interactions, with an isolated, disposable save and deterministic RNG.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

(async()=>{
 const name=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const browser=await (name==='webkit'?webkit:chromium).launch({headless:true});
 const url=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 try{
  for(const width of [320,390]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:name==='webkit',hasTouch:true,
    reducedMotion:'no-preference'});
   const page=await context.newPage();
   page.setDefaultTimeout(12000);
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('crash',()=>errors.push('page crashed'));
   await page.goto(url,{waitUntil:'networkidle'});
   await page.evaluate(async()=>{
    const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
    localStorage.setItem(STORAGE_KEY,JSON.stringify({...createSave(),coins:2400,xpWallet:333}));
   });
   await page.reload({waitUntil:'networkidle'});
   await page.locator('#game-tabs [data-game-tab="forge"]').click();
   assert.equal(await page.locator('#shop-draw-ten').isEnabled(),true);
   assert.match(await page.locator('#shop-draw-ten').innerText(),/10連召喚.*1200 G/s);
   assert.match(await page.locator('.shop-gacha').innerText(),/割引なし/);
   await page.evaluate(()=>{Math.random=()=>.009;});
   await page.locator('#shop-draw-ten').click();
   assert.equal(await page.locator('#summon-screen').getAttribute('data-mode'),'batch');
   assert.equal(await page.locator('#summon-screen').getAttribute('data-rarity'),'legend');
   assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'charge');
   assert.equal(await page.locator('#shop-coins').innerText(),'2010 G',
    'One new legend and nine duplicates must deduct 1200 and refund only 810');
   await page.locator('#summon-skip').click();
   assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'reveal');
   assert.equal(await page.locator('.summon-batch-card').count(),10);
   assert.equal(await page.locator('.summon-batch-card[data-tier="legend"]').count(),10);
   assert.equal(await page.locator('.summon-batch-card[data-duplicate="true"]').count(),9);
   assert.equal(await page.locator('.summon-batch-card svg [data-equipped-weapon="eternal_crest"]').count(),10,
    'Ten distinct reward cards must render a visible pixel weapon');
   assert.match(await page.locator('#summon-attack').innerText(),/1200 G.*810 G/);
   assert.equal(await page.locator('#summon-equip').isHidden(),true);
   assert.match(await page.locator('#summon-repeat').innerText(),/10連をもう一度/);

   await page.locator('#summon-repeat').click();
   assert.equal(await page.locator('#shop-coins').innerText(),'1710 G',
    'Repeat must spend 1200 and refund 900; it must never perform eleven draws');
   assert.equal(await page.locator('#summon-screen').getAttribute('data-mode'),'batch');
   await page.locator('#summon-skip').click();
   assert.equal(await page.locator('.summon-batch-card[data-duplicate="true"]').count(),10);
   await page.locator('[data-batch-equip="0"]').click();
   assert.equal(await page.locator('#summon-screen').isHidden(),true);
   assert.equal(await page.locator('#equipment-weapon-choice').inputValue(),'eternal_crest');

   let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
   assert.equal(saved.coins,1710);
   assert.equal(saved.gachaPullCount,20);
   assert.deepEqual(saved.weaponInventory,['eternal_crest']);
   assert.equal(saved.xpWallet,333,'The ten-pull must not spend experience');
   assert.equal(saved.equippedWeaponId,'eternal_crest');
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#hero-monster-art [data-equipped-weapon="eternal_crest"]').count(),1);
   await page.locator('#game-tabs [data-game-tab="forge"]').click();
   assert.match(await page.locator('.shop-collection-copy').innerText(),/1 \/ 24 種/);
   const horizontal=await page.evaluate(()=>({view:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(horizontal.scroll<=horizontal.view+1,`${name}/${width}: overflow ${JSON.stringify(horizontal)}`);
   assert.deepEqual(errors,[],`${name}/${width}: page errors`);
   await context.close();
  }
  console.log(`${name}: 10-pull cinematic, exact duplicate refunds, repeat, visible equipment, and persistent save PASS (320/390px)`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
