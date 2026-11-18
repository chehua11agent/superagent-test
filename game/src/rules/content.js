// Foundry dnd5e SRD 内容层：法术 / 物品 / 怪物。
// 数据由 scripts/import-foundry-srd.py 从 foundryvtt/dnd5e 的 packs/_source 生成；
// 运行时不依赖 Foundry、YAML 或网络。
import { FOUNDRY_SPELLS } from './content/spells.js';
import { FOUNDRY_ITEMS } from './content/items.js';
import { FOUNDRY_MONSTERS } from './content/monsters.js';
import { FOUNDRY_CONTENT_MANIFEST } from './content/manifest.js';

export const CONTENT = Object.freeze({
  spells: FOUNDRY_SPELLS,
  items: FOUNDRY_ITEMS,
  monsters: FOUNDRY_MONSTERS,
  manifest: FOUNDRY_CONTENT_MANIFEST
});

export const CONTENT_VERSION = 1;

const SPELLS_BY_ID = new Map(FOUNDRY_SPELLS.map((spell) => [spell.id, spell]));
const ITEMS_BY_ID = new Map(FOUNDRY_ITEMS.map((item) => [item.id, item]));
const MONSTERS_BY_ID = new Map(FOUNDRY_MONSTERS.map((monster) => [monster.id, monster]));

function matches(text, query) {
  return String(text ?? '').toLocaleLowerCase().includes(String(query).toLocaleLowerCase());
}

function searchable(entry) {
  return `${entry.name ?? ''} ${entry.description ?? ''}`;
}

export function getSpell(id) {
  return SPELLS_BY_ID.get(id) ?? null;
}

export function listSpells({ level, school, search, concentration, ritual } = {}) {
  return FOUNDRY_SPELLS.filter((spell) => {
    if (level !== undefined && Number(spell.level) !== Number(level)) return false;
    if (school !== undefined && spell.school !== school) return false;
    if (concentration !== undefined && Boolean(spell.concentration) !== Boolean(concentration)) return false;
    if (ritual !== undefined && Boolean(spell.ritual) !== Boolean(ritual)) return false;
    if (search && !matches(searchable(spell), search)) return false;
    return true;
  });
}

export function getItem(id) {
  return ITEMS_BY_ID.get(id) ?? null;
}

export function listItems({ kind, category, search, rarity } = {}) {
  return FOUNDRY_ITEMS.filter((item) => {
    if (kind !== undefined && item.kind !== kind) return false;
    if (category !== undefined) {
      const itemCategory = item.armor?.category ?? item.weapon?.category ?? null;
      if (itemCategory !== category) return false;
    }
    if (rarity !== undefined && (item.rarity ?? '') !== rarity) return false;
    if (search && !matches(`${searchable(item)} ${item.kind}`, search)) return false;
    return true;
  });
}

export function getWeapon(id) {
  const item = getItem(id);
  return item?.kind === 'weapon' ? item : null;
}

export function getArmor(id) {
  const item = getItem(id);
  return item?.kind === 'armor' ? item : null;
}

export function getMonster(id) {
  return MONSTERS_BY_ID.get(id) ?? null;
}

export function listMonsters({ crMax, creatureType, search } = {}) {
  return FOUNDRY_MONSTERS.filter((monster) => {
    if (crMax !== undefined && Number(monster.cr) > Number(crMax)) return false;
    if (creatureType !== undefined && monster.creatureType !== creatureType) return false;
    if (search && !matches(`${searchable(monster)} ${monster.creatureType}`, search)) return false;
    return true;
  });
}

export function contentStats() {
  return { ...FOUNDRY_CONTENT_MANIFEST.counts };
}

export function getContentManifest() {
  return FOUNDRY_CONTENT_MANIFEST;
}

/** 跨内容类型的简单搜索，返回带 type 的条目。 */
export function searchContent(query, { limit = 20 } = {}) {
  if (!query) return [];
  const results = [];
  for (const spell of listSpells({ search: query })) results.push({ type: 'spell', entry: spell });
  for (const item of listItems({ search: query })) results.push({ type: 'item', entry: item });
  for (const monster of listMonsters({ search: query })) results.push({ type: 'monster', entry: monster });
  return results.slice(0, limit);
}
