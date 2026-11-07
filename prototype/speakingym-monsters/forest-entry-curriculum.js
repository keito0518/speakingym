// Authored starter-dungeon tasks. Each difficulty changes the actual situation
// and language target; no paid AI, synthetic scoring or repeated filler.
const LEVELS=['easy','normal','hard'];
const tiles=answer=>{
  const words=answer.replace(/[.!?]$/,'').split(' ');
  return [...words.filter((_,i)=>i%2).reverse(),...words.filter((_,i)=>!(i%2)).reverse()];
};

const QUIZZES=[
 {id:'meeting-place',kind:'vocab',phraseId:'direction',levels:[
  ['森の入口で集合','森の門のそばで待ち合わせ。 Please wait by the _____.','gate',['gate','receipt','menu'],'入口の門を英語で表す単語を選ぼう。','Gate is an entrance to an enclosed area; a receipt is proof of payment.'],
  ['Finding the meeting place','There are two paths, but both lead to the same wooden _____. Meet me there.','bridge',['bridge','platform','counter'],'A structure that takes you across a stream.','A bridge crosses an obstacle such as a stream. Platform refers to a station.'],
  ['A fork in the forest trail','The trail splits toward the village and the lake. The signpost stands at this _____.','junction',['junction','reservation','departure'],'Two routes meet or separate at this point.','A junction is a place where routes meet or split. Check both directions before choosing.']
 ]},
 {id:'trail-notice',kind:'vocab',phraseId:'clarify',levels:[
  ['森の道しるべ','村へ進む方向を示している。 Follow the _____.','sign',['sign','bill','price'],'道にある案内表示は英語で何という？','A sign gives directions or instructions; a bill requests payment.'],
  ['A sign at the crossroads','The painted _____ points toward the campsite, so follow that direction.','arrow',['arrow','refund','ticket'],'A symbol that points in a direction.','An arrow indicates the way to go. It does not prove that you have a ticket.'],
  ['A blocked forest bridge','The bridge is closed for repairs. The map shows a longer _____ that avoids it.','detour',['detour','deadline','discount'],'A route around a closed road or path.','A detour is an alternate route around an obstruction, even if it takes longer.']
 ]},
 {id:'arrival-update',kind:'grammar',phraseId:'late',levels:[
  ['森の待ち合わせ','5分遅れることを仲間に伝えよう。','I will be five minutes late.','I will be + 時間 + late の順に並べよう。','I will be five minutes late gives a clear arrival update.'],
  ['The trail is blocked','Tell your companion that you will be ten minutes late because the trail is blocked.','I will be ten minutes late because the trail is blocked.','because の後には理由を表す文。','Because the trail is blocked explains why you will arrive late.'],
  ['An unexpected closure','Tell your companion that the bridge is closed and you expect to arrive about fifteen minutes late.','The bridge is closed, so I will be about fifteen minutes late.','so + 結果を表す文。','Separate the confirmed closure from your approximate arrival delay.']
 ]},
 {id:'check-the-route',kind:'grammar',phraseId:'repeat',levels:[
  ['道案内が聞こえなかった','進む方向をもう一度教えてほしい。','Could you repeat the direction?','Could you + 動詞の原形で丁寧に頼もう。','Repeat the direction asks for the specific information you missed.'],
  ['Two forest paths','Ask your companion which path you should take.','Could you tell me which path we should take?','which path we should take は間接疑問文の語順。','An indirect question keeps the subject before should.'],
  ['A confusing sign at the gate','Ask for confirmation that the narrow path leads back to the entrance.','Could you confirm whether the narrow path leads back to the entrance?','whether + 主語 + 動詞。','After whether, do not invert the subject and verb as in a direct question.']
 ]},
 {id:'weather-shelter',kind:'vocab',phraseId:'help',levels:[
  ['急な雨','雨を避けられる場所を探している。 We need ____ from the rain.','shelter',['shelter','ticket','receipt'],'雨や風から身を守れる場所を表す英単語。','Shelter is protection from bad weather; a receipt only proves a purchase.'],
  ['A warning about the weather','The weather _____ says heavy rain will reach the forest by noon.','forecast',['forecast','discount','receipt'],'A prediction of future weather.','A weather forecast tells you what conditions are expected, so you can plan a safe route.'],
  ['A rising river','The path near the river is closed. The park has posted a flood ____ near the bridge.','warning',['warning','reservation','discount'],'A notice about a possible danger rather than a booking.','A flood warning alerts walkers to a risk. It is not permission to cross the bridge.']
 ]},
 {id:'choose-safe-route',kind:'grammar',phraseId:'prefer',levels:[
  ['短い道を選ぶ','仲間に短い道を選びたいと伝えよう。','I would rather take the short path.','would rather + 動詞の原形で希望を伝えよう。','Would rather take the short path expresses a preference, not a command to your partner.'],
  ['Rain before sunset','Tell your companion you prefer the marked path because it may rain soon.','I prefer the marked path because it may rain soon.','because の後には理由を表す文を続ける。','The marked path is the choice, and the approaching rain is the reason for that preference.'],
  ['A choice between two trails','You know the direct trail is shorter but slippery. Explain why you prefer the marked route.','Although the direct trail is shorter, I prefer the marked route because it is safer.','Although ... , I prefer ... because ... の順にしよう。','Although introduces the drawback of a choice, while because explains the safety reason.']
 ]}
];

