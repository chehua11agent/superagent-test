// 5e 角色创建与派生数值。
//
// 设计原则（与 rpg 技能一致）：
//   1. 基础属性、种族/职业/背景选择、装备、状态是“构建输入”（spec），可序列化；
//   2. 派生数值（AC/HP/技能/豁免/被动感知等）每次从输入重算，不写回基础值；
//   3. 所有数值修正带来源，条件与临时效果只进入修正层。
import {
  ABILITY_IDS,
  STANDARD_ARRAY,
  abilityModifier,
  formatModifier,
  pointBuyTotal,
  POINT_BUY_TOTAL,
  proficiencyBonus
} from './abilities.js';
import { fail } from './errors.js';
import { normalizeModifier, resolveRollMode, sumFlat } from './modifiers.js';
import { conditionFlags, conditionRollEffects, defenseProfile, exhaustionRollEffects, exhaustionState } from './conditions.js';
import { resolveReference, SRD_RULES } from './rules.js';
import { SKILL_BY_ID, SKILLS } from './skills.js';

const ABILITY_CAP = 20;

export function createCharacter(spec = {}, rules = SRD_RULES, options = {}) {
  const abilityCap = options.abilityCap ?? ABILITY_CAP;
  const normalized = normalizeSpec(spec);
  const race = resolveReference(rules.races, normalized.race, '种族');
  const subrace = normalized.subrace ? findSubrace(race, normalized.subrace) : null;
  const klass = resolveReference(rules.classes, normalized.class, '职业');
  const background = resolveReference(rules.backgrounds, normalized.background, '背景');
  const level = normalized.level;

  if (!Number.isInteger(level) || level < 1 || level > 20) {
    fail('LEVEL_RANGE', '等级必须是 1–20 的整数', { level });
  }
  if (!Number.isInteger(klass.hitDie) || klass.hitDie < 1 || klass.hitDie > 20) {
    fail('CLASS_INVALID', `职业 ${klass.name} 缺少有效的生命骰`, { class: klass.id, hitDie: klass.hitDie });
  }
  if (race.speed !== undefined && (!Number.isFinite(race.speed) || race.speed < 0)) {
    fail('RACE_INVALID', `种族 ${race.name} 的速度无效`, { race: race.id, speed: race.speed });
  }
  const pb = proficiencyBonus(level);

  // ---- 属性 ----
  const baseAbilities = validateBaseAbilities(normalized);
  const pointBuy = normalized.abilityMethod === 'point-buy'
    ? { total: pointBuyTotal(baseAbilities), remaining: POINT_BUY_TOTAL - pointBuyTotal(baseAbilities) }
    : null;
  const racialChoice = computeRacialBonuses(race, subrace, normalized.racialBonusChoices);
  const abilityScores = {};
  const abilityMods = {};
  for (const id of ABILITY_IDS) {
    const score = baseAbilities[id] + racialChoice.bonuses[id];
    if (abilityCap !== null && score > abilityCap) {
      fail('ABILITY_CAP', `属性 ${id.toUpperCase()} 最终值 ${score} 超过上限 ${abilityCap}`, {
        ability: id,
        score,
        cap: abilityCap
      });
    }
    abilityScores[id] = score;
    abilityMods[id] = abilityModifier(score);
  }

  // ---- 种族分支（龙裔血统等）----
  const raceChoiceResult = resolveRaceChoices(race, subrace, normalized.raceChoices);

  // ---- 技能熟练 ----
  const skillResolution = resolveSkillProficiencies({
    klass,
    race,
    subrace,
    background,
    chosen: normalized.skillChoices,
    expertise: normalized.expertiseChoices,
    rules
  });

  // ---- 语言 ----
  const languageResolution = resolveLanguages({
    race,
    subrace,
    background,
    extra: normalized.extraLanguages,
    autoExtra: raceChoiceResult.languages
  });

  // ---- 护甲与防御 ----
  const armor = normalized.armor
    ? resolveReference(rules.armor, normalized.armor, '护甲')
    : resolveReference(rules.armor, 'none', '护甲');
  const armorProficiencies = unique([
    ...(klass.armorProficiencies ?? []),
    ...(race.armorProficiencies ?? []),
    ...(subrace?.armorProficiencies ?? [])
  ]);
  const shieldProficient = armorProficiencies.includes('shield');
  const armorProficient =
    armor.category === 'none' ||
    armor.category === 'shield' ||
    armorProficiencies.includes(armor.category);
  const shieldEquipped = Boolean(normalized.shield);
  if (armor.category !== 'none' && armor.category !== 'shield' && !Number.isFinite(armor.baseAc)) {
    fail('ARMOR_INVALID', `护甲 ${armor.name} 缺少 baseAc`, { armor: armor.id });
  }
  const armorPenalty = armor.category !== 'none' && !armorProficient;
  const shieldPenalty = shieldEquipped && !shieldProficient;
  const armorUnproficient = armorPenalty || shieldPenalty;

  const unarmoredDefense = klass.unarmoredDefense ?? null;
  const canUseUnarmoredDefense =
    unarmoredDefense &&
    armor.category === 'none' &&
    (!shieldEquipped || unarmoredDefense.allowShield);
  let armorClass;
  if (canUseUnarmoredDefense) {
    armorClass =
      10 +
      unarmoredDefense.abilities.reduce((total, id) => total + abilityMods[id], 0) +
      (shieldEquipped && unarmoredDefense.allowShield ? 2 : 0);
  } else if (armor.category === 'none') {
    armorClass = 10 + abilityMods.dex + (shieldEquipped ? 2 : 0);
  } else {
    const dexContribution = armor.dexCap === 0 ? 0 : Math.min(abilityMods.dex, armor.dexCap ?? Number.POSITIVE_INFINITY);
    armorClass = armor.baseAc + dexContribution + (shieldEquipped ? 2 : 0);
  }

  // ---- 临时效果 ----
  const effectResolution = normalizeEffects(normalized.effects);

  // ---- 速度与 HP ----
  const conditionList = normalized.conditions.map((id) => {
    const found = rules.conditions.find((entry) => entry.id === id);
    if (!found) fail('CONDITION_UNKNOWN', `找不到状态：${id}`, { condition: id });
    return found;
  });
  const flags = conditionFlags(conditionList);
  const exhaustion = exhaustionState(normalized.exhaustion);
  const lucky = Boolean(race.lucky || subrace?.lucky);
  const hpPerLevel = (race.hpPerLevel ?? 0) + (subrace?.hpPerLevel ?? 0);

  const hpFlat = sumFlat(
    effectResolution.modifiers.filter((modifier) => modifier.target === 'hpMax' && modifier.type === 'flat')
  );
  const maxHpBase = computeMaxHp({
    level,
    hitDie: klass.hitDie,
    conMod: abilityMods.con,
    hpPerLevel,
    hpRolls: normalized.hpRolls
  }) + hpFlat;
  const maxHp = Math.max(1, Math.floor(maxHpBase * exhaustion.hpMultiplier));
  const currentHp = normalized.currentHp === null ? maxHp : clamp(normalized.currentHp, 0, maxHp);
  if (normalized.currentHp !== null && (normalized.currentHp < 0 || normalized.currentHp > maxHp)) {
    fail('HP_RANGE', `当前 HP 必须在 0–${maxHp} 之间`, { currentHp: normalized.currentHp, maxHp });
  }

  const speedBase =
    (subrace?.speed ?? race.speed ?? 30) +
    sumFlat(effectResolution.modifiers.filter((modifier) => modifier.target === 'speed' && modifier.type === 'flat'));
  const strengthPenalty =
    armor.strengthReq && abilityScores.str < armor.strengthReq && !race.ignoreHeavyArmorSpeedPenalty ? 10 : 0;
  let speed = speedBase - strengthPenalty;
  if (exhaustion.speedMultiplier !== 1) speed = Math.floor(speed * exhaustion.speedMultiplier);
  if (exhaustion.speedZero || flags.speedZero) speed = 0;
  speed = Math.max(0, speed);

  // ---- 熟练加值与技能/豁免 ----
  const skills = {};
  for (const skill of SKILLS) {
    const proficient = skillResolution.proficient.has(skill.id);
    const expertise = skillResolution.expertise.has(skill.id);
    const total =
      abilityMods[skill.ability] +
      proficiencyContribution(proficient, expertise, pb) +
      sumFlat(
        collectForTargets(effectResolution.modifiers, [
          'abilityCheck',
          `abilityCheck.${skill.ability}`,
          `skill.${skill.id}`
        ])
      );
    skills[skill.id] = {
      id: skill.id,
      name: skill.name,
      nameEn: skill.nameEn,
      ability: skill.ability,
      proficient,
      expertise,
      total,
      passive: 10 + total
    };
  }

  const savingThrows = {};
  for (const id of ABILITY_IDS) {
    const proficient = (klass.savingThrows ?? []).includes(id);
    savingThrows[id] = {
      ability: id,
      proficient,
      total:
        abilityMods[id] +
        (proficient ? pb : 0) +
        sumFlat(collectForTargets(effectResolution.modifiers, ['save', `save.${id}`]))
    };
  }

  // ---- 护甲惩罚与临时效果 ----
  const penalties = [];
  if (armorUnproficient) {
    const label = shieldPenalty && !armorPenalty ? '未受训盾牌' : '未受训护甲';
    for (const target of ['abilityCheck.str', 'abilityCheck.dex', 'save.str', 'save.dex', 'attack']) {
      penalties.push({ source: 'armor:unproficient', label, target, type: 'disadvantage' });
    }
  }
  if (armor.stealthDisadvantage) {
    penalties.push({ source: 'armor:stealth', label: '厚重护甲', target: 'skill.stealth', type: 'disadvantage' });
  }

  const allModifiers = [...effectResolution.modifiers, ...penalties];

  // 被动检定：5e 的可选规则是优势 +5、劣势 -5；这里把状态/力竭/临时效果算进去，
  // 避免角色卡显示“中毒但被动察觉不变”的矛盾。
  for (const skill of SKILLS) {
    const entry = skills[skill.id];
    const targets = ['abilityCheck', `abilityCheck.${skill.ability}`, `skill.${skill.id}`];
    const passiveModifiers = [
      ...conditionRollEffects(conditionList, { kind: 'skill', ability: skill.ability, skill: skill.id }).modifiers,
      ...exhaustionRollEffects(exhaustion, { kind: 'skill', ability: skill.ability, skill: skill.id }),
      ...allModifiers.filter(
        (modifier) => modifier.type !== 'flat' && (modifier.target === 'all' || targets.includes(modifier.target))
      )
    ];
    const mode = resolveRollMode(passiveModifiers).mode;
    entry.passive = 10 + entry.total + (mode === 'advantage' ? 5 : mode === 'disadvantage' ? -5 : 0);
  }

  const acBonus = sumFlat(allModifiers.filter((modifier) => modifier.target === 'ac' && modifier.type === 'flat'));
  armorClass += acBonus;
  const initiative =
    abilityMods.dex + sumFlat(allModifiers.filter((modifier) => modifier.target === 'initiative' && modifier.type === 'flat'));

  // ---- 施法 ----
  let spellcasting = null;
  if (klass.spellcasting && level >= (klass.spellcasting.fromLevel ?? 1)) {
    const ability = klass.spellcasting.ability;
    spellcasting = {
      ability,
      modifier: abilityMods[ability],
      saveDc: 8 + pb + abilityMods[ability],
      attackBonus: pb + abilityMods[ability]
    };
  }

  // ---- 抗性与豁免优势 ----
  const resistances = unique([
    ...(race.resistances ?? []),
    ...(subrace?.resistances ?? []),
    ...Object.keys(raceChoiceResult.resistances),
    ...(conditionFlags(conditionList).resistanceAll ? ['all'] : [])
  ]);
  const saveAdvantages = [
    ...(race.saveAdvantages ?? []),
    ...(subrace?.saveAdvantages ?? [])
  ];

  const traits = [];
  for (const trait of race.traits ?? []) traits.push({ ...trait, source: race.name });
  for (const trait of subrace?.traits ?? []) traits.push({ ...trait, source: subrace.name });
  for (const feature of klass.features ?? []) {
    if ((feature.level ?? 1) <= level) traits.push({ ...feature, source: klass.name });
  }
  if (background.feature) traits.push({ ...background.feature, source: background.name });

  const warnings = [];
  if (armorPenalty) warnings.push(`未受训${armor.name}：力量/敏捷检定、豁免与攻击具有劣势，且不能施法。`);
  if (shieldPenalty) warnings.push('未受训盾牌：力量/敏捷检定、豁免与攻击具有劣势，且不能施法。');
  if (strengthPenalty > 0) warnings.push(`${armor.name}需要力量 ${armor.strengthReq}，速度 -10 尺。`);
  if (exhaustion.dead) warnings.push('力竭 6 级：角色死亡。');

  const sheet = {
    name: normalized.name,
    level,
    proficiencyBonus: pb,
    abilityMethod: normalized.abilityMethod,
    baseAbilities,
    racialBonuses: racialChoice.bonuses,
    racialBonusChoices: racialChoice.choices,
    abilityScores,
    abilityMods,
    pointBuy,
    race: summarizeRace(race, subrace),
    class: summarizeClass(klass),
    background: summarizeBackground(background),
    raceChoices: raceChoiceResult.choices,
    skills,
    savingThrows,
    armorClass,
    armorClassBase: armorClass - acBonus,
    armor: armor.category === 'none' && shieldEquipped ? { id: 'shield', name: '盾牌', category: 'shield', baseAc: 0 } : armor,
    shield: shieldEquipped,
    armorProficient,
    shieldProficient,
    armorUnproficient,
    speed,
    size: subrace?.size ?? race.size ?? 'medium',
    darkvision: Math.max(race.darkvision ?? 0, subrace?.darkvision ?? 0),
    initiative,
    hitDie: klass.hitDie,
    hitPoints: { max: maxHp, current: currentHp, base: maxHpBase },
    hpPerLevel,
    proficiencies: {
      armor: armorProficiencies,
      weapons: unique([...(race.weaponProficiencies ?? []), ...(subrace?.weaponProficiencies ?? []), ...(klass.weaponProficiencies ?? [])]),
      tools: unique([...(background.toolProficiencies ?? []), ...(klass.toolProficiencies ?? [])]),
      languages: languageResolution.languages
    },
    languageChoicesRemaining: languageResolution.remaining,
    traits,
    spellcasting,
    spellcastingBlocked: armorUnproficient,
    resistances,
    saveAdvantages,
    conditions: conditionList,
    exhaustion,
    effects: effectResolution.groups,
    modifiers: allModifiers,
    penalties,
    flags: { ...flags, lucky, dead: exhaustion.dead },
    defenses: {
      melee: defenseProfile(conditionList, { range: 'melee' }),
      ranged: defenseProfile(conditionList, { range: 'ranged' })
    },
    warnings,
    passivePerception: skills.perception.passive,
    notes: normalized.notes
  };

  return { spec: normalized, sheet };
}

