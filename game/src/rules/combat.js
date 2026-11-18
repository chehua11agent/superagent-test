// 武器攻击：d20 命中 + 伤害骰。武器数据来自 Foundry dnd5e 内容层。
import { resolveCheck } from './checks.js';
import { getWeapon } from './content.js';
import { fail } from './errors.js';
import { rollDie } from './rng.js';

function parseDamageFormula(formula) {
  const match = String(formula ?? '').match(/^\s*(\d+)d(\d+)\s*([+-]\s*\d+)?\s*$/i);
  if (!match) fail('DAMAGE_FORMULA', `无法解析伤害公式：${formula}`, { formula });
  return {
    count: Number(match[1]),
    sides: Number(match[2]),
    bonus: Number((match[3] ?? '0').replace(/\s+/g, ''))
  };
}

export function weaponProfile(character, weaponId = null) {
  const sheet = character?.sheet;
  if (!sheet) fail('CHARACTER_INVALID', '需要 createCharacter 生成的角色');
  const resolvedId = weaponId ?? sheet.weapon?.id;
  if (!resolvedId) fail('WEAPON_MISSING', '角色没有装备武器');
  const item = getWeapon(resolvedId);
  if (!item) fail('WEAPON_UNKNOWN', `找不到武器：${resolvedId}`, { weaponId: resolvedId });
  return {
    id: item.id,
    name: item.name,
    ability: item.weapon.attackAbility ?? 'str',
    damage: item.weapon.damage,
    versatile: item.weapon.versatile,
    properties: item.weapon.properties,
    range: item.weapon.range
  };
}

/**
 * 掷武器伤害：默认加攻击属性调整值；暴击时伤害骰翻倍（加值不翻倍）。
 * 5e 的武器伤害是“武器骰 + 属性调整值 + 其他加值”，这里只处理前两项。
 */
export function rollWeaponDamage(character, { weaponId = null, critical = false, addAbility = true, rng = Math.random } = {}) {
  const profile = weaponProfile(character, weaponId);
  if (!profile.damage?.formula) fail('DAMAGE_FORMULA', `${profile.name} 没有伤害公式`);
  const parsed = parseDamageFormula(profile.damage.formula);
  const diceCount = critical ? parsed.count * 2 : parsed.count;
  const rolls = Array.from({ length: diceCount }, () => rollDie(rng, parsed.sides));
  const abilityMod = addAbility ? character.sheet.abilityMods[profile.ability] ?? 0 : 0;
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + parsed.bonus + abilityMod;
  const formula = `${diceCount}d${parsed.sides}${parsed.bonus ? `${parsed.bonus >= 0 ? '+' : ''}${parsed.bonus}` : ''}${abilityMod ? `${abilityMod >= 0 ? '+' : ''}${abilityMod}` : ''}`;
  return {
    weaponId: profile.id,
    name: profile.name,
    formula,
    rolls,
    total,
    type: profile.damage.types?.[0] ?? null,
    ability: profile.ability,
    abilityModifier: abilityMod,
    critical
  };
}

/** 武器攻击：先掷命中，命中后再掷伤害；未命中时 damage 为 null。 */
export function resolveWeaponAttack(character, options = {}) {
  const profile = weaponProfile(character, options.weaponId ?? null);
  const rng = options.rng ?? Math.random;
  const check = resolveCheck(character, {
    kind: 'attack',
    ability: profile.ability,
    proficient: Boolean(options.proficient),
    targetAc: options.targetAc ?? null,
    situational: options.situational ?? [],
    wordBonus: options.wordBonus ?? 0,
    rollMode: options.rollMode,
    rng
  });
  const damage = check.success
    ? rollWeaponDamage(character, { weaponId: profile.id, critical: check.critical, rng })
    : null;
  return { check, damage, profile };
}
