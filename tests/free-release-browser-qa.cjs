// Browser QA for the local, no-AI Scene Commentary challenge.
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
   await context.route('https://**/*',route=>route.request().url().startsWith('https://images.unsplash.com/')?route.continue():route.abort());
   await context.addInitScript(()=>{
    window.__recognizers=[];window.__workerCalls=[];
    window.SpeechRecognition=class{
     constructor(){this.started=false;this.stopped=false;window.__recognizers.push(this)}
     start(){this.started=true;this.onstart?.()}
     stop(){this.stopped=true;this.onend?.()}
     abort(){this.stopped=true}
     emit(transcript,final=true){this.onresult?.({resultIndex:0,results:[Object.assign([{transcript}],{isFinal:final})]})}
     fail(error='network'){this.onerror?.({error})}
    };
   });
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('request',request=>{if(/workers\.dev|cloudflareworker/i.test(request.url()))page.evaluate(()=>window.__workerCalls.push('worker')).catch(()=>{})});
   for(const path of ['index.html','reflex.html','freeze-breaker.html','plans.html','account.html','phrasebook.html']){
    await page.goto(`http://127.0.0.1:8765/${path}${path==='freeze-breaker.html'?'?qa=1':''}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,
     `horizontal overflow: ${engine} ${width} ${path}`);
    assert.equal(await page.locator('a[href="./pro-study.html"],a[href="./pro-demo.html"]').count(),0,
     'unreleased Pro previews stay out of the free flow');
    if(path==='freeze-breaker.html'){
     assert.equal(await page.locator('#scene-photo').getAttribute('alt'),'A dimly lit railway platform with a train and a person waiting.');
     await page.waitForFunction(()=>{const img=document.querySelector('#scene-photo');return img.complete&&img.naturalWidth>0});
     assert.equal(await page.locator('#round-count').textContent(),'SCENE 1 / 30');
     assert.equal(await page.locator('#samples .sample').count(),0,'examples are only shown after a speaking turn');
    }
    await page.screenshot({path:`qa-screenshots/free-${engine}-${width}-${path.replace('.html','.png')}`,fullPage:true});
   }
   await page.goto('http://127.0.0.1:8765/freeze-breaker.html?qa=1');
   await page.clock.install();
   await page.locator('.level[data-level="2"]').click();
   assert.match(await page.locator('#level-desc').textContent(),/maybe \/ might/);
   assert.match(await page.locator('#scene-task').textContent(),/推測/);
   await page.locator('#start-challenge').click();
   assert.equal(await page.locator('#timer-area').isVisible(),true);
   assert.equal(await page.locator('#start-challenge').isVisible(),false);
   assert.equal(await page.evaluate(()=>window.__recognizers.at(-1).started),true,'microphone recognition starts from the learner action');
   await page.evaluate(()=>{
    const rec=window.__recognizers.at(-1);rec.emit('A train is stopped',false);rec.emit('A train is stopped at the station.');
   });
   assert.match(await page.locator('#live-transcript').textContent(),/A train is stopped at the station/);
   await page.clock.runFor(31_000);
   assert.equal(await page.locator('#learn-panel').isVisible(),true,'the 30-second round transitions directly to learning');
   assert.equal(await page.locator('#samples .sample').count(),3);
   assert.match(await page.locator('#samples').textContent(),/BASIC · 見えるものを描写[\s\S]*NATURAL · 状況を控えめに推測[\s\S]*APPLIED · 相手に状況を共有/);
   assert.match(await page.locator('#final-transcript').textContent(),/A train is stopped/);
   assert.match(await page.locator('#learn-note').textContent(),/採点/,'recognition text is not presented as a score');
   assert.match(await page.locator('#language-tip').textContent(),/There is/);
   assert.equal(await page.evaluate(()=>window.__workerCalls.length),0,'scene practice must not call the AI Worker');
   assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes('scene')).length),0,
    'scene speech and attempts are not written to local storage');
   await page.screenshot({path:`qa-screenshots/free-${engine}-${width}-scene-result.png`,fullPage:true});
   const firstPhoto=await page.locator('#scene-photo').getAttribute('src');
   await page.locator('#retry-same').click();
   assert.equal(await page.locator('#scene-photo').getAttribute('src'),firstPhoto,'retry preserves the same photo');
   assert.equal(await page.locator('#samples .sample').count(),0,'retry starts a clean turn');
   await page.locator('#start-challenge').click();
   await page.evaluate(()=>window.__recognizers.at(-1).fail());
   assert.equal(await page.locator('#retry-recognition').isVisible(),true,'recognition error offers a direct retry');
   const failedRecognition=await page.evaluate(()=>window.__recognizers.at(-1).started);
   assert.equal(failedRecognition,true);
   await page.locator('#retry-recognition').click();
   assert.equal(await page.evaluate(()=>window.__recognizers.length),3,'retry creates one clean recognition session');
   assert.equal(await page.evaluate(()=>window.__recognizers[1].stopped),true,'retry stops the failed recognition session');
   assert.equal(await page.evaluate(()=>window.__recognizers.at(-1).started),true,'retry starts recognition again');
   await page.clock.runFor(31_000);
   await page.locator('#next-scene').click();
   assert.equal(await page.locator('#round-count').textContent(),'SCENE 2 / 30');
   assert.notEqual(await page.locator('#scene-photo').getAttribute('src'),firstPhoto);
   assert.equal(await page.evaluate(()=>window.__workerCalls.length),0);
   assert.deepEqual(errors,[],`page errors: ${engine} ${width}`);
   await context.close();
  }
  const fallbackContext=await browser.newContext({viewport:{width:375,height:812}});
  await fallbackContext.route('https://**/*',route=>route.request().url().startsWith('https://images.unsplash.com/')?route.continue():route.abort());
  await fallbackContext.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined});
  const fallback=await fallbackContext.newPage();
  await fallback.goto('http://127.0.0.1:8765/freeze-breaker.html?qa=1');
  await fallback.locator('#start-challenge').click();
  assert.equal(await fallback.locator('#retry-recognition').isVisible(),true,'unsupported speech recognition offers retry');
  assert.equal(await fallback.locator('#continue-without-mic').isVisible(),true,'unsupported speech recognition offers a voice-only practice path');
  await fallback.locator('#continue-without-mic').click();
  await fallback.clock.install();
  await fallback.clock.runFor(31_000);
  assert.equal(await fallback.locator('#learn-panel').isVisible(),true);
  assert.match(await fallback.locator('#final-transcript').textContent(),/認識された英文はありません/);
  assert.match(await fallback.locator('#learn-note').textContent(),/採点/);
  await fallbackContext.close();
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
