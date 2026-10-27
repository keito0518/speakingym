import { ALL_PROMPTS, MONSTERS, PHRASES, PROMPTS } from './monster-data.js';
import { cleanForest } from './forest-engine.js';
import { recordRetention, retentionOverview, sanitizeRetention } from './retention.js';

export const STORAGE_KEY = 'speakingym-monsters-prototype-v1';
export const SAVE_VERSION = 1;
export const EVOLUTION_XP = 160;
export const XP_PER_LEVEL = 70;
const VALID_RATINGS = ['smooth', 'hint', 'again'];
export const DIFFICULTIES = Object.freeze(['easy','normal','hard']);
const clone = value => JSON.parse(JSON.stringify(value));
const unique = list => [...new Set(list)];

export function createSave() {
  return {
    version: SAVE_VERSION,
    selectedMonster: 'medamago',
    difficulty: 'easy',
    ownedMonsters: ['medamago'],
    monsterXp: { medamago: 0 },
    monsterBonds: { medamago: 0 },
    xpWallet: 0,
    progress: {},
    reviewPrompts: {},
    retention: {},
    savedPromptIds: [],
    dailyHistory: [],
    quizProgress: {},
    rewardedDays: [],
    completedRuns: 0,
    bestSmooth: 0,
    totalAnswers: 0,
    forest: cleanForest(null)
  };
}

