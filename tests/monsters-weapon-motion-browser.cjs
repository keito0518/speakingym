const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const launch=engine==='webkit'?webkit:chromium;
 const browser=await launch.launch({headless:true,...(engine==='chromium'&&process.env.MONSTERS_CHROMIUM_EXECUTABLE?
  {executablePath:process.env.MONSTERS_CHROMIUM_EXECUTABLE,args:['--no-sandbox']}:{} )});
 const base=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 try{
  const cases=[
   ['bamboo_blade','sword','sweep','common',0],
   ['north_bow','bow','shoot','rare',0],
   ['solar_blade','sword','sweep','epic',0],
   ['worldtree_scepter','staff','channel','legend',0],
   ['celestial_aegis','shield','brace','legend',3]
  ];
  for(const [id,shape,motion,rarity,rank] of cases){
   const context=await browser.newContext({viewport:{width:375,height:844},hasTouch:true,isMobile:engine==='webkit'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'networkidle'});
   await page.evaluate(async ({weaponId,rank})=>{
    const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
    localStorage.setItem(STORAGE_KEY,JSON.stringify({...createSave(),weaponInventory:[weaponId],equippedWeaponId:weaponId,
     weaponAwakening:rank?{[weaponId]:rank}:{}}));
   },{weaponId:id,rank});
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-feature-worlds]').click();
   await page.locator('#start-forest').click();
   await page.locator('#forest-explore-continue').click();
   const arena=page.locator('#forest-world-stage');
   const sound=page.locator('#battle-sound-toggle');
   assert.equal(await sound.isVisible(),true);
   assert.equal(await sound.getAttribute('aria-pressed'),'false','Battle audio must start muted');
   await sound.click();
   assert.equal(await sound.getAttribute('aria-pressed'),'true');
   await sound.click();
   assert.equal(await sound.getAttribute('aria-pressed'),'false','Tapping again must mute battle audio');
   assert.equal(await arena.getAttribute('data-weapon-shape'),shape);
   assert.equal(await arena.getAttribute('data-weapon-motion'),motion);
   assert.equal(await arena.getAttribute('data-weapon-rarity'),rarity);
   assert.equal(await arena.getAttribute('data-weapon-rank'),String(rank));
   const idle=await arena.locator('.forest-party').evaluate(actor=>getComputedStyle(actor,'::after').animationName);
   assert.equal(idle,rarity==='legend'?'weapon-legend-idle-orbit':'none',
    `${id}: only a legendary weapon gains the persistent idle orbit`);
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
    const named=part=>getComputedStyle(fx.querySelector('.weapon-fx-'+part)).animationName;
    return {motion:getComputedStyle(actor).animationName,fx:getComputedStyle(fx).animationName,
     glint:named('glint'),orbit:named('orbit'),crest:named('crest'),resonance:named('resonance'),
     fxBottom:fx.getBoundingClientRect().bottom,consoleTop:consolePane.getBoundingClientRect().top,
     hudZ:parseInt(getComputedStyle(damage).zIndex,10),fxZ:parseInt(getComputedStyle(fx).zIndex,10),
     fxPointer:getComputedStyle(fx).pointerEvents,overlayCount:stage.querySelectorAll('#forest-weapon-fx').length};
   });
   assert.equal(snapshot.motion,`weapon-${motion}-step`,`${id}: the equipped weapon must change the ally's motion`);
   assert.equal(snapshot.fx,'weapon-fx-lifetime',`${id}: the attack must start its own visual effect`);
   assert.equal(snapshot.glint,rarity==='common'?'none':'weapon-tier-glint',`${id}: rarity glint`);
   assert.equal(snapshot.orbit,['epic','legend'].includes(rarity)?'weapon-tier-orbit':'none',`${id}: epic orbit`);
   assert.equal(snapshot.crest,rarity==='legend'?'weapon-tier-crest':'none',`${id}: legend crest`);
   assert.equal(snapshot.resonance,rank>0?'weapon-resonance-echo':'none',`${id}: duplicate resonance halo`);
   assert.ok(snapshot.fxBottom<=snapshot.consoleTop+1,`${id}: FX must not cover the English question (${JSON.stringify(snapshot)})`);
   assert.ok(snapshot.hudZ>snapshot.fxZ&&snapshot.fxPointer==='none',`${id}: keep damage legible and controls clickable`);
   assert.equal(snapshot.overlayCount,1);
   await arena.evaluate(stage=>{stage.dataset.weaponUltimate='true'});
   const finisher=await arena.locator('.weapon-fx-finisher-mark').evaluate(mark=>({
    animation:getComputedStyle(mark).animationName,
    footprint:mark.getBoundingClientRect().width,
    pointer:getComputedStyle(mark).pointerEvents
   }));
   assert.equal(finisher.animation,'weapon-finisher-signature',`${id}: weapon-specific finisher mark`);
   assert.ok(finisher.footprint>0&&finisher.pointer==='none',`${id}: mark must be decorative and visible`);
   assert.deepEqual(errors,[],`${id}: no browser exceptions`);
   await context.close();
  }
  console.log(`${engine}: weapon-specific motion and safe mobile effects passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
