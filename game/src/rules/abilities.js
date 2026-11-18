// 5e 属性、熟练加值与属性生成规则（PHB 第 1 章 / 第 7 章）。
// 纯函数；不依赖 DOM、存档或随机数的全局状态。

export const ABILITY_IDS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const ABILITIES = [
  { id: 'str', name: '力量', nameEn: 'Strength', abbr: 'STR' },
  { id: 'dex', name: '敏捷', nameEn: 'Dexterity', abbr: 'DEX' },
  { id: 'con', name: '体质', nameEn: 'Constitution', abbr: 'CON' },
  { id: 'int', name: '智力', nameEn: 'Intelligence', abbr: 'INT' },
  { id: 'wis', name: '感知', nameEn: 'Wisdom', abbr: 'WIS' },
  { id: 'cha', name: '魅力', nameEn: 'Charisma', abbr: 'CHA' }
];

export const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));

/** 5e 标准数组（PHB 第 1 章“标准属性值”）。 */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** 5e 购点表：27 点，8–15，15 之后每点 2 分。 */
export const POINT_BUY_TOTAL = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
export const POINT_BUY_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

/** 属性调整值 = floor((属性值 - 10) / 2)。 */
export function abilityModifier(score) {
  if (!Number.isFinite(score)) return 0;
  return Math.floor((score - 10) / 2);
}

/** 熟练加值：1–4 级 +2，5–8 级 +3，9–12 级 +4，13–16 级 +5，17–20 级 +6。 */
export function proficiencyBonus(level) {
  const safeLevel = Math.min(Math.max(Math.trunc(level) || 1, 1), 20);
  return 2 + Math.floor((safeLevel - 1) / 4);
}

export function pointBuyCost(score) {
  return POINT_BUY_COSTS[score] ?? null;
}

export function pointBuyTotal(scores) {
  let total = 0;
  for (const id of ABILITY_IDS) {
    const cost = pointBuyCost(scores?.[id]);
    if (cost === null) return null;
    total += cost;
  }
  return total;
}

/** 把单值格式化成带符号文本：+3 / -1 / +0。 */
export function formatModifier(value) {
  const number = Number(value) || 0;
  return number >= 0 ? `+${number}` : `${number}`;
}

/** 4d6 去最低，生成 6 组属性值；返回投掷明细，便于 UI 展示。 */
export function rollAbilityPool(rng, { count = 6 } = {}) {
  const groups = [];
  for (let i = 0; i < count; i += 1) {
    const dice = Array.from({ length: 4 }, () => Math.floor(rng() * 6) + 1);
    const sorted = [...dice].sort((a, b) => b - a);
    groups.push({ dice, kept: sorted.slice(0, 3), dropped: sorted[3], total: sorted[0] + sorted[1] + sorted[2] });
  }
  return groups;
}

/** 常用生成方式的元信息，供 UI 与文档复用。 */
export const ABILITY_METHODS = [
  {
    id: 'point-buy',
    name: '购点（27 点）',
    nameEn: 'Point buy',
    summary: '每项 8–15，共 27 点；最稳定，适合正式角色。'
  },
  {
    id: 'standard-array',
    name: '标准数组',
    nameEn: 'Standard array',
    summary: '把 15/14/13/12/10/8 分配给六项属性。'
  },
  {
    id: 'roll',
    name: '4d6 去最低',
    nameEn: 'Roll 4d6 drop lowest',
    summary: '每组 4d6 去掉最低骰，六组任选分配；结果波动大。'
  },
  {
    id: 'free',
    name: '自由填写',
    nameEn: 'Free form',
    summary: '直接填写 3–18 的基础值；给自定义种族 / GM 模式用。'
  }
];