export function rebuildCharacter(character, rules = SRD_RULES, options = {}) {
  return createCharacter(character.spec, rules, options);
}

/** 只改一部分输入，重新计算派生值（不写回基础属性）。 */
export function patchCharacter(character, patch, rules = SRD_RULES, options = {}) {
  return createCharacter({ ...character.spec, ...patch }, rules, options);
}

export function addCondition(character, conditionId, rules = SRD_RULES, options = {}) {
  const conditions = unique([...character.spec.conditions, conditionId]);
  return patchCharacter(character, { conditions }, rules, options);
}

export function removeCondition(character, conditionId, rules = SRD_RULES, options = {}) {
  return patchCharacter(character, { conditions: character.spec.conditions.filter((id) => id !== conditionId) }, rules, options);
}

export function serializeCharacter(character) {
  return { version: 1, spec: JSON.parse(JSON.stringify(character.spec)) };
}

export function deserializeCharacter(payload, rules = SRD_RULES, options = {}) {
  if (!payload || payload.version !== 1 || !payload.spec) {
    fail('SAVE_INVALID', '角色存档格式无效');
  }
  return createCharacter(payload.spec, rules, options);
}

// ---------------------------------------------------------------------------
// 内部辅助
// ---------------------------------------------------------------------------

function normalizeSpec(spec) {
  return {
    name: spec.name ?? '无名冒险者',
    level: spec.level ?? 1,
    race: spec.race ?? 'human',
    subrace: spec.subrace ?? null,
    class: spec.class ?? 'fighter',
    background: spec.background ?? 'soldier',
    abilityMethod: spec.abilityMethod ?? 'point-buy',
    baseAbilities: spec.baseAbilities ? { ...spec.baseAbilities } : null,
    racialBonusChoices: [...(spec.racialBonusChoices ?? [])],
    skillChoices: [...(spec.skillChoices ?? [])],
    expertiseChoices: [...(spec.expertiseChoices ?? [])],
    extraLanguages: [...(spec.extraLanguages ?? [])],
    armor: spec.armor ?? 'none',
    shield: Boolean(spec.shield),
    conditions: [...new Set(spec.conditions ?? [])],
    exhaustion: spec.exhaustion ?? 0,
    effects: Array.isArray(spec.effects) ? spec.effects : [],
    raceChoices: { ...(spec.raceChoices ?? {}) },
    hpRolls: [...(spec.hpRolls ?? [])],
    currentHp: spec.currentHp ?? null,
    notes: spec.notes ?? ''
  };
}

