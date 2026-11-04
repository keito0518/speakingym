/**
 * Freeze Breaker is a scripted offline recovery workout, NOT an AI chat.
 * We never upload, save or score a learner's voice or typed answer.
 * Self-assessed outcome only; real AI roleplay is available by explicit link.
 */
import {OWNER_KEY} from './account-data.mjs';
import {FREEZE_SCENES,FREEZE_REASONS,normalizeFreezeProgress,nextFreezeScene,sceneAttempt,recordFreezeAttempt,freezeSummary,freezeDay} from './freeze-breaker-data.mjs';

const $=id=>document.getElementById(id);
const PREFIX='speakingym-freeze-progress-v1:';
let scope='',progress=normalizeFreezeProgress(),attempt=null,phase='start',reason=null,usedHint=false,epoch=0;
let importedMoment=null; // ephemeral AI-generated question; never written to localStorage.
const el=(tag,value,klass)=>{
 const n=document.createElement(tag);if(value!==undefined)n.textContent=value;
 if(klass)n.className=klass;return n;
};
function resolveScope(){
 try{
  const account=window.speakingymAccount;
  const loggedIn=account?.isLoggedIn?.()===true,uid=account?.getUid?.();
  if(loggedIn){
   if(typeof uid!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)||
      localStorage.getItem(OWNER_KEY)!==uid)return null;
   return 'user:'+uid;
  }
  // If auth is changing, do not show an earlier user's workout.
  if(account&&localStorage.getItem(OWNER_KEY))return null;
  return 'guest';
 }catch{return null}
}
function readScope(key){
 try{return normalizeFreezeProgress(JSON.parse(localStorage.getItem(PREFIX+key)||'null'))}
 catch{return normalizeFreezeProgress()}
}
function saveScope(key,value){
 try{
  if(!key||resolveScope()!==key)return false;
  const serialized=JSON.stringify(normalizeFreezeProgress(value));
  if(serialized.length>12000)return false;
  localStorage.setItem(PREFIX+key,serialized);return true;
 }catch{return false}
}
function clearSession(){
 epoch++;attempt=null;reason=null;usedHint=false;phase='start';
 $('return-to-ai').hidden=true;
 $('imported-followup-note').hidden=true;
 $('reply-note').value='';
 $('feedback').textContent='';
 $('mission').hidden=true;
 $('result').hidden=true;
 $('freeze-hint').hidden=true;
 $('transcript-disclaimer').hidden=true;
}
function updateSummary(){
 const stats=freezeSummary(progress);
 $('stat-attempts').textContent=String(stats.attempts);
 $('stat-recovered').textContent=String(stats.recovered);
 $('stat-scenes').textContent=String(stats.scenes);
 $('stat-next').textContent=stats.nextDue||'—';
 $('record-description').textContent=scope==='guest'?'ゲスト記録：この端末のみ':scope?'ログイン中のアカウントの端末内記録（他端末へは同期されません）':'アカウント確認中：記録を読み込めません';
 $('freeze-personal-label').textContent=stats.topReason?
  '自己申告では「'+FREEZE_REASONS[stats.topReason].name+'」が多め（'+stats.topReasonCount+'回）。次はこの切り返しを声に出そう。':
  'まず1回練習すると、自己申告から次に使えそうな切り返しを提案するよ。';
 $('freeze-personal-phrase').textContent=stats.nextRepairHint||'';
}
function bindScope(){
 const next=resolveScope();
 if(next===scope&&scope!==null)return;
 clearSession();scope=next;progress=next?readScope(next):normalizeFreezeProgress();
 updateSummary();
 $('start-button').disabled=!next;
 $('mission-select').disabled=!next;
 $('pick-recommendation').disabled=!next;
 $('save-warning').textContent=next?'':'アカウントを確認中です。ログイン状態が確定すると練習できます。';
}
function say(text){
 if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined'){
  $('feedback').textContent='この端末では読み上げが利用できません。英文を見て声に出そう。';return;
 }
 try{
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';
  utterance.rate=.86;window.speechSynthesis.speak(utterance);
 }catch{$('feedback').textContent='読み上げを開始できませんでした。英文を見て声に出そう。'}
}
function showStage(stage){
 $('step-start').hidden=stage!=='start';
 $('step-repair').hidden=stage!=='repair';
 $('step-retry').hidden=stage!=='retry';
 $('mission').hidden=stage==='start';
 const names={start:'1 / 3　予想外のひと言',repair:'2 / 3　会話を立て直す',retry:'3 / 3　もう一度言ってみる'};
 $('stage-name').textContent=names[stage]||'';
 $('mission-heading').textContent=attempt?.scene.name||'';
}
function receiveAIQuestion(){
 if(importedMoment||!scope||!scope.startsWith('user:'))return;
 const handoff=window.speakingymFreezeBridge?.consumeChallenge();
 if(!handoff)return;
 if(scope!=='user:'+handoff.uid)return;
 importedMoment={...handoff,used:false,trained:false};
 const gymScene=window.speakingymFreezeBridge.freezeScene(handoff.sceneId);
 $('mission-select').value=gymScene;
 $('imported-ai-question').textContent=handoff.question;
 $('imported-ai-cue').hidden=false;
}
function startMission(useImported=false){
 bindScope();
 if(!scope)return;
 const mission=sceneAttempt($('mission-select').value,progress);
 if(!mission)return;
 const useOriginal=useImported===true&&!!importedMoment&&!importedMoment.used &&
  scope==='user:'+importedMoment.uid&&
  window.speakingymFreezeBridge?.freezeScene(importedMoment.sceneId)===mission.scene.id;
 if(useOriginal){
  // Show the exact selected AI utterance once, but never include it in
  // localStorage, analytics, URL, generated feedback or return payload.
  attempt={...mission,variation:{...mission.variation,
   ask:importedMoment.question,
   meaning:'直前のAIが話した内容です。自動翻訳や添削は行っていません。',
   goal:'まずは聞き返し・時間稼ぎ・言い換えで会話を立て直そう。'},
   imported:true};
  importedMoment.used=true;importedMoment.trained=true;
 }else attempt=mission;
 epoch++;reason=null;usedHint=false;phase='ask';
 $('imported-followup-note').hidden=!useOriginal;
 $('reply-note').value='';$('feedback').textContent='';
 $('result').hidden=true;$('freeze-hint').hidden=true;
 $('transcript-disclaimer').hidden=true;
 $('context').textContent=useOriginal?'先ほどのAI実践英会話から選んだ質問だよ。':attempt.scene.context;
 $('dialogue').textContent=attempt.variation.ask;
 $('translation').textContent=attempt.variation.meaning;
 $('goal').textContent=attempt.variation.goal;
 $('attempt-number').textContent='この場面 '+String(attempt.attempts+1)+'回目';
 $('reason-buttons').replaceChildren();
 for(const [id,value] of Object.entries(FREEZE_REASONS)){
  const b=el('button',value.name,'reason-button');b.type='button';
  b.dataset.reason=id;b.addEventListener('click',()=>chooseReason(id));
  $('reason-buttons').append(b);
 }
 $('mission').hidden=false;
 $('step-start').hidden=false;$('step-repair').hidden=true;$('step-retry').hidden=true;
 $('stage-name').textContent='1 / 3　予想外のひと言';
 $('mission').scrollIntoView?.({block:'start',behavior:'smooth'});
}
function chooseReason(id){
 if(!attempt||phase!=='ask'||!Object.hasOwn(FREEZE_REASONS,id))return;
 phase='repair';reason=id;
 const rescue=FREEZE_REASONS[id];
 $('reason-caption').textContent=rescue.hint;
 $('rescue-line').textContent=rescue.rescue;
 $('rescue-guide').textContent='この一言で、沈黙を会話に戻そう。';
 showStage('repair');
 $('feedback').textContent='今は完璧な英語でなくて大丈夫。まず会話をつなごう。';
}
function showFollowup(){
 if(!attempt||phase!=='repair')return;
 phase='retry';
 $('followup').textContent=attempt.followup;
 $('followup-hint').textContent=attempt.variation.examples[0];
 $('followup-hint-2').textContent=attempt.variation.examples[1];
 $('freeze-hint').hidden=true;
 $('feedback').textContent=attempt.imported?
  'ここからは実際の会話の続きではなく、別の想定返答での応用練習だよ。':
  '少し違う返事が来たよ。今度は自分の言葉で答えてみよう。';
 showStage('retry');
}
function showHint(){
 if(!attempt||phase!=='retry')return;
 usedHint=true;$('freeze-hint').hidden=false;
 $('feedback').textContent='ヒントを見ても大丈夫。「次はヒントなしで」を目指そう。';
}
function finish(saidIt){
 if(!attempt||phase!=='retry'||typeof saidIt!=='boolean')return;
 // A stale event from the previous login or tab must not write to its scope.
 const key=resolveScope();
 if(!key||scope!==key){clearSession();bindScope();return}
 const id=attempt.scene.id;
 progress=recordFreezeAttempt(progress,{sceneId:id,reason,saidIt,usedHint},new Date());
 const saved=saveScope(key,progress);
 const record=progress.records[id];
 phase='done';$('mission').hidden=true;$('result').hidden=false;
 $('return-to-ai').hidden=!(importedMoment?.trained&&scope==='user:'+importedMoment.uid);
 const independently=saidIt&&!usedHint;
 window.speakingymAnalytics?.track('sg_freeze_self_report',{
  source:attempt.imported?'ai':'scripted',outcome:independently?'said_it':'not_yet'
 });
 $('result-title').textContent=independently?'リベンジ成功を記録！':'今日の詰まりは次の練習へ';
 $('result-detail').textContent=independently?
  'ヒントを見ずに返せた、と自己記録したよ。少し間隔を空けてもう一度挑戦しよう。':
  'うまく出てこなくても大丈夫。明日、違う返答でもう一度挑戦しよう。';
 $('result-schedule').textContent='次の復習予定：'+record.due+'（日本時間）';
 $('result-origin').textContent=saved?'今回の練習結果をこの端末に保存しました。音声や入力文は保存していません。':
  '端末への記録保存に失敗しました。ブラウザの容量・設定を確認してください。';
 updateSummary();
 $('result').scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
function renderSceneOptions(){
 const list=$('mission-select');list.replaceChildren();
 for(const s of FREEZE_SCENES){
  const option=el('option',s.icon+' '+s.name);option.value=s.id;list.append(option);
 }
 $('scene-count').textContent=String(FREEZE_SCENES.length);
}
function pickRecommended(){
 if(!scope)return;
 $('mission-select').value=importedMoment&&!importedMoment.used?
  window.speakingymFreezeBridge.freezeScene(importedMoment.sceneId):
  nextFreezeScene(progress).id;
 $('feedback').textContent='期限が来たリベンジを優先して選んだよ。';
}
window.addEventListener('speakingym:account-changing',()=>{
 importedMoment=null;
 $('imported-ai-cue').hidden=true;$('imported-ai-question').textContent='';
 scope=null;clearSession();
 $('start-button').disabled=true;$('mission-select').disabled=true;
 $('pick-recommendation').disabled=true;
 progress=normalizeFreezeProgress();updateSummary();
 $('save-warning').textContent='アカウント切替中。記録を保護するため画面を閉じました。';
});
window.addEventListener('speakingym:account-ready',()=>{
 bindScope();receiveAIQuestion();pickRecommended();
});
$('start-button').addEventListener('click',()=>startMission());
$('use-imported-question').addEventListener('click',()=>{
 receiveAIQuestion();
 if(!importedMoment||importedMoment.used)return;
 $('mission-select').value=window.speakingymFreezeBridge.freezeScene(importedMoment.sceneId);
 startMission(true);
});
$('return-to-ai').addEventListener('click',()=>{
 if(!importedMoment?.trained||phase!=='done'||
   resolveScope()!=='user:'+importedMoment.uid)return;
 const ok=window.speakingymFreezeBridge?.stageReturn({
  sceneId:importedMoment.sceneId,level:importedMoment.level,reason
 });
 if(!ok){
  $('result-origin').textContent='ログイン状態を確認できません。元のAI実践シーンを手動で選んでね。';return;
 }
 // Only scene ID and level appear in URL. No AI or learner text does.
 window.speakingymAnalytics?.track('sg_freeze_revenge');
 window.location.assign('./scenes.html?scene='+encodeURIComponent(importedMoment.sceneId));
});
$('pick-recommendation').addEventListener('click',pickRecommended);
$('repair-next').addEventListener('click',showFollowup);
$('show-hint').addEventListener('click',showHint);
$('said-yes').addEventListener('click',()=>finish(true));
$('said-no').addEventListener('click',()=>finish(false));
$('retry-scene').addEventListener('click',()=>{if(attempt){$('mission-select').value=attempt.scene.id;startMission()}});
$('try-another').addEventListener('click',()=>{
 pickRecommended();clearSession();
 $('step-start').hidden=false;$('mission-select').focus();
});
$('speak-dialogue').addEventListener('click',()=>{if(attempt)say(attempt.variation.ask)});
$('speak-rescue').addEventListener('click',()=>{if(reason)say(FREEZE_REASONS[reason].rescue)});
$('speak-followup').addEventListener('click',()=>{if(attempt)say(attempt.followup)});
$('reply-note').addEventListener('input',()=>{
 $('transcript-disclaimer').hidden=!$('reply-note').value.trim();
});
renderSceneOptions();bindScope();receiveAIQuestion();pickRecommended();
