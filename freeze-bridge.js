/* The *opt-in* one-tab bridge between real AI roleplay and offline Freeze Breaker.
 *
 * "Take this moment to gym" is user initiated. Only the most recent AI reply
 * is temporarily stored; never record the learner's transcript, ID token or
 * full history. Both directions are identity-scoped, one-use, and time-limited.
 * This is a convenience cue, not signed authorization or a Pro entitlement.
 * DOM consumers MUST use textContent, never innerHTML.
 */
(function(root){
 'use strict';
 const CHALLENGE_KEY='speakingym-freeze-chat-handoff-v1';
 const RETURN_KEY='speakingym-freeze-return-v1';
 const OWNER_KEY='speakingym-account-owner-v1';
 const TTL_MS=10*60*1000;
 const ALLOWED_SCENES=new Set([
  'hotel','airport','smalltalk','cafe','restaurant','shopping','train',
  'directions','taxi','phone','tourism','pharmacy','work','introductions',
  'plans','help'
 ]);
 const TARGET_SCENES=new Set(['cafe','hotel','restaurant','shopping','train','work','anywhere']);
 const LEVELS=new Set(['easy','standard','challenge']);
 const REASONS=new Set(['misunderstood','words','surprise','unsure']);
 const freezeScene=(sceneId)=>TARGET_SCENES.has(sceneId)?sceneId:'anywhere';
 const parse=key=>{
  try{
   const value=root.sessionStorage?.getItem(key);
   return value?JSON.parse(value):null;
  }catch{return null}
 };
 const remove=key=>{try{root.sessionStorage?.removeItem(key)}catch{}};
 const accountUid=()=>{
  try{
   const account=root.speakingymAccount;
   const uid=account?.getUid?.();
   return account?.isLoggedIn?.()===true &&
    typeof uid==='string' && /^[a-zA-Z0-9_:-]{1,128}$/.test(uid) &&
    root.localStorage?.getItem(OWNER_KEY)===uid?uid:null;
  }catch{return null}
 };
 const now=()=>Date.now();
 const validShape=(p,kind)=>{
  if(!p||typeof p!=='object'||p.v!==1||typeof p.uid!=='string'||
   !/^[a-zA-Z0-9_:-]{1,128}$/.test(p.uid)||!ALLOWED_SCENES.has(p.sceneId)||
   !LEVELS.has(p.level)||!Number.isSafeInteger(p.createdAt)||
   p.createdAt>now()+5000||now()-p.createdAt>TTL_MS)return false;
  return kind==='challenge'?
   (typeof p.question==='string'&&p.question.length>=2&&p.question.length<=450 &&
    p.question.trim().length>=2 && !/[<>]/.test(p.question)):
   REASONS.has(p.reason);
 };
 const read=(key,kind)=>{
  const p=parse(key);
  if(!p)return null;
  if(!validShape(p,kind)){remove(key);return null}
  const uid=accountUid();
  if(!uid)return null; // auth still initializing; do not expose someone else's cue
  if(uid!==p.uid){remove(key);return null}
  remove(key);return p;
 };
 function stageChallenge({sceneId,level,question}={}){
  const uid=accountUid();
  if(!uid||!ALLOWED_SCENES.has(sceneId)||!LEVELS.has(level)||
   typeof question!=='string'||question.trim().length<2||
   question.length>450||/[<>]/.test(question))return false;
  try{
   root.sessionStorage.setItem(CHALLENGE_KEY,JSON.stringify({
    v:1,uid,sceneId,level,question:question.trim(),createdAt:now()
   }));
   return true;
  }catch{return false}
 }
 function stageReturn({sceneId,level,reason}={}){
  const uid=accountUid();
  if(!uid||!ALLOWED_SCENES.has(sceneId)||!LEVELS.has(level)||!REASONS.has(reason))return false;
  try{
   root.sessionStorage.setItem(RETURN_KEY,JSON.stringify({
    v:1,uid,sceneId,level,reason,createdAt:now()
   }));
   return true;
  }catch{return false}
 }
 root.speakingymFreezeBridge=Object.freeze({
  stageChallenge,
  consumeChallenge:()=>read(CHALLENGE_KEY,'challenge'),
  stageReturn,
  consumeReturn:()=>read(RETURN_KEY,'return'),
  freezeScene,
  clear:()=>{remove(CHALLENGE_KEY);remove(RETURN_KEY)}
 });
})(window);