function validateBaseAbilities(spec) {
  const raw = spec.baseAbilities;
  if (!raw || typeof raw !== 'object') {
    fail('ABILITIES_MISSING', '需要为六项属性提供基础值');
  }
  const scores = {};
  for (const id of ABILITY_IDS) {
    if (!Number.isInteger(raw[id])) {
      fail('ABILITY_INVALID', `属性 ${id.toUpperCase()} 必须是整数`, { ability: id });
    }
    scores[id] = raw[id];
  }
  const values = ABILITY_IDS.map((id) => scores[id]);
  const method = spec.abilityMethod;
  if (method === 'point-buy') {
    for (const id of ABILITY_IDS) {
      if (scores[id] < 8 || scores[id] > 15) {
        fail('POINT_BUY_RANGE', `购点模式下 ${id.toUpperCase()} 必须在 8–15 之间`, { ability: id, score: scores[id] });
      }
    }
    const total = pointBuyTotal(scores);
    if (total > POINT_BUY_TOTAL) {
      fail('POINT_BUY_BUDGET', `购点超出预算：${total}/${POINT_BUY_TOTAL}`, { total, budget: POINT_BUY_TOTAL });
    }
  } else if (method === 'standard-array') {
    if (countStandardArrayMatches(values) !== 0) {
      fail('STANDARD_ARRAY_MISMATCH', `标准数组必须恰好使用 ${STANDARD_ARRAY.join('/')}`, {
        expected: STANDARD_ARRAY,
        got: values
      });
    }
  } else if (method === 'roll' || method === 'free') {
    for (const id of ABILITY_IDS) {
      if (scores[id] < 3 || scores[id] > 18) {
        fail('ABILITY_RANGE', `${id.toUpperCase()} 的基础值必须在 3–18 之间`, { ability: id, score: scores[id] });
      }
    }
  } else {
    fail('ABILITY_METHOD', `未知属性生成方式：${method}`, { method });
  }
  return scores;
}

