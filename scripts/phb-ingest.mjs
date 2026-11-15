#!/usr/bin/env node
/**
 * Ingest the D&D 5e (2014) Player's Handbook catalogue from a local snapshot of
 * the 5etools data files into the project's structured PHB library.
 *
 * The source snapshot is *not* committed: it contains full translated prose.
 * This script only keeps structured fields (names, pages, mechanics, tables)
 * and never copies `entries` / description prose into the output.
 *
 * Usage:
 *   PHB_SOURCE_DIR=/path/to/5etools/data node scripts/phb-ingest.mjs
 *
 * Expected source files (relative to PHB_SOURCE_DIR):
 *   spells/spells-phb.json, spells/sources.json
 *   races.json, backgrounds.json, feats.json
 *   items-base.json, items.json
 *   conditionsdiseases.json, deities.json, languages.json, skills.json, actions.json
 *   class/class-*.json (12 PHB classes)
 *   bestiary/bestiary-mm.json (for the 15 PHB appendix D creatures)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(process.env.PHB_SOURCE_DIR || resolve(ROOT, 'source'));
const OUT = resolve(ROOT, 'data/phb');
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

const ABILITY_FULL = {
  strength: '力量',
  dexterity: '敏捷',
  constitution: '体质',
  intelligence: '智力',
  wisdom: '感知',
  charisma: '魅力',
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

const SCHOOL = {
  A: ['防护', 'Abjuration'],
  C: ['咒法', 'Conjuration'],
  D: ['预言', 'Divination'],
  E: ['附魔', 'Enchantment'],
  V: ['塑能', 'Evocation'],
  I: ['幻术', 'Illusion'],
  N: ['死灵', 'Necromancy'],
  T: ['变化', 'Transmutation'],
};

const SIZE = { T: '微型', S: '小型', M: '中型', L: '大型', H: '巨型', G: '超巨型' };

const ARMOR = { light: '轻甲', medium: '中甲', heavy: '重甲', shield: '盾牌' };

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

const AREA = {
  S: '球状',
  Y: '圆柱',
  C: '立方',
  L: '线状',
  N: '锥状',
  R: '半径',
  Q: '方形',
  H: '半球',
  W: '墙状',
};

const PROPERTY = {
  '2H': '双手',
  A: '弹药',
  F: '灵巧',
  H: '重型',
  L: '轻型',
  LD: '装填',
  R: '触及',
  S: '特殊',
  T: '投掷',
  V: '双手可用',
};

const DAMAGE_CODE = { B: '钝击', P: '穿刺', S: '挥砍' };

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

const SPELL_TIME_UNIT = {
  action: '动作',
  'bonus action': '附赠动作',
  bonus: '附赠动作',
  reaction: '反应',
  round: '轮',
  minute: '分钟',
  hour: '小时',
  day: '天',
};

const WEAPON_LABEL = {
  battleaxe: '战斧',
  handaxe: '手斧',
  'light hammer': '轻锤',
  warhammer: '战锤',
  rapier: '刺剑',
  shortsword: '短剑',
  'hand crossbow': '手弩',
  longsword: '长剑',
  shortbow: '短弓',
  longbow: '长弓',
};

const TOOL_LABEL = {
  "thieves' tools": '盗贼工具',
  'disguise kit': '易容工具',
  'herbalism kit': '草药工具',
  "navigator's tools": '领航工具',
  "poisoner's kit": '毒药工具',
  "smith's tools": '铁匠工具',
  "tinker's tools": '修补工具',
  "brewer's supplies": '酿酒工具',
  "mason's tools": '石匠工具',
  "artisan's tools": '工匠工具',
  'gaming set': '游戏套组',
  'musical instrument': '乐器',
  'forgery kit': '文书伪造工具',
  anyGamingSet: '任意游戏套组',
  anyMusicalInstrument: '任意乐器',
  anyArtisansTool: '任意工匠工具',
  'vehicles (land)': '陆运载具',
  'vehicles (water)': '水运载具',
};

const EQUIPMENT_TYPE_LABEL = {
  instrumentMusical: '乐器（任选）',
  toolArtisan: '工匠工具（任选）',
  weaponMartialMelee: '军用近战武器（任选）',
  weaponMartial: '军用武器（任选）',
  weaponSimple: '简易武器（任选）',
  weaponSimpleMelee: '简易近战武器（任选）',
  weaponSimpleRanged: '简易远程武器（任选）',
};

const LANG_KEY = {
  common: '通用语',
  dwarvish: '矮人语',
  elvish: '精灵语',
  giant: '巨人语',
  gnomish: '侏儒语',
  goblin: '地精语',
  halfling: '半身人语',
  orc: '兽人语',
  abyssal: '深渊语',
  celestial: '天界语',
  draconic: '龙语',
  deep: '深潜语',
  deepSpeech: '深潜语',
  infernal: '炼狱语',
  primordial: '原初语',
  sylvan: '木族语',
  undercommon: '地底通用语',
  druidic: '德鲁伊语',
  thievescant: "盗贼黑话",
  'thieves cant': "盗贼黑话",
};

const TRAIT_TAG = {
  'Uncommon Race': '罕见种族',
  'Improved Resting': '特殊休息',
};

const PANTHEON_EN = {
  凯尔特: 'celtic',
  北欧: 'norse',
  埃及: 'egyptian',
  希腊: 'greek',
  灰鹰: 'greyhawk',
  艾伯伦: 'eberron',
  被遗忘的国度: 'forgotten-realms',
  非人类: 'nonhuman',
  龙枪: 'dragonlance',
};

const PHB_CLASS_BY_EN = {
  Barbarian: 'phb:class:barbarian',
  Bard: 'phb:class:bard',
  Cleric: 'phb:class:cleric',
  Druid: 'phb:class:druid',
  Fighter: 'phb:class:fighter',
  Monk: 'phb:class:monk',
  Paladin: 'phb:class:paladin',
  Ranger: 'phb:class:ranger',
  Rogue: 'phb:class:rogue',
  Sorcerer: 'phb:class:sorcerer',
  Warlock: 'phb:class:warlock',
  Wizard: 'phb:class:wizard',
};

const PHB_CLASS_FILES = [
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const cleanText = (value) => {
  if (typeof value !== 'string') return value;
  let out = value.replace(
    /\{@(\w+)(?:\s+([^}|]+))?(?:\|[^}]*)?\}/g,
    (_m, _tag, text) => text ?? _tag,
  );
  out = out.replace(/\{@(\w+)\}/g, '$1');
  return out.replace(/\s+/g, ' ').trim();
};

const cleanName = (value) => {
  if (typeof value !== 'string') return value;
  return cleanText(value.split('|')[0]);
};

const alignmentLabel = (value) => {
  const parts = Array.isArray(value) ? value : [value];
  if (!parts.length) return null;
  return parts.map((p) => ALIGNMENT[p] ?? cleanText(p)).join('');
};

const skillLabel = (key) => SKILL[String(key).toLowerCase()] ?? cleanText(key);

const proficiencyList = (list, labelFn) => {
  const out = [];
  for (const item of list ?? []) {
    if (typeof item === 'string') {
      out.push(labelFn(cleanName(item)));
      continue;
    }
    if (item.choose) {
      out.push({
        choose: {
          from: (item.choose.from ?? []).map((x) => labelFn(cleanName(x))),
          count: item.choose.count ?? 1,
        },
      });
      continue;
    }
    for (const [k, v] of Object.entries(item)) if (v === true) out.push(labelFn(cleanName(k)));
  }
  return out;
};

const skillProficiencyList = (list) => {
  const out = [];
  for (const item of list ?? []) {
    if (item.any) {
      out.push(`任意技能 ×${item.any}`);
      continue;
    }
    if (item.choose) {
      out.push({
        choose: {
          from: (item.choose.from ?? []).map((x) => skillLabel(cleanName(x))),
          count: item.choose.count ?? 1,
        },
      });
      continue;
    }
    for (const [k, v] of Object.entries(item)) if (v === true) out.push(skillLabel(k));
  }
  return out;
};

const featList = (list) =>
  (list ?? []).flatMap((item) => {
    if (item.any) return [`任意专长 ×${item.any}`];
    if (item.choose) return [{ choose: { from: item.choose.from ?? [], count: item.choose.count ?? 1 } }];
    return [];
  });

const slug = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unnamed';

const unique = (values) => [...new Set(values.filter(Boolean))];

const titleJoin = (items, sep = '/') => unique(items).join(sep);

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

const normalizeChoice = (value) => {
  if (value === true) return true;
  if (typeof value === 'string') return cleanText(value);
  if (value && typeof value === 'object') {
    if (value.choose) {
      const from = (value.choose.from ?? []).map((v) =>
        typeof v === 'string' ? ABILITY[v] ?? LANG_KEY[v] ?? cleanText(v) : cleanText(String(v)),
      );
      return { choose: { from, count: value.choose.count ?? 1 } };
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === true) out[k] = true;
      else out[k] = normalizeChoice(v);
    }
    return out;
  }
  return value;
};

const abilityLabel = (ability) => {
  if (!ability) return null;
  const fixed = [];
  const choices = [];
  for (const item of ability) {
    for (const [k, v] of Object.entries(item)) {
      if (ABILITY[k] && typeof v === 'number') fixed.push(`${v > 0 ? '+' : ''}${v} ${ABILITY[k]}`);
    }
    if (item.choose) {
      choices.push(
        `${item.choose.count ?? item.choose.amount ?? 1} 项自选（${(item.choose.from ?? []).map((a) => ABILITY[a] ?? a).join('/')}）`,
      );
    }
  }
  return brief(fixed.join(' / '), choices.join('；'));
};

const abilityBonuses = (ability) => {
  const fixed = {};
  let choose = null;
  for (const item of ability ?? []) {
    for (const [k, v] of Object.entries(item)) {
      if (ABILITY[k] && typeof v === 'number') fixed[k] = v;
    }
    if (item.choose) {
      choose = {
        from: (item.choose.from ?? []).map((a) => ABILITY[a] ?? a),
        count: item.choose.count ?? item.choose.amount ?? 1,
      };
    }
  }
  return { fixed, choose };
};

const RACE_ABILITY_OVERRIDE = {
  Human: [{ str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }],
};

const languageLabel = (list) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  const fixed = [];
  const choices = [];
  for (const item of list) {
    for (const [k, v] of Object.entries(item)) {
      if (k === 'anyStandard' || k === 'anyExotic' || k === 'any') {
        const label = k === 'anyStandard' ? '任意标准语言' : k === 'anyExotic' ? '任意异族语言' : '任意语言';
        choices.push(v === true ? label : `${label} ×${v}`);
      } else if (k === 'choose') {
        const from = (v.from ?? []).map((x) => LANG_KEY[x] ?? cleanText(x));
        choices.push(`从 ${from.join('/')} 中选 ${v.count ?? 1}`);
      } else if (v === true) {
        fixed.push(LANG_KEY[k] ?? cleanText(k));
      }
    }
  }
  return brief(fixed.join('、'), choices.join('；'));
};

const resistLabel = (list) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  const parts = [];
  for (const item of list) {
    if (typeof item === 'string') parts.push(DAMAGE_TYPE[item] ?? cleanText(item));
    else if (item.choose) parts.push(`自选：${(item.choose.from ?? []).join('/')}`);
  }
  return parts.join('、');
};

const speedLabel = (speed) => {
  if (typeof speed === 'number') return `${speed} 尺`;
  if (speed && typeof speed === 'object') {
    return Object.entries(speed)
      .filter(([, v]) => typeof v === 'number')
      .map(([k, v]) => {
        const name = k === 'walk' ? '步行' : k === 'fly' ? '飞行' : k === 'swim' ? '游泳' : k === 'climb' ? '攀爬' : k === 'burrow' ? '掘地' : k;
        return `${name} ${v} 尺`;
      })
      .join('、');
  }
  return null;
};

const timeLabel = (time) => {
  if (!Array.isArray(time) || time.length === 0) return null;
  return time
    .map((t) => {
      if (typeof t === 'string') return cleanText(t);
      const n = t.number ?? 1;
      const unit = t.unit ?? '';
      const zh = SPELL_TIME_UNIT[unit] ?? cleanText(unit);
      return `${n} ${zh}`.trim();
    })
    .join(' + ');
};

const rangeLabel = (range) => {
  if (!range) return null;
  const dist = range.distance;
  if (dist) {
    if (dist.type === 'touch') return '触碰';
    if (dist.type === 'self') return '自身';
    if (dist.type === 'sight') return '视线';
    if (dist.type === 'unlimited') return '无限';
    if (typeof dist.amount === 'number') {
      const unit = dist.type === 'mile' || dist.type === 'miles' ? '英里' : '尺';
      return range.type === 'radius' ? `半径 ${dist.amount} ${unit}` : `${dist.amount} ${unit}`;
    }
  }
  if (range.type === 'self') return '自身';
  if (range.type === 'touch') return '触碰';
  if (range.type === 'sight') return '视线';
  if (range.type === 'unlimited') return '无限';
  return cleanText(range.type);
};

const durationLabel = (duration) => {
  if (!Array.isArray(duration) || duration.length === 0) return null;
  const d = duration[0];
  const concentration = d.concentration ? '专注，' : '';
  if (d.type === 'instant') return '瞬时';
  if (d.type === 'permanent') return '永久';
  if (d.type === 'special') return '特殊';
  if (d.type === 'timed' && d.duration) {
    const n = d.duration.amount;
    const unit = d.duration.type === 'minute' ? '分钟' : d.duration.type === 'hour' ? '小时' : d.duration.type === 'round' ? '轮' : d.duration.type === 'day' ? '天' : d.duration.type;
    return `${concentration}${n}${unit}`;
  }
  return cleanText(d.type);
};

const extractSpellMechanics = (spell) => {
  const baseRaw = JSON.stringify(spell.entries ?? []);
  const higherRaw = JSON.stringify(spell.entriesHigherLevel ?? []);
  const byLevel = spell.scalingLevelDice?.scaling ?? null;
  const baseDamage = byLevel
    ? unique([byLevel['1']].filter(Boolean))
    : unique([...baseRaw.matchAll(/\{@damage\s+([^}|]+)/g)].map((m) => m[1]));
  const healing = unique([...baseRaw.matchAll(/\{@heal\s+([^}|]+)/g)].map((m) => m[1]));
  const perSlot = [...higherRaw.matchAll(/\{@scaledamage\s+([^}|]+)\|([^|}\]]+)\|([^}]+)/g)].map((m) => ({
    base: m[1],
    levels: m[2],
    per_slot: m[3],
  }));
  return {
    damage_dice: baseDamage,
    healing_dice: healing,
    scaling: { by_level: byLevel, per_slot: perSlot },
  };
};

const normalizeTables = (groups) => {
  return (groups ?? []).map((group) => {
    const columns = (group.colLabels ?? []).map((c) => cleanText(c));
    const rows = (group.rows ?? group.rowsSpellProgression ?? []).map((row) =>
      (row ?? []).map((cell) => {
        if (cell && typeof cell === 'object') {
          if (cell.type === 'dice' && Array.isArray(cell.toRoll)) {
            return cell.toRoll.map((d) => `${d.number ?? 1}d${d.faces}`).join(' + ');
          }
          if ('value' in cell) return cell.value;
          if ('type' in cell && cell.type === 'bonus') return cell.value;
          return cleanText(JSON.stringify(cell));
        }
        return typeof cell === 'string' ? cleanText(cell) : cell;
      }),
    );
    return {
      title: group.title ? cleanText(group.title) : null,
      columns,
      rows,
    };
  });
};

const backgroundFeature = (record) => {
  const queue = [...(record.entries ?? [])];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;
    if (node.data?.isFeature) {
      return {
        name: node.name ? cleanText(node.name) : null,
        name_en: node.ENG_name ? String(node.ENG_name).replace(/^Feature:\s*/i, '') : null,
      };
    }
    if (Array.isArray(node.entries)) queue.push(...node.entries);
    if (Array.isArray(node.items)) queue.push(...node.items);
  }
  return null;
};

