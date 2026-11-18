import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ABILITY_IDS,
  SRD_RULES,
  RulesError,
  abilityModifier,
  addCondition,
  buildCheck,
  buildRules,
  checkOdds,
  createCharacter,
  d20Sequence,
  deserializeCharacter,
  passiveScore,
  proficiencyBonus,
  resolveCheck,
  resolveWeaponAttack,
  rollWeaponDamage,
  contentStats,
  getArmor,
  getItem,
  getMonster,
  getSpell,
  listItems,
  listMonsters,
  listSpells,
  searchContent,
  serializeCharacter,
  sequenceRng,
  wordBonusFromMemory
} from '../game/src/rules/index.js';

const FIGHTER_SPEC = {
  name: '测试战士',
  level: 1,
  race: 'human',
  class: 'fighter',
  background: 'soldier',
  abilityMethod: 'standard-array',
  baseAbilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  extraLanguages: ['矮人语'],
  skillChoices: ['history', 'perception'],
  armor: 'chain-mail',
  shield: true
};

function fighter(patch = {}) {
  return createCharacter({ ...FIGHTER_SPEC, ...patch });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error instanceof RulesError && error.code === code);
}

test('属性调整值遵循 floor((属性 - 10) / 2)', () => {
  const table = { 3: -4, 8: -1, 9: -1, 10: 0, 11: 0, 12: 1, 15: 2, 16: 3, 20: 5 };
  for (const [score, expected] of Object.entries(table)) {
    assert.equal(abilityModifier(Number(score)), expected);
  }
});

test('熟练加值按 1–20 级分段', () => {
  assert.equal(proficiencyBonus(1), 2);
  assert.equal(proficiencyBonus(4), 2);
  assert.equal(proficiencyBonus(5), 3);
  assert.equal(proficiencyBonus(9), 4);
  assert.equal(proficiencyBonus(13), 5);
  assert.equal(proficiencyBonus(17), 6);
  assert.equal(proficiencyBonus(20), 6);
});

test('购点：27 点预算、8–15 范围与超预算错误', () => {
  const valid = createCharacter({
    ...FIGHTER_SPEC,
    abilityMethod: 'point-buy',
    baseAbilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }
  });
  assert.equal(valid.sheet.pointBuy.total, 27);
  assert.equal(valid.sheet.pointBuy.remaining, 0);

  expectCode(
    () =>
      createCharacter({
        ...FIGHTER_SPEC,
        abilityMethod: 'point-buy',
        baseAbilities: { str: 15, dex: 15, con: 15, int: 15, wis: 15, cha: 8 }
      }),
    'POINT_BUY_BUDGET'
  );
  expectCode(
    () =>
      createCharacter({
        ...FIGHTER_SPEC,
        abilityMethod: 'point-buy',
        baseAbilities: { str: 16, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }
      }),
    'POINT_BUY_RANGE'
  );
});

test('标准数组必须恰好使用 15/14/13/12/10/8', () => {
  expectCode(
    () =>
      createCharacter({
        ...FIGHTER_SPEC,
        abilityMethod: 'standard-array',
        baseAbilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 10 }
      }),
    'STANDARD_ARRAY_MISMATCH'
  );
});

test('种族与子种族加值叠加：丘陵矮人 +2 体质 +1 感知', () => {
  const dwarf = createCharacter({
    ...FIGHTER_SPEC,
    race: 'dwarf',
    subrace: 'hill-dwarf',
    extraLanguages: [],
    abilityMethod: 'free',
    baseAbilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }
  });
  assert.equal(dwarf.sheet.abilityScores.con, 15);
  assert.equal(dwarf.sheet.abilityScores.wis, 11);
  assert.equal(dwarf.sheet.racialBonuses.con, 2);
  assert.equal(dwarf.sheet.racialBonuses.wis, 1);
});

