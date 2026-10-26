import { companions, monsters, stages, questions } from './rpg-data.js';

export const STORAGE_KEY = 'speakingym-rpg-prototype-v1';
export const XP_PER_LEVEL = 60;
export const EVOLUTION_HP_BONUS = 15;
export const EVOLUTION_TRAIT_BONUS = 4;
export const MOVE_RULES = {
  word: { damage: 22, focus: 0, guard: 0 },
  listen: { damage: 18, focus: 0, guard: 7 },
  phrase: { damage: 29, focus: 1, guard: 0 }
};
// # = a tree; S = entrance; C = supply cache; R = focus shrine; M = encounter.
// The optional cache is a dead-end. Taking the longer route changes the fight.
export const FOREST_TILES = Object.freeze([
  '#######',
  '#C###M#',
  '#.###.#',
  '#.##R.#',
  '#.##..#',
  '#S....#',
  '#######'
]);
export const COMPANION_TRAITS = Object.freeze({
  momo: { name: '先陣の一撃', detail: 'ことば斬りの威力 +7', move: 'word', bonus: 7 },
  lumi: { name: '耳を澄ます', detail: '聞き耳ウェーブの被ダメージ軽減 +5', move: 'listen', bonus: 5 },
  koro: { name: '勇気の一文', detail: 'フレーズ連結の威力 +9', move: 'phrase', bonus: 9 },
  mimip: { name: '道ふさぎ', detail: 'ことば斬りの威力 +6', move: 'word', bonus: 6 },
  pebblet: { name: '石の盾', detail: '聞き耳ウェーブの被ダメージ軽減 +8', move: 'listen', bonus: 8 },
  puddle: { name: '雨の耳', detail: '聞き耳ウェーブの被ダメージ軽減 +6', move: 'listen', bonus: 6 },
  twiggle: { name: '若枝の連結', detail: 'フレーズ連結の威力 +6', move: 'phrase', bonus: 6 },
  glimmer: { name: 'ひかりの言葉', detail: 'ことば斬りの威力 +8', move: 'word', bonus: 8 },
  cinder: { name: '炎の連文', detail: 'フレーズ連結の威力 +8', move: 'phrase', bonus: 8 },
  bubbun: { name: '潮の守り', detail: '聞き耳ウェーブの被ダメージ軽減 +7', move: 'listen', bonus: 7 },
  mosslet: { name: '苔の盾', detail: '聞き耳ウェーブの被ダメージ軽減 +9', move: 'listen', bonus: 9 },
  starling: { name: '星の一文', detail: 'フレーズ連結の威力 +10', move: 'phrase', bonus: 10 },
  craggle: { name: '岩砕き', detail: 'ことば斬りの威力 +10', move: 'word', bonus: 10 },
  aurora: { name: '暁の響き', detail: 'フレーズ連結の威力 +11', move: 'phrase', bonus: 11 },
  crown: { name: '王者の言葉', detail: 'ことば斬りの威力 +12', move: 'word', bonus: 12 }
});
export const traitFor = id => COMPANION_TRAITS[id] || { name: '冒険のきずな', detail: 'ことば斬りの威力 +4', move: 'word', bonus: 4 };
export function skillFor(id, level = 1, evolved = false) {
  const rank = (level >= 2 ? 1 : 0) + (evolved ? 1 : 0);
  if (id === 'lumi' || ['pebblet','puddle','bubbun','mosslet'].includes(id)) return { name:rank?'再生の風':'いやしの風', detail:`全員のHP +${12+rank*7}・盾 +${6+rank*3}`, kind:'heal', power:12+rank*7, shield:6+rank*3 };
  if (id === 'koro' || ['twiggle','cinder','starling','aurora'].includes(id)) return { name:rank?'渾身の構え':'集中の構え', detail:`集中 +2・次の連結に +${8+rank*5}`, kind:'charge', power:8+rank*5 };
  if (id === 'mimip') return { name:rank?'深い足止め':'つるで足止め', detail:`敵の次の2行動を -${7+rank*3}`, kind:'weaken', power:7+rank*3 };
  return { name:rank?'連撃の号令':'連携の合図', detail:`次に当てた技を +${9+rank*5}`, kind:'combo', power:9+rank*5 };
}
export function newForestWalk() { return { x: 1, y: 5, chest: false, shrine: false, steps: 0 }; }
export function walkForest(walk, dx, dy) {
  if (![0, 1, -1].includes(dx) || ![0, 1, -1].includes(dy) || Math.abs(dx) + Math.abs(dy) !== 1) throw new Error('Walk one tile at a time.');
  const x = walk.x + dx, y = walk.y + dy;
  const tile = FOREST_TILES[y]?.[x];
  if (!tile || tile === '#') return { walk, event: 'blocked' };
  const next = { ...walk, x, y, steps: walk.steps + 1 };
  let event = 'step';
  if (tile === 'C' && !walk.chest) { next.chest = true; event = 'chest'; }
  if (tile === 'R' && !walk.shrine) { next.shrine = true; event = 'shrine'; }
  if (tile === 'M') event = 'encounter';
  return { walk: next, event };
}

