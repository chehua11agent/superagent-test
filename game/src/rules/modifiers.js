// 修正层：所有数值修正都带来源与目标，先收集、再一次性结算。
// 约定：基础属性/基础 AC/基础速度是“真相”，修正永不写回基础值。
import { RulesError } from './errors.js';

export const MODIFIER_TYPES = ['flat', 'advantage', 'disadvantage'];

/**
 * 归一化一条修正。
 * target 例：abilityCheck、abilityCheck.dex、skill.stealth、save、save.dex、
 *          attack、initiative、ac、speed、hpMax
 */
export function normalizeModifier(input, defaults = {}) {
  if (!input || typeof input !== 'object') {
    throw new RulesError('MODIFIER_INVALID', '修正必须是一个对象');
  }
  const type = input.type ?? 'flat';
  if (!MODIFIER_TYPES.includes(type)) {
    throw new RulesError('MODIFIER_INVALID', `未知修正类型：${type}`, { type });
  }
  const target = input.target ?? defaults.target;
  if (!target) {
    throw new RulesError('MODIFIER_INVALID', '修正必须声明 target');
  }
  const modifier = {
    source: input.source ?? defaults.source ?? 'situational',
    label: input.label ?? input.source ?? defaults.label ?? '修正',
    target,
    type,
    value: 0
  };
  if (type === 'flat') {
    modifier.value = Number(input.value ?? 0);
    if (!Number.isFinite(modifier.value)) {
      throw new RulesError('MODIFIER_INVALID', `修正 ${modifier.label} 的 value 不是数字`, { label: modifier.label });
    }
  }
  if (input.note) modifier.note = input.note;
  if (input.id) modifier.id = input.id;
  return modifier;
}

/**
 * 5e 优势/劣势规则：多个优势不叠加，多个劣势也不叠加；
 * 同时有优势和劣势时互相抵消为普通掷骰。
 */
export function resolveRollMode(modifiers = []) {
  const advantages = modifiers.filter((modifier) => modifier.type === 'advantage');
  const disadvantages = modifiers.filter((modifier) => modifier.type === 'disadvantage');
  let mode = 'normal';
  if (advantages.length > 0 && disadvantages.length === 0) mode = 'advantage';
  if (disadvantages.length > 0 && advantages.length === 0) mode = 'disadvantage';
  return {
    mode,
    advantages,
    disadvantages,
    cancelled: advantages.length > 0 && disadvantages.length > 0
  };
}

export function sumFlat(modifiers = []) {
  return modifiers.filter((modifier) => modifier.type === 'flat').reduce((total, modifier) => total + modifier.value, 0);
}

