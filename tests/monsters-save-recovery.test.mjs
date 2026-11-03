import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, validateSave, STORAGE_KEY } from '../prototype/speakingym-monsters/monster-engine.js';
import { loadProtectedSave, unreadableSaveForDownload, UNREADABLE_BACKUP_KEY } from '../prototype/speakingym-monsters/save-recovery.js';

function fakeStorage(initial={}){
  const data=new Map(Object.entries(initial));
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    get data(){return data;}
  };
}

test('valid and brand-new saves do not create a recovery copy',()=>{
  const fresh=fakeStorage();
  assert.equal(loadProtectedSave(fresh,validateSave).status,'fresh');
  const previous=createSave();previous.xpWallet=320;
  const valid=fakeStorage({[STORAGE_KEY]:JSON.stringify(previous)});
  const loaded=loadProtectedSave(valid,validateSave);
  assert.equal(loaded.status,'valid');
  assert.equal(loaded.save.xpWallet,320);
  assert.equal(valid.getItem(UNREADABLE_BACKUP_KEY),null);
});

test('malformed and future-version saves are preserved byte-for-byte before reset',()=>{
  for(const raw of ['{bad-json',JSON.stringify({...createSave(),version:2,xpWallet:987})]){
    const store=fakeStorage({[STORAGE_KEY]:raw});
    const loaded=loadProtectedSave(store,validateSave);
    assert.equal(loaded.status,'protected');
    assert.equal(store.getItem(STORAGE_KEY),raw);
    assert.equal(store.getItem(UNREADABLE_BACKUP_KEY),raw);
    assert.equal(unreadableSaveForDownload(store,loaded.status),raw);
    assert.equal(loadProtectedSave(store,validateSave).status,'protected');
    store.setItem(STORAGE_KEY,JSON.stringify(createSave()));
    const reloaded=loadProtectedSave(store,validateSave);
    assert.ok(reloaded.save,'A valid new save must remain playable');
    assert.equal(reloaded.status,'protected','Archived progress must remain downloadable after reload');
    assert.equal(unreadableSaveForDownload(store,reloaded.status),raw);
  }
});

test('a second incompatible save cannot overwrite a different prior recovery',()=>{
  const old='{"version":2,"xpWallet":1}';
  const now='{"version":3,"xpWallet":800}';
  const store=fakeStorage({[STORAGE_KEY]:now,[UNREADABLE_BACKUP_KEY]:old});
  assert.equal(loadProtectedSave(store,validateSave).status,'blocked');
  assert.equal(store.getItem(STORAGE_KEY),now);
  assert.equal(store.getItem(UNREADABLE_BACKUP_KEY),old);
  assert.equal(unreadableSaveForDownload(store,'blocked'),now);
});

test('quota failures never authorize automatic replacement of unreadable progress',()=>{
  const raw='{"version":2,"xpWallet":800}';
  const store=fakeStorage({[STORAGE_KEY]:raw});
  store.setItem=()=>{throw new Error('QuotaExceededError');};
  assert.equal(loadProtectedSave(store,validateSave).status,'blocked');
  assert.equal(store.getItem(STORAGE_KEY),raw);
  assert.equal(unreadableSaveForDownload(store,'blocked'),raw);
});