const resolveCopy = (record, pool) => {
  if (!record?._copy) return record;
  const { ENG_name, name, source } = record._copy;
  const parent = pool.find(
    (x) => x.source === source && x.ENG_name === ENG_name && (name === undefined || x.name === name),
  );
  if (!parent) return record;
  const merged = { ...parent, ...record };
  for (const [key, mod] of Object.entries(record._copy._mod ?? {})) {
    if (key !== 'entries') continue;
    const mods = Array.isArray(mod) ? mod : [mod];
    let entries = [...(parent.entries ?? [])];
    for (const m of mods) {
      if (m.mode === 'replaceArr') {
        const idx = m.replace?.index;
        if (typeof idx === 'number') entries[idx] = m.items;
        else {
          const pos = entries.findIndex((e) => e && typeof e === 'object' && e.name === m.replace);
          if (pos >= 0) entries[pos] = m.items;
        }
      } else if (m.mode === 'insertArr') {
        entries.splice(m.index ?? entries.length, 0, m.items);
      } else if (m.mode === 'appendArr') {
        entries = entries.concat(m.items);
      }
    }
    merged.entries = entries;
  }
  return merged;
};

const requirementLabel = (req) =>
  Object.entries(req ?? {})
    .map(([k, v]) => {
      if (k === 'or' && Array.isArray(v)) {
        return v
          .flatMap((item) => Object.entries(item ?? {}).map(([ak, av]) => (ABILITY[ak] ? `${ABILITY[ak]} ${av}` : `${ak} ${av}`)))
          .join(' 或 ');
      }
      if (k === 'and' && Array.isArray(v)) return v.map(requirementLabel).join(' 且 ');
      if (ABILITY[k]) return `${ABILITY[k]} ${v}`;
      return typeof v === 'object' ? `${k} 复合条件` : cleanText(`${k} ${v}`);
    })
    .join('；');

