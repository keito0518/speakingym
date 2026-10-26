const { chromium, webkit } = require('playwright');
let browser;
const fs = require('node:fs');
const path = require('node:path');

(async()=>{
  const engine=process.env.RPG_BROWSER_ENGINE==='webkit'?webkit:chromium;
  const name=process.env.RPG_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
  browser=await engine.launch({headless:true});
  const shots=path.join(process.cwd(),'qa-screenshots');fs.mkdirSync(shots,{recursive:true});
  const widths=[320,375,390,430];
  for(const width of widths){
    const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:width===390?3:1,isMobile:name==='webkit'&&width===390,hasTouch:true});
    const page=await context.newPage();
  page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);
    page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);
    await page.addInitScript(()=>{
      Math.random=()=>.01;
      window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;this.lang='';this.onerror=null;this.onend=null;}};
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(utterance){queueMicrotask(()=>utterance.onerror?.({error:'not-allowed'}));}}});
    });
    await page.goto('http://127.0.0.1:8765/prototype/english-rpg/',{waitUntil:'networkidle'});
    await page.screenshot({path:path.join(shots,`english-rpg-${name}-${width}-welcome.png`),fullPage:false});
    console.log(`${name}: welcome ${width}px`);
    await page.getByRole('button',{name:/Momo/}).click();
    await page.getByRole('button',{name:'相棒を選んで冒険へ'}).click();
    await page.screenshot({path:path.join(shots,`english-rpg-${name}-${width}-map.png`),fullPage:false});
    const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    if(overflow.scroll>overflow.width+1)throw new Error(`${name} ${width}px horizontal overflow: ${JSON.stringify(overflow)}`);
    await context.close();
    console.log(`${name}: responsive ${width}px passed`);
  }

  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:name==='webkit',hasTouch:true});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    Math.random=()=>.01;
    window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;this.lang='';this.onerror=null;this.onend=null;}};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(utterance){queueMicrotask(()=>utterance.onerror?.({error:'not-allowed'}));}}});
  });
  await page.goto('http://127.0.0.1:8765/prototype/english-rpg/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/Momo/}).click();await page.getByRole('button',{name:'相棒を選んで冒険へ'}).click();
  await page.locator('[data-stage="1"]').click();
  console.log(`${name}: stage 1 started`);
  if(!await page.locator('.move-card[data-move="phrase"]').isDisabled())throw new Error('phrase move should require focus before use');

  async function questionFor(type){
    const id=await page.evaluate(type=>JSON.parse(localStorage.getItem('speakingym-rpg-prototype-v1')).recentQuestions[type].at(-1),type);
    return page.evaluate(async id=>{const {questions}=await import('/prototype/english-rpg/rpg-data.js');return questions.find(q=>q.id===id);},id);
  }
  async function chooseMeaning(type,correct){
    const q=await questionFor(type);
    const answer=type==='listen'?q.choices[q.answer]:q.meaning;
    const picked=correct?answer:q.choices.find(choice=>choice!==answer);
    await page.getByRole('button',{name:picked,exact:true}).click();
    return {q,answer,picked};
  }

  await page.locator('.move-card[data-move="listen"]').click();
  console.log(`${name}: listening move`);
  await page.getByRole('button',{name:/英文を再生/}).click();
  await page.waitForTimeout(30);
  if(!(await page.locator('#speak-question').textContent()).includes('再生できません'))throw new Error('speech failure fallback was not shown');
  await page.getByRole('button',{name:'英文を確認'}).click();
  if(!await page.locator('#question-target-wrap').isVisible())throw new Error('manual transcript fallback failed');
  await chooseMeaning('listen',true);
  if(!(await page.locator('#feedback').textContent()).includes('正解'))throw new Error('correct listening answer feedback missing');
  await page.getByRole('button',{name:'次の手へ'}).click();

  await page.locator('.move-card[data-move="phrase"]').click();
  console.log(`${name}: phrase move`);
  const phrase=await questionFor('phrase');
  for(let i=0;i<phrase.tokens.length;i++)await page.locator(`.bank-chip[data-token-index="${i}"]`).click();
  const builtText=await page.locator('#phrase-built').innerText();
  if(!phrase.tokens.every(token=>builtText.includes(token)))throw new Error('selected phrase tiles are not displayed');
  await page.getByRole('button',{name:'この文で攻撃'}).click();
  if(!(await page.locator('#feedback').textContent()).includes('正解'))throw new Error('phrase assembly did not accept the natural sentence');
  await page.getByRole('button',{name:'次の手へ'}).click();

  await page.locator('.move-card[data-move="word"]').click();
  const wrong=await chooseMeaning('word',false);
  if(wrong.picked===wrong.answer)throw new Error('QA did not select an incorrect answer');
  if(!(await page.locator('#feedback').textContent()).includes('今回は違った'))throw new Error('incorrect-answer combat behavior missing');
  await page.getByRole('button',{name:'次の手へ'}).click();

  await page.locator('.move-card[data-move="word"]').click();
  await chooseMeaning('word',true);
  await page.getByRole('button',{name:'次の手へ'}).click();
  await page.locator('.move-card[data-move="word"]').click();
  await chooseMeaning('word',true);
  console.log(`${name}: victory screen reached`);
  await page.getByRole('button',{name:'勝利を確認する'}).click();
  await page.getByRole('heading',{name:'Mimipが仲間になった！'}).waitFor();
  await page.screenshot({path:path.join(shots,`english-rpg-${name}-390-capture.png`),fullPage:false});
  await page.getByRole('button',{name:/次のステージへ/}).click();
  console.log(`${name}: stage clear saved`);
  if(!(await page.locator('#stage-progress').textContent()).includes('1 / 10'))throw new Error('stage clear was not recorded');
  await page.reload();
  if(!(await page.locator('#stage-progress').textContent()).includes('1 / 10'))throw new Error('saved progress was not restored after reload');
  if(!await page.locator('[data-stage="2"]').isEnabled())throw new Error('next stage did not unlock');
  await page.locator('[data-stage="2"]').click();
  await page.locator('.move-card[data-move="word"]').click();
  await chooseMeaning('word',false);
  const afterWrong=await page.locator('#ally-hp-text').textContent();
  if(!afterWrong.includes('58/70'))throw new Error(`wrong answer did not lower player HP: ${afterWrong}`);
  await page.screenshot({path:path.join(shots,`english-rpg-${name}-390-combat.png`),fullPage:false});
  await context.close();
  await browser.close();
  console.log(`${name}: welcome/map at 320, 375, 390, 430px; battle, audio fallback, wrong/correct paths, capture, stage progression, persistence passed`);
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});