export function enemyIntent(battle) {
  // Predictable patterns allow a real choice: brace with listening or rush damage.
  const heavy = battle.turn % 3 === 1;
  return heavy ? { name: '大きく跳ねる', damage: 21, strong: true } : { name: 'つるの一撃', damage: 10, strong: false };
}
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
    partyIds: [starterId],
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
  // Previous prototype saves contained only one active companion.
  if (!Array.isArray(value.partyIds)) value.partyIds = [value.activeCompanionId];
  if (value.partyIds.length < 1 || value.partyIds.length > 3 || new Set(value.partyIds).size !== value.partyIds.length || value.partyIds.some(id => !value.roster.some(entry => entry.id === id))) return null;
  if (!value.partyIds.includes(value.activeCompanionId)) value.activeCompanionId = value.partyIds[0];
  value.partyIds = [value.activeCompanionId, ...value.partyIds.filter(id => id !== value.activeCompanionId)];
  return value;
}

export function setPartySlot(save, slot, id) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) throw new Error('Only three party slots are available.');
  const next = clone(save);
  const party = next.partyIds || [next.activeCompanionId];
  if (slot > party.length) throw new Error('Fill the previous party slot first.');
  if (!id) {
    if (slot === 0 || slot >= party.length) throw new Error('The first companion cannot be removed.');
    party.splice(slot, 1);
  } else {
    if (!next.roster.some(entry => entry.id === id)) throw new Error('You have not caught that companion.');
    if (party.includes(id) && party[slot] !== id) throw new Error('A companion cannot fill two slots.');
    party[slot] = id;
  }
  next.partyIds = party;
  next.activeCompanionId = party[0];
  return next;
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
  const maxEnemyHp = boss ? 140 : 88;
  return { stageId: stage.id, monsterId, boss, maxPlayerHp, playerHp: maxPlayerHp, maxEnemyHp, enemyHp: maxEnemyHp, focus: 0, turn: 0, ended: false };
}

export function makePartyBattle(stageId, monsterId, save, { focus = 1, shield = 0 } = {}) {
  const partyIds = (save.partyIds || [save.activeCompanionId]).slice(0, 3);
  const partyHp = {}, partyMaxHp = {}, partyEvolved = {};
  for (const id of partyIds) {
    const entry = save.roster.find(member => member.id === id);
    const level = entry?.level || 1;
    partyEvolved[id] = Boolean(entry?.evolved);
    partyMaxHp[id] = makeBattle(stageId, monsterId, level).maxPlayerHp + (partyEvolved[id] ? EVOLUTION_HP_BONUS : 0);
    partyHp[id] = partyMaxHp[id];
  }
  const companionId = partyIds.includes(save.activeCompanionId) ? save.activeCompanionId : partyIds[0];
  return { ...makeBattle(stageId, monsterId, save.roster.find(entry => entry.id === companionId)?.level || 1),
    companionId, tactical: true, partyIds, partyHp, partyMaxHp, partyEvolved, playerHp: partyHp[companionId], maxPlayerHp: partyMaxHp[companionId],
    enemyHp: 96, maxEnemyHp: 96, focus, shield,
    partyLevels:Object.fromEntries(partyIds.map(id=>[id,save.roster.find(entry=>entry.id===id)?.level||1])), skillUsed:{}, combo:0, empower:0, weakenTurns:0, weakenPower:0 };
}

function incomingHit(battle, damage) {
  const weakened = battle.weakenTurns > 0 ? Math.max(0, damage - (battle.weakenPower || 0)) : damage;
  const absorbed = Math.min(battle.shield || 0, weakened);
  return { absorbed, enemyAttack: weakened - absorbed, shield:Math.max(0,(battle.shield||0)-absorbed), weakenTurns:Math.max(0,(battle.weakenTurns||0)-1) };
}

