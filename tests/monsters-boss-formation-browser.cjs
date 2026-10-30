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
   return ALL_PROMPTS.find(item=>item.id===document.querySelector('#play-card').dataset.promptId);
  });
  if(await page.locator('#play-audio').count()){
   await page.locator('#play-audio').click();
   const index=await page.evaluate(async()=>{
    const {ALL_PROMPTS}=await import('./monster-data.js');
    const {listeningChallengeFor}=await import('./listening-challenges.js');
    const prompt=ALL_PROMPTS.find(item=>item.id===document.querySelector('#play-card').dataset.promptId);
    return listeningChallengeFor(prompt).correctIndex;
   });
   await page.locator(`[data-listening-choice="${index}"]`).click();
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
   const save=createSave();
   save.ownedMonsters=['medamago','purupun'];save.selectedMonster='medamago';
   save.monsterXp={medamago:0,purupun:160};save.xpWallet=67;
   localStorage.setItem(STORAGE_KEY,JSON.stringify(save));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('[data-feature-worlds]').click();
  await page.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await page.locator('#start-forest-tactics').click();
  assert.equal(await page.locator('.forest-formation-boss-wrap').getAttribute('open'),null,
    'Boss strategy is optional while forming a team');
  await page.locator('.forest-formation-boss-wrap > summary').click();
  assert.match(await page.locator('.forest-formation-link').innerText(),/いばらの突破口.*1手目.*単語.*次の敵攻撃を1軽減/);
  assert.match(await page.locator('.forest-formation-link').innerText(),/この編成で狙える/);
  await page.locator('#forest-explore-continue').click();
  let reachedBoss=false;
  for(let step=0;step<110;step++){
   if(await page.locator('#forest-world-stage.forest-boss-stage').isVisible()){reachedBoss=true;break;}
   const event=page.locator('[data-forest-event-option]');
   if(await event.count()&&await event.first().isVisible()){await event.first().click();continue;}
   if(await page.locator('#forest-explore-options').isVisible()){
    await page.locator('[data-forest-route]').first().click();continue;
   }
   if(await page.locator('#forest-explore-screen').isVisible()){
    const forward=page.locator('#forest-explore-continue');
    if(await forward.isVisible()&&await forward.isEnabled()){await forward.click();continue;}
   }
   if(await page.locator('#next-question').isVisible()){
    await page.locator('#next-question').click();continue;
   }
   if(await page.locator('#forest-tactics').isVisible()){
    const listening=page.locator('[data-tactic-kind="listen"]');
    if(await listening.count()&&await listening.isEnabled()){
     if(await page.locator('.forest-tactic-strategy').getAttribute('open')===null)
      await page.locator('.forest-tactic-strategy > summary').click();
     await listening.click();
    }
    await answer();continue;
   }
   throw Error(`Cannot progress to the boss at step ${step}`);
  }
  assert.equal(reachedBoss,true,'Boss synergy must be tested through real English battles');
  assert.equal(await page.locator('.forest-boss-link').getAttribute('data-link-ready'),'true');
  assert.match(await page.locator('.forest-boss-link').innerText(),/Purupun|プルプン|待機中/);
  await answer();
  assert.match(await page.locator('#forest-battle-log').innerText(),/ボス連携「いばらの突破口」成功！.*次の反撃−1/);
  assert.equal(await page.locator('.forest-boss-link').getAttribute('data-link-used'),'true');
  await page.locator('#next-question').click();
  assert.match(await page.locator('#forest-tactics').innerText(),/敵のターン.*文法/s);
  const before=Number(await page.locator('#forest-party-hp').getAttribute('aria-valuenow'));
  await page.locator('#spoken-answer').fill('wrong answer');
  await page.locator('#show-answer').click();
  const after=Number(await page.locator('#forest-party-hp').getAttribute('aria-valuenow'));
  assert.equal(before-after,1,'Boss formation shield reduces a confirmed grammar miss by one HP');
  await answer();
  assert.equal(Number(await page.locator('#forest-party-hp').getAttribute('aria-valuenow')),after,
   'A corrected answer never undoes the real damage');
  await page.locator('#next-question').click();
  assert.match(await page.locator('.forest-boss-link').textContent(),/発動済み/,'Boss link never repeats on the next phase');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
  assert.ok(saved.ownedMonsters.includes('medamago')&&saved.ownedMonsters.includes('purupun'),
   'Original companions stay owned even when correct answers capture additional monsters');
  assert.equal(saved.monsterXp.purupun,160,'A battle perk does not spend monster training XP');
  assert.ok(saved.xpWallet>=67);
  assert.equal(Object.hasOwn(saved,'party'),false,'Battle-only state is never persisted');
  const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.scroll<=layout.width+1,`Boss briefing overflows 320px: ${JSON.stringify(layout)}`);
  assert.deepEqual(errors,[]);
  console.log(`${engine}: boss formation synergy, confirmed miss, saved XP and 320px layout OK`);
 }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