function countStandardArrayMatches(values) {
  const expected = [...STANDARD_ARRAY].sort((a, b) => a - b);
  const got = [...values].sort((a, b) => a - b);
  return expected.reduce((total, value, index) => total + (value === got[index] ? 0 : 1), 0);
}

function findSubrace(race, reference) {
  const subraces = race.subraces ?? [];
  if (reference && typeof reference === 'object') return reference;
  const found = subraces.find((entry) => entry.id === reference);
  if (!found) fail('SUBRACE_NOT_FOUND', `找不到子种族：${reference}`, { race: race.id, subrace: reference });
  return found;
}

function normalizeAbilityBonuses(input = {}) {
  if (!input) return { fixed: {}, choose: null };
  if (input.fixed || input.choose) {
    return { fixed: { ...(input.fixed ?? {}) }, choose: input.choose ?? null };
  }
  return { fixed: { ...input }, choose: null };
}

function computeRacialBonuses(race, subrace, choices) {
  const raceBonuses = normalizeAbilityBonuses(race.abilityBonuses);
  const subraceBonuses = subrace ? normalizeAbilityBonuses(subrace.abilityBonuses) : { fixed: {}, choose: null };
  const bonuses = Object.fromEntries(ABILITY_IDS.map((id) => [id, 0]));
  for (const id of ABILITY_IDS) {
    bonuses[id] += raceBonuses.fixed[id] ?? 0;
    bonuses[id] += subraceBonuses.fixed[id] ?? 0;
  }
  const choose = raceBonuses.choose ?? subraceBonuses.choose;
  if (choose) {
    const allowed = ABILITY_IDS.filter((id) => !(choose.exclude ?? []).includes(id));
    if (choices.length !== choose.count) {
      fail('RACIAL_CHOICE_COUNT', `种族需要选择 ${choose.count} 项属性各 +${choose.amount}`, {
        expected: choose.count,
        got: choices.length
      });
    }
    const seen = new Set();
    for (const id of choices) {
      if (!allowed.includes(id)) {
        fail('RACIAL_CHOICE_INVALID', `不能选择 ${id.toUpperCase()} 作为种族加值`, { ability: id, allowed });
      }
      if (seen.has(id)) fail('RACIAL_CHOICE_DUPLICATE', `种族加值不能重复选择 ${id.toUpperCase()}`, { ability: id });
      seen.add(id);
      bonuses[id] += choose.amount;
    }
  } else if (choices.length > 0) {
    fail('RACIAL_CHOICE_UNEXPECTED', '该种族没有可选属性加值', { choices });
  }
  return { bonuses, choices: [...choices] };
}

