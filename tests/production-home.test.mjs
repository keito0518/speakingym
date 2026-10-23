import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const file=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const current=file("index.html"),classic=file("classic.html"),preview=file("home-preview.html");
const nav=["account.html","reflex.html","scenes.html","freeze-breaker.html","phrasebook.html"];
const mainScript=html=>html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||"";

test("modern production home has brand, SEO, useful routes, no paid checkout and honest beta copy",()=>{
 assert.match(current,/<title>Speakingym — 知ってる英語を、話せる英語に。<\/title>/);
 assert.match(current,/<link rel="canonical" href="https:\/\/speakingym.pages.dev\/">/);
 assert.match(current,/練習メニュー/);
 for(const path of nav)assert.match(current,new RegExp('href="\\./'+path.replaceAll(".","\\.")+'"'),"missing "+path);
 assert.match(current,/60秒チャレンジはログイン不要・回数制限なし/);
 assert.match(current,/AI英会話はGoogleログインが必要で、無料枠は1日5セッションまで/);
 assert.match(current,/Proの一般向け有料登録はまだ開始していません/);
 assert.doesNotMatch(current,/NEW HOME · PREVIEW/);
 assert.doesNotMatch(current,/data-action="switch-plan"/);
 assert.doesNotMatch(current,/<a [^>]+href="\.\/home-preview\.html"/);
 assert.doesNotMatch(current,/content:'✳'/);
 assert.match(current,/@media\(max-width:520px\)/);
 assert.match(current,/<script type="module" src="\.\/account-sync\.js"><\/script>/);
});
test("trial CTA is the free 60-second sprint and the real AI experience is discoverable",()=>{
 assert.match(current,/<a class="btn primary" href="\.\/reflex\.html"[^>]*>無料で60秒チャレンジ/);
 assert.match(current,/<a class="btn" href="\.\/scenes\.html"[^>]*>AIと実戦英会話/);
 assert.match(current,/href="\.\/phrasebook\.html"/);
 assert.doesNotMatch(current,/href="\.\/index\.html">旧トップ/);
});
test("classic practice remains available and its saved data keys stay in place",()=>{
 assert.match(classic,/<title>従来のトレーニング（クラシック版） \| Speakingym<\/title>/);
 assert.match(classic,/class="practice"/);
 assert.match(classic,/speakingym:changed/);
 assert.match(classic,/saveStore\(\x27records\x27/);
 assert.match(classic,/href="\.\/index\.html"/);
 assert.match(classic,/<meta name="robots" content="noindex,follow">/);
});
test("preview still works while the live index becomes the official location",()=>{
 assert.match(preview,/NEW HOME · PREVIEW/);
 assert.match(preview,/<meta name="robots" content="noindex,follow">/);
 for(const html of [current,preview])assert.doesNotThrow(()=>new vm.Script(mainScript(html)));
});
test("account and sprint navigations now lead to the official homepage",()=>{
 const account=file("account.html"),reflex=file("reflex.html");
 assert.doesNotMatch(account,/href="\.\/home-preview\.html"/);
 assert.doesNotMatch(reflex,/href="\.\/home-preview\.html"/);
 assert.match(account,/href="\.\/index\.html"/);
 assert.doesNotMatch(reflex,/href="\.\/classic\.html">従来の練習ツールを見る/);
 assert.doesNotMatch(current,/href="\.\/classic\.html"/);
});