const normalizeMulticlassing = (mc) => {
  if (!mc) return null;
  return {
    ...deepClean(mc),
    requirements_label: requirementLabel(mc.requirements ?? {}),
    proficienciesGained: mc.proficienciesGained
      ? {
          ...deepClean(mc.proficienciesGained),
          armor: (mc.proficienciesGained.armor ?? []).map((a) => ARMOR[a] ?? cleanText(a)),
          skills: (mc.proficienciesGained.skills ?? []).map((s) =>
            s.choose
              ? { choose: { from: (s.choose.from ?? []).map((x) => skillLabel(x)), count: s.choose.count ?? 1 } }
              : s,
          ),
        }
      : null,
  };
};

const deepClean = (value) => {
  if (typeof value === 'string') return cleanText(value);
  if (Array.isArray(value)) return value.map(deepClean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepClean(v)]));
  }
  return value;
};

const formatEquipmentItem = (item) => {
  if (typeof item === 'string') return EQUIPMENT_TYPE_LABEL[item] ?? cleanName(item);
  if (!item || typeof item !== 'object') return cleanText(String(item));
  if (item.displayName) return cleanText(item.displayName);
  if (item.equipmentType) return EQUIPMENT_TYPE_LABEL[item.equipmentType] ?? cleanText(item.equipmentType);
  if (typeof item.value === 'number') return `价值 ${item.value / 100} gp`;
  if (item.item) {
    const name = cleanName(item.item);
    return item.containsValue ? `${name}（含 ${item.containsValue / 100} gp）` : name;
  }
  if (item.special) return item.quantity && item.quantity > 1 ? `${cleanText(item.special)} ×${item.quantity}` : cleanText(item.special);
  return cleanText(JSON.stringify(item));
};

/* ------------------------------------------------------------------ */
/* builders                                                           */
/* ------------------------------------------------------------------ */

const buildSpells = async (classesById) => {
  const data = await readJson('spells/spells-phb.json');
  const classMap = (await readJson('spells/sources.json')).PHB ?? {};
  return data.spell
    .filter((s) => s.source === 'PHB')
    .map((s) => {
      const [schoolZh, schoolEn] = SCHOOL[s.school] ?? [cleanText(s.school), s.school];
      const mechanics = extractSpellMechanics(s);
      return {
        id: dedupeIds(`phb:spell:${slug(s.ENG_name)}`),
        type: 'spell',
        name: s.name,
        name_en: s.ENG_name,
        level: s.level,
        level_label: s.level === 0 ? '戏法' : `${s.level} 环`,
        school: schoolEn,
        school_zh: schoolZh,
        classes: unique(
          (classMap[s.name]?.class ?? [])
            .map((c) => PHB_CLASS_BY_EN[c.ENG_name])
            .filter((id) => classesById.has(id)),
        ).sort(),
        class_names: unique(
          (classMap[s.name]?.class ?? [])
            .filter((c) => classesById.has(PHB_CLASS_BY_EN[c.ENG_name]))
            .map((c) => c.name),
        ),
        casting_time: timeLabel(s.time),
        range: rangeLabel(s.range),
        components: {
          verbal: Boolean(s.components?.v),
          somatic: Boolean(s.components?.s),
          material: s.components?.m
            ? typeof s.components.m === 'string'
              ? cleanText(s.components.m)
              : cleanText(s.components.m.text ?? '')
            : null,
          material_cost_gp: s.components?.m && typeof s.components.m === 'object' && s.components.m.cost
            ? s.components.m.cost / 100
            : null,
          material_consumed: Boolean(s.components?.m && typeof s.components.m === 'object' && s.components.m.consume),
          label: brief(s.components?.v ? 'V' : null, s.components?.s ? 'S' : null, s.components?.m ? 'M' : null),
        },
        duration: durationLabel(s.duration),
        concentration: Array.isArray(s.duration) && s.duration.some((d) => d.concentration),
        saving_throw: unique((s.savingThrow ?? []).map((a) => ABILITY[a] ?? ABILITY_FULL[a] ?? a)),
        attack: s.spellAttack === 'R' ? '远程法术攻击' : s.spellAttack === 'M' ? '近战法术攻击' : null,
        damage: {
          types: unique((s.damageInflict ?? []).map((t) => DAMAGE_TYPE[t] ?? cleanText(t))),
          dice: mechanics.damage_dice,
          healing_dice: mechanics.healing_dice,
          scaling: mechanics.scaling,
        },
        area: unique((s.areaTags ?? []).filter((t) => !['ST', 'MT'].includes(t)).map((t) => AREA[t] ?? t)),
        targets: unique(
          (s.areaTags ?? [])
            .filter((t) => ['ST', 'MT'].includes(t))
            .map((t) => (t === 'ST' ? '单体' : '多目标')),
        ),
        ritual: Boolean(s.meta?.ritual),
        source: { book: 'PHB', page: pageOf(s), srd: Boolean(s.srd) },
        brief: null,
      };
    })
    .map((s) => ({
      ...s,
      brief: brief(
        s.level_label,
        s.school_zh,
        s.casting_time,
        s.range,
        s.components.label,
        s.duration,
        s.saving_throw.length ? `${s.saving_throw.join('/')}豁免` : null,
        s.damage.dice.length ? `${s.damage.dice.join(' / ')}${s.damage.types.length ? ' ' + s.damage.types.join('/') : ''}` : null,
        s.area.length ? s.area.join('/') : null,
      ),
    }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'zh'));
};

const profBrief = (entry) => {
  const fmt = (list) =>
    (list ?? [])
      .map((x) => (typeof x === 'string' ? x : `自选 ${x.choose.count}（${x.choose.from.join('/')}）`))
      .join('/');
  return brief(
    entry.skill_proficiencies?.length ? `技能 ${fmt(entry.skill_proficiencies)}` : null,
    entry.weapon_proficiencies?.length ? `武器 ${fmt(entry.weapon_proficiencies)}` : null,
    entry.armor_proficiencies?.length ? `护甲 ${fmt(entry.armor_proficiencies)}` : null,
    entry.tool_proficiencies?.length ? `工具 ${fmt(entry.tool_proficiencies)}` : null,
    entry.feat_choices?.length ? `专长 ${fmt(entry.feat_choices)}` : null,
  );
};

