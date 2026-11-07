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
  assert.equal(await page.locator('.game-tabs button').count(),5,'Mobile game should have persistent native-style tabs');
  assert.equal(await page.locator('#game-tabs [data-game-tab="home"]').getAttribute('aria-current'),'page');
  assert.match(await page.locator('#game-hud-coins').innerText(),/240 G/);
  assert.equal(await page.locator('[data-feature-armory]').isVisible(),true,'The forge must be discoverable from home');
  assert.match(await page.locator('[data-feature-armory]').innerText(),/今すぐ引ける/,'The hub should celebrate when enough earned G is ready');
  await page.locator('[data-feature-armory]').click();
  assert.equal(await page.locator('#collection-shop').isVisible(),true);
  assert.equal(await page.locator('#collection-weapons').isVisible(),false,
   'Gacha draws stay in focus until equipment is explicitly opened');
  assert.equal(await page.locator('#collection-archive').isVisible(),false,
   'The gacha is not followed by the entire game compendium');
  const gachaOrder=await page.locator('#collection-shop > *').evaluateAll(elements=>elements.map(el=>el.className));
  assert.ok(gachaOrder.findIndex(name=>name.includes('shop-wallet'))<gachaOrder.findIndex(name=>name.includes('shop-gacha')),
   'Current funds must appear before the draw');
  assert.ok(gachaOrder.findIndex(name=>name.includes('shop-gacha'))<gachaOrder.findIndex(name=>name.includes('shop-bag')),
   'A player who can already draw should not be forced past the treasure seller');
  assert.match(await page.locator('#shop-coins').innerText(),/240 G/);
  assert.equal(await page.locator('#shop-draw').isEnabled(),true);
  assert.equal(await page.locator('#shop-gacha-details').getAttribute('open'),null,'Odds stay collapsed until requested');
  assert.equal(await page.locator('.shop-odds').isVisible(),false,'The summon CTA is not buried under probability tables');
  await page.locator('#shop-gacha-details summary').click();
  assert.match(await page.locator('.shop-odds').innerText(),/67%.*26%.*6%.*1%/s);
  assert.match(await page.locator('.shop-gacha').innerText(),/現金購入・課金ガチャ・換金はできません/);
  assert.equal(await page.locator('.shop-pity-meter').count(),2,'Rarity guarantees should have visible progress meters');
  assert.equal(await page.locator('.shop-collection-meter').getAttribute('aria-valuemax'),'64');
  assert.match(await page.locator('.shop-collection-copy').innerText(),/0 \/ 64 種/);
  assert.match(await page.locator('.shop-pity-tracks').innerText(),/最大あと 7 回.*最大あと 25 回/s);
  await page.locator('#shop-gacha-details summary').click();
  assert.equal(await page.locator('#shop-gacha-catalog').getAttribute('open'),null);
  await page.locator('#shop-gacha-catalog summary').click();
  assert.equal(await page.locator('.shop-catalog-card.is-mystery').count(),64);
  assert.equal(await page.locator('.shop-catalog-card.is-mystery').first().innerText().then(text=>text.includes('？？？')),true);
  await page.locator('#shop-gacha-catalog summary').click();
  assert.equal(await page.locator('[data-sell-treasure]').count(),2);
  assert.match(await page.locator('#collection-progress').innerText(),/44体/);
  assert.equal(await page.locator('[data-open-monster="kohan"] [data-pixel-sprite="kohan"]').count(),1,
   'New story species need distinct art in the catalog');
  await assertNoOverflow('forge');

  // Deterministically exercise the hardest-to-get reward for display and
  // persistent save purposes; regular players use native Math.random.
  await page.evaluate(()=>{Math.random=()=>.009;});
  await page.locator('#shop-draw').click();
  assert.equal(await page.locator('#summon-screen').isVisible(),true,'Summon should take over the game screen');
  assert.equal(await page.locator('#summon-screen').getAttribute('data-rarity'),'legend');
  assert.match(await page.locator('#game-hud-coins').innerText(),/120 G/,'Reward must commit before the cinematic');
  if(await page.locator('#summon-skip').isVisible())await page.locator('#summon-skip').click();
  assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'reveal');
  assert.match(await page.locator('#summon-title').innerText(),/永遠/);
  assert.match(await page.locator('#summon-rarity').innerText(),/LEGEND/);
  assert.equal(await page.locator('#summon-reveal-art [data-equipped-weapon="eternal_crest"]').count(),1,
   'The summoned weapon must visibly appear on the companion');
  assert.equal(await page.locator('#summon-skip').isHidden(),true);
  assert.equal(await page.locator('#summon-equip').isVisible(),true);
  assert.match(await page.locator('#shop-gacha-result').innerText(),/ガチャ結果を保存/);
  assert.match(await page.locator('#shop-coins').innerText(),/120 G/);
  assert.equal(await page.locator('#equipment-weapon-choice option').count(),2);
  await page.locator('#summon-equip').click();
  assert.equal(await page.locator('#summon-screen').isHidden(),true);
  assert.equal(await page.locator('#collection-weapons').isVisible(),true,
   'Equipping after a draw opens the dedicated equipment screen');
  assert.equal(await page.locator('#collection-shop').isVisible(),false);
  assert.equal(await page.locator('#equipment-weapon-choice').inputValue(),'eternal_crest');
  assert.equal(await page.locator('.equipment-monster-preview [data-equipped-weapon="eternal_crest"]').count(),1,
   'The equipped weapon must be rendered on the actual character');
  assert.match(await page.locator('#equipment-weapon-status').innerText(),/伝説.*追撃＋2/);
  const ownedCard=page.locator('.equipment-item[data-item-id="eternal_crest"]');
  assert.equal(await ownedCard.count(),1,'Owned equipment should have a visible inventory card');
  assert.equal(await ownedCard.locator('.equipment-item-image [data-equipped-weapon="eternal_crest"]').count(),1,
   'The inventory portrait must use the same pixel weapon as the character and gacha');
  assert.match(await ownedCard.innerText(),/攻撃\s*＋13/);
  assert.match(await ownedCard.innerText(),/文法を自力正解で追撃＋2/);
  assert.equal(await ownedCard.locator('[data-equip-weapon]').isDisabled(),true);
  await page.locator('#equipment-unequip').click();
  assert.equal(await page.locator('#equipment-weapon-choice').inputValue(),'','Unequipping should update the save');
  await page.locator('[data-equip-weapon="eternal_crest"]').click();
  assert.equal(await page.locator('#equipment-weapon-choice').inputValue(),'eternal_crest',
   'Re-equipping from the image card should restore the combat item');
  await assertNoOverflow('equipped forge');

  await page.locator('#collection-equipment-back').click();
  await page.locator('#shop-sell-all').click();
  assert.match(await page.locator('#shop-coins').innerText(),/230 G/);
  assert.equal(await page.locator('#shop-sell-all').isDisabled(),true);
  assert.equal(await page.locator('[data-sell-treasure]').count(),0);
  await page.locator('#game-tabs [data-game-tab="home"]').click();
  assert.equal(await page.locator('#hero-monster-art [data-equipped-weapon="eternal_crest"]').count(),1,
   'Equipment preview must match the home character');
  assert.match(await page.locator('[data-feature-armory]').innerText(),/今すぐ引ける/,'The hub projection must refresh after trading loot');
  await assertNoOverflow('equipped home');

  // The bottom navigation is a functional game menu, not decorative links.
  await page.locator('#game-tabs [data-game-tab="forge"]').click();
  assert.equal(await page.locator('#collection-shop').isVisible(),true);
  assert.equal(await page.locator('#game-tabs [data-game-tab="forge"]').getAttribute('aria-current'),'page');
  await page.locator('#game-tabs [data-game-tab="party"]').click();
  assert.equal(await page.locator('#collection-weapons').isVisible(),false,
    'The party tab shows companions first, without an equipment wall');
  await page.locator('#collection-open-equipment').click();
  assert.equal(await page.locator('#collection-weapons').isVisible(),true);
  assert.equal(await page.locator('#game-tabs [data-game-tab="party"]').getAttribute('aria-current'),'page');
  await page.locator('#game-tabs [data-game-tab="review"]').click();
  assert.equal(await page.locator('.review-journal').isVisible(),true);
  assert.equal(await page.locator('#game-tabs [data-game-tab="review"]').getAttribute('aria-current'),'page');
  await page.locator('#game-tabs [data-game-tab="home"]').click();
  assert.equal(await page.locator('#home-navigation').isVisible(),true);

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

  await page.locator('#game-tabs [data-game-tab="forge"]').click();
  await page.evaluate(()=>{Math.random=()=>.009;});
  await page.locator('#shop-draw').click();
  if(await page.locator('#summon-skip').isVisible())await page.locator('#summon-skip').click();
  assert.match(await page.locator('#summon-duplicate').innerText(),/90 G 返還/);
  assert.match(await page.locator('#shop-coins').innerText(),/200 G/);
  await page.locator('#summon-repeat').click();
  assert.match(await page.locator('#shop-coins').innerText(),/170 G/,'Repeat spends once and returns duplicate gold once');
  await page.locator('#summon-close').click();
  assert.equal(await page.locator('#summon-screen').isHidden(),true);
  const afterRepeat=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
  assert.equal(afterRepeat.gachaPullCount,3,'Skip, close and equipping must never reroll');
  assert.deepEqual(afterRepeat.weaponInventory,['eternal_crest']);
  // The ordinary motion path for EPIC has an extra build-up stage that can
  // always be skipped, and a new draw is charged only once at its start.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{Math.random=()=>.03;});
  await page.locator('#shop-draw').click();
  assert.equal(await page.locator('#summon-screen').getAttribute('data-rarity'),'epic');
  assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'manual');
  for(let i=0;i<3;i++)await page.locator('#summon-seal').click();
  await page.waitForFunction(()=>document.querySelector('#summon-screen')?.dataset.phase==='surge',null,{timeout:5000});
  assert.match(await page.locator('#summon-story').innerText(),/EPIC 武器確定/,
   'The EPIC surge should communicate rarity without childish dialogue');
  assert.equal(await page.locator('#summon-reveal-art').evaluate(el=>getComputedStyle(el).opacity),'0',
   'Weapon art should be hidden until the surge finishes or is explicitly skipped');
  await page.locator('#summon-skip').click();
  assert.equal(await page.locator('#summon-screen').getAttribute('data-phase'),'reveal');
  assert.match(await page.locator('#summon-rarity').innerText(),/EPIC/);
  await page.locator('#summon-close').click();
  const afterEpic=await page.evaluate(()=>JSON.parse(localStorage.getItem('speakingym-monsters-prototype-v1')));
  assert.equal(afterEpic.gachaPullCount,4,'The extended cinematic must not charge extra draws');
  assert.equal(afterEpic.coins,50);
  await assertNoOverflow('repeat gacha');
  assert.deepEqual(errors,[],`${engine} browser console errors`);

  // A racing tab or failed storage write must not spend coins or grant a
  // phantom weapon in the current UI, even briefly. Real progress is protected.
  const conflicting=await browser.newPage({viewport:{width:320,height:844}});
  try{
   await conflicting.goto(url,{waitUntil:'networkidle'});
   await conflicting.evaluate(async()=>{
    const {createSave,STORAGE_KEY}=await import('./monster-engine.js');
    localStorage.setItem(STORAGE_KEY,JSON.stringify({...createSave(),coins:240}));
   });
   await conflicting.reload({waitUntil:'networkidle'});
   await conflicting.locator('#game-tabs [data-game-tab="forge"]').click();
   await conflicting.evaluate(async()=>{
    const {STORAGE_KEY}=await import('./monster-engine.js');
    const external=JSON.parse(localStorage.getItem(STORAGE_KEY));
    localStorage.setItem(STORAGE_KEY,JSON.stringify({...external,coins:777}));
   });
   await conflicting.locator('#shop-draw').click();
   assert.match(await conflicting.locator('#shop-gacha-result').innerText(),/保存に失敗/);
   assert.equal(await conflicting.locator('#shop-coins').innerText(),'240 G',
    'A failed gacha commit must restore in-memory coins');
   assert.equal(await conflicting.locator('#summon-screen').count(),0,
    'A failed save must never start a gacha animation');
   const external=await conflicting.evaluate(async()=>{
    const {STORAGE_KEY}=await import('./monster-engine.js');
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
   });
   assert.equal(external.coins,777,'A racing tab must keep its saved coins');
   assert.equal(external.weaponInventory.length,0,'A rejected draw must not grant a weapon');
  }finally{await conflicting.close();}
  console.log(`${engine}: treasure sale, earned-only gacha, 44 story monsters, weapon appearance and reload passed`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
