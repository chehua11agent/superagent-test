// d20 检定结算：把角色的技能/豁免/攻击、状态、情境修正、单词加值合成一次掷骰。
//
// 关键 5e 规则：
//   - 属性检定/豁免掷出 20 或 1 不会自动成功/失败（只有攻击有自然 1/20 规则）；
//   - 优势/劣势不叠加；同时存在时抵消为普通掷骰；
//   - 半身人“幸运”可在自然 1 时重投一次，必须使用新结果。
import { ABILITY_BY_ID, ABILITY_IDS, proficiencyBonus } from './abilities.js';
import { conditionRollEffects, exhaustionRollEffects } from './conditions.js';
import { fail } from './errors.js';
import { normalizeModifier, resolveRollMode, sumFlat } from './modifiers.js';
import { rollDie } from './rng.js';
import { SKILL_BY_ID } from './skills.js';
import { wordBonusFromMemory, wordModifier } from './word-bonus.js';

const CHECK_KINDS = ['abilityCheck', 'skill', 'save', 'attack', 'initiative'];

function normalizeKind(kind) {
  if (kind === 'ability') return 'abilityCheck';
  return kind ?? 'abilityCheck';
}

function abilityLabel(ability) {
  return ABILITY_BY_ID[ability]?.name ?? ability;
}

function checkTargets(kind, ability, skill, attackType) {
  if (kind === 'skill') return ['abilityCheck', `abilityCheck.${ability}`, `skill.${skill}`];
  if (kind === 'abilityCheck') return ['abilityCheck', `abilityCheck.${ability}`];
  if (kind === 'save') return ['save', `save.${ability}`];
  if (kind === 'attack') {
    const targets = ['attack'];
    if (attackType) targets.push(`attack.${attackType}`);
    return targets;
  }
  if (kind === 'initiative') return ['initiative', 'abilityCheck', 'abilityCheck.dex'];
  return ['abilityCheck'];
}

function primaryTarget(kind, ability, skill) {
  if (kind === 'skill') return `skill.${skill}`;
  if (kind === 'abilityCheck') return 'abilityCheck';
  if (kind === 'save') return `save.${ability}`;
  if (kind === 'attack') return 'attack';
  if (kind === 'initiative') return 'initiative';
  return 'abilityCheck';
}

/**
 * 生成一次检定的完整档案（不掷骰），用于 UI 预览或概率计算。
 */
