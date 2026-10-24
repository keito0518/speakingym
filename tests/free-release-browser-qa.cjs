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
  for(const width of [390,1280]){
   const context=await browser.newContext(engine==='webkit'&&width===390?
    {...devices['iPhone 13'],viewport:{width,height:850}}:{viewport:{width,height:850}});
   await context.route('https://**/*',route=>route.abort());
   await context.addInitScript(()=>{
    window.__spoken=[];
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
    await page.screenshot({path:'qa-screenshots/free-'+engine+'-'+width+'-'+path+'.png',fullPage:true});
   }
   await page.goto('http://127.0.0.1:8765/index.html');
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
   await page.evaluate(()=>localStorage.removeItem('speakingym-account-owner-v1'));
   await page.reload();
   assert.equal(await page.locator('#mission-select option').count(),7);
   assert.equal(await page.locator('#reason-panel').isVisible(),false,'the cause question must not appear before trying to speak');
   await page.locator('#start-button').click();
   assert.equal(await page.locator('#instant-yes').isVisible(),true,'first action is a spoken answer, not choosing a diagnosis');
   assert.equal(await page.locator('#reason-panel').isVisible(),false);
   await page.locator('#instant-yes').click();
   assert.equal(await page.locator('#step-retry').isVisible(),true,'a fluent first answer skips the rescue explanation');
   await page.locator('#said-yes').click();
   const fluent=JSON.parse(await page.evaluate(()=>localStorage.getItem('speakingym-freeze-progress-v1:guest')));
   assert.equal(fluent.records.cafe.lastReason,null,'answering without freezing never fabricates a diagnosis');
   assert.equal(fluent.records.cafe.recovered,1);
   await page.locator('#retry-scene').click();
   await page.locator('#instant-froze').click();
   assert.equal(await page.locator('#reason-panel').isVisible(),true,'cause options appear only after the learner freezes');
   await page.locator('#reason-buttons button[data-reason="surprise"]').click();
   assert.match(await page.locator('#rescue-meaning').textContent(),/考える時間/,'rescue phrase has a plain-Japanese meaning');
   await page.locator('#repair-next').click();
   await page.locator('#reply-note').fill('Private typed answer — do not store');
   await page.locator('#said-yes').click();
   const saved=await page.evaluate(()=>localStorage.getItem('speakingym-freeze-progress-v1:guest')||'');
   assert.ok(saved);
   assert.equal(JSON.parse(saved).records.cafe.reasonCounts.surprise,1);
   assert.doesNotMatch(saved,/Private typed answer/);
   await page.evaluate(()=>window.dispatchEvent(new Event('speakingym:account-changing')));
   assert.equal(await page.locator('#mission').isVisible(),false,'redact rescue text on account switch');
   assert.deepEqual(errors,[],'uncaught browser errors in '+engine+' '+width);
   await context.close();
  }
 }finally{await browser.close()}
 console.log('Free launch browser QA passed: '+engine+' at 390px and 1280px');
})().catch(error=>{console.error(error);process.exitCode=1});
