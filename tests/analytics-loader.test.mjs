import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const loader = read('analytics-loader.js');

function simulate(id, stored = '', options = {}) {
  const appended = [], listeners = {}, nodes = [], saved = [];
  const elements = Object.create(null);
  const makeElement = name => ({
    nodeName: name, dataset: {}, style: {}, children: [], disabled: true,
    addEventListener(event, handler) { this['on' + event] = handler; },
    setAttribute(key, val) { this[key] = val; },
    appendChild(child) { child.parentNode = this; this.children.push(child); },
    removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; },
    textContent: ''
  });
  const doc = {
    readyState: options.readyState || 'loading',
    head: { appendChild(node) { appended.push(node); } },
    body: { appendChild(node) { nodes.push(node); node.parentNode=this; },
      removeChild(node) { nodes.splice(nodes.indexOf(node), 1); node.parentNode=null; } },
    createElement: makeElement,
    querySelector() { return null; },
    getElementById(key) { return elements[key] || null; },
    addEventListener(name, callback) { listeners[name] = callback; }
  };
  const window = {
    SPEAKINGYM_GA4_ID: id,
    location: { reload() { window.reloadCount = (window.reloadCount || 0) + 1; } },
    localStorage: { getItem() { if(options.blockStorage) throw Error('blocked'); return stored; },
      setItem(key, value) { if(options.blockStorage) throw Error('blocked'); stored=value; saved.push([key,value]); } }
  };
  if (options.gtag) window.gtag=options.gtag;
  if (options.settings) {
    elements['sg-analytics-consent-status'] = makeElement('p');
    elements['sg-analytics-accept'] = makeElement('button');
    elements['sg-analytics-decline'] = makeElement('button');
  }
  vm.runInNewContext(loader, { window, document: doc });
  if (listeners.DOMContentLoaded) listeners.DOMContentLoaded();
  return { window, doc, appended, nodes, saved, elements };
}

