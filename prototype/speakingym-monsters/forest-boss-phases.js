// Narrative-only boss mechanics: the English prompt remains the single source
// of truth for grading, retries and XP. No AI/network calls or hidden answers.
import { bossConversationTurn } from './forest-boss-story.js';

const CHAPTER_BEATS=Object.freeze({
 entry:Object.freeze({
  name:'トゲ王の試練',english:'THORN KING TRIAL',
  titles:['こだまの声','トゲの暗号','最後の返事'],
  titlesEn:['ECHO CHALLENGE','THORN CIPHER','YOUR REPLY'],
  contexts:['トゲ王の声を聞いて意味をつかもう。','トゲの暗号を解いて、自然な英文をつくろう。','トゲ王に自分の英語で答えよう。'],
  contextsEn:['Listen to the Thorn King and understand the message.','Break the thorn cipher by choosing the right wording.','Respond to the Thorn King in your own English.']
 }),
 glade:Object.freeze({
  name:'光の三重結界',english:'PRISM TRIAL',
  titles:['声を隠す光','プリズムの鍵','光の番人への返事'],
  titlesEn:['HIDDEN VOICE','PRISM KEY','ANSWER THE WARDEN'],
  contexts:['光の番人が旅人の声を隠した。音声を聞いて必要な情報をつかもう。','プリズムの鍵は正しい単語。意味に合う言葉を見つけよう。','光の番人が道を開くか迷っている。場面に合わせて英語で伝えよう。'],
  contextsEn:['The Sun Warden hides a travel message in the light. Listen for its meaning.','A word unlocks the prism. Choose the one that fits the meaning.','The Warden is waiting for your answer. Speak using the situation shown below.']
 }),
 thicket:Object.freeze({
  name:'霧の三重封印',english:'MIST TRIAL',
  titles:['霧のこだま','乱れた呪文','霧の騎士への返事'],
  titlesEn:['MIST ECHO','SCRAMBLED SPELL','ANSWER THE KNIGHT'],
  contexts:['霧の騎士が声を反響させている。音声を聞いて内容を確かめよう。','霧で乱れた英文を正しい語順に戻そう。','霧の騎士を説得するには、自分の言葉で状況を伝える必要がある。'],
  contextsEn:['The Mist Knight sends an echo through the fog. Listen closely.','The fog has scrambled a sentence. Put its words in a natural order.','Explain your response in English to lift the Knight’s final seal.']
 }),
 sanctuary:Object.freeze({
  name:'古木の三つの問い',english:'ANCIENT TRIAL',
  titles:['古木のささやき','ことばの実','守護者との対話'],
  titlesEn:['ANCIENT WHISPER','WORD OF THE ROOTS','SPEAK TO THE GUARDIAN'],
  contexts:['古木の守護者が静かに問いかける。聞こえた内容を理解しよう。','言葉を選ぶ力が試される。文脈に合った単語を探そう。','最後は自分の英語で伝えよう。これまでの練習を使う番だ。'],
  contextsEn:['The Elder Root whispers a question. Listen and understand the message.','The roots test your word choice. Pick the word that fits the context.','The guardian asks you to speak freely using the situation below.']
 })
});
export const FOREST_BOSS_CHAPTERS=CHAPTER_BEATS;
// Telegraphs are honest information about the NEXT task type, not hints to
// the correct answer. Bosses never consume lives or alter scoring themselves.
export const FOREST_BOSS_SIGNATURES=Object.freeze({
 entry:Object.freeze([
  Object.freeze({id:'echo',name:'いばらのこだま',tell:'声が森じゅうに響く。聞こえた内容をつかもう。',guard:'こだまが仲間の攻撃をさえぎった。'}),
  Object.freeze({id:'cipher',name:'トゲの暗号',tell:'文字がいばらに絡まる。言葉を整理しよう。',guard:'暗号の結界が攻撃をはね返した。'}),
  Object.freeze({id:'vow',name:'トゲ王の問い',tell:'王が返事を待っている。自分の英語で伝えよう。',guard:'王のいばらがまだ道をふさいでいる。'})
 ]),
 glade:Object.freeze([
  Object.freeze({id:'flare',name:'まぶしい閃光',tell:'光が言葉を隠した。音声の内容に集中しよう。',guard:'閃光の結界が攻撃を受け止めた。'}),
  Object.freeze({id:'prism',name:'七色のプリズム',tell:'言葉が七色に分かれる。文脈に合う一語を選ぼう。',guard:'プリズムが輝き、攻撃をそらした。'}),
  Object.freeze({id:'sunrise',name:'暁の審判',tell:'光の番人が返事を求める。自分の英語で答えよう。',guard:'光の壁がまだ立ちはだかる。'})
 ]),
 thicket:Object.freeze([
  Object.freeze({id:'whisper',name:'霧のささやき',tell:'遠くで声がする。聞こえた内容を確かめよう。',guard:'霧のこだまに攻撃が吸い込まれた。'}),
  Object.freeze({id:'scramble',name:'迷いの呪文',tell:'霧が言葉を並べ替えた。正しい語順を考えよう。',guard:'呪文の壁が攻撃をはね返した。'}),
  Object.freeze({id:'veil',name:'深霧の契約',tell:'霧の騎士が話を聞こうとしている。英語で伝えよう。',guard:'深い霧がまだ道を閉ざしている。'})
 ]),
 sanctuary:Object.freeze([
  Object.freeze({id:'rootsong',name:'古木の歌',tell:'古木がささやく。音声の情報を聞き取ろう。',guard:'木々のざわめきが攻撃を包み込んだ。'}),
  Object.freeze({id:'seed',name:'ことばの種',tell:'一つの言葉が芽を出す。文脈に合う単語を見つけよう。',guard:'根が伸びて、攻撃を受け止めた。'}),
  Object.freeze({id:'oath',name:'森の最後の問い',tell:'守護者が答えを待つ。伝わる英語で話そう。',guard:'古木の結界がまだ残っている。'})
 ])
});


export function forestBossPhase({areaId='entry',index=0,wave=1,level='easy',prompt=null}={}){
  const chapter=CHAPTER_BEATS[areaId];
  const turn=index-4;
  if(!chapter || turn<1 || turn>3 || !prompt || !['easy','normal','hard'].includes(level))return null;
  const kind=prompt.kind;
  if((turn===1&&kind!=='listen')||
     (turn===2&&!['grammar','vocab'].includes(kind))||
     (turn===3&&kind!=='speak'))return null;
  // Keep the deliberately authored first-entrance conversation unchanged.
  const authored=areaId==='entry'?bossConversationTurn(wave,level,index):null;
  const special=authored?.id===prompt.id?authored:null;
  const english=level!=='easy';
  const title=special?.title||(english?chapter.titlesEn[turn-1]:chapter.titles[turn-1]);
  const context=special?.context||(english?chapter.contextsEn[turn-1]:chapter.contexts[turn-1]);
  return Object.freeze({turn,areaId,kind,chapter:english?chapter.english:chapter.name,
    title,context,authored:!!special,phaseKey:`${areaId}-${turn}`,
    signature:FOREST_BOSS_SIGNATURES[areaId][turn-1]});
}
