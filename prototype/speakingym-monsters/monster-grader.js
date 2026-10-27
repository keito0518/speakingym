// Browser-only, conservative communicative-content checks for authored prompts.
// Newly added situations accept vetted examples; otherwise they abstain rather than invent a grade.
// This is NOT an AI / pronunciation / full grammar grade. Unclear paraphrases remain
// 'review', not 'wrong'. No reward is ever minted from empty/unsupported answers.
import { ALL_PROMPTS } from './monster-data.js';
import { normalizeEnglish, compareWithExamples } from './monster-engine.js';
import { gradeDelayMeaning } from './speaking-meaning.js';

const OR = (...parts) => parts.join('|');
const intent = {
 think: OR('let me think','give me (a |one )?(moment|minute|second)','need (a |some )?(time|moment)','can i (have|get) (a |some )?(moment|minute|time)','not (sure|ready)( yet)?'),
 repeat: OR('(could|can|would) you (please )?(repeat|say|go over)','say (that|it) again','didn.t (catch|hear)','come again'),
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
   '(?:i.d |i would )?(?:like|love) (?:an? |one )?iced coffee',
   '(?:can|could|may) i (?:have|get|order) (?:an? |one )?iced coffee',
   '(?:one |an? )?iced coffee please')],
 'direction-station': [row('駅への行き方を尋ねる',
   '(?:where is|where.s) (?:the |a )?(?:train )?station',
   'how (?:do|can) i (?:get|go|walk) to (?:the |a )?(?:train )?station',
   '(?:could|can|would) you (?:please )?(?:tell|show) me (?:how to get to|where|the way to) (?:the |a )?(?:train )?station')],
 'booking-table':[row('2人分のテーブルを予約する',
   '(?:can|could|may) i (?:book|reserve|get) (?:a |one )?table for (?:two|2)',
   '(?:i.d |i would )?like to (?:book|reserve) (?:a |one )?table for (?:two|2)',
   '(?:do you have|is there) (?:a |one )?table for (?:two|2) (?:available|free)')],
 'price-ticket':[row('チケット料金を尋ねる',
   'how much (?:is|does|do|are) (?:the |a |one )?(?:admission|entry|entrance|ticket|tickets|fee)',
   '(?:what.s|what is) (?:the )?(?:ticket price|entry fee|admission fee|entrance fee|price of (?:a |the )?ticket)')],
 'think-cafe': [row('少し考える時間を頼む', intent.think)],
 'think-trip': [row('決める時間が必要だと伝える', intent.think)],
 'repeat-station': [row('もう一度言ってもらう', intent.repeat), row('ホーム番号を指定する','platform','track (number|information)')],
 'repeat-class': [row('もう一度説明を頼む', intent.repeat), row('宿題・課題を指定する','homework','assignment','instructions')],
 'agree-friend': [row('土曜日の3時に同意する',intent.agree),row('日時を示す','three','3','saturday')],
 'agree-work': [row('変更を承諾する',intent.agree),row('金曜日に言及する','friday')],
 'late-bus': [row('遅れることを伝える',intent.late),row('申し訳ないと添える','sorry','apologiz')],
 'late-call': [row('遅れることを伝える',intent.late),row('10分程度と伝える','ten','10')],
 'clarify-hotel': [row('確認する',intent.clarify),row('11時と伝える','eleven','11'),row('チェックアウトについて話す','check ?out','checkout')],
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
 'prefer-city':[row('電車を希望する',intent.prefer)]
};
const hard = {
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
export function gradeLocalResponse(prompt, raw) {
 if(!prompt || !known.has(prompt.id)) return {status:'ungraded',reasons:['未登録の問題です。'],confidence:'none'};
 const text=normalizeEnglish(raw);
 // Quiz controls have a complete authored answer: a wrong option or word
 // order is objectively incorrect, unlike open-ended spoken English.
 if(prompt.kind==='vocab'||prompt.kind==='grammar'){
   if(!text)return {status:'empty',reasons:['単語を選ぶか、カードを並べて答えてください。'],confidence:'none'};
   if(text===normalizeEnglish(prompt.answer))
     return {status:'correct',reasons:[],confidence:'high',method:'exact-quiz'};
   return {status:'incorrect',reasons:[prompt.kind==='vocab'?'別の単語を選んでみよう。':'語順をもう一度考えてみよう。'],confidence:'high',method:'exact-quiz'};
 }
 if (!text || text.length<5 || text.split(' ').length<2) return {status:'empty',reasons:['英語で回答を入力するか、マイクで話してください。'],confidence:'none'};
 if(text.length>550) return {status:'ungraded',reasons:['回答は550文字以内にしてください。'],confidence:'none'};
 // Author-vetted example answers are the narrowest high-confidence path.
 const exact=compareWithExamples(prompt,raw).matchesExample;
 if(exact) return {status:'correct',reasons:[],confidence:'high',method:'registered-example'};
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
 const hasNegation=/\b(?:not|never|no|won't|can't|cannot|don't|doesn't|didn't|isn't|aren't|wasn't|weren't)\b/.test(text);
 const intendedNegative=(
   (prompt.phraseId==='late'&&/\b(?:won't|will not|can't|cannot) (?:be |get |make it )?(?:there )?on time\b/.test(text)) ||
   (prompt.phraseId==='think'&&/\bnot (?:sure|ready|decided)\b/.test(text))
 );
 if(hasNegation&&!intendedNegative)
   return {status:'review',reasons:['否定表現が含まれているため、伝えたい意味が逆になっていないか確認しよう。'],confidence:'low',method:'polarity-review'};
 const list=difficulty==='hard'?hard[base]:difficulty==='easy'?(easy[base]||rubric[base]):rubric[base];
 if(!list?.length) return {status:'review',reasons:['この場面では、登録済みの例文や言い換えとは異なる表現でした。自然な英語の可能性があるので誤答とは判定しません。'],confidence:'low',method:'example-review'};
 const missing=list.filter(item=>!passes(text,item)).map(item=>item.label);
 if(!missing.length) {
   return {status:'correct',reasons:[],confidence:'medium',method:'curated-criteria'};
 }
 return {status:'review',reasons:missing,confidence:'low',method:'curated-criteria'};
}
