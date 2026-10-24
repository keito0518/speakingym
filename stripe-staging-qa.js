/* Strictly local, test-only Stripe Checkout/Portal QA client.
 * No production API calls, Firestore, Gemini or real card collection.
 * Only signed Firebase JWTs are sent to the isolated staging Worker.
 */
import {firebaseConfig} from './firebase-config.js';

export const STAGE='https://speakingym-survival-ai-staging.keitokeitokeito0518.workers.dev';
const $=id=>document.getElementById(id);
let auth,authLib,user=null,ready=false,busy=false,subStatus=null;
const safeError=code=>({
  sandbox_invite_required:'テスト対象アカウントが許可リストにありません。開発者がstagingだけで登録してください。',
  login_required:'Googleでログインしてください。',
  billing_disabled:'Stripeテスト決済はまだ無効です。実施せず設定完了を待ってください。',
  billing_price_invalid:'テスト価格が月額1,480円（税込）と一致しません。設定を修正してください。',
  billing_busy:'処理中です。少し待ってから再確認してください。',
  no_subscription:'まだ管理できるテスト契約がありません。',
  billing_manual_review:'Stripeのテスト契約に調査が必要です。重複購入しないでください。',
  billing_checkout_review:'保存済みの購入画面の金額・商品・購入者が一致しません。再購入せず開発者に確認してください。',
  subscription_exists:'すでにテスト契約があります。契約状態を再確認してください。',
  billing_test_clock_invalid:'専用テスト時計の設定に問題があります。購入しないで開発者に連絡してください。',
  billing_test_clock_not_ready:'専用テスト時計が処理中または利用できない状態です。購入せずStripeで準備完了を確認してください。',
  billing_test_clock_mismatch:'このGoogleアカウントは別のテスト顧客に紐づいています。購入せず別の新しいテスターを選んでください。',
}[code]||'テスト通信に失敗しました。新しい決済は実行しないでください。');
const show=(id,message)=>{$(id).textContent=message};
export function validStagingHealth(data){
 // Match the credential-free server-side readiness gate. A half-configured
 // Worker must never enable the real Stripe TEST checkout button.
 return !!data&&data.status==='ok'&&
  data.quotaVersion==='pro-monthly-1000-150-v3'&&
  data.stagingHealthOnly===false&&data.stagingBillingOnly===true&&
  data.stagingBillingSchemaReady===true&&data.billingMode==='test'&&
  data.aiEnabled===false&&data.plansEnabled===true&&data.plansReady===true&&
  data.turnLedgerEnabled===true&&data.turnLedgerSchemaReady===true&&
  data.freeSessionSchemaReady===true&&
  data.freeSessionRequested===false&&data.freeSessionEnabled===false&&
  data.aiReplayRequested===false&&data.aiReplayEnabled===false&&
  Array.isArray(data.sceneIds)&&data.sceneIds.length===16;
}
export function approvedStripeRedirect(url,kind){
 let parsed;
 try{parsed=new URL(url)}catch{return false}
 return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&
  (kind==='checkout'?parsed.hostname==='checkout.stripe.com':
    kind==='portal'?parsed.hostname==='billing.stripe.com':false);
}
function paint(){
 $('qa-login').disabled=!auth||busy||!!user;
 $('qa-logout').disabled=!user||busy;
 $('qa-refresh').disabled=!ready||!user||busy;
 $('qa-checkout').disabled=!ready||!user||busy||!subStatus||
  subStatus.mode!=='test'||!['none','canceled','incomplete_expired'].includes(subStatus.status);
 $('qa-portal').disabled=!ready||!user||busy||subStatus?.hasCustomer!==true;
}
async function health(){
 ready=false;subStatus=null;paint();
 try{
  const res=await fetch(STAGE+'/health',{method:'GET',cache:'no-store',signal:AbortSignal.timeout(16000)});
  const data=res.ok?await res.json():null;
  if(!validStagingHealth(data))throw Error('not_ready');
  ready=true;
  show('qa-health','✓ 独立staging Worker・課金用D1・AI無効を確認。Stripeの1,480円商品・Webhook・実決済はこの確認だけでは未検証です。');
 }catch{show('qa-health','STOP：テスト用Workerの設定がまだそろっていません。決済操作を禁止します。');}
 paint();
 if(ready&&user)await refresh();
}
async function api(action,method='GET'){
 if(!ready||!auth||!user)throw Error('login_required');
 const token=await authLib.getIdToken(user);
 const res=await fetch(STAGE+'/billing/'+action,{method,
  headers:{Authorization:'Bearer '+token},cache:'no-store',
  signal:AbortSignal.timeout(20000)});
 let data;try{data=await res.json()}catch{throw Error('invalid_response')}
 if(!res.ok)throw Error(data?.error||'unavailable');
 return data;
}
async function refresh(){
 if(busy||!ready||!user)return;
 busy=true;paint();
 show('qa-subscription','Stripeテスト契約を照合中…');
 try{
  const data=await api('status');
  if(data.mode!=='test')throw Error('billing_disabled');
  subStatus=data;
  const status=String(data.status||'none');
  const plan=data.pro===true?'Pro（テスト権限あり）':'Free（テスト権限なし）';
  const canceled=data.cancelAtPeriodEnd===true?'・期間末で解約予定':'';
  show('qa-subscription',plan+'\nStripe状態：'+(status==='none'?'未契約':status)+canceled+
   '\n※更新成功URLだけでProとは判定しません。');
 }catch(e){subStatus=null;show('qa-subscription',safeError(e.message));}
 finally{busy=false;paint();}
}
async function begin(action,kind){
 if(busy||!ready||!user)return;
 if(action==='checkout'&&(!subStatus||!['none','canceled','incomplete_expired'].includes(subStatus.status)))return;
 if(action==='portal'&&subStatus?.hasCustomer!==true)return;
 busy=true;paint();show('qa-subscription','Stripeのテスト画面へ移動する準備中…');
 try{
  const data=await api(action,'POST');
  if(!approvedStripeRedirect(data?.url,kind))throw Error('invalid_redirect');
  location.assign(data.url);
 }catch(e){show('qa-subscription',safeError(e.message));busy=false;paint();}
}
async function loadFirebase(){
 try{
  const base='https://www.gstatic.com/firebasejs/11.10.0/';
  const [appLib,lib]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js')]);
  const app=appLib.initializeApp(firebaseConfig,'stripe-staging-qa');
  authLib=lib;auth=lib.getAuth(app);
  // Only this browser tab; do not keep a QA Google session in localStorage.
  await lib.setPersistence(auth,lib.browserSessionPersistence);
  lib.onAuthStateChanged(auth,async next=>{
   user=next;subStatus=null;
   show('qa-account',next?
    '✓ 現在のGoogleアカウント：'+(next.email||'メールアドレス未取得')+
    '\n※以前のテストで使ったアカウントなら、ここでログアウトして別のアカウントを選択してください。':
    '未ログイン（テスト専用アカウントを使ってください）。');
   paint();
   if(next&&ready)await refresh();
  },()=>{show('qa-account','Firebaseログイン状態を確認できません。');paint();});
  paint();
 }catch{show('qa-account','Firebase認証を開始できませんでした。stagingでの購入は行えません。');}
}
$('qa-login').addEventListener('click',async()=>{
 if(!auth||busy)return;
 busy=true;paint();
 // Force Google's account chooser even when the browser remembers a
 // previously used Oden/QA login. Firebase logout alone does NOT log out
 // the Google account on accounts.google.com.
 try{
  const provider=new authLib.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  await authLib.signInWithPopup(auth,provider);
 }
 catch(e){
  const unauthorized=String(e?.code||'').includes('unauthorized-domain');
  show('qa-account',unauthorized?'Firebase Authの承認済みドメインにlocalhostがありません。テスト環境の設定を確認してください。':'Googleログインできませんでした。テスト用アカウントを使用してください。');
 }
 finally{
  busy=false;paint();
  // Firebase may emit onAuthStateChanged before popup completion while busy
  // is still true. Reconcile immediately after the popup settles as well.
  if(user&&ready&&!subStatus)await refresh();
 }
});
$('qa-logout').addEventListener('click',async()=>{
 if(!auth||busy)return;
 busy=true;paint();
 try{await authLib.signOut(auth);}catch{show('qa-account','ログアウトに失敗しました。');}
 finally{busy=false;paint();}
});
$('qa-check-health').addEventListener('click',health);
$('qa-refresh').addEventListener('click',refresh);
$('qa-checkout').addEventListener('click',()=>begin('checkout','checkout'));
$('qa-portal').addEventListener('click',()=>begin('portal','portal'));
const outcome=new URLSearchParams(location.search).get('billing');
if(outcome==='success')show('qa-return','StripeのテストCheckoutから戻りました。Googleテストログイン後、必ず「Pro権限を再確認」を押してください。');
else if(outcome==='cancel')show('qa-return','テストCheckoutをキャンセルしました。請求はありません。');
await Promise.all([health(),loadFirebase()]);
