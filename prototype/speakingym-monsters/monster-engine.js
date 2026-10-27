import { ALL_PROMPTS, MONSTERS, PHRASES, PROMPTS } from './monster-data.js';
import { cleanForest } from './forest-engine.js';

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
    xpWallet: 0,
    progress: {},
    reviewPrompts: {},
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
  return {
    version: SAVE_VERSION, selectedMonster, ownedMonsters,
    difficulty: DIFFICULTIES.includes(value.difficulty) ? value.difficulty : 'easy',
    monsterXp: Object.fromEntries(ownedMonsters.map(id => [id, Math.max(0, Number(value.monsterXp?.[id]) || 0)])),
    // Older prototype saves put XP straight onto companions. Keep that growth,
    // and initialize the new spendable wallet without duplicating historical XP.
    xpWallet: Number.isSafeInteger(value.xpWallet) && value.xpWallet >= 0 ? value.xpWallet : 0,
    progress: cleanProgress,
    reviewPrompts,
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
  const review = entries.filter(item => (item.entry?.nextReviewDay && item.entry.nextReviewDay <= today)||duePromptPhrases.has(item.phrase.id));
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
    const candidates = ALL_PROMPTS.filter(prompt => prompt.phraseId === phrase.id && !['vocab','grammar'].includes(prompt.kind) && (prompt.difficulty || 'easy') === difficulty);
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
    .replace(/^(?:(?:excuse me|hello|hi) )+/, '')
    .replace(/(?: please| thank you| thanks)$/, '')
    .replace(/^can (you|i) /, 'could $1 ');
}
// Fully authored, narrow equivalents for selected practical situations.
const VETTED_PARAPHRASES=Object.freeze({
  'help-bag':['Could you give me a hand with this bag?'],
  'help-phone':['Would you mind helping me with my phone?'],
  'order-coffee':['May I have an iced coffee, please?'],
  'order-veg':['May I have the vegetable dish, please?'],
  'direction-station':['Could you show me the way to the station?'],
  'recommend-food':['Do you have a local dish you would suggest?'],
  'booking-table':['Could I reserve a table for two?'],
  'apology-email':['I apologize for taking so long to reply.'],
  'decline-dinner':['Sorry, I will not be able to make dinner tonight.'],
  'price-ticket':['What is the admission fee?'],
  'change-room':['Would it be possible to move to another room?'],
  'problem-wifi':['I cannot get the Wi-Fi to work in my room.']
});
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
  return { matchesExample: [prompt.answer, ...(prompt.alternatives || []), ...(!prompt.difficulty ? VETTED_PARAPHRASES[prompt.id]||[] : [])]
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
    // Objective quizzes grow XP and review proficiency, not independent spoken fluency.
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
  next.totalAnswers++;

  // Each completed prompt earns spendable XP. Training does not silently level
  // the selected monster; learners choose whom to grow in their collection.
  // Only independently verified/hinted correct answers mint XP. Skips stay in the review queue.
  const baseXp = rating === 'smooth' ? 16 : rating === 'hint' ? 8 : 0;
  const multiplier = { easy: 1, normal: 1.5, hard: 2 }[prompt.difficulty || 'easy'];
  const xp = Math.round(baseXp * multiplier);
  next.xpWallet = (next.xpWallet || 0) + xp;

  const summary = learningSummary(next, today);
  const captured = [];
  for (const monster of MONSTERS) {
    if (next.ownedMonsters.includes(monster.id)) continue;
    const meetsIndependent = monster.unlock !== undefined && summary.independent >= monster.unlock;
    const meetsMastery = monster.masteryUnlock !== undefined && summary.mastered >= monster.masteryUnlock;
    if (meetsIndependent || meetsMastery) {
      next.ownedMonsters.push(monster.id);
      next.monsterXp[monster.id] = 0;
      captured.push(monster.id);
    }
  }
  return { save: next, reward: { xp, captured, masteryChanged: masteryLevel(entry) > oldMastery, mastery: masteryLevel(entry), wallet: next.xpWallet } };
}

export function finishRound(save, smoothCount) {
  if (!Number.isInteger(smoothCount) || smoothCount < 0 || smoothCount > PHRASES.length) throw new Error('Invalid round result.');
  return { ...clone(save), completedRuns: save.completedRuns + 1, bestSmooth: Math.max(save.bestSmooth, smoothCount) };
}
