import { ADDITIONAL_PHRASES, ADDITIONAL_PROMPTS } from './expanded-curriculum.js';
import { FOREST_QUIZZES } from './forest-quizzes.js';
import { BOSS_RESPONSE_PROMPTS } from './forest-boss-story.js';
import { SPEAKING_ADVENTURES } from './speaking-adventures.js';
import { SNOW_CITY_QUIZZES, SNOW_CITY_SPEAKING } from './snow-city-curriculum.js';
// A compact, curated speaking curriculum: one useful expression, two situations.
// The prototype does not claim that speech recognition can grade arbitrary English.
export const PHRASES = Object.freeze([
  { id: 'think', label: '少し考える', expression: 'Let me think about it.', hint: 'Let me ...', tip: 'すぐ答えられないときの自然な間の取り方。' },
  { id: 'repeat', label: '聞き返す', expression: 'Could you say that again?', hint: 'Could you ...?', tip: '聞き取れなかったら、遠慮せずにもう一度お願いする。' },
  { id: 'agree', label: '賛成する', expression: 'That works for me.', hint: 'That works ...', tip: '提案や予定に「それで大丈夫」と答える。' },
  { id: 'late', label: '遅れを伝える', expression: "I'm running a little late.", hint: "I'm running ...", tip: '遅刻しそうなときの、短くて自然な連絡。' },
  { id: 'clarify', label: '確認する', expression: 'Just to make sure, ...', hint: 'Just to ...', tip: '理解が合っているか確認するとき、文の前に付ける。' },
  { id: 'prefer', label: '希望を伝える', expression: "I'd rather take the train.", hint: "I'd rather ...", tip: 'どちらがいいかを、強すぎない言い方で伝える。' },
  ...ADDITIONAL_PHRASES
]);

export const PROMPTS = Object.freeze([
  { id: 'think-cafe', phraseId: 'think', kind: 'speak', scene: 'カフェ', cue: '店員に注文を聞かれた。もう少し考えたい。', answer: 'Let me think about it.', alternatives: ['Give me a moment to think.'] },
  { id: 'think-trip', phraseId: 'think', kind: 'listen', scene: '旅行の計画', audio: 'Do you want to book the tour now?', cue: '相手に今決めるか聞かれた。少し考えたいと伝えよう。', answer: 'Let me think about it.', alternatives: ['Give me a moment to think.'] },
  { id: 'repeat-station', phraseId: 'repeat', kind: 'listen', scene: '駅の窓口', audio: 'The last train leaves at ten forty-five.', cue: '案内が聞き取れなかった。もう一度言ってもらおう。', answer: 'Could you say that again?', alternatives: ['Could you repeat that, please?'] },
  { id: 'repeat-class', phraseId: 'repeat', kind: 'speak', scene: '英語の授業', cue: '先生の説明が速かった。丁寧に聞き返そう。', answer: 'Could you say that again?', alternatives: ['Could you repeat that, please?'] },
  { id: 'agree-friend', phraseId: 'agree', kind: 'speak', scene: '友人との約束', cue: '友人から午後3時に会おうと提案された。その時間で大丈夫と伝えよう。', answer: 'That works for me.', alternatives: ['Three works for me.', 'Sounds good to me.'] },
  { id: 'agree-work', phraseId: 'agree', kind: 'listen', scene: '仕事の予定', audio: 'How about meeting on Friday instead?', cue: '日程変更の提案に、問題ないと答えよう。', answer: 'That works for me.', alternatives: ['Friday works for me.', 'Sounds good to me.'] },
  { id: 'late-bus', phraseId: 'late', kind: 'speak', scene: '待ち合わせ', cue: 'バスが遅れていて、約束に少し遅れそう。', answer: "I'm running a little late.", alternatives: ["I'm going to be a little late."] },
  { id: 'late-call', phraseId: 'late', kind: 'listen', scene: '電話', audio: 'Are you almost here?', cue: 'もう着くか聞かれた。少し遅れていることを伝えよう。', answer: "I'm running a little late.", alternatives: ["I'm going to be a little late."] },
  { id: 'clarify-hotel', phraseId: 'clarify', kind: 'speak', scene: 'ホテル', cue: 'チェックアウトは11時？ フロントで短く確認しよう。', answer: 'Is checkout at eleven?', alternatives: ['Is check-out at eleven?','Is checkout at 11?','Could you confirm checkout is at eleven?','Just to make sure, checkout is at eleven, right?','Just to make sure, is checkout at eleven?'] },
  { id: 'clarify-office', phraseId: 'clarify', kind: 'listen', scene: '職場', audio: 'Please send the file before lunch.', cue: '昼食前で合っているか、確認の一言を添えて聞き返そう。', answer: 'Just to make sure, before lunch, right?', alternatives: ['Just to make sure, you need it before lunch, right?'] },
  { id: 'prefer-city', phraseId: 'prefer', kind: 'speak', scene: '街の移動', cue: 'バスか電車か聞かれた。電車のほうがいいと伝えよう。', answer: "I'd rather take the train.", alternatives: ["I would rather take the train."] },
  { id: 'prefer-friend', phraseId: 'prefer', kind: 'listen', scene: '友人との移動', audio: 'Should we take the bus or the train?', cue: '電車を選びたい。自分の希望を伝えよう。', answer: "I'd rather take the train.", alternatives: ["I would rather take the train."] },
  ...ADDITIONAL_PROMPTS.filter(p=>!p.difficulty)
]);

