// 5e SRD 职业数据（SRD 5.1 / PHB 第 3 章）。
// 只录入 1 级角色创建需要的机械数据：生命骰、豁免、技能选择、护甲/武器熟练、施法属性。
// 法术列表、职业资源、升级特性留给后续版本；features 仅作展示。

export const SRD_CLASSES = [
  {
    id: 'barbarian',
    name: '野蛮人',
    nameEn: 'Barbarian',
    hitDie: 12,
    primaryAbilities: ['str'],
    savingThrows: ['str', 'con'],
    skillChoices: { count: 2, from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
    armorProficiencies: ['light', 'medium', 'shield'],
    weaponProficiencies: ['简易武器', '军用武器'],
    toolProficiencies: [],
    unarmoredDefense: { abilities: ['dex', 'con'], allowShield: true },
    features: [{ level: 1, name: '狂暴', description: '战斗中进入狂暴，获得伤害与抗性加成。' }]
  },
  {
    id: 'bard',
    name: '吟游诗人',
    nameEn: 'Bard',
    hitDie: 8,
    primaryAbilities: ['cha'],
    savingThrows: ['dex', 'cha'],
    skillChoices: { count: 3, from: 'any' },
    armorProficiencies: ['light'],
    weaponProficiencies: ['简易武器', '手弩', '长剑', '细剑', '短剑'],
    toolProficiencies: ['三种乐器'],
    spellcasting: { ability: 'cha', fromLevel: 1 },
    expertise: { count: 2, level: 3 },
    features: [{ level: 1, name: '吟游激励', description: '用附赠动作给同伴一枚激励骰。' }]
  },
  {
    id: 'cleric',
    name: '牧师',
    nameEn: 'Cleric',
    hitDie: 8,
    primaryAbilities: ['wis'],
    savingThrows: ['wis', 'cha'],
    skillChoices: { count: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
    armorProficiencies: ['light', 'medium', 'shield'],
    weaponProficiencies: ['简易武器'],
    toolProficiencies: [],
    spellcasting: { ability: 'wis', fromLevel: 1 },
    features: [{ level: 1, name: '神圣领域', description: '选择一个领域，获得领域法术与特性。' }]
  },
  {
    id: 'druid',
    name: '德鲁伊',
    nameEn: 'Druid',
    hitDie: 8,
    primaryAbilities: ['wis'],
    savingThrows: ['int', 'wis'],
    skillChoices: {
      count: 2,
      from: ['arcana', 'animal-handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival']
    },
    armorProficiencies: ['light', 'medium', 'shield'],
    weaponProficiencies: ['短棒', '匕首', '飞镖', '标枪', '硬头锤', '长棍', '弯刀', '镰刀', '投石索', '矛'],
    toolProficiencies: ['草药工具'],
    spellcasting: { ability: 'wis', fromLevel: 1 },
    features: [{ level: 1, name: '德鲁伊语', description: '懂得德鲁伊密语，并能施展德鲁伊法术。' }]
  },
  {
    id: 'fighter',
    name: '战士',
    nameEn: 'Fighter',
    hitDie: 10,
    primaryAbilities: ['str', 'dex'],
    savingThrows: ['str', 'con'],
    skillChoices: {
      count: 2,
      from: ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival']
    },
    armorProficiencies: ['light', 'medium', 'heavy', 'shield'],
    weaponProficiencies: ['简易武器', '军用武器'],
    toolProficiencies: [],
    features: [{ level: 1, name: '战斗风格', description: '选择一种战斗风格（箭术、防御、决斗、巨武器等）。' }]
  },
  {
    id: 'monk',
    name: '武僧',
    nameEn: 'Monk',
    hitDie: 8,
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    skillChoices: { count: 2, from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
    armorProficiencies: [],
    weaponProficiencies: ['简易武器', '短剑'],
    toolProficiencies: ['一种工匠工具或乐器'],
    unarmoredDefense: { abilities: ['dex', 'wis'], allowShield: false },
    features: [{ level: 1, name: '武艺', description: '徒手与武僧武器使用敏捷，伤害骰为 d4。' }]
  },
  {
    id: 'paladin',
    name: '圣武士',
    nameEn: 'Paladin',
    hitDie: 10,
    primaryAbilities: ['str', 'cha'],
    savingThrows: ['wis', 'cha'],
    skillChoices: { count: 2, from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
    armorProficiencies: ['light', 'medium', 'heavy', 'shield'],
    weaponProficiencies: ['简易武器', '军用武器'],
    toolProficiencies: [],
    spellcasting: { ability: 'cha', fromLevel: 2 },
    features: [{ level: 1, name: '神圣感知', description: '感知附近的强大邪恶与神圣存在。' }]
  },
  {
    id: 'ranger',
    name: '游侠',
    nameEn: 'Ranger',
    hitDie: 10,
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    skillChoices: {
      count: 3,
      from: ['animal-handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival']
    },
    armorProficiencies: ['light', 'medium', 'shield'],
    weaponProficiencies: ['简易武器', '军用武器'],
    toolProficiencies: [],
    spellcasting: { ability: 'wis', fromLevel: 2 },
    features: [{ level: 1, name: '宿敌与自然探索者', description: '选择宿敌与偏好地形，获得追踪与探索加成。' }]
  },
  {
    id: 'rogue',
    name: '游荡者',
    nameEn: 'Rogue',
    hitDie: 8,
    primaryAbilities: ['dex'],
    savingThrows: ['dex', 'int'],
    skillChoices: {
      count: 4,
      from: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight-of-hand', 'stealth']
    },
    armorProficiencies: ['light'],
    weaponProficiencies: ['简易武器', '手弩', '长剑', '细剑', '短剑'],
    toolProficiencies: ['盗贼工具'],
    expertise: { count: 2, level: 1 },
    features: [{ level: 1, name: '偷袭', description: '对有优势或附近有同伴的目标造成额外伤害。' }]
  },
  {
    id: 'sorcerer',
    name: '术士',
    nameEn: 'Sorcerer',
    hitDie: 6,
    primaryAbilities: ['cha'],
    savingThrows: ['con', 'cha'],
    skillChoices: { count: 2, from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
    armorProficiencies: [],
    weaponProficiencies: ['匕首', '飞镖', '投石索', '长棍', '轻弩'],
    toolProficiencies: [],
    spellcasting: { ability: 'cha', fromLevel: 1 },
    features: [{ level: 1, name: '术法起源', description: '选择龙族血脉或狂野魔法，获得对应特性。' }]
  },
  {
    id: 'warlock',
    name: '邪术师',
    nameEn: 'Warlock',
    hitDie: 8,
    primaryAbilities: ['cha'],
    savingThrows: ['wis', 'cha'],
    skillChoices: { count: 2, from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
    armorProficiencies: ['light'],
    weaponProficiencies: ['简易武器'],
    toolProficiencies: [],
    spellcasting: { ability: 'cha', fromLevel: 1 },
    features: [{ level: 1, name: '异界宗主', description: '与一位宗主签订契约，获得契约魔法。' }]
  },
  {
    id: 'wizard',
    name: '法师',
    nameEn: 'Wizard',
    hitDie: 6,
    primaryAbilities: ['int'],
    savingThrows: ['int', 'wis'],
    skillChoices: { count: 2, from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] },
    armorProficiencies: [],
    weaponProficiencies: ['匕首', '飞镖', '投石索', '长棍', '轻弩'],
    toolProficiencies: [],
    spellcasting: { ability: 'int', fromLevel: 1 },
    features: [{ level: 1, name: '奥术恢复', description: '通过法术书准备法术，长休后可恢复部分法术位。' }]
  }
];

export const CLASS_BY_ID = Object.fromEntries(SRD_CLASSES.map((klass) => [klass.id, klass]));
