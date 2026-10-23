/* Speakingym: AI-free, local-only personal 3-round sprint plan.
 * The plan reflects SELF-REPORTED stuck reasons, not verified language ability.
 * It neither uploads learner data nor claims a never-seen card is truly novel:
 * available history has a 20-session retention limit.
 */
(()=>{
'use strict';
const OWNER_KEY='speakingym-account-owner-v1';
const PROGRESS_PREFIX='speakingym-sprint-personal-progress-v1:';
const REASON_GROUP=Object.freeze({
 words:'repair',structure:'hold',retrieval:'mix',
 perfection:'hold',surprise:'connect',other:'repair'
});
const REASON_LABEL=Object.freeze({
 words:'単語が出なかった',structure:'文の組み立て',retrieval:'取り出す速さ',
 perfection:'完璧を求めすぎる',surprise:'予想外の返し方',other:'基本の切り返し'
});
const GROUP_LABEL=Object.freeze({
 repair:'言い直す・聞き返す',hold:'短い文で時間をつくる',
 boundaries:'丁寧な断り方',connect:'質問を返す・会話をつなぐ',mix:'いろいろな場面'
});
const isId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,45}$/.test(v);
function scope(){
 try{
  const account=window.speakingymAccount;
  if(account?.isLoggedIn?.()===true){
   const uid=account.getUid?.();
   if(!uid||typeof uid!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)||
      localStorage.getItem(OWNER_KEY)!==uid)return null;
   return 'user:'+uid;
  }
  if(localStorage.getItem(OWNER_KEY))return null;
  return 'guest';
 }catch{return null}
}
function dateJST(date=new Date()){
 const d=date instanceof Date&&!Number.isNaN(date.getTime())?date:new Date();
 return new Date(d.getTime()+9*3600000).toISOString().slice(0,10);
}
function plan(cards,sessions,reasons){
 const validCards=Array.isArray(cards)?cards.filter(c=>c&&isId(c.id)&&typeof c.group==='string'):[];
 const map=new Map(validCards.map(c=>[c.id,c]));
 const validHistory=Array.isArray(sessions)?sessions.slice(0,20).filter(s=>s&&typeof s==='object'&&Array.isArray(s.attempts)):[];
 const ordered=[...validHistory].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 const recent=new Set(),latest=new Map(),eligible=new Set();
 // Each card's latest self-rating controls whether it still needs a retry.
 for(const session of ordered){
  const attempts=session.attempts.slice(0,60);
  for(let i=attempts.length-1;i>=0;i--){
   const a=attempts[i];
   if(!a||!map.has(a.cardId))continue;
   recent.add(a.cardId);
   if(!latest.has(a.cardId)&&['spoken','stuck'].includes(a.outcome))latest.set(a.cardId,a.outcome);
   if(a.outcome==='stuck'&&typeof session.date==='string'){
    eligible.add(session.date+'|'+i+'|'+a.cardId);
   }
  }
 }
 const rawReasons=Array.isArray(reasons)?reasons.slice(0,120):[];
 const counts=new Map();
 // Only reasons attached to an actual stored "stuck" answer count.
 for(const record of rawReasons){
  if(!record||!eligible.has(record.session)||!Object.hasOwn(REASON_GROUP,record.reason))continue;
  counts.set(record.reason,(counts.get(record.reason)||0)+1);
 }
 const rank=[...counts].sort((a,b)=>b[1]-a[1])[0]||null;
 const topReason=rank?.[0]||null;
 const miss=[...latest].filter(([id,outcome])=>outcome==='stuck').map(([id])=>id);
 // If the user did not volunteer a reason, do not fabricate one.
 const lastMiss=miss.length?map.get(miss[0]):null;
 const focusGroup=topReason?REASON_GROUP[topReason]:(lastMiss?.group||'mix');
 const focus=focusGroup==='mix'?validCards:validCards.filter(c=>c.group===focusGroup);
 const focusIds=(focus.length?focus:validCards).map(c=>c.id);
 const unseen=validCards.filter(c=>!recent.has(c.id));
 const freshFocus=unseen.filter(c=>focusGroup==='mix'||c.group===focusGroup);
 const fresh=freshFocus.length?freshFocus:unseen;
 const freshIds=(fresh.length?fresh:validCards).map(c=>c.id);
 const stages=[
  {id:'retry',title:miss.length?'詰まった表現を言い直す':'短い一言でウォームアップ',
   description:miss.length?'最後に「詰まった」と自己評価した表現から始めよう。':'まだ苦手履歴がないので、基本の問題から始めよう。',
   poolIds:miss.length?miss:validCards.map(c=>c.id),kind:'review'},
  {id:'focus',title:'あなた向けの切り返しを練習',
   description:topReason?'自己記録「'+REASON_LABEL[topReason]+'」を参考に、'+(GROUP_LABEL[focusGroup]||'いろいろな場面')+'を練習。':
    (lastMiss?'直近の詰まった分野を参考にした練習。':'まずは色々な場面を練習して、苦手を見つけよう。'),
   poolIds:focusIds,kind:'focus'},
  {id:'fresh',title:unseen.length?'最近出ていない場面で試す':'別の問題でもう一度試す',
   description:unseen.length?'保存中の直近20回の履歴では出題されていないお題。初回学習の保証ではありません。':
    '保存中の履歴には新しいお題がないので、別の組み合わせで反復しよう。',
   poolIds:freshIds,kind:'fresh'}
 ];
 return {stages,topReason,reasonCount:rank?.[1]||0,missCount:miss.length,historyCount:ordered.length,
  recentCount:recent.size,unseenCount:unseen.length};
}
function key(){const s=scope();return s?PROGRESS_PREFIX+s:null}
function normalize(data,day){
 const done=[false,false,false];
 if(data&&data.day===day&&Array.isArray(data.done))
  for(let i=0;i<3;i++)done[i]=data.done[i]===true;
 return {day,done};
}
function getProgress(date=new Date()){
 const k=key();if(!k)return null;
 const day=dateJST(date);
 try{return normalize(JSON.parse(localStorage.getItem(k)||'null'),day)}
 catch{return normalize(null,day)}
}
function markDone(index,date=new Date()){
 if(!Number.isInteger(index)||index<0||index>2)return false;
 const k=key(),old=getProgress(date);if(!k||!old)return false;
 const next={day:old.day,done:[...old.done]};next.done[index]=true;
 try{localStorage.setItem(k,JSON.stringify(next));return true}catch{return false}
}
function clearProgress(){
 const k=key();if(!k)return false;
 try{localStorage.removeItem(k);return true}catch{return false}
}
window.speakingymPersonalPlan=Object.freeze({plan,getProgress,markDone,clearProgress,dateJST,scope});
})();
