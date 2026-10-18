// Run against local HTTP server; external APIs are blocked, no real users or quotas.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});fs.mkdirSync('qa-screenshots',{recursive:true});const results=[];
 try{for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('https://**/*',r=>r.abort());
  await context.addInitScript(()=>{const listeners={};window.__spoken=[];window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Basic',lang:'en-US',voiceURI:'basic',localService:true},{name:'Natural English',lang:'en-GB',voiceURI:'natural'}],addEventListener:(n,f)=>listeners[n]=f,speak:u=>window.__spoken.push({text:u.text,voice:u.voice?.voiceURI,rate:u.rate}),cancel(){},paused:false}})});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['index.html','account.html','phrasebook.html','scenes.html?scene=taxi','reflex.html']){
   await page.goto('http://127.0.0.1:8765/'+path);await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width+' '+path);
   if(path.startsWith('scenes')){assert.equal(await page.locator('[data-scene="taxi"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-scene]').count(),16)}
   await page.screenshot({path:'qa-screenshots/'+width+'-'+path.split('.')[0]+'.png',fullPage:true});results.push({width,path,status:'passed'});
  }
  await page.selectOption('#mode','カフェ');await page.click('#start');assert.match(await page.locator('#category').textContent(),/^カフェ \/ STANDARD$/);
  await page.goto('http://127.0.0.1:8765/phrasebook.html');
  await page.evaluate(()=>{localStorage.setItem('speakingym-reflex-saved-phrases-v1',JSON.stringify([{id:'repair1:easy:quick',cardId:'repair1',kind:'quick',text:'Could you repeat that?',level:'easy',goal:'聞き返す'}]));window.speakingymPhrases.toggle({text:'Could I have oat milk?',sceneId:'cafe',level:'standard',source:'AIの言い換え'});window.dispatchEvent(new Event('speakingym:account-ready'))});
  assert.equal(await page.locator('#phrases article').count(),2);await page.click('#hide');assert.equal(await page.locator('.english:visible').count(),0);await page.getByRole('button',{name:'答えを見る'}).first().click();assert.equal(await page.locator('.english:visible').count(),1);
  await page.getByRole('button',{name:'音声で聞く'}).first().click();assert.equal(await page.evaluate(()=>window.__spoken.at(-1).voice),'natural');
  await page.locator('.sg-voice-settings summary').click();await page.getByLabel('英語の声',{exact:true}).selectOption('basic');await page.getByLabel('読み上げ速度').selectOption('0.75');
  await page.reload();await page.locator('.sg-voice-settings summary').click();assert.equal(await page.getByLabel('英語の声',{exact:true}).inputValue(),'basic');assert.equal(await page.getByLabel('読み上げ速度').inputValue(),'0.75');
  await page.selectOption('#source','AIの言い換え');assert.equal(await page.locator('#phrases article').count(),1);await page.getByRole('button',{name:'保存解除',exact:true}).click();assert.equal(await page.evaluate(()=>window.speakingymPhrases.list().length),1);
  assert.deepEqual(errors,[]);await context.close();
 }}finally{await browser.close()}
 console.log(JSON.stringify({results,interactions:'Guest sprint, stored phrases, filters, hide/reveal, delete, voice preference and replay passed'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
