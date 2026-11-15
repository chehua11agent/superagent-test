#!/usr/bin/env node
/**
 * Ingest the D&D 5e (2014) Monster Manual catalogue from a local snapshot of
 * the 5etools data files into the project's structured MM library.
 *
 * The source snapshot is *not* committed: it contains full translated prose.
 * This script only keeps structured fields (names, pages, classifications,
 * stat-block mechanics and parsed attack/save values) and never copies
 * `entries` / description prose into the output.
 *
 * Usage:
 *   MM_SOURCE_DIR=/path/to/5etools/data node scripts/mm-ingest.mjs
 *
 * Expected source file (relative to MM_SOURCE_DIR):
 *   bestiary/bestiary-mm.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(process.env.MM_SOURCE_DIR || resolve(ROOT, 'source'));
const OUT = resolve(ROOT, 'data/mm');
const SNAPSHOT_DATE = '2026-11-15';
const SOURCE_URL = 'https://5e.kiwee.top/data/';

const readJson = async (rel) => JSON.parse(await readFile(resolve(SOURCE, rel), 'utf8'));

/* ------------------------------------------------------------------ */
/* shared vocabularies                                                 */
/* ------------------------------------------------------------------ */

const ABILITY = {
  str: '力量',
  dex: '敏捷',
  con: '体质',
  int: '智力',
  wis: '感知',
  cha: '魅力',
};

const SKILL = {
  acrobatics: '特技',
  'animal handling': '驯兽',
  arcana: '奥秘',
  athletics: '运动',
  deception: '欺瞒',
  history: '历史',
  insight: '洞见',
  intimidation: '威吓',
  investigation: '调查',
  medicine: '医药',
  nature: '自然',
  perception: '察觉',
  performance: '表演',
  persuasion: '游说',
  religion: '宗教',
  'sleight of hand': '巧手',
  stealth: '隐匿',
  survival: '生存',
};

const SIZE = {
  T: '微型',
  S: '小型',
  M: '中型',
  L: '大型',
  H: '巨型',
  G: '超巨型',
};

const SIZE_CODE = {
  T: 'tiny',
  S: 'small',
  M: 'medium',
  L: 'large',
  H: 'huge',
  G: 'gargantuan',
};

const SIZE_CODE_LABEL = {
  tiny: '微型',
  small: '小型',
  medium: '中型',
  large: '大型',
  huge: '巨型',
  gargantuan: '超巨型',
};

const MONSTER_TYPE = {
  aberration: '异怪',
  beast: '野兽',
  celestial: '天界生物',
  construct: '构装体',
  dragon: '龙',
  elemental: '元素',
  fey: '妖精',
  fiend: '邪魔',
  giant: '巨人',
  humanoid: '类人生物',
  monstrosity: '怪物',
  ooze: '泥怪',
  plant: '植物',
  undead: '亡灵',
};

const ALIGNMENT = {
  L: '守序',
  N: '中立',
  C: '混乱',
  G: '善良',
  E: '邪恶',
  U: '无阵营',
  A: '任意',
};

const DAMAGE_TYPE = {
  acid: '强酸',
  bludgeoning: '钝击',
  cold: '寒冷',
  fire: '火焰',
  force: '力场',
  lightning: '闪电',
  necrotic: '黯蚀',
  piercing: '穿刺',
  poison: '毒素',
  psychic: '心灵',
  radiant: '光耀',
  slashing: '挥砍',
  thunder: '雷鸣',
};

const DAMAGE_TYPE_ZH = [
  '强酸',
  '钝击',
  '寒冷',
  '火焰',
  '力场',
  '闪电',
  '黯蚀',
  '暗蚀',
  '穿刺',
  '毒素',
  '心灵',
  '光耀',
  '挥砍',
  '雷鸣',
];

const DAMAGE_TYPE_ALIAS = { 暗蚀: '黯蚀' };
const normalizeDamageType = (type) => (type ? DAMAGE_TYPE_ALIAS[type] ?? type : null);

const DAMAGE_TYPE_SHORT = {
  酸: '强酸',
  冷: '寒冷',
  火: '火焰',
  电: '闪电',
  毒: '毒素',
  心灵: '心灵',
  光耀: '光耀',
  雷鸣: '雷鸣',
  力场: '力场',
  黯蚀: '黯蚀',
  暗蚀: '黯蚀',
  穿刺: '穿刺',
  挥砍: '挥砍',
  钝击: '钝击',
};

const damageTypeOptions = (text) => {
  if (!/一种类型伤害|选择/.test(text)) return [];
  const afterColon = text.match(/[：:]\s*([^。]+)/)?.[1];
  if (!afterColon) return [];
  return unique(
    afterColon
      .split(/[、,，或]/)
      .map((part) => DAMAGE_TYPE_SHORT[part.trim()])
      .filter(Boolean),
  );
};