export function buildCheck(character, options = {}) {
  const sheet = character?.sheet;
  if (!sheet) fail('CHARACTER_INVALID', 'buildCheck 需要一个由 createCharacter 生成的角色');

  const kind = normalizeKind(options.kind);
  if (!CHECK_KINDS.includes(kind)) fail('CHECK_KIND', `未知检定类型：${kind}`, { kind });

  const skill = kind === 'skill' ? options.skill : null;
  if (kind === 'skill' && !SKILL_BY_ID[skill]) fail('SKILL_UNKNOWN', `未知技能：${skill}`, { skill });

  let ability = options.ability ?? (kind === 'skill' ? SKILL_BY_ID[skill].ability : null);
  if (kind === 'initiative') ability = 'dex';
  if (kind === 'attack') ability = ability ?? 'str';
  if (!ability) fail('ABILITY_MISSING', '需要指定属性', { kind });
  if (!ABILITY_IDS.includes(ability)) fail('ABILITY_UNKNOWN', `未知属性：${ability}`, { ability });

  const wordBonus = options.wordMemory ? wordBonusFromMemory(options.wordMemory) : Number(options.wordBonus ?? 0);
  if (!Number.isFinite(wordBonus) || wordBonus < 0) {
    fail('WORD_BONUS_INVALID', '单词加值必须是大于等于 0 的数字', { wordBonus });
  }

  const dc = options.dc ?? null;
  const targetAc = options.targetAc ?? null;
  if (dc !== null && !Number.isFinite(dc)) fail('DC_INVALID', 'DC 必须是数字', { dc });
  if (targetAc !== null && !Number.isFinite(targetAc)) fail('AC_INVALID', '目标 AC 必须是数字', { targetAc });

  const proficientDefault =
    kind === 'skill' ? sheet.skills[skill].proficient :
      kind === 'save' ? sheet.savingThrows[ability].proficient :
        false;
  const expertise = kind === 'skill' ? (options.expertise ?? sheet.skills[skill].expertise) : false;
  const proficient = (options.proficient ?? proficientDefault) || expertise;

  const targets = checkTargets(kind, ability, skill, options.attackType);
  const effectModifiers = sheet.modifiers.filter((modifier) => modifier.target === 'all' || targets.includes(modifier.target));

  const defaultTarget = primaryTarget(kind, ability, skill);
  const situational = (options.situational ?? []).map((modifier) =>
    normalizeModifier(modifier, { target: defaultTarget, source: 'situational', label: '情境' })
  );

  const traitModifiers = [];
  if (kind === 'save') {
    const context = options.context ?? [];
    for (const entry of sheet.saveAdvantages ?? []) {
      const abilities = entry.abilities === 'all' ? ABILITY_IDS : entry.abilities ?? [];
      const matchedContext = (entry.against ?? []).some((tag) => context.includes(tag));
      if (abilities.includes(ability) && matchedContext) {
        traitModifiers.push({ source: `trait:${entry.label}`, label: entry.label, type: 'advantage' });
      }
    }
  }

  const conditionResult = conditionRollEffects(sheet.conditions, {
    kind,
    ability,
    skill,
    requiresSight: Boolean(options.requiresSight),
    requiresHearing: Boolean(options.requiresHearing)
  });
  const exhaustionModifiers = exhaustionRollEffects(sheet.exhaustion, { kind, ability, skill });

  const rollSources = [...effectModifiers, ...situational, ...traitModifiers, ...conditionResult.modifiers, ...exhaustionModifiers];
  if (options.rollMode === 'advantage' || options.rollMode === 'disadvantage') {
    rollSources.push({ source: 'dm', label: 'DM 裁定', type: options.rollMode });
  }
  const roll = resolveRollMode(rollSources);

  const pb = sheet.proficiencyBonus ?? proficiencyBonus(sheet.level);
  const proficiencyValue = expertise ? pb * 2 : proficient ? pb : 0;
  const word = wordModifier(wordBonus);
  const flatModifiers = [
    ...effectModifiers.filter((modifier) => modifier.type === 'flat'),
    ...situational.filter((modifier) => modifier.type === 'flat')
  ];
  if (word) flatModifiers.push(word);
  const flatTotal = sumFlat(flatModifiers);
  const total = sheet.abilityMods[ability] + proficiencyValue + flatTotal;

  const breakdown = [
    { key: 'ability', source: `ability:${ability}`, label: abilityLabel(ability), value: sheet.abilityMods[ability] }
  ];
  if (proficiencyValue) {
    breakdown.push({
      key: expertise ? 'expertise' : 'proficiency',
      source: expertise ? 'expertise' : 'proficiency',
      label: expertise ? '专精（双倍熟练）' : '熟练',
      value: proficiencyValue
    });
  }
  for (const modifier of flatModifiers) {
    breakdown.push({
      key: modifier.source === 'word' ? 'word' : 'modifier',
      source: modifier.source,
      label: modifier.label,
      value: modifier.value
    });
  }

  const autoFailReasons = [...conditionResult.autoFailReasons];
  return {
    kind,
    ability,
    skill,
    dc,
    targetAc,
    proficient,
    expertise,
    proficiencyBonus: pb,
    breakdown,
    flatModifiers,
    total,
    wordBonus,
    mode: roll.mode,
    advantageSources: roll.advantages,
    disadvantageSources: roll.disadvantages,
    cancelled: roll.cancelled,
    autoFail: autoFailReasons.length > 0,
    autoFailReasons,
    requiresSight: Boolean(options.requiresSight),
    requiresHearing: Boolean(options.requiresHearing),
    context: [...(options.context ?? [])],
    target: defaultTarget,
    notes: []
  };
}

/**
 * 掷骰结算。options.rng 可注入固定序列；未提供时使用 Math.random。
 */
