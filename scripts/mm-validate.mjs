#!/usr/bin/env node
/**
 * Validate the structured Monster Manual library in data/mm/.
 *
 * Checks shape, counts, cross-references, source pages, classification
 * coverage, manifest hashes and the "no prose" policy (the public library
 * must not contain MM description text or 5etools tags).
 *
 * Usage:
 *   node scripts/mm-validate.mjs
 *   node scripts/mm-validate.mjs --json
 */

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = resolve(ROOT, 'data/mm');

export const EXPECTED = {
  total: 450,
  by_type: {
    humanoid: 74,
    aberration: 19,
    celestial: 7,
    construct: 16,
    monstrosity: 53,
    elemental: 23,
    undead: 32,
    plant: 14,
    fiend: 37,
    giant: 13,
    beast: 100,
    dragon: 51,
    fey: 7,
    ooze: 4,
  },
  by_size: {
    medium: 196,
    large: 133,
    small: 30,
    huge: 39,
    tiny: 37,
    gargantuan: 15,
  },
  by_cr_tier: {
    'cr-0-4': 293,
    'cr-5-10': 96,
    'cr-11-16': 36,
    'cr-17-20': 12,
    'cr-21-plus': 13,
  },
  by_environment: {
    arctic: 39,
    coastal: 48,
    desert: 79,
    forest: 135,
    grassland: 84,
    hill: 90,
    mountain: 53,
    swamp: 55,
    underdark: 124,
    underwater: 23,
    urban: 84,
    unmarked: 85,
  },
  by_group: {
    'chromatic-dragon': 20,
    'metallic-dragon': 20,
    dinosaur: 6,
    modron: 5,
    lycanthrope: 5,
    genie: 4,
    'animated-object': 3,
    beholder: 3,
    angel: 3,
    sphinx: 2,
  },
  features: {
    legendary: 37,
    lair: 5,
    spellcaster: 83,
    shapechanger: 23,
    reactions: 18,
  },
};

const SIZE_CODES = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);
const TYPE_CODES = new Set([
  'aberration',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'plant',
  'undead',
]);
const ENVIRONMENT_CODES = new Set([
  'arctic',
  'coastal',
  'desert',
  'forest',
  'grassland',
  'hill',
  'mountain',
  'swamp',
  'underdark',
  'underwater',
  'urban',
]);
const FORBIDDEN_KEYS = new Set([
  'entries',
  'headerEntries',
  'footerEntries',
  'entry',
  'text',
  'description',
  'desc',
  'lairActions',
  'regionalEffects',
]);

const readText = async (name) => readFile(resolve(DATA, name), 'utf8');
const read = async (name) => JSON.parse(await readText(name));

export const loadLibrary = async () => {
  const [manifest, taxonomy, monsters] = await Promise.all([
    read('manifest.json'),
    read('taxonomy.json'),
    read('monsters.json'),
  ]);
  return { manifest, taxonomy, monsters };
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isInteger = (value) => Number.isInteger(value);
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const crToNumber = (cr) => {
  const text = String(cr ?? '').trim();
  if (!text) return null;
  const [a, b] = text.split('/');
  const n = b ? Number(a) / Number(b) : Number(text);
  return Number.isFinite(n) ? n : null;
};

const crTier = (cr) => {
  const n = crToNumber(cr);
  if (n === null) return null;
  if (n <= 4) return 'cr-0-4';
  if (n <= 10) return 'cr-5-10';
  if (n <= 16) return 'cr-11-16';
  if (n <= 20) return 'cr-17-20';
  return 'cr-21-plus';
};

const walkKeys = (value, path, onKey) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkKeys(item, `${path}[${index}]`, onKey));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    onKey(key, `${path}.${key}`);
    walkKeys(item, `${path}.${key}`, onKey);
  }
};

const walkStrings = (value, path, onString) => {
  if (typeof value === 'string') {
    onString(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, `${path}[${index}]`, onString));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    walkStrings(item, `${path}.${key}`, onString);
  }
};

