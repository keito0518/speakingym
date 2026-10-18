/* A read-through view over existing allow-listed keys: no destructive migration. */
(function(){
'use strict';
const reflex='speakingym-reflex-saved-phrases-v1',scene='speakingym-saved-coaching-v1';
const fingerprint=s=>String(s||'').normalize('NFKC').trim().toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ');
function read(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function write(key,items){localStorage.setItem(key,JSON.stringify(items));window.dispatchEvent(new CustomEvent('speakingym:changed',{detail:{key}}))}
function list(){const found=new Map();for(const [key,items] of [[reflex,read(reflex)],[scene,read(scene)]])for(const p of items){const text=key===reflex?p?.text:p?.natural;if(typeof text!=='string'||!text.trim())continue;const id=fingerprint(text);const item={id,text,source:p.source||(key===reflex?(p.kind==='teacher'?'AI先生':'60秒チャレンジ'):'AI実践英会話'),level:p.level||'unknown',category:p.category||p.sceneId||(key===reflex?'challenge':'conversation'),hint:p.goal||p.situation||p.original||'',tip:p.tip||''};if(!found.has(id))found.set(id,item)}return [...found.values()]}
function remove(id){for(const key of [reflex,scene]){const old=read(key),next=old.filter(p=>fingerprint(key===reflex?p?.text:p?.natural)!==id);if(next.length!==old.length)write(key,next)}}
function toggle(record){const id=fingerprint(record.text);if(list().some(p=>p.id===id)){remove(id);return false}const items=read(scene);if(items.length>=20)throw Error('AIの保存表現が20件に達しました。フレーズ帳で不要な表現を整理してください。既存の表現は消していません。');write(scene,[{natural:record.text,original:record.hint||'',source:record.source||'AI実践英会話',level:record.level||'unknown',category:record.sceneId||'conversation',tip:record.tip||''},...items]);return true}
function button(record){const b=document.createElement('button');b.type='button';b.className='btn';const refresh=()=>{const saved=list().some(p=>p.id===fingerprint(record.text));b.textContent=saved?'✓ 保存済み（解除）':'＋ フレーズを保存';b.setAttribute('aria-pressed',String(saved))};refresh();b.addEventListener('click',()=>{try{toggle(record);refresh()}catch(e){b.textContent=e.message}});window.addEventListener('speakingym:changed',refresh);return b}
window.speakingymPhrases={list,toggle,remove,button,fingerprint};
})();
