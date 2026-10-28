// Learning-first English Dungeon outcomes. This is a reflection of VERIFIED
// actions in this session, not a CEFR score, pronunciation grade or AI claim.
// Nothing here touches payments, online services or persistent user data.
import { DUNGEON_AREAS } from './forest-engine.js';

export const DUNGEON_SKILLS=Object.freeze({
 listen:Object.freeze({label:'リスニング',goal:'英語の要点を聞き取る',tip:'英文を見ずに音声を聞き、いつ・どこ・何を言っているかを確認しよう。'}),
 speak:Object.freeze({label:'スピーキング',goal:'意味が伝わる英文を組み立てる',tip:'模範解答を丸暗記せず、相手に伝えたい情報を自分の英語で言ってみよう。'}),
 read:Object.freeze({label:'読解・応答',goal:'読んだ内容をもとに答える',tip:'条件や日時に印をつけてから、必要な情報を短い英文で返そう。'}),
 vocab:Object.freeze({label:'単語',goal:'場面に合うことばを選ぶ',tip:'日本語訳だけでなく、前後の文脈とセットで言い回しを覚えよう。'}),
 grammar:Object.freeze({label:'文法・語順',goal:'自然な順序で意味を伝える',tip:'語順の理由を声に出して説明してから、別の単語でも組み立てよう。'})
});
export const DUNGEON_CHAPTER_SKILLS=Object.freeze({
 entry:Object.freeze({headline:'聞き返す・お願いする・丁寧に伝える',boss:['相手の言葉を理解','意味に合う語順を選択','自分の英語で返事']}),
 glade:Object.freeze({headline:'旅の予定・希望・道案内を相談する',boss:['旅の情報を聞き取る','場面に合う単語を選ぶ','希望を英語で伝える']}),
 thicket:Object.freeze({headline:'読み違えず、条件を整理して確認する',boss:['必要な情報を聞き取る','条件に合う英文を組み立てる','誤解を防ぐ言い方で伝える']}),
 sanctuary:Object.freeze({headline:'複数の情報をまとめて意思を伝える',boss:['大切な情報を聞き取る','意味に合う表現を選ぶ','状況に合わせて自分の言葉で答える']}),
 city:Object.freeze({headline:'街の問い合わせ・予定変更・困りごとへの対応',boss:['案内の要点を聞き取る','状況に合う英文を組み立てる','問い合わせや希望を英語で伝える']}),
 'city-market':Object.freeze({headline:'屋台の注文・返品・料金の質問',boss:['お店の説明を聞き取る','条件に合う語順を作る','具体的に注文や料金を尋ねる']}),
 'city-terminal':Object.freeze({headline:'乗り換え・運休・予約の変更',boss:['発車・運休の情報を聞く','状況に合う語を選ぶ','代わりの経路を尋ねる']}),
 'city-blizzard':Object.freeze({headline:'悪天候の説明と安全な代替案',boss:['状況説明の要点を聞く','丁寧な提案を組み立てる','必要な支援・代案を伝える']})
});
export const DUNGEON_OUTCOME_VALUES=Object.freeze(['independent','supported','review']);
export function summarizeDungeonAttempt(areaId,encounters=[]){
 const area=DUNGEON_AREAS.find(a=>a.id===areaId);
 if(!area)throw Error('Unknown dungeon chapter');
 if(!Array.isArray(encounters))throw Error('Invalid dungeon attempts');
 const groups=Object.entries(DUNGEON_SKILLS).map(([kind,info])=>{
   const items=encounters.filter(item=>item&&item.kind===kind&&DUNGEON_OUTCOME_VALUES.includes(item.outcome));
   const independent=items.filter(item=>item.outcome==='independent').length;
   const supported=items.filter(item=>item.outcome==='supported').length;
   const review=items.filter(item=>item.outcome==='review').length;
   return {kind,...info,total:items.length,independent,supported,review};
 }).filter(row=>row.total>0);
 const played=groups.reduce((sum,row)=>sum+row.total,0);
 const independent=groups.reduce((sum,row)=>sum+row.independent,0);
 const supported=groups.reduce((sum,row)=>sum+row.supported,0);
 const review=groups.reduce((sum,row)=>sum+row.review,0);
 // A no-XP practice route is a completed navigation step, not mastery.
 const retryIds=[...new Set(encounters.filter(item=>item&&item.outcome!=='independent'&&
   DUNGEON_OUTCOME_VALUES.includes(item.outcome)&&typeof item.promptId==='string').map(item=>item.promptId))];
 const sortLow=(a,b)=>{
   const rate=row=>row.independent/row.total;
   return rate(a)-rate(b)||b.review-a.review||a.kind.localeCompare(b.kind);
 };
 const ordered=[...groups].sort(sortLow);
 const weakest=ordered[0]||null;
 const strongest=[...groups].sort((a,b)=>b.independent/b.total-a.independent/a.total||
   b.total-a.total||a.kind.localeCompare(b.kind))[0]||null;
 return {areaId,areaName:area.name,focus:DUNGEON_CHAPTER_SKILLS[areaId].headline,
   total:played,independent,supported,review,groups,
   weakest, strongest, retryIds,complete:played===encounters.length&&played>0};
}
export function dungeonBossBrief(areaId,turn){
 const chapter=DUNGEON_CHAPTER_SKILLS[areaId];
 if(!chapter||!Number.isInteger(turn)||turn<1||turn>3)return null;
 return {phase:turn,total:3,objective:chapter.boss[turn-1],
   message:turn===1?'聞き取る':turn===2?'意味を選ぶ':'自分の言葉で伝える'};
}
