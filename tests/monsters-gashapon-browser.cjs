// The ritual's tactile path: swipe the central seal, view the full 10-pull by
// scrolling, then awaken duplicate gear without changing the normal save.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 const base=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 try{
  for(const [width,height] of [[320,640],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:engine==='webkit',reducedMotion:'no-preference'});
   const page=await context.newPage();
   page.setDefaultTimeout(12000);
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`${base}?gacha-test=1`,{waitUntil:'networkidle'});
   assert.equal(await page.locator('#shop-coins').innerText(),'2400 G');
   await page.evaluate(()=>{Math.random=()=>.009;});
   await page.locator('#shop-draw-ten').click();
   assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'manual');
   assert.equal(await page.locator('.summon-vault-stage').isVisible(),true);
   assert.match(await page.locator('.summon-vault-backdrop').evaluate(el=>getComputedStyle(el).backgroundImage),/summon-vault\.webp/,
    'The summon must use the finished game-environment artwork');
   assert.equal(await page.locator('.summon-tier-splash').count(),1);
   assert.match(await page.locator('#shop-coins').innerText(),/2010 G/,'The result is committed before unlocking the vault');

   const seal=page.locator('#summon-seal');
   await seal.scrollIntoViewIfNeeded();
   const box=await seal.boundingBox();
   assert.ok(box,'The seal must have a touch target');
   const x=box.x+box.width/2,y=box.y+box.height*.7;
   await page.mouse.move(x,y);await page.mouse.down();
   for(let distance=0;distance<=160;distance+=10)await page.mouse.move(x,y-distance);
   await page.mouse.up();
   assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'unseal',
    'Dragging up must visibly break the celestial seal');
   assert.equal(await page.locator('#summon-tier-splash-text').innerText(),'LEGENDARY');
   await page.locator('#summon-skip').click();
   assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'reveal');
   assert.equal(await page.locator('.summon-batch-card').count(),10);
   const dimensions=await page.locator('#summon-screen').evaluate(el=>({height:el.clientHeight,full:el.scrollHeight,overflow:getComputedStyle(el).overflowY}));
   assert.ok(dimensions.full>dimensions.height+100,`Ten results must have a scroll range ${JSON.stringify(dimensions)}`);
   assert.equal(dimensions.overflow,'auto');
   await page.locator('#summon-screen').evaluate(el=>{el.scrollTop=el.scrollHeight;});
   assert.ok(await page.locator('#summon-screen').evaluate(el=>el.scrollTop)>0,'The result overlay must scroll');
   await page.locator('[data-batch-equip="9"]').click();

   assert.equal(await page.locator('#equipment-weapon-choice').inputValue(),'eternal_crest');
   assert.equal(await page.locator('#weapon-awaken').isEnabled(),true,'Nine duplicates make awakening available');
   await page.locator('#weapon-awaken').click();
   assert.match(await page.locator('#equipment-weapon-status').innerText(),/覚醒成功/);
   await page.locator('#weapon-awaken').click();
   assert.equal(await page.locator('#weapon-awaken').isDisabled(),true);
   assert.equal(await page.locator('.equipment-monster-preview [data-awakening="2"]').count(),1);
   await page.reload({waitUntil:'networkidle'});
   const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1-gacha-test')));
   assert.equal(save.weaponAwakening.eternal_crest,2);
   assert.equal(save.weaponShards.eternal_crest,undefined);
   assert.equal(save.gachaPullCount,10);
   assert.equal(save.coins,2010);
   await page.goto(base,{waitUntil:'networkidle'});
   assert.equal(await page.locator('#game-hud-coins').innerText(),'0 G','The normal save cannot inherit QA gold');
   assert.deepEqual(errors,[],`${engine}/${width} page errors`);
   await context.close();
  }
  console.log(`${engine}: vault swipe, ten-card reveal, scroll, duplicate awakening, reload, isolation PASS`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
