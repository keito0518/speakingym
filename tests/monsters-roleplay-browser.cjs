const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 const url=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 const page=await browser.newPage({viewport:{width:375,height:844},isMobile:engine==='webkit',hasTouch:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const answer=async()=>{
  const answer=await page.evaluate(async()=>{
   const {ALL_PROMPTS}=await import('./monster-data.js');
   return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
  });
  await page.locator('#spoken-answer').fill(answer);
  await page.locator('#show-answer').click();
  assert.equal(await page.locator('#next-question').isVisible(),true);
  return answer;
 };
 try{
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('[data-home-page="roleplay"]').click();
  assert.equal(await page.locator('.roleplay-hub').isVisible(),true);
  assert.match(await page.locator('#roleplay-recommendation').innerText(),/レストランで伝え切る/);
  assert.equal(await page.locator('[data-roleplay-card="restaurant"]').getAttribute('data-recommended'),'true');
  await page.locator('[data-roleplay="restaurant"]').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'prefer-window-easy');
  assert.match(await page.locator('.roleplay-conversation').innerText(),/店員・メイ/);
  assert.match(await page.locator('.roleplay-progress').innerText(),/会話 1 \/ 3/);
  assert.equal(await page.locator('.roleplay-line.player').count(),0);
  await answer();
  assert.match(await page.locator('.roleplay-reply').innerText(),/Let me check the seating options/);
  await page.locator('#next-question').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'problem-food');
  assert.equal(await page.locator('.roleplay-line.player').count(),1);
  assert.match(await page.locator('.roleplay-progress').innerText(),/会話 2 \/ 3/);
  // A disputed or unrecognized utterance must not clear a turn or earn XP.
  await page.locator('#spoken-answer').fill('I have no idea.');
  await page.locator('#show-answer').click();
  assert.match(await page.locator('#feedback-panel').innerText(),/判定保留/);
  assert.equal(await page.locator('#next-question').count(),0);
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'problem-food');
  await page.locator('#show-example').click();
  assert.match(await page.locator('#feedback-panel').innerText(),/0 XP/);
  await page.locator('#next-question').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'clarify-charge-easy');
  assert.equal(await page.locator('.roleplay-line.player').count(),2);
  assert.match(await page.locator('.roleplay-line.player').last().innerText(),/例文を確認（XPなし）/);
  await answer();
  await page.locator('#next-question').click();
  assert.match(await page.locator('#result-title').innerText(),/レストランで伝え切る · 会話完了/);
  assert.match(await page.locator('.roleplay-result').innerText(),/2 \/ 3ターンを自力で返答/);
  const saved=await page.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1'));
  assert.ok(!saved.includes('I have no idea.'),'Roleplay transcripts must not be written to the saved game');
  await page.locator('#replay-run').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'prefer-window-easy');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#leave-play').click();
  // A due phrase in the other scene changes the suggested conversation.
  await page.evaluate(async()=>{
   const {STORAGE_KEY}=await import('./monster-engine.js');
   const save=JSON.parse(localStorage.getItem(STORAGE_KEY));
   save.reviewPrompts['problem-ticket-easy']='2000-01-01';
   localStorage.setItem(STORAGE_KEY,JSON.stringify(save));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('[data-home-page="roleplay"]').click();
  assert.equal(await page.locator('[data-roleplay-card="station"]').getAttribute('data-recommended'),'true');
  assert.match(await page.locator('#roleplay-recommendation').innerText(),/駅の困りごとを解決/);
  await page.locator('[data-roleplay-level="hard"]').click();
  assert.equal(await page.locator('[data-roleplay-card="restaurant"]').getAttribute('data-recommended'),'true',
    'An easy-only due phrase must not mislead the hard-level recommendation');
  await page.locator('[data-roleplay="station"]').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'problem-ticket-hard');
  assert.match(await page.locator('.roleplay-conversation').innerText(),/駅員・カイ/);
  assert.match(await page.locator('.roleplay-line.current').innerText(),/something wrong with your ticket/);
  await page.locator('#roleplay-translation > summary').click();
  assert.match(await page.locator('#roleplay-translation').innerText(),/チケットについて/);
  await answer();
  assert.match(await page.locator('.roleplay-reply').innerText(),/I will check the payment and ticket details/);
  await page.locator('#next-question').click();
  assert.match(await page.locator('.roleplay-line.player').first().innerText(),/ヒントあり/,
    'Opening the NPC translation must not count as unassisted practice');
  const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(bounds.scroll<=bounds.width+1,`Roleplay must not overflow a mobile screen: ${JSON.stringify(bounds)}`);
  assert.deepEqual(errors,[]);
  console.log(`${engine}: personalized 3-turn conversation, review safety, recap, replay and mobile layout passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
