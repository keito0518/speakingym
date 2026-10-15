import {firebaseConfig} from "./firebase-config.js";
import {SYNC_ITEMS,OWNER_KEY,readSnapshot,removeSnapshot,applySnapshot,saveGuestSnapshot,readGuestSnapshot,mergeSnapshots,snapshotsEqual,normalizeValue} from "./account-data.mjs";

// This module makes zero Firebase requests until the owner supplies a free Spark config.
// Cloud data contains only allow-listed learning data. No secrets/audio are synchronized.
const configured=["apiKey","authDomain","projectId","appId"].every(k=>typeof firebaseConfig[k]==="string"&&firebaseConfig[k].trim());
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
let auth,db,authFns,dbFns,user=null,ready=false,busy=false,initAuth=false,importGuest=false;
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
 // Fixed maximum of 8 single-document reads on login/explicit sync, no real-time listeners.
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
function notify(){
 window.dispatchEvent(new Event("speakingym:account-ready"));
 dashboard();
}
function dashboard(){
 const root=$("sg-account-stats");if(!root)return;
 const data=readSnapshot(localStorage),stats=data["speakingym-reflex-stats-v1"]||{};
 const phrases=data["speakingym-reflex-saved-phrases-v1"]||[];
 const scene=data["speakingym-saved-coaching-v1"]||[];
 const history=data["speakingym-reflex-history-v1"]||[];
 const records=data["speakingym-v01-records"]||[];
 const cafe=data["speakingym-survival-stats-v1"]||{};
 root.replaceChildren();
 for(const [label,number]of [
  ["60秒チャレンジ",stats.sessions||0],
  ["保存フレーズ",phrases.length+scene.length],
  ["保存した練習",history.length+records.length],
  ["カフェ練習",cafe.attempts||0]
 ]){
  const box=node("div",undefined,"sg-stat");box.append(node("strong",String(number)),node("span",label));root.append(box);
 }
}
function refreshUi(){if(user)status("☁ "+(user.displayName||"Googleユーザー")+" · クラウド保存");else status(configured?"ゲスト利用中 · 記録はこの端末に保存":"ゲスト利用中 · ログイン機能は設定待ち");renderControls();notify();}
async function syncAll({reloadOnChange=true}={}){
 if(!user||busy)return;
 const uid=user.uid;
 busy=true;renderControls();status("クラウドと学習記録を同期中…");
 try{
  // The cloud is authoritative unless this device has unsynced edits.
  // For first login only, consented guest records are merged with cloud data.
  const remote=await cloudRead(uid),local=readSnapshot(localStorage),dirty=new Set(pendingKeys(uid));
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
    const request=cloudWrite(uid,item,value).then(()=>clearPending(uid,item.key));
    writes.push(request);
   }else clearPending(uid,item.key);
  }
  await Promise.all(writes);
  importGuest=false;
  const changed=!snapshotsEqual(local,desired);
  if(changed){
   removeSnapshot(localStorage);applySnapshot(localStorage,desired);
   if(reloadOnChange){window.location.reload();return;}
  }
  status("✓ 同期しました");
 }catch(e){status("同期できませんでした。端末の記録は残っています。「同期」で再試行してね。")}
 finally{busy=false;renderControls();notify()}
}
async function handleAuth(next){
 if(initAuth)return;
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
 markPending(user.uid,item.key);
 if(timers.has(item.key))clearTimeout(timers.get(item.key));
 timers.set(item.key,setTimeout(async()=>{
  timers.delete(item.key);
  if(!user)return;
  const uid=user.uid,value=readSnapshot(localStorage)[item.key];
  const toSave=value===undefined?(item.type==="numbers"?{}:[]):value;
  try{await cloudWrite(uid,item,toSave);if(snapshotsEqual(readSnapshot(localStorage)[item.key],value))clearPending(uid,item.key)}
  catch(e){status("保存は端末内で完了。クラウド同期は次回再試行するよ。")}
 },350));
}
function initDashboard(){
 if(!$("sg-account-stats"))return;
 document.head.append(node("style",[
 ".sg-account-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:16px 0}",
 ".sg-stat{padding:17px 13px;background:#f2f7ee;border-radius:13px;text-align:center}",
 ".sg-stat strong{display:block;font-size:29px;line-height:1.4}",
 ".sg-stat span{font-size:12px;color:#53715c}",
 "@media(min-width:700px){.sg-account-stats{grid-template-columns:repeat(4,1fr)}}"
 ].join("\n")));
 dashboard();
}
async function start(){
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
