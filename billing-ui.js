/* Billing never writes plan/tier: only the authenticated Worker can grant access. */
(()=>{
 'use strict';
 const API='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/billing/';
 const $=id=>document.getElementById(id);
 const buy=$('sg-checkout'),portal=$('sg-portal'),status=$('sg-billing-status'),date=$('sg-billing-date');
 let busy=false,sequence=0,checkoutAllowed=false;
 const messages={billing_disabled:'テスト決済は準備中です。無料プランは引き続き利用できます。',
 login_required:'Googleログイン後に、テスト登録の利用可否を確認できます。',
 sandbox_invite_required:'現在は指定テスター限定です。一般向けの有料登録はまだ開始していません。',
 subscription_exists:'すでに契約があります。「契約状態を再確認」から確認し、契約管理をご利用ください。',
 billing_busy:'別の処理を確認中です。少し待って再確認してください。',
 billing_manual_review:'契約情報の確認が必要です。再購入せず運営者にお問い合わせください。',
 no_subscription:'管理できる契約がありません。',billing_price_invalid:'テスト料金の設定を確認中です。'};
 async function api(action,method='GET'){
  const token=await window.speakingymAccount?.getIdToken?.();
  if(!token)throw Error('login_required');
  const res=await fetch(API+action,{method,headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(20000)});
  const data=await res.json();if(!res.ok)throw Error(data.error||'unavailable');return data;
 }
 function error(e){status.textContent=messages[e.message]||'契約情報を確認できませんでした。少し待って再確認してください。決済操作を繰り返す必要はありません。'}
 async function refresh(){
  const seq=++sequence;checkoutAllowed=false;buy.disabled=true;portal.hidden=true;date.textContent='';
  try{
   const data=await api('status');if(seq!==sequence)return;
   checkoutAllowed=['none','canceled','incomplete_expired'].includes(data.status);
   buy.disabled=busy||!checkoutAllowed;
   const live=data.mode==='live';
   buy.textContent=data.pro?'Proを利用中':(live?'Proに申し込む（月680円・税込）':'Proにテスト登録（月680円・実請求なし）');portal.hidden=!data.hasCustomer;
   const states={active:'契約は有効ですが、Pro権限の確認が未完了です。',past_due:'支払いを確認できません。契約管理から支払い方法をご確認ください。',unpaid:'未払いのためFreeです。',incomplete:'支払い手続きが未完了です。',canceled:'契約は終了しています。',none:'テスト登録が可能です。',duplicate_review:'契約が複数あります。再購入せず運営者にお問い合わせください。'};
   status.textContent=(live?'有料プラン：':'サンドボックス：')+(data.pro?'Pro権限を確認しました。':states[data.status]||'契約状態を確認中です。');
   const badge=$('sg-pro-availability');
   if(badge&&live){badge.textContent='申込受付中';badge.classList.remove('wait')}
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
  }catch(e){if(seq!==sequence)return;buy.textContent='Proテスト登録（準備中・招待制）';error(e)}
 }
 async function redirect(action){
  if(busy)return;busy=true;sequence++;buy.disabled=true;portal.disabled=true;
  try{const data=await api(action,'POST');const url=new URL(data.url);
   const host=action==='checkout'?'checkout.stripe.com':'billing.stripe.com';
   if(url.protocol!=='https:'||url.hostname!==host)throw Error('invalid_redirect');location.assign(url.href);
  }catch(e){error(e)}finally{busy=false;portal.disabled=false;buy.disabled=!checkoutAllowed}
 }
 buy.addEventListener('click',()=>redirect('checkout'));portal.addEventListener('click',()=>redirect('portal'));
 $('sg-billing-refresh').addEventListener('click',refresh);
 window.addEventListener('speakingym:account-ready',refresh);window.addEventListener('focus',refresh);void refresh();
})();