function resolveRaceChoices(race, subrace, selected = {}) {
  const choices = [...(race.choices ?? []), ...(subrace?.choices ?? [])];
  const resolved = {};
  const resistances = {};
  const languages = [];
  for (const choice of choices) {
    const selectedId = selected[choice.id] ?? (choice.options?.[0]?.id ?? null);
    if (!selectedId && choice.required !== false) {
      fail('RACE_CHOICE_REQUIRED', `需要选择${choice.name}`, { choice: choice.id });
    }
    const option = (choice.options ?? []).find((entry) => entry.id === selectedId);
    if (selectedId && !option) {
      fail('RACE_CHOICE_INVALID', `${choice.name}没有选项：${selectedId}`, { choice: choice.id, option: selectedId });
    }
    if (option) {
      resolved[choice.id] = option.id;
      if (option.damage) resistances[option.damage] = [option.name];
      for (const damage of option.resistances ?? []) resistances[damage] = [option.name];
      for (const language of option.languages ?? []) languages.push(language);
    }
  }
  return { choices: resolved, resistances, languages };
}

function resolveSkillProficiencies({ klass, race, subrace, background, chosen, expertise, rules }) {
  const fixed = new Set([
    ...(background.skillProficiencies ?? []),
    ...(race.skillProficiencies ?? []),
    ...(subrace?.skillProficiencies ?? [])
  ]);
  for (const id of fixed) {
    if (!SKILL_BY_ID[id]) fail('SKILL_UNKNOWN', `未知技能：${id}`, { skill: id });
  }
  const classChoice = klass.skillChoices ?? { count: 0, from: [] };
  const raceChoice = race.skillChoices ?? { count: 0, from: [] };
  const subraceChoice = subrace?.skillChoices ?? { count: 0, from: [] };
  const choiceCount = (classChoice.count ?? 0) + (raceChoice.count ?? 0) + (subraceChoice.count ?? 0);
  const pool = new Set([
    ...poolFor(classChoice, rules.skills),
    ...poolFor(raceChoice, rules.skills),
    ...poolFor(subraceChoice, rules.skills)
  ]);

  if (chosen.length !== choiceCount) {
    fail('SKILL_CHOICE_COUNT', `需要选择 ${choiceCount} 项技能熟练`, {
      expected: choiceCount,
      got: chosen.length
    });
  }
  const selected = new Set();
  for (const id of chosen) {
    if (!SKILL_BY_ID[id]) fail('SKILL_UNKNOWN', `未知技能：${id}`, { skill: id });
    if (!pool.has(id)) fail('SKILL_NOT_ALLOWED', `该职业/种族不能选择技能：${SKILL_BY_ID[id].name}`, { skill: id });
    if (selected.has(id)) fail('SKILL_CHOICE_DUPLICATE', `技能重复选择：${SKILL_BY_ID[id].name}`, { skill: id });
    if (fixed.has(id)) {
      fail('SKILL_ALREADY_PROFICIENT', `已经通过背景/种族获得 ${SKILL_BY_ID[id].name}，请换一个技能`, { skill: id });
    }
    selected.add(id);
  }

  const expertiseSet = new Set();
  const expertiseSpec = klass.expertise;
  if (expertiseSpec && (klass.expertiseLevels ?? [expertiseSpec.level]).includes(1)) {
    const count = expertiseSpec.count ?? 0;
    if (expertise.length !== count) {
      fail('EXPERTISE_COUNT', `需要选择 ${count} 项专精技能`, { expected: count, got: expertise.length });
    }
    for (const id of expertise) {
      if (!selected.has(id) && !fixed.has(id)) {
        fail('EXPERTISE_NOT_PROFICIENT', `专精必须选择已熟练的技能：${id}`, { skill: id });
      }
      if (expertiseSet.has(id)) fail('EXPERTISE_DUPLICATE', `专精重复：${id}`, { skill: id });
      expertiseSet.add(id);
    }
  } else if (expertise.length > 0) {
    fail('EXPERTISE_UNEXPECTED', '当前职业/等级没有专精选择', { expertise });
  }

  return {
    proficient: new Set([...fixed, ...selected]),
    expertise: expertiseSet
  };
}

