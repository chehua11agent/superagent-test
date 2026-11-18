// 规则书索引：把 SRD 数据组装成可注入的只读集合。
// buildRules 允许追加/覆盖同 id 的自定义种族、职业、背景、状态与护甲（房规）。
import { SRD_RACES } from './data/races.js';
import { SRD_CLASSES } from './data/classes.js';
import { SRD_BACKGROUNDS } from './data/backgrounds.js';
import { SRD_CONDITIONS } from './data/conditions.js';
import { SRD_ARMOR } from './data/armor.js';
import { SKILLS } from './skills.js';
import { RulesError } from './errors.js';

export const RULES_VERSION = 1;

export const SRD_RULES = Object.freeze({
  version: RULES_VERSION,
  name: 'SRD 5.1（D&D 5e）',
  races: SRD_RACES,
  classes: SRD_CLASSES,
  backgrounds: SRD_BACKGROUNDS,
  conditions: SRD_CONDITIONS,
  armor: SRD_ARMOR,
  skills: SKILLS
});

function mergeById(base, extra, label) {
  if (extra === undefined) return base;
  if (!Array.isArray(extra)) throw new RulesError('RULES_INVALID', `${label} 必须是数组`);
  const map = new Map(base.map((entry) => [entry.id, entry]));
  for (const entry of extra) {
    if (!entry || typeof entry.id !== 'string' || entry.id.length === 0) {
      throw new RulesError('RULES_INVALID', `${label} 里的条目必须有字符串 id`);
    }
    map.set(entry.id, entry);
  }
  return [...map.values()];
}

/** 在 SRD 规则上追加房规数据；同 id 覆盖，新 id 追加。 */
export function buildRules(overrides = {}) {
  const races = mergeById(SRD_RACES, overrides.races, 'races');
  const classes = mergeById(SRD_CLASSES, overrides.classes, 'classes');
  const backgrounds = mergeById(SRD_BACKGROUNDS, overrides.backgrounds, 'backgrounds');
  const conditions = mergeById(SRD_CONDITIONS, overrides.conditions, 'conditions');
  const armor = mergeById(SRD_ARMOR, overrides.armor, 'armor');
  return Object.freeze({
    ...SRD_RULES,
    name: overrides.name ?? SRD_RULES.name,
    races,
    classes,
    backgrounds,
    conditions,
    armor
  });
}

/**
 * 解析实体引用：字符串按 id 查表；对象视为自定义条目直接使用。
 * 这一层让“自由捏人”可以绕过内置列表，同时保留同一套校验。
 */
export function resolveReference(collection, reference, label) {
  if (reference && typeof reference === 'object') {
    if (!reference.id || !reference.name) {
      throw new RulesError('REFERENCE_INVALID', `${label} 自定义条目需要 id 与 name`, { label });
    }
    return reference;
  }
  if (typeof reference !== 'string' || reference.length === 0) {
    throw new RulesError('REFERENCE_MISSING', `缺少${label}`, { label });
  }
  const found = collection.find((entry) => entry.id === reference);
  if (!found) {
    throw new RulesError('REFERENCE_NOT_FOUND', `找不到${label}：${reference}`, { label, id: reference });
  }
  return found;
}
