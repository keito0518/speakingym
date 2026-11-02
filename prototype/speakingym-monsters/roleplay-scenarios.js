// Three-turn, human-authored conversations. No AI generation, API requests,
// transcript storage or inferred pronunciation scores. Each turn uses the
// existing vetted speaking task and its difficulty-specific grading rules.
import { ALL_PROMPTS } from './monster-data.js';
import { dayKey } from './monster-engine.js';

export const ROLEPLAY_SCENARIOS=Object.freeze([
 Object.freeze({
  id:'restaurant',title:'レストランで伝え切る',partner:'店員・メイ',
  description:'席の希望 → 料理の行き違い → 会計の確認',
  setting:'入店から会計まで、相手とのやり取りを英語でつなごう。',
  turns:Object.freeze([
   Object.freeze({baseId:'prefer-window',npc:'Welcome! Do you have a seating preference?',npcJa:'いらっしゃいませ。お席のご希望はありますか？',response:'Let me check the seating options for you.',responseJa:'お席について確認しますね。'}),
   Object.freeze({baseId:'problem-food',npc:'Here is your meal. Is everything as you ordered?',npcJa:'お料理をお持ちしました。ご注文どおりですか？',response:'I am sorry. Let me check your order and fix that.',responseJa:'失礼しました。ご注文を確認して対応します。'}),
   Object.freeze({baseId:'clarify-charge',npc:'Here is your bill. Does anything look wrong?',npcJa:'こちらがお会計です。気になる点はありますか？',response:'Of course. Let me explain the charges.',responseJa:'料金の内訳を説明しますね。'})
  ])
 }),
 Object.freeze({
  id:'station',title:'駅の困りごとを解決',partner:'駅員・カイ',
  description:'電子チケット → ロッカー → アナウンス',
  setting:'切符のトラブルを解決し、出発ホームを確認しよう。',
  turns:Object.freeze([
   Object.freeze({baseId:'problem-ticket',npc:'Hi there. Is something wrong with your ticket?',npcJa:'こんにちは。チケットについて何かお困りですか？',response:'I will check the payment and ticket details.',responseJa:'お支払いとチケットの状況を調べますね。'}),
   Object.freeze({baseId:'help-locker',npc:'Let us check the locker. How can I help?',npcJa:'ロッカーを確認しましょう。何をお手伝いしましょう？',response:'Sure. Let us take a look at the locker together.',responseJa:'ロッカーの状態を一緒に確認しましょう。'}),
   Object.freeze({baseId:'repeat-announcement',npc:'The departure announcement just played. Did you catch it?',npcJa:'出発のアナウンスが流れました。聞き取れましたか？',response:'Certainly. I will repeat the departure information.',responseJa:'出発案内をもう一度お伝えしますね。'})
  ])
 })
]);

export function roleplayFor(id,difficulty,prompts=ALL_PROMPTS){
 if(!['easy','normal','hard'].includes(difficulty))throw Error('Unknown roleplay difficulty');
 const scenario=ROLEPLAY_SCENARIOS.find(s=>s.id===id);
 if(!scenario)return null;
 const turns=scenario.turns.map(turn=>{
  const prompt=prompts.find(p=>p.kind==='speak'&&(p.difficulty||'easy')===difficulty&&
   (p.baseId||p.id)===turn.baseId&&!p.bossOnly);
  if(!prompt)throw Error(`Missing authored roleplay task: ${turn.baseId}/${difficulty}`);
  return {...turn,prompt};
 });
 if(new Set(turns.map(turn=>turn.prompt.id)).size!==turns.length)throw Error('Duplicate roleplay task');
 return {...scenario,turns};
}

export function recommendedRoleplay(save,{difficulty=save.difficulty||'easy',today=dayKey()}={}){
 const due=new Set(Object.entries(save.reviewPrompts||{}).filter(([,day])=>day<=today).map(([id])=>id));
 const scored=ROLEPLAY_SCENARIOS.map((scenario,index)=>{
  const {turns}=roleplayFor(scenario.id,difficulty);
  const dueCount=turns.filter(t=>due.has(t.prompt.id)||
   Boolean(save.retention?.[t.prompt.id]?.nextDay&&save.retention[t.prompt.id].nextDay<=today)).length;
  const learnedCount=turns.filter(t=>Boolean(save.progress?.[t.prompt.phraseId]?.attempts)).length;
  return {id:scenario.id,index,dueCount,learnedCount,score:dueCount*10+learnedCount};
 }).sort((a,b)=>b.score-a.score||a.index-b.index);
 const best=scored[0];
 return {id:best.id,reason:best.dueCount?`復習期日の表現を${best.dueCount}つ含む`:best.learnedCount?'学習済みの表現を別の会話で使う':'最初の3ターン会話におすすめ'};
}
