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
     assert.equal(await page.locator('#forest-party-formation').isVisible(),true,'Battle starts with a clear party-formation screen');
     assert.match(await page.locator('#forest-party-formation').innerText(),/出撃メンバー 1 \/ 3体/);
     assert.match(await page.locator('#forest-party-formation').innerText(),/弱点：リスニング/);
     // A solo player's only companion must give tap feedback rather than appear broken.
     assert.equal(await page.locator('[data-formation-choice="medamago"]').isEnabled(),true);
     await page.locator('[data-formation-card="medamago"] .forest-formation-creature').click();
     assert.match(await page.locator('#forest-formation-status').innerText(),/この仲間1体で出撃/);
     await page.locator('[data-formation-choice="medamago"]').click();
     assert.match(await page.locator('#forest-formation-status').innerText(),/仲間が増えたら/);
     await page.locator('#forest-explore-continue').click();
     assert.equal(await page.locator('#forest-party-formation').isVisible(),false);
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
   // A saved multi-ally collection must survive unchanged while a battle uses
   // temporary, independent HP. One exchange is allowed in each encounter.
   const partyContext=await browser.newContext({viewport:{width:320,height:844},hasTouch:true,isMobile:engine==='webkit'});
   const partyPage=await partyContext.newPage();
   await partyPage.addInitScript(()=>{Math.random=()=>.99;});
   await partyPage.goto(url,{waitUntil:'networkidle'});
   await partyPage.evaluate(async()=>{
     const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
     const seeded={...createSave(),ownedMonsters:['medamago','katappo','purupun','koge'],selectedMonster:'medamago'};
     localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
   });
   await partyPage.reload({waitUntil:'networkidle'});
   await partyPage.locator('[data-home-page="forest"]').click();
   await partyPage.locator('#start-forest-tactics').click();
   assert.equal(await partyPage.locator('[data-formation-choice]').count(),4);
   assert.match(await partyPage.locator('#forest-party-formation').innerText(),/出撃メンバー 3 \/ 3体/);
   await partyPage.locator('[data-formation-card="koge"] .forest-formation-creature').click();
   assert.match(await partyPage.locator('#forest-formation-status').innerText(),/編成を更新したよ/);
   assert.match(await partyPage.locator('[data-formation-slot="2"]').innerText(),/コゲ/);
   await partyPage.locator('[data-formation-choice="medamago"]').click();
   assert.match(await partyPage.locator('#forest-formation-status').innerText(),/先頭で出撃中/);
   await partyPage.locator('[data-formation-lead="katappo"]').click();
   assert.match(await partyPage.locator('[data-formation-slot="0"]').innerText(),/カタッポ/);
   await partyPage.locator('[data-formation-lead="medamago"]').click();
   await partyPage.locator('#forest-explore-continue').click();
   assert.equal(await partyPage.locator('#forest-party-hp').getAttribute('aria-valuenow'),'8');
   assert.equal(await partyPage.locator('[data-tactic-ally]').count(),3);
   assert.equal(await partyPage.locator('[data-tactic-ally="purupun"]').count(),0,'The replaced reserve does not join this encounter');
   assert.equal(await partyPage.locator('[data-tactic-ally="koge"]').count(),1);
   assert.match(await partyPage.locator('[data-tactic-ally="katappo"]').innerText(),/HP 8\/8/);
   await partyPage.locator('[data-tactic-ally="katappo"]').click();
   assert.equal(await partyPage.locator('[data-tactic-ally="katappo"]').getAttribute('aria-pressed'),'true');
   assert.equal(await partyPage.locator('[data-tactic-ally="medamago"]').isEnabled(),false,'Cannot swap twice in one encounter');
   await answer(partyPage);
   await partyPage.locator('#next-question').click();
   await partyPage.locator('#spoken-answer').fill('wrong answer');
   await partyPage.locator('#show-answer').click();
   assert.equal(await partyPage.locator('#forest-party-hp').getAttribute('aria-valuenow'),'5','Only the active ally loses HP');
   await answer(partyPage);
   await partyPage.locator('#next-question').click();
   assert.equal(await partyPage.locator('#forest-party-hp').getAttribute('aria-valuenow'),'5');
   assert.match(await partyPage.locator('[data-tactic-ally="medamago"]').innerText(),/HP 8\/8/,'Reserve ally HP remains intact');
   assert.match(await partyPage.locator('[data-tactic-ally="katappo"]').innerText(),/HP 5\/8/);
   const persisted=await partyPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
   assert.deepEqual(persisted.ownedMonsters,['medamago','katappo','purupun','koge'],'Choosing fighters does not discard saved monsters');
   assert.equal(Object.hasOwn(persisted,'party'),false,'HP is not added to persistent save');
   const layout=await partyPage.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(layout.scroll<=layout.width+1,`Multi-ally commands must fit 320px (${JSON.stringify(layout)})`);
   await partyContext.close();
   console.log(`${engine}: tactical battle, weakness, enemy turn, HP defense and mobile widths passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