const buildRaces = async () => {
  const data = await readJson('races.json');
  const phbRaces = data.race.filter((r) => r.source === 'PHB');
  const phbSubraces = data.subrace.filter(
    (r) => r.source === 'PHB' && r.ENG_name && phbRaces.some((p) => p.name === r.raceName),
  );
  const raceId = (r) => `phb:race:${slug(r.ENG_name)}`;
  const raceByZh = new Map(phbRaces.map((r) => [r.name, r]));
  const subraceId = (r) => `phb:subrace:${slug(raceByZh.get(r.raceName)?.ENG_name ?? r.raceName)}-${slug(r.ENG_name)}`;

  const races = phbRaces.map((r) => {
    const abilitySource = r.ability ?? RACE_ABILITY_OVERRIDE[r.ENG_name] ?? null;
    const skillProfs = skillProficiencyList(r.skillProficiencies);
    const toolProfs = proficiencyList(r.toolProficiencies, (t) => TOOL_LABEL[t] ?? t);
    const weaponProfs = proficiencyList(r.weaponProficiencies, (w) => WEAPON_LABEL[w] ?? w);
    const armorProfs = proficiencyList(r.armorProficiencies, (a) => ARMOR[a] ?? a);
    const traits = (r.entries ?? [])
      .filter((e) => e && typeof e === 'object' && e.name)
      .map((e) => ({ name: cleanText(e.name), name_en: e.ENG_name ? cleanText(e.ENG_name) : null }));
    const entry = {
      id: raceId(r),
      type: 'race',
      name: r.name,
      name_en: r.ENG_name,
      size: (r.size ?? []).map((s) => SIZE[s] ?? s),
      speed: speedLabel(r.speed),
      darkvision_ft: r.darkvision ?? null,
      ability: abilityLabel(abilitySource),
      ability_bonuses: abilityBonuses(abilitySource),
      skill_proficiencies: skillProfs,
      tool_proficiencies: toolProfs,
      weapon_proficiencies: weaponProfs,
      armor_proficiencies: armorProfs,
      feat_choices: featList(r.feats),
      languages: languageLabel(r.languageProficiencies),
      resistances: resistLabel(r.resist),
      immunities: resistLabel(r.immune),
      traits,
      tags: (r.traitTags ?? []).map((t) => TRAIT_TAG[t] ?? cleanText(t)),
      subraces: phbSubraces.filter((s) => s.raceName === r.name).map(subraceId),
      source: { book: 'PHB', page: pageOf(r), srd: Boolean(r.srd) },
      brief: null,
    };
    return {
      ...entry,
      brief: brief(
        entry.size.join('/'),
        entry.speed,
        entry.ability,
        entry.darkvision_ft ? `黑暗视觉 ${entry.darkvision_ft} 尺` : null,
        entry.resistances ? `抗性 ${entry.resistances}` : null,
        profBrief(entry),
      ),
    };
  });

  const subraces = phbSubraces.map((r) => {
    const parent = phbRaces.find((p) => p.name === r.raceName);
    const parentAbilitySource = parent?.ability ?? RACE_ABILITY_OVERRIDE[parent?.ENG_name] ?? null;
    const parentAbility = parentAbilitySource ? abilityLabel(parentAbilitySource) : null;
    const skillProfs = skillProficiencyList(r.skillProficiencies);
    const toolProfs = proficiencyList(r.toolProficiencies, (t) => TOOL_LABEL[t] ?? t);
    const weaponProfs = proficiencyList(r.weaponProficiencies, (w) => WEAPON_LABEL[w] ?? w);
    const armorProfs = proficiencyList(r.armorProficiencies, (a) => ARMOR[a] ?? a);
    const traits = (r.entries ?? [])
      .filter((e) => e && typeof e === 'object' && e.name)
      .map((e) => ({ name: cleanText(e.name), name_en: e.ENG_name ? cleanText(e.ENG_name) : null }));
    const entry = {
      id: subraceId(r),
      type: 'subrace',
      name: r.name,
      display_name: `${r.name}${r.raceName}`,
      name_en: r.ENG_name,
      parent_race: parent ? raceId(parent) : null,
      parent_race_name: r.raceName,
      parent_values: parent
        ? {
            ability: abilityLabel(parentAbilitySource),
            size: (parent.size ?? []).map((x) => SIZE[x] ?? x),
            speed: speedLabel(parent.speed),
            darkvision_ft: parent.darkvision ?? null,
            resistances: resistLabel(parent.resist),
            languages: languageLabel(parent.languageProficiencies),
            skill_proficiencies: skillProficiencyList(parent.skillProficiencies),
            tool_proficiencies: proficiencyList(parent.toolProficiencies, (t) => TOOL_LABEL[t] ?? t),
            weapon_proficiencies: proficiencyList(parent.weaponProficiencies, (w) => WEAPON_LABEL[w] ?? w),
            armor_proficiencies: proficiencyList(parent.armorProficiencies, (a) => ARMOR[a] ?? a),
            feat_choices: featList(parent.feats),
          }
        : null,
      is_variant: r.ENG_name === 'Variant',
      ability_replaces_parent: r.ENG_name === 'Variant',
      size: (r.size ?? []).map((s) => SIZE[s] ?? s),
      speed: r.speed ? speedLabel(r.speed) : null,
      darkvision_ft: r.darkvision ?? null,
      ability: abilityLabel(r.ability),
      ability_bonuses: abilityBonuses(r.ability),
      skill_proficiencies: skillProfs,
      tool_proficiencies: toolProfs,
      weapon_proficiencies: weaponProfs,
      armor_proficiencies: armorProfs,
      feat_choices: featList(r.feats),
      languages: languageLabel(r.languageProficiencies),
      resistances: resistLabel(r.resist),
      immunities: resistLabel(r.immune),
      traits,
      source: { book: 'PHB', page: pageOf(r), srd: Boolean(r.srd) },
      brief: null,
    };
    return {
      ...entry,
      brief: brief(
        `${entry.name}${entry.parent_race_name}`,
        !entry.ability_replaces_parent && parentAbility ? `${parentAbility}（种族）` : null,
        entry.ability ? `${entry.ability}${entry.ability_replaces_parent ? '（替换种族属性）' : '（亚种）'}` : null,
        entry.speed ? `速度 ${entry.speed}` : null,
        entry.darkvision_ft ? `黑暗视觉 ${entry.darkvision_ft} 尺` : null,
        profBrief(entry),
      ),
    };
  });

  return [...races, ...subraces].sort((a, b) => (a.type === b.type ? 0 : a.type === 'race' ? -1 : 1));
};

