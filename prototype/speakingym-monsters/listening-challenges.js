// Authored comprehension checks, keyed to the *heard* line, not the response
// learner is expected to speak. Keep prompts independent of the visible task:
// learners must establish what the other person actually said before replying.
// Choice zero is canonical in the source data; the UI deterministically shuffles.
// Advanced levels have longer, naturally phrased audio, not merely more buttons.
// They retain the base sentence's communicative intent so each meaning check
// remains accurate. Each pair is [normal, hard].
const AUDIO_VARIANTS=Object.freeze({
  'think-trip':['The tour is filling up. Would you like to book it now?', 'We only have a few places left on this tour, and we cannot hold them without a booking. Would you like to reserve a place now, or wait?'],
  'repeat-station':['The last train for the city leaves at ten forty-five tonight.', 'Because of track maintenance, the last train leaves at ten forty-five, fifteen minutes earlier than usual. Please check your platform before boarding.'],
  'agree-work':['Our usual meeting time is no longer available. How about Friday instead?', 'Since the conference room is occupied on Thursday, would you be available to meet on Friday instead of our usual day?'],
  'late-call':['Hi, we have been waiting outside for a few minutes. Are you almost here?', 'We are standing by the main entrance, and everyone else has arrived. Are you nearly here, or should we start without you?'],
  'clarify-office':['Please send me the updated file before lunch today.', 'I need to review the final figures this afternoon, so could you send the updated file before lunch rather than at the end of the day?'],
  'prefer-friend':['We could take the bus, but the train is also running. Which would you prefer?', 'There is a bus in ten minutes or a train leaving just after that. Should we take the bus or the train? I am happy with either.'],
  'help-phone':['You look a bit worried. Is everything all right?', 'I noticed you have been standing here looking at your phone for a while. Is everything okay, or is there something wrong?'],
  'help-ticket':['The ticket machine can be confusing. Do you need any assistance?', 'I can see you are having some trouble with the machine. Would you like some assistance, or have you managed to work it out?'],
  'order-coffee':['Welcome to the café. What can I get you this morning?', 'We have a few new iced drinks today as well as our regular coffee menu. Take your time, and let me know what I can get you.'],
  'order-breakfast':['Your breakfast comes with a drink. Would you like something to drink?', 'While the kitchen prepares your breakfast, could I bring you something to drink, perhaps tea, coffee, or some juice?'],
  'direction-station':['Excuse me, you look a little lost. Are you looking for something?', 'I noticed you have been checking the street signs for a while. Are you looking for a particular place, or do you already know where to go?'],
  'direction-museum':['Welcome to the visitor center. How can I help you today?', 'Good morning, and welcome to the city information desk. Are you after directions, or is there something else I can help you with today?'],
  'recommend-food':['The kitchen is ready whenever you are. Would you like to order now?', 'Our lunch special is still available, but the kitchen will close in about forty minutes. Would you like to order now, or do you need more time?'],
  'recommend-gift':['Are you looking for a gift for someone, or just browsing?', 'We have some local handmade items on display this week. Are you looking for a gift for somebody, or are you shopping for yourself?'],
  'booking-table':['Good evening. Do you have a reservation for tonight?', 'Before I show you to a table, may I check whether you already have a reservation? We are fairly busy after seven this evening.'],
  'booking-tour':['We are running a guided tour tomorrow. Would you like to join?', 'Tomorrow morning we have a small guided walking tour, and a few places are still available. Would you like to join us?'],
  'apology-late':['I got here quite a while ago, and I have been waiting for you.', 'I arrived at the station twenty minutes ago, and I have been standing near the ticket gate waiting for you ever since.'],
  'apology-email':['I sent you a message earlier this week. Did you get my last email?', 'I emailed you on Monday with the updated schedule, but I have not heard back yet. Did you receive my last email?'],
  'decline-dinner':['We are getting together tonight. Are you coming to dinner?', 'A few of us are meeting for dinner at the new restaurant tonight. Are you planning to join us, or do you already have something on?'],
  'decline-purchase':['This is our most popular item. Would you like to buy it today?', 'We still have your size in stock, and the discount ends this evening. Would you like to purchase it today or keep looking?'],
  'price-ticket':['Just to confirm, would that be one ticket?', 'Before I take your payment, could I confirm that you are buying one admission ticket rather than a pair?'],
  'price-rental':['How many days will you need the rental car for?', 'We can arrange a short rental or a weekly booking. How many days do you think you will need the car for?'],
  'change-time':['I have you down for two o’clock. Does that time still work?', 'We are scheduled to meet at two this afternoon. Does two o’clock still suit you, or have your plans changed?'],
  'change-seat':['I have finished checking your boarding pass. Do you need anything else?', 'Your boarding pass is ready and your baggage is checked in. Before you go through security, is there anything else you need?'],
  'problem-wifi':['Good afternoon. Is everything okay with your hotel room?', 'I hope your stay is going well so far. Is everything all right with your room, or is there something we can help with?'],
  'problem-bill':['Here is your invoice. Does everything look correct on the bill?', 'I have printed the itemized invoice for your stay, including breakfast and room charges. Could you check whether everything on the bill is correct?'],
  'problem-train':['Good morning. Can I help you with your journey today?', 'Welcome to the information counter. Are you having trouble planning your journey, or is there anything else I can assist you with?']
});
const CHECKS = Object.freeze({
  'think-trip': [
    ['今ツアーを予約するか聞かれた','ツアーをキャンセルするか聞かれた','ツアーの集合場所を聞かれた'],
    ['They ask whether to reserve the tour now.','They ask whether to cancel the tour.','They ask where the tour meets.','They say the tour has already been booked.']
  ],
  'repeat-station': [
    ['最終列車は10時45分発だ','最終列車は9時45分発だ','次の列車は10時45分発だ'],
    ['The last train departs at 10:45.','The last train departs at 9:45.','The next train departs at 10:45.','The station closes at 10:45.']
  ],
  'agree-work': [
    ['金曜日に会議を変更する提案だ','金曜日の会議を中止する連絡だ','金曜日以外にしたいという提案だ'],
    ['They suggest meeting on Friday instead.','They confirm that Friday is canceled.','They reject meeting on Friday.','They say the meeting was already moved to Thursday.']
  ],
  'late-call': [
    ['もうすぐ到着するか聞かれた','あと何分で出発するか聞かれた','すでに到着したか確認された'],
    ['They ask whether you are nearly there.','They ask when you will leave.','They ask whether you arrived earlier.','They say they will be late.']
  ],
  'clarify-office': [
    ['昼食前に書類を送ってほしい','昼食後に書類を送ってほしい','昼食前に書類を受け取りたい'],
    ['They want the file sent before lunch.','They want the file sent after lunch.','They want to receive a file from you tomorrow.','They say the file has already been sent.']
  ],
  'prefer-friend': [
    ['バスと電車のどちらにするか聞かれた','バスが何時に来るか聞かれた','電車の切符を持っているか聞かれた'],
    ['They ask you to choose between the bus and train.','They ask when the bus arrives.','They ask if you already have a train ticket.','They say the bus is faster than the train.']
  ],
  'help-phone': [
    ['大丈夫かどうか気遣われた','携帯電話を持っているか聞かれた','助けが不要か確認された'],
    ['They ask if everything is okay.','They ask whether your phone works.','They ask whether you can help them.','They say there is nothing to worry about.']
  ],
  'help-ticket': [
    ['何か手伝いが必要か聞かれた','切符をすでに買ったか聞かれた','手伝いは不要だと言われた'],
    ['They offer assistance.','They ask if you have already bought a ticket.','They refuse to help.','They ask which train leaves next.']
  ],
  'order-coffee': [
    ['注文を聞かれた','注文を取り消すか聞かれた','注文した商品が届いたと言われた'],
    ['They ask what you would like to order.','They ask if you want to cancel.','They say your order is ready.','They ask whether you have paid already.']
  ],
  'order-breakfast': [
    ['何か飲み物が欲しいか聞かれた','朝食を追加するか聞かれた','飲み物をすでに頼んだか聞かれた'],
    ['They offer you something to drink.','They offer an extra breakfast.','They ask whether you ordered drinks earlier.','They say drinks are not included.']
  ],
  'direction-station': [
    ['何かを探しているか聞かれた','ここで待つように言われた','道に迷ったと言われた'],
    ['They ask whether you are looking for something.','They ask you to wait here.','They say they have lost their way.','They give directions without being asked.']
  ],
  'direction-museum': [
    ['何を手伝えるか聞かれた','どこに行ったか聞かれた','今日は営業していないと言われた'],
    ['They ask how they can help you.','They ask where you went earlier.','They say the museum is closed today.','They ask you to return tomorrow.']
  ],
  'recommend-food': [
    ['今注文するか聞かれた','料理が美味しかったか聞かれた','おすすめを決めたと言われた'],
    ['They ask if you are ready to order.','They ask whether you enjoyed your meal.','They say a recommended dish is sold out.','They tell you the kitchen is closing.']
  ],
  'recommend-gift': [
    ['贈り物を探しているか聞かれた','贈り物を包むか聞かれた','贈り物を渡したか聞かれた'],
    ['They ask if you are shopping for a gift.','They ask if you want gift wrapping.','They ask whether you gave someone a gift.','They offer to deliver the gift later.']
  ],
  'booking-table': [
    ['予約しているか聞かれた','これから予約するか聞かれた','予約を変更するか聞かれた'],
    ['They ask whether you already have a reservation.','They ask whether you want to make a reservation now.','They ask to change an existing booking.','They say your reservation has been canceled.']
  ],
  'booking-tour': [
    ['明日のツアーに参加したいか聞かれた','今日のツアーに参加したか聞かれた','明日のツアーが中止だと言われた'],
    ['They ask if you want to join tomorrow\'s tour.','They ask whether you joined today\'s tour.','They say tomorrow\'s tour was canceled.','They say there are no spaces tomorrow.']
  ],
  'apology-late': [
    ['待っていたと言われた','これから待つと言われた','もう待てないと言われた'],
    ['They say they have been waiting for you.','They say they will wait for you later.','They say they cannot wait any longer.','They say they arrived after you.']
  ],
  'apology-email': [
    ['前に送ったメールを受け取ったか聞かれた','メールをいつ送るか聞かれた','最後のメールを削除したと言われた'],
    ['They ask if you received their previous email.','They ask when you will send an email.','They say their last email was deleted.','They ask you not to reply to their previous email.']
  ],
  'decline-dinner': [
    ['今夜の夕食に来るか聞かれた','明日の朝食に来るか聞かれた','夕食を作るか聞かれた'],
    ['They ask if you are coming to dinner tonight.','They ask about breakfast tomorrow.','They ask whether you will cook dinner.','They say dinner has been moved to tomorrow.']
  ],
  'decline-purchase': [
    ['今日それを買うか聞かれた','今日それを返品するか聞かれた','今日もう買ったか聞かれた'],
    ['They ask if you would like to buy it today.','They ask if you want to return it today.','They ask if you bought it earlier today.','They say the item cannot be purchased today.']
  ],
  'price-ticket': [
    ['切符を1枚買うか確認された','切符を2枚買うか確認された','切符を1枚持っているか確認された'],
    ['They check whether you want one ticket.','They ask whether you want two tickets.','They check whether you already own a ticket.','They say only one ticket is left.']
  ],
  'price-rental': [
    ['何日間必要か聞かれた','何日間借りたか聞かれた','何日間待てるか聞かれた'],
    ['They ask how many days you need it for.','They ask how many days you already rented it.','They ask how long you can wait.','They say rentals are limited to one day.']
  ],
  'change-time': [
    ['2時の予定のままで大丈夫か聞かれた','2時に変更したいと言われた','2時の予定を取り消すか聞かれた'],
    ['They ask whether two o\'clock still suits you.','They suggest changing the time to two.','They ask if you canceled the two o\'clock meeting.','They confirm the meeting has already moved to three.']
  ],
  'change-seat': [
    ['ほかに必要なものがあるか聞かれた','席を変えたいか聞かれた','すべて終わったか聞かれた'],
    ['They ask if you need anything else.','They ask if you want to change seats.','They ask whether everything is finished.','They say no more changes are possible.']
  ],
  'problem-wifi': [
    ['部屋に問題がないか聞かれた','部屋を変更したいか聞かれた','部屋は準備できていると言われた'],
    ['They ask whether everything is okay with your room.','They ask if you would like to change rooms.','They say your room is ready.','They ask if your Wi-Fi password works.']
  ],
  'problem-bill': [
    ['請求書の内容が正しいか聞かれた','請求書を受け取ったか聞かれた','請求書を修正したと言われた'],
    ['They ask if your bill is correct.','They ask if you received your bill.','They say your bill has been corrected.','They ask whether you want to pay later.']
  ],
  'problem-train': [
    ['移動について手伝えるか聞かれた','旅行は順調か聞かれた','別の列車に乗るように言われた'],
    ['They ask if they can help with your journey.','They ask whether your trip went well.','They tell you to take another train.','They ask whether you have booked your return journey.']
  ]
});

