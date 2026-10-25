// Offline checks for the *free-only* public launch candidate. No Cloudflare,
// Firebase, real customer records, Stripe or Gemini requests are made.
const {chromium,webkit,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
 const engine=process.env.SPEAKINGYM_BROWSER_ENGINE||'chromium';
 assert.ok(['chromium','webkit'].includes(engine));
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 fs.mkdirSync('qa-screenshots',{recursive:true});
 try{
  for(const width of [320,375,390,430,1280]){
   const context=await browser.newContext(engine==='webkit'&&width===390?
    {...devices['iPhone 13'],viewport:{width,height:850}}:{viewport:{width,height:850}});
   await context.route('https://**/*',route=>route.abort());
   await context.addInitScript(()=>{
    window.__spoken=[];
    // Deterministic, offline mock. Never asks for a real mic or contacts a speech service.
    window.__recognizers=[];
    window.SpeechRecognition=class{
     constructor(){this.aborted=false;window.__recognizers.push(this)}
     start(){this.onstart?.()}
     abort(){this.aborted=true}
     emit(transcript,final=true){
      this.onresult?.({results:[Object.assign([{transcript}],{isFinal:final})]});
     }
    };
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
    Object.defineProperty(window,'speechSynthesis',{value:{
     getVoices:()=>[{name:'English',lang:'en-US',voiceURI:'en',localService:true}],
     speak:utterance=>window.__spoken.push(utterance.text),cancel(){},addEventListener(){}
    }});
   });
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   for(const path of ['index.html','reflex.html','freeze-breaker.html','transfer.html','phrasebook.html','account.html','plans.html']){
    await page.goto('http://127.0.0.1:8765/'+path);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,
     'horizontal overflow: '+engine+' '+width+' '+path);
    assert.equal(await page.locator('a[href="./pro-study.html"],a[href="./pro-demo.html"]').count(),0,
     'unreleased Pro preview must not appear in the free public flow');
    if(path==='plans.html'){
     assert.equal((await page.locator('.hero h1').textContent()).replace(/\s+/g,''),'英語を、自分のペースで。',
      'the pricing heading stays concise and intact at '+width+'px');
     assert.equal(await page.locator('.hero h1 br').count(),0,'the pricing heading must not use forced line breaks');
    }
    await page.screenshot({path:'qa-screenshots/free-'+engine+'-'+width+'-'+path+'.png',fullPage:true});
   }
   await page.goto('http://127.0.0.1:8765/index.html');
   assert.equal(await page.locator('.hero').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 37, 50)',
    'soft neon home palette must load instead of falling back to legacy green');
   assert.equal(await page.locator('.hero .btn.primary').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(66, 222, 199)',
    'primary start button needs a calm, readable cyan accent');
   assert.equal(await page.locator('#workouts .workouts > .workout').count(),4);
   assert.equal(await page.locator('.hero h1 br').count(),0,'hero must wrap naturally on narrow screens');
   assert.equal(await page.locator('.orb,.floating,.mock').count(),0,'fake chat and decorative gradient artwork removed');
   assert.equal(await page.locator('.demo-card blockquote').count(),1,'home demonstrates a real exercise question');
   for(const target of ['reflex.html','freeze-breaker.html','phrasebook.html','scenes.html'])
    assert.ok(await page.locator('#workouts a[href="./'+target+'"]').count()>0);
   await page.goto('http://127.0.0.1:8765/scenes.html');
   assert.equal(await page.locator('#scenes .scene:visible').count(),4,'new learners see only four starter scenes');
   await page.locator('#showAllScenes').click();
   assert.equal(await page.locator('#scenes .scene:visible').count(),16,'remaining scenes are discoverable');
   await page.locator('#showAllScenes').click();
   assert.equal(await page.locator('#scenes .scene:visible').count(),4,'collapse back to starter scenes');
   await page.goto('http://127.0.0.1:8765/reflex.html');
   assert.equal(await page.locator('.hero').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 37, 50)');
   assert.ok(await page.locator('#start').isVisible(),'primary action is visible without opening extra settings');
   assert.equal(await page.locator('#personalWorkoutDetails').evaluate(el=>el.open),false);
   assert.equal(await page.locator('#practiceSettings').evaluate(el=>el.open),false);
   await page.locator('#practiceSettings summary').click();
   assert.equal(await page.locator('#mode').isVisible(),true);
   await page.goto('http://127.0.0.1:8765/index.html');
   await page.evaluate(()=>{
    localStorage.removeItem('speakingym-account-owner-v1');
    window.speakingymAccount={isLoggedIn:()=>false,getUid:()=>null};
    localStorage.setItem('speakingym-transfer-results-v1:guest',JSON.stringify([{
     pairId:'other-support-5',first:false,second:true,at:new Date(Date.now()-2*86400000).toISOString()
    }]));
    window.dispatchEvent(new Event('speakingym:account-ready'));
   });
   assert.equal(await page.locator('#homeDueCount').textContent(),'1');
   await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
   assert.equal(await page.locator('#homeDueCount').textContent(),'—','hidden during owner switch');
   await page.evaluate(()=>{
    localStorage.setItem('speakingym-account-owner-v1','new-owner');
    window.speakingymAccount={isLoggedIn:()=>true,getUid:()=> 'new-owner'};
    window.dispatchEvent(new Event('speakingym:account-ready'));
   });
   assert.equal(await page.locator('#homeDueCount').textContent(),'0','guest records never shown for a user');

   // Finish two different settings, then verify the next due review and owner separation.
   await page.goto('http://127.0.0.1:8765/transfer.html');
   await page.evaluate(()=>localStorage.removeItem('speakingym-account-owner-v1'));
   await page.reload();
   await page.locator('#start').click();
   assert.match(await page.locator('#progress').textContent(),/ROUND 1 \/ 2/);
   assert.equal(await page.locator('#examples .sample').count(),0);
   const first=await page.locator('#scene').textContent();
   await page.locator('#said').click();
   assert.notEqual(await page.locator('#scene').textContent(),first);
   assert.equal(await page.locator('#examples .sample').count(),0,'no answer leak before both situations');
   await page.locator('#froze').click();
   assert.equal(await page.locator('#endPane').isVisible(),true);
   assert.equal(await page.locator('#examples .sample').count(),2);
   assert.match(await page.evaluate(()=>localStorage.getItem('speakingym-transfer-results-v1:guest')||''),
    /"first":true,"second":false/);
   await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
   assert.equal(await page.locator('#endPane').isVisible(),false,'redact result during account change');
   await page.evaluate(()=>{
    localStorage.setItem('speakingym-account-owner-v1','second-owner');
    window.speakingymAccount={isLoggedIn:()=>true,getUid:()=> 'second-owner'};
    window.dispatchEvent(new Event('speakingym:account-ready'));
   });
   assert.match(await page.locator('#historySummary').textContent(),/0 組に挑戦/);

   await page.goto('http://127.0.0.1:8765/freeze-breaker.html');
   assert.equal(await page.locator('.hero').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 37, 50)');
   assert.equal(await page.locator('header .brand').evaluate(el=>getComputedStyle(el).color),'rgb(242, 251, 250)',
    'dark header brand must stay readable in the conversation rescue page');
   await page.evaluate(()=>localStorage.removeItem('speakingym-account-owner-v1'));
   await page.reload();
   assert.equal(await page.locator('#mission-select option').count(),13);
   assert.equal(await page.locator('#reason-panel').isVisible(),false,'the meaning check appears only after listening starts');
   await page.locator('#start-button').click();
   await page.screenshot({path:'qa-screenshots/free-'+engine+'-'+width+'-conversation-listening.png',fullPage:true});
   const heardFirst=await page.locator('#dialogue').textContent();
   assert.equal(await page.locator('#dialogue').isVisible(),false,'rescue begins with listening, not reading the English answer');
   assert.equal((await page.evaluate(()=>window.__spoken)).at(-1),heardFirst,
    'the initial English line plays from the same user click that started the round');
   assert.equal(await page.locator('#reason-panel').isVisible(),true,
    'the learner checks the meaning of the utterance instead of self-reporting whether they heard it');
   assert.equal(await page.locator('#reason-buttons button').count(),2,'the meaning check stays to one quick, contextual choice');
   assert.equal(await page.locator('#first-mic').isVisible(),false,'the clarification phrase appears only when the meaning was missed');
   assert.equal(await page.locator('#reason-buttons button[data-correct="true"]').evaluate(el=>el===el.parentElement.firstElementChild),true,
    'the first correct answer position is explicit for rotation checks');
   await page.locator('#reveal-dialogue').click();
   assert.equal(await page.locator('#dialogue').isVisible(),true,'reading remains accessible on demand');
   await page.locator('#reveal-dialogue').click();
   assert.equal(await page.locator('#dialogue').isVisible(),false);
   await page.locator('#reason-buttons button[data-correct="true"]').click();
   assert.equal(await page.locator('#step-retry').isVisible(),true,'a correct understanding goes straight to a spoken reply');
   assert.equal(await page.locator('#step-repair').isVisible(),false,'no unnecessary recovery phrase after the meaning is clear');
   assert.match(await page.locator('#feedback').textContent(),/意味を確認できました/);
   assert.match(await page.locator('#followup-speaker').textContent(),/相手の発言/);
   assert.equal(await page.locator('#reply-source').textContent(),heardFirst,'the reply screen keeps the actual incoming line visible');
   assert.match(await page.locator('#reply-meaning').textContent(),/意味：/,'the reply screen explains the line in Japanese');
   assert.match(await page.locator('#reply-goal').textContent(),/今回伝えること：/,'the reply screen states what the learner is practising');
   assert.match(await page.locator('#recovery-context').textContent(),/カフェ|ラテ|選択肢/);
   assert.equal(await page.locator('#followup').textContent(),heardFirst,'the original line remains available while forming a reply');
   await page.locator('#reveal-followup').click();
   assert.equal(await page.locator('#followup').isVisible(),true);
   assert.equal(await page.locator('#finish-practice').isDisabled(),true,'listening alone cannot finish a speaking workout');
   await page.evaluate(()=>document.querySelector('#finish-practice').click());
   assert.equal(await page.locator('#result').isVisible(),false,'an empty reply cannot be recorded as success');
   await page.locator('#retry-mic').click();
   await page.evaluate(()=>window.__recognizers.at(-1).emit('I will have almond milk, please.'));
   assert.equal(await page.locator('#reply-note').inputValue(),'I will have almond milk, please.');
   await page.locator('#finish-practice').click();
   const firstRecord=JSON.parse(await page.evaluate(()=>localStorage.getItem('speakingym-freeze-progress-v1:guest')));
   assert.equal(firstRecord.records.cafe.attempts,1);
   assert.match(await page.locator('#result-title').textContent(),/会話サバイバルを記録/);
   assert.match(await page.locator('#result-detail').textContent(),/音声入力がありました/);
   assert.equal(await page.locator('#learn-card').isVisible(),true,'the end-of-round card teaches a concrete reply');
   assert.ok((await page.locator('#learn-example').textContent()).length>5);
   assert.ok((await page.locator('#learn-example-2').textContent()).length>5);
   assert.ok((await page.locator('#learn-point').textContent()).length>10);
   await page.screenshot({path:'qa-screenshots/free-'+engine+'-'+width+'-conversation-result.png',fullPage:true});

   await page.locator('#retry-scene').click();
   const correctFirstPosition=await page.locator('#reason-buttons button[data-correct="true"]').evaluate(el=>el===el.parentElement.firstElementChild);
   assert.notEqual(correctFirstPosition,true,'the correct meaning position changes on the next attempt');
   await page.locator('#reason-buttons button[data-correct="false"]').click();
   assert.equal(await page.locator('#step-repair').isVisible(),true,'a missed meaning triggers a useful clarification phrase');
   assert.equal(await page.locator('#rescue-hint').evaluate(el=>el.open),false,
    'the example is available on demand without blocking practice');
   assert.match(await page.locator('#repair-dialogue').textContent(),/>|milk|coffee/i);
   assert.match(await page.locator('#repair-meaning').textContent(),/すみません|コーヒー/);
   assert.match(await page.locator('#rescue-line').textContent(),/say that again more slowly/);
   await page.locator('#first-mic').click();
   await page.evaluate(()=>window.__recognizers.at(-1).emit('Could you say that again more slowly?'));
   assert.equal(await page.locator('#first-transcript').inputValue(),'Could you say that again more slowly?');
   await page.locator('#repair-next').click();
   assert.equal(await page.evaluate(()=>window.__recognizers.at(-1).aborted),true,
    'changing scene phase must cancel pending microphone recognition');
   assert.equal(await page.locator('#step-retry').isVisible(),true,'the recovery phrase leads back to the same utterance');
   assert.equal(await page.locator('#followup-speaker').textContent(),'相手の言い直し');
   assert.equal(await page.locator('#followup').isVisible(),false,'the repeated utterance remains listening-first');
   assert.equal((await page.evaluate(()=>window.__spoken)).at(-1),await page.locator('#followup').textContent());
   await page.locator('#reveal-followup').click();
   assert.equal(await page.locator('#followup').isVisible(),true);
   const missedLine=await page.locator('#dialogue').textContent();
   assert.equal(await page.locator('#finish-practice').isDisabled(),true);
   await page.locator('#self-reported-speech').click();
   await page.locator('#finish-practice').click();
   const fluent=JSON.parse(await page.evaluate(()=>localStorage.getItem('speakingym-freeze-progress-v1:guest')));
   assert.equal(fluent.records.cafe.lastReason,'misunderstood','record only the learner-selected recovery strategy');
   assert.equal(fluent.records.cafe.attempts,2);
   await page.locator('#retry-scene').click();
   assert.equal(await page.locator('#dialogue').textContent(),missedLine,'a missed utterance returns for another listening attempt');
   await page.locator('#reason-buttons button[data-correct="false"]').click();
   assert.match(await page.locator('#rescue-meaning').textContent(),/もう一度ゆっくり/,'the repair phrase has a plain-Japanese meaning');
   await page.locator('#first-transcript').fill('Could you repeat that, please?');
   await page.locator('#repair-next').click();
   await page.screenshot({path:'qa-screenshots/free-'+engine+'-'+width+'-conversation-recovery.png',fullPage:true});
   assert.match(await page.locator('#followup').textContent(),/^Of course\. Let me say that again more slowly\./,
    'the simulated conversation responds to the clarification request');
   await page.locator('#show-hint').click();
   assert.match(await page.locator('#followup-hint').textContent(),/milk|regular latte/,
    'the hint gives a natural next response for the café context');
   assert.match(await page.locator('#recovery-context').textContent(),/想定会話/,'no fake claim of AI understanding');
   await page.locator('#retry-mic').click();
   await page.evaluate(()=>window.__recognizers.at(-1).emit('Could you say that again?'));
   assert.equal(await page.locator('#reply-note').inputValue(),'Could you say that again?');
   await page.locator('#retry-stop').click();
   await page.locator('#retry-mic').click();
   await page.evaluate(()=>window.__recognizers.at(-1).emit('I did not catch that.'));
   assert.equal(await page.locator('#reply-note').inputValue(),'Could you say that again? I did not catch that.',
    'resuming recognition must preserve previous spoken sentences');
   await page.locator('#retry-reset').click();
   assert.equal(await page.locator('#reply-note').inputValue(),'');
   await page.locator('#reply-note').fill('Private typed answer — do not store');
   await page.locator('#finish-practice').click();
   const saved=await page.evaluate(()=>localStorage.getItem('speakingym-freeze-progress-v1:guest')||'');
   assert.ok(saved);
   const savedProgress=JSON.parse(saved).records.cafe;
   assert.equal(savedProgress.typedResponses,1,'typed answers are stored as typing, not voice success');
   assert.equal(savedProgress.comprehensionMisses,2,'actual wrong meaning choices drive review history');
   assert.ok(Number.isInteger(savedProgress.repeatVariationIndex),'the unresolved listening item remains queued for review');
   assert.equal(JSON.parse(saved).records.cafe.reasonCounts.misunderstood,2);
   assert.doesNotMatch(saved,/Private typed answer/);
   assert.doesNotMatch(saved,/Could I have a latte|Could you say that again|I did not catch that/,
    'the progress ledger cannot store recognized speech');
   assert.equal(await page.locator('#request-coach').isEnabled(),false,
    'guest practice must never consume an unowned AI teacher quota');
   await page.locator('#retry-scene').click();
   await page.locator('#reason-buttons button[data-correct="false"]').click();
   await page.locator('#first-mic').click();
   await page.evaluate(()=>window.__recognizers.at(-1).emit('Never show this to another user'));
   await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
   assert.equal(await page.locator('#mission').isVisible(),false,'redact rescue text on account switch');
   assert.equal(await page.locator('#dialogue').textContent(),'','redact the heard question as well as hiding the card');
   assert.equal(await page.locator('#repair-dialogue').textContent(),'','redact the clarification question too');
   assert.equal(await page.locator('#followup').textContent(),'','redact the simulated follow-up');
   assert.equal(await page.locator('#first-transcript').inputValue(),'','redact voice-to-text on owner switch');
   assert.equal(await page.locator('#reply-note').inputValue(),'','redact the recovery voice-to-text too');
   assert.equal(await page.evaluate(()=>window.__recognizers.at(-1).aborted),true,'abort microphone on owner switch');
   // The new optional teacher reuses the existing metered backend. Mock every call;
   // these QA runs must not send real text or consume a user's teacher quota.
   const coachPosts=[];
   let plansEnabled=true;
   const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':'authorization,content-type'};
   await page.route('https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/**',async route=>{
    const request=route.request();
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(request.method()==='GET')return route.fulfill({status:200,headers:cors,
     contentType:'application/json',body:JSON.stringify({reflexCoachSupported:true,aiConfigured:true,plansEnabled})});
    const body=request.postDataJSON();coachPosts.push(body);
    const feedback=body.attempts.map((item,i)=>({index:i,praise:'具体的な内容が伝わっています。',
     improvement:'聞き返しをもう少し丁寧に。',improved:'Could you repeat that, please?',
     why:'相手にもう一度尋ねる自然な表現です。',practice:'Ask a teammate to repeat.'}));
    await route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({feedback})});
   });
   await page.evaluate(()=>{
    localStorage.setItem('speakingym-account-owner-v1','coach-owner');
    window.speakingymAccount={isLoggedIn:()=>true,getUid:()=> 'coach-owner',getIdToken:async()=> 'qa-fake-token'};
    window.dispatchEvent(new Event('speakingym:account-ready'));
   });
   await page.locator('#start-button').click();
   await page.locator('#reason-buttons button[data-correct="false"]').click();
   await page.locator('#first-transcript').fill('Could I have soy milk?');
   await page.locator('#repair-next').click();
   await page.locator('#reply-note').fill('Thank you. That helps.');
   await page.locator('#finish-practice').click();
   assert.equal(coachPosts.length,0,'free scripted exercises must never call the teacher automatically');
   assert.equal(await page.locator('#request-coach').isEnabled(),true);
   await page.screenshot({path:'qa-screenshots/free-'+engine+'-'+width+'-conversation-coach-consent.png',fullPage:true});
   await page.locator('#request-coach').click();
   await page.locator('#coach-results .coach-answer').first().waitFor();
   assert.equal(coachPosts.length,1,'two short answers must share one metered teacher call');
   assert.equal(coachPosts[0].action,'reflex_coach');
   assert.deepEqual(coachPosts[0].attempts.map(x=>x.text),['Could I have soy milk?','Thank you. That helps.']);
   assert.match(coachPosts[0].attempts[1].goal,/詰まった後/);
   assert.equal(await page.locator('#coach-results .coach-answer').count(),2);
   assert.equal(await page.locator('#request-coach').isEnabled(),false,'prevent double-charging on repeated taps');
   assert.doesNotMatch(await page.evaluate(()=>localStorage.getItem('speakingym-freeze-progress-v1:user:coach-owner')||''),
    /Could I have soy milk|Thank you\. That helps|Could you repeat that/);
   await page.screenshot({path:'qa-screenshots/free-'+engine+'-'+width+'-conversation-coach-result.png',fullPage:true});
   await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
   assert.equal(await page.locator('#coach-results').textContent(),'','AI feedback must disappear on account switch');
   assert.equal(await page.locator('#request-coach').isEnabled(),false);
   // A server with missing quota protection must never receive teacher POSTs.
   plansEnabled=false;
   await page.evaluate(()=>{
    localStorage.setItem('speakingym-account-owner-v1','coach-owner');
    window.speakingymAccount={isLoggedIn:()=>true,getUid:()=> 'coach-owner',getIdToken:async()=> 'qa-fake-token'};
    window.dispatchEvent(new Event('speakingym:account-ready'));
   });
   await page.locator('#start-button').click();
   await page.locator('#reason-buttons button[data-correct="false"]').click();
   await page.locator('#first-transcript').fill('Another answer');
   await page.locator('#repair-next').click();
   await page.locator('#finish-practice').click();
   await page.locator('#request-coach').click();
   await page.getByText('利用回数を安全に確認できないため、送信を止めました。',{exact:false}).waitFor();
   assert.match(await page.locator('#coach-status').textContent(),/利用回数を安全に確認できないため、送信を止めました/);
   assert.equal(coachPosts.length,1,'disabled entitlements never reach the AI model');
   await page.evaluate(()=>localStorage.removeItem('speakingym-account-owner-v1'));
   await page.goto('http://127.0.0.1:8765/freeze-breaker.html');
   await page.evaluate(()=>{window.SpeechSynthesisUtterance=undefined});
   await page.locator('#start-button').click();
   assert.equal(await page.locator('#dialogue').isVisible(),true,
    'a browser without speech output must show text automatically, never strand the learner');
   const noMicContext=await browser.newContext({viewport:{width,height:850}});
   await noMicContext.route('https://**/*',route=>route.abort());
   await noMicContext.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined});
   const noMicPage=await noMicContext.newPage();
   await noMicPage.goto('http://127.0.0.1:8765/freeze-breaker.html');
   await noMicPage.locator('#start-button').click();
   await noMicPage.locator('#reason-buttons button[data-correct="false"]').click();
   await noMicPage.locator('#first-mic').click();
   assert.match(await noMicPage.locator('#first-mic-status').textContent(),/このブラウザでは音声認識が利用できません/,
    'unsupported browser must explain how to practice without speech recognition');
   await noMicPage.locator('#first-transcript').fill('I can still type');
   await noMicPage.locator('#repair-next').click();
   assert.equal(await noMicPage.locator('#step-retry').isVisible(),true,'mic support is never required to continue');
   assert.equal(await noMicPage.locator('#finish-practice').isDisabled(),true,'a text-only repair does not imply a spoken answer');
   await noMicPage.locator('#self-reported-speech').click();
   await noMicPage.locator('#finish-practice').click();
   assert.match(await noMicPage.locator('#result-detail').textContent(),/未検証として記録/);
   const noMicProgress=JSON.parse(await noMicPage.evaluate(()=>localStorage.getItem('speakingym-freeze-progress-v1:guest')));
   assert.equal(noMicProgress.records.cafe.unverifiedSpeech,1);
   assert.equal(noMicProgress.records.cafe.voiceInputs,0);
   await noMicContext.close();
   assert.deepEqual(errors,[],'uncaught browser errors in '+engine+' '+width);
   await context.close();
  }
 }finally{await browser.close()}
 console.log('Free launch browser QA passed: '+engine+' at 320, 375, 390, 430 and 1280px');
})().catch(error=>{console.error(error);process.exitCode=1});
