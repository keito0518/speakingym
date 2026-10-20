import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const scenes=readFileSync(new URL('../scenes.html',import.meta.url),'utf8');
const account=readFileSync(new URL('../account-sync.js',import.meta.url),'utf8');

test('unauthenticated AI users can sign in from their chosen scene without routing through My Page',()=>{
 assert.match(scenes,/id="loginPrompt"[^>]*[\s\S]*id="inlineGoogleLogin"/);
 assert.match(scenes,/Googleで無料ログインする/);
 assert.match(scenes,/このシーンを離れずに無料ログイン/);
 assert.match(scenes,/accountButton\.click\(\)/);
 assert.match(account,/login\.addEventListener\("click",loginNow\)/);
 assert.match(scenes,/href="\.\/account\.html"[^>]*>ログインできない場合/);
});

test('a missing auth token still blocks AI entry and no payment/session is created by the inline login button',()=>{
 const startAt=scenes.indexOf('async function start()');
 const startEnd=scenes.indexOf('function errorMessage(',startAt);
 const start=scenes.slice(startAt,startEnd);
 assert.match(start,/if\(!token\)\{\$\("loginPrompt"\)\.classList\.remove\("hidden"\)/);
 assert.ok(start.indexOf('if(!token)')<start.indexOf('serverSessionId=""'));
 const handlerAt=scenes.indexOf('$("inlineGoogleLogin").addEventListener("click"');
 const handlerEnd=scenes.indexOf('$("start").addEventListener("click"',handlerAt);
 const handler=scenes.slice(handlerAt,handlerEnd);
 assert.doesNotMatch(handler,/fetch\(|\/sessions|serverSessionId\s*=|stripe|checkout/i);
 assert.match(handler,/speakingym:account-ready/);
 assert.match(handler,/\$\("start"\)\.focus\(\)/);
});

test('selected AI scene remains a local selection when login prompt is shown',()=>{
 assert.match(scenes,/Object\.hasOwn\(SCENES,requestedScene\)\)select\(requestedScene\)/);
 const handler=scenes.slice(scenes.indexOf('$("inlineGoogleLogin").addEventListener("click"'),scenes.indexOf('$("start").addEventListener("click"'));
 assert.doesNotMatch(handler,/location\.href|location\.assign|location\.replace|select\(|location\.reload/);
 assert.match(scenes,/url\.searchParams\.set\("scene",button\.dataset\.scene\)/);
 assert.match(scenes,/window\.history\?\.replaceState\?\./);
 assert.match(scenes,/Object\.hasOwn\(SCENES,button\.dataset\.scene\)/);
});
