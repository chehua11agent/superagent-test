#!/usr/bin/env node
/**
 * Query the structured PHB library.
 *
 * Examples:
 *   node scripts/phb-query.mjs --type spell --class wizard --level 1
 *   node scripts/phb-query.mjs --type spell --school 塑能 --search 火
 *   node scripts/phb-query.mjs --type item --category weapon --search 剑
 *   node scripts/phb-query.mjs --type class --search 法师 --json
 *   node scripts/phb-query.mjs --stats
 *
 * Optional private text pack (not committed):
 *   data/phb-private/text.json  {"phb:spell:fireball": {"text": "..."}}
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLibrary } from './phb-validate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_TEXT_FILE = resolve(ROOT, 'data/phb-private/text.json');

const TYPE_ALIASES = {
  race: 'race',
  subrace: 'subrace',
  class: 'class',
  subclass: 'subclass',
  feature: 'class-feature',
  'class-feature': 'class-feature',
  background: 'background',
  feat: 'feat',
  spell: 'spell',
  item: 'item',
  equipment: 'item',
  condition: 'condition',
  ability: 'ability',
  skill: 'skill',
  action: 'action',
  language: 'language',
  deity: 'deity',
  god: 'deity',
  plane: 'plane',
  monster: 'monster',
  creature: 'monster',
};

const flatten = (lib) => [
  ...lib.races,
  ...lib.classes,
  ...lib.subclasses,
  ...lib.features,
  ...lib.backgrounds,
  ...lib.feats,
  ...lib.spells,
  ...lib.equipment,
  ...lib.conditions,
  ...(lib.rules.abilities ?? []),
  ...(lib.rules.skills ?? []),
  ...(lib.rules.actions ?? []),
  ...(lib.rules.languages ?? []),
  ...lib.deities,
  ...lib.planes,
  ...lib.monsters,
];

export const queryEntries = (lib, options = {}) => {
  const type = options.type ? TYPE_ALIASES[options.type] ?? options.type : null;
  const search = options.search ? String(options.search).toLowerCase() : null;
  const classQuery = options.class ? String(options.class).toLowerCase() : null;
  const classRecord = classQuery
    ? lib.classes.find(
        (c) => c.id === options.class || c.name === options.class || c.name_en.toLowerCase() === classQuery,
      )
    : null;
  if (classQuery && !classRecord) return [];

  const matchesClass = (entry) => {
    if (!classRecord) return true;
    if (entry.type === 'spell') return (entry.classes ?? []).includes(classRecord.id);
    if (entry.type === 'class') return entry.id === classRecord.id;
    if (entry.type === 'subclass' || entry.type === 'class-feature') return entry.class === classRecord.id;
    return true;
  };

  return flatten(lib)
    .filter((entry) => (type ? entry.type === type : true))
    .filter((entry) => matchesClass(entry))
    .filter((entry) => (options.level === undefined ? true : entry.level === Number(options.level)))
    .filter((entry) => {
      if (!options.school) return true;
      const q = String(options.school).toLowerCase();
      return (
        entry.type === 'spell' &&
        (String(entry.school).toLowerCase() === q || String(entry.school_zh).toLowerCase() === q)
      );
    })
    .filter((entry) => (options.category ? entry.category === options.category : true))
    .filter((entry) => (options.pantheon ? entry.pantheon === options.pantheon : true))
    .filter((entry) => {
      if (!search) return true;
      const haystack = [entry.id, entry.name, entry.name_en, entry.brief, ...(entry.class_names ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => {
      if (a.type === 'spell' && b.type === 'spell') return a.level - b.level || a.name.localeCompare(b.name, 'zh');
      const pa = a.source?.page ?? 999;
      const pb = b.source?.page ?? 999;
      return pa - pb || String(a.name).localeCompare(String(b.name), 'zh');
    });
};

const loadTextPack = async (file) => {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
};

const formatRows = (entries) =>
  entries.map((e) => ({
    id: e.id,
    name: e.name,
    name_en: e.name_en,
    brief: e.brief,
    ...(e.text ? { text: e.text } : {}),
  }));

const parseArgs = (argv) => {
  const out = { json: false, stats: false, withText: false, limit: 20 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') out.json = true;
    else if (arg === '--stats') out.stats = true;
    else if (arg === '--with-text') out.withText = true;
    else if (arg === '--all') out.limit = Infinity;
    else if (arg === '--type') out.type = argv[++i];
    else if (arg === '--id') out.id = argv[++i];
    else if (arg === '--class') out.class = argv[++i];
    else if (arg === '--level') out.level = argv[++i];
    else if (arg === '--school') out.school = argv[++i];
    else if (arg === '--category') out.category = argv[++i];
    else if (arg === '--pantheon') out.pantheon = argv[++i];
    else if (arg === '--search') out.search = argv[++i];
    else if (arg === '--limit') out.limit = Number(argv[++i]);
    else if (arg === '--text-file') out.textFile = argv[++i];
    else if (arg === '--help' || arg === '-h') out.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
};

const help = `用法：node scripts/phb-query.mjs [选项]

选项：
  --type <类型>        race|subrace|class|subclass|feature|background|feat|spell|item|condition|action|skill|language|deity|plane|monster
  --class <职业>       职业 id / 中文名 / 英文名（对法术、特性、子职业生效）
  --level <0-9>        法术环阶或职业特性等级
  --school <学派>      法术学派（英文或中文）
  --category <分类>    物品分类（weapon/armor/shield/gear/tool/pack/...）
  --pantheon <神系>    神祇神系（中文）
  --search <关键词>    在 id、中英文名、brief 中搜索
  --id <id>            精确查询
  --limit <n>          默认 20，--all 不限
  --json               输出 JSON
  --with-text          合并 data/phb-private/text.json 的私有正文
  --stats              只输出分类计数
  --help               显示本帮助
`;

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(help);
    return;
  }
  const lib = await loadLibrary();
  if (args.stats) {
    const counts = {};
    for (const entry of flatten(lib)) counts[entry.type] = (counts[entry.type] ?? 0) + 1;
    console.log(JSON.stringify(counts, null, 2));
    return;
  }
  let entries = args.id ? flatten(lib).filter((e) => e.id === args.id) : queryEntries(lib, args);
  if (args.withText) {
    const textFile = args.textFile ? resolve(args.textFile) : DEFAULT_TEXT_FILE;
    const pack = await loadTextPack(textFile);
    if (!pack) console.warn(`未找到私有正文包：${textFile}`);
    else entries = entries.map((e) => (pack[e.id]?.text ? { ...e, text: pack[e.id].text } : e));
  }
  const limited = Number.isFinite(args.limit) ? entries.slice(0, args.limit) : entries;
  if (args.json) {
    console.log(JSON.stringify(formatRows(limited), null, 2));
    return;
  }
  if (limited.length === 0) {
    console.log('没有匹配条目。');
    return;
  }
  const width = Math.min(36, Math.max(...limited.map((e) => e.id.length)));
  for (const e of limited) {
    console.log(`${e.id.padEnd(width)}  ${e.name}${e.name_en ? ` (${e.name_en})` : ''}`);
    console.log(`  ${e.brief}`);
    if (e.text) console.log(`  正文：${String(e.text).replace(/\s+/g, ' ').slice(0, 160)}…`);
  }
  console.log(`\n共 ${entries.length} 条，显示 ${limited.length} 条。`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
