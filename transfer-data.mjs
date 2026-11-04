/**
 * Speakingym Transfer Check: TWO distinct authored situations require the
 * same communicative skill. The sample answers are hidden until BOTH tries.
 * Results are self-reported, not automatic assessment or proof of proficiency.
 * The data contain no user content and use no paid API.
 */
import {EXTRA_TRANSFER_PAIRS} from './transfer-extra.mjs';
export const TRANSFER_PAIRS = Object.freeze([
 {id:'words-explain-1',reason:'words',skill:'難しい単語を使わず説明する',
  first:{scene:'旅先の駅で',cue:'自分のバッグが見つからないと係員に伝える。',
    example:'I cannot find my bag.',alternative:'I have lost my bag.'},
  second:{scene:'会社のパソコンで',cue:'送られた資料が開けないと同僚に伝える。',
    example:'I cannot open the file.',alternative:'This file does not seem to open.'},
  insight:'ぴったりの専門用語を探すより、I cannot ... で困っていることを先に伝えよう。'},
 {id:'words-explain-2',reason:'words',skill:'簡単な言い方で特徴を説明する',
  first:{scene:'ホテルのフロントで',cue:'部屋のエアコンがちゃんと動いていないと伝える。',
    example:'The air conditioner is not working properly.',alternative:'There is something wrong with the air conditioner.'},
  second:{scene:'カフェで',cue:'注文した飲み物が思っていたより冷たいと伝える。',
    example:'My drink is colder than I expected.',alternative:'This drink is too cold for me.'},
  insight:'細かな名前が分からなくても、問題のある物と状態を短く説明すれば会話を進められる。'},
 {id:'structure-request-1',reason:'structure',skill:'相手に具体的にお願いする',
  first:{scene:'職場で',cue:'明日までに資料を送ってもらえるか同僚に頼む。',
    example:'Could you send me the file by tomorrow?',alternative:'Can you send me the document by tomorrow?'},
  second:{scene:'ホテルで',cue:'タオルをもう2枚持ってきてもらえるか頼む。',
    example:'Could I have two more towels, please?',alternative:'Could you bring us two extra towels?'},
  insight:'同じ「お願い」でも、Can you ...? と Could I have ...? を場面に応じて使い分けよう。'},
 {id:'structure-request-2',reason:'structure',skill:'予定の変更をお願いする',
  first:{scene:'同僚との打ち合わせで',cue:'会議を金曜日に変更できるか相談する。',
    example:'Could we move the meeting to Friday?',alternative:'Would Friday work instead?'},
  second:{scene:'駅の窓口で',cue:'予約した列車をもう少し遅い便に変更できるか尋ねる。',
    example:'Can I change my ticket to a later train?',alternative:'Would it be possible to take a later train?'},
  insight:'move / change / later など基本語を使い、何をどう変えたいのか具体的に伝えよう。'},
 {id:'retrieval-pause-1',reason:'retrieval',skill:'沈黙せず考える時間を作る',
  first:{scene:'会議で意見を求められて',cue:'ちょっと考える時間がほしいと伝える。',
    example:'Let me think for a second.',alternative:'Could I have a moment to think?'},
  second:{scene:'レストランで注文を急かされて',cue:'まだ決めていないので少し待ってほしいと伝える。',
    example:'Could you give me another minute, please?',alternative:'I need a little more time to decide.'},
  insight:'焦って黙るより、Let me ... / Give me ... など短い一言で相手に状況を伝えよう。'},
 {id:'retrieval-confirm-2',reason:'retrieval',skill:'一度確認してから答える',
  first:{scene:'仕事中に数字を聞かれて',cue:'数値をもう一度確かめたいと伝える。',
    example:'Let me double-check the numbers.',alternative:'I would like to check the figures once more.'},
  second:{scene:'旅行中のホテルで',cue:'予約日を念のため確認させてほしいと伝える。',
    example:'Could I confirm the booking date?',alternative:'Let me check my reservation date.'},
  insight:'check / confirm を使うと、情報を確認するための自然な間をつくれる。'},
 {id:'perfection-short-1',reason:'perfection',skill:'完璧より短い断りを選ぶ',
  first:{scene:'友達に夕食へ誘われて',cue:'今夜は参加できないと、短く失礼なく断る。',
    example:'Sorry, I cannot make it tonight.',alternative:'Thanks, but I already have plans.'},
  second:{scene:'仕事の依頼を受けて',cue:'今すぐには手伝えないと、短く伝える。',
    example:'I cannot help right now.',alternative:'I am sorry, but I am busy at the moment.'},
  insight:'長い説明はあとから足せる。最初に一文で意思を伝えてみよう。'},
 {id:'perfection-short-2',reason:'perfection',skill:'一言の意見に理由を添える',
  first:{scene:'仕事で新しい計画を見て',cue:'良い案だが少し心配もあると伝える。',
    example:'I like the idea, but I have some concerns.',alternative:'It sounds good, but I am a bit worried.'},
  second:{scene:'旅行中にホテルを選んで',cue:'気に入ったけれど値段が高いと伝える。',
    example:'I like this hotel, but it is too expensive.',alternative:'It looks nice, but it is over my budget.'},
  insight:'I like ... but ... の短い骨組みから始め、複雑な文章を一度に作ろうとしない。'},
 {id:'surprise-options-1',reason:'surprise',skill:'予想外の提案に選択肢を聞く',
  first:{scene:'カフェで頼んだ商品が品切れ',cue:'ほかにどんな飲み物があるか質問する。',
    example:'What other drinks do you have?',alternative:'What else would you recommend?'},
  second:{scene:'予約したホテルの部屋が使えない',cue:'代わりに利用できる部屋を尋ねる。',
    example:'What other rooms are available?',alternative:'Do you have another room we could use?'},
  insight:'想定外でも、What other ...? で次の選択肢を探すと会話が続く。'},
 {id:'surprise-clarify-2',reason:'surprise',skill:'状況が変わったら必要な情報を聞く',
  first:{scene:'電車の乗り場が突然変わって',cue:'どのホームに向かえばよいか聞く。',
    example:'Which platform should I go to?',alternative:'Could you tell me the new platform number?'},
  second:{scene:'仕事の締切が早まったと言われて',cue:'具体的にいつまで必要なのか確認する。',
    example:'When exactly do you need it?',alternative:'What is the new deadline?'},
  insight:'予想外の出来事では、状況を全部理解する前に必要な一点だけ質問してみよう。'},
 {id:'other-followup-1',reason:'other',skill:'短い質問を返して会話をつなぐ',
  first:{scene:'新しい同僚と月曜日に',cue:'週末はどうだったか尋ねる。',
    example:'How was your weekend?',alternative:'Did you have a good weekend?'},
  second:{scene:'久しぶりに友達に会って',cue:'最近行った旅行はどうだったか尋ねる。',
    example:'How was your trip?',alternative:'Did you enjoy your trip?'},
  insight:'How was ...? のような短い質問でも十分。相手の返事を聞く余裕をつくろう。'},
 {id:'other-confirm-2',reason:'other',skill:'念のため条件を確認する',
  first:{scene:'仕事の約束を決めたあと',cue:'集合が午後3時で合っているか確認する。',
    example:'Just to confirm, we are meeting at three, right?',alternative:'We are meeting at 3 p.m., correct?'},
  second:{scene:'タクシーの乗車前に',cue:'行き先が駅で合っているか確認する。',
    example:'Just to confirm, we are going to the station, right?',alternative:'The destination is the station, correct?'},
  insight:'Just to confirm ... は時刻だけでなく、行き先や予約内容の確認にも使える。'},
...EXTRA_TRANSFER_PAIRS
].map(p=>Object.freeze({...p,
 first:Object.freeze(p.first),second:Object.freeze(p.second)})));

