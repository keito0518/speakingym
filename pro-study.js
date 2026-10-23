/**
 * Pro-only client presentation; Worker /entitlement is authoritative.
 * Does not expose billing operations, charge the user, request AI or persist PII.
 */
import {readSnapshot,OWNER_KEY} from './account-data.mjs';
import {buildProStudyPlan,normalizeReviewProgress,markReview} from './pro-study-data.mjs';

const $=id=>document.getElementById(id);
const make=(tag,text,klass)=>{
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(klass)node.className=klass;
 return node;
};
const endpoint='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/entitlement';
let epoch=0,activeUid=null,activeSnapshot=null,activeReview=normalizeReviewProgress();
const REVIEW_PREFIX='speakingym-pro-review-progress-v1:';
function verifiedOwnerUid(){
 try{
  const uid=window.speakingymAccount?.getUid?.();
  if(typeof uid!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(uid))return null;
  return localStorage.getItem(OWNER_KEY)===uid?uid:null;
 }catch{return null}
}
function readReview(uid){
 try{
  if(!uid||localStorage.getItem(OWNER_KEY)!==uid)return normalizeReviewProgress();
  return normalizeReviewProgress(JSON.parse(localStorage.getItem(REVIEW_PREFIX+uid)||'null'));
 }catch{return normalizeReviewProgress()}
}
function writeReview(uid,review){
 try{
  if(!uid||verifiedOwnerUid()!==uid)return false;
  const serialized=JSON.stringify(normalizeReviewProgress(review));
  if(serialized.length>40000)return false;
  localStorage.setItem(REVIEW_PREFIX+uid,serialized);
  return true;
 }catch{return false}
}
function lock(title,detail){
 activeUid=null;activeSnapshot=null;activeReview=normalizeReviewProgress();
 $('pro-content').hidden=true;
 $('pro-locked').hidden=false;
 $('review-list').replaceChildren();
 $('study-report').replaceChildren();
 $('daily-plan').replaceChildren();
 $('review-progress').textContent='';
 $('review-status').textContent='';
 $('pro-access-title').textContent=title;
 $('pro-access-status').textContent=detail;
 window.speakingymSpeech?.stop?.();
}
function showCards(view){
 const list=$('review-list');list.replaceChildren();
 const summary=view.reviewSummary;
 $('review-progress').textContent=view.cards.length?
  '今日の復習候補：'+view.cards.length+'枚 ／ 今日の記録：'+(summary?.attemptedToday||0)+'回。覚えたかどうかは自己申告です。':
  summary?.nextDue?'今日の復習はおしまい！次の予定：'+summary.nextDue:
   'まだ復習カードがありません。表現を保存するとここに表示されます。';
 if(view.cards.length===0){
  list.append(make('li',view.totalUniqueExpressions?
   '今日の復習は完了！期限が来たら次の表現を表示します。':
   'まだ保存フレーズがありません。60秒チャレンジやAI講評から、表現を保存してみよう。','review-card'));
 }
 const current=epoch,owner=activeUid;
 const grade=(card,outcome)=>{
  if(current!==epoch||$('pro-content').hidden||!activeSnapshot)return;
  // An auth transition must never write a previous learner's review result
  // into another account. Re-check the owner at the moment of the click.
  if(!owner||verifiedOwnerUid()!==owner){
   $('review-status').textContent='アカウントの保存先を確認できません。ログイン後にページを開き直してね。';
   return;
  }
  activeReview=markReview(activeReview,card.id,outcome,new Date());
  const saved=writeReview(owner,activeReview);
  const updated=buildProStudyPlan(activeSnapshot,new Date(),activeReview);
  showCards(updated);showReport(updated);showDailyPlan(updated);
  $('review-status').textContent=saved?
   '復習の結果をこの端末に保存しました。他の端末との自動同期はまだありません。':
   '記録は画面内に反映しましたが端末への保存に失敗しました。空き容量とブラウザ設定を確認してね。';
 };
 for(const [index,p] of view.cards.entries()){
  const li=make('li',undefined,'review-card');
  const head=make('div',undefined,'review-top');
  head.append(make('span',String(index+1)+' / '+view.cards.length,'source'),make('span',p.origin,'source'));
  li.append(head,make('p',p.hint||'英語で言えるか挑戦してみよう。','review-hint'));
  const answer=make('p',p.text,'answer');answer.lang='en';answer.hidden=true;
  const actions=make('div',undefined,'controls');
  const reveal=make('button','答えを見る');
  reveal.type='button';reveal.setAttribute('aria-expanded','false');
  reveal.addEventListener('click',()=>{
   const next=!answer.hidden;answer.hidden=next;
   reveal.textContent=next?'答えを見る':'答えを隠す';
   reveal.setAttribute('aria-expanded',String(!next));
  });
  const speak=make('button','英語を聞く');speak.type='button';
  speak.addEventListener('click',()=>{
   if(!window.speakingymSpeech?.speak?.(p.text))speak.textContent='この端末では音声を使えません';
  });
  const remembered=make('button','言えた ✓');remembered.type='button';
  remembered.setAttribute('aria-label','この表現を思い出せた');
  remembered.addEventListener('click',()=>grade(p,'remembered'));
  const retry=make('button','まだ苦手 ↻');retry.type='button';
  retry.setAttribute('aria-label','この表現をもう一度復習したい');
  retry.addEventListener('click',()=>grade(p,'retry'));
  actions.append(reveal,speak,remembered,retry);li.append(answer,actions);list.append(li);
 }
}
function showReport(view){
 const root=$('study-report');root.replaceChildren();
 const grid=make('div',undefined,'metrics');
 const stats=[
  [String(view.report.recordedLast7Days),'直近7日で保存した練習'],
  [String(view.report.savedSessions),'確認できる保存履歴'],
  [String(view.report.recent.spoken)+' / '+view.report.recent.attempted,'直近最大5回の「言えた」件数'],
  [String(view.totalUniqueExpressions),'復習候補のユニークな表現'],
  [String(view.reviewSummary?.attemptedLast7Days||0),'直近7日の自己記録した復習'],
  [String(view.reviewSummary?.streak||0)+'日','復習の連続記録'],
  [String(view.reviewSummary?.mastered||0),'3段階以上進んだ表現'],
  [String(view.reviewSummary?.due||0),'次に復習できる表現']
 ];
 for(const [n,t] of stats){const item=make('div');item.append(make('strong',n,'metric'),make('span',t));grid.append(item)}
 root.append(grid);
 if(view.report.comparison){
  root.append(make('p','自己記録上の「言えた」割合：直近最大5回 '+view.report.comparison.recentPct+'%、前の最大5回 '+view.report.comparison.previousPct+'%。問題の難易度・数が違うため単純な上達度ではありません。','small'));
 }else root.append(make('p','過去の記録が十分にたまると、前の練習との比較を表示できます。','small'));
 $('study-next').textContent=view.suggestion;
}
function showDailyPlan(view){
 const list=$('daily-plan');list.replaceChildren();
 for(const item of view.dailyPlan||[]){
  const li=make('li',undefined,'plan-step');
  li.append(make('strong',item.title),make('p',item.detail,'small'));
  if(item.href){
   const link=make('a',item.title.includes('60秒')?'60秒チャレンジへ ↗':'AI会話を始める ↗','study-link');
   link.href=item.href;
   if(item.href==='./scenes.html'){
    // Same-tab, short-lived bridge: show the real saved target expression on
    // the next scene screen without putting learner text into a URL/referrer.
    link.addEventListener('click',()=>{
     const uid=activeUid,phrase=view.cards?.[0]?.text;
     if(!uid||verifiedOwnerUid()!==uid||typeof phrase!=='string'||!phrase.trim())return;
     try{sessionStorage.setItem('speakingym-pro-scene-target-v1',JSON.stringify({
      uid,phrase:phrase.trim().slice(0,260),expires:Date.now()+10*60000
     }))}catch{}
    });
   }
   li.append(link);
  }
  list.append(li);
 }
}
async function refresh(){
 const current=++epoch;
 lock('利用プランを確認中…','Googleログイン済みのProアカウントのみ復習スタジオを利用できます。');
 let token;
 try{token=await window.speakingymAccount?.getIdToken?.()}catch{}
 if(current!==epoch)return;
 if(!token){lock('Googleログインが必要です','Proの学習記録を表示するには、マイページからログインしてください。');return}
 try{
  const res=await fetch(endpoint,{
   method:'GET',headers:{Authorization:'Bearer '+token},
   cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)
  });
  if(!res.ok)throw Error('entitlement_unavailable');
  const data=await res.json();
  if(current!==epoch)return;
  if(data?.plan!=='pro'){
   lock('Proプラン向けの機能です','現在のアカウントはProとして確認できませんでした。Freeの練習・フレーズ帳は引き続き利用できます。');return;
  }
  // An auth switch can occur while the previous user's Pro entitlement is
  // in flight, before account-sync emits its next ready event. Recheck the
  // signed-in token before reading this device's potentially new-owner data.
  const latestToken=await window.speakingymAccount?.getIdToken?.();
  if(current!==epoch)return;
  if(!latestToken||latestToken!==token){
   lock('アカウントを再確認中です','ログイン状態が変わりました。現在のアカウントの利用プランを再確認してください。');
   return;
  }
  // Read only after a current, signed Worker entitlement response.
  // Progress is local-only and keyed by the signed-in owner, never global.
  activeUid=verifiedOwnerUid();
  activeSnapshot=readSnapshot(localStorage);
  activeReview=readReview(activeUid);
  const view=buildProStudyPlan(activeSnapshot,new Date(),activeReview);
  showCards(view);showReport(view);showDailyPlan(view);
  $('pro-locked').hidden=true;$('pro-content').hidden=false;
 }catch{
  if(current!==epoch)return;
  lock('Proの確認ができませんでした','通信状態を確認してください。復習データは表示せず、利用プランの再確認が必要です。');
 }
}
// Authentication has changed even if Firestore synchronization is unfinished.
// Clear previously rendered Pro-only local history immediately, not at the next
// signed entitlement response.
window.addEventListener('speakingym:account-changing',()=>{
 epoch++;
 lock('アカウントを再確認中です','新しいアカウントの利用プランを確認しています。');
});
window.addEventListener('speakingym:account-ready',refresh);
window.addEventListener('speakingym:changed',()=>{
 if(!$('pro-content').hidden)void refresh();
});
window.addEventListener('focus',refresh);
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible')void refresh();
});
void refresh();
