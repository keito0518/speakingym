/**
 * Freeze Breaker: deterministic conversation-repair workouts with no provider calls.
 * No audio, transcripts, answers, Firebase IDs or personal information are stored.
 * A "win" is a LEARNER SELF-REPORT, never a scored speech/fluency measurement.
 */
export const FREEZE_REASONS=Object.freeze({
 misunderstood:Object.freeze({name:'相手の質問が聞き取れなかった',rescue:'Sorry, could you say that again more slowly?',meaning:'すみません。もう一度ゆっくり言ってもらえますか？',hint:'まず「もう一度ゆっくり言ってください」と頼もう。'}),
 words:Object.freeze({name:'言いたい単語が出なかった',rescue:'What I mean is...',meaning:'私が言いたいのは……（ここから知っている単語で続ける）',hint:'知っている単語を使って、別の言い方に変えよう。'}),
 surprise:Object.freeze({name:'予想外の返事で固まった',rescue:'Oh, I see. Could you give me a second?',meaning:'なるほど。ちょっと考える時間をもらえますか？',hint:'焦らず数秒考える時間をつくって大丈夫。'}),
 unsure:Object.freeze({name:'どう返すのが自然かわからなかった',rescue:'Could you tell me what my options are?',meaning:'どんな選択肢があるか教えてもらえますか？',hint:'選択肢を質問すれば、次の一言が出しやすくなる。'})
});
const scene=(id,name,icon,context,conversationLink,variations)=>Object.freeze({
 id,name,icon,context,conversationLink,
 variations:Object.freeze(variations.map(v=>Object.freeze({
  ...v,followups:Object.freeze(v.followups.map(f=>Object.freeze(f)))
 })))
});
export const FREEZE_SCENES=Object.freeze([
 scene('cafe','カフェで予想外の注文','☕','店員にいつものラテを注文したところ。',
  './scenes.html?scene=cafe',[
  {ask:'Sorry, we are out of oat milk. Would almond milk be okay?',
   meaning:'すみません。オーツミルクが切れていて、アーモンドミルクでも大丈夫ですか？',
   followups:['I am sorry, we are out of almond milk too. Would soy milk work?',
    'Actually, there is an extra charge. Is that okay?'],
   goal:'別の選択肢を聞いてから決めよう。',
   examples:['What other milk options do you have?','Could I get a regular latte instead?']},
  {ask:'Our coffee machine is broken. Can I offer you tea instead?',
   meaning:'コーヒーマシンが故障しました。代わりに紅茶はいかがですか？',
   followups:['Would you like it hot or iced?','We only have green tea. Is that all right?'],
   goal:'焦らず希望を伝えてみよう。',
   examples:['Do you have anything else?','I will have tea, please.']}
 ]),
 scene('hotel','ホテルで予約と違う','🏨','ホテルの受付でチェックインしようとしている。',
  './scenes.html?scene=hotel',[
  {ask:'I cannot find your reservation. Do you have a confirmation number?',
   meaning:'予約が見つかりません。予約確認番号はありますか？',
   followups:['Could you show me the confirmation email?','It looks like it is booked for tomorrow.'],
   goal:'確認方法を質問して状況を整理しよう。',
   examples:['Could you check under my last name?','I have the email on my phone.']},
  {ask:'Your room is not ready yet. Could you come back in two hours?',
   meaning:'お部屋の準備ができていません。2時間後に戻っていただけますか？',
   followups:['We can store your bags for you.','Would you like to wait in the lobby?'],
   goal:'荷物や時間について聞いてみよう。',
   examples:['Could you keep my bags until then?','Is there somewhere I could wait?']}
 ]),
 scene('restaurant','レストランで食べられない','🍽️','レストランで料理を選ぼうとしている。',
  './scenes.html?scene=restaurant',[
  {ask:'This dish contains peanuts. Would you like to order something else?',
   meaning:'この料理にはピーナッツが含まれています。別の料理にしますか？',
   followups:['I can ask the kitchen about the ingredients.','Would you like me to bring an allergen list?'],
   goal:'安全性を決めつけず、確認をお願いしよう。',
   examples:['Could you check with the kitchen?','May I see the allergen information?']},
  {ask:'The special has sold out. Could I recommend the fish?',
   meaning:'本日のおすすめは売り切れです。お魚料理はいかがですか？',
   followups:['It is served with a spicy sauce.','Would you like fries or salad with that?'],
   goal:'おすすめの内容を聞いてみよう。',
   examples:['Could you tell me more about the fish?','What else would you recommend?']}
 ]),
 scene('train','駅で乗り場が変わった','🚆','旅行中に駅員へ電車の乗り方を聞いた。',
  './scenes.html?scene=train',[
  {ask:'The platform has changed. You need to go to platform eight.',
   meaning:'ホームが変更になりました。8番ホームに行ってください。',
   followups:['The train leaves in five minutes.','Take the stairs on your left, not the escalator.'],
   goal:'行き先を聞き返そう。',
   examples:['How do I get to platform eight?','Could you say that once more?']},
  {ask:'That train does not stop at your station. You need to transfer.',
   meaning:'その電車は目的の駅に停まりません。乗り換えが必要です。',
   followups:['Change at the next stop.','You will need another ticket for that train.'],
   goal:'どこで乗り換えるか確認しよう。',
   examples:['Where should I change trains?','Which train should I take?']}
 ]),
 scene('work','仕事で意見を聞かれた','💼','英語の会議中に突然意見を求められた。',
  './scenes.html?scene=work',[
  {ask:'We have to decide today. What do you think?',
   meaning:'今日中に決める必要があります。どう思いますか？',
   followups:['What is your biggest concern about this plan?','Would you support a smaller trial first?'],
   goal:'時間をもらい、自分の考えを簡単に伝えよう。',
   examples:['Could I have a moment to think?','I think we need more information first.']},
  {ask:'I am not sure I agree. Could you explain your idea?',
   meaning:'その意見に賛成かどうかわかりません。説明してもらえますか？',
   followups:['Can you give us one concrete example?','How would we handle the cost?'],
   goal:'一文ずつ、焦らず説明しよう。',
   examples:['Sure. What I mean is this.','Let me give you an example.']}
 ]),
 scene('shopping','お店で予想外の条件','🛍️','お店で商品の購入を考えている。',
  './scenes.html?scene=shopping',[
  {ask:'This item cannot be returned. Are you sure you want it?',
   meaning:'この商品は返品できません。本当に購入しますか？',
   followups:['Would you like a different size?','Could you pay by card?'],
   goal:'条件を確認し、自分で決めよう。',
   examples:['Could I think about it for a moment?','Can I exchange it for another size?']},
  {ask:'We do not have your size here. Would you like me to check another store?',
   meaning:'ご希望のサイズは当店にありません。別の店舗を調べましょうか？',
   followups:['The other store is about twenty minutes away.','Would you like me to reserve it?'],
   goal:'提案を理解して返答しよう。',
   examples:['Yes, that would be great.','Could you tell me where the other store is?']}
 ]),
 scene('anywhere','どこでも役立つ会話の立て直し','💬','相手の発言が思いがけず、何と言うか迷ってしまった。',
  './scenes.html?scene=smalltalk',[
  {ask:'Sorry, could you explain what you mean?',
   meaning:'ごめんなさい。どういう意味なのか説明してもらえますか？',
   followups:['Sure. Would you like me to explain it another way?',
    'No problem. What part would you like me to repeat?'],
   goal:'相手の話を理解するための質問で会話をつなごう。',
   examples:['Could you say that in a simpler way?','Can you give me an example?']},
  {ask:'Is that still okay with you, or would you prefer something else?',
   meaning:'それで大丈夫ですか？それとも別の方がよいですか？',
   followups:['That is fine. Do you need a little more time?',
    'Would it help if I gave you two options?'],
   goal:'一度考える時間をとって、選択肢を確認しよう。',
   examples:['Could I have a moment to think?','What other options do I have?']}
 ])

]);
const IDS=new Set(FREEZE_SCENES.map(s=>s.id));
const cleanDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const validCount=x=>Number.isSafeInteger(x)&&x>=0&&x<=100000?x:0;
export const freezeDay=(when=new Date())=>{
 const d=when instanceof Date&&Number.isFinite(when.getTime())?when:new Date();
 return new Date(d.getTime()+9*3600000).toISOString().slice(0,10);
};
const addDays=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function normalizeFreezeProgress(input){
 const raw=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const records=Object.create(null);
 const source=raw.records&&typeof raw.records==='object'&&!Array.isArray(raw.records)?raw.records:{};
 for(const [id,item] of Object.entries(source)){
  if(!IDS.has(id)||!item||typeof item!=='object'||Array.isArray(item))continue;
  if(!cleanDay(item.due)||!cleanDay(item.last))continue;
  if(!Number.isInteger(item.stage)||item.stage<0||item.stage>4)continue;
  records[id]={due:item.due,last:item.last,stage:item.stage,
   attempts:validCount(item.attempts),recovered:validCount(item.recovered),
   lastReason:Object.hasOwn(FREEZE_REASONS,item.lastReason)?item.lastReason:null,
   reasonCounts:Object.fromEntries(Object.keys(FREEZE_REASONS).map(id=>
    [id,validCount(item.reasonCounts?.[id])]))};
 }
 return {version:1,records};
}
/** Suggested next workout: due retries first, then new scenes, then upcoming. */
export function nextFreezeScene(raw,when=new Date()){
 const day=freezeDay(when),p=normalizeFreezeProgress(raw);
 const due=FREEZE_SCENES.filter(s=>p.records[s.id]&&p.records[s.id].due<=day)
  .sort((a,b)=>p.records[a.id].due.localeCompare(p.records[b.id].due));
 const unseen=FREEZE_SCENES.filter(s=>!p.records[s.id]);
 const upcoming=FREEZE_SCENES.filter(s=>p.records[s.id]&&p.records[s.id].due>day)
  .sort((a,b)=>p.records[a.id].due.localeCompare(p.records[b.id].due));
 return due[0]||unseen[0]||upcoming[0]||FREEZE_SCENES[0];
}
export function sceneAttempt(sceneId,raw){
 const scene=FREEZE_SCENES.find(x=>x.id===sceneId);
 if(!scene)return null;
 const p=normalizeFreezeProgress(raw),attempts=p.records[sceneId]?.attempts||0;
 const variation=scene.variations[attempts%scene.variations.length];
 const followup=variation.followups[Math.floor(attempts/scene.variations.length)%variation.followups.length];
 return {scene,variation,followup,attempts};
}
/** Scripted, strategy-dependent next line. This does not interpret or score speech. */
export function recoveryReply(attempt,reason){
 const original=typeof attempt?.variation?.ask==='string'?attempt.variation.ask.trim().slice(0,320):'';
 const next=typeof attempt?.followup==='string'?attempt.followup.trim().slice(0,320):'';
 const ordinary={line:next,caption:'会話が続いた想定です。次のひと言を聞いて返そう。',rate:.86};
 if(!original||!next)return ordinary;
 switch(reason){
  case 'misunderstood':return {
   line:'Of course. Let me say that again more slowly. '+original,
   caption:'聞き返した想定：相手が少しゆっくり繰り返してくれます。',rate:.72};
  case 'words':return {
   line:'No worries. You can use simple words. '+next,
   caption:'言い換えた想定：相手が待ってくれました。次のひと言に返そう。',rate:.86};
  case 'surprise':return {
   line:'Sure, take your time. '+next,
   caption:'少し待ってもらった想定：考えたあと、もう一度返そう。',rate:.86};
  case 'unsure':return {
   line:'Of course. Let me explain a little more. '+next,
   caption:'選択肢を確認した想定：相手の説明を聞いて返そう。',rate:.86};
  default:return ordinary;
 }
}
/** A recorded result means the learner says they spoke; it is not AI grading. */
export function recordFreezeAttempt(raw,{sceneId,reason,saidIt,usedHint=false},when=new Date()){
 const p=normalizeFreezeProgress(raw);
 // null means the learner answered the first prompt without freezing.
 // In that path no freeze cause should be invented in their history.
 if(!IDS.has(sceneId)||(reason!==null&&!Object.hasOwn(FREEZE_REASONS,reason))||
    typeof saidIt!=='boolean'||typeof usedHint!=='boolean')return p;
 const day=freezeDay(when),previous=p.records[sceneId];
 const independent=saidIt&&!usedHint;
 const stage=independent?Math.min(4,(previous?.stage||0)+1):0;
 const due=addDays(day,independent?[0,1,3,7,14][stage]:1);
 const reasonCounts=Object.fromEntries(Object.keys(FREEZE_REASONS).map(id=>
  [id,Math.min(100000,(previous?.reasonCounts?.[id]||0)+(id===reason?1:0))]));
 p.records[sceneId]={last:day,due,stage,attempts:Math.min(100000,(previous?.attempts||0)+1),
  recovered:Math.min(100000,(previous?.recovered||0)+(independent?1:0)),lastReason:reason,reasonCounts};
 return normalizeFreezeProgress(p);
}
export function freezeSummary(raw,when=new Date()){
 const p=normalizeFreezeProgress(raw),today=freezeDay(when);
 const entries=Object.values(p.records);
 const reasonTotals=Object.fromEntries(Object.keys(FREEZE_REASONS).map(id=>
  [id,entries.reduce((sum,e)=>sum+(e.reasonCounts?.[id]||0),0)]));
 const ranked=Object.entries(reasonTotals).sort((a,b)=>b[1]-a[1]);
 const topReason=ranked[0]?.[1]>0?ranked[0][0]:null;
 return {scenes:entries.filter(x=>x.attempts>0).length,
  topReason,topReasonCount:topReason?reasonTotals[topReason]:0,
  nextRepairHint:topReason?FREEZE_REASONS[topReason].rescue:null,
  attempts:entries.reduce((n,x)=>n+x.attempts,0),
  recovered:entries.reduce((n,x)=>n+x.recovered,0),
  due:entries.filter(x=>x.due<=today).length,
  mastered:entries.filter(x=>x.stage>=3).length,
  nextDue:entries.map(x=>x.due).filter(day=>day>today).sort()[0]||null};
}