test('blank or invalid GA4 IDs never load Google, write consent, or prompt for cookies', () => {
  for (const id of ['', undefined, 'UA-12345', 'G-<script>', 'G-TEST?foo', 'G-notLowercase', 'G-A1']) {
    const r = simulate(id, '');
    assert.equal(r.window.SPEAKINGYM_GA4_READY, undefined);
    assert.equal(r.window.gtag, undefined);
    assert.equal(r.window.dataLayer, undefined);
    assert.equal(r.appended.length, 0);
    assert.equal(r.nodes.length, 0);
    assert.equal(r.saved.length, 0);
  }
  assert.doesNotMatch(loader, /fetch\s*\(|sendBeacon|XMLHttpRequest|document\.cookie/);
});

test('valid ID with no prior consent displays accessible non-blocking choice, but sends NO analytics', () => {
  const r=simulate('G-ABC1234567');
  assert.equal(r.appended.length,0);
  assert.equal(r.window.gtag,undefined);
  assert.equal(r.window.SPEAKINGYM_GA4_READY,undefined);
  assert.equal(r.nodes.length,1);
  assert.equal(r.nodes[0].role,'region');
  assert.match(r.nodes[0].children[0].textContent,/同意しなくても無料で練習/);
  const actions=r.nodes[0].children[1];
  assert.equal(actions.children[0].textContent,'同意する');
  assert.equal(actions.children[1].textContent,'同意しない');
  assert.equal(actions.children[2].href,'./privacy.html#analytics-settings');
  assert.equal(r.saved.length,0);
});

test('refusal saves local choice but never loads Google, even on later page visits', () => {
  const r=simulate('G-ABC1234567','', {settings:true});
  assert.equal(r.elements['sg-analytics-accept'].disabled,false);
  assert.equal(r.elements['sg-analytics-decline'].disabled,false);
  r.window.speakingymGA4Consent.decline();
  assert.equal(r.window.speakingymGA4Consent.status(),'no');
  assert.equal(r.nodes.length,0);
  assert.equal(r.appended.length,0);
  assert.equal(r.saved[0][1],'no');
  const later=simulate('G-ABC1234567','no');
  assert.equal(later.appended.length,0);
  assert.equal(later.nodes.length,0);
});

test('explicit consent enables exactly one Google script and strictly scoped configuration', () => {
  const r=simulate('G-ABC1234567');
  assert.equal(r.window.speakingymGA4Consent.accept(),true);
  assert.equal(r.window.SPEAKINGYM_GA4_READY,true);
  assert.equal(r.appended.length,1);
  assert.equal(r.appended[0].async,true);
  assert.equal(r.appended[0].src,'https://www.googletagmanager.com/gtag/js?id=G-ABC1234567');
  const calls=r.window.dataLayer.map(args=>Array.from(args));
  assert.equal(calls[0][0],'js');
  assert.equal(calls[1][0],'config');
  assert.equal(calls[1][1],'G-ABC1234567');
  assert.equal(calls[1][2].allow_google_signals,false);
  assert.equal(calls[1][2].allow_ad_personalization_signals,false);
  assert.deepEqual(r.saved.map(x=>x[1]),['yes']);
  assert.equal(r.nodes.length,0);
  assert.equal(r.window.speakingymGA4Consent.accept(),true);
  assert.equal(r.appended.length,1);
});

test('previous yes decision activates; revoke through privacy page disables events and reloads', () => {
  const r=simulate('G-ABC1234567','yes',{settings:true});
  assert.equal(r.appended.length,1);
  assert.equal(r.nodes.length,0);
  assert.equal(r.elements['sg-analytics-consent-status'].textContent,'任意のアクセス解析：同意済み');
  r.elements['sg-analytics-decline'].onclick();
  assert.equal(r.window.SPEAKINGYM_GA4_READY,false);
  assert.equal(r.window.reloadCount,1);
  assert.equal(r.saved.at(-1)[1],'no');
});

test('blocked localStorage fails closed across navigation; consent remains one-page only', () => {
  const r=simulate('G-ABC1234567','',{blockStorage:true});
  assert.equal(r.appended.length,0);
  assert.equal(r.window.SPEAKINGYM_GA4_READY,undefined);
  r.window.speakingymGA4Consent.accept();
  assert.equal(r.appended.length,1);
  const later=simulate('G-ABC1234567','',{blockStorage:true});
  assert.equal(later.appended.length,0);
});

test('unrelated site gtag cannot activate analytics without consent', () => {
  const calls=[];
  const r=simulate('G-ABC1234567','',{gtag:(...args)=>calls.push(args)});
  assert.equal(r.appended.length,0);
  assert.equal(calls.length,0);
});

test('site pages load config before loader and event hooks', () => {
  for (const file of [
    'index.html','reflex.html','scenes.html','account.html','phrasebook.html',
    'plans.html','privacy.html','terms.html','contact.html','classic.html','mission.html','live.html'
  ]) {
    const html=read(file);
    const config='<script src="./analytics-config.js"></script>';
    const script='<script src="./analytics-loader.js"></script>';
    assert.equal(html.split(config).length-1,1,file);
    assert.equal(html.split(script).length-1,1,file);
    assert.ok(html.indexOf(config)<html.indexOf(script),file);
    const event=html.indexOf('<script src="./analytics-events.js"></script>');
    if(event>=0) assert.ok(html.indexOf(script)<event,file);
  }
  const privacy=read('privacy.html');
  assert.match(privacy,/id="analytics-settings"/);
  assert.match(privacy,/id="sg-analytics-accept"/);
  assert.match(privacy,/id="sg-analytics-decline"/);
  assert.match(privacy,/Google LLCが提供するGoogle Analytics 4/);
  assert.match(privacy,/未選択の場合や「同意しない」を選んだ場合は、このアクセス解析によるデータ送信を行いません/);
  assert.match(privacy,/完全に匿名の情報であることを保証するものではありません/);
  assert.match(privacy,/それ以前に送信されたデータは取り消せません/);
  assert.doesNotMatch(privacy,/測定IDは設定しておらず|計測を準備しています|測定IDが設定されるまでは/);
});


// Exercise the deployed configuration together with consent and event filtering.
test('production measurement ID remains opt-in through refusal, acceptance and revocation', () => {
  const configWindow = {};
  vm.runInNewContext(read('analytics-config.js'), { window: configWindow });
  const id = configWindow.SPEAKINGYM_GA4_ID;
  assert.equal(id, 'G-DRH440861Y');
  const r = simulate(id, '', { settings: true });
  vm.runInNewContext(read('analytics-events.js'), { window: r.window });
  assert.equal(r.appended.length, 0);
  assert.equal(r.window.speakingymAnalytics.track('sg_sprint_start'), false);
  r.elements['sg-analytics-decline'].onclick();
  assert.equal(r.appended.length, 0);
  assert.equal(r.window.speakingymAnalytics.track('sg_sprint_start'), false);
  r.elements['sg-analytics-accept'].onclick();
  assert.equal(r.appended.length, 1);
  assert.equal(r.appended[0].src, 'https://www.googletagmanager.com/gtag/js?id=' + id);
  assert.equal(r.window.dataLayer[1][1], id);
  assert.equal(r.window.speakingymAnalytics.track('sg_sprint_start', { mode: 'standard', transcript: 'private' }), true);
  assert.deepEqual(JSON.parse(JSON.stringify(Array.from(r.window.dataLayer.at(-1)))), ['event', 'sg_sprint_start', { mode: 'standard' }]);
  r.elements['sg-analytics-decline'].onclick();
  const count = r.window.dataLayer.length;
  assert.equal(r.window.speakingymAnalytics.track('sg_sprint_complete'), false);
  assert.equal(r.window.dataLayer.length, count);
  assert.equal(r.window.reloadCount, 1);
  assert.equal(simulate(id, 'no').appended.length, 0);
});
