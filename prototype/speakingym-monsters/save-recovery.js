import { STORAGE_KEY } from './monster-engine.js';

// An unreadable save may be from a future app version, not an empty account.
// Never replace its bytes with a fresh save unless they are safely archived
// first or the player explicitly confirms that the old data may be replaced.
export const UNREADABLE_BACKUP_KEY=`${STORAGE_KEY}-unreadable-backup`;

// Some privacy modes throw when reading window.localStorage itself, before
// getItem can be called. Defer the property access until the guarded save
// operation so the game can still boot with its in-memory/export fallback.
export function lazyStorage(getStorage,translateKey=key=>key){
  return {
    getItem(key){return getStorage().getItem(translateKey(key));},
    setItem(key,value){return getStorage().setItem(translateKey(key),value);}
  };
}

export function loadProtectedSave(storage,validate){
  let raw;
  try{raw=storage.getItem(STORAGE_KEY);}catch{return {save:null,status:'storage-unavailable',raw:null};}
  if(raw===null)return {save:null,status:'fresh',raw};
  try{
    const save=validate(JSON.parse(raw));
    if(save){
      // Keep recovery discoverable after the first successful new save/reload.
      // Otherwise the archived data would still exist but the UI would stop
      // offering a way to download it.
      try{return {save,status:storage.getItem(UNREADABLE_BACKUP_KEY)!==null?'protected':'valid',raw};}
      catch{return {save,status:'valid',raw};}
    }
  }catch{/* Broken JSON or incompatible save version: preserve exact bytes. */}
  try{
    const previous=storage.getItem(UNREADABLE_BACKUP_KEY);
    // Never destroy a different earlier recovery, even if the current value
    // is unreadable. A newer user-owned save may need a future migrator.
    if(previous!==null&&previous!==raw)return {save:null,status:'blocked',raw};
    if(previous===null)storage.setItem(UNREADABLE_BACKUP_KEY,raw);
    return {save:null,status:'protected',raw};
  }catch{
    // Quota/private-mode failure: block automatic writes to the original key.
    return {save:null,status:'blocked',raw};
  }
}

// localStorage is shared by tabs at the same URL. A stale tab must never
// replace a more recently saved adventure just because its own UI is older.
// Keep the raw snapshot, not a reserialized/normalized save, as the revision.
export function writeSaveIfCurrent(storage,expectedRaw,nextRaw){
  if(storage.getItem(STORAGE_KEY)!==expectedRaw)return {status:'conflict'};
  storage.setItem(STORAGE_KEY,nextRaw);
  return {status:'saved',raw:nextRaw};
}

export function unreadableSaveForDownload(storage,status){
  if(status!=='protected'&&status!=='blocked')return null;
  try{return storage.getItem(status==='protected'?UNREADABLE_BACKUP_KEY:STORAGE_KEY);}
  catch{return null;}
}

// If two incompatible saves conflict, the original key and the earlier
// recovery sidecar can contain different player progress. Offer both files.
export function conflictingArchiveForDownload(storage,status){
  if(status!=='blocked')return null;
  try{
    const archived=storage.getItem(UNREADABLE_BACKUP_KEY);
    const current=storage.getItem(STORAGE_KEY);
    return archived!==null&&archived!==current?archived:null;
  }catch{return null;}
}
