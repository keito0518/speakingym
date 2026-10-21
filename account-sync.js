import {firebaseConfig} from "./firebase-config.js";
import {buildLearningDashboard,japaneseDate} from "./dashboard-data.mjs";
import {SYNC_ITEMS,OWNER_KEY,readSnapshot,removeSnapshot,applySnapshot,saveGuestSnapshot,readGuestSnapshot,mergeSnapshots,snapshotsEqual,normalizeValue} from "./account-data.mjs";

// This module makes zero Firebase requests until the owner supplies a free Spark config.
// Cloud data contains only allow-listed learning data. No secrets/audio are synchronized.
const configured=["apiKey","authDomain","projectId","appId"].every(k=>typeof firebaseConfig[k]==="string"&&firebaseConfig[k].trim());
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
let auth,db,authFns,dbFns,user=null,ready=false,busy=false,initAuth=false,importGuest=false;
// A previous account's Firestore read/write may finish after account switching.
// Never let that asynchronous completion replace another user's local learning data.
let accountEpoch=0,syncInFlight=false,syncQueued=false;
const PENDING_PREFIX="speakingym-account-dirty:";
const timers=new Map();
const css=[
".sg-accountbar{background:#eaf3eb;border-bottom:1px solid #d2e3d2;color:#1c4832;font:600 12px/1.6 -apple-system,BlinkMacSystemFont,'Hiragino Sans',Meiryo,sans-serif}",
".sg-accountbar *{box-sizing:border-box}",
".sg-accountbar-inner{max-width:1200px;min-height:47px;margin:auto;padding:8px 18px;display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}",
".sg-account-status{font-size:12px;font-weight:750;margin-right:auto}",
".sg-accountbar button,.sg-accountbar a{border:1px solid #bbd1be;background:#fff;color:#234e36;padding:5px 12px;font:800 12px/1.5 inherit;border-radius:8px;min-height:35px;cursor:pointer;text-decoration:none}",
".sg-accountbar button.primary{background:#205940;border-color:#205940;color:white}",
".sg-accountbar button:disabled{opacity:.5;cursor:not-allowed}",
".sg-accountbar button:focus-visible,.sg-accountbar a:focus-visible{outline:3px solid #ff9b7d;outline-offset:2px}",
"@media(max-width:540px){.sg-accountbar-inner{gap:6px;padding:6px 12px}.sg-account-status{flex-basis:100%;font-size:11px}.sg-accountbar button,.sg-accountbar a{font-size:11px;padding:5px 8px;min-height:33px}}"
].join("\n");
function status(message){$("sg-account-status").textContent=message;const el=$("sg-account-details");if(el)el.textContent=message}
function renderControls(){
 if(!$("sg-login"))return;
 $("sg-login").hidden=!!user;$("sg-logout").hidden=!user;$("sg-sync").hidden=!user;
 $("sg-login").disabled=!configured||!ready||busy;
 $("sg-login").textContent=configured?"Googleでログイン":"ログイン準備中";
 $("sg-logout").disabled=busy;$("sg-sync").disabled=busy;
}
function mount(){
 document.head.append(node("style",css));
 const shell=node("div",undefined,"sg-accountbar"),row=node("div",undefined,"sg-accountbar-inner");
 shell.setAttribute("role","region");shell.setAttribute("aria-label","Speakingymアカウント");
 const label=node("span","ゲスト利用中 · 記録はこの端末に保存","sg-account-status");label.id="sg-account-status";
 const link=node("a","マイページ");link.href="./account.html";
 const login=node("button","Googleでログイン","primary");login.id="sg-login";login.type="button";
 const sync=node("button","同期");sync.id="sg-sync";sync.type="button";sync.hidden=true;
 const logout=node("button","ログアウト");logout.id="sg-logout";logout.type="button";logout.hidden=true;
 row.append(label,link,login,sync,logout);shell.append(row);document.body.prepend(shell);
 login.addEventListener("click",loginNow);logout.addEventListener("click",logoutNow);
 sync.addEventListener("click",()=>syncAll());
 renderControls();
}
function describeError(error){
 const code=String(error?.code||error?.message||"");
 if(code.includes("popup-blocked"))return "ログイン用の画面がブロックされました。ブラウザの設定を確認してね。";
 if(code.includes("unauthorized-domain"))return "Firebase Authenticationの承認済みドメインに speakingym.pages.dev を追加してね。";
 if(code.includes("operation-not-allowed"))return "Firebase AuthenticationでGoogleログインを有効にしてね。";
 if(code.includes("permission-denied"))return "Firestoreのセキュリティルールを確認してね。";
 if(code.includes("popup-closed")||code.includes("cancelled-popup"))return "ログインをキャンセルしました。";
 return "接続エラー。Firebase設定と通信状況を確認してね。";
}
async function loginNow(){
 if(!auth||busy)return;
 try{
  busy=true;renderControls();status("Googleログインを開きます…");
  await authFns.signInWithPopup(auth,new authFns.GoogleAuthProvider());
 }catch(e){busy=false;renderControls();status(describeError(e))}
}
async function logoutNow(){
 if(!auth||busy)return;
 try{
  if(pendingKeys(user?.uid).length){await syncAll({reloadOnChange:false});if(pendingKeys(user?.uid).length){status("未同期の記録があります。通信が回復してからログアウトしてね。");return}}
  busy=true;renderControls();await authFns.signOut(auth)
 }
 catch(e){busy=false;renderControls();status(describeError(e))}
}
function pendingKeys(uid){
 try{const v=JSON.parse(localStorage.getItem(PENDING_PREFIX+uid)||"[]");return Array.isArray(v)?v.filter(x=>SYNC_ITEMS.some(i=>i.key===x)):[]}catch{return []}
}
function markPending(uid,key){
 const pending=new Set(pendingKeys(uid));pending.add(key);
 try{localStorage.setItem(PENDING_PREFIX+uid,JSON.stringify([...pending]))}catch(e){}
}
function clearPending(uid,key){
 const pending=new Set(pendingKeys(uid));pending.delete(key);
 try{localStorage.setItem(PENDING_PREFIX+uid,JSON.stringify([...pending]))}catch(e){}
}
const locationFor=(uid,item)=>dbFns.doc(db,"users",uid,"state",item.doc);
function parsePayload(doc,item){
 if(!doc.exists())return null;
 try{return normalizeValue(item,JSON.parse(doc.data().payload))}catch{return null}
}
async function cloudRead(uid){
 const result={};
 // Fixed maximum of 9 single-document reads on login/explicit sync, no real-time listeners.
 const all=await Promise.all(SYNC_ITEMS.map(async item=>{
  const record=await dbFns.getDoc(locationFor(uid,item));
  return [item,parsePayload(record,item)];
 }));
 for(const [item,value]of all)if(value!==null)result[item.key]=value;
 return result;
}
async function cloudWrite(uid,item,value){
 const safe=normalizeValue(item,value);
 if(safe===null)return;
 await dbFns.setDoc(locationFor(uid,item),{version:1,payload:JSON.stringify(safe),updatedAt:dbFns.serverTimestamp()});
}
let quotaLookup=null;
async function updateQuotaUi(){
 const el=$("sg-plan-info");if(!el)return;
 if(!user){el.textContent="GoogleログインするとAIの利用枠が表示されるよ。";return}
 if(quotaLookup)return;
 quotaLookup=true;
 try{
  const api="https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/";
  const health=await fetch(api+"health").then(r=>r.ok?r.json():null).catch(()=>null);
  if(!health?.plansEnabled){el.textContent="無料ベータ期間中。AIは混雑防止の利用制限で提供しています。";return}
  const idToken=await authFns.getIdToken(user);
  const response=await fetch(api+"entitlement",{headers:{"Authorization":"Bearer "+idToken}});
  if(!response.ok)throw Error("quota");
  const data=await response.json();
  if(data.plan==="pro"){
   const remainingTurns=Math.max(0,(data?.limits?.monthlyTurns||0)-(data?.used?.monthlyTurns||0));
   const remainingTeacher=Math.max(0,(data?.limits?.monthlyTeacher||0)-(data?.used?.monthlyTeacher||0));
   if(!Number.isInteger(data?.limits?.monthlyTurns)||!Number.isInteger(data?.limits?.monthlyTeacher))throw Error("quota");
   el.textContent="Pro · 今月の残り：AI英会話 "+remainingTurns+" ターン／AI先生 "+remainingTeacher+" 回（日本時間の毎月1日に更新）";
  }else{
   const n=Math.max(0,(data?.limits?.sessions||0)-(data?.used?.sessions||0));
   const t=Math.max(0,(data?.limits?.teacher||0)-(data?.used?.teacher||0));
   el.textContent="Free · 本日の残り：AI英会話 "+n+" セッション／AI先生 "+t+" 回（日本時間の午前0時に更新）";
  }
 }catch{el.textContent="利用回数を読み込めませんでした。少し待って再読み込みしてね。"}
 finally{quotaLookup=false}
}
function notify(){
 window.dispatchEvent(new Event("speakingym:account-ready"));
 dashboard();
 if($("sg-plan-info"))void updateQuotaUi();
}
function emptySection(parent,title,description,linkText,href){
 const box=node("div",undefined,"empty-state");
 const strong=node("strong",title),p=node("p",description),a=node("a",linkText);
 a.href=href;box.append(strong,p,a);parent.append(box);
}
function dashboard(){
 const root=$("sg-account-stats");if(!root)return;
 const view=buildLearningDashboard(readSnapshot(localStorage));
 if($("greeting-name")){
  const displayName=typeof user?.displayName==="string"?user.displayName.trim().slice(0,28):"";
  $("greeting-name").textContent=displayName?displayName+" さん、おかえりなさい。":"おかえりなさい。";
 }
 if($("sg-weekly-active"))$("sg-weekly-active").textContent=String(view.weekly.activeDays);
 if($("sg-weekly-caption"))$("sg-weekly-caption").textContent="保存履歴で確認できる60秒練習："+view.weekly.recordedSessions+"回";
 const daysRoot=$("sg-weekly-days");
 if(daysRoot){
  daysRoot.replaceChildren();
  for(const day of view.weekly.days){
   const item=node("div",undefined,"weekday"+(day.completed?" done":"")+(day.today?" today":""));
   item.setAttribute("role","listitem");
   item.setAttribute("aria-label",day.key+"："+day.completed+"回");
   const mark=node("span",day.completed?"✓":"·","weekday-dot");
   const label=node("span",day.label);
   item.append(mark,label);daysRoot.append(item);
  }
 }
 root.replaceChildren();
 const stats=[
  ["⚡",view.totals.sprint,"60秒チャレンジ","REFLEX WORKOUT"],
  ["↗",view.totals.phrases,"保存フレーズ","YOUR PHRASEBOOK"],
  ["◉",view.totals.ai,"AI実戦英会話","ROLEPLAY SESSIONS"]
 ];
 for(const [icon,count,label,english] of stats){
  const card=node("div",undefined,"sg-stat");
  card.append(node("div",icon,"stat-icon"),node("strong",String(count)),node("div",label,"stat-label"),node("div",english,"stat-en"));
  root.append(card);
 }
 if($("sg-next-title"))$("sg-next-title").textContent=view.nextAction.title;
 if($("sg-next-description"))$("sg-next-description").textContent=view.nextAction.subtitle;
 for(const id of ["sg-next-action","sg-hero-action"]){
  const link=$(id);if(!link)continue;
  link.href=view.nextAction.href;
  link.textContent=view.nextAction.label+" ↗";
 }
 const phraseRoot=$("sg-saved-list");
 if(phraseRoot){
  phraseRoot.replaceChildren();
  if(view.phrases.length===0)emptySection(phraseRoot,"まだ保存フレーズがないよ。","60秒チャレンジの回答例、AI英会話の表現や講評を保存して、まとめて復習しよう。","60秒チャレンジへ ↗","./reflex.html");
  for(const p of view.phrases){
   const row=node("article",undefined,"saved-item");
   row.append(node("div",p.source,"saved-source"),node("div",p.english,"saved-text"));
   if(p.subtitle)row.append(node("p",p.subtitle,"saved-sub"));
   phraseRoot.append(row);
  }
 }
 const feedbackRoot=$("sg-feedback-list");
 if(feedbackRoot){
  feedbackRoot.replaceChildren();
  if(view.recentTeacher.length===0)emptySection(feedbackRoot,"まだAI先生の講評はありません。","60秒チャレンジで英文を残し、終了後に「AI先生」を押すと個別アドバイスをもらえるよ。","60秒チャレンジを始める ↗","./reflex.html");
  for(const feedback of view.recentTeacher){
   const card=node("article",undefined,"feedback-item");
   card.append(node("div",feedback.date?japaneseDate(feedback.date)+" · AI TEACHER":"AI TEACHER","feedback-date"));
   if(feedback.praise)card.append(node("div","✓ GOOD POINT","feedback-label"),node("p",feedback.praise));
   if(feedback.improvement)card.append(node("div","↗ NEXT STEP","feedback-label improve"),node("p",feedback.improvement));
   if(feedback.rewrite)card.append(node("div","“"+feedback.rewrite+"”","feedback-rewrite"));
   feedbackRoot.append(card);
  }
 }
 const historyRoot=$("sg-session-list");
 if(historyRoot){
  historyRoot.replaceChildren();
  if(view.recentSessions.length===0)emptySection(historyRoot,"最初の記録を作ろう。","60秒チャレンジを終えると、ここに最近の練習が表示されるよ。","練習してみる ↗","./reflex.html");
  for(const workout of view.recentSessions){
   const card=node("article",undefined,"session-item"),left=node("div");
   const name={easy:"基礎",standard:"標準",challenge:"応用"}[workout.level];
   left.append(node("div",japaneseDate(workout.date)+" · "+name,"session-date"),node("div",workout.total+"問チャレンジ","session-meta"));
   card.append(left,node("span","言えた "+workout.spoke+"問","session-pill"));historyRoot.append(card);
  }
 }
 if($("sg-session-total"))$("sg-session-total").textContent="保存した練習："+view.totals.savedSessions+"件。講評の詳細は60秒チャレンジの履歴から確認できます。";
}
function refreshUi(){if(user)status("☁ "+(user.displayName||"Googleユーザー")+" · クラウド保存");else status(configured?"ゲスト利用中 · 記録はこの端末に保存":"ゲスト利用中 · ログイン機能は設定待ち");renderControls();notify();}
async function syncAll({reloadOnChange=true}={}){
 if(!user)return;
 if(syncInFlight||busy){syncQueued=true;return}
 const uid=user.uid,epoch=accountEpoch;
 const stillOwner=()=>accountEpoch===epoch&&user?.uid===uid&&localStorage.getItem(OWNER_KEY)===uid;
 syncInFlight=true;busy=true;renderControls();status("クラウドと学習記録を同期中…");
 try{
  // A network read is an asynchronous boundary: signing in to a different
  // account during it must NOT merge the earlier account into the current one.
  const remote=await cloudRead(uid);
  if(!stillOwner())return;
  const local=readSnapshot(localStorage),dirty=new Set(pendingKeys(uid));
  const desired={};
  for(const item of SYNC_ITEMS){
   const a=local[item.key],b=remote[item.key];
   if(importGuest&&a!==undefined){
    const joined=mergeSnapshots({[item.key]:a},{[item.key]:b});
    if(joined[item.key]!==undefined)desired[item.key]=joined[item.key];
   }else if(dirty.has(item.key)){
    if(a!==undefined)desired[item.key]=a;
    else desired[item.key]=item.type==="numbers"?{}:[];
   }else if(b!==undefined)desired[item.key]=b;
   else if(a!==undefined)desired[item.key]=a;
  }
  const writes=[];
  for(const item of SYNC_ITEMS){
   const value=desired[item.key];
   if(value===undefined)continue;
   if(!snapshotsEqual(value,remote[item.key])){
    const request=cloudWrite(uid,item,value).then(()=>{
     // A later edit or login must not lose its pending-sync flag.
     if(stillOwner()&&snapshotsEqual(readSnapshot(localStorage)[item.key],value))
      clearPending(uid,item.key);
    });
    writes.push(request);
   }else if(stillOwner()&&snapshotsEqual(readSnapshot(localStorage)[item.key],value)){
    clearPending(uid,item.key);
   }
  }
  await Promise.all(writes);
  if(!stillOwner())return;
  importGuest=false;
  const changed=!snapshotsEqual(local,desired);
  if(changed){
   removeSnapshot(localStorage);applySnapshot(localStorage,desired);
   if(reloadOnChange){window.location.reload();return}
  }
  status("✓ 同期しました");
 }catch(e){
  if(stillOwner())status("同期できませんでした。端末の記録は残っています。「同期」で再試行してね。");
 }finally{
  syncInFlight=false;busy=false;renderControls();notify();
  // If a new account attempted to sync while the old request was running,
  // finish that newer account's initial sync after the old request settles.
  const nextQueued=syncQueued;
  syncQueued=false;
  if((nextQueued||accountEpoch!==epoch)&&user&&
     localStorage.getItem(OWNER_KEY)===user.uid)
   void syncAll();
 }
}
async function handleAuth(next){
 if(initAuth)return;
 accountEpoch++;
 initAuth=true;busy=true;user=next;renderControls();
 const oldUid=localStorage.getItem(OWNER_KEY);
 try{
  if(!next){
   if(oldUid){
    removeSnapshot(localStorage);
    applySnapshot(localStorage,readGuestSnapshot(localStorage));
    localStorage.removeItem(OWNER_KEY);
    window.location.reload();return;
   }
   return;
  }
  const uid=next.uid;
  if(oldUid!==uid){
   let guest={};
   if(!oldUid)guest=saveGuestSnapshot(localStorage);
   // Never import the previous account's data into another account.
   removeSnapshot(localStorage);
   if(!oldUid&&Object.keys(guest).length&&window.confirm("この端末のゲスト記録をGoogleアカウントへ引き継ぎますか？")){
    applySnapshot(localStorage,guest);importGuest=true;
    for(const item of SYNC_ITEMS)if(guest[item.key]!==undefined)markPending(uid,item.key);
   }
   localStorage.setItem(OWNER_KEY,uid);
  }
 }catch(e){status(describeError(e))}
 finally{busy=false;initAuth=false;ready=true;renderControls()}
 if(next)await syncAll();
 else refreshUi();
}
function onChanged(event){
 const item=SYNC_ITEMS.find(i=>i.key===event?.detail?.key);
 if(!item||!user||!ready)return;
 // Bind the delayed write to the account that actually made the edit.
 // Auth state can change during the 350 ms debounce (or during a Firestore
 // request). Never read another account's local data or clear its dirty flag.
 const uid=user.uid;
 if(localStorage.getItem(OWNER_KEY)!==uid)return;
 markPending(uid,item.key);
 if(timers.has(item.key))clearTimeout(timers.get(item.key));
 timers.set(item.key,setTimeout(async()=>{
  timers.delete(item.key);
  if(user?.uid!==uid||localStorage.getItem(OWNER_KEY)!==uid)return;
  const value=readSnapshot(localStorage)[item.key];
  const toSave=value===undefined?(item.type==="numbers"?{}:[]):value;
  try{
   await cloudWrite(uid,item,toSave);
   if(user?.uid===uid&&localStorage.getItem(OWNER_KEY)===uid&&
      snapshotsEqual(readSnapshot(localStorage)[item.key],value))clearPending(uid,item.key);
  }catch(e){
   if(user?.uid===uid)status("保存は端末内で完了。クラウド同期は次回再試行するよ。");
  }
 },350));
}
function initDashboard(){dashboard();}
async function start(){
 // Expose a narrow, non-privileged token getter for authenticated AI requests.
 // The Worker validates the token signature and decides the plan; clients cannot set Pro.
 window.speakingymAccount={
  getIdToken:async()=>user&&auth&&authFns?authFns.getIdToken(user):null,
  isLoggedIn:()=>!!user
 };
 // Never advertise an unavailable Google-login button to ordinary visitors.
 if(!configured && !$("sg-account-stats"))return;
 mount();initDashboard();window.addEventListener("speakingym:changed",onChanged);
 if(!configured){ready=false;refreshUi();return}
 status("Googleログインの準備中…");
 try{
  const root="https://www.gstatic.com/firebasejs/11.10.0/";
  const [appLib,authLib,dbLib]=await Promise.all([
   import(root+"firebase-app.js"),import(root+"firebase-auth.js"),import(root+"firebase-firestore.js")
  ]);
  const app=appLib.initializeApp(firebaseConfig);
  authFns=authLib;dbFns=dbLib;auth=authLib.getAuth(app);db=dbLib.getFirestore(app);
  ready=true;renderControls();
  authLib.onAuthStateChanged(auth,next=>handleAuth(next),err=>status(describeError(err)));
 }catch(e){ready=false;renderControls();status(describeError(e))}
}
start();
