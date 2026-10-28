const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 const url=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 const answer=async page=>{
   const expected=await page.evaluate(async()=>{
     const {ALL_PROMPTS}=await import('./monster-data.js');
     return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
   });
   if(await page.locator('#play-audio').count()){
     await page.locator('#play-audio').click();
     const correct=await page.evaluate(async()=>{
       const {ALL_PROMPTS}=await import('./monster-data.js');
       const {listeningChallengeFor}=await import('./listening-challenges.js');
       const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
       return listeningChallengeFor(prompt).correctIndex;
     });
     await page.locator(`[data-listening-choice="${correct}"]`).click();
   }else{
     await page.locator('#spoken-answer').fill(expected);
     await page.locator('#show-answer').click();
   }
   await page.locator('#next-question').waitFor({state:'visible'});
 };
 try{
   for(const width of [320,375,390,430]){
     const context=await browser.newContext({viewport:{width,height:844},isMobile:engine==='webkit',hasTouch:true,reducedMotion:width===375?'reduce':'no-preference'});
     const page=await context.newPage();
     const errors=[];page.on('pageerror',error=>errors.push(error.message));
     await page.addInitScript(()=>{Math.random=()=>.99;});
     await page.goto(url,{waitUntil:'networkidle'});
     await page.locator('[data-home-page="forest"]').click();
     // Pale-green onboarding text must not inherit the white font from the dark forest card.
     const hintContrast=await page.locator('.dungeon-first-tip').evaluate(el=>{
       const rgb=value=>getComputedStyle(el)[value].match(/[\d.]+/g).slice(0,3).map(Number);
       const luminance=values=>values.map(x=>{const c=x/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;})
         .reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
       const a=luminance(rgb('color')),b=luminance(rgb('backgroundColor'));
       return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
     });
     assert.ok(hintContrast>=4.5,`${engine}/${width}: beginner hint needs readable contrast, got ${hintContrast.toFixed(2)}:1`);
     await page.locator('#start-forest-tactics').click();
     await page.locator('#forest-explore-continue').click();
     assert.equal(await page.locator('#forest-party-hp').isVisible(),true);
     assert.equal(await page.locator('#forest-party-hp').getAttribute('aria-valuenow'),'12');
     assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'3');
     assert.equal(await page.locator('[data-tactic-action]').count(),2,'Defense is automatic: only attack and ultimate remain');
     assert.equal(await page.locator('[data-tactic-action="guard"]').count(),0);
     assert.equal(await page.locator('[data-tactic-action="skill"]').isEnabled(),false,'Ultimate requires three independent answers');
     assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'0');
     assert.equal(await page.locator('[data-tactic-kind]').count(),4);
     assert.match(await page.locator('#forest-tactics').innerText(),/固有スキル：ことばの連撃/);
     assert.match(await page.locator('#forest-tactics').innerText(),/リスニング.*文法/s);
     assert.match(await page.locator('#forest-tactics').innerText(),/次の敵攻撃：文法/,'Enemy must telegraph the upcoming skill before the ally commits');
     await answer(page);
     assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'1');
     assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'1','Starter ally speak attack deals two vs first foe');
     assert.equal(await page.locator('#forest-world-stage').getAttribute('data-tactics'),'true');
     assert.equal(await page.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-boss-defeated')),false,'A living enemy must not be flagged defeated');
     if(width!==375)await page.waitForTimeout(1350); // Original bug only appeared after the knockout animation finished.
     const livingEnemyOpacity=Number(await page.locator('#forest-enemy').evaluate(el=>getComputedStyle(el).opacity));
     assert.ok(livingEnemyOpacity>.85,`${engine}/${width}: enemy at 1 HP disappeared after the first hit (${livingEnemyOpacity})`);
     await page.locator('#next-question').click();
     assert.match(await page.locator('#forest-tactics').innerText(),/敵のターン.*文法/s);
     assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id')!==null,true);
     if(width===390){
       // A definitely wrong grammar answer really costs HP, only once per attack.
       await page.locator('#spoken-answer').fill('wrong answer');
       await page.locator('#show-answer').click();
       const afterMiss=Number(await page.locator('#forest-party-hp').getAttribute('aria-valuenow'));
       assert.ok(afterMiss<12,`Enemy must deal damage on objective miss (${afterMiss})`);
       await answer(page);
       assert.equal(Number(await page.locator('#forest-party-hp').getAttribute('aria-valuenow')),afterMiss,'Correction does not erase first hit or double-charge');
       assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'1','A mistake followed by correction must not fill the gauge');
     }else{
       await answer(page);
       assert.equal(await page.locator('#forest-party-hp').getAttribute('aria-valuenow'),'12','Independent defense blocks enemy damage');
       assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'2');
     }
     await page.locator('#next-question').click();
     assert.match(await page.locator('#forest-tactics').innerText(),/味方のターン/);
     assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'1');
     const browserLayout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
     assert.ok(browserLayout.scroll<=browserLayout.width+1,`${engine}/${width}: horizontal overflow ${JSON.stringify(browserLayout)}`);
     await page.locator('[data-tactic-kind="listen"]').click();
     assert.equal(await page.locator('[data-tactic-kind="listen"]').getAttribute('aria-pressed'),'true');
     await answer(page);
     assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),width===390?'2':'3');
     assert.equal(await page.locator('[data-tactic-action="skill"]').isEnabled(),width!==390);
     assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'0');
     assert.equal(await page.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-boss-defeated')),true);
     if(width!==375)await page.waitForTimeout(1350);
     const defeatedEnemyOpacity=Number(await page.locator('#forest-enemy').evaluate(el=>getComputedStyle(el).opacity));
     assert.ok(defeatedEnemyOpacity<.05,`${engine}/${width}: defeated enemy should finish the knockout animation (${defeatedEnemyOpacity})`);
     await page.locator('#next-question').click();
     assert.equal(await page.locator('#forest-explore-options').isVisible(),true,'First encounter unlocks route after actual victory');
     assert.deepEqual(errors,[]);
     await context.close();
   }
   console.log(`${engine}: tactical battle, weakness, enemy turn, HP defense and mobile widths passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
