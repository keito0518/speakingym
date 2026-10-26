export const companions = [
  { id:'momo', name:'Momo', kind:'Puff fox', color:'#ffbd71', accent:'#f27d60', skill:'Balanced', line:'Small steps make strong journeys.' },
  { id:'lumi', name:'Lumi', kind:'Cloud sprite', color:'#91d9ed', accent:'#7777d8', skill:'Steady', line:'Listen closely. The path will appear.' },
  { id:'koro', name:'Koro', kind:'Moss cub', color:'#8bd39a', accent:'#39866b', skill:'Brave', line:'Let’s try, learn, and try again!' }
];

// Original SVG creatures are drawn by the prototype; no third-party character art is used.
export const monsters = [
  {id:'mimip',name:'Mimip',kind:'Meadow Mimic',color:'#f4bd69',accent:'#ed805d',glyph:'✿',boss:false},
  {id:'pebblet',name:'Pebblet',kind:'Pebble Pup',color:'#aebac8',accent:'#708ba2',glyph:'◆',boss:false},
  {id:'puddle',name:'Puddlekin',kind:'Rain Sprite',color:'#84d5e5',accent:'#4c95c8',glyph:'◒',boss:false},
  {id:'twiggle',name:'Twiggle',kind:'Little Treant',color:'#9aca7a',accent:'#5e9b65',glyph:'♣',boss:false},
  {id:'glimmer',name:'Glimlet',kind:'Lantern Moth',color:'#e5c9fa',accent:'#aa7ed0',glyph:'✦',boss:false},
  {id:'cinder',name:'Cinderkit',kind:'Ember Fox',color:'#f4a06d',accent:'#dd5f54',glyph:'✧',boss:false},
  {id:'bubbun',name:'Bubbun',kind:'River Hopper',color:'#83d7c4',accent:'#438f9d',glyph:'◉',boss:false},
  {id:'mosslet',name:'Mosslet',kind:'Forest Sprout',color:'#95c878',accent:'#507e50',glyph:'❋',boss:false},
  {id:'starling',name:'Starling',kind:'Night Finch',color:'#a9afe8',accent:'#6875bd',glyph:'★',boss:false},
  {id:'craggle',name:'Craggle',kind:'Cave Tortoise',color:'#d1ae91',accent:'#99765f',glyph:'⬟',boss:false},
  {id:'aurora',name:'Aurora Wisp',kind:'Sky Guardian',color:'#91e6d9',accent:'#5c78d5',glyph:'✧',boss:true},
  {id:'crown',name:'Crownjaw',kind:'Crown of the Wilds',color:'#f1c76f',accent:'#d77c55',glyph:'♛',boss:true}
];

export const stages = [
  {id:1,name:'Mossy Trail',jp:'こけむす小道',foe:'mimip',foes:['mimip'],boss:false,scene:'A sunny path winds through the grass.'},
  {id:2,name:'Pebble Brook',jp:'小石のせせらぎ',foe:'pebblet',foes:['pebblet'],boss:false,scene:'A little stream runs between smooth stones.'},
  {id:3,name:'Rainleaf Lane',jp:'雨葉の小径',foe:'puddle',foes:['puddle'],boss:false,scene:'Rain taps softly on the broad leaves.'},
  {id:4,name:'Old Root Garden',jp:'古根の庭',foe:'twiggle',foes:['twiggle','glimmer'],boss:false,scene:'Old roots twist around a quiet garden.'},
  {id:5,name:'Lantern Grove',jp:'ランタンの森',foe:'aurora',foes:['aurora'],boss:true,scene:'Tiny lights glow between the trees.'},
  {id:6,name:'Cinder Hill',jp:'火の粉の丘',foe:'cinder',foes:['cinder'],boss:false,scene:'Warm stones line the hillside.'},
  {id:7,name:'Blue Current',jp:'青流の川',foe:'bubbun',foes:['bubbun'],boss:false,scene:'Clear water rushes under a wooden bridge.'},
  {id:8,name:'Mosslight Woods',jp:'苔明かりの森',foe:'mosslet',foes:['mosslet'],boss:false,scene:'The forest floor shines after the rain.'},
  {id:9,name:'Moonwing Cliffs',jp:'月翼の崖',foe:'starling',foes:['starling','craggle'],boss:false,scene:'The moon hangs above the high cliffs.'},
  {id:10,name:'Crown Summit',jp:'王冠の頂',foe:'crown',foes:['crown'],boss:true,scene:'A bright crown rests at the mountain peak.'}
];