const CONDITION = {
  blinded: '目盲',
  charmed: '魅惑',
  deafened: '耳聋',
  exhaustion: '力竭',
  frightened: '恐慌',
  grappled: '受擒',
  incapacitated: '失能',
  invisible: '隐形',
  paralyzed: '麻痹',
  petrified: '石化',
  poisoned: '中毒',
  prone: '倒地',
  restrained: '束缚',
  stunned: '震慑',
  unconscious: '昏迷',
};

const ENVIRONMENT = {
  arctic: '极地',
  coastal: '海岸',
  desert: '沙漠',
  forest: '森林',
  grassland: '草原',
  hill: '丘陵',
  mountain: '山地',
  swamp: '沼泽',
  underdark: '幽暗地域',
  underwater: '水下',
  urban: '城市',
};

const GROUP = {
  色彩龙: 'chromatic-dragon',
  金属龙: 'metallic-dragon',
  恐龙: 'dinosaur',
  魔冢: 'modron',
  兽化人: 'lycanthrope',
  巨灵: 'genie',
  被活化的物件: 'animated-object',
  眼魔: 'beholder',
  天使: 'angel',
  斯芬克斯们: 'sphinx',
};

const GROUP_LABEL = Object.fromEntries(Object.entries(GROUP).map(([zh, id]) => [id, zh]));

const ATTACK_LABEL = {
  mw: '近战武器',
  ms: '近战法术',
  rw: '远程武器',
  rs: '远程法术',
};

const CR_TIERS = [
  { id: 'cr-0-4', label: 'CR 0–4', min: 0, max: 4 },
  { id: 'cr-5-10', label: 'CR 5–10', min: 5, max: 10 },
  { id: 'cr-11-16', label: 'CR 11–16', min: 11, max: 16 },
  { id: 'cr-17-20', label: 'CR 17–20', min: 17, max: 20 },
  { id: 'cr-21-plus', label: 'CR 21+', min: 21, max: Infinity },
];

const FEATURES = [
  { id: 'legendary', label: '传奇动作' },
  { id: 'lair', label: '有巢穴 CR' },
  { id: 'spellcaster', label: '施法者' },
  { id: 'shapechanger', label: '变形生物' },
  { id: 'reactions', label: '有反应动作' },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const cleanText = (value) => {
  if (typeof value !== 'string') return value;
  let out = value.replace(
    /\{@(\w+)(?:\s+([^}|]+))?(?:\|[^}]*)?\}/g,
    (_m, _tag, text) => text ?? '',
  );
  out = out.replace(/\{@(\w+)\}/g, '');
  return out.replace(/\s+/g, ' ').trim();
};

const cleanName = (value) => {
  if (typeof value !== 'string') return value;
  const withoutMarkers = value
    .replace(/\{@recharge\s+\d+\}/g, '')
    .replace(/\{@hit\s+[+-]?\d+\}/g, '');
  return cleanText(withoutMarkers)
    .replace(/\s*\((?:Recharge|Costs?)[^)]*\)/gi, '')
    .replace(/\s*[（(](?:充能|消耗|花费)[^）)]*[）)]/g, '')
    .replace(/\s*([，,。;；])\s*/g, '$1')
    .trim();
};

const slug = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unnamed';

const unique = (values) => [...new Set(values.filter((v) => v !== null && v !== undefined && v !== ''))];

const dedupeIds = (() => {
  const seen = new Map();
  return (id) => {
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    return n === 1 ? id : `${id}-${n}`;
  };
})();

const pageOf = (record) => (Number.isInteger(record.page) ? record.page : null);

const brief = (...parts) => parts.filter((p) => p !== null && p !== undefined && p !== '').join(' · ');

const crToNumber = (cr) => {
  if (typeof cr === 'number') return cr;
  const text = String(cr ?? '').trim();
  if (!text) return null;
  const [a, b] = text.split('/');
  const n = b ? Number(a) / Number(b) : Number(text);
  return Number.isFinite(n) ? n : null;
};

const proficiencyBonus = (cr) => {
  const n = crToNumber(cr);
  if (n === null) return null;
  if (n <= 4) return 2;
  if (n <= 8) return 3;
  if (n <= 12) return 4;
  if (n <= 16) return 5;
  if (n <= 20) return 6;
  if (n <= 24) return 7;
  if (n <= 28) return 8;
  return 9;
};

const crTier = (cr) => {
  const n = crToNumber(cr);
  if (n === null) return null;
  return CR_TIERS.find((tier) => n >= tier.min && n <= tier.max)?.id ?? null;
};

const flatten = (value) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flatten).join(' ');
  if (value && typeof value === 'object') {
    if (value.entries) return flatten(value.entries);
    if (value.items) return flatten(value.items);
    if (value.entry) return flatten(value.entry);
    if (value.special) return flatten(value.special);
  }
  return '';
};

