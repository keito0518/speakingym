// Optional post-answer paraphrase practice. It never awards XP, changes the
// conversation, or claims to evaluate pronunciation from typed words.
import { gradeLocalResponse } from './monster-grader.js';
import { normalizeEnglish } from './monster-engine.js';
import { conversationFeedbackFor } from './speaking-feedback.js';

export function conversationPolishFor(prompt,attempt,{originalAnswer=''}={}){
 if(!prompt||!['speak','read'].includes(prompt.kind))return null;
 const answer=String(attempt||'').trim();
 if(!answer)return {status:'empty',headline:'まず英語を一文入力してみよう',confirmed:false,
  checked:[],tip:'短い英文でも大丈夫。参考例を見ながら言い換えてみよう。'};
 if(originalAnswer.trim()&&normalizeEnglish(answer)===normalizeEnglish(originalAnswer))return {
  status:'same',headline:'同じ英文だね。別の言い方も試そう',confirmed:false,
  checked:[],tip:'意味はそのままで、文の始め方や丁寧な言い方を変えてみよう。'
 };
 const grade=gradeLocalResponse(prompt,answer);
 const feedback=conversationFeedbackFor(prompt,answer,grade,{revealExample:true});
 const status=grade.status;
 const headline=status==='correct'?'別の言い方も教材で確認できた！':
  status==='incomplete'?'必要な情報をもう一つ確認しよう':
  status==='incorrect'?'場面の条件と違う部分を見直そう':
  'この言い方は簡易判定では確認できないよ';
 return {
  status,headline,confirmed:status==='correct',
  checked:feedback?.checked||[],
  // A specific correction applies to a known phrase only. Otherwise, an
  // authored scenario hint is a suggestion, not an invented error diagnosis.
  tip:feedback?.correction?.clue||grade.coaching||feedback?.tip||feedback?.next||'参考例と比べてみよう。'
 };
}
