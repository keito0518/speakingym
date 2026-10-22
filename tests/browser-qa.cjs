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
  for(const path of ['index.html','account.html','phrasebook.html','plans.html','privacy.html','terms.html','contact.html','mission.html','scenes.html?scene=taxi','reflex.html']){
   await page.goto('http://127.0.0.1:8765/'+path);await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width+' '+path);
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
  assert.deepEqual(errors,[]);await context.close();
 }}finally{await browser.close()}
 console.log(JSON.stringify({engine,results,interactions:'Guest sprint, stored phrases, filters, hide/reveal, delete, voice preference and replay passed'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
