import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, validateSave, STORAGE_KEY } from '../prototype/speakingym-monsters/monster-engine.js';
import { loadProtectedSave, unreadableSaveForDownload, conflictingArchiveForDownload, writeSaveIfCurrent, UNREADABLE_BACKUP_KEY } from '../prototype/speakingym-monsters/save-recovery.js';

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
  assert.equal(loaded.raw,JSON.stringify(previous),'Storage revision must retain the exact original bytes');
  assert.equal(loaded.save.xpWallet,320);
  assert.equal(valid.getItem(UNREADABLE_BACKUP_KEY),null);
});

test('two tabs cannot silently overwrite another tab’s newer save',()=>{
  const original=JSON.stringify(createSave());
  const updated=JSON.stringify({...createSave(),difficulty:'hard',xpWallet:84});
  const stale=JSON.stringify({...createSave(),difficulty:'normal',xpWallet:12});
  const store=fakeStorage({[STORAGE_KEY]:original});
  const first=loadProtectedSave(store,validateSave);
  const second=loadProtectedSave(store,validateSave);
  assert.deepEqual(writeSaveIfCurrent(store,first.raw,updated),{status:'saved',raw:updated});
  assert.equal(writeSaveIfCurrent(store,second.raw,stale).status,'conflict');
  assert.equal(store.getItem(STORAGE_KEY),updated,'A stale tab must not erase another tab’s XP');
  assert.deepEqual(writeSaveIfCurrent(store,updated,stale),{status:'saved',raw:stale},
    'A deliberate restore after loading the newest revision remains possible');
  const broken=fakeStorage({[STORAGE_KEY]:original});
  broken.setItem=()=>{throw new Error('QuotaExceededError');};
  assert.throws(()=>writeSaveIfCurrent(broken,original,updated),/QuotaExceededError/);
  assert.equal(broken.getItem(STORAGE_KEY),original);
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
  assert.equal(conflictingArchiveForDownload(store,'blocked'),old,'The prior archive must be separately exportable');
  assert.equal(conflictingArchiveForDownload(store,'protected'),null,'A normal recovery shows only one download');
});

test('quota failures never authorize automatic replacement of unreadable progress',()=>{
  const raw='{"version":2,"xpWallet":800}';
  const store=fakeStorage({[STORAGE_KEY]:raw});
  store.setItem=()=>{throw new Error('QuotaExceededError');};
  assert.equal(loadProtectedSave(store,validateSave).status,'blocked');
  assert.equal(store.getItem(STORAGE_KEY),raw);
  assert.equal(unreadableSaveForDownload(store,'blocked'),raw);
  assert.equal(conflictingArchiveForDownload(store,'blocked'),null,'Quota failures do not imply a previous archive exists');
});

test('a zero-byte damaged original and a prior archive can both be downloaded without altering storage',()=>{
  const old='{"version":9,"xpWallet":500}';
  const store=fakeStorage({[STORAGE_KEY]:'',[UNREADABLE_BACKUP_KEY]:old});
  assert.equal(loadProtectedSave(store,validateSave).status,'blocked');
  assert.equal(unreadableSaveForDownload(store,'blocked'),'');
  assert.equal(conflictingArchiveForDownload(store,'blocked'),old);
  assert.equal(store.getItem(STORAGE_KEY),'');
});
