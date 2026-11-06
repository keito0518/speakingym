const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const launch=engine==='webkit'?webkit:chromium;
 const browser=await launch.launch({headless:true,...(engine==='chromium'&&process.env.MONSTERS_CHROMIUM_EXECUTABLE?
  {executablePath:process.env.MONSTERS_CHROMIUM_EXECUTABLE,args:['--no-sandbox']}:{} )});
 const base=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 try{
  for(const [id,shape,motion] of [['solar_blade','sword','sweep'],['north_bow','bow','shoot'],['worldtree_scepter','staff','channel'],['celestial_aegis','shield','brace']]){
   const context=await browser.newContext({viewport:{width:375,height:844},hasTouch:true,isMobile:engine==='webkit'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'networkidle'});
   await page.evaluate(async weaponId=>{
    const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
    localStorage.setItem(STORAGE_KEY,JSON.stringify({...createSave(),weaponInventory:[weaponId],equippedWeaponId:weaponId}));
   },id);
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-feature-worlds]').click();
   await page.locator('#start-forest').click();
   await page.locator('#forest-explore-continue').click();
   const arena=page.locator('#forest-world-stage');
   assert.equal(await arena.getAttribute('data-weapon-shape'),shape);
   assert.equal(await arena.getAttribute('data-weapon-motion'),motion);
   await page.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
   const answer=await page.evaluate(async()=>{
    const {ALL_PROMPTS}=await import('./monster-data.js');
    return ALL_PROMPTS.find(item=>item.id===document.querySelector('#play-card').dataset.promptId).answer;
   });
   await page.locator('#spoken-answer').fill(answer);
   await page.locator('#show-answer').click();
   await page.waitForFunction(()=>['attack','victory'].includes(document.querySelector('#forest-world-stage')?.dataset.cinematic));
   assert.match(await arena.getAttribute('data-cinematic'),/^(?:attack|victory)$/);
   const snapshot=await page.evaluate(()=>{
    const stage=document.querySelector('#forest-world-stage');
    const actor=stage.querySelector('.forest-party');
    const fx=document.querySelector('#forest-weapon-fx');
    const consolePane=document.querySelector('#forest-arena-console');
    const damage=document.querySelector('#forest-damage');
    return {motion:getComputedStyle(actor).animationName,fx:getComputedStyle(fx).animationName,
     fxBottom:fx.getBoundingClientRect().bottom,consoleTop:consolePane.getBoundingClientRect().top,
     hudZ:parseInt(getComputedStyle(damage).zIndex,10),fxZ:parseInt(getComputedStyle(fx).zIndex,10),
     fxPointer:getComputedStyle(fx).pointerEvents,overlayCount:stage.querySelectorAll('#forest-weapon-fx').length};
   });
   assert.equal(snapshot.motion,`weapon-${motion}-step`,`${id}: the equipped weapon must change the ally's motion`);
   assert.equal(snapshot.fx,'weapon-fx-lifetime',`${id}: the attack must start its own visual effect`);
   assert.ok(snapshot.fxBottom<=snapshot.consoleTop+1,`${id}: FX must not cover the English question (${JSON.stringify(snapshot)})`);
   assert.ok(snapshot.hudZ>snapshot.fxZ&&snapshot.fxPointer==='none',`${id}: keep damage legible and controls clickable`);
   assert.equal(snapshot.overlayCount,1);
   assert.deepEqual(errors,[],`${id}: no browser exceptions`);
   await context.close();
  }
  console.log(`${engine}: weapon-specific motion and safe mobile effects passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
