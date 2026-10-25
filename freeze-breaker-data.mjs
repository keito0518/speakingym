/**
 * Freeze Breaker: deterministic conversation-repair workouts with no provider calls.
 * No audio, transcripts, answers, Firebase IDs or personal information are stored.
 * A "win" is a LEARNER SELF-REPORT, never a scored speech/fluency measurement.
 */
export const FREEZE_REASONS=Object.freeze({
 misunderstood:Object.freeze({name:'相手の質問が聞き取れなかった',rescue:'Sorry, could you say that again more slowly?',meaning:'すみません。もう一度ゆっくり言ってもらえますか？',hint:'まず「もう一度ゆっくり言ってください」と頼もう。'}),
 unknown:Object.freeze({name:'知らない単語の意味が分からなかった',rescue:'What does that word mean here?',meaning:'ここでのその単語はどういう意味ですか？',hint:'分からない語を一つだけ指して、文脈での意味を聞こう。'}),
 long:Object.freeze({name:'説明が長くて途中から分からなくなった',rescue:'Could you break that into smaller steps?',meaning:'もう少し小さく分けて説明してもらえますか？',hint:'説明を止めて、要点や最初の一段階だけに絞ってもらおう。'}),
 words:Object.freeze({name:'言いたい単語が出なかった',rescue:"I can't remember the word, but it's like...",meaning:'単語が思い出せないけど、こんな感じのものです……',hint:'知らない単語を探し続けず、特徴や用途を知っている英語で説明しよう。'}),
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
 scene('fast-english','速い英語を聞き取れない','🎧','旅行先で相手が自然な速さで案内してくれた。',
  './scenes.html?scene=smalltalk',[
  {ask:'I was gonna say, if you head down that street and hang a left after the pharmacy, you should see it on your right.',
   meaning:'あの通りを進んで薬局の先で左に曲がれば、右側に見えると思います。',
   followups:['Sure. The pharmacy is on the corner, just past the bank.','Yes, that is right. Turn left at the next traffic light.'],
   goal:'全部を聞き取ろうとせず、聞き取れなかった区間だけを指定して聞き直そう。',
   examples:['Could you repeat the part after “the pharmacy”?','I caught “the pharmacy,” but not the next turn.']},
  {ask:'You can just tap your card when you get off, and it’ll charge the fare based on how far you went.',
   meaning:'降りるときにカードをタッチすれば、乗った距離に応じて運賃が請求されます。',
   followups:['That is right. You tap the same card when you get off.','Yes, the system calculates the fare automatically.'],
   goal:'聞こえたキーワードを伝えて、理解が合っているか確かめよう。',
   examples:['I heard “tap your card.” Do I tap it when I get off?','Could you repeat the part about when to tap?']}
 ]),
 scene('unknown-word','知らない単語の意味が分からない','🧩','宿泊先の予約条件を確認している。',
  './scenes.html?scene=hotel',[
  {ask:'The deposit is refundable as long as you cancel at least 24 hours before check-in.',
   meaning:'チェックインの24時間前までにキャンセルすれば、預け金は返金されます。',
   followups:['It means we will give your deposit back if you cancel in time.','You will get the money back, but only if you cancel by the day before.'],
   goal:'知らない語だけを指して、ここでの意味を短く尋ねよう。',
   examples:['What does “refundable” mean here?','Could you explain “refundable” in simple words?']},
  {ask:'The room rate is non-refundable, so we cannot return the payment after you book.',
   meaning:'この部屋の料金は返金不可なので、予約後に支払いを返せません。',
   followups:['It means the payment will not be returned if you cancel.','That is correct. You can still change the date, but not get a refund.'],
   goal:'似た単語に頼らず、知らない語の意味をその場の文脈で確認しよう。',
   examples:['What does “non-refundable” mean if I cancel?','So I would lose the payment if I cancel, right?']}
 ]),
 scene('long-explanation','長い説明の途中で分からなくなる','🗺️','駅で乗り換え方法を英語で説明してもらっている。',
  './scenes.html?scene=train',[
  {ask:'Take the local train three stops, change at Central, go up to the main concourse, and check the board because the platform can change.',
   meaning:'各駅停車で3駅進み、セントラル駅で乗り換えて中央コンコースへ上がります。ホームが変わることがあるので掲示板を確認してください。',
   followups:['First, take the local train to Central. I can explain the rest after that.','The key point is to check the board at Central before you change trains.'],
   goal:'説明全体を止めず、最初の一段階だけ確認して情報を小分けにしよう。',
   examples:['Could we go one step at a time?','So first I take the local train to Central, right?']},
  {ask:'After you submit the form, wait for the email, open the link, verify your details, and then bring the confirmation to the front desk.',
   meaning:'フォームを送信したらメールを待ち、リンクを開いて情報を確認し、確認メールを受付に持ってきてください。',
   followups:['First, submit the form. I will help you with the email after that.','Exactly. You need to bring the confirmation email to the front desk.'],
   goal:'一度に全部覚えず、今やることを一つに絞って確認しよう。',
   examples:['What should I do first?','Could you repeat the last step about the front desk?']}
 ]),
 scene('sudden-opinion','急に意見を求められる','💬','仕事の打ち合わせで、資料を見た直後に意見を聞かれた。',
  './scenes.html?scene=work',[
  {ask:'We need to choose a launch date now. Which option would you go with?',
   meaning:'今、公開日を決める必要があります。どの案を選びますか？',
   followups:['What is the main reason you prefer the later date?','Would a short delay solve your concern?'],
   goal:'時間をもらうだけで終わらず、結論・理由・確認したい点のどれかを一つ返そう。',
   examples:['Could I have a moment to compare the two dates?','I would lean toward the later date because we need more time to test.']},
  {ask:'Do you think we should expand the project to the whole team next month?',
   meaning:'来月、このプロジェクトをチーム全体に広げるべきだと思いますか？',
   followups:['What would you need to feel comfortable moving forward?','Would you support a small trial with one group first?'],
   goal:'賛否を一言で示し、理由か条件を添えて会話を続けよう。',
   examples:['I agree with a small trial, but I would wait before expanding it.','I see the benefit. My concern is whether we have enough support.']}
 ]),
 scene('change-booking','注文や予約の内容を変更したい','📅','ホテルに到着後、予約内容を変えられるか相談している。',
  './scenes.html?scene=hotel',[
  {ask:'Your booking is for one guest, but you said two people will be staying. Would you like me to update it?',
   meaning:'予約は1名ですが、2名で宿泊されるとのことですね。変更しましょうか？',
   followups:['There is an extra charge of ten dollars per night. Would you like to continue?','I can update the booking now. Could I see the second guest’s ID?'],
   goal:'変更内容と追加料金を順に確認してから、希望をはっきり伝えよう。',
   examples:['Would the price change if I add one guest?','Yes, please update it for two guests.']},
  {ask:'I can move your dinner reservation to seven, but the patio is only available at six thirty. Which would you prefer?',
   meaning:'夕食の予約は7時に変更できますが、テラス席は6時半のみ空いています。どちらがよいですか？',
   followups:['Great, I have changed it to seven indoors.','Of course. The patio table is booked for six thirty.'],
   goal:'変更後の時刻・場所を復唱し、予約内容の行き違いを防ごう。',
   examples:['Just to confirm, that is seven o’clock indoors, right?','Could you change it to six thirty on the patio?']}
 ]),
 scene('missing-word','言いたい英単語が出てこない','🧭','週末に行きたい場所を友人に説明している。',
  './scenes.html?scene=smalltalk',[
  {ask:'What kind of place would you like to visit this weekend?',
   meaning:'今週末はどんな場所に行きたい？',
   followups:['You mean a place where you can see fish and sea animals? That is an aquarium.','Oh, an aquarium! Is there one you would like to visit?'],
   goal:'単語を思い出すまで止まらず、場所の特徴や用途を知っている語で説明しよう。',
   examples:['It is a place where you can see fish and sea animals.','You can watch sea animals there.']},
  {ask:'What should we bring to keep our drinks cold on the drive?',
   meaning:'ドライブ中に飲み物を冷やしておくには、何を持っていけばいい？',
   followups:['Do you mean a cooler? I can bring one.','A cooler would work. I have a small one in the garage.'],
   goal:'名前が出てこない物を、用途・形・使う場面から説明して会話を続けよう。',
   examples:['It is a box that keeps food and drinks cold.','We put ice inside it and carry drinks in it.']}
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
const FOCUS_SCENE_BY_REASON=Object.freeze({
 misunderstood:'fast-english',unknown:'unknown-word',long:'long-explanation',
 words:'missing-word',surprise:'sudden-opinion',unsure:'change-booking'
});
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
 const totals=Object.fromEntries(Object.keys(FREEZE_REASONS).map(id=>
  [id,Object.values(p.records).reduce((sum,e)=>sum+(e.reasonCounts?.[id]||0),0)]));
 const ranked=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
 const focus=FREEZE_SCENES.find(s=>s.id===FOCUS_SCENE_BY_REASON[ranked[0]?.[0]]);
 if(due[0])return due[0];
 if(ranked[0]?.[1]>0&&focus)return focus;
 const unseen=FREEZE_SCENES.filter(s=>!p.records[s.id]);
 const upcoming=FREEZE_SCENES.filter(s=>p.records[s.id]&&p.records[s.id].due>day)
  .sort((a,b)=>p.records[a.id].due.localeCompare(p.records[b.id].due));
 return unseen[0]||upcoming[0]||FREEZE_SCENES[0];
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
  case 'unknown':return {
   line:next||'Sure. Which word would you like me to explain?',
   caption:'意味を尋ねた想定：相手がその単語を説明してくれます。',rate:.86};
  case 'long':return {
   line:'Of course. Let’s take it one step at a time. '+next,
   caption:'説明を小分けにしてもらった想定：まず一つ目を聞いて返そう。',rate:.86};
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
