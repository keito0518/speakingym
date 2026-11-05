const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

(async()=>{
 const engine=process.env.MONSTERS_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 const url=process.env.MONSTERS_BASE_URL||'http://127.0.0.1:8766/prototype/speakingym-monsters/';
 const page=await browser.newPage({viewport:{width:320,height:844},isMobile:engine==='webkit',hasTouch:true});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const assertNoOverflow=async(where)=>{
  const dimensions=await page.evaluate(()=>({screen:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll<=dimensions.screen+1,`${engine} ${where} overflowed: ${JSON.stringify(dimensions)}`);
 };
 try{
  await page.goto(url,{waitUntil:'networkidle'});
  // Seed only a local test save; the browser test never accesses production data.
  await page.evaluate(async()=>{
   const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
   const fixture={...createSave(),coins:240,treasureBag:{amber_leaf:2,star_gear:1},
    ownedMonsters:['medamago','kohan'],monsterXp:{medamago:0,kohan:0},xpWallet:195};
   localStorage.setItem(STORAGE_KEY,JSON.stringify(fixture));
  });
  await page.reload({waitUntil:'networkidle'});
  await assertNoOverflow('home');
  assert.equal(await page.locator('[data-feature-armory]').isVisible(),true,'The forge must be discoverable from home');
  await page.locator('[data-feature-armory]').click();
  assert.equal(await page.locator('#collection-shop').isVisible(),true);
  assert.match(await page.locator('#shop-coins').innerText(),/240 G/);
  assert.equal(await page.locator('#shop-draw').isEnabled(),true);
  assert.match(await page.locator('.shop-odds').innerText(),/67%.*26%.*6%.*1%/s);
  assert.match(await page.locator('.shop-gacha').innerText(),/現金購入・課金ガチャ・換金はありません/);
  assert.equal(await page.locator('[data-sell-treasure]').count(),2);
  assert.match(await page.locator('#collection-progress').innerText(),/44体/);
  assert.equal(await page.locator('[data-open-monster="kohan"] [data-pixel-sprite="kohan"]').count(),1,
   'New story species need distinct art in the catalog');
  await assertNoOverflow('forge');

  // Deterministically exercise the hardest-to-get reward for display and
  // persistent save purposes; regular players use native Math.random.
  await page.evaluate(()=>{Math.random=()=>.009;});
  await page.locator('#shop-draw').click();
  assert.match(await page.locator('#shop-gacha-result').innerText(),/伝説 獲得/);
  assert.match(await page.locator('#shop-coins').innerText(),/120 G/);
  assert.equal(await page.locator('#equipment-weapon-choice option').count(),2);
  await page.locator('#equipment-weapon-choice').selectOption('eternal_crest');
  assert.equal(await page.locator('.equipment-monster-preview [data-equipped-weapon="eternal_crest"]').count(),1,
   'The equipped weapon must be rendered on the actual character');
  assert.match(await page.locator('#equipment-weapon-status').innerText(),/伝説.*追撃＋2/);
  await assertNoOverflow('equipped forge');

  await page.locator('#shop-sell-all').click();
  assert.match(await page.locator('#shop-coins').innerText(),/230 G/);
  assert.equal(await page.locator('#shop-sell-all').isDisabled(),true);
  assert.equal(await page.locator('[data-sell-treasure]').count(),0);
  await page.locator('#collection-home').click();
  assert.equal(await page.locator('#hero-monster-art [data-equipped-weapon="eternal_crest"]').count(),1,
   'Equipment preview must match the home character');
  await assertNoOverflow('equipped home');

  await page.reload({waitUntil:'networkidle'});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
  assert.equal(saved.coins,230);
  assert.deepEqual(saved.treasureBag,{});
  assert.deepEqual(saved.weaponInventory,['eternal_crest']);
  assert.equal(saved.equippedWeaponId,'eternal_crest');
  assert.equal(saved.gachaPullCount,1);
  assert.equal(saved.xpWallet,195,'Trading and forging must not consume learning XP');
  assert.equal(saved.ownedMonsters.length,2,'Gacha must never grant or lose companions');
  assert.equal(await page.locator('#hero-monster-art [data-equipped-weapon="eternal_crest"]').count(),1,
   'Equipped weapon art must survive a full browser reload');
  assert.deepEqual(errors,[],`${engine} browser console errors`);
  console.log(`${engine}: treasure sale, earned-only gacha, 44 story monsters, weapon appearance and reload passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
