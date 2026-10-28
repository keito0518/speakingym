import test from 'node:test';
import assert from 'node:assert/strict';
import {BETA_CONSENT_KEY,createBetaTelemetry,safeBetaEvent} from '../prototype/speakingym-monsters/beta-telemetry.js';

function fixture({initial={},day=1,id='G-DRH440861Y'}={}){
  const saved=new Map(Object.entries(initial)),session=new Map(),scripts=[];
  const calls=[];
  const root={
    SPEAKINGYM_GA4_ID:id,
    localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},
    sessionStorage:{getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,value)},
    gtag:(...args)=>calls.push(args)
  };
  const doc={head:{appendChild:element=>scripts.push(element)},querySelector:()=>null,createElement:()=>({dataset:{}})};
  const instance=createBetaTelemetry({root,doc,id,now:()=>new Date(2026,9,day,12)});
  return {instance,root,doc,saved,session,scripts,calls};
}

test('beta events never accept free-text, transcripts, IDs or unknown event names',()=>{
  assert.equal(safeBetaEvent('monsters_beta_transcript',{answer:'secret'}),null);
  assert.equal(safeBetaEvent('monsters_beta_feedback',{reaction:'secret'}),null);
  assert.deepEqual(safeBetaEvent('monsters_beta_feedback',{
    reaction:'grading',email:'me@example.com',transcript:'My spoken words'
  }),{name:'monsters_beta_feedback',fields:{reaction:'grading'}});
  assert.deepEqual(safeBetaEvent('monsters_beta_start',{
    mode:'forest',difficulty:'easy',chapter:'entry',spokenAnswer:'private'
  }),{name:'monsters_beta_start',fields:{mode:'forest',difficulty:'easy',chapter:'entry'}});
});

test('default and refusal do not inject GA4 or record any events',()=>{
  const f=fixture();
  assert.equal(f.instance.getConsent(),'');
  assert.equal(f.scripts.length,0);
  assert.equal(f.instance.track('monsters_beta_feedback',{reaction:'fun'}),false);
  assert.equal(f.instance.markVisit(),false);
  assert.equal(f.instance.setConsent('no'),true);
  assert.equal(f.root['ga-disable-G-DRH440861Y'],true);
  assert.equal(f.scripts.length,0);
  assert.equal(f.calls.length,0);
  assert.equal(f.saved.get(BETA_CONSENT_KEY),'no');
});

test('opt-in records one visit per tab, never injects the vendor twice, and can revoke',()=>{
  const f=fixture();
  f.instance.setConsent('yes');
  assert.equal(f.scripts.length,1);
  assert.match(f.scripts[0].src,/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-DRH440861Y/);
  assert.equal(f.calls.filter(args=>args[0]==='event'&&args[1]==='monsters_beta_visit').length,1);
  assert.equal(f.instance.track('monsters_beta_start',{mode:'forest',difficulty:'easy',chapter:'entry'}),true);
  assert.equal(f.instance.track('monsters_beta_chapter_clear',{chapter:'entry',difficulty:'easy'}),true);
  assert.equal(f.instance.track('monsters_beta_feedback',{reaction:'audio'}),true);
  assert.equal(f.instance.track('monsters_beta_feedback',{reaction:'invalid'}),false);
  assert.equal(f.instance.markVisit(),false);
  assert.equal(f.scripts.length,1);
  assert.deepEqual(f.calls.filter(args=>args[0]==='event').map(args=>args[1]),[
    'monsters_beta_visit','monsters_beta_start','monsters_beta_chapter_clear','monsters_beta_feedback'
  ]);
  assert.equal(f.calls.find(args=>args[0]==='config')[2].send_page_view,false);
  f.instance.setConsent('no');
  assert.equal(f.instance.track('monsters_beta_feedback',{reaction:'hard'}),false);
  assert.equal(f.root['ga-disable-G-DRH440861Y'],true);
});

test('revisit counts only when a prior opted-in day exists, without cross-site user IDs',()=>{
  const f=fixture({initial:{[BETA_CONSENT_KEY]:'yes','speakingym-monsters-beta-visit-day-v1':'2026-10-27'},day:28});
  assert.equal(f.calls.filter(args=>args[1]==='monsters_beta_visit').length,1);
  assert.equal(f.calls.find(args=>args[1]==='monsters_beta_visit')[2].returning,'yes');
  assert.equal(f.saved.get('speakingym-monsters-beta-visit-day-v1'),'2026-10-28');
});

test('invalid measurement ID never loads Google code or pretends feedback was submitted',()=>{
  const f=fixture({id:''});
  assert.equal(f.instance.configured,false);
  f.instance.setConsent('yes');
  assert.equal(f.instance.track('monsters_beta_feedback',{reaction:'fun'}),false);
  assert.equal(f.scripts.length,0);
  assert.equal(f.calls.length,0);
});
