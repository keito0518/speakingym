// Offline, scene-specific English for World 03: the Starlit Ruins.
// Listening still uses the existing, verified local voice clips; the questions
// below add new vocabulary, grammar and speaking situations in the ruins.
const LEVELS=['easy','normal','hard'];
const scramble=answer=>{
 const parts=answer.replace(/[.!?]$/,'').split(' ');
 return [...parts.filter((_,i)=>i%2).reverse(),...parts.filter((_,i)=>!(i%2)).reverse()];
};
const QUIZZES=[
 {area:'ruins-gate',id:'inscription',kind:'vocab',phraseId:'clarify',levels:[
  ['星の遺跡','石の壁に刻まれた文字を読む。この_____は何を意味する？ What does this _____ mean?','inscription',['inscription','receipt','ticket'],'石や金属に刻まれた文字のこと。','An inscription is writing carved on a surface, not a purchase receipt.'],
  ['An old stone arch','The words were carved into the stone hundreds of years ago. This is an _____.','inscription',['inscription','appointment','advertisement'],'Name the writing carved into stone.','Inscription refers to words or symbols cut into stone, often to record something important.'],
  ['A damaged ancient tablet','Only half the carved text remains readable. Archaeologists try to _____ the missing message.','decipher',['decipher','deliver','postpone'],'Read a message that is difficult to understand.','Decipher means work out the meaning of symbols or hard-to-read writing.']
 ]},
 {area:'ruins-gate',id:'direction',kind:'vocab',phraseId:'direction',levels:[
  ['星座の壁画','方角を示す矢印のこと。 Follow the _____.','arrow',['arrow','receipt','ticket'],'矢印はどこへ進むかを示す。','An arrow shows a direction; a ticket allows travel.'],
  ['A passage behind a mural','The narrow route leads to a different chamber. It is a _____.','passage',['passage','refund','departure'],'A corridor or route through a building.','A passage can connect rooms or chambers in a building.'],
  ['A locked maze of hallways','You need the shortest usable route rather than the path with the fewest turns. Find an _____ path.','accessible',['accessible','accidental','optional'],'A route you can actually enter and travel along.','An accessible path can be reached and used; the shortest-looking path may be blocked.']
 ]},
 {area:'ruins-gate',id:'sign',kind:'grammar',phraseId:'clarify',levels:[
  ['壊れた看板','この矢印は出口を指していますか？','Does this arrow point to the exit?','Does + 主語 + 動詞の原形。','Does this arrow point ...? asks about what the sign actually indicates.'],
  ['A faded direction sign','Ask whether the passage on the left leads to the old gate.','Could you tell me whether the left passage leads to the old gate?','whether の後は平叙文の語順。','After whether, write the left passage leads, not does the left passage lead.'],
  ['Two conflicting directions','Ask your partner to confirm which arrow points to the old gate before moving.','Could you confirm which arrow points to the old gate before we move?','which arrow + 動詞、before we + 動詞。','Which arrow points is a subject question; before we move adds a safety check.']
 ]},
 {area:'ruins-gate',id:'repeat',kind:'grammar',phraseId:'repeat',levels:[
  ['古い音声案内','もう一度言ってもらえますか？','Could you say that again?','Could you + 動詞の原形。','Could you say that again? is a polite way to request repetition.'],
  ['An echoing chamber','Ask your teammate to repeat the name of the correct passage.','Could you repeat the name of the correct passage?','Could you repeat + 具体的な情報。','Repeating the name of the passage removes ambiguity before you enter.'],
  ['An unclear spoken instruction','Explain that you missed the final direction and ask for that part again.','I missed the last direction, so could you repeat that part?','I missed ... Could you repeat ...?','Specify what you did not hear, so your partner can repeat only the necessary detail.']
 ]},
 {area:'ruins-core',id:'sequence',kind:'vocab',phraseId:'late',levels:[
  ['時の祭壇','順番どおりに操作する。Follow the correct _____.','sequence',['sequence','receipt','refund'],'物事を行う決まった順序のこと。','Sequence describes the order in which things happen.'],
  ['A set of rotating rings','The rings must be turned in a particular order. Follow the _____.','sequence',['sequence','discount','arrival'],'The required order of steps.','A sequence of actions matters when later steps depend on earlier ones.'],
  ['An ancient timed mechanism','The gate will close when the sand runs out. You must act before the _____.','deadline',['deadline','platform','direction'],'The latest time by which an action must be finished.','A deadline is the point after which an action is too late.']
 ]},
 {area:'ruins-core',id:'mechanism',kind:'vocab',phraseId:'change',levels:[
  ['歯車の部屋','仕掛けを動かす大きな歯車。The _____ is stuck.','gear',['gear','ticket','receipt'],'回転して力を伝える部品。','A gear is a toothed wheel in a machine.'],
  ['An ancient clockwork device','A metal wheel with teeth transfers motion to another wheel. It is a _____.','gear',['gear','bridge','shelter'],'A toothed part of a mechanism.','A gear passes rotation to another gear; a bridge does not.'],
  ['A mechanism that stopped moving','The gears are no longer moving because the central wheel is _____.','jammed',['jammed','refunded','reserved'],'The mechanism is stuck and cannot rotate.','Jammed means unable to move because something is blocking the mechanism.']
 ]},
 {area:'ruins-core',id:'condition',kind:'grammar',phraseId:'change',levels:[
  ['時の扉','最初のレバーを引いたら、扉が開く。','If you pull the first lever, the door will open.','If + 現在形、will + 動詞。','A real future condition takes present tense after if.'],
  ['Two levers that must be used in order','Explain that the second lever works only after the first one is pulled.','The second lever will work only after you pull the first one.','only after + 主語 + 動詞。','Only after you pull the first one states the required order.'],
  ['A gate with two conditions','Explain that the door will remain locked unless both gears are aligned.','The door will remain locked unless both gears are aligned.','unless + 条件。','Unless means if not; both gears must line up before the door can open.']
 ]},
 {area:'ruins-core',id:'request',kind:'grammar',phraseId:'help',levels:[
  ['止まった仕掛け','レバーを押すのを手伝ってもらおう。','Could you help me push the lever?','Could you help me + 動詞の原形。','Could you help me ...? asks for assistance with a specific task.'],
  ['A heavy metal door','Ask your teammate politely to hold the door while you check the mechanism.','Could you hold the door while I check the mechanism?','Could you + 動詞 + while I ...?','While I check gives the timing of the requested help.'],
  ['A dangerous moving mechanism','Ask your teammate to wait until the gears stop before touching the lever.','Could you wait until the gears stop before touching the lever?','wait until ... before + 動名詞。','Wait until the gears stop is a clear safety condition for the next action.']
 ]}
];
export const STAR_RUINS_QUIZZES=Object.freeze(QUIZZES.flatMap(topic=>topic.levels.map(([scene,cue,answer,optionOrHint,hintOrTip,tip],i)=>{
 const difficulty=LEVELS[i],vocab=topic.kind==='vocab',baseId=`${topic.area}-${topic.id}`;
 return Object.freeze({id:`${baseId}-${difficulty}`,baseId,phraseId:topic.phraseId,world:topic.area,kind:topic.kind,difficulty,scene,cue,
  ...(difficulty==='easy'?{}:{task:vocab?'Choose the word that best completes the situation.':'Arrange the words into a natural English sentence.'}),
  answer,...(vocab?{options:optionOrHint}:{tokens:scramble(answer)}),hint:vocab?hintOrTip:optionOrHint,tip:vocab?tip:hintOrTip});
})));
const SPEAKING=[
 {area:'ruins-gate',id:'inscription',phraseId:'clarify',levels:[
  ['星座の壁画','この古い文字は何を意味するのか聞こう。','What does this inscription mean?','Could you explain what this inscription means?','What does ... mean?','Ask about the meaning of the inscription, not how to pronounce it.'],
  ['A carved star map','Ask your partner whether the star symbol marks the exit.','Does the star symbol mark the exit?','Is the exit marked by the star symbol?','star symbol ... exit','Check the specific symbol and destination.'],
  ['Two conflicting carvings','Explain that the carvings point in different directions and ask which one leads to the gate.','The carvings point in different directions. Which one leads to the gate?','These carvings show different routes. Which one takes us to the gate?','different directions ... gate','State the contradiction before asking for the correct route.']
 ]},
 {area:'ruins-gate',id:'route',phraseId:'direction',levels:[
  ['二つの通路','出口への道はどちらか聞こう。','Which way leads to the exit?','How do we get to the exit?','Which way ...?','A direction question needs the destination.'],
  ['Two passages at the ruins','Ask whether the left passage leads to the old gate.','Does the left passage lead to the old gate?','Is the old gate down the left passage?','left passage ... gate','Name both the passage and destination.'],
  ['A passage with a damaged sign','Explain that the right passage is blocked and ask how to reach the gate another way.','The right passage is blocked. Is there another way to reach the gate?','We cannot use the right passage. How else can we get to the gate?','right passage blocked ... another way','A good request states the blockage and seeks a usable alternative.']
 ]},
 {area:'ruins-gate',id:'echo',phraseId:'repeat',levels:[
  ['反響する声','最後の言葉を聞き返そう。','Could you repeat the last word?','Could you say the last word again?','Could you repeat ...?','Ask for the part you missed.'],
  ['The echoing chamber','Tell your partner you could not hear the final direction and ask them to repeat it.','I could not hear the last direction. Could you repeat it?','I missed the last direction. Could you say it again?','last direction ... repeat','Identify the missing instruction rather than guessing it.'],
  ['An unclear warning at the gate','Explain that the echo hid the final instruction and ask your partner to repeat only that part.','The echo covered the last instruction. Could you repeat that part?','I missed the last instruction because of the echo. Could you say that part again?','echo ... last instruction ... repeat','State both the reason and the specific part that needs repeating.']
 ]},
 {area:'ruins-core',id:'deadline',phraseId:'late',levels:[
  ['時の仕掛け','時間がもうあまりないと伝えよう。','We are running out of time.','We do not have much time left.','running out of time','Warn your partner about limited time.'],
  ['A gate closing soon','Tell your teammate the gate closes in five minutes and you need to hurry.','The gate closes in five minutes, so we need to hurry.','We need to hurry because the gate will close in five minutes.','five minutes ... hurry','A useful warning gives a time and what to do next.'],
  ['A timed door with two levers','Explain that the door closes in five minutes and both levers must be pulled before then.','The door closes in five minutes, and we must pull both levers before then.','We have five minutes before the door closes. Both levers have to be pulled in time.','five minutes ... both levers','State the deadline and both required actions.']
 ]},
 {area:'ruins-core',id:'change',phraseId:'change',levels:[
  ['時計の針','操作の順番を変えようと提案しよう。','Can we change the order?','Could we try a different order?','change the order','Ask to change the sequence of actions.'],
  ['A stuck mechanism','Suggest trying the other lever first because the first one is stuck.','The first lever is stuck. Could we try the other one first?','Since the first lever is stuck, can we try the other lever first?','first lever stuck ... other first','Connect the problem to a practical change of plan.'],
  ['Two failed attempts at a mechanism','Explain that the left lever did not work and suggest testing the right lever before resetting the gears.','The left lever did not work. Could we try the right lever before resetting the gears?','We tried the left lever without success. Could we test the right one before we reset the gears?','left lever failed ... right before reset','Include what failed and the order of your proposed alternative.']
 ]},
 {area:'ruins-core',id:'help',phraseId:'help',levels:[
  ['重い扉','扉を押すのを手伝ってもらおう。','Could you help me push the door?','Can you help me move the door?','help me push ...','Ask for assistance with a concrete task.'],
  ['A heavy stone door','Ask your partner to hold the heavy door while you inspect the gears.','Could you hold the door while I check the gears?','Can you keep the door open while I inspect the gears?','hold door ... while I check','Explain what you need held and when.'],
  ['An unstable gate mechanism','Ask your partner to keep the door open but wait for the gears to stop before touching the lever.','Could you keep the door open and wait until the gears stop before touching the lever?','Please hold the door open, but do not touch the lever until the gears stop.','door open ... wait until gears stop','Two safety constraints matter: keep it open and wait before touching.']
 ]}
];
export const STAR_RUINS_SPEAKING=Object.freeze(SPEAKING.flatMap(topic=>topic.levels.map(([scene,cue,answer,alternative,hint,tip],i)=>{
 const difficulty=LEVELS[i],baseId=`${topic.area}-speak-${topic.id}`;
 return Object.freeze({id:`${baseId}-${difficulty}`,baseId,phraseId:topic.phraseId,world:topic.area,kind:'speak',extraAdventure:true,difficulty,scene,cue,
  ...(difficulty==='easy'?{}:{task:'Respond naturally in English, including every important condition.'}),
  answer,alternatives:[alternative],hint,tip});
})));
