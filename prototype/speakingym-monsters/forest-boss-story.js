// A deliberately small three-turn conversation, using *existing* authored
// listening and grammar tasks plus one authored response per difficulty.
// Stage one never displays the heard transcript before the audio gate.
export const BOSS_RESPONSE_PROMPTS=Object.freeze([
  Object.freeze({id:'boss-delay-apology-easy',baseId:'boss-delay-apology',bossOnly:true,
    phraseId:'late',kind:'speak',difficulty:'easy',scene:'トゲ王との待ち合わせ',
    cue:'バスが遅れている。トゲ王に「ごめん、バスが遅れてる」と伝えよう。',
    task:'謝って、バスが遅れていることを短く伝えよう。',
    answer:'Sorry, my bus is late.',
    alternatives:['Sorry, my bus is delayed.','I am sorry, the bus is running late.','Sorry, my bus is delayed. Please wait inside.','I am sorry, the bus is running late. You can wait inside.'],
    hint:'Sorry ... my bus ...',
    tip:'やさしいモードでは「ごめん」と「バスが遅れている」の2つを伝えればOK。待つ場所の提案は標準以上の応用だよ。'}),
  Object.freeze({id:'boss-delay-apology-normal',baseId:'boss-delay-apology',bossOnly:true,
    phraseId:'late',kind:'speak',difficulty:'normal',scene:'Waiting for a friend',
    cue:'Your bus is delayed, and the person you are meeting is standing outside.',
    task:'Apologize for the delay, explain the cause, and suggest waiting inside.',
    answer:'Sorry, my bus is delayed. Please wait inside.',
    alternatives:['I am sorry, the bus is running late. You can wait inside.'],
    hint:'Sorry ... my bus ... Please wait ...',
    tip:'An apology, a brief reason, and a thoughtful suggestion make a useful update.'}),
  Object.freeze({id:'boss-delay-apology-hard',baseId:'boss-delay-apology',bossOnly:true,
    phraseId:'late',kind:'speak',difficulty:'hard',scene:'A canceled bus and a cold night',
    cue:'Your bus was just canceled, and you now expect to arrive twenty minutes late. Your friend is waiting outside in the cold.',
    task:'Apologize, explain the cancellation, give the new estimate, and suggest waiting somewhere warm.',
    answer:"I'm sorry, my bus was canceled, so I'll be twenty minutes late. Please wait inside.",
    alternatives:['Sorry, the bus was canceled. I will be about twenty minutes late. You can wait indoors.'],
    hint:'Sorry ... canceled ... twenty minutes ... wait inside.',
    tip:'If the estimated delay changes, update the number and offer a practical option to the person waiting.'})
]);
export function bossConversationFor(wave,level){
  if(wave!==1||!['easy','normal','hard'].includes(level))return null;
  const suffix=level==='easy'?'':`-${level}`;
  return Object.freeze([
    Object.freeze({id:`late-call${suffix}`,turn:1,
      title:level==='easy'?'ボスから電話だ！':'The boss is calling.',
      context:level==='easy'?'トゲ王が何か聞いてきた。まず声を聞いて、意味を考えよう。':'The Thorn King is waiting. Listen to the question before you respond.'}),
    Object.freeze({id:`forest-grammar-arrive-${level}`,turn:2,
      title:level==='easy'?'トゲ王「どれくらい遅れる？」':'The boss asks: How late will you be?',
      context:level==='easy'?'10分遅れることを、自然な語順で伝えよう。':'Tell the boss you will arrive about ten minutes late. Build a natural sentence.'}),
    Object.freeze({id:`boss-delay-apology-${level}`,turn:3,
      title:level==='easy'?'トゲ王「どうしたの？」':level==='normal'?'The boss asks: What happened to your bus?':'The bus was canceled. Your friend is waiting outside.',
      context:level==='easy'?'謝って、バスが遅れていると短く伝えよう。':level==='normal'?'Apologize and explain that you are running late.':'Your delay has grown to twenty minutes. Explain why and suggest somewhere warm to wait.'})
  ]);
}

export function bossConversationTurn(wave,level,index){
  return bossConversationFor(wave,level)?.[index-5]||null;
}
