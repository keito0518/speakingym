/* One-tap, explicitly consented beta feedback. No free-text or personal data. */
const SENT_KEY='speakingym-monsters-beta-feedback-day-v1';
const $=(doc,selector)=>doc.querySelector(selector);
const dateLocal=()=>{const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};

export function setupBetaFeedback(telemetry,doc=document,root=window){
  const panel=$(doc,'#beta-feedback');
  if(!panel)return;
  const status=$(doc,'#beta-feedback-status');
  const consentStatus=$(doc,'#beta-consent-status');
  const yes=$(doc,'#beta-consent-yes'),no=$(doc,'#beta-consent-no');
  const buttons=[...panel.querySelectorAll('[data-beta-reaction]')];
  const getSent=()=>{try{return JSON.parse(root.localStorage.getItem(SENT_KEY)||'null');}catch{return null;}};
  function update(){
    const choice=telemetry.getConsent();
    const sent=getSent();
    consentStatus.textContent=choice==='yes'?'同意中・計測有効':choice==='no'?'同意なし・計測停止中':'未選択・計測停止中';
    yes.setAttribute('aria-pressed',String(choice==='yes'));
    no.setAttribute('aria-pressed',String(choice==='no'));
    for(const button of buttons){
      button.disabled=choice!=='yes'||!telemetry.configured||sent?.day===dateLocal();
      button.setAttribute('aria-pressed',String(sent?.day===dateLocal()&&sent.reaction===button.dataset.betaReaction));
    }
    if(sent?.day===dateLocal())status.textContent='今日の感想を記録しました。ありがとう！';
    else if(!telemetry.configured)status.textContent='現在、匿名集計の準備中です。メールから感想を送ってね。';
    else if(choice!=='yes')status.textContent='感想を送るには、下の「計測に同意する」を選んでね。';
    else status.textContent='上のボタンから、今日の感想をひとつ選んでね。';
  }
  yes.addEventListener('click',()=>{telemetry.setConsent('yes');update();});
  no.addEventListener('click',()=>{telemetry.setConsent('no');update();});
  for(const button of buttons){
    button.addEventListener('click',()=>{
      if(getSent()?.day===dateLocal()||telemetry.getConsent()!=='yes')return;
      const reaction=button.dataset.betaReaction;
      if(!telemetry.track('monsters_beta_feedback',{reaction})){
        status.textContent='感想の送信を開始できませんでした。メールから教えてね。';return;
      }
      try{root.localStorage.setItem(SENT_KEY,JSON.stringify({day:dateLocal(),reaction}));}catch{/* Private browsing */}
      update();
    });
  }
  update();
}
