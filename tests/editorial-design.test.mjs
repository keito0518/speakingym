import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const pages=['index.html','freeze-breaker.html','reflex.html','transfer.html','account.html','scenes.html'];

test('major headings wrap according to viewport, not author-inserted line breaks',()=>{
 for(const path of pages){
  const h1=read(path).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
  assert.ok(h1,'page needs a visible H1: '+path);
  assert.doesNotMatch(h1,/<br\s*\/?\s*>/i,'fixed H1 line break on '+path);
  assert.match(read(path),/line-break:strict/,'Japanese punctuation should wrap naturally on '+path);
 }
});

test('first screen uses a real speaking prompt with one obvious entry, not a fake chat illustration',()=>{
 const home=read('index.html');
 assert.match(home,/<blockquote lang="en">Sorry, we're out of oat milk/);
 assert.match(home,/<h1>知ってる英語を、<em>話せる英語に。<\/em><\/h1>/);
 assert.match(home,/まず1問、声に出してみる/);
 assert.doesNotMatch(home,/<div class="orb"|<div class="floating"|<div class="mock"/);
 assert.match(home,/練習はシンプルな3ステップ/);
 assert.match(home,/<span class="tag">04<\/span>/,'the narrow number column must not wrap a multiword login label');
 assert.match(home,/ログイン後に利用できます。カフェや仕事など16場面/);
});

test('optional choices stay available without crowding first-time exercise starts',()=>{
 const sprint=read('reflex.html'),scenes=read('scenes.html'),freeze=read('freeze-breaker.html');
 assert.match(sprint,/<details class="settings-details" id="practiceSettings">/);
 assert.match(sprint,/id="level"/);
 assert.match(sprint,/id="mode"/);
 assert.match(scenes,/id="showAllScenes" aria-expanded="false"/);
 assert.match(scenes,/\.scene\[hidden\]\{display:none!important\}/,'author CSS must not defeat the hidden attribute');
 assert.equal([...scenes.matchAll(/<button type="button" class="scene" data-scene=/g)].length,16);
 assert.match(freeze,/id="reason-panel" hidden/);
 assert.match(freeze,/id="start-button"/);
});

test('quiet hero text stays legible and short labels explain the next action',()=>{
 const freeze=read('freeze-breaker.html');
 assert.match(freeze,/\.hero\{[^}]*background:transparent;color:#253b2f/,'hero must not inherit white text from its former dark background');
 assert.match(freeze,/<h1 id="page-title">英語で詰まったら？<\/h1>/);
 assert.match(read('reflex.html'),/<h1>60秒で、英語を声に出そう。<\/h1>/);
 assert.match(read('account.html'),/<h1 id="heroTitle">練習記録と、次の一歩。<\/h1>/);
 assert.match(read('scenes.html'),/<h1>どんな場面で話してみる？<\/h1>/);
 assert.match(read('index.html'),/max-width:13em;text-wrap:balance/);
});
