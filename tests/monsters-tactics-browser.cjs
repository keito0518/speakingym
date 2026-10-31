const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 const url=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 const answer=async page=>{
   if(await page.locator('.forest-attack-select').isVisible())
     await page.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
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
     await page.locator('[data-feature-worlds]').click();
     // Pale-green onboarding text must not inherit the white font from the dark forest card.
     const hintContrast=await page.locator('.dungeon-first-tip').evaluate(el=>{
       const rgb=value=>getComputedStyle(el)[value].match(/[\d.]+/g).slice(0,3).map(Number);
       const luminance=values=>values.map(x=>{const c=x/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;})
         .reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
       const a=luminance(rgb('color')),b=luminance(rgb('backgroundColor'));
       return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
     });
     assert.ok(hintContrast>=4.5,`${engine}/${width}: beginner hint needs readable contrast, got ${hintContrast.toFixed(2)}:1`);
     await page.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await page.locator('#start-forest-tactics').click();
     assert.equal(await page.locator('#forest-party-formation').isVisible(),true,'Battle starts with a clear party-formation screen');
     if(width===320){
       await page.locator('#open-battle-guide').click();
       assert.equal(await page.locator('#monsters-tutorial').isVisible(),true,'The game has an on-demand guide without leaving battle');
       assert.match(await page.locator('#tutorial-heading').innerText(),/仲間を編成/);
       const guideBounds=await page.locator('.tutorial-dialog').boundingBox();
       assert.ok(guideBounds.width<=width&&guideBounds.y>=0&&guideBounds.y+guideBounds.height<=844,
         `The tutorial must fit the entire iPhone screen (${JSON.stringify(guideBounds)})`);
       await page.locator('[data-tutorial-chapter="battle"]').click();
       await page.locator('#tutorial-next').click();
       assert.match(await page.locator('#tutorial-heading').innerText(),/英語で攻撃/);
       await page.locator('#tutorial-close').click();
       assert.equal(await page.locator('#forest-party-formation').isVisible(),true,'Closing the guide preserves the party screen');
     }
     assert.match(await page.locator('#forest-party-formation').innerText(),/出撃メンバー 1 \/ 3体/);
     assert.equal(await page.locator('.forest-formation-boss-wrap').getAttribute('open'),null,'Boss plan should be optional');
     assert.equal(await page.locator('.forest-formation-monster-more small').isVisible(),false,'Advanced ally ability starts hidden');
     await page.locator('.forest-formation-monster-more > summary').click();
     assert.equal(await page.locator('.forest-formation-monster-more small').isVisible(),true,'Ally stats are accessible on request');
     assert.match(await page.locator('#forest-party-formation').innerText(),/弱点：リスニング/);
     // A solo player's only companion must give tap feedback rather than appear broken.
     assert.equal(await page.locator('[data-formation-choice="medamago"]').isEnabled(),true);
     await page.locator('[data-formation-card="medamago"] .forest-formation-creature').click();
     assert.match(await page.locator('#forest-formation-status').innerText(),/この仲間1体で出撃/);
     await page.locator('[data-formation-choice="medamago"]').click();
     assert.match(await page.locator('#forest-formation-status').innerText(),/仲間が増えたら/);
     await page.locator('#forest-explore-continue').click();
     assert.equal(await page.locator('.forest-attack-select').isVisible(),true,'Player selects the attack type before seeing a question');
     assert.match(await page.locator('#forest-world-stage').getAttribute('data-cinematic'),/^(opening|idle)$/,
       'The monster scene is ready before the player chooses an attack');
     assert.equal(await page.locator('#play-card').isVisible(),false,'No arbitrary question is shown before type selection');
     assert.equal(await page.locator('#answer-area').isVisible(),false,'There is nothing to answer until a type is chosen');
     await page.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
     assert.equal(await page.locator('#play-card').isVisible(),true,'The question appears only after choosing a type');
     assert.equal(await page.locator('#forest-party-formation').isVisible(),false);
     assert.equal(await page.locator('#forest-party-hp').isVisible(),true);
     if(width===320){
       const before=await page.evaluate(()=>({hp:document.querySelector('#forest-party-hp').getAttribute('aria-valuenow'),save:localStorage.getItem('speakingym-monsters-prototype-v1')}));
       await page.locator('#open-battle-guide').click();
       await page.locator('#tutorial-try-battle').click();
       assert.equal(await page.locator('#monsters-practice-battle').isVisible(),true);
       for(const id of ['attack','wait','am','thanks'])await page.locator('[data-practice-action="'+id+'"]').click();
       assert.match(await page.locator('[data-practice-action="begin"]').innerText(),/戦闘へ戻る/);
       await page.locator('[data-practice-action="begin"]').click();
       assert.equal(await page.locator('#forest-party-hp').isVisible(),true,
         'The in-battle guide must restore the current encounter without creating a new one');
       assert.deepEqual(await page.evaluate(()=>({hp:document.querySelector('#forest-party-hp').getAttribute('aria-valuenow'),save:localStorage.getItem('speakingym-monsters-prototype-v1')})),before,
         'Training during a live fight must not modify health or saved progress');
     }
     assert.equal(await page.locator('#forest-party-hp').getAttribute('aria-valuenow'),'12');
     const tacticalLayout=await page.evaluate(()=>{
       const bounds=selector=>document.querySelector(selector).getBoundingClientRect();
       return {question:bounds('#play-card').top,commands:bounds('#forest-tactics').top,
         answer:bounds('#answer-area').top,arena:bounds('#forest-world-stage').height,
         integrated:['#play-card','#answer-area','#forest-tactics','.forest-battle-info','#forest-party-hp']
           .every(selector=>document.querySelector('#forest-world-stage').contains(document.querySelector(selector))),
         sticky:getComputedStyle(document.querySelector('#forest-journey')).position==='sticky',
         separateConsole:getComputedStyle(document.querySelector('.forest-command-window')).display};
     });
     assert.ok(tacticalLayout.question<tacticalLayout.answer&&tacticalLayout.answer<tacticalLayout.commands,
       `${engine}/${width}: show the question and answer before optional tactics (${JSON.stringify(tacticalLayout)})`);
     assert.ok(tacticalLayout.integrated&&tacticalLayout.arena>300,
       `${engine}/${width}: the live question, answer and HP must share the illustrated arena (${JSON.stringify(tacticalLayout)})`);
     assert.equal(tacticalLayout.sticky,false,'The integrated battlefield must scroll naturally instead of covering the question');
     assert.equal(tacticalLayout.separateConsole,'none','No duplicate command window can appear below the arena');
     const shieldLayout=await page.evaluate(()=>{
       const shield=document.querySelector('#forest-guard').getBoundingClientRect();
       const cinematic=document.querySelector('#forest-cinematic-layer').getBoundingClientRect();
       const console=document.querySelector('#forest-arena-console').getBoundingClientRect();
       return {shieldTop:shield.top,shieldBottom:shield.bottom,
         cinematicTop:cinematic.top,cinematicBottom:cinematic.bottom,consoleTop:console.top};
     });
     assert.ok(shieldLayout.shieldTop>=shieldLayout.cinematicTop-1&&
       shieldLayout.shieldBottom<=shieldLayout.consoleTop+1,
       `${engine}/${width}: the GUARD shield must be inside the animated scene, not behind English text (${JSON.stringify(shieldLayout)})`);
     assert.equal(await page.locator('#forest-world-stage').getAttribute('data-cinematic'),'idle',
       'Choosing a skill must not replay the monster entrance animation');
     assert.equal(await page.locator('#forest-world-stage').getAttribute('data-encounter'),'1',
       'Opening cinematic should identify the upcoming stage');
     assert.match(await page.locator('#forest-world-stage').getAttribute('data-challenge'),/スピーキング|リスニング|単語|文法|読解/,
       'Stage transition identifies the English challenge inside the game scene');
     assert.equal(await page.locator('#forest-battle-log').isVisible(),false,
       'The initial empty battle log must not repeat the same instruction above the question');
     const answerViewport=await page.evaluate(()=>({top:document.querySelector('#spoken-answer').getBoundingClientRect().top,viewport:innerHeight}));
     assert.ok(answerViewport.top<answerViewport.viewport,
       `${engine}/${width}: the first answer field must appear without scrolling past tactical explanations (${JSON.stringify(answerViewport)})`);
     assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'3');
     assert.equal(await page.locator('[data-tactic-action]').count(),2,'Defense is automatic: only attack and ultimate remain');
     assert.equal(await page.locator('[data-tactic-action="assist"]').count(),0,'Solo players do not get an unusable team-up control');
     assert.equal(await page.locator('[data-tactic-action="guard"]').count(),0);
     assert.equal(await page.locator('[data-tactic-action="skill"]').isEnabled(),false,'Ultimate requires three independent answers');
     assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'0');
     assert.equal(await page.locator('[data-tactic-kind]').count(),4);
     const strategy=page.locator('.forest-tactic-strategy');
     assert.equal(await strategy.getAttribute('open'),null,'Advanced tactics start collapsed');
     assert.equal(await page.locator('.forest-tactic-kinds').isVisible(),false,'Question switching is optional, so the first view stays focused');
     assert.equal(await page.locator('.forest-tactic-actions').isVisible(),false,'Attack is automatic until a player requests other tactics');
     assert.equal(await page.locator('.forest-ultimate-meter').isVisible(),false,'The large meter is available in details, not the first view');
     await page.locator('.forest-tactic-strategy > summary').click();
     assert.equal(await page.locator('.forest-tactic-kinds').isVisible(),false,'The question cannot be switched after it appears');
     const extra=page.locator('.forest-tactic-more');
     assert.equal(await extra.count(),1,`${engine}/${width}: verbose strategy notes must be collapsible on mobile`);
     assert.equal(await extra.getAttribute('open'),null,'The long help text starts collapsed');
     assert.equal(await page.locator('.forest-tactic-ability').isVisible(),false);
     await extra.locator('summary').click();
     assert.equal(await page.locator('.forest-tactic-ability').isVisible(),true);
     assert.match(await page.locator('#forest-tactics').innerText(),/固有スキル：ことばの連撃/);
     await extra.locator('summary').click();
     assert.equal(await page.locator('.forest-tactic-ability').isVisible(),false);
     await page.locator('.forest-tactic-strategy > summary').click();
     assert.equal(await page.locator('.answer-quick-help > div').isVisible(),false,'Long hint explanation should not distract from the question');
     assert.equal(await page.locator('#show-hint').isVisible(),true,'Hint remains available with one tap');
     const mobileTextarea=await page.locator('#spoken-answer').evaluate(el=>el.getBoundingClientRect().height);
     assert.ok(mobileTextarea<=96,`${engine}/${width}: answer input must fit a phone (${mobileTextarea}px)`);
     assert.match(await page.locator('.forest-tactic-kinds').textContent(),/リスニング.*文法/s);
     assert.match(await page.locator('.forest-tactic-forecast').textContent(),/次の敵攻撃：文法/,'Enemy forecast remains available in tactical details');
     await answer(page);
     assert.equal(await page.locator('#forest-world-stage').getAttribute('data-cinematic'),'attack',
       'A verified hit should trigger its own impact cut-in');
     assert.match(await page.locator('#forest-world-stage').getAttribute('data-fx-variant'),/^(arc|burst|storm)$/,
       'Each attack should have an authored, varied motion style');
     const firstFxVariant=await page.locator('#forest-world-stage').getAttribute('data-fx-variant');
     const firstStrikeMotion=await page.locator('#forest-world-stage').getAttribute('data-strike-motion');
     assert.match(firstStrikeMotion,/^(dash|rising|spiral)$/,
       'A successful attack chooses an original character follow-through');
     const impactScene=await page.evaluate(()=>{
       const layer=document.querySelector('#forest-cinematic-layer');
       const panel=document.querySelector('#forest-arena-console');
       const impact=document.querySelector('.cinematic-hit-stop');
       const rect=impact.getBoundingClientRect();
       return {layerBottom:layer.getBoundingClientRect().bottom,panelTop:panel.getBoundingClientRect().top,
         impactCenter:rect.top+rect.height/2,impactAnimation:getComputedStyle(impact).animationName,
         shockwaveAnimation:getComputedStyle(document.querySelector('.cinematic-shockwave')).animationName,
         spriteAnimation:getComputedStyle(document.querySelector('#forest-player-art')).animationName};
     });
     if(width===375){
       assert.equal(impactScene.impactAnimation,'none','Reduced-motion users do not see hit-stop flashes');
     }else{
       assert.ok(impactScene.impactCenter<impactScene.layerBottom&&impactScene.layerBottom<=impactScene.panelTop+1,
         `${engine}/${width}: impact must appear above the English quiz (${JSON.stringify(impactScene)})`);
       assert.match(impactScene.impactAnimation,/scene-hit-stop/,'A held contact frame conveys impact');
       assert.match(impactScene.shockwaveAnimation,/scene-shockwave/,'Hits generate a visible shockwave');
       assert.match(impactScene.spriteAnimation,/scene-hero-/,'The companion performs its own extra attack motion');
     }
     assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'1');
     assert.equal(await page.locator('.forest-chain-result').count(),0,'A first answer should not add another badge to the UI');
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
     assert.equal(await page.locator('#forest-arena-console').evaluate(el=>el.scrollTop),0,
       'Every new encounter starts with its prompt visible at the top of the inner game HUD');
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
       assert.equal(await page.locator('.forest-chain-result').count(),0,'Corrections after an error cannot create a streak');
     }else{
       await answer(page);
       assert.equal(await page.locator('#forest-party-hp').getAttribute('aria-valuenow'),'12','Independent defense blocks enemy damage');
       assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),'2');
       assert.match(await page.locator('.forest-chain-result').innerText(),/2 CHAIN/,'Defending correctly must extend the attack streak');
       assert.equal(await page.locator('#forest-world-stage').getAttribute('data-chain-tier'),'1',
         'Two clean turns should awaken the ally aura');
     }
     await page.locator('#next-question').click();
     assert.match(await page.locator('#forest-tactics').innerText(),/あなたのターン/);
     assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'1');
     const browserLayout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
     assert.ok(browserLayout.scroll<=browserLayout.width+1,`${engine}/${width}: horizontal overflow ${JSON.stringify(browserLayout)}`);
     assert.equal(await page.locator('.forest-attack-select').isVisible(),true,'Next player turn again starts with skill choice');
     await page.locator('.forest-attack-select [data-tactic-kind="listen"]').click();
     assert.match(await page.locator('.forest-tactic-strategy > summary').innerText(),/攻撃：リスニング.*確定/);
     await answer(page);
     if(width===390){
       assert.equal(await page.locator('.forest-chain-result').count(),0,'A defensive miss resets momentum for the next attack');
     }else{
       assert.match(await page.locator('.forest-chain-result').innerText(),/3 CHAIN/);
       assert.equal(await page.locator('.forest-chain-milestone').count(),1,'A third independent answer should feel like a milestone');
       assert.match(await page.locator('#forest-combo').textContent(),/3 CHAIN/);
       assert.equal(await page.locator('#forest-world-stage').getAttribute('data-chain-tier'),'2',
         'Third clean answer unlocks the second visible aura tier in the same attack');
       assert.match(await page.locator('#forest-world-stage').getAttribute('data-fx-variant'),/^(burst|storm|flare)$/,
         'Higher combo unlocks a new strike palette rather than repeating starter art');
       assert.match(await page.locator('#forest-world-stage').getAttribute('data-strike-motion'),/^(rising|spiral|corkscrew)$/,
         'Higher combo unlocks an additional character movement');
       assert.equal(await page.locator('.cinematic-combo-orbit').count(),1,
         'The charged ring belongs to the scene instead of being drawn behind the answer');
       if(width!==375)assert.match(await page.locator('.cinematic-combo-orbit').evaluate(el=>getComputedStyle(el).animationName),/scene-combo-orbit/,
         'Normal motion users see the new combo ring inside the upper battlefield');
     }
     assert.equal(await page.locator('[aria-label="必殺ゲージ"]').getAttribute('aria-valuenow'),width===390?'2':'3');
     assert.equal(await page.locator('[data-tactic-action="skill"]').isEnabled(),width!==390);
     assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'0');
     assert.equal(await page.locator('#forest-world-stage').getAttribute('data-cinematic'),'victory',
       'Defeating the foe triggers a unique knockout cut-in');
     assert.notEqual(await page.locator('#forest-world-stage').getAttribute('data-fx-variant'),firstFxVariant,
       'Consecutive strikes should vary the spectacle without changing the English grading');
     assert.notEqual(await page.locator('#forest-world-stage').getAttribute('data-strike-motion'),firstStrikeMotion,
       'Consecutive successful hits must change the companion motion, too');
     assert.equal(await page.locator('#forest-world-stage').getAttribute('data-finisher'),'regular',
       'A normal enemy knockout uses a special finishing composition, not a boss effect');
     if(width!==375)assert.match(await page.locator('.cinematic-victory-crown').evaluate(el=>getComputedStyle(el).animationName),/scene-ko-crown/,
       'Victory must have its own knockout burst inside the scenic viewport');
     assert.equal(await page.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-boss-defeated')),true);
     if(width!==375)await page.waitForTimeout(1350);
     const defeatedEnemyOpacity=Number(await page.locator('#forest-enemy').evaluate(el=>getComputedStyle(el).opacity));
     assert.ok(defeatedEnemyOpacity<.05,`${engine}/${width}: defeated enemy should finish the knockout animation (${defeatedEnemyOpacity})`);
     await page.locator('#next-question').click();
     assert.equal(await page.locator('#forest-explore-options').isVisible(),false,'Completed encounter continues without an irrelevant route decision');
     assert.equal(await page.locator('.forest-attack-select').isVisible(),true,'Encounter 2 begins with attack choice, not a preselected question');
     assert.equal(await page.locator('#play-card').isVisible(),false,'The new encounter keeps its question hidden until chosen');
     assert.equal(await page.locator('#forest-world-stage').getAttribute('data-encounter'),'2');
     if(width===320){
       // The simple and tactical dungeon share the same full-screen arena;
       // unrelated training modes must still restore the original form.
       await page.locator('#leave-play').click();
       await page.locator('[data-feature-worlds]').click();
       await page.locator('#start-forest').click();
       assert.equal(await page.locator('#forest-party-formation').isVisible(),false,
         'Main dungeon must skip the advanced party setup and start with the current ally');
       await page.locator('#forest-explore-continue').click();
       assert.equal(await page.locator('#forest-world-stage').getAttribute('data-tactics'),'true',
         'The main English dungeon must use real turn-based combat');
       assert.equal(await page.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'3',
         'The normal foe must survive the first regular hit instead of disappearing');
       assert.equal(await page.locator('#forest-arena-console #play-card').count(),1);
       assert.equal(await page.locator('#forest-arena-console #answer-area').count(),1);
       assert.equal(await page.locator('#forest-arena-console').isVisible(),true);
       assert.equal(await page.locator('.forest-command-window').isVisible(),false);
     }
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
   await partyPage.locator('[data-feature-worlds]').click();
   await partyPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await partyPage.locator('#start-forest-tactics').click();
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
   await partyPage.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
   assert.equal(await partyPage.locator('#forest-party-hp').getAttribute('aria-valuenow'),'8','84 XP is Lv2 and does not gain the Lv3 HP bonus');
   assert.equal(await partyPage.locator('[data-tactic-ally]').count(),3);
   assert.equal(await partyPage.locator('[data-tactic-ally="purupun"]').count(),0,'The replaced reserve does not join this encounter');
   assert.equal(await partyPage.locator('[data-tactic-ally="koge"]').count(),1);
     await partyPage.locator('.forest-tactic-strategy > summary').click();
     assert.equal(await partyPage.locator('.forest-party-brief').getAttribute('open'),null,'The party swap is one compact control on mobile');
     await partyPage.locator('.forest-party-brief summary').click();
     assert.match(await partyPage.locator('[data-tactic-ally="katappo"]').innerText(),/HP 8\/8/);
   await partyPage.locator('[data-tactic-ally="katappo"]').click();
   assert.equal(await partyPage.locator('[data-tactic-ally="katappo"]').getAttribute('aria-pressed'),'true');
     assert.equal(await partyPage.locator('.forest-party-brief').getAttribute('open'),'','Party options stay open when switching companions');
   assert.equal(await partyPage.locator('[data-tactic-ally="medamago"]').isEnabled(),false,'Cannot swap twice in one encounter');
   assert.equal(await partyPage.locator('[data-tactic-action="assist"]').isEnabled(),true,'Yolkie can support Soxie speaking from the reserve');
   await partyPage.locator('[data-tactic-action="assist"]').click();
   assert.equal(await partyPage.locator('[data-tactic-action="assist"]').getAttribute('aria-pressed'),'true');
   await answer(partyPage);
   const assistLog=await partyPage.locator('#forest-battle-log').evaluate(el=>({text:el.textContent?.trim()||'',hidden:el.hidden,visible:el.getBoundingClientRect().height>0}));
   assert.ok(assistLog.visible&&!assistLog.hidden,'Team-up combat text must be visible in the actual scene: '+JSON.stringify(assistLog));
   assert.match(assistLog.text,/連携成功！.*ダメージ＋1/,'Team-up should award its visible damage bonus: '+JSON.stringify(assistLog));
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
   assert.equal(await partyPage.locator('.forest-attack-select').isVisible(),true,'The following player turn waits for an attack choice');
   await partyPage.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
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
   await evolutionPage.locator('[data-feature-worlds]').click();
   await evolutionPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await evolutionPage.locator('#start-forest-tactics').click();
   const evolvedCard=evolutionPage.locator('[data-formation-card="katappo"]');
   assert.match(await evolvedCard.innerText(),/Lv\.3/);
   assert.equal(await evolvedCard.locator('.forest-formation-monster-more small').isVisible(),false,
     'Advanced evolved abilities should stay hidden until requested');
   await evolvedCard.locator('.forest-formation-monster-more > summary').click();
   assert.match(await evolvedCard.innerText(),/HP成長＋2/);
   assert.match(await evolvedCard.innerText(),/進化援護「覚醒・共鳴」/);
   await evolutionPage.locator('#forest-explore-continue').click();
   await evolutionPage.locator('.forest-attack-select [data-tactic-kind="listen"]').click();
   await evolutionPage.locator('.forest-tactic-strategy > summary').click();
   const assist= evolutionPage.locator('[data-tactic-action="assist"]');
   assert.equal(await assist.isEnabled(),true);
   assert.match(await assist.innerText(),/必殺ゲージ＋1.*覚醒・共鳴/);
   await assist.click();
   await answer(evolutionPage);
   const evolutionResult=await evolutionPage.evaluate(()=>({
     log:document.querySelector('#forest-battle-log').textContent||'',
     hidden:document.querySelector('#forest-battle-log').hidden,
     prompt:document.querySelector('#play-card').dataset.promptId,
     feedback:document.querySelector('.feedback-box')?.textContent?.slice(0,180)||'',
     gauge:document.querySelector('[aria-label="必殺ゲージ"]')?.getAttribute('aria-valuenow')||''
   }));
   assert.match(evolutionResult.log,/覚醒・共鳴発動！.*必殺ゲージ＋1/,
     'Evolved reserve ability must activate in WebKit: '+JSON.stringify(evolutionResult));
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
   await recallPage.locator('[data-feature-worlds]').click();
   await recallPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await recallPage.locator('#start-forest-tactics').click();
   await recallPage.locator('#forest-explore-continue').click();
   assert.equal(await recallPage.locator('.forest-tactic-review').isVisible(),false,'Due-review notes should not crowd the first battle screen');
   await recallPage.locator('.forest-attack-select [data-tactic-kind="grammar"]').click();
   await recallPage.locator('.forest-tactic-strategy > summary').click();
   assert.match(await recallPage.locator('.forest-tactic-review').innerText(),/文法 [1-9]\d*問/,'Players can check their overdue tactical review from the strategy panel');
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
   await advancedPage.locator('[data-feature-worlds]').click();
   await advancedPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await advancedPage.locator('#start-forest-tactics').click();
   assert.match(await advancedPage.locator('#play-mode-label').innerText(),/木漏れ日の小道/);
   await advancedPage.locator('#forest-explore-continue').click();
   await advancedPage.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
   assert.equal(await advancedPage.locator('[data-foe-style]').getAttribute('data-foe-style'),'shell');
   await advancedPage.locator('.forest-tactic-strategy > summary').click();
   assert.match(await advancedPage.locator('.forest-tactic-foe-style').innerText(),/最初の一撃は弱点以外のダメージ−1/);
   await answer(advancedPage);
   assert.equal(await advancedPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'1',
     'An evolved specialty attack deals 3, but the enemy shell visibly absorbs 1');
   assert.match(await advancedPage.locator('#forest-battle-log').textContent(),/敵の殻に威力を1防がれた/);
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
   await masteryPage.locator('[data-feature-worlds]').click();
   await masteryPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await masteryPage.locator('#start-forest-tactics').click();
   const masteryCard=masteryPage.locator('[data-formation-card="medamago"]');
   assert.match(await masteryCard.innerText(),/Lv\.4/);
   await masteryCard.locator('.forest-formation-monster-more > summary').click();
   assert.match(await masteryCard.innerText(),/熟練技「黄身の二連撃」/);
   await masteryPage.locator('#forest-explore-continue').click();
   await masteryPage.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
   assert.match(await masteryPage.locator('.forest-tactic-mastery').textContent(),/Lv\.4技：黄身の二連撃.*準備OK/);
   assert.equal(await masteryPage.locator('[data-mastery-used]').getAttribute('data-mastery-used'),'false');
   await answer(masteryPage);
   assert.match(await masteryPage.locator('#forest-battle-log').textContent(),/黄身の二連撃.*追撃ダメージ＋1/);
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
   // A late-dungeon enemy actually changes its weakness after surviving one
   // attack. The player can adapt with a different English skill; the next
   // question is still independently assessed and the enemy HP stays real.
   const shiftingContext=await browser.newContext({viewport:{width:375,height:844},hasTouch:true,isMobile:engine==='webkit'});
   const shiftingPage=await shiftingContext.newPage();
   await shiftingPage.goto(url,{waitUntil:'networkidle'});
   await shiftingPage.evaluate(async()=>{
     const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
     const saved=createSave();saved.forest.completedAreas=['entry','glade','thicket','sanctuary'];
     localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
   });
   await shiftingPage.reload({waitUntil:'networkidle'});
   await shiftingPage.locator('[data-feature-worlds]').click();
   await shiftingPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await shiftingPage.locator('#start-forest-tactics').click();
   assert.match(await shiftingPage.locator('#play-mode-label').innerText(),/雪灯りの街/);
   await shiftingPage.locator('#forest-explore-continue').click();
   await shiftingPage.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
   assert.equal(await shiftingPage.locator('[data-foe-style]').getAttribute('data-foe-style'),'shift');
   assert.equal(await shiftingPage.locator('[data-foe-shifted]').getAttribute('data-foe-shifted'),'false');
   assert.equal(await shiftingPage.locator('.forest-tactic-heading').isVisible(),false,'Detailed foe matchup should start hidden');
   await shiftingPage.locator('.forest-tactic-strategy > summary').click();
   assert.match(await shiftingPage.locator('.forest-tactic-heading').innerText(),/敵の弱点：リスニング.*耐性：文法/s);
   await answer(shiftingPage);
   assert.equal(await shiftingPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'2');
   assert.match(await shiftingPage.locator('#forest-battle-log').textContent(),/属性変化！ 次の弱点は文法/);
   assert.equal(await shiftingPage.locator('[data-foe-shifted]').getAttribute('data-foe-shifted'),'true');
   assert.equal(await shiftingPage.locator('#forest-enemy-weakness').innerText(),'弱点：文法',
     'The visible weakness badge changes when the enemy shifts its affinity');
   assert.match(await shiftingPage.locator('.forest-tactic-heading').textContent(),/敵の弱点：文法.*耐性：リスニング/s);
   await shiftingPage.locator('#next-question').click();
   await answer(shiftingPage);
   await shiftingPage.locator('#next-question').click();
   assert.equal(await shiftingPage.locator('.forest-attack-select').isVisible(),true,'Each new attack chooses its type before a question');
   await shiftingPage.locator('.forest-attack-select [data-tactic-kind="grammar"]').click();
   assert.match(await shiftingPage.locator('.forest-tactic-strategy > summary').innerText(),/攻撃：文法.*確定/);
   await answer(shiftingPage);
   assert.ok(Number(await shiftingPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'))<=2,
     'The battle continues with the committed skill type until the foe is defeated');
   const shiftingLayout=await shiftingPage.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(shiftingLayout.scroll<=shiftingLayout.width+1,
     `Changing weakness labels must not overflow mobile (${JSON.stringify(shiftingLayout)})`);
   await shiftingContext.close();
   // A player-side wrong answer must cause a visible, single enemy counter
   // immediately, without an extra defense charge after the correction.
   const counterContext=await browser.newContext({viewport:{width:375,height:844},isMobile:engine==='webkit',hasTouch:true});
   const counterPage=await counterContext.newPage();
   await counterPage.goto(url,{waitUntil:'networkidle'});
   await counterPage.locator('[data-feature-worlds]').click();
   await counterPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});
   await counterPage.locator('#start-forest-tactics').click();
   await counterPage.locator('#forest-explore-continue').click();
   await counterPage.locator('.forest-attack-select [data-tactic-kind="grammar"]').click();
   const weakness=counterPage.locator('#forest-enemy-weakness');
   assert.equal(await weakness.isVisible(),true,'A foe weakness label is displayed in the battle scene');
   assert.equal(await weakness.innerText(),'弱点：リスニング','The visible badge must tell players which English skill beats this foe');
   assert.match(await weakness.getAttribute('aria-label'),/敵の弱点：リスニング/);
   const weaknessLayout=await counterPage.evaluate(()=>{
     const badge=document.querySelector('#forest-enemy-weakness').getBoundingClientRect();
     const foe=document.querySelector('#forest-enemy').getBoundingClientRect();
     const arena=document.querySelector('#forest-world-stage').getBoundingClientRect();
     return {badgeY:badge.y,badgeBottom:badge.bottom,foeY:foe.y,foeBottom:foe.bottom,arenaTop:arena.y,arenaWidth:arena.width};
   });
   assert.ok(weaknessLayout.badgeY>=weaknessLayout.arenaTop&&weaknessLayout.badgeBottom<=weaknessLayout.foeY,
     `WEAK label must never cover the monster sprite: ${JSON.stringify(weaknessLayout)}`);
   await counterPage.locator('.forest-tactic-strategy > summary').click();
   await counterPage.locator('.forest-tactic-strategy > summary').click();
   const hpBefore=Number(await counterPage.locator('#forest-party-hp').getAttribute('aria-valuenow'));
   await counterPage.locator('#spoken-answer').fill('wrong answer');
   await counterPage.locator('#show-answer').click();
   const hpAfter=Number(await counterPage.locator('#forest-party-hp').getAttribute('aria-valuenow'));
   assert.ok(hpAfter<hpBefore,'Confirmed mistake triggers an immediate enemy attack before any correct answer');
   assert.equal(await counterPage.locator('#forest-world-stage').getAttribute('data-cinematic'),'enemy');
   assert.match(await counterPage.locator('#forest-battle-log').textContent(),/反撃！/);
   await counterPage.locator('#spoken-answer').fill('still wrong');
   await counterPage.locator('#show-answer').click();
   assert.equal(Number(await counterPage.locator('#forest-party-hp').getAttribute('aria-valuenow')),hpAfter,
     'Repeated mistakes in one turn cannot drain multiple HP charges');
   await answer(counterPage);
   await counterPage.locator('#next-question').click();
   assert.equal(Number(await counterPage.locator('#forest-party-hp').getAttribute('aria-valuenow')),hpAfter,
     'Correction never triggers a second scheduled enemy retaliation');
   assert.match(await counterPage.locator('#forest-tactics').innerText(),/あなたのターン.*攻撃/s);
   await counterContext.close();
   // Objective listening mistakes bypass the text grader. They must still
   // trigger exactly one enemy retaliation, even before a correct choice.
   const listenContext=await browser.newContext({viewport:{width:390,height:844},isMobile:engine==='webkit',hasTouch:true});
   const listenPage=await listenContext.newPage();
   await listenPage.goto(url,{waitUntil:'networkidle'});
   await listenPage.locator('[data-feature-worlds]').click();
   await listenPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});
   await listenPage.locator('#start-forest-tactics').click();
   await listenPage.locator('#forest-explore-continue').click();
   await listenPage.locator('.forest-attack-select [data-tactic-kind="listen"]').click();
   await listenPage.locator('.forest-tactic-strategy > summary').click();
   assert.equal(await listenPage.locator('#play-audio').count(),1,'Listening attack uses choice assessment');
   await listenPage.locator('#play-audio').click();
   assert.equal(await listenPage.locator('[data-tactic-kind="speak"]').isEnabled(),false,
     'A started listening attack cannot be swapped out after seeing its choices');
   const correctChoice=await listenPage.evaluate(async()=>{
     const {ALL_PROMPTS}=await import('./monster-data.js');
     const {listeningChallengeFor}=await import('./listening-challenges.js');
     const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
     return listeningChallengeFor(prompt).correctIndex;
   });
   const wrongChoice=(correctChoice+1)%3;
   const preListenMiss=Number(await listenPage.locator('#forest-party-hp').getAttribute('aria-valuenow'));
   await listenPage.locator(`[data-listening-choice="${wrongChoice}"]`).click();
   const afterListenMiss=Number(await listenPage.locator('#forest-party-hp').getAttribute('aria-valuenow'));
   assert.ok(afterListenMiss<preListenMiss,'Wrong listening choice immediately triggers enemy damage');
   assert.equal(await listenPage.locator('#forest-world-stage').getAttribute('data-cinematic'),'enemy');
   await listenPage.locator(`[data-listening-choice="${wrongChoice}"]`).click();
   assert.equal(Number(await listenPage.locator('#forest-party-hp').getAttribute('aria-valuenow')),afterListenMiss,
     'A second wrong choice cannot trigger duplicate enemy damage');
   await listenPage.locator(`[data-listening-choice="${correctChoice}"]`).click();
   await listenPage.locator('#next-question').waitFor({state:'visible'});
   await listenPage.locator('#next-question').click();
   assert.equal(Number(await listenPage.locator('#forest-party-hp').getAttribute('aria-valuenow')),afterListenMiss,
     'Correcting a listening miss does not cause another enemy hit');
   await listenContext.close();
   // A listening challenge on the ENEMY turn is an obligatory defensive
   // task. It must retaliate on an incorrect meaning, never on speech errors.
   const defenseContext=await browser.newContext({viewport:{width:375,height:844},isMobile:engine==='webkit',hasTouch:true});
   const defensePage=await defenseContext.newPage();
   await defensePage.addInitScript(()=>{Math.random=()=>.3;}); // Enemy's first planned skill is listening.
   await defensePage.goto(url,{waitUntil:'networkidle'});
   await defensePage.locator('[data-feature-worlds]').click();
   await defensePage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});
   await defensePage.locator('#start-forest-tactics').click();
   await defensePage.locator('#forest-explore-continue').click();
   await defensePage.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
   assert.match(await defensePage.locator('.forest-tactic-forecast').textContent(),/次の敵攻撃：リスニング/);
   await answer(defensePage);
   await defensePage.locator('#next-question').click();
   assert.equal(await defensePage.locator('#forest-tactics').getAttribute('data-turn'),'enemy');
   assert.equal(await defensePage.locator('#play-audio').count(),1,'The forced enemy listening defense uses audio choices');
   await defensePage.locator('#play-audio').click();
   const defenseCorrect=await defensePage.evaluate(async()=>{
     const {ALL_PROMPTS}=await import('./monster-data.js');
     const {listeningChallengeFor}=await import('./listening-challenges.js');
     const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
     return listeningChallengeFor(prompt).correctIndex;
   });
   const defenseWrong=(defenseCorrect+1)%3;
   const hpBeforeDefense=Number(await defensePage.locator('#forest-party-hp').getAttribute('aria-valuenow'));
   await defensePage.locator(`[data-listening-choice="${defenseWrong}"]`).click();
   const hpAfterDefense=Number(await defensePage.locator('#forest-party-hp').getAttribute('aria-valuenow'));
   assert.ok(hpAfterDefense<hpBeforeDefense,'Wrong forced listening defense must deal real enemy damage');
   await defensePage.locator(`[data-listening-choice="${defenseWrong}"]`).click();
   assert.equal(Number(await defensePage.locator('#forest-party-hp').getAttribute('aria-valuenow')),hpAfterDefense,
     'Wrong enemy listening defense cannot charge damage twice');
   await defensePage.locator(`[data-listening-choice="${defenseCorrect}"]`).click();
   await defensePage.locator('#next-question').click();
   assert.equal(Number(await defensePage.locator('#forest-party-hp').getAttribute('aria-valuenow')),hpAfterDefense,
     'Defensive correction must not cause an extra hit');
   await defenseContext.close();
   console.log(`${engine}: tactical battle, weakness, enemy turn, HP defense and mobile widths passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
