import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const loader = read('analytics-loader.js');
function simulate(id, gtag) {
  const appended = [];
  const doc = {
    head: { appendChild(node) { appended.push(node); } },
    createElement(name) { assert.equal(name, 'script'); return { dataset: {} }; },
    querySelector() { return null; }
  };
  const win = { SPEAKINGYM_GA4_ID: id };
  if (gtag) win.gtag = gtag;
  vm.runInNewContext(loader, { window: win, document: doc });
  return { win, appended };
}

test('GA4 measurement is OFF by default: no SDK, cookies or network requests', () => {
  assert.match(read('analytics-config.js'), /window\.SPEAKINGYM_GA4_ID = "";/);
  for (const id of ['', undefined, 'UA-12345', 'G-<script>', 'G-TEST?foo', 'G-notLowercase', 'G-A1']) {
    const { win, appended } = simulate(id);
    assert.equal(win.SPEAKINGYM_GA4_READY, undefined);
    assert.equal(win.gtag, undefined);
    assert.equal(win.dataLayer, undefined);
    assert.equal(appended.length, 0);
  }
  assert.doesNotMatch(loader, /fetch\s*\(|sendBeacon|localStorage|document\.cookie/);
});

test('explicit valid G-id adds exactly one GA4 script, using the specified property', () => {
  const { win, appended } = simulate('G-ABC1234567');
  assert.equal(win.SPEAKINGYM_GA4_READY, true);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].async, true);
  assert.equal(appended[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-ABC1234567');
  assert.equal(appended[0].dataset.sgGa4Loader, 'true');
  const calls = win.dataLayer.map(x => Array.from(x));
  assert.equal(calls[0][0], 'js');
  assert.equal(calls[1][0], 'config');
  assert.equal(calls[1][1], 'G-ABC1234567');
  assert.equal(calls[1][2].allow_google_signals, false);
  assert.equal(calls[1][2].allow_ad_personalization_signals, false);
  assert.doesNotMatch(JSON.stringify(calls), /token|uid|transcript|email|user_id/i);
});

test('pre-existing analytics API still requires explicit site-specific configuration', () => {
  const calls = [];
  const gtag = (...args) => calls.push(args);
  const noId = simulate('', gtag);
  assert.equal(noId.win.SPEAKINGYM_GA4_READY, undefined);
  assert.equal(noId.appended.length, 0);
  assert.equal(calls.length, 0);
  const configured = simulate('G-QWER123456', gtag);
  assert.equal(configured.win.SPEAKINGYM_GA4_READY, true);
  assert.equal(configured.appended.length, 1);
  assert.equal(calls.find(x=>x[0]==='config')?.[1], 'G-QWER123456');
});

test('all user-facing pages load disabled config and loader before any practice event hook', () => {
  for (const file of [
    'index.html','reflex.html','scenes.html','account.html','phrasebook.html',
    'plans.html','privacy.html','terms.html','contact.html','classic.html','mission.html','live.html'
  ]) {
    const html = read(file);
    const configTag = '<script src="./analytics-config.js"></script>';
    const loaderTag = '<script src="./analytics-loader.js"></script>';
    assert.equal(html.split(configTag).length-1, 1, file+' missing/duplicate config');
    assert.equal(html.split(loaderTag).length-1, 1, file+' missing/duplicate loader');
    assert.ok(html.indexOf(configTag) < html.indexOf(loaderTag), file+' invalid order');
    const eventPosition=html.indexOf('<script src="./analytics-events.js"></script>');
    if (eventPosition >= 0) assert.ok(html.indexOf(loaderTag)<eventPosition, file+' events before loader');
  }
});