const BASE_ID=id=>id.replace(/-(normal|hard)$/,'');
function orderChoices(id,length){
  const seed=[...id].reduce((total,char)=>total+char.charCodeAt(0),0);
  const correctIndex=seed%length;
  // The distractors rotate too; all three/four buttons are genuine choices.
  return Array.from({length},(_,i)=>(i-correctIndex+length)%length);
}
export function listeningChallengeFor(prompt){
  if(prompt.kind!=='listen')return null;
  const authored=CHECKS[BASE_ID(prompt.id)];
  if(!authored)throw Error('Listening meaning check missing: '+prompt.id);
  const level=prompt.difficulty||'easy';
  const source=level==='easy'?authored[0]:authored[1];
  const count=level==='hard'?4:3;
  const permutation=orderChoices(prompt.id,count);
  const advancedAudio=AUDIO_VARIANTS[BASE_ID(prompt.id)];
  return Object.freeze({
    level,
    question:level==='easy'?'相手は何を伝えた？':level==='normal'?'What did the speaker mean?':'Which interpretation is the most precise?',
    options:permutation.map(i=>source[i]),
    correctIndex:permutation.indexOf(0),
    // No task, response, or spoken English is exposed before the audio check.
    audio:level==='easy'?prompt.audio:advancedAudio?.[level==='normal'?0:1]||prompt.audio
  });
}
