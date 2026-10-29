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
     const tacticalLayout=await page.evaluate(()=>{
       const bounds=selector=>document.querySelector(selector).getBoundingClientRect();
       return {question:bounds('#play-card').top,commands:bounds('#forest-tactics').top,
         answer:bounds('#answer-area').top,arena:bounds('#forest-world-stage').height};
     });
     assert.ok(tacticalLayout.question<tacticalLayout.commands&&tacticalLayout.commands<tacticalLayout.answer,
       `${engine}/${width}: read the question, select the action, then answer (${JSON.stringify(tacticalLayout)})`);
     assert.ok(tacticalLayout.arena<=155,`${engine}/${width}: battle field must leave room for the question`);
     assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'3');
     assert.equal(await page.locator('[data-tactic-action]').count(),2,'Defense is automatic: only attack and ultimate remain');
     assert.equal(await page.locator('[data-tactic-action="assist"]').count(),0,'Solo players do not get an unusable team-up control');
     assert.equal(await page.locator('[data-tactic-action="guard"]').count(),0);
     assert.equal(await page.locator('[data-tactic-action="skill"]').isEnabled(),false,'Ultimate requires three independent answers');
     assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'0');
     assert.equal(await page.locator('[data-tactic-kind]').count(),4);
     const extra=page.locator('.forest-tactic-more');
     assert.equal(await extra.count(),1,`${engine}/${width}: verbose strategy notes must be collapsible on mobile`);
     assert.equal(await extra.getAttribute('open'),null,'The long help text starts collapsed');
     assert.equal(await page.locator('.forest-tactic-ability').isVisible(),false);
     await extra.locator('summary').click();
     assert.equal(await page.locator('.forest-tactic-ability').isVisible(),true);
     assert.match(await page.locator('#forest-tactics').innerText(),/固有スキル：ことばの連撃/);
     await extra.locator('summary').click();
     assert.equal(await page.locator('.forest-tactic-ability').isVisible(),false);
     assert.equal(await page.locator('.answer-quick-help > div').isVisible(),false,'Long hint explanation should not distract from the question');
     assert.equal(await page.locator('#show-hint').isVisible(),true,'Hint remains available with one tap');
     const mobileTextarea=await page.locator('#spoken-answer').evaluate(el=>el.getBoundingClientRect().height);
     assert.ok(mobileTextarea<=96,`${engine}/${width}: answer input must fit a phone (${mobileTextarea}px)`);
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
     await page.waitForTimeout(100);
     const scrollResult=await page.evaluate(()=>({
       questionTop:document.querySelector('#play-card').getBoundingClientRect().top,
       fieldHeight:document.querySelector('#forest-journey').getBoundingClientRect().height,
       viewportHeight:innerHeight
     }));
     assert.ok(scrollResult.questionTop>=-2&&scrollResult.questionTop<scrollResult.viewportHeight-100,
       `${engine}/${width}: next question should not be stranded below the viewport (${JSON.stringify(scrollResult)})`);
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
     const seeded={...createSave(),ownedMonsters:['medamago','katappo','purupun','koge'],selectedMonster:'medamago',
       xpWallet:137,monsterXp:{medamago:84,katappo:53,purupun:22,koge:11}};
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
   assert.equal(await partyPage.locator('#forest-party-hp').getAttribute('aria-valuenow'),'8','84 XP is Lv2 and does not gain the Lv3 HP bonus');
   assert.equal(await partyPage.locator('[data-tactic-ally]').count(),3);
   assert.equal(await partyPage.locator('[data-tactic-ally="purupun"]').count(),0,'The replaced reserve does not join this encounter');
   assert.equal(await partyPage.locator('[data-tactic-ally="koge"]').count(),1);
     assert.equal(await partyPage.locator('.forest-party-brief').getAttribute('open'),null,'The party swap is one compact control on mobile');
     await partyPage.locator('.forest-party-brief summary').click();
     assert.match(await partyPage.locator('[data-tactic-ally="katappo"]').innerText(),/HP 8\/8/);
   await partyPage.locator('[data-tactic-ally="katappo"]').click();
   assert.equal(await partyPage.locator('[data-tactic-ally="katappo"]').getAttribute('aria-pressed'),'true');
     assert.equal(await partyPage.locator('.forest-party-brief').getAttribute('open'),'','Party options stay open when switching companions');
   assert.equal(await partyPage.locator('[data-tactic-ally="medamago"]').isEnabled(),false,'Cannot swap twice in one encounter');
   await partyPage.locator('[data-tactic-kind="speak"]').click();
   assert.equal(await partyPage.locator('[data-tactic-action="assist"]').isEnabled(),true,'Yolkie can support Soxie speaking from the reserve');
   await partyPage.locator('[data-tactic-action="assist"]').click();
   assert.equal(await partyPage.locator('[data-tactic-action="assist"]').getAttribute('aria-pressed'),'true');
   await answer(partyPage);
   assert.match(await partyPage.locator('#forest-battle-log').innerText(),/連携成功！.*ダメージ＋1/);
   assert.equal(await partyPage.locator('[data-tactic-action="assist"]').isEnabled(),false,'Only one team-up per encounter');
   const assistContrast=await partyPage.locator('[data-tactic-action="assist"]').evaluate(el=>{
     const luminance=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;})
       .reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
     const style=getComputedStyle(el),a=luminance(style.color),b=luminance(style.backgroundColor);
     return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   });
   assert.ok(assistContrast>=4.5,`Disabled team-up text must remain readable on iPhone (${assistContrast.toFixed(2)}:1)`);
   await partyPage.locator('#next-question').click();
   await partyPage.locator('#spoken-answer').fill('wrong answer');
   await partyPage.locator('#show-answer').click();
   assert.equal(await partyPage.locator('#forest-party-hp').getAttribute('aria-valuenow'),'5','Only the active ally loses HP');
   await answer(partyPage);
   await partyPage.locator('#next-question').click();
   assert.equal(await partyPage.locator('#forest-party-hp').getAttribute('aria-valuenow'),'5');
   assert.match(await partyPage.locator('[data-tactic-ally="medamago"]').innerText(),/HP 8\/8/,'Lv2 reserve ally HP remains intact');
   assert.match(await partyPage.locator('[data-tactic-ally="katappo"]').innerText(),/HP 5\/8/);
   const persisted=await partyPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
   assert.deepEqual(persisted.ownedMonsters,['medamago','katappo','purupun','koge'],'Choosing fighters does not discard saved monsters');
   assert.equal(persisted.selectedMonster,'medamago','Temporary battle leader does not overwrite the collection selection');
   assert.ok(persisted.xpWallet>=137,'Existing XP wallet must not be lost by tactical battles');
   assert.deepEqual(persisted.monsterXp,{medamago:84,katappo:53,purupun:22,koge:11},'Individual monster XP remains intact');
   assert.equal(Object.hasOwn(persisted,'party'),false,'HP is not added to persistent save');
   await partyPage.reload({waitUntil:'networkidle'});
   const afterReload=await partyPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
   assert.deepEqual(afterReload.ownedMonsters,persisted.ownedMonsters,'Monster collection survives reload');
   assert.deepEqual(afterReload.monsterXp,persisted.monsterXp,'Growth XP survives reload');
   assert.equal(afterReload.xpWallet,persisted.xpWallet,'Wallet survives reload');
   const layout=await partyPage.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(layout.scroll<=layout.width+1,`Multi-ally commands must fit 320px (${JSON.stringify(layout)})`);
   await partyContext.close();
   // Evolution should open an actually different team-up route, not just add a
   // collection badge. A trained listening reserve changes ultimate timing.
   const evolutionContext=await browser.newContext({viewport:{width:320,height:844},hasTouch:true,isMobile:engine==='webkit'});
   const evolutionPage=await evolutionContext.newPage();
   await evolutionPage.goto(url,{waitUntil:'networkidle'});
   await evolutionPage.evaluate(async()=>{
     const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
     const seeded={...createSave(),ownedMonsters:['medamago','katappo'],selectedMonster:'medamago',
       xpWallet:17,monsterXp:{medamago:0,katappo:160}};
     localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
   });
   await evolutionPage.reload({waitUntil:'networkidle'});
   await evolutionPage.locator('[data-home-page="forest"]').click();
   await evolutionPage.locator('#start-forest-tactics').click();
   assert.match(await evolutionPage.locator('[data-formation-card="katappo"]').innerText(),/Lv\.3.*HP成長＋2/);
   assert.match(await evolutionPage.locator('[data-formation-card="katappo"]').innerText(),/進化援護「覚醒・共鳴」/);
   await evolutionPage.locator('#forest-explore-continue').click();
   await evolutionPage.locator('[data-tactic-kind="listen"]').click();
   const assist= evolutionPage.locator('[data-tactic-action="assist"]');
   assert.equal(await assist.isEnabled(),true);
   assert.match(await assist.innerText(),/必殺ゲージ＋1.*覚醒・共鳴/);
   await assist.click();
   await answer(evolutionPage);
   assert.match(await evolutionPage.locator('#forest-battle-log').innerText(),/覚醒・共鳴発動！.*必殺ゲージ＋1/);
   assert.equal(await evolutionPage.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'2',
     'independent answer and evolved charge support combine');
   const evolvedSave=await evolutionPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
   assert.equal(evolvedSave.monsterXp.katappo,160,'new battle talent cannot spend trained XP');
   assert.ok(evolvedSave.xpWallet>=17,'team-up never spends the saved XP wallet; correct English can still earn XP');
   const evolvedLayout=await evolutionPage.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(evolvedLayout.scroll<=evolvedLayout.width+1,`Evolved support label must fit iPhone SE (${JSON.stringify(evolvedLayout)})`);
   await evolutionContext.close();
   // Battle action selection should fetch a due task instead of silently
   // returning random content, even when the next enemy asks a new skill.
   const recallContext=await browser.newContext({viewport:{width:320,height:844},hasTouch:true,isMobile:engine==='webkit'});
   const recallPage=await recallContext.newPage();
   await recallPage.goto(url,{waitUntil:'networkidle'});
   const grading=await recallPage.evaluate(async()=>{
     const {ALL_PROMPTS}=await import('./monster-data.js');
     const {gradeLocalResponse}=await import('./monster-grader.js');
     const cases=[
       ['order-coffee',"I'd like to order an iced coffee, please."],
       ['order-coffee-hard',"I'd like to order a large iced coffee with no sugar to go."],
       ['order-coffee-hard','Could I have a large iced coffee to go?'],
       ['direction-station-hard',"What's the quickest way to the nearest station without using stairs?"],
       ['booking-table-hard','Can I reserve a table for two at seven, not near the entrance?'],
       ['booking-table-hard','Can I book a table for two?']
     ];
     return cases.map(([id,answer])=>gradeLocalResponse(ALL_PROMPTS.find(p=>p.id===id),answer).status);
   });
   assert.deepEqual(grading,['correct','correct','review','correct','correct','review'],
     `${engine}: local semantic safety and natural alternatives work in a browser`);
   const dueGrammarIds=await recallPage.evaluate(async()=>{
     const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
     const {ALL_PROMPTS}=await import('./monster-data.js');
     const ids=ALL_PROMPTS.filter(p=>p.kind==='grammar'&&(p.difficulty||'easy')==='easy'&&!p.bossOnly&&!p.world).slice(0,6).map(p=>p.id);
     const saved=createSave();saved.reviewPrompts=Object.fromEntries(ids.map(id=>[id,'2000-01-01']));
     localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
     return ids;
   });
   await recallPage.reload({waitUntil:'networkidle'});
   await recallPage.locator('[data-home-page="forest"]').click();
   await recallPage.locator('#start-forest-tactics').click();
   await recallPage.locator('#forest-explore-continue').click();
   assert.match(await recallPage.locator('.forest-tactic-review').innerText(),/文法 [1-9]\d*問/,'Players can see their overdue tactical review');
   await recallPage.locator('[data-tactic-kind="grammar"]').click();
   const selected=await recallPage.locator('#play-card').getAttribute('data-prompt-id');
   assert.ok(dueGrammarIds.includes(selected),`A selected grammar attack should practice a due task, got ${selected}`);
   const reportContrast=await recallPage.locator('.forest-tactic-review').evaluate(el=>{
     const rgb=str=>str.match(/[\d.]+/g).slice(0,3).map(Number);
     const lum=str=>rgb(str).map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;})
       .reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
     const style=getComputedStyle(el),a=lum(style.color),b=lum(style.backgroundColor);
     return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   });
   assert.ok(reportContrast>=4.5,`Due-review status must be readable at 320px (${reportContrast.toFixed(2)}:1)`);
   const recallLayout=await recallPage.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(recallLayout.scroll<=recallLayout.width+1,`${engine}: review battle should not overflow mobile (${JSON.stringify(recallLayout)})`);
   await recallContext.close();
   // Later chapters introduce announced foe roles. The armored enemy really
   // survives a non-weak first hit, even from an evolved attacker; no grading
   // verdict, save data or mobile layout is changed by that defense.
   const advancedContext=await browser.newContext({viewport:{width:375,height:844},hasTouch:true,isMobile:engine==='webkit'});
   const advancedPage=await advancedContext.newPage();
   await advancedPage.goto(url,{waitUntil:'networkidle'});
   await advancedPage.evaluate(async()=>{
     const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
     const saved=createSave();
     saved.forest.completedAreas=['entry'];saved.monsterXp.medamago=160;saved.xpWallet=27;
     localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
   });
   await advancedPage.reload({waitUntil:'networkidle'});
   await advancedPage.locator('[data-home-page="forest"]').click();
   await advancedPage.locator('#start-forest-tactics').click();
   assert.match(await advancedPage.locator('#play-mode-label').innerText(),/木漏れ日の小道/);
   await advancedPage.locator('#forest-explore-continue').click();
   assert.equal(await advancedPage.locator('[data-foe-style]').getAttribute('data-foe-style'),'shell');
   assert.match(await advancedPage.locator('.forest-tactic-foe-style').innerText(),/最初の一撃は弱点以外のダメージ−1/);
   await advancedPage.locator('[data-tactic-kind="speak"]').click();
   await answer(advancedPage);
   assert.equal(await advancedPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'1',
     'An evolved specialty attack deals 3, but the enemy shell visibly absorbs 1');
   assert.match(await advancedPage.locator('#forest-battle-log').innerText(),/敵の殻に威力を1防がれた/);
   assert.match(await advancedPage.locator('.forest-tactic-foe-style').innerText(),/殻は破れた/);
   const advancedContrast=await advancedPage.locator('.forest-tactic-foe-style').evaluate(el=>{
     const luminance=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{
       const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;
     }).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
     const style=getComputedStyle(el),a=luminance(style.color),b=luminance(style.backgroundColor);
     return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   });
   assert.ok(advancedContrast>=4.5,`Enemy style advice must remain readable on iPhone (${advancedContrast.toFixed(2)}:1)`);
   const advancedWidth=await advancedPage.evaluate(()=>({screen:innerWidth,page:document.documentElement.scrollWidth}));
   assert.ok(advancedWidth.page<=advancedWidth.screen+1,`Advanced battle must fit iPhone (${JSON.stringify(advancedWidth)})`);
   const saved=await advancedPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
   assert.deepEqual(saved.forest.completedAreas,['entry']);
   assert.equal(saved.monsterXp.medamago,160);
   assert.ok(saved.xpWallet>=27);
   await advancedContext.close();
   // Training is a real gameplay milestone: Lv.4 grants one independent
   // specialty technique, without consuming saved monster XP or adding UI
   // clutter for a new Lv.1 player.
   const masteryContext=await browser.newContext({viewport:{width:320,height:844},hasTouch:true,isMobile:engine==='webkit'});
   const masteryPage=await masteryContext.newPage();
   await masteryPage.goto(url,{waitUntil:'networkidle'});
   await masteryPage.evaluate(async()=>{
     const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
     const saved=createSave();saved.monsterXp.medamago=210;saved.xpWallet=9;
     localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
   });
   await masteryPage.reload({waitUntil:'networkidle'});
   await masteryPage.locator('[data-home-page="forest"]').click();
   await masteryPage.locator('#start-forest-tactics').click();
   assert.match(await masteryPage.locator('[data-formation-card="medamago"]').innerText(),/Lv\.4.*熟練技「黄身の二連撃」/s);
   await masteryPage.locator('#forest-explore-continue').click();
   assert.match(await masteryPage.locator('.forest-tactic-mastery').innerText(),/Lv\.4技：黄身の二連撃.*準備OK/);
   assert.equal(await masteryPage.locator('[data-mastery-used]').getAttribute('data-mastery-used'),'false');
   await answer(masteryPage);
   assert.match(await masteryPage.locator('#forest-battle-log').innerText(),/黄身の二連撃.*追撃ダメージ＋1/);
   assert.equal(await masteryPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'0',
     'Lv.4 first specialty strike is 1 stronger than the untrained Lv.1 version');
   assert.equal(await masteryPage.locator('[data-mastery-used]').getAttribute('data-mastery-used'),'true');
   assert.equal(await masteryPage.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'1',
     'training does not claim an extra independent answer');
   const masterySave=await masteryPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
   assert.equal(masterySave.monsterXp.medamago,210,'trained XP is not consumed in combat');
   assert.ok(masterySave.xpWallet>=9,'existing XP wallet is not spent by the new technique');
   const masteryLayout=await masteryPage.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(masteryLayout.scroll<=masteryLayout.width+1,`Level-up technique label must fit 320px (${JSON.stringify(masteryLayout)})`);
   await masteryContext.close();
   console.log(`${engine}: tactical battle, weakness, enemy turn, HP defense and mobile widths passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