export const TRANSFER_REASONS=Object.freeze({
 words:'単語が出なかった',structure:'文章の組み立て',retrieval:'すぐ出てこなかった',
 perfection:'完璧に言おうとして止まった',surprise:'予想外の返答',other:'その他'
});
// Bounded local history: 30 pairs x up to 6 attempts fits 180 rows (~15-20 KB).
// Preserve legacy 60-row data without migration or exposing transcripts.
export const TRANSFER_RESULT_LIMIT=180;
const ID_SET=new Set(TRANSFER_PAIRS.map(p=>p.id));
const validIso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)
 &&v.length<=35&&!Number.isNaN(Date.parse(v));
export function normalizeTransferResults(input){
 if(!Array.isArray(input))return [];
 const seen=new Set(),safe=[];
 for(const x of input.slice(0,TRANSFER_RESULT_LIMIT)){
  if(!x||typeof x!=='object'||!ID_SET.has(x.pairId)||!validIso(x.at))continue;
  if(typeof x.first!=='boolean'||typeof x.second!=='boolean')continue;
  if(seen.has(x.at+'|'+x.pairId))continue;
  seen.add(x.at+'|'+x.pairId);
  safe.push({pairId:x.pairId,first:x.first,second:x.second,at:x.at});
 }
 return safe;
}
export function transferDay(when=new Date()){
 const now=when instanceof Date&&!Number.isNaN(when.getTime())?when:new Date();
 return new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
}
export function chooseTransferPair(history=[],reasonRecords=[],excludedPairIds=[]){
 const entries=normalizeTransferResults(history);
 const counts=Object.create(null);
 const recent=new Set(entries.slice(0,6).map(x=>x.pairId));
 for(const entry of entries)counts[entry.pairId]=(counts[entry.pairId]||0)+1;
 const reasons=Array.isArray(reasonRecords)?reasonRecords.slice(0,120):[];
 const frequencies=Object.create(null);
 for(const item of reasons){
  if(item&&Object.hasOwn(TRANSFER_REASONS,item.reason)&&typeof item.session==='string'){
   frequencies[item.reason]=(frequencies[item.reason]||0)+1;
  }
 }
 const focused=Object.entries(frequencies).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
 const excluded=new Set(Array.isArray(excludedPairIds)?excludedPairIds.filter(x=>typeof x==='string').slice(0,TRANSFER_PAIRS.length):[]);
 const remaining=TRANSFER_PAIRS.filter(pair=>!excluded.has(pair.id));
 // If every pair is due, permit a repetition rather than leave the button broken.
 const catalog=remaining.length?remaining:TRANSFER_PAIRS;
 const priority=catalog.filter(x=>!focused||x.reason===focused);
 const unseenPriority=priority.filter(x=>!(counts[x.id]||0));
 const unseenAny=catalog.filter(x=>!(counts[x.id]||0));
 // Prioritize the learner's weakness, but after its authored variations are
 // exhausted, keep new situations coming instead of looping the same two pairs.
 const all=unseenPriority.length?unseenPriority:
  unseenAny.length?unseenAny:priority.length?priority:catalog;
 // Prefer never-attempted pairs, then less practised, then the least recent.
 const ordered=[...all].sort((a,b)=>{
  const ac=counts[a.id]||0,bc=counts[b.id]||0;
  if(ac!==bc)return ac-bc;
  if(recent.has(a.id)!==recent.has(b.id))return recent.has(a.id)?1:-1;
  return a.id.localeCompare(b.id);
 });
 return {pair:ordered[0]||null,focusReason:focused};
}
export function transferStats(history=[]){
 const entries=normalizeTransferResults(history);
 return Object.freeze({
  pairAttempts:entries.length,
  bothSelfReported:entries.filter(x=>x.first&&x.second).length,
  secondSelfReported:entries.filter(x=>x.second).length,
  distinctPairs:new Set(entries.map(x=>x.pairId)).size
 });
}
