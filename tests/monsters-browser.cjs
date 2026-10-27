const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
  const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  const shots=path.join(process.cwd(),'qa-screenshots');fs.mkdirSync(shots,{recursive:true});
  const base=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
  const boot=async width=>{
    const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:engine==='webkit',hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage();
    page.on('pageerror',error=>console.error('[monsters-pageerror]',error.message));
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
    if(await page.locator('#home-navigation').isVisible())
      await page.locator(`[data-home-page="${target}"]`).click();
  };
  const unlockListening=async page=>{
    if(!await page.locator('#play-audio').count())return;
    await page.locator('#play-audio').click();
    const correct=await page.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const {listeningChallengeFor}=await import('./listening-challenges.js');
      return listeningChallengeFor(ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)).correctIndex;
    });
    await page.locator(`[data-listening-choice="${correct}"]`).click();
  };
  try{
    for(const width of [320,375,390,430]){
      const {context,page}=await boot(width);
      assert.equal(await page.getByRole('heading',{name:/今日は、何を練習する/}).isVisible(),true);
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
      await enterHomePanel(page,'training');
    await page.getByRole('button',{name:/まず練習する/}).click();
      const playMetrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(playMetrics.scroll<=playMetrics.inner+1,`${engine}/${width} question horizontal overflow: ${JSON.stringify(playMetrics)}`);
      await page.screenshot({path:path.join(shots,`monsters-${engine}-${width}-question.png`),fullPage:true});
      await context.close();
    }
    // The home is an actual menu, not eight stacked screens. Tutorial works on mobile.
    const {context:menuContext,page:menuPage}=await boot(390);
    assert.equal(await menuPage.locator('#home-navigation [data-home-page]').count(),8);
    assert.equal(await menuPage.locator('#home-navigation').isVisible(),true);
    assert.equal(await menuPage.locator('.home-destination:visible').count(),0);
    await menuPage.locator('[data-home-page="tutorial"]').click();
    assert.equal(await menuPage.locator('#monsters-tutorial').isVisible(),true);
    assert.match(await menuPage.locator('#tutorial-heading').innerText(),/今日の5分ジム/);
    await menuPage.locator('#tutorial-next').click();
    await menuPage.locator('#tutorial-next').click();
    assert.match(await menuPage.locator('#tutorial-description').innerText(),/iPhone/);
    await menuPage.locator('#tutorial-close').click();
    assert.equal(await menuPage.locator('#monsters-tutorial').isVisible(),false);
    await menuPage.locator('[data-home-page="forest"]').click();
    assert.equal(await menuPage.locator('#forest-invite-title').isVisible(),true);
    await menuPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    assert.equal(await menuPage.locator('#home-navigation').isVisible(),true);
    await menuPage.locator('[data-home-page="review"]').click();
    assert.equal(await menuPage.locator('#saved-review-title').isVisible(),true);
    assert.equal(await menuPage.locator('#review-journal-title').isVisible(),true);
    await menuContext.close();
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
      await unlockListening(gymPage);
      const id=await gymPage.locator('#play-card').getAttribute('data-prompt-id');
      allDaily.push(id);
      const answer=await gymPage.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
      });
      if(i===0){
        await gymPage.locator('#bookmark-question').click();
        assert.equal(await gymPage.locator('#bookmark-question').getAttribute('aria-pressed'),'true');
      }
      await gymPage.locator('#spoken-answer').fill(answer);
      await gymPage.locator('#show-answer').click();
      assert.equal(await gymPage.locator('#next-question').isVisible(),true);
      const held=await gymPage.locator('#play-card').getAttribute('data-prompt-id');
      await gymPage.waitForTimeout(150);
      assert.equal(await gymPage.locator('#play-card').getAttribute('data-prompt-id'),held,'Explanation stays until next tap');
      await gymPage.locator('#next-question').click();
    }
    assert.equal(new Set(allDaily).size,8);
    assert.match(await gymPage.locator('#result-title').innerText(),/今日の5分ジム完了/);
    assert.match(await gymPage.locator('#result-rewards').innerText(),/ヒントなし正解率/);
    const gymSaved=await gymPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(gymSaved.dailyHistory.length,1);
    assert.equal(gymSaved.dailyHistory[0].total,8);
    assert.equal(gymSaved.dailyHistory[0].independent,8);
    assert.equal(gymSaved.savedPromptIds.length,1);
    await gymPage.locator('#result-home').click();
    assert.match(await gymPage.locator('#daily-last-rate').innerText(),/100%/);
    await gymContext.close();
    // Verify English-only task cards at both higher difficulties and narrow widths.
    for (const width of [320,375,390,430]) {
      const {context:levelContext,page:levelPage}=await boot(width);
      for (const difficulty of ['normal','hard']) {
        await enterHomePanel(levelPage,'training');
        await levelPage.locator(`[data-difficulty="${difficulty}"]`).click();
        assert.equal(await levelPage.locator(`[data-difficulty="${difficulty}"]`).getAttribute('aria-pressed'),'true');
        await levelPage.getByRole('button',{name:/まず練習する/}).click();
        assert.match(await levelPage.locator('#play-card').innerText(),/ENGLISH → ENGLISH/);
        if(await levelPage.locator('#play-audio').count()){
          assert.equal(await levelPage.locator('.task-panel').isVisible(),false,'Listening task text must start hidden');
          assert.equal(await levelPage.locator('#answer-area').isVisible(),false);
          await unlockListening(levelPage);
          assert.equal(await levelPage.locator('[data-listening-choice]').count(),difficulty==='hard'?4:3);
          assert.equal(await levelPage.locator('.task-panel').isVisible(),true,'Response context appears after audio comprehension');
        }else assert.equal(await levelPage.locator('.task-panel').isVisible(),true);
        assert.equal(await levelPage.locator('#play-card').evaluate(el=>/[ぁ-んァ-ン一-龯]/.test(el.innerText)),false);
        const metrics=await levelPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
        assert.ok(metrics.scroll<=metrics.inner+1,`${engine}/${width} ${difficulty} overflow: ${JSON.stringify(metrics)}`);
        await levelPage.screenshot({path:path.join(shots,`monsters-${engine}-${width}-${difficulty}.png`),fullPage:true});
        await levelPage.locator('#leave-play').click();
      }
      await levelContext.close();
    }
    const {context:hardContext,page:hardPage}=await boot(390);
    await enterHomePanel(hardPage,'training');
    await hardPage.locator('[data-difficulty="hard"]').click();
    await hardPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    await hardPage.locator('[data-home-page="challenge"]').click();
    assert.match(await hardPage.locator('.question-top').innerText(),/1 \/ 3/);
    for(let i=0;i<3;i++){
      await unlockListening(hardPage);
      await hardPage.locator('#spoken-answer').fill('I do not know yet.');
      await hardPage.locator('#show-answer').click();
      await hardPage.locator('#show-example').click();
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
    await enterHomePanel(listenPage,'training');
    await listenPage.getByRole('button',{name:/まず練習する/}).click();
    assert.equal(await listenPage.locator('#play-card').getAttribute('data-prompt-id'),'late-call');
    assert.equal(await listenPage.locator('#answer-area').isVisible(),false);
    assert.equal(await listenPage.locator('#listening-response').isVisible(),false);
    const realAudio=listenPage.waitForResponse(response=>
      /\/audio\/listening\/late-call-[a-f0-9]{12}\.mp3$/.test(response.url())&&response.status()===200,
    {timeout:15000});
    await listenPage.locator('#play-audio').click();
    await realAudio;
    assert.equal(await listenPage.locator('[data-listening-choice]').count(),3);
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
    assert.equal(await listenPage.locator('#spoken-answer').evaluate(input=>document.activeElement===input),false,'Selecting a listening answer must not open the iOS keyboard');
    assert.equal(await listenPage.locator('#transcript').isVisible(),false,'Transcript stays hidden after listening success');
    await listenPage.locator('#spoken-answer').fill(listened.answer);
    await listenPage.locator('#show-answer').click();
    assert.match(await listenPage.locator('#feedback-panel').innerText(),/\+8 XP/);
    assert.equal(await listenPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),8);
    await listenContext.close();
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
    await coachPage.getByRole('button',{name:/まず練習する/}).click();
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
    await weakPage.locator('#start-forest').click();
    await weakPage.locator('#forest-explore-continue').click();
    const firstAnswer=await weakPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await weakPage.locator('#spoken-answer').fill(firstAnswer);
    await weakPage.locator('#show-answer').click();
    await weakPage.locator('#next-question').click();
    await weakPage.locator('[data-forest-route="moss"]').click();
    if(await weakPage.locator('#forest-explore-screen').isVisible())await weakPage.locator('#forest-explore-continue').click();
    await unlockListening(weakPage);
    const listeningAnswer=await weakPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await weakPage.locator('#spoken-answer').fill(listeningAnswer);
    await weakPage.locator('#show-answer').click();
    await weakPage.locator('#next-question').click();
    if(await weakPage.locator('#forest-explore-screen').isVisible())await weakPage.locator('#forest-explore-continue').click();
    assert.equal(await weakPage.locator('#play-card').getAttribute('data-prompt-id'),'forest-vocab-ticket-easy');
    assert.match(await weakPage.locator('.forest-review-banner').innerText(),/苦手の再挑戦/);
    await weakPage.locator('#spoken-answer').fill('wrong vocabulary word');
    await weakPage.locator('#show-answer').click();
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
    await practicePage.locator('#start-forest').click();
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
    assert.equal(await practicePage.locator('#forest-explore-options').isVisible(),true,'Opt-in practice should advance without demanding the model sentence');
    assert.equal(await practicePage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')).xpWallet),practiceXp,'No XP for unverified expression');
    await practicePage.locator('#leave-play').click();
    await enterHomePanel(practicePage,'review');
    assert.match(await practicePage.locator('#start-saved-review').innerText(),/1問/);
    assert.match(await practicePage.locator('#saved-question-list').innerText(),/森|カフェ|待ち合わせ|旅行|英語|聞/);
    await enterHomePanel(practicePage,'review');
    await practicePage.locator('#start-saved-review').click();
    assert.equal(await practicePage.locator('#play-card').getAttribute('data-prompt-id'),recordedPrompt);
    assert.equal(await practicePage.locator('#forest-journey').isVisible(),false,'Saved review must have no RPG battles');
    assert.equal(await practicePage.locator('#play-view').evaluate(el=>el.classList.contains('review-only')),true);
    await practicePage.locator('#leave-play').click();
    await practiceContext.close();
    // Full 5-mob + 3-hit-boss adventure on responsive viewports.
    for(const width of [320,375,390,430]){
      const {context:forestContext,page:forestPage}=await boot(width);
      await enterHomePanel(forestPage,'forest');
    await forestPage.locator('#start-forest').click();
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),true);
      assert.equal(await forestPage.locator('#forest-journey').isVisible(),false);
      assert.equal(await forestPage.locator('#forest-explore-art > svg').count(),1);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-explore.png`),fullPage:true});
      await forestPage.locator('#forest-explore-continue').click();
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
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-route'),'wild');
      assert.match(await forestPage.locator('#forest-foe-name').innerText(),/Mossling/);
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-foe'),'mossling');
      assert.match(await forestPage.locator('#forest-foe-pattern').innerText(),/霧のこだま/);
      assert.match(await forestPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 5/);
      const battleMetrics=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(battleMetrics.scroll<=battleMetrics.inner+1,`${engine}/${width} forest battle overflow: ${JSON.stringify(battleMetrics)}`);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-battle.png`),fullPage:true});
      const answer=async()=>{
        if(await forestPage.locator('#play-audio').count()){
          assert.equal(await forestPage.locator('#answer-area').isVisible(),false);
          await unlockListening(forestPage);
          assert.equal(await forestPage.locator('#answer-area').isVisible(),true);
        }
        const example=await forestPage.evaluate(async()=>{
          const {ALL_PROMPTS}=await import('./monster-data.js');
          return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
        });
        await forestPage.locator('#spoken-answer').fill(example);
        await forestPage.locator('#show-answer').click();
        assert.match(await forestPage.locator('#feedback-panel').innerText(),/関門突破/);
        assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-attack')),true);
        assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-guarding')),false);
        assert.equal(await forestPage.locator('#forest-damage').isVisible(),true);
        const action=await forestPage.locator('#forest-world-stage').getAttribute('data-action');
        assert.match(await forestPage.locator('#forest-battle-log').innerText(),/1ダメージ！/);
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
      assert.match(await forestPage.locator('#forest-battle-log').innerText(),/霧に身を隠して.*判定保留.*攻撃は発生しません/);
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-guarding')),true);
      assert.equal(await forestPage.locator('#forest-guard svg').count(),1);
      assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'1');
      await forestPage.locator('#show-example').click();
      await moveOn();
      assert.match(await forestPage.locator('.question-top').innerText(),/ENCOUNTER 1 \/ 5/);
      await answer();
      await moveOn();
      assert.match(await forestPage.locator('#forest-explore-title').innerText(),/分かれ道/);
      assert.equal(await forestPage.locator('#forest-explore-screen').isVisible(),true);
      assert.equal(await forestPage.locator('#answer-area').isVisible(),false);
      assert.equal(await forestPage.locator('[data-forest-route]').count(),2);
      const routeMetrics=await forestPage.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(routeMetrics.scroll<=routeMetrics.inner+1,`${engine}/${width} forest choice overflow: ${JSON.stringify(routeMetrics)}`);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-route.png`),fullPage:true});
      await forestPage.locator('[data-forest-route="moss"]').click();
      assert.equal(await forestPage.locator('#forest-explore-art').getAttribute('data-route'),'moss');
      if(await forestPage.locator('#forest-explore-screen').isVisible())await forestPage.locator('#forest-explore-continue').click();
      await forestPage.locator('#forest-journey').waitFor({state:'visible'});
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-route'),'moss');
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
        if(mob===3 || mob===4){
          assert.match(await forestPage.locator('.forest-teaching-title').innerText(),mob===3?/なぜこの単語を使う/:/なぜこの語順になる/);
          assert.match(await forestPage.locator('#forest-auto-status').innerText(),/準備ができたら次へ/);
          assert.equal(await forestPage.locator('#pause-auto').count(),0);
          assert.ok((await forestPage.locator('.feedback-note').innerText()).length>35,'Objective quizzes should explain the answer, not only mark it right');
        }
        await moveOn();
        if(await forestPage.locator('#forest-explore-screen').isVisible()){
          if(mob===4){
            // One interactive story event per chapter, before the fifth foe.
            // Choosing a scene must not affect XP, attempts or language gates.
            assert.equal(await forestPage.locator('#forest-explore-event').isVisible(),true);
            assert.equal(await forestPage.locator('[data-forest-event-option]').count(),2);
            assert.equal(await forestPage.locator('#forest-explore-continue').isVisible(),true,'Optional story may be skipped');
            const beforeChoice=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
            await forestPage.locator('[data-forest-event-option]').first().click();
            assert.match(await forestPage.locator('#forest-explore-event').innerText(),/探索の記録|EXPEDITION MEMORY/);
            assert.equal(await forestPage.locator('[data-forest-event-option]').count(),0);
            const afterChoice=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
            assert.equal(afterChoice.xpWallet,beforeChoice.xpWallet,'Story choices cannot award XP');
            assert.deepEqual(afterChoice.ownedMonsters,beforeChoice.ownedMonsters);
            assert.deepEqual(afterChoice.progress,beforeChoice.progress);
            assert.deepEqual(afterChoice.reviewPrompts,beforeChoice.reviewPrompts);
            assert.equal(afterChoice.forest.journal.length,beforeChoice.forest.journal.length+1,'Events should persist to the adventure journal');
            assert.equal(afterChoice.forest.journal.at(-1).eventId,'entry-moss');
          }
          await forestPage.locator('#forest-explore-continue').click();
        }
        await forestPage.locator('#forest-journey').waitFor({state:'visible'});
      }
      assert.match(await forestPage.locator('.question-top').innerText(),/BOSS ATTACK 1 \/ 3/);
      assert.equal(await forestPage.locator('.battle-arena-svg').getAttribute('data-arena'),'thorn-vault');
      assert.match(await forestPage.locator('#forest-foe-name').innerText(),/Thorn King/);
      assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),'3');
      assert.equal(await forestPage.locator('#forest-world-stage').evaluate(el=>el.classList.contains('forest-boss-stage')),true);
      assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-boss-power'),'echo');
      assert.match(await forestPage.locator('.forest-boss-special').textContent(),/練習のポイント.*聞いた意味/);
      await forestPage.screenshot({path:path.join(shots,`forest-${engine}-${width}-boss.png`),fullPage:true});
      for(let hit=1;hit<=3;hit++){
        assert.match(await forestPage.locator('.question-top').innerText(),new RegExp('BOSS ATTACK '+hit+' \/ 3'));
        assert.match(await forestPage.locator('.forest-boss-dialogue').innerText(),new RegExp('BOSS DIALOGUE · '+hit+'\/3'));
        assert.equal(await forestPage.locator('#play-card').getAttribute('data-prompt-id'),['late-call','forest-grammar-arrive-easy','boss-delay-apology-easy'][hit-1]);
        assert.equal(await forestPage.locator('#forest-world-stage').getAttribute('data-action'),hit===1?'defense':hit===2?'spell':'attack');
        assert.match(await forestPage.locator('#forest-foe-pattern').innerText(),/こだま|暗号|トゲ王の問い/);
        await answer();
        assert.equal(await forestPage.locator('#forest-boss-hp').getAttribute('aria-valuenow'),String(3-hit));
        if(hit===3)assert.match(await forestPage.locator('#forest-battle-log').innerText(),/Thorn Kingをたおした！/);
        await moveOn();
      }
      assert.equal(await forestPage.locator('#result-view').isVisible(),true);
      assert.match(await forestPage.locator('#result-title').innerText(),/ボスを討伐/);
      assert.match(await forestPage.locator('#result-discoveries').innerText(),/Mosslight/);
      assert.match(await forestPage.locator('#result-discoveries').innerText(),/探索の記録/);
      assert.match(await forestPage.locator('#result-rewards').innerText(),/120 XP/);
      await forestPage.locator('#result-collection').click();
      assert.match(await forestPage.locator('#forest-collection-relics').innerText(),/Mosslight/);
      assert.match(await forestPage.locator('#forest-journal-summary').innerText(),/イベント 1\/8種類/);
      assert.match(await forestPage.locator('#forest-journal-events').innerText(),/光るキノコの輪/);
      await forestPage.reload();
      await forestPage.locator('[data-home-page="collection"]').click();
      assert.match(await forestPage.locator('#forest-collection-relics').innerText(),/Mosslight/);
      await forestPage.locator('#collection-home').click();
      assert.match(await forestPage.locator('#forest-home-progress').innerText(),/討伐 1回/);
      const saved=await forestPage.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
      assert.equal(saved.forest.clears,1);
      assert.deepEqual(saved.forest.relics,['moss-lantern']);
      assert.equal(saved.forest.journal.length,1);
      assert.equal(saved.forest.journal[0].eventId,'entry-moss');
      assert.equal(saved.xpWallet,120);
      await forestContext.close();
    }
    // Explanations remain visible until the learner chooses to continue.
    // A route remains a manual choice, without an automatic explanation timer.
    const {context:autoContext,page:autoPage}=await boot(390);
    const autoAnswer=async()=>{
      await unlockListening(autoPage);
      const answer=await autoPage.evaluate(async()=>{
        const {ALL_PROMPTS}=await import('./monster-data.js');
        return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
      });
      await autoPage.locator('#spoken-answer').fill(answer);
      await autoPage.locator('#show-answer').click();
    };
    await enterHomePanel(autoPage,'forest');
    await autoPage.locator('#start-forest').click();
    await autoPage.locator('#forest-explore-continue').click();
    await autoAnswer();
    assert.match(await autoPage.locator('#forest-auto-status').innerText(),/準備ができたら次へ/);
    const firstPrompt=await autoPage.locator('#play-card').getAttribute('data-prompt-id');
    await autoPage.waitForTimeout(3000);
    assert.equal(await autoPage.locator('#play-card').getAttribute('data-prompt-id'),firstPrompt,'Reading time is unlimited');
    assert.equal(await autoPage.locator('#next-question').isVisible(),true);
    await autoPage.locator('#next-question').click();
    assert.match(await autoPage.locator('#forest-explore-title').innerText(),/分かれ道/);
    await autoPage.locator('[data-forest-route="sunlit"]').click();
    await autoPage.locator('#forest-journey').waitFor({state:'visible',timeoutMs:4500});
    assert.match(await autoPage.locator('.question-top').innerText(),/ENCOUNTER 2/);
    await autoAnswer();
    assert.match(await autoPage.locator('#forest-combo').innerText(),/2 HIT COMBO/);
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
    await autoPage.locator('#leave-play').click();
    assert.equal(await autoPage.locator('#home-view').isVisible(),true);
    await autoContext.close();
    // Endless mode limits attempts by difficulty; ambiguous results are not falsely called wrong.
    const {context:endlessContext,page:endlessPage}=await boot(390);
    await enterHomePanel(endlessPage,'training');
    await endlessPage.locator('[data-difficulty="hard"]').click();
    await endlessPage.locator('.home-destination:not([hidden]) .home-menu-back').click();
    await enterHomePanel(endlessPage,'forest');
    await endlessPage.locator('#start-forest-endless').click();
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
    if(await endlessPage.locator('#forest-explore-screen').isVisible()){
      await endlessPage.locator('[data-forest-route="moss"]').click();
      if(await endlessPage.locator('#forest-explore-screen').isVisible())await endlessPage.locator('#forest-explore-continue').click();
    }
    // Continue past the listening task with an authored answer, then verify
    // that an objectively incorrect vocabulary choice does spend the try.
    await unlockListening(endlessPage);
    const endlessListeningAnswer=await endlessPage.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await endlessPage.locator('#spoken-answer').fill(endlessListeningAnswer);
    await endlessPage.locator('#show-answer').click();
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
    await micPage.getByRole('button',{name:/まず練習する/}).click();
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
    assert.equal(await micPage.evaluate(()=>window.__activeMic.stopped),true);
    assert.equal(await micPage.evaluate(()=>Boolean(window.__activeMic.aborted)),false,'Stopping must not discard pending speech');
    await micPage.evaluate(()=>window.__activeMic.onresult({results:[Object.assign([{transcript:'Could you help me?'}],{isFinal:true})]}));
    assert.equal(await micPage.locator('#spoken-answer').inputValue(),'Could you help me?');
    assert.equal(await micPage.locator('#retry-mic').isVisible(),true);
    await micButton.click();
    await micPage.evaluate(()=>window.__activeMic.onerror?.({error:'not-allowed'}));
    assert.equal(await micButton.getAttribute('aria-pressed'),'false');
    assert.match(await micPage.locator('#speech-helper').innerText(),/許可されていません/);
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
    await micPage.locator('#leave-play').click();
    assert.equal(await micPage.locator('#home-view').isVisible(),true);
    assert.equal(await micPage.locator('#play-view').isVisible(),false);
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
    await iosPage.getByRole('button',{name:/まず練習する/}).click();
    await unlockListening(iosPage);
    assert.equal(await iosPage.locator('#speech-alternatives').isVisible(),true);
    assert.equal(await iosPage.locator('#native-dictation').isVisible(),true);
    await iosPage.locator('#mic-button').click();
    assert.equal(await iosPage.locator('#mic-button').getAttribute('aria-pressed'),'true');
    await iosPage.evaluate(()=>window.__silentSpeech.onend());
    assert.equal(await iosPage.locator('#mic-button').getAttribute('aria-pressed'),'false');
    await iosPage.locator('#mic-button').click();
    await iosPage.evaluate(()=>window.__silentSpeech.onend());
    assert.match(await iosPage.locator('#speech-helper').innerText(),/声を文字にできていません/);
    await iosPage.locator('#native-dictation').click();
    assert.equal(await iosPage.locator('#spoken-answer').evaluate(e=>document.activeElement===e),true,'Native keyboard fallback must focus the editable field after an explicit tap');
    await iosPage.locator('#spoken-answer').fill('That is fine with me.');
    assert.equal(await iosPage.locator('#spoken-answer').inputValue(),'That is fine with me.');
    await iosContext.close();
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
    await page.getByRole('button',{name:/まず練習する/}).click();
    assert.match(await page.locator('#play-mode-label').innerText(),/練習モード/);
    assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'think-trip');
    assert.equal(await page.locator('#answer-area').isVisible(),false,'Cannot answer listening without comprehension');
    assert.equal(await page.locator('#listening-meaning').isVisible(),false);
    assert.equal(await page.locator('#listening-response').isVisible(),false);
    assert.equal(await page.locator('#play-card').innerText().then(text=>text.includes('book the tour now')),false);
    assert.equal(await page.locator('#reveal-transcript').isVisible(),true);
    await page.locator('#reveal-transcript').click();
    assert.match(await page.locator('#transcript').innerText(),/book the tour now/);
    const correct=await page.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      const {listeningChallengeFor}=await import('./listening-challenges.js');
      return listeningChallengeFor(ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId)).correctIndex;
    });
    await page.locator(`[data-listening-choice="${correct}"]`).click();
    await page.locator('#show-answer').click(); // Empty answer never grants XP.
    assert.match(await page.locator('#feedback-panel').innerText(),/英語を入力/);
    await page.locator('#show-hint').click();
    assert.match(await page.locator('#hint-panel').innerText(),/Let me/);
    await page.locator('#spoken-answer').fill('Let me think about it.');
    await page.locator('#show-answer').click();
    assert.match(await page.locator('.feedback-answer').innerText(),/Let me think/);
    assert.match(await page.locator('#feedback-panel').innerText(),/\+8 XP/); // Hint lowers awarded XP.
    await page.locator('#next-question').click();
    for(let i=0;i<2;i++){
      assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),['repeat-station','agree-friend'][i]);
      await unlockListening(page);
      await page.locator('#spoken-answer').fill(i===0?'Could you say that again?':'That works for me.');
      await page.locator('#show-answer').click();
      assert.match(await page.locator('#feedback-panel').innerText(),/\+16 XP/);
      await page.locator('#next-question').click();
    }
    await page.locator('#result-view').waitFor({state:'visible'});
    assert.match(await page.locator('#result-discoveries').innerText(),/Soxie/);
    assert.match(await page.locator('#result-rewards').innerText(),/40 XP ストック/);
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-result.png`),fullPage:true});
    await page.locator('#result-collection').click();
    assert.equal(await page.locator('#collection-wallet').innerText(),'40 XP');
    assert.equal(await page.locator('#collection-grid [data-feed-monster]').count(),0);
    await page.locator('[data-open-monster="katappo"]').click();
    assert.equal(await page.locator('#detail-view').isVisible(),true);
    assert.match(await page.locator('#detail-content').innerText(),/sock/);
    assert.equal(await page.locator('[data-pronounce-word="sock"]').isVisible(),true);
    await page.locator('#open-training').click();
    assert.equal(await page.locator('#training-view').isVisible(),true);
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="10"]').click();
    assert.equal(await page.locator('#training-wallet').innerText(),'30 XP');
    await page.locator('[data-feed-monster="katappo"][data-feed-amount="all"]').click();
    assert.equal(await page.locator('#training-wallet').innerText(),'0 XP');
    assert.match(await page.locator('#growth-feedback').innerText(),/Soxieに30 XP/);
    await page.locator('#training-back').click();
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-collection.png`),fullPage:true});
    const collectionMetrics=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(collectionMetrics.scroll<=collectionMetrics.inner+1,`${engine}/390 collection horizontal overflow: ${JSON.stringify(collectionMetrics)}`);
    await page.locator('[data-select-monster="katappo"]').click();
    await page.locator('#detail-back').click();
    await page.locator('#collection-home').click();
    assert.match(await page.locator('#stat-independent').innerText(),/4 \/ 16/);
    assert.match(await page.locator('#hero-monster-name').innerText(),/Soxie/);
    await page.getByRole('button',{name:/60秒チャレンジ/}).click();
    assert.match(await page.locator('#play-clock').innerText(),/残り/);
    for(let i=0;i<6;i++){
      await unlockListening(page);
      await page.locator('#spoken-answer').fill('I do not know yet.');
      await page.locator('#show-answer').click();
      await page.locator('#show-example').click();
      await page.locator('#next-question').click();
    }
    assert.equal(await page.locator('#result-view').isVisible(),true);
    await page.locator('#result-home').click();
    await page.reload();
    assert.match(await page.locator('#hero-monster-name').innerText(),/Soxie/);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
    assert.equal(saved.completedRuns,1);assert.ok(saved.totalAnswers>=9);
    assert.ok(saved.ownedMonsters.includes('katappo'));
    assert.equal(saved.monsterXp.katappo,40);
    assert.equal(saved.xpWallet,0); // Skipping questions never grants XP.
    await page.screenshot({path:path.join(shots,`monsters-${engine}-390-persisted.png`),fullPage:true});
    await context.close();
    console.log(`${engine}: 320/375/390/430 responsive, listening fallback, capture, XP banking/allocation, 60-sec flow and persistence passed`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
