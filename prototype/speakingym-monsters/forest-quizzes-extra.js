// Twelve additional authored topics for Beginning Forest, each with three
// level-specific tasks. The same topic changes its language target as the
// difficulty rises; it is not the same blank repeated with longer filler.
const LEVELS = ['easy', 'normal', 'hard'];
const ENGLISH_TASK = {
  vocab: 'Choose the word that best completes the sentence in this situation.',
  grammar: 'Arrange the words into a natural English sentence.'
};

// The tiles are generated from the *authored* canonical answer to prevent a
// typo in the tiles from making a valid grammar question impossible to solve.
function wordTiles(answer) {
  const words = answer.replace(/[.!?]$/, '').split(' ');
  return [...words.filter((_, i) => i % 2 === 1).reverse(), ...words.filter((_, i) => i % 2 === 0).reverse()];
}

const TOPICS = [
  {
    id: 'bill', kind: 'vocab', phraseId: 'price',
    levels: [
      {scene:'レストラン', cue:'食事が終わったので、お会計をお願いしよう。 Could we have the _____, please?', answer:'bill', options:['menu','bill','tip'], hint:'支払う金額をまとめた紙を指す名詞。', tip:'bill は請求書・お会計。menu はメニュー、tip は追加で渡す心づけ。'},
      {scene:'A restaurant bill', cue:'A restaurant has added an extra fee for table service. The bill includes a service _____.', answer:'charge', options:['receipt','charge','discount'], hint:'service とセットで「追加料金」を表す語。', tip:'service charge はサービス料。discount は値引きなので請求額が増える状況とは逆。'},
      {scene:'A group reservation', cue:'Your party has eight guests, and the restaurant adds ten percent to the listed total. The bill includes a group _____.', answer:'surcharge', options:['surcharge','discount','deposit'], hint:'基本料金の上に加算される費用を指す語。', tip:'surcharge は追加料金。discount は割引、deposit は予約時などに預ける前金。'}
    ]
  },
  {
    id:'route', kind:'vocab', phraseId:'direction',
    levels:[
      {scene:'道案内', cue:'角を右に曲がるように案内された。 Please _____ right at the corner.', answer:'turn', options:['cross','turn','pass'], hint:'角で進行方向を右に変える動詞。', tip:'turn right は右に曲がる。cross は横断する、pass は通り過ぎる。'},
      {scene:'Walking through town', cue:'Two streets meet at the traffic lights. Turn left at the next _____.', answer:'intersection', options:['platform','intersection','entrance'], hint:'道路が交わる場所を表す名詞。', tip:'intersection は交差点。platform は乗り場、entrance は入口。'},
      {scene:'A road closure', cue:'The bridge is closed for repairs, so the sign directs drivers along a longer alternative route. Follow the signed _____.', answer:'detour', options:['shortcut','transfer','detour'], hint:'工事などで通常の道を避けて通る迂回路。', tip:'detour は迂回路。shortcut は近道で、この場面の「通行止めによる別ルート」とは違う。'}
    ]
  },
  {
    id:'allergy', kind:'vocab', phraseId:'order',
    levels:[
      {scene:'食事の相談', cue:'ピーナッツを食べると体調を崩す。 I am _____ to peanuts.', answer:'allergic', options:['allergic','hungry','spicy'], hint:'食物アレルギーを伝える形容詞。', tip:'be allergic to ... は「〜にアレルギーがある」。hungry は空腹、spicy は辛い。'},
      {scene:'Checking a menu', cue:'Before ordering, you want to know everything used to make the dish. Could you tell me the _____?', answer:'ingredients', options:['portions','ingredients','utensils'], hint:'料理を作るときに使うものの一覧。', tip:'ingredients は原材料。portions は一人分などの量、utensils は調理器具。'},
      {scene:'A severe food allergy', cue:'The kitchen uses the same cutting board for nuts and other food, creating a risk even if the dish has no nuts listed. Ask about cross-_____.', answer:'contamination', options:['contamination','reservation','preparation'], hint:'別の食材が意図せず混ざること。', tip:'cross-contamination は交差接触・意図しない混入。原材料表にないアレルゲンにも注意が必要。'}
    ]
  },
  {
    id:'timing', kind:'vocab', phraseId:'late',
    levels:[
      {scene:'電車の遅れ', cue:'列車は運行しているが10分遅れている。 There is a ten-minute _____.', answer:'delay', options:['delay','cancellation','departure'], hint:'中止ではなく、予定より遅れること。', tip:'delay は遅延。cancellation は運休・中止、departure は出発。'},
      {scene:'A late appointment', cue:'The doctor is unavailable today, but the appointment will happen next week instead. It has been _____.', answer:'postponed', options:['confirmed','postponed','canceled'], hint:'なくなるのではなく、後の日程にずれる。', tip:'postponed は延期された。canceled は中止された、confirmed は確定した。'},
      {scene:'Changing a meeting', cue:'You cannot attend the original meeting on Tuesday, and you want to agree on a new date instead. Could we _____ it for Thursday?', answer:'reschedule', options:['reschedule','confirm','refund'], hint:'新しい日時を決め直す動詞。', tip:'reschedule は日程を組み直す。postpone は単に後に延ばすことで、新しい日程を決めない場合もある。'}
    ]
  },
  {
    id:'hotel', kind:'vocab', phraseId:'booking',
    levels:[
      {scene:'ホテル予約', cue:'今夜泊まれる部屋があるか確認したい。 Is a room _____ tonight?', answer:'available', options:['available','occupied','closed'], hint:'空いていて使える状態を表す語。', tip:'available は利用可能・空きがある。occupied は使用中・満室側の意味。'},
      {scene:'Hotel facilities', cue:'The hotel provides breakfast to guests at no extra cost. Breakfast is _____.', answer:'complimentary', options:['mandatory','complimentary','refundable'], hint:'ホテルで「無料サービスとして付く」と言うときの形容詞。', tip:'complimentary はサービスとして無料の。mandatory は義務的な、refundable は返金可能な。'},
      {scene:'Reading booking conditions', cue:'The discounted hotel rate will not return any money if you cancel, even a month in advance. The rate is _____.', answer:'non-refundable', options:['transferable','complimentary','non-refundable'], hint:'キャンセル後に代金が戻らない予約条件。', tip:'non-refundable は返金不可。transferable は他人などに譲渡できる、complimentary は無料サービス。'}
    ]
  },
  {
    id:'details', kind:'vocab', phraseId:'clarify',
    levels:[
      {scene:'予約の確認', cue:'予約が確かに入っているか確認したい。 Could you _____ my booking?', answer:'confirm', options:['cancel','confirm','forget'], hint:'予約が確定しているか確かめる動詞。', tip:'confirm a booking は予約を確認・確定する。cancel は取り消す。'},
      {scene:'Asking for an explanation', cue:'An email says "come early," but you do not know how many minutes early. Could you _____ what you mean by "early"?', answer:'clarify', options:['estimate','clarify','translate'], hint:'あいまいな説明をより明確にする動詞。', tip:'clarify ははっきり説明する。estimate は概算する、translate は翻訳する。'},
      {scene:'Confirming requirements', cue:'The form says "bring identification," but you need to know which exact documents are accepted. Could you _____ which types of ID are valid?', answer:'specify', options:['specify','predict','guarantee'], hint:'一般的な説明から、対象を具体的に指定する動詞。', tip:'specify は具体的に明示する。predict は予測する、guarantee は保証する。'}
    ]
  },
  {
    id:'embedded-direction', kind:'grammar', phraseId:'direction',
    levels:[
      {scene:'駅を探す', cue:'「最寄りの駅はどこですか？」を英文にしよう。', answer:'Where is the nearest station?', hint:'Where のあとに be動詞を置こう。', tip:'直接疑問文は Where + is + 主語 ? の順。nearest は「最寄りの」。'},
      {scene:'Finding a station', cue:'Ask politely if someone can tell you where the nearest station is.', answer:'Could you tell me where the nearest station is?', hint:'Could you tell me のあとは、where + 主語 + 動詞。', tip:'間接疑問文では where is the station ではなく where the station is の語順になる。'},
      {scene:'Catching a late train', cue:'You need to find the place where you can board the last train. Ask a staff member politely using an indirect question.', answer:'Could you tell me where I can catch the last train?', hint:'疑問文全体は Could you ...?、埋め込む部分は where I can ...。', tip:'where I can catch ... は間接疑問文の平叙文語順。where can I catch ... にはしない。'}
    ]
  },
  {
    id:'diet', kind:'grammar', phraseId:'order',
    levels:[
      {scene:'食べられないもの', cue:'「私は肉を食べません」を英文にしよう。', answer:"I don't eat meat.", hint:"現在の習慣を否定するときは I don't ...。", tip:"I don't eat meat. は日頃の食習慣。I'm not eating meat. は今だけ食べていない場合にも使う。"},
      {scene:'Reading a restaurant menu', cue:'Ask whether a dish contains any meat.', answer:'Does this dish contain any meat?', hint:'三人称単数 this dish を主語にする疑問文。', tip:'Does + 主語 + 動詞の原形。Does を使うので contain に -s を付けない。'},
      {scene:'Checking a hidden ingredient', cue:'The sauce ingredients are not on the menu. Politely ask the server to check whether it contains any meat.', answer:'Could you check whether this sauce contains any meat?', hint:'Could you check whether ... のあとに平叙文語順を置く。', tip:'whether this sauce contains ... は間接疑問文。this sauce は単数なので contains。'}
    ]
  },
  {
    id:'meet', kind:'grammar', phraseId:'change',
    levels:[
      {scene:'待ち合わせ', cue:'「明日会えますか？」を英文にしよう。', answer:'Can we meet tomorrow?', hint:'Can + 主語 + 動詞の原形 + 時間。', tip:'Can we meet ...? は予定を相談するときに使える。meet の後ろに tomorrow を置く。'},
      {scene:'Suggesting a meeting', cue:'Ask whether tomorrow afternoon would be convenient for the other person.', answer:'Would tomorrow afternoon work for you?', hint:'予定が相手にとって都合がよいか聞く work for you。', tip:'Would + 日時 + work for you? で都合を丁寧に確認できる。'},
      {scene:'Offering another date', cue:'You prefer Friday, but if Friday is too busy, suggest Monday instead in one conditional question.', answer:'If Friday is too busy, could we meet on Monday instead?', hint:'If + 条件、could we + 提案の形。', tip:'If Friday is too busy が条件節、could we meet ... が提案。instead は「代わりに」。'}
    ]
  },
  {
    id:'forgot', kind:'grammar', phraseId:'apology',
    levels:[
      {scene:'忘れ物', cue:'「切符を忘れました」を英文にしよう。', answer:'I forgot my ticket.', hint:'forget の過去形は forgot。', tip:'過去に忘れたことを伝えるので forgot。my ticket は忘れた物。'},
      {scene:'At the station gate', cue:'Apologize for forgetting to bring your ticket.', answer:"I'm sorry I forgot to bring my ticket.", hint:"I'm sorry + 主語 + 過去形 で理由を伝える。", tip:'forgot to bring は「持ってくるのを忘れた」。forgot bringing は「持ってきたこと自体を忘れた」と違う意味。'},
      {scene:'Explaining a missed document', cue:'Make a formal apology for not bringing the reservation confirmation to check-in.', answer:'I apologize for forgetting to bring the booking confirmation.', hint:'apologize for の後ろは -ing の動名詞。', tip:'apologize for + 動名詞。forgetting to bring と続けると「持参し忘れたことを謝る」。'}
    ]
  },
  {
    id:'included', kind:'grammar', phraseId:'price',
    levels:[
      {scene:'朝食の料金', cue:'「朝食は料金に含まれていますか？」を英文にしよう。', answer:'Is breakfast included in the price?', hint:'受け身は be動詞 + 過去分詞。', tip:'be included は「料金などに含まれている」。breakfast が主語なので Is。'},
      {scene:'Asking about hotel costs', cue:'Ask whether the listed price includes breakfast.', answer:'Does the price include breakfast?', hint:'Does + the price + 動詞の原形。', tip:'the price が単数なので Does。疑問文内の動詞は includes でなく include。'},
      {scene:'Clarifying an accommodation offer', cue:'Politely ask for confirmation of whether breakfast is included in the advertised price.', answer:'Could you confirm whether breakfast is included in the price?', hint:'confirm whether のあとに breakfast is included ...。', tip:'whether 以下は平叙文語順。is included は受け身で「含まれている」。'}
    ]
  },
  {
    id:'wifi', kind:'grammar', phraseId:'problem',
    levels:[
      {scene:'ホテルのWi-Fi', cue:'「Wi-Fiが使えません」を英文にしよう。', answer:'The Wi-Fi is not working.', hint:'現在の状態を is not working で表そう。', tip:'is not working は「今、正常に動いていない」。機器・通信の不調によく使う。'},
      {scene:'Reporting a persistent problem', cue:'Tell the front desk the Wi-Fi has not worked since yesterday.', answer:'The Wi-Fi has not worked since yesterday.', hint:'昨日から今まで続くので現在完了形。', tip:'has not worked since yesterday で「昨日からずっと使えない」。since は起点を示す。'},
      {scene:'Describing a technical issue', cue:'Explain that even after restarting the router, the internet connection is still unstable.', answer:'Although I restarted the router, the connection is still unstable.', hint:'Although + 過去の行動、現在も続く状態。', tip:'Although は「〜したにもかかわらず」。restart は過去形、is still unstable は現在の状態。'}
    ]
  }
];

export const EXTRA_FOREST_QUIZZES = Object.freeze(TOPICS.flatMap(topic => topic.levels.map((level, index) => {
  const difficulty = LEVELS[index];
  const baseId = `forest-${topic.kind}-${topic.id}`;
  return Object.freeze({
    id: `${baseId}-${difficulty}`,
    baseId,
    phraseId: topic.phraseId,
    kind: topic.kind,
    difficulty,
    scene: level.scene,
    cue: level.cue,
    ...(difficulty === 'easy' ? {} : {task: ENGLISH_TASK[topic.kind]}),
    answer: level.answer,
    ...(topic.kind === 'vocab' ? {options: level.options} : {tokens: wordTiles(level.answer)}),
    hint: level.hint,
    tip: level.tip
  });
})));
