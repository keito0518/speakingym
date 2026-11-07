// Authored offline practice for the three later Snowlit City chapters.
// Each difficulty changes the task and context; no AI calls or forced microphone.
const LEVELS=['easy','normal','hard'];
const tiles=answer=>{
 const words=answer.replace(/[.!?]$/,'').split(' ');
 return [...words.filter((_,i)=>i%2===1).reverse(),...words.filter((_,i)=>i%2===0).reverse()];
};
const TOPICS=[
 {area:'city-market',id:'exchange',kind:'vocab',phraseId:'order',levels:[
  ['雪の服屋','この手袋は小さすぎる。大きいサイズに_____できますか？ Can I _____ these for a larger size?','exchange',['exchange','borrow','deliver'],'品物を別のサイズに交換する動詞。','exchange these for a larger size は「これを大きいサイズに交換する」。'],
  ['At a winter clothing store','You want the same jacket in a different size, not your money back. Could I _____ this for a medium?','exchange',['exchange','refund','reserve'],'Keep the same product but change the size.','exchange A for B is to swap an item. A refund gives money back instead.'],
  ['A purchase with a faulty zipper','The jacket has a broken zipper, but you would accept the same model in working condition. Ask for a _____.','replacement',['replacement','deposit','discount'],'You want an equivalent item in place of the faulty one.','A replacement is a new item supplied in place of a defective one; a deposit is a payment made in advance.']
 ]},
 {area:'city-market',id:'receipt',kind:'vocab',phraseId:'price',levels:[
  ['屋台のお会計','買った品物の支払い記録をもらう。 Could I have a _____, please?','receipt',['receipt','menu','ticket'],'代金を支払った証拠になる書類のこと。','receipt は購入・支払いの控え。ticket は入場券や乗車券。'],
  ['Returning a damaged souvenir','The shop gives you back the money you paid. You receive a _____.','refund',['refund','surcharge','reservation'],'お金が戻ることを表す名詞。','refund は返金。surcharge は追加料金で反対の意味。'],
  ['Splitting a complicated bill','You need a receipt showing each item and its separate cost. Please provide an _____ receipt.','itemized',['itemized','estimated','optional'],'料金の内訳を一品ごとに示す形容詞。','An itemized receipt lists each item and its price; an estimated total is only approximate.']
 ]},
 {area:'city-market',id:'allergy',kind:'grammar',phraseId:'order',levels:[
  ['雪の屋台','ピーナッツが入っているか確認しよう。','Does this contain peanuts?','Does + 主語 + 動詞の原形。','contain は「含む」。アレルギーがあるときは材料を具体的に聞こう。'],
  ['Ordering food safely','Ask a stall owner politely whether the sauce contains peanuts.','Could you tell me whether the sauce contains peanuts?','whether の後は平叙文の語順。','Could you tell me whether ...? is a polite indirect question; do not invert does within the whether clause.'],
  ['Checking cross-contact risks','Ask the staff to check whether the sauce contains peanuts before you place your order.','Would you mind checking whether the sauce contains peanuts?','Would you mind + 動名詞。','Would you mind checking ...? asks someone to verify ingredients; checking not check follows mind.']
 ]},
 {area:'city-market',id:'extra-charge',kind:'grammar',phraseId:'clarify',levels:[
  ['お会計','この表示価格が最終金額か聞こう。','Is this the final price?','Is + this + 名詞句。','Is this the final price? checks the total without assuming an error.'],
  ['An unexpected bill','Politely ask why the total on the receipt is higher than expected.','Could you explain why the total is higher?','Could you explain + why + 主語 + 動詞。','In an indirect question, use why the total is higher, not why is the total higher.'],
  ['Comparing a quoted and final amount','Ask for an itemized receipt so you can check the extra charges.','Would it be possible to have an itemized receipt?','Would it be possible to + 動詞。','Would it be possible to have ...? makes a clear, considerate request for details.']
 ]},
 {area:'city-terminal',id:'connections',kind:'vocab',phraseId:'direction',levels:[
  ['北の駅','別の路線に_____する。 I need to _____.','transfer',['transfer','refund','return'],'別の路線へ電車を乗り換える動詞。','transfer は別の路線や車両に乗り換えること。'],
  ['Changing trains','Your first train arrives at 11:50 and the next leaves at 11:55. You have a tight _____.','connection',['connection','discount','reservation'],'２つの交通手段の乗り継ぎ。','A tight connection means there is little time between arriving and departing.'],
  ['After a missed connection','Your original bus has left, and staff arrange another bus instead. They offer _____ transport.','replacement',['replacement','optional','identical'],'元の便の代わりとなる交通手段。','Replacement transport is arranged because the originally planned service is unavailable.']
 ]},
 {area:'city-terminal',id:'services',kind:'vocab',phraseId:'late',levels:[
  ['雪で遅延','列車は走っているが、10分の_____がある。 There is a ten-minute _____.','delay',['delay','refund','platform'],'運休ではなく予定より遅れていること。','delay は遅延。cancelled は便そのものが走らない。'],
  ['A train that will not run','The operator says the 9:15 service will not run at all. It has been _____.','cancelled',['cancelled','delayed','repaired'],'遅れて運行するのではなく便がなくなった。','A cancelled train will not run; a delayed train is expected to operate later.'],
  ['Severe weather service updates','All trains on the line have stopped temporarily until conditions improve. Service is _____.','suspended',['suspended','rescheduled','transferred'],'路線全体が一時的に運行を止めている。','Service is suspended means operations are temporarily halted; rescheduled refers to a changed time.']
 ]},
 {area:'city-terminal',id:'platform-question',kind:'grammar',phraseId:'direction',levels:[
  ['電車のホーム','どのホームか尋ねよう。','Which platform is it?','Which + 名詞 + is it?','Which platform is it? is a short, natural question at a station.'],
  ['Finding the right departure','Ask staff politely which platform your train leaves from.','Could you tell me which platform the train leaves from?','Could you tell me の後は平叙文語順。','In the indirect question, say which platform the train leaves from, not does the train leave from.'],
  ['A changed platform announcement','Ask whether the express still leaves from platform four.','Could you confirm whether the express still leaves from platform four?','whether + 主語 + 動詞。','Could you confirm whether ...? checks a specific detail without assuming the old information is correct.']
 ]},
 {area:'city-terminal',id:'ticket-change',kind:'grammar',phraseId:'change',levels:[
  ['運休時の切符','切符を変更できるか尋ねよう。','Can I change my ticket?','Can I + 動詞の原形。','Can I change my ticket? asks about the available procedure.'],
  ['Missing a booked connection','Ask whether it is possible to move your reservation to Friday.','Is it possible to change my booking to Friday?','Is it possible to + 動詞。','Is it possible to change ...? is a clear way to ask about rescheduling.'],
  ['A final train cancelled in the snow','Ask whether you could use your ticket the next day if the last train is cancelled.','If the last train is cancelled, could I use my ticket tomorrow?','If + 条件、could I + 動詞。','The if-clause states the condition; could I use ... asks about a specific alternative.']
 ]},
 {area:'city-blizzard',id:'shelter',kind:'vocab',phraseId:'help',levels:[
  ['雪の避難','寒さを避けて待てる場所を探す。 We need _____.','shelter',['shelter','receipt','platform'],'悪天候から身を守って安全に待てる場所。','Shelter is a safe place protecting people from weather.'],
  ['A place to wait in a storm','The waiting room has heating and is warm. It is a _____ waiting area.','heated',['heated','delayed','reserved'],'暖房があることを表す形容詞。','A heated waiting area is warmed by a heating system; delayed describes something late.'],
  ['An urgent public safety message','People are instructed to contact rescue services because they are in immediate danger. It is an _____.','emergency',['emergency','estimate','appointment'],'すぐの対応が必要な深刻な事態。','An emergency requires immediate action, unlike an appointment or an estimate.']
 ]},
 {area:'city-blizzard',id:'road-closure',kind:'vocab',phraseId:'problem',levels:[
  ['雪道の通行止め','道路は通れない。 The road is _____.','closed',['closed','open','early'],'通行止めで車が進めない道路の状態。','The road is closed is a standard notice for a road closure.'],
  ['Finding another route','The main road is closed and drivers are directed along a longer road. Follow the _____.','detour',['detour','shortcut','platform'],'通行止めを避けるための回り道。','A detour is an alternative route around an obstruction; a shortcut is intended to be shorter.'],
  ['A road covered by deep snow','The snow is so deep that cars cannot pass the road at all. It is _____.','impassable',['impassable','accessible','optional'],'通ること自体ができない状態。','Impassable means movement is not possible; accessible means people can reach it.']
 ]},
 {area:'city-blizzard',id:'safe-help',kind:'grammar',phraseId:'help',levels:[
  ['雪道で助けを求める','助けてもらえるか丁寧に聞こう。','Could you help me?','Could you + 動詞の原形。','Could you help me? is a simple polite request for assistance.'],
  ['Waiting safely during the storm','Ask where you can wait safely while the buses are stopped.','Could you tell me where I can wait safely?','where I can wait は間接疑問文の語順。','After Could you tell me, keep subject before can: where I can wait.'],
  ['A blocked road and no direct route','Ask for a safe alternative because the main road is closed.','As the road is closed, could you suggest a safe alternative?','As + 理由、could you + 動詞。','As the road is closed explains the reason before asking for a safe alternative.']
 ]},
 {area:'city-blizzard',id:'postpone',kind:'grammar',phraseId:'change',levels:[
  ['雪で待ち合わせを変更','少し遅く会えるか聞こう。','Can we meet later?','Can we + 動詞の原形。','Can we meet later? is a concise proposal to move the meeting time.'],
  ['Buses stopped by heavy snow','Propose meeting online because buses are not running.','Since the buses are not running, could we meet online?','Since + 理由、could we + 動詞。','Since the buses are not running gives the reason for the alternative meeting.'],
  ['A road closure that may continue','Ask to postpone the meeting until tomorrow if the road remains closed.','If the road remains closed, could we postpone our meeting until tomorrow?','If + 条件、could we postpone ...。','If states the condition and could we postpone suggests a concrete backup plan.']
 ]}
];