const alignmentLabel = (value) => {
  const list = Array.isArray(value) ? value : [value];
  if (list.some((x) => x && typeof x === 'object')) {
    return list
      .map((x) => `${x.chance ? `${x.chance}% ` : ''}${alignmentLabel(x.alignment)}`)
      .join(' / ');
  }
  const codes = list.filter((x) => typeof x === 'string');
  if (!codes.length) return null;
  if (codes.includes('A')) return '任意阵营';
  if (codes.includes('U')) return '无阵营';
  if (codes.some((c) => c === 'NX' || c === 'NY')) {
    const hasE = codes.includes('E');
    const hasG = codes.includes('G');
    const hasL = codes.includes('L');
    const hasC = codes.includes('C');
    if (hasE && !hasG) return '任意邪恶';
    if (hasG && !hasE) return '任意善良';
    if (hasC && !hasL) return '任意混乱';
    if (hasL && !hasC) return '任意守序';
    return '任意阵营';
  }
  return codes.map((c) => ALIGNMENT[c] ?? c).join('');
};

const alignmentCodes = (value) => {
  const list = Array.isArray(value) ? value : [value];
  return unique(list.flatMap((x) => {
    if (typeof x === 'string') return [x];
    if (x && typeof x === 'object') return alignmentCodes(x.alignment);
    return [];
  }));
};

const sizeLabel = (code) => SIZE[code] ?? code;
const typeCode = (type) => (typeof type === 'string' ? type : type?.type);
const typeLabel = (type) => MONSTER_TYPE[typeCode(type)] ?? cleanText(typeCode(type));

const creatureTags = (type) => {
  const tags = Array.isArray(type?.tags) ? type.tags : [];
  return unique(
    tags.map((tag) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag === 'object') return `${tag.prefix ?? ''}${tag.tag ?? ''}`;
      return null;
    }),
  );
};

const parseArmorClass = (ac) => {
  const list = Array.isArray(ac) ? ac : [ac];
  const variants = list.map((entry) => {
    if (typeof entry === 'number') return { value: entry, from: [], condition: null };
    return {
      value: entry?.ac ?? null,
      from: (entry?.from ?? []).map((x) => cleanText(x)),
      condition: entry?.condition ? cleanText(entry.condition) : null,
    };
  });
  const first = variants[0] ?? { value: null, from: [], condition: null };
  return {
    value: first.value,
    from: first.from,
    condition: first.condition,
    variants: variants.length > 1 ? variants : null,
  };
};

const parseHitPoints = (hp) => {
  if (typeof hp === 'number') return { value: hp, formula: null, special: null };
  return {
    value: hp?.average ?? null,
    formula: hp?.formula ?? null,
    special: hp?.special ? cleanText(hp.special) : null,
  };
};

const SPEED_LABEL = {
  walk: '步行',
  fly: '飞行',
  swim: '游泳',
  climb: '攀爬',
  burrow: '掘地',
};

const parseSpeed = (speed) => {
  const values = {};
  const parts = [];
  let hover = false;
  for (const [key, value] of Object.entries(speed ?? {})) {
    if (key === 'canHover') {
      hover = Boolean(value);
      continue;
    }
    const label = SPEED_LABEL[key] ?? key;
    if (typeof value === 'number') {
      values[key] = value;
      parts.push(`${label} ${value} 尺`);
    } else if (value && typeof value === 'object') {
      const amount = value.number;
      if (typeof amount === 'number') {
        values[key] = amount;
        parts.push(`${label} ${amount} 尺${value.condition ? cleanText(value.condition) : ''}`);
      } else if (value.condition) {
        parts.push(`${label} ${cleanText(value.condition)}`);
      }
    }
  }
  if (hover && !parts.some((p) => p.includes('悬浮'))) parts.push('悬浮');
  return { text: parts.join('、'), values, hover };
};

const parseDamageList = (list) => {
  const flat = [];
  const details = [];
  for (const entry of Array.isArray(list) ? list : []) {
    if (typeof entry === 'string') {
      flat.push(DAMAGE_TYPE[entry] ?? cleanText(entry));
      continue;
    }
    if (entry && typeof entry === 'object') {
      const types = (entry.resist ?? entry.immune ?? entry.vulnerable ?? []).map(
        (type) => DAMAGE_TYPE[type] ?? cleanText(type),
      );
      flat.push(...types);
      if (entry.special) flat.push(cleanText(entry.special));
      details.push({
        types,
        special: entry.special ? cleanText(entry.special) : null,
        note: entry.note ? cleanText(entry.note) : null,
        pre_note: entry.preNote ? cleanText(entry.preNote) : null,
        conditional: Boolean(entry.cond),
      });
    }
  }
  return { flat: unique(flat), details };
};

