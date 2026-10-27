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
    title,context,authored:!!special,phaseKey:`${areaId}-${turn}`});
}
