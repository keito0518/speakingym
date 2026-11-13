import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, validateSave, STORAGE_KEY } from '../prototype/speakingym-monsters/monster-engine.js';
import { loadProtectedSave, unreadableSaveForDownload, conflictingArchiveForDownload, writeSaveIfCurrent, saveStorageChanged, lazyStorage, UNREADABLE_BACKUP_KEY } from '../prototype/speakingym-monsters/save-recovery.js';

function fakeStorage(initial={}){
  const data=new Map(Object.entries(initial));
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    get data(){return data;}
  };
}

test('storage getter denial cannot crash startup or silently claim a successful save',()=>{
  const blocked=lazyStorage(()=>{throw new Error('SecurityError: storage access denied');});
  assert.deepEqual(loadProtectedSave(blocked,validateSave),
    {save:null,status:'storage-unavailable',raw:null});
  assert.throws(()=>writeSaveIfCurrent(blocked,null,JSON.stringify(createSave())),/SecurityError/);
  assert.equal(unreadableSaveForDownload(blocked,'protected'),null);
});

test('a lazy storage adapter isolates gacha QA without changing normal saves',()=>{
  const backing=fakeStorage({[STORAGE_KEY]:'normal-progress'});
  const testKey=`${STORAGE_KEY}-gacha-test`;
  const testStore=lazyStorage(()=>backing,key=>key===STORAGE_KEY?testKey:key);
  assert.equal(loadProtectedSave(testStore,validateSave).status,'fresh');
  assert.equal(writeSaveIfCurrent(testStore,null,JSON.stringify(createSave())).status,'saved');
  assert.equal(backing.getItem(STORAGE_KEY),'normal-progress');
  assert.equal(backing.getItem(testKey),JSON.stringify(createSave()));
});

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


test('clearing localStorage in a different tab immediately invalidates an open save',()=>{
  const raw=JSON.stringify(createSave());
  assert.equal(saveStorageChanged({key:null,newValue:null},STORAGE_KEY,raw),true,
    'clear() sends StorageEvent.key === null, not the individual save key');
  assert.equal(saveStorageChanged({key:STORAGE_KEY,newValue:null},STORAGE_KEY,raw),true,
    'removeItem(saveKey) must also invalidate the active tab');
  assert.equal(saveStorageChanged({key:STORAGE_KEY,newValue:raw},STORAGE_KEY,raw),false,
    'Identical save snapshots do not create false conflicts');
  assert.equal(saveStorageChanged({key:'other-setting',newValue:'yes'},STORAGE_KEY,raw),false,
    'Unrelated preferences must not interrupt gameplay');
  assert.equal(saveStorageChanged({key:null,newValue:null},STORAGE_KEY,null),false,
    'A fresh save with nothing stored has no previous revision to protect');
});