// English-to-English tasks are authored independently of the Japanese prompts.
// Each difficulty practices the same useful expressions in progressively richer contexts.
const ADVANCED_TASKS = Object.freeze([
  [
    "think-cafe",
    "normal",
    "At a coffee shop",
    "The barista is waiting for your order, but you have not decided yet.",
    "Ask for a little time to think.",
    "Let me think about it for a moment.",
    "Let me think ...",
    "A brief pause is natural when you need more time."
  ],
  [
    "think-trip",
    "normal",
    "Planning a trip",
    "Your friend wants to book a tour today, but you are still unsure.",
    "Tell your friend that you need some time to decide.",
    "Let me think about it before we book.",
    "Let me think ...",
    "Do not feel pressured to decide immediately."
  ],
  [
    "repeat-station",
    "normal",
    "At a train station",
    "You missed the platform number in an announcement.",
    "Politely ask the staff member to repeat the platform number.",
    "Could you say the platform number again, please?",
    "Could you say ... again?",
    "Be specific about the part you missed."
  ],
  [
    "repeat-class",
    "normal",
    "In class",
    "Your teacher explained the homework too quickly.",
    "Ask the teacher to repeat the homework instructions.",
    "Could you repeat the homework instructions, please?",
    "Could you repeat ...?",
    "A polite question can be direct and clear."
  ],
  [
    "agree-friend",
    "normal",
    "Making plans",
    "Your friend suggests meeting at three on Saturday.",
    "Accept the suggested time in a natural way.",
    "Three on Saturday works for me.",
    "... works for me.",
    "You can name the exact time to show agreement."
  ],
  [
    "agree-work",
    "normal",
    "At work",
    "A colleague suggests moving your meeting to Friday.",
    "Accept the new meeting day.",
    "Friday works for me.",
    "... works for me.",
    "Mentioning the day makes your agreement clear."
  ],
  [
    "late-bus",
    "normal",
    "Meeting a friend",
    "Your bus is delayed, and your friend is already waiting.",
    "Say you will be a little late and apologize.",
    "I'm running a little late. Sorry about that.",
    "I'm running ...",
    "A short apology is often enough."
  ],
  [
    "late-call",
    "normal",
    "On the phone",
    "Your teammate asks whether you will arrive on time.",
    "Say that you expect to be about ten minutes late.",
    "I'm running about ten minutes late.",
    "I'm running ... minutes late.",
    "Give a specific estimate if you know it."
  ],
  [
    "clarify-hotel",
    "normal",
    "At a hotel",
    "You are not sure when you need to check out.",
    "Confirm whether checkout is at eleven in the morning.",
    "Just to make sure, checkout is at eleven, right?",
    "Just to make sure, ...",
    "Repeat the important detail when checking."
  ],
  [
    "clarify-office",
    "normal",
    "At the office",
    "Your manager asks you to send a file before lunch.",
    "Confirm the deadline before you leave.",
    "Just to make sure, you need it before lunch, right?",
    "Just to make sure, ...",
    "Check deadlines instead of making assumptions."
  ],
  [
    "prefer-city",
    "normal",
    "Getting around town",
    "A friend asks whether you want to take a bus or a train.",
    "Choose the train and give one simple reason.",
    "I'd rather take the train because it's faster.",
    "I'd rather ... because ...",
    "Give a reason without making your choice sound harsh."
  ],
  [
    "prefer-friend",
    "normal",
    "Traveling with friends",
    "Your group wants to take a taxi, but you prefer the train.",
    "Politely express your preference.",
    "I'd rather take the train, if that's okay.",
    "I'd rather ...",
    "Softening your preference can keep the conversation friendly."
  ],
  [
    "think-cafe",
    "hard",
    "At a busy café",
    "You need to check which drinks contain milk before ordering. A customer behind you is in a hurry.",
    "Ask for time to decide, explain why, and invite the other customer to order first.",
    "Let me think about it while I check the ingredients. Please go ahead of me.",
    "Let me think ... while ...",
    "Handle both your own need and the other person's time."
  ],
  [
    "think-trip",
    "hard",
    "Booking a nonrefundable tour",
    "Your friend wants to pay for a nonrefundable tour now, but you have not confirmed your work schedule.",
    "Explain why you cannot decide yet and promise a clear answer by tonight.",
    "Let me think about it and check my work schedule first. I'll let you know tonight.",
    "Let me think ... first. I'll ...",
    "Include both a reason and a concrete follow-up."
  ],
  [
    "repeat-station",
    "hard",
    "Changing trains",
    "The station employee explains a route with a transfer, but the platform is noisy and you miss two important details.",
    "Politely ask them to repeat both the stop where you change trains and the platform number.",
    "Sorry, could you repeat where I should change trains and which platform I need?",
    "Sorry, could you repeat ... and ...?",
    "Ask for the exact two details you missed."
  ],
  [
    "repeat-class",
    "hard",
    "Following complex instructions",
    "Your teacher gives a two-step assignment and mentions a deadline. You understood the first step but not the second.",
    "Ask them to explain the second step again and confirm the due date in the same response.",
    "Could you go over the second step again and confirm when the assignment is due?",
    "Could you go over ... and confirm ...?",
    "A good clarification identifies the missing step and the deadline."
  ],
  [
    "agree-friend",
    "hard",
    "Changing weekend plans",
    "Your friend cannot make dinner on Saturday and suggests lunch instead. You are free until two in the afternoon.",
    "Accept the change, suggest a specific lunch time, and keep the tone friendly.",
    "Lunch works for me instead. How about meeting at twelve thirty?",
    "... works for me. How about ...?",
    "Agree first, then make the plan actionable."
  ],
  [
    "agree-work",
    "hard",
    "Rescheduling a client call",
    "A client suggests moving your call to Friday at nine in the morning. You are available but need time to prepare.",
    "Confirm the new time and politely request the agenda in advance.",
    "Friday at nine works for me. Could you send the agenda beforehand?",
    "... works for me. Could you ...?",
    "Acknowledge the new time before asking for preparation material."
  ],
  [
    "late-bus",
    "hard",
    "A canceled bus",
    "Your bus has been canceled. You expect to arrive twenty minutes late, and your friend is standing outside in cold weather.",
    "Apologize, explain the delay, give your estimated arrival, and suggest somewhere warm to wait.",
    "I'm sorry, but I'm running about twenty minutes late because my bus was canceled. Please wait inside if you can.",
    "I'm sorry, but I'm running ... because ...",
    "Combine a clear update with consideration for the listener."
  ],
  [
    "late-call",
    "hard",
    "A meeting that runs over",
    "Your current meeting is taking longer than expected, so you cannot join your next call at three. You should be free at three fifteen.",
    "Explain the situation, apologize, and propose a specific new start time.",
    "I'm sorry, but I'm running about fifteen minutes late because my meeting is taking longer than expected. Could we start at three fifteen?",
    "I'm sorry, but ... Could we ...?",
    "Explain the delay and propose a realistic alternative."
  ],
  [
    "clarify-hotel",
    "hard",
    "Conflicting checkout information",
    "Your booking confirmation says checkout is at eleven, but a staff member told you ten. You need to leave your luggage at reception afterward.",
    "Politely point out the conflicting times, ask which applies to your booking, and mention your luggage.",
    "Just to make sure, my confirmation says eleven, but I was told ten. Which time applies to my booking? Can I leave my luggage here afterward?",
    "Just to make sure, ... but ...",
    "Resolve the conflict before asking about the extra service."
  ],
  [
    "clarify-office",
    "hard",
    "A deadline across time zones",
    "A coworker in another country says a report is due by Friday. You are preparing the PDF from Japan and need to avoid a timezone mistake.",
    "Ask whether the deadline is five p.m. Japan time on Friday and confirm the required file format.",
    "Just to make sure, is the deadline five p.m. Japan time on Friday, and should I send the report as a PDF?",
    "Just to make sure, is ... and should ...?",
    "Check both the time zone and the deliverable."
  ],
  [
    "prefer-city",
    "hard",
    "Choosing a route in heavy rain",
    "It is raining heavily and you are carrying luggage. The bus goes directly to the hotel, but the train is faster even with one transfer.",
    "State your preference for the train, acknowledge the bus advantage, and explain your decision.",
    "Although the bus goes directly to the hotel, I'd rather take the train because it's faster, even with the transfer.",
    "Although ..., I'd rather ... because ...",
    "Acknowledge a trade-off without losing your main point."
  ],
  [
    "prefer-friend",
    "hard",
    "Keeping travel costs down",
    "Your friend suggests an expensive taxi. You want to save money by taking the train, but the weather forecast says the rain may get worse.",
    "Politely prefer the train, give a reason, and offer to reconsider if the weather changes.",
    "I'd rather take the train to save money, but I'm happy to take a taxi if the rain gets worse.",
    "I'd rather ... but ... if ...",
    "A conditional compromise can make your preference easier to accept."
  ]
]);
export const ALL_PROMPTS = Object.freeze([
  ...PROMPTS,
  ...ADDITIONAL_PROMPTS.filter(p=>p.difficulty),
  ...FOREST_QUIZZES,
  ...SNOW_CITY_QUIZZES,
  ...SNOW_CITY_SPEAKING,
  ...BOSS_RESPONSE_PROMPTS,
  ...SPEAKING_ADVENTURES,
  ...ADVANCED_TASKS.map(([baseId,difficulty,scene,cue,task,answer,hint,tip]) => {
    const base=PROMPTS.find(prompt=>prompt.id===baseId);
    return {
    id: `${baseId}-${difficulty}`, baseId,phraseId:base.phraseId,
    // Retain the original listening skill when adapting legacy situations.
    // Otherwise normal/hard versions silently turned into reading tasks,
    // despite having an authored levelled audio-first comprehension check.
    kind:base.kind==='listen'?'listen':'speak',
    ...(base.audio?{audio:base.audio}:{}),
    difficulty, scene, cue, task, answer, hint, tip
  };})
]);

