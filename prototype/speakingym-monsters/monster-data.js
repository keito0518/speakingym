// A compact, curated speaking curriculum: one useful expression, two situations.
// The prototype does not claim that speech recognition can grade arbitrary English.
export const PHRASES = Object.freeze([
  { id: 'think', label: '少し考える', expression: 'Let me think about it.', hint: 'Let me ...', tip: 'すぐ答えられないときの自然な間の取り方。' },
  { id: 'repeat', label: '聞き返す', expression: 'Could you say that again?', hint: 'Could you ...?', tip: '聞き取れなかったら、遠慮せずにもう一度お願いする。' },
  { id: 'agree', label: '賛成する', expression: 'That works for me.', hint: 'That works ...', tip: '提案や予定に「それで大丈夫」と答える。' },
  { id: 'late', label: '遅れを伝える', expression: "I'm running a little late.", hint: "I'm running ...", tip: '遅刻しそうなときの、短くて自然な連絡。' },
  { id: 'clarify', label: '確認する', expression: 'Just to make sure, ...', hint: 'Just to ...', tip: '理解が合っているか確認するとき、文の前に付ける。' },
  { id: 'prefer', label: '希望を伝える', expression: "I'd rather take the train.", hint: "I'd rather ...", tip: 'どちらがいいかを、強すぎない言い方で伝える。' }
]);

export const PROMPTS = Object.freeze([
  { id: 'think-cafe', phraseId: 'think', kind: 'speak', scene: 'カフェ', cue: '店員に注文を聞かれた。もう少し考えたい。', answer: 'Let me think about it.', alternatives: ['Give me a moment to think.'] },
  { id: 'think-trip', phraseId: 'think', kind: 'listen', scene: '旅行の計画', audio: 'Do you want to book the tour now?', cue: '相手に今決めるか聞かれた。少し考えたいと伝えよう。', answer: 'Let me think about it.', alternatives: ['Give me a moment to think.'] },
  { id: 'repeat-station', phraseId: 'repeat', kind: 'listen', scene: '駅の窓口', audio: 'The last train leaves at ten forty-five.', cue: '案内が聞き取れなかった。もう一度言ってもらおう。', answer: 'Could you say that again?', alternatives: ['Could you repeat that, please?'] },
  { id: 'repeat-class', phraseId: 'repeat', kind: 'speak', scene: '英語の授業', cue: '先生の説明が速かった。丁寧に聞き返そう。', answer: 'Could you say that again?', alternatives: ['Could you repeat that, please?'] },
  { id: 'agree-friend', phraseId: 'agree', kind: 'speak', scene: '友人との約束', cue: '友人が「午後3時に会おう」と提案した。それで大丈夫と伝えよう。', answer: 'That works for me.', alternatives: ['Three works for me.', 'Sounds good to me.'] },
  { id: 'agree-work', phraseId: 'agree', kind: 'listen', scene: '仕事の予定', audio: 'How about meeting on Friday instead?', cue: '日程変更の提案に、問題ないと答えよう。', answer: 'That works for me.', alternatives: ['Friday works for me.', 'Sounds good to me.'] },
  { id: 'late-bus', phraseId: 'late', kind: 'speak', scene: '待ち合わせ', cue: 'バスが遅れていて、約束に少し遅れそう。', answer: "I'm running a little late.", alternatives: ["I'm going to be a little late."] },
  { id: 'late-call', phraseId: 'late', kind: 'listen', scene: '電話', audio: 'Are you almost here?', cue: 'もう着くか聞かれた。少し遅れていることを伝えよう。', answer: "I'm running a little late.", alternatives: ["I'm going to be a little late."] },
  { id: 'clarify-hotel', phraseId: 'clarify', kind: 'speak', scene: 'ホテル', cue: 'チェックアウト時間が11時で合っているか確認したい。「確認ですが、11時ですよね？」', answer: 'Just to make sure, checkout is at eleven, right?', alternatives: ['Just to make sure, is checkout at eleven?'] },
  { id: 'clarify-office', phraseId: 'clarify', kind: 'listen', scene: '職場', audio: 'Please send the file before lunch.', cue: '昼食前で合っているか、確認の一言を添えて聞き返そう。', answer: 'Just to make sure, before lunch, right?', alternatives: ['Just to make sure, you need it before lunch, right?'] },
  { id: 'prefer-city', phraseId: 'prefer', kind: 'speak', scene: '街の移動', cue: 'バスか電車か聞かれた。電車のほうがいいと伝えよう。', answer: "I'd rather take the train.", alternatives: ["I would rather take the train."] },
  { id: 'prefer-friend', phraseId: 'prefer', kind: 'listen', scene: '友人との移動', audio: 'Should we take the bus or the train?', cue: '電車を選びたい。自分の希望を伝えよう。', answer: "I'd rather take the train.", alternatives: ["I would rather take the train."] }
]);

export const MONSTERS = Object.freeze([
  { id: 'medamago', name: 'メダマゴ', kind: 'めだまやきモンスター', color: '#f5b545', unlock: 0, note: '黄身の目でじっと見つめてくる。朝が苦手。' },
  { id: 'katappo', name: 'カタッポ', kind: '片方だけの靴下', color: '#9585d9', unlock: 2, note: '相方を探して毎日走り回っている。' },
  { id: 'purupun', name: 'プルプン', kind: '歩くプリン', color: '#c49355', unlock: 4, note: '緊張すると、より一層ぷるぷるする。' },
  { id: 'koge', name: 'コゲッタ', kind: 'すねたトースト', color: '#d4875a', masteryUnlock: 2, note: 'トースターに入ると機嫌が良くなる。' },
  { id: 'cone', name: 'コンボウ', kind: '三角コーンの旅人', color: '#ed864e', masteryUnlock: 4, note: 'いつも道をふさいでいるのに、道案内が得意。' }
]);
