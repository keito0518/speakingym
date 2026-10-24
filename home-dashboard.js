// Home displays only the verified current learner's local snapshot. In
// particular, account switching must mask the former learner's saved phrases
// and workout counts before the new Firebase/Firestore state has settled.
import {normalizeTransferResults} from './transfer-data.mjs';
import {reviewSchedule} from './transfer-review.mjs';

const $=id=>document.getElementById(id);
const OWNER='speakingym-account-owner-v1';
const TRANSFER_PREFIX='speakingym-transfer-results-v1:';
const SAVED_KEYS=new Set([
 'speakingym-saved-coaching-v1',
 'speakingym-reflex-saved-phrases-v1',
 'speakingym-reflex-stats-v1'
]);
let transitioning=false,wordIndex=0,safeWords=[];

function verifiedOwner(){
 if(transitioning)return null;
 try{
  const account=window.speakingymAccount;
  if(account?.isLoggedIn?.()===true){
   const uid=account.getUid?.();
   if(typeof uid!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)||localStorage.getItem(OWNER)!==uid)return null;
   return 'user:'+uid;
  }
  // An owner key without a verified active login means we are still loading,
  // logged out, or switching accounts. Never read that owner's snapshot.
  return localStorage.getItem(OWNER)?null:'guest';
 }catch{return null}
}
function readJson(key){
 try{return JSON.parse(localStorage.getItem(key)||'null')}
 catch{return null}
}
function setWords(message){
 const box=$('savedWords');box.replaceChildren();
 const p=document.createElement('p');p.textContent=message;box.append(p);
}
function mask(){
 safeWords=[];wordIndex=0;
 setWords('アカウントの学習記録を確認しています…');
 $('nextWord').hidden=true;
 $('wordCounter').textContent='—';
 $('sprintPhraseCount').textContent='—';
 $('totalRuns').textContent='—';
 $('totalSpoken').textContent='—';
 $('homeDueCount').textContent='—';
 $('homeReviewMessage').textContent='ログイン状態を確認しています。ほかの人の記録は表示しません。';
 $('homeReviewAction').textContent='2場面チェックへ →';
}
function showWord(){
 if(!safeWords.length){
  setWords('まだ保存した表現はないよ。60秒チャレンジやAI英会話で、使いたい表現を保存してみよう。');
  $('nextWord').hidden=true;$('wordCounter').textContent='未保存';return;
 }
 const word=safeWords[wordIndex%safeWords.length];
 const panel=document.createElement('div');panel.className='rewrite-box';
 const original=document.createElement('div');original.className='old';original.textContent='YOU SAID: '+word.original;
 const improved=document.createElement('div');improved.className='new';improved.textContent='NEXT TIME: '+word.natural;
 panel.append(original,improved);$('savedWords').replaceChildren(panel);
 $('wordCounter').textContent=(wordIndex%safeWords.length+1)+' / '+safeWords.length+' 表現';
 $('nextWord').hidden=safeWords.length<2;
}
function safeCount(value){
 const n=Number(value);
 return Number.isFinite(n)?String(Math.max(0,Math.min(99999,Math.trunc(n)))):'0';
}
function refresh(){
 const owner=verifiedOwner();
 if(!owner){mask();return}

 const words=readJson('speakingym-saved-coaching-v1');
 safeWords=Array.isArray(words)?words.filter(x=>x&&typeof x.original==='string'&&typeof x.natural==='string'&&x.original.length<600&&x.natural.length<600).slice(0,20):[];
 wordIndex=0;showWord();
 const sprintPhrases=readJson('speakingym-reflex-saved-phrases-v1');
 const allPhrases=[...(Array.isArray(sprintPhrases)?sprintPhrases.map(p=>p?.text):[]),...safeWords.map(p=>p.natural)];
 const unique=new Set(allPhrases.filter(t=>typeof t==='string'&&t.trim()).map(t=>t.normalize('NFKC').trim().toLowerCase().replace(/’/g,"'").replace(/\s+/g,' ')));
 $('sprintPhraseCount').textContent=String(unique.size);

 const stats=readJson('speakingym-reflex-stats-v1');
 $('totalRuns').textContent=safeCount(stats?.sessions);
 $('totalSpoken').textContent=safeCount(stats?.spoken);

 const rows=normalizeTransferResults(readJson(TRANSFER_PREFIX+owner));
 const schedule=reviewSchedule(rows);
 $('homeDueCount').textContent=String(schedule.due.length);
 if(schedule.due.length){
  $('homeReviewMessage').textContent='今日までに復習するセットが'+schedule.due.length+'組あるよ。前に詰まった2場面をもう一度試そう。';
  $('homeReviewAction').textContent='今日の復習を始める →';
 }else if(schedule.upcoming.length){
  $('homeReviewMessage').textContent='次の復習予定：'+schedule.upcoming[0].dueDay+'（日本時間）。今日は新しい2場面にも挑戦できるよ。';
  $('homeReviewAction').textContent='新しい2場面に挑戦 →';
 }else{
  $('homeReviewMessage').textContent='まだ応用チェックの記録がないよ。2つの場面で話して、次の復習日を決めよう。';
  $('homeReviewAction').textContent='最初の2場面に挑戦 →';
 }
}

document.querySelectorAll('[data-sg-cta]').forEach(link=>link.addEventListener('click',()=>window.speakingymAnalytics?.track('sg_home_cta',{destination:link.dataset.sgCta})));
$('nextWord').addEventListener('click',()=>{if(!verifiedOwner()){mask();return}wordIndex++;showWord()});
window.addEventListener('speakingym:account-changing',()=>{transitioning=true;mask()});
window.addEventListener('speakingym:account-ready',()=>{transitioning=false;refresh()});
window.addEventListener('speakingym:changed',refresh);
window.addEventListener('pageshow',refresh);
window.addEventListener('focus',refresh);
window.addEventListener('storage',event=>{
 const owner=verifiedOwner();
 if(event.key===null||event.key===OWNER||SAVED_KEYS.has(event.key)||(owner&&event.key===TRANSFER_PREFIX+owner))refresh();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
function scheduleMidnightRefresh(){
 const day=86400000;
 const delay=day-((Date.now()+9*3600000)%day)+1200;
 window.setTimeout(()=>{refresh();scheduleMidnightRefresh()},delay);
}
scheduleMidnightRefresh();
refresh();
