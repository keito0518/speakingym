/* Speakingym Sprint: voluntary freeze-cause reflection (no AI, no transcripts).
 * Stored separately from the synced/legacy sprint history; account and guest
 * reflections are isolated. Never call this a clinical/automatic diagnosis.
 */
(()=>{
'use strict';
const PREFIX='speakingym-sprint-reasons-v1:';
const OWNER='speakingym-account-owner-v1';
const MAX_RECORDS=120;
const REASONS=Object.freeze([
 {id:'words',label:'単語が出てこなかった',advice:'難しい単語を探さず、知っている単語で短く言い換えてみよう。',link:'./freeze-breaker.html',action:'言い換えを練習'},
 {id:'structure',label:'英文の組み立てに迷った',advice:'まず主語と動詞だけで伝えてから、一言ずつ付け足してみよう。',link:'./reflex.html?mode=hold',action:'短い文から練習'},
 {id:'retrieval',label:'知っているのにすぐ出なかった',advice:'同じお題を短く言い直してから、別の場面でも試してみよう。',link:'./reflex.html?mode=mix',action:'もう一度瞬発練習'},
 {id:'perfection',label:'完璧に言おうとして止まった',advice:'最初は正確さより「短い一言を出す」を目指そう。',link:'./freeze-breaker.html',action:'写真を見て説明する'},
 {id:'surprise',label:'場面への返し方が浮かばなかった',advice:'写真から話す材料を見つけ、短く状況を説明してみよう。',link:'./freeze-breaker.html',action:'シーン実況に挑戦'},
 {id:'other',label:'その他・まだわからない',advice:'原因が分からなくても大丈夫。まず短い言い方を声に出して確認してみよう。',link:'./reflex.html?mode=repair',action:'基本の切り返しを練習'}
]);
const $=id=>document.getElementById(id);
let active=null;
function scope(){
 try{
  const account=window.speakingymAccount;
  if(account?.isLoggedIn?.()===true){
   const uid=account.getUid?.();
   if(typeof uid!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)||
      localStorage.getItem(OWNER)!==uid)return null;
   return 'user:'+uid;
  }
  if(localStorage.getItem(OWNER))return null; // account transition: fail closed
  return 'guest';
 }catch{return null}
}
function key(){const s=scope();return s?PREFIX+s:null}
function validContext(ctx){
 return ctx&&typeof ctx.date==='string'&&/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(ctx.date)&&ctx.date.length<=35&&
  Number.isSafeInteger(ctx.index)&&ctx.index>=0&&ctx.index<60&&
  typeof ctx.cardId==='string'&&/^[a-zA-Z0-9_-]{1,45}$/.test(ctx.cardId);
}
function identity(ctx){return ctx.date+'|'+ctx.index+'|'+ctx.cardId}
function read(){
 try{
  const k=key();if(!k)return [];
  const data=JSON.parse(localStorage.getItem(k)||'[]');
  if(!Array.isArray(data))return [];
  return data.slice(0,MAX_RECORDS).filter(x=>x&&typeof x==='object'&&
   typeof x.session==='string'&&x.session.length<=120&&
   REASONS.some(r=>r.id===x.reason));
 }catch{return []}
}
function lookup(ctx){return read().find(x=>x.session===identity(ctx))?.reason||null}
function getRecords(){return scope()?read().map(x=>({session:x.session,reason:x.reason})):null}
function notifyPlan(){window.speakingymSprintPersonalUI?.refresh?.()}
function save(ctx,reason){
 const k=key();
 if(!k||!validContext(ctx)||!REASONS.some(r=>r.id===reason))return false;
 const entry={session:identity(ctx),reason};
 const next=[entry,...read().filter(x=>x.session!==entry.session)].slice(0,MAX_RECORDS);
 try{
  localStorage.setItem(k,JSON.stringify(next));
  return true;
 }catch{return false}
}
function remove(ctx){
 const k=key();if(!k||!validContext(ctx))return false;
 try{localStorage.setItem(k,JSON.stringify(read().filter(x=>x.session!==identity(ctx))));return true}
 catch{return false}
}
function element(tag,txt,cls){
 const e=document.createElement(tag);
 if(typeof txt==='string')e.textContent=txt;
 if(cls)e.className=cls;
 return e;
}
function hide(){
 const panel=$('diagnosisPanel');
 if(panel)panel.hidden=true;
 const summary=$('diagnosisSummary');
 if(summary)summary.hidden=true;
}
function renderSummary(){
 const box=$('diagnosisSummary'),text=$('diagnosisSummaryText');
 if(!box||!text)return;
 if(!scope()){box.hidden=true;return}
 const items=read();
 if(!items.length){box.hidden=true;return}
 const counts=new Map();
 for(const item of items)counts.set(item.reason,(counts.get(item.reason)||0)+1);
 const top=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
 const reason=REASONS.find(x=>x.id===top[0]);
 text.textContent='自己申告で多い傾向：'+reason.label+'（直近の記録 '+top[1]+'件）。これだけで能力を自動判定したものではありません。';
 box.hidden=false;
}
function render(ctx){
 active=validContext(ctx)?{date:ctx.date,index:ctx.index,cardId:ctx.cardId,outcome:ctx.outcome}:null;
 const panel=$('diagnosisPanel'),buttons=$('diagnosisChoices'),result=$('diagnosisResult');
 if(!panel||!buttons||!result)return;
 renderSummary();
 if(!active||active.outcome!=='stuck'||!scope()){
  panel.hidden=true;return;
 }
 panel.hidden=false;
 buttons.replaceChildren();
 const selected=lookup(active);
 for(const reason of REASONS){
  const btn=element('button',reason.label,'btn diagnosis-choice');
  btn.type='button';
  btn.dataset.reason=reason.id;
  btn.setAttribute('aria-pressed',String(selected===reason.id));
  btn.addEventListener('click',()=>{
   if(save(active,reason.id)){render(active);notifyPlan()}
   else result.textContent='記録を保存できませんでした。ブラウザの保存設定を確認してください。';
  });
  buttons.append(btn);
 }
 result.replaceChildren();
 const item=REASONS.find(r=>r.id===selected);
 if(item){
  const title=element('strong','次の練習のヒント');
  const tip=element('p',item.advice);
  const link=element('a',item.action+' →','btn primary');
  link.href=item.link;
  const clear=element('button','理由を選び直す／記録を外す','btn');
  clear.type='button';
  clear.addEventListener('click',()=>{if(remove(active)){render(active);notifyPlan()}});
  result.append(title,tip,link,clear);
 }else{
  result.append(element('p','理由は自己申告で記録します。AI採点ではなく、回答の英文や音声も追加保存しません。'));
 }
}
function clearHistory(){
 const k=key();
 if(!k)return false;
 try{localStorage.removeItem(k);hide();notifyPlan();return true}catch{return false}
}
window.speakingymSprintDiagnosis=Object.freeze({render,clearHistory,getRecords});
window.addEventListener('speakingym:account-changing',()=>{active=null;hide()});
window.addEventListener('speakingym:account-ready',()=>{if(active)render(active);else renderSummary()});
})();
