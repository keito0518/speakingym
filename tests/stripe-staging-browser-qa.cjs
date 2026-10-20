/* Browser QA: fully stubbed Firebase and Stripe; no real user, payment or
 * production API calls. Runs against existing local server on :8765.
 */
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

const stage='speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev';
const prod='speakingym-survival-ai.keitokeitokeito0518.workers.dev';
const authMock=`
export const browserSessionPersistence={};
export class GoogleAuthProvider {}
let listener=()=>{};
export function getAuth(){return {};}
export async function setPersistence(){}
export function onAuthStateChanged(auth,cb){listener=cb;queueMicrotask(()=>cb(null));}
export async function signInWithPopup(){listener({uid:'local-qa-fixture'});return {};}
export async function signOut(){listener(null);}
export async function getIdToken(){return 'fixture-jwt-not-real';}
`;
const appMock='export function initializeApp(){return {}};';

async function testBrowser(engine){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage();
  const outbound=[];
  let safe=true,mode='free';
  page.on('request',req=>{if(req.url().includes(prod))outbound.push(req.url())});
  await page.route('https://www.gstatic.com/firebasejs/11.10.0/**',route=>{
   const app=route.request().url().endsWith('/firebase-app.js');
   return route.fulfill({status:200,contentType:'text/javascript',
    headers:{'access-control-allow-origin':'*'},body:app?appMock:authMock});
  });
  await page.route('https://'+stage+'/**',async route=>{
   const req=route.request();
   const url=new URL(req.url());
   const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',
    headers:{'access-control-allow-origin':'http://localhost:8765',
     'access-control-allow-methods':'GET, POST, OPTIONS',
     'access-control-allow-headers':'Authorization, Content-Type'},body:JSON.stringify(body)});
   if(req.method()==='OPTIONS')return route.fulfill({status:204,
    headers:{'access-control-allow-origin':'http://localhost:8765',
    'access-control-allow-headers':'Authorization, Content-Type',
    'access-control-allow-methods':'GET, POST, OPTIONS'}});
   if(url.pathname==='/health')return json({
    status:'ok',stagingHealthOnly:!safe,stagingBillingOnly:safe,
    stagingBillingSchemaReady:safe,billingMode:safe?'test':'disabled',
    aiEnabled:false,plansEnabled:true,plansReady:true,turnLedgerEnabled:true,
    turnLedgerSchemaReady:true,freeSessionRequested:false});
   if(!safe)return json({error:'billing_disabled'},503);
   if(!req.headers().authorization?.startsWith('Bearer fixture-jwt-not-real'))
    return json({error:'login_required'},401);
   if(url.pathname==='/billing/status')return json(mode==='free'
    ? {mode:'test',status:'none',pro:false,hasCustomer:false}
    : {mode:'test',status:'active',pro:true,hasCustomer:true,
       cancelAtPeriodEnd:false});
   if(url.pathname==='/billing/checkout')return json({url:'https://checkout.stripe.com/c/pay/qa-stub'});
   if(url.pathname==='/billing/portal')return json({url:'https://billing.stripe.com/p/session/qa-stub'});
   throw Error('Unexpected stage endpoint: '+url.pathname);
  });
  await page.route('https://checkout.stripe.com/**',route=>
   route.fulfill({status:200,contentType:'text/html',body:'<h1>Stripe TEST checkout stub</h1>'}));
  await page.route('https://billing.stripe.com/**',route=>
   route.fulfill({status:200,contentType:'text/html',body:'<h1>Stripe TEST portal stub</h1>'}));
  await page.goto('http://localhost:8765/stripe-staging-qa.html?billing=success');
  await page.waitForFunction(()=>document.querySelector('#qa-health')?.textContent?.includes('✓'));
  await page.waitForFunction(()=>!document.querySelector('#qa-login').disabled);
  assert.equal(await page.locator('#qa-checkout').isDisabled(),true,'cannot checkout before Firebase login');
  assert.match(await page.locator('#qa-return').innerText(),/再確認/);
  await page.click('#qa-login');
  await page.waitForFunction(()=>document.querySelector('#qa-subscription')?.textContent?.includes('Free（テスト権限なし）'));
  assert.equal(await page.locator('#qa-checkout').isEnabled(),true);
  await page.click('#qa-checkout');
  await page.waitForURL(/checkout\.stripe\.com\/c\/pay\/qa-stub/);

  await page.goto('http://localhost:8765/stripe-staging-qa.html?billing=success');
  await page.waitForFunction(()=>!document.querySelector('#qa-login').disabled);
  mode='pro';
  await page.click('#qa-login');
  await page.waitForFunction(()=>document.querySelector('#qa-subscription')?.textContent?.includes('Pro（テスト権限あり）'));
  assert.equal(await page.locator('#qa-portal').isEnabled(),true);
  await page.click('#qa-portal');
  await page.waitForURL(/billing\.stripe\.com\/p\/session\/qa-stub/);

  safe=false;
  await page.goto('http://localhost:8765/stripe-staging-qa.html');
  await page.waitForFunction(()=>document.querySelector('#qa-health')?.textContent?.includes('STOP'));
  assert.equal(await page.locator('#qa-checkout').isDisabled(),true);
  assert.equal(await page.locator('#qa-portal').isDisabled(),true);
  assert.deepEqual(outbound,[],'Never contacted production Worker');
  console.log(engine.name()+': QA browser PASS (test-only login/checkout/return/portal/blocked health)');
 }finally{await browser.close();}
}
(async()=>{
 const choice=(process.env.SPEAKINGYM_BROWSER_ENGINE||'chromium').toLowerCase();
 if(!['chromium','webkit'].includes(choice))throw Error('Unknown browser engine');
 await testBrowser(choice==='webkit'?webkit:chromium);
})().catch(e=>{console.error(e);process.exitCode=1});
