import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const source=path=>readFileSync(new URL(path,root),'utf8');
const origin='https://speakingym.pages.dev';
const indexed=['/','/reflex.html','/scenes.html','/phrasebook.html','/plans.html',
 '/privacy.html','/terms.html','/contact.html'];

test('robots allows public Free beta discovery and points to exactly the same-origin sitemap',()=>{
 const robots=source('robots.txt');
 assert.match(robots,/^User-agent: \*$/m);
 assert.match(robots,/^Allow: \/$/m);
 assert.match(robots,/^Sitemap: https:\/\/speakingym\.pages\.dev\/sitemap\.xml$/m);
 assert.doesNotMatch(robots,/Disallow: \/|noindex/i);
});
test('every sitemap entry is real, distinct, canonical HTTPS; excludes hidden beta experiments and account',()=>{
 const xml=source('sitemap.xml');
 assert.match(xml,/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
 assert.match(xml,/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
 const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.equal(urls.length,indexed.length);
 assert.equal(new Set(urls).size,urls.length);
 assert.deepEqual([...urls].sort(),indexed.map(path=>origin+path).sort());
 for(const value of urls){
  const url=new URL(value);
  assert.equal(url.origin,origin);
  assert.equal(url.search,'');
  assert.equal(url.hash,'');
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  assert.ok(existsSync(new URL(file,root)),file+' missing from repo');
  const page=source(file);
  assert.doesNotMatch(page,/<meta[^>]+name="robots"[^>]+content="noindex/i,'noindex sitemap entry '+file);
 }
 for(const hidden of ['home-preview.html','classic.html','live.html','mission.html','account.html'])
  assert.ok(!urls.some(value=>value.includes(hidden)),hidden+' should not be in sitemap');
});
test('home schema is accurate, Japanese, public free access and does not claim paid checkout',()=>{
 const home=source('index.html');
 const block=home.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
 assert.ok(block,'jsonld present');
 const data=JSON.parse(block[1]);
 assert.equal(data['@type'],'WebApplication');
 assert.equal(data.url,origin+'/');
 assert.equal(data.inLanguage,'ja');
 assert.equal(data.isAccessibleForFree,true);
 assert.ok(data.description.includes('60秒'));
 assert.equal(data.offers,undefined);
 assert.match(home,/name="twitter:card" content="summary"/);
});
test('AI scene and sprint metadata are correct, nonduplicated and canonical',()=>{
 for(const file of ['scenes.html','reflex.html','phrasebook.html','plans.html']){
  const html=source(file);
  const links=[...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(links,[origin+'/'+file]);
 }
 assert.match(source('scenes.html'),/content="Speakingymの無料AI英会話。[^"]*16シーン/);
 assert.doesNotMatch(source('scenes.html'),/content="[^"]*6シーン/);
 assert.match(source('reflex.html'),/151問から練習/);
});
