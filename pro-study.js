/**
 * Pro-only client presentation; Worker /entitlement is authoritative.
 * Does not expose billing operations, charge the user, request AI or persist PII.
 */
import {readSnapshot} from './account-data.mjs';
import {buildProStudyPlan} from './pro-study-data.mjs';

const $=id=>document.getElementById(id);
const make=(tag,text,klass)=>{
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(klass)node.className=klass;
 return node;
};
const endpoint='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/entitlement';
let epoch=0;
function lock(title,detail){
 $('pro-content').hidden=true;
 $('pro-locked').hidden=false;
 $('review-list').replaceChildren();
 $('study-report').replaceChildren();
 $('review-progress').textContent='';
 $('pro-access-title').textContent=title;
 $('pro-access-status').textContent=detail;
 window.speakingymSpeech?.stop?.();
}
function showCards(view){
 const list=$('review-list');list.replaceChildren();
 const done=new Set();
 const progress=()=>{
  $('review-progress').textContent=view.cards.length?
   'このページでの復習：'+done.size+' / '+view.cards.length+'枚。チェックはこの画面の中だけで記録し、保存や同期はしません。':
   '保存した表現がないため、復習カードはまだありません。';
 };
 if(view.cards.length===0)list.append(make('li','まだ保存フレーズがありません。60秒チャレンジやAI講評から、表現を保存してみよう。','review-card'));
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
  const checked=make('button','できた ✓');checked.type='button';
  checked.setAttribute('aria-pressed','false');
  checked.addEventListener('click',()=>{
   if(done.has(p.id))done.delete(p.id);else done.add(p.id);
   checked.classList.toggle('done',done.has(p.id));
   checked.setAttribute('aria-pressed',String(done.has(p.id)));
   checked.textContent=done.has(p.id)?'復習済み ✓':'できた ✓';
   progress();
  });
  actions.append(reveal,speak,checked);li.append(answer,actions);list.append(li);
 }
 progress();
}
function showReport(view){
 const root=$('study-report');root.replaceChildren();
 const grid=make('div',undefined,'metrics');
 const stats=[
  [String(view.report.recordedLast7Days),'直近7日で保存した練習'],
  [String(view.report.savedSessions),'確認できる保存履歴'],
  [String(view.report.recent.spoken)+' / '+view.report.recent.attempted,'直近最大5回の「言えた」件数'],
  [String(view.totalUniqueExpressions),'復習候補のユニークな表現']
 ];
 for(const [n,t] of stats){const item=make('div');item.append(make('strong',n,'metric'),make('span',t));grid.append(item)}
 root.append(grid);
 if(view.report.comparison){
  root.append(make('p','自己記録上の「言えた」割合：直近最大5回 '+view.report.comparison.recentPct+'%、前の最大5回 '+view.report.comparison.previousPct+'%。問題の難易度・数が違うため単純な上達度ではありません。','small'));
 }else root.append(make('p','過去の記録が十分にたまると、前の練習との比較を表示できます。','small'));
 $('study-next').textContent=view.suggestion;
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
  const snapshot=readSnapshot(localStorage),view=buildProStudyPlan(snapshot);
  showCards(view);showReport(view);
  $('pro-locked').hidden=true;$('pro-content').hidden=false;
 }catch{
  if(current!==epoch)return;
  lock('Proの確認ができませんでした','通信状態を確認してください。復習データは表示せず、利用プランの再確認が必要です。');
 }
}
window.addEventListener('speakingym:account-ready',refresh);
window.addEventListener('speakingym:changed',()=>{
 if(!$('pro-content').hidden)void refresh();
});
window.addEventListener('focus',refresh);
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible')void refresh();
});
void refresh();