const parseConditionList = (list) =>
  unique((Array.isArray(list) ? list : []).map((c) => CONDITION[c] ?? cleanText(c)));

const parseSavingThrows = (save) =>
  save
    ? Object.fromEntries(Object.entries(save).map(([key, value]) => [ABILITY[key] ?? key, value]))
    : null;

const parseSkills = (skill) =>
  skill
    ? Object.fromEntries(
        Object.entries(skill).map(([key, value]) => [SKILL[String(key).toLowerCase()] ?? cleanText(key), value]),
      )
    : null;

const parseUses = (text) => {
  if (typeof text !== 'string') return null;
  const match = text.match(/\((\d+)\s*\/\s*(?:Day|日)\)/i) ?? text.match(/(\d+)\s*\/\s*日/);
  return match ? { per_day: Number(match[1]) } : null;
};

const parseRecharge = (text) => {
  if (typeof text !== 'string') return null;
  const tagged = text.match(/\{@recharge\s+(\d+)\}/);
  const plain = text.match(/充能\s*(\d+)(?:\s*[-–~]\s*(\d+))?/);
  const min = tagged ? Number(tagged[1]) : plain ? Number(plain[1]) : null;
  if (min === null) return null;
  const max = plain?.[2] ? Number(plain[2]) : 6;
  return { min, max, label: min === max ? String(min) : `${min}-${max}` };
};

const parseCost = (text) => {
  if (typeof text !== 'string') return null;
  const match = text.match(/Costs?\s+(\d+)\s+Actions?/i) ?? text.match(/(?:消耗|花费)\s*(\d+)\s*个?动作/);
  return match ? Number(match[1]) : null;
};

const firstNumber = (text, re) => {
  const match = String(text ?? '').match(re);
  return match ? Number(match[1].replace('+', '')) : null;
};

const averageOfDice = (formula) => {
  const text = String(formula ?? '');
  const match = text.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
  if (!match) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const bonus = Number(match[3] ?? 0);
  return Math.floor((count * (sides + 1)) / 2 + bonus);
};

const parseDamageParts = (raw) => {
  const matches = [...String(raw ?? '').matchAll(/\{@damage\s+([^}|]+?)(?:\|[^}]*)?\}/g)];
  const parts = [];
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const formula = match[1].trim();
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const next = matches[i + 1]?.index ?? raw.length;
    const before = raw.slice(Math.max(0, start - 18), start);
    const after = raw.slice(end, Math.min(next, end + 80));

    const listed = before.match(/(\d+)\s*[（(]\s*$/) ?? before.match(/(\d+)\s*$/);
    const average = listed ? Number(listed[1]) : averageOfDice(formula);
    const typePattern = new RegExp(`(${DAMAGE_TYPE_ZH.join('|')})\\s*伤害`, 'g');
    const afterTypes = [...after.matchAll(typePattern)].map((match) => normalizeDamageType(match[1]));
    const beforeType = before.match(new RegExp(`(${DAMAGE_TYPE_ZH.join('|')})\\s*伤害`))?.[1] ?? null;
    const type = afterTypes[0] ?? normalizeDamageType(beforeType);
    const typeOptions = type ? unique(afterTypes.slice(1)) : damageTypeOptions(after);

    parts.push({
      damage_dice: formula,
      average_damage: average,
      damage_type: type,
      ...(typeOptions.length ? { damage_type_options: typeOptions } : {}),
      save_dc: null,
    });
  }
  return parts;
};

