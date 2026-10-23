import {
  chooseTransferPair,normalizeTransferResults,transferStats,TRANSFER_REASONS,
  TRANSFER_RESULT_LIMIT
} from './transfer-data.mjs';

const $=id=>document.getElementById(id);
const OWNER='speakingym-account-owner-v1';
const PREFIX='speakingym-transfer-results-v1:';
let current=null,round=0,reports=[],recordingError=false;
function ownerScope(){
 try{
  const account=window.speakingymAccount;
  if(account?.isLoggedIn?.()===true){
   const uid=account.getUid?.();
   if(typeof uid!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)||
      localStorage.getItem(OWNER)!==uid)return null;
   return 'user:'+uid;
  }
  // During login, DO NOT show or update the prior visitor's results.
  if(localStorage.getItem(OWNER))return null;
  return 'guest';
 }catch{return null}
}
function key(){const owner=ownerScope();return owner===null?null:PREFIX+owner}
function history(){
 const k=key();
 if(!k)return [];
 try{return normalizeTransferResults(JSON.parse(localStorage.getItem(k)||'[]'))}
 catch{return []}
}
function save(pairId,results){
 const k=key();if(!k)return false;
 const row={pairId,first:results[0],second:results[1],at:new Date().toISOString()};
 if(typeof row.first!=='boolean'||typeof row.second!=='boolean')return false;
 try{
  localStorage.setItem(k,JSON.stringify(normalizeTransferResults([row,...history()]).slice(0,TRANSFER_RESULT_LIMIT)));
  return true;
 }catch{return false}
}
function show(which){
 for(const id of ['introPane','questionPane','endPane']){
  $(id).hidden=id!==which;
 }
}
function refreshIntro(){
 current=null;round=0;reports=[];recordingError=false;
 const owner=ownerScope(),allowed=owner!==null;
 $('start').disabled=!allowed;
 $('locked').hidden=allowed;
 if(!allowed){$('historySummary').textContent='ログイン状態を確認中。ほかの利用者の記録は表示しません。';$('eraseResults').hidden=true;show('introPane');return}
 const h=history(),stats=transferStats(h),reasonRecords=window.speakingymSprintDiagnosis?.getRecords?.();
 const chosen=chooseTransferPair(h,reasonRecords);
 $('focus').textContent=chosen.focusReason?
  '前の振り返りを参考に「'+TRANSFER_REASONS[chosen.focusReason]+'」に関連する練習を優先しています。':
  '初めてなら基本のセットから。練習を続けると違う場面に挑戦できます。';
 $('historySummary').textContent='これまで '+stats.pairAttempts+' 組に挑戦 · 両場面で「言えた」'+stats.bothSelfReported+' 組（自己評価）';
 $('eraseResults').hidden=stats.pairAttempts===0;
 show('introPane');
}
function begin(){
 if(ownerScope()===null)return refreshIntro();
 const reasonRecords=window.speakingymSprintDiagnosis?.getRecords?.();
 const selected=chooseTransferPair(history(),reasonRecords);
 if(!selected.pair)return;
 current={pair:selected.pair,owner:ownerScope()};
 round=0;reports=[];
 showQuestion();
}
function showQuestion(){
 if(!current||current.owner!==ownerScope()){refreshIntro();return}
 const item=round===0?current.pair.first:current.pair.second;
 $('progress').textContent='ROUND '+(round+1)+' / 2';
 $('taskTitle').textContent=round===0?'まず最初の場面':'次は違う場面で';
 $('scene').textContent=item.scene;
 $('cue').textContent=item.cue;
 $('skill').textContent=current.pair.skill;
 $('reminder').textContent=round===0?'模範解答は2問目まで非公開。まずは短い英語で声に出そう。':
  '1問目と同じ能力を別の状況で使う。答えを見ずに、自分の言葉で試してね。';
 show('questionPane');
 $('cue').focus();
}
function choose(didSpeak){
 if(!current||current.owner!==ownerScope()){refreshIntro();return}
 if(typeof didSpeak!=='boolean'||reports.length!==round)return;
 reports.push(didSpeak);
 if(round===0){round=1;showQuestion();return}
 const pair=current.pair;
 recordingError=!save(pair.id,reports);
 $('endSkill').textContent=pair.skill;
 $('endResult').textContent=reports[0]&&reports[1]?
  '2つの場面で「言えた」と自己評価できたね。':'言葉が詰まった場面は、次回の練習の手掛かりになるよ。';
 $('endNote').textContent='結果は自己評価。英語の正確さ、発音、瞬発速度を自動で測ってはいません。';
 $('endSaving').textContent=recordingError?
  '今回の回答は端末に保存できませんでした。保存設定・空き容量を確認してください。':
  '結果だけをこの端末に保存しました。英語の音声・英文・実名は記録していません。';
 const root=$('examples');root.replaceChildren();
 for(const [i,part] of [pair.first,pair.second].entries()){
  const panel=document.createElement('section');panel.className='sample';
  const name=document.createElement('strong');name.textContent=(i+1)+'問目：'+part.scene;
  const japanese=document.createElement('p');japanese.className='sample-jp';japanese.textContent=part.cue;
  const rating=document.createElement('span');rating.className='result-chip';rating.textContent=reports[i]?'自己評価：言えた':'自己評価：詰まった';
  const english=document.createElement('p');english.className='sample-en';english.textContent=part.example;
  const alt=document.createElement('p');alt.className='sample-alt';alt.textContent='別の言い方：'+part.alternative;
  panel.append(name,japanese,rating,english,alt);root.append(panel);
 }
 $('insight').textContent=pair.insight;
 show('endPane');
}
function erase(){
 if(ownerScope()===null)return;
 if(!window.confirm('この端末にある「場面を変える練習」の自己評価記録を消しますか？ 60秒チャレンジの記録は残ります。'))return;
 const k=key();
 if(!k)return;
 try{localStorage.removeItem(k);refreshIntro()}
 catch{$('historySummary').textContent='削除できませんでした。ブラウザの保存設定を確認してください。'}
}
$('start').addEventListener('click',begin);
$('said').addEventListener('click',()=>choose(true));
$('froze').addEventListener('click',()=>choose(false));
$('again').addEventListener('click',refreshIntro);
$('eraseResults').addEventListener('click',erase);
// Owner changes may emit before localStorage/auth finish switching. Wipe the
// old owner's visible prompts and score immediately, even if the old key exists.
function beginOwnerTransition(){
 current=null;round=0;reports=[];recordingError=false;
 $('focus').textContent='アカウントを確認しています。';
 $('historySummary').textContent='ログイン状態を確認中。';
 $('locked').hidden=false;
 $('start').disabled=true;
 $('eraseResults').hidden=true;
 $('examples').replaceChildren();
 show('introPane');
}
window.addEventListener('speakingym:account-changing',beginOwnerTransition);
window.addEventListener('speakingym:account-ready',refreshIntro);
refreshIntro();
