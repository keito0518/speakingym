// The semantic grader is intentionally OFF until an isolated authenticated,
// quota-capped staging Worker is deployed and its URL is reviewed here.
// Do not point this at the production speakingym-survival-ai Worker.
export const STAGING_SEMANTIC_GRADER_ENDPOINT = '';

export async function askSemanticGrader(prompt,answer,{
 endpoint=STAGING_SEMANTIC_GRADER_ENDPOINT,
 getToken=async()=>window.speakingymAccount?.getIdToken?.(),
 request=fetch
}={}){
 if(!endpoint || !/^https:\/\//.test(endpoint))return {state:'disabled'};
 if(!prompt?.id || typeof answer!=='string' || answer.trim().length<5)
   return {state:'unavailable'};
 let token;
 try{token=await getToken()}catch{return {state:'login_required'}}
 if(!token)return {state:'login_required'};
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),13000);
 try{
  const response=await request(endpoint.replace(/\/$/,'')+'/grade',{
   method:'POST',signal:controller.signal,
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify({attempts:[{promptId:prompt.id,answer:answer.trim().slice(0,500)}]})
  });
  if(!response.ok)return {state:response.status===429?'rate_limited':'unavailable'};
  const payload=await response.json();
  const result=payload?.results?.[0];
  if(!result || result.promptId!==prompt.id || !['correct','review'].includes(result.verdict))
   return {state:'unavailable'};
  return {state:result.verdict,feedback:typeof result.feedback==='string'?result.feedback.slice(0,220):'',missing:Array.isArray(result.missing)?result.missing.filter(x=>typeof x==='string').slice(0,3):[]};
 }catch{return {state:'unavailable'}}
 finally{clearTimeout(timeout)}
}