const buildClasses = async () => {
  const classes = [];
  const subclasses = [];
  const features = [];

  for (const file of PHB_CLASS_FILES) {
    const data = await readJson(`class/class-${file}.json`);
    const cls = data.class.find((c) => c.source === 'PHB' && !c.classSource);
    if (!cls) continue;
    const classId = `phb:class:${slug(cls.ENG_name)}`;
    const classFeatureList = (data.classFeature ?? []).filter(
      (f) => f.source === 'PHB' && f.classSource === 'PHB',
    );
    const subclassList = (data.subclass ?? []).filter(
      (s) => s.source === 'PHB' && s.classSource === 'PHB',
    );
    const subclassFeatureList = (data.subclassFeature ?? []).filter(
      (f) => f.source === 'PHB' && f.classSource === 'PHB',
    );

    const featureIds = [];
    const placeholderLevels = new Set();
    for (const f of classFeatureList) {
      const isPlaceholder = /\bfeature$/i.test(f.ENG_name ?? '');
      if (isPlaceholder) {
        if (placeholderLevels.has(f.level)) continue;
        placeholderLevels.add(f.level);
      }
      const id = dedupeIds(`phb:feature:${slug(cls.ENG_name)}-${f.level}-${slug(f.ENG_name ?? f.name)}`);
      featureIds.push(id);
      features.push({
        id,
        type: 'class-feature',
        name: f.name,
        name_en: f.ENG_name ?? null,
        class: classId,
        class_name: cls.name,
        subclass: null,
        subclass_name: null,
        level: f.level,
        is_placeholder: isPlaceholder,
        source: { book: 'PHB', page: pageOf(f), srd: Boolean(f.srd) },
        brief: brief(cls.name, `${f.level} 级`, f.ENG_name ?? f.name, isPlaceholder ? '子职业特性位' : null),
      });
    }

    for (const s of subclassList) {
      const subId = `phb:subclass:${slug(cls.ENG_name)}-${slug(s.ENG_name)}`;
      const subFeatureIds = [];
      for (const f of subclassFeatureList) {
        if (f.subclassShortName !== s.shortName) continue;
        if (f.ENG_name === s.ENG_name || f.name === s.name) continue;
        const isPlaceholder = /\bfeature$/i.test(f.ENG_name ?? '');
        const id = dedupeIds(
          `phb:feature:${slug(cls.ENG_name)}-${slug(s.ENG_name)}-${f.level}-${slug(f.ENG_name ?? f.name)}`,
        );
        subFeatureIds.push(id);
        features.push({
          id,
          type: 'class-feature',
          name: f.name,
          name_en: f.ENG_name ?? null,
          class: classId,
          class_name: cls.name,
          subclass: subId,
          subclass_name: s.name,
          level: f.level,
          is_placeholder: isPlaceholder,
          source: { book: 'PHB', page: pageOf(f), srd: Boolean(f.srd) },
          brief: brief(cls.name, s.name, `${f.level} 级`, f.ENG_name ?? f.name),
        });
      }
      subclasses.push({
        id: subId,
        type: 'subclass',
        name: s.name,
        name_en: s.ENG_name,
        short_name: s.shortName ?? null,
        class: classId,
        class_name: cls.name,
        features: subFeatureIds,
        source: { book: 'PHB', page: pageOf(s), srd: Boolean(s.srd) },
        brief: brief(cls.name, s.name, `${subFeatureIds.length} 项特性`),
      });
    }

    const tables = normalizeTables(cls.classTableGroups);
    const spellcasting = cls.spellcastingAbility
      ? {
          ability: ABILITY[cls.spellcastingAbility] ?? cls.spellcastingAbility,
          progression: cls.casterProgression ?? null,
          prepared: cls.preparedSpells ?? null,
          cantrips_known: cls.cantripProgression ?? null,
        }
      : null;
    const starting = cls.startingProficiencies ?? {};
    const skillChoice = (starting.skills ?? []).find((s) => s.choose);
    const anySkill = (starting.skills ?? []).find((s) => s.any);
    const prof = {
      armor: (starting.armor ?? []).map((a) =>
        typeof a === 'string' ? ARMOR[a] ?? cleanText(a) : `${ARMOR[a.proficiency] ?? cleanText(a.proficiency)}（德鲁伊不使用金属制）`,
      ),
      weapons: (starting.weapons ?? []).map((w) => cleanText(w)),
      tools: (starting.tools ?? []).map((t) => (typeof t === 'string' ? cleanText(t) : normalizeChoice(t))),
      skills: starting.skills
        ? {
            from: (skillChoice?.choose?.from ?? []).map((s) => skillLabel(s)),
            count: skillChoice?.choose?.count ?? anySkill?.any ?? null,
            any: Boolean(anySkill),
          }
        : null,
      saving_throws: (cls.proficiency ?? []).map((a) => ABILITY[a] ?? a),
    };
    const equipment = cls.startingEquipment
      ? {
          default: (cls.startingEquipment.default ?? []).map((e) => cleanText(e)),
          gold_alternative: cls.startingEquipment.goldAlternative
            ? cleanText(cls.startingEquipment.goldAlternative)
            : null,
          from_background: Boolean(cls.startingEquipment.additionalFromBackground),
        }
      : null;

    classes.push({
      id: classId,
      type: 'class',
      name: cls.name,
      name_en: cls.ENG_name,
      hit_die: cls.hd ? `d${cls.hd.faces}` : null,
      saving_throws: prof.saving_throws,
      proficiencies: prof,
      starting_equipment: equipment,
      multiclassing: normalizeMulticlassing(cls.multiclassing),
      spellcasting,
      subclass_title: cls.subclassTitle ? cleanText(cls.subclassTitle) : null,
      tables,
      features: featureIds,
      subclasses: subclassList.map(
        (s) => `phb:subclass:${slug(cls.ENG_name)}-${slug(s.ENG_name)}`,
      ),
      source: { book: 'PHB', page: pageOf(cls), srd: Boolean(cls.srd) },
      brief: brief(
        cls.hd ? `生命骰 d${cls.hd.faces}` : null,
        `豁免 ${prof.saving_throws.join('/')}`,
        prof.armor.length ? `护甲 ${prof.armor.join('/')}` : null,
        prof.weapons.length ? `武器 ${prof.weapons.join('/')}` : null,
        prof.skills?.count
          ? prof.skills.any
            ? `技能 任意 ${prof.skills.count} 项`
            : `技能 ${prof.skills.from.length} 选 ${prof.skills.count}`
          : null,
        cls.spellcastingAbility ? `施法属性 ${ABILITY[cls.spellcastingAbility]}` : null,
      ),
    });
  }

  return {
    classes: classes.sort((a, b) => a.page - b.page),
    subclasses: subclasses.sort((a, b) => a.class_name.localeCompare(b.class_name, 'zh') || a.page - b.page),
    features: features.sort(
      (a, b) =>
        a.class_name.localeCompare(b.class_name, 'zh') ||
        a.level - b.level ||
        (a.subclass_name ?? '').localeCompare(b.subclass_name ?? '', 'zh') ||
        a.name.localeCompare(b.name, 'zh'),
    ),
  };
};

const BACKGROUND_FEATURE_NAME_OVERRIDE = {
  'Variant Criminal (Spy)': '密探接头人',
};

const buildBackgrounds = async () => {
  const data = await readJson('backgrounds.json');
  const pool = data.background;
  const phb = pool.filter((b) => b.source === 'PHB');
  return phb
    .map((raw) => resolveCopy(raw, pool))
    .map((b) => {
      const isVariant = String(b.ENG_name).startsWith('Variant ') || String(b.name).startsWith('变体');
      const isCustom = /custom/i.test(b.ENG_name ?? '') || String(b.name).includes('自定义');
      const parentEn = b._copy?.ENG_name ?? null;
      const feature = backgroundFeature(b);
      const entry = {
        id: dedupeIds(`phb:background:${slug(b.ENG_name)}`),
        type: 'background',
        name: b.name,
        name_en: b.ENG_name,
        is_variant: isVariant,
        is_custom: isCustom,
        variant_of: parentEn ? `phb:background:${slug(parentEn)}` : null,
        skill_proficiencies: Object.keys(b.skillProficiencies?.[0] ?? {}).map((k) =>
          k === 'any' ? '任意两项' : skillLabel(k),
        ),
        tool_proficiencies: (b.toolProficiencies ?? []).map((t) =>
          typeof t === 'string'
            ? TOOL_LABEL[t] ?? cleanText(t)
            : Object.fromEntries(
                Object.entries(t).map(([k, v]) => [
                  TOOL_LABEL[k] ?? k,
                  k === 'choose' && v && typeof v === 'object'
                    ? {
                        ...deepClean(v),
                        from: (v.from ?? []).map((x) => TOOL_LABEL[x] ?? cleanText(x)),
                      }
                    : typeof v === 'number'
                      ? v
                      : deepClean(v),
                ]),
              ),
        ),
        language_proficiencies: languageLabel(b.languageProficiencies),
        equipment: (b.startingEquipment ?? []).map((group) =>
          Object.entries(group).map(([key, items]) => ({
            option: key,
            items: (Array.isArray(items) ? items : [items]).map(formatEquipmentItem),
          })),
        ),
        feature: feature
          ? {
              name: BACKGROUND_FEATURE_NAME_OVERRIDE[b.ENG_name]
                ? BACKGROUND_FEATURE_NAME_OVERRIDE[b.ENG_name]
                : feature.name
                  ? cleanText(feature.name).replace(/^(特性|Feature)[：:]\s*/i, '')
                  : null,
              name_en: feature.name_en ?? null,
            }
          : null,
        source: { book: 'PHB', page: pageOf(b), srd: Boolean(b.srd) },
        brief: null,
      };
      return {
        ...entry,
        brief: brief(
          entry.skill_proficiencies.length ? `技能 ${entry.skill_proficiencies.join('/')}` : null,
          entry.language_proficiencies ? `语言 ${entry.language_proficiencies}` : null,
          entry.feature?.name ? `特性 ${entry.feature.name}` : null,
        ),
      };
    })
    .sort((a, b) => Number(a.is_variant) - Number(b.is_variant) || a.page - b.page);
};

const sanitizeGrant = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeGrant);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'entry' || k === 'entries') continue;
      if (k === 'from' && Array.isArray(v)) out[k] = v.map((x) => ABILITY[x] ?? cleanText(x));
      else out[k] = sanitizeGrant(v);
    }
    return out;
  }
  return typeof value === 'string' ? cleanText(value) : value;
};

const FEAT_PREREQUISITE_OVERRIDE = {
  'Crossbow Expert': ['敏捷 13+'],
  'Dual Wielder': ['力量 13+ 或 敏捷 13+'],
  'Great Weapon Master': ['力量 13+'],
  Sharpshooter: ['敏捷 13+'],
};

