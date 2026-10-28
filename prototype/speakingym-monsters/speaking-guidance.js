// Beginner speech uses a single-word scaffold, followed by optional full-sentence
// practice. More advanced tasks retain two non-answer explanatory hints.
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
const CLOZE_TARGETS=Object.freeze({
 'prefer-window-easy':'window',
 'boss-delay-apology-easy':'late',
 'clarify-hotel':'eleven',
 'late-traffic-easy':'five',
 'repeat-announcement-easy':'again',
 'agree-location-easy':'station',
 'clarify-charge-easy':'thirty'
});
const SKIP_WORDS=new Set(['a','an','the','i','i\'m','i\'d','my','you','we','our','to','for','of','at','in','on','by','is','are','am','be','was','were','have','has','had','can','could','would','will','do','does','did','please','this','that','it','and','or','but','with','not']);
export function beginnerClozeFor(prompt){
 if(!prompt||prompt.kind!=='speak'||(prompt.difficulty&&prompt.difficulty!=='easy')||typeof prompt.answer!=='string')return null;
 const tokens=[...prompt.answer.matchAll(/[a-z]+(?:'[a-z]+)?|[0-9]+/gi)];
 const expected=CLOZE_TARGETS[prompt.id];
 const target=(expected&&tokens.find(token=>token[0].toLowerCase()===expected))||
   [...tokens].reverse().find(token=>token[0].length>2&&!SKIP_WORDS.has(token[0].toLowerCase()));
 if(!target)return null;
 const template=prompt.answer.slice(0,target.index)+'____'+prompt.answer.slice(target.index+target[0].length);
 return Object.freeze({template,word:target[0].toLowerCase()});
}
export function speakingHintSteps(prompt,phrase){
 const easy=(!prompt?.difficulty||prompt.difficulty==='easy')&&prompt.kind==='speak';
 const cloze=easy?beginnerClozeFor(prompt):null;
 if(cloze)return Object.freeze([Object.freeze({label:'穴埋めヒント · ここだけ言ってみよう',detail:'空欄に入る英単語を1つ声に出そう。できたら全文も言ってみよう。',cloze})]);
 const thinking=((easy&&!prompt.bossOnly&&EASY_THINKING[prompt.phraseId])||prompt?.tip||phrase?.tip||'場面に必要な情報を一つずつ整理しよう。').trim();
 const opening=(prompt?.hint||phrase?.hint||'短い英語の一文から始めてみよう。').trim();
 return Object.freeze([
  Object.freeze({label:'ヒント 1 · 考え方',detail:thinking}),
  Object.freeze({label:'ヒント 2 · 英語の書き出し',detail:opening})
 ]);
}
