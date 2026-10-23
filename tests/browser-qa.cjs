// Run against local HTTP server; external APIs are blocked, no real users or quotas.
const {chromium,webkit,devices}=require('playwright');const engine=process.env.SPEAKINGYM_BROWSER_ENGINE||'chromium';const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 assert.ok(['chromium','webkit'].includes(engine),'Only offline Chromium/WebKit QA is allowed');const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});fs.mkdirSync('qa-screenshots',{recursive:true});const results=[];
 try{for(const width of [390,1280]){
  const context=await browser.newContext(engine==='webkit'&&width===390?{...devices['iPhone 13'],viewport:{width,height:900}}:{viewport:{width,height:900}});
  await context.route('https://**/*',r=>r.abort());
  await context.addInitScript(()=>{const listeners={};window.__spoken=[];window.__qaSpeechRecognizer=null;window.SpeechRecognition=class{constructor(){window.__qaSpeechRecognizer=this;}start(){this.onstart?.()}abort(){}emit(words,isFinal=true){this.onresult?.({results:[Object.assign([{transcript:words}],{isFinal})]})}};window.webkitSpeechRecognition=window.SpeechRecognition;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Basic',lang:'en-US',voiceURI:'basic',localService:true},{name:'Natural English',lang:'en-GB',voiceURI:'natural'}],addEventListener:(n,f)=>listeners[n]=f,speak:u=>window.__spoken.push({text:u.text,voice:u.voice?.voiceURI,rate:u.rate}),cancel(){},paused:false}})});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Verify the real consent UI before running guest learning interactions.
  const googleRequests=[];
  page.on('request',request=>{if(/google(tagmanager|analytics)\\.com/.test(request.url()))googleRequests.push(request.url())});
  await page.goto('http://127.0.0.1:8765/privacy.html');
  assert.equal(await page.getByRole('region',{name:'任意のアクセス解析'}).count(),1);
  assert.equal(await page.locator('script[data-sg-ga4-loader]').count(),0);
  assert.equal(googleRequests.length,0);
  await page.getByRole('button',{name:'同意しない',exact:true}).click();
  await page.reload();
  assert.equal(await page.locator('#sg-analytics-consent-status').textContent(),'任意のアクセス解析：拒否中');
  assert.equal(await page.locator('script[data-sg-ga4-loader]').count(),0);
  assert.equal(googleRequests.length,0);
  await page.getByRole('button',{name:'計測に同意する',exact:true}).click();
  assert.equal(await page.locator('script[data-sg-ga4-loader]').getAttribute('src'),'https://www.googletagmanager.com/gtag/js?id=G-DRH440861Y');
  assert.equal(await page.locator('#sg-analytics-consent-status').textContent(),'任意のアクセス解析：同意済み');
  await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'計測に同意しない',exact:true}).click()]);
  assert.equal(await page.locator('#sg-analytics-consent-status').textContent(),'任意のアクセス解析：拒否中');
  assert.equal(await page.locator('script[data-sg-ga4-loader]').count(),0);
  const requestsAfterRevoke=googleRequests.length;
  for(const path of ['index.html','account.html','phrasebook.html','plans.html','privacy.html','terms.html','contact.html','mission.html','scenes.html?scene=taxi','pro-demo.html','freeze-breaker.html','reflex.html']){
   await page.goto('http://127.0.0.1:8765/'+path);await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width+' '+path);
   if(path==='index.html'){
    assert.equal(await page.locator('#workouts .workouts > .workout').count(),4);
    for(const dest of ['scenes.html','reflex.html','freeze-breaker.html','phrasebook.html']){
     assert.equal(await page.locator('#workouts .workouts a[href="./'+dest+'"]').count()>0,true,
      'four-workout route visible: '+dest);
    }
    assert.equal(await page.locator('a[href="./classic.html"]').count(),0);
    assert.equal(await page.locator('a[href="./mission.html"]').count(),0);
   }
   if(path==='account.html'){
    for(const dest of ['scenes.html','reflex.html','freeze-breaker.html','phrasebook.html']){
     assert.equal(await page.locator('.shortcut-row a[href="./'+dest+'"]').count(),1);
    }
    assert.equal(await page.locator('a[href="./pro-study.html"]').count(),0);
   }
   if(path==='phrasebook.html'){
    assert.equal(await page.locator('h1').textContent(),'マイ復習帳');
    assert.equal(await page.locator('#source').count(),1);
    assert.equal(await page.locator('#phrases').count(),1);
    assert.equal(await page.locator('.review-hub a[href="./pro-study.html"]').count(),1);
    assert.equal(await page.locator('.review-hub a[href="./pro-demo.html"]').count(),1);
   }
   if(path==='reflex.html'){
    assert.equal(await page.locator('#requestTeacher').textContent(),
     '✨ 追加のAI講評を受ける（任意・回数消費）');
    assert.equal(await page.locator('a[href="./classic.html"]').count(),0);
   }
   if(path.startsWith('scenes')){
    assert.equal(await page.locator('[data-scene="taxi"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('[data-scene]').count(),16);
    await page.locator('#start').click();
    await page.locator('#loginPrompt').waitFor({state:'visible'});
    assert.equal(await page.locator('#inlineGoogleLogin').count(),1,'direct login CTA should appear without leaving scene');
    assert.equal(await page.locator('#practice').isVisible(),false,'guest must not enter paid AI practice');
    await page.locator('#inlineGoogleLogin').click();
    assert.match(await page.locator('#inlineLoginHelp').textContent(),/ログインを準備中|Googleログインを開きます/);
    await page.evaluate(()=>{
     const accountButton=document.getElementById('sg-login');
     if(accountButton){
      window.__inlineLoginTriggered=false;
      accountButton.disabled=false;
      accountButton.addEventListener('click',()=>{window.__inlineLoginTriggered=true});
     }
    });
    assert.equal(await page.locator('#sg-login').count(),1,'existing account login bar is reused');
    await page.locator('#inlineGoogleLogin').click();
    assert.equal(await page.evaluate(()=>window.__inlineLoginTriggered),true,'same-page login button forwards a real user click');
    await page.evaluate(()=>{
     window.speakingymAccount={isLoggedIn:()=>true,getIdToken:async()=>null};
     window.dispatchEvent(new Event('speakingym:account-ready'));
    });
    assert.equal(await page.locator('#loginPrompt').isVisible(),false);
    assert.equal(await page.locator('[data-scene="taxi"]').getAttribute('aria-pressed'),'true','selected scene preserved');
    await page.locator('[data-scene="hotel"]').click();
    assert.equal(new URL(page.url()).searchParams.get('scene'),'hotel','selection must be reflected in URL');
    await page.reload();
    assert.equal(await page.locator('[data-scene="hotel"]').getAttribute('aria-pressed'),'true','Firebase sync reload must retain selected scene');
   }
   if(path==='freeze-breaker.html'){
    await page.locator('#start-button').waitFor({state:'visible'});
    assert.equal(await page.locator('#mission-select option').count(),7);
    assert.equal(await page.locator('#stat-attempts').textContent(),'0');
    await page.locator('#start-button').click();
    const freezeDebug=await page.evaluate(()=>({
     hidden:document.getElementById('mission')?.hidden,
     selected:document.getElementById('mission-select')?.value,
     owner:localStorage.getItem('speakingym-account-owner-v1'),
     loggedIn:window.speakingymAccount?.isLoggedIn?.(),
     uid:window.speakingymAccount?.getUid?.(),
     warning:document.getElementById('save-warning')?.textContent,
     startDisabled:document.getElementById('start-button')?.disabled
    }));
    assert.equal(await page.locator('#mission').isVisible(),true,
     'Freeze Breaker start state: '+JSON.stringify(freezeDebug)+
     ' errors: '+JSON.stringify(errors.slice(-4)));
    assert.match(await page.locator('#dialogue').textContent(),/oat milk/);
    await page.locator('#speak-dialogue').click();
    assert.ok(await page.evaluate(()=>window.__spoken.some(x=>x.text.includes('oat milk'))));
    await page.locator('#reason-buttons button[data-reason="surprise"]').click();
    assert.match(await page.locator('#rescue-line').textContent(),/give me a second/);
    await page.locator('#repair-next').click();
    assert.equal(await page.locator('#step-retry').isVisible(),true);
    await page.locator('#reply-note').fill('Could you give me a moment?');
    await page.locator('#show-hint').click();
    await page.locator('#said-yes').click();
    assert.equal(await page.locator('#stat-attempts').textContent(),'1');
    assert.equal(await page.locator('#stat-recovered').textContent(),'0',
     'hint-assisted response is not claimed as independent success');
    const guestSaved=await page.evaluate(()=>localStorage.getItem('speakingym-freeze-progress-v1:guest'));
    assert.ok(guestSaved);
    assert.doesNotMatch(guestSaved,/Could you give me a moment/,'typed answer must never be saved');
    await page.locator('#retry-scene').click();
    assert.match(await page.locator('#dialogue').textContent(),/machine is broken/,
     'same scene retry rotates the surprise');
    await page.locator('#reason-buttons button[data-reason="words"]').click();
    await page.locator('#repair-next').click();
    await page.locator('#said-yes').click();
    assert.equal(await page.locator('#stat-attempts').textContent(),'2');
    assert.equal(await page.locator('#stat-recovered').textContent(),'1');
    await page.evaluate(()=>{
     window.dispatchEvent(new Event('speakingym:account-changing'));
     localStorage.setItem('speakingym-account-owner-v1','browser-owner-A');
     window.speakingymAccount={isLoggedIn:()=>true,getUid:()=> 'browser-owner-A',getIdToken:async()=>null};
     window.dispatchEvent(new Event('speakingym:account-ready'));
    });
    assert.equal(await page.locator('#stat-attempts').textContent(),'0',
     'guest data may not be rendered for a new authenticated owner');
    await page.locator('#start-button').click();
    assert.equal(await page.locator('#mission').isVisible(),true);
    await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
    assert.equal(await page.locator('#mission').isVisible(),false);
    assert.equal(await page.locator('#start-button').isDisabled(),true);
   }
   if(path==='pro-demo.html'){
    await page.locator('#demo-review-list li.review-card').first().waitFor();
    assert.equal(await page.locator('#demo-review-list li.review-card').count(),5,
     'guest demo must show five example review cards without login');
    assert.equal(await page.locator('#demo-plan li').count(),3,
     'guest should see five-minute sample plan');
    await page.locator('#demo-review-list button[aria-label^="言えた："]').first().click();
    assert.match(await page.locator('#demo-review-status').textContent(),/次の復習日/);
    await page.locator('#demo-undo').click();
    assert.match(await page.locator('#demo-review-status').textContent(),/取り消した/);
    await page.locator('#demo-review-list button[aria-label^="言えた："]').first().click();
    await page.locator('#demo-next-day').click();
    assert.match(await page.locator('#demo-day').textContent(),/練習2日目/);
    await page.locator('#demo-reset').click();
    assert.equal(await page.locator('#demo-review-list li.review-card').count(),5);
    assert.match(await page.locator('#demo-day').textContent(),/練習1日目/);
   }
   await page.screenshot({path:'qa-screenshots/'+engine+'-'+width+'-'+path.split('.')[0]+'.png',fullPage:true});results.push({width,path,status:'passed'});
  }
  assert.equal(googleRequests.length,requestsAfterRevoke,'refused visits must not request Google analytics');
  await page.selectOption('#mode','カフェ');await page.click('#start');assert.match(await page.locator('#category').textContent(),/^カフェ \/ STANDARD$/);
  assert.equal(await page.locator('#hintPanel').evaluate(el=>el.open),false,'model hint hidden until learner requests it');
  await page.locator('#hintPanel summary').click();
  assert.equal(await page.locator('#hintPanel').evaluate(el=>el.open),true);
  const cue=await page.locator('#hintText').textContent();
  assert.ok(cue.trim().length>=16,'a helpful learning cue should be visible');
  // Browser-level microphone QA uses a synthetic recognition engine. The
  // iPhone WebKit viewport is tested, but no physical mic/network speech API.
  await page.locator('#micBtn').click();
  await page.evaluate(()=>window.__qaSpeechRecognizer.emit('Could you please',false));
  assert.equal(await page.locator('#transcript').inputValue(),'Could you please');
  await page.locator('#stopMic').click();
  assert.equal(await page.locator('#transcript').inputValue(),'Could you please',
    'stopping speech recognition must preserve an unfinished answer');
  await page.locator('#resumeMic').click();
  await page.evaluate(()=>window.__qaSpeechRecognizer.emit('repeat that slowly',true));
  assert.equal(await page.locator('#transcript').inputValue(),'Could you please repeat that slowly',
    'resuming microphone must append instead of overwriting');
  await page.locator('#stopMic').click();
  await page.locator('#spoken').click();
  assert.equal(await page.locator('#hintPanel').evaluate(el=>el.open),false,'hint must close on the next question');
  // Freeze diagnosis is only asked in the post-workout review, never during the timer.
  await page.locator('#stuck').click();
  assert.equal(await page.locator('#diagnosisPanel').isVisible(),false);
  await page.locator('#finishEarly').click();
  assert.equal(await page.locator('#endPane').isVisible(),true);
  await page.locator('#reviewNext').click();
  assert.equal(await page.locator('#diagnosisPanel').isVisible(),true);
  assert.equal(await page.locator('#diagnosisChoices button').count(),6);
  await page.locator('#diagnosisChoices [data-reason="words"]').click();
  assert.match(await page.locator('#diagnosisSummaryText').textContent(),/単語が出てこなかった/);
  assert.equal(await page.locator('#diagnosisResult a').first().getAttribute('href'),'./freeze-breaker.html');
  assert.match(await page.evaluate(()=>localStorage.getItem('speakingym-sprint-reasons-v1:guest')||''),/words/);
  await page.locator('#reviewPrev').click();
  assert.equal(await page.locator('#diagnosisPanel').isVisible(),false,'diagnosis hidden for spoken answer');
  await page.locator('#reviewNext').click();
  assert.equal(await page.locator('#diagnosisChoices [data-reason="words"]').getAttribute('aria-pressed'),'true','reason persists across review navigation');
  await page.goto('http://127.0.0.1:8765/phrasebook.html');
  await page.evaluate(()=>{localStorage.setItem('speakingym-reflex-saved-phrases-v1',JSON.stringify([{id:'repair1:easy:quick',cardId:'repair1',kind:'quick',text:'Could you repeat that?',level:'easy',goal:'聞き返す'}]));window.speakingymPhrases.toggle({text:'Could I have oat milk?',sceneId:'cafe',level:'standard',source:'AIの言い換え'});window.dispatchEvent(new Event('speakingym:account-ready'))});
  assert.equal(await page.locator('#phrases article').count(),2);await page.click('#hide');assert.equal(await page.locator('.english:visible').count(),0);await page.getByRole('button',{name:'答えを見る'}).first().click();assert.equal(await page.locator('.english:visible').count(),1);
  await page.getByRole('button',{name:'音声で聞く'}).first().click();assert.equal(await page.evaluate(()=>window.__spoken.at(-1).voice),'natural');
  await page.locator('.sg-voice-settings summary').click();await page.getByLabel('英語の声',{exact:true}).selectOption('basic');await page.getByLabel('読み上げ速度').selectOption('0.75');
  await page.reload();await page.locator('.sg-voice-settings summary').click();assert.equal(await page.getByLabel('英語の声',{exact:true}).inputValue(),'basic');assert.equal(await page.getByLabel('読み上げ速度').inputValue(),'0.75');
  await page.selectOption('#source','AIの言い換え');assert.equal(await page.locator('#phrases article').count(),1);await page.getByRole('button',{name:'保存解除',exact:true}).click();assert.equal(await page.evaluate(()=>window.speakingymPhrases.list().length),1);
  // Emulate an API fetch that ignores abort and settles after the learner leaves.
  // Old practice generations must not reuse the next practice's session or send AI calls.
  await page.goto('http://127.0.0.1:8765/scenes.html?scene=cafe');
  await page.evaluate(()=>{
   window.speakingymAccount={isLoggedIn:()=>true,getIdToken:async()=> 'synthetic-browser-qa-token'};
   const endpoint='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/';
   const originalFetch=window.fetch.bind(window);
   let healthCalls=0;
   window.__qaAIRequests=[];
   window.fetch=(resource,init={})=>{
    const url=String(resource?.url||resource);
    if(url===endpoint+'health'){
     healthCalls++;
     if(healthCalls===1)return new Promise(resolve=>{
      window.__qaReleaseStaleHealth=()=>resolve(Response.json({plansEnabled:true}));
     });
     return Promise.resolve(Response.json({plansEnabled:true}));
    }
    if(url===endpoint+'sessions')
     return Promise.resolve(Response.json({sessionId:'synthetic-session'}));
    if(url===endpoint){
     const request=JSON.parse(init.body);
     window.__qaAIRequests.push(request.userText);
     return Promise.resolve(Response.json({reply:'Thanks, I can help.',sceneId:request.sceneId,progress:{step1:false,step2:false,step3:false}}));
    }
    return originalFetch(resource,init);
   };
  });
  await page.locator('#start').click();
  await page.locator('#reply').fill('old practice text');
  await page.locator('#send').click();
  await page.waitForFunction(()=>typeof window.__qaReleaseStaleHealth==='function');
  await page.locator('#back').click();
  await page.locator('#start').click();
  await page.locator('#reply').fill('new practice text');
  await page.locator('#send').click();
  await page.waitForFunction(()=>window.__qaAIRequests.length===1);
  await page.evaluate(()=>window.__qaReleaseStaleHealth());
  await page.waitForTimeout(100);
  assert.deepEqual(await page.evaluate(()=>window.__qaAIRequests),['new practice text'],
   'old aborted practice must not send an AI request against a newly started session');
  // Switching login invalidates active practice and a delayed start token.
  await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
  assert.equal(await page.locator('#practice').isVisible(),false,
   'an account change closes the previous practice immediately');
  assert.equal(await page.locator('#chat').locator('*').count(),0,
   'the old account dialogue must not remain on the new account screen');
  assert.match(await page.locator('#status').textContent(),/アカウントが切り替わった/);
  await page.evaluate(()=>{
   window.speakingymAccount={
    isLoggedIn:()=>true,
    getIdToken:()=>new Promise(resolve=>{window.__qaReleaseDelayedToken=resolve})
   };
  });
  await page.locator('#start').click();
  await page.waitForFunction(()=>typeof window.__qaReleaseDelayedToken==='function');
  await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
  await page.evaluate(()=>window.__qaReleaseDelayedToken('stale-synthetic-account-token'));
  await page.waitForTimeout(80);
  assert.equal(await page.locator('#practice').isVisible(),false,
   'a login change during delayed token lookup must not start an old account practice');
  assert.equal(await page.locator('#chat').locator('*').count(),0);
  assert.deepEqual(await page.evaluate(()=>window.__qaAIRequests),['new practice text']);
  // Pro study review: genuine offline UI event / storage / account-transition
  // coverage in Chromium + WebKit iPhone viewport. No signed paid account.
  await page.goto('http://127.0.0.1:8765/pro-study.html');
  const enableSyntheticPro=async(uid)=>{
   await page.evaluate(uid=>{
    localStorage.setItem('speakingym-account-owner-v1',uid);
    localStorage.setItem('speakingym-reflex-saved-phrases-v1',JSON.stringify([
     {id:'browser:standard:phrase',cardId:'browser',kind:'quick',level:'standard',
      text:'Could you repeat that?',goal:'もう一度聞き返す'}
    ]));
    window.speakingymAccount={getIdToken:async()=> 'synthetic-pro-browser-token',
     getUid:()=>uid,isLoggedIn:()=>true};
    const originalFetch=window.fetch.bind(window);
    window.fetch=(resource,opts)=>{
     const url=String(resource?.url||resource);
     if(url.endsWith('/entitlement'))return Promise.resolve(Response.json({plan:'pro'}));
     return originalFetch(resource,opts);
    };
    window.dispatchEvent(new Event('speakingym:account-ready'));
   },uid);
   await page.locator('#pro-content').waitFor({state:'visible'});
  };
  await enableSyntheticPro('browser-test-owner-A');
  assert.equal(await page.locator('#daily-plan li').count(),3,'Pro daily plan has three steps');
  assert.equal(await page.locator('#review-list li.review-card').count(),1,'saved phrase becomes a review card');
  await page.locator('#review-list button[aria-label="この表現を思い出せた"]').click();
  assert.equal(await page.locator('#review-undo').isVisible(),true);
  await page.locator('#review-undo').click();
  assert.match(await page.locator('#review-status').textContent(),/取り消しました/);
  await page.locator('#review-list button[aria-label="この表現を思い出せた"]').click();
  const progressKey='speakingym-pro-review-progress-v1:browser-test-owner-A';
  const aProgress=await page.evaluate(key=>localStorage.getItem(key),progressKey);
  assert.ok(aProgress,'review result should persist on this browser');
  assert.equal(Object.values(JSON.parse(aProgress).cards)[0].stage,1);
  await page.reload();
  await enableSyntheticPro('browser-test-owner-A');
  assert.equal(await page.locator('#review-list li.review-card').count(),1);
  assert.match(await page.locator('#review-progress').textContent(),/次の予定|復習カード/);
  // Switching accounts invalidates A immediately, then shows B's fresh queue.
  await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
  assert.equal(await page.locator('#pro-content').isVisible(),false);
  await page.evaluate(()=>{
   localStorage.setItem('speakingym-account-owner-v1','browser-test-owner-B');
   window.speakingymAccount.getUid=()=> 'browser-test-owner-B';
   window.dispatchEvent(new Event('speakingym:account-ready'));
  });
  await page.locator('#pro-content').waitFor({state:'visible'});
  assert.equal(await page.locator('#review-list button[aria-label="この表現を思い出せた"]').count(),1,
   'new account must see its own due expressions, not owner A progress');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),progressKey),aProgress,
   'owner A local review log must stay intact and isolated');
  assert.equal(await page.evaluate(()=>localStorage.getItem('speakingym-pro-review-progress-v1:browser-test-owner-B')),null);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,
   'Pro review studio should not overflow the mobile viewport');
  // Transfer only a short-lived owner-scoped phrase to the roleplay screen.
  await page.locator('#daily-plan a[href="./scenes.html"]').click();
  assert.ok(page.url().includes('scenes.html'));
  // URL may update before the destination DOM commits on slower WebKit.
  // Never dispatch the synthetic auth-ready event into the previous document.
  await page.locator('#proReviewTargetSetup').waitFor({state:'attached',timeout:10000});
  assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('speakingym-pro-scene-target-v1')).uid),
   'browser-test-owner-B');
  await page.evaluate(()=>{
   window.speakingymAccount={getIdToken:async()=> 'synthetic-browser-pro-token',
    getUid:()=> 'browser-test-owner-B',isLoggedIn:()=>true};
   window.dispatchEvent(new Event('speakingym:account-ready'));
  });
  const roleplayReviewDebug=await page.evaluate(()=>({
    uid:window.speakingymAccount?.getUid?.()||null,
    payload:(()=>{try{return JSON.parse(sessionStorage.getItem('speakingym-pro-scene-target-v1')||'null')}catch{return 'invalid-json'}})(),
    hidden:document.getElementById('proReviewTargetSetup')?.hidden,
    display:document.getElementById('proReviewTargetSetup')&&getComputedStyle(document.getElementById('proReviewTargetSetup')).display,
    text:document.getElementById('proReviewTargetSetup')?.textContent,
    owner:localStorage.getItem('speakingym-account-owner-v1')
   }));
  assert.equal(await page.locator('#proReviewTargetSetup').isVisible(),true,
   'Pro review scene handoff state: '+JSON.stringify(roleplayReviewDebug));
  assert.match(await page.locator('#proReviewTargetSetup').textContent(),/Could you repeat that/);
  await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
  assert.equal(await page.locator('#proReviewTargetSetup').isVisible(),false);
  await page.evaluate(()=>{
   window.speakingymAccount.getUid=()=> 'browser-test-owner-A';
   window.dispatchEvent(new Event('speakingym:account-ready'));
  });
  assert.equal(await page.locator('#proReviewTargetSetup').isVisible(),false,
   'a review target must never be displayed for a different owner');
  // Scripted browser QA of real AI reply -> offline freeze recovery -> AI revenge.
  // No API provider calls, live credentials, or paid checkout.
  await page.goto('http://127.0.0.1:8765/scenes.html?scene=cafe');
  await page.evaluate(()=>{
   const owner='browser-freeze-bridge-A',endpoint='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/';
   localStorage.setItem('speakingym-account-owner-v1',owner);
   window.speakingymAccount={isLoggedIn:()=>true,getUid:()=>owner,getIdToken:async()=> 'synthetic-rescue-token'};
   const realFetch=window.fetch.bind(window);
   window.__freezeProviderCalls=0;
   window.fetch=(resource,opts={})=>{
    const url=String(resource?.url||resource);
    if(url===endpoint+'health')return Promise.resolve(Response.json({plansEnabled:true}));
    if(url===endpoint+'sessions')return Promise.resolve(Response.json({sessionId:'synthetic-freeze-session'}));
    if(url===endpoint){
     window.__freezeProviderCalls++;
     return Promise.resolve(Response.json({
      reply:'Sorry, the oat milk is sold out. Would soy milk work?',
      sceneId:'cafe',progress:{step1:false,step2:false,step3:false}
     }));
    }
    return realFetch(resource,opts);
   };
   window.dispatchEvent(new Event('speakingym:account-ready'));
  });
  await page.locator('#level').selectOption('easy');
  await page.locator('#start').click();
  assert.equal(await page.locator('#practice').isVisible(),true);
  await page.locator('#reply').fill('Could I have a latte, please?');
  await page.locator('#send').click();
  await page.waitForFunction(()=>
   document.getElementById('chat')?.textContent?.includes('Would soy milk work?'));
  assert.equal(await page.evaluate(()=>window.__freezeProviderCalls),1);
  await Promise.all([
   page.waitForURL('**/freeze-breaker.html?from=ai'),
   page.locator('#takeFreezeMoment').click()
  ]);
  assert.doesNotMatch(page.url(),/oat|milk|question|answer|token/i);
  await page.evaluate(()=>{
   const owner='browser-freeze-bridge-A';
   localStorage.setItem('speakingym-account-owner-v1',owner);
   window.speakingymAccount={isLoggedIn:()=>true,getUid:()=>owner,getIdToken:async()=> 'synthetic-rescue-token'};
   window.dispatchEvent(new Event('speakingym:account-ready'));
  });
  await page.locator('#imported-ai-cue').waitFor({state:'visible'});
  assert.match(await page.locator('#imported-ai-question').textContent(),/Would soy milk work/);
  assert.equal(await page.locator('#mission-select').inputValue(),'cafe');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('speakingym-freeze-chat-handoff-v1')),null,
   'temporary AI utterance is removed from browser storage when consumed');
  await page.locator('#use-imported-question').click();
  assert.match(await page.locator('#dialogue').textContent(),/Would soy milk work/);
  await page.locator('#reason-buttons button[data-reason="surprise"]').click();
  await page.locator('#repair-next').click();
  assert.equal(await page.locator('#imported-followup-note').isVisible(),true,
   'scripted follow-up is labeled as a practice variant');
  await page.locator('#said-yes').click();
  const gymState=await page.evaluate(()=>localStorage.getItem('speakingym-freeze-progress-v1:user:browser-freeze-bridge-A'));
  assert.ok(gymState);
  assert.doesNotMatch(gymState,/oat milk|Would soy|Could I have a latte/);
  assert.equal(await page.locator('#return-to-ai').isVisible(),true);
  await Promise.all([
   page.waitForURL('**/scenes.html?scene=cafe'),
   page.locator('#return-to-ai').click()
  ]);
  await page.evaluate(()=>{
   const owner='browser-freeze-bridge-A';
   localStorage.setItem('speakingym-account-owner-v1',owner);
   window.speakingymAccount={isLoggedIn:()=>true,getUid:()=>owner,getIdToken:async()=> 'synthetic-rescue-token'};
   window.dispatchEvent(new Event('speakingym:account-ready'));
  });
  await page.locator('#freezeRevengeSetup').waitFor({state:'visible'});
  assert.match(await page.locator('#freezeRevengeSetup').textContent(),/リベンジ実践/);
  assert.equal(await page.locator('#level').inputValue(),'easy');
  assert.equal(await page.locator('[data-scene="cafe"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('speakingym-freeze-return-v1')),null);
  assert.doesNotMatch(page.url(),/oat|milk|question|answer|token/i);
  await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
  assert.equal(await page.locator('#freezeRevengeSetup').isVisible(),false);
  assert.deepEqual(errors,[]);await context.close();
 }}finally{await browser.close()}
 console.log(JSON.stringify({engine,results,interactions:'Guest sprint, stored phrases, filters, hide/reveal, delete, voice preference and replay passed'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
