// Small, hand-reviewed corrections for recognisable speaking mistakes.
// An unfamiliar sentence may be perfectly natural, so this module never
// decides correctness or claims to evaluate pronunciation.
import { normalizeEnglish } from './monster-engine.js';

const RULES=Object.freeze([
  {
    applies:(prompt,text)=>prompt.phraseId==='late'&&/\blate (?:about |roughly |around )?(?:\d+|five|ten|fifteen|twenty|thirty) minutes?\b/.test(text),
    label:'時間の置き方を確認しよう',
    clue:prompt=>{
      const minutes=normalizeEnglish(prompt.answer).match(/\b([a-z0-9]+) minutes? late\b/)?.[1]||'ten';
      return `「何分遅れるか」は ${minutes} minutes late。遅れる長さを late の前に置くよ。`;
    },
    detail:'I will be ten minutes late. の順。I will be late ten minutes. だと不自然に聞こえる。'
  },
  {
    applies:(prompt,text)=>prompt.phraseId==='prefer'&&/\b(?:i'm|i am) prefer\b/.test(text),
    label:'prefer の前に be 動詞は不要',
    clue:'prefer はそれ自体が動詞。I prefer ... と言うので、I am prefer ... にはしないよ。',
    detail:"I prefer the window seat. / I'd prefer a quieter table. のように使える。"
  },
  {
    applies:(prompt,text)=>prompt.phraseId==='problem'&&/\bdid(?:n't| not) received\b/.test(text),
    label:'did の後は動詞の原形',
    clue:"didn't の後は received ではなく receive。届いていない状態を伝えるなら haven't received も使える。",
    detail:"I didn't receive the email. / I haven't received my ticket. のどちらも自然。"
  },
  {
    applies:(prompt,text)=>prompt.phraseId==='direction'&&/\btell me where (?:is|are)\b/.test(text),
    label:'間接疑問文の語順にしよう',
    clue:'Could you tell me ...? に続く where 以下は、疑問文の語順ではなく「where + 主語 + 動詞」にするよ。',
    detail:'Where is the station? → Could you tell me where the station is?'
  },
  {
    applies:(prompt,text)=>prompt.phraseId==='repeat'&&/\brepeat me (?:the|that|it|this)\b/.test(text),
    label:'repeat の目的語を確認しよう',
    clue:'repeat の後にもう一度聞きたい内容を置く。相手に言うなら repeat that for me が自然。',
    detail:'Could you repeat the platform number? / Could you repeat that for me?'
  }
]);

export function speakingFeedbackFor(prompt,answer){
  if(!prompt||['vocab','grammar'].includes(prompt.kind)||!String(answer||'').trim())return null;
  const normalized=normalizeEnglish(answer);
  const rule=RULES.find(item=>item.applies(prompt,normalized));
  return rule?{
    specific:true,label:rule.label,
    clue:typeof rule.clue==='function'?rule.clue(prompt):rule.clue,
    detail:rule.detail
  }:{
    specific:false,label:'この場面で伝えるポイント',
    clue:prompt.task||prompt.cue||'相手に伝えたい内容をもう一度整理してみよう。',
    detail:prompt.tip||'例文以外にも自然な言い方があるため、簡易判定だけでは正誤を確定できないよ。'
  };
}

// Shared, conservative feedback for speaking, reading-as-speaking, combat and
// scripted roleplay. Never infer grammar/fluency/pronunciation from a text
// transcript. The source of a positive signal is the same vetted checker that
// awarded XP; otherwise the wording explicitly says "not confirmed".
export function conversationFeedbackFor(prompt,answer,grade,{hinted=false,revealExample=false}={}){
 if(!prompt||['vocab','grammar','listen'].includes(prompt.kind))return null;
 const status=grade?.status||'review';
 const confirmed=status==='correct';
 const hasAnswer=Boolean(String(answer||'').trim());
 const specific=hasAnswer?speakingFeedbackFor(prompt,answer):null;
 const met=Array.isArray(grade?.checks?.met)?grade.checks.met.filter(item=>typeof item==='string').slice(0,5):[];
 const missing=Array.isArray(grade?.checks?.missing)?grade.checks.missing.filter(item=>typeof item==='string').slice(0,5):[];
 // The authored criteria can identify what the *local rubric* did not find,
 // not prove that a natural paraphrase is actually missing that information.
 // Lead with one actionable item instead of repeating a generic retry hint.
 const rubricFocus=!confirmed&&['review','incomplete'].includes(status)&&grade?.method==='curated-criteria'&&missing.length
   ?`まず「${missing[0].slice(0,80)}」が伝わるように言い直してみよう。${missing.length>1?`ほかの${missing.length-1}項目も下で確認してね。`:''}教材の照合で見つからなかっただけで、誤答とは断定していないよ。`
   :null;
 const next=confirmed
   ?'同じ用件を、例文を見ずに別の言葉でも伝えてみよう。'
   :status==='empty'?'短くても大丈夫。英語の一文を入力・音声入力してから確認しよう。'
   :status==='incorrect'?'まず状況の条件を見直し、希望・数・時間などを言い直してみよう。'
   :rubricFocus?rubricFocus
   :status==='incomplete'?'伝える条件を一つずつ確認して、足りない情報を加えてみよう。'
   :'文字起こしを確認してから別の言い方も試そう。自然な英文でも簡易判定では確認できない場合があるよ。';
 const variants=confirmed?[...(prompt.alternatives||[])].filter(item=>typeof item==='string'&&item.trim()&&
   normalizeEnglish(item)!==normalizeEnglish(answer)&&normalizeEnglish(item)!==normalizeEnglish(prompt.answer)).slice(0,2):[];
 return {
  status,confirmed,hinted:Boolean(hinted),hasAnswer,
  verdict:confirmed?(hinted?'ヒントを使って内容を確認できた':'教材の基準で内容を確認できた'):
   status==='empty'?'まだ回答は判定していない':status==='incorrect'?'登録済みの条件と異なる回答':status==='incomplete'?'必要な情報の一部が不足':'内容を確定できないため保留',
  checked:met,
  // On a registered-example match the task is known, but there are no
  // per-component check results. Do not fabricate a detailed breakdown.
  target:prompt.task||prompt.cue||prompt.scene||'この場面の用件を英語で伝える',
  missing:confirmed?[]:missing,
  correction:specific?.specific?specific:null,
  // A detailed teaching tip is a hint. Keep it for verified results or
  // explicitly forfeited-XP example review, not an unassisted retry.
  tip:confirmed||revealExample?prompt.tip||null:null,
  next,
  example:(confirmed||revealExample)?prompt.answer:null,
  variants
 };
}
