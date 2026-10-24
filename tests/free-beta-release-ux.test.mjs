import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('scene introduction is consistent with all 16 real practice cards',()=>{
 const scenes=file('scenes.html');
 const ids=[...scenes.matchAll(/data-scene="([a-z]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,16);
 assert.match(scenes,/どんな場面で話してみる？/);
 assert.match(scenes,/他の場面も見る（全16場面）/);
 assert.doesNotMatch(scenes,/6つの場面から選んで/);
 assert.match(scenes,/Googleで無料ログインする/);
 assert.match(scenes,/ログインできない場合はマイページへ/);
});

test('missing route fallback is crawl-safe, responsive and returns to free exercises',()=>{
 const page=file('404.html');
 assert.match(page,/<title>ページが見つかりません \| Speakingym<\/title>/);
 assert.match(page,/<meta name="robots" content="noindex,follow">/);
 assert.match(page,/<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">/);
 assert.match(page,/PAGE NOT FOUND · 404/);
 for(const route of ['./index.html','./reflex.html','./scenes.html','./contact.html']){
  assert.ok(page.includes('href="'+route+'"'),route+' should be reachable from 404');
 }
 assert.doesNotMatch(page,/<script\b/i,'error page must work offline and without user scripts');
 assert.doesNotMatch(page,/<form\b/i,'404 must not ask for secrets');
});
