// Local, authored teaching support for every objective Forest quiz.
// Short cues are safe to reveal after a wrong try; the full answer and
// contextual comparison appear only when the learner chooses the explanation.
// No AI calls, remote scoring, or claims about free-form pronunciation.
const LESSONS=Object.freeze({
  'forest-vocab-ticket': ['動詞が「買う・取り消す・返金する」のどれを表すか、場面から判断しよう。','buy a ticket / cancel a ticket / request a refund のように、行動によって使い分けよう。'],
  'forest-vocab-order': ['丁寧な注文では、相手に物を頼む自然な動詞を選ぼう。','Could I have a coffee? は注文。Can I borrow ...? は借りるときの表現。'],
  'forest-vocab-transfer': ['電車に乗る・乗り損ねる・乗り換えるはそれぞれ違う行動。','change trains は乗り換える、board a train は乗車する、miss a train は乗り遅れる。'],
  'forest-vocab-appointment': ['新しい予約を取るのか、既存の予約を変更・確認するのか区別しよう。','make an appointment は新規予約、confirm an appointment は予約の確認。'],
  'forest-vocab-refund': ['返金・交換品・レシートのどれが必要か、目的から判断しよう。','a refund はお金を戻してもらうこと、a replacement は別の商品との交換。'],
  'forest-vocab-recommend': ['おすすめを尋ねるのか、自分の好みを伝えるのかに注意。','What do you recommend? はおすすめを聞く。I prefer ... は好みを述べる。'],
  'forest-vocab-bill': ['金額が増える理由か、減る理由か、追加料金かを見極めよう。','service charge はサービス料、surcharge は追加料金、discount は値引き。'],
  'forest-vocab-route': ['道案内は場所を示す名詞と、移動を指示する動詞を区別しよう。','intersection は交差点、turn は曲がる、detour は迂回路・迂回すること。'],
  'forest-vocab-allergy': ['アレルギーの有無、原材料、混入リスクは別々に伝える。','be allergic to ... はアレルギーがある、ingredients は原材料、contamination は混入・汚染。'],
  'forest-vocab-timing': ['遅延・延期・日程変更・中止は同じ意味ではない。','delay は遅れ、postpone は延期、reschedule は日程の再設定。'],
  'forest-vocab-agreement': ['一人の賛成、日程の合意、集団全体の一致では表現が変わる。','agree with a plan / agree on a date / reach a consensus を場面に合わせて使い分けよう。'],
  'forest-vocab-preference': ['動詞 prefer、would rather、名詞 preference の後に続く形を確認しよう。','prefer A to B / would rather + 動詞の原形 / my preference would be ... の三つで好みを伝えられる。'],
  'forest-vocab-arrival-update': ['「遅れている」「遅れて運行中」「何分遅延」と、情報の具体性に応じた表現を使おう。','be late / run behind schedule / be delayed by twenty minutes は遅延の程度を説明する。'],
  'forest-vocab-suggestion': ['一般的なおすすめ・提案・強い推奨で、自然な動詞と副詞を選ぼう。','recommend a restaurant / suggest visiting a market / highly recommend a walk のように続く形が変わる。'],
  'forest-vocab-hotel': ['利用可能か、無料か、払い戻せるかを切り分けよう。','available は利用可能、complimentary は無料サービス、non-refundable は返金不可。'],
  'forest-vocab-details': ['確認・明確化・具体的な指定は、相手への依頼内容が違う。','confirm は確認、clarify は明確にする、specify は具体的に指定する。'],
  'city-vocab-city-schedule': ['日時の変更は change と reschedule を区別して使う。','change my booking to Friday / reschedule my appointment / has been rescheduled for Thursday の順に応用しよう。'],
  'city-vocab-city-platform': ['駅のホーム・乗換・代替ルートのどれが必要かを場面から判断しよう。','Which platform? / Where do I transfer? / Is there an alternative route? を交通トラブルで使い分ける。'],
  'city-grammar-city-clarification': ['丁寧な依頼の中に入る疑問詞節の語順に気をつけよう。','Could you explain ...? / Could you tell me why ...? / Would you mind explaining why ...? と丁寧さを上げられる。'],
  'city-grammar-city-arrangement': ['Can we と Would it be possible to の違いを押さえ、条件を加えよう。','Can we meet ...? / Would it be possible to move ...? / If ..., could we reschedule ...? を状況に合わせて使う。'],
  'forest-grammar-yesterday': ['過去の出来事なら動詞を過去形にし、誰が何をしたかを先に組み立てよう。','I met my friend yesterday. では met が meet の過去形。時間は文末に置ける。'],
  'forest-grammar-help': ['丁寧な依頼は Could you + 動詞の原形 ...? が基本。','Could you help me? のあとに with this bag などを足して対象を伝えられる。'],
  'forest-grammar-arrive': ['「何分遅れるか」は late の前。ten minutes late のひとかたまりで考えよう。','I will be ten minutes late. が自然。I will be late ten minutes. の語順は不自然。an hour late も同じ形。'],
  'forest-grammar-reservation': ['予約を変更してほしいときは Could I + 動詞の原形 ...? の順。','Could I change my reservation? に to Friday などを添えると変更先が伝わる。'],
  'forest-grammar-price': ['疑問文は How much + do/does + 主語 + 動詞の原形 ...? の形。','How much does this cost? と How much do two tickets cost? を主語の数で使い分ける。'],
  'forest-grammar-decline': ['断る内容を主語・助動詞・動詞の順に並べ、必要なら丁寧な前置きを足す。','I cannot come tonight. は行けないという意味。I am afraid ... を添えると柔らかい。'],
  'forest-grammar-embedded-direction': ['直接の質問と、「どこか教えて」の中に入る間接疑問文は語順が違う。','Where is the station? だが、Could you tell me where the station is? は where + 主語 + is。'],
  'forest-grammar-diet': ['普段の習慣と今だけの状態、直接質問と間接質問を区別しよう。','I do not eat meat. は普段の習慣。Does this dish contain meat? は Does の後が動詞の原形。'],
  'forest-grammar-meet': ['日時を提案するときは、助動詞のあとに主語と動詞を並べよう。','Can we meet tomorrow? / Would tomorrow work for you? はどちらも日程を相談する表現。'],
  'forest-grammar-forgot': ['忘れた出来事は過去形。忘れた物と、し忘れた動作は言い方が違う。','I forgot my ticket. は物を忘れた。I forgot to bring my ticket. は持参し忘れた。'],
  'forest-grammar-included': ['「含まれる」は受け身の be included、または include を使う。','Is breakfast included in the price? と Does the price include breakfast? は主語が違う。'],
  'forest-grammar-wifi': ['今の不具合・昨日から続く不具合・逆接を含む説明で時制を使い分けよう。','The Wi-Fi is not working. は今の不具合。It has not worked since yesterday. は昨日から継続。'],
  'city-market-exchange':['同じ商品を別サイズに交換するのか、故障品の交換・返金なのか区別しよう。','exchange this for a medium はサイズ交換、request a replacement は不良品の代替品を頼むとき。'],
  'city-market-receipt':['支払いの記録、返金、品目ごとの内訳は目的によって英語が違う。','a receipt は購入証明、a refund は返金、an itemized receipt は料金を一つずつ示す控え。'],
  'city-market-allergy':['直接疑問文から間接疑問文へ移るときの語順と丁寧な依頼表現を確かめよう。','Does this contain nuts? を Could you tell me whether ...? や Would you mind checking ...? に変えてみよう。'],
  'city-market-extra-charge':['追加料金の有無を確かめ、理由と内訳を別々に尋ねる練習をしよう。','Is this the final price? から Could you explain why ...? に進み、必要なら itemized receipt を頼もう。'],
  'city-terminal-connections':['乗り換えそのもの・乗り継ぎ時間・代替交通の違いを聞き分けよう。','transfer は乗り換える動作、connection は乗り継ぎ、replacement transport は代替の交通手段。'],
  'city-terminal-services':['少し遅れるのか、1便が運休なのか、路線全体が止まっているのか区別しよう。','A train is delayed / a service is cancelled / trains are suspended では対応がそれぞれ変わる。'],
  'city-terminal-platform-question':['どのホームかを尋ねる直接質問から、丁寧な間接質問へ言い換えてみよう。','Which platform is it? → Could you tell me which platform ...? と進め、whether で以前の情報も確認。'],
  'city-terminal-ticket-change':['変更できるかを尋ねるときは、変更する対象と新しい日付を具体的にしよう。','Can I change my ticket? と If the train is cancelled, could I use my ticket tomorrow? を使い分けよう。'],
  'city-blizzard-shelter':['安全な場所・暖房付きの待合室・緊急事態のどれを話しているか確認しよう。','We need shelter. / Is there a heated waiting area? / This is an emergency. の意味の違いを整理。'],
  'city-blizzard-road-closure':['単なる通行止め、迂回路、通行不可能な状態の違いを考えよう。','The road is closed. なら detour を尋ね、impassable の場合は安全な代案を優先しよう。'],
  'city-blizzard-safe-help':['助けを求める短い質問から、理由と具体的な依頼まで英語で組み立てよう。','Could you help me? → Could you tell me where I can wait? → As ..., could you suggest ...? と発展。'],
  'city-blizzard-postpone':['延期やオンラインへの変更は、理由・条件・具体的な代替案を組み合わせて伝えよう。','Can we meet later? から Since the buses are not running, could we meet online? に応用してみよう。']
});

