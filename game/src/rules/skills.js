// 5e 的 18 项技能及对应属性（PHB 第 7 章“属性检定”）。
// 技能检定 = 属性检定；熟练/专精只加在对应的技能上。

export const SKILLS = [
  { id: 'acrobatics', name: '杂技', nameEn: 'Acrobatics', ability: 'dex' },
  { id: 'animal-handling', name: '驯兽', nameEn: 'Animal Handling', ability: 'wis' },
  { id: 'arcana', name: '奥秘', nameEn: 'Arcana', ability: 'int' },
  { id: 'athletics', name: '运动', nameEn: 'Athletics', ability: 'str' },
  { id: 'deception', name: '欺瞒', nameEn: 'Deception', ability: 'cha' },
  { id: 'history', name: '历史', nameEn: 'History', ability: 'int' },
  { id: 'insight', name: '洞悉', nameEn: 'Insight', ability: 'wis' },
  { id: 'intimidation', name: '威吓', nameEn: 'Intimidation', ability: 'cha' },
  { id: 'investigation', name: '调查', nameEn: 'Investigation', ability: 'int' },
  { id: 'medicine', name: '医药', nameEn: 'Medicine', ability: 'wis' },
  { id: 'nature', name: '自然', nameEn: 'Nature', ability: 'int' },
  { id: 'perception', name: '察觉', nameEn: 'Perception', ability: 'wis' },
  { id: 'performance', name: '表演', nameEn: 'Performance', ability: 'cha' },
  { id: 'persuasion', name: '游说', nameEn: 'Persuasion', ability: 'cha' },
  { id: 'religion', name: '宗教', nameEn: 'Religion', ability: 'int' },
  { id: 'sleight-of-hand', name: '巧手', nameEn: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', name: '隐匿', nameEn: 'Stealth', ability: 'dex' },
  { id: 'survival', name: '求生', nameEn: 'Survival', ability: 'wis' }
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((skill) => [skill.id, skill]));
export const SKILL_IDS = SKILLS.map((skill) => skill.id);

export function skillsForAbility(ability) {
  return SKILLS.filter((skill) => skill.ability === ability);
}

/** 技能选择列表可以是 'any'，也可以是技能 id 数组。 */
export function skillChoicePool(spec, rulesSkills = SKILLS) {
  if (!spec) return [];
  const pool = spec === 'any' ? rulesSkills : spec;
  return pool.map((entry) => (typeof entry === 'string' ? entry : entry.id));
}
