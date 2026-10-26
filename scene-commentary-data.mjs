const p=(id)=>`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1280&h=800&q=82`;
const photo=(id,source,creator,alt,title,task,examples,tip,levelTasks)=>({id,image:p(id),source,creator,alt,title,task,examples,tip,levelTasks});
const U='https://unsplash.com/license';
export const SCENE_PHOTO_LICENSE=U;
export const SCENE_COMMENTARY_LEVELS={
 1:{label:'描写',description:'見えている人・物・動きを、2つ以上伝えてみよう。',goal:'見えている人・物・動きを2つ、短い文で伝える'},
 2:{label:'推測',description:'今の状況を説明し、理由は maybe / might で控えめに推測しよう。',goal:'状況を説明し、理由は maybe や might で控えめに推測する'},
 3:{label:'共有',description:'友人に現場を伝えるつもりで、役立ちそうな情報も添えよう。',goal:'友人へ現場の様子と、次に役立つ情報を伝える'}
};
// These are learning models, never expected answers. There is deliberately no
// text-match or speech-quality scoring for open-ended scene descriptions.
export const SCENE_COMMENTARY_PHOTOS=[
 photo('1583121358977-98c0a70698b7','https://unsplash.com/photos/people-walking-on-train-station-q0I4tUTyXoY','Osman Rana','A dimly lit railway platform with a train and a person waiting.','夜の駅のホーム','夜の駅で、人や電車の様子を見つけてみよう。',[
  'A train is at the platform, and one person is waiting.',
  'The platform looks quiet. Maybe the train has just arrived.',
  'I am at a quiet station. A train is here, so I will check the signs before boarding.'
 ],'There is / There are で場所にあるものを先に言うと、説明を始めやすくなります。',['電車や人、ホームの様子を見つけて言う','静かなホームの様子から理由を控えめに推測する','友人に駅の状況と乗車前に見るものを伝える']),
 photo('1740934295901-6c6f92f644b1','https://unsplash.com/photos/a-train-station-with-people-walking-on-the-platform-8pvVv2ZAs48','Ilker Ozmen','A person walking along a wet railway platform.','雨上がりのホーム','ホームにいる人と、床や周りの様子を伝えてみよう。',[
  'A person is walking along the platform. The ground is wet.',
  'It may have rained recently, and the station is almost empty.',
  'I am at the station now. The platform is wet, so please watch your step.'
 ],'見たことは現在進行形、理由の推測は may have で分けて伝えられます。',['人・場所・状態を2つ言う','雨が降った可能性を控えめに推測する','友人に足元への注意を伝える']),
 photo('1736777800731-eb7ef4ebcc67','https://unsplash.com/photos/a-train-station-with-a-few-people-waiting-for-the-train-GGk4IOoAaW0','Unsplash contributor','A subway train stopped at an underground station.','地下鉄のホーム','電車とホームの特徴を見つけて伝えよう。',[
  'A subway train is stopped at the station.',
  'The train may be waiting for passengers to get on.',
  'This is an underground station. The train is here, so we can get on now.'
 ],'at the station は駅にいる、on the train は電車に乗っている、のように前置詞で位置が変わります。',['電車やホームの特徴を見つけて言う','電車が止まっている理由を推測する','友人に今すぐ乗れる状況を伝える']),
 photo('1747612429938-31abcd916684','https://unsplash.com/photos/people-wait-at-a-train-station-CoViWp7to1c','Kazuo Ota','Several passengers are standing and waiting on a train platform.','電車を待つ乗客','乗客が何をしているか、見える範囲で話そう。',[
  'Several people are waiting on the platform.',
  'They might be waiting for the next train.',
  'There are several people waiting here. We should stand behind the line.'
 ],'人数が正確に分からないときは several や a few が便利です。',['乗客の動きやホームの様子を言う','次の電車を待っていそうな状況を推測する','友人に安全な待ち方を伝える']),
 photo('1592613811268-efd0d6199bab','https://unsplash.com/photos/people-in-a-train-station-bk3KSkPa6Do','Isai Ramos','Passengers are walking through a subway station near a train.','駅を行き交う人','人の流れや駅の中の様子を説明してみよう。',[
  'People are walking through a subway station.',
  'It looks busy, so some passengers may be changing trains.',
  'The station is busy right now. Let us follow the signs to find our exit.'
 ],'It looks busy のように見た印象を添えると、断定しすぎず自然です。',['人の動きと場所を言う','混雑の理由をmayで推測する','友人に案内表示を確認しようと伝える']),
 photo('1778940517363-ddf1e954cfc8','https://unsplash.com/photos/people-are-dining-in-a-busy-stylish-restaurant-gWNU6BpD1Gw','ANNIE HATUANH','People are sitting at tables and eating in a bright restaurant.','にぎやかなレストラン','食事をする人と店内の様子を見つけよう。',[
  'People are eating together at several tables.',
  'The restaurant seems busy, but people are enjoying their meals.',
  'This restaurant is lively. We may need to wait for a table.'
 ],'seem を使うと、写真から感じたことを事実と分けて伝えられます。',['人と食事の様子を2つ言う','店が混んでいる状況を控えめに推測する','友人に待ち時間の可能性を伝える']),
 photo('1742134516280-d62ad935b951','https://unsplash.com/photos/people-enjoying-a-meal-at-a-restaurant-tuSWVzA4kEg','Ben Iwara','A diner is having a meal at a restaurant table.','食事中のひと','人が食べている様子と、テーブルの様子を話そう。',[
  'A person is having a meal at a restaurant.',
  'They might be enjoying a quiet lunch by themselves.',
  'Someone is having lunch here. We can ask the staff if this seat is free.'
 ],'by themselves は「ひとりで」。alone より会話で柔らかく響くことがあります。',['人と食事を説明する','ひとりで食事中かもしれないと推測する','席が空いているか尋ねる提案をする']),
 photo('1707334724033-e997675f8c10','https://unsplash.com/photos/a-group-of-people-sitting-at-a-table-in-a-restaurant-xybK6i18C7w','Maria Moroz','A few people are talking around a restaurant table.','テーブルを囲む人たち','人の配置や会話の様子を伝えてみよう。',[
  'A few people are sitting around a table.',
  'They seem to be having a conversation over dinner.',
  'Our friends are already at the table. Let us join them.'
 ],'around the table は「テーブルを囲んで」。位置関係を簡単に表せます。',['人の数と位置を言う','夕食中の会話かもしれないと推測する','友人に合流しようと伝える']),
 photo('1767510533362-4d5dbdaaf8c7','https://unsplash.com/photos/people-dining-at-tables-in-a-dimly-lit-restaurant-TlScs8TkNG4','Madeline Liu','Guests are dining in a warmly lit restaurant.','灯りの落ち着いた店','店内の明るさと食事の様子を言葉にしよう。',[
  'People are having dinner in a warm, dim room.',
  'It could be a special occasion because the room feels elegant.',
  'The restaurant has a quiet atmosphere. It might be a nice place for a celebration.'
 ],'atmosphere は店や場所の「雰囲気」をまとめて説明する語です。',['明るさと人の様子を言う','特別な食事かもしれないと推測する','友人に店の雰囲気と用途を説明する']),
 photo('1784462359407-b221e84a3420','https://unsplash.com/photos/three-people-dining-in-a-restaurant-with-a-city-view-YrOGOZVh4ak','tommao wang','People are seated by a large window overlooking the city.','街を眺める食事の席','窓の外と席の位置に注目して説明しよう。',[
  'People are sitting by a window with a city view.',
  'They may have chosen this table for the view.',
  'We have a table by the window. You can see the city from here.'
 ],'by the window は窓のそば。席の場所を伝えると待ち合わせにも役立ちます。',['人と窓の位置を言う','景色を選んだのかもしれないと推測する','友人に席と見える景色を伝える']),
 photo('1770010314050-c88979e98e1c','https://unsplash.com/photos/people-with-luggage-in-a-modern-airport-terminal-YxuI5Gax5JU','Fabio Sasso','Travelers are moving through a large airport terminal with luggage.','空港を移動する旅行者','荷物を持つ人と広い空港の様子を説明しよう。',[
  'Travelers are walking through a large airport.',
  'Some people may be looking for their departure gates.',
  'We are in the airport terminal. Let us check the screens for our gate.'
 ],'gate は空港の搭乗口。gate number と言えば番号も確認できます。',['旅行者と荷物の様子を言う','搭乗口を探しているかもしれないと推測する','友人に出発案内を確認しようと伝える']),
 photo('1768967645513-ee6aa33c9ffb','https://unsplash.com/photos/people-waiting-in-a-modern-airport-terminal-GbY1IcKPvS0','You Le','Passengers are waiting inside a bright airport terminal.','空港で待つ人々','座っている人や空港の設備を見つけてみよう。',[
  'Passengers are waiting in an airport terminal.',
  'They might be waiting for boarding to begin.',
  'People are waiting near the gate. We should stay close and listen for announcements.'
 ],'near the gate は搭乗口の近く。near で場所をざっくり伝えられます。',['人と場所を説明する','搭乗を待っていそうだと推測する','友人に近くで待つ理由を伝える']),
 photo('1767710096520-9246565a9d31','https://unsplash.com/photos/people-with-luggage-in-a-modern-airport-terminal-s7o9S4RtYHc','CK Chen','Travelers with suitcases are crossing a terminal hall.','スーツケースと空港','旅行者の持ち物と移動方向を話そう。',[
  'Several travelers are walking with suitcases.',
  'They may be arriving after a long flight.',
  'People are coming through the terminal with their bags. The exit is that way.'
 ],'with a suitcase は「スーツケースを持って」。持ち物は with で足せます。',['旅行者と荷物の様子を言う','到着したのかもしれないと推測する','出口の方向を友人に伝える']),
 photo('1790579926072-2040b7bb1941','https://unsplash.com/photos/travelers-in-spacious-airport-terminal-RxwIZFnPhgA','Unsplash contributor','A spacious airport hall with people walking beneath a high ceiling.','広い空港ロビー','天井や人の大きさから、空間の広さを伝えよう。',[
  'The airport hall is large, and people are walking across it.',
  'It looks like a major airport because the hall is so spacious.',
  'We are in a large terminal. It may take a few minutes to reach our gate.'
 ],'It may take ... to ... で、何かにかかりそうな時間を自然に伝えられます。',['空間と人の様子を言う','大きな空港かもしれないと推測する','搭乗口までの距離を友人に伝える']),
 photo('1768185621013-5e42455a8e9f','https://unsplash.com/photos/a-bustling-street-market-at-night-with-shops-and-people-RNwI52EZwRo','MChe Lee','People are walking through a crowded market street at night.','夜のマーケット','人の多さや店の灯りなど、気付いたことを話そう。',[
  'People are walking past many shops at night.',
  'The market seems lively, and some people may be shopping for food.',
  'This street is crowded with shops. We can look around, but let us keep an eye on our bags.'
 ],'crowded with は「〜で混み合っている」。人以外にも使えます。',['人と店の様子を言う','マーケットの雰囲気を推測する','友人に安全に見て回る提案をする']),
 photo('1768199455274-16a9e15946f5','https://unsplash.com/photos/busy-street-market-with-people-and-stalls-cB3kHShOLsk','Kenneth Li','People are walking between shops on a busy city street.','店が並ぶ街の通り','歩く人と通りの店の様子を説明してみよう。',[
  'People are walking along a busy street with shops.',
  'Some shoppers might be looking for a place to eat.',
  'This street is busy. There are shops on both sides, so we can explore on foot.'
 ],'on both sides は「両側に」。通り沿いの建物を説明するときに便利です。',['人と店の位置を伝える','買い物や食事を探していそうだと推測する','友人に歩いて見て回れると伝える']),
 photo('1770045232579-74560a25324a','https://unsplash.com/photos/bustling-street-market-with-people-and-vehicles-4bOlZXGebjI','JC Gellidon','Shoppers and vehicles are sharing a crowded street market.','車も通る市場','買い物客と車の両方がいる様子を伝えよう。',[
  'People are shopping while vehicles pass by.',
  'The street may be closed to cars only at certain times.',
  'There is traffic near the market. Let us wait before crossing.'
 ],'while を使うと、同時に起きている2つの動作を短く結べます。',['人と車の動きを言う','道路の使われ方を控えめに推測する','友人に渡る前の注意を伝える']),
 photo('1770530082725-573219d28b28','https://unsplash.com/photos/people-walk-down-a-narrow-asian-street-market-wzEKNap9zH0','Alex Safareli','Shoppers move through a narrow market street lined with signs.','看板が並ぶ細い市場','道幅や店の並びに注目して話してみよう。',[
  'The street is narrow, and there are shops on both sides.',
  'It may be a popular shopping area because so many people are there.',
  'This lane is narrow and busy. Let us stay together while we walk through.'
 ],'stay together は「一緒に行動する」。混んだ場所での一言にも使えます。',['道と店の様子を言う','人気がありそうだと理由を添える','友人に一緒に歩こうと伝える']),
 photo('1775315815915-43af175d4c95','https://unsplash.com/photos/crowded-street-market-at-night-with-stalls-and-signs-nzFw2jMSPvE','Unsplash contributor','A busy night market with stalls, lights, and pedestrians.','灯りの多い夜市','明るい屋台と人の動きを見つけよう。',[
  'The market is busy, and the stalls are brightly lit.',
  'People might be stopping to buy snacks.',
  'We are at a night market. The food stalls are easy to spot from here.'
 ],'stalls は市場やイベントの「屋台・売り場」。shops との使い分けを覚えよう。',['屋台と人の様子を言う','買い物をしていそうだと推測する','友人に屋台を見つけやすいと伝える']),
 photo('1752650143544-81a9f60fbe5c','https://unsplash.com/photos/two-women-are-sightseeing-with-a-map-and-camera-eTSAD_dptMA','Unsplash contributor','Two travelers are looking at a map and pointing toward a landmark.','地図を見ながら観光','地図やカメラを使う人の動きを伝えよう。',[
  'Two travelers are looking at a map and pointing toward a landmark.',
  'They may be deciding which place to visit next.',
  'These travelers are checking their map. We can ask if they need directions.'
 ],'decide which ... は「どの〜にするか決める」。選択の途中を説明できます。',['人と持ち物を説明する','次の行き先を決めていそうだと推測する','道に迷った人へ声をかける提案をする']),
 photo('1792747212345-9f852cf832a3','https://unsplash.com/photos/delivery-person-passing-people-under-trees-mJcg6Z9XgOQ','Kris Tian','A delivery rider on a motorcycle passes people standing under trees.','人のそばを通る配達員','乗り物と歩行者の位置関係を見て話そう。',[
  'A delivery rider is passing a group of people on a motorcycle.',
  'The people might be waiting for someone under the trees.',
  'A rider is going past the group. We should give them room to pass.'
 ],'go past / pass は「そばを通り過ぎる」。人と乗り物の動きを表せます。',['乗り物と人の動きを言う','人が待っていそうだと推測する','通行のため場所を空けようと伝える']),
 photo('1752650143291-a049c42b15f2','https://unsplash.com/photos/two-women-use-a-map-to-find-directions-Uwb_q2fDlyY','Vitaly Gariev','Two friends are looking at a map together on a city street.','街角で地図を確認','地図を見る人たちと、周りの場所を説明しよう。',[
  'Two friends are checking a map on the street.',
  'They might be trying to find a nearby place.',
  'They are looking for a location. We could ask where they want to go.'
 ],'nearby は「近くの」。目的地が分からないときにも自然に使えます。',['人数と動作を言う','近くの場所を探していそうだと推測する','行き先を尋ねる提案をする']),
 photo('1762907559039-1373f553c987','https://unsplash.com/photos/woman-with-umbrella-walks-down-rainy-city-street-IkZ__XhtAyI','Y.A','A pedestrian walks along a wet street under an umbrella.','傘をさして歩く人','傘や路面から、天気と人の様子を伝えよう。',[
  'A person is walking with an umbrella on a wet street.',
  'It may be raining, so people are taking shelter under umbrellas.',
  'The street is wet and people have umbrellas. We should bring one if we go out.'
 ],'take shelter from the rain は「雨を避ける」。shelter は名詞でも動詞でも使えます。',['傘や路面の様子を言う','雨が降った可能性を控えめに推測する','友人に傘を持っていこうと勧める']),
 photo('1769784496924-dd5a8e08e8f3','https://unsplash.com/photos/two-people-walk-with-umbrellas-on-a-rainy-city-street-WtvfDmEqoNM','Tobias Reich','Two pedestrians are walking beneath umbrellas on a rainy city street.','雨の夜道を歩く人','雨の中を歩く人と、道の様子を説明しよう。',[
  'Two people are walking with umbrellas at night.',
  'The reflections on the street suggest that it has been raining.',
  'It is a rainy evening. The road is shiny, so we should walk carefully.'
 ],'suggest は「〜を示唆する」。見た目を根拠に推測するときに使えます。',['人と傘の様子を言う','路面の反射から雨を推測する','友人に歩くときの注意を伝える']),
 photo('1716881755661-8fb2e3158762','https://unsplash.com/photos/a-couple-of-people-walking-across-a-street-holding-an-umbrella-eAP2LzpyFrE','ZHENYU LUO','People are crossing a city street under an umbrella.','傘の下で横断する人','道を渡る人と、周りの天気を話そう。',[
  'People are crossing the street under an umbrella.',
  'The weather may have changed suddenly.',
  'People are crossing in the rain. Let us wait for the light before we cross.'
 ],'cross the street は「道を渡る」。walk across とも言えます。',['傘と横断の動きを言う','天気が変わった状況を推測する','信号を待とうと友人に伝える']),
 photo('1770926502896-98054fbd6f3f','https://unsplash.com/photos/three-people-walk-in-the-rain-under-umbrellas-ohn--vPUSlk','atelierbyvineeth','Three people walk along a city street carrying umbrellas.','雨の中の通勤風景','何人かが同じ天気に対応する様子を説明しよう。',[
  'Several people are walking with umbrellas.',
  'They may be commuting home in the rain.',
  'It is raining, and people are heading somewhere. We should take an umbrella too.'
 ],'head somewhere は「どこかへ向かう」。destination が不明でも使えます。',['人と傘の様子を言う','帰宅中かもしれないと推測する','自分たちも傘を持とうと提案する']),
 photo('1743138058185-446e2ac989d0','https://unsplash.com/photos/people-are-shopping-at-a-crowded-market-UYGcvme1yoM','KC Shum','Shoppers are browsing food and goods at a crowded market.','買い物客でにぎわう市場','何が売られ、買い物客がどうしているか言おう。',[
  'People are looking at goods in a crowded market.',
  'Some shoppers may be comparing prices before buying.',
  'This market is crowded. We can look around first and decide what to buy.'
 ],'look around は「見て回る」。買う前に店を見て回る場面で便利です。',['買い物客と売り場を言う','値段を比べていそうだと推測する','まず見て回る提案をする']),
 photo('1739193936578-729d5689e02c','https://unsplash.com/photos/a-group-of-people-standing-in-front-of-a-store-03JlXoxcMjE','Kelvin Zyteng','People are gathered in front of a fresh produce shop.','青果店の前の人たち','店先の人や商品に気付いたことを説明しよう。',[
  'People are standing in front of a shop with fresh produce.',
  'They may be choosing fruit and vegetables to buy.',
  'There is a produce shop here. We can pick up some fruit before we leave.'
 ],'produce は店では「農産物・青果」。商品をまとめて説明する言葉です。',['人と店先の商品を言う','買うものを選んでいそうだと推測する','出発前に果物を買う提案をする']),
 photo('1752650143453-72cd5c2361a9','https://unsplash.com/photos/two-friends-explore-the-city-with-a-camera-c1hKzL8OIVI','Vitaly Gariev','One traveler is pointing while another takes a photo.','写真を撮る観光客','写真を撮る人と指さす人の動きを説明しよう。',[
  'One traveler is pointing while another is taking a photo.',
  'They might be trying to capture a landmark in the background.',
  'One person is taking a picture. I can step aside so they can get a clear view.'
 ],'while の後ろも現在進行形にすると、同時に進む動きを自然につなげられます。',['二人の動作を言う','背景の名所を撮ろうとしていると推測する','撮影の邪魔にならないようにすると伝える']),
 photo('1788465165582-4c635f5d1ac8','https://unsplash.com/photos/shoppers-in-covered-market-arcade-iecfqpelsgE','Barney Goodman','Shoppers are walking through a covered market decorated with colorful bunting.','飾りのある商店街','通りの飾りと、歩く人の様子を見つけよう。',[
  'People are walking through a covered market with colorful decorations.',
  'It could be a festival day because the street is decorated.',
  'The market is decorated with colorful flags. It looks like a fun place to explore.'
 ],'It looks like ... は「〜のように見える」。理由の断定を避けて伝えられます。',['通りと飾り、人の動きを言う','祭りの日かもしれないと推測する','友人に市場の雰囲気を伝える'])
];
if(SCENE_COMMENTARY_PHOTOS.length!==30)throw new Error('Scene Commentary needs exactly 30 photos');
if(new Set(SCENE_COMMENTARY_PHOTOS.map(s=>s.id)).size!==30)throw new Error('Scene photo IDs must be unique');
