// Keep the page responsive after the complete attack; checking a CSS name alone
// does not prove that the mobile WebKit document can still process user input.
const {webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await webkit.launch({headless:true});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
    const page=await context.newPage();
    page.setDefaultTimeout(12000);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('crash',()=>errors.push('Page crashed'));
    await page.goto(process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/');
    await page.locator('[data-home-page="forest"]').click();
    await page.locator('#start-forest').click();
    // The intro may already advance straight into combat on WebKit. Only
    // click the explore Continue button when that panel is actually visible.
    if(await page.locator('#forest-explore-continue').isVisible())
      await page.locator('#forest-explore-continue').click();
    try { await page.locator('#forest-journey').waitFor({state:'visible'}); }
    catch (error) {
      const debug=await page.evaluate(()=>({
        state:document.querySelector('#play-view')?.hidden,
        explore:document.querySelector('#forest-explore-screen')?.hidden,
        home:document.querySelector('#home-view')?.hidden,
        label:document.querySelector('#play-mode-label')?.textContent,
        answer:document.querySelector('#answer-area')?.hidden
      }));
      throw new Error(`WebKit start failed: ${JSON.stringify(debug)}; page errors: ${errors.join(' | ')}; ${error.message}`);
    }
    await page.locator('#spoken-answer').fill('I have an unexpected answer.');
    await page.locator('#show-answer').click();
    assert.equal(await page.locator('.forest-guarding').count(),1);
    const example=await page.evaluate(async()=>{
      const {ALL_PROMPTS}=await import('./monster-data.js');
      return ALL_PROMPTS.find(p=>p.id===document.querySelector('#play-card').dataset.promptId).answer;
    });
    await page.locator('#spoken-answer').fill(example);
    await page.locator('#show-answer').click();
    assert.equal(await page.locator('.forest-attack').count(),1);
    await page.waitForTimeout(1500);
    // Read the live DOM after all impact animations finish, then use a visible
    // button at the answer area. No offscreen navigation/autoscroll is involved.
    assert.match(await page.locator('#feedback-panel').innerText(),/関門突破/);
    await page.locator('#next-question').click();
    assert.equal(await page.locator('#forest-explore-screen').isVisible(),true);
    assert.equal(await page.locator('#forest-journey').isVisible(),false);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.locator('#leave-play').click();
    assert.equal(await page.locator('#home-view').isVisible(),true,`WebKit navigation errors: ${errors.join(' | ')}; current view: ${await page.locator('.view:not([hidden])').evaluateAll(nodes=>nodes.map(n=>n.id).join(','))}`);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log('webkit: live DOM, next encounter and home navigation remain responsive after guard + full attack animation');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
