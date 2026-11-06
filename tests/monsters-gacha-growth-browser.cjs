// A short, self-contained "no manual tapping" acceptance test for the two
// player-visible loops: summon/equip and level-up/evolve. It uses disposable
// localStorage fixtures and a deterministic draw, never a real user account.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 const url=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 const storageKey='speakingym-monsters-prototype-v1';
 let cases=0;
 try{
  for(const width of [320,390]){
   const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,
    isMobile:engine==='webkit',reducedMotion:'reduce'});
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
   const assertNoOverflow=async label=>{
    const dimensions=await page.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}));
    assert.ok(dimensions.content<=dimensions.viewport+1,
     `${engine}/${width} ${label}: horizontal overflow ${JSON.stringify(dimensions)}`);
   };
   try{
    await page.goto(url,{waitUntil:'networkidle'});
    await page.evaluate(async key=>{
     const {createSave}=await import('./monster-engine.js');
     const fixture={...createSave(),coins:360,xpWallet:300,
      monsterTrials:{medamago:['entry']}};
     localStorage.setItem(key,JSON.stringify(fixture));
    },storageKey);
    await page.reload({waitUntil:'networkidle'});
    assert.match(await page.locator('#game-hud-coins').innerText(),/360 G/);
    assert.match(await page.locator('#game-hud-xp').innerText(),/300 XP/);

    // A real click spends one game's earned-currency draw; the animation is
    // not an additional transaction and equipping changes the hero's sprite.
    await page.locator('[data-feature-armory]').click();
    assert.equal(await page.locator('#shop-draw').isEnabled(),true);
    assert.equal(await page.locator('.shop-odds').isVisible(),false);
    await page.locator('#shop-gacha-details summary').click();
    assert.match(await page.locator('.shop-odds').innerText(),/67%.*26%.*6%.*1%/s);
    await page.locator('#shop-gacha-details summary').click();
    await page.evaluate(()=>{Math.random=()=>.009;});
    await page.locator('#shop-draw').click();
    assert.equal(await page.locator('#summon-screen').getAttribute('data-rarity'),'legend');
    assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'reveal',
     'Reduced-motion mode must immediately show the saved result');
    assert.match(await page.locator('#summon-rarity').innerText(),/LEGEND/);
    assert.match(await page.locator('#summon-title').innerText(),/永遠/);
    assert.equal(await page.locator('#summon-reveal-art [data-equipped-weapon="eternal_crest"]').count(),1);
    assert.equal((await saved()).coins,240);
    assert.equal((await saved()).xpWallet,300,'A draw must not consume learning XP');
    await page.locator('#summon-equip').click();
    assert.equal(await page.locator('#equipment-weapon-choice').inputValue(),'eternal_crest');
    await page.locator('#collection-home').click();
    assert.equal(await page.locator('#hero-monster-art [data-equipped-weapon="eternal_crest"]').count(),1);
    await assertNoOverflow('equipped home');
    cases++;

    // XP is spent through visible UI, first on a real level-up, then on a
    // separate player-confirmed evolution; boss marks cannot be bought.
    await page.locator('[data-home-page="collection"]').click();
    await page.locator('[data-open-monster="medamago"]').click();
    await page.locator('#open-training').click();
    assert.match(await page.locator('[data-feed-amount="next"]').innerText(),/Lv\.2.*70 XP/);
    await page.locator('[data-feed-amount="next"]').click();
    assert.match(await page.locator('.training-level').innerText(),/Lv\.2/);
    assert.equal(await page.locator('#training-wallet').innerText(),'230 XP');
    assert.equal((await saved()).monsterXp.medamago,70);
    assert.equal((await saved()).coins,240,'Training must not take game gold');
    await page.locator('[data-feed-amount="evolution"]').click();
    assert.match(await page.locator('.training-level').innerText(),/Lv\.5/);
    assert.equal(await page.locator('#training-wallet').innerText(),'20 XP');
    assert.equal((await saved()).monsterXp.medamago,280);
    assert.equal(await page.locator('[data-evolve-monster]').isEnabled(),true,
     'A qualified companion still requires a deliberate evolution click');
    await page.locator('[data-evolve-monster]').click();
    assert.match(await page.locator('.training-sheet h1').innerText(),/Sunnyolk/);
    assert.equal((await saved()).monsterEvolution.medamago,1);
    assert.equal((await saved()).weaponInventory.includes('eternal_crest'),true);
    assert.equal((await saved()).xpWallet,20);
    await assertNoOverflow('level and evolution');
    cases++;

    // Reload is the important integration boundary: both game systems must
    // share one persisted save without resetting each other's rewards.
    await page.reload({waitUntil:'networkidle'});
    assert.match(await page.locator('#hero-monster-name').innerText(),/Sunnyolk/);
    assert.match(await page.locator('#hero-level').innerText(),/Lv\.5/);
    assert.equal(await page.locator('#hero-monster-art [data-equipped-weapon="eternal_crest"]').count(),1,
     'The evolved form still visibly carries the selected weapon');
    const reloaded=await saved();
    assert.equal(reloaded.coins,240);
    assert.equal(reloaded.xpWallet,20);
    assert.equal(reloaded.monsterXp.medamago,280);
    assert.equal(reloaded.monsterEvolution.medamago,1);
    assert.deepEqual(reloaded.weaponInventory,['eternal_crest']);
    assert.equal(reloaded.equippedWeaponId,'eternal_crest');
    assert.equal(reloaded.gachaPullCount,1);
    cases++;

    // The same item is a duplicate: a single 120 G draw returns 90 G once,
    // with no extra weapon, no XP loss and no accidental second evolution.
    await page.locator('[data-feature-armory]').click();
    await page.evaluate(()=>{Math.random=()=>.009;});
    await page.locator('#shop-draw').click();
    assert.match(await page.locator('#summon-duplicate').innerText(),/90 G 返還/);
    await page.locator('#summon-close').click();
    await page.reload({waitUntil:'networkidle'});
    const final=await saved();
    assert.equal(final.coins,210);
    assert.equal(final.gachaPullCount,2);
    assert.deepEqual(final.weaponInventory,['eternal_crest']);
    assert.equal(final.xpWallet,20);
    assert.equal(final.monsterXp.medamago,280);
    assert.equal(final.monsterEvolution.medamago,1);
    assert.deepEqual(errors,[],`${engine}/${width}: no script errors allowed`);
    await assertNoOverflow('persisted final home');
    cases++;
   }finally{await context.close();}
  }
  console.log(`${engine}: PASS ${cases} acceptance cases (320px + 390px): summon/equip, level-up/evolve, reload, duplicate/refund`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
