/* My Page: read-only, account-isolated transfer review summary.
 * No inference of objective language proficiency, no AI or upload.
 */
import {normalizeTransferResults} from './transfer-data.mjs';
import {reviewSchedule,reviewTrend} from './transfer-review.mjs';
const $=id=>document.getElementById(id);
const OWNER='speakingym-account-owner-v1';
const PREFIX='speakingym-transfer-results-v1:';
function verifiedOwner(){
 try{
  const account=window.speakingymAccount;
  if(account?.isLoggedIn?.()){
   const uid=account.getUid?.();
   if(typeof uid!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)||localStorage.getItem(OWNER)!==uid)return null;
   return 'user:'+uid;
  }
  return localStorage.getItem(OWNER)?null:'guest';
 }catch{return null}
}
function readRecords(owner){
 if(!owner)return [];
 try{return normalizeTransferResults(JSON.parse(localStorage.getItem(PREFIX+owner)||'[]'))}
 catch{return []}
}
function mask(){
 $('sg-transfer-due').textContent='—';
 $('sg-transfer-attempted').textContent='—';
 $('sg-transfer-improved').textContent='—';
 $('sg-transfer-next').textContent='アカウントを確認しています。別の利用者の学習記録は表示しません。';
}
function refresh(){
 const owner=verifiedOwner();
 if(!owner){mask();return}
 const rows=readRecords(owner);
 const schedule=reviewSchedule(rows),trend=reviewTrend(rows);
 $('sg-transfer-due').textContent=String(schedule.due.length);
 $('sg-transfer-attempted').textContent=String(schedule.practisedPairs);
 $('sg-transfer-improved').textContent=String(trend.improvedSelfRatings);
 $('sg-transfer-next').textContent=schedule.due.length?
  '今日までに復習するセットが'+schedule.due.length+'組あります。':
  schedule.upcoming.length?'次の復習予定：'+schedule.upcoming[0].dueDay+'（日本時間）。':
  '応用チェックを始めると復習日を自動で提案します。';
}
window.addEventListener('speakingym:account-changing',mask);
window.addEventListener('speakingym:account-ready',refresh);
window.addEventListener('pageshow',refresh);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
refresh();