export function validateSave(value) {
  if (!value || value.version !== SAVE_VERSION || !Array.isArray(value.ownedMonsters) || !value.ownedMonsters.includes('medamago') || !value.progress || typeof value.progress !== 'object') return null;
  const ids = new Set(MONSTERS.map(monster => monster.id));
  const ownedMonsters = unique(value.ownedMonsters.filter(id => ids.has(id)));
  const selectedMonster = ownedMonsters.includes(value.selectedMonster) ? value.selectedMonster : 'medamago';
  const cleanProgress = {};
  for (const phrase of PHRASES) {
    const entry = value.progress[phrase.id];
    if (!entry || typeof entry !== 'object') continue;
    cleanProgress[phrase.id] = {
      attempts: Math.max(0, Number(entry.attempts) || 0),
      smoothContexts: unique((Array.isArray(entry.smoothContexts) ? entry.smoothContexts : []).map(id => ALL_PROMPTS.find(prompt => prompt.id === id)?.baseId || id).filter(id => ALL_PROMPTS.some(prompt => (prompt.baseId||prompt.id) === id && prompt.phraseId === phrase.id))),
      smoothDays: unique((Array.isArray(entry.smoothDays) ? entry.smoothDays : []).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))),
      lastDay: typeof entry.lastDay === 'string' ? entry.lastDay : null,
      nextReviewDay: typeof entry.nextReviewDay === 'string' ? entry.nextReviewDay : null,
      lastRating: VALID_RATINGS.includes(entry.lastRating) ? entry.lastRating : 'again'
    };
  }
  const validPromptIds=new Set(ALL_PROMPTS.map(prompt=>prompt.id));
  const reviewPrompts=Object.fromEntries(Object.entries(value.reviewPrompts && typeof value.reviewPrompts==='object' && !Array.isArray(value.reviewPrompts)?value.reviewPrompts:{})
    .filter(([id,due])=>validPromptIds.has(id)&&typeof due==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(due))
    .slice(-156));
  const validQuizIds=new Set(ALL_PROMPTS.filter(prompt=>prompt.kind==='vocab'||prompt.kind==='grammar').map(prompt=>prompt.id));
  const validDay=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day);
  const rawQuizzes=value.quizProgress&&typeof value.quizProgress==='object'&&!Array.isArray(value.quizProgress)?value.quizProgress:{};
  const quizProgress=Object.fromEntries(Object.entries(rawQuizzes)
    .filter(([id,entry])=>validQuizIds.has(id)&&entry&&typeof entry==='object'&&!Array.isArray(entry))
    .slice(-72).map(([id,entry])=>{
      const misses=Number.isSafeInteger(entry.misses)?Math.max(0,Math.min(10000,entry.misses)):0;
      return [id,{
        misses,
        cleanStreak:Number.isSafeInteger(entry.cleanStreak)?Math.max(0,Math.min(2,entry.cleanStreak)):0,
        lastMissDay:validDay(entry.lastMissDay)?entry.lastMissDay:null,
        lastCleanDay:validDay(entry.lastCleanDay)?entry.lastCleanDay:null,
        lastHintDay:validDay(entry.lastHintDay)?entry.lastHintDay:null,
        nextReviewDay:validDay(entry.nextReviewDay)?entry.nextReviewDay:null,
        resolved:entry.resolved===true&&misses>0&&entry.cleanStreak>=2
      }];
    }).filter(([,entry])=>entry.misses>0));
  return {
    version: SAVE_VERSION, selectedMonster, ownedMonsters,
    difficulty: DIFFICULTIES.includes(value.difficulty) ? value.difficulty : 'easy',
    monsterXp: Object.fromEntries(ownedMonsters.map(id => [id, Math.max(0, Number(value.monsterXp?.[id]) || 0)])),
    monsterBonds: Object.fromEntries(ownedMonsters.map(id=>[id,Number.isSafeInteger(value.monsterBonds?.[id])?Math.max(0,Math.min(999,value.monsterBonds[id])):0])),
    // Older prototype saves put XP straight onto companions. Keep that growth,
    // and initialize the new spendable wallet without duplicating historical XP.
    xpWallet: Number.isSafeInteger(value.xpWallet) && value.xpWallet >= 0 ? value.xpWallet : 0,
    progress: cleanProgress,
    retention:sanitizeRetention(value.retention),
    reviewPrompts, savedPromptIds:unique((Array.isArray(value.savedPromptIds)?value.savedPromptIds:[]).filter(id=>validPromptIds.has(id))).slice(0,255),
    dailyHistory:(Array.isArray(value.dailyHistory)?value.dailyHistory:[]).filter(row=>
      row&&typeof row==='object'&&/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&DIFFICULTIES.includes(row.difficulty)&&
      Number.isInteger(row.total)&&row.total>=1&&row.total<=12&&
      Number.isInteger(row.independent)&&row.independent>=0&&row.independent<=row.total&&
      Number.isInteger(row.hinted)&&row.hinted>=0&&row.hinted<=row.total-row.independent&&
      Number.isInteger(row.elapsedSeconds)&&row.elapsedSeconds>=0&&row.elapsedSeconds<=86400
    ).slice(-40).map(row=>({date:row.date,difficulty:row.difficulty,total:row.total,
      independent:row.independent,hinted:row.hinted,elapsedSeconds:row.elapsedSeconds})),
    quizProgress,
    rewardedDays: unique((Array.isArray(value.rewardedDays) ? value.rewardedDays : []).filter(key => typeof key === 'string')).slice(-250),
    completedRuns: Math.max(0, Number(value.completedRuns) || 0),
    bestSmooth: Math.max(0, Number(value.bestSmooth) || 0),
    totalAnswers: Math.max(0, Number(value.totalAnswers) || 0),
    forest: cleanForest(value.forest)
  };
}