const parseAction = (action, kind) => {
  const raw = flatten(action.entries);
  const clauses = raw.split('。').map((c) => c.trim()).filter(Boolean);
  const attackClause = clauses.find((c) => /\{@atk|\{@hit/.test(c)) ?? null;
  const saveClause = clauses.find((c) => /\{@dc\s+\d+/.test(c)) ?? null;
  const damageClause =
    clauses.find((c) => /\{@h\}/.test(c) && /\{@damage/.test(c))
    ?? clauses.find((c) => /\{@damage/.test(c))
    ?? null;

  const statClause = attackClause ?? saveClause ?? damageClause ?? raw;
  const saveSource =
    damageClause && /\{@dc\s+\d+/.test(damageClause)
      ? damageClause
      : saveClause ?? damageClause ?? raw;

  const attackCodes = (statClause.match(/\{@atk\s+([a-z,]+)/i)?.[1] ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const attackLabel = unique(attackCodes.map((code) => ATTACK_LABEL[code] ?? code));

  const toHit = firstNumber(statClause, /\{@hit\s*([+-]?\d+)/);
  const saveDc = firstNumber(saveSource, /\{@dc\s*(\d+)/);
  const saveAbility =
    saveSource.match(/\{@dc\s*\d+\}[^。；]{0,24}?(力量|敏捷|体质|智力|感知|魅力)豁免/)?.[1]
    ?? saveSource.match(/(力量|敏捷|体质|智力|感知|魅力)豁免/)?.[1]
    ?? null;
  const reach = firstNumber(statClause, /触及(?:范围)?\s*(\d+)\s*(?:尺|英尺)/);
  const range =
    statClause.match(/(?:射程|范围)\s*([0-9]+(?:\s*\/\s*[0-9]+)?)\s*(?:尺|英尺)/)?.[1]?.replace(/\s+/g, '') ?? null;

  const parts = parseDamageParts(damageClause ?? raw);
  const damageDice = parts.map((p) => p.damage_dice);
  const averageDamage = parts.map((p) => p.average_damage);
  const damageTypes = unique(parts.flatMap((p) => [p.damage_type, ...(p.damage_type_options ?? [])]));

  const rawName = `${action.ENG_name ?? ''} ${action.name ?? ''} ${raw}`;
  const recharge = parseRecharge(`${action.ENG_name ?? ''} ${action.name ?? ''} ${raw}`);
  const uses = parseUses(`${action.ENG_name ?? ''} ${action.name ?? ''}`);
  const cost = parseCost(rawName);

  return {
    name: cleanName(action.name),
    name_en: cleanName(action.ENG_name ?? null),
    kind,
    attack: attackLabel.length ? attackLabel.join('、') : null,
    attack_codes: attackCodes,
    to_hit: toHit,
    save_dc: saveDc,
    save_ability: saveAbility,
    reach_ft: reach,
    range,
    recharge,
    uses,
    legendary_cost: kind === 'legendary' ? (cost ?? 1) : null,
    damage_dice: damageDice,
    average_damage: averageDamage,
    damage_types: damageTypes,
    parts,
  };
};

const collectSubtraits = (entries) => {
  const out = [];
  const walk = (value) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (value.name && (value.ENG_name || value.entry || value.entries) && value.type !== 'list') {
      out.push({ name: cleanName(value.name), name_en: cleanName(value.ENG_name ?? null) });
    }
    if (value.items) walk(value.items);
    if (value.entries) walk(value.entries);
    if (value.entry) walk(value.entry);
  };
  walk(entries);
  const seen = new Set();
  return out.filter((item) => {
    const key = item.name_en ?? item.name;
    if (!item.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseTrait = (trait) => {
  const rawName = `${trait.ENG_name ?? ''} ${trait.name ?? ''}`;
  return {
    name: cleanName(trait.name),
    name_en: cleanName(trait.ENG_name ?? null),
    recharge: parseRecharge(`${rawName} ${flatten(trait.entries)}`),
    uses: parseUses(rawName),
    subtraits: collectSubtraits(trait.entries),
  };
};

const parseSpellList = (list) => (Array.isArray(list) ? list.map((spell) => cleanName(spell)) : []);

const parseSpellcasting = (casting) => {
  const header = flatten(casting.headerEntries);
  const levelMatch = header.match(/(\d+)\s*级施法者/);
  const casterLevel = levelMatch ? Number(levelMatch[1]) : null;
  const atWill = parseSpellList(casting.will);
  const daily = {};
  for (const [key, value] of Object.entries(casting.daily ?? {})) daily[key] = parseSpellList(value);

  const levels = {};
  for (const [level, value] of Object.entries(casting.spells ?? {})) {
    if (Array.isArray(value)) levels[level] = { slots: null, spells: parseSpellList(value) };
    else levels[level] = { slots: value?.slots ?? null, spells: parseSpellList(value?.spells) };
  }

  const spellCount =
    atWill.length
    + Object.values(daily).reduce((sum, list) => sum + list.length, 0)
    + Object.values(levels).reduce((sum, entry) => sum + entry.spells.length, 0);

  return {
    name: cleanName(casting.name),
    name_en: cleanName(casting.ENG_name ?? null),
    kind: casting.type ?? 'spellcasting',
    ability: ABILITY[casting.ability] ?? cleanText(casting.ability ?? null),
    save_dc: firstNumber(header, /\{@dc\s*(\d+)/),
    to_hit: firstNumber(header, /\{@hit\s*([+-]?\d+)/),
    caster_level: casterLevel,
    at_will: atWill,
    daily,
    levels,
    spell_count: spellCount,
  };
};

const groupCode = (label) => GROUP[label] ?? slug(label);
const environmentCode = (code) => (ENVIRONMENT[code] ? code : slug(code));
const environmentLabel = (code) => ENVIRONMENT[code] ?? cleanText(code);

/* ------------------------------------------------------------------ */
/* builder                                                             */
/* ------------------------------------------------------------------ */

const buildMonsters = async () => {
  const data = await readJson('bestiary/bestiary-mm.json');
  return (data.monster ?? [])
    .filter((monster) => monster.source === 'MM')
    .map((monster) => {
      const type = monster.type;
      const typeId = typeCode(type);
      const sizes = (Array.isArray(monster.size) ? monster.size : [monster.size]).filter(Boolean);
      const sizeCodes = sizes.map((size) => SIZE_CODE[size] ?? size);
      const ac = parseArmorClass(monster.ac);
      const hp = parseHitPoints(monster.hp);
      const speed = parseSpeed(monster.speed);
      const resistance = parseDamageList(monster.resist);
      const immunity = parseDamageList(monster.immune);
      const vulnerability = parseDamageList(monster.vulnerable);
      const conditions = parseConditionList(monster.conditionImmune);
      const environments = unique((monster.environment ?? []).map(environmentCode));
      const groups = unique((monster.group ?? []).map(groupCode));
      const traits = (monster.trait ?? []).map(parseTrait);
      const actions = (monster.action ?? []).map((action) => parseAction(action, 'action'));
      const reactions = (monster.reaction ?? []).map((action) => parseAction(action, 'reaction'));
      const legendaryActions = (monster.legendary ?? []).map((action) => parseAction(action, 'legendary'));
      const spellcasting = (monster.spellcasting ?? []).map(parseSpellcasting);

      const rawCr = monster.cr;
      const cr = typeof rawCr === 'string' ? rawCr : rawCr?.cr ?? null;
      const crLair = typeof rawCr === 'object' ? rawCr?.lair ?? null : null;
      const crCoven = typeof rawCr === 'object' ? rawCr?.coven ?? null : null;
      const xp = typeof rawCr === 'object' && typeof rawCr?.xp === 'number' ? rawCr.xp : null;
      const crNumeric = crToNumber(cr);
      const tier = crTier(cr);
      const tags = creatureTags(type);
      const isLegendary = legendaryActions.length > 0;
      const hasLair = Boolean(crLair);
      const isSpellcaster = spellcasting.length > 0;
      const traitTags = unique((monster.traitTags ?? []).map((tag) => cleanText(tag)));
      const isShapechanger = traitTags.includes('Shapechanger') || traits.some((trait) => trait.name_en === 'Shapechanger');
      const hasReactions = reactions.length > 0;

      const record = {
        id: dedupeIds(`mm:monster:${slug(monster.ENG_name)}`),
        type: 'monster',
        name: cleanName(monster.name),
        name_en: cleanName(monster.ENG_name),
        size: sizes.map(sizeLabel),
        size_codes: sizeCodes,
        creature_type: typeLabel(type),
        creature_type_code: typeId,
        creature_tags: tags,
        swarm_size: type?.swarmSize ?? null,
        alignment: alignmentLabel(monster.alignment),
        alignment_codes: alignmentCodes(monster.alignment),
        alignment_options: Array.isArray(monster.alignment) && monster.alignment.some((x) => x && typeof x === 'object')
          ? monster.alignment.map((x) => ({
              alignment: alignmentLabel(x.alignment),
              chance: x.chance ?? null,
            }))
          : null,
        armor_class: ac.value,
        armor_class_from: ac.from,
        armor_class_condition: ac.condition,
        armor_class_variants: ac.variants,
        hit_points: hp.value,
        hit_points_formula: hp.formula,
        hit_points_special: hp.special,
        speed: speed.text,
        speed_ft: speed.values,
        hover: speed.hover,
        abilities: {
          str: monster.str,
          dex: monster.dex,
          con: monster.con,
          int: monster.int,
          wis: monster.wis,
          cha: monster.cha,
        },
        saving_throws: parseSavingThrows(monster.save),
        skills: parseSkills(monster.skill),
        damage_resistances: resistance.flat,
        damage_resistance_details: resistance.details.length ? resistance.details : null,
        damage_immunities: immunity.flat,
        damage_immunity_details: immunity.details.length ? immunity.details : null,
        damage_vulnerabilities: vulnerability.flat,
        damage_vulnerability_details: vulnerability.details.length ? vulnerability.details : null,
        condition_immunities: conditions,
        senses: (monster.senses ?? []).map((sense) => cleanText(sense)),
        passive_perception: monster.passive ?? null,
        languages: (monster.languages ?? []).map((language) => cleanText(language)),
        challenge_rating: cr,
        challenge_rating_numeric: crNumeric,
        challenge_rating_lair: crLair,
        challenge_rating_coven: crCoven,
        xp,
        proficiency_bonus: proficiencyBonus(cr),
        cr_tier: tier,
        environment: environments.map(environmentLabel),
        environment_codes: environments,
        group: groups.map((code) => GROUP_LABEL[code] ?? cleanText(code)),
        group_codes: groups,
        legendary_group: monster.legendaryGroup?.name ? cleanName(monster.legendaryGroup.name) : null,
        is_legendary: isLegendary,
        has_lair: hasLair,
        is_spellcaster: isSpellcaster,
        is_shapechanger: isShapechanger,
        has_reactions: hasReactions,
        trait_tags: traitTags,
        traits,
        actions,
        reactions,
        legendary_actions: legendaryActions,
        spellcasting,
        source: { book: 'MM', page: pageOf(monster), srd: Boolean(monster.srd) },
        brief: null,
      };

      record.brief = brief(
        `${record.size.join('/')} ${record.creature_type}${tags.length ? `（${tags.join('/')}）` : ''}`,
        `AC ${record.armor_class}`,
        `HP ${record.hit_points}`,
        `CR ${record.challenge_rating}${record.challenge_rating_lair ? `（巢穴 ${record.challenge_rating_lair}）` : ''}`,
        record.environment.length
          ? `${record.environment.slice(0, 3).join('/')}${record.environment.length > 3 ? ` 等 ${record.environment.length} 种` : ''}`
          : '环境未标注',
      );

      return record;
    })
    .sort((a, b) => (a.source.page ?? 0) - (b.source.page ?? 0) || a.name_en.localeCompare(b.name_en, 'en'));
};

const buildTaxonomy = (monsters) => {
  const typeCounts = {};
  const sizeCounts = {};
  const crCounts = {};
  const environmentCounts = {};
  const groupCounts = {};
  const indexes = {
    type: {},
    size: {},
    cr: {},
    environment: {},
    group: {},
    feature: {},
  };

  const add = (bucket, key, id) => {
    bucket[key] ??= [];
    bucket[key].push(id);
  };

  for (const monster of monsters) {
    add(indexes.type, monster.creature_type_code, monster.id);
    for (const code of monster.size_codes) add(indexes.size, code, monster.id);
    add(indexes.cr, monster.cr_tier, monster.id);
    if (monster.environment_codes.length) {
      for (const code of monster.environment_codes) add(indexes.environment, code, monster.id);
    } else {
      add(indexes.environment, 'unmarked', monster.id);
    }
    for (const code of monster.group_codes) add(indexes.group, code, monster.id);
    if (monster.is_legendary) add(indexes.feature, 'legendary', monster.id);
    if (monster.has_lair) add(indexes.feature, 'lair', monster.id);
    if (monster.is_spellcaster) add(indexes.feature, 'spellcaster', monster.id);
    if (monster.is_shapechanger) add(indexes.feature, 'shapechanger', monster.id);
    if (monster.has_reactions) add(indexes.feature, 'reactions', monster.id);

    typeCounts[monster.creature_type_code] = (typeCounts[monster.creature_type_code] ?? 0) + 1;
    for (const code of monster.size_codes) sizeCounts[code] = (sizeCounts[code] ?? 0) + 1;
    crCounts[monster.cr_tier] = (crCounts[monster.cr_tier] ?? 0) + 1;
    if (monster.environment_codes.length) {
      for (const code of monster.environment_codes) {
        environmentCounts[code] = (environmentCounts[code] ?? 0) + 1;
      }
    } else {
      environmentCounts.unmarked = (environmentCounts.unmarked ?? 0) + 1;
    }
    for (const code of monster.group_codes) groupCounts[code] = (groupCounts[code] ?? 0) + 1;
  }

  for (const [key, ids] of Object.entries(indexes)) {
    for (const [id, list] of Object.entries(ids)) ids[id] = unique(list);
  }

  const categories = (counts, labels, order = null) =>
    (order ?? Object.keys(labels))
      .filter((key) => counts[key] > 0)
      .map((key) => ({
        id: key,
        label: labels[key] ?? cleanText(key),
        count: counts[key],
        files: ['monsters.json'],
      }));

  const typeCategories = categories(typeCounts, MONSTER_TYPE, Object.keys(MONSTER_TYPE));
  const sizeCategories = categories(sizeCounts, SIZE_CODE_LABEL, Object.keys(SIZE_CODE_LABEL));
  const crCategories = categories(
    crCounts,
    Object.fromEntries(CR_TIERS.map((tier) => [tier.id, tier.label])),
    CR_TIERS.map((tier) => tier.id),
  );
  const environmentCategories = categories(
    environmentCounts,
    { ...ENVIRONMENT, unmarked: '未标注' },
    [...Object.keys(ENVIRONMENT), 'unmarked'],
  );
  const groupCategories = categories(
    groupCounts,
    GROUP_LABEL,
    Object.keys(GROUP_LABEL),
  );
  const featureCategories = categories(
    featureCountsFrom(monsters),
    Object.fromEntries(FEATURES.map((feature) => [feature.id, feature.label])),
    FEATURES.map((feature) => feature.id),
  );

  return {
    version: 1,
    book: 'MM',
    edition: '2014',
    total: monsters.length,
    groups: [
      {
        id: 'overview',
        label: '图鉴总览',
        categories: [{ id: 'monster', label: '怪物', count: monsters.length, files: ['monsters.json'] }],
      },
      { id: 'creature-type', label: '生物类型', categories: typeCategories },
      { id: 'size', label: '体型', categories: sizeCategories },
      { id: 'challenge-rating', label: '挑战等级', categories: crCategories },
      { id: 'environment', label: '栖息环境', categories: environmentCategories },
      { id: 'group', label: '怪物族群', categories: groupCategories },
      { id: 'features', label: '特性分类', categories: featureCategories },
    ],
    indexes,
    counts: {
      type: typeCounts,
      size: sizeCounts,
      cr: crCounts,
      environment: environmentCounts,
      group: groupCounts,
      feature: featureCountsFrom(monsters),
    },
  };
};

const featureCountsFrom = (monsters) => {
  const counts = {};
  for (const feature of FEATURES) counts[feature.id] = 0;
  for (const monster of monsters) {
    if (monster.is_legendary) counts.legendary += 1;
    if (monster.has_lair) counts.lair += 1;
    if (monster.is_spellcaster) counts.spellcaster += 1;
    if (monster.is_shapechanger) counts.shapechanger += 1;
    if (monster.has_reactions) counts.reactions += 1;
  }
  return counts;
};

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

const main = async () => {
  await mkdir(OUT, { recursive: true });

  const monsters = await buildMonsters();
  const taxonomy = buildTaxonomy(monsters);

  const files = {
    'monsters.json': monsters,
    'taxonomy.json': taxonomy,
  };

  const manifestFiles = [];
  for (const [name, value] of Object.entries(files)) {
    const text = `${JSON.stringify(value, null, 2)}\n`;
    const bytes = Buffer.byteLength(text);
    const sha256 = createHash('sha256').update(text).digest('hex');
    await writeFile(resolve(OUT, name), text);
    manifestFiles.push({ path: `data/mm/${name}`, records: Array.isArray(value) ? value.length : 1, bytes, sha256 });
  }

  const manifest = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    book: {
      title: 'Monster Manual',
      edition: '2014',
      abbr: 'MM',
      publisher: 'Wizards of the Coast',
    },
    source: {
      dataset: '5etools 中文镜像（5e.kiwee.top）',
      url: SOURCE_URL,
      snapshot: SNAPSHOT_DATE,
      translator: '不全书',
      translation_license: 'CC BY-NC-SA 4.0（译文；本库不复制正文）',
      page_basis: '英文原版 MM 页码',
    },
    policy: {
      prose: 'omitted',
      reason: '公开仓库不收录 MM 译文正文；只保留名称、页码、分类、规则机械值与生成式摘要。',
      private_text_pack: 'data/mm-private/text.json（不提交，可用 scripts/mm-query.mjs --with-text 合并）',
    },
    counts: {
      monster: monsters.length,
      legendary: taxonomy.counts.feature.legendary,
      lair: taxonomy.counts.feature.lair,
      spellcaster: taxonomy.counts.feature.spellcaster,
      shapechanger: taxonomy.counts.feature.shapechanger,
      reactions: taxonomy.counts.feature.reactions,
      by_type: taxonomy.counts.type,
      by_size: taxonomy.counts.size,
      by_cr_tier: taxonomy.counts.cr,
      by_environment: taxonomy.counts.environment,
      by_group: taxonomy.counts.group,
    },
    files: manifestFiles,
    notes: [
      '中文名来自 5etools 中文镜像（不全书），以 name_en 作为稳定标识。',
      '正文描述未入库；动作只保留名称、命中/豁免、射程、伤害骰与类型、充能/使用次数等机械字段。',
      'CR 为 2014 MM 原值；巢穴 CR 与鬼婆集会 CR 单独存放。',
      '环境标签来自 5etools 的 environment 字段；未标注的条目归入「未标注」。',
      '本库包含 MM 2014 的 450 条怪物数据，含变体条目（如吸血鬼施法者/战士、多种纳迦）与 2024 重印条目的 2014 版本。',
    ],
  };

  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(resolve(OUT, 'manifest.json'), manifestText);

  console.log(`MM library: ${monsters.length} monsters -> ${OUT}`);
  console.log(
    `types=${Object.keys(taxonomy.counts.type).length} sizes=${Object.keys(taxonomy.counts.size).length} ` +
      `cr_tiers=${Object.keys(taxonomy.counts.cr).length} environments=${Object.keys(taxonomy.counts.environment).length} ` +
      `groups=${Object.keys(taxonomy.counts.group).length}`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
