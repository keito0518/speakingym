// Two small hints for authored tasks. Neither step reveals the model answer;
// requesting either marks the response as assisted in the existing XP/recall flow.
export function speakingHintSteps(prompt,phrase){
 const thinking=(prompt?.tip||phrase?.tip||'場面に必要な情報を一つずつ整理しよう。').trim();
 const opening=(prompt?.hint||phrase?.hint||'短い英語の一文から始めてみよう。').trim();
 return Object.freeze([
  Object.freeze({label:'ヒント 1 · 考え方',detail:thinking}),
  Object.freeze({label:'ヒント 2 · 英語の書き出し',detail:opening})
 ]);
}