export function dayKey(date = new Date()) {
  // Local calendar days match a learner's review routine, not the server clock.
  const year = date.getFullYear(), month = String(date.getMonth() + 1).padStart(2, '0'), day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function masteryLevel(entry) {
  if (!entry?.attempts) return 0;
  if (!entry.smoothContexts?.length) return 1;
  if (entry.smoothContexts.length < 2 || entry.smoothDays.length < 2) return 2;
  return 3;
}

export function learningSummary(save, today = dayKey()) {
  const entries = PHRASES.map(phrase => ({ phrase, entry: save.progress[phrase.id], level: masteryLevel(save.progress[phrase.id]) }));
  const mastered = entries.filter(item => item.level === 3).length;
  const independent = entries.filter(item => item.level >= 2).length;
  const practiced = entries.filter(item => item.level >= 1).length;
  const duePromptPhrases=new Set(Object.entries(save.reviewPrompts||{}).filter(([,date])=>date<=today)
    .map(([id])=>ALL_PROMPTS.find(prompt=>prompt.id===id)?.phraseId).filter(Boolean));
  const dueRetention=new Set(retentionOverview(save,today).due.map(x=>x.prompt.phraseId));
  const review = entries.filter(item => (item.entry?.nextReviewDay && item.entry.nextReviewDay <= today)||duePromptPhrases.has(item.phrase.id)||dueRetention.has(item.phrase.id));
  return { total: PHRASES.length, practiced, independent, mastered, reviewCount: review.length, entries };
}

// Review schedule is a projection of saved activity, not a separate reward ledger.
// Group due work by expression so two due variants do not inflate the headline.
export function reviewOverview(save,today=dayKey()) {
  const groups=new Map();
  const add=(phraseId,due,promptId=null)=>{
    if(!PHRASES.some(phrase=>phrase.id===phraseId) || typeof due!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(due))return;
    const group=groups.get(phraseId)||{phraseId,due,promptId,exact:!!promptId};
    if(due<group.due || (due===group.due&&promptId&&!group.exact)){
      group.due=due;group.promptId=promptId;group.exact=!!promptId;
    }
    groups.set(phraseId,group);
  };
  for(const phrase of PHRASES){
    const due=save.progress?.[phrase.id]?.nextReviewDay;
    if(due)add(phrase.id,due);
  }
  for(const [id,due] of Object.entries(save.reviewPrompts||{})){
    const prompt=ALL_PROMPTS.find(item=>item.id===id);
    if(prompt)add(prompt.phraseId,due,id);
  }
  for(const entry of retentionOverview(save,today).due.concat(retentionOverview(save,today).upcoming))
    add(entry.prompt.phraseId,entry.nextDay,entry.id);
  const scheduled=[...groups.values()].map(row=>({
    ...row,label:PHRASES.find(phrase=>phrase.id===row.phraseId).label,
    dueNow:row.due<=today, upcoming:row.due>today&&row.due<=addDays(today,3)
  })).sort((a,b)=>a.due.localeCompare(b.due)||a.phraseId.localeCompare(b.phraseId));
  return {
    due:scheduled.filter(item=>item.dueNow),
    upcoming:scheduled.filter(item=>item.upcoming),
    scheduled,
    learned:PHRASES.filter(phrase=>masteryLevel(save.progress?.[phrase.id])>=2).length,
    mastered:PHRASES.filter(phrase=>masteryLevel(save.progress?.[phrase.id])===3).length,
    total:PHRASES.length
  };
}

// A missed objective quiz is a *specific weakness*, not proof that an entire
// speaking expression is unknown. Retain old reviewPrompt entries from saves
// created before this field existed, without counting them twice.
export function quizWeaknessOverview(save,today=dayKey()) {
  const quizzes=new Map(ALL_PROMPTS.filter(p=>p.kind==='vocab'||p.kind==='grammar').map(p=>[p.id,p]));
  const items=[];
  for(const [id,entry] of Object.entries(save.quizProgress||{})){
    const prompt=quizzes.get(id);
    if(!prompt || !entry?.misses)continue;
    items.push({id,baseId:prompt.baseId||id,kind:prompt.kind,scene:prompt.scene,
      misses:entry.misses,cleanStreak:entry.cleanStreak||0,
      nextReviewDay:entry.nextReviewDay||today,resolved:entry.resolved===true});
  }
  for(const [id,due] of Object.entries(save.reviewPrompts||{})){
    const prompt=quizzes.get(id);
    if(prompt&&!items.some(item=>item.id===id))
      items.push({id,baseId:prompt.baseId||id,kind:prompt.kind,scene:prompt.scene,misses:1,cleanStreak:0,nextReviewDay:due,resolved:false});
  }
  const sorted=items.sort((a,b)=>a.nextReviewDay.localeCompare(b.nextReviewDay)||b.misses-a.misses||a.id.localeCompare(b.id));
  return {
    due:sorted.filter(item=>!item.resolved&&item.nextReviewDay<=today),
    upcoming:sorted.filter(item=>!item.resolved&&item.nextReviewDay>today),
    resolved:sorted.filter(item=>item.resolved),
    total:items.length
  };
}

// Two independent milestones are required for the newly discovered forest
// creatures: transferable English skill and story chapter progress. No RNG,
// arbitrary timer or paid resource can bypass them. Previously owned creatures
// remain owned even if thresholds increase in this prototype.
export function companionUnlockProgress(save, monster, today=dayKey()){
  const learned=learningSummary(save,today);
  const areaCount=cleanForest(save.forest).completedAreas.length;
  const useMastery=monster.masteryUnlock!==undefined;
  const requiredSkill=useMastery?monster.masteryUnlock:monster.unlock||0;
  const currentSkill=useMastery?learned.mastered:learned.independent;
  const requiredAreas=monster.forestAreas||0;
  return {skillLabel:useMastery?'定着した表現':'自力で理解・練習した表現',
    currentSkill,requiredSkill,areaCount,requiredAreas,
    ready:currentSkill>=requiredSkill&&areaCount>=requiredAreas};
}
export function captureEligibleMonsters(save,today=dayKey()){
  const next=clone(save),captured=[];
  for(const creature of MONSTERS){
    if(next.ownedMonsters.includes(creature.id))continue;
    if(!companionUnlockProgress(next,creature,today).ready)continue;
    next.ownedMonsters.push(creature.id);
    next.monsterXp[creature.id]=0;
    next.monsterBonds ||= {};
    next.monsterBonds[creature.id]=0;
    captured.push(creature.id);
  }
  return {save:next,captured};
}
export function getMonsterProgress(save, id = save.selectedMonster) {
  const xp = save.monsterXp[id] || 0;
  return { xp, level: 1 + Math.floor(xp / XP_PER_LEVEL), evolved: xp >= EVOLUTION_XP, toNextLevel: XP_PER_LEVEL - (xp % XP_PER_LEVEL) };
}

export function selectMonster(save, id) {
  if (!save.ownedMonsters.includes(id)) throw new Error('そのモンスターはまだ仲間ではありません。');
  return { ...clone(save), selectedMonster: id };
}

export function feedMonster(save, id, amount) {
  if (!save.ownedMonsters.includes(id)) throw new Error('そのモンスターはまだ仲間ではありません。');
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('XPは1以上の整数で指定してください。');
  if (amount > save.xpWallet) throw new Error('貯めたXPが足りません。');
  const before = getMonsterProgress(save,id);
  const next = clone(save);
  next.xpWallet -= amount;
  next.monsterXp[id] = (next.monsterXp[id] || 0) + amount;
  const after = getMonsterProgress(next,id);
  return { save: next, reward: { xp: amount, monsterId: id, before, after, leveledUp: after.level > before.level, evolved: !before.evolved && after.evolved } };
}

export function chooseDifficulty(save, difficulty) {
  if (!DIFFICULTIES.includes(difficulty)) throw new Error('Invalid difficulty.');
  return { ...clone(save), difficulty };
}

export function selectRoundPrompts(save, count = 6, random = Math.random, today = dayKey(), difficulty = save.difficulty || 'easy') {
  if (!Number.isInteger(count) || count < 1 || count > PHRASES.length) throw new Error(`Choose 1–${PHRASES.length} prompts.`);
  if (!DIFFICULTIES.includes(difficulty)) throw new Error('Invalid difficulty.');
  const groups = PHRASES.map(phrase => {
    const entry = save.progress[phrase.id];
    const candidates = ALL_PROMPTS.filter(prompt => prompt.phraseId === phrase.id && !prompt.bossOnly && !['vocab','grammar'].includes(prompt.kind) && (prompt.difficulty || 'easy') === difficulty);
    const unseen = candidates.filter(prompt => !entry?.smoothContexts?.includes(prompt.baseId || prompt.id));
    const dueCandidates=candidates.filter(prompt=>save.reviewPrompts?.[prompt.id] && save.reviewPrompts[prompt.id]<=today);
    const pool = dueCandidates.length?dueCandidates:unseen.length?unseen:candidates;
    const choice = pool[Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * pool.length))];
    const due = entry?.nextReviewDay && entry.nextReviewDay <= today;
    const priority = dueCandidates.length||due ? 0 : !entry ? 1 : masteryLevel(entry) < 3 ? 2 : 3;
    return { choice, priority, tie: random() };
  });
  return groups.sort((a, b) => a.priority - b.priority || a.tie - b.tie).slice(0, count).map(item => item.choice);
}

