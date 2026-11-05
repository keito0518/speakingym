// Human-authored meanings for the *selected wrong option*, not a generated
// dictionary or a guess about what the learner intended. A retry cue must
// never reveal the canonical answer, which remains earnable on a later try.
const WORD_MEANINGS=Object.freeze({
  refund:'返金する・返金',buy:'買う',cancel:'取り消す',
  borrow:'借りる',return:'返す・返品する',have:'持つ・注文して受け取る',
  change:'変える・乗り換える',board:'乗車する',miss:'乗り逃す',
  make:'作る・予約を取る',confirm:'確認する',receipt:'レシート',
  replacement:'交換品・代替品',recommend:'おすすめする',prefer:'好む',
  serve:'提供する',collect:'受け取る・集める',menu:'メニュー',
  bill:'請求書・勘定',tip:'チップ・助言',charge:'料金・請求する',
  discount:'値引き',surcharge:'追加料金',deposit:'預かり金・手付金',
  cross:'渡る',turn:'曲がる',pass:'通り過ぎる・通行証',
  platform:'駅のホーム',intersection:'交差点',entrance:'入口',
  shortcut:'近道',transfer:'乗り換え',detour:'迂回路',
  allergic:'アレルギーがある',hungry:'お腹がすいた',spicy:'辛い',
  portions:'料理の取り分・分量',ingredients:'原材料',utensils:'食器・調理器具',
  contamination:'混入・汚染',reservation:'予約',preparation:'準備',
  delay:'遅れ・遅らせる',cancellation:'中止・取り消し',departure:'出発',
  confirmed:'確認済みの',postponed:'延期された',canceled:'中止された',
  reschedule:'日程を変更する',forget:'忘れる',agree:'同意する',
  refuse:'断る',argued:'言い争った',arrived:'到着した',
  agreed:'同意した',consensus:'合意・総意',deadline:'締め切り',
  disagreement:'意見の不一致',rather:'むしろ・どちらかといえば',
  possibly:'おそらく・ひょっとすると',permission:'許可',
  preference:'好み・希望',promise:'約束',early:'早い',
  late:'遅い',empty:'空の・空いている',waiting:'待っている',
  driving:'運転している',running:'走っている・運行している',
  booked:'予約済みの',advanced:'進んだ・上級の',delayed:'遅れている',
  suggest:'提案する',postpone:'延期する',barely:'かろうじて・ほとんど〜ない',
  nearly:'ほぼ・もう少しで',highly:'非常に・強く',
  available:'利用可能な・空きがある',occupied:'使用中の・ふさがった',
  closed:'閉まった・通行止めの',mandatory:'必須の',
  complimentary:'無料サービスの',refundable:'返金可能な',
  transferable:'譲渡・変更可能な','non-refundable':'返金不可の',
  estimate:'見積もる・概算',clarify:'明確にする',translate:'翻訳する',
  specify:'具体的に指定する',predict:'予測する',guarantee:'保証する',
  close:'閉める・近い',deliver:'届ける',rescheduled:'日程変更された',
  cancelled:'中止された',delivered:'配達済みの',
  kitchen:'厨房・キッチン',alternative:'代わりの案',
  identical:'同一の',expensive:'高価な',gate:'門・改札口',
  bridge:'橋',counter:'窓口・カウンター',junction:'分岐点',
  sign:'標識・看板',price:'価格',arrow:'矢印',ticket:'切符・入場券',
  exchange:'交換する',reserve:'予約する',itemized:'項目ごとに分かれた',
  estimated:'見積もられた・おおよその',optional:'任意の',
  connection:'乗り継ぎ・接続',repaired:'修理された',
  suspended:'一時停止された・運休の',transferred:'乗り換えた・移された',
  shelter:'避難場所・雨風を避ける場所',heated:'暖房のある',
  reserved:'予約済みの',emergency:'緊急事態',
  appointment:'予約・約束',open:'開いている',
  impassable:'通行できない',accessible:'利用しやすい・通行できる',
  inscription:'碑文・刻まれた文字',advertisement:'広告',
  decipher:'読み解く',passage:'通路・一節',accidental:'偶然の・意図しない',
  sequence:'順番・手順',arrival:'到着',direction:'方向・道案内',
  gear:'歯車',jammed:'詰まって動かない',refunded:'返金された'
});

const words=value=>String(value||'').trim().toLowerCase()
  .replace(/[.,!?;:]/g,'').split(/\s+/).filter(Boolean);

export function quizRetryCoachFor(prompt,raw){
  if(!prompt||!['vocab','grammar'].includes(prompt.kind)||typeof raw!=='string'||!raw.trim())
    return null;
  if(prompt.kind==='vocab'){
    const chosen=(prompt.options||[]).find(option=>option.toLowerCase()===raw.trim().toLowerCase());
    if(!chosen||chosen.toLowerCase()===prompt.answer.toLowerCase())return null;
    const meaning=WORD_MEANINGS[chosen.toLowerCase()];
    if(!meaning)return null; // Unrecognized input is not grounds for inventing a definition.
    return Object.freeze({kind:'vocab',selected:chosen,
      message:`「${chosen}」は「${meaning}」という意味。文の場面と意味が合うか、もう一度考えよう。`});
  }
  const current=words(raw),expected=words(prompt.answer);
  if(current.join(' ')===expected.join(' '))return null;
  let prefix=0;
  while(prefix<Math.min(current.length,expected.length)&&current[prefix]===expected[prefix])prefix++;
  const count=current.length<expected.length
    ?`教材の例文より${expected.length-current.length}語少ないよ。語が抜けていないか確かめよう。`
    :current.length>expected.length
    ?`教材の例文より${current.length-expected.length}語多いよ。余分な語がないか確かめよう。`
    :'必要な語数はそろっているよ。';
  return Object.freeze({kind:'grammar',matchingPrefix:prefix,
    message:`${count} ${prefix?`最初の${prefix}語は教材の例文と同じ並び。続きの語順に注目しよう。`:'先頭から語順を見直そう。疑問文か平叙文かもヒントになるよ。'}`});
}

// Used by curriculum QA to detect a newly introduced distractor that lacks
// an authored, safe-to-show meaning.
export function missingQuizWordMeanings(prompts){
 return [...new Set(prompts.filter(prompt=>prompt.kind==='vocab')
   .flatMap(prompt=>prompt.options||[]).map(option=>option.toLowerCase()))]
   .filter(word=>!Object.hasOwn(WORD_MEANINGS,word));
}
