// 状态与力竭的规则结算：把数据里的 effect/defense/flags 转成掷骰修正与派生标志。
import { CONDITION_BY_ID, EXHAUSTION_LEVELS } from './data/conditions.js';

const EMPTY_FLAGS = Object.freeze({
  incapacitated: false,
  speedZero: false,
  cannotConcentrate: false,
  autoCritWithin5ft: false,
  resistanceAll: false,
  prone: false,
  cannotSee: false,
  cannotHear: false,
  cannotAttackSource: false,
  cannotApproachSource: false
});

export function getCondition(id, index = CONDITION_BY_ID) {
  return index[id] ?? null;
}

/** 把已知状态 id 解析成数据对象；未知 id 由 character.js 校验。 */
export function resolveConditions(ids = [], index = CONDITION_BY_ID) {
  return ids.map((id) => index[id]).filter(Boolean);
}

function effectTargets(kind) {
  if (kind === 'skill') return ['abilityCheck'];
  if (kind === 'initiative') return ['abilityCheck', 'initiative'];
  return [kind];
}

/**
 * 状态对角色自己掷骰的影响。
 * kind: abilityCheck | skill | save | attack | initiative
 */
export function conditionRollEffects(conditions, { kind = 'abilityCheck', ability, skill, requiresSight = false, requiresHearing = false } = {}) {
  const targets = effectTargets(kind);
  const modifiers = [];
  const autoFailReasons = [];
  for (const condition of conditions) {
    for (const effect of condition.effects ?? []) {
      if (!targets.includes(effect.target)) continue;
      if (effect.abilities && effect.abilities !== 'all' && !effect.abilities.includes(ability)) continue;
      if (effect.skills && !effect.skills.includes(skill)) continue;
      if (effect.when === 'requiresSight' && !requiresSight) continue;
      if (effect.when === 'requiresHearing' && !requiresHearing) continue;
      if (effect.autoFail) {
        autoFailReasons.push(`${condition.name}：${effect.when === 'requiresSight' ? '需要视觉' : effect.when === 'requiresHearing' ? '需要听觉' : '该检定'}自动失败`);
        continue;
      }
      if (effect.mode === 'advantage' || effect.mode === 'disadvantage') {
        modifiers.push({
          source: `condition:${condition.id}`,
          label: condition.name,
          type: effect.mode,
          note: condition.summary
        });
      }
    }
  }
  return { modifiers, autoFailReasons };
}

/** 汇总状态标志（战斗/派生面板使用）。 */
export function conditionFlags(conditions) {
  const flags = { ...EMPTY_FLAGS };
  for (const condition of conditions) {
    for (const [key, value] of Object.entries(condition.flags ?? {})) {
      if (typeof value === 'boolean') flags[key] = flags[key] || value;
    }
  }
  return flags;
}

/**
 * 别人攻击角色时的攻防修正。
 * range: melee | ranged
 */
export function defenseProfile(conditions, { range = 'melee' } = {}) {
  const advantages = [];
  const disadvantages = [];
  for (const condition of conditions) {
    for (const defense of condition.defense ?? []) {
      const defenseRange = defense.range ?? 'all';
      if (defenseRange !== 'all' && defenseRange !== range) continue;
      const entry = { source: `condition:${condition.id}`, label: condition.name };
      if (defense.attacks === 'advantage') advantages.push(entry);
      if (defense.attacks === 'disadvantage') disadvantages.push(entry);
    }
  }
  let attackers = 'normal';
  if (advantages.length > 0 && disadvantages.length === 0) attackers = 'advantage';
  if (disadvantages.length > 0 && advantages.length === 0) attackers = 'disadvantage';
  const flags = conditionFlags(conditions);
  return {
    range,
    attackers,
    attackersAdvantageSources: advantages,
    attackersDisadvantageSources: disadvantages,
    cancelled: advantages.length > 0 && disadvantages.length > 0,
    autoCritWithin5ft: flags.autoCritWithin5ft,
    autoFailStrDexSaves: conditions.some((condition) =>
      (condition.effects ?? []).some(
        (effect) =>
          effect.target === 'save' &&
          effect.autoFail &&
          Array.isArray(effect.abilities) &&
          effect.abilities.includes('str') &&
          effect.abilities.includes('dex')
      )
    ),
    flags
  };
}

/** 力竭是累积状态：返回 0–6 级的合并效果。 */
export function exhaustionState(level = 0) {
  const safeLevel = Math.min(Math.max(Math.trunc(level) || 0, 0), 6);
  const state = {
    level: safeLevel,
    effects: [],
    summaries: [],
    speedMultiplier: 1,
    hpMultiplier: 1,
    speedZero: false,
    dead: false
  };
  for (let i = 0; i < safeLevel; i += 1) {
    const entry = EXHAUSTION_LEVELS[i];
    state.summaries.push(entry.summary);
    state.effects.push(...(entry.effects ?? []));
    if (entry.speedMultiplier) state.speedMultiplier *= entry.speedMultiplier;
    if (entry.hpMultiplier) state.hpMultiplier *= entry.hpMultiplier;
    if (entry.speedZero) state.speedZero = true;
    if (entry.dead) state.dead = true;
  }
  return state;
}

/** 力竭对角色自己掷骰的影响。 */
export function exhaustionRollEffects(state, { kind = 'abilityCheck', ability, skill } = {}) {
  const targets = effectTargets(kind);
  const modifiers = [];
  for (const effect of state.effects) {
    if (!targets.includes(effect.target)) continue;
    if (effect.abilities && effect.abilities !== 'all' && !effect.abilities.includes(ability)) continue;
    if (effect.skills && !effect.skills.includes(skill)) continue;
    if (effect.mode === 'advantage' || effect.mode === 'disadvantage') {
      modifiers.push({ source: 'exhaustion', label: `力竭 ${state.level}`, type: effect.mode });
    }
  }
  return modifiers;
}
