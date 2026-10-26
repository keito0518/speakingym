import { MONSTERS, PHRASES, PROMPTS } from './monster-data.js';

export const STORAGE_KEY = 'speakingym-monsters-prototype-v1';
export const SAVE_VERSION = 1;
export const EVOLUTION_XP = 160;
export const XP_PER_LEVEL = 70;
const VALID_RATINGS = ['smooth', 'hint', 'again'];
const clone = value => JSON.parse(JSON.stringify(value));
const unique = list => [...new Set(list)];

export function createSave() {
  return {
    version: SAVE_VERSION,
    selectedMonster: 'medamago',
    ownedMonsters: ['medamago'],
    monsterXp: { medamago: 0 },
    xpWallet: 0,
    progress: {},
    rewardedDays: [],
    completedRuns: 0,
    bestSmooth: 0,
    totalAnswers: 0
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
      smoothContexts: unique((Array.isArray(entry.smoothContexts) ? entry.smoothContexts : []).filter(id => PROMPTS.some(prompt => prompt.id === id && prompt.phraseId === phrase.id))),
      smoothDays: unique((Array.isArray(entry.smoothDays) ? entry.smoothDays : []).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))),
      lastDay: typeof entry.lastDay === 'string' ? entry.lastDay : null,
      nextReviewDay: typeof entry.nextReviewDay === 'string' ? entry.nextReviewDay : null,
      lastRating: VALID_RATINGS.includes(entry.lastRating) ? entry.lastRating : 'again'
    };
  }
  return {
    version: SAVE_VERSION, selectedMonster, ownedMonsters,
    monsterXp: Object.fromEntries(ownedMonsters.map(id => [id, Math.max(0, Number(value.monsterXp?.[id]) || 0)])),
    // Older prototype saves put XP straight onto companions. Keep that growth,
    // and initialize the new spendable wallet without duplicating historical XP.
    xpWallet: Number.isSafeInteger(value.xpWallet) && value.xpWallet >= 0 ? value.xpWallet : 0,
    progress: cleanProgress,
    rewardedDays: unique((Array.isArray(value.rewardedDays) ? value.rewardedDays : []).filter(key => typeof key === 'string')).slice(-250),
    completedRuns: Math.max(0, Number(value.completedRuns) || 0),
    bestSmooth: Math.max(0, Number(value.bestSmooth) || 0),
    totalAnswers: Math.max(0, Number(value.totalAnswers) || 0)
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
  const review = entries.filter(item => item.entry && item.entry.nextReviewDay && item.entry.nextReviewDay <= today);
  return { total: PHRASES.length, practiced, independent, mastered, reviewCount: review.length, entries };
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

export function selectRoundPrompts(save, count = 6, random = Math.random, today = dayKey()) {
  if (!Number.isInteger(count) || count < 1 || count > PHRASES.length) throw new Error('Choose 1–6 prompts.');
  const groups = PHRASES.map(phrase => {
    const entry = save.progress[phrase.id];
    const candidates = PROMPTS.filter(prompt => prompt.phraseId === phrase.id);
    const unseen = candidates.filter(prompt => !entry?.smoothContexts?.includes(prompt.id));
    const pool = unseen.length ? unseen : candidates;
    const choice = pool[Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * pool.length))];
    const due = entry?.nextReviewDay && entry.nextReviewDay <= today;
    const priority = due ? 0 : !entry ? 1 : masteryLevel(entry) < 3 ? 2 : 3;
    return { choice, priority, tie: random() };
  });
  return groups.sort((a, b) => a.priority - b.priority || a.tie - b.tie).slice(0, count).map(item => item.choice);
}

export function normalizeEnglish(value) {
  return String(value || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\b(i am)\b/g, "i'm").replace(/\b(i would)\b/g, "i'd").replace(/[^a-z0-9\s']/g, '').replace(/\s+/g, ' ').trim();
}

export function compareWithExamples(prompt, answer) {
  const normalized = normalizeEnglish(answer);
  if (!normalized) return { matchesExample: false, empty: true };
  return { matchesExample: [prompt.answer, ...(prompt.alternatives || [])].some(example => normalizeEnglish(example) === normalized), empty: false };
}

export function recordAnswer(save, promptId, rating, today = dayKey()) {
  const prompt = PROMPTS.find(item => item.id === promptId);
  if (!prompt || !VALID_RATINGS.includes(rating) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('Invalid learning result.');
  const next = clone(save);
  const entry = next.progress[prompt.phraseId] || { attempts: 0, smoothContexts: [], smoothDays: [], lastDay: null, nextReviewDay: null, lastRating: 'again' };
  const oldMastery = masteryLevel(entry);
  entry.attempts++;
  entry.lastDay = today;
  entry.lastRating = rating;
  if (rating === 'smooth') {
    entry.smoothContexts = unique([...entry.smoothContexts, promptId]);
    entry.smoothDays = unique([...entry.smoothDays, today]);
  }
  entry.nextReviewDay = addDays(today, rating === 'smooth' ? (masteryLevel(entry) === 3 ? 7 : 3) : 1);
  next.progress[prompt.phraseId] = entry;
  next.totalAnswers++;

  // Each completed prompt earns spendable XP. Training does not silently level
  // the selected monster; learners choose whom to grow in their collection.
  const xp = rating === 'smooth' ? 16 : rating === 'hint' ? 8 : 2;
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
