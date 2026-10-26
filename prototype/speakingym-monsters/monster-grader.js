// Browser-only, conservative communicative-content checks for the 36 curated prompts.
// This is NOT an AI / pronunciation / full grammar grade. Unclear paraphrases remain
// 'review', not 'wrong'. No reward is ever minted from empty/unsupported answers.
import { ALL_PROMPTS } from './monster-data.js';
import { normalizeEnglish, compareWithExamples } from './monster-engine.js';

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
};
const hard = {
 'think-cafe':[row('決めるための時間を頼む',intent.think),row('原材料・乳製品を確認する','ingredient','milk','dairy','allerg'),row('後ろの人に先に注文してもらう','go ahead','order first','before me','after you')],
 'think-trip':[row('決める時間が必要',intent.think),row('勤務予定の確認','schedule','work','shift','availability'),row('今夜返答する','tonight','this evening','by the end of the day')],
 'repeat-station':[row('聞き返しを依頼',intent.repeat),row('乗り換え駅','transfer','change trains','change at','connection'),row('ホーム番号','platform','track')],
 'repeat-class':[row('もう一度説明を依頼',intent.repeat),row('2番目の手順','second','step two','step 2','part two'),row('締め切り','due','deadline','when.*submit')],
 'agree-friend':[row('昼食案に同意',intent.agree,'lunch sounds good'),row('昼食について','lunch','noon'),row('具体的な時刻を提案','twelve','12','one','1','half past')],
 'agree-work':[row('金曜日9時を承諾',intent.agree),row('金曜に言及','friday'),row('9時に言及','nine','9'),row('事前の議題を依頼','agenda','topics','talk about','discuss')],
 'late-bus':[row('謝罪','sorry','apologiz'),row('遅れることを伝える',intent.late),row('20分の見込み','twenty','20'),row('バスの運休','cancel','bus.*not (come|run)','bus.*stop'),row('屋内で待つ提案','inside','indoors','warm','cafe')],
 'late-call':[row('謝罪','sorry','apologiz'),row('会議が長引いている','meeting','call.*long'),row('3時15分を提案','three fifteen','3:15','3\.15','fifteen past three')],
 'clarify-hotel':[row('時間の確認',intent.clarify,'which time'),row('11時と10時の相違','eleven.*ten','ten.*eleven','11.*10','10.*11'),row('荷物を預けたい','luggage','bags','suitcase','store.*bag')],
 'clarify-office':[row('確認する',intent.clarify),row('金曜日の日本時間17時','friday'),row('時刻と時間帯','five','5 pm','5 p.m','17:00','17\.00'),row('日本時間','japan','jst','tokyo'),row('PDF形式','pdf','file format')],
 'prefer-city':[row('電車を選ぶ',intent.prefer),row('バスの直行という利点に言及','bus','direct'),row('速さを理由に挙げる','fast','quick','speed','time')],
 'prefer-friend':[row('電車を選ぶ',intent.prefer),row('費用を理由に挙げる','cheap','cost','save money','afford','expensive'),row('天気次第で再検討','rain','weather','storm'),row('タクシーも検討','taxi','cab')]
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
 if (!text || text.length<5 || text.split(' ').length<2) return {status:'empty',reasons:['英語で回答を入力するか、マイクで話してください。'],confidence:'none'};
 if(text.length>550) return {status:'ungraded',reasons:['回答は550文字以内にしてください。'],confidence:'none'};
 // Author-vetted example answers are the narrowest high-confidence path.
 const exact=compareWithExamples(prompt,raw).matchesExample;
 if(exact) return {status:'correct',reasons:[],confidence:'high',method:'registered-example'};
 const difficulty=prompt.difficulty||'easy';
 const list=difficulty==='hard'?hard[prompt.baseId]:rubric[prompt.baseId || prompt.id];
 if(!list?.length) return {status:'ungraded',reasons:['この問題はまだ自動判定できません。'],confidence:'none'};
 const missing=list.filter(item=>!passes(text,item)).map(item=>item.label);
 if(!missing.length) {
   if (/\b(don't|do not|never|not)\b/.test(text) && !/\b(not sure|not ready|not decided|not on time|not be|not make it|not run)\b/.test(text))
     return {status:'review',reasons:['否定表現を含むため、意味の確認が必要です。'],confidence:'low'};
   return {status:'correct',reasons:[],confidence:'medium',method:'curated-criteria'};
 }
 return {status:'review',reasons:missing,confidence:'low',method:'curated-criteria'};
}
