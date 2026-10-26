import {SCENE_COMMENTARY_PHOTOS,SCENE_COMMENTARY_LEVELS} from './scene-commentary-data.mjs';

const $=id=>document.getElementById(id);
const recognitionSupported=()=>Boolean(window.SpeechRecognition||window.webkitSpeechRecognition);
const ORDER_KEY='speakingym-scene-session-v1';
let order=makeOrder(),position=0,level=1,recognition=null,active=false,restarting=false;
let finalText='',interimText='',startedAt=0,timerId=0,recognitionRetryTimer=0,recognitionBlocked=false;
function makeOrder(){
 const query=new URLSearchParams(location.search);
 if(query.has('qa'))return SCENE_COMMENTARY_PHOTOS.map((_,i)=>i);
 const indices=SCENE_COMMENTARY_PHOTOS.map((_,i)=>i);
 for(let i=indices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]]}
 return indices;
}
function current(){return SCENE_COMMENTARY_PHOTOS[order[position%order.length]]}
function setLevel(value){
 if(active)return;
 level=Number(value);
 document.querySelectorAll('.level').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.level)===level)));
 $('level-desc').textContent=SCENE_COMMENTARY_LEVELS[level].description;
 $('scene-task').innerHTML=`${current().levelTasks[level-1]}<small>日本語の英訳ではなく、写真の情報を自分で選んで説明します。</small>`;
}
function renderScene(){
 const scene=current(),img=$('scene-photo');
 $('round-count').textContent=`SCENE ${position+1} / ${SCENE_COMMENTARY_PHOTOS.length}`;
 img.alt=scene.alt;img.referrerPolicy='no-referrer';img.src=scene.image;
 $('photo-credit').href=scene.source;$('photo-credit').textContent=`写真：${scene.creator} · Unsplash`;
 $('scene-name').textContent=scene.title;
 $('photo-error').style.display='none';
 $('learn-panel').hidden=true;$('timer-area').hidden=true;
 $('timer').textContent='30';$('live-transcript').textContent='マイクを押すと、認識された英語がここに表示されます。';
 $('live-transcript').classList.add('placeholder');$('status').textContent='写真を見て、話すレベルを選んだらスタート。';
 $('practice-actions').hidden=false;$('start-challenge').hidden=false;
 $('retry-recognition').hidden=true;$('continue-without-mic').hidden=true;
 $('start-challenge').disabled=false;
 setLevel(level);
}
function showLiveText(){
 const text=(finalText+interimText).trim();
 $('live-transcript').textContent=text||'認識された英文がここに表示されます。聞き取れなかった場合も、そのまま話し続けてください。';
 $('live-transcript').classList.toggle('placeholder',!text);
}
function startRecognition(){
 stopRecognition();recognitionBlocked=false;
 const Ctor=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Ctor){showMicFallback('このブラウザは音声認識に対応していません。マイクなしで声に出す練習を続けられます。');return false}
 try{
  recognition=new Ctor();recognition.lang='en-US';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
  recognition.onresult=event=>{
   for(let i=event.resultIndex;i<event.results.length;i++){
    const part=event.results[i][0]?.transcript?.trim();if(!part)continue;
    if(event.results[i].isFinal){finalText+=`${part} `;interimText=''}else interimText=part;
   }
   showLiveText();
  };
  recognition.onerror=event=>{
   if(!active)return;
   recognitionBlocked=true;
   const reason=event.error==='not-allowed'||event.error==='service-not-allowed'?'マイクが使えませんでした。ブラウザの許可を確認して再試行できます。':'音声を認識できませんでした。周囲が静かな場所で再試行できます。';
   showMicFallback(reason);
  };
  recognition.onend=()=>{
   if(active&&!recognitionBlocked&&!restarting){restarting=true;clearTimeout(recognitionRetryTimer);recognitionRetryTimer=setTimeout(()=>{restarting=false;if(active)startRecognition()},350)}
  };
  recognition.start();$('status').textContent='音声認識中。写真を見たまま、英語で説明を続けよう。';
  $('retry-recognition').hidden=true;$('continue-without-mic').hidden=true;
  return true;
 }catch{
  showMicFallback('マイクを開始できませんでした。もう一度試すか、認識なしで声に出して練習できます.');return false;
 }
}
function showMicFallback(message){
 $('status').textContent=message;
 $('retry-recognition').hidden=false;$('continue-without-mic').hidden=false;
}
function stopRecognition(){
 clearTimeout(recognitionRetryTimer);restarting=false;
 const old=recognition;recognition=null;
 if(old){old.onend=null;old.onerror=null;old.onresult=null}
 try{old?.stop()}catch{}
}
function startChallenge(withRecognition=true){
 if(active)return;
 active=true;finalText='';interimText='';startedAt=Date.now();
 $('start-challenge').hidden=true;$('retry-recognition').hidden=true;$('continue-without-mic').hidden=true;
 $('timer-area').hidden=false;$('live-transcript').textContent='英語を声に出して続けよう。';$('live-transcript').classList.add('placeholder');
 if(withRecognition)startRecognition();else $('status').textContent='音声認識なしの練習中。写真を見たまま30秒、声に出して説明しよう。';
 const tick=()=>{
  if(!active)return;
  const remain=Math.max(0,30-Math.floor((Date.now()-startedAt)/1000));
  $('timer').textContent=String(remain);
  if(remain<=0){finishChallenge();return}
  timerId=setTimeout(tick,150);
 };
 tick();
}
function finishChallenge(){
 if(!active)return;
 active=false;clearTimeout(timerId);stopRecognition();
 const scene=current(),heard=(finalText+interimText).trim();
 $('timer').textContent='0';$('learn-panel').hidden=false;$('practice-actions').hidden=true;
 $('transcript-label').textContent=heard?'今回の音声認識（参考）':'今回の音声認識';
 $('final-transcript').textContent=heard?heard:'認識された英文はありません。認識できなかった可能性があります。発話内容や英語の正確さは判定していません。';
 $('learn-note').textContent=heard?'音声認識の誤変換もあり得ます。英文の正しさを採点した結果ではありません。例文は別の伝え方のヒントです。':'音声認識の結果はありません。声に出した内容を記録・採点せず、例文だけ確認できます。';
 const examples=scene.examples.map((text,i)=>`<article class="sample"><div class="sample-head">LEVEL ${i+1} · ${['見えるものを描写','状況を控えめに推測','相手に状況を共有'][i]}</div><p lang="en">${escapeHtml(text)}</p></article>`).join('');
 $('samples').innerHTML=examples;
 $('language-tip').innerHTML=`<strong>ワンポイント：</strong>${escapeHtml(scene.tip)}`;
 $('status').textContent='30秒終了。聞き取られた内容を見て、別の表現も比べてみよう。';
 $('learn-title').textContent='どう見えた？';
}
function escapeHtml(text){return String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function nextScene(){
 position++;
 if(position>=order.length){order=makeOrder();position=0}
 renderScene();window.scrollTo({top:0,behavior:'smooth'});
}
$('scene-photo').addEventListener('error',()=>{$('photo-error').style.display='grid'});
document.querySelectorAll('.level').forEach(button=>button.addEventListener('click',()=>setLevel(button.dataset.level)));
$('start-challenge').addEventListener('click',()=>startChallenge(true));
$('retry-recognition').addEventListener('click',()=>{if(!active)startChallenge(true);else startRecognition()});
$('continue-without-mic').addEventListener('click',()=>{if(!active)startChallenge(false);else{recognitionBlocked=true;stopRecognition();$('status').textContent='音声認識なしで練習中。声に出して続けよう。';$('retry-recognition').hidden=true;$('continue-without-mic').hidden=true}});
$('retry-same').addEventListener('click',()=>{renderScene();startChallenge(true)});
$('next-scene').addEventListener('click',nextScene);
window.addEventListener('speakingym:account-changing',()=>{
 if(active){active=false;clearTimeout(timerId);stopRecognition()}
 finalText='';interimText='';$('live-transcript').textContent='';$('final-transcript').textContent='';$('learn-panel').hidden=true;
});
window.addEventListener('pagehide',()=>{active=false;clearTimeout(timerId);stopRecognition()});
renderScene();