test('半精灵自选两项 +1，不能选魅力且必须选满', () => {
  const elf = createCharacter({
    ...FIGHTER_SPEC,
    race: 'half-elf',
    racialBonusChoices: ['str', 'con'],
    skillChoices: ['history', 'perception', 'acrobatics', 'investigation'],
    extraLanguages: ['矮人语']
  });
  assert.equal(elf.sheet.abilityScores.str, 16);
  assert.equal(elf.sheet.abilityScores.con, 14);
  assert.equal(elf.sheet.abilityScores.cha, 10); // 8 + 2，不额外 +1

  expectCode(
    () =>
      createCharacter({
        ...FIGHTER_SPEC,
        race: 'half-elf',
        racialBonusChoices: ['cha', 'str'],
        skillChoices: ['history', 'perception', 'acrobatics', 'investigation'],
        extraLanguages: ['矮人语']
      }),
    'RACIAL_CHOICE_INVALID'
  );
  expectCode(
    () =>
      createCharacter({
        ...FIGHTER_SPEC,
        race: 'half-elf',
        racialBonusChoices: ['str'],
        skillChoices: ['history', 'perception', 'acrobatics', 'investigation'],
        extraLanguages: ['矮人语']
      }),
    'RACIAL_CHOICE_COUNT'
  );
});

test('自定义种族（房规）与自定义效果可以注入', () => {
  const rules = buildRules({
    races: [
      {
        id: 'moon-kin',
        name: '月族',
        nameEn: 'Moon Kin',
        size: 'medium',
        speed: 35,
        darkvision: 90,
        abilityBonuses: { fixed: { wis: 2, cha: 1 } },
        languages: ['通用语', '月语']
      }
    ]
  });
  const moon = createCharacter(
    {
      ...FIGHTER_SPEC,
      race: 'moon-kin',
      skillChoices: ['history', 'perception'],
      extraLanguages: [],
      effects: [
        {
          id: 'moon-blessing',
          label: '月之祝福',
          modifiers: [
            { target: 'ac', value: 1 },
            { target: 'skill.stealth', value: 2 },
            { target: 'hpMax', value: 5 }
          ]
        }
      ]
    },
    rules
  );
  assert.equal(moon.sheet.abilityScores.wis, 12);
  assert.equal(moon.sheet.speed, 35);
  assert.equal(moon.sheet.armorClass, 19); // 链甲 16 + 盾 2 + 月之祝福 1
  assert.equal(moon.sheet.skills.stealth.total, 4);
  assert.equal(moon.sheet.hitPoints.max, 16); // 战士 d10 + 体质 1 + 月之祝福 5
});

test('背景固定技能 + 职业自选技能；重复技能报错', () => {
  const sheet = fighter().sheet;
  assert.equal(sheet.skills.athletics.proficient, true); // 士兵
  assert.equal(sheet.skills.intimidation.proficient, true); // 士兵
  assert.equal(sheet.skills.history.proficient, true); // 自选
  assert.equal(sheet.skills.perception.proficient, true); // 自选
  assert.equal(sheet.skills.stealth.proficient, false);

  expectCode(
    () => fighter({ skillChoices: ['athletics', 'perception'] }),
    'SKILL_ALREADY_PROFICIENT'
  );
  expectCode(
    () => fighter({ skillChoices: ['history'] }),
    'SKILL_CHOICE_COUNT'
  );
  expectCode(
    () => fighter({ skillChoices: ['history', 'arcana'] }),
    'SKILL_NOT_ALLOWED'
  );
});

test('游荡者 1 级专精：双倍熟练加值', () => {
  const rogue = createCharacter({
    ...FIGHTER_SPEC,
    class: 'rogue',
    background: 'criminal',
    skillChoices: ['acrobatics', 'athletics', 'insight', 'perception'],
    expertiseChoices: ['stealth', 'perception'],
    armor: 'leather',
    shield: false
  });
  assert.equal(rogue.sheet.skills.stealth.proficient, true);
  assert.equal(rogue.sheet.skills.stealth.expertise, true);
  assert.equal(rogue.sheet.skills.stealth.total, 2 + 4); // 敏捷 +2，专精 +4
  assert.equal(rogue.sheet.skills.athletics.total, 3 + 2); // 力量 +3，熟练 +2（未专精）
  assert.equal(rogue.sheet.proficiencyBonus, 2);

  expectCode(
    () =>
      createCharacter({
        ...FIGHTER_SPEC,
        class: 'rogue',
        background: 'criminal',
        skillChoices: ['acrobatics', 'athletics', 'insight', 'perception'],
        expertiseChoices: ['stealth'],
        armor: 'leather',
        shield: false
      }),
    'EXPERTISE_COUNT'
  );
});