const buildFeats = async () => {
  const data = await readJson('feats.json');
  return data.feat
    .filter((f) => f.source === 'PHB')
    .map((f) => {
      const computedPrereq = (f.prerequisite ?? []).map((p) => {
        if (p.ability) {
          return p.ability
            .map((a) =>
              Object.entries(a)
                .filter(([k]) => ABILITY[k])
                .map(([k, v]) => `${ABILITY[k]} ${v}+`)
                .join('/'),
            )
            .join(' 或 ');
        }
        if (p.spellcasting) return '施法能力';
        if (p.proficiency) {
          return p.proficiency
            .map((x) => (x.armor ? `${ARMOR[x.armor] ?? x.armor}熟练` : JSON.stringify(x)))
            .join(' 或 ');
        }
        if (p.race) return `${(p.race[0]?.name ?? []).join('/')} 种族`;
        return cleanText(JSON.stringify(p));
      });
      const prereq = FEAT_PREREQUISITE_OVERRIDE[f.ENG_name] ?? computedPrereq;
      const grants = {};
      for (const key of [
        'ability',
        'skillProficiencies',
        'expertise',
        'senses',
        'weaponProficiencies',
        'armorProficiencies',
        'toolProficiencies',
        'languageProficiencies',
        'resist',
        'immune',
        'conditionImmune',
        'savingThrowProficiencies',
        'skillToolLanguageProficiencies',
        'additionalSpells',
        'optionalfeatureProgression',
        'traitTags',
      ]) {
        if (f[key]) grants[key] = sanitizeGrant(f[key]);
      }
      if (grants.weaponProficiencies) {
        grants.weaponProficiencies = grants.weaponProficiencies.map((g) =>
          g.choose?.fromFilter
            ? { choose: g.choose, label: `任意 ${g.choose.count ?? 1} 项军用武器` }
            : g,
        );
      }
      const entry = {
        id: dedupeIds(`phb:feat:${slug(f.ENG_name)}`),
        type: 'feat',
        name: f.name,
        name_en: f.ENG_name,
        prerequisite: prereq,
        ability: abilityLabel(f.ability),
        grants,
        source: { book: 'PHB', page: pageOf(f), srd: Boolean(f.srd) },
        brief: null,
      };
      return {
        ...entry,
        brief: brief(
          '专长',
          prereq.length ? `前置 ${prereq.join('；')}` : '无前置',
          entry.ability ? `属性 ${entry.ability}` : null,
          grants.skillProficiencies ? '技能熟练' : null,
          grants.senses ? '感官强化' : null,
        ),
      };
    })
    .sort((a, b) => a.page - b.page || a.name.localeCompare(b.name, 'zh'));
};

const ITEM_TYPE = {
  M: ['weapon', '近战武器'],
  R: ['weapon', '远程武器'],
  A: ['ammunition', '弹药'],
  HA: ['armor', '重甲'],
  MA: ['armor', '中甲'],
  LA: ['armor', '轻甲'],
  S: ['shield', '盾牌'],
  G: ['gear', '冒险用品'],
  T: ['tool', '工具'],
  GS: ['gaming-set', '游戏套组'],
  MNT: ['mount', '坐骑'],
  VEH: ['vehicle', '载具'],
  TAH: ['tack', '马具'],
  TG: ['trade-good', '贸易商品'],
  FD: ['food-drink', '食物与饮料'],
  SCF: ['focus', '施法法器'],
  $C: ['currency', '货币'],
  P: ['pack', '套组'],
  INS: ['instrument', '乐器'],
  AT: ['tool', '工匠工具'],
};