export function resolveCheck(character, options = {}) {
  const profile = buildCheck(character, options);
  const rng = options.rng ?? Math.random;
  const rolls = profile.mode === 'normal' ? [rollDie(rng, 20)] : [rollDie(rng, 20), rollDie(rng, 20)];
  const record = [...rolls];
  let natural =
    profile.mode === 'advantage' ? Math.max(...rolls) :
      profile.mode === 'disadvantage' ? Math.min(...rolls) :
        rolls[0];
  let luckReroll = false;
  if (natural === 1 && character.sheet.flags?.lucky && options.lucky !== false) {
    const reroll = rollDie(rng, 20);
    record.push(reroll);
    natural = reroll;
    luckReroll = true;
    profile.notes.push('半身人幸运：自然 1 重投一次');
  }

  const total = natural + profile.total;
  const target = profile.kind === 'attack' ? profile.targetAc : profile.dc;
  let success = null;
  let critical = false;
  let criticalMiss = false;
  if (profile.kind === 'attack') {
    critical = natural === 20;
    criticalMiss = natural === 1;
    if (profile.targetAc !== null) {
      success = critical || (!criticalMiss && total >= profile.targetAc);
    }
  } else if (profile.dc !== null) {
    success = total >= profile.dc;
  }
  if (profile.autoFail) success = false;

  const margin = target === null ? null : total - target;
  return {
    ...profile,
    rolls,
    record,
    natural,
    total,
    success,
    margin,
    critical,
    criticalMiss,
    luckReroll,
    formula: formatCheckFormula(profile, natural, total)
  };
}

/** 被动检定：10 + 全部修正；优势 +5，劣势 -5（DMG 被动检定规则）。 */
export function passiveScore(character, options = {}) {
  const profile = buildCheck(character, options);
  if (profile.autoFail) return 0;
  let value = 10 + profile.total;
  if (profile.mode === 'advantage') value += 5;
  if (profile.mode === 'disadvantage') value -= 5;
  return value;
}

/**
 * 成功概率（0–1）：穷举 d20（优势/劣势为 400 种组合），
 * 让“单词 +1/+2/+3 到底提升多少成功率”可以被直接量化。
 */
export function checkOdds(character, options = {}) {
  const profile = buildCheck(character, options);
  if (profile.autoFail) return { chance: 0, needed: null, mode: profile.mode, total: profile.total, autoFail: true };
  const target = profile.kind === 'attack' ? profile.targetAc : profile.dc;
  if (target === null) return { chance: null, needed: null, mode: profile.mode, total: profile.total, autoFail: false };
  const needed = target - profile.total;
  let successCount = 0;
  let totalCount = 0;
  for (let first = 1; first <= 20; first += 1) {
    const secondValues = profile.mode === 'normal' ? [first] : Array.from({ length: 20 }, (_, i) => i + 1);
    for (const second of secondValues) {
      const natural =
        profile.mode === 'advantage' ? Math.max(first, second) :
          profile.mode === 'disadvantage' ? Math.min(first, second) :
            first;
      const success =
        profile.kind === 'attack'
          ? natural === 20 || (natural !== 1 && natural + profile.total >= target)
          : natural + profile.total >= target;
      if (success) successCount += 1;
      totalCount += 1;
    }
  }
  return {
    chance: successCount / totalCount,
    needed,
    mode: profile.mode,
    total: profile.total,
    autoFail: false
  };
}

function formatCheckFormula(profile, natural, total) {
  const parts = [`1d20(${natural})`];
  for (const entry of profile.breakdown) {
    const sign = entry.value >= 0 ? '+' : '-';
    parts.push(`${sign} ${Math.abs(entry.value)}（${entry.label}）`);
  }
  const target = profile.kind === 'attack' ? `AC ${profile.targetAc ?? '—'}` : `DC ${profile.dc ?? '—'}`;
  let tail;
  if (profile.autoFail) {
    tail = `自动失败（${profile.autoFailReasons.join('；')}）`;
  } else if (profile.kind === 'attack') {
    tail = profile.targetAc === null
      ? '未设 AC'
      : natural === 20
        ? '暴击命中'
        : natural === 1
          ? '自动失手'
          : total >= profile.targetAc
            ? '命中'
            : '失手';
  } else if (profile.dc === null) {
    tail = '未设 DC';
  } else {
    tail = total >= profile.dc ? '成功' : '失败';
  }
  return `${parts.join(' ')} = ${total} vs ${target} → ${tail}`;
}
