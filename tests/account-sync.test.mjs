import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 SYNC_ITEMS,OWNER_KEY,GUEST_KEY,mergeValue,normalizeValue,
 readSnapshot,removeSnapshot,applySnapshot,saveGuestSnapshot,readGuestSnapshot,
 mergeSnapshots
} from "../account-data.mjs";

const repoRoot=new URL("../",import.meta.url);
const text=path=>readFileSync(new URL(path,repoRoot),"utf8");
function storage(seed={}){
 const map=new Map(Object.entries(seed));
 return {
  getItem:k=>map.has(k)?map.get(k):null,
  setItem:(k,v)=>map.set(k,String(v)),
  removeItem:k=>map.delete(k),
  entries:()=>[...map.entries()]
 };
}
test("cloud data allowlist has 9 distinct fixed keys and excludes credentials",()=>{
 assert.equal(SYNC_ITEMS.length,9);
 assert.equal(new Set(SYNC_ITEMS.map(x=>x.doc)).size,9);
 assert.equal(new Set(SYNC_ITEMS.map(x=>x.key)).size,9);
 for(const x of SYNC_ITEMS){
  assert.match(x.key,/^speakingym-/);
  assert.doesNotMatch(x.key,/endpoint|api-url|gemini|token|voice-choice/);
 }
});
test("guest data can be snapshotted and restored without touching unrelated settings",()=>{
 const browser=storage({
  "speakingym-reflex-history-v1":JSON.stringify([{date:"2026-10-15T12:00:00Z",level:"standard",attempts:[]}]),
  "speakingym-reflex-saved-phrases-v1":JSON.stringify([{id:"repair1:standard:natural",cardId:"repair1",kind:"natural",level:"standard",text:"Could you repeat that?"}]),
  "speakingym-survival-endpoint":"https://a-secret-user-endpoint.example",
  "speakingym-voice-choice":"en-AU"
 });
 const guest=saveGuestSnapshot(browser);
 assert.equal(guest["speakingym-reflex-history-v1"].length,1);
 assert.equal(guest["speakingym-reflex-saved-phrases-v1"].length,1);
 assert.equal(guest["speakingym-survival-endpoint"],undefined);
 removeSnapshot(browser);
 assert.equal(browser.getItem("speakingym-reflex-history-v1"),null);
 assert.ok(browser.getItem("speakingym-survival-endpoint"));
 applySnapshot(browser,readGuestSnapshot(browser));
 assert.equal(JSON.parse(browser.getItem("speakingym-reflex-history-v1")).length,1);
});
test("cloud merge preserves both bookmarks and session history when importing guest records",()=>{
 const guest={
  "speakingym-reflex-history-v1":[{date:"2026-10-14T12:00:00Z",level:"standard",attempts:[]}],
  "speakingym-reflex-saved-phrases-v1":[{id:"repair1:standard:quick",text:"Again, please?"}]
 };
 const account={
  "speakingym-reflex-history-v1":[{date:"2026-10-15T12:00:00Z",level:"challenge",attempts:[]}],
  "speakingym-reflex-saved-phrases-v1":[{id:"hold1:easy:quick",text:"Let me think."}]
 };
 const merged=mergeSnapshots(guest,account);
 assert.equal(merged["speakingym-reflex-history-v1"].length,2);
 assert.equal(merged["speakingym-reflex-saved-phrases-v1"].length,2);
 assert.equal(merged["speakingym-reflex-history-v1"][0].date,"2026-10-15T12:00:00Z");
});
test("written snapshots do not include unauthorized or oversized fields",()=>{
 const browser=storage({
  "speakingym-saved-coaching-v1":JSON.stringify([{original:"hello",natural:"Hello!"}]),
  "speakingym-reflex-history-v1":JSON.stringify(Array.from({length:20},(_,i)=>({date:"2026-"+String(i).padStart(2,"0"),utterance:"x".repeat(50000)}))),
  "random-secret":"private"
 });
 const data=readSnapshot(browser);
 assert.equal(data["speakingym-reflex-history-v1"],undefined);
 assert.equal(data["speakingym-saved-coaching-v1"].length,1);
 assert.equal(data["random-secret"],undefined);
});
test("counter merging favors max recorded totals and never double-counts repeated login",()=>{
 const both=mergeValue("numbers",{sessions:12,spoken:30},{sessions:9,spoken:33});
 assert.deepEqual(both,{sessions:12,spoken:33});
});
test("every public page exposes the account bar and retains guest-mode training",()=>{
 for(const path of ["index.html","home-preview.html","live.html","scenes.html","reflex.html","mission.html","account.html"]){
  const html=text(path);
  assert.match(html,/<script type="module" src="\.\/account-sync\.js"><\/script>/,path);
 }
 const code=text("account-sync.js");
 assert.match(code,/if\(!configured\)\{ready=false;refreshUi\(\);return\}/);
 assert.match(code,/firebaseConfig/);
 assert.match(code,/authLib\.onAuthStateChanged/);
 assert.match(code,/authFns\.signInWithPopup/);
 assert.match(code,/cloudRead\(uid\)/);
 assert.match(code,/pendingKeys\(uid\)/);
 assert.match(code,/window\.confirm\("この端末のゲスト記録/);
 assert.match(code,/removeSnapshot\(localStorage\)/);
});
test("Firestore rules deny public access and permit only uid-owner allowlisted documents",()=>{
 const rules=text("firestore.rules");
 assert.match(rules,/request\.auth\.uid == uid/);
 assert.match(rules,/allow get: if isOwner\(uid\)/);
 assert.match(rules,/allow list: if false/);
 assert.match(rules,/allow create, update: if isOwner\(uid\)/);
 assert.match(rules,/payload\.size\(\) < 900000/);
 assert.match(rules,/allow read, write: if false/);
 assert.doesNotMatch(rules,/allow read, write: if true/);
});
test("page changes notify the shared account sync only after local writes",()=>{
 for(const path of ["index.html","reflex.html","scenes.html","mission.html"]){
  assert.match(text(path),/speakingym:changed/,path);
 }
 assert.match(text("firebase-config.js"),/apiKey: ""/);
 assert.match(text("FIREBASE_SETUP.md"),/Spark/);
});