const buildEquipment = async () => {
  const base = (await readJson('items-base.json')).baseitem ?? [];
  const items = (await readJson('items.json')).item ?? [];
  const phb = [...base, ...items].filter((i) => i.source === 'PHB' && i.type);
  const byEn = new Map();
  for (const item of phb) {
    const key = item.ENG_name ?? item.name;
    const prev = byEn.get(key);
    if (!prev) byEn.set(key, item);
    else {
      const score = (x) =>
        ['dmg1', 'ac', 'weight', 'value', 'property', 'packContents', 'strength', 'stealth'].filter(
          (k) => x[k] !== undefined,
        ).length;
      if (score(item) > score(prev)) byEn.set(key, item);
    }
  }
  return [...byEn.values()]
    .map((i) => {
      const isPack = /套组$/.test(i.name) || /(?:^|\s)Pack$/i.test(i.ENG_name ?? '');
      const [category, subtype] = isPack ? ['pack', '套组'] : ITEM_TYPE[i.type] ?? ['other', cleanText(String(i.type))];
      const properties = (i.property ?? []).map((p) => cleanText(p));
      const entry = {
        id: dedupeIds(`phb:item:${slug(i.ENG_name)}`),
        type: 'item',
        name: i.name,
        name_en: i.ENG_name,
        category,
        subtype,
        weapon_category: i.weaponCategory ?? null,
        damage: i.dmg1
          ? {
              one_handed: i.dmg1,
              two_handed: i.dmg2 ?? null,
              type: DAMAGE_CODE[i.dmgType] ?? DAMAGE_TYPE[i.dmgType] ?? cleanText(i.dmgType ?? ''),
            }
          : null,
        range: i.range
          ? (() => {
              const [normal, long] = String(i.range).split('/');
              return { normal: Number(normal), long: long ? Number(long) : null };
            })()
          : null,
        armor_class: i.ac ?? null,
        strength: i.strength ?? null,
        stealth_disadvantage: Boolean(i.stealth),
        properties: (i.property ?? []).map((p) => PROPERTY[p] ?? cleanText(p)),
        weight_lb: i.weight ?? null,
        cost_cp: i.value ?? null,
        cost_gp: i.value !== undefined ? Math.round(i.value) / 100 : null,
        pack_contents: (i.packContents ?? []).map((c) =>
          typeof c === 'string'
            ? { item: cleanName(c), quantity: 1 }
            : { item: cleanName(c.item ?? c.special ?? ''), quantity: c.quantity ?? 1 },
        ),
        source: { book: 'PHB', page: pageOf(i), srd: Boolean(i.srd) },
        brief: null,
      };
      return {
        ...entry,
        brief: brief(
          entry.subtype,
          entry.damage
            ? `${entry.damage.one_handed}${entry.damage.two_handed ? `（双手 ${entry.damage.two_handed}）` : ''} ${entry.damage.type}`
            : null,
          entry.armor_class ? (entry.category === 'shield' ? `AC +${entry.armor_class}` : `AC ${entry.armor_class}`) : null,
          entry.weight_lb !== null ? `${entry.weight_lb} 磅` : null,
          entry.cost_gp !== null ? `${entry.cost_gp} gp` : null,
        ),
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'zh'));
};

const buildSimple = async (file, key, mapFn) => {
  const data = await readJson(file);
  return (data[key] ?? []).filter((x) => x.source === 'PHB').map(mapFn);
};

const buildRules = async () => {
  const actions = await buildSimple('actions.json', 'action', (a) => ({
    id: dedupeIds(`phb:action:${slug(a.ENG_name)}`),
    type: 'action',
    name: a.name,
    name_en: a.ENG_name,
    // 5etools has Attack as "1 minute"; the PHB combat action is 1 action.
    time: a.ENG_name === 'Attack' ? '1 动作' : timeLabel(a.time),
    source: { book: 'PHB', page: pageOf(a), srd: Boolean(a.srd) },
    brief: brief(a.name, timeLabel(a.time)),
  }));
  const skills = await buildSimple('skills.json', 'skill', (s) => ({
    id: dedupeIds(`phb:skill:${slug(s.ENG_name)}`),
    type: 'skill',
    name: s.name,
    name_en: s.ENG_name,
    ability: ABILITY[s.ability] ?? ABILITY_FULL[s.ability] ?? s.ability,
    source: { book: 'PHB', page: pageOf(s), srd: Boolean(s.srd) },
    brief: brief(s.name, ABILITY[s.ability] ?? ABILITY_FULL[s.ability] ?? s.ability),
  }));
  const languages = await buildSimple('languages.json', 'language', (l) => ({
    id: dedupeIds(`phb:language:${slug(l.ENG_name)}`),
    type: 'language',
    name: l.name,
    name_en: l.ENG_name,
    kind: l.type ?? null,
    kind_label: l.type === 'standard' ? '标准' : l.type === 'exotic' ? '异族' : l.type === 'secret' ? '秘密' : null,
    typical_speakers: (l.typicalSpeakers ?? []).map(cleanText),
    source: { book: 'PHB', page: pageOf(l), srd: Boolean(l.srd) },
    brief: brief(l.name, l.type === 'standard' ? '标准语言' : l.type === 'exotic' ? '异族语言' : l.type === 'secret' ? '秘密语言' : null),
  }));
  const abilities = Object.entries(ABILITY).map(([key, zh]) => ({
    id: `phb:ability:${key}`,
    type: 'ability',
    name: zh,
    name_en: key.toUpperCase(),
    skills: skills.filter((s) => s.ability === zh).map((s) => s.id),
    source: { book: 'PHB', page: 173, srd: true },
    brief: `${zh}（${key.toUpperCase()}）`,
  }));
  return {
    abilities,
    skills: skills.sort((a, b) => a.name.localeCompare(b.name, 'zh')),
    actions: actions.sort((a, b) => a.page - b.page || a.name.localeCompare(b.name, 'zh')),
    languages: languages.sort((a, b) => a.page - b.page || a.name.localeCompare(b.name, 'zh')),
  };
};

const buildConditions = async () => {
  const data = await readJson('conditionsdiseases.json');
  return data.condition
    .filter((c) => c.source === 'PHB')
    .map((c) => ({
      id: dedupeIds(`phb:condition:${slug(c.ENG_name)}`),
      type: 'condition',
      name: c.name,
      name_en: c.ENG_name,
      source: { book: 'PHB', page: pageOf(c), srd: Boolean(c.srd) },
      brief: brief(c.name, `PHB p.${pageOf(c)}`),
    }))
    .sort((a, b) => a.page - b.page || a.name.localeCompare(b.name, 'zh'));
};

const buildDeities = async () => {
  const data = await readJson('deities.json');
  return data.deity
    .filter((d) => d.source === 'PHB')
    .map((d) => {
      const align = Array.isArray(d.alignment) ? d.alignment.join('') : null;
      return {
        id: dedupeIds(`phb:deity:${slug(d.ENG_name)}${d.pantheon ? '-' + (PANTHEON_EN[d.pantheon] ?? slug(d.pantheon)) : ''}`),
        type: 'deity',
        name: d.name,
        name_en: d.ENG_name,
        pantheon: d.pantheon ?? null,
        alignment: align,
        domains: (d.domains ?? []).map(cleanText),
        province: d.title ? cleanText(d.title) : null,
        symbol: d.symbol ? cleanText(d.symbol) : null,
        source: { book: 'PHB', page: pageOf(d), srd: Boolean(d.srd) },
        brief: brief(
          d.pantheon,
          align ? `阵营 ${align}` : null,
          d.domains?.length ? `领域 ${d.domains.map(cleanText).join('/')}` : null,
          d.symbol ? `圣徽 ${cleanText(d.symbol)}` : null,
        ),
      };
    })
    .sort((a, b) => a.page - b.page || a.pantheon.localeCompare(b.pantheon, 'zh') || a.name.localeCompare(b.name, 'zh'));
};

const PLANES = [
  ['Material Plane', '物质位面', 'material', null, '凡俗世界所在的主位面'],
  ['Feywild', '妖精荒野', 'transitive', null, '与物质位面重叠的妖精镜像'],
  ['Shadowfell', '堕影冥界', 'transitive', null, '与物质位面重叠的灰暗镜像'],
  ['Ethereal Plane', '以太位面', 'transitive', null, '包裹物质位面的雾状位面'],
  ['Astral Plane', '星界', 'transitive', null, '连接诸界的银色虚空'],
  ['Elemental Plane of Air', '气元素位面', 'inner', null, '四大元素位面之一'],
  ['Elemental Plane of Earth', '土元素位面', 'inner', null, '四大元素位面之一'],
  ['Elemental Plane of Fire', '火元素位面', 'inner', null, '四大元素位面之一'],
  ['Elemental Plane of Water', '水元素位面', 'inner', null, '四大元素位面之一'],
  ['Elemental Chaos', '元素混沌', 'inner', null, '元素位面交汇的混沌'],
  ['Positive Energy Plane', '正能量位面', 'inner', null, '生命能量的源头'],
  ['Negative Energy Plane', '负能量位面', 'inner', null, '死亡与腐朽的源头'],
  ['Mechanus', '机械境', 'outer', 'LN', '绝对秩序的外层位面'],
  ['Arcadia', '阿卡狄亚', 'outer', 'LN/LG', '秩序与善良的外层位面'],
  ['Mount Celestia', '七丘天堂', 'outer', 'LG', '善良与律法的外层位面'],
  ['Bytopia', '双生天堂', 'outer', 'LG/NG', '勤劳与善良的外层位面'],
  ['Elysium', '极乐境', 'outer', 'NG', '善良与自由的外层位面'],
  ['The Beastlands', '兽乡', 'outer', 'NG/CG', '野性与善良的外层位面'],
  ['Arborea', '乔木仙境', 'outer', 'CG', '自由与善良的外层位面'],
  ['Ysgard', '约顿海姆', 'outer', 'CG/CN', '英雄与混沌的外层位面'],
  ['Limbo', '混沌海', 'outer', 'CN', '纯粹混沌的外层位面'],
  ['Pandemonium', '喧嚣空隧', 'outer', 'CN/CE', '疯狂与混沌的外层位面'],
  ['The Abyss', '深渊', 'outer', 'CE', '恶魔盘踞的外层位面'],
  ['Carceri', '卡瑟利', 'outer', 'CE/NE', '囚禁与背叛的外层位面'],
  ['Hades', '哈迪斯', 'outer', 'NE', '灰暗与邪恶的外层位面'],
  ['Gehenna', '焦炎地狱', 'outer', 'NE/LE', '贪婪与邪恶的外层位面'],
  ['The Nine Hells', '九层地狱', 'outer', 'LE', '魔鬼统治的外层位面'],
  ['Acheron', '阿刻戎', 'outer', 'LE/LN', '战争与秩序的外层位面'],
  ['The Outlands', '外域', 'outer', 'N', '环绕印记城的中立外层位面'],
  ['Sigil', '印记城', 'outer', 'N', '万门之城'],
  ['Demiplanes', '半位面', 'demiplane', null, '由魔法创造的小型位面'],
];

const buildPlanes = async () =>
  PLANES.map(([en, zh, category, alignment, note]) => ({
    id: `phb:plane:${slug(en)}`,
    type: 'plane',
    name: zh,
    name_en: en,
    category,
    category_label:
      category === 'material'
        ? '主位面'
        : category === 'transitive'
          ? '过渡位面'
          : category === 'inner'
            ? '内层位面'
            : category === 'outer'
              ? '外层位面'
              : '半位面',
    alignment,
    note,
    source: { book: 'PHB', page: 300, srd: false },
    brief: brief(zh, alignment, note),
  })).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'zh'));

const PHB_APPENDIX_D = [
  'Ape',
  'Baboon',
  'Badger',
  'Bat',
  'Cat',
  'Crab',
  'Frog',
  'Hawk',
  'Lizard',
  'Owl',
  'Poisonous Snake',
  'Rat',
  'Raven',
  'Spider',
  'Weasel',
];

