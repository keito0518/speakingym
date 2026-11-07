// Human-authored, task-specific coaching for the 3-turn conversations.
// This uses only confirmed task results, registered variants and hint/skip
// state. It never guesses pronunciation, fluency or unverified grammar issues.
export const ROLEPLAY_LESSONS=Object.freeze({
 'prefer-window':{
  skill:'席の希望を伝える',start:"I'd prefer ...",
  why:'希望を押し付けず、どの席がいいかを相手に伝えるのがポイント。',
  stretch:'窓際ではなく静かな席がいい場面でも、同じ意図を別の言い方で伝えてみよう。'
 },
 'problem-food':{
  skill:'料理の行き違いを伝える',start:'I ordered ...',
  why:'まず注文と違う点を伝え、必要なら交換などの希望を続けると話が進む。',
  stretch:'次は「注文したのは別の料理です」を、焦らず最初の一文で言ってみよう。'
 },
 'clarify-charge':{
  skill:'会計の金額を確認する',start:'Just to check, ...',
  why:'金額や追加料金など、確認したい箇所を具体的に言うと答えてもらいやすい。',
  stretch:'別の請求額でも、確認したい数字や料金の種類を一言入れてみよう。'
 },
 'problem-ticket':{
  skill:'電子チケットの問題を説明する',start:"I haven't received ...",
  why:'「支払ったか」「何が届いていないか」を分けると、駅員が調べやすくなる。',
  stretch:'チケットが届かない理由を説明したあと、確認してほしいことも添えてみよう。'
 },
 'help-locker':{
  skill:'ロッカーの手助けを頼む',start:'Could you help me ...',
  why:'困っていることと手伝ってほしい行動を一緒に伝えるのがコツ。',
  stretch:'次はロッカーが開かないことを先に伝え、手助けを丁寧にお願いしてみよう。'
 },
 'repeat-announcement':{
  skill:'聞き取れなかった案内を聞き返す',start:'Could you repeat ...',
  why:'聞き返すだけでなく、ホームや時刻など知りたい部分を指定すると実用的。',
  stretch:'今度は「何番ホームか」を指定して、もう一度聞いてみよう。'
 },
 'booking-hotel':{
  skill:'ホテルの部屋を予約する',start:"I'd like to book ...",
  why:'泊数・人数・到着時間など、予約に必要な条件をはっきり伝えると行き違いを防げる。',
  stretch:'次は泊数や到着時刻を変えて、予約の希望を一文にまとめてみよう。'
 },
 'apology-noise':{
  skill:'騒音について謝る',start:"I'm sorry about ...",
  why:'まず謝罪を伝え、必要ならこれからどうするかを添えると気持ちが伝わりやすい。',
  stretch:'次は謝罪のあとに「今夜は静かにします」と一言続ける練習をしよう。'
 },
 'clarify-hotel':{
  skill:'チェックアウト条件を確認する',start:'Just to make sure, ...',
  why:'時間が食い違う場合は、予約内容と案内された時刻を分けて確認すると明確になる。',
  stretch:'次は違う時刻を聞いた設定で、どちらが正しいか確認してみよう。'
 },
 'city-market-speak-order':{
  skill:'飲み物を注文する',start:'Could I have ...',
  why:'数・持ち帰りかどうか・砂糖の有無など、必要な条件を短く続けられると便利。',
  stretch:'今度は飲み物の数や甘さの条件を変えて注文してみよう。'
 },
 'city-market-speak-bill':{
  skill:'追加料金について質問する',start:'Could you explain ...',
  why:'「料金が違う」だけでなく、どの項目を説明してほしいか伝えると具体的。',
  stretch:'次は領収書の一項目を指しながら、料金の理由を尋ねてみよう。'
 },
 'city-market-speak-return':{
  skill:'買った商品の問題を伝える',start:'This is broken ...',
  why:'壊れた箇所と、交換などしてほしいことを分けて話すと伝わりやすい。',
  stretch:'次は壊れた箇所を一つ具体的に言い、交換できるか聞いてみよう。'
 }
});

export function roleplayCoachingFor(turn,{status='skipped',branch='standard'}={}){
 const lesson=ROLEPLAY_LESSONS[turn?.baseId]||{
  skill:'この場面の用件を伝える',start:'最初の数語',
  why:'相手に必要な情報を具体的に伝えると会話が進む。',
  stretch:'次は同じ用件を別の短い言い方でも試そう。'
 };
 const observed=status==='smooth'
  ?branch==='alternate'?`「${lesson.skill}」を、教材に登録された言い換えで自力確認できたよ。`:
   `「${lesson.skill}」の用件を、教材の基準で自力確認できたよ。`
  :status==='hint'?`ヒントを使って「${lesson.skill}」の用件を確認できたよ。ヒントなしで言えるかは次回の挑戦。`:
   `「${lesson.skill}」は例文で確認した段階。自分で話せたかはまだ判定していないよ。`;
 const next=status==='smooth'?lesson.stretch:
  status==='hint'?`次はヒントを開かずに、冒頭の「${lesson.start}」から全文を思い出してみよう。`:
  `まず「${lesson.start}」を例文を見ずに言うところから始めよう。`;
 return {observed,why:lesson.why,next};
}
