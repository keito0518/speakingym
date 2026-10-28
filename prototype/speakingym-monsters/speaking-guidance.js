// Two small hints for authored tasks. Neither step reveals the model answer;
// requesting either marks the response as assisted in the existing XP/recall flow.
// Phrase-level teaching tips often encourage advanced elaboration ("give a
// reason", "suggest another action"). Easy mode must teach its *own* simple
// communicative goal instead of accidentally demanding normal/hard details.
const EASY_THINKING=Object.freeze({
 think:'少し考える時間がほしいと、一文で伝えよう。',
 repeat:'聞き取れなかったので、もう一度お願いしよう。',
 agree:'相手の提案で大丈夫だと、短く伝えよう。',
 late:'遅れることを伝えよう。何分と指定されていたら数字も忘れずに。',
 clarify:'合っているかを短く質問しよう。時間や金額は正確に。',
 prefer:'自分の希望を一つ選んで伝えよう。理由はなくても大丈夫。',
 help:'どんな手助けがほしいかを、短くお願いしよう。',
 order:'欲しい物を伝えて、丁寧に注文しよう。',
 direction:'行きたい場所の名前を入れて、道を尋ねよう。',
 recommend:'おすすめを尋ねよう。条件が指定されていたら忘れずに。',
 booking:'何を予約したいかを伝えよう。人数や日時があれば一緒に。',
 apology:'まず短く謝ろう。今は理由や次の行動まで説明しなくて大丈夫。',
 decline:'断る気持ちを丁寧に一文で伝えればOK。',
 price:'何の料金かを添えて、いくらか尋ねよう。',
 change:'どんな変更をしたいか、短く伝えよう。',
 problem:'何が困っているかを一つだけ伝えてみよう。'
});
export function speakingHintSteps(prompt,phrase){
 const easy=(!prompt?.difficulty||prompt.difficulty==='easy')&&prompt.kind==='speak';
 const thinking=((easy&&!prompt.bossOnly&&EASY_THINKING[prompt.phraseId])||prompt?.tip||phrase?.tip||'場面に必要な情報を一つずつ整理しよう。').trim();
 const opening=(prompt?.hint||phrase?.hint||'短い英語の一文から始めてみよう。').trim();
 return Object.freeze([
  Object.freeze({label:'ヒント 1 · 考え方',detail:thinking}),
  Object.freeze({label:'ヒント 2 · 英語の書き出し',detail:opening})
 ]);
}
