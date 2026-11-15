#!/usr/bin/env node
/**
 * Validate the structured PHB library in data/phb/.
 *
 * Checks shape, counts, cross-references, source pages and the "no prose"
 * policy (the public library must not contain PHB description text).
 *
 * Usage:
 *   node scripts/phb-validate.mjs
 *   node scripts/phb-validate.mjs --json
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = resolve(ROOT, 'data/phb');

const FILES = {
  races: 'races.json',
  classes: 'classes.json',
  subclasses: 'subclasses.json',
  features: 'class-features.json',
  backgrounds: 'backgrounds.json',
  feats: 'feats.json',
  spells: 'spells.json',
  equipment: 'equipment.json',
  conditions: 'conditions.json',
  rules: 'rules.json',
  deities: 'deities.json',
  planes: 'planes.json',
  monsters: 'monsters.json',
};

export const EXPECTED = {
  race: 9,
  subrace: 10,
  class: 12,
  subclass: 40,
  'class-feature': 487,
  background: 20,
  feat: 42,
  ability: 6,
  skill: 18,
  action: 20,
  condition: 15,
  language: 18,
  spell: 361,
  item: 259,
  deity: 195,
  plane: 31,
  monster: 15,
};

const read = async (name) => JSON.parse(await readFile(resolve(DATA, name), 'utf8'));

export const loadLibrary = async () => {
  const [manifest, taxonomy, ...rest] = await Promise.all([
    read('manifest.json'),
    read('taxonomy.json'),
    ...Object.values(FILES).map(read),
  ]);
  const data = Object.fromEntries(Object.keys(FILES).map((key, i) => [key, rest[i]]));
  return { manifest, taxonomy, ...data };
};

const flatEntries = (lib) => [
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

const PROSE_KEYS = new Set(['description', 'desc', 'entries', 'text', 'flavor', 'prose', 'readaloud']);

const walkStrings = (value, path, out) => {
  if (typeof value === 'string') {
    out.push({ value, path });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (PROSE_KEYS.has(k)) out.push({ value: v, path: `${path}.${k}`, proseKey: k });
      walkStrings(v, `${path}.${k}`, out);
    }
  }
};

const refExists = (set, id) => typeof id === 'string' && set.has(id);

export const validateLibrary = (lib) => {
  const errors = [];
  const warnings = [];
  const entries = flatEntries(lib);
  const ids = new Set();
  const byId = new Map();
  const counts = {};

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      errors.push('entry is not an object');
      continue;
    }
    counts[entry.type] = (counts[entry.type] ?? 0) + 1;
    if (!entry.id) errors.push(`missing id: ${entry.name ?? '?'}`);
    else if (ids.has(entry.id)) errors.push(`duplicate id: ${entry.id}`);
    else {
      ids.add(entry.id);
      byId.set(entry.id, entry);
    }
    if (!entry.name) errors.push(`${entry.id}: missing name`);
    if (!entry.name_en) errors.push(`${entry.id}: missing name_en`);
    if (!entry.brief) errors.push(`${entry.id}: missing brief`);
    if (!entry.source || entry.source.book !== 'PHB') errors.push(`${entry.id}: source.book must be PHB`);
    if (entry.source && entry.source.page !== null) {
      if (!Number.isInteger(entry.source.page) || entry.source.page < 1 || entry.source.page > 320) {
        errors.push(`${entry.id}: page out of PHB range (${entry.source.page})`);
      }
    }
    if (entry.source && typeof entry.source.srd !== 'boolean') {
      errors.push(`${entry.id}: source.srd must be boolean`);
    }
    if (/\{@|\|phb|\|PHB/.test(JSON.stringify(entry))) {
      errors.push(`${entry.id}: contains raw 5etools markup`);
    }
    const strings = [];
    walkStrings(entry, entry.id, strings);
    for (const { value, path, proseKey } of strings) {
      if (proseKey) errors.push(`${path}: prose field "${proseKey}" is not allowed`);
      if (typeof value === 'string' && value.length > 320) {
        errors.push(`${path}: string too long (${value.length} chars), possible prose leak`);
      }
    }
  }

  for (const [type, expected] of Object.entries(EXPECTED)) {
    if (counts[type] !== expected) {
      errors.push(`count ${type}: expected ${expected}, got ${counts[type] ?? 0}`);
    }
  }

  // cross references
  for (const cls of lib.classes) {
    for (const id of cls.features ?? []) if (!refExists(ids, id)) errors.push(`${cls.id}: missing feature ${id}`);
    for (const id of cls.subclasses ?? []) if (!refExists(ids, id)) errors.push(`${cls.id}: missing subclass ${id}`);
    if (cls.hit_die && !/^d(6|8|10|12)$/.test(cls.hit_die)) errors.push(`${cls.id}: invalid hit die ${cls.hit_die}`);
  }
  for (const sub of lib.subclasses) {
    if (!refExists(ids, sub.class)) errors.push(`${sub.id}: missing class ${sub.class}`);
    for (const id of sub.features ?? []) if (!refExists(ids, id)) errors.push(`${sub.id}: missing feature ${id}`);
  }
  for (const feature of lib.features) {
    if (!refExists(ids, feature.class)) errors.push(`${feature.id}: missing class ${feature.class}`);
    if (feature.subclass && !refExists(ids, feature.subclass)) {
      errors.push(`${feature.id}: missing subclass ${feature.subclass}`);
    }
    if (!Number.isInteger(feature.level) || feature.level < 1 || feature.level > 20) {
      errors.push(`${feature.id}: invalid level ${feature.level}`);
    }
  }
  for (const race of lib.races) {
    for (const id of race.subraces ?? []) if (!refExists(ids, id)) errors.push(`${race.id}: missing subrace ${id}`);
  }
  for (const subrace of lib.races.filter((r) => r.type === 'subrace')) {
    if (subrace.parent_race && !refExists(ids, subrace.parent_race)) {
      errors.push(`${subrace.id}: missing parent race ${subrace.parent_race}`);
    }
  }
  for (const bg of lib.backgrounds) {
    if (bg.variant_of && !refExists(ids, bg.variant_of)) errors.push(`${bg.id}: missing variant parent ${bg.variant_of}`);
  }
  for (const spell of lib.spells) {
    if (spell.level < 0 || spell.level > 9) errors.push(`${spell.id}: invalid spell level ${spell.level}`);
    for (const id of spell.classes ?? []) if (!refExists(ids, id)) errors.push(`${spell.id}: missing class ${id}`);
    if (!spell.brief.includes('环') && !spell.brief.includes('戏法')) errors.push(`${spell.id}: brief lacks level`);
  }
  for (const item of lib.equipment) {
    if (item.cost_cp !== null && item.cost_cp < 0) errors.push(`${item.id}: negative cost`);
    if (item.weight_lb !== null && item.weight_lb < 0) errors.push(`${item.id}: negative weight`);
  }

  // manifest / taxonomy consistency
  const manifestCounts = lib.manifest.counts ?? {};
  for (const [type, count] of Object.entries(counts)) {
    if (manifestCounts[type] !== count) {
      errors.push(`manifest count ${type}: expected ${count}, got ${manifestCounts[type]}`);
    }
  }
  const taxonomyCounts = Object.fromEntries(
    lib.taxonomy.groups.flatMap((g) => g.categories.map((c) => [c.id, c.count])),
  );
  for (const [type, count] of Object.entries(counts)) {
    if (taxonomyCounts[type] !== count) {
      errors.push(`taxonomy count ${type}: expected ${count}, got ${taxonomyCounts[type]}`);
    }
  }

  // core / variant background split
  const coreBackgrounds = lib.backgrounds.filter((b) => !b.is_variant && !b.is_custom);
  const variants = lib.backgrounds.filter((b) => b.is_variant);
  const custom = lib.backgrounds.filter((b) => b.is_custom);
  if (coreBackgrounds.length !== 13) errors.push(`expected 13 core backgrounds, got ${coreBackgrounds.length}`);
  if (variants.length !== 6) errors.push(`expected 6 variant backgrounds, got ${variants.length}`);
  if (custom.length !== 1) errors.push(`expected 1 custom background, got ${custom.length}`);

  // no Chinese characters in stable ids
  for (const id of ids) {
    if (/[\u4e00-\u9fff]/.test(id)) warnings.push(`id contains Chinese characters: ${id}`);
  }

  const stats = {
    entries: entries.length,
    counts,
    byPage: entries.reduce((acc, e) => {
      const key = e.source?.page ? 'withPage' : 'withoutPage';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    classesWithSubclasses: lib.classes.filter((c) => (c.subclasses ?? []).length > 0).length,
    srd: entries.filter((e) => e.source?.srd).length,
  };

  return { ok: errors.length === 0, errors, warnings, stats };
};

const main = async () => {
  const lib = await loadLibrary();
  const result = validateLibrary(lib);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const warning of result.warnings) console.warn(`warn  ${warning}`);
    for (const error of result.errors) console.error(`error ${error}`);
    console.log(
      `PHB 库校验：${result.stats.entries} 条 / ${Object.keys(result.stats.counts).length} 类；` +
        `SRD ${result.stats.srd} 条`,
    );
    console.log(result.ok ? '通过。' : `失败：${result.errors.length} 个错误。`);
  }
  process.exit(result.ok ? 0 : 1);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