const countBy = (items, fn) => {
  const counts = {};
  for (const item of items) {
    for (const key of fn(item)) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

const sameCounts = (actual, expected) =>
  Object.keys({ ...actual, ...expected }).every((key) => (actual[key] ?? 0) === (expected[key] ?? 0));

export const validateLibrary = async () => {
  const errors = [];
  const warnings = [];
  const lib = await loadLibrary();

  if (lib.monsters.length !== EXPECTED.total) {
    errors.push(`monsters.json: expected ${EXPECTED.total} records, got ${lib.monsters.length}`);
  }
  if (lib.taxonomy.total !== EXPECTED.total) {
    errors.push(`taxonomy.json: expected total ${EXPECTED.total}, got ${lib.taxonomy.total}`);
  }

  const ids = new Set();
  for (const monster of lib.monsters) {
    const where = `monster ${monster?.id ?? '(no id)'}`;
    if (!monster || typeof monster !== 'object') {
      errors.push(`${where}: not an object`);
      continue;
    }
    if (typeof monster.id !== 'string' || !/^mm:monster:[a-z0-9-]+$/.test(monster.id)) {
      errors.push(`${where}: invalid id`);
    }
    if (ids.has(monster.id)) errors.push(`${where}: duplicate id`);
    ids.add(monster.id);

    if (monster.type !== 'monster') errors.push(`${where}: type must be "monster"`);
    if (!monster.name || !monster.name_en) errors.push(`${where}: missing name/name_en`);
    if (!Array.isArray(monster.size) || !monster.size.length) errors.push(`${where}: missing size`);
    if (!Array.isArray(monster.size_codes) || !monster.size_codes.length) errors.push(`${where}: missing size_codes`);
    for (const code of monster.size_codes ?? []) {
      if (!SIZE_CODES.has(code)) errors.push(`${where}: unknown size code ${code}`);
    }
    if (!TYPE_CODES.has(monster.creature_type_code)) errors.push(`${where}: unknown type ${monster.creature_type_code}`);
    if (!monster.creature_type) errors.push(`${where}: missing creature_type label`);
    if (!monster.alignment) errors.push(`${where}: missing alignment`);
    if (!Array.isArray(monster.alignment_codes)) errors.push(`${where}: missing alignment_codes`);

    if (!isInteger(monster.armor_class) || monster.armor_class <= 0) errors.push(`${where}: invalid armor_class`);
    if (!isInteger(monster.hit_points) || monster.hit_points <= 0) errors.push(`${where}: invalid hit_points`);
    if (monster.abilities && Object.keys(monster.abilities).length !== 6) errors.push(`${where}: abilities must have 6 keys`);
    for (const [ability, value] of Object.entries(monster.abilities ?? {})) {
      if (!isInteger(value) || value < 1 || value > 30) errors.push(`${where}: invalid ability ${ability}=${value}`);
    }

    if (crToNumber(monster.challenge_rating) === null) errors.push(`${where}: invalid challenge_rating`);
    if (!isNumber(monster.challenge_rating_numeric)) errors.push(`${where}: invalid challenge_rating_numeric`);
    if (crTier(monster.challenge_rating) !== monster.cr_tier) {
      errors.push(`${where}: cr_tier ${monster.cr_tier} does not match CR ${monster.challenge_rating}`);
    }
    if (!isInteger(monster.proficiency_bonus)) errors.push(`${where}: invalid proficiency_bonus`);

    if (!Array.isArray(monster.environment_codes)) errors.push(`${where}: missing environment_codes`);
    for (const code of monster.environment_codes ?? []) {
      if (!ENVIRONMENT_CODES.has(code)) errors.push(`${where}: unknown environment ${code}`);
    }
    if (!Array.isArray(monster.environment)) errors.push(`${where}: missing environment labels`);
    if (!Array.isArray(monster.group_codes)) errors.push(`${where}: missing group_codes`);
    for (const code of monster.group_codes ?? []) {
      if (!(code in EXPECTED.by_group)) errors.push(`${where}: unknown group ${code}`);
    }

    for (const key of ['traits', 'actions', 'reactions', 'legendary_actions', 'spellcasting']) {
      if (!Array.isArray(monster[key])) errors.push(`${where}: ${key} must be an array`);
    }

    for (const action of [
      ...(monster.actions ?? []),
      ...(monster.reactions ?? []),
      ...(monster.legendary_actions ?? []),
    ]) {
      if (!action.name) errors.push(`${where}: action without name`);
      for (const key of ['to_hit', 'save_dc', 'reach_ft', 'legendary_cost']) {
        if (action[key] !== null && !isInteger(action[key])) errors.push(`${where}: ${key} must be integer|null`);
      }
      if (action.range !== null && !/^\d+(?:\/\d+)?$/.test(String(action.range))) {
        errors.push(`${where}: invalid range ${action.range}`);
      }
      if (!Array.isArray(action.damage_dice) || !Array.isArray(action.average_damage)) {
        errors.push(`${where}: damage arrays missing`);
      } else if (action.damage_dice.length !== action.average_damage.length) {
        errors.push(`${where}: damage_dice/average_damage length mismatch`);
      }
      for (const value of action.average_damage ?? []) {
        if (!isInteger(value)) errors.push(`${where}: average_damage must be integer`);
      }
      for (const die of action.damage_dice ?? []) {
        if (typeof die !== 'string' || !/\d+d\d+/.test(die)) errors.push(`${where}: invalid damage dice ${die}`);
      }
      if (!Array.isArray(action.damage_types)) errors.push(`${where}: damage_types must be an array`);
    }

    for (const casting of monster.spellcasting ?? []) {
      if (!casting.name) errors.push(`${where}: spellcasting without name`);
      if (!isPlainObject(casting.levels)) errors.push(`${where}: spellcasting levels must be object`);
      if (!isInteger(casting.spell_count)) errors.push(`${where}: spell_count must be integer`);
      const spellCount =
        (casting.at_will ?? []).length
        + Object.values(casting.daily ?? {}).reduce((sum, list) => sum + (list?.length ?? 0), 0)
        + Object.values(casting.levels ?? {}).reduce((sum, entry) => sum + (entry?.spells?.length ?? 0), 0);
      if (spellCount !== casting.spell_count) errors.push(`${where}: spell_count mismatch`);
      walkStrings(casting, `${where}.spellcasting`, (text, path) => {
        if (text === '') errors.push(`${path}: empty spell string`);
      });
    }

    if (!isPlainObject(monster.source) || monster.source.book !== 'MM') errors.push(`${where}: source.book must be MM`);
    if (!isInteger(monster.source?.page) || monster.source.page < 1 || monster.source.page > 400) {
      errors.push(`${where}: invalid source page`);
    }
    if (typeof monster.source?.srd !== 'boolean') errors.push(`${where}: source.srd must be boolean`);
    if (!monster.brief) errors.push(`${where}: missing brief`);

    if (!['boolean'].includes(typeof monster.is_legendary)) errors.push(`${where}: is_legendary must be boolean`);
    if (!['boolean'].includes(typeof monster.has_lair)) errors.push(`${where}: has_lair must be boolean`);
    if (!['boolean'].includes(typeof monster.is_spellcaster)) errors.push(`${where}: is_spellcaster must be boolean`);
    if (!['boolean'].includes(typeof monster.is_shapechanger)) errors.push(`${where}: is_shapechanger must be boolean`);
    if (!['boolean'].includes(typeof monster.has_reactions)) errors.push(`${where}: has_reactions must be boolean`);

    walkKeys(monster, where, (key, path) => {
      if (FORBIDDEN_KEYS.has(key)) errors.push(`${path}: forbidden prose key "${key}"`);
    });
    walkStrings(monster, where, (text, path) => {
      if (text.includes('{@')) errors.push(`${path}: contains uncleaned 5etools tag`);
      if (text.length > 300) warnings.push(`${path}: unusually long string (${text.length} chars)`);
    });
  }

  const typeCounts = countBy(lib.monsters, (m) => [m.creature_type_code]);
  const sizeCounts = countBy(lib.monsters, (m) => m.size_codes);
  const crCounts = countBy(lib.monsters, (m) => [m.cr_tier]);
  const environmentCounts = countBy(lib.monsters, (m) => (m.environment_codes.length ? m.environment_codes : ['unmarked']));
  const groupCounts = countBy(lib.monsters, (m) => m.group_codes);
  const featureCounts = {
    legendary: lib.monsters.filter((m) => m.is_legendary).length,
    lair: lib.monsters.filter((m) => m.has_lair).length,
    spellcaster: lib.monsters.filter((m) => m.is_spellcaster).length,
    shapechanger: lib.monsters.filter((m) => m.is_shapechanger).length,
    reactions: lib.monsters.filter((m) => m.has_reactions).length,
  };

  if (!sameCounts(typeCounts, EXPECTED.by_type)) errors.push('type counts do not match expected coverage');
  if (!sameCounts(sizeCounts, EXPECTED.by_size)) errors.push('size counts do not match expected coverage');
  if (!sameCounts(crCounts, EXPECTED.by_cr_tier)) errors.push('CR tier counts do not match expected coverage');
  if (!sameCounts(environmentCounts, EXPECTED.by_environment)) errors.push('environment counts do not match expected coverage');
  if (!sameCounts(groupCounts, EXPECTED.by_group)) errors.push('group counts do not match expected coverage');
  if (!sameCounts(featureCounts, EXPECTED.features)) errors.push('feature counts do not match expected coverage');

  if (lib.taxonomy.book !== 'MM' || lib.taxonomy.edition !== '2014') errors.push('taxonomy book/edition mismatch');
  if (lib.taxonomy.total !== EXPECTED.total) errors.push('taxonomy total mismatch');
  for (const [key, expected] of [
    ['type', EXPECTED.by_type],
    ['size', EXPECTED.by_size],
    ['cr', EXPECTED.by_cr_tier],
    ['environment', EXPECTED.by_environment],
    ['group', EXPECTED.by_group],
    ['feature', EXPECTED.features],
  ]) {
    if (!sameCounts(lib.taxonomy.counts?.[key] ?? {}, expected)) {
      errors.push(`taxonomy.counts.${key} does not match expected`);
    }
  }

  const indexes = lib.taxonomy.indexes ?? {};
  for (const [dimension, expected] of [
    ['type', EXPECTED.by_type],
    ['size', EXPECTED.by_size],
    ['cr', EXPECTED.by_cr_tier],
    ['environment', EXPECTED.by_environment],
    ['group', EXPECTED.by_group],
    ['feature', EXPECTED.features],
  ]) {
    const index = indexes[dimension] ?? {};
    for (const [key, count] of Object.entries(expected)) {
      const idsForCategory = index[key] ?? [];
      if (idsForCategory.length !== count) {
        errors.push(`taxonomy.indexes.${dimension}.${key}: expected ${count} ids, got ${idsForCategory.length}`);
      }
      for (const id of idsForCategory) {
        if (!ids.has(id)) errors.push(`taxonomy.indexes.${dimension}.${key}: unknown id ${id}`);
      }
    }
    for (const [key, list] of Object.entries(index)) {
      if (!(key in expected) && list.length > 0) {
        errors.push(`taxonomy.indexes.${dimension}.${key}: unexpected category`);
      }
    }
  }

  for (const [dimension, listFn] of [
    ['type', (m) => [m.creature_type_code]],
    ['size', (m) => m.size_codes],
    ['cr', (m) => [m.cr_tier]],
    ['environment', (m) => (m.environment_codes.length ? m.environment_codes : ['unmarked'])],
  ]) {
    for (const monster of lib.monsters) {
      for (const key of listFn(monster)) {
        const idsForCategory = indexes[dimension]?.[key] ?? [];
        if (!idsForCategory.includes(monster.id)) {
          errors.push(`taxonomy.indexes.${dimension}.${key}: missing ${monster.id}`);
        }
      }
    }
  }

  if (lib.manifest.counts?.monster !== EXPECTED.total) errors.push('manifest.counts.monster mismatch');
  for (const [key, value] of Object.entries(EXPECTED.features)) {
    if (lib.manifest.counts?.[key] !== value) errors.push(`manifest.counts.${key} mismatch`);
  }
  for (const [key, expected] of [
    ['by_type', EXPECTED.by_type],
    ['by_size', EXPECTED.by_size],
    ['by_cr_tier', EXPECTED.by_cr_tier],
    ['by_environment', EXPECTED.by_environment],
    ['by_group', EXPECTED.by_group],
  ]) {
    if (!sameCounts(lib.manifest.counts?.[key] ?? {}, expected)) {
      errors.push(`manifest.counts.${key} does not match expected`);
    }
  }

  const groupToCountKey = {
    'creature-type': 'type',
    size: 'size',
    'challenge-rating': 'cr',
    environment: 'environment',
    group: 'group',
    features: 'feature',
  };
  for (const group of lib.taxonomy.groups ?? []) {
    if (group.id === 'overview') {
      for (const category of group.categories ?? []) {
        if (category.count !== EXPECTED.total) errors.push(`taxonomy group overview/${category.id}: count mismatch`);
      }
      continue;
    }
    const countKey = groupToCountKey[group.id];
    if (!countKey) {
      errors.push(`taxonomy group ${group.id}: unknown group`);
      continue;
    }
    for (const category of group.categories ?? []) {
      if (category.count !== (lib.taxonomy.counts?.[countKey]?.[category.id] ?? 0)) {
        errors.push(`taxonomy group ${group.id}/${category.id}: count mismatch`);
      }
    }
  }

  for (const [dimension, listFn] of [
    ['group', (m) => m.group_codes],
    [
      'feature',
      (m) => [
        m.is_legendary ? 'legendary' : null,
        m.has_lair ? 'lair' : null,
        m.is_spellcaster ? 'spellcaster' : null,
        m.is_shapechanger ? 'shapechanger' : null,
        m.has_reactions ? 'reactions' : null,
      ].filter(Boolean),
    ],
  ]) {
    for (const monster of lib.monsters) {
      for (const key of listFn(monster)) {
        const idsForCategory = indexes[dimension]?.[key] ?? [];
        if (!idsForCategory.includes(monster.id)) {
          errors.push(`taxonomy.indexes.${dimension}.${key}: missing ${monster.id}`);
        }
      }
    }
  }

  const fileHashes = [
    ['data/mm/monsters.json', 'monsters.json'],
    ['data/mm/taxonomy.json', 'taxonomy.json'],
  ];
  for (const [manifestPath, fileName] of fileHashes) {
    const fileEntry = (lib.manifest.files ?? []).find((file) => file.path === manifestPath);
    if (!fileEntry) {
      errors.push(`manifest.files: missing ${manifestPath}`);
      continue;
    }
    const text = await readText(fileName);
    const sha256 = createHash('sha256').update(text).digest('hex');
    if (fileEntry.sha256 !== sha256) errors.push(`manifest.files: sha256 mismatch for ${manifestPath}`);
    if (fileEntry.bytes !== Buffer.byteLength(text)) errors.push(`manifest.files: bytes mismatch for ${manifestPath}`);
    const expectedRecords = fileName === 'monsters.json' ? EXPECTED.total : 1;
    if (fileEntry.records !== expectedRecords) errors.push(`manifest.files: records mismatch for ${manifestPath}`);
  }

  if (featureCounts.shapechanger === 0) warnings.push('no shapechanger records classified');
  if (environmentCounts.unmarked) warnings.push(`${environmentCounts.unmarked} records have no environment tag`);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      monster: lib.monsters.length,
      by_type: typeCounts,
      by_size: sizeCounts,
      by_cr_tier: crCounts,
      by_environment: environmentCounts,
      by_group: groupCounts,
      features: featureCounts,
    },
  };
};

const main = async () => {
  const result = await validateLibrary();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const warning of result.warnings) console.warn(`WARN ${warning}`);
    for (const error of result.errors) console.error(`ERROR ${error}`);
    if (result.ok) {
      console.log(
        `OK: ${result.counts.monster} MM monsters, ${Object.keys(result.counts.by_type).length} types, ` +
          `${Object.keys(result.counts.by_environment).length} environments, ` +
          `${result.counts.features.legendary} legendary, ${result.counts.features.spellcaster} spellcasters`,
      );
    } else {
      console.error(`FAIL: ${result.errors.length} error(s)`);
    }
  }
  if (!result.ok) process.exit(1);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
