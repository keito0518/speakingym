// Three-turn, human-authored conversations. No AI generation, API requests,
// transcript storage or inferred pronunciation scores. Each turn uses the
// existing vetted speaking task and its difficulty-specific grading rules.
import { ALL_PROMPTS } from './monster-data.js';
import { dayKey, normalizeEnglish } from './monster-engine.js';
import { roleplayCoachingFor } from './roleplay-feedback.js';

export const ROLEPLAY_SCENARIOS=Object.freeze([
 Object.freeze({
  id:'restaurant',title:'レストランで伝え切る',partner:'店員・メイ',
  description:'席の希望 → 料理の行き違い → 会計の確認',
  setting:'入店から会計まで、相手とのやり取りを英語でつなごう。',
  turns:Object.freeze([
   Object.freeze({baseId:'prefer-window',npc:'Welcome! Do you have a seating preference?',npcJa:'いらっしゃいませ。お席のご希望はありますか？',response:'Let me check the seating options for you.',responseJa:'お席について確認しますね。',
    replyBranches:{alternate:{text:'Of course! Let me find a table that fits your request.',ja:'もちろんです。ご希望に合う席をご案内しますね。'},supported:{text:'Take your time. I can show you the seating options.',ja:'ゆっくりで大丈夫。席の選択肢をご案内できますよ。'}}}),
   Object.freeze({baseId:'problem-food',npc:'Here is your meal. Is everything as you ordered?',npcJa:'お料理をお持ちしました。ご注文どおりですか？',response:'I am sorry. Let me check your order and fix that.',responseJa:'失礼しました。ご注文を確認して対応します。',
    openingBranches:{alternate:{text:'You are all set at your table. Here is your meal. Is it what you ordered?',ja:'お席の準備ができました。こちらのお料理でご注文どおりですか？'},supported:{text:'Let us move on to your order. Here is your meal. Is this what you wanted?',ja:'ご注文に進みましょう。こちらのお料理でよろしいですか？'}},
    replyBranches:{alternate:{text:'Thanks for pointing that out. I will bring the dish you ordered.',ja:'教えてくれてありがとう。ご注文の料理をお持ちします。'},supported:{text:'Let us check what you ordered together before making a change.',ja:'変更する前に、ご注文を一緒に確認しましょう。'}}}),
   Object.freeze({baseId:'clarify-charge',npc:'Here is your bill. Does anything look wrong?',npcJa:'こちらがお会計です。気になる点はありますか？',response:'Of course. Let me explain the charges.',responseJa:'料金の内訳を説明しますね。',
    openingBranches:{alternate:{text:'I will sort out the dish you mentioned. Here is the bill. Do the charges look right?',ja:'先ほどの料理は対応しますね。こちらがお会計です。金額は合っていますか？'},supported:{text:'We can keep checking the order. Here is the bill. Would you like to review it together?',ja:'注文の確認は続けられます。お会計も一緒に確認しましょうか？'}},
    replyBranches:{alternate:{text:'Good question! I will break down the total for you.',ja:'いい質問ですね。合計金額の内訳をお伝えします。'},supported:{text:'No rush. We can go through the bill one item at a time.',ja:'急がなくて大丈夫。一項目ずつ確認できますよ。'}}})
  ])
 }),
 Object.freeze({
  id:'station',title:'駅の困りごとを解決',partner:'駅員・カイ',
  description:'電子チケット → ロッカー → アナウンス',
  setting:'切符のトラブルを解決し、出発ホームを確認しよう。',
  turns:Object.freeze([
   Object.freeze({baseId:'problem-ticket',npc:'Hi there. Is something wrong with your ticket?',npcJa:'こんにちは。チケットについて何かお困りですか？',response:'I will check the payment and ticket details.',responseJa:'お支払いとチケットの状況を調べますね。',
    replyBranches:{alternate:{text:'Thanks for explaining. I will look up the transaction and find your ticket.',ja:'説明ありがとう。取引を調べてチケットを確認します。'},supported:{text:'That is okay. We can check the ticket details step by step.',ja:'大丈夫。チケットの情報を順番に確認しましょう。'}}}),
   Object.freeze({baseId:'help-locker',npc:'Let us check the locker. How can I help?',npcJa:'ロッカーを確認しましょう。何をお手伝いしましょう？',response:'Sure. Let us take a look at the locker together.',responseJa:'ロッカーの状態を一緒に確認しましょう。',
    openingBranches:{alternate:{text:'While I check your ticket, let us look at the locker. What is the problem?',ja:'チケットを確認する間にロッカーも見ましょう。どんな問題ですか？'},supported:{text:'We can keep checking the ticket. Do you also need help with the locker?',ja:'チケットは引き続き確認できます。ロッカーもお困りですか？'}},
    replyBranches:{alternate:{text:'I will check the lock and help you get it open.',ja:'鍵の状態を調べて、開けるお手伝いをします。'},supported:{text:'We can find the locker number first, then check the lock.',ja:'まずロッカーの番号を確認してから鍵を調べましょう。'}}}),
   Object.freeze({baseId:'repeat-announcement',npc:'The departure announcement just played. Did you catch it?',npcJa:'出発のアナウンスが流れました。聞き取れましたか？',response:'Certainly. I will repeat the departure information.',responseJa:'出発案内をもう一度お伝えしますね。',
    openingBranches:{alternate:{text:'We have a plan for the locker. A departure announcement just played. Did you hear it?',ja:'ロッカーの対応が決まりました。出発案内が流れましたが聞こえましたか？'},supported:{text:'We can return to the locker if needed. An announcement just played. Did you catch it?',ja:'必要ならロッカーに戻れます。今のアナウンスは聞き取れましたか？'}},
    replyBranches:{alternate:{text:'Of course. I will repeat the platform and departure details.',ja:'もちろんです。ホームと出発の案内を繰り返します。'},supported:{text:'No problem. Let us go through the announcement slowly together.',ja:'大丈夫。アナウンスをゆっくり一緒に確認しましょう。'}}})
  ])
 }),
 Object.freeze({
  id:'hotel',title:'ホテルで安心して過ごす',partner:'フロント・エマ',
  description:'部屋の予約 → 騒音への謝罪 → チェックアウト確認',
  setting:'予約から滞在中のやり取り、出発前の確認までつなげよう。',
  turns:Object.freeze([
   Object.freeze({baseId:'booking-hotel',npc:'Welcome to the hotel! How can I help you today?',npcJa:'ホテルへようこそ。本日はどのようなご用件ですか？',response:'Let me check which rooms are available.',responseJa:'空いているお部屋を確認しますね。',
    replyBranches:{alternate:{text:'Certainly! I will find a room that suits your plans.',ja:'かしこまりました。ご予定に合うお部屋を探しますね。'},supported:{text:'Take your time. I can explain the room options first.',ja:'ゆっくりで大丈夫です。まずお部屋の選択肢を説明しますね。'}}}),
   Object.freeze({baseId:'apology-noise',npc:'I received a report of noise from your room. Can we talk about it?',npcJa:'お部屋から音がすると連絡がありました。少しお話しできますか？',response:'Thank you for apologizing. Please keep the noise down tonight.',responseJa:'謝ってくださってありがとうございます。今夜は静かにお願いします。',
    openingBranches:{alternate:{text:'Your room is ready. Later tonight, I heard about some noise. Can we talk?',ja:'お部屋をご用意しました。今夜の騒音について少しお話しできますか？'},supported:{text:'Let us try another hotel situation. A guest reported noise. How would you respond?',ja:'次のホテルでの場面です。騒音について連絡がありました。どう答えますか？'}},
    replyBranches:{alternate:{text:'I appreciate you saying that. Thank you for considering the other guests.',ja:'そう言っていただけて助かります。ほかのお客様への配慮をありがとうございます。'},supported:{text:'We can go through how to respond to a noise complaint together.',ja:'騒音の連絡への答え方を一緒に練習しましょう。'}}}),
   Object.freeze({baseId:'clarify-hotel',npc:'Here are your checkout details. Is there anything you would like to confirm?',npcJa:'こちらがチェックアウトのご案内です。確認したいことはありますか？',response:'Of course. Let me confirm the checkout time for your booking.',responseJa:'もちろんです。ご予約のチェックアウト時刻を確認しますね。',
    openingBranches:{alternate:{text:'Thanks for helping keep things quiet. Before checkout, is there anything to confirm?',ja:'静かに過ごしていただきありがとうございます。チェックアウト前に確認したいことはありますか？'},supported:{text:'We can review the room situation later. Now, do you have any checkout questions?',ja:'お部屋についてはあとで確認できます。チェックアウトで質問はありますか？'}},
    replyBranches:{alternate:{text:'Good catch. I will compare the time with your reservation.',ja:'よく気づきましたね。ご予約の時間と照らし合わせます。'},supported:{text:'No problem. Let us look at your reservation details together.',ja:'大丈夫ですよ。ご予約の内容を一緒に確認しましょう。'}}})
  ])
 }),
 Object.freeze({
  id:'market',title:'マーケットで買い物',partner:'店員・リア',
  description:'ドリンク注文 → 料金の確認 → 商品トラブル',
  setting:'マーケットでの注文、会計、買った品物の相談を英語で伝えよう。',
  turns:Object.freeze([
   Object.freeze({baseId:'city-market-speak-order',npc:'Hi! What can I get you to drink?',npcJa:'こんにちは。お飲み物は何になさいますか？',response:'Certainly. I will prepare your tea.',responseJa:'かしこまりました。お茶をご用意しますね。',
    replyBranches:{alternate:{text:'Sounds good! I can make that order for you.',ja:'いいですね！そのご注文でご用意します。'},supported:{text:'No rush. Let us look at the drink menu together.',ja:'急がなくて大丈夫。ドリンクメニューを一緒に見ましょう。'}}}),
   Object.freeze({baseId:'city-market-speak-bill',npc:'Here is your total. Do you have any questions about the charge?',npcJa:'こちらが合計金額です。料金について質問はありますか？',response:'Let me check the extra charge on your receipt.',responseJa:'レシートの追加料金を確認しますね。',
    openingBranches:{alternate:{text:'Your drink order is ready. Here is the total. Would you like to check it?',ja:'ご注文のドリンクができました。こちらが合計です。ご確認されますか？'},supported:{text:'We can choose a drink later. Let us practice checking a bill. Any questions?',ja:'ドリンクはあとで選べます。次はお会計の練習です。質問はありますか？'}},
    replyBranches:{alternate:{text:'Good question. I will show you how the total was calculated.',ja:'いい質問です。合計金額の計算をお見せしますね。'},supported:{text:'We can check each item on the receipt together.',ja:'レシートの項目を一つずつ確認しましょう。'}}}),
   Object.freeze({baseId:'city-market-speak-return',npc:'Is there a problem with something you bought at the market?',npcJa:'マーケットで買った品物に何か問題がありましたか？',response:'I can check the item and explain your options.',responseJa:'品物を確認して、対応方法を説明しますね。',
    openingBranches:{alternate:{text:'We have checked the charges. Is there also a problem with an item you bought?',ja:'料金の確認ができました。買った品物にも問題がありますか？'},supported:{text:'We can finish checking the bill later. Do you need help with something you bought?',ja:'お会計はあとで確認できます。買った品物でお困りですか？'}},
    replyBranches:{alternate:{text:'Thanks for explaining. Let me check whether we can exchange it.',ja:'ご説明ありがとうございます。交換できるか確認しますね。'},supported:{text:'Let us look at the item and the receipt together first.',ja:'まず品物とレシートを一緒に確認しましょう。'}}})
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

// These are authored reactions, not generated dialogue. An alternate reaction
// requires an exact match to a vetted alternative AND an already-confirmed
// answer. Unverified text or example-only progression never triggers it.
export function roleplayReplyFor(turn,answer,{confirmed=false}={}){
 if(!turn)return null;
 const alternate=confirmed&&normalizeEnglish(answer)!==normalizeEnglish(turn.prompt?.answer)&&
  Array.isArray(turn.prompt?.alternatives)&&
  turn.prompt.alternatives.some(example=>typeof example==='string'&&normalizeEnglish(example)===normalizeEnglish(answer));
 const branch=!confirmed?'supported':alternate?'alternate':'standard';
 const variant=turn.replyBranches?.[branch];
 return {branch,response:variant?.text||turn.response,responseJa:variant?.ja||turn.responseJa};
}

export function roleplayOpeningFor(roleplay,index){
 const turn=roleplay?.turns?.[index];
 if(!turn)return null;
 const previous=roleplay.history?.[index-1];
 const branch=['alternate','supported'].includes(previous?.branch)?previous.branch:'standard';
 const variant=turn.openingBranches?.[branch];
 return {branch,npc:variant?.text||turn.npc,npcJa:variant?.ja||turn.npcJa};
}

export function recommendedRoleplay(save,{difficulty=save.difficulty||'easy',today=dayKey()}={}){
 // Prioritize review only when it is actually due. An example-only attempt
 // schedules tomorrow's review; it should not force the same scene again today.
 const promptsAtLevel=new Map(ALL_PROMPTS.filter(p=>p.kind==='speak'&&(p.difficulty||'easy')===difficulty).map(p=>[p.id,p]));
 const due=new Set(Object.entries(save.reviewPrompts||{}).filter(([id,day])=>promptsAtLevel.has(id)&&day<=today).map(([id])=>id));
 for(const [id,record] of Object.entries(save.retention||{})){
  if(promptsAtLevel.has(id)&&record?.nextDay&&record.nextDay<=today)due.add(id);
 }
 const duePhrases=new Set([...due].map(id=>promptsAtLevel.get(id).phraseId));
 for(const [phraseId,entry] of Object.entries(save.progress||{})){
  if(entry?.nextReviewDay&&entry.nextReviewDay<=today)duePhrases.add(phraseId);
 }
 const firstVisit=ROLEPLAY_SCENARIOS.every(scenario=>roleplayFor(scenario.id,difficulty).turns.every(turn=>
  !save.progress?.[turn.prompt.phraseId]?.attempts));
 const scored=ROLEPLAY_SCENARIOS.map((scenario,index)=>{
  const {turns}=roleplayFor(scenario.id,difficulty);
  const dueCount=turns.filter(t=>due.has(t.prompt.id)).length;
  const transferCount=turns.filter(t=>!due.has(t.prompt.id)&&duePhrases.has(t.prompt.phraseId)).length;
  const freshCount=turns.filter(t=>!save.progress?.[t.prompt.phraseId]?.attempts).length;
  const attempts=turns.reduce((total,t)=>total+(save.progress?.[t.prompt.phraseId]?.attempts||0),0);
  return {id:scenario.id,index,dueCount,transferCount,freshCount,attempts,
   score:dueCount*100+transferCount*25+freshCount*2};
 }).sort((a,b)=>b.score-a.score||a.attempts-b.attempts||a.index-b.index);
 const best=scored[0];
 return {id:best.id,reason:best.dueCount?`復習期日の表現を${best.dueCount}つ含む`:
  best.transferCount?`復習期日の表現を${best.transferCount}つ応用できる`:
  firstVisit?'最初の3ターン会話におすすめ':
  best.freshCount?`未練習の表現を${best.freshCount}つ試せる`:'学習済みの表現を別の会話で使う'};
}

// A short, evidence-bound conversation report. These turns exist in memory
// only; the report never infers pronunciation, fluency, or grammar accuracy
// from a transcript and does not persist the learner's actual answers.
export function roleplayRecapFor(roleplay){
 if(!roleplay||!Array.isArray(roleplay.turns)||!Array.isArray(roleplay.history))return null;
 const rows=roleplay.turns.map((turn,index)=>{
  const record=roleplay.history[index]||{};
  const status=['smooth','hint','skipped'].includes(record.outcome)?record.outcome:'skipped';
  const prompt=turn.prompt||{};
  const goal=prompt.task||prompt.cue||prompt.scene||turn.npcJa||'相手に用件を伝える';
  const confirmed=status==='smooth'||status==='hint';
  const elements=confirmed&&Array.isArray(record.checked)?record.checked.filter(x=>typeof x==='string'&&x.length<140).slice(0,3):[];
  const alternatives=Array.isArray(prompt.alternatives)?prompt.alternatives:[];
  const other=alternatives.find(x=>typeof x==='string'&&x.trim()&&normalizeEnglish(x)!==normalizeEnglish(record.answer||'')&&normalizeEnglish(x)!==normalizeEnglish(prompt.answer||''));
  const coaching=roleplayCoachingFor(turn,{status,branch:record.branch});
  return {status,label:status==='smooth'?'自力で確認':status==='hint'?'ヒントありで確認':'例文で復習',
   scene:prompt.scene||turn.npcJa||`会話 ${index+1}`,goal,confirmed,elements,
   coaching,
   response:typeof record.response==='string'?record.response:'',
   responseLabel:status==='skipped'?'例文練習へのサポート':record.branch==='alternate'?'言い換えに反応':'相手の返事',
   answer:status!=='skipped'&&typeof record.answer==='string'?record.answer:'',
   example:prompt.answer||'',alternative:confirmed?other||null:null,
   next:coaching.next,
   tip:prompt.tip||null};
 });
 const independent=rows.filter(row=>row.status==='smooth').length;
 const hinted=rows.filter(row=>row.status==='hint').length;
 const skipped=rows.filter(row=>row.status==='skipped').length;
 const earned=rows.filter(row=>row.confirmed).slice(0,2);
 const focus=rows.find(row=>row.status==='skipped')||rows.find(row=>row.status==='hint')||rows[0]||null;
 const headline=independent===rows.length&&rows.length?'3ターンを自力で伝えられた！':
  independent>=2?'自分の英語で会話をつなげた！':independent>=1?'伝えられた一言がある！':'今日は会話の型を確認できたね。';
 return {rows,independent,hinted,skipped,earned,focus,headline,
  summary:earned.length?`教材の基準で確認できた用件：${earned.map(row=>row.goal).join(' ／ ')}`:
   '今日は参考表現を確認した段階。次回はまず1ターンを自力で伝えてみよう。',
  next:focus?`次は「${focus.goal}」。${focus.next}`:''};
}
