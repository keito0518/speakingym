// The real-motion path is deliberately tactile: drag a physical crank, view
// every 10-pull card by scrolling, then evolve duplicate gear manually.
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
   assert.equal(await page.locator('.gashapon-machine').isVisible(),true);
   assert.match(await page.locator('#shop-coins').innerText(),/2010 G/,'The result is already committed before the crank');

   const crank=page.locator('#summon-crank');
   await crank.scrollIntoViewIfNeeded();
   const box=await crank.boundingBox();
   assert.ok(box,'A real handle must exist');
   const x=box.x+box.width/2,y=box.y+box.height/2,r=Math.min(box.width,box.height)*.31;
   await page.mouse.move(x,y-r);await page.mouse.down();
   for(let angle=-90;angle<=270;angle+=18){
    const radians=angle*Math.PI/180;
    await page.mouse.move(x+Math.cos(radians)*r,y+Math.sin(radians)*r);
   }
   await page.mouse.up();
   assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'vend',
    'Dragging the real dial clockwise must physically release a capsule');
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
  console.log(`${engine}: gashapon crank, 10-result scroll, duplicate awakening, reload, isolation PASS`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
