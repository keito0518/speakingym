/**
 * Freeze Breaker is a scripted offline recovery workout, NOT an AI chat.
 * The scripted workout never uploads, stores or scores learner words.
 * A separately clicked optional teacher call sends up to two texts, not voice.
 */
import {OWNER_KEY} from './account-data.mjs';
import {FREEZE_SCENES,FREEZE_REASONS,normalizeFreezeProgress,nextFreezeScene,sceneAttempt,recoveryReply,recordFreezeAttempt,freezeSummary,freezeDay} from './freeze-breaker-data.mjs';
import {buildFreezeCoachingRequests,normalizeFreezeCoachResponse} from './freeze-coach-data.mjs';

const $=id=>document.getElementById(id);
const PREFIX='speakingym-freeze-progress-v1:';
const AI_ENDPOINT='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/';
const COACH_ORIGINS=new Set(['https://speakingym.pages.dev']);
const Recognizer=window.SpeechRecognition||window.webkitSpeechRecognition||null;
let scope='',progress=normalizeFreezeProgress(),attempt=null,phase='start',reason=null,usedHint=false,epoch=0;
let nextSpokenLine='';
let capture=null,captureStage=null,captureWanted=false,captureBase='',captureFinal='',captureInterim='',captureRetries=0,captureTimer=null;
let coachSession=null,coachEpoch=0,coachAbort=null,coachAsked=false,coachBusy=false;
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
 epoch++;attempt=null;reason=null;usedHint=false;phase='start';nextSpokenLine='';
 resetCoach();
 stopCapture();
 try{window.speechSynthesis?.cancel?.()}catch{}
 $('dialogue').textContent='';$('followup').textContent='';
 resetListen('dialogue');resetListen('followup');
 $('return-to-ai').hidden=true;
 $('imported-followup-note').hidden=true;
 $('first-transcript').value='';
 $('reply-note').value='';
 $('first-mic-status').textContent='マイクなしで声に出してもOK。自動採点ではありません。';
 $('retry-mic-status').textContent='マイクで話した英文を確認できます。音声認識の結果は採点ではありません。';
 $('feedback').textContent='';
 $('mission').hidden=true;
 $('result').hidden=true;
 $('freeze-hint').hidden=true;
 $('rescue-hint').open=false;
 $('transcript-disclaimer').hidden=true;
 $('reason-panel').hidden=true;
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
function say(text,rate=.86){
 if(captureWanted||capture)stopCapture(); // Never transcribe the synthetic voice as the learner's answer.
 if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined'){
  $('feedback').textContent='この端末では読み上げが利用できません。英文を表示して練習できます。';return false;
 }
 try{
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';
  utterance.rate=rate;window.speechSynthesis.speak(utterance);return true;
 }catch{$('feedback').textContent='読み上げを開始できませんでした。英文を表示して練習できます。';return false}
}
const speechId=which=>which==='first'?'first-transcript':'reply-note';
const speechStatus=which=>$(which+'-mic-status');
const joinSpeech=(a,b)=>[String(a||'').trim(),String(b||'').trim()].filter(Boolean).join(' ').slice(0,400);
function updateSpeechControls(){
 for(const which of ['first','retry']){
  const live=captureWanted&&captureStage===which;
  $(which+'-stop').hidden=!live;
  $(which+'-mic').textContent=live?'↻ 最初から話し直す':
  $(speechId(which)).value.trim()?'🎙 続きを話す':which==='first'?'🎙 切り返しを話す':'🎙 マイクで返す';
 }
}
function stopCapture(){
 captureWanted=false;
 if(captureTimer!==null){clearTimeout(captureTimer);captureTimer=null}
 if(capture){
  const old=capture;capture=null;
  try{old.onstart=null;old.onresult=null;old.onend=null;old.onerror=null;old.abort()}catch{}
 }
 captureStage=null;captureFinal='';captureInterim='';
 updateSpeechControls();
}
function captureIsActive(which){
 return captureWanted&&captureStage===which&&scope&&resolveScope()===scope&&
  (which==='first'?phase==='repair':phase==='retry');
}
function beginRecognition(){
 const which=captureStage;
 if(!which||!captureIsActive(which))return;
 try{
  const rec=new Recognizer();capture=rec;
  rec.lang='en-US';rec.interimResults=true;rec.continuous=true;
  captureFinal='';captureInterim='';
  rec.onstart=()=>{
   if(capture!==rec||!captureIsActive(which))return;
   speechStatus(which).textContent='🎙 聞き取り中。途中で言葉が止まっても続けて話せます。';
   updateSpeechControls();
  };
  rec.onresult=event=>{
   if(capture!==rec||!captureIsActive(which))return;
   let done='',partial='';
   for(let i=0;i<event.results.length;i++){
    const part=event.results[i]?.[0]?.transcript||'';
    if(event.results[i].isFinal)done=joinSpeech(done,part);
    else partial=joinSpeech(partial,part);
   }
   captureFinal=done;captureInterim=partial;
   if(done||partial)captureRetries=0;
   $(speechId(which)).value=joinSpeech(captureBase,joinSpeech(done,partial));
   if(which==='retry')$('transcript-disclaimer').hidden=!$('reply-note').value.trim();
  };
  rec.onerror=event=>{
   if(capture!==rec)return;
   const code=event?.error||'unknown';
   if(code==='no-speech')return;
   stopCapture();
   speechStatus(which).textContent=(code==='not-allowed'||code==='service-not-allowed')?
    'マイクが許可されていません。サイト設定で許可するか、手入力・声出しで練習できます。':
    code==='audio-capture'?'マイクを利用できません。端末を確認するか、手入力・声出しで練習できます。':
    code==='network'?'音声認識の通信が途切れました。入力済みの文はそのまま残っています。':
    '音声認識が止まりました。入力済みの文はそのまま残っています。';
  };
  rec.onend=()=>{
   if(capture!==rec)return;
   capture=null;
   if(!captureIsActive(which)){stopCapture();return}
   captureBase=joinSpeech(captureBase,joinSpeech(captureFinal,captureInterim));
   $(speechId(which)).value=captureBase;
   captureFinal='';captureInterim='';captureRetries++;
   if(captureRetries>2){
    stopCapture();speechStatus(which).textContent='ブラウザの制限で一時停止しました。「続きを話す」で再開できます。';return;
   }
   speechStatus(which).textContent='音声認識が止まったため、再開を試しています…';
   captureTimer=setTimeout(()=>{captureTimer=null;if(captureIsActive(which))beginRecognition()},350);
  };
  rec.start();
 }catch{
  stopCapture();speechStatus(which).textContent='音声認識を開始できません。手入力・声出しでも続けられます。';
 }
}
function startCapture(which){
 if(!scope||resolveScope()!==scope||(which==='first'?phase!=='repair':phase!=='retry'))return;
 if(!Recognizer){speechStatus(which).textContent='このブラウザでは音声認識が利用できません。マイクなしで声に出すか、手入力してね。';return}
 const reset=captureStage===which&&captureWanted;
 stopCapture();
 if(reset)$(speechId(which)).value='';
 captureBase=$(speechId(which)).value.trim().slice(0,400);
 captureStage=which;captureWanted=true;captureRetries=0;
 try{window.speechSynthesis?.cancel?.()}catch{}
 updateSpeechControls();beginRecognition();
}
function resetTranscript(which){
 if(captureStage===which)stopCapture();
 $(speechId(which)).value='';
 if(which==='retry')$('transcript-disclaimer').hidden=true;
 speechStatus(which).textContent='全消ししました。必要ならマイクでもう一度話そう。';
 updateSpeechControls();
}
function transcriptEdited(which){
 const current=$(speechId(which)).value.slice(0,400);
 if(captureStage===which)stopCapture();
 $(speechId(which)).value=current;
 if(which==='retry')$('transcript-disclaimer').hidden=!current.trim();
 updateSpeechControls();
}
function resetCoach(){
 coachEpoch++;
 coachAbort?.abort();coachAbort=null;
 coachSession=null;coachAsked=false;coachBusy=false;
 $('request-coach').disabled=true;
 $('coach-status').textContent='';
 $('coach-results').replaceChildren();
 $('coach-intro').textContent='講評は任意です。練習自体は無料のまま続けられます。';
}
function coachOriginReady(){
 return COACH_ORIGINS.has(window.location.origin)||
  ['localhost','127.0.0.1'].includes(window.location.hostname);
}
function prepareCoach(){
 const firstText=$('first-transcript').value;
 const retryText=$('reply-note').value;
 const requests=buildFreezeCoachingRequests({
  scene:attempt.scene.name,question:attempt.variation.ask,followup:nextSpokenLine,
  reason:reason?FREEZE_REASONS[reason].name:'',firstText,retryText,imported:!!attempt.imported
 });
 coachSession={owner:scope,workoutEpoch:epoch,requests,
  labels:[...(firstText.trim()?['切り返しのひと言']:[]),...(retryText.trim()?['相手の続きへの返答']:[])]};
 if(attempt.imported){
  $('coach-intro').textContent='AI実践英会話から持ち込んだ質問は、ここではAI講評の対象外です。通常の場面では使えます。';
 }else if(!requests.length){
  $('coach-intro').textContent='今回、講評できる英文がありません。次回はマイクか入力欄で自分の返答を残してね。';
 }else if(!scope.startsWith('user:')){
  $('coach-intro').textContent='自分の英文をAI先生に見てもらうにはログインが必要です。練習はログインなしで続けられます。';
 }else if(!coachOriginReady()){
  $('coach-intro').textContent='開発プレビューではAI講評を実行できません。正式公開後に本番サイトで利用できます。';
 }else{
  $('coach-intro').textContent='今回の'+requests.length+'つの返答について、具体的な言い換えと次の練習を提案します。';
  $('request-coach').disabled=false;
 }
}
function coachIsCurrent(session,requestEpoch){
 return coachEpoch===requestEpoch&&coachSession===session&&phase==='done'&&
  epoch===session.workoutEpoch&&scope===session.owner&&resolveScope()===session.owner;
}
function renderCoach(feedback,session){
 const root=$('coach-results');root.replaceChildren();
 const fields=[['良かったところ','praise'],['次に直すところ','improvement'],
  ['自然な言い換え','improved'],['なぜこの表現？','why'],['次に声で試すこと','practice']];
 for(const item of feedback){
  const card=el('section',undefined,'coach-answer');
  card.append(el('h4',session.labels[item.index]||'自分の返答'));
  for(const [label,key] of fields){
   card.append(el('p',label,'coach-label'));
   card.append(el('p',item[key],key==='improved'?'coach-improved':''));
  }
  root.append(card);
 }
}
async function requestCoach(){
 const session=coachSession;
 if(!session||coachBusy||coachAsked||!session.requests.length||
  !session.owner.startsWith('user:')||!coachOriginReady()||!coachIsCurrent(session,coachEpoch))return;
 const requestEpoch=coachEpoch;
 coachBusy=true;$('request-coach').disabled=true;
 $('coach-status').textContent='AI先生の利用準備を確認しています…';
 const controller=new AbortController();coachAbort=controller;
 let sent=false;
 const timeout=setTimeout(()=>controller.abort(),19000);
 try{
  const healthResponse=await fetch(AI_ENDPOINT+'health',{signal:controller.signal});
  const health=healthResponse.ok?await healthResponse.json().catch(()=>null):null;
  if(!health?.reflexCoachSupported)throw Error('teacher_not_deployed');
  if(!health.aiConfigured)throw Error('ai_disabled');
  // Never allow an unmetered AI request if the entitlement service is offline.
  if(health.plansEnabled!==true)throw Error('plans_not_ready');
  if(!coachIsCurrent(session,requestEpoch))return;
  const token=await window.speakingymAccount?.getIdToken?.();
  if(!token)throw Error('login_required');
  if(!coachIsCurrent(session,requestEpoch))return;
  $('coach-status').textContent='書き起こした英文をAI先生が確認しています…';
  sent=true;coachAsked=true;
  window.speakingymAnalytics?.track('sg_freeze_coach_request',{answers:session.requests.length===2?'two':'one'});
  const response=await fetch(AI_ENDPOINT,{method:'POST',signal:controller.signal,
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
   body:JSON.stringify({action:'reflex_coach',level:'standard',attempts:session.requests})});
  const body=await response.json().catch(()=>({error:'invalid_json'}));
  if(!response.ok)throw Error(String(body.error||'server_unavailable'));
  const feedback=normalizeFreezeCoachResponse(body.feedback,session.requests.length);
  if(!feedback)throw Error('invalid_ai_response');
  if(!coachIsCurrent(session,requestEpoch))return;
  renderCoach(feedback,session);
  $('coach-status').textContent='AI講評を受け取りました。音声の発音や実際の流暢さは評価していません。';
  void window.speakingymQuota?.refresh?.();
 }catch(e){
  if(!coachIsCurrent(session,requestEpoch))return;
  const errors={
   teacher_not_deployed:'AI講評は準備中です。',ai_disabled:'AI講評は現在停止中です。',
   plans_not_ready:'利用回数を安全に確認できないため、送信を止めました。',
   login_required:'AI講評にはログインが必要です。',
   daily_teacher_limit:'今日のAI先生の回数を使い切りました。',
   monthly_teacher_limit:'今月のAI先生の回数を使い切りました。',
   rate_limited:'混み合っています。時間をおいてください。',
   invalid_coaching_input:'英文を読み取れませんでした。',
   gemini_quota:'AI提供元の上限に達しました。',
   invalid_ai_response:'AIから講評を正常に受け取れませんでした。'
  };
  const message=errors[String(e?.message)]||'AI講評を取得できませんでした。通信状態を確認してください。';
  $('coach-status').textContent=message+(sent?' 重複送信を避けるため、この練習からの再送はできません。':' AI利用回数は消費していません。');
  if(sent)void window.speakingymQuota?.refresh?.();
 }finally{
  clearTimeout(timeout);
  if(coachAbort===controller)coachAbort=null;
  if(coachIsCurrent(session,requestEpoch)){
   coachBusy=false;$('request-coach').disabled=coachAsked;
  }
 }
}
function resetListen(id){
 $(id).hidden=true;
 const b=$('reveal-'+id);b.setAttribute('aria-expanded','false');b.textContent='英文を見る';
}
function revealListen(id,show){
 $(id).hidden=!show;
 const b=$('reveal-'+id);b.setAttribute('aria-expanded',String(show));
 b.textContent=show?'英文を隠す':'英文を見る';
}
function playListeningLine(id,text,rate=.86){
 if(!say(text,rate))revealListen(id,true);
}
function showStage(stage){
 $('step-start').hidden=stage!=='start';
 $('step-repair').hidden=stage!=='repair';
 $('step-retry').hidden=stage!=='retry';
 $('mission').hidden=stage==='start';
 const names={start:'1 / 3　予想外のひと言',repair:'2 / 3　切り返しを声に出す',retry:'3 / 3　会話を続ける'};
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
 resetCoach();
 stopCapture();
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
 epoch++;reason=null;usedHint=false;phase='ask';nextSpokenLine='';
 $('imported-followup-note').hidden=!useOriginal;
 $('reply-note').value='';$('feedback').textContent='';
 $('first-transcript').value='';
 $('first-mic-status').textContent='マイクなしで声に出してもOK。自動採点ではありません。';
 $('retry-mic-status').textContent='マイクで話した英文を確認できます。音声認識の結果は採点ではありません。';
 updateSpeechControls();
 $('result').hidden=true;$('freeze-hint').hidden=true;
 $('rescue-hint').open=false;
 $('transcript-disclaimer').hidden=true;
 $('reason-panel').hidden=true;
 $('context').textContent=useOriginal?'先ほどのAI実践英会話から選んだ質問だよ。':attempt.scene.context;
 $('dialogue').textContent=attempt.variation.ask;
 $('followup').textContent='';resetListen('dialogue');resetListen('followup');
 $('translation').textContent=attempt.variation.meaning;
 $('goal').textContent=attempt.variation.goal;
 $('attempt-number').textContent='この場面 '+String(attempt.attempts+1)+'回目';
 $('reason-buttons').replaceChildren();
 for(const [id,value] of Object.entries(FREEZE_REASONS)){
  const b=el('button',value.name,'reason-button');b.type='button';
  b.dataset.reason=id;b.addEventListener('click',()=>chooseReason(id));
  $('reason-buttons').append(b);
 }
 $('reason-panel').hidden=false;
 $('mission').hidden=false;
 $('step-start').hidden=false;$('step-repair').hidden=true;$('step-retry').hidden=true;
 $('stage-name').textContent='1 / 3　予想外のひと言';
 $('mission').scrollIntoView?.({block:'start',behavior:'smooth'});
 window.speakingymAnalytics?.track('sg_freeze_start',{source:useOriginal?'ai':'scripted'});
 playListeningLine('dialogue',attempt.variation.ask);
}
function chooseReason(id){
 if(!attempt||phase!=='ask'||!Object.hasOwn(FREEZE_REASONS,id))return;
 stopCapture();
 phase='repair';reason=id;
 window.speakingymAnalytics?.track('sg_freeze_strategy',{strategy:id});
 const rescue=FREEZE_REASONS[id];
 $('reason-caption').textContent=rescue.hint;
 $('rescue-line').textContent=rescue.rescue;
 $('rescue-meaning').textContent=rescue.meaning;
 $('rescue-guide').textContent=rescue.hint;
 showStage('repair');
 $('feedback').textContent='今は完璧な英語でなくて大丈夫。まず会話をつなごう。';
}
function showFollowup(){
 if(!attempt||phase!=='repair')return;
 stopCapture();
 phase='retry';
 const answer=recoveryReply(attempt,reason);
 nextSpokenLine=answer.line;
 $('followup').textContent=nextSpokenLine;
 $('recovery-context').textContent=answer.caption+'（選んだ練習に合わせた想定会話で、音声の自動理解ではありません）';
 resetListen('followup');
 $('followup-hint').textContent=attempt.variation.examples[0];
 $('followup-hint-2').textContent=attempt.variation.examples[1];
 $('retry-heading').textContent='さらに予想外のひと言が来た！';
 $('freeze-hint').hidden=true;
 $('feedback').textContent=attempt.imported?
  'ここからは実際の会話の続きではなく、別の想定返答での応用練習だよ。':
  '少し違う返事が来たよ。今度は自分の言葉で答えてみよう。';
 showStage('retry');
 playListeningLine('followup',nextSpokenLine,answer.rate);
}
function showHint(){
 if(!attempt||phase!=='retry')return;
 usedHint=true;$('freeze-hint').hidden=false;
 $('feedback').textContent='ヒントを見ても大丈夫。「次はヒントなしで」を目指そう。';
}
function finish(saidIt){
 if(!attempt||phase!=='retry'||typeof saidIt!=='boolean')return;
 stopCapture();
 // A stale event from the previous login or tab must not write to its scope.
 const key=resolveScope();
 if(!key||scope!==key){clearSession();bindScope();return}
 const id=attempt.scene.id;
 try{window.speechSynthesis?.cancel?.()}catch{}
 progress=recordFreezeAttempt(progress,{sceneId:id,reason,saidIt,usedHint},new Date());
 const saved=saveScope(key,progress);
 const record=progress.records[id];
 phase='done';$('mission').hidden=true;$('result').hidden=false;
 prepareCoach();
 $('return-to-ai').hidden=!(importedMoment?.trained&&scope==='user:'+importedMoment.uid);
 const independently=saidIt&&!usedHint;
 window.speakingymAnalytics?.track('sg_freeze_self_report',{
  source:attempt.imported?'ai':'scripted',outcome:independently?'said_it':'not_yet'
 });
 $('result-title').textContent=independently?(reason===null?'2問目も返せたね！':'言葉が止まっても、立て直せた！'):'今日の詰まりは次の練習へ';
 $('result-detail').textContent=independently?
  (reason===null?'2つ目の質問にも返せた、と自己記録したよ。別の場面でも試してみよう。':
   '最初は詰まっても、切り返した後にヒントなしで返せた、と自己記録したよ。'):
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
 $('feedback').textContent='復習期限と自己申告の苦手に合わせた場面を選んだよ。';
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
$('rescue-hint').addEventListener('toggle',()=>{if($('rescue-hint').open)usedHint=true});
$('said-yes').addEventListener('click',()=>finish(true));
$('said-no').addEventListener('click',()=>finish(false));
$('request-coach').addEventListener('click',requestCoach);
$('retry-scene').addEventListener('click',()=>{if(attempt){$('mission-select').value=attempt.scene.id;startMission()}});
$('try-another').addEventListener('click',()=>{
 pickRecommended();clearSession();
 $('step-start').hidden=false;$('mission-select').focus();
});
$('speak-dialogue').addEventListener('click',()=>{if(attempt&&phase==='ask')playListeningLine('dialogue',attempt.variation.ask)});
$('first-mic').addEventListener('click',()=>startCapture('first'));
$('retry-mic').addEventListener('click',()=>startCapture('retry'));
$('first-stop').addEventListener('click',()=>{if(captureStage==='first'){stopCapture();speechStatus('first').textContent='認識を停止しました。自分の切り返しを確認して、相手の続きを聞こう。'}});
$('retry-stop').addEventListener('click',()=>{if(captureStage==='retry'){stopCapture();speechStatus('retry').textContent='認識を停止しました。必要なら続きを話せます。'}});
$('first-reset').addEventListener('click',()=>resetTranscript('first'));
$('retry-reset').addEventListener('click',()=>resetTranscript('retry'));
$('first-transcript').addEventListener('input',()=>transcriptEdited('first'));
$('speak-rescue').addEventListener('click',()=>{if(reason)say(FREEZE_REASONS[reason].rescue)});
$('speak-followup').addEventListener('click',()=>{if(attempt&&phase==='retry')playListeningLine('followup',nextSpokenLine,recoveryReply(attempt,reason).rate)});
$('reveal-dialogue').addEventListener('click',()=>{if(attempt&&phase==='ask')revealListen('dialogue',$('dialogue').hidden)});
$('reveal-followup').addEventListener('click',()=>{if(attempt&&phase==='retry')revealListen('followup',$('followup').hidden)});
$('reply-note').addEventListener('input',()=>{
 transcriptEdited('retry');
 $('transcript-disclaimer').hidden=!$('reply-note').value.trim();
});
window.addEventListener('pagehide',()=>{stopCapture();resetCoach()});
renderSceneOptions();bindScope();receiveAIQuestion();pickRecommended();
