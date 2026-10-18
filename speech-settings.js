/* Device-only voice preferences. No audio, text or preference is uploaded. */
(function(){
'use strict';
const key='speakingym-device-voice-v1',synth=window.speechSynthesis;
let prefs={voice:'',rate:.92},active=null,epoch=0;
try{const v=JSON.parse(localStorage.getItem(key));if(v&&typeof v.voice==='string')prefs.voice=v.voice;if([.75,.92,1,1.12].includes(v?.rate))prefs.rate=v.rate}catch{}
function voices(){try{return (synth?.getVoices()||[]).filter(v=>/^en(?:-|_)/i.test(v.lang)).sort((a,b)=>rank(b)-rank(a))}catch{return []}}
function rank(v){return (/natural|premium|enhanced|neural/i.test(v.name)?20:0)+(/Samantha|Ava|Daniel|Google|Microsoft/i.test(v.name)?5:0)+(v.localService?1:0)}
function apply(u){const list=voices(),voice=list.find(v=>(v.voiceURI||v.name)===prefs.voice)||list[0];if(voice)u.voice=voice;u.lang=voice?.lang||'en-US';u.rate=prefs.rate;u.pitch=1;return u}
function save(){try{localStorage.setItem(key,JSON.stringify(prefs))}catch{}}
function stop(){epoch++;try{synth?.cancel()}catch{}active=null}
function speak(text){if(!synth||!window.SpeechSynthesisUtterance)return false;window.dispatchEvent(new Event('speakingym:before-speech'));stop();try{const token=epoch;active=apply(new SpeechSynthesisUtterance(text));active.onend=active.onerror=()=>{if(epoch===token)active=null};synth.speak(active);if(synth.paused)synth.resume();return true}catch{active=null;return false}}
window.speakingymSpeech={apply,speak,stop,voices};
function mount(){
 const main=document.querySelector('main');if(!main)return;
 const details=document.createElement('details');details.className='sg-voice-settings';details.style.cssText='margin:16px 0;padding:12px 16px;border:1px solid #d5e3d4;border-radius:12px;background:#f6f8f3;color:#294d39;font-size:13px';
 const summary=document.createElement('summary');summary.textContent='音声設定 · 声と速さ';details.append(summary);
 const label=document.createElement('label');label.textContent='英語の声 ';const select=document.createElement('select');select.setAttribute('aria-label','英語の声');select.style.maxWidth='100%';label.append(select);
 function refresh(){select.replaceChildren();const auto=document.createElement('option');auto.value='';auto.textContent='自動（利用可能な英語音声）';select.append(auto);for(const voice of voices()){const o=document.createElement('option');o.value=voice.voiceURI||voice.name;o.textContent=voice.name+' · '+voice.lang;select.append(o)}select.value=prefs.voice;}
 select.addEventListener('change',()=>{prefs.voice=select.value;save()});
 const speedLabel=document.createElement('label');speedLabel.textContent=' 速さ ';const speed=document.createElement('select');speed.setAttribute('aria-label','読み上げ速度');for(const [v,t] of [[.75,'ゆっくり'],[.92,'少しゆっくり'],[1,'標準'],[1.12,'速め']]){const o=document.createElement('option');o.value=v;o.textContent=t;speed.append(o)}speed.value=prefs.rate;speed.addEventListener('change',()=>{prefs.rate=Number(speed.value);save()});speedLabel.append(speed);
 const sample=document.createElement('button');sample.type='button';sample.textContent='声を試す';sample.onclick=()=>{if(!speak('Hi! What would you like to practise today?'))note.textContent='このブラウザでは音声を利用できません。英文は画面で確認できます。'};
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='読み上げ停止';cancel.onclick=stop;
 const note=document.createElement('p');note.textContent='端末標準の音声です。声の種類や自然さは端末・ブラウザにより異なります。設定はこの端末に保存します。';
 const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px';row.append(label,speedLabel,sample,cancel);details.append(row,note);main.prepend(details);refresh();synth?.addEventListener?.('voiceschanged',refresh);
 const old=document.getElementById('speed');if(old){old.value=prefs.rate===.75?'slow':prefs.rate===1.12?'fast':'normal';old.addEventListener('change',()=>{prefs.rate=old.value==='slow'?.75:old.value==='fast'?1.12:.92;speed.value=prefs.rate;save()})}
}
window.addEventListener('pagehide',stop);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