test('AC：无甲、轻甲、重甲、盾牌与力量需求', () => {
  const base = fighter({ armor: 'none', shield: false });
  assert.equal(base.sheet.armorClass, 12); // 10 + 敏捷 2

  const leather = fighter({ armor: 'leather', shield: false });
  assert.equal(leather.sheet.armorClass, 13);

  const chain = fighter({ armor: 'chain-mail', shield: true });
  assert.equal(chain.sheet.armorClass, 18); // 16 + 0 + 2

  const weak = createCharacter({
    ...FIGHTER_SPEC,
    baseAbilities: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 },
    armor: 'chain-mail',
    shield: false
  });
  assert.equal(weak.sheet.speed, 20); // 30 - 10
  assert.ok(weak.sheet.warnings.some((warning) => warning.includes('力量 13')));

  const dwarf = createCharacter({
    ...FIGHTER_SPEC,
    race: 'dwarf',
    subrace: 'hill-dwarf',
    baseAbilities: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 },
    armor: 'chain-mail',
    shield: false,
    extraLanguages: []
  });
  assert.equal(dwarf.sheet.speed, 25); // 矮人穿重甲不减速
});

test('未受训护甲：力量/敏捷检定、豁免与攻击劣势，并阻止施法', () => {
  const wizard = createCharacter({
    ...FIGHTER_SPEC,
    class: 'wizard',
    background: 'sage',
    skillChoices: ['insight', 'investigation'],
    armor: 'chain-mail',
    shield: false
  });
  assert.equal(wizard.sheet.armorProficient, false);
  assert.equal(wizard.sheet.spellcastingBlocked, true);
  const check = buildCheck(wizard, { kind: 'abilityCheck', ability: 'dex', dc: 10 });
  assert.equal(check.mode, 'disadvantage');
  assert.ok(check.disadvantageSources.some((source) => source.source === 'armor:unproficient'));
});

test('HP：1 级取生命骰满值，后续等级用平均值；丘陵矮人每级 +1', () => {
  const level1 = fighter();
  assert.deepEqual(level1.sheet.hitPoints, { max: 12, current: 12, base: 12 }); // d10 + 体质 2

  const level3 = fighter({ level: 3 });
  assert.equal(level3.sheet.hitPoints.max, 12 + 2 * (6 + 2)); // 平均 6 + 体质 2

  const hillDwarf = createCharacter({
    ...FIGHTER_SPEC,
    race: 'dwarf',
    subrace: 'hill-dwarf',
    level: 3,
    extraLanguages: []
  });
  assert.equal(hillDwarf.sheet.hpPerLevel, 1);
  assert.equal(hillDwarf.sheet.hitPoints.max, 12 + 2 * (6 + 2) + 3);
});

test('野蛮人/武僧无甲防御，武僧持盾时失效', () => {
  const barbarian = createCharacter({
    ...FIGHTER_SPEC,
    class: 'barbarian',
    abilityMethod: 'standard-array',
    baseAbilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    skillChoices: ['perception', 'survival'],
    armor: 'none',
    shield: false
  });
  assert.equal(barbarian.sheet.armorClass, 10 + 2 + 2); // 10 + 敏捷 2 + 体质 2

  const monk = createCharacter({
    ...FIGHTER_SPEC,
    class: 'monk',
    skillChoices: ['history', 'insight'],
    armor: 'none',
    shield: false
  });
  assert.equal(monk.sheet.armorClass, 10 + 2 + 0); // 10 + 敏捷 2 + 感知 0

  const monkWithShield = createCharacter({
    ...FIGHTER_SPEC,
    class: 'monk',
    skillChoices: ['history', 'insight'],
    armor: 'none',
    shield: true
  });
  assert.equal(monkWithShield.sheet.armorClass, 14); // 无甲防御失效，退回 10 + 敏捷 + 盾牌 2
});

test('状态：中毒给攻击/属性检定劣势，束缚给敏捷豁免劣势', () => {
  const poisoned = addCondition(fighter(), 'poisoned');
  const attack = buildCheck(poisoned, { kind: 'attack', ability: 'str', proficient: true, targetAc: 15 });
  assert.equal(attack.mode, 'disadvantage');
  const ability = buildCheck(poisoned, { kind: 'abilityCheck', ability: 'str', dc: 10 });
  assert.equal(ability.mode, 'disadvantage');
  const save = buildCheck(poisoned, { kind: 'save', ability: 'con', dc: 10 });
  assert.equal(save.mode, 'normal'); // 中毒不直接影响豁免

  const restrained = addCondition(fighter(), 'restrained');
  assert.equal(buildCheck(restrained, { kind: 'save', ability: 'dex', dc: 10 }).mode, 'disadvantage');
  assert.equal(buildCheck(restrained, { kind: 'save', ability: 'con', dc: 10 }).mode, 'normal');
  assert.equal(restrained.sheet.defenses.melee.attackers, 'advantage');
});

