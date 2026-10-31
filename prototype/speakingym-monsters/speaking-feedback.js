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
