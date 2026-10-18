// Non-billable production smoke: GET only, no real users, tokens, or Gemini calls.
import assert from 'node:assert/strict';
const SITE='https://speakingym.pages.dev/';
const HEALTH='https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/health';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function attempt(url,validate){
 let lastError;
 for(let i=0;i<8;i++){
  try{
   const response=await fetch(url,{headers:{Accept:'application/json,text/html'},cache:'no-store',signal:AbortSignal.timeout(12000)});
   assert.equal(response.status,200,'Unexpected HTTP status '+response.status+' from '+url);
   const body=await response.text();
   assert.ok(body.length>0&&body.length<500000,'Invalid body length from '+url);
   const result=validate(body);
   console.log('PASS '+url+' '+JSON.stringify(result));
   return;
  }catch(error){
   lastError=error;
   console.warn('Retry '+(i+1)+'/8 '+url+': '+String(error?.message||error).slice(0,180));
   if(i<7)await sleep(8000);
  }
 }
 throw new Error('Production smoke failed for '+url+': '+lastError?.message);
}
await attempt(SITE,html=>{
 assert.match(html,/Speakingym/i);
 assert.match(html,/60秒チャレンジ/);
 return {home:true};
});
await attempt(HEALTH,raw=>{
 const data=JSON.parse(raw);
 assert.equal(data.status,'ok');
 assert.equal(data.quotaVersion,'pro-monthly-600-100-v2');
 assert.ok(Array.isArray(data.sceneIds)&&data.sceneIds.length>=16,'16 AI scenes required');
 assert.ok(['test','disabled'].includes(data.billingMode),'Real billing must remain disabled');
 assert.equal(data.plansEnabled,true,'D1 quota enforcement must be enabled');
 assert.equal(data.plansReady,true,'D1 binding must be present');
 return {health:true,scenes:data.sceneIds.length,model:data.model,plansReady:data.plansReady,
  aiEnabled:data.aiEnabled,billingMode:data.billingMode};
});