const parseMonsterAction = (action) => {
  const raw = JSON.stringify(action.entries ?? []);
  const atk = raw.match(/\{@atk\s+(\w+)/)?.[1] ?? null;
  const toHit = raw.match(/\{@hit\s+(-?\d+)/)?.[1];
  const reach = raw.match(/触及\s*(\d+)\s*尺/)?.[1];
  const range = raw.match(/射程\s*([\d/]+)\s*尺/)?.[1];
  const parts = [];
  for (const segment of raw.split(/[。；，]/)) {
    const dice = [...segment.matchAll(/\{@damage\s+([^}|]+)/g)].map((m) => m[1]);
    const average =
      segment.match(/\{@h\}\s*(\d+)/)?.[1] ??
      segment.match(/(\d+)\s*（\{@damage/)?.[1] ??
      null;
    const type = segment.match(/(钝击|穿刺|挥砍|强酸|寒冷|火焰|闪电|雷鸣|毒素|黯蚀|光耀|心灵|力场)伤害/)?.[1] ?? null;
    const dc = segment.match(/\{@dc\s+(\d+)/)?.[1];
    if (dice.length || type || dc || average !== null) {
      parts.push({
        average_damage: average === null ? null : Number(average),
        damage_dice: dice,
        damage_type: type,
        save_dc: dc === undefined ? null : Number(dc),
      });
    }
  }
  return {
    name: action.name,
    name_en: action.ENG_name ?? null,
    attack: atk === 'mw' ? '近战武器' : atk === 'rw' ? '远程武器' : atk === 'ms' ? '近战法术' : atk === 'rs' ? '远程法术' : null,
    to_hit: toHit === undefined ? null : Number(toHit),
    save_dc: parts.find((p) => p.save_dc !== null)?.save_dc ?? null,
    reach_ft: reach === undefined ? null : Number(reach),
    range: range ?? null,
    damage_dice: unique(parts.flatMap((p) => p.damage_dice)),
    average_damage: parts.map((p) => p.average_damage).filter((n) => n !== null),
    damage_types: unique(parts.map((p) => p.damage_type).filter(Boolean)),
    parts,
  };
};

const buildMonsters = async () => {
  const data = await readJson('bestiary/bestiary-mm.json');
  return data.monster
    .filter((m) => PHB_APPENDIX_D.includes(m.ENG_name))
    .map((m) => {
      const ac = Array.isArray(m.ac) ? (typeof m.ac[0] === 'object' ? m.ac[0].ac : m.ac[0]) : m.ac;
      const hp = typeof m.hp === 'object' ? m.hp.average ?? m.hp.special ?? null : m.hp;
      const cr = typeof m.cr === 'object' ? m.cr.cr : m.cr;
      const abilities = {
        str: m.str,
        dex: m.dex,
        con: m.con,
        int: m.int,
        wis: m.wis,
        cha: m.cha,
      };
      return {
        id: `phb:monster:${slug(m.ENG_name)}`,
        type: 'monster',
        name: m.name,
        name_en: m.ENG_name,
        size: (Array.isArray(m.size) ? m.size : [m.size]).map((s) => SIZE[s] ?? s),
        creature_type: MONSTER_TYPE[m.type] ?? m.type ?? null,
        alignment: alignmentLabel(m.alignment),
        armor_class: ac,
        hit_points: hp,
        speed: speedLabel(m.speed),
        abilities,
        skills: m.skill
          ? Object.fromEntries(Object.entries(m.skill).map(([k, v]) => [SKILL[k] ?? k, v]))
          : null,
        senses: Array.isArray(m.senses)
          ? m.senses.map(cleanText)
          : m.senses
            ? Object.fromEntries(
                Object.entries(m.senses).map(([k, v]) => [k === 'passive' ? '被动察觉' : k, deepClean(v)]),
              )
            : null,
        languages: Array.isArray(m.languages)
          ? m.languages.map(cleanText)
          : m.languages
            ? cleanText(m.languages)
            : null,
        challenge_rating: cr,
        actions: (m.action ?? []).map(parseMonsterAction),
        source: { book: 'PHB', page: null, srd: Boolean(m.srd), note: 'PHB 附录 D；数据与 MM 同名条目一致' },
        brief: brief(
          `${(Array.isArray(m.size) ? m.size : [m.size]).map((s) => SIZE[s] ?? s).join('/')} ${MONSTER_TYPE[m.type] ?? m.type ?? ''}`,
          `AC ${ac}`,
          `HP ${hp}`,
          speedLabel(m.speed),
          `CR ${cr}`,
        ),
      };
    })
    .sort((a, b) => PHB_APPENDIX_D.indexOf(a.name_en) - PHB_APPENDIX_D.indexOf(b.name_en));
};

/* ------------------------------------------------------------------ */
/* main                                                               */
/* ------------------------------------------------------------------ */

const main = async () => {
  await mkdir(OUT, { recursive: true });

  const classes = await buildClasses();
  const classesById = new Set(classes.classes.map((c) => c.id));
  const spells = await buildSpells(classesById);
  const races = await buildRaces();
  const backgrounds = await buildBackgrounds();
  const feats = await buildFeats();
  const equipment = await buildEquipment();
  const conditions = await buildConditions();
  const rules = await buildRules();
  const deities = await buildDeities();
  const planes = await buildPlanes();
  const monsters = await buildMonsters();

  const files = {
    'races.json': races,
    'classes.json': classes.classes,
    'subclasses.json': classes.subclasses,
    'class-features.json': classes.features,
    'backgrounds.json': backgrounds,
    'feats.json': feats,
    'spells.json': spells,
    'equipment.json': equipment,
    'conditions.json': conditions,
    'rules.json': rules,
    'deities.json': deities,
    'planes.json': planes,
    'monsters.json': monsters,
  };

  const fileMeta = [];
  for (const [name, records] of Object.entries(files)) {
    const text = JSON.stringify(records, null, 2) + '\n';
    await writeFile(resolve(OUT, name), text);
    const recordCount = Array.isArray(records)
      ? records.length
      : Object.values(records).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
    fileMeta.push({
      path: `data/phb/${name}`,
      records: recordCount,
      bytes: Buffer.byteLength(text),
      sha256: createHash('sha256').update(text).digest('hex'),
    });
  }

  const taxonomy = {
    version: 1,
    book: 'PHB',
    edition: '2014',
    groups: [
      {
        id: 'character',
        label: '角色创建',
        categories: [
          { id: 'race', label: '种族', files: ['races.json'], count: races.filter((r) => r.type === 'race').length },
          { id: 'subrace', label: '亚种', files: ['races.json'], count: races.filter((r) => r.type === 'subrace').length },
          { id: 'class', label: '职业', files: ['classes.json'], count: classes.classes.length },
          { id: 'subclass', label: '子职业', files: ['subclasses.json'], count: classes.subclasses.length },
          { id: 'class-feature', label: '职业特性', files: ['class-features.json'], count: classes.features.length },
          { id: 'background', label: '背景', files: ['backgrounds.json'], count: backgrounds.length },
          { id: 'feat', label: '专长', files: ['feats.json'], count: feats.length },
        ],
      },
      {
        id: 'rules',
        label: '规则参考',
        categories: [
          { id: 'ability', label: '属性', files: ['rules.json'], count: rules.abilities.length },
          { id: 'skill', label: '技能', files: ['rules.json'], count: rules.skills.length },
          { id: 'action', label: '动作', files: ['rules.json'], count: rules.actions.length },
          { id: 'condition', label: '状态', files: ['conditions.json'], count: conditions.length },
          { id: 'language', label: '语言', files: ['rules.json'], count: rules.languages.length },
        ],
      },
      {
        id: 'magic',
        label: '魔法',
        categories: [{ id: 'spell', label: '法术', files: ['spells.json'], count: spells.length }],
      },
      {
        id: 'equipment',
        label: '装备',
        categories: [{ id: 'item', label: '物品', files: ['equipment.json'], count: equipment.length }],
      },
      {
        id: 'world',
        label: '世界',
        categories: [
          { id: 'deity', label: '神祇', files: ['deities.json'], count: deities.length },
          { id: 'plane', label: '位面', files: ['planes.json'], count: planes.length },
        ],
      },
      {
        id: 'bestiary',
        label: '生物',
        categories: [{ id: 'monster', label: '野兽与魔宠', files: ['monsters.json'], count: monsters.length }],
      },
    ],
  };
  await writeFile(resolve(OUT, 'taxonomy.json'), JSON.stringify(taxonomy, null, 2) + '\n');

  const counts = Object.fromEntries(
    taxonomy.groups.flatMap((g) => g.categories.map((c) => [c.id, c.count])),
  );
  const manifest = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    book: {
      title: "Player's Handbook",
      edition: '2014',
      abbr: 'PHB',
      publisher: 'Wizards of the Coast',
    },
    source: {
      dataset: '5etools 中文镜像（5e.kiwee.top）',
      url: SOURCE_URL,
      snapshot: SNAPSHOT_DATE,
      translator: '不全书',
      translation_license: 'CC BY-NC-SA 4.0（译文；本库不复制正文）',
      page_basis: '英文原版 PHB 页码（与 288 页民间汉化 PDF 的书页不同）',
    },
    policy: {
      prose: 'omitted',
      reason: '公开仓库不收录 PHB 译文正文；只保留结构化字段、页码与生成式机械摘要。',
      private_text_pack: 'data/phb-private/text.json（不提交，可用 scripts/phb-query.mjs --with-text 合并）',
    },
    counts,
    files: fileMeta,
    notes: [
      '中文名来自 5etools 中文镜像（不全书），与项目既有词表的译名可能不同；以 name_en 作为稳定标识。',
      '正文描述未入库；brief 由结构化字段生成，不是原文摘录。',
      '第 5 章装备为 PHB  mundane equipment；魔法物品属于 DMG，不在本库范围。',
      'PHB 附录 D 的 15 种生物按同名 MM 数据入库，单独页码未记录。',
    ],
  };
  await writeFile(resolve(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log('PHB ingest complete');
  for (const c of Object.entries(counts)) console.log(`  ${c[0]}: ${c[1]}`);
  const totalRecords = Object.values(files).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
  console.log(`  files: ${fileMeta.length}, total: ${totalRecords} records`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
