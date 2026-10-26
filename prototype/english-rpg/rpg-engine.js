import { companions, monsters, stages, questions } from './rpg-data.js';

export const STORAGE_KEY = 'speakingym-rpg-prototype-v1';
export const XP_PER_LEVEL = 60;
export const MOVE_RULES = {
  word: { damage: 22, focus: 0, guard: 0 },
  listen: { damage: 18, focus: 0, guard: 7 },
  phrase: { damage: 29, focus: 1, guard: 0 }
};
const clone = value => JSON.parse(JSON.stringify(value));
export const getMonster = id => monsters.find(monster => monster.id === id);
export const getStage = id => stages.find(stage => stage.id === Number(id));
export const getCompanion = id => companions.find(companion => companion.id === id);

export function createSave(starterId) {
  if (!getCompanion(starterId)) throw new Error('Choose one of the available companions.');
  return {
    version: 1,
    starterId,
    activeCompanionId: starterId,
    roster: [{ id: starterId, xp: 0, level: 1, evolved: false }],
    stageClears: [],
    captures: [starterId],
    speciesWins: {},
    recentQuestions: { word: [], listen: [], phrase: [] }
  };
}

export function validateSave(value) {
  if (!value || value.version !== 1 || !getCompanion(value.starterId) || !Array.isArray(value.roster) || !Array.isArray(value.stageClears) || !Array.isArray(value.captures)) return null;
  if (!value.roster.some(entry => entry.id === value.activeCompanionId) || value.roster.some(entry => !getCompanion(entry.id) && !getMonster(entry.id))) return null;
  return value;
}

export function unlockedStageCount(save) {
  return Math.min(stages.length, 1 + new Set(save.stageClears).size);
}

export function chooseStageMonster(stageId, save, preferredMonsterId = null) {
  const stage = getStage(stageId);
  if (!stage) throw new Error('Unknown stage.');
  if (preferredMonsterId && stage.foes?.includes(preferredMonsterId)) return preferredMonsterId;
  const foes = stage.foes || [stage.foe];
  const missing = foes.filter(id => !save.captures.includes(id));
  return missing[0] || foes[0];
}

export function makeBattle(stageId, monsterId, level = 1) {
  const stage = getStage(stageId), foe = getMonster(monsterId);
  if (!stage || !foe || !(stage.foes || [stage.foe]).includes(monsterId)) throw new Error('That creature does not live on this route.');
  const boss = Boolean(foe.boss);
  const maxPlayerHp = 70 + Math.min(50, Math.max(0, level - 1) * 5);
  const maxEnemyHp = boss ? 112 : 66;
  return { stageId: stage.id, monsterId, boss, maxPlayerHp, playerHp: maxPlayerHp, maxEnemyHp, enemyHp: maxEnemyHp, focus: 0, turn: 0, ended: false };
}

export function pickQuestion(type, save, random = Math.random) {
  if (!['word', 'listen', 'phrase'].includes(type)) throw new Error('Unknown move.');
  const recent = new Set(save.recentQuestions[type] || []);
  const pool = questions.filter(question => question.type === type && !recent.has(question.id));
  const eligible = pool.length ? pool : questions.filter(question => question.type === type);
  const question = eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))];
  return question;
}

export function rememberQuestion(save, question) {
  const next = clone(save);
  const list = next.recentQuestions[question.type] || [];
  next.recentQuestions[question.type] = [...list.filter(id => id !== question.id), question.id].slice(-19);
  return next;
}

export function resolveTurn(battle, move, isCorrect) {
  if (battle.ended) throw new Error('This battle has ended.');
  const rule = MOVE_RULES[move];
  if (!rule) throw new Error('Unknown move.');
  if (battle.focus < rule.focus) throw new Error('Not enough focus for that move.');
  const next = { ...battle, turn: battle.turn + 1, focus: Math.min(2, battle.focus - rule.focus + (move === 'listen' ? 1 : 0)) };
  let outcome;
  if (isCorrect) {
    next.enemyHp = Math.max(0, next.enemyHp - rule.damage);
    next.playerHp = Math.min(next.maxPlayerHp, next.playerHp + rule.guard);
    next.ended = next.enemyHp === 0;
    outcome = { correct: true, damage: rule.damage, guard: rule.guard, enemyAttack: 0, cleared: next.ended };
  } else {
    const enemyAttack = battle.boss ? 17 : 12;
    next.playerHp = Math.max(0, next.playerHp - enemyAttack);
    next.ended = next.playerHp === 0;
    outcome = { correct: false, damage: 0, guard: 0, enemyAttack, failed: next.ended };
  }
  return { battle: next, outcome };
}

export function finishStage(save, battle, random = Math.random) {
  if (!battle.ended || battle.enemyHp > 0) throw new Error('Win the encounter before collecting rewards.');
  const next = clone(save);
  const firstClear = !next.stageClears.includes(battle.stageId);
  if (firstClear) next.stageClears.push(battle.stageId);
  const species = battle.monsterId;
  next.speciesWins[species] = (next.speciesWins[species] || 0) + 1;
  const monster = getMonster(species);
  const captureChance = monster.boss ? 0.6 : 0.4;
  const pityWins = 3;
  const alreadyCaught = next.captures.includes(species);
  const captured = !alreadyCaught && (next.speciesWins[species] >= pityWins || random() < captureChance);
  if (captured) { next.captures.push(species); next.roster.push({ id: species, xp: 0, level: 1, evolved: false }); }

  const active = next.roster.find(entry => entry.id === next.activeCompanionId);
  const xpAwarded = firstClear ? (monster.boss ? 70 : 40) : 0;
  let levelUps = 0;
  let evolvedNow = false;
  if (xpAwarded && active) {
    active.xp += xpAwarded;
    while (active.xp >= XP_PER_LEVEL) { active.xp -= XP_PER_LEVEL; active.level += 1; levelUps++; }
    if (active.level >= 4 && !active.evolved) { active.evolved = true; evolvedNow = true; }
  }
  return { save: next, rewards: { firstClear, captured, alreadyCaught, captureChance, pityWins, winCount: next.speciesWins[species], xpAwarded, levelUps, evolvedNow, companion: active ? { ...active } : null } };
}

export function changeActiveCompanion(save, id) {
  if (!save.roster.some(entry => entry.id === id)) throw new Error('That companion has not joined yet.');
  const next = clone(save);
  next.activeCompanionId = id;
  return next;
}

export function addCapturedMonster(save, id) {
  if (!getMonster(id)) throw new Error('Unknown creature.');
  if (save.captures.includes(id)) return save;
  const next = clone(save);
  next.captures.push(id);
  return next;
}
