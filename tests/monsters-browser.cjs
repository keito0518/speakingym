const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
  const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  const shots=path.join(process.cwd(),'qa-screenshots');fs.mkdirSync(shots,{recursive:true});
  const pageErrors=[];
  const base=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
  const boot=async width=>{
    const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:engine==='webkit',hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage();
    page.on('pageerror',error=>{pageErrors.push(error.message);console.error('[monsters-pageerror]',error.message);});
    page.on('crash',()=>pageErrors.push('A mobile browser page crashed'));
    await page.addInitScript(()=>{
      Math.random=()=>.99;
      // Headless voices differ by OS. Verify the intended audio-first path
      // with a stable stand-in, and test the no-audio fallback separately.
      window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(){}}});
    });
    await page.goto(base,{waitUntil:'networkidle'});
    return {context,page};
  };
  const enterHomePanel=async(page,target)=>{
    if(await page.locator('#home-navigation').isVisible()){
      const tile=page.locator(`[data-home-page="${target}"]`);
      if(!await tile.isVisible())await page.locator('#home-extra-modes > summary').click();
      await tile.click();
    }
  };
  const leavePlay=async(page,{stay=false}={})=>{
    let prompt='';
    page.once('dialog',async dialog=>{
      prompt=dialog.message();
      if(stay)await dialog.dismiss();
      else await dialog.accept();
    });
    await page.locator('#leave-play').click();
    assert.match(prompt,/今の挑戦を中断してホームへ戻る/,'Unfinished practice must not vanish without confirmation');
  };
  const unlockListening=async page=>{
    if(!await page.locator('#play-audio').count())return;
    await page.locator('#play-audio').click();
    await page.locator('#listening-meaning').waitFor({state:'visible',timeout:12000});
    const correct=await page.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const {listeningChallengeFor}=await import('./listening-challenges.js');
      return listeningChallengeFor(ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)).correctIndex;
    });
    await page.locator(`[data-listening-choice="${correct}"]`).click();
  };
  try{
    // A privacy-restricted browser may throw on *reading* localStorage, not
    // merely on setItem. The adventure must remain playable in memory and
    // visibly warn that its progress cannot be stored.
    {
      const context=await browser.newContext({viewport:{width:375,height:844},hasTouch:true});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>{
        Object.defineProperty(window,'localStorage',{configurable:true,
          get(){throw new DOMException('Storage blocked','SecurityError');}});
      });
      await page.goto(base,{waitUntil:'networkidle'});
      assert.equal(await page.locator('#home-navigation').isVisible(),true);
      assert.equal(await page.locator('#save-warning-live').getAttribute('hidden'),null,
        'An unavailable storage getter must prepare an in-game backup warning');
      await page.locator('[data-feature-dungeon]').click();
      assert.equal(await page.locator('#play-view').isVisible(),true,
        'A blocked localStorage getter must not block the first adventure');
      assert.equal(await page.locator('#save-warning-live').isVisible(),true,
        'The backup warning must be visible once the full-screen dungeon opens');
      assert.deepEqual(errors,[],'The storage getter must not throw an uncaught browser error');
      await context.close();
    }
    // A game-minded player can pick a specific locked creature to hunt.
    // The chase remains after reload, without revealing its artwork or
    // obscuring the single beginner CTA before the first attempt.
    {
      const {context:huntContext,page:huntPage}=await boot(390);
      assert.equal(await huntPage.locator('#home-monster-hunt').isVisible(),false);
      await huntPage.evaluate(async()=>{
        const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
        const seeded={...createSave(),totalAnswers:1};
        localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
      });
      await huntPage.reload();
      assert.equal(await huntPage.locator('#home-monster-hunt').isVisible(),true);
      assert.match(await huntPage.locator('#hunt-next-chest').innerText(),/3 CHAIN/);
      assert.ok(await huntPage.locator('#hunt-target-select option').count()>20);
      await huntPage.locator('#hunt-target-select').selectOption('tokirin');
      assert.equal(await huntPage.locator('#hunt-target-select').inputValue(),'tokirin');
      assert.equal(await huntPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).huntTargetId),'tokirin');
      await huntPage.reload();
      assert.equal(await huntPage.locator('#hunt-target-select').inputValue(),'tokirin');
      assert.match(await huntPage.locator('#hunt-requirements').innerText(),/雪の街のボス/);
      assert.match(await huntPage.locator('#hunt-requirements').innerText(),/日を空けた復習/);
      assert.equal(await huntPage.locator('#home-monster-hunt img').count(),0,'Locked creatures use an honest silhouette');
      const huntWidth=await huntPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(huntWidth.scroll<=huntWidth.inner+1,`390px hunt must not cause horizontal overflow: ${JSON.stringify(huntWidth)}`);
      await huntContext.close();
    }
    // A future-version / damaged local save must not silently disappear when
    // the prototype opens. Preserve its exact bytes, offer a file download,
    // and keep recovery available after a second reload.
    {
      const {context:recoveryContext,page:recoveryPage}=await boot(390);
      const oldRaw=await recoveryPage.evaluate(async()=>{
        const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
        const data={...createSave(),version:2,xpWallet:980};
        const raw=JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY,raw);
        return raw;
      });
      await recoveryPage.reload();
      assert.equal(await recoveryPage.locator('#save-recovery-notice').isVisible(),true);
      assert.match(await recoveryPage.locator('#save-note').innerText(),/保護しました/);
      const archived=await recoveryPage.evaluate(()=>({
        current:localStorage.getItem('speakingym-monsters-prototype-v1'),
        saved:localStorage.getItem('speakingym-monsters-prototype-v1-unreadable-backup')
      }));
      assert.equal(archived.saved,oldRaw);
      assert.equal(JSON.parse(archived.current).version,1);
      const oldDownload=recoveryPage.waitForEvent('download');
      await recoveryPage.locator('#save-recovery-download').click();
      const recoveryFile=await oldDownload;
      assert.match(recoveryFile.suggestedFilename(),/speakingym-monsters-recovery-.*\.json/);
      assert.equal(fs.readFileSync(await recoveryFile.path(),'utf8'),oldRaw,
        'The recovery file must contain the exact incompatible original, not a fresh save');
      await recoveryPage.reload();
      assert.equal(await recoveryPage.locator('#save-recovery-notice').isVisible(),true,
        'A reload must not make the protected original unreachable');
      assert.equal(await recoveryPage.locator('#save-recovery-archive-download').isVisible(),false,
        'One protected save needs only its original recovery button');
      await recoveryPage.evaluate(async()=>{
        const {STORAGE_KEY}=await import('./monster-engine.js');
        localStorage.setItem(STORAGE_KEY,'{"version":3,"xpWallet":543}');
      });
      await recoveryPage.reload();
      assert.equal(await recoveryPage.locator('#save-recovery-reset').isVisible(),true);
      assert.match(await recoveryPage.locator('#save-note').innerText(),/自動上書きを止めています/);
      assert.match(await recoveryPage.locator('#save-recovery-description').innerText(),/2つのファイルを両方保存/);
      assert.match(await recoveryPage.locator('#save-download').innerText(),/このタブの新しい記録/);
      const currentBackup=recoveryPage.waitForEvent('download');
      await recoveryPage.locator('#save-recovery-download').click();
      assert.equal(fs.readFileSync(await (await currentBackup).path(),'utf8'),'{"version":3,"xpWallet":543}');
      const earlierBackup=recoveryPage.waitForEvent('download');
      await recoveryPage.locator('#save-recovery-archive-download').click();
      const earlierFile=await earlierBackup;
      assert.match(earlierFile.suggestedFilename(),/speakingym-monsters-earlier-recovery-.*\.json/);
      assert.equal(fs.readFileSync(await earlierFile.path(),'utf8'),oldRaw,
        'A conflicting earlier archive must stay independently downloadable');
      assert.equal(await recoveryPage.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1')),
        '{"version":3,"xpWallet":543}','Another old save cannot be overwritten without consent');
      recoveryPage.once('dialog',dialog=>dialog.dismiss());
      await recoveryPage.locator('#save-recovery-reset').click();
      assert.equal(await recoveryPage.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1')),
        '{"version":3,"xpWallet":543}','Dismissing reset must preserve the original');
      recoveryPage.once('dialog',dialog=>dialog.accept());
      await recoveryPage.locator('#save-recovery-reset').click();
      assert.equal(await recoveryPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).version),1);
      assert.match(await recoveryPage.locator('#save-download').innerText(),/セーブをファイルに保存/);
      await recoveryContext.close();
    }
    // Two tabs share localStorage but may carry different in-memory saves.
    // Never let the stale tab replace a newer level/XP or hide the warning
    // while the player is inside the full-screen dungeon.
    {
      const {context:tabsContext,page:staleTab}=await boot(375);
      const newestTab=await tabsContext.newPage();
      await newestTab.goto(base,{waitUntil:'networkidle'});
      await enterHomePanel(newestTab,'training');
      await staleTab.locator('[data-feature-dungeon]').click();
      await newestTab.locator('[data-difficulty="hard"]').click();
      await staleTab.locator('#save-warning-live').waitFor({state:'visible',timeout:6000});
      assert.match(await staleTab.locator('#save-warning-live').innerText(),/別のタブ/);
      const battleBackup=staleTab.waitForEvent('download');
      await staleTab.locator('#save-warning-download').click();
      const battleFile=JSON.parse(fs.readFileSync(await (await battleBackup).path(),'utf8'));
      assert.equal(battleFile.difficulty,'easy','A stale tab can export its in-memory save without abandoning the active battle');
      assert.equal(await staleTab.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).difficulty),'hard',
        'Emergency backup must never overwrite the newer save in a different tab');
      await leavePlay(staleTab);
      await enterHomePanel(staleTab,'training');
      await staleTab.locator('[data-difficulty="normal"]').click();
      assert.equal(await staleTab.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).difficulty),'hard',
        'The old tab must not overwrite newer difficulty/progress');
      await staleTab.locator('#save-transfer').evaluate(el=>{el.open=true;});
      assert.equal(await staleTab.locator('#save-conflict-notice').isVisible(),true);
      const oldDownload=staleTab.waitForEvent('download');
      await staleTab.locator('#save-download').click();
      const oldFile=JSON.parse(fs.readFileSync(await (await oldDownload).path(),'utf8'));
      assert.equal(oldFile.difficulty,'normal','Unsaved work in the older tab remains exportable');
      const latestDownload=staleTab.waitForEvent('download');
      await staleTab.locator('#save-conflict-latest-download').click();
      const latestFile=JSON.parse(fs.readFileSync(await (await latestDownload).path(),'utf8'));
      assert.equal(latestFile.difficulty,'hard','The newer tab’s save must be separately exportable');
      await staleTab.locator('#save-import').fill(JSON.stringify({...latestFile,xpWallet:999}));
      staleTab.once('dialog',dialog=>dialog.accept());
      await staleTab.locator('#save-import-button').click();
      assert.match(await staleTab.locator('#save-transfer-status').innerText(),/別のタブ/);
      assert.equal(await staleTab.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),0,
        'Even a confirmed import cannot erase an unseen newer save from the stale tab');
      await tabsContext.close();
    }
    // A growing roster remains discoverable, but undiscovered species must
    // not expose names, art or evolution spoilers before recruitment.
    {
      const {context:catalogContext,page:catalogPage}=await boot(390);
      await enterHomePanel(catalogPage,'collection');
      assert.match(await catalogPage.locator('#collection-progress').innerText(),/仲間 1 \/ 44体/);
      assert.equal(await catalogPage.locator('[data-open-monster]').count(),1,
        'The first visit shows recruited allies, not forty-three locked silhouettes');
      await catalogPage.locator('[data-catalog-filter="all"]').click();
      for(const id of ['namihana','michiru','sorella','kometta']){
        const entry=catalogPage.locator(`[data-open-monster="${id}"]`);
        assert.equal(await entry.count(),1,`The ${id} catalog entry must appear`);
        assert.match(await entry.innerText(),/？？？/);
        assert.doesNotMatch(await entry.innerText(),new RegExp(id,'i'));
        assert.equal(await entry.locator('[data-pixel-sprite]').count(),0);
        await entry.click();
        assert.equal(await catalogPage.locator('#detail-content .character-portrait').count(),1);
        assert.match(await catalogPage.locator('#detail-content').innerText(),/？？？.*未発見の仲間/s);
        assert.equal(await catalogPage.locator('#detail-content .evolution-path').count(),0);
        assert.equal(await catalogPage.locator('#detail-content [data-pixel-sprite]').count(),0);
        await catalogPage.locator('#detail-back').click();
      }
      await catalogContext.close();
    }
    // Four distinct skill buttons must really open the matching authored tasks
    // on a 320px device; only confirmed self-recall can enter the new stats.
    {
      const {context:skillContext,page:skillPage}=await boot(320);
      await enterHomePanel(skillPage,'progress');
      assert.equal(await skillPage.locator('#skill-growth-list .skill-growth-card').count(),4);
      assert.equal(await skillPage.locator('#skill-growth-list').isVisible(),true,'Skill dashboard belongs in Learning Records, not under the menu');
      assert.match(await skillPage.locator('[data-skill="speak"] .skill-growth-count').innerText(),/記録なし/);
      const screen=await skillPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(screen.scroll<=screen.inner+1,'320px skill progress cards must not overflow');
      for(const kind of ['speak','listen','vocab','grammar']){
        await skillPage.locator('[data-skill-start="'+kind+'"]').click();
        assert.equal(await skillPage.locator('#play-card').isVisible(),true);
        const actualKind=await skillPage.evaluate(async()=>{
          const {ALL_PROMPTS}=await import('./monster-data.js');
          return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)?.kind;
        });
        assert.equal(actualKind,kind,'Targeted drill must open the requested skill, not a random mode');
        if(kind==='speak'){
          const answer=await skillPage.evaluate(async()=>{
            const {ALL_PROMPTS}=await import('./monster-data.js');
            return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
          });
          await skillPage.locator('#spoken-answer').fill(answer);
          await skillPage.locator('#show-answer').click();
          const stats=await skillPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).skillAttempts);
          assert.equal(stats.speak.length,1);
          assert.equal(stats.speak[0].rating,'smooth');
          assert.equal(stats.listen.length+stats.vocab.length+stats.grammar.length,0);
        }
        await leavePlay(skillPage);
        await enterHomePanel(skillPage,'progress');
      }
      assert.match(await skillPage.locator('[data-skill="speak"] .skill-growth-count').innerText(),/自力で確認 1回/);
      await skillContext.close();
    }
    // With enough task-level evidence, the home quest enters the real
    // weakness drill without falsely creating due reviews, XP or AI grades.
    {
      const {context:focusContext,page:focusPage}=await boot(375);
      await focusPage.evaluate(async()=>{
        const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
        const {ALL_PROMPTS}=await import('./monster-data.js');
        const {appendSkillAttempt}=await import('./skill-progress.js');
        const questions=ALL_PROMPTS.filter(p=>p.kind==='grammar'&&!p.bossOnly&&(p.difficulty||'easy')==='easy');
        const saved=createSave();
        for(let n=0;n<6;n++)saved.skillAttempts=appendSkillAttempt(saved.skillAttempts,questions[n%2],'hint','2026-11-01');
        localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
      });
      await focusPage.reload();
      assert.match(await focusPage.locator('#home-next-quest-title').innerText(),/文法/);
      await focusPage.locator('#home-next-quest-button').click();
      assert.equal(await focusPage.locator('#play-view').isVisible(),true);
      const focusKind=await focusPage.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)?.kind;
      });
      assert.equal(focusKind,'grammar');
      await focusContext.close();
    }
    const {context:quickContext,page:quickPage}=await boot(390);
    assert.equal(await quickPage.locator('#home-next-quest').isVisible(),false,
      'A first-time player gets just one prominent adventure choice, not a competing lesson CTA');
    assert.match(await quickPage.locator('#home-feature-progress').textContent(),/最初の目的地「森の入口」/);
    await quickPage.locator('[data-feature-dungeon]').click();
    assert.equal(await quickPage.locator('#play-view').isVisible(),true,
      'Main CTA enters the actual adventure in one tap, bypassing the area catalogue');
    assert.equal(await quickPage.locator('#forest-explore-continue').isVisible(),true);
    assert.equal(await quickPage.locator('.forest-explore-depth .forest-depth-svg').getAttribute('preserveAspectRatio'),'xMidYMid slice',
      'Portrait exploration must fill the scenery behind the readable route map');
    await quickPage.locator('#forest-explore-continue').click();
    assert.equal(await quickPage.locator('.forest-attack-select').isVisible(),true,'Main adventure shows attack choices before any English question');
    assert.equal(await quickPage.locator('#play-card').isVisible(),false,'No arbitrary first question is revealed');
    await quickPage.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
    assert.equal(await quickPage.locator('#forest-world-stage').getAttribute('data-tactics'),'true',
      'The home screen main adventure button must enter the turn-based dungeon');
    assert.equal(await quickPage.locator('#forest-party-formation').isVisible(),false,
      'Home quick start never forces beginners through the formation screen');
    assert.equal(await quickPage.locator('#play-card').isVisible(),true,
      'The chosen attack reveals the first English prompt');
    const firstFight=await quickPage.evaluate(()=>({
      stage:document.querySelector('#forest-world-stage').getBoundingClientRect().height,
      answerTop:document.querySelector('#spoken-answer').getBoundingClientRect().top,
      actorTop:document.querySelector('#forest-party').getBoundingClientRect().top,
      actorBottom:document.querySelector('#forest-party').getBoundingClientRect().bottom,
      viewport:innerHeight,
      isFullScene:getComputedStyle(document.querySelector('#play-view')).position==='fixed',
      arenaOwnsAnswer:document.querySelector('#forest-world-stage').contains(document.querySelector('#spoken-answer')),
      bodyScroll:getComputedStyle(document.body).overflow
    }));
    assert.ok(firstFight.isFullScene&&firstFight.arenaOwnsAnswer&&
      firstFight.stage>firstFight.viewport*.55&&firstFight.answerTop<firstFight.viewport&&
      firstFight.actorTop>=0&&firstFight.actorBottom<firstFight.viewport,
      `Mobile first fight must show monsters AND answer in a single onscreen scene: ${JSON.stringify(firstFight)}`);
    assert.match(await quickPage.locator('#forest-world-stage').getAttribute('data-cinematic'),/^(opening|idle)$/,
      'The first-stage enemy scene is ready when the player chooses an attack');
    // Real iPhone in-app browsers can expose a much shorter visual viewport
    // than the 844px mobile emulator. The submit action must remain tappable
    // without scrolling the question panel, while the actors stay on screen.
    for(const height of [610,680,844]){
      await quickPage.setViewportSize({width:390,height});
      const layout=await quickPage.evaluate(()=>{
        const button=document.querySelector('#show-answer');
        const rect=button.getBoundingClientRect();
        const actor=document.querySelector('#forest-party').getBoundingClientRect();
        const question=document.querySelector('#play-card').getBoundingClientRect();
        const ally=document.querySelector('#forest-party-hp');
        const foeBar=document.querySelector('.forest-battle-info').getBoundingClientRect();
        const allyRect=ally.getBoundingClientRect();
        const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
        return {viewport:innerHeight,top:rect.top,bottom:rect.bottom,actorTop:actor.top,
          actorBottom:actor.bottom,questionTop:question.top,
          allyInHud:ally.parentElement.classList.contains('forest-battle-info'),
          allyClipped:!ally.hidden&&(allyRect.top<foeBar.top-1||allyRect.bottom>foeBar.bottom+1),
          position:getComputedStyle(button.closest('.learning-controls')).position,
          hitIsButton:button===hit||button.contains(hit)};
      });
      assert.ok(layout.position==='fixed'&&layout.hitIsButton&&layout.top>layout.actorBottom&&
        layout.bottom<=height-4&&layout.questionTop<height&&layout.actorTop>=0&&
        layout.allyInHud&&!layout.allyClipped,
      `iPhone ${height}px must show the live scene and tappable Submit without scrolling: ${JSON.stringify(layout)}`);
    }
    await quickPage.setViewportSize({width:390,height:680});
    const quickAnswer=await quickPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await quickPage.locator('#spoken-answer').fill(quickAnswer);
    await quickPage.locator('#show-answer').click();
    assert.match(await quickPage.locator('.forest-chain-result').innerText(),/1 CHAIN[\s\S]*コンボ開始！/,
      'The first independently verified battle answer should feel rewarding beside the answer');
    const quickPromptId=await quickPage.locator('#play-card').getAttribute('data-prompt-id');
    assert.match(await quickPage.locator('#feedback-bookmark').innerText(),/この問題を復習に保存/,
      'Learners can save a question immediately after a successful turn');
    await quickPage.locator('#feedback-bookmark').click();
    assert.equal(await quickPage.locator('#feedback-bookmark').getAttribute('aria-pressed'),'true');
    assert.equal(await quickPage.locator('#bookmark-question').getAttribute('aria-pressed'),'true');
    assert.ok((await quickPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).savedPromptIds)).includes(quickPromptId));
    await quickPage.locator('#feedback-bookmark').click();
    assert.equal(await quickPage.locator('#bookmark-question').getAttribute('aria-pressed'),'false');
    assert.ok(!(await quickPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).savedPromptIds)).includes(quickPromptId));
    const nextLayout=await quickPage.locator('#next-question').evaluate(button=>{
      const rect=button.getBoundingClientRect();
      const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
      return {viewport:innerHeight,bottom:rect.bottom,visible:rect.top>=0,
        hitIsButton:button===hit||button.contains(hit)};
    });
    assert.ok(nextLayout.visible&&nextLayout.hitIsButton&&nextLayout.bottom<=680-4&&nextLayout.bottom>=680-50,
      `The next-turn action must replace Submit in the visible action dock: ${JSON.stringify(nextLayout)}`);
    await quickContext.close();
    const {context:recommendedContext,page:recommendedPage}=await boot(375);
    await recommendedPage.evaluate(async()=>{
      const {createSave,recordAnswer,STORAGE_KEY}=await import('./monster-engine.js');
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const task=ALL_PROMPTS.find(prompt=>prompt.kind==='speak'&&!prompt.bossOnly);
      const learned=recordAnswer(createSave(),task.id,'hint');
      localStorage.setItem(STORAGE_KEY,JSON.stringify(learned.save));
    });
    await recommendedPage.reload();
    assert.equal(await recommendedPage.locator('#home-next-quest').isVisible(),true,
      'After an actual attempt, the personalized next-lesson CTA becomes available');
    await recommendedPage.locator('#home-next-quest-button').click();
    assert.match(await recommendedPage.locator('#play-mode-label').innerText(),/今日の5分ジム/,
      'The personalized home recommendation starts the named lesson in one tap');
    await recommendedContext.close();
    for(const width of [320,375,390,430]){
      const {context,page}=await boot(width);
      assert.equal(await page.getByRole('heading',{name:/英語で戦って/}).isVisible(),true);
      // Regression for actual iPhone screenshot: do NOT orphan the final 「へ。」
      // as a third line. Verify rendered line boxes, not just CSS declarations.
      const headingLines=await page.locator('.home-navigation-head h1 .home-title-phrase').evaluateAll(items=>items.map(el=>{
        const css=getComputedStyle(el),rect=el.getBoundingClientRect(),range=document.createRange();
        range.selectNodeContents(el);
        return {display:css.display,whiteSpace:css.whiteSpace,height:rect.height,lineHeight:parseFloat(css.lineHeight),
          text:el.textContent,renderedLines:range.getClientRects().length,overflow:el.scrollWidth>el.clientWidth+1};
      }));
      assert.deepEqual(headingLines.map(x=>x.text),['英語で戦って、','仲間と冒険へ。']);
      assert.ok(headingLines.every(x=>x.display==='block'&&x.whiteSpace==='nowrap'&&x.renderedLines===1&&!x.overflow&&x.height<=x.lineHeight+2),
        `${engine}/${width} unnatural Japanese wrapping: ${JSON.stringify(headingLines)}`);
      assert.equal(await page.locator('#hero-monster-name').innerText(),'Yolkie');
      assert.match(await page.locator('#hero-vocab').innerText(),/yolk/);
      assert.equal(await page.locator('#home-wallet').innerText(),'0');
      assert.equal(await page.locator('#review-mastery-meter').getAttribute('aria-valuenow'),'0');
      assert.match(await page.locator('#review-journal-list').innerText(),/今日の復習はありません/);
      const metrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(metrics.scroll<=metrics.inner+1,`${engine}/${width} horizontal overflow: ${JSON.stringify(metrics)}`);
      const credits=await page.getByRole('link',{name:'音声クレジット'}).getAttribute('href');
      assert.equal(credits,'./audio-credits.html');
      await page.screenshot({path:path.join(shots,`monsters-${engine}-${width}-home.png`),fullPage:true});
      await page.locator('[data-feature-worlds]').click();
      assert.equal(await page.locator('#dungeon-stage-list').getAttribute('open'),null,
        'Locked stages and chapter metadata start hidden');
      await page.locator('#dungeon-stage-list > summary').click();
      const dungeonLayout=await page.evaluate(()=>{
        const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
        return {banner:rect('.dungeon-selection-banner'),forest:rect('.dungeon-world-forest'),city:rect('.dungeon-world-city'),ruins:rect('.dungeon-world-ruins'),
          background:getComputedStyle(document.querySelector('.dungeon-selection')).backgroundColor,
          title:document.querySelector('#forest-invite-title').textContent,
          overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      assert.equal(dungeonLayout.title,'Englishダンジョン');
      assert.equal(dungeonLayout.background,'rgba(0, 0, 0, 0)','Dungeon does not wrap both worlds in another green card');
      assert.ok(dungeonLayout.banner.bottom<dungeonLayout.forest.top&&dungeonLayout.forest.bottom<dungeonLayout.city.top&&dungeonLayout.city.bottom<dungeonLayout.ruins.top,
        `${engine}/${width} standalone dungeon hero and world cards: ${JSON.stringify(dungeonLayout)}`);
      assert.equal(dungeonLayout.overflow,false,`${engine}/${width} dungeon world selection overflows horizontally`);
      assert.equal(await page.locator('.dungeon-world-card').count(),3);
      assert.equal(await page.locator('.dungeon-selection-banner .dungeon-world-card').count(),0);
      await page.screenshot({path:path.join(shots,`monsters-${engine}-${width}-world-select.png`),fullPage:true});
      await page.locator('#home-destination-forest .home-menu-back').click();
      await enterHomePanel(page,'training');
    await page.getByRole('button',{name:/スピーキングを始める/}).click();
      const playMetrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(playMetrics.scroll<=playMetrics.inner+1,`${engine}/${width} question horizontal overflow: ${JSON.stringify(playMetrics)}`);
      await page.screenshot({path:path.join(shots,`monsters-${engine}-${width}-question.png`),fullPage:true});
      await context.close();
    }
    // Longer-term progress is visible from home after independent next-day
    // recall. Before that milestone, avoid an empty, distracting status tile.
    for(const width of [320,390]){
      const {context:proofContext,page:proofPage}=await boot(width);
      assert.equal(await proofPage.locator('#home-learning-proof').isVisible(),false);
      await proofPage.evaluate(async()=>{
        const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
        const {ALL_PROMPTS}=await import('./monster-data.js');
        const prompt=ALL_PROMPTS.find(item=>item.kind==='speak'&&!item.bossOnly);
        localStorage.setItem(STORAGE_KEY,JSON.stringify({...createSave(),totalAnswers:4,
          retention:{[prompt.id]:{stage:4,lastDay:'2026-10-30',nextDay:'2026-11-13'}}}));
      });
      await proofPage.reload();
      assert.match(await proofPage.locator('#home-learning-proof').innerText(),/7日後もヒントなしで確認できた 1問/);
      assert.equal(await proofPage.locator('#home-learning-proof').isVisible(),true);
      const proofWidth=await proofPage.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}));
      assert.ok(proofWidth.content<=proofWidth.viewport+1,`${engine}/${width} proof button must fit mobile: ${JSON.stringify(proofWidth)}`);
      await proofPage.locator('#home-learning-proof').click();
      assert.equal(await proofPage.locator('#home-destination-review').isVisible(),true,
        'Learning evidence opens the existing real spaced-recall records, not a fake proficiency screen');
      await proofContext.close();
    }
    // The home is an actual menu, not eight stacked screens. Tutorial works on mobile.
    const {context:menuContext,page:menuPage}=await boot(390);
    assert.equal(await menuPage.locator('#home-navigation [data-home-page]').count(),11);
    assert.equal(await menuPage.locator('.home-main-actions [data-home-page]').count(),4,
      'Five-minute training, three-turn conversation, review and companions remain the main alternatives to adventure');
    assert.equal(await menuPage.locator('#home-extra-modes').getAttribute('open'),null);
    assert.equal(await menuPage.locator('[data-home-page="forest"]').isVisible(),false);
    await menuPage.locator('#home-extra-modes > summary').click();
    assert.equal(await menuPage.locator('[data-home-page="forest"]').isVisible(),true);
    assert.equal(await menuPage.locator('#home-menu-art svg').count(),1);
    assert.match(await menuPage.locator('.home-feature h2').innerText(),/English\s*ダンジョン/);
    assert.equal(await menuPage.locator('.home-navigation-head>p').count(),0,
      'A clear primary adventure button replaces introductory exposition');
    assert.equal(await menuPage.locator('[data-feature-dungeon]').isVisible(),true);
    assert.equal(await menuPage.locator('#home-feature-practice').isVisible(),true,'First-time visitors see a practice shortcut');
    assert.equal(await menuPage.locator('#home-navigation .home-walker').count(),1,'Only the one unlocked starter companion walks');
    assert.equal(await menuPage.locator('#toggle-simple-motion').getAttribute('aria-pressed'),'false');
    await menuPage.locator('#toggle-simple-motion').click();
    assert.equal(await menuPage.locator('#toggle-simple-motion').getAttribute('aria-pressed'),'true');
    assert.equal(await menuPage.locator('.home-walker').evaluate(el=>getComputedStyle(el).animationName),'none');
    await menuPage.reload();
    assert.equal(await menuPage.locator('#toggle-simple-motion').getAttribute('aria-pressed'),'true','Lightweight mode persists across reload');
    await menuPage.locator('#home-extra-modes > summary').click();
    await menuPage.locator('#toggle-simple-motion').click();
    assert.equal(await menuPage.locator('#toggle-simple-motion').getAttribute('aria-pressed'),'false');
    assert.equal(await menuPage.locator('.home-walker').getAttribute('aria-hidden'),'true');
    assert.equal(await menuPage.locator('.home-walker').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    assert.equal(await menuPage.locator('.home-walker').evaluate(el=>getComputedStyle(el).animationName),'none','Reduced motion setting stops movement');
    assert.equal(await menuPage.locator('[data-home-page="forest"] .home-navigation-icon svg').count(),1);
    const forestPlacement=await menuPage.locator('[data-home-page="forest"]').evaluate(el=>({
      gridColumn:getComputedStyle(el).gridColumnStart,
      inDisclosure:!!el.closest('#home-extra-modes')
    }));
    assert.deepEqual(forestPlacement,{gridColumn:'span 2',inDisclosure:true},
      'Optional stage selection can use a wider row inside the collapsed extra menu, not the main menu');
    assert.match(await menuPage.locator('.home-feature').innerText(),/English\s*ダンジョン/,
      'The adventure name and its main action carry the home card without extra copy');
    assert.equal(await menuPage.locator('#home-navigation').isVisible(),true);
    assert.equal(await menuPage.locator('.home-destination:visible').count(),0);
    await menuPage.locator('[data-home-page="tutorial"]').click();
    assert.equal(await menuPage.locator('#monsters-tutorial').isVisible(),true);
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/Englishダンジョン/);
    await menuPage.locator('#tutorial-next').click();
    await menuPage.locator('#tutorial-next').click();
    assert.match(await menuPage.locator('#tutorial-tips').innerText(),/iPhone/);
    assert.equal(await menuPage.locator('#tutorial-tips li').count(),2,'Every step explains a practical action');
    assert.match(await menuPage.locator('#tutorial-scene-main').innerText(),/話す \/ 文字入力/);
    await menuPage.locator('[data-tutorial-chapter="battle"]').click();
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/仲間を編成/);
    assert.equal(await menuPage.locator('[data-tutorial-chapter="battle"]').getAttribute('aria-pressed'),'true');
    await menuPage.locator('#tutorial-next').click();
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/英語で攻撃/);
    await menuPage.locator('[data-tutorial-chapter="growth"]').click();
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/育成と武器/);
    assert.match(await menuPage.locator('#tutorial-tips').innerText(),/自力正解3問以上/);
    assert.match(await menuPage.locator('#tutorial-counter').innerText(),/STEP 8 \/ 10/);
    await menuPage.locator('#tutorial-next').click();
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/狙う仲間と連勝宝箱/);
    assert.match(await menuPage.locator('#tutorial-counter').innerText(),/STEP 9 \/ 10/);
    await menuPage.locator('#tutorial-previous').click();
    await menuPage.locator('#tutorial-try-battle').click();
    assert.equal(await menuPage.locator('#monsters-tutorial').isVisible(),false,'Opening practice hides the guide but keeps its place');
    assert.equal(await menuPage.locator('#monsters-practice-battle').isVisible(),true);
    await menuPage.locator('#practice-battle-close').click();
    assert.equal(await menuPage.locator('#monsters-tutorial').isVisible(),true,'Closing a guide-initiated rehearsal returns to the guide');
    assert.match(await menuPage.locator('#tutorial-counter').innerText(),/STEP 8 \/ 10/,'Reopening the guide must not restart chapter navigation');
    await menuPage.locator('#tutorial-close').click();
    assert.equal(await menuPage.locator('#monsters-tutorial').isVisible(),false);
    await menuPage.locator('[data-home-page="forest"]').click();
    await menuPage.locator('#start-practice-battle').click();
    assert.equal(await menuPage.locator('#monsters-practice-battle').isVisible(),true);
    assert.match(await menuPage.locator('#practice-battle-progress').innerText(),/1 \/ 5/);
    assert.match(await menuPage.locator('#practice-battle-prompt').innerText(),/弱点.*単語/);
    await menuPage.locator('[data-practice-action="listen"]').click();
    assert.match(await menuPage.locator('#practice-battle-feedback').innerText(),/その種類でも攻撃できる/);
    assert.equal(await menuPage.locator('#practice-ally-hp').innerText(),'HP 4/4','Choosing a different skill is not a graded mistake');
    await menuPage.locator('[data-practice-action="vocab"]').click();
    assert.match(await menuPage.locator('#practice-battle-progress').innerText(),/2 \/ 5/);
    await menuPage.locator('[data-practice-action="forget"]').click();
    assert.equal(await menuPage.locator('#practice-ally-hp').innerText(),'HP 3/4','First confirmed miss triggers one enemy counter');
    assert.equal(await menuPage.locator('[data-practice-action="forget"]').isDisabled(),true,'An already-rejected choice cannot be tapped repeatedly');
    await menuPage.locator('[data-practice-action="invite"]').click();
    assert.equal(await menuPage.locator('#practice-ally-hp').innerText(),'HP 2/4','A different wrong choice, like real combat, triggers another counter');
    assert.equal(await menuPage.locator('[data-practice-action="invite"]').isDisabled(),true);
    await menuPage.locator('[data-practice-action="confirm"]').click();
    assert.match(await menuPage.locator('#practice-battle-prompt').innerText(),/敵が「文法」で攻撃/);
    await menuPage.locator('[data-practice-action="is"]').click();
    assert.equal(await menuPage.locator('#practice-ally-hp').innerText(),'HP 1/4','Failed enemy defense costs one HP');
    await menuPage.locator('[data-practice-action="am"]').click();
    assert.equal(await menuPage.locator('#practice-enemy-hp').innerText(),'HP 1/2','Successful defense does not damage the foe');
    await menuPage.locator('[data-practice-action="speak"]').click();
    await menuPage.locator('[data-practice-action="thanks"]').click();
    assert.match(await menuPage.locator('#practice-battle-title').innerText(),/クリア/);
    assert.equal(await menuPage.locator('#practice-enemy-hp').innerText(),'HP 0/2');
    const practiceSaveAfter=await menuPage.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1'));
    assert.ok(practiceSaveAfter,'Practice should leave the ordinary save in place');
    assert.match(await menuPage.locator('[data-practice-action="begin"]').innerText(),/本編の冒険を始める/);
    await menuPage.locator('[data-practice-action="begin"]').click();
    assert.equal(await menuPage.locator('#monsters-practice-battle').isVisible(),false);
    assert.equal(await menuPage.locator('#forest-explore-screen').isVisible(),true,
      'Beginner practice leads to the main story dungeon, not advanced tactics');
    assert.equal(await menuPage.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1')),practiceSaveAfter,
      'The practice must not award XP or change save data');
    await leavePlay(menuPage,{stay:true});
    assert.equal(await menuPage.locator('#play-view').isVisible(),true,'Canceling exit preserves the active adventure');
    await leavePlay(menuPage);
    await menuPage.locator('[data-feature-worlds]').click();
    assert.equal(await menuPage.locator('#forest-invite-title').isVisible(),true);
    assert.equal(await menuPage.locator('#forest-invite-title').textContent(),'Englishダンジョン');
    assert.equal(await menuPage.locator('.dungeon-now-badge').isVisible(),true);
    assert.match(await menuPage.locator('#dungeon-next-area').innerText(),/次の目的地/);
    assert.equal(await menuPage.locator('.dungeon-simple-steps li').count(),3,
      'The main dungeon route should be explained in three short steps');
    assert.equal(await menuPage.locator('#dungeon-other-modes').getAttribute('open'),null,'Optional modes start collapsed');
    assert.equal(await menuPage.locator('#start-forest-tactics').isVisible(),false,'Beginner sees only the main start action');
    assert.equal(await menuPage.locator('#start-forest').isVisible(),true,'Main adventure is immediately available');
    assert.equal(await menuPage.locator('#dungeon-stage-list').getAttribute('open'),null);
    await menuPage.locator('#dungeon-stage-list > summary').click();
    const startBeforeWorlds=await menuPage.evaluate(()=>document.querySelector('#start-forest').getBoundingClientRect().top < document.querySelector('#forest-area-list').getBoundingClientRect().top);
    assert.equal(startBeforeWorlds,true,'New players can start before reading eight area cards');
    await menuPage.locator('#dungeon-other-modes > summary').click();
    await menuPage.locator('[data-dungeon-level="normal"]').click();
    assert.equal(await menuPage.locator('[data-dungeon-level="normal"]').getAttribute('aria-pressed'),'true');
    assert.match(await menuPage.locator('#dungeon-next-goal').innerText(),/ふつうモード/);
    await menuPage.locator('[data-dungeon-level="easy"]').click();
    assert.equal(await menuPage.locator('[data-dungeon-level="easy"]').getAttribute('aria-pressed'),'true');
    assert.equal(await menuPage.locator('#start-forest').isVisible(),true);
    await menuPage.locator('#open-dungeon-tutorial').click();
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/Englishダンジョン/);
    await menuPage.locator('#tutorial-close').click();
    await menuPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    assert.equal(await menuPage.locator('#home-navigation').isVisible(),true);
    await menuPage.locator('[data-home-page="forest"]').click();
    assert.equal(await menuPage.locator('#forest-invite-title').isVisible(),true);
    await menuPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    await menuPage.locator('[data-home-page="listening"]').click();
    assert.match(await menuPage.locator('#play-mode-label').innerText(),/リスニング道場/);
    assert.equal(await menuPage.locator('#play-audio').count(),1);
    await unlockListening(menuPage);
    assert.equal(await menuPage.locator('#spoken-answer').isVisible(),false);
    assert.equal(await menuPage.locator('#next-question').isVisible(),true);
    await leavePlay(menuPage);
    await menuPage.locator('[data-home-page="training"]').click();
    await menuPage.locator('[data-start="speaking"]').click();
    assert.match(await menuPage.locator('#play-mode-label').innerText(),/スピーキング道場/);
    assert.equal(await menuPage.locator('#play-audio').count(),0);
    await leavePlay(menuPage);
    await menuPage.locator('[data-home-page="review"]').click();
    assert.equal(await menuPage.locator('#saved-review-title').isVisible(),true);
    assert.equal(await menuPage.locator('#review-journal-title').isVisible(),true);
    await menuContext.close();
    // The third world makes ten real chapters, not eight. Clearing the City
    // must continue into the Ruins instead of falsely celebrating completion.
    {
      const {context:progressContext,page:progressPage}=await boot(390);
      await enterHomePanel(progressPage,'forest');
      assert.equal(await progressPage.locator('#dungeon-total-areas strong').innerText(),'10');
      assert.equal(await progressPage.locator('#dungeon-total-areas').getAttribute('aria-label'),'全10エリアを順番に攻略');
      await progressPage.evaluate(async()=>{
        const {STORAGE_KEY}=await import('./monster-engine.js');
        const {FOREST_AREAS,CITY_AREAS}=await import('./forest-engine.js');
        const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
        saved.forest.completedAreas=[...FOREST_AREAS,...CITY_AREAS].map(area=>area.id);
        localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
      });
      await progressPage.reload();
      assert.match(await progressPage.locator('#home-feature-progress').textContent(),/8\/10 エリア攻略.*星屑の回廊/);
      assert.match(await progressPage.locator('[data-feature-dungeon]').innerText(),/つづきから冒険/);
      await enterHomePanel(progressPage,'forest');
      assert.match(await progressPage.locator('#dungeon-next-area').innerText(),/星屑の回廊/);
      await progressPage.evaluate(async()=>{
        const {STORAGE_KEY}=await import('./monster-engine.js');
        const {DUNGEON_AREAS}=await import('./forest-engine.js');
        const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
        saved.forest.completedAreas=DUNGEON_AREAS.map(area=>area.id);
        localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
      });
      await progressPage.reload();
      assert.match(await progressPage.locator('#home-feature-progress').textContent(),/全10エリア攻略/);
      assert.match(await progressPage.locator('[data-feature-dungeon]').innerText(),/もう一度冒険/);
      await progressContext.close();
    }
    // Retention mode is deliberately no-animation, honors completed review
    // dates and records a single companion bond for the spaced second day.
    const {context:recallContext,page:recallPage}=await boot(390);
    await recallPage.evaluate(()=>{
      const raw=JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1'));
      raw.retention={'think-cafe':{stage:1,lastDay:'2026-10-20',nextDay:'2026-10-21'}};
      raw.progress.think={attempts:1,smoothContexts:['think-cafe'],smoothDays:['2026-10-20'],lastDay:'2026-10-20',nextReviewDay:'2026-10-21',lastRating:'smooth'};
      localStorage.setItem('speakingym-monsters-prototype-v1',JSON.stringify(raw));
    });
    await recallPage.reload();
    await enterHomePanel(recallPage,'review');
    assert.equal(await recallPage.locator('#start-retention-review').isEnabled(),true);
    assert.match(await recallPage.locator('#retention-due-label').innerText(),/1問/);
    await recallPage.locator('#start-retention-review').click();
    assert.match(await recallPage.locator('#play-mode-label').innerText(),/定着チェック/);
    assert.equal(await recallPage.locator('#forest-journey').isVisible(),false);
    assert.equal(await recallPage.locator('#play-card').getAttribute('data-prompt-id'),'think-cafe');
    await recallPage.locator('#spoken-answer').fill('Let me think about it.');
    await recallPage.locator('#show-answer').click();
    assert.match(await recallPage.locator('.retention-result').innerText(),/翌日チェック達成/);
    assert.match(await recallPage.locator('.retention-result').innerText(),/仲間との絆/);
    await recallPage.locator('#next-question').click();
    const afterReview=await recallPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(afterReview.monsterBonds.medamago,1);
    assert.equal(afterReview.retention['think-cafe'].stage,2);
    await recallContext.close();
    // Daily five-minute workout stays calm, explains answers and records
    // completed offline work without a hard timer or a battle animation.
    const {context:gymContext,page:gymPage}=await boot(390);
    await enterHomePanel(gymPage,'daily');
    assert.equal(await gymPage.locator('#start-daily-gym').isVisible(),true);
    assert.match(await gymPage.locator('#daily-plan-status').innerText(),/8問/);
    await enterHomePanel(gymPage,'daily');
    await gymPage.locator('#start-daily-gym').click();
    assert.match(await gymPage.locator('#play-mode-label').innerText(),/今日の5分ジム/);
    assert.equal(await gymPage.locator('#play-view').evaluate(e=>e.classList.contains('review-only')),true);
    assert.equal(await gymPage.locator('#forest-journey').isVisible(),false);
    assert.equal(await gymPage.locator('#play-clock').innerText(),'5分目安 · 時間制限なし');
    const allDaily=[];
    for(let i=0;i<8;i++){
      const id=await gymPage.locator('#play-card').getAttribute('data-prompt-id');
      const listening=await gymPage.locator('#play-audio').count()>0;
      allDaily.push(id);
      const answer=await gymPage.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
      });
      if(i===0){
        await gymPage.locator('#bookmark-question').click();
        assert.equal(await gymPage.locator('#bookmark-question').getAttribute('aria-pressed'),'true');
      }
      if(listening)await unlockListening(gymPage);
      else{await gymPage.locator('#spoken-answer').fill(answer);await gymPage.locator('#show-answer').click();}
      assert.equal(await gymPage.locator('#next-question').isVisible(),true);
      const held=await gymPage.locator('#play-card').getAttribute('data-prompt-id');
      await gymPage.waitForTimeout(150);
      assert.equal(await gymPage.locator('#play-card').getAttribute('data-prompt-id'),held,'Explanation stays until next tap');
      await gymPage.locator('#next-question').click();
    }
    assert.equal(new Set(allDaily).size,8);
    assert.match(await gymPage.locator('#result-title').innerText(),/今日の5分ジム完了/);
    assert.match(await gymPage.locator('#result-rewards').innerText(),/ヒントなし正解率/);
    assert.match(await gymPage.locator('#result-rewards').innerText(),/今日のごほうび ＋12 G/);
    const gymSaved=await gymPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(gymSaved.dailyHistory.length,1);
    assert.equal(gymSaved.dailyHistory[0].total,8);
    assert.equal(gymSaved.dailyHistory[0].independent,8);
    assert.equal(gymSaved.coins,12,'Independent daily training awards earned-only gold');
    assert.equal(gymSaved.rewardedDays.filter(key=>key.startsWith('daily-gold:')).length,1);
    assert.equal(gymSaved.savedPromptIds.length,1);
    await gymPage.locator('#result-home').click();
    await enterHomePanel(gymPage,'daily');
    assert.match(await gymPage.locator('#daily-plan-status').innerText(),/ボーナス.*獲得済み/);
    assert.match(await gymPage.locator('#daily-last-rate').innerText(),/100%/);
    await gymContext.close();
    // Verify English-only task cards at both higher difficulties and narrow widths.
    for (const width of [320,375,390,430]) {
      const {context:levelContext,page:levelPage}=await boot(width);
      for (const difficulty of ['normal','hard']) {
        await enterHomePanel(levelPage,'training');
        await levelPage.locator(`[data-difficulty="${difficulty}"]`).click();
        assert.equal(await levelPage.locator(`[data-difficulty="${difficulty}"]`).getAttribute('aria-pressed'),'true');
        await levelPage.getByRole('button',{name:/スピーキングを始める/}).click();
        assert.match(await levelPage.locator('#play-card').innerText(),/英語 → 英語|リスニング/);
        if(await levelPage.locator('#play-audio').count()){
          assert.equal(await levelPage.locator('.task-panel').isVisible(),false,'Listening task text must start hidden');
          assert.equal(await levelPage.locator('#answer-area').isVisible(),false);
          await unlockListening(levelPage);
          assert.equal(await levelPage.locator('[data-listening-choice]').count(),difficulty==='hard'?4:3);
          assert.equal(await levelPage.locator('.task-panel').isVisible(),false,'Listening ends with understanding, without speaking');
          assert.equal(await levelPage.locator('#spoken-answer').isVisible(),false);
          assert.equal(await levelPage.locator('#next-question').isVisible(),true);
        }else assert.equal(await levelPage.locator('.task-panel').isVisible(),true);
        assert.equal(await levelPage.locator('#play-card h1').first().evaluate(el=>/[ぁ-んァ-ン一-龯]/.test(el.innerText)),false,'Advanced prompts stay in English, while navigation labels remain understandable in Japanese');
        const metrics=await levelPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
        assert.ok(metrics.scroll<=metrics.inner+1,`${engine}/${width} ${difficulty} overflow: ${JSON.stringify(metrics)}`);
        await levelPage.screenshot({path:path.join(shots,`monsters-${engine}-${width}-${difficulty}.png`),fullPage:true});
        await leavePlay(levelPage);
      }
      await levelContext.close();
    }
    const {context:hardContext,page:hardPage}=await boot(390);
    await enterHomePanel(hardPage,'training');
    await hardPage.locator('[data-difficulty="hard"]').click();
    await hardPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    await enterHomePanel(hardPage,'challenge');
    assert.match(await hardPage.locator('.question-top').innerText(),/1 \/ 3/);
    for(let i=0;i<3;i++){
      if(await hardPage.locator('#play-audio').count())await unlockListening(hardPage);
      else{
        await hardPage.locator('#spoken-answer').fill('I do not know yet.');
        await hardPage.locator('#show-answer').click();
        await hardPage.locator('#show-example').click();
      }
      await hardPage.locator('#next-question').click();
    }
    assert.equal(await hardPage.locator('#result-view').isVisible(),true);
    await hardPage.locator('#result-home').click();
    await hardPage.reload();
    assert.equal(await hardPage.locator('[data-difficulty="hard"]').getAttribute('aria-pressed'),'true');
    await hardContext.close();
    // Audio-first gate: guessing the meaning incorrectly cannot expose the
    // response or grant XP; a later successful reply is marked as hinted.
    const {context:listenContext,page:listenPage}=await boot(320);
    const auPath=await listenPage.evaluate(async()=>{
      const {LISTENING_AUDIO}=await import('./listening-audio-manifest.js');
      return LISTENING_AUDIO['recommend-gift'].src;
    });
    assert.match(auPath,/-au-[a-f0-9]{12}\.mp3$/);
    const auResponse=await listenPage.request.get(new URL(auPath,base).toString());
    assert.equal(auResponse.status(),200,'Australian accent audio must be served as a real MP3 file');
    // With the expanded speaking pool, the first random practice prompt is
    // no longer guaranteed to be listening. Seed one due listening review so
    // this test reliably exercises the audio-first gate, not shuffle order.
    await listenPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();
      seeded.reviewPrompts['late-call']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await listenPage.reload();
    await enterHomePanel(listenPage,'listening');
    assert.equal(await listenPage.locator('#play-card').getAttribute('data-prompt-id'),'late-call');
    assert.equal(await listenPage.locator('#answer-area').isVisible(),false);
    assert.equal(await listenPage.locator('#listening-response').isVisible(),false);
    const audioRecovery=listenPage.locator('.listening-fallback-options');
    assert.equal(await audioRecovery.evaluate(el=>el.open),false,
      'Audio troubleshooting must not obscure the initial listening task');
    assert.equal(await listenPage.locator('#listening-native-audio').isVisible(),false);
    await audioRecovery.locator('summary').click();
    assert.equal(await listenPage.locator('#listening-native-audio').isVisible(),true,
      'Direct native player remains reachable when audio is unavailable');
    assert.equal(await listenPage.locator('#reveal-transcript').isVisible(),true,
      'Transcript fallback remains available, but counts as a hint');
    await audioRecovery.locator('summary').click();
    const realAudio=listenPage.waitForResponse(response=>
      /\/audio\/listening\/late-call-[a-f0-9]{12}\.mp3$/.test(response.url())&&response.status()===200,
    {timeout:15000});
    await listenPage.locator('#play-audio').click();
    await realAudio;
    await listenPage.locator('#listening-meaning').waitFor({state:'visible',timeout:12000});
    assert.match(await listenPage.locator('#listening-status').innerText(),/再生できた/,
      'Audio loading alone must not unlock listening without playback starting');
    assert.equal(await listenPage.locator('[data-listening-choice]').count(),3);
    // Switching apps mid-clip must stop audio and close the unverified answer
    // choices. A late media "playing" callback while hidden cannot reopen them.
    await listenPage.evaluate(()=>{
      const audio=document.querySelector('#listening-native-audio');
      Object.defineProperty(audio,'paused',{configurable:true,value:false});
      Object.defineProperty(audio,'ended',{configurable:true,value:false});
      Object.defineProperty(document,'hidden',{configurable:true,value:true});
      document.dispatchEvent(new Event('visibilitychange'));
      audio.dispatchEvent(new Event('playing'));
    });
    assert.equal(await listenPage.locator('#listening-meaning').isVisible(),false,
      'Interrupted playback must not count as a completed listening opportunity');
    assert.equal(await listenPage.locator('#play-slow-audio').isVisible(),false);
    assert.match(await listenPage.locator('#listening-status').innerText(),/途中で中断/);
    assert.equal(await listenPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),0);
    await listenPage.evaluate(()=>{
      const audio=document.querySelector('#listening-native-audio');
      delete audio.paused;delete audio.ended;delete document.hidden;
    });
    await listenPage.locator('#play-audio').click();
    await listenPage.locator('#listening-meaning').waitFor({state:'visible',timeout:12000});
    // When a learner switches between the native iPhone audio controls and
    // the main replay button, playback must restart from the first word.
    // A direct native playback is not stored in spokenAudio, so this caught
    // a real path where the main button resumed from a stale offset.
    await listenPage.evaluate(()=>{
      const native=document.querySelector('#listening-native-audio');
      native.pause();
      native.onended?.();
      native.currentTime=1;
      const originalPlay=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(...args){
        window.__listeningReplayStart=this.currentTime;
        return originalPlay.apply(this,args);
      };
    });
    await listenPage.locator('#play-audio').click();
    const restartedAt=await listenPage.evaluate(()=>window.__listeningReplayStart);
    assert.ok(restartedAt<.2,`Listening replay must restart from zero, not ${restartedAt}s`);
    const listened=await listenPage.evaluate(async()=>{
      const {listeningChallengeFor}=await import('./listening-challenges.js');
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
      return {correct:listeningChallengeFor(prompt).correctIndex,answer:prompt.answer};
    });
    await listenPage.locator(`[data-listening-choice="${(listened.correct+1)%3}"]`).click();
    assert.equal(await listenPage.locator('#answer-area').isVisible(),false);
    assert.match(await listenPage.locator('#listening-status').innerText(),/もう一度聞いて/);
    assert.equal(await listenPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),0);
    await listenPage.locator(`[data-listening-choice="${listened.correct}"]`).click();
    assert.equal(await listenPage.locator('#answer-area').isVisible(),true);
    assert.equal(await listenPage.locator('#spoken-answer').isVisible(),false,'Listening never asks for microphone/typing');
    assert.equal(await listenPage.locator('#transcript').isVisible(),true,'Reveal actual clip transcript as feedback');
    assert.match(await listenPage.locator('#feedback-panel').innerText(),/\+8 XP/);
    assert.equal(await listenPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),8);
    await listenContext.close();
    // Detailed hard listening must remain usable on a narrow iPhone screen.
    // A secondary true fact used to be an incorrect option in this clip.
    const {context:detailContext,page:detailPage}=await boot(320);
    await detailPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();seeded.difficulty='hard';
      seeded.reviewPrompts['recommend-food-hard']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await detailPage.reload();
    await enterHomePanel(detailPage,'listening');
    assert.equal(await detailPage.locator('#play-card').getAttribute('data-prompt-id'),'recommend-food-hard');
    await detailPage.locator('#play-audio').click();
    await detailPage.locator('#listening-meaning').waitFor({state:'visible',timeout:12000});
    assert.equal(await detailPage.locator('[data-listening-choice]').count(),4);
    assert.equal(await detailPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const {listeningChallengeFor}=await import('./listening-challenges.js');
      const challenge=listeningChallengeFor(ALL_PROMPTS.find(p=>p.id==='recommend-food-hard'));
      return challenge.options[challenge.correctIndex].includes('forty minutes');
    }),true,'Advanced listening must ask about the actual forty-minute closing detail');
    assert.ok(await detailPage.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=1,
      'Long, meaningful listening options must wrap without horizontal scrolling at 320px');
    assert.equal(await detailPage.locator('#listening-coach').isVisible(),false,
      'The retry focus must be hidden until the learner makes a mistake');
    const detailCorrect=await detailPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const {listeningChallengeFor}=await import('./listening-challenges.js');
      return listeningChallengeFor(ALL_PROMPTS.find(p=>p.id==='recommend-food-hard')).correctIndex;
    });
    await detailPage.locator(`[data-listening-choice="${(detailCorrect+1)%4}"]`).click();
    assert.match(await detailPage.locator('#listening-coach').innerText(),/厨房が閉まるまでの時間/,
      'A wrong hard answer should show a targeted listening focus');
    assert.equal(await detailPage.locator('#transcript').isVisible(),false,
      'A retry cue must never reveal the hidden audio transcript');
    await detailPage.locator(`[data-listening-choice="${detailCorrect}"]`).click();
    await detailPage.locator('.listening-evidence-note').waitFor({state:'visible',timeout:5000});
    assert.match(await detailPage.locator('.listening-evidence-note').innerText(),/kitchen will close in about forty minutes/,
      'After success, show a quote that really occurs in the audio');
    assert.equal(await detailPage.locator('#listening-coach').isVisible(),false);
    await detailContext.close();
    // A tap with blocked media must never be recorded as successful listening.
    const {context:blockedContext,page:blockedPage}=await boot(375);
    await blockedPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();seeded.reviewPrompts['late-call']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await blockedPage.reload();
    await enterHomePanel(blockedPage,'listening');
    assert.equal(await blockedPage.locator('#listening-native-audio').getAttribute('controls'),'');
    assert.equal(await blockedPage.locator('#listening-meaning').isVisible(),false);
    await blockedPage.evaluate(()=>{
      HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('Playback blocked'));
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:null});
    });
    await blockedPage.locator('#play-audio').click();
    await blockedPage.locator('#transcript').waitFor({state:'visible',timeout:8000});
    assert.match(await blockedPage.locator('#listening-status').innerText(),/再生できなかった/);
    assert.equal(await blockedPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),0);
    const beforeSubtitled=await blockedPage.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1'));
    const blockedCorrect=await blockedPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const {listeningChallengeFor}=await import('./listening-challenges.js');
      return listeningChallengeFor(ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)).correctIndex;
    });
    await blockedPage.locator(`[data-listening-choice="${blockedCorrect}"]`).click();
    assert.match(await blockedPage.locator('#feedback-panel').innerText(),/字幕で意味を復習したよ！ \+0 XP/);
    assert.equal(await blockedPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),0,
      'Subtitled fallback is practice only; no listening XP without audio');
    assert.equal(await blockedPage.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1')),beforeSubtitled,
      'Reading a transcript cannot change spaced recall or earned progress');
    await blockedContext.close();
    // Safari may throw from HTMLMediaElement.play() synchronously rather than
    // reject a Promise. Clean up the native player before falling back.
    const {context:throwContext,page:throwPage}=await boot(375);
    await throwPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();seeded.reviewPrompts['late-call']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await throwPage.reload();
    await enterHomePanel(throwPage,'listening');
    await throwPage.evaluate(()=>{
      window.__pauseCount=0;
      const originalPause=HTMLMediaElement.prototype.pause;
      HTMLMediaElement.prototype.pause=function(){window.__pauseCount++;return originalPause.call(this);};
      HTMLMediaElement.prototype.play=()=>{throw new Error('Synchronous playback blocked');};
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:null});
    });
    const beforeThrowPause=await throwPage.evaluate(()=>window.__pauseCount);
    await throwPage.locator('#play-audio').click();
    await throwPage.locator('#transcript').waitFor({state:'visible',timeout:8000});
    assert.match(await throwPage.locator('#listening-status').innerText(),/再生できなかった/);
    assert.ok(await throwPage.evaluate(()=>window.__pauseCount)>beforeThrowPause+1,
      'Synchronous play() errors must pause the failed native player in the fallback cleanup');
    await throwContext.close();
    // Previously uncertain answers are surfaced again in a later practice run.
    const {context:reviewContext,page:reviewPage}=await boot(390);
    await reviewPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();
      seeded.reviewPrompts['help-bag']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await reviewPage.reload();
    assert.equal(await reviewPage.locator('#review-due-count').innerText(),'1');
    assert.match(await reviewPage.locator('#review-journal-list').innerText(),/助けを求める/);
    await enterHomePanel(reviewPage,'review');
    await reviewPage.locator('#start-review-practice').click();
    assert.equal(await reviewPage.locator('#play-card').getAttribute('data-prompt-id'),'help-bag');
    assert.match(await reviewPage.locator('#speech-helper').innerText(),/復習問題/);
    await reviewPage.locator('#spoken-answer').fill('I do not know what to say here.');
    await reviewPage.locator('#show-answer').click();
    const queued=await reviewPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(queued.xpWallet,0);
    assert.equal(queued.reviewPrompts['help-bag'],'2020-01-01');
    await reviewContext.close();
    // A natural request with a different verb must earn the same XP on mobile
    // and show the alternate-meaning note (article omissions have their own
    // dedicated coaching message, covered by the unit tests).
    {
      const {context:variantContext,page:variantPage}=await boot(375);
      await variantPage.evaluate(async()=>{
        const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
        const seeded=createSave();
        seeded.reviewPrompts['prefer-window-easy']='2020-01-01';
        localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
      });
      await variantPage.reload();
      await enterHomePanel(variantPage,'review');
      await variantPage.locator('#start-review-practice').click();
      assert.equal(await variantPage.locator('#play-card').getAttribute('data-prompt-id'),'prefer-window-easy');
      await variantPage.locator('#spoken-answer').fill('May I have a window seat, please?');
      await variantPage.locator('#show-answer').click();
      assert.match(await variantPage.locator('#feedback-panel').innerText(),/その言い方でもOK！/);
      assert.match(await variantPage.locator('#feedback-panel').innerText(),/\+16 XP/);
      assert.equal(await variantPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),16);
      await variantContext.close();
    }
    // A real due 3-day checkpoint must precede a DIFFERENT real-world use
    // of the same expression. No RPG animation, extra speech requirement or
    // false progression from merely opening the plan.
    {
    const {context:recallContext,page:recallPage}=await boot(320);
    const dueId='think-cafe';
    await recallPage.evaluate(async id=>{
      const {createSave,recordAnswer,STORAGE_KEY,dayKey,addDays}=await import('./monster-engine.js');
      const today=dayKey();
      let seeded=recordAnswer(createSave(),id,'smooth',addDays(today,-4)).save;
      seeded=recordAnswer(seeded,id,'smooth',addDays(today,-3)).save;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    },dueId);
    await recallPage.reload();
    await enterHomePanel(recallPage,'review');
    assert.match(await recallPage.locator('#retention-due-label').innerText(),/1問/);
    assert.match(await recallPage.locator('#retention-transfer-label').innerText(),/1問/);
    await recallPage.locator('#start-retention-review').click();
    assert.equal(await recallPage.locator('#play-card').getAttribute('data-prompt-id'),dueId);
    assert.match(await recallPage.locator('.daily-question-kind').innerText(),/3日後のチェック/);
    assert.match(await recallPage.locator('#retention-day1-label').innerText(),/1問/);
    assert.match(await recallPage.locator('#retention-day3-label').innerText(),/0問/);
    assert.equal(await recallPage.locator('#forest-journey').isVisible(),false);
    let answer=await recallPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await recallPage.locator('#spoken-answer').fill(answer);
    await recallPage.locator('#show-answer').click();
    await recallPage.locator('#next-question').click();
    const transferId=await recallPage.locator('#play-card').getAttribute('data-prompt-id');
    assert.notEqual(transferId,dueId);
    assert.match(await recallPage.locator('.daily-question-kind').innerText(),/別の場面で応用/);
    const recallMetrics=await recallPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(recallMetrics.scroll<=recallMetrics.inner+1,`320px retention overflow: ${JSON.stringify(recallMetrics)}`);
    answer=await recallPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await recallPage.locator('#spoken-answer').fill(answer);
    await recallPage.locator('#show-answer').click();
    const recallSaved=await recallPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(recallSaved.retention[dueId].stage,3);
    assert.equal(recallSaved.retention[transferId].stage,1,'New scene has its own spaced schedule');
    await recallPage.locator('#next-question').click();
    assert.match(await recallPage.locator('#result-title').innerText(),/定着チェック完了/);
    assert.match(await recallPage.locator('#result-retention-summary').innerText(),/自力で確認 1\/1問/);
    assert.match(await recallPage.locator('#result-retention-summary').innerText(),/3日後 1問/);
    assert.match(await recallPage.locator('#result-retention-summary').innerText(),/未確認の復習 0問/);
    await recallContext.close();
    }
    // A recognisable speaking word-order mistake gives a reason without
    // declaring all unfamiliar wording wrong or awarding full unhinted XP.
    const {context:coachContext,page:coachPage}=await boot(390);
    await coachPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();
      seeded.reviewPrompts['late-traffic-easy']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await coachPage.reload();
    await enterHomePanel(coachPage,'training');
    await coachPage.getByRole('button',{name:/スピーキングを始める/}).click();
    assert.equal(await coachPage.locator('#play-card').getAttribute('data-prompt-id'),'late-traffic-easy');
    await coachPage.locator('#spoken-answer').fill("I'll be late five minutes.");
    await coachPage.locator('#show-answer').click();
    assert.match(await coachPage.locator('#feedback-panel').innerText(),/five minutes late/);
    assert.match(await coachPage.locator('#feedback-panel').innerText(),/ヒントありXP/);
    await coachPage.locator('#spoken-answer').fill('I will be 5 minutes late.');
    await coachPage.locator('#show-answer').click();
    assert.match(await coachPage.locator('#feedback-panel').innerText(),/\+8 XP/);
    await coachContext.close();
    // Missed objective answers remain visible at home and return as a specific
    // vocabulary battle instead of becoming a generic speaking review.
    const {context:weakContext,page:weakPage}=await boot(320);
    await weakPage.evaluate(async()=>{
      const {createSave,recordAnswer,STORAGE_KEY}=await import('./monster-engine.js');
      localStorage.setItem(STORAGE_KEY,JSON.stringify(recordAnswer(createSave(),'forest-vocab-ticket-easy','again').save));
    });
    await weakPage.reload();
    assert.match(await weakPage.locator('#forest-weakness-summary').innerText(),/苦手の復習 1問/);
    await enterHomePanel(weakPage,'forest');
    await weakPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await weakPage.locator('#start-forest-simple').click();
    await weakPage.locator('#forest-explore-continue').click();
    const firstAnswer=await weakPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await weakPage.locator('#spoken-answer').fill(firstAnswer);
    await weakPage.locator('#show-answer').click();
    await weakPage.locator('#next-question').click();
    assert.equal(await weakPage.locator('[data-forest-route]').count(),0,'Routes are automatic');
    await unlockListening(weakPage);
    assert.equal(await weakPage.locator('#spoken-answer').isVisible(),false);
    await weakPage.locator('#next-question').click();
    if(await weakPage.locator('#forest-explore-screen').isVisible())await weakPage.locator('#forest-explore-continue').click();
    assert.equal(await weakPage.locator('#play-card').getAttribute('data-prompt-id'),'forest-vocab-ticket-easy');
    assert.match(await weakPage.locator('.question-tag').innerText(),/単語を選ぶ/,'Skill labels must tell Japanese beginners what to do');
    assert.match(await weakPage.locator('.forest-quiz-guide').innerText(),/空欄に合う単語/,'Vocab hints must not claim to exploit a non-vocab enemy weakness');
    assert.doesNotMatch(await weakPage.locator('#play-card').innerText(),/弱点を見つけよう/,'Skill questions must not promise automatic weakness damage');
    assert.match(await weakPage.locator('.forest-review-banner').innerText(),/苦手の再挑戦/);
    await weakPage.locator('#spoken-answer').fill('wrong vocabulary word');
    await weakPage.locator('#show-answer').click();
    assert.equal(await weakPage.locator('#feedback-bookmark').isVisible(),true,
      'A missed objective question can be saved at the point where feedback is shown');
    await weakPage.locator('#feedback-bookmark').click();
    assert.equal(await weakPage.locator('#bookmark-question').getAttribute('aria-pressed'),'true');
    assert.match(await weakPage.locator('.forest-teaching-nudge').innerText(),/考え方のヒント/);
    const afterMiss=await weakPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).quizProgress['forest-vocab-ticket-easy'].misses);
    assert.equal(afterMiss,2);
    await weakPage.locator('#show-example').click();
    assert.match(await weakPage.locator('.forest-teaching-title').innerText(),/なぜこの単語を使う/);
    assert.match(await weakPage.locator('.forest-teaching-transfer').innerText(),/別の場面でも使おう/);
    const afterReveal=await weakPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).quizProgress['forest-vocab-ticket-easy'].misses);
    assert.equal(afterReveal,afterMiss,'Revealing an answer must not double-count the same wrong tap');
    await weakContext.close();
    // A natural-sounding but locally unverified reply must not trap learners
    // in the forest. They may choose a non-rewarded practice route instead.
    const {context:practiceContext,page:practicePage}=await boot(390);
    await enterHomePanel(practicePage,'forest');
    await practicePage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await practicePage.locator('#start-forest-simple').click();
    await practicePage.locator('#forest-explore-continue').click();
    const recordedPrompt=await practicePage.locator('#play-card').getAttribute('data-prompt-id');
    await practicePage.locator('#bookmark-question').click();
    assert.equal(await practicePage.locator('#bookmark-question').getAttribute('aria-pressed'),'true');
    await practicePage.locator('#spoken-answer').fill('I would like some extra seconds to make my decision.');
    await practicePage.locator('#show-answer').click();
    assert.match(await practicePage.locator('#feedback-panel').innerText(),/判定保留/);
    assert.equal(await practicePage.locator('#continue-as-practice').isVisible(),true);
    const practiceXp=await practicePage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet);
    await practicePage.locator('#continue-as-practice').click();
    assert.match(await practicePage.locator('.question-top').innerText(),/ENCOUNTER 2/,'Opt-in practice continues directly without a story choice');
    assert.equal(await practicePage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),practiceXp,'No XP for unverified expression');
    await leavePlay(practicePage);
    await enterHomePanel(practicePage,'review');
    assert.match(await practicePage.locator('#start-saved-review').innerText(),/1問/);
    assert.match(await practicePage.locator('#saved-question-list').innerText(),/森|カフェ|待ち合わせ|旅行|英語|聞/);
    await enterHomePanel(practicePage,'review');
    await practicePage.locator('#start-saved-review').click();
    assert.equal(await practicePage.locator('#play-card').getAttribute('data-prompt-id'),recordedPrompt);
    assert.equal(await practicePage.locator('#forest-journey').isVisible(),false,'Saved review must have no RPG battles');
    assert.equal(await practicePage.locator('#play-view').evaluate(el=>el.classList.contains('review-only')),true);
    await leavePlay(practicePage);
    await practiceContext.close();
    // Bookmarked review should separate genuine self-recall from revealed
    // examples and offer one-tap retry for only the unfinished expression.
    {
      const {context:savedContext,page:savedPage}=await boot(320);
      await savedPage.evaluate(async()=>{
        const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
        const save=createSave();
        save.savedPromptIds=['forest-vocab-ticket-easy','forest-vocab-order-easy'];
        localStorage.setItem(STORAGE_KEY,JSON.stringify(save));
      });
      await savedPage.reload();
      await enterHomePanel(savedPage,'review');
      await savedPage.locator('#start-saved-review').click();
      const firstId=await savedPage.locator('#play-card').getAttribute('data-prompt-id');
      const firstAnswer=await savedPage.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(item=>item.id===document.querySelector('#play-card').dataset.promptId).answer;
      });
      await savedPage.locator('#spoken-answer').fill(firstAnswer);
      await savedPage.locator('#show-answer').click();
      await savedPage.locator('#next-question').click();
      const skippedId=await savedPage.locator('#play-card').getAttribute('data-prompt-id');
      assert.notEqual(skippedId,firstId);
      await savedPage.locator('#spoken-answer').fill('incorrect answer');
      await savedPage.locator('#show-answer').click();
      await savedPage.locator('#show-example').click();
      await savedPage.locator('#next-question').click();
      assert.match(await savedPage.locator('#result-title').innerText(),/保存した英語を復習/);
      assert.match(await savedPage.locator('#result-saved-review').innerText(),/自力で確認 1 \/ 2問/);
      assert.match(await savedPage.locator('#result-saved-review').innerText(),/例文・字幕で確認 1問/);
      assert.match(await savedPage.locator('#result-saved-review').innerText(),/次に同じ問題を復習すると/);
      assert.match(await savedPage.locator('#retry-saved-weak').innerText(),/1問/);
      const ratio=await savedPage.locator('.saved-review-meter').getAttribute('aria-valuenow');
      assert.equal(ratio,'50');
      assert.equal(await savedPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
        '320px review result should fit without horizontal scrolling');
      await savedPage.locator('#retry-saved-weak').click();
      assert.equal(await savedPage.locator('#play-card').getAttribute('data-prompt-id'),skippedId,
        'Only the unresolved saved task should return for practice');
      const retryAnswer=await savedPage.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(item=>item.id===document.querySelector('#play-card').dataset.promptId).answer;
      });
      await savedPage.locator('#spoken-answer').fill(retryAnswer);
      await savedPage.locator('#show-answer').click();
      await savedPage.locator('#next-question').click();
      assert.match(await savedPage.locator('#result-saved-review').innerText(),/全問、自力で確認/);
      assert.match(await savedPage.locator('#result-saved-review').innerText(),/今日の再挑戦で、自力でできるようになった 1問/);
      assert.equal(await savedPage.locator('#retry-saved-weak').count(),0);
      const savedHistory=await savedPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).savedReviewHistory);
      assert.equal(savedHistory[skippedId].outcome,'independent');
      assert.equal(savedHistory[firstId].outcome,'independent');
      assert.equal(JSON.stringify(savedHistory).includes(firstAnswer),false,'Do not save learner English or examples in recall history');
      await savedPage.reload();
      assert.deepEqual(await savedPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).savedReviewHistory),savedHistory);
      await savedContext.close();
    }
    // Full 5-mob + 3-hit-boss adventure on responsive viewports.
    for(const width of [320,375,390,430]){
      const {context:forestContext,page:forestPage}=await boot(width);
      await enterHomePanel(forestPage,'forest');
    await forestPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await forestPage.locator('#start-forest-simple').click();
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),true);
      assert.equal(await forestPage.locator('#forest-journey').isVisible(),false);
      assert.equal(await forestPage.locator('#forest-explore-art > svg').count(),1);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-explore.png`),fullPage:true});
      // Start from the page top without Playwright's auto-scroll. The game
      // must not drag a learner down to the answer box on encounter entry.
      await forestPage.evaluate(()=>{
        window.scrollTo({top:0,behavior:'instant'});
        document.querySelector('#forest-explore-continue').click();
      });
      await forestPage.waitForTimeout(80);
      assert.ok((await forestPage.evaluate(()=>window.scrollY))<=2,
        `${engine}/${width}: a new encounter must not force downward scrolling`);
      assert.equal(await forestPage.locator('#forest-journey').isVisible(),true);
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),false);
      assert.equal(await forestPage.locator('.forest-battle-shell #play-card').count(),1);
      assert.equal(await forestPage.locator('.forest-battle-shell #answer-area').count(),1);
      assert.equal(await forestPage.locator('.forest-battle-shell #forest-battle-log').count(),1);
      assert.match(await forestPage.locator('#forest-companion-name').innerText(),/Yolkie/);
      assert.equal(await forestPage.locator('#forest-world-backdrop .battle-arena-svg').count(),1);
      assert.equal(await forestPage.locator('#forest-world-stage .forest-world-svg').count(),0);
      assert.equal(await forestPage.locator('#forest-world-stage [data-landmark]').count(),0);
      assert.equal(await forestPage.locator('#forest-enemy svg').count(),1);
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-route'),'sunlit');
      assert.match(await forestPage.locator('#forest-foe-name').innerText(),/Mossling/);
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-foe'),'mossling');
      assert.match(await forestPage.locator('#forest-foe-pattern').innerText(),/霧のこだま/);
      assert.match(await forestPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 5/);
      assert.equal(await forestPage.locator('.answer-quick-help > div').isVisible(),false,
        'Dungeon inputs keep the optional hint, without an extra competing instruction card');
      assert.equal(await forestPage.locator('#show-hint').isVisible(),true);
      assert.ok((await forestPage.locator('#show-hint').boundingBox()).height>=44,
        'The streamlined hint remains easy to tap');
      const battleMetrics=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(battleMetrics.scroll<=battleMetrics.inner+1,`${engine}/${width} forest battle overflow: ${JSON.stringify(battleMetrics)}`);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-battle.png`),fullPage:true});
      const answer=async()=>{
        if(await forestPage.locator('#play-audio').count()){
          assert.equal(await forestPage.locator('#answer-area').isVisible(),false);
          await unlockListening(forestPage);
          assert.equal(await forestPage.locator('#answer-area').isVisible(),true);
        }
        if(!await forestPage.locator('#play-audio').count()){
          const example=await forestPage.evaluate(async()=>{
            const {ALL_PROMPTS}=await import('./monster-data.js');
            return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
          });
          await forestPage.locator('#spoken-answer').fill(example);
          await forestPage.locator('#show-answer').click();
        }
        assert.match(await forestPage.locator('#feedback-panel').innerText(),/関門突破/);
        assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-attack')),true);
        assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-guarding')),false);
        assert.equal(await forestPage.locator('#forest-damage').isVisible(),true);
        const fxLayout=await forestPage.evaluate(()=>{
          const rect=selector=>document.querySelector(selector).getBoundingClientRect();
          const consoleTop=rect('#forest-arena-console').top;
          return {consoleTop,damageTop:rect('#forest-damage').top,
            chainTop:rect('#forest-combo').top,fxTop:rect('#forest-world-fx').top,
            cinematicBottom:rect('#forest-cinematic-layer').bottom};
        });
        assert.ok(fxLayout.damageTop<fxLayout.consoleTop&&fxLayout.chainTop<fxLayout.consoleTop&&
          fxLayout.fxTop<fxLayout.consoleTop&&fxLayout.cinematicBottom<=fxLayout.consoleTop+1,
        `All attack FX must stay above the scrolling question console: ${JSON.stringify(fxLayout)}`);
        const action=await forestPage.locator('#forest-world-stage').getAttribute('data-action');
        assert.match(await forestPage.locator('#forest-battle-log').textContent(),/1ダメージ！/);
        if(action==='defense')assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-defended')),true);
        if(action==='reading')assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-reading-hit')),true);
      };
      const moveOn=async()=>{
        const next=forestPage.locator('#next-question');
        if(await next.isVisible())await next.click();
      };
      // Seeing a model answer cannot open a gate or mint any XP.
      await forestPage.locator('#spoken-answer').fill('I have no idea.');
      await forestPage.locator('#show-answer').click();
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-attack')),false);
      assert.match(await forestPage.locator('#forest-battle-log').textContent(),/霧に身を隠して.*判定保留.*攻撃は発生しません/);
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-guarding')),true);
      assert.equal(await forestPage.locator('#forest-guard svg').count(),1);
      assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'1');
      await forestPage.locator('#show-example').click();
      await moveOn();
      assert.match(await forestPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 5/);
      await answer();
      await moveOn();
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),false);
      assert.equal(await forestPage.locator('[data-forest-route]').count(),0);
      assert.equal(await forestPage.locator('[data-forest-event-option]').count(),0);
      const routeMetrics=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(routeMetrics.scroll<=routeMetrics.inner+1,`${engine}/${width} linear battle overflow: ${JSON.stringify(routeMetrics)}`);
      await forestPage.locator('#forest-journey').waitFor({state:'visible'});
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-route'),'sunlit');
      for(let mob=2;mob<=5;mob++){
        assert.match(await forestPage.locator('.question-top').innerText(),new RegExp('ENCOUNTER '+mob+' \/ 5'));
        if(mob===3){
          // Word-weakness buttons are functional, and a wrong choice gives no XP.
          assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-action'),'weakness');
          const info=await forestPage.evaluate(async()=>{
            const {ALL_PROMPTS}=await import('./monster-data.js');
            const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
            return {answer:prompt.answer,options:prompt.options};
          });
          const bad=info.options.findIndex(x=>x!==info.answer);
          const good=info.options.indexOf(info.answer);
          const originalXp=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet);
          await forestPage.locator(`[data-vocab-option="${bad}"]`).click();
          assert.equal(await forestPage.locator('#spoken-answer').inputValue(),info.options[bad]);
          await forestPage.locator('#show-answer').click();
          // Incorrect choices now display a specific meaning-error category
          // instead of the former generic retry heading.
          assert.match(await forestPage.locator('#feedback-panel').innerText(),/伝わる意味が違うよ/);
          assert.match(await forestPage.locator('.forest-teaching-nudge').innerText(),/考え方のヒント/);
          const retryText=await forestPage.locator('.forest-quiz-retry-contrast').innerText();
          assert.match(retryText,/今回の回答を見直そう/);
          assert.ok(retryText.includes('「'+info.options[bad]+'」'),
            'The wrong selected word must have an individual meaning cue');
          assert.ok(!retryText.includes('「'+info.answer+'」'),
            'The retry coach must not reveal the correct option');
          assert.equal(await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),originalXp);
          await forestPage.locator(`[data-vocab-option="${good}"]`).click();
          assert.equal(await forestPage.locator('#spoken-answer').inputValue(),info.answer);
          // Editing a selected word changes the highlighted option but never
          // turns this multiple-choice battle into a microphone question.
          await forestPage.locator('#spoken-answer').fill('different answer');
          assert.equal(await forestPage.locator('[data-vocab-option][aria-pressed="true"]').count(),0);
          assert.equal(await forestPage.locator('#mic-button').isVisible(),false);
          await forestPage.locator('#spoken-answer').fill(info.answer);
          assert.equal(await forestPage.locator(`[data-vocab-option="${good}"]`).getAttribute('aria-pressed'),'true');
          assert.equal(await forestPage.locator('#mic-button').isVisible(),false);
        }
        if(mob===4){
          assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-action'),'spell');
          const info=await forestPage.evaluate(async()=>{
            const {ALL_PROMPTS}=await import('./monster-data.js');
            const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
            return {answer:prompt.answer,tokens:prompt.tokens};
          });
          const words=info.answer.replace(/[.!?]/g,'').split(' '),used=new Set();
          for(const word of words){
            const i=info.tokens.findIndex((candidate,i)=>candidate===word&&!used.has(i));
            assert.ok(i>=0,`Missing word ${word}`);
            used.add(i);
            await forestPage.locator(`[data-grammar-piece="${i}"]`).click();
          }
          assert.equal(await forestPage.locator('#spoken-answer').inputValue(),words.join(' '));
          assert.match(await forestPage.locator('#forest-grammar-built').innerText(),/ /);
        }
        await answer();
        assert.equal(await forestPage.locator('#forest-success-explanation').getAttribute('open'),null,
          'Success feedback starts concise, with extra teaching available on request');
        assert.equal(await forestPage.locator('#next-question').isVisible(),true,
          'Next step remains immediately available without reading long details');
        if(mob===3 || mob===4){
          assert.equal(await forestPage.locator('.forest-teaching-title').isVisible(),false,
            'The detailed explanation must not push the next button below it');
          await forestPage.locator('#forest-success-explanation > summary').click();
          if(mob===3)assert.match(await forestPage.locator('.forest-teaching-learner').innerText(),/前に選んだ答え/,
            'A corrected quiz should make the previous mistake reviewable after success');
          assert.equal(await forestPage.locator('.forest-teaching-title').isVisible(),true,
            'Learners can choose to inspect the full teaching content');
          assert.match(await forestPage.locator('.forest-teaching-title').innerText(),mob===3?/なぜこの単語を使う/:/なぜこの語順になる/);
          assert.match(await forestPage.locator('#forest-auto-status').innerText(),/準備ができたら次へ/);
          assert.equal(await forestPage.locator('#pause-auto').count(),0);
          assert.ok((await forestPage.locator('.feedback-note').innerText()).length>35,'Objective quizzes should explain the answer, not only mark it right');
        }
        await moveOn();
        assert.equal(await forestPage.locator('#forest-explore-event').isVisible(),false,'Unscored story forks never interrupt a battle');
        if(await forestPage.locator('#forest-explore-screen').isVisible())await forestPage.locator('#forest-explore-continue').click();
        await forestPage.locator('#forest-journey').waitFor({state:'visible'});
      }
      assert.match(await forestPage.locator('.question-top').innerText(),/BOSS ATTACK 1 \/ 3/);
      assert.equal(await forestPage.locator('.battle-arena-svg').getAttribute('data-arena'),'thorn-vault');
      assert.match(await forestPage.locator('#forest-foe-name').innerText(),/Thorn King/);
      assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'3');
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-boss-stage')),true);
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-boss-power'),'echo');
      assert.match(await forestPage.locator('.forest-boss-special').textContent(),/確認 1\/3 · 相手の言葉を理解/);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-boss.png`),fullPage:true});
      for(let hit=1;hit<=3;hit++){
        assert.match(await forestPage.locator('.question-top').innerText(),new RegExp('BOSS ATTACK '+hit+' \/ 3'));
        assert.match(await forestPage.locator('.forest-boss-dialogue').innerText(),new RegExp('BOSS DIALOGUE · '+hit+'\/3'));
        assert.equal(await forestPage.locator('#play-card').getAttribute('data-prompt-id'),['late-call','forest-grammar-arrive-easy','boss-delay-apology-easy'][hit-1]);
        assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-action'),hit===1?'defense':hit===2?'spell':'attack');
        assert.match(await forestPage.locator('#forest-foe-pattern').innerText(),/こだま|暗号|トゲ王の問い/);
        if(width===390&&hit===3){
          // An iPhone microphone tap must start a recognizer, not merely
          // focus the text field. Native keyboard dictation is a separate tap.
          assert.equal(await forestPage.locator('#speech-alternatives').isVisible(),true);
          assert.equal(await forestPage.locator('#mic-button').evaluate(el=>el.tagName),'BUTTON');
          assert.equal(await forestPage.locator('#native-ios-dictation').evaluate(el=>el.tagName),'BUTTON');
          assert.equal(await forestPage.locator('#native-ios-dictation').getAttribute('type'),'button');
          assert.match(await forestPage.locator('#speech-helper').innerText(),/キーボードのマイク/);
          await forestPage.locator('#native-ios-dictation').click();
          assert.equal(await forestPage.locator('#spoken-answer').evaluate(el=>document.activeElement===el),true,
            'Boss keyboard fallback must focus the iPhone field through native tap activation');
          assert.match(await forestPage.locator('#speech-helper').innerText(),/入力欄(が選ばれた|を開いた)/);
          assert.equal(await forestPage.locator('#mic-button').getAttribute('aria-pressed'),'false');
          assert.equal(await forestPage.evaluate(()=>window.__hungRecognizerStarts||0),0,
            'Keyboard fallback must not start a silent recognition session');
          await forestPage.locator('#mic-button').click();
          assert.equal(await forestPage.evaluate(()=>window.__hungRecognizerStarts||0),1,
            'The primary mic must call SpeechRecognition.start() on iPhone');
          assert.equal(await forestPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
        }
        await answer();
        assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),String(3-hit));
        if(hit===3)assert.match(await forestPage.locator('#forest-battle-log').textContent(),/Thorn Kingをたおした！/);
        if(width===390&&hit===2){
          // Emulate iPhone Safari immediately before its final boss card is
          // rendered; Chrome and WebKit each exercise this no-callback path.
          await forestPage.evaluate(()=>{
            Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15'});
            window.__hungRecognizerStarts=0;
            class HungRecognition{start(){window.__hungRecognizerStarts++;}stop(){this.stopped=true;}abort(){this.aborted=true;}}
            Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:HungRecognition});
          });
        }
        await moveOn();
      }
      assert.equal(await forestPage.locator('#result-view').isVisible(),true);
      assert.match(await forestPage.locator('#result-title').innerText(),/ボスを討伐/);
      assert.equal(await forestPage.locator('.result-summon-goal').isVisible(),true,
        'Clearing a chapter should reveal progress toward the next earned weapon summon');
      assert.match(await forestPage.locator('.result-summon-copy').innerText(),/次の武器ガチャ/);
      assert.equal(await forestPage.locator('.result-summon-track').getAttribute('aria-valuemax'),'100');
      assert.equal(await forestPage.locator('#dungeon-victory-recap').isVisible(),true,
        `${engine}/${width}: a boss clear immediately shows its English and evolution rewards`);
      assert.match(await forestPage.locator('.victory-loot-total').innerText(),/XP/);
      assert.equal(await forestPage.locator('.victory-english-list li').count(),2,
        'Victory should spotlight two actually verified expressions, not a wall of every answer');
      assert.equal(await forestPage.locator('#victory-save-english').isEnabled(),true,
        'Verified English loot should be collectible for later exact-prompt review');
      await forestPage.locator('#victory-save-english').click();
      assert.equal(await forestPage.locator('#victory-save-english').getAttribute('data-saved'),'true');
      assert.equal(await forestPage.locator('#victory-save-english').isDisabled(),true);
      assert.match(await forestPage.locator('#victory-save-english').innerText(),/保存.*復習/);
      const lootIds=await forestPage.locator('[data-victory-prompt]').evaluateAll(nodes=>nodes.map(node=>node.dataset.victoryPrompt));
      const lootSaved=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).savedPromptIds);
      assert.deepEqual([...lootSaved].sort(),lootIds.sort(),'Save only the exact two verified victory questions');
      assert.match(await forestPage.locator('.victory-evolution').innerText(),/進化.*ボス攻略 \d+\/\d+エリア.*残り\d+ XP/s,
        'The boss reward must show both the companion trial marks and remaining training XP');
      assert.match(await forestPage.locator('.victory-trial-award').innerText(),/森の入口の印を獲得！/,
        'A first unique chapter boss awards a companion-specific evolution seal');
      assert.equal(await forestPage.locator('.victory-trial-award').isVisible(),true,
        'The new boss seal must be celebrated above the collapsed detail panel');
      assert.match(await forestPage.locator('.victory-next-tip').innerText(),/次のおすすめ/);
      assert.equal(await forestPage.locator('#victory-medal-retry').isVisible(),true,
        'A silver clear should give a direct, modest goal to return for gold');
      assert.match(await forestPage.locator('.victory-medal-chase').innerText(),/次は金勲章！ 昇格で \+16 XP/);
      assert.match(await forestPage.locator('.victory-medal-chase').innerText(),/全8問とボス3問をヒントなし/);
      assert.equal(await forestPage.locator('#replay-run').isVisible(),false,
        'Do not duplicate the same retry action below the visible medal goal');
      assert.equal(await forestPage.locator('#result-targeted-review').isVisible(),true,
        'A chapter with supported answers exposes one-tap targeted review without opening the report');
      assert.match(await forestPage.locator('#result-targeted-review').innerText(),/つまずいた\d+問を復習/);
      assert.equal(await forestPage.locator('.victory-evolution-track').getAttribute('aria-valuemax'),'100');
      const growthGauge=await forestPage.locator('.victory-evolution-track').evaluate(track=>({
        allocated:Number(track.getAttribute('aria-valuenow')),
        projection:parseFloat(track.querySelector('.victory-evolution-potential').style.width),
        spent:parseFloat(track.querySelector('.victory-evolution-earned').style.width)
      }));
      assert.equal(growthGauge.spent,growthGauge.allocated,
        'The solid gauge must only show XP actually allocated to this companion');
      assert.ok(growthGauge.projection>=growthGauge.allocated&&growthGauge.projection<=100,
        'The lighter portion may preview banked XP but cannot exceed the next evolution');
      if(growthGauge.projection>growthGauge.allocated)assert.match(await forestPage.locator('.victory-evolution-preview').innerText(),/まだXPは使っていない/);
      const victoryLayout=await forestPage.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(victoryLayout.scroll<=victoryLayout.width+1,
        `${engine}/${width}: the new loot card must fit the phone width (${JSON.stringify(victoryLayout)})`);
    assert.equal(await forestPage.locator('#result-next-panel').isVisible(),true,'Cleared chapter should offer a direct next action');
    assert.match(await forestPage.locator('#result-next').innerText(),/次へ/);
      assert.equal(await forestPage.locator('#result-detail-panel').getAttribute('open'),null,
        'Detailed medals and learning report should begin collapsed for clarity');
      assert.equal(await forestPage.locator('#result-quick-summary').isVisible(),false,
        'The old one-line XP summary should not duplicate the boss loot card');
      await forestPage.locator('#result-detail-panel > summary').click();
      assert.equal(await forestPage.locator('.boss-medal-result').getAttribute('data-medal-rank'),'2',
        'Seven independently verified chapter gates and all three boss checks earn silver, not gold');
      assert.match(await forestPage.locator('.boss-medal-result').innerText(),/銀ランク獲得/);
      assert.match(await forestPage.locator('#result-rewards').innerText(),/ボス勲章 初回・昇格報酬 ＋20 XP/);
      const medalLayout=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(medalLayout.scroll<=medalLayout.inner+1,`${engine}/${width}: trophy card overflow ${JSON.stringify(medalLayout)}`);
      assert.match(await forestPage.locator('#result-discoveries').innerText(),/Sunleaf/);
      assert.doesNotMatch(await forestPage.locator('#result-discoveries').innerText(),/探索の記録/,
        'Unscored story choices no longer add decorative records');
      assert.equal(await forestPage.locator('#dungeon-learning-report').isVisible(),true);
      assert.match(await forestPage.locator('#dungeon-report-title').innerText(),/森の入口 · 学習レポート/);
      assert.equal(await forestPage.locator('.dungeon-report-skill').count(),4);
      assert.match(await forestPage.locator('#dungeon-learning-report').innerText(),/自力で確認できた問題/);
      assert.match(await forestPage.locator('#dungeon-learning-report').innerText(),/文法・語順/);
      assert.match(await forestPage.locator('#dungeon-learning-report').innerText(),/次のおすすめ/);
      assert.equal(await forestPage.locator('#dungeon-retry-weak').isVisible(),true);
      const xp=Number((await forestPage.locator('#result-rewards').innerText()).match(/\+(\d+) XP/)?.[1]);
      assert.ok(xp>0&&xp<=120,'Hint-assisted review should not inflate XP: '+xp);
      await forestPage.locator('#dungeon-retry-weak').click();
      assert.match(await forestPage.locator('#play-mode-label').innerText(),/ダンジョンの復習/);
      assert.equal(await forestPage.locator('#forest-journey').isVisible(),false);
      assert.equal(await forestPage.locator('#play-view').evaluate(el=>el.classList.contains('review-only')),true);
      assert.ok(await forestPage.locator('#play-card').getAttribute('data-prompt-id'),'Review must replay original question');
      await leavePlay(forestPage);
      const beforeMedalRetryXp=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet);
      // The previous result is off-screen after leaving targeted review, but
      // its medal rematch handler must still start the original chapter.
      await forestPage.evaluate(()=>document.querySelector('#victory-medal-retry').click());
      assert.equal(await forestPage.locator('#play-view').isVisible(),true,
        'The medal chase button must actually open a playable rematch');
      assert.match(await forestPage.locator('#play-mode-label').innerText(),/森の入口/);
      assert.equal(await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),beforeMedalRetryXp,
        'Opening a medal rematch must not award extra XP');
      await leavePlay(forestPage);
      await forestPage.locator('[data-home-page="collection"]').click();
      await forestPage.locator('#collection-archive summary').click();
      assert.match(await forestPage.locator('#forest-collection-relics').innerText(),/Sunleaf/);
      assert.match(await forestPage.locator('#forest-journal-summary').innerText(),/森 1\/4.*称号 1\/6/);
      assert.match(await forestPage.locator('#forest-journal-badges .earned').innerText(),/森の一歩/,
        'Clearing the first chapter must earn an achievable exploration title');
      assert.equal(await forestPage.locator('#forest-journal-events .forest-journal-entry').count(),0,
        'Removed branching events are kept only as an archive for older saves');
      await forestPage.reload();
      await forestPage.locator('[data-home-page="collection"]').click();
      await forestPage.locator('#collection-archive summary').click();
      assert.match(await forestPage.locator('#forest-collection-relics').innerText(),/Sunleaf/);
      await forestPage.locator('#collection-home').click();
      assert.match(await forestPage.locator('#forest-home-progress').innerText(),/森 1\/4/);
      assert.match(await forestPage.locator('[data-enter-forest="entry"] .forest-area-status').innerText(),/銀勲章/);
      await forestPage.locator('[data-home-page="collection"]').click();
      assert.equal(await forestPage.locator('.boss-medal-collection-area').count(),10);
      assert.equal(await forestPage.locator('.boss-medal-slot').count(),30);
      assert.equal(await forestPage.locator('.boss-medal-collection-area').first().locator('[data-medal-rank="2"]').count(),1,
        'Silver trophy must also appear in the companion collection');
      const collectionWidth=await forestPage.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}));
      assert.ok(collectionWidth.content<=collectionWidth.viewport+1,
        `${engine}/${width}: boss medal collection must fit the phone screen: ${JSON.stringify(collectionWidth)}`);
      await forestPage.locator('[data-open-monster="medamago"]').click();
      await forestPage.locator('#detail-notes summary').click();
      assert.match(await forestPage.locator('#detail-content').innerText(),/ことばの連撃/,
        'Companion field notes must describe actual tactical abilities instead of saying not implemented');
      await forestPage.locator('#detail-back').click();
      await forestPage.locator('#collection-home').click();
      const saved=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
      assert.equal(saved.forest.clears,1);
      assert.deepEqual(saved.forest.medals,{entry:{easy:2}},'Boss medal must survive a full WebKit/Chromium reload');
      assert.deepEqual(saved.forest.relics,['sunlit-leaf']);
      assert.deepEqual(saved.savedPromptIds,lootSaved,'Victory English loot must survive a full page reload');
      assert.equal(saved.forest.journal.length,0,'The linear dungeon does not create arbitrary story choices');
      const chestBonus=(saved.battleTreasures||[]).filter(key=>key.startsWith('entry:')).reduce((total,key)=>
        total+({3:12,5:20,8:35}[Number(key.split(':')[1])]||0),0);
      const chestGold=(saved.battleTreasures||[]).filter(key=>key.startsWith('entry:')).reduce((total,key)=>
        total+({3:8,5:14,8:24}[Number(key.split(':')[1])]||0),0);
      assert.ok(chestBonus>=12,'Confirmed consecutive battle answers should unlock an area-specific chest');
      assert.equal(saved.coins,chestGold,'First-time consecutive English answers alone pay one-time summon gold');
      assert.equal(saved.xpWallet,xp+20+chestBonus,
        'First silver trophy and first-time chain chests add distinct, exactly-once spendable rewards');
      await forestContext.close();
    }
    // A second world needs a genuine locked-to-unlocked play path, distinct
    // map/battle artwork and non-overflowing mobile controls on every viewport.
    for(const width of [320,375,390,430]){
      const {context:cityContext,page:cityPage}=await boot(width);
      await enterHomePanel(cityPage,'forest');
      await cityPage.locator('#dungeon-stage-list > summary').click();
      assert.equal(await cityPage.locator('.dungeon-world-card').count(),3,'Forest, City and Ruins must be separate, clearly labelled world panels');
      assert.equal(await cityPage.locator('#dungeon-world-forest-title').innerText(),'緑風の森');
      assert.equal(await cityPage.locator('#dungeon-world-city-title').innerText(),'雪灯りの街');
      assert.equal(await cityPage.locator('#dungeon-world-ruins-title').innerText(),'星影の遺跡');
      assert.match(await cityPage.locator('.dungeon-world-city .dungeon-world-heading').innerText(),/4エリア/);
      assert.equal(await cityPage.locator('.dungeon-world-forest [data-enter-forest]').count(),4);
      assert.equal(await cityPage.locator('.dungeon-world-city [data-enter-forest]').count(),4);
      const worldColors=await cityPage.evaluate(()=>({forest:getComputedStyle(document.querySelector('.dungeon-world-forest')).backgroundImage,city:getComputedStyle(document.querySelector('.dungeon-world-city')).backgroundImage,scroll:document.documentElement.scrollWidth,inner:innerWidth}));
      assert.notEqual(worldColors.forest,worldColors.city,'Distinct destinations need distinct color themes');
      assert.ok(worldColors.scroll<=worldColors.inner+1,`${engine}/${width} world-select overflow: ${JSON.stringify(worldColors)}`);
      const cityCard=cityPage.locator('[data-enter-forest="city"]');
      assert.equal(await cityCard.isEnabled(),false,'City is locked on fresh saves');
      assert.equal(await cityPage.locator('[data-enter-forest="ruins-gate"]').isEnabled(),false,'Ruins is locked until the City is cleared');
      assert.match(await cityCard.innerText(),/森の4エリアを攻略で解放/);
      assert.match(await cityPage.locator('[data-enter-forest="glade"]').innerText(),/前のエリアを攻略で解放/);
      await cityPage.evaluate(async()=>{
        const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
        const {FOREST_AREAS,finishForest}=await import('./forest-engine.js');
        let save=createSave();
        for(const area of FOREST_AREAS)save=finishForest(save,'sunlit','medamago',area.id).save;
        localStorage.setItem(STORAGE_KEY,JSON.stringify(save));
      });
      await cityPage.reload({waitUntil:'networkidle'});
      await enterHomePanel(cityPage,'forest');
      await cityPage.locator('#dungeon-stage-list > summary').click();
      assert.equal(await cityCard.isEnabled(),true,'Four forest victories unlock the City');
      assert.match(await cityPage.locator('#forest-home-progress').innerText(),/森 4\/4 · 街 0\/4/);
      assert.match(await cityPage.locator('#start-forest').innerText(),/雪灯りの街/);
      if(width===390)await cityPage.screenshot({path:path.join(shots,`city-${engine}-${width}-selection.png`),fullPage:true});
      await cityPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});
      await cityPage.locator('#start-forest-simple').click();
      assert.match(await cityPage.locator('#forest-explore-title').innerText(),/雪灯りの街/);
      assert.equal(await cityPage.locator('#forest-explore-art .city-world-svg').count(),1);
      assert.match(await cityPage.locator('#forest-explore-art .city-world-svg').getAttribute('aria-label'),/雪の積もった街/);
      const mapMetrics=await cityPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(mapMetrics.scroll<=mapMetrics.inner+1,`${engine}/${width} City map overflow ${JSON.stringify(mapMetrics)}`);
      if(width===390)await cityPage.screenshot({path:path.join(shots,`city-${engine}-${width}-map.png`),fullPage:true});
      await cityPage.locator('#forest-explore-continue').click();
      assert.equal(await cityPage.locator('#forest-world-stage').getAttribute('data-area'),'city');
      assert.equal(await cityPage.locator('.battle-arena-svg').getAttribute('data-arena'),'city-platform');
      assert.equal(await cityPage.locator('#forest-world-backdrop .forest-world-svg').count(),0);
      assert.match(await cityPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 10/);
      assert.equal(await cityPage.locator('#forest-enemy svg').getAttribute('aria-label'),'街の敵モンスター');
      const battleMetrics=await cityPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(battleMetrics.scroll<=battleMetrics.inner+1,`${engine}/${width} City battle overflow ${JSON.stringify(battleMetrics)}`);
      if(width===390)await cityPage.screenshot({path:path.join(shots,`city-${engine}-${width}-battle.png`),fullPage:true});
      await unlockListening(cityPage);
      await cityPage.locator('#next-question').click();
      assert.equal(await cityPage.locator('#forest-explore-options').isVisible(),false);
      assert.equal(await cityPage.locator('[data-forest-route]').count(),0);
      await cityPage.locator('#forest-journey').waitFor({state:'visible'});
      assert.match(await cityPage.locator('#forest-route-status').innerText(),/マーケット通り/);
      assert.match(await cityPage.locator('.question-top').innerText(),/ENCOUNTER 2 \/ 10/);
      await leavePlay(cityPage);
      if(width===390){
        const upcoming=[['city','city-market'],['city-market','city-terminal'],['city-terminal','city-blizzard']];
        for(const [clearedId,nextId] of upcoming){
          await cityPage.evaluate(async areaId=>{
            const {STORAGE_KEY}=await import('./monster-engine.js');
            const {finishForest}=await import('./forest-engine.js');
            const old=JSON.parse(localStorage.getItem(STORAGE_KEY));
            const cleared=finishForest(old,'market','medamago',areaId);
            localStorage.setItem(STORAGE_KEY,JSON.stringify(cleared.save));
          },clearedId);
          await cityPage.reload({waitUntil:'networkidle'});
          await enterHomePanel(cityPage,'forest');
          await cityPage.locator('#dungeon-stage-list > summary').click();
          assert.equal(await cityPage.locator(`[data-enter-forest="${nextId}"]`).isEnabled(),true,`${nextId} unlocks after its predecessor`);
          await cityPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});
          await cityPage.locator('#start-forest-simple').click();
          assert.equal(await cityPage.locator('#forest-explore-art .city-world-svg').getAttribute('data-city-chapter'),nextId);
          await cityPage.locator('#forest-explore-continue').click();
          assert.equal(await cityPage.locator('.battle-arena-svg').getAttribute('data-city-chapter'),nextId);
          assert.match(await cityPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 10/);
          const m=await cityPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
          assert.ok(m.scroll<=m.inner+1,`${engine} ${nextId} scene overflow: ${JSON.stringify(m)}`);
          await leavePlay(cityPage);
        }
      }
      await cityContext.close();
    }
    // Explanations remain visible until the learner chooses to continue.
    // A route remains a manual choice, without an automatic explanation timer.
    const {context:autoContext,page:autoPage}=await boot(390);
    const autoAnswer=async()=>{
      if(await autoPage.locator('#play-audio').count())await unlockListening(autoPage);
      else{
        const answer=await autoPage.evaluate(async()=>{
          const {ALL_PROMPTS}=await import('./monster-data.js');
          return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
        });
        await autoPage.locator('#spoken-answer').fill(answer);
        await autoPage.locator('#show-answer').click();
      }
    };
    await enterHomePanel(autoPage,'forest');
    await autoPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await autoPage.locator('#start-forest-simple').click();
    await autoPage.locator('#forest-explore-continue').click();
    await autoAnswer();
    assert.match(await autoPage.locator('#forest-auto-status').innerText(),/準備ができたら次へ/);
    assert.equal(await autoPage.locator('#forest-success-explanation').getAttribute('open'),null);
    const pinnedNext=await autoPage.evaluate(()=>{
      const button=document.querySelector('#next-question');
      const rect=button.getBoundingClientRect();
      const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
      return {position:getComputedStyle(button).position,top:rect.top,bottom:rect.bottom,
        viewport:innerHeight,canTap:hit===button||button.contains(hit)};
    });
    assert.ok(pinnedNext.position==='fixed'&&pinnedNext.top>=0&&
      pinnedNext.bottom<=pinnedNext.viewport-4&&pinnedNext.bottom>=pinnedNext.viewport-50&&pinnedNext.canTap,
      `Progress must stay visible and tappable while optional teaching scrolls: ${JSON.stringify(pinnedNext)}`);
    const firstPrompt=await autoPage.locator('#play-card').getAttribute('data-prompt-id');
    await autoPage.waitForTimeout(3000);
    assert.equal(await autoPage.locator('#play-card').getAttribute('data-prompt-id'),firstPrompt,'Reading time is unlimited');
    assert.equal(await autoPage.locator('#next-question').isVisible(),true);
    await autoPage.locator('#next-question').click();
    assert.equal(await autoPage.locator('[data-forest-route]').count(),0);
    await autoPage.locator('#forest-journey').waitFor({state:'visible',timeoutMs:4500});
    assert.match(await autoPage.locator('.question-top').innerText(),/ENCOUNTER 2/);
    await autoAnswer();
    assert.match(await autoPage.locator('#forest-combo').innerText(),/2 CHAIN/);
    await autoPage.locator('#next-question').click();
    if(await autoPage.locator('#forest-explore-screen').isVisible())await autoPage.locator('#forest-explore-continue').click();
    await autoPage.locator('#forest-journey').waitFor({state:'visible',timeoutMs:4500});
    assert.match(await autoPage.locator('.question-top').innerText(),/ENCOUNTER 3/);
    await autoAnswer();
    const thirdPrompt=await autoPage.locator('#play-card').getAttribute('data-prompt-id');
    await autoPage.waitForTimeout(800);
    assert.equal(await autoPage.locator('#play-card').getAttribute('data-prompt-id'),thirdPrompt);
    await autoPage.locator('#next-question').click();
    if(await autoPage.locator('#forest-explore-screen').isVisible())await autoPage.locator('#forest-explore-continue').click();
    await autoPage.locator('#forest-journey').waitFor({state:'visible',timeoutMs:4500});
    assert.match(await autoPage.locator('.question-top').innerText(),/ENCOUNTER 4/);
    await leavePlay(autoPage);
    assert.equal(await autoPage.locator('#home-view').isVisible(),true);
    await autoContext.close();
    // Endless mode limits attempts by difficulty; ambiguous results are not falsely called wrong.
    const {context:endlessContext,page:endlessPage}=await boot(390);
    await enterHomePanel(endlessPage,'training');
    await endlessPage.locator('[data-difficulty="hard"]').click();
    await endlessPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    await enterHomePanel(endlessPage,'forest');
    await endlessPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await endlessPage.locator('#start-forest-endless').click();
    assert.equal(await endlessPage.locator('#forest-explore-screen').isVisible(),true);
    await endlessPage.locator('#forest-explore-continue').click();
    assert.match(await endlessPage.locator('#play-mode-label').innerText(),/エンドレス/);
    assert.match(await endlessPage.locator('#forest-tries').innerText(),/あと1回/);
    await endlessPage.locator('#spoken-answer').fill('I have no idea what to say here.');
    await endlessPage.locator('#show-answer').click();
    assert.match(await endlessPage.locator('#feedback-panel').innerText(),/判定保留/);
    assert.match(await endlessPage.locator('#forest-tries').innerText(),/あと1回/,'An uncertain speaking reply must not consume the final try');
    assert.equal(await endlessPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),0);
    const openingAnswer=await endlessPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await endlessPage.locator('#spoken-answer').fill(openingAnswer);
    await endlessPage.locator('#show-answer').click();
    await endlessPage.locator('#next-question').click();
    assert.equal(await endlessPage.locator('[data-forest-route]').count(),0);
    // Continue past the listening task with an authored answer, then verify
    // that an objectively incorrect vocabulary choice does spend the try.
    await unlockListening(endlessPage);
    assert.equal(await endlessPage.locator('#spoken-answer').isVisible(),false);
    await endlessPage.locator('#next-question').click();
    await endlessPage.locator('#forest-journey').waitFor({state:'visible',timeout:6500});
    assert.match(await endlessPage.locator('.question-top').innerText(),/ENCOUNTER 3/);
    const xpBeforeWrong=await endlessPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet);
    const wrongVocab=await endlessPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
      return {kind:prompt.kind,wrong:prompt.options?.find(option=>option!==prompt.answer)};
    });
    assert.equal(wrongVocab.kind,'vocab');
    assert.ok(wrongVocab.wrong);
    await endlessPage.locator('#spoken-answer').fill(wrongVocab.wrong);
    await endlessPage.locator('#show-answer').click();
    assert.match(await endlessPage.locator('#feedback-panel').innerText(),/挑戦回数を使い切った/);
    await endlessPage.locator('#forest-exit').click();
    assert.match(await endlessPage.locator('#result-title').innerText(),/挑戦終了/);
    assert.equal(await endlessPage.locator('#dungeon-victory-recap').isVisible(),false,
      'An exhausted run cannot show a boss-defeat trophy');
    const endedSave=await endlessPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(endedSave.xpWallet,xpBeforeWrong,'An incorrect quiz answer cannot grant XP');
    assert.equal(endedSave.forest.clears,0);
    await endlessContext.close();
    // Fake the browser speech API: check start/stop, stale onend, capture,
    // retry, denied permission, and changing views without a stuck mic.
    const {context:micContext,page:micPage}=await boot(390);
    await micPage.evaluate(async()=>{
      const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
      const seeded=createSave();
      seeded.reviewPrompts['think-cafe']='2020-01-01';
      seeded.reviewPrompts['repeat-class']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await micPage.reload();
    await micPage.evaluate(()=>{
      class FakeRecognition {
        start(){window.__activeMic=this;}
        abort(){this.aborted=true;queueMicrotask(()=>this.onend?.());}
        stop(){this.stopped=true;}
      }
      window.SpeechRecognition=FakeRecognition;
    });
    await enterHomePanel(micPage,'training');
    await micPage.getByRole('button',{name:/スピーキングを始める/}).click();
    assert.equal(await micPage.locator('#play-card').getAttribute('data-prompt-id'),'think-cafe');
    await unlockListening(micPage);
    const micButton=micPage.locator('#mic-button');
    await micButton.click();
    assert.equal(await micButton.getAttribute('aria-pressed'),'true');
    assert.equal(await micButton.getAttribute('aria-label'),'録音を停止する');
    // Interim results must be visible as the learner speaks, before onend.
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Let me'}],{isFinal:false})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Let me');
    assert.equal(await micPage.locator('#spoken-answer').evaluate(el=>el.classList.contains('transcript-interim')),true);
    assert.equal(await micButton.getAttribute('aria-pressed'),'true');
    assert.equal(await micButton.isVisible(),true);
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Let me think'}],{isFinal:false})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Let me think');
    assert.match(await micPage.locator('#speech-helper').innerText(),/リアルタイム/);
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Let me think about it.'}],{isFinal:true})]}));
    assert.equal(await micButton.isVisible(),true);
    assert.equal(await micPage.locator('#retry-mic').isVisible(),true);
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Let me think about it.');
    assert.equal(await micPage.locator('#spoken-answer').evaluate(el=>el.classList.contains('transcript-interim')),false);
    await micPage.locator('#retry-mic').click();
    assert.equal(await micButton.getAttribute('aria-pressed'),'true');
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Could you'}],{isFinal:false})]}));
    await micButton.click(); // stop(), NOT abort(): still waiting for WebKit's final transcript.
    assert.equal(await micButton.getAttribute('aria-pressed'),'false');
    assert.equal(await micButton.isDisabled(),true,
      'Pending transcription should be shown as finishing, not a non-responsive start button');
    assert.match(await micButton.innerText(),/確定中/);
    assert.equal(await micPage.evaluate(()=>window.__activeMic.stopped),true);
    assert.equal(await micPage.evaluate(()=>Boolean(window.__activeMic.aborted)),false,'Stopping must not discard pending speech');
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Could you help me?'}],{isFinal:true})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Could you help me?');
    assert.equal(await micButton.isEnabled(),true);
    assert.equal(await micPage.locator('#retry-mic').isVisible(),true);
    await micButton.click();
    await micPage.evaluate(()=>window.__activeMic.onerror?.({error:'not-allowed'}));
    assert.equal(await micButton.getAttribute('aria-pressed'),'false');
    assert.match(await micPage.locator('#speech-helper').innerText(),/許可されていません/);
    assert.equal(await micPage.locator('#speech-alternatives').isVisible(),true,
      'A failed non-iOS recognizer must reveal the keyboard fallback');
    assert.equal(await micPage.locator('#speech-alternatives').evaluate(el=>el.open),true);
    await micPage.locator('#spoken-answer').fill('Let me think about it.');
    await micPage.locator('#show-answer').click();
    assert.equal(await micButton.isVisible(),false);
    await micPage.locator('#next-question').click();
    assert.equal(await micPage.locator('#play-card').getAttribute('data-prompt-id'),'repeat-class');
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'false');
    await micPage.locator('#mic-button').click();
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Could you'}],{isFinal:false})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Could you');
    // An interim recognition that ends without final text must not leave an active mic.
    await micPage.evaluate(()=>window.__activeMic.onend());
    assert.equal(await micPage.locator('#mic-button').isVisible(),true);
    assert.equal(await micPage.locator('#retry-mic').isVisible(),true);
    await micPage.locator('#retry-mic').click();
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await leavePlay(micPage);
    assert.equal(await micPage.locator('#home-view').isVisible(),true);
    assert.equal(await micPage.locator('#play-view').isVisible(),false);
    // A recognizer can deliver its callbacks before start() returns. The
    // last UI update must not resurrect an already completed/failed mic.
    await micPage.evaluate(async()=>{
      const {STORAGE_KEY}=await import('./monster-engine.js');
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
      saved.reviewPrompts['think-cafe']='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
    });
    await micPage.reload();
    await micPage.evaluate(()=>{
      class ImmediateRecognition{
        start(){
          this.onstart?.();
          this.onresult?.({results:[Object.assign([{transcript:'Let me think about it.'}],{isFinal:true})]});
        }
        abort(){this.aborted=true;}
      }
      window.SpeechRecognition=ImmediateRecognition;
    });
    await enterHomePanel(micPage,'training');
    await micPage.getByRole('button',{name:/スピーキングを始める/}).click();
    assert.equal(await micPage.locator('#play-card').getAttribute('data-prompt-id'),'think-cafe');
    await micPage.locator('#mic-button').click();
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Let me think about it.');
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'false',
      'A synchronous final transcript must not leave an orange active microphone');
    assert.equal(await micPage.locator('#retry-mic').isVisible(),true);
    assert.match(await micPage.locator('#speech-helper').innerText(),/聞き取った英文を表示/);
    await micPage.evaluate(()=>{
      window.SpeechRecognition=class{
        start(){this.onerror?.({error:'not-allowed'});}
        abort(){this.aborted=true;}
      };
    });
    await micPage.locator('#mic-button').click();
    assert.equal(await micPage.locator('#mic-button').getAttribute('aria-pressed'),'false',
      'A synchronous permission failure must restore a usable retry button');
    assert.match(await micPage.locator('#speech-helper').innerText(),/許可されていません/);
    assert.equal(await micPage.locator('#speech-alternatives').isVisible(),true);
    await leavePlay(micPage);
    await micContext.close();
    // Simulate an iPhone embedded browser which exposes SpeechRecognition but
    // returns no words. Never keep a fake active microphone indefinitely.
    const {context:iosContext,page:iosPage}=await boot(390);
    await iosPage.addInitScript(()=>{
      Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15'});
      class SilentSpeech{
        start(){window.__silentSpeech=this;queueMicrotask(()=>this.onstart?.());}
        stop(){this.stopped=true;queueMicrotask(()=>this.onend?.());}
        abort(){this.aborted=true;}
      }
      Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:SilentSpeech});
    });
    await iosPage.reload();
    await enterHomePanel(iosPage,'training');
    await iosPage.getByRole('button',{name:/スピーキングを始める/}).click();
    await unlockListening(iosPage);
    // iPhone's real microphone action and the native keyboard fallback are
    // distinct; neither must masquerade as the other.
    assert.equal(await iosPage.locator('#mic-button').evaluate(e=>e.tagName),'BUTTON');
    assert.equal(await iosPage.locator('#speech-alternatives').isVisible(),true,
      'iPhone fallback must be present before a browser recognition failure');
    assert.equal(await iosPage.locator('#native-ios-dictation').evaluate(e=>e.tagName),'BUTTON');
    assert.equal(await iosPage.locator('#native-ios-dictation').getAttribute('type'),'button');
    assert.match(await iosPage.locator('#speech-helper').innerText(),/「話す」で録音/);
    assert.equal(await iosPage.locator('#speech-alternatives').evaluate(el=>el.open),false,
      'Alternative instructions must remain collapsed until needed');
    const iosContrast=await iosPage.evaluate(()=>{
      const helper=document.querySelector('#speech-helper');
      const field=document.querySelector('#spoken-answer');
      const parse=v=>[...v.matchAll(/[0-9.]+/g)].slice(0,3).map(x=>Number(x[0]));
      const luminance=rgb=>rgb.map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
      const ratio=(a,b)=>{const l=[luminance(parse(a)),luminance(parse(b))].sort((x,y)=>y-x);return (l[0]+.05)/(l[1]+.05);};
      const style=getComputedStyle(helper),placeholder=getComputedStyle(field,'::placeholder');
      return {helperRatio:ratio(style.color,style.backgroundColor),placeholderRatio:ratio(placeholder.color,getComputedStyle(field).backgroundColor),helperColor:style.color,helperBackground:style.backgroundColor,placeholder:placeholder.color};
    });
    assert.ok(iosContrast.helperRatio>=7,`The highlighted iPhone instruction must have strong actual contrast: ${JSON.stringify(iosContrast)}`);
    assert.ok(iosContrast.placeholderRatio>=4.5,`Input placeholder must be readable without relying on Safari's default opacity: ${JSON.stringify(iosContrast)}`);
    await iosPage.locator('#native-ios-dictation').click();
    assert.equal(await iosPage.locator('#spoken-answer').evaluate(e=>document.activeElement===e),true);
    assert.match(await iosPage.locator('#speech-helper').innerText(),/入力欄(が選ばれた|を開いた)/);
    assert.equal(await iosPage.evaluate(()=>Boolean(window.__silentSpeech)),false);
    // A real primary mic tap starts recognition and permission errors leave
    // the native keyboard alternative available on the same card.
    await iosPage.locator('#mic-button').click();
    assert.equal(await iosPage.evaluate(()=>Boolean(window.__silentSpeech)),true);
    assert.equal(await iosPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await iosPage.evaluate(()=>window.__silentSpeech.onerror?.({error:'not-allowed'}));
    assert.match(await iosPage.locator('#speech-helper').innerText(),/許可されていません/);
    assert.equal(await iosPage.locator('#mic-button').getAttribute('aria-pressed'),'false');
    assert.equal(await iosPage.locator('#native-ios-dictation').isVisible(),true);
    assert.equal(await iosPage.locator('#speech-alternatives').evaluate(el=>el.open),true);
    await iosPage.locator('#native-ios-dictation').click();
    assert.equal(await iosPage.locator('#spoken-answer').evaluate(e=>document.activeElement===e),true);
    await iosPage.locator('#spoken-answer').fill('That is fine with me.');
    await leavePlay(iosPage);
    await enterHomePanel(iosPage,'forest');
    await iosPage.locator('#dungeon-other-modes').evaluate(el=>{el.open=true});await iosPage.locator('#start-forest-tactics').click();
    await iosPage.locator('#forest-explore-continue').click();
    await iosPage.locator('.forest-attack-select [data-tactic-kind="speak"]').click();
    assert.equal(await iosPage.locator('#mic-button').evaluate(e=>e.tagName),'BUTTON');
    assert.equal(await iosPage.locator('#native-ios-dictation').isVisible(),true);
    // This is the actual screen from the reported iPhone screenshot, not the
    // lighter standalone speaking-training page.
    const battleContrast=await iosPage.evaluate(()=>{
      const helper=document.querySelector('#speech-helper');
      const field=document.querySelector('#spoken-answer');
      const rgb=color=>[...color.matchAll(/[0-9.]+/g)].slice(0,3).map(m=>Number(m[0]));
      const luminance=color=>rgb(color).map(c=>{const x=c/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;})
        .reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
      const contrast=(a,b)=>{const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (l[0]+.05)/(l[1]+.05);};
      const help=getComputedStyle(helper),input=getComputedStyle(field);
      return {help:contrast(help.color,help.backgroundColor),placeholder:contrast(getComputedStyle(field,'::placeholder').color,input.backgroundColor),helpColor:help.color,helpBackground:help.backgroundColor};
    });
    assert.ok(battleContrast.help>=7&&battleContrast.placeholder>=4.5,
      `Real forest battle's pale helper and placeholder must remain legible: ${JSON.stringify(battleContrast)}`);
    await iosPage.evaluate(()=>{window.__lastSilentSpeech=window.__silentSpeech;});
    await iosPage.locator('#mic-button').click();
    assert.equal(await iosPage.evaluate(()=>window.__silentSpeech===window.__lastSilentSpeech),false,
      'Tapping the dungeon microphone must start a new recognition session');
    assert.equal(await iosPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await iosPage.locator('#native-ios-dictation').click();
    assert.equal(await iosPage.locator('#spoken-answer').evaluate(e=>document.activeElement===e),true);
    await iosContext.close();
    // If an in-app browser exposes no Web Speech API, do not show a dead mic
    // button. The labeled keyboard fallback must still take a real tap.
    const {context:noSpeechContext,page:noSpeechPage}=await boot(390);
    await noSpeechPage.addInitScript(()=>{
      Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15'});
      Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:undefined});
      Object.defineProperty(window,'webkitSpeechRecognition',{configurable:true,value:undefined});
    });
    await noSpeechPage.reload();
    await enterHomePanel(noSpeechPage,'training');
    await noSpeechPage.getByRole('button',{name:/スピーキングを始める/}).click();
    await unlockListening(noSpeechPage);
    assert.equal(await noSpeechPage.locator('#mic-button').isVisible(),false);
    assert.equal(await noSpeechPage.locator('#native-ios-dictation').isVisible(),true);
    assert.equal(await noSpeechPage.locator('#speech-alternatives').isVisible(),true);
    assert.match(await noSpeechPage.locator('#speech-helper').innerText(),/自動音声認識に非対応/);
    await noSpeechPage.locator('#native-ios-dictation').click();
    assert.equal(await noSpeechPage.locator('#spoken-answer').evaluate(e=>document.activeElement===e),true);
    // Completing a one-word hint must not pop open the native keyboard again.
    // Only the explicit dictation button is allowed to focus the iPhone input.
    const iosCloze=await noSpeechPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const {beginnerClozeFor}=await import('./speaking-guidance.js');
      const prompt=ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId);
      return beginnerClozeFor(prompt);
    });
    assert.ok(iosCloze?.word,'The first beginner speaking prompt needs a one-word hint');
    await noSpeechPage.locator('#show-hint').click();
    await noSpeechPage.locator('#spoken-answer').fill(iosCloze.word);
    await noSpeechPage.locator('#show-answer').click();
    assert.match(await noSpeechPage.locator('#cloze-practice-status').innerText(),/空欄は正解/);
    assert.equal(await noSpeechPage.locator('#spoken-answer').evaluate(e=>document.activeElement===e),false,
      'A correct cloze must not unexpectedly open the iPhone keyboard');
    assert.equal(await noSpeechPage.locator('#native-ios-dictation').isVisible(),true,
      'The learner can still intentionally open the native keyboard');
    await noSpeechContext.close();
    // An evolved companion from an older save must retain its earned form
    // across migration, reload, collection, battle and portable backup.
    const {context:evolvedContext,page:evolvedPage}=await boot(390);
    await evolvedPage.evaluate(async()=>{
      const {createSave,feedMonster,STORAGE_KEY}=await import('./monster-engine.js');
      const start=createSave();start.xpWallet=160;
      const legacy=feedMonster(start,'medamago',160).save;
      delete legacy.monsterEvolution;delete legacy.monsterTrials;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(legacy));
    });
    await evolvedPage.reload();
    assert.match(await evolvedPage.locator('#hero-monster-name').innerText(),/Sunnyolk.*進化済み/);
    await enterHomePanel(evolvedPage,'collection');
    assert.match(await evolvedPage.locator('[data-open-monster="medamago"]').innerText(),/Sunnyolk.*Lv\.3/s,
      'The collection must retain the old evolved form without filling every card with trial instructions');
    assert.match(await evolvedPage.locator('[data-open-monster="medamago"] .catalog-evolution').textContent(),/第2進化：Lv\.10/,
      'The earned companion retains its next trial details for the focused detail view');
    await evolvedPage.locator('[data-open-monster="medamago"]').click();
    assert.match(await evolvedPage.locator('#detail-content h1').innerText(),/Sunnyolk/);
    assert.match(await evolvedPage.locator('.character-badge').innerText(),/Lv\.3.*進化済み/);
    assert.equal(await evolvedPage.locator('.character-portrait .monster-evolved').count(),1);
    await evolvedPage.locator('#detail-back').click();
    await evolvedPage.locator('#collection-home').click();
    await evolvedPage.locator('[data-feature-dungeon]').click();
    await evolvedPage.locator('#forest-explore-continue').click();
    assert.match(await evolvedPage.locator('#forest-companion-name').innerText(),/Sunnyolk/);
    assert.equal(await evolvedPage.locator('#forest-party').getAttribute('data-evolved'),'true');
    await leavePlay(evolvedPage);
    await evolvedPage.locator('#home-extra-modes > summary').click();
    await evolvedPage.locator('[data-home-page="save"]').click();
    assert.equal(await evolvedPage.locator('#save-transfer').isVisible(),true);
    assert.equal(await evolvedPage.locator('#save-transfer').getAttribute('open'),'');
    await evolvedPage.locator('#save-export').click();
    const portableSave=await evolvedPage.locator('#save-import').inputValue();
    assert.match(portableSave,/"medamago":160/);
    const downloadStarted=evolvedPage.waitForEvent('download');
    await evolvedPage.locator('#save-download').click();
    const backupDownload=await downloadStarted;
    assert.match(backupDownload.suggestedFilename(),/^speakingym-monsters-save-\d{4}-\d{2}-\d{2}\.json$/);
    const portableFile=fs.readFileSync(await backupDownload.path(),'utf8');
    assert.equal(JSON.parse(portableFile).monsterXp.medamago,160,'Downloaded file retains evolved companion XP');
    const {context:restoreContext,page:restorePage}=await boot(390);
    await restorePage.locator('#home-extra-modes > summary').click();
    await restorePage.locator('[data-home-page="save"]').click();
    await restorePage.locator('#save-import-file').setInputFiles({name:'unrelated.json',mimeType:'application/json',buffer:Buffer.from('{"not":"a save"}')});
    await restorePage.waitForFunction(()=>document.querySelector('#save-transfer-status')?.textContent?.includes('読み込めませんでした'));
    assert.match(await restorePage.locator('#save-transfer-status').innerText(),/読み込めませんでした/);
    await restorePage.locator('#save-import-file').setInputFiles({name:backupDownload.suggestedFilename(),mimeType:'application/json',buffer:Buffer.from(portableFile)});
    await restorePage.waitForFunction(()=>document.querySelector('#save-transfer-status')?.textContent?.includes('まだ復元していません'));
    assert.match(await restorePage.locator('#save-transfer-status').innerText(),/まだ復元していません/);
    assert.equal(JSON.parse(await restorePage.locator('#save-import').inputValue()).monsterXp.medamago,160);
    assert.equal((await restorePage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')))).monsterXp.medamago,0,
      'Selecting a backup file must never overwrite the active save automatically');
    restorePage.once('dialog',dialog=>dialog.accept());
    await restorePage.locator('#save-import-button').click();
    assert.match(await restorePage.locator('#save-transfer-status').textContent(),/復元できた/);
    assert.match(await restorePage.locator('#hero-monster-name').innerText(),/Sunnyolk/);
    assert.equal(JSON.parse(portableSave).monsterXp.medamago,160,'Text copy workflow remains available');
    await restoreContext.close();
    await evolvedContext.close();
    const {context,page}=await boot(390);
    await page.evaluate(async()=>{
      const {createSave,recordAnswer,STORAGE_KEY}=await import('./monster-engine.js');
      // One authentic prior expression keeps the short flow focused on rewards
      // while Soxie still requires FOUR independent expressions to recruit.
      let seeded=recordAnswer(createSave(),'help-bag','smooth','2026-10-25').save;
      seeded=recordAnswer(seeded,'prefer-city','smooth','2026-10-25').save;
      // The first exercise in this scenario uses a hint, so it does not
      // increase the independent expression count.
      seeded.xpWallet=0;
      for(const id of ['think-trip','repeat-station','agree-friend'])seeded.reviewPrompts[id]='2020-01-01';
      localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));
    });
    await page.reload();
    await enterHomePanel(page,'training');
    await page.getByRole('button',{name:/スピーキングを始める/}).click();
    assert.match(await page.locator('#play-mode-label').innerText(),/スピーキング道場/);
    const questionContrast=await page.evaluate(()=>{
      const card=document.querySelector('#play-card');
      const ratio=(foreground,background)=>{
        const rgb=value=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
        const luminance=value=>rgb(value).map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;})
          .reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
        const [high,low]=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
        return (high+.05)/(low+.05);
      };
      const bg=getComputedStyle(card).backgroundColor;
      return {heading:ratio(getComputedStyle(card.querySelector('h1')).color,bg),
        context:ratio(getComputedStyle(card.querySelector('.question-caption')).color,bg)};
    });
    assert.ok(questionContrast.heading>=7,`Actual question must have strong contrast: ${JSON.stringify(questionContrast)}`);
    assert.ok(questionContrast.context>=4.5,`Scene context must stay legible: ${JSON.stringify(questionContrast)}`);
    const speakingSeen=[];
    for(let i=0;i<6;i++){
      const id=await page.locator('#play-card').getAttribute('data-prompt-id');
      speakingSeen.push(id);
      assert.equal(await page.locator('#play-audio').count(),0,'Speaking-only must not depend on listening audio');
      const answer=await page.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
      });
      if(i===0){
        assert.equal(await page.locator('#hint-panel').isHidden(),true);
        const positions=await page.evaluate(()=>({hint:document.querySelector('#show-hint').getBoundingClientRect().top,answer:document.querySelector('#spoken-answer').getBoundingClientRect().top}));
        assert.ok(positions.hint>positions.answer,'A beginner sees the cloze hint below their own answer');
        await page.locator('#show-hint').click();
        assert.match(await page.locator('#hint-panel').innerText(),/穴埋めヒント/);
        assert.match(await page.locator('#hint-panel').innerText(),/____/);
        assert.equal(await page.locator('#show-hint').getAttribute('aria-expanded'),'true');
        assert.equal(await page.locator('#show-hint').isDisabled(),true);
        const clozeWord=await page.evaluate(async()=>{
          const {ALL_PROMPTS}=await import('./monster-data.js');
          const {beginnerClozeFor}=await import('./speaking-guidance.js');
          return beginnerClozeFor(ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)).word;
        });
        await page.locator('#spoken-answer').fill(clozeWord);
        await page.locator('#show-answer').click();
        assert.match(await page.locator('#cloze-practice-status').innerText(),/空欄は正解/);
        assert.equal(await page.locator('#spoken-answer').inputValue(),'','Word practice is not graded as a full reply');
        assert.equal(await page.locator('#feedback-panel .grading-correct').count(),0);
        const mobile=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
        assert.ok(mobile.scroll<=mobile.inner+1,`390px guided speaking must not overflow: ${JSON.stringify(mobile)}`);
      }
      await page.locator('#spoken-answer').fill(answer);
      await page.locator('#show-answer').click();
      assert.ok((await page.locator('#feedback-panel').innerText()).includes(i===0?'+8 XP':'+16 XP'));
      await page.locator('#next-question').click();
    }
    assert.equal(new Set(speakingSeen).size,6);
    await page.locator('#result-view').waitFor({state:'visible'});
    assert.match(await page.locator('#result-companion-reveal').innerText(),/Soxie/);
    assert.equal(await page.locator('#result-companion-reveal').isVisible(),true,
      'New companions must be celebrated above the optional result details');
    assert.equal(await page.locator('#result-companion-reveal [data-result-companion="katappo"]').count(),1,
      'The earned companion has a direct, tappable field-notes entry');
    assert.equal(await page.locator('#result-discoveries .discovery-card').count(),0,
      'The same recruitment is not repeated inside collapsed details');
    const trainingEarned=88;
    assert.ok((await page.locator('#result-rewards').innerText()).includes('+88 XP ストック'));
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-result.png`),fullPage:true});
    await page.locator('#result-collection').click();
    assert.equal(await page.locator('#training-view').isVisible(),true,
      'Battle reward XP should open the active companion training directly, without a catalog detour');
    assert.equal(await page.locator('#training-wallet').innerText(),trainingEarned+' XP');
    await page.locator('#training-back').click();
    await page.locator('#detail-back').click();
    assert.equal(await page.locator('#collection-wallet').innerText(),trainingEarned+' XP');
    assert.equal(await page.locator('#collection-grid [data-feed-monster]').count(),0);
    await page.locator('[data-open-monster="katappo"]').click();
    assert.equal(await page.locator('#detail-view').isVisible(),true);
    assert.match(await page.locator('#detail-content').innerText(),/sock/);
    assert.equal(await page.locator('[data-pronounce-word="sock"]').isVisible(),true);
    await page.locator('#open-training').click();
    assert.equal(await page.locator('#training-view').isVisible(),true);
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="10"]').click();
    assert.equal(await page.locator('#training-wallet').innerText(),(trainingEarned-10)+' XP');
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="all"]').click();
    assert.equal(await page.locator('#training-wallet').innerText(),'0 XP');
    assert.match(await page.locator('#growth-feedback').innerText(),new RegExp('Soxieに'+(trainingEarned-10)+' XP'));
    await page.locator('#training-back').click();
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-collection.png`),fullPage:true});
    const collectionMetrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(collectionMetrics.scroll<=collectionMetrics.inner+1,`${engine}/390 collection horizontal overflow: ${JSON.stringify(collectionMetrics)}`);
    await page.locator('[data-select-monster="katappo"]').click();
    await page.locator('#detail-back').click();
    await page.locator('#collection-home').click();
    assert.ok((await page.locator('#stat-independent').innerText()).includes(' / 16'));
    assert.match(await page.locator('#hero-monster-name').innerText(),/Soxie/);
    await page.getByRole('button',{name:/60秒チャレンジ/}).click();
    assert.match(await page.locator('#play-clock').innerText(),/残り/);
    let listeningXp=0;
    for(let i=0;i<6;i++){
      if(await page.locator('#play-audio').count()){
        await unlockListening(page);
        listeningXp+=16; // Verified comprehension is rewarded, unlike skipped speaking.
      }else{
        await page.locator('#spoken-answer').fill('I do not know yet.');
        await page.locator('#show-answer').click();
        await page.locator('#show-example').click();
      }
      await page.locator('#next-question').click();
    }
    assert.equal(await page.locator('#result-view').isVisible(),true);
    await page.locator('#result-home').click();
    await page.reload();
    assert.match(await page.locator('#hero-monster-name').innerText(),/Soxie/);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(saved.completedRuns,1);assert.ok(saved.totalAnswers>=9);
    assert.ok(saved.ownedMonsters.includes('katappo'));
    assert.equal(saved.monsterXp.katappo,trainingEarned);
    assert.equal(saved.xpWallet,listeningXp); // Skips give zero XP; genuine listening comprehension earns XP.
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-persisted.png`),fullPage:true});
    await context.close();
    assert.deepEqual(pageErrors,[],`${engine}: gameplay must not throw uncaught JavaScript errors on any tested mobile screen`);
    console.log(`${engine}: 320/375/390/430 responsive, listening fallback, capture, XP banking/allocation, 60-sec flow and persistence passed`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
