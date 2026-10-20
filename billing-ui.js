/* Billing never writes plan/tier: only the authenticated Worker can grant access. */
(()=>{
 'use strict';
 const API='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/billing/';
 const $=id=>document.getElementById(id);
 const buy=$('sg-checkout'),portal=$('sg-portal'),status=$('sg-billing-status'),date=$('sg-billing-date');
 const review=$('sg-live-review'),accept=$('sg-live-accept'),proceed=$('sg-live-proceed');
 let busy=false,sequence=0,checkoutAllowed=false,verifiedMode='disabled';
 const messages={billing_disabled:'Proの登録は現在利用できません。無料プランは引き続き利用できます。',
 login_required:'Googleログイン後に、Proの登録状況を確認できます。',
 sandbox_invite_required:'このアカウントでは現在Proを登録できません。無料プランは引き続き利用できます。',
 subscription_exists:'すでに契約があります。「契約状態を再確認」から確認し、契約管理をご利用ください。',
 billing_busy:'別の処理を確認中です。少し待って再確認してください。',
 billing_manual_review:'契約情報の確認が必要です。再購入せず運営者にお問い合わせください。',
 no_subscription:'管理できる契約がありません。',billing_price_invalid:'料金の設定を確認中です。'};
 async function api(action,method='GET'){
  const token=await window.speakingymAccount?.getIdToken?.();
  if(!token)throw Error('login_required');
  const res=await fetch(API+action,{method,headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(20000)});
  const data=await res.json();if(!res.ok)throw Error(data.error||'unavailable');return data;
 }
 function error(e){status.textContent=messages[e.message]||'契約情報を確認できませんでした。少し待って再確認してください。決済操作を繰り返す必要はありません。'}
 // An earlier confirmed LIVE status is no longer trustworthy once the account
 // changes or a status request fails. Never leave "申込受付中" on screen when
 // checkout has become disabled, including on sign-out and fetch errors.
 function showUnverifiedMode(){
  verifiedMode='disabled';checkoutAllowed=false;
  buy.disabled=true;buy.textContent='Proの登録状況を確認してください';
  portal.hidden=true;review.hidden=true;accept.checked=false;proceed.disabled=true;
  date.textContent='';
  const copy=(id,message)=>{const node=$(id);if(node)node.textContent=message};
  const badge=$('sg-pro-availability');
  if(badge){badge.textContent='受付状況を確認中';badge.classList.toggle('wait',true)}
  copy('sg-pro-sale-notice','Proの申込受付状況を確認できません。ログイン後に契約状態を再確認してください。確認できるまでは決済できません。');
  copy('sg-pro-price-caption','/ 月・税込（受付状況を確認中）');
  copy('sg-pro-teacher-limit','AI先生の個別講評：月150回（公開準備中）');
  copy('sg-pro-daily-limit','日次回数制限なし・月間上限で管理（公開準備中）');
  copy('sg-pro-compare-heading','Pro（公開準備中）');
  copy('sg-pro-compare-turns','月1,000ターン（準備中）');
  copy('sg-pro-compare-teacher','月150回（準備中）');
  copy('sg-pro-compare-sprint','回数制限なし（準備中）');
  copy('sg-pro-payment-status','申込受付状況を確認中');
  copy('sg-pro-faq-availability','Proは月1,480円（税込）の予定です。申込受付状況の確認が必要です。');
 }
 // Only a successful, signed-in response from our own Worker is allowed to
 // show real payment availability. Never infer it from URL or browser state.
 function showVerifiedMode(mode){
  verifiedMode=mode;
  review.hidden=true;accept.checked=false;proceed.disabled=true;
  const live=mode==='live';
  const copy=(id,message)=>{const node=$(id);if(node)node.textContent=message};
  const badge=$('sg-pro-availability');
  if(badge){badge.textContent=live?'申込受付中':'招待テストのみ';badge.classList.toggle('wait',!live)}
  copy('sg-pro-sale-notice',live
   ?'Proは月1,480円（税込）の自動更新型有料プランです。Stripeでの申し込み後は、解約しない限り毎月請求されます。料金と支払条件を確認してから登録してください。'
   :'現在、一般向けの有料会員募集・決済は行っていません。指定テスターのStripeサンドボックス操作では、実際の請求はありません。');
  copy('sg-pro-price-caption',live?'/ 月・税込（自動更新）':'/ 月・税込（テストのみ・実請求なし）');
  copy('sg-pro-teacher-limit',live?'AI先生の個別講評：月150回':'AI先生の個別講評：月150回（公開準備中）');
  copy('sg-pro-daily-limit',live?'日次回数制限なし・月間上限で管理':'日次回数制限なし・月間上限で管理（公開準備中）');
  copy('sg-pro-compare-heading',live?'Pro':'Pro（公開準備中）');
  copy('sg-pro-compare-turns',live?'月1,000ターン':'月1,000ターン（準備中）');
  copy('sg-pro-compare-teacher',live?'月150回':'月150回（準備中）');
  copy('sg-pro-compare-sprint',live?'回数制限なし':'回数制限なし（準備中）');
  copy('sg-pro-payment-status',live?'月1,480円・税込、自動更新':'一般向けの支払受付なし');
  copy('sg-pro-faq-availability',live
   ?'ログイン済みのこのアカウントは月1,480円（税込）でProに登録できます。申し込み後は毎月自動更新され、契約管理から解約できます。'
   :'一般向けの申し込みはまだ受け付けていません。テスト資格のあるアカウントのみ無請求で検証できます。');
 }
 async function refresh(){
  const seq=++sequence;showUnverifiedMode();status.textContent='契約状況を確認しています…';
  try{
   const data=await api('status');if(seq!==sequence)return;
   if(data.mode!=='live'&&data.mode!=='test')throw Error('billing_disabled');
   checkoutAllowed=['none','canceled','incomplete_expired'].includes(data.status);
   buy.disabled=busy||!checkoutAllowed;
   const live=data.mode==='live';
   buy.textContent=data.pro?'Proを利用中':(live?'Proに申し込む（月1,480円・税込）':'Proにテスト登録（月1,480円・実請求なし）');portal.hidden=!data.hasCustomer;
   const states={active:'契約は有効ですが、Pro権限の確認が未完了です。',past_due:'支払いを確認できません。契約管理から支払い方法をご確認ください。',unpaid:'未払いのためFreeです。',incomplete:'支払い手続きが未完了です。',canceled:'契約は終了しています。',none:live?'登録できます。':'テスト登録が可能です。',duplicate_review:'契約が複数あります。再購入せず運営者にお問い合わせください。'};
   status.textContent=(live?'有料プラン：':'サンドボックス：')+(data.pro?'Pro権限を確認しました。':states[data.status]||'契約状態を確認中です。');
   showVerifiedMode(data.mode);
   if(data.status==='active'&&!data.pro){
    const reasons={invoice_missing:'請求書情報が取得できていません',invoice_unpaid:'Stripeの支払い確認が完了していません',
     period_invalid:'契約の有効期限を確認できません',price_mismatch:'契約の価格IDが一致しません',
     quantity_invalid:'契約数量が一致しません',items_invalid:'契約明細を確認できません',
     collection_paused:'支払いの回収が停止されています',multiple_subscriptions:'契約の重複を確認する必要があります',
     mode_mismatch:'テスト環境の設定が一致しません'};
    const known=Object.hasOwn(reasons,data.entitlementReason);
    status.textContent+=' 確認内容：'+(known?reasons[data.entitlementReason]:'契約内容を確認中です')+
     '。診断コード：'+(known?data.entitlementReason:'unknown')+'。再購入せず運営者へ連絡してください。';
   }
   if(new URLSearchParams(location.search).get('billing')==='success'&&!data.pro)status.textContent+=' 決済後の反映には時間がかかる場合があります。再確認してください。';
   if(data.periodEnd)date.textContent=(data.cancelAtPeriodEnd?'利用終了予定日：':'課金期間終了日：')+new Date(data.periodEnd*1000).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})+'（日本時間）。利用枠は毎月1日更新です。';
  }catch(e){if(seq!==sequence)return;showUnverifiedMode();error(e)}
 }
 async function redirect(action){
  if(busy||!['test','live'].includes(verifiedMode)||
     (action==='checkout'&&!checkoutAllowed))return;
  busy=true;sequence++;buy.disabled=true;portal.disabled=true;
  // A timed-out POST may have already created a Stripe Checkout. Never allow
  // a second POST from a stale status, even if the redirect itself fails.
  // Re-check the server's current subscription/session state explicitly.
  try{
   const data=await api(action,'POST');
   const url=new URL(data.url);
   const host=action==='checkout'?'checkout.stripe.com':'billing.stripe.com';
   if(url.protocol!=='https:'||url.hostname!==host||
      url.username||url.password||url.port)throw Error('invalid_redirect');
   location.assign(url.href);
  }catch(e){
   showUnverifiedMode();
   error(e);
  }finally{
   busy=false;buy.disabled=true;portal.disabled=true;
  }
 }
 // For real charges, the user must see recurring terms and actively opt in.
 // Sandbox testing retains its existing path; browser confirmation never grants Pro.
 buy.addEventListener('click',()=>{
  if(busy||buy.disabled||!checkoutAllowed)return;
  if(verifiedMode==='live'){
   review.hidden=false;accept.checked=false;proceed.disabled=true;
   review.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  }else if(verifiedMode==='test')return redirect('checkout');
 });
 accept.addEventListener('change',()=>{
  proceed.disabled=!accept.checked||busy||!checkoutAllowed||verifiedMode!=='live';
 });
 $('sg-live-cancel').addEventListener('click',()=>{review.hidden=true;accept.checked=false;proceed.disabled=true;});
 proceed.addEventListener('click',()=>{
  if(!accept.checked||busy||!checkoutAllowed||verifiedMode!=='live'||review.hidden)return;
  review.hidden=true;accept.checked=false;proceed.disabled=true;
  return redirect('checkout');
 });
 portal.addEventListener('click',()=>redirect('portal'));
 $('sg-billing-refresh').addEventListener('click',refresh);
 window.addEventListener('speakingym:account-ready',refresh);window.addEventListener('focus',refresh);void refresh();
})();
