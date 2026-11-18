// 5e SRD 状态数据（SRD 5.1 / PHB 附录 A）。
//
// effects 描述“角色自己掷骰”时的修正：
//   target: attack | abilityCheck | save | initiative
//   abilities: 限定属性（缺省 = 全部）
//   skills: 限定技能
//   mode: advantage | disadvantage
//   autoFail: 自动失败（配合 when: requiresSight / requiresHearing）
// defense 描述“别人攻击角色”时的修正：
//   attacks: advantage | disadvantage；range: melee | ranged | all
// flags 供派生面板与战斗流程读取；不直接参与 d20 检定。

export const SRD_CONDITIONS = [
  {
    id: 'blinded',
    name: '目盲',
    nameEn: 'Blinded',
    summary: '看不见：你的攻击有劣势，对你攻击有优势，需要视觉的检定自动失败。',
    effects: [
      { target: 'attack', mode: 'disadvantage' },
      { target: 'abilityCheck', autoFail: true, when: 'requiresSight' }
    ],
    defense: [{ attacks: 'advantage' }],
    flags: { cannotSee: true }
  },
  {
    id: 'charmed',
    name: '魅惑',
    nameEn: 'Charmed',
    summary: '不能攻击魅惑者；魅惑者在与你社交时具有优势。',
    effects: [],
    defense: [],
    flags: { cannotAttackSource: true },
    notes: ['“不能攻击魅惑者”与“魅惑者社交优势”依赖具体对象，当前只记录状态，由剧情层处理。']
  },
  {
    id: 'deafened',
    name: '耳聋',
    nameEn: 'Deafened',
    summary: '听不见：需要听觉的检定自动失败。',
    effects: [{ target: 'abilityCheck', autoFail: true, when: 'requiresHearing' }],
    defense: [],
    flags: { cannotHear: true }
  },
  {
    id: 'frightened',
    name: '恐惧',
    nameEn: 'Frightened',
    summary: '恐惧源可见时，你的属性检定与攻击有劣势，且不能主动靠近。',
    effects: [
      { target: 'attack', mode: 'disadvantage' },
      { target: 'abilityCheck', mode: 'disadvantage' }
    ],
    defense: [],
    flags: { cannotApproachSource: true },
    notes: ['当前假定恐惧源在视线内；若不在视线内，应在情境修正里抵消这些劣势。']
  },
  {
    id: 'grappled',
    name: '被擒',
    nameEn: 'Grappled',
    summary: '速度为 0；挣脱需要运动或体操检定。',
    effects: [],
    defense: [],
    flags: { speedZero: true }
  },
  {
    id: 'incapacitated',
    name: '无力',
    nameEn: 'Incapacitated',
    summary: '不能执行动作、附赠动作或反应，也不能专注。',
    effects: [],
    defense: [],
    flags: { incapacitated: true, cannotConcentrate: true }
  },
  {
    id: 'invisible',
    name: '隐形',
    nameEn: 'Invisible',
    summary: '你的攻击有优势；对你攻击有劣势。',
    effects: [{ target: 'attack', mode: 'advantage' }],
    defense: [{ attacks: 'disadvantage' }],
    flags: { unseen: true }
  },
  {
    id: 'paralyzed',
    name: '麻痹',
    nameEn: 'Paralyzed',
    summary: '无力且不能移动；力量/敏捷豁免自动失败；5 尺内对你攻击必定暴击。',
    effects: [
      { target: 'save', abilities: ['str', 'dex'], autoFail: true },
      { target: 'attack', mode: 'disadvantage' }
    ],
    defense: [{ attacks: 'advantage', range: 'all' }],
    flags: { incapacitated: true, speedZero: true, cannotConcentrate: true, autoCritWithin5ft: true }
  },
  {
    id: 'petrified',
    name: '石化',
    nameEn: 'Petrified',
    summary: '无力、不能移动；力量/敏捷豁免自动失败；对你攻击有优势；获得全伤害抗性。',
    effects: [
      { target: 'save', abilities: ['str', 'dex'], autoFail: true },
      { target: 'attack', mode: 'disadvantage' }
    ],
    defense: [{ attacks: 'advantage', range: 'all' }],
    flags: {
      incapacitated: true,
      speedZero: true,
      cannotConcentrate: true,
      autoCritWithin5ft: true,
      resistanceAll: true
    }
  },
  {
    id: 'poisoned',
    name: '中毒',
    nameEn: 'Poisoned',
    summary: '攻击检定与属性检定具有劣势。',
    effects: [
      { target: 'attack', mode: 'disadvantage' },
      { target: 'abilityCheck', mode: 'disadvantage' }
    ],
    defense: [],
    flags: {}
  },
  {
    id: 'prone',
    name: '倒地',
    nameEn: 'Prone',
    summary: '只能爬行或起身；你的攻击有劣势；5 尺内对你攻击有优势，远程对你攻击有劣势。',
    effects: [{ target: 'attack', mode: 'disadvantage' }],
    defense: [
      { attacks: 'advantage', range: 'melee' },
      { attacks: 'disadvantage', range: 'ranged' }
    ],
    flags: { prone: true }
  },
  {
    id: 'restrained',
    name: '束缚',
    nameEn: 'Restrained',
    summary: '速度为 0；你的攻击与敏捷豁免有劣势；对你攻击有优势。',
    effects: [
      { target: 'attack', mode: 'disadvantage' },
      { target: 'save', abilities: ['dex'], mode: 'disadvantage' }
    ],
    defense: [{ attacks: 'advantage', range: 'all' }],
    flags: { speedZero: true }
  },
  {
    id: 'stunned',
    name: '震慑',
    nameEn: 'Stunned',
    summary: '无力、不能移动、说话困难；力量/敏捷豁免自动失败；对你攻击有优势。',
    effects: [
      { target: 'save', abilities: ['str', 'dex'], autoFail: true },
      { target: 'attack', mode: 'disadvantage' }
    ],
    defense: [{ attacks: 'advantage', range: 'all' }],
    flags: { incapacitated: true, speedZero: true, cannotConcentrate: true }
  },
  {
    id: 'unconscious',
    name: '昏迷',
    nameEn: 'Unconscious',
    summary: '倒地、无力、不能移动；力量/敏捷豁免自动失败；5 尺内对你攻击必定暴击。',
    effects: [
      { target: 'save', abilities: ['str', 'dex'], autoFail: true },
      { target: 'attack', mode: 'disadvantage' }
    ],
    defense: [{ attacks: 'advantage', range: 'all' }],
    flags: {
      incapacitated: true,
      speedZero: true,
      cannotConcentrate: true,
      autoCritWithin5ft: true,
      prone: true
    }
  }
];

export const CONDITION_BY_ID = Object.fromEntries(SRD_CONDITIONS.map((condition) => [condition.id, condition]));

// 力竭是累积的 1–6 级状态（PHB 附录 A）。第 2 级起速度减半，第 4 级 HP 上限减半，第 5 级速度 0，第 6 级死亡。
export const EXHAUSTION_LEVELS = [
  { level: 1, summary: '属性检定具有劣势。', effects: [{ target: 'abilityCheck', mode: 'disadvantage' }] },
  { level: 2, summary: '速度减半。', speedMultiplier: 0.5 },
  { level: 3, summary: '攻击检定与豁免具有劣势。', effects: [{ target: 'attack', mode: 'disadvantage' }, { target: 'save', mode: 'disadvantage' }] },
  { level: 4, summary: 'HP 上限减半。', hpMultiplier: 0.5 },
  { level: 5, summary: '速度为 0。', speedZero: true },
  { level: 6, summary: '死亡。', dead: true }
];
