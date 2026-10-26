const { chromium, webkit } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

let browser;
(async () => {
  const name = process.env.RPG_BROWSER_ENGINE === 'webkit' ? 'webkit' : 'chromium';
  browser = await (name === 'webkit' ? webkit : chromium).launch({headless:true});
  const shots = path.join(process.cwd(), 'qa-screenshots');
  fs.mkdirSync(shots, {recursive:true});
  const shot = async (page, file) => { await page.waitForTimeout(450); await page.screenshot({path:path.join(shots,file),fullPage:true}); };
  const boot = async (width, speechRecognition=false) => {
    const context = await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:name==='webkit',hasTouch:true,reducedMotion:'reduce'});
    const page = await context.newPage();
    await page.addInitScript(({speechRecognition}) => {
      Math.random = () => .01;
      window.SpeechSynthesisUtterance = class {constructor(text){this.text=text;this.lang='';this.onerror=null;this.onend=null;}};
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(utterance){queueMicrotask(()=>utterance.onerror?.({error:'not-allowed'}));}}});
      if (speechRecognition) window.SpeechRecognition = class {
        start(){queueMicrotask(()=>this.onresult?.({resultIndex:0,results:[{0:{transcript:'Take the mossy path to the bridge.'},isFinal:true}]}));}
        stop(){this.onend?.();} abort(){}
      };
    }, {speechRecognition});
    await page.goto('http://127.0.0.1:8765/prototype/english-rpg/',{waitUntil:'networkidle'});
    return {context,page};
  };
  for (const width of [320,375,390,430]) {
    const {context,page}=await boot(width);
    await shot(page,`quest-${name}-${width}-welcome.png`);
    await page.getByRole('button',{name:/Momo/}).click();
    await page.getByRole('button',{name:'相棒を選んで冒険へ'}).click();
    await shot(page,`quest-${name}-${width}-map.png`);
    await page.locator('[data-stage="1"]').click();
    await shot(page,`quest-${name}-${width}-listen.png`);
    assert.equal(await page.locator('#story-transcript').isVisible(),false);
    const size=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(size.scroll<=size.inner+1,`${name} ${width}px horizontal overflow: ${JSON.stringify(size)}`);
    await context.close();
  }
  const {context,page}=await boot(390,name==='chromium');
  await page.getByRole('button',{name:/Momo/}).click();
  await page.getByRole('button',{name:'相棒を選んで冒険へ'}).click();
  await page.locator('[data-stage="1"]').click();
  await page.getByRole('button',{name:'▶ 旅人の声を聞く'}).click();
  await page.getByText('再生できません').waitFor();
  assert.equal(await page.locator('#story-transcript').isVisible(),true);
  await page.getByRole('button',{name:'村への切符をなくした'}).click();
  assert.match(await page.locator('#story-feedback').innerText(),/Could you say that again/);
  await page.getByRole('button',{name:'橋が見つからない'}).click();
  assert.match(await page.locator('.forest-sign').innerText(),/left path ends at a cliff/);
  await page.reload();
  assert.equal(await page.locator('.forest-sign').isVisible(),false);
  await page.locator('[data-stage="1"]').click();
  assert.equal(await page.locator('.forest-sign').isVisible(),true);
  await page.getByRole('button',{name:'左の道を進む'}).click();
  assert.match(await page.locator('#story-feedback').innerText(),/cliff/);
  await page.getByRole('button',{name:'苔の生えた右の道を進む'}).click();
  assert.equal(await page.locator('.move-card[data-move="phrase"]').isEnabled(),true);
  await shot(page,`quest-${name}-390-battle.png`);
  await page.locator('.move-card[data-move="word"]').click();
  await page.locator('.answer-option[data-value="ふさぐものを取り除く"]').click();
  assert.match(await page.locator('#feedback').innerText(),/正解/);
  await page.getByRole('button',{name:'次の手へ'}).click();
  await page.locator('.move-card[data-move="phrase"]').click();
  for(const i of [1,0,2,3])await page.locator(`.bank-chip[data-token-index="${i}"]`).click();
  await page.getByRole('button',{name:'この文で攻撃'}).click();
  assert.match(await page.locator('#feedback').innerText(),/今回は違った/);
  await page.getByRole('button',{name:'次の手へ'}).click();
  await page.locator('.move-card[data-move="phrase"]').click();
  for(const i of [0,1,2,3])await page.locator(`.bank-chip[data-token-index="${i}"]`).click();
  await page.getByRole('button',{name:'この文で攻撃'}).click();
  await page.getByRole('button',{name:'勝利を確認する'}).click();
  await page.getByRole('heading',{name:'旅人に道を教えよう'}).waitFor();
  assert.match(await page.locator('#story-task .transcript').innerText(),/Which path should I take to the bridge/);
  assert.equal(await page.locator('[data-action="submit-speech"]').isDisabled(),true);
  if(name==='chromium'){
    await page.locator('[data-action="record"]').click();
    await page.waitForFunction(()=>document.querySelector('#forest-speech')?.value.includes('mossy path'));
    assert.match(await page.locator('#forest-speech').inputValue(),/mossy path/);
  }else{
    await page.locator('[data-action="record"]').click();
    assert.match(await page.locator('#speech-status').innerText(),/使えません/);
    await page.locator('#forest-speech').fill('Follow the mossy path to the bridge.');
  }
  await shot(page,`quest-${name}-390-speak.png`);
  await page.locator('[data-action="submit-speech"]').click();
  assert.match(await page.locator('.example-lines').innerText(),/leads to the bridge/);
  await page.locator('[data-action="finish-forest"]').click();
  await page.getByRole('heading',{name:'Mimipが仲間入り！'}).waitFor();
  await shot(page,`quest-${name}-390-capture.png`);
  await page.getByRole('button',{name:'マップへ戻る'}).click();
  assert.match(await page.locator('#stage-progress').innerText(),/1 \/ 10/);
  await page.reload();
  assert.match(await page.locator('#stage-progress').innerText(),/1 \/ 10/);
  assert.equal(await page.locator('[data-stage="2"]').isEnabled(),true);
  await page.getByRole('button',{name:'相棒・図鑑'}).click();
  assert.match(await page.locator('#dex-count').innerText(),/1 \/ 12/);
  await context.close();
  console.log(`${name}: 320/375/390/430 visual QA, stage 1 story, audio fallback, reading, combat, speech fallback, capture, XP, save/reload passed`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
