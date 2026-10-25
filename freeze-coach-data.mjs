// Build bounded, explicit opt-in coaching inputs for the *existing* teacher quota.
// No storage, network access, or speech recognition belongs in this module.
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';

export function buildFreezeCoachingRequests(input={}){
 if(input.imported)return []; // Protect the temporary transcript imported from AI roleplay.
 const scene=clean(input.scene,70),question=clean(input.question,155);
 const followup=clean(input.followup,155),reason=clean(input.reason,65);
 const first=clean(input.firstText,400),retry=clean(input.retryText,400);
 const requests=[];
 if(first){
  requests.push({index:requests.length,text:first,
   situation:clean(`${scene}。相手の質問：${question}`,270),
   goal:'予想外の英語に対して、意味の通る短い返答をして会話を止めない。'});
 }
 if(retry){
  requests.push({index:requests.length,text:retry,
   situation:clean(`${scene}。相手の次の発言：${followup}`,270),
   goal:clean(reason?`「${reason}」で詰まった後、相手の続きを聞いて、自分の言葉で会話を再開する。`:
    '最初の返答に続く相手の発言を聞いて、自分の言葉で会話を続ける。',330)});
 }
 return requests;
}

export function normalizeFreezeCoachResponse(value,count){
 if(!Number.isInteger(count)||count<1||count>2||!Array.isArray(value)||value.length!==count)return null;
 const keys=['praise','improvement','improved','why','practice'];
 const out=[];
 for(let i=0;i<count;i++){
  const row=value[i];
  if(!row||row.index!==i||keys.some(key=>!clean(row[key],450)))return null;
  out.push({index:i,...Object.fromEntries(keys.map(key=>[key,clean(row[key],450)]))});
 }
 return out;
}
