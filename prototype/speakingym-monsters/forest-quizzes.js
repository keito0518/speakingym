// Authored vocabulary and grammar combat for the Beginning Forest.
// Four skills share one battle; quiz scoring is exact and cannot call AI APIs.
// Option buttons and grammar tiles are purely local. Correctness is checked server-free.
export const FOREST_QUIZZES=Object.freeze([
  {
    "id": "forest-vocab-ticket-easy",
    "baseId": "forest-vocab-ticket",
    "phraseId": "help",
    "kind": "vocab",
    "difficulty": "easy",
    "scene": "駅の券売機",
    "cue": "駅で切符を買いたい。空欄に入る単語を選ぼう。 I need to _____ a ticket.",
    "answer": "buy",
    "options": [
      "buy",
      "borrow",
      "invite"
    ],
    "hint": "お金を払って入手する動詞を選ぼう。",
    "tip": "buy a ticket は『切符を買う』。borrow は借りる、invite は招待する。"
  },
  {
    "id": "forest-vocab-order-easy",
    "baseId": "forest-vocab-order",
    "phraseId": "order",
    "kind": "vocab",
    "difficulty": "easy",
    "scene": "カフェ",
    "cue": "カフェで飲み物を注文する。 Could I _____ a coffee?",
    "answer": "have",
    "options": [
      "have",
      "drive",
      "wear"
    ],
    "hint": "Could I ...? で注文するときによく使う動詞。",
    "tip": "Could I have ...? は自然で丁寧な注文表現。"
  },
  {
    "id": "forest-vocab-transfer-easy",
    "baseId": "forest-vocab-transfer",
    "phraseId": "direction",
    "kind": "vocab",
    "difficulty": "easy",
    "scene": "乗り換え",
    "cue": "電車を乗り換える。 I need to _____ trains.",
    "answer": "change",
    "options": [
      "change",
      "wash",
      "cook"
    ],
    "hint": "ここでは『変更する／乗り換える』という意味。",
    "tip": "change trains は『電車を乗り換える』。"
  },
  {
    "id": "forest-vocab-appointment-easy",
    "baseId": "forest-vocab-appointment",
    "phraseId": "booking",
    "kind": "vocab",
    "difficulty": "easy",
    "scene": "予約",
    "cue": "予約を取りたい。 I'd like to _____ an appointment.",
    "answer": "make",
    "options": [
      "make",
      "lose",
      "paint"
    ],
    "hint": "appointment と一緒によく使う動詞。",
    "tip": "make an appointment は『予約を取る』という定番表現。"
  },
  {
    "id": "forest-vocab-refund-easy",
    "baseId": "forest-vocab-refund",
    "phraseId": "problem",
    "kind": "vocab",
    "difficulty": "easy",
    "scene": "お店のトラブル",
    "cue": "間違った商品が届いた。返金を頼みたい。 I'd like a _____.",
    "answer": "refund",
    "options": [
      "refund",
      "receipt",
      "menu"
    ],
    "hint": "商品を返したときにお金を戻してもらうこと。",
    "tip": "refund は『返金』。receipt は領収書・レシート。"
  },
  {
    "id": "forest-vocab-recommend-easy",
    "baseId": "forest-vocab-recommend",
    "phraseId": "recommend",
    "kind": "vocab",
    "difficulty": "easy",
    "scene": "おすすめ",
    "cue": "相手におすすめを聞こう。 What do you _____?",
    "answer": "recommend",
    "options": [
      "recommend",
      "repair",
      "repeat"
    ],
    "hint": "『おすすめする』という動詞。",
    "tip": "recommend は『すすめる』。What do you recommend? とセットで覚えよう。"
  },
  {
    "id": "forest-grammar-yesterday-easy",
    "baseId": "forest-grammar-yesterday",
    "phraseId": "apology",
    "kind": "grammar",
    "difficulty": "easy",
    "scene": "昨日の出来事",
    "cue": "「昨日、友達に会った」を英文にしよう。",
    "answer": "I met my friend yesterday.",
    "tokens": [
      "met",
      "friend",
      "I",
      "my",
      "yesterday"
    ],
    "hint": "過去の話なので met を使い、主語から始めよう。",
    "tip": "meet の過去形は met。時間を表す語句は後半に置ける。"
  },
  {
    "id": "forest-grammar-help-easy",
    "baseId": "forest-grammar-help",
    "phraseId": "help",
    "kind": "grammar",
    "difficulty": "easy",
    "scene": "お願い",
    "cue": "「手伝ってもらえますか？」を英文にしよう。",
    "answer": "Could you help me?",
    "tokens": [
      "you",
      "me",
      "Could",
      "help"
    ],
    "hint": "丁寧なお願いは Could you ...? で始める。",
    "tip": "Could you help me? は相手に丁寧に助けを求める形。"
  },
  {
    "id": "forest-grammar-arrive-easy",
    "baseId": "forest-grammar-arrive",
    "phraseId": "late",
    "kind": "grammar",
    "difficulty": "easy",
    "scene": "待ち合わせ",
    "cue": "「10分遅れます」を英文にしよう。",
    "answer": "I will be ten minutes late.",
    "tokens": [
      "will",
      "ten",
      "late",
      "be",
      "minutes",
      "I"
    ],
    "hint": "未来の見込みは will be を使う。",
    "tip": "be late は『遅れる』。will be late で遅れる予定を伝えよう。"
  },
  {
    "id": "forest-grammar-reservation-easy",
    "baseId": "forest-grammar-reservation",
    "phraseId": "change",
    "kind": "grammar",
    "difficulty": "easy",
    "scene": "予約変更",
    "cue": "「予約を変更できますか？」を英文にしよう。",
    "answer": "Could I change my reservation?",
    "tokens": [
      "I",
      "my",
      "Could",
      "change",
      "reservation"
    ],
    "hint": "お願いなので Could I ...? を先頭に置く。",
    "tip": "Could I change ...? は予約変更の丁寧な聞き方。"
  },
  {
    "id": "forest-grammar-price-easy",
    "baseId": "forest-grammar-price",
    "phraseId": "price",
    "kind": "grammar",
    "difficulty": "easy",
    "scene": "値段を聞く",
    "cue": "「これはいくらですか？」を英文にしよう。",
    "answer": "How much does this cost?",
    "tokens": [
      "much",
      "this",
      "How",
      "does",
      "cost"
    ],
    "hint": "How much ...? で値段を聞ける。",
    "tip": "主語の数によって does/do を使い分ける。"
  },
  {
    "id": "forest-grammar-decline-easy",
    "baseId": "forest-grammar-decline",
    "phraseId": "decline",
    "kind": "grammar",
    "difficulty": "easy",
    "scene": "予定を断る",
    "cue": "「今夜は行けません」を英文にしよう。",
    "answer": "I cannot come tonight.",
    "tokens": [
      "cannot",
      "tonight",
      "I",
      "come"
    ],
    "hint": "丁寧な断り方は I'm afraid ... を使える。",
    "tip": "I'm afraid I can't ... は丁寧に断るときの表現。"
  },
  {
    "id": "forest-vocab-ticket-normal",
    "baseId": "forest-vocab-ticket",
    "phraseId": "help",
    "kind": "vocab",
    "difficulty": "normal",
    "scene": "Buying a ticket",
    "cue": "Complete the sentence at a ticket machine: I need to _____ a ticket.",
    "task": "Select the word that completes the sentence.",
    "answer": "buy",
    "options": [
      "buy",
      "borrow",
      "invite"
    ],
    "hint": "お金を払って入手する動詞を選ぼう。",
    "tip": "buy a ticket は『切符を買う』。borrow は借りる、invite は招待する。"
  },
  {
    "id": "forest-vocab-order-normal",
    "baseId": "forest-vocab-order",
    "phraseId": "order",
    "kind": "vocab",
    "difficulty": "normal",
    "scene": "Ordering lunch",
    "cue": "Choose the verb for a polite café order: Could I _____ an iced coffee?",
    "task": "Select the word that completes the sentence.",
    "answer": "have",
    "options": [
      "have",
      "drive",
      "wear"
    ],
    "hint": "Could I ...? で注文するときによく使う動詞。",
    "tip": "Could I have ...? は自然で丁寧な注文表現。"
  },
  {
    "id": "forest-vocab-transfer-normal",
    "baseId": "forest-vocab-transfer",
    "phraseId": "direction",
    "kind": "vocab",
    "difficulty": "normal",
    "scene": "Traveling by train",
    "cue": "You're going to the airport by rail. I need to _____ trains at Central Station.",
    "task": "Select the word that completes the sentence.",
    "answer": "change",
    "options": [
      "change",
      "wash",
      "cook"
    ],
    "hint": "ここでは『変更する／乗り換える』という意味。",
    "tip": "change trains は『電車を乗り換える』。"
  },
  {
    "id": "forest-vocab-appointment-normal",
    "baseId": "forest-vocab-appointment",
    "phraseId": "booking",
    "kind": "vocab",
    "difficulty": "normal",
    "scene": "Making plans",
    "cue": "Complete the receptionist's phrase: I'd like to _____ an appointment.",
    "task": "Select the word that completes the sentence.",
    "answer": "make",
    "options": [
      "make",
      "lose",
      "paint"
    ],
    "hint": "appointment と一緒によく使う動詞。",
    "tip": "make an appointment は『予約を取る』という定番表現。"
  },
  {
    "id": "forest-vocab-refund-normal",
    "baseId": "forest-vocab-refund",
    "phraseId": "problem",
    "kind": "vocab",
    "difficulty": "normal",
    "scene": "Returning an item",
    "cue": "You received the wrong item. Complete: Could I get a _____?",
    "task": "Select the word that completes the sentence.",
    "answer": "refund",
    "options": [
      "refund",
      "receipt",
      "menu"
    ],
    "hint": "商品を返したときにお金を戻してもらうこと。",
    "tip": "refund は『返金』。receipt は領収書・レシート。"
  },
  {
    "id": "forest-vocab-recommend-normal",
    "baseId": "forest-vocab-recommend",
    "phraseId": "recommend",
    "kind": "vocab",
    "difficulty": "normal",
    "scene": "Choosing a restaurant",
    "cue": "Ask a local for advice: Which place would you _____?",
    "task": "Select the word that completes the sentence.",
    "answer": "recommend",
    "options": [
      "recommend",
      "repair",
      "repeat"
    ],
    "hint": "『おすすめする』という動詞。",
    "tip": "recommend は『すすめる』。What do you recommend? とセットで覚えよう。"
  },
  {
    "id": "forest-grammar-yesterday-normal",
    "baseId": "forest-grammar-yesterday",
    "phraseId": "apology",
    "kind": "grammar",
    "difficulty": "normal",
    "scene": "Talking about yesterday",
    "cue": "Put the words in order to describe meeting a friend yesterday.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "I met my friend at the station yesterday.",
    "tokens": [
      "station",
      "yesterday",
      "I",
      "met",
      "my",
      "friend",
      "at",
      "the"
    ],
    "hint": "過去の話なので met を使い、主語から始めよう。",
    "tip": "meet の過去形は met。時間を表す語句は後半に置ける。"
  },
  {
    "id": "forest-grammar-help-normal",
    "baseId": "forest-grammar-help",
    "phraseId": "help",
    "kind": "grammar",
    "difficulty": "normal",
    "scene": "Asking politely",
    "cue": "Put the words in order to ask someone for help politely.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "Could you help me with this bag?",
    "tokens": [
      "bag",
      "this",
      "Could",
      "you",
      "help",
      "me",
      "with"
    ],
    "hint": "丁寧なお願いは Could you ...? で始める。",
    "tip": "Could you help me? は相手に丁寧に助けを求める形。"
  },
  {
    "id": "forest-grammar-arrive-normal",
    "baseId": "forest-grammar-arrive",
    "phraseId": "late",
    "kind": "grammar",
    "difficulty": "normal",
    "scene": "Explaining a delay",
    "cue": "Arrange the words to say that you will be ten minutes late.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "I will be about ten minutes late.",
    "tokens": [
      "late",
      "minutes",
      "I",
      "will",
      "be",
      "about",
      "ten"
    ],
    "hint": "未来の見込みは will be を使う。",
    "tip": "be late は『遅れる』。will be late で遅れる予定を伝えよう。"
  },
  {
    "id": "forest-grammar-reservation-normal",
    "baseId": "forest-grammar-reservation",
    "phraseId": "change",
    "kind": "grammar",
    "difficulty": "normal",
    "scene": "Changing a booking",
    "cue": "Build a polite request to change your reservation.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "Could I change my reservation to Friday?",
    "tokens": [
      "Friday",
      "to",
      "Could",
      "I",
      "change",
      "my",
      "reservation"
    ],
    "hint": "お願いなので Could I ...? を先頭に置く。",
    "tip": "Could I change ...? は予約変更の丁寧な聞き方。"
  },
  {
    "id": "forest-grammar-price-normal",
    "baseId": "forest-grammar-price",
    "phraseId": "price",
    "kind": "grammar",
    "difficulty": "normal",
    "scene": "Asking for a price",
    "cue": "Arrange a natural question about the total cost.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "How much does the ticket cost?",
    "tokens": [
      "ticket",
      "cost",
      "How",
      "much",
      "does",
      "the"
    ],
    "hint": "How much ...? で値段を聞ける。",
    "tip": "主語の数によって does/do を使い分ける。"
  },
  {
    "id": "forest-grammar-decline-normal",
    "baseId": "forest-grammar-decline",
    "phraseId": "decline",
    "kind": "grammar",
    "difficulty": "normal",
    "scene": "Declining an invitation",
    "cue": "Put the words in order to decline dinner tonight politely.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "I'm afraid I cannot come tonight.",
    "tokens": [
      "come",
      "tonight",
      "I'm",
      "afraid",
      "I",
      "cannot"
    ],
    "hint": "丁寧な断り方は I'm afraid ... を使える。",
    "tip": "I'm afraid I can't ... は丁寧に断るときの表現。"
  },
  {
    "id": "forest-vocab-ticket-hard",
    "baseId": "forest-vocab-ticket",
    "phraseId": "help",
    "kind": "vocab",
    "difficulty": "hard",
    "scene": "A busy train station",
    "cue": "You need a train ticket before the last train leaves. Which verb completes: I need to _____ a ticket right now?",
    "task": "Select the word that completes the sentence.",
    "answer": "buy",
    "options": [
      "buy",
      "borrow",
      "invite"
    ],
    "hint": "お金を払って入手する動詞を選ぼう。",
    "tip": "buy a ticket は『切符を買う』。borrow は借りる、invite は招待する。"
  },
  {
    "id": "forest-vocab-order-hard",
    "baseId": "forest-vocab-order",
    "phraseId": "order",
    "kind": "vocab",
    "difficulty": "hard",
    "scene": "A crowded café",
    "cue": "A barista is waiting while you order. Complete: Could I _____ an iced coffee to go?",
    "task": "Select the word that completes the sentence.",
    "answer": "have",
    "options": [
      "have",
      "drive",
      "wear"
    ],
    "hint": "Could I ...? で注文するときによく使う動詞。",
    "tip": "Could I have ...? は自然で丁寧な注文表現。"
  },
  {
    "id": "forest-vocab-transfer-hard",
    "baseId": "forest-vocab-transfer",
    "phraseId": "direction",
    "kind": "vocab",
    "difficulty": "hard",
    "scene": "Transferring in a city",
    "cue": "Complete the transit instruction: To reach the museum, you must _____ trains at Central Station.",
    "task": "Select the word that completes the sentence.",
    "answer": "change",
    "options": [
      "change",
      "wash",
      "cook"
    ],
    "hint": "ここでは『変更する／乗り換える』という意味。",
    "tip": "change trains は『電車を乗り換える』。"
  },
  {
    "id": "forest-vocab-appointment-hard",
    "baseId": "forest-vocab-appointment",
    "phraseId": "booking",
    "kind": "vocab",
    "difficulty": "hard",
    "scene": "Rescheduling a booking",
    "cue": "Your schedule is full next week. Choose the verb: I need to _____ an appointment for Friday.",
    "task": "Select the word that completes the sentence.",
    "answer": "make",
    "options": [
      "make",
      "lose",
      "paint"
    ],
    "hint": "appointment と一緒によく使う動詞。",
    "tip": "make an appointment は『予約を取る』という定番表現。"
  },
  {
    "id": "forest-vocab-refund-hard",
    "baseId": "forest-vocab-refund",
    "phraseId": "problem",
    "kind": "vocab",
    "difficulty": "hard",
    "scene": "Solving an order mistake",
    "cue": "The store sent the wrong size and cannot replace it. Ask: I'd like a _____, please.",
    "task": "Select the word that completes the sentence.",
    "answer": "refund",
    "options": [
      "refund",
      "receipt",
      "menu"
    ],
    "hint": "商品を返したときにお金を戻してもらうこと。",
    "tip": "refund は『返金』。receipt は領収書・レシート。"
  },
  {
    "id": "forest-vocab-recommend-hard",
    "baseId": "forest-vocab-recommend",
    "phraseId": "recommend",
    "kind": "vocab",
    "difficulty": "hard",
    "scene": "Asking a local friend",
    "cue": "You have only an hour for lunch in an unfamiliar city. What restaurant would you _____?",
    "task": "Select the word that completes the sentence.",
    "answer": "recommend",
    "options": [
      "recommend",
      "repair",
      "repeat"
    ],
    "hint": "『おすすめする』という動詞。",
    "tip": "recommend は『すすめる』。What do you recommend? とセットで覚えよう。"
  },
  {
    "id": "forest-grammar-yesterday-hard",
    "baseId": "forest-grammar-yesterday",
    "phraseId": "apology",
    "kind": "grammar",
    "difficulty": "hard",
    "scene": "Explaining what happened",
    "cue": "Your friend asks about yesterday. Build a natural past-tense sentence about meeting your friend.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "I met my friend at the station yesterday afternoon.",
    "tokens": [
      "met",
      "my",
      "friend",
      "at",
      "the",
      "station",
      "yesterday",
      "afternoon",
      "I"
    ],
    "hint": "過去の話なので met を使い、主語から始めよう。",
    "tip": "meet の過去形は met。時間を表す語句は後半に置ける。"
  },
  {
    "id": "forest-grammar-help-hard",
    "baseId": "forest-grammar-help",
    "phraseId": "help",
    "kind": "grammar",
    "difficulty": "hard",
    "scene": "At an unfamiliar station",
    "cue": "You cannot carry your suitcase upstairs. Build a polite request for assistance.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "Could you please help me carry this heavy bag?",
    "tokens": [
      "you",
      "please",
      "help",
      "me",
      "carry",
      "this",
      "heavy",
      "bag",
      "Could"
    ],
    "hint": "丁寧なお願いは Could you ...? で始める。",
    "tip": "Could you help me? は相手に丁寧に助けを求める形。"
  },
  {
    "id": "forest-grammar-arrive-hard",
    "baseId": "forest-grammar-arrive",
    "phraseId": "late",
    "kind": "grammar",
    "difficulty": "hard",
    "scene": "Sending a delay message",
    "cue": "Tell your friend you'll arrive ten minutes late because of the bus.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "I will be ten minutes late because of the bus.",
    "tokens": [
      "will",
      "be",
      "ten",
      "minutes",
      "late",
      "because",
      "of",
      "the",
      "bus",
      "I"
    ],
    "hint": "未来の見込みは will be を使う。",
    "tip": "be late は『遅れる』。will be late で遅れる予定を伝えよう。"
  },
  {
    "id": "forest-grammar-reservation-hard",
    "baseId": "forest-grammar-reservation",
    "phraseId": "change",
    "kind": "grammar",
    "difficulty": "hard",
    "scene": "Moving an appointment",
    "cue": "You need to move your restaurant reservation to Friday. Put the words in order.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "Could I please change my reservation to Friday evening?",
    "tokens": [
      "I",
      "please",
      "change",
      "my",
      "reservation",
      "to",
      "Friday",
      "evening",
      "Could"
    ],
    "hint": "お願いなので Could I ...? を先頭に置く。",
    "tip": "Could I change ...? は予約変更の丁寧な聞き方。"
  },
  {
    "id": "forest-grammar-price-hard",
    "baseId": "forest-grammar-price",
    "phraseId": "price",
    "kind": "grammar",
    "difficulty": "hard",
    "scene": "At the ticket counter",
    "cue": "Ask the ticket clerk how much two adult tickets cost.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "How much do two adult tickets cost?",
    "tokens": [
      "much",
      "do",
      "two",
      "adult",
      "tickets",
      "cost",
      "How"
    ],
    "hint": "How much ...? で値段を聞ける。",
    "tip": "主語の数によって does/do を使い分ける。"
  },
  {
    "id": "forest-grammar-decline-hard",
    "baseId": "forest-grammar-decline",
    "phraseId": "decline",
    "kind": "grammar",
    "difficulty": "hard",
    "scene": "Rescheduling dinner",
    "cue": "You cannot come to dinner tonight because you have other plans. Build your reply.",
    "task": "Tap the words in the correct order to build a natural sentence.",
    "answer": "I'm afraid I cannot come tonight because I have other plans.",
    "tokens": [
      "afraid",
      "I",
      "cannot",
      "come",
      "tonight",
      "because",
      "I",
      "have",
      "other",
      "plans",
      "I'm"
    ],
    "hint": "丁寧な断り方は I'm afraid ... を使える。",
    "tip": "I'm afraid I can't ... は丁寧に断るときの表現。"
  }
]);
