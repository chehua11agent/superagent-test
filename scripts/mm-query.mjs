#!/usr/bin/env node
/**
 * Query the structured Monster Manual library.
 *
 * Examples:
 *   node scripts/mm-query.mjs --type dragon
 *   node scripts/mm-query.mjs --type dragon --cr-min 17 --sort cr
 *   node scripts/mm-query.mjs --environment 幽暗地域 --size 中型
 *   node scripts/mm-query.mjs --group 色彩龙 --legendary
 *   node scripts/mm-query.mjs --spellcaster --search 火
 *   node scripts/mm-query.mjs --type undead --json --all
 *   node scripts/mm-query.mjs --stats
 *
 * Optional private text pack (not committed):
 *   data/mm-private/text.json  {"mm:monster:goblin": {"text": "..."}}
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLibrary } from './mm-validate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_TEXT_FILE = resolve(ROOT, 'data/mm-private/text.json');

const SIZE_ALIASES = {
  t: 'tiny',
  tiny: 'tiny',
  微型: 'tiny',
  s: 'small',
  small: 'small',
  小型: 'small',
  m: 'medium',
  medium: 'medium',
  中型: 'medium',
  l: 'large',
  large: 'large',
  大型: 'large',
  h: 'huge',
  huge: 'huge',
  巨型: 'huge',
  g: 'gargantuan',
  gargantuan: 'gargantuan',
  超巨型: 'gargantuan',
};

const TYPE_ALIASES = {
  aberration: 'aberration',
  异怪: 'aberration',
  beast: 'beast',
  野兽: 'beast',
  celestial: 'celestial',
  天界生物: 'celestial',
  construct: 'construct',
  构装体: 'construct',
  dragon: 'dragon',
  龙: 'dragon',
  elemental: 'elemental',
  元素: 'elemental',
  fey: 'fey',
  妖精: 'fey',
  fiend: 'fiend',
  邪魔: 'fiend',
  giant: 'giant',
  巨人: 'giant',
  humanoid: 'humanoid',
  类人生物: 'humanoid',
  monstrosity: 'monstrosity',
  怪物: 'monstrosity',
  ooze: 'ooze',
  泥怪: 'ooze',
  plant: 'plant',
  植物: 'plant',
  undead: 'undead',
  亡灵: 'undead',
};

const ENVIRONMENT_ALIASES = {
  arctic: 'arctic',
  极地: 'arctic',
  coastal: 'coastal',
  海岸: 'coastal',
  desert: 'desert',
  沙漠: 'desert',
  forest: 'forest',
  森林: 'forest',
  grassland: 'grassland',
  草原: 'grassland',
  hill: 'hill',
  丘陵: 'hill',
  mountain: 'mountain',
  山地: 'mountain',
  swamp: 'swamp',
  沼泽: 'swamp',
  underdark: 'underdark',
  幽暗地域: 'underdark',
  underwater: 'underwater',
  水下: 'underwater',
  urban: 'urban',
  城市: 'urban',
  unmarked: 'unmarked',
  未标注: 'unmarked',
};

const GROUP_ALIASES = {
  'chromatic-dragon': 'chromatic-dragon',
  色彩龙: 'chromatic-dragon',
  'metallic-dragon': 'metallic-dragon',
  金属龙: 'metallic-dragon',
  dinosaur: 'dinosaur',
  恐龙: 'dinosaur',
  modron: 'modron',
  魔冢: 'modron',
  lycanthrope: 'lycanthrope',
  兽化人: 'lycanthrope',
  genie: 'genie',
  巨灵: 'genie',
  'animated-object': 'animated-object',
  被活化的物件: 'animated-object',
  beholder: 'beholder',
  眼魔: 'beholder',
  angel: 'angel',
  天使: 'angel',
  sphinx: 'sphinx',
  斯芬克斯们: 'sphinx',
};

const crNumber = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const [a, b] = text.split('/');
  const n = b ? Number(a) / Number(b) : Number(text);
  return Number.isFinite(n) ? n : null;
};

const splitValues = (value) =>
  String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const mapValues = (value, aliases, label) => {
  return splitValues(value).map((item) => {
    const key = aliases[item] ?? aliases[item.toLowerCase()];
    if (!key) throw new Error(`unknown ${label}: ${item}`);
    return key;
  });
};

const flattenSpellNames = (monster) => {
  const out = [];
  for (const casting of monster.spellcasting ?? []) {
    out.push(...(casting.at_will ?? []));
    for (const list of Object.values(casting.daily ?? {})) out.push(...(list ?? []));
    for (const entry of Object.values(casting.levels ?? {})) out.push(...(entry?.spells ?? []));
  }
  return out;
};

const searchableText = (monster) =>
  [
    monster.name,
    monster.name_en,
    monster.creature_type,
    monster.creature_type_code,
    ...(monster.creature_tags ?? []),
    ...(monster.environment ?? []),
    ...(monster.group ?? []),
    ...(monster.traits ?? []).map((trait) => `${trait.name} ${trait.name_en}`),
    ...(monster.actions ?? []).map((action) => `${action.name} ${action.name_en}`),
    ...(monster.legendary_actions ?? []).map((action) => `${action.name} ${action.name_en}`),
    ...(monster.reactions ?? []).map((action) => `${action.name} ${action.name_en}`),
    ...flattenSpellNames(monster),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export const queryEntries = (lib, options = {}) => {
  const typeFilter = options.type ? new Set(mapValues(options.type, TYPE_ALIASES, 'type')) : null;
  const sizeFilter = options.size ? new Set(mapValues(options.size, SIZE_ALIASES, 'size')) : null;
  const environmentFilter = options.environment
    ? new Set(mapValues(options.environment, ENVIRONMENT_ALIASES, 'environment'))
    : null;
  const groupFilter = options.group ? new Set(mapValues(options.group, GROUP_ALIASES, 'group')) : null;
  const search = options.search ? String(options.search).toLowerCase() : null;
  const traitSearch = options.trait ? String(options.trait).toLowerCase() : null;
  const cr = crNumber(options.cr);
  const crMin = crNumber(options['cr-min']);
  const crMax = crNumber(options['cr-max']);

  let results = lib.monsters.filter((monster) => {
    if (typeFilter && !typeFilter.has(monster.creature_type_code)) return false;
    if (sizeFilter && !(monster.size_codes ?? []).some((code) => sizeFilter.has(code))) return false;
    if (environmentFilter) {
      const has = monster.environment_codes?.length
        ? monster.environment_codes.some((code) => environmentFilter.has(code))
        : environmentFilter.has('unmarked');
      if (!has) return false;
    }
    if (groupFilter && !(monster.group_codes ?? []).some((code) => groupFilter.has(code))) return false;
    if (cr !== null && monster.challenge_rating_numeric !== cr) return false;
    if (crMin !== null && monster.challenge_rating_numeric < crMin) return false;
    if (crMax !== null && monster.challenge_rating_numeric > crMax) return false;
    if (options.legendary && !monster.is_legendary) return false;
    if (options.lair && !monster.has_lair) return false;
    if (options.spellcaster && !monster.is_spellcaster) return false;
    if (options.shapechanger && !monster.is_shapechanger) return false;
    if (options.reactions && !monster.has_reactions) return false;
    if (traitSearch) {
      const names = (monster.traits ?? []).map((trait) => `${trait.name} ${trait.name_en}`.toLowerCase());
      if (!names.some((text) => text.includes(traitSearch))) return false;
    }
    if (search && !searchableText(monster).includes(search)) return false;
    return true;
  });

  const sort = options.sort ?? 'cr';
  results = [...results].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'zh');
    if (sort === 'page') return (a.source.page ?? 0) - (b.source.page ?? 0);
    if (sort === 'cr') {
      return a.challenge_rating_numeric - b.challenge_rating_numeric || a.name_en.localeCompare(b.name_en, 'en');
    }
    return 0;
  });

  return results;
};

const mergeText = async (records) => {
  if (!existsSync(DEFAULT_TEXT_FILE)) {
    console.error(`WARN no private text pack at ${DEFAULT_TEXT_FILE}`);
    return records;
  }
  const textPack = JSON.parse(await readFile(DEFAULT_TEXT_FILE, 'utf8'));
  return records.map((record) => {
    const extra = textPack[record.id];
    return extra ? { ...record, text: extra.text ?? extra } : record;
  });
};

const printTable = (records) => {
  const header = ['CR', '名称', '英文', '类型', '体型', 'AC', 'HP', '环境'];
  console.log(header.join('\t'));
  console.log(header.map(() => '---').join('\t'));
  for (const monster of records) {
    const row = [
      monster.challenge_rating,
      monster.name,
      monster.name_en,
      monster.creature_type,
      (monster.size ?? []).join('/'),
      String(monster.armor_class),
      String(monster.hit_points),
      (monster.environment ?? []).join('/') || '未标注',
    ];
    console.log(row.join('\t'));
  }
};

const printStats = (taxonomy) => {
  console.log(`MM 2014 · ${taxonomy.total} 条怪物`);
  for (const group of taxonomy.groups ?? []) {
    console.log(`\n${group.label}`);
    for (const category of group.categories ?? []) {
      console.log(`  ${category.label}: ${category.count}`);
    }
  }
};

const HELP = `Usage: node scripts/mm-query.mjs [options]

Filters:
  --type <code|中文>        生物类型（dragon / 龙），可逗号分隔
  --size <code|中文>        体型（M / 中型），可逗号分隔
  --cr <value>              精确挑战等级（1/2、0.5、17）
  --cr-min <value>          最低 CR
  --cr-max <value>          最高 CR
  --environment <code|中文> 栖息环境（forest / 森林），可逗号分隔
  --group <code|中文>       怪物族群（色彩龙 / chromatic-dragon）
  --trait <text>            特质名称搜索
  --search <text>           全字段搜索（名称、动作、法术、标签）
  --legendary               只看有传奇动作的怪物
  --lair                    只看有巢穴 CR 的怪物
  --spellcaster             只看施法者
  --shapechanger            只看变形生物
  --reactions               只看有反应动作的怪物

Output:
  --sort <cr|name|page>     排序（默认 cr）
  --limit <n>               最多显示 n 条（默认 20）
  --all                     显示全部结果
  --json                    输出完整 JSON
  --stats                   输出分类统计
  --with-text               合并 data/mm-private/text.json 的私有正文
  --help                    显示帮助
`;

const main = async () => {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help') {
      console.log(HELP);
      return;
    }
    const BOOLEAN_FLAGS = new Set([
      'all',
      'json',
      'stats',
      'with-text',
      'legendary',
      'lair',
      'spellcaster',
      'shapechanger',
      'reactions',
      'help',
    ]);
    if (arg.startsWith('--') && BOOLEAN_FLAGS.has(arg.slice(2))) {
      options[arg.slice(2)] = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for --${key}`);
      options[key] = value;
      i += 1;
      continue;
    }
    throw new Error(`unexpected argument: ${arg}`);
  }

  const lib = await loadLibrary();
  if (options.stats) {
    printStats(lib.taxonomy);
    return;
  }

  let records = queryEntries(lib, options);
  if (options['with-text']) records = await mergeText(records);
  if (options.json) {
    console.log(JSON.stringify(records, null, 2));
    return;
  }

  const limit = options.all ? records.length : Number(options.limit ?? 20);
  const shown = records.slice(0, limit);
  printTable(shown);
  console.log('');
  console.log(`共 ${records.length} 条，显示 ${shown.length} 条。`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`ERROR ${error.message}`);
    process.exit(1);
  });
}