export function useCompanionSkill(battle) {
  if (!battle.tactical || battle.ended || battle.playerHp <= 0) throw new Error('A conscious front companion is required.');
  const id=battle.companionId;
  if (battle.skillUsed?.[id]) throw new Error('This companion has already used its skill in this encounter.');
  const skill=skillFor(id,battle.partyLevels?.[id]||1,battle.partyEvolved?.[id]);
  const next={...battle,partyHp:{...battle.partyHp},skillUsed:{...battle.skillUsed,[id]:true},turn:battle.turn+1};
  if(skill.kind==='heal') {
    for(const member of battle.partyIds) if(next.partyHp[member]>0) next.partyHp[member]=Math.min(battle.partyMaxHp[member],next.partyHp[member]+skill.power);
    next.playerHp=next.partyHp[id];next.shield=(next.shield||0)+skill.shield;
  }
  if(skill.kind==='charge'){next.focus=Math.min(2,battle.focus+2);next.empower=skill.power;}
  if(skill.kind==='combo')next.combo=skill.power;
  if(skill.kind==='weaken'){next.weakenTurns=2;next.weakenPower=skill.power;}
  const intent=enemyIntent(battle), hit=incomingHit(next,intent.damage);
  next.shield=hit.shield;next.weakenTurns=hit.weakenTurns;
  next.playerHp=Math.max(0,next.playerHp-hit.enemyAttack);next.partyHp[id]=next.playerHp;
  next.ended=Object.values(next.partyHp).every(hp=>hp<=0);
  return {battle:next,outcome:{skill:skill.name,kind:skill.kind,enemyMove:intent.name,...hit,failed:next.ended}};
}

export function switchBattleCompanion(battle, id) {
  if (!battle.tactical || battle.ended || !battle.partyIds?.includes(id) || id === battle.companionId || (battle.partyHp[id] || 0) <= 0) throw new Error('Cannot switch to that companion.');
  const intent = enemyIntent(battle);
  const hit=incomingHit(battle,intent.damage);
  const playerHp = Math.max(0, battle.partyHp[id] - hit.enemyAttack);
  const partyHp = { ...battle.partyHp, [id]: playerHp };
  return { battle: { ...battle, companionId: id, playerHp, maxPlayerHp: battle.partyMaxHp[id], partyHp,
    shield: hit.shield, weakenTurns:hit.weakenTurns, turn: battle.turn + 1,
    ended: Object.values(partyHp).every(hp => hp <= 0) },
    outcome: { switched: true, enemyMove: intent.name, absorbed:hit.absorbed, enemyAttack:hit.enemyAttack } };
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
  if (battle.tactical) {
    const trait = traitFor(battle.companionId);
    const evolvedBonus = battle.partyEvolved?.[battle.companionId] ? EVOLUTION_TRAIT_BONUS : 0;
    const bonus = isCorrect && trait.move === move && move !== 'listen' ? trait.bonus + evolvedBonus : 0;
    const combo = isCorrect ? (battle.combo||0) : 0;
    const empower = isCorrect && move==='phrase' ? (battle.empower||0) : 0;
    const damage = isCorrect ? rule.damage + bonus + combo + empower : 0;
    if(isCorrect){next.combo=0;if(move==='phrase')next.empower=0;}
    next.enemyHp = Math.max(0, next.enemyHp - damage);
    const cleared = next.enemyHp === 0;
    // The companion can block the incoming tell even on a missed question.
    const intent = enemyIntent(battle);
    const guarding = isCorrect && move === 'listen' ? rule.guard + (trait.move === 'listen' ? trait.bonus + evolvedBonus : 0) : 0;
    const hit = cleared ? {absorbed:0,enemyAttack:0,shield:battle.shield||0,weakenTurns:battle.weakenTurns||0} : incomingHit(battle,Math.max(0,intent.damage-guarding));
    next.shield=hit.shield;next.weakenTurns=hit.weakenTurns;
    next.playerHp = Math.max(0, next.playerHp - hit.enemyAttack);
    if (battle.partyHp) next.partyHp = { ...battle.partyHp, [battle.companionId]: next.playerHp };
    next.ended = cleared || (next.partyHp ? Object.values(next.partyHp).every(hp => hp <= 0) : next.playerHp === 0);
    return { battle: next, outcome: { correct: isCorrect, damage, combo, empower, guard: guarding, enemyAttack:hit.enemyAttack, absorbed:hit.absorbed, enemyMove: cleared ? null : intent.name, cleared, failed: next.playerHp === 0 } };
  }
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
  if (captured) {
    next.captures.push(species);
    next.roster.push({ id: species, xp: 0, level: 1, evolved: false });
    if (!next.partyIds) next.partyIds = [next.activeCompanionId];
    if (next.partyIds.length < 3) next.partyIds.push(species);
  }

  const active = next.roster.find(entry => entry.id === (battle.tactical ? battle.companionId : next.activeCompanionId));
  // Replaying a route should remain rewarding: players can train a newly caught ally.
  const xpAwarded = firstClear ? (monster.boss ? 70 : 40) : (monster.boss ? 22 : 12);
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
  if (!next.partyIds) next.partyIds = [id];
  next.partyIds = [id, ...next.partyIds.filter(memberId => memberId !== id)].slice(0, 3);
  return next;
}

export function addCapturedMonster(save, id) {
  if (!getMonster(id)) throw new Error('Unknown creature.');
  if (save.captures.includes(id)) return save;
  const next = clone(save);
  next.captures.push(id);
  return next;
}