function poolFor(spec, skills) {
  if (!spec) return [];
  if (spec.from === 'any') return skills.map((skill) => skill.id);
  return spec.from ?? [];
}

function resolveLanguages({ race, subrace, background, extra, autoExtra = [] }) {
  const automatic = unique([
    ...autoExtra,
    ...(race.languages ?? []),
    ...(subrace?.languages ?? []),
    ...(background.languages ?? [])
  ]);
  const allowed = (race.languageChoices ?? 0) + (subrace?.languageChoices ?? 0) + (background.languageChoices ?? 0);
  if (extra.length > allowed) {
    fail('LANGUAGE_CHOICE_COUNT', `最多只能额外选择 ${allowed} 门语言`, { expected: allowed, got: extra.length });
  }
  const seen = new Set(automatic);
  for (const language of extra) {
    if (typeof language !== 'string' || language.trim().length === 0) {
      fail('LANGUAGE_INVALID', '额外语言必须是非空字符串');
    }
    if (seen.has(language)) fail('LANGUAGE_DUPLICATE', `语言重复：${language}`, { language });
    seen.add(language);
  }
  return { languages: [...seen], remaining: allowed - extra.length };
}

function normalizeEffects(effects = []) {
  const groups = [];
  const modifiers = [];
  for (const group of effects) {
    if (!group || !Array.isArray(group.modifiers)) {
      fail('EFFECT_INVALID', '临时效果需要 { id, label, modifiers: [] }');
    }
    const normalized = group.modifiers.map((modifier) =>
      normalizeModifier(modifier, { source: group.source ?? group.id ?? 'effect', label: group.label })
    );
    groups.push({ ...group, modifiers: normalized });
    modifiers.push(...normalized);
  }
  return { groups, modifiers };
}