test('状态：麻痹/昏迷的力量与敏捷豁免自动失败；目盲的视觉检定自动失败', () => {
  const paralyzed = addCondition(fighter(), 'paralyzed');
  const save = resolveCheck(paralyzed, { kind: 'save', ability: 'str', dc: 5, rng: d20Sequence([20]) });
  assert.equal(save.autoFail, true);
  assert.equal(save.success, false);

  const blinded = addCondition(fighter(), 'blinded');
  const sight = resolveCheck(blinded, { kind: 'skill', skill: 'perception', dc: 5, requiresSight: true, rng: d20Sequence([20]) });
  assert.equal(sight.autoFail, true);
  assert.equal(sight.success, false);
  const noSight = buildCheck(blinded, { kind: 'skill', skill: 'perception', dc: 5 });
  assert.equal(noSight.autoFail, false);
});

test('力竭是累积状态：1 级检定劣势、2 级速度减半、3 级攻击豁免劣势、4 级 HP 减半', () => {
  const exhausted = fighter({ exhaustion: 3 });
  assert.equal(buildCheck(exhausted, { kind: 'abilityCheck', ability: 'str', dc: 10 }).mode, 'disadvantage');
  assert.equal(buildCheck(exhausted, { kind: 'attack', ability: 'str', targetAc: 10 }).mode, 'disadvantage');
  assert.equal(buildCheck(exhausted, { kind: 'save', ability: 'con', dc: 10 }).mode, 'disadvantage');
  assert.equal(exhausted.sheet.speed, 15); // 30 * 0.5

  const halfHp = fighter({ exhaustion: 4 });
  assert.equal(halfHp.sheet.hitPoints.max, 6);
});

test('优势与劣势互相抵消；多个优势不叠加', () => {
  const poisoned = addCondition(fighter(), 'poisoned');
  const check = buildCheck(poisoned, {
    kind: 'abilityCheck',
    ability: 'str',
    dc: 10,
    situational: [{ source: 'help', label: '协助', type: 'advantage' }]
  });
  assert.equal(check.mode, 'normal');
  assert.equal(check.cancelled, true);

  const twoAdvantages = buildCheck(fighter(), {
    kind: 'abilityCheck',
    ability: 'str',
    dc: 10,
    situational: [
      { source: 'help', label: '协助', type: 'advantage' },
      { source: 'high-ground', label: '高地', type: 'advantage' }
    ]
  });
  assert.equal(twoAdvantages.mode, 'advantage');
  assert.equal(twoAdvantages.advantageSources.length, 2);
});

test('检定加值与算式：属性 + 熟练 + 情境 + 单词', () => {
  const check = resolveCheck(fighter(), {
    kind: 'skill',
    skill: 'athletics',
    dc: 15,
    wordBonus: 2,
    situational: [{ label: '掩体', value: 2 }],
    rng: d20Sequence([10])
  });
  assert.equal(check.total, 10 + 3 + 2 + 4); // d20 + 力量 + 熟练 + 情境 + 单词
  assert.equal(check.success, true);
  assert.match(check.formula, /1d20\(10\)/);
  assert.match(check.formula, /力量/);
  assert.match(check.formula, /单词·熟练/);
  assert.match(check.formula, /掩体/);
  assert.ok(check.breakdown.some((entry) => entry.key === 'word' && entry.value === 2));
});

test('属性检定与豁免不适用自然 20/1 自动成功/失败规则', () => {
  const check = resolveCheck(fighter(), {
    kind: 'abilityCheck',
    ability: 'cha',
    dc: 30,
    rng: d20Sequence([20])
  });
  assert.equal(check.natural, 20);
  assert.equal(check.success, false);

  const save = resolveCheck(fighter(), { kind: 'save', ability: 'int', dc: 30, rng: d20Sequence([20]) });
  assert.equal(save.success, false);
});

