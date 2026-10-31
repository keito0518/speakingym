// Browser-only, conservative communicative-content checks for authored prompts.
// Newly added situations accept vetted examples; otherwise they abstain rather than invent a grade.
// This is NOT an AI / pronunciation / full grammar grade. Unclear paraphrases remain
// 'review', not 'wrong'. No reward is ever minted from empty/unsupported answers.
import { ALL_PROMPTS } from './monster-data.js';
import { normalizeEnglish, normalizeEnglishNumbers, compareWithExamples } from './monster-engine.js';
import { gradeDelayMeaning } from './speaking-meaning.js';

const OR = (...parts) => parts.join('|');
const intent = {
 think: OR('let me think','give me (a |one )?(moment|minute|second)','need (a |some )?(time|moment)','can i (have|get) (a |some )?(moment|minute|time)','not (sure|ready)( yet)?',
   '(?:can|could) i (?:have|get|take) (?:a little|a bit|some) more time (?:to (?:decide|think))?',
   'i (?:need|would like) (?:a little|a bit|some) more time (?:to (?:decide|think))?'),
 repeat: OR('(could|can|would) you (please )?(repeat|say|go over)','say (that|it) again','didn.t (catch|hear)','come again',
   'would you mind (?:repeating|saying|going over) (?:that|it|the .+|what you said)'),
 agree: OR('(works|is fine|is good) for me','sounds (great|good|fine)','(that|friday|saturday|lunch|three|nine) (is|would be) (fine|good|great|ok|okay)','i can (make|do) (it|that|friday)'),
 late: OR('(running|be|arriv(e|ing)|get(ting)?) (about |a little |some |a bit |roughly |around |approximately )?([a-z0-9 ]+ )?late','won.t (be|get|make it) (there |on )?time','(delay|delayed)','behind schedule'),
 clarify: OR('just to (make sure|confirm|check)','(could|can) (i|you) (confirm|check)','(is|are|does|do|should) .+ (right|correct|okay)','which (time|deadline)'),
 prefer: OR('(i.d|i would|i) rather','(i.d|i would|i) prefer','(let.s|we should) take the train','train (is|would be) (better|faster|cheaper)')
};
const row=(label, ...patterns) => ({label, patterns});
const rubric = {
 // Simple everyday apologies accept meaning-preserving, polite alternatives.
 // Do not insist on the single model sentence; opposite meaning/negation is
 // handled by the polarity guard below.
 'apology-late': [
   row('待たせたこと、または遅れたことを謝る',
     '(?:i am |i.m )?(?:really |so )?sorry (?:that )?(?:i.m |i am |i was |i.ve been )?late',
     '(?:i am |i.m )?(?:really |so )?sorry (?:for |about )?(?:being late|the wait|the delay|waiting|keeping you waiting|making you wait|taking so long)',
     '(?:i am |i.m )?(?:really |so )?sorry (?:i |to have )(?:kept you waiting|made you wait|took so long)',
     'i (?:really )?apologi[sz]e (?:for (?:the wait|being late|keeping you waiting)|that i kept you waiting)',
     'my apologies (?:for |about )?(?:the wait|the delay|being late)',
     'sorry to (?:keep you waiting|make you wait)',
     'sorry for (?:keeping you waiting|making you wait|taking so long)',
     'i kept you waiting (?:i.m )?sorry',
     'sorry (?:it took me|i took) (?:so )?long')
 ],
 // Everyday requests can be understood by intent and crucial context,
 // rather than reproducing the example's exact wording.
 'help-bag': [row('荷物を手伝ってもらう',
   '(?:can|could|would) you (?:please )?(?:help me|give me a hand|carry|lift|hold) (?:with |carrying |lifting |holding )?(?:this |my |the )?(?:bag|suitcase|luggage)',
   '(?:can|could) i (?:get|have) (?:some )?help (?:with )?(?:my |the |this )?(?:bag|suitcase|luggage)',
   '(?:would you mind )?(?:helping me|giving me a hand) (?:with|carrying) (?:this |my |the )?(?:bag|suitcase|luggage)')],
 'order-coffee': [row('アイスコーヒーを注文する',
   '(?:i.d |i would )?(?:like|love) (?:an? |one )?(?:large |big )?iced coffee',
   '(?:i.d|i would) (?:like|love) to order (?:an? |one )?(?:large |big )?iced coffee',
   '(?:can|could|may) i (?:have|get|order) (?:an? |one )?(?:large |big )?iced coffee',
   '(?:one |an? )?iced coffee please')],
 'direction-station': [row('駅への行き方を尋ねる',
   '(?:where is|where.s) (?:the |a )?(?:nearest |closest )?(?:train )?station',
   'how (?:do|can) i (?:get|go|walk) to (?:the |a )?(?:nearest |closest )?(?:train )?station',
   '(?:what.s|what is) the (?:best|quickest|fastest|shortest|easiest) way to (?:the |a )?(?:nearest |closest )?(?:train )?station',
   '(?:can|could|would) you (?:please )?(?:point me in the direction of|show me the quickest way to) (?:the |a )?(?:nearest |closest )?(?:train )?station',
   '(?:could|can|would) you (?:please )?(?:tell|show) me (?:how to get to|where|the way to) (?:the |a )?(?:nearest |closest )?(?:train )?station')],
 'booking-table':[row('2人分のテーブルを予約する',
   '(?:can|could|may) i (?:book|reserve|get) (?:a |one )?table for (?:two|2)',
   '(?:i.d |i would )?like to (?:book|reserve) (?:a |one )?table for (?:two|2)',
   '(?:i.d |i would )?like (?:to make )?a reservation for (?:two|2)',
   '(?:can|could) i make a reservation for (?:two|2)',
   '(?:do you have|is there) (?:a |one )?table for (?:two|2) (?:available|free)')],
 'price-ticket':[row('チケット料金を尋ねる',
   'how much (?:is|does|do|are) (?:the |a |one )?(?:admission|entry|entrance|ticket|tickets|fee)',
   'how much (?:is|does) (?:an? |the )?adult (?:admission |entry )?ticket (?:cost)?',
   '(?:what.s|what is) (?:the )?(?:ticket price|entry fee|admission fee|entrance fee|price of (?:a |the )?ticket)')],
 'think-cafe': [row('少し考える時間を頼む', intent.think)],
 'think-trip': [row('決める時間が必要だと伝える', intent.think)],
 'repeat-station': [row('もう一度言ってもらう', intent.repeat), row('ホーム番号を指定する','platform','track (number|information)')],
 'repeat-class': [row('もう一度説明を頼む', intent.repeat), row('宿題・課題を指定する','homework','assignment','instructions')],
 'agree-friend': [row('土曜日の3時に同意する',intent.agree),row('日時を示す','three','3','saturday')],
 'agree-work': [row('変更を承諾する',intent.agree),row('金曜日に言及する','friday')],
 'late-bus': [row('遅れることを伝える',intent.late),row('申し訳ないと添える','sorry','apologiz')],
 'late-call': [row('遅れることを伝える',intent.late),row('10分程度と伝える','ten','10')],
 'clarify-hotel': [row('確認する',intent.clarify,
   // A direct question and a polite request for the time are confirmations too.
   // Keep this scoped to hotel checkout, not to every open-ended question.
   '(?:is|does) (?:the )?check ?out(?: time)? (?:at |set for |scheduled for )?(?:eleven|11)',
   '(?:please )?tell me (?:if|whether) check ?out is (?:at )?(?:eleven|11)',
   '(?:can|could|would) you (?:please )?(?:tell me|confirm) (?:if|whether) check ?out is (?:at )?(?:eleven|11)'),
   row('11時と伝える','eleven','11'),row('チェックアウトについて話す','check ?out','checkout')],
 'clarify-office': [row('確認する',intent.clarify),row('昼食前の締め切りに触れる','before lunch','by lunch','lunchtime')],
 'prefer-city': [row('電車を希望する', intent.prefer),row('理由を伝える','because','since','as it is','faster','quicker','speed')],
 'prefer-friend': [row('電車を希望する', intent.prefer)],
 'boss-delay-apology':[row('遅れを謝る','sorry','apologiz'),
   row('バスが遅れている理由を伝える','bus.*(delay|late|cancel|stuck)','(delay|late).*bus'),
   row('屋内で待つ提案をする','(wait|go|stay).*inside','wait indoors','somewhere warm','go into')]
};
// Easy cues do not demand extra details that appear only in the English instructions.
const easy = {
 'repeat-station':[row('聞き返しを依頼',intent.repeat)],
 'repeat-class':[row('聞き返しを依頼',intent.repeat)],
 'agree-friend':[row('提案に同意',intent.agree)],
 'agree-work':[row('提案に同意',intent.agree)],
 'late-bus':[row('遅れることを伝える',intent.late)],
 'late-call':[row('遅れることを伝える',intent.late)],
 'prefer-city':[row('電車を希望する',intent.prefer)],
 'boss-delay-apology':[row('謝る','sorry','apologiz'),
   row('バスが遅れていることを伝える','bus.*(delay(?:ed)?|late)','(delay(?:ed)?|late).*bus')]
};
// Normal and hard tasks must not fall through to an easier single-intent
// rubric. Each row describes a meaning-bearing condition from the actual
// authored task; matching one keyword alone is not a complete answer.
const normal = {
 'direction-station':[...rubric['direction-station'],row('最寄りの駅を探す','nearest','closest')],
 'booking-table':[...rubric['booking-table'],row('夕食の予約','dinner','evening')],
 'price-ticket':[row('大人用チケットの料金を尋ねる',
   'how much (?:is|does) (?:an? |the )?adult (?:admission |entry )?ticket(?: cost)?',
   'how much (?:is|does) (?:the |a )?(?:admission|entry|entrance) (?:fee )?for (?:an? |one )?adult',
   '(?:what.s|what is) (?:the )?(?:price|cost) of (?:an? |the )?adult ticket')]
};
const hard = {
 'help-bag':[row('2個の荷物の手伝いを頼む',
   '(?:could|can|would) you (?:please )?(?:help me|give me a hand|assist me|carry|lift) (?:with |carry |carrying |lifting )?(?:these two|both|my two|the two) (?:heavy )?(?:suitcases|bags|cases)',
   '(?:would you mind )?(?:helping me|giving me a hand) (?:with |carrying )?(?:these two|both|my two|the two) (?:heavy )?(?:suitcases|bags|cases)'),
   row('2個の荷物','two (?:heavy )?(?:suitcases|bags|cases)','2 (?:heavy )?(?:suitcases|bags|cases)','both (?:suitcases|bags|cases)'),
   row('エレベーターが使えない理由','(?:elevator|lift).*(?:out of order|broken|not working|unavailable)','(?:out of order|broken).*(?:elevator|lift)')],
 'order-coffee':[...rubric['order-coffee'],row('大きいサイズ','large','big'),
   row('砂糖なし','without (?:added )?sugar','no (?:added )?sugar','unsweetened','sugar.free'),
   row('持ち帰り','to go','takeaway','take away','takeout','take out')],
 'direction-station':[...normal['direction-station'],row('階段を避ける','step.free','without (?:using )?stairs','avoid (?:the )?stairs','no stairs','accessible route')],
 'booking-table':[...rubric['booking-table'],row('7時の予約','seven','7'),
   row('入口から離れた席','away from (?:the )?(?:entrance|door)','not near (?:the )?(?:entrance|door)','quiet table (?:away|far) from (?:the )?(?:entrance|door)')],
 'price-ticket':[row('合計料金を尋ねる',
   'how much (?:would|will|does) (?:it|the total|everything|two adult|2 adult).*(?:cost|be)',
   'how much (?:is|for) (?:the )?(?:total|two adults|2 adults|two adult tickets|2 adult tickets)',
   'what (?:is|would be) the (?:total )?(?:price|cost)'),
   row('大人2人と学生1人','two adult (?:tickets|admissions|fares)','2 adult (?:tickets|admissions|fares)','two adults','2 adults'),
   row('学生1人の券','one student (?:ticket|admission|fare)','1 student (?:ticket|admission|fare)','one student','1 student'),
   row('学生割引を確認','student discount','student rate','discount for students')],
 'apology-late':[...rubric['apology-late'],row('20分待たせた','twenty minutes','20 minutes'),
   row('電車のトラブルを説明','train.*(?:stopp?ed|broke down|was delayed|got stuck)','(?:stopp?ed|delayed|stuck).*train'),
   row('待ってくれたことに感謝','thank you for waiting','thanks for waiting','thank you for your patience','thanks for your patience')],
 'think-cafe':[row('決めるための時間を頼む',intent.think),row('原材料・乳製品を確認する','ingredient','milk','dairy','allerg'),row('後ろの人に先に注文してもらう','go ahead','order first','before me','after you')],
 'think-trip':[row('決める時間が必要',intent.think),row('勤務予定の確認','schedule','work','shift','availability'),row('今夜返答する','tonight','this evening','by the end of the day')],
 'repeat-station':[row('聞き返しを依頼',intent.repeat),row('乗り換え駅','transfer','change trains','change at','connection'),row('ホーム番号','platform','track')],
 'repeat-class':[row('もう一度説明を依頼',intent.repeat),row('2番目の手順','second','step two','step 2','part two'),row('締め切り','due','deadline','when.*submit')],
 'agree-friend':[row('昼食案に同意',intent.agree,'lunch sounds good'),row('昼食について','lunch','noon'),row('具体的な時刻を提案','twelve','12','one','1','half past')],
 'agree-work':[row('金曜日9時を承諾',intent.agree),row('金曜に言及','friday'),row('9時に言及','nine','9'),row('事前の議題を依頼','agenda','topics','talk about','discuss')],
 'late-bus':[row('謝罪','sorry','apologiz'),row('遅れることを伝える',intent.late),row('20分の見込み','twenty','20'),row('バスの運休','cancel(?:l?ed|l?ation)?','bus.*not (come|run)','bus.*stop'),row('屋内で待つ提案','inside','indoors','warm','cafe')],
 'late-call':[row('謝罪','sorry','apologiz'),row('会議が長引いている','meeting','call.*long'),row('3時15分を提案','three fifteen','3:15','3\.15','fifteen past three')],
 'clarify-hotel':[row('時間の確認',intent.clarify,'which time'),row('11時と10時の相違','eleven.*ten','ten.*eleven','11.*10','10.*11'),row('荷物を預けたい','luggage','bags','suitcase','store.*bag')],
 'clarify-office':[row('確認する',intent.clarify),row('金曜日の日本時間17時','friday'),row('時刻と時間帯','five','5 pm','5 p.m','17:00','17\.00'),row('日本時間','japan','jst','tokyo'),row('PDF形式','pdf','file format')],
 'prefer-city':[row('電車を選ぶ',intent.prefer),row('バスの直行という利点に言及','bus','direct'),row('速さを理由に挙げる','fast','quick','speed','time')],
 'prefer-friend':[row('電車を選ぶ',intent.prefer),row('費用を理由に挙げる','cheap','cost','save money','afford','expensive'),row('天気次第で再検討','rain','weather','storm'),row('タクシーも検討','taxi','cab')],
 'boss-delay-apology':[row('謝る','sorry','apologiz'),
   row('バスの運休を説明する','bus.*(cancel(?:l?ed|l?ation)?|not run|not coming)','cancel(?:l?ed|l?ation)?.*bus','not run.*bus'),
   row('20分遅れる見込みを伝える','twenty','20'),
   row('屋内など暖かい場所で待つ提案をする','(wait|go|stay).*inside','wait indoors','somewhere warm','go into')]
};
// Some prompts cannot be reliably marked "correct" without an explicit signal.
// The criteria intentionally bias toward abstention rather than over-crediting.
const known = new Set(ALL_PROMPTS.map(p=>p.id));
function passes(text, requirement) {
 return requirement.patterns.some(p => {
   try { return new RegExp('(?:^|\\b)(?:'+p+')(?:\\b|$)','i').test(text); }
   catch { return false; }
 });
}
// Detect changes of intent that keyword rubrics would otherwise mistake
// for success. Ambiguity -> review, NOT incorrect: spoken English remains open.
function conflictingDetails(base,text,difficulty='easy'){
  const note=message=>({status:'review',reasons:[message],confidence:'low',method:'context-safety'});
  if(/\b(?:but actually|actually i (?:want|prefer|need)|instead of|rather than)\b/.test(text))
    return note('途中で希望を変更している可能性があります。最終的に伝えたい内容を一文で確認してみよう。');
  if(base==='booking-table'){
    const sizes=[...text.matchAll(/\b(?:table for|party of|for|or|and|actually) (one|two|three|four|five|six|seven|eight|[1-9])\b/g)];
    if(sizes.some(m=>!['two','2'].includes(m[1])))
      return note('この場面で必要なのは2人分の席です。人数を確認してみよう。');
  }
  if(base==='order-coffee'&&/\b(?:hot coffee|warm coffee|hot tea|tea instead|without ice)\b/.test(text))
    return note('この場面はアイスコーヒーの注文です。温かい飲み物と取り違えていないか確認しよう。');
  if(base==='order-coffee'&&difficulty==='hard'&&/\b(?:with (?:extra )?sugar|sweetened|for here)\b/.test(text))
    return note('この場面は砂糖なし・持ち帰りです。追加した条件を確認してみよう。');
  if(base==='direction-station'&&/\b(?:bus stop|airport|hospital|supermarket)\b/.test(text))
    return note('行き先は駅です。別の施設を尋ねていないか確認しよう。');
  if(base==='agree-friend'){
    if(/\b(?:sunday|monday|tuesday|wednesday|thursday|friday)\b/.test(text)||
       /\b(?:at|around|about) (?:one|two|four|five|six|seven|eight|nine|ten|eleven|twelve|[124-9])\b/.test(text))
      return note('提案された午後3時と違う日時が含まれているようです。確認してみよう。');
  }
  if(base==='agree-work'&&/\b(?:monday|tuesday|wednesday|thursday|saturday|sunday)\b/.test(text))
    return note('提案された金曜日以外の日が含まれています。');
  if(base==='prefer-city'||base==='prefer-friend'){
    if(/\b(?:prefer|rather (?:take|use)|choose|want to take) (?:the )?bus\b/.test(text))
      return note('この場面では電車を選ぶ必要があります。希望の乗り物を確認してみよう。');
  }
  return null;
}
export function gradeLocalResponse(prompt, raw) {
 if(!prompt || !known.has(prompt.id)) return {status:'ungraded',reasons:['未登録の問題です。'],confidence:'none'};
 const text=normalizeEnglish(raw);
 // Quiz controls have a complete authored answer: a wrong option or word
 // order is objectively incorrect, unlike open-ended spoken English.
 if(prompt.kind==='vocab'||prompt.kind==='grammar'){
   if(!text)return {status:'empty',reasons:['単語を選ぶか、カードを並べて答えてください。'],confidence:'none'};
   if(normalizeEnglishNumbers(raw)===normalizeEnglishNumbers(prompt.answer))
     return {status:'correct',reasons:[],confidence:'high',method:'exact-quiz'};
   return {status:'incorrect',reasons:[prompt.kind==='vocab'?'別の単語を選んでみよう。':'語順をもう一度考えてみよう。'],confidence:'high',method:'exact-quiz'};
 }
 if (!text || text.length<5 || text.split(' ').length<2) return {status:'empty',reasons:['英語で回答を入力するか、マイクで話してください。'],confidence:'none'};
 if(text.length>550) return {status:'ungraded',reasons:['回答は550文字以内にしてください。'],confidence:'none'};
 // Author-vetted example answers are the narrowest high-confidence path.
 const compared=compareWithExamples(prompt,raw);
 if(compared.matchesExample) return {status:'correct',reasons:[],confidence:compared.matchKind==='missing-articles'?'medium':'high',
   method:compared.matchKind==='missing-articles'?'article-tolerant':'registered-example',
   ...(compared.matchKind==='missing-articles'?{coaching:'意味は伝わっているよ！ 冠詞（a / an / the）を入れると、もっと自然に聞こえるよ。',preferredAnswer:compared.preferredAnswer}:{})};
 const difficulty=prompt.difficulty||'easy';
 const base=prompt.baseId || prompt.id;
 // Arrival estimates are checked as meaning-bearing quantities, not merely
 // by spotting the words "late" and "ten" anywhere in a sentence.
 // The normal phone call specifically asks for a 10-minute delay.
 if(base==='late-call'&&difficulty==='normal')
   return {...gradeDelayMeaning(raw,10),confidence:'high',method:'arrival-meaning'};
 // Only the easiest traffic prompt asks for exactly one piece of information.
 // More advanced variants require additional reasons, apologies and proposals:
 // their numerical checks can reject contradictions but cannot grant XP alone.
 if(base==='late-traffic'){
   const expected={easy:5,normal:15,hard:30}[difficulty];
   const meaning=gradeDelayMeaning(raw,expected);
   if(meaning.status==='incorrect'||meaning.status==='incomplete'||
       (difficulty==='easy'&&meaning.status==='correct'))
     return {...meaning,confidence:'high',method:'arrival-meaning'};
   if(difficulty!=='easy'&&meaning.status==='correct')
     return {status:'review',reasons:['遅れる分数は伝わりました。理由や追加の依頼も必要です。'],confidence:'low',method:'arrival-meaning'};
 }
 // A vocabulary signal within a negated sentence is not evidence that the
 // requested meaning was conveyed. Only narrow, positive-intent negatives
 // ("not on time" and "not sure yet") may use the heuristic rubric.
 // "No sugar" and "no stairs" are the requested positive constraints in
 // these specific tasks, not a negation of the learner's chosen action.
 // Redact ONLY those narrow spans; any other negation still stops scoring.
 let polarityText=text;
 if(difficulty==='hard'){
   if(base==='order-coffee')polarityText=polarityText.replace(/\bno (?:added )?sugar\b/g,'');
   if(base==='direction-station')polarityText=polarityText.replace(/\bno stairs\b/g,'');
   if(base==='help-bag')polarityText=polarityText.replace(/\b(?:elevator|lift) (?:is )?not working\b/g,'');
   if(base==='booking-table')polarityText=polarityText.replace(/\bnot near (?:the )?(?:entrance|door)\b/g,'');
 }
 const hasNegation=/\b(?:not|never|no|won't|can't|cannot|don't|doesn't|didn't|isn't|aren't|wasn't|weren't)\b/.test(polarityText);
 const intendedNegative=(
   (prompt.phraseId==='late'&&/\b(?:won't|will not|can't|cannot) (?:be |get |make it )?(?:there )?on time\b/.test(text)) ||
   (prompt.phraseId==='think'&&/\bnot (?:sure|ready|decided)\b/.test(text))
 );
 if(hasNegation&&!intendedNegative)
   return {status:'review',reasons:['否定表現が含まれているため、伝えたい意味が逆になっていないか確認しよう。'],confidence:'low',method:'polarity-review'};
 // A rubric can match a keyword from an abandoned or conflicting choice.
 // Guard *before* crediting any non-exact spoken phrase.
 const conflict=conflictingDetails(base,text,difficulty);
 if(conflict)return conflict;
 const list=difficulty==='hard'?hard[base]:difficulty==='normal'?(normal[base]||rubric[base]):(easy[base]||rubric[base]);
 if(!list?.length) return {status:'review',reasons:['この場面では、登録済みの例文や言い換えとは異なる表現でした。自然な英語の可能性があるので誤答とは判定しません。'],confidence:'low',method:'example-review'};
 const missing=list.filter(item=>!passes(text,item)).map(item=>item.label);
 if(!missing.length) {
   return {status:'correct',reasons:[],confidence:'medium',method:'curated-criteria'};
 }
 return {status:'review',reasons:missing,confidence:'low',method:'curated-criteria'};
}
