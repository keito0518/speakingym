import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const pages=['index.html','freeze-breaker.html','reflex.html','transfer.html','account.html','scenes.html','phrasebook.html'];

test('major headings wrap according to viewport, not author-inserted line breaks',()=>{
 for(const path of pages){
  const h1=read(path).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
  assert.ok(h1,'page needs a visible H1: '+path);
  assert.doesNotMatch(h1,/<br\s*\/?\s*>/i,'fixed H1 line break on '+path);
  assert.match(read(path),/line-break:strict/,'Japanese punctuation should wrap naturally on '+path);
 }
});

test('first screen presents both distinct free speaking practices',()=>{
 const home=read('index.html');
 assert.match(home,/<h1>知ってる英語を、<em>話せる英語に。<\/em><\/h1>/);
 assert.match(home,/まず60秒、話してみる/);
 assert.match(home,/シーン実況チャレンジ/);
 assert.match(home,/写真から情報を見つけて英語へ/);
 assert.doesNotMatch(home,/<div class="orb"|<div class="floating"|<div class="mock"/);
 assert.match(home,/英語を取り出す。会話を止めない。/);
 assert.match(home,/<span class="tag">04<\/span>/,'the narrow number column must not wrap a multiword login label');
 assert.match(home,/30秒間、自分の英語で状況を説明/);
});

test('optional choices stay available without crowding first-time exercise starts',()=>{
 const sprint=read('reflex.html'),scenes=read('scenes.html'),freeze=read('freeze-breaker.html');
 assert.match(sprint,/<details class="settings-details" id="practiceSettings">/);
 assert.match(sprint,/<details class="settings-details" id="personalWorkoutDetails">/);
 assert.ok(sprint.indexOf('id="start"')<sprint.indexOf('id="practiceSettings"'),'the 60-second start must precede advanced settings');
 assert.match(sprint,/id="level"/);
 assert.match(sprint,/id="mode"/);
 assert.match(scenes,/id="showAllScenes" aria-expanded="false"/);
 assert.match(scenes,/\.scene\[hidden\]\{display:none!important\}/,'author CSS must not defeat the hidden attribute');
 assert.equal([...scenes.matchAll(/<button type="button" class="scene" data-scene=/g)].length,16);
 assert.match(freeze,/id="learn-panel"[^>]*hidden/);
 assert.match(freeze,/id="start-challenge"/);
});

test('quiet hero text stays legible and short labels explain the next action',()=>{
 const freeze=read('freeze-breaker.html');
 assert.match(freeze,/<h1 id="page-title">シーン実況チャレンジ<\/h1>/);
 assert.match(freeze,/line-break:\s*strict/);
 assert.doesNotMatch(freeze,/\.intro h1\{[^}]*white-space:\s*nowrap/,
  'the Japanese scene headline is allowed to wrap naturally');
 assert.match(read('reflex.html'),/<h1>60秒、英語を話そう。<\/h1>/);
 assert.match(read('account.html'),/<h1 id="heroTitle">練習記録と、次の一歩。<\/h1>/);
 assert.match(read('scenes.html'),/<h1>どんな場面で話してみる？<\/h1>/);
 assert.match(read('index.html'),/max-width:13em;text-wrap:balance/);
});

test('restrained neon design is shared across learning routes and respects small screens',()=>{
 const neon=read('soft-neon.css');
 for(const path of pages.filter(path=>path!=='freeze-breaker.html')){
  const html=read(path);
  assert.match(html,/<link rel="stylesheet" href="\.\/soft-neon\.css">/,'shared CSS must load: '+path);
  assert.match(html,/<body[^>]*class="[^"]*sg-soft-neon/,'scoped theme must apply: '+path);
 }
 assert.match(neon,/--sg-neon-night:#102532/);
 assert.match(neon,/--sg-neon-mint:#55ead0/);
 assert.match(neon,/@media\(max-width:650px\)/);
 assert.doesNotMatch(neon,/animation\s*:/,'do not introduce distracting neon animations');
 assert.match(read('freeze-breaker.html'),/@media\(max-width:520px\)/,'scene page has its own mobile layout');
});
