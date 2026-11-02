// A scene-changing bonus question after a three-turn conversation. Both the
// original and destination tasks are vetted, difficulty-matched speaking
// prompts about the same phrase skill, but set in different situations.
// Practice grants no XP/mastery. A learner-initiated check may schedule only
// its exact prompt ID for tomorrow, without storing the entered sentence.
import { ALL_PROMPTS } from './monster-data.js';
import { addDays, dayKey } from './monster-engine.js';
import { gradeLocalResponse } from './monster-grader.js';
import { conversationFeedbackFor } from './speaking-feedback.js';

export function roleplayTransferFor(roleplay,prompts=ALL_PROMPTS){
 if(!Array.isArray(roleplay?.turns)||!Array.isArray(roleplay?.history)||
   roleplay.history.length!==roleplay.turns.length||!roleplay.turns.length)return null;
 const used=new Set(roleplay.turns.map(turn=>turn.prompt?.id));
 const spoken=roleplay.turns.map((turn,index)=>({turn,index,outcome:roleplay.history[index]?.outcome}));
 // Show independent successes first. Hint-led and example-only learners can
 // also rehearse, but the interface must not call their first turn mastered.
 const priority={smooth:0,hint:1,skipped:2};
 spoken.sort((a,b)=>(priority[a.outcome]??3)-(priority[b.outcome]??3)||a.index-b.index);
 for(const {turn,index,outcome} of spoken){
  const source=turn.prompt;
  if(!source?.phraseId||!['smooth','hint','skipped'].includes(outcome))continue;
  const destination=prompts.find(prompt=>prompt.kind==='speak'&&!prompt.bossOnly&&
   (prompt.difficulty||'easy')===(source.difficulty||'easy')&&
   prompt.phraseId===source.phraseId&&!used.has(prompt.id)&&
   (prompt.baseId||prompt.id)!==(source.baseId||source.id)&&
   prompt.scene&&source.scene&&prompt.scene!==source.scene&&
   prompt.cue&&prompt.answer);
  if(destination)return {
   prompt:destination,sourceScene:source.scene,sourceTask:source.task||source.cue,
   sourceOutcome:outcome,sourceTurn:index+1,destinationScene:destination.scene,
   difficulty:source.difficulty||'easy'
  };
 }
 return null;
}

// The same conservative content check as the rewarded prompt. Unsupported
// English stays unconfirmed, even when it might be naturally understood.
export function roleplayTransferFeedbackFor(challenge,answer,{revealed=false}={}){
 if(!challenge?.prompt)return null;
 const text=String(answer||'').trim();
 if(!text)return {status:revealed?'example':'empty',headline:revealed?'参考例を確認！ 明日は自分で言ってみよう':'まず英語でひと言試そう',
  checked:[],missing:[],next:revealed?'参考例を声に出して、明日は例文を見ずに答えてみよう。':'場面を読んで、短い英文でもいいので入力してみよう。',example:revealed?challenge.prompt.answer:null};
 const grade=gradeLocalResponse(challenge.prompt,text);
 const feedback=conversationFeedbackFor(challenge.prompt,text,grade,{revealExample:revealed});
 const confirmed=grade.status==='correct';
 return {status:confirmed?'correct':'review',
  headline:confirmed?(revealed?'例文を見ながら内容を確認できた！':'場面チェンジ成功！ 教材の基準で確認できた！'):
   'この英文は簡易チェックだけでは確認しきれなかったよ',
  checked:feedback?.checked||[],missing:feedback?.missing||[],
  next:confirmed?'前の場面と今回で、共通する伝え方を声に出して比べよう。':
   feedback?.correction?.clue||feedback?.next||'条件を確認して、言い直してみよう。',
  example:revealed?challenge.prompt.answer:null};
}

// The bonus itself never grants XP. The *next-day* normal, vetted question
// does, and recordAnswer clears the queue only after an independent success.
export function scheduleRoleplayTransfer(save,challenge,{status='review',today=dayKey()}={}){
 const id=challenge?.prompt?.id;
 if(!id||!['confirmed','review','example'].includes(status)||
   !/^\d{4}-\d{2}-\d{2}$/.test(today)||
   !ALL_PROMPTS.some(p=>p.id===id&&p.kind==='speak'&&!p.bossOnly))return null;
 const due=addDays(today,1);
 const previous=save.transferReviews?.[id];
 const scheduled=previous?.due&&previous.due<due?previous.due:due;
 return {...save,
  transferReviews:{...(save.transferReviews||{}),[id]:{due:scheduled,status}},
  reviewPrompts:{...(save.reviewPrompts||{}),[id]:
   save.reviewPrompts?.[id]&&save.reviewPrompts[id]<scheduled?save.reviewPrompts[id]:scheduled}};
}

export function dueRoleplayTransfers(save,today=dayKey()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today))return [];
 return Object.entries(save?.transferReviews||{}).flatMap(([id,entry])=>{
  const prompt=ALL_PROMPTS.find(p=>p.id===id&&p.kind==='speak'&&!p.bossOnly);
  return prompt&&entry?.due<=today&&['confirmed','review','example'].includes(entry.status)?
   [{prompt,due:entry.due,status:entry.status}]:[];
 }).sort((a,b)=>a.due.localeCompare(b.due)||a.prompt.id.localeCompare(b.prompt.id));
}
