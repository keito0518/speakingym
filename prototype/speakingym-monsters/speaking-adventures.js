// Eight extra conversation situations, authored at three genuinely different
// difficulty levels. Spoken responses are checked only against human-reviewed
// examples; unknown natural paraphrases remain review, not "wrong".
// Each scene is a distinct speaking context for existing useful expressions.
const SCENES=Object.freeze([
  {
    id:'help-locker',phraseId:'help',
    easy:{
      scene:'駅のコインロッカー',
      cue:'駅のロッカーが開けられない。駅員に手伝ってもらおう。',
      task:'ロッカーを開ける手伝いをお願いしよう。',
      answer:'Could you help me open this locker?',
      alternatives:['Can you help me open my locker?'],
      hint:'Could you help me ...?',
      tip:'何を手伝ってほしいかを、help me の後に動詞で伝える。'
    },
    normal:{
      scene:'A locker at the station',
      cue:'Your station locker will not open, and a staff member is nearby.',
      task:'Ask the staff member to help you open the locker.',
      answer:'Could you help me open my locker, please?',
      alternatives:['Can you help me get my locker open?'],
      hint:'Could you help me ...?',
      tip:'Name the specific problem so the person knows what help you need.'
    },
    hard:{
      scene:'Locked luggage before a train',
      cue:'You paid for a station locker, but it will not open. Your suitcase is inside, and your train leaves in fifteen minutes.',
      task:'Explain the payment, the stuck locker and the time pressure. Ask for help.',
      answer:"I paid for this locker, but it won't open and my suitcase is inside. Could you help me? My train leaves in fifteen minutes.",
      alternatives:["I have already paid, but the locker is stuck with my suitcase inside. Can you help? My train leaves in 15 minutes."],
      hint:"I paid ... but ... Could you ...? My train ...",
      tip:'A clear problem, urgency, and polite request make it easier to get useful help.'
    }
  },
  {
    id:'think-phone',phraseId:'think',
    easy:{
      scene:'携帯電話のお店',
      cue:'店員からプランをすすめられた。少し考えたい。',
      task:'今すぐ決めずに考える時間をもらおう。',
      answer:'Can I have a moment to think?',
      alternatives:['Could you give me a minute to decide?'],
      hint:'Can I have ...?',
      tip:'即決せずに比較したいときは、考える時間をもらってよい。'
    },
    normal:{
      scene:'Comparing phone plans',
      cue:'The assistant offers a new phone plan, but you need to compare the monthly fees at home.',
      task:'Explain you need more time and will decide tonight.',
      answer:"I need some time to compare the monthly fees. I'll decide tonight.",
      alternatives:["Let me compare the prices first. I can give you an answer tonight."],
      hint:'I need ... I will ... tonight.',
      tip:'Give a practical reason and a clear time for your decision.'
    },
    hard:{
      scene:'Checking a phone contract',
      cue:'The advertised monthly price looks low, but you do not know the cancellation fee. You can decide tomorrow after comparing alternatives.',
      task:'Ask about the cancellation fee, explain you will compare plans, and promise an answer tomorrow.',
      answer:"Before I decide, could you explain the cancellation fee? I'd like to compare other plans, and I'll let you know tomorrow.",
      alternatives:["Could you tell me the cancellation fee? I need to compare a few plans before deciding, so I'll get back to you tomorrow."],
      hint:'Could you explain ...? I need to ... tomorrow.',
      tip:'A specific question plus a follow-up date helps you avoid a rushed commitment.'
    }
  },
  {
    id:'repeat-announcement',phraseId:'repeat',
    easy:{
      scene:'駅のアナウンス',
      cue:'駅の放送が聞き取れなかった。もう一度聞きたい。',
      task:'駅員にもう一度言ってもらおう。',
      answer:'Could you say that again?',
      alternatives:['Can you repeat that, please?','Could you say the announcement again?','Can you repeat the announcement, please?'],
      hint:'Could you say ... again?',
      tip:'聞き取れない部分があれば、遠慮せずに聞き返そう。'
    },
    normal:{
      scene:'A departure announcement',
      cue:'You heard an announcement but missed which platform your train leaves from.',
      task:'Politely ask a station worker to repeat the departure platform.',
      answer:'Could you repeat the departure platform, please?',
      alternatives:['Could you tell me the platform number again?'],
      hint:'Could you repeat ...?',
      tip:'What you missed matters more than repeating the entire announcement.'
    },
    hard:{
      scene:'Last-minute platform change',
      cue:'A noisy announcement mentioned a new platform and a revised departure time, but you missed both.',
      task:'Explain which two details you missed and politely ask for them again.',
      answer:'Sorry, I missed the new platform and the departure time. Could you repeat both, please?',
      alternatives:['Could you tell me the new platform and the updated departure time again? I could not hear the announcement.'],
      hint:'I missed ... and ... Could you ...?',
      tip:'Repeat two specific missing details to avoid another incomplete answer.'
    }
  },
  {
    id:'agree-location',phraseId:'agree',
    easy:{
      scene:'友人との待ち合わせ',
      cue:'待ち合わせ場所を駅に変えようと言われた。同意しよう。',
      task:'駅で会うことに賛成しよう。',
      answer:"Sure, let's meet at the station.",
      alternatives:['Meeting at the station works for me.'],
      hint:'Sure, let’s ...',
      tip:'賛成の一言に具体的な場所を入れると誤解が少ない。'
    },
    normal:{
      scene:'Moving the meetup point',
      cue:'Your friend suggests meeting at the station entrance at four instead of the cafe.',
      task:'Agree to the new place and time.',
      answer:'Four at the station entrance works for me.',
      alternatives:["Sounds good. I'll meet you at the station entrance at four."],
      hint:'... at four works for me.',
      tip:'Confirm both the location and time when a plan changes.'
    },
    hard:{
      scene:'Finding the correct station exit',
      cue:'Your friend moves the meetup from a cafe to the station at four. The station has several exits, and you need to know which one.',
      task:'Agree to the change, confirm four o\'clock, and ask which station exit.',
      answer:'Meeting at the station at four is fine with me. Which exit should we use?',
      alternatives:['Sure, I can meet at the station at four. Could you tell me which exit to go to?'],
      hint:'... at four works ... Which exit ...?',
      tip:'Agree first, then clarify the detail that could cause a missed connection.'
    }
  },
  {
    id:'late-traffic',phraseId:'late',
    easy:{
      scene:'道路の渋滞',
      cue:'渋滞で5分遅れそう。友人に伝えよう。',
      task:'5分遅れることを知らせよう。',
      answer:"I'll be five minutes late.",
      alternatives:["I'm going to be about five minutes late."],
      hint:"I'll be ... minutes late.",
      tip:'5 minutes late のように時間を late の前に置く。'
    },
    normal:{
      scene:'Heavy traffic on the way',
      cue:'Your car is stuck in traffic and you expect to be fifteen minutes late.',
      task:'Apologize, explain the cause, and give your arrival estimate.',
      answer:"Sorry, I'm stuck in traffic, so I'll be fifteen minutes late.",
      alternatives:["I'm sorry. Traffic is heavy and I'll be about 15 minutes late."],
      hint:'Sorry ... traffic ... fifteen minutes late.',
      tip:'A brief cause and a clear estimate help the other person plan.'
    },
    hard:{
      scene:'A road closure before a meeting',
      cue:'The main road is closed. You expect to arrive thirty minutes late, which makes the original three-thirty meeting difficult.',
      task:'Apologize, explain the road closure, and suggest moving the meeting to four.',
      answer:"I'm sorry, the road is closed and I'll be thirty minutes late. Could we move the meeting to four?",
      alternatives:["Sorry, a road closure has delayed me by 30 minutes. Would it be possible to start at four instead of three thirty?"],
      hint:'Sorry ... road ... thirty minutes ... Could we move ...?',
      tip:'When a delay changes the plan, propose a new time rather than only apologizing.'
    }
  },
  {
    id:'clarify-charge',phraseId:'clarify',
    easy:{
      scene:'レストランで会計',
      cue:'お会計が30ドルか確認したい。',
      task:'合計が30ドルで合っているか聞こう。',
      answer:'Is the total thirty dollars?',
      alternatives:['Just to confirm, the total is thirty dollars, right?'],
      hint:'Is the total ...?',
      tip:'確認したい数字をもう一度口に出すと行き違いを防げる。'
    },
    normal:{
      scene:'An unexpected service fee',
      cue:'The menu indicated thirty dollars, but the bill shows thirty-eight.',
      task:'Politely confirm whether the extra eight dollars is a service fee.',
      answer:'Just to check, is the extra eight dollars a service fee?',
      alternatives:['Could you confirm if the additional eight dollars is for service?'],
      hint:'Is the extra eight dollars ...?',
      tip:'Name the difference and ask what it represents.'
    },
    hard:{
      scene:'Reconciling a restaurant bill',
      cue:'Your meal was quoted at thirty dollars, but the total is thirty-eight. You cannot tell whether the difference is tax or a service charge.',
      task:'Point out both amounts and politely request a breakdown of tax and service charges.',
      answer:'I was quoted thirty dollars, but the bill says thirty-eight. Could you show me the tax and service charges separately?',
      alternatives:['The menu said $30, but my bill is $38. Could you explain how much is tax and how much is the service fee?'],
      hint:'The menu said ... but ... Could you explain ...?',
      tip:'A precise comparison and itemized question are more useful than saying only that the price seems wrong.'
    }
  },
  {
    id:'prefer-window',phraseId:'prefer',
    easy:{
      scene:'レストランの席',
      cue:'窓際の席に座りたい。希望を伝えよう。',
      task:'窓際の席がいいと伝えよう。',
      answer:"I'd prefer a window seat.",
      alternatives:["I'd rather sit by the window."],
      hint:"I'd prefer ...",
      tip:'強く要求せず、prefer で希望を伝えることができる。'
    },
    normal:{
      scene:'Choosing a restaurant table',
      cue:'You can sit near the kitchen or at a quiet table by the window.',
      task:'Prefer the window table and give a simple reason.',
      answer:"I'd rather sit by the window because it's quieter.",
      alternatives:["I prefer the window table since it's less noisy."],
      hint:"I'd rather ... because ...",
      tip:'Which seat and why? A simple reason makes a preference clear.'
    },
    hard:{
      scene:'Noisy dining room',
      cue:'You wanted a window table, but none is available. The host offers a noisy table near the speakers. A table against the far wall may be free.',
      task:'Politely decline the noisy table, explain why, and ask whether you can sit by the far wall instead.',
      answer:"Thanks, but I'd rather not sit near the speakers because it's noisy. Could we have a table by the far wall instead?",
      alternatives:["I would prefer somewhere quieter than the table by the speakers. Would a table against the far wall be possible?"],
      hint:"I'd prefer ... because ... Could we ... instead?",
      tip:'When your first choice is unavailable, name the problem and suggest a realistic second option.'
    }
  },
  {
    id:'problem-ticket',phraseId:'problem',
    easy:{
      scene:'電子チケット',
      cue:'購入した電子チケットが届かない。伝えよう。',
      task:'チケットのメールが届いていないと伝えよう。',
      answer:"I haven't received my e-ticket.",
      alternatives:["My ticket hasn't arrived by email."],
      hint:"I haven't received ...",
      tip:'受信していないときは have not received で伝えられる。'
    },
    normal:{
      scene:'Missing an email ticket',
      cue:'You paid for a ticket online, but the confirmation email has not arrived.',
      task:'Explain that you paid and ask the staff to resend the ticket.',
      answer:"I paid for my ticket, but I haven't received the email. Could you resend it?",
      alternatives:["My ticket payment went through, but no confirmation email arrived. Could you send it again?"],
      hint:'I paid ... but ... Could you resend ...?',
      tip:'State what succeeded, what failed, and the specific action you need.'
    },
    hard:{
      scene:'Duplicate charge with no ticket',
      cue:'Your card was charged twice for an online ticket, but you did not receive the ticket or a confirmation. A support agent is available.',
      task:'Describe both charges, say no ticket arrived, and request a correction plus the ticket.',
      answer:"My card was charged twice, but I haven't received the ticket or confirmation. Could you correct the duplicate charge and send my ticket?",
      alternatives:["I was billed two times for one ticket, but nothing has arrived by email. Please fix the extra charge and resend the ticket."],
      hint:'My card was charged ... but ... Could you ...?',
      tip:'For a complicated issue, separate what happened from the two actions you need.'
    }
  }
]);

export const SPEAKING_ADVENTURES=Object.freeze(SCENES.flatMap(scene=>
  ['easy','normal','hard'].map(level=>{
    const content=scene[level];
    return Object.freeze({
      id:`${scene.id}-${level}`,baseId:scene.id,phraseId:scene.phraseId,
      kind:'speak',difficulty:level,extraAdventure:true,...content
    });
  })
));