const LEVEL_CUES=Object.freeze({
  'forest-grammar-price-hard':'two adult tickets が複数形なので does ではなく do。do の後の cost に -s は付けない。',
  'forest-grammar-embedded-direction-normal':'Could you tell me ...? の中では where the nearest station is の順にする。',
  'forest-grammar-embedded-direction-hard':'where I can catch ... は間接疑問文。where can I catch ... という疑問文語順にしない。',
  'forest-grammar-diet-hard':'whether 以下は平叙文語順。this sauce は単数なので contains を使う。',
  'forest-grammar-forgot-hard':'apologize for の後には forgetting のような動名詞を続ける。',
  'forest-grammar-included-hard':'whether breakfast is included ... は間接疑問文なので、is breakfast と倒置しない。',
  'forest-grammar-wifi-hard':'Although は逆接、restarted は過去の操作、is still unstable は現在の状態を示す。'
});

export function quizTeachingFor(prompt){
  if(!prompt||!['vocab','grammar'].includes(prompt.kind))return null;
  const base=LESSONS[prompt.baseId||prompt.id];
  if(!base)throw Error(`Missing authored quiz explanation for ${prompt.id}`);
  return {
    label:prompt.kind==='grammar'?'なぜこの語順になる？':'なぜこの単語を使う？',
    clue:LEVEL_CUES[prompt.id]||base[0],
    detail:prompt.tip,
    transfer:base[1]
  };
}