test('攻击只给 AC、不给 DC 时，算式仍然按 AC 结算', () => {
  const attack = resolveCheck(fighter(), {
    kind: 'attack',
    ability: 'str',
    proficient: true,
    targetAc: 10,
    rng: d20Sequence([10])
  });
  assert.match(attack.formula, /AC 10/);
  assert.doesNotMatch(attack.formula, /DC/);
  assert.equal(attack.success, true);
});

test('攻击的自然 1 必失手、自然 20 必命中并暴击', () => {
  const miss = resolveCheck(fighter(), {
    kind: 'attack',
    ability: 'str',
    proficient: true,
    targetAc: 1,
    rng: d20Sequence([1])
  });
  assert.equal(miss.criticalMiss, true);
  assert.equal(miss.success, false);

  const crit = resolveCheck(fighter(), {
    kind: 'attack',
    ability: 'str',
    proficient: true,
    targetAc: 30,
    rng: d20Sequence([20])
  });
  assert.equal(crit.critical, true);
  assert.equal(crit.success, true);
});

test('半身人幸运：自然 1 重投一次', () => {
  const halfling = createCharacter({
    ...FIGHTER_SPEC,
    race: 'halfling',
    subrace: 'lightfoot',
    baseAbilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    extraLanguages: [],
    skillChoices: ['history', 'perception']
  });
  const check = resolveCheck(halfling, {
    kind: 'abilityCheck',
    ability: 'str',
    dc: 10,
    rng: d20Sequence([1, 15])
  });
  assert.equal(check.luckReroll, true);
  assert.equal(check.natural, 15);
  assert.equal(check.success, true);

  const human = resolveCheck(fighter(), {
    kind: 'abilityCheck',
    ability: 'str',
    dc: 10,
    rng: d20Sequence([1])
  });
  assert.equal(human.luckReroll, false);
  assert.equal(human.success, false);
});

test('种族对抗特定效果的豁免优势必须由 context 触发', () => {
  const dwarf = createCharacter({
    ...FIGHTER_SPEC,
    race: 'dwarf',
    subrace: 'hill-dwarf',
    extraLanguages: []
  });
  const withPoison = buildCheck(dwarf, { kind: 'save', ability: 'con', dc: 13, context: ['poison'] });
  assert.equal(withPoison.mode, 'advantage');
  assert.ok(withPoison.advantageSources.some((source) => source.source === 'trait:矮人韧性'));

  const withoutContext = buildCheck(dwarf, { kind: 'save', ability: 'con', dc: 13 });
  assert.equal(withoutContext.mode, 'normal');

  const elf = createCharacter({
    ...FIGHTER_SPEC,
    race: 'half-elf',
    racialBonusChoices: ['str', 'con'],
    skillChoices: ['history', 'perception', 'acrobatics', 'investigation'],
    extraLanguages: ['矮人语']
  });
  assert.equal(buildCheck(elf, { kind: 'save', ability: 'wis', dc: 13, context: ['charm'] }).mode, 'advantage');
});

test('被动检定：10 + 修正；劣势 -5、优势 +5', () => {
  const base = fighter();
  assert.equal(passiveScore(base, { kind: 'skill', skill: 'perception' }), 10 + 0 + 2); // 感知 0 + 熟练 2
  assert.equal(base.sheet.passivePerception, 10 + 2);
  const poisoned = addCondition(base, 'poisoned');
  assert.equal(passiveScore(poisoned, { kind: 'skill', skill: 'perception' }), 10 + 2 - 5);
  assert.equal(poisoned.sheet.passivePerception, 10 + 2 - 5);
  const helped = buildCheck(base, {
    kind: 'skill',
    skill: 'perception',
    situational: [{ source: 'help', label: '协助', type: 'advantage' }]
  });
  assert.equal(helped.mode, 'advantage');
});

test('单词加值提高成功率，但不保证成功', () => {
  const base = fighter({ armor: 'none', shield: false });
  const none = checkOdds(base, { kind: 'skill', skill: 'athletics', dc: 20 });
  const mastered = checkOdds(base, { kind: 'skill', skill: 'athletics', dc: 20, wordBonus: 3 });
  assert.ok(mastered.chance > none.chance);
  assert.ok(mastered.chance < 1);

  const impossible = resolveCheck(base, {
    kind: 'skill',
    skill: 'athletics',
    dc: 30,
    wordBonus: 3,
    rng: d20Sequence([20])
  });
  assert.equal(impossible.success, false);

  assert.equal(wordBonusFromMemory({ stage: 0, spelling: { stage: 0 } }), 0);
  assert.equal(wordBonusFromMemory({ stage: 3, spelling: { stage: 2 } }), 3);
  assert.equal(wordBonusFromMemory({ stage: 3, spelling: { stage: 1 } }), 2);
});