export function normalizeEnglish(value) {
  return String(value || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\b(i am)\b/g, "i'm").replace(/\b(i would)\b/g, "i'd").replace(/[^a-z0-9\s']/g, '').replace(/\s+/g, ' ').trim();
}

// Safe surface variants only: polite openers/endings and can/could requests.
// Do not remove negation or compare keyword overlap; an uncertain meaning stays review.
function canonicalVettedReply(value) {
  return normalizeEnglish(value)
    // Match speech-recognition spelling variants only when their meaning is
    // unchanged. These are surface forms, never approximate word overlap.
    .replace(/\bi have not\b/g, "i haven't")
    .replace(/\bi will\b/g, "i'll")
    .replace(/\bi have\b/g, "i've")
    .replace(/\bi cannot\b/g, "i can't")
    .replace(/\bwe will\b/g, "we'll")
    .replace(/\b(5|8|10|11|15|20|30|38)\b/g, number => ({
      '5':'five','8':'eight','10':'ten','11':'eleven','15':'fifteen',
      '20':'twenty','30':'thirty','38':'thirty eight'
    })[number])
    .replace(/\be ticket\b/g, 'eticket')
    .replace(/^(?:(?:excuse me|hello|hi) )+/, '')
    .replace(/(?: please| thank you| thanks)$/, '')
    .replace(/^can (you|i) /, 'could $1 ');
}
// Human-reviewed, narrow equivalents for every easy-level situation.
// These are deliberately complete sentences, not keyword-overlap / AI scores.
// A different date, opposite meaning, or unknown phrasing still requires review.
export const VETTED_PARAPHRASES=Object.freeze({
  'think-cafe':['Could I have a minute to decide?'],
  'think-trip':['I need a little time to decide.'],
  'repeat-station':['Could you repeat that for me?'],
  'repeat-class':['Could you explain that again, please?'],
  'agree-friend':['Three o’clock works for me.'],
  'agree-work':['Sure, Friday is fine with me.'],
  'late-bus':["I'll be a little late."],
  'late-call':["I'm going to be late."],
  'clarify-hotel':['Could you confirm that checkout is at eleven?'],
  'clarify-office':['Do you need the file before lunch?'],
  'prefer-city':['I prefer taking the train.'],
  'prefer-friend':["Let's go by train."],
  'help-bag':['Could you give me a hand with this bag?','Would you mind giving me a hand with my suitcase?'],
  'help-phone':['Would you mind helping me with my phone?','Can you give me a hand with my phone?'],
  'help-form':['Could you show me how to fill in this form?'],
  'help-ticket':['Can you show me how to buy a ticket?'],
  'order-coffee':['May I have an iced coffee, please?','Can I get an iced coffee?'],
  'order-veg':['May I have the vegetable dish, please?','Can I order the vegetable dish?'],
  'order-breakfast':["I'd like a cup of tea."],
  'order-extra':['Can I get a pizza with extra cheese?'],
  'direction-station':['Could you show me the way to the station?','Could you tell me how to get to the train station?'],
  'direction-bus':['Could you tell me where the bus stop for the airport is?'],
  'direction-museum':['Is the museum within walking distance?'],
  'direction-transfer':['At which station should I change trains?'],
  'recommend-food':['Do you have a local dish you would suggest?', "What's your most popular dish?"],
  'recommend-visit':['Is there anywhere interesting to visit nearby?'],
  'recommend-gift':['Can you suggest a gift for my friend?'],
  'recommend-drink':["Can you recommend a drink that isn't very sweet?"],
  'booking-table':['Could I reserve a table for two?','Can I reserve a table for two people?'],
  'booking-hotel':['Can I book a room for tonight?'],
  'booking-tour':["Could I book a place on tomorrow's tour?"],
  'booking-haircut':['Can I book a haircut for Saturday?'],
  'apology-late':['Sorry I kept you waiting.'],
  'apology-spill':['Sorry about spilling my drink.'],
  'apology-email':['I apologize for taking so long to reply.','Sorry for getting back to you so late.'],
  'apology-noise':['I apologize for making so much noise.'],
  'decline-dinner':['Sorry, I will not be able to make dinner tonight.',"I can't come to dinner tonight, sorry."],
  'decline-overtime':["I can't work overtime today.","I cannot work overtime today.","I can't stay late today.","Sorry, I can't do overtime today."],
  'decline-purchase':["Thanks, but I'm not going to buy it today."],
  'decline-invite':["I can't come after class. Sorry."],
  'price-ticket':['What is the admission fee?','How much is the entrance fee?'],
  'price-delivery':['How much will it cost to send this package?'],
  'price-rental':['How much does the car rental cost per day?'],
  'price-service':["What's the price for cleaning a coat?"],
  'change-time':['Could we push the meeting back by an hour?'],
  'change-room':['Would it be possible to move to another room?','Can I switch to a different room?'],
  'change-seat':['Can you move me to a window seat?'],
  'change-date':['Could you move my booking to next Monday?'],
  'problem-wifi':['I cannot get the Wi-Fi to work in my room.',"The internet in my room isn't working."],
  'problem-food':['Excuse me, I think you brought me the wrong order.'],
  'problem-bill':["The amount on my bill doesn't match my reservation."],
  'problem-train':['My train was canceled. Is there another option?']
});
// Higher-level prompts require their own details. Do not inherit easy
// paraphrases: they would wrongly award XP for omitting the harder conditions.
export const VETTED_LEVEL_PARAPHRASES=Object.freeze({
  'help-bag-normal':['Could you give me a hand carrying my suitcase upstairs?'],
  'order-coffee-normal':['Can I get an iced coffee, please?'],
  'direction-station-normal':['Could you tell me the way to the closest train station?'],
  'recommend-food-normal':['What traditional dish would you suggest?'],
  'booking-table-normal':['Can I reserve a table for two for dinner?'],
  'apology-late-normal':['Sorry to have kept you waiting.'],
  'decline-dinner-normal':["Sorry, I can't come to dinner because I've already made plans."],
  'price-ticket-normal':["What's the price of one adult admission ticket?"],
  'change-time-normal':['Could we reschedule the meeting for 3 pm?'],
  'problem-wifi-normal':["My room's Wi-Fi doesn't work. Could you help me?"],
  'think-cafe-normal':['Could you give me a moment to decide?'],
  'repeat-station-normal':['Could you repeat which platform it is?'],
  'agree-friend-normal':["I'm free at three on Saturday."],
  'late-bus-normal':['Sorry, my bus is running late.'],
  'clarify-hotel-normal':['Could you please confirm whether checkout is at 11 am?'],
  'prefer-city-normal':['I prefer the train because it is quicker.'],
  'help-bag-hard':['I have two heavy suitcases, and the elevator is broken. Could you help me carry them?'],
  'order-coffee-hard':['Can I get a large iced coffee with no sugar to go, please?'],
  'booking-table-hard':['Could you book a table for two at seven tonight, away from the door?'],
  'decline-overtime-hard':["I have a family appointment so I can't work overtime, but I can finish the urgent work before I go."],
  'late-bus-hard':["Sorry, the bus was canceled, so I'm going to be 20 minutes late. You can wait indoors."],
  'problem-wifi-hard':['My Wi-Fi keeps cutting out and I need to join a video call soon. Can you fix it?'],
  'prefer-city-hard':["The bus goes straight there, but I'd prefer the train because it's quicker despite having to change."]
});
// Explicit learner bookmarks. Keep exact prompt IDs across sessions, so
// review replays the very same difficulty/scene instead of randomizing.
export function toggleSavedPrompt(save,promptId){
 if(!ALL_PROMPTS.some(prompt=>prompt.id===promptId))throw Error('Unknown prompt for bookmark');
 const next=clone(save),ids=new Set(next.savedPromptIds||[]);
 if(ids.has(promptId))ids.delete(promptId);
 else ids.add(promptId);
 next.savedPromptIds=[...ids].slice(0,255);
 return next;
}
// Same exact authored task at the original difficulty. Prioritize overdue
// reviews and previously missed quizzes rather than merely curriculum order.
export function savedReviewQueue(save,today=dayKey()){
 const ids=new Set(save.savedPromptIds||[]);
 return ALL_PROMPTS.filter(prompt=>ids.has(prompt.id)).map(prompt=>{
   const dueDate=save.reviewPrompts?.[prompt.id];
   const phraseDue=save.progress?.[prompt.phraseId]?.nextReviewDay;
   const weak=Boolean(save.quizProgress?.[prompt.id]?.misses&&!save.quizProgress[prompt.id].resolved);
   const retentionDue=save.retention?.[prompt.id]?.nextDay;
   const due=Boolean((retentionDue&&retentionDue<=today)||(dueDate&&dueDate<=today)||(phraseDue&&phraseDue<=today)||(weak&&(!save.quizProgress[prompt.id].nextReviewDay||save.quizProgress[prompt.id].nextReviewDay<=today)));
   return {prompt,due,weak,reviewDate:retentionDue||dueDate||phraseDue||null};
 }).sort((a,b)=>Number(b.due)-Number(a.due)||Number(b.weak)-Number(a.weak)||a.prompt.id.localeCompare(b.prompt.id));
}
export function savedReviewPrompts(save,today=dayKey()){
 return savedReviewQueue(save,today).map(entry=>entry.prompt);
}
export function flagUncertainReview(save,promptId,today=dayKey()) {
  if(!ALL_PROMPTS.some(item=>item.id===promptId)||!/^\d{4}-\d{2}-\d{2}$/.test(today))
    throw new Error('Invalid review prompt.');
  const next=clone(save);
  const due=addDays(today,1);
  next.reviewPrompts ||= {};
  // Never push a review that is already due further into the future.
  if(!next.reviewPrompts[promptId]||next.reviewPrompts[promptId]>due)next.reviewPrompts[promptId]=due;
  return next;
}
export function compareWithExamples(prompt, answer) {
  const normalized = normalizeEnglish(answer);
  if (!normalized) return { matchesExample: false, empty: true };
  const canonical = canonicalVettedReply(answer);
  return { matchesExample: [prompt.answer, ...(prompt.alternatives || []), ...(!prompt.difficulty ? VETTED_PARAPHRASES[prompt.id]||[] : []), ...(VETTED_LEVEL_PARAPHRASES[prompt.id]||[])]
    .some(example => canonicalVettedReply(example) === canonical), empty: false };
}

export function recordAnswer(save, promptId, rating, today = dayKey()) {
  const prompt = ALL_PROMPTS.find(item => item.id === promptId);
  if (!prompt || !VALID_RATINGS.includes(rating) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('Invalid learning result.');
  const next = clone(save);
  const entry = next.progress[prompt.phraseId] || { attempts: 0, smoothContexts: [], smoothDays: [], lastDay: null, nextReviewDay: null, lastRating: 'again' };
  const oldMastery = masteryLevel(entry);
  entry.attempts++;
  entry.lastDay = today;
  entry.lastRating = rating;
  if (rating === 'smooth' && !['vocab','grammar'].includes(prompt.kind)) {
    // Successful listening builds comprehension progress, not evidence of microphone accuracy.\n    // Independent SPEAKING proficiency must be reported separately from this general language progress.
    // Difficulty variants of one scene do not count as distinct mastery contexts.
    entry.smoothContexts = unique([...entry.smoothContexts, prompt.baseId || prompt.id]);
    entry.smoothDays = unique([...entry.smoothDays, today]);
  }
  entry.nextReviewDay = addDays(today, rating === 'smooth' ? (masteryLevel(entry) === 3 ? 7 : 3) : 1);
  next.progress[prompt.phraseId] = entry;
  // A previously uncertain exact task becomes a spaced replay, even when the
  // learner later solves it. Skips must be reviewed the next day without XP.
  next.reviewPrompts ||= {};
  if(rating==='again'||Object.hasOwn(next.reviewPrompts,promptId))
    next.reviewPrompts[promptId]=addDays(today,rating==='smooth'?(masteryLevel(entry)===3?7:3):rating==='hint'?3:1);
  if(prompt.kind==='vocab'||prompt.kind==='grammar'){
    next.quizProgress ||= {};
    const previous=next.quizProgress[promptId] ||
      (rating!=='again'&&Object.hasOwn(next.reviewPrompts,promptId)?{
        misses:1,cleanStreak:0,lastMissDay:null,lastCleanDay:null,lastHintDay:null,nextReviewDay:today,resolved:false
      }:null);
    if(rating==='again'){
      next.quizProgress[promptId]={
        misses:(previous?.misses||0)+1,cleanStreak:0,lastMissDay:today,lastCleanDay:null,lastHintDay:null,
        nextReviewDay:today,resolved:false
      };
    }else if(previous?.misses){
      const wasRecentlyWrong=previous.lastMissDay===today;
      const isNewCleanDay=rating==='smooth'&&!wasRecentlyWrong&&previous.lastHintDay!==today&&
        previous.lastCleanDay!==today&&(!previous.nextReviewDay||previous.nextReviewDay<=today);
      const cleanStreak=Math.min(2,(previous.cleanStreak||0)+(isNewCleanDay?1:0));
      const resolved=cleanStreak>=2;
      const nextReviewDay=resolved?null:isNewCleanDay?addDays(today,3):
        wasRecentlyWrong&&rating==='hint'?today:rating==='hint'?addDays(today,1):
        previous.nextReviewDay&&previous.nextReviewDay>today?previous.nextReviewDay:addDays(today,1);
      next.quizProgress[promptId]={
        ...previous,cleanStreak,lastCleanDay:rating==='smooth'?today:previous.lastCleanDay,
        lastHintDay:rating==='hint'?today:previous.lastHintDay,
        nextReviewDay,resolved
      };
    }
    const quiz=next.quizProgress[promptId];
    if(quiz?.resolved)delete next.reviewPrompts[promptId];
    else if(quiz)next.reviewPrompts[promptId]=quiz.nextReviewDay;
  }
  next.totalAnswers++;
  const retentionRecord=recordRetention(next,prompt.id,rating,today);
  next.retention=retentionRecord.save.retention;
  // Reward a *verified spaced revisit* with a purely cosmetic bond milestone.
  // Same-day repeats, listening recognition failures and hints grant no bond.
  // Bond XP is never spendable and does not bypass recruitment prerequisites.
  let bondGained=0;
  if(rating==='smooth'&&retentionRecord.stageChanged&&retentionRecord.stage>=2){
    bondGained=retentionRecord.stage===3?2:1;
    next.monsterBonds ||= {};
    const id=next.selectedMonster;
    if(next.ownedMonsters.includes(id))
      next.monsterBonds[id]=Math.min(999,(next.monsterBonds[id]||0)+bondGained);
    else bondGained=0;
  }

  // Each completed prompt earns spendable XP. Training does not silently level
  // the selected monster; learners choose whom to grow in their collection.
  // Only independently verified/hinted correct answers mint XP. Skips stay in the review queue.
  const baseXp = rating === 'smooth' ? 16 : rating === 'hint' ? 8 : 0;
  const multiplier = { easy: 1, normal: 1.5, hard: 2 }[prompt.difficulty || 'easy'];
  const xp = Math.round(baseXp * multiplier);
  next.xpWallet = (next.xpWallet || 0) + xp;

  const {save:awarded,captured}=captureEligibleMonsters(next,today);
  return { save: awarded, reward: { xp, captured, masteryChanged: masteryLevel(entry) > oldMastery, mastery: masteryLevel(entry), wallet: awarded.xpWallet,retentionStage:retentionRecord.stage,retentionAdvanced:retentionRecord.stageChanged,nextRetentionDay:retentionRecord.nextDay,bondGained } };
}

export function finishRound(save, smoothCount) {
  if (!Number.isInteger(smoothCount) || smoothCount < 0 || smoothCount > PHRASES.length) throw new Error('Invalid round result.');
  return { ...clone(save), completedRuns: save.completedRuns + 1, bestSmooth: Math.max(save.bestSmooth, smoothCount) };
}