export const SNOW_CITY_QUIZZES=Object.freeze(TOPICS.flatMap(topic=>topic.levels.map(([scene,cue,answer,optionsOrHint,hintOrTip,maybeTip],i)=>{
 const difficulty=LEVELS[i],vocab=topic.kind==='vocab',baseId=`${topic.area}-${topic.id}`;
 return Object.freeze({id:`${baseId}-${difficulty}`,baseId,phraseId:topic.phraseId,world:topic.area,kind:topic.kind,difficulty,scene,cue,
  ...(difficulty==='easy'?{}:{task:vocab?'Choose the word that best completes the situation.':'Arrange the words into a natural English sentence.'}),
  answer,...(vocab?{options:optionsOrHint}:{tokens:tiles(answer)}),hint:vocab?hintOrTip:optionsOrHint,tip:vocab?maybeTip:hintOrTip});
})));

const SPEAKING=[
 {area:'city-market',id:'order',phraseId:'order',levels:[
  ['雪の屋台','熱いお茶を一杯くださいとお願いしよう。','Could I have a hot tea, please?','Could I get a hot tea, please?','Could I have ...?','Could I have ...? is a polite, practical order.'],
  ['A busy winter market','Ask for two hot teas and say you would like them to go.','Could I have two hot teas to go, please?','Could I get two hot teas to take away, please?','two ... to go','to go / to take away means you do not want to drink them at the stall.'],
  ['A crowded stall before closing','Order two hot teas to go and ask whether they can be made without sugar.','Could I have two hot teas to go without sugar, please?','May I have two hot teas without sugar to take away, please?','to go ... without sugar','State both quantity and the no-sugar condition so the order is usable.']
 ]},
 {area:'city-market',id:'return',phraseId:'problem',levels:[
  ['雪の土産物店','買った品物が壊れていると伝えよう。','This is broken.','This item is damaged.','This is ...','State the problem first without blaming the staff.'],
  ['A souvenir shop','Explain that the zipper is broken and ask if you can exchange the jacket.','The zipper is broken. Could I exchange this jacket?','The zipper does not work. Can I exchange the jacket?','The zipper ... Could I ...?','Describe the issue and clearly ask for an exchange.'],
  ['A receipt and a faulty item','Explain that the zipper broke before you wore the jacket and ask for an exchange with your receipt.','The zipper broke before I wore the jacket. Could I exchange it with this receipt?','I have not worn it, but the zipper is broken. Could I exchange it with my receipt?','before ... with this receipt','State when the problem occurred and give staff a practical next step.']
 ]},
 {area:'city-market',id:'bill',phraseId:'clarify',levels:[
  ['レジで','この追加料金について説明を求めよう。','Could you explain this extra charge?','Could you tell me what this extra charge is for?','Could you explain ...?','Ask about a charge before claiming it is wrong.'],
  ['At the market register','You expected a lower total. Ask politely why the total is higher.','Could you explain why the total is higher?','Could you tell me why the bill is higher than expected?','Could you explain why ...?','An indirect question uses why the total is higher.'],
  ['Questioning a market service fee','The quoted price did not mention a service fee. Explain that and ask for an itemized receipt.','The quoted price did not include a service fee. Could I have an itemized receipt?','I was not told about a service fee. Could you provide an itemized receipt?','quoted price ... itemized receipt','Mention the discrepancy and ask for information before negotiating.']
 ]},
 {area:'city-terminal',id:'transfer',phraseId:'direction',levels:[
  ['北の駅','どこで乗り換えるのか聞こう。','Where do I transfer?','Where should I change trains?','Where do I ...?','transfer and change trains both express a rail connection.'],
  ['Changing lines','Ask where you should transfer to the green line.','Where should I transfer to the green line?','Where do I change to the green line?','Where should I transfer ...?','Name the destination line so staff can answer precisely.'],
  ['A tight train connection','Ask which platform the green line leaves from and whether five minutes is enough to transfer.','Which platform does the green line leave from, and is five minutes enough to transfer?','Where does the green line depart, and do I have enough time to change in five minutes?','platform ... enough to transfer','Two concrete questions help the staff give a useful connection recommendation.']
 ]},
 {area:'city-terminal',id:'ticket',phraseId:'change',levels:[
  ['切符売り場','切符を明日に変更できるか尋ねよう。','Could I change my ticket to tomorrow?','Can I move my ticket to tomorrow?','Could I change ...?','Name the new day rather than asking vaguely about changes.'],
  ['A cancelled departure','Your train has been cancelled. Ask if you can change the ticket to tomorrow.','My train has been cancelled. Could I change my ticket to tomorrow?','The train was cancelled. Can I use my ticket tomorrow instead?','cancelled ... tomorrow','Mention the cancellation and ask for the specific alternative.'],
  ['An invalid connection after snow delays','Your connection was cancelled, and you have already paid. Ask if you can rebook without paying again.','My connection was cancelled. Could I rebook without paying again?','The connection was cancelled. Is it possible to change my booking without an extra fee?','rebook ... without paying again','Give both the reason and the no-extra-charge condition.']
 ]},
 {area:'city-terminal',id:'delay',phraseId:'late',levels:[
  ['待ち合わせの連絡','電車が遅れていると伝えよう。','My train is delayed.','The train is running late.','My train ...','Delayed means late, not necessarily cancelled.'],
  ['Calling a friend','Say your train is delayed by twenty minutes and you will arrive later.','My train is delayed by twenty minutes, so I will arrive late.','The train is running twenty minutes late, so I will be late.','delayed by twenty minutes','Give a concrete delay and its effect on the meeting.'],
  ['A last-minute schedule update','Your train is twenty minutes late, and you may miss the connection. Explain both facts.','My train is delayed by twenty minutes, and I might miss my connection.','The train is running twenty minutes late, so I may miss the connecting train.','twenty minutes ... connection','State both the delay and the possible missed connection; do not say it is already missed.']
 ]},
 {area:'city-blizzard',id:'shelter',phraseId:'help',levels:[
  ['吹雪のバス停','安全に待てる場所を聞こう。','Where can I wait safely?','Is there somewhere safe I can wait?','Where can I ...?','Ask for a safe place instead of assuming the bus stop is safe.'],
  ['A snowy road closure','The road is closed. Ask if there is a heated place where you can wait.','The road is closed. Is there a heated place where I can wait?','Since the road is closed, is there somewhere warm I can wait?','road is closed ... heated place','Explain the reason and ask about shelter, not only the next bus.'],
  ['A stranded traveller during a blizzard','Explain that the road is closed, you cannot reach your hotel, and you need a safe place to wait.','The road is closed and I cannot reach my hotel. Is there a safe place where I can wait?','I cannot get to my hotel because the road is closed. Could you suggest somewhere safe to wait?','cannot reach my hotel ... safe place','Describe the constraint and ask for a concrete, safe next step.']
 ]},
 {area:'city-blizzard',id:'alternative',phraseId:'prefer',levels:[
  ['運休の案内所','別の移動方法はあるか尋ねよう。','Is there another way to get there?','Is there an alternative way to get there?','another way','Another way asks for a workable route, not the same unavailable service.'],
  ['A cancelled bus','The bus is cancelled. Ask if another route is available.','The bus is cancelled. Is there another route available?','Since the bus has been cancelled, is there an alternative route?','cancelled ... another route','Give the reason before asking about an alternative.'],
  ['After the final train is suspended','All trains have stopped. Ask whether a replacement bus is running and where to board it.','All trains are suspended. Is there a replacement bus, and where can I board it?','The train service has stopped. Is a replacement bus available, and where does it leave from?','suspended ... where can I board','A useful inquiry checks both availability and boarding location.']
 ]},
 {area:'city-blizzard',id:'reschedule',phraseId:'change',levels:[
  ['悪天候の約束','明日に変更できるか尋ねよう。','Could we meet tomorrow instead?','Can we move our meeting to tomorrow?','tomorrow instead','Instead clearly marks tomorrow as a substitute for the original plan.'],
  ['Meeting during a snowstorm','Explain that buses are not running and propose meeting online instead.','The buses are not running. Could we meet online instead?','Since the buses are not running, could we have the meeting online?','buses ... online instead','Explain the disruption and propose a realistic alternative.'],
  ['An important meeting across a closed road','The road may remain closed tomorrow. Suggest meeting online now, or postponing if that is impossible.','The road may stay closed tomorrow. Could we meet online, or postpone if that is not possible?','The road might still be closed tomorrow. Could we meet online, and postpone if we cannot?','may stay closed ... meet online or postpone','Give a primary plan and a fallback; avoid presenting a possibility as certain.']
 ]}
];
export const SNOW_CITY_SPEAKING=Object.freeze(SPEAKING.flatMap(topic=>topic.levels.map(([scene,cue,answer,alternative,hint,tip],i)=>{
 const difficulty=LEVELS[i],baseId=`${topic.area}-speak-${topic.id}`;
 return Object.freeze({id:`${baseId}-${difficulty}`,baseId,phraseId:topic.phraseId,world:topic.area,kind:'speak',extraAdventure:true,difficulty,scene,cue,
  ...(difficulty==='easy'?{}:{task:'Respond naturally in English, including the key details of the situation.'}),answer,alternatives:[alternative],hint,tip});
})));
