/**
 * Speakingym account data: pure, Firebase-independent utilities.
 * Only allow-listed learning data is synchronized. Never sync API URLs, secrets or voice settings.
 */
export const SYNC_ITEMS = Object.freeze([
 { key:"speakingym-reflex-stats-v1", doc:"reflex_stats", type:"numbers", limit:4000 },
 { key:"speakingym-reflex-misses-v1", doc:"reflex_misses", type:"ids", limit:4000 },
 { key:"speakingym-reflex-history-v1", doc:"reflex_history", type:"history", limit:800000 },
 { key:"speakingym-reflex-ai-teacher-v1", doc:"reflex_teacher", type:"history", limit:180000 },
 { key:"speakingym-reflex-saved-phrases-v1", doc:"reflex_phrases", type:"phrases", limit:160000 },
 { key:"speakingym-saved-coaching-v1", doc:"scene_rewrites", type:"rewrites", limit:40000 },
 { key:"speakingym-survival-stats-v1", doc:"cafe_stats", type:"numbers", limit:4000 },
 { key:"speakingym-v01-records", doc:"legacy_records", type:"records", limit:180000 }
]);
export const OWNER_KEY="speakingym-account-owner-v1";
export const GUEST_KEY="speakingym-account-guest-backup-v1";
const serial=value=>{try{return JSON.stringify(value)}catch{return null}};
const parse=json=>{try{return JSON.parse(json)}catch{return null}};
const numeric=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(999999,Math.floor(Number(v)))):0;
export function mergeValue(type,left,right) {
 if(right===null || right===undefined)return left;
 if(left===null || left===undefined)return right;
 if(type==="numbers"){
  const a=typeof left==="object"&&!Array.isArray(left)?left:{};
  const b=typeof right==="object"&&!Array.isArray(right)?right:{};
  return Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])]
   .filter(k=>/^[a-zA-Z][a-zA-Z0-9_]{0,28}$/.test(k)).map(k=>[k,Math.max(numeric(a[k]),numeric(b[k]))]));
 }
 if(!Array.isArray(left)||!Array.isArray(right))return right;
 const max={ids:40,history:20,phrases:100,rewrites:20,records:100}[type]||20;
 const fingerprint=(x)=>{
  if(type==="ids")return String(x);
  if(type==="rewrites")return String(x?.original||"")+"|"+String(x?.natural||"");
  if(type==="phrases")return String(x?.id||x?.cardId+"|"+x?.kind+"|"+x?.level);
  if(type==="history")return String(x?.date||"")+"|"+String(x?.level||"");
  if(type==="records")return String(x?.id||x?.at||x?.timestamp||serial(x));
  return serial(x);
 };
 const merged=[],seen=new Set();
 for(const item of [...left,...right]){
  if((type==="ids" && typeof item!=="string") || (type!=="ids" && (item===null||typeof item!=="object")))continue;
  const id=fingerprint(item);
  if(!id||seen.has(id))continue;
  seen.add(id);merged.push(item);
  if(merged.length===max)break;
 }
 if(type==="history")merged.sort((a,b)=>String(b?.date||"").localeCompare(String(a?.date||"")));
 return merged.slice(0,max);
}
export function normalizeValue(item,value){
 if(value===null||value===undefined)return null;
 let normalized;
 if(item.type==="numbers"){
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  normalized=mergeValue("numbers",value,{});
 }else{
  if(!Array.isArray(value))return null;
  normalized=mergeValue(item.type,value,[]);
 }
 const json=serial(normalized);
 return json&&json.length<=item.limit?normalized:null;
}
export function readSnapshot(storage){
 const data={};
 for(const item of SYNC_ITEMS){
  const value=parse(storage.getItem(item.key));
  const normalized=normalizeValue(item,value);
  if(normalized!==null)data[item.key]=normalized;
 }
 return data;
}
export function removeSnapshot(storage){
 for(const item of SYNC_ITEMS)storage.removeItem(item.key);
}
export function applySnapshot(storage,data){
 for(const item of SYNC_ITEMS){
  const normalized=normalizeValue(item,data?.[item.key]);
  if(normalized!==null)storage.setItem(item.key,JSON.stringify(normalized));
 }
}
export function readGuestSnapshot(storage){
 return parse(storage.getItem(GUEST_KEY))||{};
}
export function saveGuestSnapshot(storage){
 const previous=readGuestSnapshot(storage),newer=readSnapshot(storage);
 const combined={...previous};
 for(const item of SYNC_ITEMS){
  const a=newer[item.key],b=previous[item.key];
  const merged=normalizeValue(item,mergeValue(item.type,a,b));
  if(merged!==null)combined[item.key]=merged;
 }
 storage.setItem(GUEST_KEY,JSON.stringify(combined));
 return combined;
}
export function mergeSnapshots(local,remote){
 const out={};
 for(const item of SYNC_ITEMS){
  const a=local?.[item.key]??null,b=remote?.[item.key]??null;
  const merged=normalizeValue(item,mergeValue(item.type,a,b));
  if(merged!==null)out[item.key]=merged;
 }
 return out;
}
export function snapshotsEqual(a,b){
 return JSON.stringify(a??null)===JSON.stringify(b??null);
}