test('角色序列化只保存构建输入，反序列化重新计算派生值', () => {
  const original = addCondition(fighter({ exhaustion: 1, currentHp: 7 }), 'poisoned');
  const payload = serializeCharacter(original);
  assert.deepEqual(Object.keys(payload).sort(), ['spec', 'version']);
  assert.equal(payload.spec.conditions.includes('poisoned'), true);

  const restored = deserializeCharacter(payload);
  assert.deepEqual(restored.sheet.abilityScores, original.sheet.abilityScores);
  assert.equal(restored.sheet.armorClass, original.sheet.armorClass);
  assert.equal(restored.sheet.exhaustion.level, 1);
  assert.equal(restored.sheet.hitPoints.current, 7);
  assert.ok(restored.sheet.conditions.some((condition) => condition.id === 'poisoned'));
});

test('非法输入抛出带 code 的 RulesError', () => {
  expectCode(() => createCharacter({ ...FIGHTER_SPEC, level: 0 }), 'LEVEL_RANGE');
  expectCode(() => createCharacter({ ...FIGHTER_SPEC, race: 'not-a-race' }), 'REFERENCE_NOT_FOUND');
  expectCode(() => createCharacter({ ...FIGHTER_SPEC, conditions: ['not-a-condition'] }), 'CONDITION_UNKNOWN');
  expectCode(
    () => createCharacter({ ...FIGHTER_SPEC, extraLanguages: ['矮人语', '兽人语'] }),
    'LANGUAGE_CHOICE_COUNT'
  );
});

test('SRD 规则集包含 9 个种族、12 个职业、18 项技能、13 个状态', () => {
  assert.equal(SRD_RULES.races.length, 9);
  assert.equal(SRD_RULES.classes.length, 12);
  assert.equal(SRD_RULES.skills.length, 18);
  assert.equal(SRD_RULES.conditions.length, 14);
  assert.equal(ABILITY_IDS.length, 6);
});


// ---------------------------------------------------------------------------
// Foundry dnd5e SRD 内容导入
// ---------------------------------------------------------------------------

const CONTENT_FIGHTER_SPEC = {
  ...FIGHTER_SPEC,
  armor: 'none',
  shield: false,
  armorItem: 'chain-mail',
  shieldItem: 'shield',
  weapon: 'longsword',
  inventory: ['longsword', 'chain-mail', 'shield'],
  spells: ['bless']
};

test('Foundry 内容层：法术/物品/怪物数量与已知条目', () => {
  const stats = contentStats();
  assert.equal(stats.spells, 319);
  assert.equal(stats.items, 885);
  assert.equal(stats.monsters, 340);
  assert.equal(stats.weapons, 277);
  assert.equal(stats.armor, 92);

  const bless = getSpell('bless');
  assert.equal(bless.level, 1);
  assert.equal(bless.school, 'enc');
  assert.equal(bless.concentration, true);

  const longsword = getItem('longsword');
  assert.equal(longsword.kind, 'weapon');
  assert.equal(longsword.weapon.damage.formula, '1d8');
  assert.deepEqual(longsword.weapon.damage.types, ['slashing']);

  const chain = getArmor('chain-mail');
  assert.equal(chain.armor.baseAc, 16);
  assert.equal(chain.armor.dexCap, 0);
  assert.equal(chain.armor.strength, 13);
  assert.equal(chain.armor.stealthDisadvantage, true);

  const goblin = getMonster('goblin-warrior');
  assert.equal(goblin.ac, 15);
  assert.equal(goblin.hp.max, 7);
  assert.equal(goblin.cr, 0.25);
  assert.ok(goblin.actions.some((action) => action.name === 'Scimitar' && action.attack.toHit === 4));
});