const SPEAKING=[
 {id:'meet-at-gate',phraseId:'clarify',levels:[
  ['森の入口','門のそばで待っていると伝えよう。',"I'm waiting by the gate.","I'm at the gate.",'waiting by the gate','Tell your companion exactly where you are, not just that you are waiting.'],
  ['A wooden bridge','Tell your companion where you are and ask them to meet you there.',"I'm at the wooden bridge. Can you meet me here?","I'm waiting at the wooden bridge. Could you come here?",'at the wooden bridge ... meet me here','Give a recognizable landmark and make a clear request.'],
  ['The main path is blocked','Explain where you are, mention the blocked path and propose meeting at the entrance.',"I'm near the wooden bridge, but the main path is blocked. Could we meet at the entrance instead?","The main path is blocked, so can we meet at the entrance instead of the bridge?",'bridge ... blocked ... entrance instead','State both the problem and the practical replacement meeting point.']
 ]},
 {id:'find-the-way',phraseId:'help',levels:[
  ['森の中で迷った','森の入口を見つけるのを手伝ってほしいと頼もう。','Could you help me find the entrance?','Can you help me find the entrance?','help me find the entrance','A specific request for help makes it easier for someone to respond.'],
  ['A wrong turn on the trail','Explain that you may have taken the wrong path and ask for the way back.','I think I took the wrong path. Could you show me the way back?','I may have taken the wrong trail. Can you help me get back?','wrong path ... way back','Describe the situation first, then ask for directions back.'],
  ['Lost beyond the lake sign','Explain that you followed a sign, got lost, and need help returning to the main trail.','I followed the sign toward the lake, but I seem to be lost. Could you help me get back to the main trail?','I took the path to the lake and got lost. Could you show me how to return to the main trail?','followed the sign ... lost ... main trail','Give where you last were and which route you want to recover.']
 ]},
 {id:'check-bridge-safety',phraseId:'clarify',levels:[
  ['橋を渡る前に','この橋を安全に渡れるか確認しよう。','Is this bridge safe to cross?','Can we safely cross this bridge?','bridge ... safe to cross','A short safety question is better than assuming a damaged bridge is usable.'],
  ['After heavy rain','Ask whether the bridge is safe after the rain and whether there is another route.','Is the bridge safe to cross after the rain? Is there another route?','Can we cross the bridge safely after the rain, or should we take another path?','bridge ... safe ... rain ... another route','Check the current conditions and ask for an alternative instead of just requesting directions.'],
  ['A wet bridge with heavy bags','Explain that you are carrying heavy bags and ask whether the wet bridge is safe or if there is a safer way.','We are carrying heavy bags, and the bridge is wet. Is it safe to cross, or is there a safer route?','The bridge is wet and our bags are heavy. Could you tell us whether there is a safer path?','heavy bags ... wet bridge ... safe ... route','Mention the practical risk and request a safer alternative if the crossing is uncertain.']
 ]},
 {id:'offer-trail-help',phraseId:'help',levels:[
  ['仲間の荷物','荷物が重そうな仲間に、運ぶのを手伝うと申し出よう。','Can I help you carry your bag?','Let me help you with your bag.','help ... carry ... bag','Offering help with a specific bag is more useful than a vague offer.'],
  ['A tired companion','Your friend looks tired during the walk. Suggest a break and offer to carry their bag.','You look tired. Would you like to take a break? I can carry your bag.','Do you want to rest for a while? I can help carry your bag.','tired ... break ... carry ... bag','Offer a rest first and let your companion decide whether they need help.'],
  ['A companion needs to stop','Your companion hurt their ankle on the trail. Suggest stopping and say you can call for help.','Let us stop here. I can call for help while we wait.','We should stop walking. I can call someone for help and stay with you.','stop ... call for help ... wait','Keep the proposal calm and specific. Do not encourage an injured companion to keep walking.']
 ]}
];

export const FOREST_ENTRY_PROMPTS=Object.freeze([
 ...QUIZZES.flatMap(topic=>topic.levels.map(([scene,cue,answer,optionsOrHint,hintOrTip,tip],i)=>{
  const difficulty=LEVELS[i],vocab=topic.kind==='vocab',baseId=`entry-${topic.id}`;
  return Object.freeze({id:`${baseId}-${difficulty}`,baseId,phraseId:topic.phraseId,world:'entry',
   kind:topic.kind,difficulty,scene,cue,
   ...(difficulty==='easy'?{}:{task:vocab?'Choose the word that best fits the situation.':'Arrange the words into a natural sentence.'}),
   answer,...(vocab?{options:optionsOrHint}:{tokens:tiles(answer)}),
   hint:vocab?hintOrTip:optionsOrHint,tip:vocab?tip:hintOrTip});
 })),
 ...SPEAKING.flatMap(topic=>topic.levels.map(([scene,cue,answer,alternative,hint,tip],i)=>{
  const difficulty=LEVELS[i],baseId=`entry-speak-${topic.id}`;
  return Object.freeze({id:`${baseId}-${difficulty}`,baseId,phraseId:topic.phraseId,world:'entry',
   kind:'speak',extraAdventure:true,difficulty,scene,cue,
   ...(difficulty==='easy'?{}:{task:'Respond naturally in English, including the situation details.'}),
   answer,alternatives:[alternative],hint,tip});
 }))
]);
