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
  assert.equal(await page.locator('[data-roleplay-card]').count(),4,
    'Four different situations must be discoverable without hidden navigation');
  assert.equal(await page.locator('.roleplay-option p').first().isVisible(),false,
    'Scene names carry the menu without long descriptions in every card');
  assert.equal(await page.locator('.roleplay-about').getAttribute('open'),null,
    'Honest limitations remain accessible but start collapsed');
  assert.equal(await page.locator('[data-roleplay="restaurant"]').isVisible(),true,
    'The recommended scene is directly actionable');
  assert.match(await page.locator('#roleplay-recommendation').innerText(),/レストランで伝え切る/);
  assert.equal(await page.locator('[data-roleplay-card="restaurant"]').getAttribute('data-recommended'),'true');
  assert.equal(await page.locator('[data-roleplay-card]').first().getAttribute('data-roleplay-card'),'restaurant');
  await page.locator('[data-roleplay="restaurant"]').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'prefer-window-easy');
  assert.match(await page.locator('.roleplay-conversation').innerText(),/店員・メイ/);
  assert.match(await page.locator('.roleplay-progress').innerText(),/会話 1 \/ 3/);
  assert.equal(await page.locator('.roleplay-line.player').count(),0);
  await answer();
  assert.equal(await page.locator('.conversation-feedback').getAttribute('data-conversation-verdict'),'correct');
  assert.match(await page.locator('.conversation-feedback').innerText(),/会話フィードバック|次の一歩/);
  assert.match(await page.locator('.roleplay-reply').innerText(),/Let me check the seating options/);
  assert.equal(await page.locator('#conversation-polish').count(),1,
    'A verified conversation turn offers optional paraphrase practice');
  assert.equal(await page.locator('#conversation-polish').getAttribute('open'),null,
    'Extra practice starts collapsed to keep the next-turn action obvious');
  await page.locator('#conversation-polish > summary').click();
  assert.equal(await page.locator('#next-question').isVisible(),true,
    'Paraphrase practice must never block the next conversation turn');
  const saveBeforePolish=await page.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1'));
  await page.locator('#conversation-polish-input').fill("I'd prefer a window seat.");
  await page.locator('#conversation-polish-check').click();
  assert.equal(await page.locator('.conversation-polish-verdict').getAttribute('data-polish-status'),'same');
  await page.locator('#conversation-polish-input').fill("I'd rather sit by the window.");
  await page.locator('#conversation-polish-check').click();
  assert.equal(await page.locator('.conversation-polish-verdict').getAttribute('data-polish-status'),'correct');
  assert.match(await page.locator('.conversation-polish-verdict').innerText(),/追加XP 0/);
  await page.locator('#conversation-polish-input').fill('I have no idea.');
  await page.locator('#conversation-polish-check').click();
  assert.equal(await page.locator('.conversation-polish-verdict').getAttribute('data-polish-status'),'review');
  assert.match(await page.locator('.conversation-polish-verdict').innerText(),/簡易判定では確認できない/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1')),saveBeforePolish,
    'Optional paraphrases must never grant extra XP or change saved progress');
  await page.locator('#next-question').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'problem-food');
  assert.equal(await page.locator('.roleplay-line.player').count(),1);
  assert.match(await page.locator('.roleplay-line.player').first().innerText(),/prefer a window seat/,
    'The original verified reply stays in conversation history, not the extra practice');
  assert.match(await page.locator('.roleplay-line').nth(2).innerText(),/Let me check the seating options/,
    'The NPC response should remain visible in conversation history');
  assert.match(await page.locator('.roleplay-progress').innerText(),/会話 2 \/ 3/);
  // A disputed or unrecognized utterance must not clear a turn or earn XP.
  await page.locator('#spoken-answer').fill('I have no idea.');
  await page.locator('#show-answer').click();
  assert.match(await page.locator('#feedback-panel').innerText(),/判定保留/);
  assert.equal(await page.locator('.conversation-feedback').getAttribute('data-conversation-verdict'),'review');
  assert.equal(await page.locator('.conversation-feedback-example').count(),0,
    'Review must not leak the complete sample before the learner opts out of XP');
  assert.equal(await page.locator('#next-question').count(),0);
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'problem-food');
  await page.locator('#show-example').click();
  assert.match(await page.locator('#feedback-panel').innerText(),/0 XP/);
  assert.match(await page.locator('.conversation-feedback-example').innerText(),/参考例/);
  assert.equal(await page.locator('.roleplay-reply').getAttribute('data-roleplay-branch'),'supported');
  assert.match(await page.locator('.roleplay-reply').innerText(),/自分で返答した扱いにはならない/);
  await page.locator('#next-question').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'clarify-charge-easy');
  assert.equal(await page.locator('.roleplay-line.player').count(),2);
  assert.match(await page.locator('.roleplay-line.player').last().innerText(),/例文を確認（XPなし）/);
  assert.match(await page.locator('.roleplay-line.current').innerText(),/keep checking the order/,
    'The next NPC opening follows the example-only support route');
  await answer();
  await page.locator('#next-question').click();
  assert.match(await page.locator('#result-title').innerText(),/レストランで伝え切る · 会話完了/);
  assert.match(await page.locator('#result-quick-summary').innerText(),/自力で返答 2\/3/);
  assert.equal(await page.locator('#result-detail-panel').getAttribute('open'),null,
    'The three-turn reward should not start with an overwhelming recap');
  await page.locator('#result-detail-panel > summary').click();
  assert.match(await page.locator('.roleplay-result').innerText(),/2 \/ 3ターンを自力で返答/);
  assert.equal(await page.locator('.roleplay-recap-track > div').count(),3);
  assert.equal(await page.locator('.roleplay-recap-track > [data-recap-status="skipped"]').count(),1);
  assert.match(await page.locator('.roleplay-coaching-card').first().innerText(),/伝えられた|会話をつなげた/);
  assert.match(await page.locator('.roleplay-coaching-card.focus').innerText(),/次回のミッション|例文を見ず/);
  assert.equal(await page.locator('.roleplay-recap-turn').count(),3);
  assert.match(await page.locator('.roleplay-recap-turn').nth(1).innerText(),/例文で復習/);
  assert.match(await page.locator('.roleplay-recap-turn').nth(1).innerText(),/自力で伝わったかはまだ判定していない/);
  assert.equal(await page.locator('.roleplay-recap-coaching').count(),3,
    'Each turn should give its own actionable learning feedback');
  assert.match(await page.locator('.roleplay-recap-turn').nth(1).innerText(),/注文と違う点|I ordered/);
  assert.match(await page.locator('.roleplay-coaching-card.focus').innerText(),/I ordered/);
  assert.equal(await page.locator('.roleplay-recap-examples').count(),2,
    'Confirmed turns can hide long example text behind an optional disclosure');
  assert.equal(await page.locator('.roleplay-recap-examples').first().getAttribute('open'),null);
  await page.locator('.roleplay-recap-examples > summary').first().click();
  assert.match(await page.locator('.roleplay-recap-examples').first().innerText(),/参考表現|別の伝え方/);
  assert.match(await page.locator('.roleplay-recap-turn').nth(1).innerText(),/例文練習へのサポート/);
  assert.equal(await page.locator('.roleplay-recap-turn').nth(1).locator('.roleplay-recap-evidence').count(),1);
  assert.match(await page.locator('.roleplay-recap-turn').nth(2).innerText(),/次に試すこと/);
  assert.equal(await page.locator('#roleplay-transfer').count(),1);
  assert.equal(await page.locator('#roleplay-transfer').getAttribute('open'),null,
    'Scene-changing bonus starts collapsed to keep the recap scannable');
  await page.locator('#roleplay-transfer > summary').click();
  assert.match(await page.locator('.roleplay-transfer-scenes').innerText(),/レストランの席.*街の移動/s);
  assert.match(await page.locator('.roleplay-transfer-prompt').innerText(),/電車/);
  const beforeTransfer=await page.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1'));
  await page.locator('#roleplay-transfer-check').click();
  assert.equal(await page.locator('.roleplay-transfer-verdict').getAttribute('data-transfer-status'),'empty');
  assert.equal(await page.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1')),beforeTransfer,
    'An empty optional check must not schedule a review or mutate local progress');
  await page.locator('#roleplay-transfer-input').fill('I have no idea.');
  await page.locator('#roleplay-transfer-check').click();
  assert.equal(await page.locator('.roleplay-transfer-verdict').getAttribute('data-transfer-status'),'review');
  assert.equal(await page.locator('.roleplay-transfer-verdict [lang="en"]').count(),0,
    'No complete answer is exposed until the learner asks to reveal it');
  const uncertainTransfer=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
  assert.equal(uncertainTransfer.transferReviews['prefer-city'].status,'review');
  assert.equal(uncertainTransfer.reviewPrompts['prefer-city'],uncertainTransfer.transferReviews['prefer-city'].due);
  assert.match(await page.locator('.roleplay-transfer-verdict').innerText(),/次のミッション/);
  await page.locator('#roleplay-transfer-input').fill("I'd rather take the train.");
  await page.locator('#roleplay-transfer-check').click();
  assert.equal(await page.locator('.roleplay-transfer-verdict').getAttribute('data-transfer-status'),'correct');
  assert.match(await page.locator('.roleplay-transfer-verdict').innerText(),/場面チェンジ成功/);
  await page.locator('#roleplay-transfer-reveal').click();
  assert.match(await page.locator('.roleplay-transfer-verdict').innerText(),/参考表現/);
  const afterTransfer=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
  const beforeTransferParsed=JSON.parse(beforeTransfer);
  assert.equal(afterTransfer.transferReviews['prefer-city'].status,'confirmed',
    'Revealing an example after a verified answer must not erase independent success');
  assert.deepEqual(afterTransfer.progress,beforeTransferParsed.progress);
  assert.deepEqual(afterTransfer.retention,beforeTransferParsed.retention);
  assert.equal(afterTransfer.xpWallet,beforeTransferParsed.xpWallet,
    'The bonus only schedules a review; XP and mastery stay unchanged');
  const saved=await page.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1'));
  assert.ok(!saved.includes('I have no idea.'),'Roleplay transcripts must not be written to the saved game');
  await page.locator('#replay-run').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'prefer-window-easy');
  await page.locator('#spoken-answer').fill("I'd rather sit by the window.");
  await page.locator('#show-answer').click();
  assert.equal(await page.locator('.roleplay-reply').getAttribute('data-roleplay-branch'),'alternate');
  assert.match(await page.locator('.roleplay-reply').innerText(),/find a table that fits your request/);
  assert.equal(await page.locator('#next-question').isVisible(),true);
  await page.locator('#next-question').click();
  assert.match(await page.locator('.roleplay-line.current').innerText(),/all set at your table/);
  assert.match(await page.locator('.roleplay-line').nth(2).innerText(),/find a table that fits your request/);
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
  assert.equal(await page.locator('[data-roleplay-card]').first().getAttribute('data-roleplay-card'),'station',
    'A suggested review should be the first visible scene, not buried below other cards');
  assert.match(await page.locator('#roleplay-recommendation').innerText(),/駅の困りごとを解決/);
  await page.locator('[data-roleplay-level="hard"]').click();
  assert.doesNotMatch(await page.locator('#roleplay-recommendation').innerText(),/復習期日の表現/,
    'An easy-only due prompt must not be misrepresented as a hard-level review');
  assert.equal(await page.locator('[data-roleplay-card]').first().getAttribute('data-recommended'),'true');
  await page.locator('[data-roleplay="station"]').click();
  assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),'problem-ticket-hard');
  assert.match(await page.locator('.roleplay-conversation').innerText(),/駅員・カイ/);
  assert.match(await page.locator('.roleplay-line.current').innerText(),/something wrong with your ticket/);
  await page.locator('#roleplay-translation > summary').click();
  assert.match(await page.locator('#roleplay-translation').innerText(),/チケットについて/);
  await answer();
  assert.match(await page.locator('.conversation-feedback').innerText(),/ヒントを使って内容を確認できた/);
  assert.match(await page.locator('.roleplay-reply').innerText(),/I will check the payment and ticket details/);
  await page.locator('#next-question').click();
  assert.match(await page.locator('.roleplay-line.player').first().innerText(),/ヒントあり/,
    'Opening the NPC translation must not count as unassisted practice');
  const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(bounds.scroll<=bounds.width+1,`Roleplay must not overflow a mobile screen: ${JSON.stringify(bounds)}`);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#leave-play').click();
  await page.locator('[data-home-page="roleplay"]').click();
  await page.locator('[data-roleplay-level="easy"]').click();
  for(const [scene,ids] of [
   ['hotel',['booking-hotel','apology-noise','clarify-hotel']],
   ['market',['city-market-speak-order-hard','city-market-speak-bill-hard','city-market-speak-return-hard']]
  ]){
   if(scene==='market')await page.locator('[data-roleplay-level="hard"]').click();
   await page.locator(`[data-roleplay="${scene}"]`).click();
   for(const [index,id] of ids.entries()){
    assert.equal(await page.locator('#play-card').getAttribute('data-prompt-id'),id);
    assert.match(await page.locator('.roleplay-progress').innerText(),new RegExp(`会話 ${index+1} \\/ 3`));
    await answer();
    assert.equal(await page.locator('.roleplay-reply').getAttribute('data-roleplay-branch'),'standard');
    await page.locator('#next-question').click();
   }
   assert.match(await page.locator('#result-title').innerText(),/会話完了/);
   assert.equal(await page.locator('.roleplay-recap-turn').count(),3);
   await page.locator('#roleplay-transfer > summary').click();
   assert.match(await page.locator('.roleplay-transfer-scenes').innerText(),
     scene==='hotel'?/宿泊予約.*美容室/s:/crowded stall.*pizza restaurant/s);
   const transferBefore=await page.evaluate(()=>localStorage.getItem('speakingym-monsters-prototype-v1'));
   const destinationAnswer=await page.evaluate(async sceneArg=>{
    const {roleplayFor}=await import('./roleplay-scenarios.js');
    const {roleplayTransferFor}=await import('./roleplay-transfer.js');
    const rp=roleplayFor(sceneArg,sceneArg==='market'?'hard':'easy');
    return roleplayTransferFor({...rp,history:rp.turns.map(()=>({outcome:'smooth'}))}).prompt.answer;
   },scene);
   await page.locator('#roleplay-transfer-input').fill(destinationAnswer);
   await page.locator('#roleplay-transfer-check').click();
   assert.equal(await page.locator('.roleplay-transfer-verdict').getAttribute('data-transfer-status'),'correct');
   const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
   assert.equal(after.xpWallet,JSON.parse(transferBefore).xpWallet);
   assert.deepEqual(after.progress,JSON.parse(transferBefore).progress);
   assert.equal(Object.values(after.transferReviews).filter(value=>value.status==='confirmed').length>=1,true);
   await page.locator('#result-home').click();
   await page.locator('[data-home-page="roleplay"]').click();
  }
  const expandedBounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(expandedBounds.scroll<=expandedBounds.width+1,`Expanded roleplay menu must fit mobile: ${JSON.stringify(expandedBounds)}`);
  // The next-day mission must open the exact transferred situation as ONE
  // question, reward only a new independently checked answer, then disappear.
  const nextDay=await browser.newPage({viewport:{width:375,height:844}});
  nextDay.on('pageerror',error=>errors.push(error.message));
  await nextDay.goto(url,{waitUntil:'networkidle'});
  await nextDay.evaluate(async()=>{
    const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
    const save=createSave();
    save.transferReviews['prefer-city']={due:'2020-01-01',status:'confirmed'};
    save.reviewPrompts['prefer-city']='2020-01-01';
    localStorage.setItem(STORAGE_KEY,JSON.stringify(save));
  });
  await nextDay.reload({waitUntil:'networkidle'});
  assert.match(await nextDay.locator('#home-next-quest-title').innerText(),/昨日の応用/);
  await nextDay.locator('#home-next-quest-button').click();
  assert.match(await nextDay.locator('#play-mode-label').innerText(),/場面チェンジの復習/);
  assert.equal(await nextDay.locator('#play-card').getAttribute('data-prompt-id'),'prefer-city');
  await nextDay.locator('#spoken-answer').fill("I'd rather take the train.");
  await nextDay.locator('#show-answer').click();
  assert.match(await nextDay.locator('#feedback-panel').innerText(),/\+16 XP/);
  const afterReview=await nextDay.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
  assert.equal(afterReview.transferReviews['prefer-city'],undefined);
  assert.ok(afterReview.progress.prefer?.attempts>=1);
  await nextDay.locator('#next-question').click();
  assert.match(await nextDay.locator('#result-title').innerText(),/場面チェンジの復習完了/);
  await nextDay.locator('#replay-run').click();
  assert.match(await nextDay.locator('#play-mode-label').innerText(),/スピーキング道場/);
  await nextDay.close();
  assert.deepEqual(errors,[]);
  console.log(`${engine}: four 3-turn situations, recommendation, review safety, branches, recap and mobile layout passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