export const MONSTERS = Object.freeze([
  { id: 'medamago', name: 'Yolkie', japaneseName: 'メダマゴ', evolvedName: 'Sunnyolk', roots: [{"word":"yolk","meaning":"卵の黄身"},{"word":"sunny-side up","meaning":"片面焼きの目玉焼き"}], skill: { name: 'Slow-Mo', description: '英文の音声をゆっくり聞き直す' }, kind: 'めだまやきモンスター', color: '#f5b545', unlock: 0, note: '黄身の目でじっと見つめてくる。朝が苦手。' },
  { id: 'katappo', name: 'Soxie', japaneseName: 'カタッポ', evolvedName: 'Pairadox', roots: [{"word":"sock","meaning":"靴下"},{"word":"pair","meaning":"一組・ペア"}], skill: { name: 'Pair-Up', description: '同じ意味の別表現とセットで覚える' }, kind: '片方だけの靴下', color: '#9585d9', unlock: 4, note: '相方を探して毎日走り回っている。' },
  { id: 'purupun', name: 'Wobblin', japaneseName: 'プルプン', evolvedName: 'Wobblord', roots: [{"word":"wobble","meaning":"ぐらぐら揺れる"},{"word":"pudding","meaning":"プリン"}], skill: { name: 'Echo', description: '聞いたフレーズをもう一度確認する' }, kind: '歩くプリン', color: '#c49355', unlock: 6, note: '緊張すると、より一層ぷるぷるする。' },
  { id: 'koge', name: 'Toastrophe', japaneseName: 'コゲッタ', evolvedName: 'Toastorm', roots: [{"word":"toast","meaning":"トースト"},{"word":"catastrophe","meaning":"大惨事"}], skill: { name: 'Redo', description: '間違えた英語だけ集中してやり直す' }, kind: 'すねたトースト', color: '#d4875a', masteryUnlock: 3, note: 'トースターに入ると機嫌が良くなる。' },
  { id: 'cone', name: 'Conavoy', japaneseName: 'コンボウ', evolvedName: 'Conavoy Max', roots: [{"word":"cone","meaning":"円すい・三角コーン"},{"word":"convoy","meaning":"車列・集団移動"}], skill: { name: 'Navigator', description: '問題の重要な指示を見つける' }, kind: '三角コーンの旅人', color: '#ed864e', masteryUnlock: 5, note: 'いつも道をふさいでいるのに、道案内が得意。' },
  { id: 'nororo', name: 'Rolloro', japaneseName: 'ノロロ', evolvedName: 'Rollorama', roots: [{"word":"roll","meaning":"巻く・転がる"},{"word":"seaweed","meaning":"海藻・のり"}], skill: { name: 'Switch-Up', description: '同じ表現を別の場面で使ってみる' }, kind: '転がるのり巻き', color: '#5e976e', unlock: 5, note: '走るたびに海苔が一枚ずつほどけていく。' },
  { id: 'keshipon', name: 'Erasie', japaneseName: 'ケシポン', evolvedName: 'Erasaurus', roots: [{"word":"erase","meaning":"消す"},{"word":"eraser","meaning":"消しゴム"}], skill: { name: 'Clean Slate', description: '苦手な表現だけをまとめて復習する' }, kind: '消しゴムのたましい', color: '#84a9ca', unlock: 8, note: '昨日の失敗まで消そうとしてしまう。' },
  { id: 'donako', name: 'Nibbunut', japaneseName: 'ドナコ', evolvedName: 'Nibbunova', roots: [{"word":"nibble","meaning":"少しずつかじる"},{"word":"doughnut","meaning":"ドーナツ"}], skill: { name: 'Tiny Bites', description: '長い英文を短いまとまりに分ける' }, kind: 'ひとくちドーナツ', color: '#d49b8c', masteryUnlock: 4, note: '自分の欠けたところを誇りにしている。' },
  { id: 'amekurage', name: 'Umbrellish', japaneseName: 'アメクラゲ', evolvedName: 'Umbrelluna', roots: [{"word":"umbrella","meaning":"傘"},{"word":"jellyfish","meaning":"クラゲ"}], skill: { name: 'Shelter', description: '難しい英文の語彙にやさしい英語の語注を出す' }, kind: '傘になったクラゲ', color: '#7ab4ca', unlock: 10, note: '晴れた日も誰かを雨から守ろうとする。' },
  { id: 'fuwari', name: 'Flufflet', japaneseName: 'フワリコ', evolvedName: 'Nimbus', roots: [{word:'fluffy',meaning:'ふわふわした'},{word:'cloud',meaning:'雲'}], skill:{name:'Cloud Drift',description:'落ち着いて聞き直す、学習用の演出'}, kind:'綿雲のこども',color:'#add3e7', unlock:5,forestAreas:1,retentionStage:2,retentionUnlock:1,rarity:'rare',note:'朝の森に浮かぶ小さな雲。旅の話を聞くのが好き。' },
  { id: 'kompass', name: 'Northling', japaneseName: 'コンパシ', evolvedName: 'Polestar', roots:[{word:'compass',meaning:'方位磁針'},{word:'north',meaning:'北'}],skill:{name:'True North',description:'迷った時に目標を思い出す、学習用の演出'},kind:'方位磁針の旅人',color:'#b8ad8f',unlock:7,forestAreas:2,retentionStage:2,retentionUnlock:2,rarity:'rare',note:'針が指すのは北だけじゃない。大切な人の声にも反応する。' },
  { id: 'pikap', name: 'Glimli', japaneseName: 'ピカプ', evolvedName: 'Auroraglim', roots:[{word:'glimmer',meaning:'かすかな光'},{word:'firefly',meaning:'ホタル'}],skill:{name:'Quiet Glow',description:'聞き取れた言葉を光に変える、学習用の演出'},kind:'ランタンホタル',color:'#e6c87b',masteryUnlock:3,forestAreas:3,retentionStage:3,retentionUnlock:2,rarity:'epic',note:'急いでいると消えてしまう。じっくり学ぶ旅人のそばでだけ光る。' },
  { id: 'mokuryu', name: 'Barklit', japaneseName: 'モクリュウ', evolvedName: 'Eldrake', roots:[{word:'bark',meaning:'木の皮'},{word:'dragon',meaning:'ドラゴン'}],skill:{name:'Old Wisdom',description:'学んだ表現の復習を促す、学習用の演出'},kind:'古木の小竜',color:'#8fa57d',masteryUnlock:5,forestAreas:4,retentionStage:4,retentionUnlock:3,rarity:'legend',note:'年輪の模様が背中にある。四つの森を歩いた者の言葉にだけ耳を傾ける。' },
  { id: 'yukibell', name: 'Bellumi', japaneseName: 'ユキベル', evolvedName: 'Aurabell', roots:[{word:'bell',meaning:'鈴・ベル'},{word:'illuminate',meaning:'照らす'}],skill:{name:'Gentle Chime',description:'復習の予定を静かに思い出させる、学習用の演出'},kind:'雪灯りの鈴',color:'#9bcee8',masteryUnlock:6,cityAreas:2,retentionStage:2,retentionUnlock:2,rarity:'rare',note:'雪の商店街に灯る鈴。翌日も覚えている言葉を聞くと、小さく鳴る。'},
  { id: 'railfox', name: 'Railfox', japaneseName: 'レールギツネ', evolvedName: 'Aurorail', roots:[{word:'rail',meaning:'鉄道・レール'},{word:'fox',meaning:'キツネ'}],skill:{name:'Connection',description:'別の場面で使える英語の結びつきを示す、学習用の演出'},kind:'北の駅のきつね',color:'#bdd5e8',masteryUnlock:8,cityAreas:4,retentionStage:3,retentionUnlock:3,rarity:'epic',note:'吹雪の夜に北駅へ戻ってくる。忘れずに使えた言葉だけを道しるべにする。'}
]);
