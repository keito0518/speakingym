// A tiny, evidence-based learning takeaway shown only after a verified dungeon
// answer. Never turn a listening/choice result into a claim about pronunciation
// or infer speaking accuracy from a transcript.
import { conversationFeedbackFor } from './speaking-feedback.js';
import { quizTeachingFor } from './forest-teaching.js';
import { listeningChallengeFor } from './listening-challenges.js';

export function forestLearningPulseFor(prompt,grade,{answer='',hinted=false}={}){
  if(!prompt||grade?.status!=='correct')return null;
  const badge=hinted?'ヒントありで確認':'教材の基準で確認';
  if(prompt.kind==='listen'){
    const challenge=listeningChallengeFor(prompt);
    return {
      kind:'listen',badge,achievedLabel:'聞き取れた意味',
      achieved:challenge.options[challenge.correctIndex],
      tip:'音声の言い回しと、選んだ意味を結びつけよう。',
      next:'次は選択肢を見ずに、聞こえた内容を一言でまとめよう。'
    };
  }
  if(prompt.kind==='vocab'||prompt.kind==='grammar'){
    const teaching=quizTeachingFor(prompt);
    return {
      kind:prompt.kind,badge,achievedLabel:'確認できた答え',
      achieved:prompt.answer,
      tip:teaching.clue,
      next:teaching.transfer
    };
  }
  const feedback=conversationFeedbackFor(prompt,answer,grade,{hinted});
  if(!feedback)return null;
  return {
    kind:'speaking',badge,achievedLabel:'教材で確認した用件',
    achieved:feedback.target,
    tip:grade.coaching||feedback.tip||'自分の英文と参考例を比べて、言い回しを確かめよう。',
    next:feedback.variants.length?`次は「${feedback.variants[0]}」も使ってみよう。`:feedback.next
  };
}
