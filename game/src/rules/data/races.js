// 5e SRD 种族数据（SRD 5.1 / PHB 第 2 章）。
// 只录入 SRD 公开的九个种族与子种族；字段说明见 docs/design/rules-engine-backend.md。
//
// 机械字段：
//   abilityBonuses.fixed / choose  属性加值 / 可选加值（半精灵）
//   size / speed / darkvision      体型、速度、黑暗视觉
//   languages                      自带的语言
//   skillProficiencies             直接获得的技能熟练
//   skillChoices                   可自选的技能（半精灵）
//   weaponProficiencies            武器熟练（文本，供 UI 展示）
//   toolProficiencies              工具熟练（文本）
//   resistances                    伤害抗性（影响防御面板，不影响 d20 检定）
//   saveAdvantages                 对抗特定效果的豁免优势（见 character.js 的 context 参数）
//   hpPerLevel                     每级额外 HP（丘陵矮人）
//   lucky                          自然 1 重投一次（半身人）
//   choices                        种族内的分支选择（龙裔血统）
//   traits                         展示用特性文本

export const SRD_RACES = [
  {
    id: 'dwarf',
    name: '矮人',
    nameEn: 'Dwarf',
    size: 'medium',
    speed: 25,
    darkvision: 60,
    abilityBonuses: { fixed: { con: 2 } },
    ignoreHeavyArmorSpeedPenalty: true,
    languages: ['通用语', '矮人语'],
    resistances: ['poison'],
    saveAdvantages: [{ abilities: 'all', against: ['poison'], label: '矮人韧性' }],
    weaponProficiencies: ['战斧', '手斧', '轻锤', '战锤'],
    traits: [
      { name: '黑暗视觉', description: '你在 60 尺范围内看黑暗如同微光。' },
      { name: '矮人韧性', description: '对抗毒素的豁免具有优势，并对毒素伤害有抗性。' },
      { name: '矮人战斗训练', description: '熟练使用战斧、手斧、轻锤和战锤。' },
      { name: '工具熟练', description: '熟练使用一种工匠工具（铁匠、酿酒或石匠工具）。' },
      { name: '石工慧眼', description: '涉及石造建筑的智力（历史）检定视为熟练，且加值翻倍。' }
    ],
    subraces: [
      {
        id: 'hill-dwarf',
        name: '丘陵矮人',
        nameEn: 'Hill Dwarf',
        abilityBonuses: { fixed: { wis: 1 } },
        hpPerLevel: 1,
        traits: [{ name: '矮人强健', description: '你的 HP 上限每级额外 +1。' }]
      },
      {
        id: 'mountain-dwarf',
        name: '山地矮人',
        nameEn: 'Mountain Dwarf',
        abilityBonuses: { fixed: { str: 2 } },
        armorProficiencies: ['light', 'medium'],
        traits: [{ name: '矮人护甲训练', description: '熟练使用轻甲和中甲。' }]
      }
    ]
  },
  {
    id: 'elf',
    name: '精灵',
    nameEn: 'Elf',
    size: 'medium',
    speed: 30,
    darkvision: 60,
    abilityBonuses: { fixed: { dex: 2 } },
    languages: ['通用语', '精灵语'],
    skillProficiencies: ['perception'],
    saveAdvantages: [{ abilities: 'all', against: ['charm'], label: '精类血统' }],
    traits: [
      { name: '黑暗视觉', description: '你在 60 尺范围内看黑暗如同微光。' },
      { name: '敏锐感官', description: '熟练使用察觉技能。' },
      { name: '精类血统', description: '对抗魅惑的豁免具有优势，魔法无法让你入睡。' },
      { name: '出神', description: '每天 4 小时冥想即可完成长休。' }
    ],
    subraces: [
      {
        id: 'high-elf',
        name: '高等精灵',
        nameEn: 'High Elf',
        abilityBonuses: { fixed: { int: 1 } },
        weaponProficiencies: ['长剑', '短剑', '短弓', '长弓'],
        languageChoices: 1,
        traits: [{ name: '高等精灵训练', description: '熟练使用长剑、短剑、短弓和长弓；额外掌握一门语言和一项法师戏法。' }]
      },
      {
        id: 'wood-elf',
        name: '木精灵',
        nameEn: 'Wood Elf',
        speed: 35,
        abilityBonuses: { fixed: { wis: 1 } },
        weaponProficiencies: ['长剑', '短剑', '短弓', '长弓'],
        traits: [{ name: '林间潜行', description: '在轻度遮蔽下可以尝试躲藏。' }]
      },
      {
        id: 'drow',
        name: '卓尔（黑暗精灵）',
        nameEn: 'Drow',
        darkvision: 120,
        abilityBonuses: { fixed: { cha: 1 } },
        weaponProficiencies: ['细剑', '短剑', '手弩'],
        traits: [{ name: '阳光敏感', description: '在阳光下，攻击检定和依赖视觉的察觉检定具有劣势。' }]
      }
    ]
  },
  {
    id: 'halfling',
    name: '半身人',
    nameEn: 'Halfling',
    size: 'small',
    speed: 25,
    abilityBonuses: { fixed: { dex: 2 } },
    languages: ['通用语', '半身人语'],
    lucky: true,
    saveAdvantages: [{ abilities: 'all', against: ['frightened'], label: '勇敢' }],
    traits: [
      { name: '幸运', description: '攻击检定、属性检定和豁免掷出自然 1 时可以重投一次，必须使用新结果。' },
      { name: '勇敢', description: '对抗恐惧的豁免具有优势。' },
      { name: '半身人灵巧', description: '可以穿过体型比你大的生物所在的空间。' }
    ],
    subraces: [
      {
        id: 'lightfoot',
        name: '轻足半身人',
        nameEn: 'Lightfoot Halfling',
        abilityBonuses: { fixed: { cha: 1 } },
        traits: [{ name: '天生隐匿', description: '即使只被体型比你大的生物遮挡，也能尝试躲藏。' }]
      },
      {
        id: 'stout',
        name: '壮实半身人',
        nameEn: 'Stout Halfling',
        abilityBonuses: { fixed: { con: 1 } },
        resistances: ['poison'],
        saveAdvantages: [{ abilities: 'all', against: ['poison'], label: '壮实韧性' }],
        traits: [{ name: '壮实韧性', description: '对抗毒素的豁免具有优势，并对毒素伤害有抗性。' }]
      }
    ]
  },
  {
    id: 'human',
    name: '人类',
    nameEn: 'Human',
    size: 'medium',
    speed: 30,
    abilityBonuses: { fixed: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 } },
    languages: ['通用语'],
    languageChoices: 1,
    traits: [{ name: '多才多艺', description: '所有属性 +1；额外掌握一门语言。' }]
  },
  {
    id: 'dragonborn',
    name: '龙裔',
    nameEn: 'Dragonborn',
    size: 'medium',
    speed: 30,
    abilityBonuses: { fixed: { str: 2, cha: 1 } },
    languages: ['通用语', '龙语'],
    choices: [
      {
        id: 'draconic-ancestry',
        name: '龙族血统',
        options: [
          { id: 'black', name: '黑龙', damage: 'acid' },
          { id: 'blue', name: '蓝龙', damage: 'lightning' },
          { id: 'brass', name: '黄铜龙', damage: 'fire' },
          { id: 'bronze', name: '青铜龙', damage: 'lightning' },
          { id: 'copper', name: '赤铜龙', damage: 'acid' },
          { id: 'gold', name: '金龙', damage: 'fire' },
          { id: 'green', name: '绿龙', damage: 'poison' },
          { id: 'red', name: '红龙', damage: 'fire' },
          { id: 'silver', name: '银龙', damage: 'cold' },
          { id: 'white', name: '白龙', damage: 'cold' }
        ]
      }
    ],
    traits: [
      { name: '龙族血统', description: '选择一种龙，获得对应伤害的抗性和吐息武器。' },
      { name: '吐息武器', description: '使用一次吐息造成 2d6 对应伤害，豁免 DC = 8 + 体质调整 + 熟练加值。' }
    ]
  },
  {
    id: 'gnome',
    name: '侏儒',
    nameEn: 'Gnome',
    size: 'small',
    speed: 25,
    darkvision: 60,
    abilityBonuses: { fixed: { int: 2 } },
    languages: ['通用语', '侏儒语'],
    saveAdvantages: [{ abilities: ['int', 'wis', 'cha'], against: ['magic'], label: '侏儒狡黠' }],
    traits: [
      { name: '黑暗视觉', description: '你在 60 尺范围内看黑暗如同微光。' },
      { name: '侏儒狡黠', description: '对抗魔法的智力、感知和魅力豁免具有优势。' }
    ],
    subraces: [
      {
        id: 'forest-gnome',
        name: '森林侏儒',
        nameEn: 'Forest Gnome',
        abilityBonuses: { fixed: { dex: 1 } },
        traits: [{ name: '自然幻术', description: '你知道次级幻术戏法；智力是其施法属性。' }]
      },
      {
        id: 'rock-gnome',
        name: '岩石侏儒',
        nameEn: 'Rock Gnome',
        abilityBonuses: { fixed: { con: 1 } },
        traits: [{ name: '工匠之识', description: '涉及魔法物品、机械装置的历史检定获得双倍熟练加值。' }]
      }
    ]
  },
  {
    id: 'half-elf',
    name: '半精灵',
    nameEn: 'Half-Elf',
    size: 'medium',
    speed: 30,
    darkvision: 60,
    abilityBonuses: { fixed: { cha: 2 }, choose: { count: 2, amount: 1, exclude: ['cha'] } },
    languages: ['通用语', '精灵语'],
    languageChoices: 1,
    skillChoices: { count: 2, from: 'any' },
    saveAdvantages: [{ abilities: 'all', against: ['charm'], label: '精类血统' }],
    traits: [
      { name: '黑暗视觉', description: '你在 60 尺范围内看黑暗如同微光。' },
      { name: '精类血统', description: '对抗魅惑的豁免具有优势，魔法无法让你入睡。' },
      { name: '多才多艺', description: '两项属性各 +1（魅力除外），并获得两项自选技能。' }
    ]
  },
  {
    id: 'half-orc',
    name: '半兽人',
    nameEn: 'Half-Orc',
    size: 'medium',
    speed: 30,
    darkvision: 60,
    abilityBonuses: { fixed: { str: 2, con: 1 } },
    languages: ['通用语', '兽人语'],
    skillProficiencies: ['intimidation'],
    traits: [
      { name: '黑暗视觉', description: '你在 60 尺范围内看黑暗如同微光。' },
      { name: '凶悍', description: '熟练使用威吓技能。' },
      { name: '不屈坚韧', description: '每场长休一次，HP 降到 0 时可以改为 1。' },
      { name: '野蛮攻击', description: '近战暴击时额外掷一个武器伤害骰。' }
    ]
  },
  {
    id: 'tiefling',
    name: '提夫林',
    nameEn: 'Tiefling',
    size: 'medium',
    speed: 30,
    darkvision: 60,
    abilityBonuses: { fixed: { int: 1, cha: 2 } },
    languages: ['通用语', '炼狱语'],
    resistances: ['fire'],
    traits: [
      { name: '黑暗视觉', description: '你在 60 尺范围内看黑暗如同微光。' },
      { name: '炼狱抗性', description: '对火焰伤害有抗性。' },
      { name: '炼狱传承', description: '习得奇术，随等级获得炼狱诅咒与黑暗术。' }
    ]
  }
];

export const RACE_BY_ID = Object.fromEntries(SRD_RACES.map((race) => [race.id, race]));
