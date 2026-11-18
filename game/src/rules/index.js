// 5e 规则核的公开入口。
// 浏览器与 Node 共用；不依赖 DOM、localStorage 或第三方包。
export {
  ABILITIES,
  ABILITY_BY_ID,
  ABILITY_IDS,
  ABILITY_METHODS,
  POINT_BUY_COSTS,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  POINT_BUY_TOTAL,
  STANDARD_ARRAY,
  abilityModifier,
  formatModifier,
  pointBuyCost,
  pointBuyTotal,
  proficiencyBonus,
  rollAbilityPool
} from './abilities.js';

export { RulesError } from './errors.js';
export { d20Sequence, makeRng, rollDie, rollDice, sequenceRng } from './rng.js';
export { SKILLS, SKILL_BY_ID, SKILL_IDS, skillsForAbility } from './skills.js';
export { SRD_RACES } from './data/races.js';
export { SRD_CLASSES } from './data/classes.js';
export { SRD_BACKGROUNDS } from './data/backgrounds.js';
export { SRD_CONDITIONS } from './data/conditions.js';
export { SRD_ARMOR, SHIELD_BONUS } from './data/armor.js';
export { SRD_RULES, RULES_VERSION, buildRules, resolveReference } from './rules.js';

export {
  conditionFlags,
  conditionRollEffects,
  defenseProfile,
  exhaustionRollEffects,
  exhaustionState,
  getCondition,
  resolveConditions
} from './conditions.js';

export { MODIFIER_TYPES, normalizeModifier, resolveRollMode, sumFlat } from './modifiers.js';
export {
  WORD_BONUS_BY_RECOGNITION_STAGE,
  WORD_BONUS_MAX,
  WORD_SPELLING_BONUS,
  wordBonusFromMemory,
  wordBonusLabel,
  wordModifier
} from './word-bonus.js';

export {
  ABILITY_CAP,
  addCondition,
  createCharacter,
  deserializeCharacter,
  patchCharacter,
  rebuildCharacter,
  removeCondition,
  serializeCharacter
} from './character.js';

export {
  buildCheck,
  checkOdds,
  passiveScore,
  resolveCheck
} from './checks.js';