function computeMaxHp({ level, hitDie, conMod, hpPerLevel, hpRolls }) {
  if (hpRolls.length > 0) {
    if (hpRolls.length !== level - 1) {
      fail('HP_ROLLS_COUNT', `HP 投掷需要 ${level - 1} 个结果`, { expected: level - 1, got: hpRolls.length });
    }
    for (const roll of hpRolls) {
      if (!Number.isInteger(roll) || roll < 1 || roll > hitDie) {
        fail('HP_ROLL_RANGE', `HP 投掷结果必须在 1–${hitDie} 之间`, { roll, hitDie });
      }
    }
  }
  const average = Math.floor(hitDie / 2) + 1;
  let total = Math.max(1, hitDie + conMod);
  for (let i = 1; i < level; i += 1) {
    const roll = hpRolls.length > 0 ? hpRolls[i - 1] : average;
    total += Math.max(1, roll + conMod);
  }
  total += hpPerLevel * level;
  return total;
}

function proficiencyContribution(proficient, expertise, pb) {
  if (expertise) return pb * 2;
  if (proficient) return pb;
  return 0;
}

function collectForTargets(modifiers, targets) {
  return modifiers.filter((modifier) => modifier.target === 'all' || targets.includes(modifier.target));
}

function summarizeRace(race, subrace) {
  return {
    id: race.id,
    name: race.name,
    nameEn: race.nameEn ?? race.name,
    subrace: subrace ? { id: subrace.id, name: subrace.name, nameEn: subrace.nameEn ?? subrace.name } : null
  };
}

function summarizeClass(klass) {
  return {
    id: klass.id,
    name: klass.name,
    nameEn: klass.nameEn ?? klass.name,
    hitDie: klass.hitDie,
    savingThrows: [...(klass.savingThrows ?? [])]
  };
}

function summarizeBackground(background) {
  return {
    id: background.id,
    name: background.name,
    nameEn: background.nameEn ?? background.name,
    feature: background.feature ? { ...background.feature } : null
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** 供 UI 使用的摘要：例如 “力量 16（+3）”。 */
export function abilitySummary(score) {
  return `${score}（${formatModifier(abilityModifier(score))}）`;
}

export { ABILITY_CAP };
