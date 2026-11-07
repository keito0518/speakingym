// A publicly shareable QA URL must allow an immediate 10-pull while keeping
// the normal adventure save completely isolated. No account or payment involved.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 const root=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 try{
  for(const width of [320,390]){
   const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,reducedMotion:'reduce'});
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(`${root}?gacha-test=1`,{waitUntil:'networkidle'});
   assert.equal(await page.locator('#shop-draw-ten').isEnabled(),true);
   assert.match(await page.locator('.gacha-qa-notice').innerText(),/通常の冒険データとは別/);
   assert.equal(await page.locator('#shop-coins').innerText(),'2400 G');
   assert.equal(await page.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1')),null);

   await page.locator('#shop-draw-ten').click();
   assert.equal(await page.locator('#summon-screen').getAttribute('data-mode'),'batch');
   const pulled=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1-gacha-test')));
   assert.equal(pulled.gachaPullCount,10);
   assert.ok(pulled.coins>=1200);
   assert.equal(await page.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1')),null);
   await page.reload({waitUntil:'networkidle'});
   assert.match(await page.locator('#shop-coins').innerText(),/\d+ G/);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1-gacha-test')).gachaPullCount),10);
   await page.locator('#gacha-test-refill').click();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1-gacha-test')).gachaPullCount),10);

   await page.goto(root,{waitUntil:'networkidle'});
   assert.equal(await page.locator('.gacha-qa-notice').count(),0);
   assert.equal(await page.locator('#game-hud-coins').innerText(),'0 G');
   assert.deepEqual(errors,[]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}px`);
   await context.close();
  }
  console.log(`${engine}: PASS separate gacha QA save, ten-pull, reload, refill and standard mode`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