const word = [
 ['borrow','借りる',['貸す','買う','返す'],'Can I borrow your umbrella?'],['crowded','混雑した',['静かな','空いている','遠い'],'The train is crowded this morning.'],['corner','角・曲がり角',['階段','橋','入口'],'Turn left at the next corner.'],['receipt','レシート',['予約','財布','値札'],'Could I get a receipt, please?'],['available','利用できる・空いている',['壊れている','高価な','遅れている'],'Is this seat available?'],['instead','その代わりに',['たとえば','すぐに','一緒に'],'We can take the bus instead.'],['nearly','ほとんど',['めったに','正確に','ゆっくり'],'We are nearly at the station.'],['quietly','静かに',['急いで','注意深く','明るく'],'Please speak quietly in the library.'],['return','返す',['予約する','見つける','選ぶ'],'I need to return this book tomorrow.'],['weather','天気',['道','予定','荷物'],'The weather may change this afternoon.'],['follow','ついて行く',['忘れる','落とす','待つ'],'Follow me and I’ll show you the room.'],['enough','十分な',['特別な','危険な','重たい'],'Is there enough time to catch the train?'],['change','小銭・変更',['切符','出口','案内'],'Do you have change for a thousand-yen note?'],['miss','乗り遅れる',['乗り換える','降りる','見送る'],'Hurry, or we’ll miss the bus.'],['straight','まっすぐに',['反対に','近くに','左に'],'Go straight for two blocks.'],['perhaps','たぶん',['必ず','昨日','一度'],'Perhaps we should ask at the front desk.'],['careful','注意深い',['親切な','便利な','眠い'],'Be careful when you cross the street.'],['carry','運ぶ・持ち歩く',['修理する','探す','借りる'],'Can you carry this bag for a moment?'],['outside','外に',['中に','上に','向こうに'],'Let’s wait outside the entrance.'],['decide','決める',['説明する','到着する','忘れる'],'We need to decide where to eat.']
];
const listening = [
 ['Could you tell me where the bus stop is?','バス停の場所を教えてもらえますか？',['バスの時刻を知りたい','バス停の場所を知りたい','切符を買いたい','バスを降りたい'],'Could you tell me... は場所などを丁寧に尋ねる形。'],
 ['I left my wallet on the train.','財布を電車に置き忘れました。',['財布を電車に置き忘れた','電車の切符をなくした','財布を駅で買った','電車に財布を届けたい'],'left ... on ... は「〜に置き忘れた」。'],
 ['The museum closes in half an hour.','博物館はあと30分で閉まります。',['博物館は30分後に閉まる','博物館は30分遅れて開く','博物館まで30分かかる','博物館は30分だけ開く'],'in half an hour は「30分後」。'],
 ['Would you mind taking a photo of us?','私たちの写真を撮っていただけますか？',['写真を見せてほしい','写真を撮ってほしい','写真を買いたい','写真に写りたくない'],'Would you mind ...? は丁寧な依頼。'],
 ['I’m afraid this seat is taken.','すみません、この席は使用中です。',['席は空いている','席は予約済みで使われている','席を譲ってほしい','席が見つからない'],'is taken は席が使用中ということ。'],
 ['You can pay by card at the counter.','カウンターでカード払いができます。',['入口で現金を払う','カウンターでカード払いできる','カードをカウンターに置く','支払いは外でする'],'pay by card はカードで払う。'],
 ['The elevator is out of order.','エレベーターは故障中です。',['エレベーターは満員','エレベーターは故障中','エレベーターは反対側','エレベーターはすぐ来る'],'out of order は故障中。'],
 ['We’re looking for the north exit.','北口を探しています。',['北口を探している','北へ出発する','出口を閉めたい','南口に行きたい'],'look for は「〜を探す」。'],
 ['There’s a ten-minute delay because of the rain.','雨のため10分遅れています。',['雨で10分早まる','雨で10分遅れている','雨は10分で止む','駅まで10分かかる'],'delay は遅れ。because of は理由を示す。'],
 ['Could we have the bill, please?','お会計をお願いできますか？',['メニューを見たい','お会計をお願いしたい','予約を変更したい','席を移りたい'],'bill はここでは飲食店の会計。'],
 ['I’ll meet you in front of the library.','図書館の前で会いましょう。',['図書館の中で待つ','図書館の前で会う','図書館の隣に住む','図書館から電話する'],'in front of は「〜の前」。'],
 ['This bus doesn’t stop at the airport.','このバスは空港には停まりません。',['空港発のバスだ','空港に停車しない','空港まで直行する','空港で乗り換える'],'doesn’t stop at で停車しないことを伝えている。'],
 ['Could you speak a little more slowly?','もう少しゆっくり話してもらえますか？',['もう少し大きな声で話して','もう少しゆっくり話して','英語で書いて','もう一度電話して'],'a little more slowly は「もう少しゆっくり」。'],
 ['I have a reservation under the name Sato.','佐藤の名前で予約しています。',['佐藤さんを予約した','佐藤の名前で予約している','予約を取り消した','名前を佐藤に変えたい'],'under the name ... はその名前での予約。'],
 ['The pharmacy is across from the post office.','薬局は郵便局の向かいです。',['薬局は郵便局の隣','薬局は郵便局の向かい','郵便局の中に薬局がある','薬局は郵便局の後ろ'],'across from は「〜の向かい」。'],
 ['We have run out of bottled water.','ボトル入りの水を切らしています。',['水が売り切れた','水を持ってきた','水が冷えている','水を注文した'],'run out of は「〜を切らす」。'],
 ['The platform has changed to number three.','乗り場が3番に変更になりました。',['列車が3番線から出た','乗り場が3番に変わった','3番の電車が運休','切符が3枚必要'],'has changed to は変更後の情報。'],
 ['I’m just browsing, thank you.','見ているだけです、ありがとう。',['買うものを決めた','見ているだけ','店を探している','支払いをしたい'],'browsing は店で商品を見て回ること。'],
 ['Please keep your ticket until the end of the trip.','旅の最後まで切符を保管してください。',['切符を今すぐ見せて','旅の最後まで切符を保管','切符を駅で買い直して','切符を捨ててよい'],'until the end は「最後まで」。'],
 ['The trail may be slippery after the rain.','雨のあと、山道は滑りやすいかもしれません。',['山道は閉鎖中','雨のあと山道が滑るかもしれない','雨が降る前に山道へ行く','山道が乾いている'],'may be は可能性を表す。']
];
const phrase = [
 ['I need a table for two.',['I','need','a','table','for','two.'],'2人用のテーブルをお願いします。','I need ... for two. で2人分を頼める。'],
 ['Could you show me the way?',['Could','you','show','me','the','way?'],'道を教えてもらえますか？','Could you ...? で丁寧に頼む。'],
 ['We are waiting for the next train.',['We','are','waiting','for','the','next','train.'],'次の電車を待っています。','wait for のように wait の後は for を使う。'],
 ['She is looking at the map.',['She','is','looking','at','the','map.'],'彼女は地図を見ています。','look at は「〜を見る」。'],
 ['There is a small cafe nearby.',['There','is','a','small','cafe','nearby.'],'近くに小さなカフェがあります。','There is ... で物や場所の存在を伝える。'],
 ['I left my keys in the room.',['I','left','my','keys','in','the','room.'],'部屋に鍵を置き忘れました。','過去の出来事なので leave の過去形 left。'],
 ['Can we sit by the window?',['Can','we','sit','by','the','window?'],'窓際に座れますか？','by the window は窓のそば。'],
 ['The shop opens at nine.',['The','shop','opens','at','nine.'],'その店は9時に開きます。','時刻には前置詞 at を使う。'],
 ['Please take this street to the bridge.',['Please','take','this','street','to','the','bridge.'],'この通りを橋まで進んでください。','take this street は道順で「この通りを進む」。'],
 ['I would like some hot tea.',['I','would','like','some','hot','tea.'],'温かいお茶をいただきたいです。','would like は丁寧な「〜がほしい」。'],
 ['He is carrying two heavy bags.',['He','is','carrying','two','heavy','bags.'],'彼は重いバッグを2つ運んでいます。','進行中の動作は is carrying。'],
 ['We missed the last bus.',['We','missed','the','last','bus.'],'終バスに乗り遅れました。','乗り遅れた過去のことは missed。'],
 ['The hotel is across from the park.',['The','hotel','is','across','from','the','park.'],'ホテルは公園の向かいです。','across from で「〜の向かい」。'],
 ['Could I try a different size?',['Could','I','try','a','different','size?'],'別のサイズを試着できますか？','Could I ...? で自分から丁寧に尋ねる。'],
 ['It might rain later today.',['It','might','rain','later','today.'],'今日はあとで雨が降るかもしれません。','might は確実ではない予測。'],
 ['Let’s meet outside the station.',['Let’s','meet','outside','the','station.'],'駅の外で会いましょう。','Let’s ... で相手に提案する。'],
 ['My phone battery is almost dead.',['My','phone','battery','is','almost','dead.'],'携帯の充電がほとんどありません。','almost dead は残量がほぼないという表現。'],
 ['Please keep the door open.',['Please','keep','the','door','open.'],'ドアを開けたままにしてください。','keep + 目的語 + 形容詞 で状態を保つ。'],
 ['This path leads to the lake.',['This','path','leads','to','the','lake.'],'この小道は湖につながっています。','lead to は「〜につながる」。'],
 ['I think we should ask for help.',['I','think','we','should','ask','for','help.'],'助けを求めた方がいいと思います。','I think ... で自分の考えを柔らかく伝える。']
];
export const questions = [
 ...word.map((x,i)=>({id:`w${i+1}`,type:'word',prompt:`“${x[0]}” に近い意味は？`,target:x[0],meaning:x[1],choices:[x[1],...x[2]],answer:0,example:x[3],tip:`${x[0]} は会話でよく使う語。例文ごと声に出して覚えよう。`})),
 ...listening.map((x,i)=>({id:`l${i+1}`,type:'listen',prompt:'聞こえた英文の用件は？',target:x[0],meaning:x[1],choices:x[2],answer:[1,0,0,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1][i],tip:x[3]})),
 ...phrase.map((x,i)=>({id:`p${i+1}`,type:'phrase',prompt:'単語を並べて、自然な一文を作ろう。',target:x[0],meaning:x[2],tokens:x[1],tip:x[3]}))
];
