const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:320,height:844},hasTouch:true,isMobile:engine==='webkit',reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{Math.random=()=>.99;});
 const answer=async()=>{
  const prompt=await page.evaluate(async()=>{
   const {ALL_PROMPTS}=await import('./monster-data.js');
   return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
  });
  if(await page.locator('#play-audio').count()){
   await page.locator('#play-audio').click();
   const correct=await page.evaluate(async()=>{
    const {listeningChallengeFor}=await import('./listening-challenges.js');
    const {ALL_PROMPTS}=await import('./monster-data.js');
    return listeningChallengeFor(ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)).correctIndex;
   });
   await page.locator(`[data-listening-choice="${correct}"]`).click();
  }else{
   await page.locator('#spoken-answer').fill(prompt.answer);
   await page.locator('#show-answer').click();
  }
  await page.locator('#next-question').waitFor({state:'visible'});
 };
 try{
  const url=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
   const save=createSave();save.ownedMonsters=['medamago','katappo','koge'];save.selectedMonster='katappo';
   save.monsterXp={medamago:0,katappo:0,koge:0};save.xpWallet=49;
   localStorage.setItem(STORAGE_KEY,JSON.stringify(save));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('[data-home-page="forest"]').click();
  await page.locator('#start-forest-tactics').click();
  assert.match(await page.locator('.forest-formation-boss-plan').innerText(),/1手目：文法/);
  assert.match(await page.locator('.forest-formation-boss-plan').innerText(),/身代わりできる組み合わせ/);
  await page.locator('#forest-explore-continue').click();
  let reachedBoss=false;
  for(let step=0;step<110;step++){
   if(await page.locator('.forest-boss-tactical-plan').isVisible()){reachedBoss=true;break;}
   const event=page.locator('[data-forest-event-option]');
   if(await event.count()&&await event.first().isVisible()){
    await event.first().click();continue;
   }
   if(await page.locator('#forest-explore-options').isVisible()){
    await page.locator('[data-forest-route]').first().click();
    continue;
   }
   if(await page.locator('#forest-explore-screen').isVisible()){
    const next=page.locator('#forest-explore-continue');
    if(await next.isVisible()&&await next.isEnabled()){await next.click();continue;}
   }
   if(await page.locator('#next-question').isVisible()){
    await page.locator('#next-question').click();continue;
   }
   if(await page.locator('#forest-tactics').isVisible()){
    const listening=page.locator('[data-tactic-kind="listen"]');
    if(!await listening.count())throw Error(`Tactical controls missing on step ${step}: ${(await page.locator('main').innerText()).slice(0,1600)}`);
    if(await listening.isEnabled())await listening.click();
    await answer();continue;
   }
   throw Error(`Unexpected tactical screen before boss, step ${step}`);
  }
  assert.equal(reachedBoss,true,'This test must reach the boss through the real English battle loop');
  assert.match(await page.locator('.forest-boss-cover').innerText(),/身代わり/);
  assert.equal(await page.locator('.forest-boss-cover').getAttribute('data-cover-ready'),'true');
  await answer(); // Authored listening boss question: correct English unlocks the first strike.
  await page.locator('#next-question').click();
  assert.match(await page.locator('#forest-tactics').innerText(),/敵のターン.*文法/s);
  assert.equal(await page.locator('.forest-boss-cover').getAttribute('data-cover-ready'),'true');
  const before=await page.locator('#forest-party-hp').getAttribute('aria-valuenow');
  await page.locator('#spoken-answer').fill('wrong answer');
  await page.locator('#show-answer').click();
  const after=await page.locator('#forest-party-hp').getAttribute('aria-valuenow');
  assert.equal(Number(before)-Number(after),1,'Reserve intercepts two of the three HP damage from the weak grammar matchup');
  assert.match(await page.locator('#forest-battle-log').innerText(),/身代わり.*ダメージを2軽減/);
  assert.equal(await page.locator('#forest-world-fx').innerText(),'COVER!');
  await answer(); // Correction must not refund HP, re-trigger cover, or count as unaided.
  assert.equal(await page.locator('#forest-party-hp').getAttribute('aria-valuenow'),after);
  assert.match(await page.locator('#forest-battle-log').innerText(),/最初の被ダメージ1は残る/);
  await page.locator('#next-question').click();
  assert.match(await page.locator('[data-tactic-ally="koge"]').innerText(),/HP 8\/9|HP 7\/8/);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
  assert.deepEqual(saved.ownedMonsters,['medamago','katappo','koge']);
  assert.equal(saved.xpWallet>=49,true);
  assert.equal(Object.hasOwn(saved,'party'),false,'Boss-only HP and cover state must not migrate to the save');
  const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.scroll<=layout.width+1,`iPhone-width battle briefing must not overflow (${JSON.stringify(layout)})`);
  assert.deepEqual(errors,[]);
  console.log(`${engine}: real boss reserve interception, retry, save and 320px layout OK`);
 }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
