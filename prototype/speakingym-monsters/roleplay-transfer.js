// A scene-changing bonus question after a three-turn conversation. Both the
// original and destination tasks are vetted, difficulty-matched speaking
// prompts about the same phrase skill, but set in different situations.
// Practice is deliberately ephemeral and never grants XP or changes progress.
import { ALL_PROMPTS } from './monster-data.js';
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
 if(!text)return {status:'empty',headline:'まず英語でひと言試そう',
  checked:[],missing:[],next:'場面を読んで、短い英文でもいいので入力してみよう。',example:revealed?challenge.prompt.answer:null};
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