test('内容筛选与搜索', () => {
  const cantrips = listSpells({ level: 0 });
  assert.ok(cantrips.length > 10);
  assert.ok(cantrips.some((spell) => spell.id === 'fire-bolt'));

  const heavyArmor = listItems({ kind: 'armor', category: 'heavy' });
  assert.ok(heavyArmor.some((item) => item.id === 'chain-mail'));

  const lowCr = listMonsters({ crMax: 0.5 });
  assert.ok(lowCr.some((monster) => monster.id === 'goblin-warrior'));

  const hits = searchContent('fire bolt');
  assert.ok(hits.some((hit) => hit.type === 'spell' && hit.entry.id === 'fire-bolt'));
});

test('角色内容：背包、装备武器/护甲、法术书', () => {
  const character = createCharacter(CONTENT_FIGHTER_SPEC);
  const { sheet } = character;
  assert.equal(sheet.armorClass, 18); // 链甲 16 + 盾 2，重甲不加深敏
  assert.equal(sheet.armor.foundry, true);
  assert.equal(sheet.weapon.id, 'longsword');
  assert.equal(sheet.weapon.damage.formula, '1d8');
  assert.equal(sheet.inventory.items.length, 3);
  assert.equal(sheet.inventory.totalWeight, 64);
  assert.equal(sheet.inventory.totalValueGp, 100);
  assert.equal(sheet.spells.length, 1);
  assert.equal(sheet.spells[0].id, 'bless');
  assert.deepEqual(sheet.spellbook.byLevel, { 1: ['bless'] });
});

test('Foundry 护甲参与 AC：链甲 16、敏捷上限 0、盾牌 +2、未受训惩罚', () => {
  const fighterChar = createCharacter(CONTENT_FIGHTER_SPEC);
  assert.equal(fighterChar.sheet.armorClass, 18);

  const wizardChar = createCharacter({
    ...CONTENT_FIGHTER_SPEC,
    class: 'wizard',
    background: 'sage',
    skillChoices: ['insight', 'investigation'],
    spells: ['bless', 'fire-bolt']
  });
  assert.equal(wizardChar.sheet.armorProficient, false);
  assert.ok(wizardChar.sheet.warnings.some((warning) => warning.includes('未受训')));
});

test('武器伤害：长剑 1d8+力量；暴击翻倍伤害骰', () => {
  const character = createCharacter(CONTENT_FIGHTER_SPEC);
  const normal = rollWeaponDamage(character, { rng: sequenceRng([0]) });
  assert.equal(normal.formula, '1d8+3');
  assert.equal(normal.total, 1 + 3);
  assert.equal(normal.type, 'slashing');

  const critical = rollWeaponDamage(character, { critical: true, rng: sequenceRng([0, 0.5]) });
  assert.equal(critical.formula, '2d8+3');
  assert.equal(critical.total, 1 + 5 + 3);
  assert.equal(critical.critical, true);
});

test('武器攻击：命中后掷伤害，未命中时没有伤害', () => {
  const character = createCharacter(CONTENT_FIGHTER_SPEC);
  const hit = resolveWeaponAttack(character, { targetAc: 15, proficient: true, rng: d20Sequence([10]) });
  assert.equal(hit.check.success, true);
  assert.ok(hit.damage);
  assert.equal(hit.damage.weaponId, 'longsword');

  const miss = resolveWeaponAttack(character, { targetAc: 30, proficient: true, rng: d20Sequence([2]) });
  assert.equal(miss.check.success, false);
  assert.equal(miss.damage, null);
});

test('未知内容 id 抛出 CONTENT_UNKNOWN', () => {
  expectCode(
    () => createCharacter({ ...CONTENT_FIGHTER_SPEC, inventory: ['not-an-item'] }),
    'CONTENT_UNKNOWN'
  );
  expectCode(
    () => createCharacter({ ...CONTENT_FIGHTER_SPEC, spells: ['not-a-spell'] }),
    'CONTENT_UNKNOWN'
  );
});

test('内容 ID 随角色存档保存，反序列化后重新解析', () => {
  const character = createCharacter(CONTENT_FIGHTER_SPEC);
  const payload = serializeCharacter(character);
  assert.equal(payload.spec.weapon, 'longsword');
  assert.deepEqual(payload.spec.spells, ['bless']);
  const restored = deserializeCharacter(payload);
  assert.equal(restored.sheet.weapon.id, 'longsword');
  assert.equal(restored.sheet.spells[0].id, 'bless');
  assert.equal(restored.sheet.inventory.items.length, 3);
});
